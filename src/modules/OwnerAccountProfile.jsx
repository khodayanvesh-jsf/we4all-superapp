import React from "react";

export default function OwnerAccountProfile({
  currentUser,
  setCurrentUser,
  activePortal,
  setActivePortal,
  activeAddressObj,
  accountSecurity,
  setAccountSecurity,
  onLockApp,
  onOpenAdminGate,
  onSignOutToGuest,
  brightTheme,
  setBrightTheme,
  liveTelemetryPing,
  onTriggerToast
}) {
  const isGuest = !currentUser || currentUser.isGuest;

  return (
    <div className="space-y-3 text-xs">
      {/* GUEST OR LOGGED-IN USER CARD */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-emerald-500/40 space-y-3 shadow">
        <div className="flex justify-between items-start gap-2">
          <div>
            <span
              className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                isGuest
                  ? "bg-amber-400 text-slate-950"
                  : "bg-emerald-500/20 border border-emerald-400 text-emerald-300"
              }`}
            >
              {isGuest ? "GUEST SHOPPING MODE (NOT LOGGED IN)" : `VERIFIED ${activePortal.toUpperCase()}`}
            </span>
            <h3 className="text-sm font-black text-white mt-1">
              {isGuest ? "Welcome, Guest Shopper" : currentUser.fullName}
            </h3>
            <p className="text-[10px] text-slate-400">
              {isGuest
                ? "Browse Local Stores freely. Sign in or register when you are ready to order or open a Partner Portal."
                : `Mobile: +91 ${currentUser.phone} | UPI: ${currentUser.upiId || "Not Set"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBrightTheme(!brightTheme)}
            className="bg-slate-800 border border-slate-700 text-amber-300 px-2.5 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer shrink-0"
          >
            {brightTheme ? "\uD83C\uDF19 Dark" : "\u2600\uFE0F Bright"}
          </button>
        </div>

        {isGuest ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onLockApp}
              className="bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
            >
              Sign In / Register Account &rarr;
            </button>
            <button
              type="button"
              onClick={onOpenAdminGate}
              className="bg-slate-800 border border-amber-400/50 text-amber-300 font-black py-2.5 rounded-xl cursor-pointer"
            >
              \uD83D\uDD10 Founder Admin Login
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onLockApp}
              className="bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
            >
              Switch Role / KYC Vault
            </button>
            <button
              type="button"
              onClick={onSignOutToGuest}
              className="bg-rose-600 text-white font-black py-2 rounded-xl cursor-pointer"
            >
              Sign Out to Guest Mode
            </button>
          </div>
        )}
      </div>

      {/* REAL-TIME MOBILE HARDWARE & GPS TELEMETRY STATUS (REQ 5) */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-teal-500/40 space-y-2">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-teal-300 text-xs">
            \uD83D\uDCE1 Live Mobile Sensor & GPS Connection
          </h4>
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[9px] font-black">
            REAL-TIME CONNECTED
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px]">
          <div>
            <p className="text-slate-400 text-[9px]">Live GPS Coordinates:</p>
            <p className="font-mono font-bold text-emerald-400">
              {liveTelemetryPing
                ? `${liveTelemetryPing.lat}, ${liveTelemetryPing.lng}`
                : "19.6641, 78.5320"}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-[9px]">Sensor Accuracy & Speed:</p>
            <p className="font-bold text-amber-300">
              &plusmn;{liveTelemetryPing?.accuracyMeters || 8}m &bull;{" "}
              {liveTelemetryPing?.speedKmh || 0} km/h
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-[9px]">Battery & Network:</p>
            <p className="font-bold text-white">
              \uD83D\uDD0B {liveTelemetryPing?.batteryPct ?? 100}% &bull;{" "}
              {liveTelemetryPing?.networkType || "4G/WIFI"}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-[9px]">Delivery / Active Address:</p>
            <p className="font-bold text-teal-200 truncate">
              {activeAddressObj?.fullAddress || "Adilabad Town"}
            </p>
          </div>
        </div>
      </div>

      {/* QUICK PORTAL SWITCHER & FOUNDER ADMIN ACCESS */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <h4 className="font-black text-amber-400 text-xs">
          Switch Portal or Open Founder Admin Console
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: "customer", label: "1. Consumer Shopping" },
            { id: "merchant", label: "2. Product Merchant" },
            { id: "service_provider", label: "3. Service Provider" },
            { id: "decorator", label: "4. Decorator & Halls" },
            { id: "rider", label: "5. Delivery Captain" }
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setActivePortal(p.id);
                onTriggerToast(`Switched to ${p.label}`);
              }}
              className={`p-2 rounded-xl border text-left font-bold text-[10px] cursor-pointer ${
                activePortal === p.id
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-slate-950 border-slate-800 text-slate-300"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenAdminGate}
            className="p-2 rounded-xl border border-amber-400 bg-amber-400/15 text-amber-300 font-black text-[10px] text-left cursor-pointer"
          >
            \uD83D\uDD10 6. Founder Admin Console
          </button>
        </div>
      </div>
    </div>
  );
}