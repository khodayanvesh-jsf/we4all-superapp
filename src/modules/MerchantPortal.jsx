import React, { useEffect, useRef, useState } from "react";
import { isMerchantOrderOwned, canMarkOrderPacked } from "./workflows/portalRules";
import { cancelMarketplaceOrder, confirmMarketplaceOrder, listMarketplaceOrders, supabase } from "../supabaseClient";
import { listSubcategories } from "./workflows/subcategoryKeys";

export default function MerchantPortal({
  footerTab,
  setFooterTab,
  currentUser,
  categories = [],
  products = [],
  setProducts = () => {},
  pendingSubCategories = [],
  setPendingSubCategories = () => {},
  rejectedItems = [],
  orders = [],
  setOrders = () => {},
  onSwitchToPersonalShop,
  onTriggerToast,
  renderAccountTab
}) {
  const [autoStockWindowActive] = useState(false);
  const merchantId = currentUser?.id || "";
  const merchantName = currentUser?.businessName || currentUser?.fullName || "";
  const [marketplaceOrders, setMarketplaceOrders] = useState([]);
  const [confirmingOrderId, setConfirmingOrderId] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState("");
  const [ordersLoadError, setOrdersLoadError] = useState("");
  const merchantProducts = (products || []).filter((product) =>
    product.ownerUserId === merchantId ||
    (merchantName && product.shopName === merchantName)
  );
  const localMerchantOrders = (orders || []).filter((order) => isMerchantOrderOwned(order, currentUser));
  const localOrderIds = new Set(localMerchantOrders.map((order) => String(order.id)));
  const activeMarketplaceOrders = marketplaceOrders.filter((order) =>
    !["delivered", "cancelled", "disputed", "refunded"].includes(String(order.status).toLowerCase())
  );
  const merchantOrders = [
    ...activeMarketplaceOrders.filter((order) => !localOrderIds.has(String(order.id))),
    ...localMerchantOrders
  ];
  const [heavyLaborFees, setHeavyLaborFees] = useState({});
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [liveProducts, setLiveProducts] = useState([]);
  const [stockDeltas, setStockDeltas] = useState({});
  const [stockBusy, setStockBusy] = useState(false);
  const stockAttempt = useRef(null);
  const partnerId = currentUser?.partnerId;

  useEffect(() => {
    setLiveProducts([]);
    setStockDeltas({});
    stockAttempt.current = null;
    if (footerTab !== "stock" || !supabase || !partnerId) return;
    let active = true;
    supabase.from("we4all_catalog_items")
      .select("id,title,price_inr,stock_quantity,approval_status,is_active")
      .eq("partner_id", partnerId).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) onTriggerToast(error.message || "Could not load your live products.");
        else setLiveProducts(data || []);
      });
    return () => { active = false; };
  }, [footerTab, partnerId]);

  const adjustLiveStock = async (product) => {
    const delta = Number(stockDeltas[product.id]);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000) {
      onTriggerToast("Enter a whole-number stock change, such as 10 to add or -2 to remove.");
      return;
    }
    const previous = stockAttempt.current;
    const idempotencyKey = previous?.id === product.id && previous.delta === delta ? previous.key : crypto.randomUUID();
    stockAttempt.current = { id: product.id, delta, key: idempotencyKey };
    setStockBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("we4all-adjust-stock", {
        body: { partnerId, catalogItemId: product.id, quantityDelta: delta, idempotencyKey }
      });
      const details = await error?.context?.clone?.().json().catch(() => null);
      if (error || !data?.ok || !Number.isInteger(data.stock_quantity)) throw new Error(details?.error || data?.error || "Stock update was not confirmed. Try again.");
      setLiveProducts((items) => items.map((item) => item.id === product.id ? { ...item, stock_quantity: data.stock_quantity } : item));
      setStockDeltas((values) => ({ ...values, [product.id]: "" }));
      stockAttempt.current = null;
      onTriggerToast("Stock saved to the marketplace.");
    } catch (error) {
      onTriggerToast(error.message);
    } finally {
      setStockBusy(false);
    }
  };

  const [newProdForm, setNewProdForm] = useState({
    categoryId: "daily_needs",
    subcategoryKey: "",
    subCategoryBrand: "",
    shopName: currentUser?.fullName || "Sri Laxmi Supermart",
    price: 65,
    mrp: 75,
    unitLabel: "1 kg Pack",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80"
  });

  useEffect(() => {
    const partnerId = currentUser?.partnerId;
    const authUserId = currentUser?.authUserId;
    if (footerTab !== "home" || !supabase || !partnerId || !authUserId) {
      setMarketplaceOrders([]);
      setOrdersLoadError("");
      return undefined;
    }
    let active = true;
    let hasReportedError = false;
    const refreshOrders = async () => {
      try {
        const liveOrders = await listMarketplaceOrders({ partnerId });
        if (!active) return;
        setMarketplaceOrders(liveOrders);
        setOrdersLoadError("");
        hasReportedError = false;
      } catch (error) {
        if (!active) return;
        setOrdersLoadError(error?.message || "Live orders could not be refreshed.");
        if (!hasReportedError) onTriggerToast?.("Live merchant order refresh failed. Check connection and retry.");
        hasReportedError = true;
      }
    };
    refreshOrders();
    const timer = window.setInterval(refreshOrders, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [footerTab, currentUser?.partnerId, currentUser?.authUserId]);

  const handleConfirmMarketplaceOrder = async (order) => {
    if (!order?.serverOrderId || confirmingOrderId || cancellingOrderId) return;
    setConfirmingOrderId(order.serverOrderId);
    try {
      const result = await confirmMarketplaceOrder(order.serverOrderId);
      setMarketplaceOrders((current) => current.map((item) =>
        item.serverOrderId === order.serverOrderId
          ? { ...item, status: result.status, paymentStatus: result.payment_status?.toUpperCase() || item.paymentStatus }
          : item
      ));
      onTriggerToast?.(result.status === "accepted"
        ? `Order #${order.id} accepted after server-verified payment.`
        : `Order #${order.id} confirmed. Payment is still pending; fulfilment remains locked.`);
    } catch (error) {
      onTriggerToast?.(error?.message || "The server could not confirm this order.");
    } finally {
      setConfirmingOrderId("");
    }
  };

  const handleDeclineMarketplaceOrder = async (order) => {
    if (!order?.serverOrderId || confirmingOrderId || cancellingOrderId) return;
    setCancellingOrderId(order.serverOrderId);
    try {
      const result = await cancelMarketplaceOrder(order.serverOrderId);
      setMarketplaceOrders((current) => current.map((item) =>
        item.serverOrderId === order.serverOrderId ? { ...item, status: "cancelled" } : item
      ));
      onTriggerToast?.(result.duplicate
        ? `Order #${order.id} was already cancelled; its stock release was already processed.`
        : result.released_items > 0
          ? `Order #${order.id} declined. The server released stock for ${result.released_items} catalogue item(s).`
          : `Order #${order.id} declined. No stock reservation needed release.`);
    } catch (error) {
      onTriggerToast?.(error?.message || "The server could not decline this order.");
    } finally {
      setCancellingOrderId("");
    }
  };

  if (footerTab === "account") {
    return renderAccountTab();
  }

  const handleConfirmHeavyAndLaborBill = (ord) => {
    const fees = heavyLaborFees[ord.id] || { heavyTransportFee: 0, laborFee: 0 };
    const heavyFee = Number(fees.heavyTransportFee || 0);
    const laborCost = Number(fees.laborFee || 0);
    const baseDelivery = Number(ord.deliveryFee || 25) + heavyFee + laborCost;
    const sub = Number(ord.itemsTotal || ord.grandTotal || 100);
    const gst = Number(((sub + baseDelivery) * 0.05).toFixed(2));
    const grandTotal = Number((sub + baseDelivery + gst).toFixed(2));

    setOrders((currentOrders) =>
      currentOrders.map((o) =>
        o.id === ord.id
          ? {
              ...o,
              heavyTransportFee: heavyFee,
              laborFee: laborCost,
              deliveryFee: baseDelivery,
              gst,
              grandTotal,
              status: "BILL_PREPARED_PENDING_CUSTOMER_REVIEW"
            }
          : o
      )
    );
    if (onTriggerToast) {
          onTriggerToast(`Draft bill of ₹${grandTotal} updated in this app session. It has not been sent to the customer or saved as a server order.`);
    }
  };

  return (
    <div className="space-y-3 text-xs text-white">
      <div className="bg-slate-900 p-3 rounded-2xl border border-emerald-500/40 flex justify-between items-center">
        <div>
          <h3 className="font-black text-emerald-400 text-xs">
            {currentUser?.fullName || "Sri Laxmi Supermart"}
          </h3>
          <p className="text-[10px] text-slate-400">
            Product Merchant Desk &bull; 30-Min Auto Stock &amp; Heavy/Labor Billing
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToPersonalShop}
          className="bg-emerald-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer"
        >
          Personal Shop
        </button>
      </div>

      {/* TAB 1: ORDERS QUEUE ("home") */}
      {footerTab === "home" && (
        <div className="space-y-2.5">
          <div className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-amber-300 text-[11px]">
                Stock Reservation Window
              </p>
              <p className="text-[9px] text-slate-400">
                Live marketplace orders reserve available stock on the server. This manual timed toggle is not connected.
              </p>
            </div>
            <button
              type="button"
              disabled
              className={`px-2.5 py-1 rounded-lg font-black text-[9px] cursor-pointer ${
                autoStockWindowActive
                  ? "bg-emerald-400 text-slate-950"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              "SERVER SYNC PENDING"
            </button>
          </div>

          {ordersLoadError && (
            <p role="status" className="text-amber-200 bg-amber-950/50 border border-amber-700/60 rounded-xl p-2 text-[10px]">
              Live orders are temporarily unavailable. {ordersLoadError}
            </p>
          )}
          {merchantOrders.length === 0 ? (
            <p className="text-slate-400 text-center py-6 bg-slate-900 rounded-2xl border border-slate-800">
              No active store orders in queue. Place an order from the Customer App to test!
            </p>
          ) : (
            merchantOrders.map((ord) => {
              const feeEntry = heavyLaborFees[ord.id] || { heavyTransportFee: 0, laborFee: 0 };
              const canConfirmServerOrder =
                (ord.status === "awaiting_payment" && ord.paymentStatus === "PENDING") ||
                (["awaiting_payment", "merchant_confirmed", "paid"].includes(ord.status) && ord.paymentStatus === "PAID");
              const canCancelServerOrder =
                ["awaiting_payment", "merchant_confirmed"].includes(ord.status) &&
                ["PENDING", "FAILED"].includes(ord.paymentStatus);
              return (
                <div
                  key={ord.id}
                  className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2"
                >
                  <div className="flex justify-between font-bold">
                    <span className="text-emerald-400">
                      #{ord.id} &bull; {ord.customerName}
                    </span>
                    <span className="text-amber-300">Rs.{ord.grandTotal}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Address: {ord.address} | {ord.isServerManaged ? "Delivery verification: not issued" : "Doorstep OTP: masked"}
                  </p>
                  <p className="text-[10px] text-slate-200">
                    {(ord.items || []).map((i) => `${i.qty || 1}x ${i.name}`).join(", ")}
                  </p>

                  {ord.isServerManaged ? (
                    <div className="space-y-2 border-t border-slate-800 pt-2">
                      <p className="text-[10px] text-slate-300">
                        Server status: <strong>{String(ord.status).replace(/_/g, " ")}</strong>
                        {" · "}Payment: <strong>{String(ord.paymentStatus).replace(/_/g, " ")}</strong>
                      </p>
                      <button
                        type="button"
                        disabled={confirmingOrderId === ord.serverOrderId || cancellingOrderId === ord.serverOrderId || !canConfirmServerOrder}
                        onClick={() => handleConfirmMarketplaceOrder(ord)}
                        className="w-full bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-300 text-slate-950 font-black py-2 rounded-xl text-[10px]"
                      >
                        {confirmingOrderId === ord.serverOrderId
                          ? "Confirming on server…"
                          : ord.status === "accepted"
                            ? "Accepted after verified payment"
                            : ord.status === "merchant_confirmed"
                              && ord.paymentStatus === "PENDING"
                              ? "Confirmed · awaiting payment"
                              : ord.paymentStatus === "PAID"
                                ? "Accept Paid Order"
                              : "Confirm Order Availability"}
                      </button>
                      {canCancelServerOrder && (
                        <button
                          type="button"
                          disabled={confirmingOrderId === ord.serverOrderId || cancellingOrderId === ord.serverOrderId}
                          onClick={() => handleDeclineMarketplaceOrder(ord)}
                          className="w-full bg-rose-950 border border-rose-500 disabled:opacity-50 text-rose-200 font-black py-2 rounded-xl text-[10px]"
                        >
                          {cancellingOrderId === ord.serverOrderId ? "Declining…" : "Decline & Release Stock"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>

                  {/* Heavy Transport & Loading Labor Fee Adder (from 02.pdf) */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800">
                    <div>
                      <label className="text-[9px] text-slate-400 block">
                        Heavy Transport (Rs.)
                      </label>
                      <input
                        type="number"
                        value={feeEntry.heavyTransportFee}
                        onChange={(e) =>
                          setHeavyLaborFees({
                            ...heavyLaborFees,
                            [ord.id]: {
                              ...feeEntry,
                              heavyTransportFee: Number(e.target.value) || 0
                            }
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block">
                        Loading Labor Fee (Rs.)
                      </label>
                      <input
                        type="number"
                        value={feeEntry.laborFee}
                        onChange={(e) =>
                          setHeavyLaborFees({
                            ...heavyLaborFees,
                            [ord.id]: { ...feeEntry, laborFee: Number(e.target.value) || 0 }
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleConfirmHeavyAndLaborBill(ord)}
                      className="bg-slate-800 border border-emerald-400/50 text-emerald-300 font-black py-1.5 rounded-xl text-[10px] cursor-pointer"
                    >
                      Prepare Draft Bill
                    </button>
                    <button
                      type="button"
                      disabled={!canMarkOrderPacked(ord)}
                      onClick={() => {
                        if (!canMarkOrderPacked(ord)) {
                          onTriggerToast("Packing is locked until payment is verified by the server.");
                          return;
                        }
                        setOrders((currentOrders) =>
                          currentOrders.map((o) =>
                            o.id === ord.id
                              ? { ...o, status: "PACKED_PENDING_SERVER_DISPATCH" }
                              : o
                          )
                        );
                        onTriggerToast(`Order #${ord.id} marked packed in this app session. Dispatch still requires server confirmation.`);
                      }}
                      className="bg-amber-400 disabled:bg-slate-700 disabled:text-slate-300 text-slate-950 font-black py-1.5 rounded-xl text-[10px] cursor-pointer"
                    >
                      Mark Packed (Local)
                    </button>
                  </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ADVANCED STOCK MANUAL ("stock") */}
      {footerTab === "stock" && (
        <div className="space-y-2">
          <h4 className="font-black text-emerald-400">
            My server products and stock
          </h4>
          {liveProducts.map((product) => (
            <div key={product.id} className="space-y-2 rounded-xl bg-slate-900 p-3">
              <p className="text-sm font-bold text-white">{product.title}</p>
              <p className="text-xs text-slate-300">₹{product.price_inr} · {product.approval_status} · {product.stock_quantity} in stock</p>
              {product.is_active && product.approval_status === "approved" && <div className="flex gap-2">
                <input type="number" aria-label={`Stock change for ${product.title}`} placeholder="+ Add / − Remove" value={stockDeltas[product.id] ?? ""}
                  onChange={(event) => setStockDeltas((values) => ({ ...values, [product.id]: event.target.value }))} className="min-w-0 flex-1 rounded bg-slate-950 p-2 text-xs text-white" />
                <button type="button" disabled={stockBusy} onClick={() => adjustLiveStock(product)} className="rounded bg-emerald-500 px-3 py-2 text-xs font-bold text-slate-950">Save stock change</button>
              </div>}
            </div>
          ))}
          {merchantProducts.some((product) => !product.catalogItemId) && <h5 className="text-xs text-slate-400">Local product drafts</h5>}
          {merchantProducts.filter((product) => !product.catalogItemId).map((prod) => (
            <div
              key={prod.id}
              className="bg-slate-900 p-2.5 rounded-2xl border border-slate-800 flex justify-between items-center gap-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white truncate">{prod.subCategoryBrand}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-slate-400">Rs.</span>
                  <input
                    type="number"
                    value={prod.variants?.[0]?.price || 50}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!Number.isFinite(val) || val <= 0) return;
                      setProducts((products || []).map((item) =>
                        item.id === prod.id && item.ownerUserId === merchantId
                          ? { ...item, variants: (item.variants || []).map((variant, variantIndex) =>
                              variantIndex === 0 ? { ...variant, price: val, updatedAt: new Date().toISOString() } : variant
                            ) }
                          : item
                      ));
                    }}
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-1 text-emerald-300 font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setProducts((products || []).map((item) =>
                      item.id === prod.id && item.ownerUserId === merchantId
                        ? { ...item, status: "ARCHIVED_BY_MERCHANT", inStock: false }
                        : item
                    ))}
                    className="bg-rose-950/60 text-rose-300 border border-rose-700 px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setProducts((products || []).map((item) =>
                    item.id === prod.id && item.ownerUserId === merchantId
                      ? { ...item, inStock: !item.inStock, updatedAt: new Date().toISOString() }
                      : item
                  ));
                }}
                className={`px-3 py-1.5 rounded-xl font-black text-[10px] cursor-pointer ${
                  prod.inStock !== false
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-rose-950 text-rose-300 border border-rose-600"
                }`}
              >
                {prod.inStock !== false ? "In Stock" : "Out of Stock"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SUBMIT NEW BRAND SUB-CATEGORY ("add_brand") */}
      {footerTab === "add_brand" && (
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
          <h4 className="font-black text-amber-400">
            3. Submit New Brand Sub-Category to Founder Admin
          </h4>
          <select
            value={newProdForm.categoryId}
            onChange={(e) => setNewProdForm({ ...newProdForm, categoryId: e.target.value, subcategoryKey: "" })}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <select value={newProdForm.subcategoryKey} onChange={(e) => setNewProdForm({ ...newProdForm, subcategoryKey: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white">
            <option value="">No sub-catalog selected</option>
            {listSubcategories(categories).filter((item) => item.categoryId === newProdForm.categoryId).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <input
            type="text"
            value={newProdForm.subCategoryBrand}
            onChange={(e) =>
              setNewProdForm({ ...newProdForm, subCategoryBrand: e.target.value })
            }
            placeholder="Brand & Product Name (e.g. Fortune Sunflower Oil)"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={newProdForm.price}
              onChange={(e) =>
                setNewProdForm({ ...newProdForm, price: Number(e.target.value) || 0 })
              }
              placeholder="Selling Price (Rs.)"
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
            <input
              type="text"
              value={newProdForm.unitLabel}
              onChange={(e) => setNewProdForm({ ...newProdForm, unitLabel: e.target.value })}
              placeholder="Variant (1 Kg / 1 L)"
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
          </div>
          <button
            type="button"
            disabled={productSubmitting}
            onClick={async () => {
              const title = newProdForm.subCategoryBrand.trim();
              const price = Number(newProdForm.price);
              const mrp = Number(newProdForm.mrp || newProdForm.price);
              if (!title || !merchantId || !currentUser?.partnerId ||
                  !Number.isFinite(price) || price <= 0 ||
                  !Number.isFinite(mrp) || mrp < price) {
                onTriggerToast("A verified partner profile, product name, valid price and MRP are required.");
                return;
              }
              if (!supabase) {
                onTriggerToast("WE4ALL backend is unavailable. Product was not saved.");
                return;
              }
              setProductSubmitting(true);
              try {
                const sku = "WE4-" + (globalThis.crypto?.randomUUID?.() || Date.now()).toString().replace(/-/g, "").slice(0, 12).toUpperCase();
                const { data: created, error } = await supabase
                  .from("we4all_catalog_items")
                  .insert({
                    partner_id: currentUser.partnerId,
                    sku,
                    title,
                    description: "",
                    category_key: newProdForm.categoryId,
                    item_type: "physical",
                    price_inr: price,
                    mrp_inr: mrp,
                    stock_quantity: 0,
                    unit_label: newProdForm.unitLabel || "unit",
                    metadata: { image_url: newProdForm.image || "", subcategory_key: newProdForm.subcategoryKey || null }
                  })
                  .select("id,partner_id,title,sku,category_key,price_inr,mrp_inr,stock_quantity,unit_label,approval_status,is_active,created_at")
                  .single();
                if (error) throw error;
                const product = {
                  id: created.id,
                  catalogItemId: created.id,
                  ownerUserId: merchantId,
                  merchantId,
                  partnerId: created.partner_id,
                  categoryId: created.category_key,
                  subcategoryKey: newProdForm.subcategoryKey || "",
                  subCategoryBrand: created.title,
                  shopName: merchantName,
                  sku: created.sku,
                  variants: [{ id: created.id, label: created.unit_label, price: Number(created.price_inr), mrp: Number(created.mrp_inr), weightGrams: 1000 }],
                  stockQuantity: created.stock_quantity,
                  inStock: false,
                  status: "PENDING_ADMIN_APPROVAL",
                  createdAt: created.created_at
                };
                setProducts([product, ...(products || [])]);
                setNewProdForm({ ...newProdForm, subCategoryBrand: "", price: 0, mrp: 0 });
                onTriggerToast("Product saved to WE4ALL database as pending approval with zero stock. Founder approval and stock entry are required before customer sale.");
              } catch (error) {
                onTriggerToast(error?.message || "Could not save product to WE4ALL.");
              } finally {
                setProductSubmitting(false);
              }
            }}
            className="w-full bg-emerald-500 disabled:opacity-50 text-slate-950 font-black py-2 rounded-xl"
          >
            {productSubmitting ? "Saving to WE4ALL…" : "Submit Product for Approval"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!newProdForm.subCategoryBrand.trim()) return;
              setPendingSubCategories([
                ...pendingSubCategories,
                {
                  id: `ps_${Date.now()}`,
                  categoryId: newProdForm.categoryId,
                  subCategoryBrand: newProdForm.subCategoryBrand.trim(),
                  shopName: newProdForm.shopName,
                  distanceKm: 1.1,
                  image: newProdForm.image,
                  status: "pending",
                  variants: [
                    {
                      id: `v_${Date.now()}`,
                      label: newProdForm.unitLabel,
                      price: newProdForm.price,
                      mrp: newProdForm.price + 15,
                      weightGrams: 1000
                    }
                  ]
                }
              ]);
              setNewProdForm({ ...newProdForm, subCategoryBrand: "" });
              if (onTriggerToast) {
                onTriggerToast("Submitted Brand Sub-Category to Founder Admin for approval!");
              }
            }}
            className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
          >
            Submit Brand for Admin Approval &rarr;
          </button>

          {rejectedItems && (rejectedItems || []).length > 0 && (
            <div className="bg-rose-950/60 border border-rose-500 p-2.5 rounded-xl text-rose-200 space-y-1">
              <p className="font-bold text-[10px]">
                Rejected by Founder Admin (Needs Correction):
              </p>
              {rejectedItems.map((r) => (
                <p key={r.id} className="text-[9px]">
                  &bull; {r.subCategoryBrand}: {r.rejectReason} ({r.rejectComment})
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INVOICES & GST LEDGER ("orders") */}
      {footerTab === "orders" && (
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <h4 className="font-black text-emerald-400">
            4. Merchant GST &amp; Settlement Ledger ({merchantOrders.length} Orders)
          </h4>
          <p className="text-[11px] text-slate-300">
            Order value shown (not settled payout):{" "}
            <strong>
              Rs.{merchantOrders.reduce((s, o) => s + Number(o.grandTotal || 0), 0)}
            </strong>{" "}
            (settlement not verified)
          </p>
        </div>
      )}
    </div>
  );
}
