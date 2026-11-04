import React, { useState } from "react";

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
  const [autoStockWindowActive, setAutoStockWindowActive] = useState(true);
  const [heavyLaborFees, setHeavyLaborFees] = useState({});
  const [newProdForm, setNewProdForm] = useState({
    categoryId: "daily_needs",
    subCategoryBrand: "",
    shopName: currentUser?.fullName || "Sri Laxmi Supermart",
    price: 65,
    mrp: 75,
    unitLabel: "1 kg Pack",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80"
  });

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

    setOrders(
      orders.map((o) =>
        o.id === ord.id
          ? {
              ...o,
              heavyTransportFee: heavyFee,
              laborFee: laborCost,
              deliveryFee: baseDelivery,
              gst,
              grandTotal,
              status: "MERCHANT_CONFIRMED_WAIT_PAYMENT"
            }
          : o
      )
    );
    if (onTriggerToast) {
      onTriggerToast(`Confirmed Bill (Rs.${grandTotal}) & pushed to Customer for UPI payment!`);
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
                30-Min Autonomous Stock Window
              </p>
              <p className="text-[9px] text-slate-400">
                Standard orders bypass popup wait; heavy orders allow adding Transport &amp; Labor fees
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoStockWindowActive(!autoStockWindowActive)}
              className={`px-2.5 py-1 rounded-lg font-black text-[9px] cursor-pointer ${
                autoStockWindowActive
                  ? "bg-emerald-400 text-slate-950"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {autoStockWindowActive ? "AUTO ON" : "MANUAL"}
            </button>
          </div>

          {(orders || []).length === 0 ? (
            <p className="text-slate-400 text-center py-6 bg-slate-900 rounded-2xl border border-slate-800">
              No active store orders in queue. Place an order from the Customer App to test!
            </p>
          ) : (
            orders.map((ord) => {
              const feeEntry = heavyLaborFees[ord.id] || { heavyTransportFee: 0, laborFee: 0 };
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
                    Address: {ord.address} | Doorstep OTP: **** (Masked)
                  </p>
                  <p className="text-[10px] text-slate-200">
                    {(ord.items || []).map((i) => `${i.qty || 1}x ${i.name}`).join(", ")}
                  </p>

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
                      Verify Stock &amp; Push Final Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrders(
                          orders.map((o) =>
                            o.id === ord.id
                              ? { ...o, status: "READY_FOR_PICKUP_AGENT_ALERTED" }
                              : o
                          )
                        );
                        if (onTriggerToast) {
                          onTriggerToast(
                            `Order #${ord.id} Packed & Ready! Delivery Captain alerted.`
                          );
                        }
                      }}
                      className="bg-amber-400 text-slate-950 font-black py-1.5 rounded-xl text-[10px] cursor-pointer"
                    >
                      Packed &amp; Ready &rarr; Alert Rider
                    </button>
                  </div>
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
            2. Physical Product Stock &amp; Inline Price Manual ({(products || []).length} Items)
          </h4>
          {products.map((prod, idx) => (
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
                      const next = [...products];
                      const val = Number(e.target.value) || 0;
                      if (next[idx].variants?.[0]) next[idx].variants[0].price = val;
                      setProducts(next);
                    }}
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-1 text-emerald-300 font-bold text-xs"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setProducts(products.filter((item) => item.id !== prod.id))
                    }
                    className="bg-rose-950/60 text-rose-300 border border-rose-700 px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = [...products];
                  next[idx].inStock = !next[idx].inStock;
                  setProducts(next);
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
            onChange={(e) => setNewProdForm({ ...newProdForm, categoryId: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
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
            4. Merchant GST &amp; Settlement Ledger ({(orders || []).length} Orders)
          </h4>
          <p className="text-[11px] text-slate-300">
            Total Settled Volume:{" "}
            <strong>
              Rs.{orders.reduce((s, o) => s + Number(o.grandTotal || 0), 0)}
            </strong>{" "}
            (0% Commission Forever)
          </p>
        </div>
      )}
    </div>
  );
}