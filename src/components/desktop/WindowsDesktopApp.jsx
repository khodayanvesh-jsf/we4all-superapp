import React, { useEffect, useMemo, useRef, useState } from "react";

const ROLE_LABELS = {
  merchant: { title: "Merchant Operations", icon: "🏪", primaryTab: "Orders" },
  service_provider: { title: "Service Desk", icon: "🛠️", primaryTab: "Bookings" },
  decorator: { title: "Venues & Events", icon: "🎉", primaryTab: "Event Leads" },
  labour: { title: "Labour & Worksites", icon: "🧱", primaryTab: "Worksites" },
  rider: { title: "Captain Dispatch", icon: "🛵", primaryTab: "Trips & Deliveries" },
};

export default function WindowsDesktopApp({
  appVersion = "3.3.48",
  currentUser,
  authenticatedPartnerRole,
  orders = [],
  serviceBookings = [],
  products = [],
  halls = [],
  labourBookings = [],
  onSwitchToMobile = () => {},
  onOpenAdmin = () => {},
  onLogout = () => {},
  onTriggerToast = () => {},
  renderAuthDesk,
  renderPortalWorkspace,
}) {
  const [navTab, setNavTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [payFilter, setPayFilter] = useState("ALL");
  const [selectedRow, setSelectedRow] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString());
  const searchInputRef = useRef(null);

  const role = authenticatedPartnerRole || "";
  const meta = ROLE_LABELS[role] || { title: "Partner Desktop", icon: "🖥️", primaryTab: "Operations" };
  const isApprovedPartner = Boolean(currentUser?.authUserId && !currentUser?.isGuest && ROLE_LABELS[role]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.altKey && e.key === "1") { setNavTab("dashboard"); }
      else if (e.altKey && e.key === "2") { setNavTab("grid"); }
      else if (e.altKey && e.key === "3") { setNavTab("catalog"); }
      else if (e.altKey && e.key === "4") { setNavTab("portal"); }
      else if (e.altKey && e.key === "5") { setNavTab("account"); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeBookings = Array.isArray(serviceBookings) ? serviceBookings : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeLabour = Array.isArray(labourBookings) ? labourBookings : [];

  const activeDataset = useMemo(() => {
    if (role === "service_provider") return safeBookings;
    if (role === "labour") return safeLabour;
    return safeOrders;
  }, [role, safeOrders, safeBookings, safeLabour]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeDataset.filter((row) => {
      const st = String(row?.status || "PENDING").toUpperCase();
      const pay = String(row?.paymentMethod || row?.payment_method || "COD").toUpperCase();
      if (statusFilter !== "ALL" && !st.includes(statusFilter)) return false;
      if (payFilter === "COD" && !pay.includes("COD") && !pay.includes("CASH")) return false;
      if (payFilter === "UPI" && (pay.includes("COD") || pay.includes("CASH"))) return false;
      if (!q) return true;
      return JSON.stringify(row).toLowerCase().includes(q);
    });
  }, [activeDataset, searchQuery, statusFilter, payFilter]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return safeProducts;
    return safeProducts.filter((p) =>
      String(p?.name || p?.title || "").toLowerCase().includes(q) ||
      String(p?.category || "").toLowerCase().includes(q)
    );
  }, [safeProducts, searchQuery]);

  const stats = useMemo(() => {
    const pending = activeDataset.filter((r) => !["DELIVERED", "COMPLETED", "CANCELLED"].includes(String(r?.status || "").toUpperCase())).length;
    const completed = activeDataset.filter((r) => ["DELIVERED", "COMPLETED"].includes(String(r?.status || "").toUpperCase())).length;
    const gross = activeDataset.reduce((s, r) => s + (Number(r?.total || r?.amount || 0) || 0), 0);
    const codSum = activeDataset.filter((r) => /COD|CASH/i.test(String(r?.paymentMethod || r?.payment_method || "COD"))).reduce((s, r) => s + (Number(r?.total || r?.amount || 0) || 0), 0);
    const upiSum = Math.max(0, gross - codSum);
    const lowStock = safeProducts.filter((p) => Number(p?.stock ?? 0) <= 5).length;
    return { pending, completed, gross, codSum, upiSum, lowStock };
  }, [activeDataset, safeProducts]);

  const exportCsv = () => {
    const headers = ["RecordID", "Customer", "Status", "Payment", "AmountINR", "CreatedAt"];
    const lines = [
      headers.join(","),
      ...filteredRows.map((r) => [
        JSON.stringify(r?.id || ""),
        JSON.stringify(r?.customerName || r?.customer_name || r?.userName || "Customer"),
        JSON.stringify(r?.status || "PENDING"),
        JSON.stringify(r?.paymentMethod || r?.payment_method || "COD"),
        JSON.stringify(Number(r?.total || r?.amount || 0)),
        JSON.stringify(r?.createdAt || r?.created_at || ""),
      ].join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `WE4ALL-${role || "console"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onTriggerToast("Exported table to CSV file.");
  };

  const printInvoice = (row) => {
    const rec = row || selectedRow || filteredRows[0];
    if (!rec) { window.print(); return; }
    const win = window.open("", "_blank", "width=460,height=680");
    if (!win) { window.print(); return; }
    const items = Array.isArray(rec.items) ? rec.items : [];
    const total = Number(rec.total || rec.amount || 0);
    const gst = (total * 0.05).toFixed(2);
    win.document.write(`<!doctype html><html><head><title>WE4ALL Invoice ${String(rec.id || "").slice(0, 8)}</title><style>body{font-family:"Segoe UI",sans-serif;padding:20px;color:#0f172a;font-size:12px}h2{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border-bottom:1px solid #cbd5e1;padding:6px 4px;text-align:left}.tot{font-size:15px;font-weight:900;text-align:right}</style></head><body><h2>WE4ALL — Tax Invoice / Receipt</h2><div><strong>Business:</strong> ${currentUser?.businessName || currentUser?.fullName || "WE4ALL Partner"}</div><div><strong>Invoice #:</strong> ${String(rec.id || "N/A").slice(0, 12)} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date(rec.createdAt || rec.created_at || Date.now()).toLocaleString()}</div><div><strong>Customer:</strong> ${rec.customerName || rec.customer_name || "Customer"}</div><div><strong>Payment:</strong> ${rec.paymentMethod || rec.payment_method || "COD"} &nbsp;|&nbsp; <strong>Status:</strong> ${rec.status || "PENDING"}</div><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>${items.length ? items.map((it) => `<tr><td>${it.name || it.title || "Item"}</td><td>${it.qty || it.quantity || 1}</td><td>₹${Number(it.price || 0)}</td></tr>`).join("") : `<tr><td>Order / Service Charge</td><td>1</td><td>₹${total}</td></tr>`}</tbody></table><div style="text-align:right;color:#475569">Included Est. GST (5%): ₹${gst}</div><div class="tot">Grand Total: ₹${total.toLocaleString("en-IN")}</div><p style="margin-top:20px;font-size:10px;color:#64748b;text-align:center">Generated by WE4ALL Windows Desktop Console · Adilabad</p><script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#f3f4f8] text-slate-900 select-none" style={{ fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif' }}>
      <header className="h-13 shrink-0 bg-[#1e1b4b] text-white border-b border-indigo-400/20 px-3 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <button type="button" onClick={() => setSidebarCollapsed((c) => !c)} title="Toggle Navigation Sidebar" className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold">☰</button>
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-orange-500 flex items-center justify-center text-sm font-black shadow">W</span>
            <div className="leading-tight">
              <div className="text-xs font-black tracking-wide">WE4ALL Desktop Studio</div>
              <div className="text-[10px] text-indigo-200">{meta.icon} {meta.title}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-md hidden sm:flex items-center bg-white/10 border border-white/15 rounded-lg px-2.5 h-8 focus-within:bg-white/15 focus-within:border-indigo-300">
          <span className="text-xs text-indigo-200 mr-2">🔍</span>
          <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search orders, products, customers… (Ctrl+K)" className="w-full bg-transparent text-xs text-white placeholder:text-indigo-200/70 focus:outline-none select-text" />
          {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="text-[11px] text-indigo-200 hover:text-white ml-1">✕</button>}
        </div>

        <div className="flex items-center gap-1.5">
          {isApprovedPartner && (
            <>
              <button type="button" onClick={() => printInvoice(selectedRow)} className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold flex items-center gap-1">🖨️ <span className="hidden md:inline">Print Bill</span></button>
              <button type="button" onClick={exportCsv} className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold flex items-center gap-1">⬇️ <span className="hidden md:inline">CSV</span></button>
              <button type="button" onClick={() => { setLastSyncTime(new Date().toLocaleTimeString()); onTriggerToast("Synced with WE4ALL live cloud."); }} className="h-8 px-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-[11px] font-bold">🔄 Sync</button>
            </>
          )}
          <button type="button" onClick={onOpenAdmin} className="h-8 px-2.5 rounded-lg bg-orange-500/90 hover:bg-orange-500 text-[11px] font-bold">🛡️ Admin</button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside className={`shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-150 ${sidebarCollapsed ? "w-14" : "w-56"}`}>
          <nav className="p-2 space-y-1">
            {[
              { id: "dashboard", icon: "📊", label: "Overview", shortcut: "Alt+1" },
              { id: "grid", icon: "📋", label: meta.primaryTab, badge: stats.pending, shortcut: "Alt+2" },
              { id: "catalog", icon: "📦", label: "Inventory & Rates", badge: stats.lowStock > 0 ? `${stats.lowStock}!` : null, shortcut: "Alt+3" },
              { id: "portal", icon: "⚡", label: "Live Action Desk", shortcut: "Alt+4" },
              { id: "account", icon: "⚙️", label: "Account & KYC", shortcut: "Alt+5" },
            ].map((item) => {
              const active = navTab === item.id;
              return (
                <button key={item.id} type="button" onClick={() => setNavTab(item.id)} title={`${item.label} (${item.shortcut})`} className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition ${active ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold" : "text-slate-600 hover:bg-slate-100"}`}>
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="text-sm">{item.icon}</span>
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </span>
                  {!sidebarCollapsed && item.badge ? <span className="rounded-full bg-indigo-600 text-white px-1.5 py-0.5 text-[10px] font-bold">{item.badge}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="p-2 border-t border-slate-200 space-y-1">
            <button type="button" onClick={onSwitchToMobile} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100"><span>📱</span>{!sidebarCollapsed && <span>Mobile Preview</span>}</button>
            {isApprovedPartner && <button type="button" onClick={onLogout} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50"><span>🚪</span>{!sidebarCollapsed && <span>Sign Out</span>}</button>}
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4 select-text">
          {!isApprovedPartner ? (
            <div className="max-w-xl mx-auto mt-4 space-y-4">
              <div className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Windows Desktop Sign-In</div>
                <h1 className="text-lg font-black text-slate-900 mt-1">Sign in to WE4ALL Windows Operations Console</h1>
                <p className="text-xs text-slate-600 mt-1">Use your approved Merchant, Service Provider, Decorator, Labour, or Captain account. All changes sync live with the mobile app.</p>
              </div>
              <div className="rounded-xl overflow-hidden shadow-sm">{typeof renderAuthDesk === "function" && renderAuthDesk()}</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-sm"><div className="text-[11px] font-semibold text-slate-500">Pending / Active</div><div className="text-2xl font-black text-indigo-700 mt-0.5">{stats.pending}</div></div>
                <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-sm"><div className="text-[11px] font-semibold text-slate-500">Completed</div><div className="text-2xl font-black text-emerald-700 mt-0.5">{stats.completed}</div></div>
                <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-sm"><div className="text-[11px] font-semibold text-slate-500">COD Volume</div><div className="text-xl font-black text-amber-700 mt-1">₹{stats.codSum.toLocaleString("en-IN")}</div></div>
                <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-sm"><div className="text-[11px] font-semibold text-slate-500">UPI / Online</div><div className="text-xl font-black text-violet-700 mt-1">₹{stats.upiSum.toLocaleString("en-IN")}</div></div>
                <div className="rounded-xl bg-white border border-slate-200 p-3.5 shadow-sm"><div className="text-[11px] font-semibold text-slate-500">Low Stock Alerts</div><div className="text-2xl font-black text-rose-600 mt-0.5">{stats.lowStock}</div></div>
              </div>

              {(navTab === "dashboard" || navTab === "grid") && (
                <section className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide">{meta.primaryTab} Data Grid ({filteredRows.length})</h2>
                    <div className="flex items-center gap-1.5">
                      {["ALL", "PENDING", "PACKED", "DELIVERED"].map((st) => (
                        <button key={st} type="button" onClick={() => setStatusFilter(st)} className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${statusFilter === st ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"}`}>{st}</button>
                      ))}
                      <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className="h-7 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-700">
                        <option value="ALL">All Pay</option>
                        <option value="COD">COD Only</option>
                        <option value="UPI">UPI / Online</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                          <th className="py-2 px-3">ID</th>
                          <th className="py-2 px-3">Customer / Details</th>
                          <th className="py-2 px-3">Payment</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr><td colSpan={6} className="py-8 text-center text-slate-400">No records match the current filter. Switch to &ldquo;Live Action Desk&rdquo; to manage live items.</td></tr>
                        ) : filteredRows.map((row) => {
                          const isSel = selectedRow?.id === row.id;
                          return (
                            <tr key={row.id} onClick={() => setSelectedRow(row)} className={`border-b border-slate-100 cursor-pointer transition ${isSel ? "bg-indigo-50/80" : "hover:bg-slate-50"}`}>
                              <td className="py-2 px-3 font-mono text-[11px] font-bold text-indigo-700">{String(row.id || "").slice(0, 8)}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800">{row.customerName || row.customer_name || row.serviceName || "Customer Order"}</td>
                              <td className="py-2 px-3"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{row.paymentMethod || row.payment_method || "COD"}</span></td>
                              <td className="py-2 px-3 font-black text-slate-900">₹{Number(row.total || row.amount || 0).toLocaleString("en-IN")}</td>
                              <td className="py-2 px-3"><span className="rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">{row.status || "PENDING"}</span></td>
                              <td className="py-2 px-3 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); setSelectedRow(row); printInvoice(row); }} className="rounded-md bg-slate-100 hover:bg-indigo-600 hover:text-white px-2 py-1 text-[10px] font-bold text-slate-700">🖨️ Bill</button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {navTab === "catalog" && (
                <section className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide">Inventory & Catalogue Table ({filteredProducts.length})</h2>
                    <button type="button" onClick={() => setNavTab("portal")} className="rounded-md bg-indigo-600 text-white px-3 py-1 text-[11px] font-bold">+ Add / Edit in Desk</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase">
                          <th className="py-2 px-3">Product / Listing</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Price</th>
                          <th className="py-2 px-3">Stock</th>
                          <th className="py-2 px-3">Approval</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 px-3 font-bold text-slate-800">{p.name || p.title}</td>
                            <td className="py-2 px-3 text-slate-600">{p.category || "General"}</td>
                            <td className="py-2 px-3 font-black text-slate-900">₹{Number(p.price || 0)}</td>
                            <td className="py-2 px-3"><span className={`font-bold ${Number(p.stock ?? 0) <= 5 ? "text-rose-600" : "text-emerald-700"}`}>{p.stock ?? 0}</span></td>
                            <td className="py-2 px-3"><span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">{p.status || "Approved"}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {(navTab === "portal" || navTab === "account") && (
                <section className="rounded-xl bg-slate-950 p-4 border border-slate-800 shadow-sm">
                  {typeof renderPortalWorkspace === "function" && renderPortalWorkspace(navTab === "account" ? "account" : "home")}
                </section>
              )}
            </>
          )}
        </main>

        {isApprovedPartner && selectedRow && (
          <aside className="hidden xl:flex w-80 shrink-0 bg-white border-l border-slate-200 flex-col justify-between p-4 overflow-y-auto select-text">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div><div className="text-[10px] font-bold uppercase text-indigo-600">Record Inspector</div><div className="text-sm font-black text-slate-900">#{String(selectedRow.id || "").slice(0, 10)}</div></div>
                <button type="button" onClick={() => setSelectedRow(null)} className="h-7 w-7 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-bold">✕</button>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
                <div><strong>Customer:</strong> {selectedRow.customerName || selectedRow.customer_name || "Customer"}</div>
                <div><strong>Status:</strong> {selectedRow.status || "PENDING"}</div>
                <div><strong>Payment:</strong> {selectedRow.paymentMethod || selectedRow.payment_method || "COD"}</div>
                <div><strong>Total:</strong> ₹{Number(selectedRow.total || selectedRow.amount || 0).toLocaleString("en-IN")}</div>
                {selectedRow.deliveryAddress && <div><strong>Address:</strong> {selectedRow.deliveryAddress}</div>}
              </div>
              <button type="button" onClick={() => printInvoice(selectedRow)} className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-2 text-xs font-bold">🖨️ Print GST Invoice / Receipt</button>
              <button type="button" onClick={() => setNavTab("portal")} className="w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 text-xs font-bold">⚡ Open in Live Action Desk</button>
            </div>
            <div className="text-[10px] text-slate-400 pt-4 border-t border-slate-100">WE4ALL Windows Inspector · Live Cloud</div>
          </aside>
        )}
      </div>

      <footer className="h-7 shrink-0 bg-[#1e1b4b] text-indigo-200 px-3 flex items-center justify-between text-[11px] border-t border-indigo-400/20">
        <div className="flex items-center gap-3">
          <span className="text-emerald-300 font-bold">● Live Cloud Connected</span>
          <span>Role: <strong className="text-white uppercase">{role || "Guest"}</strong></span>
          <span className="hidden sm:inline">Shortcuts: Ctrl+K Search · Alt+1..5 Tabs</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Synced: {lastSyncTime}</span>
          <span>v{appVersion} Windows</span>
        </div>
      </footer>
    </div>
  );
}