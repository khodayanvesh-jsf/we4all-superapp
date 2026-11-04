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
  onOpenAdminGate,
  onSignOutToGuest,
  brightTheme,
  setBrightTheme,
  liveTelemetryPing,
  appUpdateInfo,
  onCheckForUpdate,
  checkingUpdate,
  onRunOtaUpdate,
  otaProgress,
  onTriggerToast
}) {
  const isGuest = !currentUser || currentUser.isGuest;

  const [editingBank, setEditingBank] = useState(false);
  const [bankDetails, setBankDetails] = useState({
    upiId: currentUser?.upiId || "khodayanvesh@ybl",
    bankName: currentUser?.bankName || "State Bank of India (Adilabad Main)",
    accountNumber: currentUser?.accountNumber || "30984451209",
    ifscCode: currentUser?.ifscCode || "SBIN0000801"
  });

  const [editingBasicInfo, setEditingBasicInfo] = useState(false);
  const [basicProfile, setBasicProfile] = useState({
    fullName: isGuest ? "Guest Shopper" : currentUser?.fullName || "Khoday Anvesh",
    phone: isGuest ? "" : currentUser?.phone || "9848011223",
    savedLocation: activeAddressObj?.fullAddress || "Subhash Nagar, Adilabad",
    profilePhoto:
      currentUser?.selfieUrl ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    lastModifiedTimestamp: currentUser?.lastModifiedTimestamp || null
  });
  const [basicEditOtpSent, setBasicEditOtpSent] = useState("");
  const [basicEditOtpInput, setBasicEditOtpInput] = useState("");
  const [newPinInput, setNewPinInput] = useState(accountSecurity?.fastPin || "1990");

  const daysSinceLastEdit = basicProfile.lastModifiedTimestamp
    ? Math.floor((Date.now() - basicProfile.lastModifiedTimestamp) / (1000 * 60 * 60 * 24))
    : 999;
  const canEditBasicThisMonth = daysSinceLastEdit >= 30;

  const handleProfilePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || "");
      setBasicProfile({ ...basicProfile, profilePhoto: url });
      if (setCurrentUser && currentUser) {
        setCurrentUser({ ...currentUser, selfieUrl: url });
      }
      if (onTriggerToast) onTriggerToast("Owner Profile Photo updated!");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3 text-xs">
      {/* 1. OWNER IDENTITY CARD */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-emerald-500/40 space-y-3 shadow">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <label className="relative w-14 h-14 rounded-2xl border-2 border-amber-400 overflow-hidden cursor-pointer shrink-0">
              <img
                src={basicProfile.profilePhoto}
                alt="Owner"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[7px] text-amber-300 text-center font-bold py-0.5">
                PHOTO
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoUpload}
                className="hidden"
              />
            </label>
            <div>
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                  isGuest
                    ? "bg-amber-400 text-slate-950"
                    : "bg-emerald-500/20 border border-emerald-400 text-emerald-300"
                }`}
              >
                {isGuest
                  ? "GUEST SHOPPING MODE"
                  : `VERIFIED ${String(activePortal || "customer").replace(/_/g, " ").toUpperCase()} OWNER`}
              </span>
              <h3 className="text-sm font-black text-white mt-1">
                {isGuest ? "Welcome, Guest Shopper" : basicProfile.fullName}
              </h3>
              <p className="text-[10px] text-slate-400">
                {isGuest
                  ? "Browse freely. Sign in or register when placing an order or switching portals."
                  : `Mobile: +91 ${basicProfile.phone} | Location: ${basicProfile.savedLocation}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBrightTheme(!brightTheme)}
            className="bg-slate-800 border border-slate-700 text-amber-300 px-2.5 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer shrink-0"
          >
            {brightTheme ? "\uD83C\uDF19 Dark" : "\u2600\uFE0F Bright"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onLockApp}
            className="bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
          >
            {isGuest ? "Sign In / Register \u2192" : "Switch Role / KYC Vault"}
          </button>
          {onOpenAdminGate && (
            <button
              type="button"
              onClick={onOpenAdminGate}
              className="bg-slate-800 border border-amber-400/50 text-amber-300 font-black py-2 rounded-xl cursor-pointer"
            >
              \uD83D\uDD10 Founder Admin Login
            </button>
          )}
        </div>

        {/* ONCE-A-MONTH (30-DAY) OTP-LOCKED BASIC PROFILE EDITOR */}
        {!isGuest && (
          <div className="pt-2 border-t border-slate-800">
            {!editingBasicInfo ? (
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400">
                  {canEditBasicThisMonth
                    ? "Monthly Basic Info Edit Available (OTP Required)"
                    : `Locked for ${30 - daysSinceLastEdit} more days (Once-a-Month Rule)`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!canEditBasicThisMonth) {
                      alert(
                        `Basic profile info can only be altered once every 30 days. Please wait ${
                          30 - daysSinceLastEdit
                        } more days.`
                      );
                      return;
                    }
                    setEditingBasicInfo(true);
                  }}
                  className="bg-slate-800 text-amber-300 border border-amber-400/40 px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
                >
                  Edit Basic Info (OTP)
                </button>
              </div>
            ) : (
              <div className="bg-slate-950 p-3 rounded-xl border border-amber-400/50 space-y-2">
                <p className="text-[10px] font-bold text-amber-300">
                  Alter Basic Profile Info (Once-a-Month with 4-Digit OTP Verification)
                </p>
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
                  placeholder="10-Digit Mobile Number"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                />
                <input
                  type="text"
                  value={basicProfile.savedLocation}
                  onChange={(e) =>
                    setBasicProfile({ ...basicProfile, savedLocation: e.target.value })
                  }
                  placeholder="Primary Saved Location"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                />
                {!basicEditOtpSent ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const code = String(Math.floor(1000 + Math.random() * 9000));
                        setBasicEditOtpSent(code);
                        setBasicEditOtpInput(code);
                        if (onTriggerToast) onTriggerToast(`Profile Modification OTP Sent: ${code}`);
                      }}
                      className="flex-1 bg-amber-400 text-slate-950 font-black py-1.5 rounded-lg cursor-pointer"
                    >
                      Send OTP to Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingBasicInfo(false)}
                      className="bg-slate-800 text-slate-300 px-3 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      maxLength={4}
                      value={basicEditOtpInput}
                      onChange={(e) => setBasicEditOtpInput(e.target.value)}
                      className="w-full bg-slate-900 border border-emerald-400 rounded-lg p-1.5 text-center font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (basicEditOtpInput.trim() !== basicEditOtpSent) {
                          alert("Invalid OTP!");
                          return;
                        }
                        const updated = { ...basicProfile, lastModifiedTimestamp: Date.now() };
                        setBasicProfile(updated);
                        if (setCurrentUser && currentUser) {
                          setCurrentUser({
                            ...currentUser,
                            fullName: updated.fullName,
                            phone: updated.phone,
                            lastModifiedTimestamp: updated.lastModifiedTimestamp
                          });
                        }
                        setEditingBasicInfo(false);
                        setBasicEditOtpSent("");
                        if (onTriggerToast)
                          onTriggerToast("Basic Profile Updated & Locked for 30 Days!");
                      }}
                      className="w-full bg-emerald-400 text-slate-950 font-black py-1.5 rounded-lg cursor-pointer"
                    >
                      Verify OTP ({basicEditOtpSent}) &amp; Save
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. ACCOUNT-ONLY IN-APP SILENT OTA UPDATER (REQ 12: NO TOP BANNER, NO EXTERNAL BROWSER) */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-emerald-500/40 space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-black text-emerald-400 text-xs">
              \uD83D\uDCF2 In-App Software Update (Zero Data Loss)
            </h4>
            <p className="text-[10px] text-slate-400">
              Installed: v{appUpdateInfo?.currentVersion || "3.2.0"} | Latest Cloud: v
              {appUpdateInfo?.latestAvailableVersion || "3.2.0"}
            </p>
          </div>
          {onCheckForUpdate && (
            <button
              type="button"
              onClick={onCheckForUpdate}
              className="bg-slate-800 border border-emerald-400/50 text-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer"
            >
              {checkingUpdate ? "Checking..." : "Check Update"}
            </button>
          )}
        </div>
        {otaProgress && (
          <div className="bg-slate-950 p-2 rounded-xl border border-emerald-400 text-[10px] text-emerald-300 font-bold">
            {otaProgress.msg} ({otaProgress.pct}%)
          </div>
        )}
        {onRunOtaUpdate && (
          <button
            type="button"
            onClick={onRunOtaUpdate}
            className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl text-[11px] cursor-pointer shadow"
          >
            Download &amp; Install Latest Update In-App Now (v
            {appUpdateInfo?.latestAvailableVersion || "3.2.0"})
          </button>
        )}
      </div>

      {/* 3. LINKED BANK ACCOUNT & UPI ID MANAGER (MODIFIABLE ANYTIME) */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-black text-emerald-400 text-xs">
              \uD83C\uDFE6 Linked Bank Account &amp; UPI ID (Modify Anytime)
            </h4>
            <p className="text-[10px] text-slate-400">
              Used for instant UPI payments, partner settlements &amp; refunds
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingBank(!editingBank)}
            className="bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer"
          >
            {editingBank ? "Close" : "Modify Anytime"}
          </button>
        </div>

        {!editingBank ? (
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Primary UPI ID:</span>
              <span className="font-mono font-bold text-amber-300">{bankDetails.upiId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Bank Name:</span>
              <span className="font-bold text-white">{bankDetails.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">A/C &amp; IFSC:</span>
              <span className="font-mono text-emerald-300">
                {bankDetails.accountNumber} ({bankDetails.ifscCode})
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40 space-y-2">
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
              placeholder="Bank Name"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={bankDetails.accountNumber}
                onChange={(e) =>
                  setBankDetails({ ...bankDetails, accountNumber: e.target.value })
                }
                placeholder="Account Number"
                className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
              />
              <input
                type="text"
                value={bankDetails.ifscCode}
                onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                placeholder="IFSC Code"
                className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (setCurrentUser && currentUser) {
                  setCurrentUser({ ...currentUser, ...bankDetails });
                }
                setEditingBank(false);
                if (onTriggerToast)
                  onTriggerToast("Bank Account & UPI ID updated immediately!");
              }}
              className="w-full bg-emerald-400 text-slate-950 font-black py-1.5 rounded-lg cursor-pointer"
            >
              Save Bank &amp; UPI Details
            </button>
          </div>
        )}
      </div>

      {/* 4. PIN & BIOMETRIC SECURITY CONTROLS */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <h4 className="font-black text-amber-400 text-xs">
          \uD83D\uDD12 4-Digit Quick PIN &amp; Biometric Login Controls
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              setAccountSecurity({
                ...accountSecurity,
                pinEnabled: !accountSecurity?.pinEnabled
              })
            }
            className={`py-2 rounded-xl font-black text-[10px] cursor-pointer ${
              accountSecurity?.pinEnabled
                ? "bg-emerald-500 text-slate-950"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            PIN Login: {accountSecurity?.pinEnabled ? "ENABLED" : "OFF"}
          </button>
          <button
            type="button"
            onClick={() =>
              setAccountSecurity({
                ...accountSecurity,
                biometricEnabled: !accountSecurity?.biometricEnabled
              })
            }
            className={`py-2 rounded-xl font-black text-[10px] cursor-pointer ${
              accountSecurity?.biometricEnabled
                ? "bg-teal-400 text-slate-950"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            Biometric: {accountSecurity?.biometricEnabled ? "ENABLED" : "OFF"}
          </button>
        </div>
        <div className="flex gap-2 pt-1">
          <input
            type="password"
            maxLength={4}
            value={newPinInput}
            onChange={(e) => setNewPinInput(e.target.value)}
            placeholder="4-Digit PIN"
            className="w-28 bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-center font-mono text-white"
          />
          <button
            type="button"
            onClick={() => {
              setAccountSecurity({ ...accountSecurity, fastPin: newPinInput });
              if (onTriggerToast)
                onTriggerToast(`4-Digit Quick PIN updated to ${newPinInput}!`);
            }}
            className="flex-1 bg-slate-800 border border-amber-400/40 text-amber-300 font-bold rounded-xl text-[10px] cursor-pointer"
          >
            Save 4-Digit PIN
          </button>
        </div>
      </div>

      {/* 5. QUICK PORTAL SWITCHER */}
      <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-800 space-y-2">
        <h4 className="font-black text-amber-400 text-xs">
          Switch Dedicated Module Portal
        </h4>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: "customer", label: "1. Consumer Shopping" },
            { id: "merchant", label: "2. Product Merchant" },
            { id: "service_provider", label: "3. Service Provider" },
            { id: "decorator", label: "4. Decorator & Halls" },
            { id: "rider", label: "5. Delivery Captain" },
            { id: "split", label: "All 5 Phones Side-by-Side" }
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setActivePortal(p.id);
                if (onTriggerToast) onTriggerToast(`Switched to ${p.label}`);
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
        </div>
      </div>
    </div>
  );
}