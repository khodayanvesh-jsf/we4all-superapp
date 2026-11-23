import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";

const ROLE_LABELS = {
  merchant: { title: "Merchant Desktop ERP", icon: "🏪", primaryTab: "Orders" },
  service_provider: { title: "Service Provider Desk", icon: "🛠️", primaryTab: "Bookings" },
  decorator: { title: "Venues & Events Desk", icon: "🎉", primaryTab: "Event Leads" },
  labour: { title: "Labour & Worksites Desk", icon: "🧱", primaryTab: "Worksites" },
  rider: { title: "Captain Dispatch Desk", icon: "🛵", primaryTab: "Trips" },
};

export default function WindowsDesktopApp({
  appVersion = "3.3.49",
  currentUser,
  authenticatedPartnerRole,
  orders = [],
  serviceBookings = [],
  products = [],
  labourBookings = [],
  onPartnerSignedIn = () => {},
  onProductAdded = () => {},
  onSwitchToMobile = () => {},
  onOpenAdmin = () => {},
  onLogout = () => {},
  onTriggerToast = () => {},
}) {
  const [navTab, setNavTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [payFilter, setPayFilter] = useState("ALL");
  const [selectedRow, setSelectedRow] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString());
  const searchInputRef = useRef(null);

  const [loginId, setLoginId] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginErr, setLoginErr] = useState("");

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProd, setNewProd] = useState({ name: "", category: "Kirana & Groceries", price: "", mrp: "", stock: "25", unit: "1 pc" });
  const [savingProd, setSavingProd] = useState(false);

  const role = authenticatedPartnerRole || "";
  const meta = ROLE_LABELS[role] || { title: "WE4ALL Windows Operations", icon: "🖥️", primaryTab: "Orders" };
  const isApprovedPartner = Boolean(currentUser?.authUserId && !currentUser?.isGuest && ROLE_LABELS[role]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchInputRef.current?.focus(); }
      else if (e.altKey && e.key === "1") setNavTab("dashboard");
      else if (e.altKey && e.key === "2") setNavTab("grid");
      else if (e.altKey && e.key === "3") setNavTab("catalog");
      else if (e.altKey && e.key === "4") setNavTab("billing");
      else if (e.altKey && e.key === "5") setNavTab("settings");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleWindowsSignIn = async (e) => {
    e.preventDefault();
    setLoginErr("");
    const raw = loginId.trim();
    const pin = loginPin.replace(/\D/g, "").slice(0, 6);
    if (!raw || pin.length !== 6) { setLoginErr("Enter your registered 10-digit mobile (or email) and 6-digit PIN."); return; }
    if (!supabase) { setLoginErr("Supabase client is not configured."); return; }
    setLoginBusy(true);
    try {
      const digits = raw.replace(/\D/g, "").slice(-10);
      const candidates = raw.includes("@") ? [raw.toLowerCase()] : [`pilot.${digits}@we4all.app`, `w4all-91${digits}@login.we4all.invalid`];
      let authData = null;
      let lastError = null;
      for (const email of candidates) {
        const res = await supabase.auth.signInWithPassword({ email, password: pin });
        if (!res.error && res.data?.user) { authData = res.data; break; }
        lastError = res.error;
      }
      if (!authData?.user) throw new Error(lastError?.message || "Invalid mobile/email or 6-digit PIN.");

      const { data: partnerRow } = await supabase
        .from("we4all_partners")
        .select("*")
        .eq("owner_user_id", authData.user.id)
        .eq("status", "approved")
        .maybeSingle();

      if (!partnerRow?.role) throw new Error("Signed in, but no approved Partner account was found for this user.");

      onPartnerSignedIn(partnerRow.role, {
        authUserId: authData.user.id,
        partnerId: partnerRow.id,
        role: partnerRow.role,
        fullName: partnerRow.owner_name || partnerRow.business_name || "WE4ALL Partner",
        businessName: partnerRow.business_name || partnerRow.owner_name || "WE4ALL Partner",
        phone: partnerRow.phone || digits,
        email: authData.user.email || "",
        isGuest: false,
      });
      onTriggerToast(`Welcome to WE4ALL Windows Desktop, ${partnerRow.business_name || partnerRow.owner_name}!`);
    } catch (err) {
      setLoginErr(err?.message || "Sign-in failed.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleAddProductDesktop = async (e) => {
    e.preventDefault();
    if (!newProd.name.trim() || !Number(newProd.price)) { onTriggerToast("Enter product name and valid price."); return; }
    setSavingProd(true);
    try {
      const payload = {
        name: newProd.name.trim(),
        category: newProd.category,
        price: Number(newProd.price),
        mrp: Number(newProd.mrp || newProd.price),
        stock: Number(newProd.stock || 0),
        unit: newProd.unit.trim() || "1 pc",
        merchant_id: currentUser?.partnerId || currentUser?.authUserId,
        owner_user_id: currentUser?.authUserId,
        status: "pending",
      };
      if (supabase) {
        const { error } = await supabase.from("we4all_catalog_items").insert([payload]);
        if (error) throw error;
      }
      onProductAdded({ id: `prod_${Date.now()}`, ...payload });
      setNewProd({ name: "", category: "Kirana & Groceries", price: "", mrp: "", stock: "25", unit: "1 pc" });
      setShowAddProduct(false);
      onTriggerToast("Product submitted to Supabase for Founder approval!");
    } catch (err) {
      onTriggerToast(err?.message || "Could not save product.");
    } finally {
      setSavingProd(false);
    }
  };

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

  const handleQuickStockUpdate = async (prod, delta) => {
    const nextStock = Math.max(0, Number(prod?.stock ?? 0) + delta);
    try {
      if (supabase && prod?.id) {
        const { error } = await supabase.from("we4all_catalog_items").update({ stock: nextStock }).eq("id", prod.id);
        if (error) throw error;
      }
      onTriggerToast(`Updated ${prod.name || prod.title} stock to ${nextStock}.`);
    } catch (err) {
      onTriggerToast(err?.message || "Could not update stock.");
    }
  };

  const handleDesktopOrderStatus = async (row, nextStatus) => {
    if (!row?.id) return;
    try {
      if (supabase) {
        const { error } = await supabase.functions.invoke("we4all-merchant-confirm-order", {
          body: { orderId: row.id, status: nextStatus }
        });
        if (error) throw error;
      }
      setSelectedRow((prev) => (prev && prev.id === row.id ? { ...prev, status: nextStatus } : prev));
      onTriggerToast(`Order #${String(row.id).slice(0, 8)} marked ${nextStatus}.`);
    } catch (err) {
      onTriggerToast(err?.message || "Order update failed.");
    }
  };

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
    a.download = `WE4ALL-${role || "windows"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onTriggerToast("Exported desktop table to CSV.");
  };

  const printInvoice = (row) => {
    const rec = row || selectedRow || filteredRows[0];
    if (!rec) { window.print(); return; }
    const win = window.open("", "_blank", "width=460,height=680");
    if (!win) { window.print(); return; }
    const items = Array.isArray(rec.items) ? rec.items : [];
    const total = Number(rec.total || rec.amount || 0);
    const gst = (total * 0.05).toFixed(2);
    win.document.write(`<!doctype html><html><head><title>WE4ALL GST Invoice</title><style>body{font-family:"Segoe UI",sans-serif;padding:20px;color:#0f172a;font-size:12px}h2{margin:0 0 6px}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border-bottom:1px solid #cbd5e1;padding:6px 4px;text-align:left}.tot{font-size:16px;font-weight:900;text-align:right}</style></head><body><h2>WE4ALL — Tax Invoice / Receipt</h2><div><strong>Partner:</strong> ${currentUser?.businessName || currentUser?.fullName || "WE4ALL Partner"}</div><div><strong>Invoice #:</strong> ${String(rec.id || "N/A").slice(0, 12)} | <strong>Date:</strong> ${new Date(rec.createdAt || rec.created_at || Date.now()).toLocaleString()}</div><div><strong>Customer:</strong> ${rec.customerName || rec.customer_name || "Customer"}</div><div><strong>Payment:</strong> ${rec.paymentMethod || rec.payment_method || "COD"} | <strong>Status:</strong> ${rec.status || "PENDING"}</div><table><thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead><tbody>${items.length ? items.map((it) => `<tr><td>${it.name || it.title || "Item"}</td><td>${it.qty || it.quantity || 1}</td><td>₹${Number(it.price || 0)}</td></tr>`).join("") : `<tr><td>Order / Service Charge</td><td>1</td><td>₹${total}</td></tr>`}</tbody></table><div style="text-align:right;color:#475569">Included Est. GST (5%): ₹${gst}</div><div class="tot">Grand Total: ₹${total.toLocaleString("en-IN")}</div><script>window.onload=()=>window.print();</script></body></html>`);
    win.document.close();
  };

  if (!isApprovedPartner) {
    return (
      <div className="h-screen w-screen overflow-hidden flex bg-[#f3f4f8] text-slate-900" style={{ fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif' }}>
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4f46e5] text-white p-12 flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">🖥️ WE4ALL Windows Desktop Edition · v{appVersion}</div>
            <h1 className="mt-6 text-4xl font-black tracking-tight leading-tight">Run your shop, bookings &amp; GST billing at desktop speed.</h1>
            <p className="mt-4 text-sm text-indigo-100 max-w-md leading-relaxed">Built natively for Windows screens, keyboard shortcuts, dense order tables, and direct USB/Wi-Fi receipt printing — synced live with the WE4ALL mobile app.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl bg-white/10 p-4 border border-white/15"><div className="font-black text-sm">📊 Live Data Grids</div><p className="text-indigo-100 mt-1">Filter COD/UPI orders, inspect line items, and export CSV in 1 click.</p></div>
            <div className="rounded-xl bg-white/10 p-4 border border-white/15"><div className="font-black text-sm">🖨️ Thermal &amp; A4 Print</div><p className="text-indigo-100 mt-1">Print clean GST receipts directly to any Windows printer.</p></div>
          </div>
        </div>
        <div className="flex-1 flex flex-col justify-between p-8 lg:p-14 bg-white">
          <div className="flex justify-between items-center">
            <span className="text-sm font-black text-indigo-900">WE4ALL Desktop Studio</span>
            <button type="button" onClick={onOpenAdmin} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100">🛡️ Founder Admin Console</button>
          </div>

          <form onSubmit={handleWindowsSignIn} className="max-w-md w-full mx-auto space-y-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Partner Sign In</h2>
              <p className="text-xs text-slate-500 mt-1">Sign in with your approved Merchant, Service Provider, Decorator, Labour, or Captain credentials.</p>
            </div>
            {loginErr && <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">{loginErr}</div>}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Registered Mobile Number or Email</label>
              <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="10-digit mobile or email" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">6-Digit Partner PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} value={loginPin} onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono tracking-widest text-slate-900 focus:border-indigo-600 focus:outline-none" required />
            </div>
            <button type="submit" disabled={loginBusy} className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-2.5 text-sm font-bold text-white shadow-sm">
              {loginBusy ? "Verifying Partner Account…" : "Sign In to Windows Console"}
            </button>
          </form>

          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>Adilabad, Telangana · Live Cloud Sync</span>
            <span>WE4ALL Windows v{appVersion}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#f3f4f8] text-slate-900 select-none" style={{ fontFamily: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif' }}>
      <header className="h-12 shrink-0 bg-[#1e1b4b] text-white border-b border-indigo-400/20 px-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => setSidebarCollapsed((c) => !c)} className="h-8 w-8 rounded-md bg-white/10 hover:bg-white/20 text-sm font-bold">☰</button>
          <div className="leading-tight">
            <div className="text-xs font-black">WE4ALL Windows Desktop</div>
            <div className="text-[10px] text-indigo-200">{meta.icon} {currentUser?.businessName || meta.title}</div>
          </div>
        </div>

        <div className="flex-1 max-w-md flex items-center bg-white/10 border border-white/15 rounded-md px-2.5 h-8">
          <span className="text-xs text-indigo-200 mr-2">🔍</span>
          <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search orders, products, customers… (Ctrl+K)" className="w-full bg-transparent text-xs text-white placeholder:text-indigo-200/70 focus:outline-none select-text" />
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setShowAddProduct(true)} className="h-8 px-3 rounded-md bg-emerald-500 hover:bg-emerald-600 text-[11px] font-bold text-white">+ Add Product</button>
          <button type="button" onClick={() => printInvoice(selectedRow)} className="h-8 px-2.5 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-bold">🖨️ Print Bill</button>
          <button type="button" onClick={exportCsv} className="h-8 px-2.5 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-bold">⬇️ CSV</button>
          <button type="button" onClick={onOpenAdmin} className="h-8 px-2.5 rounded-md bg-orange-500 hover:bg-orange-600 text-[11px] font-bold">🛡️ Admin</button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <aside className={`shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between transition-all ${sidebarCollapsed ? "w-14" : "w-56"}`}>
          <nav className="p-2 space-y-1">
            {[
              { id: "dashboard", icon: "📊", label: "Dashboard", shortcut: "Alt+1" },
              { id: "grid", icon: "📋", label: meta.primaryTab, badge: stats.pending, shortcut: "Alt+2" },
              { id: "catalog", icon: "📦", label: "Inventory Grid", badge: stats.lowStock || null, shortcut: "Alt+3" },
              { id: "billing", icon: "🧾", label: "GST & Settlements", shortcut: "Alt+4" },
              { id: "settings", icon: "⚙️", label: "Account & Printer", shortcut: "Alt+5" },
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => setNavTab(item.id)} title={`${item.label} (${item.shortcut})`} className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-xs font-semibold ${navTab === item.id ? "bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-bold" : "text-slate-600 hover:bg-slate-100"}`}>
                <span className="flex items-center gap-2.5 truncate"><span>{item.icon}</span>{!sidebarCollapsed && <span>{item.label}</span>}</span>
                {!sidebarCollapsed && item.badge ? <span className="rounded-full bg-indigo-600 text-white px-1.5 py-0.5 text-[10px] font-bold">{item.badge}</span> : null}
              </button>
            ))}
          </nav>
          <div className="p-2 border-t border-slate-200 space-y-1">
            <button type="button" onClick={onLogout} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[11px] font-semibold text-rose-600 hover:bg-rose-50"><span>🚪</span>{!sidebarCollapsed && <span>Sign Out</span>}</button>
          </div>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4 select-text">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="rounded-lg bg-white border border-slate-200 p-3.5"><div className="text-[11px] font-semibold text-slate-500">Pending / Active</div><div className="text-2xl font-black text-indigo-700">{stats.pending}</div></div>
            <div className="rounded-lg bg-white border border-slate-200 p-3.5"><div className="text-[11px] font-semibold text-slate-500">Completed</div><div className="text-2xl font-black text-emerald-700">{stats.completed}</div></div>
            <div className="rounded-lg bg-white border border-slate-200 p-3.5"><div className="text-[11px] font-semibold text-slate-500">COD Volume</div><div className="text-xl font-black text-amber-700 mt-0.5">₹{stats.codSum.toLocaleString("en-IN")}</div></div>
            <div className="rounded-lg bg-white border border-slate-200 p-3.5"><div className="text-[11px] font-semibold text-slate-500">UPI / Online</div><div className="text-xl font-black text-violet-700 mt-0.5">₹{stats.upiSum.toLocaleString("en-IN")}</div></div>
            <div className="rounded-lg bg-white border border-slate-200 p-3.5"><div className="text-[11px] font-semibold text-slate-500">Low Stock (&le;5)</div><div className="text-2xl font-black text-rose-600">{stats.lowStock}</div></div>
          </div>

          {(navTab === "dashboard" || navTab === "grid") && (
            <section className="rounded-lg bg-white border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                <h2 className="text-xs font-black text-slate-800 uppercase">{meta.primaryTab} Table ({filteredRows.length})</h2>
                <div className="flex items-center gap-1.5">
                  {["ALL", "PENDING", "PACKED", "DELIVERED"].map((st) => (
                    <button key={st} type="button" onClick={() => setStatusFilter(st)} className={`px-2.5 py-1 rounded text-[11px] font-bold border ${statusFilter === st ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300"}`}>{st}</button>
                  ))}
                  <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className="h-7 rounded border border-slate-300 bg-white px-2 text-[11px] font-bold"><option value="ALL">All Pay</option><option value="COD">COD</option><option value="UPI">UPI</option></select>
                </div>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase"><th className="py-2 px-3">ID</th><th className="py-2 px-3">Customer</th><th className="py-2 px-3">Payment</th><th className="py-2 px-3">Amount</th><th className="py-2 px-3">Status</th><th className="py-2 px-3 text-right">Bill</th></tr></thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400">No records match this filter.</td></tr>
                  ) : filteredRows.map((row) => (
                    <tr key={row.id} onClick={() => setSelectedRow(row)} className={`border-b border-slate-100 cursor-pointer ${selectedRow?.id === row.id ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700">{String(row.id || "").slice(0, 8)}</td>
                      <td className="py-2 px-3 font-semibold">{row.customerName || row.customer_name || "Customer"}</td>
                      <td className="py-2 px-3">{row.paymentMethod || row.payment_method || "COD"}</td>
                      <td className="py-2 px-3 font-black">₹{Number(row.total || row.amount || 0).toLocaleString("en-IN")}</td>
                      <td className="py-2 px-3"><span className="rounded-full bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">{row.status || "PENDING"}</span></td>
                      <td className="py-2 px-3 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); printInvoice(row); }} className="rounded bg-slate-100 hover:bg-indigo-600 hover:text-white px-2 py-1 text-[10px] font-bold">🖨️ Print</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {navTab === "catalog" && (
            <section className="rounded-lg bg-white border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-800 uppercase">Inventory &amp; Pricing Spreadsheet ({filteredProducts.length})</h2>
                <button type="button" onClick={() => setShowAddProduct(true)} className="rounded bg-indigo-600 text-white px-3 py-1 text-[11px] font-bold">+ Add New Product</button>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead><tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 uppercase"><th className="py-2 px-3">Product Name</th><th className="py-2 px-3">Category</th><th className="py-2 px-3">Price</th><th className="py-2 px-3">Stock</th><th className="py-2 px-3">Status</th></tr></thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-3 font-bold">{p.name || p.title}</td>
                      <td className="py-2 px-3 text-slate-600">{p.category || "General"}</td>
                      <td className="py-2 px-3 font-black">₹{Number(p.price || 0)}</td>
                      <td className="py-2 px-3 font-bold">
                        <div className="inline-flex items-center gap-1.5">
                          <button type="button" onClick={() => handleQuickStockUpdate(p, -1)} className="h-6 w-6 rounded bg-slate-100 hover:bg-rose-100 text-xs font-black">-</button>
                          <span className="min-w-[24px] text-center">{p.stock ?? 0}</span>
                          <button type="button" onClick={() => handleQuickStockUpdate(p, 1)} className="h-6 w-6 rounded bg-slate-100 hover:bg-emerald-100 text-xs font-black">+</button>
                        </div>
                      </td>
                      <td className="py-2 px-3"><span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">{p.status || "Approved"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {navTab === "billing" && (
            <section className="rounded-lg bg-white border border-slate-200 p-5 space-y-3">
              <h2 className="text-sm font-black text-slate-900">GST &amp; Settlement Summary</h2>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4"><div className="text-slate-500 font-semibold">Gross Sales</div><div className="text-xl font-black text-slate-900 mt-1">₹{stats.gross.toLocaleString("en-IN")}</div></div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4"><div className="text-amber-700 font-semibold">Cash on Delivery (COD)</div><div className="text-xl font-black text-amber-800 mt-1">₹{stats.codSum.toLocaleString("en-IN")}</div></div>
                <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4"><div className="text-indigo-700 font-semibold">UPI / Online Settled</div><div className="text-xl font-black text-indigo-800 mt-1">₹{stats.upiSum.toLocaleString("en-IN")}</div></div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={exportCsv} className="rounded-md bg-indigo-600 text-white px-4 py-2 text-xs font-bold">⬇️ Download Accounting CSV</button>
                <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700">🖨️ Print Summary</button>
              </div>
            </section>
          )}

          {navTab === "settings" && (
            <section className="rounded-lg bg-white border border-slate-200 p-5 space-y-2 text-xs">
              <h2 className="text-sm font-black text-slate-900">Windows Workstation &amp; Account</h2>
              <div><strong>Business:</strong> {currentUser?.businessName || currentUser?.fullName}</div>
              <div><strong>Role:</strong> {role}</div>
              <div><strong>Phone / Email:</strong> {currentUser?.phone || currentUser?.email}</div>
              <div><strong>Desktop Edition:</strong> WE4ALL Windows v{appVersion} (Zero Android UI)</div>
            </section>
          )}
        </main>

        {selectedRow && (
          <aside className="hidden xl:flex w-80 shrink-0 bg-white border-l border-slate-200 flex-col justify-between p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div><div className="text-[10px] font-bold uppercase text-indigo-600">Order Inspector</div><div className="text-sm font-black">#{String(selectedRow.id || "").slice(0, 10)}</div></div>
                <button type="button" onClick={() => setSelectedRow(null)} className="h-7 w-7 rounded bg-slate-100 text-xs font-bold">✕</button>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
                <div><strong>Customer:</strong> {selectedRow.customerName || selectedRow.customer_name || "Customer"}</div>
                <div><strong>Payment:</strong> {selectedRow.paymentMethod || selectedRow.payment_method || "COD"}</div>
                <div><strong>Status:</strong> {selectedRow.status || "PENDING"}</div>
                <div><strong>Total:</strong> ₹{Number(selectedRow.total || selectedRow.amount || 0).toLocaleString("en-IN")}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => handleDesktopOrderStatus(selectedRow, "CONFIRMED")} className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white py-2 text-xs font-bold">✅ Confirm</button>
                <button type="button" onClick={() => handleDesktopOrderStatus(selectedRow, "PACKED")} className="rounded-md bg-amber-500 hover:bg-amber-600 text-white py-2 text-xs font-bold">📦 Mark Packed</button>
              </div>
              <button type="button" onClick={() => printInvoice(selectedRow)} className="w-full rounded-md bg-indigo-600 text-white py-2 text-xs font-bold">🖨️ Print GST Bill</button>
            </div>
          </aside>
        )}
      </div>

      {showAddProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <form onSubmit={handleAddProductDesktop} className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-5 shadow-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <h3 className="text-sm font-black text-slate-900">+ Add Product to WE4ALL Cloud</h3>
              <button type="button" onClick={() => setShowAddProduct(false)} className="text-xs font-bold text-slate-500">✕</button>
            </div>
            <input required value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} placeholder="Product name *" className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" min="1" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} placeholder="Selling Price ₹ *" className="rounded-md border border-slate-300 px-3 py-2 text-xs" />
              <input type="number" min="1" value={newProd.mrp} onChange={(e) => setNewProd({ ...newProd, mrp: e.target.value })} placeholder="MRP ₹" className="rounded-md border border-slate-300 px-3 py-2 text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="0" value={newProd.stock} onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })} placeholder="Stock Qty" className="rounded-md border border-slate-300 px-3 py-2 text-xs" />
              <input value={newProd.unit} onChange={(e) => setNewProd({ ...newProd, unit: e.target.value })} placeholder="Unit (e.g. 1 kg)" className="rounded-md border border-slate-300 px-3 py-2 text-xs" />
            </div>
            <button type="submit" disabled={savingProd} className="w-full rounded-md bg-indigo-600 text-white py-2 text-xs font-bold">{savingProd ? "Saving…" : "Submit Product for Approval"}</button>
          </form>
        </div>
      )}

      <footer className="h-7 shrink-0 bg-[#1e1b4b] text-indigo-200 px-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-3"><span className="text-emerald-300 font-bold">● Live Cloud</span><span>Role: <strong className="text-white uppercase">{role}</strong></span><span>Ctrl+K Search · Alt+1..5 Tabs</span></div>
        <div>Synced {lastSyncTime} · WE4ALL Windows v{appVersion}</div>
      </footer>
    </div>
  );
}