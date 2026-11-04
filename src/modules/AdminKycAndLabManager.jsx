import React from "react";

const ROLE_OPTIONS = [
  { value: "customer", label: "1. Customer Super-App" },
  { value: "merchant", label: "2. Product Merchant Desk" },
  { value: "service_provider", label: "3. 1-Hr Service Provider" },
  { value: "decorator", label: "4. Event & Function Hall" },
  { value: "rider", label: "5. Delivery Captain Radar" },
  { value: "labour", label: "6. Labour & Mistri Adda" }
];

export default function AdminKycAndLabManager({
  registeredUsers = [],
  setRegisteredUsers = () => {},
  splitScreens = [],
  setSplitScreens = () => {},
  onLaunchNPortalLab = () => {},
  onTriggerToast = () => {}
}) {
  const pendingPartners = (registeredUsers || []).filter(
    (u) => u.role !== "customer" && u.kycStatus === "PENDING_ADMIN_APPROVAL"
  );
  const approvedPartners = (registeredUsers || []).filter(
    (u) => u.role !== "customer" && (u.kycStatus === "APPROVED" || u.kycVerified === true)
  );

  const handleApprovePartner = (id) => {
    const updated = (registeredUsers || []).map((u) =>
      u.id === id ? { ...u, kycVerified: true, kycStatus: "APPROVED" } : u
    );
    setRegisteredUsers(updated);
    onTriggerToast("Partner KYC Approved! Partner can now log in with Mobile + PIN + OTP.");
  };

  const handleRejectOrSuspendPartner = (id, newStatus = "REJECTED") => {
    const updated = (registeredUsers || []).map((u) =>
      u.id === id ? { ...u, kycVerified: false, kycStatus: newStatus } : u
    );
    setRegisteredUsers(updated);
    onTriggerToast(`Partner status updated to ${newStatus}. Portal access locked.`);
  };

  const handleAddScreen = (defaultRole = "customer") => {
    const nextNum = splitScreens.length + 1;
    setSplitScreens([
      ...splitScreens,
      {
        id: Date.now() + Math.random(),
        title: `Screen #${nextNum}`,
        role: defaultRole,
        footerTab: "home",
        subTab: "stores"
      }
    ]);
  };

  const handleRemoveScreen = (id) => {
    if (splitScreens.length <= 1) {
      onTriggerToast("At least 1 screen is required in the N-Portal Lab.");
      return;
    }
    setSplitScreens(splitScreens.filter((s) => s.id !== id));
  };

  const handleChangeScreenRole = (id, newRole) => {
    setSplitScreens(
      splitScreens.map((s) =>
        s.id === id ? { ...s, role: newRole, footerTab: "home" } : s
      )
    );
  };

  const handlePresetScreens = (rolesArray) => {
    const built = rolesArray.map((r, idx) => ({
      id: idx + 1,
      title: `Screen #${idx + 1}`,
      role: r,
      footerTab: "home",
      subTab: "stores"
    }));
    setSplitScreens(built);
    onTriggerToast(`Configured ${built.length}-Portal Independent Lab!`);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* SECTION A: PARTNER KYC APPROVAL QUEUE */}
      <div className="bg-slate-900 border-2 border-amber-400/60 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="font-black text-amber-400 text-sm flex items-center gap-2">
              🛡️ PARTNER KYC VERIFICATION & APPROVAL GATE
              <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">
                {pendingPartners.length} Pending
              </span>
            </h3>
            <p className="text-[11px] text-slate-300">
              Newly registered KYC partners cannot access their portal until approved here by the Founder Admin.
            </p>
          </div>
        </div>

        {pendingPartners.length === 0 ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-400 font-bold text-center">
            ✅ No pending Partner KYC applications waiting for approval.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {pendingPartners.map((prt) => (
              <div
                key={prt.id}
                className="bg-slate-950 border border-amber-400/50 rounded-xl p-3 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                      {StringString((prt?.role ?? "customer") ?? "").replace("_", " ")}
                    </span>
                    <h4 className="font-black text-white text-xs mt-1">
                      {prt.fullName} ({prt.businessName})
                    </h4>
                  </div>
                  <span className="text-[10px] font-black text-amber-300">
                    ⏳ PENDING KYC
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 space-y-0.5">
                  <p>📱 Mobile: <strong className="text-white">{prt.phone}</strong></p>
                  <p>🪪 KYC Doc (GST/Aadhaar/DL): <strong className="text-emerald-300">{prt.kycDocNumber}</strong></p>
                  <p>🏦 Settlement UPI: <strong className="text-amber-200">{prt.upiId}</strong></p>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleApprovePartner(prt.id)}
                    className="flex-1 bg-emerald-500 text-slate-950 font-black py-1.5 rounded-lg text-[10px] cursor-pointer"
                  >
                    ✅ Approve & Unlock Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRejectOrSuspendPartner(prt.id, "REJECTED")}
                    className="bg-rose-600 text-white font-black px-3 py-1.5 rounded-lg text-[10px] cursor-pointer"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {approvedPartners.length > 0 && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <h4 className="font-black text-emerald-400 text-xs">
              ✅ Verified Live Partners ({approvedPartners.length})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {approvedPartners.map((ap) => (
                <div
                  key={ap.id}
                  className="bg-slate-950 border border-emerald-800/60 rounded-xl p-2.5 flex justify-between items-center"
                >
                  <div>
                    <p className="font-black text-white text-[11px]">{ap.fullName}</p>
                    <p className="text-[9px] text-emerald-300 uppercase font-bold">
                      {ap.role} • 📱 {ap.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRejectOrSuspendPartner(ap.id, "PENDING_ADMIN_APPROVAL")}
                    className="bg-slate-800 hover:bg-rose-700 text-rose-300 hover:text-white px-2 py-1 rounded text-[9px] font-black cursor-pointer"
                  >
                    Suspend
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION B: N-PORTAL MULTI-SCREEN LAB BUILDER */}
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="font-black text-emerald-400 text-sm">
              🖥️ N-PORTAL MULTI-SCREEN SIMULATION LAB (INDEPENDENT OPERATIONS)
            </h3>
            <p className="text-[11px] text-slate-300">
              Select how many screens to open and assign any portal role to each screen. Each portal operates its own independent tabs & workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={onLaunchNPortalLab}
            className="bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs cursor-pointer shadow-lg"
          >
            🚀 Launch {splitScreens.length}-Portal Lab Now &rarr;
          </button>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-black text-slate-400 mr-1">Quick Presets:</span>
          <button
            type="button"
            onClick={() => handlePresetScreens(["customer", "merchant"])}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
          >
            2 Screens (Customer + Merchant)
          </button>
          <button
            type="button"
            onClick={() => handlePresetScreens(["customer", "merchant", "rider"])}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
          >
            3 Screens (Order + Pack + Captain)
          </button>
          <button
            type="button"
            onClick={() =>
              handlePresetScreens(["customer", "merchant", "service_provider", "rider"])
            }
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
          >
            4 Screens
          </button>
          <button
            type="button"
            onClick={() =>
              handlePresetScreens([
                "customer",
                "merchant",
                "service_provider",
                "decorator",
                "rider",
                "labour"
              ])
            }
            className="bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
          >
            All 6 Ecosystem Portals
          </button>
          <button
            type="button"
            onClick={() => handleAddScreen("customer")}
            className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
          >
            + Add Screen
          </button>
        </div>

        {/* Individual Screen Role Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {splitScreens.map((scr, idx) => (
            <div
              key={scr.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between gap-2"
            >
              <div className="flex-1">
                <p className="text-[10px] font-black text-amber-400">
                  PORTAL SCREEN #{idx + 1}
                </p>
                <select
                  value={scr.role}
                  onChange={(e) => handleChangeScreenRole(scr.id, e.target.value)}
                  className="w-full mt-1 bg-slate-900 text-white border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold"
                >
                  {ROLE_OPTIONS.map((ro) => (
                    <option key={ro.value} value={ro.value}>
                      {ro.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveScreen(scr.id)}
                className="bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}