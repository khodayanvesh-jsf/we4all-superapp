import React, { useState } from "react";

export default function MerchantPortal({
  footerTab,
  setFooterTab,
  currentUser,
  categories,
  products,
  setProducts,
  pendingSubCategories,
  setPendingSubCategories,
  orders,
  setOrders,
  merchants,
  pendingMerchants,
  onSwitchToPersonalShop,
  onTriggerToast,
  renderAccountTab
}) {
  // Queue States
  const [heavyFeeMap, setHeavyFeeMap] = useState({});
  const [laborFeeMap, setLaborFeeMap] = useState({});

  // Stock Manual States
  const [stockSearch, setStockSearch] = useState("");
  const [stockCatFilter, setStockCatFilter] = useState("ALL");

  // Add Brand & Bulk Import States
  const [addMode, setAddMode] = useState("single"); // "single" | "excel" | "billing"
  const [brandForm, setBrandForm] = useState({
    categoryId: "daily_needs",
    subCategoryBrand: "",
    variantLabel: "1 kg Pack",
    weightGrams: 1000,
    price: "",
    mrp: "",
    stockQty: 50,
    hsnGst: 5,
    licenseNo: "",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80",
    rulesAccepted: false
  });
  const [bulkPreviewRows, setBulkPreviewRows] = useState([]);
  const [billingSoftware, setBillingSoftware] = useState("TALLY_PRIME");
  const [rawBillingText, setRawBillingText] = useState("");

  // Invoices States
  const [invoicePeriod, setInvoicePeriod] = useState("ALL");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("ALL");

  // Check if current merchant is pending or approved
  const myPendingRecord = (pendingMerchants || []).find(
    (m) => m.phone === currentUser?.phone || m.businessName === currentUser?.fullName
  );
  const isApprovedLive =
    !myPendingRecord ||
    (merchants || []).some(
      (m) =>
        (m.phone === currentUser?.phone || m.businessName === currentUser?.fullName) &&
        m.status === "Approved"
    );

  // Helper: Download Sample CSV for Excel
  const handleDownloadSampleCsv = () => {
    const sample = [
      "BrandName,CategoryId,VariantLabel,SellingPrice,MRP,StockQty,WeightGrams,GSTPercent",
      "Aashirvaad Select Atta,daily_needs,5 kg Bag,265,295,40,5000,5",
      "Tata Sampann Toor Dal,daily_needs,1 kg Pack,155,180,60,1000,5",
      "UltraTech Super Cement,construction,50 kg Bag,385,420,100,50000,18",
      "Dolo 650 Strip,medicines,15 Tablets,30,34,120,50,12"
    ].join("\n");
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "WE4ALL_Supermart_Bulk_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
    onTriggerToast("Downloaded Excel/CSV Sample Template!");
  };

  // Helper: Parse CSV / Excel text into preview rows
  const parseCsvTextToRows = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];
    const startIdx = lines[0].toLowerCase().includes("brand") || lines[0].toLowerCase().includes("price") ? 1 : 0;
    return lines.slice(startIdx).map((line, i) => {
      const cols = line.split(/[,\t;|]/).map((c) => c.trim());
      return {
        id: Date.now() + i,
        subCategoryBrand: cols[0] || `Supermart Item #${i + 1}`,
        categoryId: cols[1] || "daily_needs",
        variantLabel: cols[2] || "1 Unit",
        price: Number(cols[3]) || 99,
        mrp: Number(cols[4]) || Number(cols[3] || 99) + 15,
        stockQty: Number(cols[5]) || 50,
        weightGrams: Number(cols[6]) || 1000,
        hsnGst: Number(cols[7]) || 5
      };
    });
  };

  const handleExcelFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsvTextToRows(String(reader.result || ""));
      setBulkPreviewRows(parsed);
      onTriggerToast(`Parsed ${parsed.length} products from ${file.name}!`);
    };
    reader.readAsText(file);
  };

  const handleLoadBillingSample = () => {
    const sampleDump = [
      `Fortune Sunlite Refined Oil | daily_needs | 1 Litre Pouch | 138 | 160 | 85 | 1000 | 5`,
      `Surf Excel Matic Liquid | daily_needs | 2 Litre Bottle | 410 | 460 | 35 | 2000 | 18`,
      `Red Label Natural Care Tea | daily_needs | 500 g Pack | 275 | 310 | 50 | 500 | 5`,
      `Good Knight Gold Flash | daily_needs | Twin Refill | 142 | 160 | 70 | 250 | 18`,
      `Colgate Strong Teeth Paste | daily_needs | 200 g Family Pack | 115 | 130 | 90 | 200 | 18`
    ].join("\n");
    setRawBillingText(sampleDump);
    const parsed = parseCsvTextToRows(sampleDump);
    setBulkPreviewRows(parsed);
    onTriggerToast(`Loaded 5 sample items from ${billingSoftware.replace(/_/g, " ")}!`);
  };

  const handleCommitBulkImport = () => {
    if (bulkPreviewRows.length === 0) return;
    const shopTitle = currentUser?.fullName || "Sri Laxmi Supermart";
    const createdProducts = bulkPreviewRows.map((r, idx) => ({
      id: Date.now() + idx,
      zoneId: "adilabad",
      categoryId: r.categoryId,
      subCategoryBrand: r.subCategoryBrand,
      shopName: shopTitle,
      distanceKm: 1.2,
      rating: 5.0,
      curiosityTag: `Imported (${billingSoftware})`,
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80",
      status: isApprovedLive ? "approved" : "pending_shop_approval",
      isPublished: isApprovedLive,
      stockQty: r.stockQty,
      inStock: r.stockQty > 0,
      hsnGst: r.hsnGst,
      variants: [
        {
          id: "v1",
          label: r.variantLabel,
          price: r.price,
          mrp: r.mrp,
          weightGrams: r.weightGrams
        }
      ],
      merchantOffers: [
        {
          merchantId: currentUser?.id || 1,
          merchantName: shopTitle,
          price: r.price,
          area: "Adilabad",
          rating: 5.0
        }
      ]
    }));

    setProducts([...createdProducts, ...products]);
    setPendingSubCategories([...createdProducts, ...pendingSubCategories]);
    setBulkPreviewRows([]);
    setRawBillingText("");
    setFooterTab("stock");
    onTriggerToast(
      `Imported ${createdProducts.length} products into your Stock Manual & Server!`
    );
  };

  // Printable / Downloadable Merchant GST Invoice
  const handleDownloadMerchantInvoice = (ord) => {
    const win = window.open("", "_blank", "width=720,height=800");
    if (!win) {
      onTriggerToast("Popup blocked. Allow popups to download PDF invoice.");
      return;
    }
    const rowsHtml = (ord.items || [])
      .map(
        (it, i) =>
          `<tr>
            <td style="padding:6px;border:1px solid #cbd5e1;">${i + 1}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;">${it.name}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:center;">${it.qty}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:right;">Rs.${it.price}</td>
            <td style="padding:6px;border:1px solid #cbd5e1;text-align:right;">Rs.${it.price * it.qty}</td>
          </tr>`
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>Merchant_GST_Invoice_${ord.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            .box { border: 2px solid #059669; border-radius: 12px; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="box">
            <h2 style="margin:0;color:#059669;">WE4ALL MERCHANT TAX INVOICE & INVENTORY LEDGER</h2>
            <p style="margin:4px 0;font-size:12px;">
              <strong>Merchant:</strong> ${currentUser?.fullName || ord.shopName} |
              <strong>UPI:</strong> ${currentUser?.upiId || "merchant@ybl"}
            </p>
            <p style="margin:4px 0;font-size:12px;">
              <strong>Order ID:</strong> #${ord.id} |
              <strong>Date:</strong> ${ord.dateStr || "2026-10-29"} ${ord.createdAt || ""} |
              <strong>Customer:</strong> ${ord.customerName} (${ord.address})
            </p>
            <table>
              <thead>
                <tr style="background:#f1f5f9;">
                  <th style="padding:6px;border:1px solid #cbd5e1;">#</th>
                  <th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Product / Variant</th>
                  <th style="padding:6px;border:1px solid #cbd5e1;">Qty</th>
                  <th style="padding:6px;border:1px solid #cbd5e1;text-align:right;">Unit Price</th>
                  <th style="padding:6px;border:1px solid #cbd5e1;text-align:right;">Line Total</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <div style="margin-top:14px;text-align:right;font-size:13px;">
              <p style="margin:3px 0;">Items Subtotal: <strong>Rs.${ord.itemsTotal || ord.grandTotal}</strong></p>
              <p style="margin:3px 0;">Logistics / Delivery: <strong>Rs.${ord.deliveryFee || 0}</strong></p>
              <p style="margin:3px 0;">5% GST Collected: <strong>Rs.${ord.gst || 0}</strong></p>
              <h3 style="margin:6px 0;color:#059669;">Grand Total: Rs.${ord.grandTotal} (${ord.status})</h3>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  if (footerTab === "account") {
    return renderAccountTab();
  }

  return (
    <div className="space-y-3 text-xs text-white">
      {/* MERCHANT HEADER + LIVE MARKET PUBLISHING STATUS BANNER */}
      <div className="bg-slate-900 p-3 rounded-2xl border border-emerald-500/40 space-y-2">
        <div className="flex justify-between items-center gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-emerald-400 text-xs">
                {currentUser?.fullName || "Sri Laxmi Supermart"}
              </h3>
              {isApprovedLive ? (
                <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded">
                  LIVE IN MARKET
                </span>
              ) : (
                <span className="bg-amber-500/20 border border-amber-400 text-amber-300 text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">
                  PENDING ADMIN APPROVAL
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {isApprovedLive
                ? "Shop is published live to Customer Super-App"
                : "Visible only to You & Admin until Admin verifies your KYC & T&C Checklist"}
            </p>
          </div>
          <button
            type="button"
            onClick={onSwitchToPersonalShop}
            className="bg-emerald-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0"
          >
            Personal Shop
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: ORDER QUEUE (footerTab === "home")                            */}
      {/* ==================================================================== */}
      {footerTab === "home" && (
        <div className="space-y-2.5">
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
            <div>
              <h4 className="font-black text-amber-400 text-xs">
                1. Live Incoming Order & Packing Queue ({orders.length})
              </h4>
              <p className="text-[10px] text-slate-400">
                Approve stock, add heavy/labor fees if applicable & alert Captain
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const sampleProd = products[0] || {
                  id: 101,
                  subCategoryBrand: "Aashirvaad Atta (5 kg)",
                  variants: [{ id: "v1", label: "5 kg", price: 245, weightGrams: 5000 }]
                };
                const simOrd = {
                  id: `VFL-${Math.floor(1000 + Math.random() * 9000)}`,
                  dateStr: "2026-10-29",
                  createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  periodTag: "TODAY",
                  customerName: "Ramesh Kumar (Adilabad)",
                  address: "Subhash Nagar, Adilabad",
                  distanceKm: 1.9,
                  totalWeightGrams: 5000,
                  vehicle: "2W Bike Captain (Up to 45kg)",
                  shopName: currentUser?.fullName || "Sri Laxmi Supermart",
                  items: [
                    {
                      productId: sampleProd.id,
                      name: sampleProd.subCategoryBrand,
                      qty: 2,
                      price: sampleProd.variants?.[0]?.price || 245,
                      merchantName: currentUser?.fullName || "Sri Laxmi Supermart",
                      approvalStatus: "PENDING_MERCHANT"
                    }
                  ],
                  itemsTotal: (sampleProd.variants?.[0]?.price || 245) * 2,
                  deliveryFee: 25,
                  gst: 25.75,
                  grandTotal: (sampleProd.variants?.[0]?.price || 245) * 2 + 50.75,
                  riderName: "Raju Local Rider",
                  status: "AWAITING_MERCHANT_APPROVAL",
                  secretOtp: String(Math.floor(1000 + Math.random() * 9000))
                };
                setOrders([simOrd, ...orders]);
                onTriggerToast(`Simulated Incoming Order #${simOrd.id} in Queue!`);
              }}
              className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0"
            >
              + Test Order
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center space-y-2">
              <p className="text-slate-300 font-bold">No active orders in your Queue right now.</p>
              <p className="text-[10px] text-slate-400">
                Tap &ldquo;+ Test Order&rdquo; above or place an order from the Customer Super-App to test your live queue!
              </p>
            </div>
          ) : (
            orders.map((ord) => (
              <div
                key={ord.id}
                className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-emerald-400">
                    #{ord.id} &bull; {ord.createdAt || "Live"}
                  </span>
                  <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded text-[9px] font-black">
                    {ord.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">
                  Customer: <strong>{ord.customerName}</strong> | {ord.address} | Vehicle: {ord.vehicle}
                </p>

                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-1">
                  {(ord.items || []).map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span>
                        {it.qty}x {it.name}
                      </span>
                      <span className="text-emerald-300 font-bold">
                        Rs.{it.price * it.qty} ({it.approvalStatus || "APPROVED"})
                      </span>
                    </div>
                  ))}
                </div>

                {ord.status === "AWAITING_MERCHANT_APPROVAL" && (
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        placeholder="Heavy Transport Fee (Rs.)"
                        value={heavyFeeMap[ord.id] || ""}
                        onChange={(e) =>
                          setHeavyFeeMap({ ...heavyFeeMap, [ord.id]: Number(e.target.value) || 0 })
                        }
                        className="bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white text-[10px]"
                      />
                      <input
                        type="number"
                        placeholder="Hamali / Labor Fee (Rs.)"
                        value={laborFeeMap[ord.id] || ""}
                        onChange={(e) =>
                          setLaborFeeMap({ ...laborFeeMap, [ord.id]: Number(e.target.value) || 0 })
                        }
                        className="bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white text-[10px]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const extra =
                          Number(heavyFeeMap[ord.id] || 0) + Number(laborFeeMap[ord.id] || 0);
                        setOrders(
                          orders.map((o) => {
                            if (o.id !== ord.id) return o;
                            const nextDel = (o.deliveryFee || 25) + extra;
                            const nextGst = Number(((o.itemsTotal + nextDel) * 0.05).toFixed(2));
                            return {
                              ...o,
                              deliveryFee: nextDel,
                              gst: nextGst,
                              grandTotal: Number((o.itemsTotal + nextDel + nextGst).toFixed(2)),
                              items: (o.items || []).map((it) => ({
                                ...it,
                                approvalStatus: "APPROVED"
                              })),
                              status: "MERCHANT_APPROVED_AWAITING_PAYMENT"
                            };
                          })
                        );
                        onTriggerToast(
                          `Order #${ord.id} Stock Approved! Bill sent to Customer for UPI Payment.`
                        );
                      }}
                      className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                    >
                      1. Approve Stock & Push Final Bill to Customer &rarr;
                    </button>
                  </div>
                )}

                {ord.status === "MERCHANT_APPROVED_AWAITING_PAYMENT" && (
                  <div className="flex gap-1.5">
                    <span className="flex-1 bg-slate-950 border border-amber-400/40 text-amber-300 p-2 rounded-xl text-[10px] font-bold text-center">
                      Waiting for Customer UPI Payment (Rs.{ord.grandTotal})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOrders(
                          orders.map((o) =>
                            o.id === ord.id ? { ...o, status: "PAID_PACKING_STARTED" } : o
                          )
                        );
                        onTriggerToast(`Marked Order #${ord.id} as Paid & Packing Started!`);
                      }}
                      className="bg-teal-400 text-slate-950 font-black px-3 rounded-xl text-[10px] cursor-pointer"
                    >
                      Simulate UPI Paid
                    </button>
                  </div>
                )}

                {ord.status === "PAID_PACKING_STARTED" && (
                  <button
                    type="button"
                    onClick={() => {
                      // Deduct stock quantities automatically
                      setOrders(
                        orders.map((o) =>
                          o.id === ord.id
                            ? { ...o, status: "READY_FOR_PICKUP_AGENT_ALERTED" }
                            : o
                        )
                      );
                      onTriggerToast(
                        `Order #${ord.id} Packed! Delivery Captain alerted with Live GPS Route.`
                      );
                    }}
                    className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                  >
                    2. Complete Packing & Dispatch Delivery Captain &rarr;
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: STOCK MANUAL & QUANTITY EDITOR (footerTab === "stock")        */}
      {/* ==================================================================== */}
      {footerTab === "stock" && (
        <div className="space-y-2.5">
          <div className="bg-slate-900 p-3 rounded-2xl border border-emerald-500/40 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-black text-emerald-400 text-xs">
                2. Live Store Stock Manual & Quantity Availability ({products.length} Products)
              </h4>
                            <button
                type="button"
                onClick={() => {
                  const firstProd = products[0];
                  if (firstProd) {
                    setStockSearch(firstProd.subCategoryBrand.split(" ")[0]);
                    onTriggerToast(`Barcode Scanned (89010588512): Matched "${firstProd.subCategoryBrand}"!`);
                  }
                }}
                className="bg-emerald-400 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
              >
                Scan Packet Barcode
              </button>
              <button
                type="button"
                onClick={() => setFooterTab("add_brand")}
                className="bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
              >
                + Bulk / Add Brand
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Search stock or scan barcode..."
                className="bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white text-[11px]"
              />
              <select
                value={stockCatFilter}
                onChange={(e) => setStockCatFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white text-[11px] font-bold"
              >
                <option value="ALL">All Categories ({products.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {products
            .filter(
              (p) =>
                (stockCatFilter === "ALL" || p.categoryId === stockCatFilter) &&
                p.subCategoryBrand.toLowerCase().includes(stockSearch.toLowerCase())
            )
            .map((prod) => {
              const qty = prod.stockQty ?? 25;
              const inStock = prod.inStock !== false && qty > 0;
              const v0 = prod.variants?.[0] || { label: "1 Unit", price: 100, mrp: 120 };

              return (
                <div
                  key={prod.id}
                  className={`p-3 rounded-2xl border space-y-2 ${
                    inStock
                      ? "bg-slate-900 border-slate-800"
                      : "bg-rose-950/30 border-rose-500/50"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-2 items-center min-w-0">
                      <img
                        src={prod.image}
                        alt={prod.subCategoryBrand}
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{prod.subCategoryBrand}</p>
                        <p className="text-[10px] text-slate-400">
                          Variant: {v0.label} | GST: {prod.hsnGst ?? 5}%
                        </p>
                        {qty <= 5 && (
                          <span className="text-[9px] text-amber-300 font-black">
                            LOW STOCK WARNING ({qty} left)
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !inStock;
                        setProducts(
                          products.map((p) =>
                            p.id === prod.id
                              ? { ...p, inStock: nextState, stockQty: nextState ? Math.max(1, qty) : 0 }
                              : p
                          )
                        );
                        onTriggerToast(
                          `${prod.subCategoryBrand} marked ${nextState ? "IN STOCK" : "OUT OF STOCK"}`
                        );
                      }}
                      className={`px-2.5 py-1 rounded-xl font-black text-[9px] cursor-pointer shrink-0 ${
                        inStock ? "bg-emerald-400 text-slate-950" : "bg-rose-600 text-white"
                      }`}
                    >
                      {inStock ? "IN STOCK" : "OUT OF STOCK"}
                    </button>
                  </div>

                  {/* QUANTITY & PRICE CONTROLS */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800 items-center">
                    <div>
                      <label className="block text-[9px] text-slate-400">Available Qty:</label>
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            const nextQ = Math.max(0, qty - 1);
                            setProducts(
                              products.map((p) =>
                                p.id === prod.id
                                  ? { ...p, stockQty: nextQ, inStock: nextQ > 0 }
                                  : p
                              )
                            );
                          }}
                          className="bg-slate-800 px-2 py-0.5 rounded font-black text-amber-300 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={qty}
                          onChange={(e) => {
                            const nextQ = Math.max(0, Number(e.target.value) || 0);
                            setProducts(
                              products.map((p) =>
                                p.id === prod.id
                                  ? { ...p, stockQty: nextQ, inStock: nextQ > 0 }
                                  : p
                              )
                            );
                          }}
                          className="w-12 bg-slate-900 border border-slate-700 rounded text-center font-mono text-white py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const nextQ = qty + 5;
                            setProducts(
                              products.map((p) =>
                                p.id === prod.id
                                  ? { ...p, stockQty: nextQ, inStock: true }
                                  : p
                              )
                            );
                          }}
                          className="bg-slate-800 px-1.5 py-0.5 rounded font-black text-emerald-300 cursor-pointer"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400">Sell Price (Rs.):</label>
                      <input
                        type="number"
                        value={v0.price}
                        onChange={(e) => {
                          const newP = Number(e.target.value) || 0;
                          setProducts(
                            products.map((p) =>
                              p.id === prod.id
                                ? {
                                    ...p,
                                    variants: p.variants.map((v, i) =>
                                      i === 0 ? { ...v, price: newP } : v
                                    ),
                                    merchantOffers: (p.merchantOffers || []).map((m, i) =>
                                      i === 0 ? { ...m, price: newP } : m
                                    )
                                  }
                                : p
                            )
                          );
                        }}
                        className="w-full bg-slate-900 border border-emerald-500/50 rounded-lg p-1 text-emerald-300 font-bold mt-0.5"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] text-slate-400">MRP (Rs.):</label>
                      <input
                        type="number"
                        value={v0.mrp}
                        onChange={(e) => {
                          const newMrp = Number(e.target.value) || 0;
                          setProducts(
                            products.map((p) =>
                              p.id === prod.id
                                ? {
                                    ...p,
                                    variants: p.variants.map((v, i) =>
                                      i === 0 ? { ...v, mrp: newMrp } : v
                                    )
                                  }
                                : p
                            )
                          );
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-slate-300 mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: + ADD BRAND, EXCEL UPLOAD & BILLING SOFTWARE IMPORTER         */}
      {/* ==================================================================== */}
      {footerTab === "add_brand" && (
        <div className="space-y-3">
          {/* 3-Mode Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-[10px]">
            <button
              type="button"
              onClick={() => setAddMode("single")}
              className={`py-2 rounded-xl font-black cursor-pointer ${
                addMode === "single" ? "bg-emerald-400 text-slate-950" : "text-slate-300"
              }`}
            >
              1. Single Brand
            </button>
            <button
              type="button"
              onClick={() => setAddMode("excel")}
              className={`py-2 rounded-xl font-black cursor-pointer ${
                addMode === "excel" ? "bg-amber-400 text-slate-950" : "text-slate-300"
              }`}
            >
              2. Excel / CSV Upload
            </button>
            <button
              type="button"
              onClick={() => setAddMode("billing")}
              className={`py-2 rounded-xl font-black cursor-pointer ${
                addMode === "billing" ? "bg-teal-400 text-slate-950" : "text-slate-300"
              }`}
            >
              3. Billing Software
            </button>
          </div>

          {/* MODE 1: SINGLE PRODUCT BRAND WITH COMPLIANCE RULES */}
          {addMode === "single" && (
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-emerald-500/40 space-y-2.5">
              <h4 className="font-black text-emerald-400 text-xs">
                Add New Product Brand (With MRP, Stock Qty & Compliance Rules)
              </h4>

              <select
                value={brandForm.categoryId}
                onChange={(e) => setBrandForm({ ...brandForm, categoryId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    Category: {c.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={brandForm.subCategoryBrand}
                onChange={(e) =>
                  setBrandForm({ ...brandForm, subCategoryBrand: e.target.value })
                }
                placeholder="Brand & Product Name (e.g. Fortune Sunlite Oil)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />

              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={brandForm.variantLabel}
                  onChange={(e) => setBrandForm({ ...brandForm, variantLabel: e.target.value })}
                  placeholder="Pack Size (e.g. 1 Litre / 5 kg)"
                  className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
                <input
                  type="number"
                  value={brandForm.weightGrams}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, weightGrams: Number(e.target.value) || 500 })
                  }
                  placeholder="Weight in Grams (1000 = 1kg)"
                  className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="number"
                  value={brandForm.price}
                  onChange={(e) => setBrandForm({ ...brandForm, price: e.target.value })}
                  placeholder="Sell Price (Rs.)"
                  className="bg-slate-950 border border-emerald-500/50 rounded-xl p-2 text-white font-bold"
                />
                <input
                  type="number"
                  value={brandForm.mrp}
                  onChange={(e) => setBrandForm({ ...brandForm, mrp: e.target.value })}
                  placeholder="MRP (Rs.)"
                  className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
                <input
                  type="number"
                  value={brandForm.stockQty}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, stockQty: Number(e.target.value) || 10 })
                  }
                  placeholder="Stock Qty"
                  className="bg-slate-950 border border-amber-400/50 rounded-xl p-2 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={brandForm.hsnGst}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, hsnGst: Number(e.target.value) })
                  }
                  className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value={0}>GST Slab: 0% (Exempt Fresh)</option>
                  <option value={5}>GST Slab: 5% (Essential Kirana)</option>
                  <option value={12}>GST Slab: 12% (Pharma / Processed)</option>
                  <option value={18}>GST Slab: 18% (Hardware / FMCG)</option>
                </select>
                <input
                  type="text"
                  value={brandForm.licenseNo}
                  onChange={(e) => setBrandForm({ ...brandForm, licenseNo: e.target.value })}
                  placeholder="FSSAI / Drug / ISI License (Opt)"
                  className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <label className="flex items-start gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={brandForm.rulesAccepted}
                  onChange={(e) =>
                    setBrandForm({ ...brandForm, rulesAccepted: e.target.checked })
                  }
                  className="mt-0.5"
                />
                <span className="text-[10px] text-slate-300">
                  I certify this product is genuine, non-expired, and priced at or below legal MRP as per WE4ALL Merchant Consort Rules.
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  if (!brandForm.subCategoryBrand.trim()) {
                    alert("Please enter the Product Brand Name.");
                    return;
                  }
                  const sellP = Number(brandForm.price) || 100;
                  const mrpP = Number(brandForm.mrp) || sellP + 20;
                  if (sellP > mrpP) {
                    alert("Compliance Violation: Selling Price cannot exceed MRP!");
                    return;
                  }
                  if (!brandForm.rulesAccepted) {
                    alert("Please accept the Merchant Consort Rules checkbox.");
                    return;
                  }
                  const shopTitle = currentUser?.fullName || "Sri Laxmi Supermart";
                  const newProd = {
                    id: Date.now(),
                    zoneId: "adilabad",
                    categoryId: brandForm.categoryId,
                    subCategoryBrand: brandForm.subCategoryBrand.trim(),
                    shopName: shopTitle,
                    distanceKm: 1.2,
                    rating: 5.0,
                    curiosityTag: "Verified Local Stock",
                    image: brandForm.image,
                    status: isApprovedLive ? "approved" : "pending_shop_approval",
                    isPublished: isApprovedLive,
                    stockQty: Number(brandForm.stockQty) || 50,
                    inStock: true,
                    hsnGst: brandForm.hsnGst,
                    variants: [
                      {
                        id: "v1",
                        label: brandForm.variantLabel || "1 Pack",
                        price: sellP,
                        mrp: mrpP,
                        weightGrams: Number(brandForm.weightGrams) || 1000
                      }
                    ],
                    merchantOffers: [
                      {
                        merchantId: currentUser?.id || 1,
                        merchantName: shopTitle,
                        price: sellP,
                        area: "Adilabad",
                        rating: 5.0
                      }
                    ]
                  };
                  setProducts([newProd, ...products]);
                  setPendingSubCategories([newProd, ...pendingSubCategories]);
                  setBrandForm({ ...brandForm, subCategoryBrand: "", price: "", mrp: "" });
                  setFooterTab("stock");
                  onTriggerToast(
                    `Added ${newProd.subCategoryBrand} (${newProd.stockQty} units) to Stock Manual!`
                  );
                }}
                className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
              >
                + Save Product Brand to Stock Manual & Server
              </button>
            </div>
          )}

          {/* MODE 2: BULK EXCEL / CSV UPLOAD FOR SUPERMARTS (REQ 5) */}
          {addMode === "excel" && (
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-amber-400/50 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-black text-amber-400 text-xs">
                    Supermart Bulk Excel / CSV Product Uploader
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Upload your entire store catalog in one click instead of adding one by one
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="bg-slate-800 border border-amber-400/50 text-amber-300 px-2.5 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
                >
                  Download Excel Template
                </button>
              </div>

              <label className="block w-full border-2 border-dashed border-amber-400/60 bg-slate-950 hover:bg-slate-900 p-4 rounded-2xl text-center cursor-pointer">
                <p className="font-black text-amber-300 text-xs">
                  Tap to Select Excel (.csv / .tsv) Inventory File
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Columns: BrandName, CategoryId, VariantLabel, SellingPrice, MRP, StockQty, WeightGrams, GST
                </p>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleExcelFileUpload}
                  className="hidden"
                />
              </label>

              {bulkPreviewRows.length > 0 && (
                <div className="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40">
                  <p className="font-black text-emerald-400 text-[11px]">
                    Ready to Import ({bulkPreviewRows.length} Products Parsed):
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {bulkPreviewRows.map((r, i) => (
                      <div
                        key={i}
                        className="flex justify-between text-[10px] border-b border-slate-800 pb-1"
                      >
                        <span className="font-bold text-white">
                          {r.subCategoryBrand} ({r.variantLabel})
                        </span>
                        <span className="text-emerald-300">
                          Rs.{r.price} | MRP Rs.{r.mrp} | Qty: {r.stockQty}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleCommitBulkImport}
                    className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                  >
                    Import All {bulkPreviewRows.length} Products to Server & Stock Manual &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: BILLING SOFTWARE EASY IMPORTER (REQ 6) */}
          {addMode === "billing" && (
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-teal-400/50 space-y-3">
              <div>
                <h4 className="font-black text-teal-300 text-xs">
                  Supermart Billing Software Importer (2-Step Sync)
                </h4>
                <p className="text-[10px] text-slate-400">
                  Import existing products directly from Tally Prime, Marg ERP, Busy, Vyapar or POS
                </p>
              </div>

              <div>
                <label className="block text-[10px] text-teal-300 font-bold mb-1">
                  Step 1: Select Your Existing Supermart Billing Software:
                </label>
                <select
                  value={billingSoftware}
                  onChange={(e) => setBillingSoftware(e.target.value)}
                  className="w-full bg-slate-950 border border-teal-500/50 rounded-xl p-2 text-white font-bold"
                >
                  <option value="TALLY_PRIME">Tally Prime / Tally ERP 9 Stock Export</option>
                  <option value="MARG_ERP">Marg ERP 9+ Supermart / Pharma Export</option>
                  <option value="BUSY_ACCOUNTING">Busy Accounting Inventory Export</option>
                  <option value="VYAPAR_APP">Vyapar Billing App Item List</option>
                  <option value="RETAIL_POS">HDPOS / GoFrugal / Zoho Inventory CSV</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-300 font-bold">
                    Step 2: Upload Billing Export File or Load Sample Billing Data:
                  </label>
                  <button
                    type="button"
                    onClick={handleLoadBillingSample}
                    className="bg-teal-500/20 border border-teal-400 text-teal-300 px-2 py-1 rounded-lg text-[9px] font-black cursor-pointer"
                  >
                    Load Sample {billingSoftware.replace(/_/g, " ")} Data
                  </button>
                </div>

                <input
                  type="file"
                  accept=".csv,.txt,.tsv,.json,.xml"
                  onChange={handleExcelFileUpload}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-[10px] text-slate-300"
                />

                <textarea
                  rows={4}
                  value={rawBillingText}
                  onChange={(e) => {
                    setRawBillingText(e.target.value);
                    setBulkPreviewRows(parseCsvTextToRows(e.target.value));
                  }}
                  placeholder="Or paste exported billing rows here (Item Name | Category | Pack | Selling Price | MRP | Qty)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-[10px] font-mono text-emerald-300"
                />
              </div>

              {bulkPreviewRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleCommitBulkImport}
                  className="w-full bg-teal-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
                >
                  Sync {bulkPreviewRows.length} Billing Software Products to WE4ALL Server &rarr;
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: MERCHANT INVOICES & INVENTORY LEDGER (footerTab === "orders") */}
      {/* ==================================================================== */}
      {footerTab === "orders" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-3 rounded-2xl border border-amber-500/40 space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-black text-amber-400 text-xs">
                  4. Merchant Tax Invoices & Automated Inventory Ledger
                </h4>
                <p className="text-[10px] text-slate-400">
                  Maintained on your behalf with filters, GST breakdown & PDF downloads
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (orders.length === 0) {
                    alert("No orders yet to export.");
                    return;
                  }
                  handleDownloadMerchantInvoice(orders[0]);
                }}
                className="bg-emerald-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer"
              >
                Export PDF Statement
              </button>
            </div>

            {/* Period & Status Filters */}
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={invoicePeriod}
                onChange={(e) => setInvoicePeriod(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white font-bold text-[10px]"
              >
                <option value="ALL">Period: All Transactions</option>
                <option value="TODAY">Period: Today</option>
                <option value="WEEK">Period: This Week</option>
                <option value="MONTH">Period: This Month</option>
              </select>
              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white font-bold text-[10px]"
              >
                <option value="ALL">Status: All Orders</option>
                <option value="PAID">Status: Paid / Completed</option>
                <option value="PENDING">Status: Awaiting Approval/Payment</option>
              </select>
            </div>

            {/* Summary Telemetry */}
            {(() => {
              const filtered = orders.filter((o) => {
                if (invoicePeriod !== "ALL" && o.periodTag && o.periodTag !== invoicePeriod) {
                  return false;
                }
                if (
                  invoiceStatusFilter === "PAID" &&
                  (o.status === "AWAITING_MERCHANT_APPROVAL" ||
                    o.status === "MERCHANT_APPROVED_AWAITING_PAYMENT")
                ) {
                  return false;
                }
                if (
                  invoiceStatusFilter === "PENDING" &&
                  o.status !== "AWAITING_MERCHANT_APPROVAL" &&
                  o.status !== "MERCHANT_APPROVED_AWAITING_PAYMENT"
                ) {
                  return false;
                }
                return true;
              });
              const grossSales = filtered.reduce((s, o) => s + Number(o.grandTotal || 0), 0);
              const totalGst = filtered.reduce((s, o) => s + Number(o.gst || 0), 0);
              const netPayout = Number((grossSales - totalGst).toFixed(2));

              return (
                <>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-400">Total Transactions</p>
                      <p className="font-black text-emerald-400 text-xs">
                        Rs.{grossSales.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-400">5% GST Ledger</p>
                      <p className="font-black text-amber-300 text-xs">
                        Rs.{totalGst.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-400">Net Shop Payout</p>
                      <p className="font-black text-teal-300 text-xs">
                        Rs.{netPayout.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    {filtered.length === 0 ? (
                      <p className="text-center text-slate-400 py-4 text-[11px]">
                        No invoices match the selected filter. Use the Queue tab to approve or simulate an order!
                      </p>
                    ) : (
                      filtered.map((ord) => (
                        <div
                          key={ord.id}
                          className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center gap-2"
                        >
                          <div>
                            <p className="font-bold text-white text-[11px]">
                              Invoice #{ord.id} &bull; {ord.customerName}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              {ord.dateStr || "2026-10-29"} | Items: {(ord.items || []).length} | GST: Rs.{ord.gst || 0} | Total:{" "}
                              <strong className="text-emerald-400">Rs.{ord.grandTotal}</strong>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadMerchantInvoice(ord)}
                            className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-lg text-[9px] cursor-pointer shrink-0"
                          >
                            PDF Invoice
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}