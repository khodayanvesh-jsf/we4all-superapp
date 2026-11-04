import React, { useState } from "react";

const ROLE_LABELS = {
  customer: "Customer Super-App",
  merchant: "Product Merchant Partner",
  service_provider: "1-Hr Service Provider",
  decorator: "Event Decorator & Function Hall",
  rider: "Delivery Captain",
  labour: "Labour & Mistri Partner"
};

function OriginalOwnerAccountProfile({
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
  brightTheme = true,
  setBrightTheme = () => {},
  onOpenAdminConsole = () => {},
  onTriggerToast = () => {}
}) {
  const [activeSection, setActiveSection] = useState("partner_gate");
  const [partnerMode, setPartnerMode] = useState("login"); // "login" | "register"

  // Partner 2-Step Login State (Step 1: Mobile+PIN -> Step 2: 4-Digit OTP)
  const [loginRole, setLoginRole] = useState("merchant");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginStep, setLoginStep] = useState(1);
  const [generatedLoginOtp, setGeneratedLoginOtp] = useState("");
  const [enteredLoginOtp, setEnteredLoginOtp] = useState("");
  const [pendingLoginPartnerObj, setPendingLoginPartnerObj] = useState(null);

  // Partner KYC Registration State + Mobile OTP Verification
  const [kycForm, setKycForm] = useState({
    role: "merchant",
    fullName: "",
    businessName: "",
    phone: "",
    kycDocNumber: "",
    upiId: "",
    fastPin: ""
  });
  const [kycOtpSent, setKycOtpSent] = useState(false);
  const [generatedKycOtp, setGeneratedKycOtp] = useState("");
  const [enteredKycOtp, setEnteredKycOtp] = useState("");

  const [authError, setAuthError] = useState("");
  const [authInfoBanner, setAuthInfoBanner] = useState("");

  // Profile & Address State
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

  // STEP 1 OF PARTNER LOGIN: Check Credentials & KYC Approval Status, Then Send OTP
  const handleRequestLoginOtp = () => {
    setAuthError("");
    setAuthInfoBanner("");
    const cleanPhone = loginPhone.trim();
    const cleanPin = loginPin.trim();

    if (!cleanPhone || !cleanPin) {
      setAuthError("Enter your registered 10-digit mobile number and 4-digit Secret PIN.");
      return;
    }

    // Founder Master Override (9999999999 / PIN 9999) still verifies OTP
    if (cleanPhone === "9999999999" && cleanPin === "9999") {
      const otpCode = String(Math.floor(1000 + Math.random() * 9000));
      setGeneratedLoginOtp(otpCode);
      setPendingLoginPartnerObj({
        id: "founder_partner",
        fullName: "Founder Verified Partner",
        phone: cleanPhone,
        role: loginRole,
        kycVerified: true,
        kycStatus: "APPROVED"
      });
      setLoginStep(2);
      onTriggerToast(`📲 Login OTP for ${cleanPhone}: ${otpCode}`);
      return;
    }

    const matchedUser = (registeredUsers || []).find(
      (u) => u.role === loginRole && String(u.phone).trim() === cleanPhone
    );

    if (!matchedUser) {
      setAuthError(
        `No ${ROLE_LABELS[loginRole]} account found for +91 ${cleanPhone}. Please submit Partner KYC Registration first.`
      );
      return;
    }

    if (String(matchedUser.fastPin).trim() !== cleanPin) {
      setAuthError("Incorrect 4-Digit Partner PIN.");
      return;
    }

    if (matchedUser.kycStatus === "PENDING_ADMIN_APPROVAL" || !matchedUser.kycVerified) {
      setAuthError(
        `⏳ KYC Pending Founder Admin Approval: Your ${ROLE_LABELS[loginRole]} application (${matchedUser.businessName || matchedUser.fullName}) is awaiting approval in the Founder Admin Console.`
      );
      return;
    }

    if (matchedUser.kycStatus === "REJECTED") {
      setAuthError(
        "❌ Your Partner KYC application was rejected or suspended by the Founder Admin."
      );
      return;
    }

    const otpCode = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedLoginOtp(otpCode);
    setPendingLoginPartnerObj(matchedUser);
    setLoginStep(2);
    onTriggerToast(`📲 Login OTP sent to +91 ${cleanPhone}: ${otpCode}`);
  };

  // STEP 2 OF PARTNER LOGIN: Verify 4-Digit OTP
  const handleVerifyLoginOtp = () => {
    setAuthError("");
    if (enteredLoginOtp.trim() !== generatedLoginOtp) {
      setAuthError("Invalid 4-Digit Login OTP! Please check the OTP code.");
      return;
    }
    if (pendingLoginPartnerObj) {
      onPartnerAuthenticated(loginRole, pendingLoginPartnerObj);
      setLoginStep(1);
      setEnteredLoginOtp("");
      setGeneratedLoginOtp("");
    }
  };

  // STEP 1 OF KYC REGISTRATION: Send Mobile Verification OTP
  const handleSendKycRegistrationOtp = () => {
    setAuthError("");
    setAuthInfoBanner("");
    if (
      !kycForm.fullName.trim() ||
      !kycForm.phone.trim() ||
      !kycForm.kycDocNumber.trim() ||
      !kycForm.upiId.trim() ||
      kycForm.fastPin.trim().length < 4
    ) {
      setAuthError(
        "All KYC fields (Full Name, 10-Digit Mobile, GST/Aadhaar/DL Number, UPI ID, and 4-Digit PIN) are required."
      );
      return;
    }

    const duplicate = (registeredUsers || []).find(
      (u) => u.role === kycForm.role && String(u.phone).trim() === kycForm.phone.trim()
    );
    if (duplicate) {
      setAuthError(
        `Mobile +91 ${kycForm.phone.trim()} is already registered under ${ROLE_LABELS[kycForm.role]} (Status: ${duplicate.kycStatus || "ACTIVE"}).`
      );
      return;
    }

    const otp = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedKycOtp(otp);
    setKycOtpSent(true);
    onTriggerToast(`📲 KYC Verification OTP for +91 ${kycForm.phone}: ${otp}`);
  };

  // STEP 2 OF KYC REGISTRATION: Verify OTP & Queue for Founder Admin Approval
  const handleVerifyOtpAndSubmitKyc = () => {
    setAuthError("");
    if (enteredKycOtp.trim() !== generatedKycOtp) {
      setAuthError("Incorrect 4-Digit KYC Verification OTP!");
      return;
    }

    const newPartnerRecord = {
      id: `prt_${Date.now()}`,
      role: kycForm.role,
      fullName: kycForm.fullName.trim(),
      businessName: kycForm.businessName.trim() || kycForm.fullName.trim(),
      phone: kycForm.phone.trim(),
      kycDocNumber: kycForm.kycDocNumber.trim(),
      upiId: kycForm.upiId.trim(),
      fastPin: kycForm.fastPin.trim(),
      kycVerified: false,
      kycStatus: "PENDING_ADMIN_APPROVAL",
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setRegisteredUsers([newPartnerRecord, ...(registeredUsers || [])]);
    setKycOtpSent(false);
    setEnteredKycOtp("");
    setGeneratedKycOtp("");
    setPartnerMode("login");
    setLoginRole(kycForm.role);
    setLoginPhone(kycForm.phone.trim());
    setAuthInfoBanner(
      `✅ KYC Submitted! Your ${ROLE_LABELS[kycForm.role]} application is now in Status: PENDING_ADMIN_APPROVAL. Once the Founder Admin approves your KYC, you can log in below.`
    );
    onTriggerToast("KYC submitted to Founder Admin Approval Queue!");
  };

  const myPartnerRegistrations = (registeredUsers || []).filter((u) => u.role !== "customer");

  return (
    <div className="space-y-3 text-xs">
      {/* Top User Identity Banner */}
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
              {currentUser?.phone ? `📱 +91 ${currentUser.phone}` : "Customer Account • Adilabad"}
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

      {/* Sub-Navigation Pills */}
      <div className="grid grid-cols-4 gap-1 bg-slate-200 p-1 rounded-xl text-[10px] font-black text-slate-800">
        {[
          { id: "partner_gate", label: "🔐 Partner KYC" },
          { id: "profile", label: "👤 Profile/UPI" },
          { id: "addresses", label: "📍 Addresses" },
          { id: "system", label: "📲 App & Admin" }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`py-1.5 rounded-lg text-center cursor-pointer ${
              activeSection === tab.id ? "bg-emerald-900 text-amber-300 shadow" : "hover:bg-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. PARTNER PORTAL KYC & 2-STEP OTP GATE */}
      {activeSection === "partner_gate" && (
        <div className="bg-white text-slate-900 p-3.5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="font-black text-xs text-emerald-950">
              🔐 Partner Portal Security Gate (Admin KYC + OTP Verified)
            </h3>
            <p className="text-[10px] text-slate-500">
              New KYC registrations require Founder Admin approval. Logins require PIN + 4-Digit OTP.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl text-[10px] font-black">
            <button
              type="button"
              onClick={() => {
                setPartnerMode("login");
                setLoginStep(1);
                setAuthError("");
              }}
              className={`py-1.5 rounded-lg cursor-pointer ${
                partnerMode === "login" ? "bg-slate-900 text-amber-400" : "text-slate-700"
              }`}
            >
              🔑 Partner Login (PIN + OTP)
            </button>
            <button
              type="button"
              onClick={() => {
                setPartnerMode("register");
                setKycOtpSent(false);
                setAuthError("");
              }}
              className={`py-1.5 rounded-lg cursor-pointer ${
                partnerMode === "register" ? "bg-emerald-700 text-white" : "text-slate-700"
              }`}
            >
              📝 New Partner KYC
            </button>
          </div>

          {authInfoBanner && (
            <div className="bg-emerald-50 border border-emerald-500 text-emerald-900 p-2.5 rounded-xl text-[10px] font-bold">
              {authInfoBanner}
            </div>
          )}

          {authError && (
            <div className="bg-rose-50 border border-rose-400 text-rose-800 p-2.5 rounded-xl text-[10px] font-bold">
              {authError}
            </div>
          )}

          {partnerMode === "login" ? (
            <div className="space-y-2">
              {loginStep === 1 ? (
                <>
                  <label className="block text-[10px] font-black text-slate-700">
                    Select Approved Partner Role:
                  </label>
                  <select
                    value={loginRole}
                    onChange={(e) => setLoginRole(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold bg-slate-50"
                  >
                    <option value="merchant">🏪 Product Merchant Portal</option>
                    <option value="service_provider">🛠️ 1-Hr Service Provider Portal</option>
                    <option value="decorator">🎪 Event Decorator & Function Hall Portal</option>
                    <option value="rider">🛵 Delivery Captain Portal</option>
                    <option value="labour">👷 Labour & Mistri Worksite Portal</option>
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
                    onClick={handleRequestLoginOtp}
                    className="w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl cursor-pointer shadow"
                  >
                    Step 1: Verify PIN & Send Login OTP &rarr;
                  </button>
                </>
              ) : (
                <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-emerald-950 text-[11px]">
                      📲 Step 2: Enter 4-Digit Login OTP
                    </span>
                    <button
                      type="button"
                      onClick={() => setEnteredLoginOtp(generatedLoginOtp)}
                      className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black cursor-pointer"
                    >
                      Auto-Fill OTP ({generatedLoginOtp})
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={enteredLoginOtp}
                    onChange={(e) => setEnteredLoginOtp(e.target.value)}
                    placeholder="Enter 4-Digit OTP"
                    className="w-full border border-emerald-600 rounded-xl p-2 text-center text-sm font-black tracking-widest bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleVerifyLoginOtp}
                      className="flex-1 bg-emerald-700 text-white font-black py-2 rounded-xl cursor-pointer"
                    >
                      ✅ Verify OTP & Unlock Portal
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginStep(1)}
                      className="bg-slate-200 text-slate-800 px-3 py-2 rounded-xl font-black cursor-pointer"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-700">
                Select Partner Category for KYC Application:
              </label>
              <select
                value={kycForm.role}
                onChange={(e) => setKycForm({ ...kycForm, role: e.target.value })}
                className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold bg-slate-50"
              >
                <option value="merchant">🏪 Product Merchant Partner</option>
                <option value="service_provider">🛠️ 1-Hr Service Provider</option>
                <option value="decorator">🎪 Event Decorator / Function Hall Owner</option>
                <option value="rider">🛵 Delivery Captain (2W / 3W / 4W)</option>
                <option value="labour">👷 Skilled Labour / Mistri</option>
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
                placeholder="10-Digit Mobile Number"
                className="w-full border border-slate-300 rounded-xl p-2 text-xs font-bold"
              />
              <input
                type="text"
                value={kycForm.kycDocNumber}
                onChange={(e) => setKycForm({ ...kycForm, kycDocNumber: e.target.value })}
                placeholder="KYC Document ID (GSTIN / Aadhaar / Driving License)"
                className="w-full border border-slate-300 rounded-xl p-2 text-xs"
              />
              <input
                type="text"
                value={kycForm.upiId}
                onChange={(e) => setKycForm({ ...kycForm, upiId: e.target.value })}
                placeholder="Settlement UPI ID (e.g., partner@ybl)"
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

              {!kycOtpSent ? (
                <button
                  type="button"
                  onClick={handleSendKycRegistrationOtp}
                  className="w-full bg-slate-900 text-amber-400 font-black py-2.5 rounded-xl cursor-pointer shadow"
                >
                  📲 Send Mobile OTP for KYC Submission &rarr;
                </button>
              ) : (
                <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-900 text-[10px]">
                      Verify Mobile OTP to Submit KYC:
                    </span>
                    <button
                      type="button"
                      onClick={() => setEnteredKycOtp(generatedKycOtp)}
                      className="bg-slate-900 text-amber-300 px-2 py-0.5 rounded text-[9px] font-black cursor-pointer"
                    >
                      Auto-Fill OTP ({generatedKycOtp})
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={enteredKycOtp}
                    onChange={(e) => setEnteredKycOtp(e.target.value)}
                    placeholder="Enter 4-Digit KYC OTP"
                    className="w-full border border-slate-400 rounded-xl p-2 text-center font-black tracking-widest bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyOtpAndSubmitKyc}
                    className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
                  >
                    ✅ Verify OTP & Submit to Founder Admin Queue
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Live KYC Application Status Tracker */}
          {(myPartnerRegistrations || []).length > 0 && (
            <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="font-black text-[10px] text-slate-700">
                  📋 Submitted Partner KYC Status Tracker:
                </p>
                <button
                  type="button"
                  onClick={onOpenAdminConsole}
                  className="text-[9px] font-black text-indigo-700 underline cursor-pointer"
                >
                  Open Founder Admin to Approve &rarr;
                </button>
              </div>
              {myPartnerRegistrations.map((pr) => (
                <div
                  key={pr.id}
                  className="p-2 rounded-xl border border-slate-200 bg-slate-50 flex justify-between items-center"
                >
                  <div>
                    <p className="font-black text-[11px]">{pr.fullName}</p>
                    <p className="text-[9px] text-slate-500">
                      {ROLE_LABELS[pr.role]} • 📱 {pr.phone}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-black ${
                      pr.kycStatus === "APPROVED" || pr.kycVerified
                        ? "bg-emerald-100 text-emerald-800"
                        : pr.kycStatus === "REJECTED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    {pr.kycStatus || "PENDING_ADMIN_APPROVAL"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. PROFILE & UPI SETTLEMENT */}
      {activeSection === "profile" && (
        <div className="bg-white text-slate-900 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm">
          <h3 className="font-black text-xs text-emerald-950">
            👤 Personal Profile & Bank/UPI Vault
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
            placeholder="UPI ID (e.g., name@ybl)"
            className="w-full border border-slate-300 rounded-xl p-2 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              setCurrentUser({ ...currentUser, ...profileForm });
              onTriggerToast("Profile & UPI Settlement Saved!");
            }}
            className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
          >
            Save Profile Details
          </button>
        </div>
      )}

      {/* 3. DELIVERY ADDRESSES */}
      {activeSection === "addresses" && (
        <div className="bg-white text-slate-900 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 shadow-sm">
          <h3 className="font-black text-xs text-emerald-950">📍 Saved Delivery Addresses</h3>
          {(addressBook || []).map((addr) => (
            <div
              key={addr.id}
              className="p-2.5 rounded-xl border border-slate-200 flex justify-between items-center bg-slate-50"
            >
              <div>
                <p className="font-black text-xs">
                  {addr.label} • {addr.distanceKm || 1.8} km
                </p>
                <p className="text-[10px] text-slate-600">{addr.fullAddress}</p>
              </div>
            </div>
          ))}
          <div className="border-t pt-2 space-y-2">
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
                setAddressBook([
                  ...(addressBook || []),
                  {
                    id: `addr_${Date.now()}`,
                    label: newAddrLabel,
                    fullAddress: newAddrText.trim(),
                    distanceKm: 2.0,
                    verified: true
                  }
                ]);
                setNewAddrText("");
                onTriggerToast("Delivery Address Saved!");
              }}
              className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
            >
              + Add Address
            </button>
          </div>
        </div>
      )}

      {/* 4. OTA & FOUNDER ADMIN LAUNCHER */}
      {activeSection === "system" && (
        <div className="bg-white text-slate-900 p-3.5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-xs text-emerald-950">📲 WE4ALL OTA & Admin Gate</h3>
              <p className="text-[10px] text-slate-500">
                Build v{appUpdateInfo?.currentVersion || "3.1.0"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBrightTheme(!brightTheme)}
              className="bg-slate-900 text-amber-300 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
            >
              {brightTheme ? "🌙 Dark Mode" : "☀️ Bright Mode"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCheckForUpdate}
              className="bg-slate-900 text-white font-black py-2 rounded-xl text-[10px] cursor-pointer"
            >
              🔄 Check OTA Update
            </button>
            <button
              type="button"
              onClick={onOpenAdminConsole}
              className="bg-amber-400 text-slate-950 font-black py-2 rounded-xl text-[10px] cursor-pointer"
            >
              🔐 Founder Admin Suite
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function stripUndefinedProps(obj) {
  if (!obj || typeof obj !== "object") return {};
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }
  return clean;
}

export default function OwnerAccountProfile(rawProps = {}) {
  const cleanProps = stripUndefinedProps(rawProps);
  const cleanUser = stripUndefinedProps(rawProps.currentUser);
  const resolvedRole =
    typeof cleanUser.role === "string" && cleanUser.role
      ? cleanUser.role
      : typeof cleanProps.activePortal === "string" && cleanProps.activePortal
      ? cleanProps.activePortal
      : typeof cleanProps.portalRole === "string" && cleanProps.portalRole
      ? cleanProps.portalRole
      : "customer";

  const safeCurrentUser = {
    id: "guest_user",
    fullName: "Guest Consumer Shopper",
    phone: "9848011223",
    role: resolvedRole,
    portal: resolvedRole,
    decoratorSubRole: "flower_decorator",
    vehicleCode: "2W",
    isGuest: !rawProps.currentUser || Boolean(rawProps.currentUser?.isGuest),
    upiId: "khodayanvesh@ybl",
    bankName: "State Bank of India (Adilabad Main)",
    accountNumber: "30984451209",
    ifscCode: "SBIN0000801",
    address: "Subhash Nagar, Adilabad",
    ...cleanUser,
    role: String(cleanUser.role || resolvedRole || "customer"),
    portal: String(cleanUser.portal || resolvedRole || "customer")
  };

  const safeTelemetry = {
    lat: 19.6641,
    lng: 78.5320,
    accuracyMeters: 10,
    speedKmh: 0,
    batteryPct: 100,
    isCharging: true,
    networkType: "5G/WIFI",
    locationSource: "Adilabad Town GPS",
    ...stripUndefinedProps(rawProps.liveTelemetryPing)
  };

  const safeAddress = {
    label: "Home",
    fullAddress: "Subhash Nagar, Adilabad",
    lat: 19.6641,
    lng: 78.5320,
    ...stripUndefinedProps(rawProps.activeAddressObj)
  };

  const safeSecurity = {
    pinEnabled: true,
    biometricEnabled: true,
    fastPin: "1990",
    ...stripUndefinedProps(rawProps.accountSecurity)
  };

  const safeUpdateInfo = {
    currentVersion: "3.1.2",
    latestAvailableVersion: "3.1.2",
    updateAvailable: false,
    releaseNotes: "WE4ALL Official Build",
    ...stripUndefinedProps(rawProps.appUpdateInfo)
  };

  return (
    <OriginalOwnerAccountProfile
      {...cleanProps}
      activePortal={String(cleanProps.activePortal || resolvedRole || "customer")}
      portalRole={String(cleanProps.portalRole || resolvedRole || "customer")}
      userRole={String(cleanProps.userRole || resolvedRole || "customer")}
      role={String(cleanProps.role || resolvedRole || "customer")}
      selectedRegion={String(cleanProps.selectedRegion || "TELANGANA")}
      currentUser={safeCurrentUser}
      liveTelemetryPing={safeTelemetry}
      activeAddressObj={safeAddress}
      accountSecurity={safeSecurity}
      appUpdateInfo={safeUpdateInfo}
    />
  );
}
