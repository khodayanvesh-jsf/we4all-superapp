import React, { useState } from "react";

export default function OwnerAccountProfile({
  currentUser,
  setCurrentUser,
  activePortal,
  setActivePortal,
  activeAddressObj,
  accountSecurity,
  setAccountSecurity,
  onLockApp,
  onOpenAdminConsole,
  brightTheme,
  setBrightTheme,
  appUpdateInfo,
  onCheckForUpdate,
  checkingUpdate,
  onRunOtaUpdate,
  otaProgress,
  onTriggerToast
}) {
  const [bankDetails, setBankDetails] = useState({
    bankName: currentUser?.bankName || "",
    accountNumber: currentUser?.accountNumber || "",
    ifscCode: currentUser?.ifscCode || "",
    upiId: currentUser?.upiId || ""
  });
  const [editingBank, setEditingBank] = useState(false);

  const [basicProfile, setBasicProfile] = useState({
    fullName: currentUser?.fullName || "Guest User",
    phone: currentUser?.phone || "",
    savedLocation: activeAddressObj?.fullAddress || "Adilabad Town",
    profilePhoto: currentUser?.profilePhoto || "",
    lastModifiedTimestamp: null
  });
  const [editingBasicInfo, setEditingBasicInfo] = useState(false);
  const [basicEditOtpSent, setBasicEditOtpSent] = useState("");
  const [basicEditOtpInput, setBasicEditOtpInput] = useState("");
  const [pinInput, setPinInput] = useState(accountSecurity?.fastPin || "1234");

  const daysSinceLastEdit = basicProfile.lastModifiedTimestamp
    ? Math.floor((Date.now() - basicProfile.lastModifiedTimestamp) / (1000 * 60 * 60 * 24))
    : 31;
  const canEditBasicThisMonth = daysSinceLastEdit >= 30;

  const isUpdateReady = Boolean(
    appUpdateInfo?.updateAvailable ||
      (appUpdateInfo?.latestAvailableVersion &&
        appUpdateInfo?.currentVersion !== appUpdateInfo?.latestAvailableVersion)
  );

  return (
    <div className="space-y-3 text-xs pb-4">
      {/* 1. OWNER PROFILE IDENTITY CARD */}
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3 space-y-2.5 text-white">
        <div className="flex items-center gap-3">
          <label className="relative w-14 h-14 rounded-2xl border-2 border-amber-400 bg-slate-950 flex items-center justify-center overflow-hidden cursor-pointer shrink-0">
            {basicProfile.profilePhoto ? (
              <img src={basicProfile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-black text-amber-400">
                {(basicProfile.fullName || "U").slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[8px] text-amber-300 text-center font-bold">
              Photo
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = URL.createObjectURL(f);
                  setBasicProfile({ ...basicProfile, profilePhoto: url });
                  setCurrentUser({ ...currentUser, profilePhoto: url });
                  if (onTriggerToast) onTriggerToast("Owner Profile photo updated!");
                }
              }}
              className="hidden"
            />
          </label>
          <div className="flex-1 min-w-0">
            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[9px] font-black uppercase">
              Verified {activePortal.replace(/_/g, " ")} Owner
            </span>
            <h3 className="text-sm font-black text-white truncate mt-0.5">
              {basicProfile.fullName}
            </h3>
            <p className="text-[11px] text-amber-300 font-mono">
              {basicProfile.phone ? `+91 ${basicProfile.phone}` : "Phone Not Linked"}
            </p>
            <p className="text-[10px] text-slate-400 truncate">{basicProfile.savedLocation}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800">
          {!editingBasicInfo ? (
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-slate-400">
                {canEditBasicThisMonth
                  ? "Monthly Basic Info Edit Available (OTP Verified)"
                  : `Locked for ${30 - daysSinceLastEdit} more days`}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (!canEditBasicThisMonth) {
                    alert("Basic Profile Info can only be modified once every 30 days.");
                    return;
                  }
                  setEditingBasicInfo(true);
                }}
                className="bg-slate-800 text-amber-300 border border-amber-400/40 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer"
              >
                Edit Basic Info (OTP)
              </button>
            </div>
          ) : (
            <div className="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-amber-400/50">
              <input
                type="text"
                value={basicProfile.fullName}
                onChange={(e) => setBasicProfile({ ...basicProfile, fullName: e.target.value })}
                placeholder="Full Legal Name"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
              />
              <input
                type="tel"
                maxLength={10}
                value={basicProfile.phone}
                onChange={(e) => setBasicProfile({ ...basicProfile, phone: e.target.value })}
                placeholder="10-Digit Mobile"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const otp = String(Math.floor(1000 + Math.random() * 9000));
                    setBasicEditOtpSent(otp);
                    setBasicEditOtpInput(otp);
                    if (onTriggerToast) onTriggerToast(`Profile Modification OTP: ${otp}`);
                  }}
                  className="flex-1 bg-amber-400 text-slate-950 font-black py-1.5 rounded-lg cursor-pointer"
                >
                  Send OTP
                </button>
                <button
                  type="button"
                  onClick={() => setEditingBasicInfo(false)}
                  className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              {basicEditOtpSent && (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={basicEditOtpInput}
                    onChange={(e) => setBasicEditOtpInput(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-400 rounded-lg p-1.5 text-center font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (basicEditOtpInput !== basicEditOtpSent) {
                        alert("Invalid OTP!");
                        return;
                      }
                      setBasicProfile({
                        ...basicProfile,
                        lastModifiedTimestamp: Date.now()
                      });
                      setCurrentUser({
                        ...currentUser,
                        fullName: basicProfile.fullName,
                        phone: basicProfile.phone
                      });
                      setEditingBasicInfo(false);
                      setBasicEditOtpSent("");
                      if (onTriggerToast)
                        onTriggerToast("Basic Profile Updated & Locked for 30 Days!");
                    }}
                    className="w-full bg-emerald-500 text-slate-950 font-black py-1.5 rounded-lg cursor-pointer"
                  >
                    Verify OTP ({basicEditOtpSent}) & Save
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. BANK ACCOUNT & UPI ID MANAGER (EDITABLE ANYTIME) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-black text-emerald-400 text-xs">
              Bank Account & UPI ID (Modify Anytime)
            </h4>
            <p className="text-[10px] text-slate-400">
              Used for instant UPI payments, partner payouts & refunds
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingBank(!editingBank)}
            className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer"
          >
            {editingBank ? "Close" : "Modify Anytime"}
          </button>
        </div>

        {!editingBank ? (
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[10px]">
            <p>
              UPI ID: <strong className="text-amber-300 font-mono">{bankDetails.upiId || "Not Set"}</strong>
            </p>
            <p>
              Bank: <strong>{bankDetails.bankName || "Not Set"}</strong>{" "}
              {bankDetails.accountNumber ? `(${bankDetails.accountNumber} / ${bankDetails.ifscCode})` : ""}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40">
            <input
              type="text"
              value={bankDetails.upiId}
              onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
              placeholder="UPI ID (e.g. name@ybl)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
            />
            <input
              type="text"
              value={bankDetails.bankName}
              onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
              placeholder="Bank Name (e.g. SBI Adilabad)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) =>
                  setBankDetails({ ...bankDetails, accountNumber: e.target.value })
                }
                placeholder="A/C Number"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
              />
              <input
                type="text"
                value={bankDetails.ifscCode}
                onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                placeholder="IFSC Code"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setCurrentUser({ ...currentUser, ...bankDetails });
                setEditingBank(false);
                if (onTriggerToast) onTriggerToast("Bank & UPI details saved immediately!");
              }}
              className="w-full bg-emerald-500 text-slate-950 font-black py-1.5 rounded-lg cursor-pointer"
            >
              Save Bank & UPI Details
            </button>
          </div>
        )}
      </div>

      {/* 3. SWITCH ACTIVE PORTAL & CONSUMER SHOPPING MODE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 text-white">
        <h4 className="font-black text-amber-400 text-xs">
          Switch Active Portal / Personal Consumer Shopping
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: "customer", label: "1. Customer Super-App" },
            { id: "merchant", label: "2. Product Merchant" },
            { id: "service_provider", label: "3. 1-Hr Service Provider" },
            { id: "decorator", label: "4. Decorator & Halls" },
            { id: "rider", label: "5. Delivery Captain" },
            { id: "labour", label: "6. Labour & Mistri Adda" }
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePortal(p.id)}
              className={`p-2 rounded-xl font-bold text-left text-[10px] border cursor-pointer ${
                activePortal === p.id
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-slate-950 border-slate-800 text-slate-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. PIN, BIOMETRIC & DEDICATED FOUNDER ADMIN ACCESS (Requirement 14) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2 text-white">
        <h4 className="font-black text-teal-300 text-xs">
          Security (PIN / Biometric), UI Theme & Founder Admin Access
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() =>
              setAccountSecurity({
                ...accountSecurity,
                pinEnabled: !accountSecurity.pinEnabled
              })
            }
            className={`py-1.5 rounded-xl font-black text-[10px] cursor-pointer ${
              accountSecurity.pinEnabled
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            4-Digit PIN: {accountSecurity.pinEnabled ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={() =>
              setAccountSecurity({
                ...accountSecurity,
                biometricEnabled: !accountSecurity.biometricEnabled
              })
            }
            className={`py-1.5 rounded-xl font-black text-[10px] cursor-pointer ${
              accountSecurity.biometricEnabled
                ? "bg-teal-400 text-slate-950"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            Biometric: {accountSecurity.biometricEnabled ? "ON" : "OFF"}
          </button>
        </div>

        <div className="flex gap-1.5">
          <input
            type="password"
            maxLength={4}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="4-Digit PIN"
            className="w-24 bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-center font-mono text-white"
          />
          <button
            type="button"
            onClick={() => {
              if (pinInput === "9999" && onOpenAdminConsole) {
                onOpenAdminConsole();
                return;
              }
              setAccountSecurity({ ...accountSecurity, fastPin: pinInput });
              if (onTriggerToast) onTriggerToast("4-Digit Quick PIN saved!");
            }}
            className="flex-1 bg-slate-800 text-amber-300 font-bold rounded-xl text-[10px] cursor-pointer"
          >
            Save PIN
          </button>
          <button
            type="button"
            onClick={() => setBrightTheme(!brightTheme)}
            className="bg-slate-800 text-emerald-300 px-2.5 rounded-xl font-bold text-[10px] cursor-pointer"
          >
            {brightTheme ? "Dark UI" : "Bright UI"}
          </button>
          <button
            type="button"
            onClick={onLockApp}
            className="bg-rose-600 text-white font-black px-2.5 rounded-xl text-[10px] cursor-pointer"
          >
            Lock
          </button>
        </div>

        {onOpenAdminConsole && (
          <div className="pt-1 border-t border-slate-800 space-y-1">
            <button
              type="button"
              onClick={onOpenAdminConsole}
              className="w-full bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 font-black py-2 rounded-xl text-xs cursor-pointer shadow"
            >
              \uD83D\uDEE1\uFE0F Open Founder Admin Console (Web & Mobile Module)
            </button>
            <p className="text-[9px] text-slate-400 text-center">
              Dedicated Admin Web Link: <strong className="text-emerald-300">https://we-4-all-super-app.vercel.app/admin</strong>
            </p>
          </div>
        )}
      </div>

      {/* 5. WE4ALL OTA UPDATE CENTER */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-2 border-amber-400 rounded-2xl p-3 space-y-2.5 text-white shadow-lg">
        <div className="flex justify-between items-center gap-2">
          <div>
            <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded uppercase">
              WE4ALL App Update Center (OTA)
            </span>
            <h4 className="font-black text-emerald-300 text-xs mt-1">
              Installed: v{appUpdateInfo?.currentVersion || "3.1.0"} | Latest: v
              {appUpdateInfo?.latestAvailableVersion || "3.1.0"}
            </h4>
          </div>
          <button
            type="button"
            onClick={onCheckForUpdate}
            className="bg-slate-800 hover:bg-slate-700 border border-emerald-400/60 text-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer shadow"
          >
            <span>&#x21BB;</span>
            <span>{checkingUpdate ? "Checking..." : "Check Update"}</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-300 leading-relaxed">
          {appUpdateInfo?.releaseNotes}
        </p>

        {otaProgress && (
          <div className="space-y-1 bg-slate-950 p-2 rounded-xl border border-emerald-500/40">
            <div className="flex justify-between text-[10px] font-bold text-amber-300">
              <span>{otaProgress.msg}</span>
              <span>{otaProgress.pct}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full transition-all duration-300"
                style={{ width: `${otaProgress.pct}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={onRunOtaUpdate}
            className={`font-black py-2 rounded-xl text-[10px] cursor-pointer shadow ${
              isUpdateReady
                ? "bg-amber-400 text-slate-950 animate-pulse"
                : "bg-emerald-500 text-slate-950"
            }`}
          >
            {isUpdateReady
              ? `Download & Install v${appUpdateInfo?.latestAvailableVersion}`
              : "Verify & Sync OTA"}
          </button>
          <a
            href={appUpdateInfo?.apkDownloadUrl || "/WE4ALL.apk"}
            download="WE4ALL.apk"
            className="bg-slate-800 hover:bg-slate-700 border border-emerald-400/50 text-emerald-300 font-black py-2 rounded-xl text-[10px] text-center cursor-pointer shadow block"
          >
            Download WE4ALL.apk
          </a>
        </div>
      </div>
    </div>
  );
}