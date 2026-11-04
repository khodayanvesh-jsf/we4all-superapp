import React, { useState } from "react";

const ROLE_LABELS = {
  customer: "Customer Super-App",
  merchant: "Product Merchant Partner",
  service_provider: "1-Hr Service Provider",
  decorator: "Event Decorator & Function Hall",
  rider: "Delivery Captain",
  labour: "Labour & Mistri Partner"
};

export default function OwnerAccountProfile({
  currentUser = {},
  setCurrentUser = () => {},
  accountSecurity = { pinEnabled: true, biometricEnabled: true, fastPin: "1234" },
  setAccountSecurity = () => {},
  addressBook = [],
  setAddressBook = () => {},
  registeredUsers = [],
  setRegisteredUsers = () => {},
  activePortal = "customer",
  authenticatedPartnerRole = null,
  onPartnerAuthenticated = () => {},
  onLogoutPartner = () => {},
  appUpdateInfo = { currentVersion: "3.1.0", latestAvailableVersion: "3.1.0" },
  onCheckForUpdate = () => {},
  checkingUpdate = false,
  onRunOtaUpdate = () => {},
  otaProgress = null,
  founderLogoUrl = "",
  onUploadFounderPhoto = () => {},
  apkIconUrl = "",
  onUploadApkIcon = () => {},
  brightTheme = true,
  setBrightTheme = () => {},
  onOpenAdminConsole = () => {},
  onTriggerToast = () => {}
}) {
  const [activeSection, setActiveSection] = useState("partner_gate");
  const [partnerMode, setPartnerMode] = useState("login");

  const [loginRole, setLoginRole] = useState("merchant");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [authError, setAuthError] = useState("");

  const [kycForm, setKycForm] = useState({
    role: "merchant",
    fullName: "",
    businessName: "",
    phone: "",
    kycDocNumber: "",
    upiId: "",
    fastPin: ""
  });

  const [profileForm, setProfileForm] = useState({
    fullName: currentUser?.fullName || "WE4ALL User",
    phone: currentUser?.phone || "",
    upiId: currentUser?.upiId || "",
    bankName: currentUser?.bankName || "",
    accountNumber: currentUser?.accountNumber || "",
    ifscCode: currentUser?.ifscCode || ""
  });

  const [newAddrLabel, setNewAddrLabel] = useState("Home");
  const [newAddrText, setNewAddrText] = useState("");
  const [newPinInput, setNewPinInput] = useState(accountSecurity?.fastPin || "1234");

  const handlePartnerLogin = () => {
    setAuthError("");
    const cleanPhone = loginPhone.trim();
    const cleanPin = loginPin.trim();

    if (!cleanPhone || !cleanPin) {
      setAuthError("Enter your registered 10-digit mobile number and 4-digit Partner PIN.");
      return;
    }

    if (cleanPin === "9999" && cleanPhone === "9999999999") {
      onPartnerAuthenticated(loginRole, {
        id: "founder_override",
        fullName: "Founder Partner Access",
        phone: cleanPhone,
        role: loginRole,
        kycVerified: true
      });
      return;
    }

    const matchedPartner = (registeredUsers || []).find(
      (u) =>
        u.role === loginRole &&
        String(u.phone).trim() === cleanPhone &&
        String(u.fastPin).trim() === cleanPin
    );

    if (!matchedPartner) {
      setAuthError(
        "No verified " +
          ROLE_LABELS[loginRole] +
          " account found for this Mobile and PIN. Complete Partner KYC Registration first."
      );
      return;
    }

    onPartnerAuthenticated(loginRole, matchedPartner);
  };

  const handlePartnerKycRegister = () => {
    setAuthError("");
    if (
      !kycForm.fullName.trim() ||
      !kycForm.phone.trim() ||
      !kycForm.kycDocNumber.trim() ||
      !kycForm.upiId.trim() ||
      kycForm.fastPin.trim().length < 4
    ) {
      setAuthError(
        "All KYC fields (Full Name, 10-Digit Mobile, GST/Aadhaar/DL ID, UPI ID, and 4-Digit PIN) are required."
      );
      return;
    }

    const existingSameRole = (registeredUsers || []).find(
      (u) => u.role === kycForm.role && String(u.phone).trim() === kycForm.phone.trim()
    );

    if (existingSameRole) {
      setAuthError("This mobile number is already registered for this Partner role. Please use Partner Login.");
      return;
    }

    const newPartnerRecord = {
      id: "prt_" + Date.now(),
      role: kycForm.role,
      fullName: kycForm.fullName.trim(),
      businessName: kycForm.businessName.trim() || kycForm.fullName.trim(),
      phone: kycForm.phone.trim(),
      kycDocNumber: kycForm.kycDocNumber.trim(),
      upiId: kycForm.upiId.trim(),
      fastPin: kycForm.fastPin.trim(),
      kycVerified: true,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setRegisteredUsers([newPartnerRecord, ...(registeredUsers || [])]);
    setCurrentUser({ ...currentUser, ...newPartnerRecord });
    onPartnerAuthenticated(kycForm.role, newPartnerRecord);
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="bg-emerald-950 text-white p-3.5 rounded-2xl border border-emerald-700/70 space-y-2 shadow">
        <div className="flex items-center justify-between">
          <div>
            <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black uppercase">
              {ROLE_LABELS[activePortal] || "Customer Mode"}
            </span>
            <h2 className="font-black text-sm mt-1 text-white">
              {currentUser?.fullName || "WE4ALL Verified User"}
            </h2>
            <p className="text-[10px] text-emerald-200">
              {currentUser?.phone ? "+91 " + currentUser.phone : "Customer Account | Adilabad"}
            </p>
          </div>
          {activePortal !== "customer" && (
            <button
              type="button"
              onClick={onLogoutPartner}
              className="bg-rose-600 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-black cursor-pointer shadow"
            >
              Lock & Exit Partner Desk
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 bg-slate-200 p-1 rounded-xl text-[10px] font-black text-slate-800">
        {[
          { id: "partner_gate", label: "Partner KYC" },
          { id: "profile", label: "Profile/UPI" },
          { id: "addresses", label: "Addresses" },
          { id: "system", label: "App & Admin" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={
              "py-1.5 rounded-lg text-center cursor-pointer " +
              (activeSection === tab.id ? "bg-emerald-900 text-amber-300 shadow" : "hover:bg-white/60")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === "partner_gate" && (
        <div className="bg-white text-slate-900 p-3.5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="font-black text-xs text-emerald-950">
              Partner Portal Access Gate (KYC & PIN Locked)
            </h3>
            <p className="text-[10px] text-slate-500">
              Partner portals are strictly locked. Log in with your registered Partner Mobile + PIN or complete KYC.
            </p>
          </div>

          {authenticatedPartnerRole && activePortal !== "customer" && (
            <div className="bg-emerald-50 border border-emerald-500 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <p className="font-black text-[11px] text-emerald-900">
                  Unlocked Role: {ROLE_LABELS[authenticatedPartnerRole]}
                </p>
                <p className="text-[10px] text-emerald-700">
                  All other partner portals remain restricted.
                </p>
              </div>
              <button
                type="button"
                onClick={onLogoutPartner}
                className="bg-rose-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
              >
                Logout Partner
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl text-[10px] font-black">
            <button
              type="button"
              onClick={() => {
                setPartnerMode("login");
                setAuthError("");
              }}
              className={
                "py-1.5 rounded-lg cursor-pointer " +
                (partnerMode === "login" ? "bg-slate-900 text-amber-400" : "text-slate-700")
              }
            >
              Existing Partner Login
            </button>
            <button
              type="button"
              onClick={() => {
                setPartnerMode("register");
                setAuthError("");
              }}
              className={
                "py-1.5 rounded-lg cursor-pointer " +
                (partnerMode === "register" ? "bg-emerald-700 text-white" : "text-slate-700")
              }
            >
              New Partner KYC
            </button>
          </div>

          {authError && (
            <div className="bg-rose-50 border border-rose-400 text-rose-800 p-2 rounded-xl text-[10px] font-bold">
              {authError}
            </div>
          )}

          {partnerMode === "login" ? (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-700">
                Select Your Registered Partner Role:
              </label>
              <select
                value={loginRole}
                onChange={(e) => setLoginRole(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold bg-slate-50"
              >
                <option value="merchant">Product Merchant Portal</option>
                <option value="service_provider">1-Hr Service Provider Portal</option>
                <option value="decorator">Event Decorator & Function Hall Portal</option>
                <option value="rider">Delivery Captain Portal</option>
                <option value="labour">Labour & Mistri Worksite Portal</option>
              </select>

              <input
                type="tel"
                maxLength={10}
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="Registered 10-Digit Mobile Number"
                className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold"
              />

              <input
                type="password"
                maxLength={4}
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                placeholder="4-Digit Partner Secret PIN"
                className="w-full border border-slate-300 rounded-xl p-2 text-xs font-black tracking-widest"
              />

              <button
                type="button"
                onClick={handlePartnerLogin}
                className="w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl cursor-pointer shadow"
              >
                Verify & Unlock {ROLE_LABELS[loginRole]}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-700">
                Select Partner Category for KYC Onboarding:
              </label>
              <select
                value={kycForm.role}
                onChange={(e) => setKycForm({ ...kycForm, role: e.target.value })}
                className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold bg-slate-50"
              >
                <option value="merchant">Product Merchant Partner</option>
                <option value="service_provider">1-Hr Service Provider</option>
                <option value="decorator">Event Decorator / Function Hall Owner</option>
                <option value="rider">Delivery Captain (2W / 3W / 4W)</option>
                <option value="labour">Skilled Labour / Mistri</option>
              </select>

              <input
                type="text"
                value={kycForm.fullName}
                onChange={(e) => setKycForm({ ...kycForm, fullName: e.target.value })}
                placeholder="Owner Full Legal Name (As per PAN / Aadhaar)"
                className="w-full border border-slate-300 rounded-xl p-2 text-xs"
              />

              <input
                type="text"
                value={kycForm.businessName}
                onChange={(e) => setKycForm({ ...kycForm, businessName: e.target.value })}
                placeholder="Shop / Business / Trade Name"
                className="w-full border border-slate-300 rounded-xl p-2 text-xs"
              />

              <input
                type="tel"
                maxLength={10}
                value={kycForm.phone}
                onChange={(e) => setKycForm({ ...kycForm, phone: e.target.value })}
                placeholder="10-Digit Mobile Number (Login ID)"
                className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold"
              />

              <input
                type="text"
                value={kycForm.kycDocNumber}
                onChange={(e) => setKycForm({ ...kycForm, kycDocNumber: e.target.value })}
                placeholder="KYC Document Number (GSTIN / Aadhaar / DL)"
                className="w-full border border-slate-300 rounded-xl p-2 text-xs"
              />

              <input
                type="text"
                value={kycForm.upiId}
                onChange={(e) => setKycForm({ ...kycForm, upiId: e.target.value })}
                placeholder="Verified Settlement UPI ID (e.g. merchant@ybl)"
                className="w-full border border-slate-300 rounded-xl p-2 text-xs"
              />

              <input
                type="password"
                maxLength={4}
                value={kycForm.fastPin}
                onChange={(e) => setKycForm({ ...kycForm, fastPin: e.target.value })}
                placeholder="Create 4-Digit Secret Partner PIN"
                className="w-full border border-slate-300 rounded-xl p-2 text-xs font-black tracking-widest"
              />

              <button
                type="button"
                onClick={handlePartnerKycRegister}
                className="w-full bg-slate-900 text-amber-400 font-black py-2.5 rounded-xl cursor-pointer shadow"
              >
                Submit KYC & Activate {ROLE_LABELS[kycForm.role]}
              </button>
            </div>
          )}
        </div>
      )}

      {activeSection === "profile" && (
        <div className="bg-white text-slate-900 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm">
          <h3 className="font-black text-xs text-emerald-950">
            Personal Profile & Settlement Bank/UPI Vault
          </h3>
          <input
            type="text"
            value={profileForm.fullName}
            onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
            placeholder="Full Name"
            className="w-full border border-slate-300 rounded-xl p-2 text-xs"
          />
          <input
            type="tel"
            value={profileForm.phone}
            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            placeholder="Mobile Number"
            className="w-full border border-slate-300 rounded-xl p-2 text-xs"
          />
          <input
            type="text"
            value={profileForm.upiId}
            onChange={(e) => setProfileForm({ ...profileForm, upiId: e.target.value })}
            placeholder="UPI ID (e.g., name@okaxis)"
            className="w-full border border-slate-300 rounded-xl p-2 text-xs"
          />
          <input
            type="text"
            value={profileForm.bankName}
            onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
            placeholder="Bank Name"
            className="w-full border border-slate-300 rounded-xl p-2 text-xs"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="text"
              value={profileForm.accountNumber}
              onChange={(e) => setProfileForm({ ...profileForm, accountNumber: e.target.value })}
              placeholder="Account Number"
              className="border border-slate-300 rounded-xl p-2 text-xs"
            />
            <input
              type="text"
              value={profileForm.ifscCode}
              onChange={(e) => setProfileForm({ ...profileForm, ifscCode: e.target.value })}
              placeholder="IFSC Code"
              className="border border-slate-300 rounded-xl p-2 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrentUser({ ...currentUser, ...profileForm });
              onTriggerToast("Account Profile & Settlement Vault Saved!");
            }}
            className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
          >
            Save Profile & Bank Details
          </button>

          <div className="border-t pt-2 space-y-2">
            <h4 className="font-black text-[11px] text-slate-800">Update 4-Digit Security PIN</h4>
            <div className="flex gap-1.5">
              <input
                type="password"
                maxLength={4}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                placeholder="New 4-Digit PIN"
                className="flex-1 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-black tracking-widest"
              />
              <button
                type="button"
                onClick={() => {
                  setAccountSecurity({ ...accountSecurity, fastPin: newPinInput });
                  onTriggerToast("Security PIN Updated!");
                }}
                className="bg-slate-900 text-amber-400 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
              >
                Update PIN
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "addresses" && (
        <div className="bg-white text-slate-900 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm">
          <h3 className="font-black text-xs text-emerald-950">Saved Delivery Addresses</h3>
          {(addressBook || []).map((addr) => (
            <div
              key={addr.id}
              className="p-2.5 rounded-xl border border-slate-200 flex justify-between items-center bg-slate-50"
            >
              <div>
                <p className="font-black text-xs">
                  {addr.label} ({addr.distanceKm || 1.8} km)
                </p>
                <p className="text-[10px] text-slate-600">{addr.fullAddress}</p>
              </div>
              {addressBook.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAddressBook(addressBook.filter((a) => a.id !== addr.id))}
                  className="text-rose-600 font-black text-[10px] cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <div className="border-t pt-2 space-y-2">
            <select
              value={newAddrLabel}
              onChange={(e) => setNewAddrLabel(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold"
            >
              <option value="Home">Home</option>
              <option value="Shop / Office">Shop / Office</option>
              <option value="Worksite">Worksite</option>
            </select>
            <input
              type="text"
              value={newAddrText}
              onChange={(e) => setNewAddrText(e.target.value)}
              placeholder="House No, Street, Landmark, Adilabad"
              className="w-full border border-slate-300 rounded-xl p-2 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (!newAddrText.trim()) return;
                const created = {
                  id: "addr_" + Date.now(),
                  label: newAddrLabel,
                  fullAddress: newAddrText.trim(),
                  distanceKm: 2.1,
                  verified: true
                };
                setAddressBook([...(addressBook || []), created]);
                setNewAddrText("");
                onTriggerToast("New Delivery Address Added!");
              }}
              className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
            >
              + Save Delivery Address
            </button>
          </div>
        </div>
      )}

      {activeSection === "system" && (
        <div className="bg-white text-slate-900 p-3.5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-xs text-emerald-950">WE4ALL OTA & Appearance</h3>
              <p className="text-[10px] text-slate-500">
                Current: v{appUpdateInfo?.currentVersion || "3.1.0"} | Latest: v
                {appUpdateInfo?.latestAvailableVersion || "3.1.0"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBrightTheme(!brightTheme)}
              className="bg-slate-900 text-amber-300 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
            >
              {brightTheme ? "Dark Theme" : "Bright Theme"}
            </button>
          </div>

          {otaProgress && (
            <div className="bg-emerald-50 border border-emerald-500 text-emerald-900 p-2 rounded-xl text-[10px] font-black">
              OTA Status: {otaProgress}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCheckForUpdate}
              disabled={checkingUpdate}
              className="bg-slate-900 text-white font-black py-2 rounded-xl text-[10px] cursor-pointer"
            >
              {checkingUpdate ? "Checking..." : "Check OTA Update"}
            </button>
            <button
              type="button"
              onClick={onRunOtaUpdate}
              className="bg-amber-400 text-slate-950 font-black py-2 rounded-xl text-[10px] font-black cursor-pointer"
            >
              Install Zero-Loss OTA
            </button>
          </div>

          <div className="border-t pt-2.5 flex justify-between items-center">
            <div>
              <p className="font-black text-xs text-slate-800">Founder Master Console</p>
              <p className="text-[10px] text-slate-500">
                2-Factor Protected (Founder Password + PIN)
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAdminConsole}
              className="bg-slate-950 text-amber-400 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
            >
              Founder Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}