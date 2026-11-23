import React, { useMemo, useState } from "react";

const ROLE_META = {
  merchant: { title: "Merchant Desktop Console", icon: "🏪", badge: "Store & Inventory Pro" },
  service_provider: { title: "Service Provider Console", icon: "🛠️", badge: "1-Hr Services & Bookings" },
  decorator: { title: "Decorator & Halls Console", icon: "🎉", badge: "Venues & Event Bids" },
  labour: { title: "Labour & Toli Console", icon: "🧱", badge: "Worksites & Attendance" },
  rider: { title: "Captain Dispatch Console", icon: "🛵", badge: "Live Rides & Deliveries" },
};

export default function PartnerWebConsole({
  currentUser,
  authenticatedPartnerRole,
  orders = [],
  serviceBookings = [],
  products = [],
  onSwitchToMobile = () => {},
  onOpenAdmin = () => {},
  onLogout = () => {},
  renderAuthDesk,
  renderPortalWorkspace,
}) {
  const [desktopTab, setDesktopTab] = useState("home");
  const role = authenticatedPartnerRole || "";
  const meta = ROLE_META[role] || { title: "WE4ALL Partner Web Console", icon: "🖥️", badge: "Desktop Workspace" };
  const isApprovedPartner = Boolean(currentUser?.authUserId && !currentUser?.isGuest && ROLE_META[role]);

  const kpis = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeBookings = Array.isArray(serviceBookings) ? serviceBookings : [];
    const safeProducts = Array.isArray(products) ? products : [];
    const pendingOrders = safeOrders.filter((o) => !["DELIVERED", "CANCELLED", "COMPLETED"].includes(String(o?.status || "").toUpperCase())).length;
    const completedOrders = safeOrders.filter((o) => ["DELIVERED", "COMPLETED"].includes(String(o?.status || "").toUpperCase())).length;
    const totalRevenue = safeOrders.reduce((sum, o) => sum + (Number(o?.total || o?.amount || 0) || 0), 0);
    return {
      activeCount: role === "service_provider" ? safeBookings.length : pendingOrders,
      completedCount: completedOrders,
      catalogCount: safeProducts.length,
      totalVolume: totalRevenue,
    };
  }, [orders, serviceBookings, products, role]);

  const exportCsv = () => {
    const rows = role === "service_provider" ? (Array.isArray(serviceBookings) ? serviceBookings : []) : (Array.isArray(orders) ? orders : []);
    const header = ["ID", "Status", "Amount", "Payment", "CreatedAt"];
    const lines = [
      header.join(","),
      ...rows.map((r) => [
        JSON.stringify(r?.id || ""),
        JSON.stringify(r?.status || ""),
        JSON.stringify(r?.total || r?.amount || 0),
        JSON.stringify(r?.paymentMethod || r?.payment_method || "COD"),
        JSON.stringify(r?.createdAt || r?.created_at || ""),
      ].join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `we4all-${role || "partner"}-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
      <aside className="w-full lg:w-72 shrink-0 bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950 border-b lg:border-b-0 lg:border-r border-indigo-500/25 p-4 flex flex-col justify-between gap-4">
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-3.5 shadow-lg">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-100">WE4ALL Desktop Web Console</p>
            <h1 className="mt-1 text-base font-black text-white">{meta.icon} {meta.title}</h1>
            <p className="text-[11px] text-indigo-100/90 mt-0.5">{meta.badge}</p>
          </div>

          {isApprovedPartner && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-emerald-300">● Live Cloud Sync</span>
                <span className="rounded-full bg-indigo-500/30 px-2 py-0.5 text-[10px] font-black text-indigo-200 uppercase">{role}</span>
              </div>
              <p className="text-xs font-black text-white truncate">{currentUser?.businessName || currentUser?.fullName || "Approved Partner"}</p>
              <p className="text-[10px] text-slate-400 truncate">{currentUser?.phone || currentUser?.email || ""}</p>
            </div>
          )}

          {isApprovedPartner && (
            <nav className="space-y-1.5" aria-label="Partner console navigation">
              {[
                { id: "home", label: "📊 Live Operations Desk" },
                { id: "orders", label: "📦 Orders & Job Queue" },
                { id: "account", label: "⚙️ Account, KYC & Payouts" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDesktopTab(item.id)}
                  className={`w-full text-left rounded-xl px-3.5 py-2.5 text-xs font-black transition ${
                    desktopTab === item.id ? "bg-indigo-600 text-white shadow" : "bg-slate-900/70 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={exportCsv}
                className="w-full text-left rounded-xl px-3.5 py-2.5 text-xs font-black bg-slate-900/70 text-amber-300 hover:bg-slate-800 border border-amber-500/20"
              >
                ⬇️ Export Orders / Jobs CSV
              </button>
            </nav>
          )}
        </div>

        <div className="space-y-2 pt-3 border-t border-slate-800">
          <button type="button" onClick={onSwitchToMobile} className="w-full rounded-xl border border-indigo-400/40 bg-indigo-950/60 px-3 py-2 text-xs font-black text-indigo-200 hover:bg-indigo-900/60">
            📱 Switch to Mobile App View
          </button>
          <button type="button" onClick={onOpenAdmin} className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">
            🛡️ Founder Admin Console
          </button>
          {isApprovedPartner && (
            <button type="button" onClick={onLogout} className="w-full rounded-xl border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs font-black text-rose-200 hover:bg-rose-900/60">
              🚪 Sign Out Partner
            </button>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 lg:p-6 space-y-5 overflow-y-auto">
        {!isApprovedPartner ? (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="rounded-3xl border border-indigo-500/30 bg-slate-900 p-5 space-y-2">
              <span className="rounded-full bg-orange-500/20 border border-orange-400/40 px-3 py-1 text-[10px] font-black text-orange-300 uppercase">Merchants · Services · Halls · Labour · Captains</span>
              <h2 className="text-xl font-black text-white">Sign in to WE4ALL Partner Desktop Console</h2>
              <p className="text-xs text-slate-300">Manage orders, inventory, bookings, and payouts faster on desktop. Everything stays synced in real time with your WE4ALL mobile app.</p>
            </div>
            {typeof renderAuthDesk === "function" && renderAuthDesk()}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-indigo-500/30 bg-slate-900 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400">Active / Pending</p>
                <p className="mt-1 text-2xl font-black text-indigo-300">{kpis.activeCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400">Completed</p>
                <p className="mt-1 text-2xl font-black text-emerald-300">{kpis.completedCount}</p>
              </div>
              <div className="rounded-2xl border border-violet-500/30 bg-slate-900 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400">Catalogue Items</p>
                <p className="mt-1 text-2xl font-black text-violet-300">{kpis.catalogCount}</p>
              </div>
              <div className="rounded-2xl border border-orange-500/30 bg-slate-900 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-400">Gross Volume</p>
                <p className="mt-1 text-2xl font-black text-orange-300">₹{kpis.totalVolume.toLocaleString("en-IN")}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
              {typeof renderPortalWorkspace === "function" && renderPortalWorkspace(desktopTab)}
            </div>
          </>
        )}
      </main>
    </div>
  );
}