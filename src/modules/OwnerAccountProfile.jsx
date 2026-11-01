import React, { useState } from "react";
import {
  INDIAN_LANGUAGES,
  GEO_SLANG_REGIONS,
  getLangText,
  getGeoSlangConfig
} from "./i18n/indianLanguages";

export default function OwnerAccountProfile({
  currentUser,
  setCurrentUser,
  isAuthenticated = true,
  onOpenAuthModal = () => {},
  activePortal,
  setActivePortal,
  activeAddressObj,
  accountSecurity,
  setAccountSecurity,
  onLockApp,
  brightTheme,
  setBrightTheme,
  lang = "EN",
  setLang = () => {},
  geoRegion = "TELANGANA",
  setGeoRegion = () => {},
  appUpdateInfo,
  onCheckForUpdate,
  checkingUpdate,
  onRunOtaUpdate,
  otaProgress,
  onTriggerToast
}) {
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    fullName: currentUser?.fullName || "Khoday Anvesh",
    phone: currentUser?.phone || "9848011223",
    upiId: currentUser?.upiId || "khodayanvesh@ybl",
    bankName: currentUser?.bankName || "State Bank of India",
    accountNumber: currentUser?.accountNumber || "30984451209",
    ifscCode: currentUser?.ifscCode || "SBIN0000801"
  });

  const t = getLangText(lang);
  const activeGeoSlang = getGeoSlangConfig(geoRegion);
  const hasUpdate = Boolean(
    appUpdateInfo?.updateAvailable ||
      (appUpdateInfo?.latestAvailableVersion &&
        appUpdateInfo?.currentVersion !== appUpdateInfo?.latestAvailableVersion)
  );

  return (
    <div className="space-y-3 text-xs text-white">
      {/* 1. DIRECT LOGIN / REGISTRATION HUB FOR MERCHANTS, PARTNERS & CONSUMERS */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border-2 border-emerald-400 space-y-2.5 shadow-xl">
        <div className="flex justify-between items-start gap-2">
          <div>
            <span className="bg-emerald-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded uppercase">
              {isAuthenticated
                ? `SIGNED IN (${activePortal.replace("_", " ").toUpperCase()})`
                : "GUEST SHOPPING MODE"}
            </span>
            <h3 className="font-black text-white text-sm mt-1">
              {isAuthenticated
                ? currentUser?.fullName || "Khoday Anvesh"
                : "Welcome to WE4ALL Super-App"}
            </h3>
            <p className="text-[10px] text-slate-300">
              {isAuthenticated
                ? `Mobile: +91 ${currentUser?.phone || "9848011223"} | UPI: ${
                    currentUser?.upiId || "khodayanvesh@ybl"
                  }`
                : "Sign in as an existing Customer/Merchant/Partner or Sign Up for a new portal account."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBrightTheme(!brightTheme)}
            className="bg-slate-800 border border-slate-700 text-amber-300 px-2.5 py-1.5 rounded-xl text-[10px] font-black cursor-pointer shrink-0"
          >
            {brightTheme ? "Dark Mode" : "Bright Mode"}
          </button>
        </div>

        {/* Direct Login OR New Sign-Up Buttons for Any Portal */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenAuthModal("login")}
            className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black py-2.5 px-3 rounded-xl text-[10px] cursor-pointer shadow"
          >
            Existing User / Partner &rarr; Login
          </button>
          <button
            type="button"
            onClick={() => onOpenAuthModal("signup")}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2.5 px-3 rounded-xl text-[10px] cursor-pointer shadow"
          >
            New User / Partner &rarr; Sign Up
          </button>
        </div>

        {/* Quick Portal Switcher for Logged-In Partners */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
          <label className="block text-[10px] text-emerald-300 font-black">
            Open Partner Portal / Switch Active Console:
          </label>
          <select
            value={activePortal}
            onChange={(e) => setActivePortal(e.target.value)}
            className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl p-2 text-white font-bold text-xs cursor-pointer"
          >
            <option value="customer">1. Consumer Super-App (Default Shopping)</option>
            <option value="merchant">2. Product Merchant Portal (Kirana / Supermart)</option>
            <option value="service_provider">3. 1-Hr Home Service Provider Portal</option>
            <option value="decorator">4. Flower Decorator &amp; Function Halls</option>
            <option value="rider">5. Delivery Captain Portal (2W / 3W / 4W)</option>
            <option value="labour_portal">6. Local Labour &amp; Mistri Adda Portal</option>
          </select>
        </div>
      </div>

      {/* 2. LANGUAGE & GEO-LOCATION LOCAL SLANG CONTROLLER */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border-2 border-amber-400/70 space-y-2.5">
        <div>
          <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[9px]">
            LOCAL LANGUAGE &amp; GEO-SLANG ENGINE
          </span>
          <h4 className="font-black text-amber-300 text-xs mt-1">
            App Language &amp; Regional Local Slang Titles
          </h4>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] text-slate-300 font-bold">
            1. Select Application Language (Default: English):
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {INDIAN_LANGUAGES.map((l) => {
              const selected = lang === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLang(l.code);
                    if (l.defaultGeo) setGeoRegion(l.defaultGeo);
                    if (onTriggerToast) {
                      onTriggerToast(
                        `Language set to ${l.label} & local slang synced!`
                      );
                    }
                  }}
                  className={`p-2 rounded-xl border text-center cursor-pointer transition ${
                    selected
                      ? "bg-amber-400 text-slate-950 border-white font-black shadow"
                      : "bg-slate-950 text-slate-300 border-slate-800"
                  }`}
                >
                  <div className="text-[11px] font-black">{l.native}</div>
                  <div className="text-[8px] opacity-80">{l.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1 pt-1">
          <label className="block text-[10px] text-emerald-300 font-bold">
            2. Active Geo-Location Regional Slang (Categories &amp; Roles):
          </label>
          <select
            value={geoRegion}
            onChange={(e) => {
              setGeoRegion(e.target.value);
              const found = getGeoSlangConfig(e.target.value);
              if (onTriggerToast) {
                onTriggerToast(
                  `Geo-Location Slang switched to ${found.stateName}!`
                );
              }
            }}
            className="w-full bg-slate-950 border border-emerald-400 rounded-xl p-2 text-emerald-300 font-bold text-[11px] cursor-pointer"
          >
            {GEO_SLANG_REGIONS.map((reg) => (
              <option key={reg.id} value={reg.id}>
                {reg.stateName} ({reg.standSlang})
              </option>
            ))}
          </select>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[10px]">
          <p className="font-black text-amber-300">
            Active Local Slang in {activeGeoSlang.stateName}:
          </p>
          <p className="text-emerald-300">
            <strong>Mason:</strong> {activeGeoSlang.labourRoles.mason_mistri}
          </p>
          <p className="text-teal-300">
            <strong>Helper:</strong> {activeGeoSlang.labourRoles.daily_helper}
          </p>
          <p className="text-indigo-300">
            <strong>Loader:</strong> {activeGeoSlang.labourRoles.hamali_loading}
          </p>
        </div>
      </div>

      {/* 3. IN-APP OTA SOFTWARE UPDATER */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border border-teal-500/40 space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-black text-teal-300 text-xs">
              In-App Software Updater (Auto-Syncs on Startup)
            </h4>
            <p className="text-[10px] text-slate-400">
              Installed: <strong>v{appUpdateInfo?.currentVersion || "3.0.4"}</strong> | Latest Cloud:{" "}
              <strong className="text-emerald-400">
                v{appUpdateInfo?.latestAvailableVersion || "3.0.4"}
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onCheckForUpdate}
            disabled={checkingUpdate}
            className="bg-slate-800 border border-teal-400 text-teal-300 font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
          >
            {checkingUpdate ? "Checking..." : "Check Update"}
          </button>
        </div>
        {hasUpdate && (
          <button
            type="button"
            onClick={onRunOtaUpdate}
            className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer shadow"
          >
            Install Update v{appUpdateInfo?.latestAvailableVersion} Now
          </button>
        )}
      </div>

      {/* 4. BANK & UPI SETTLEMENT VAULT */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex justify-between items-center">
          <h4 className="font-black text-slate-200 text-xs">
            Bank &amp; Instant UPI Settlement Details
          </h4>
          <button
            type="button"
            onClick={() => setEditingBank(!editingBank)}
            className="text-[10px] text-amber-300 underline font-bold cursor-pointer"
          >
            {editingBank ? "Close" : "Edit"}
          </button>
        </div>
        {editingBank ? (
          <div className="space-y-2">
            <input
              type="text"
              value={bankForm.fullName}
              onChange={(e) =>
                setBankForm({ ...bankForm, fullName: e.target.value })
              }
              placeholder="Full Name"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
            <input
              type="text"
              value={bankForm.upiId}
              onChange={(e) =>
                setBankForm({ ...bankForm, upiId: e.target.value })
              }
              placeholder="UPI ID"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
            <button
              type="button"
              onClick={() => {
                setCurrentUser({ ...currentUser, ...bankForm });
                setEditingBank(false);
                if (onTriggerToast) onTriggerToast("Account & UPI details saved!");
              }}
              className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
            >
              Save Details
            </button>
          </div>
        ) : (
          <p className="text-[10px] text-slate-400">
            Bank: {currentUser?.bankName || "State Bank of India"} | IFSC:{" "}
            {currentUser?.ifscCode || "SBIN0000801"}
          </p>
        )}
      </div>

      {isAuthenticated && (
        <button
          type="button"
          onClick={onLockApp}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-2xl cursor-pointer shadow"
        >
          {t.logoutBtn || "Sign Out / Logout"}
        </button>
      )}
    </div>
  );
}