import React, { useState, useEffect } from "react";
import {
  loadCloudAndLocalState,
  saveCloudAndLocalState,
  performZeroLossOtaUpdate,
  getFounderCredentials
} from "../supabaseClient";

const ROLE_OPTIONS = [
  {
    id: "customer",
    label: "\uD83D\uDED2 Consumer / Customer Account (Instant Activation)",
    isConsumer: true,
    defaultCategory: "consumer_shopping"
  },
  {
    id: "merchant",
    label: "\uD83C\uDFEA Product Merchant Partner (Kirana / Wholesale / Medical / Hardware)",
    isConsumer: false,
    defaultCategory: "daily_needs"
  },
  {
    id: "service_provider",
    label: "\uD83D\uDD27 Home Service Provider (Plumber / Electrician / AC / Carpenter)",
    isConsumer: false,
    defaultCategory: "srv_plumbing"
  },
  {
    id: "decorator",
    label: "\uD83C\uDF3A Event Decorator & Function Hall Partner",
    isConsumer: false,
    defaultCategory: "decor"
  },
  {
    id: "rider",
    label: "\uD83D\uDEF5 Delivery Captain & Bike/Auto Taxi Partner",
    isConsumer: false,
    defaultCategory: "taxi"
  }
];

export default function OwnerAccountProfile(rawProps = {}) {
  const {
    currentUser,
    setCurrentUser,
    activePortal = "customer",
    setActivePortal,
    onSelectRole,
    registeredUsers = [],
    setRegisteredUsers,
    pendingMerchants = [],
    setPendingMerchants,
    pendingServiceProviders = [],
    setPendingServiceProviders,
    pendingDecorators = [],
    setPendingDecorators,
    pendingRiders = [],
    setPendingRiders,
    savedAddresses = [],
    setSavedAddresses,
    activeAddressId,
    setActiveAddressId,
    activeAddressObj,
    liveTelemetryPing,
    accountSecurity = {},
    setAccountSecurity,
    appUpdateInfo = {},
    setAppUpdateInfo,
    onOpenAdminGate,
    onEnterFounderAdmin,
    onTriggerToast = () => {}
  } = rawProps;

  const [subTab, setSubTab] = useState("kyc_gate"); // kyc_gate | profile_upi | addresses | app_admin
  const [authMode, setAuthMode] = useState("register"); // register | login
  const [selectedRoleKey, setSelectedRoleKey] = useState("customer");
  const [showPinText, setShowPinText] = useState(false);

  const [regForm, setRegForm] = useState({
    fullName: "",
    businessName: "",
    phone: "",
    kycIdNumber: "",
    upiId: "",
    pin: "",
    area: "Subhash Nagar, Adilabad",
    vehicleType: "2W",
    visitingFee: "99",
    kycDocName: ""
  });

  const [formFeedback, setFormFeedback] = useState({
    type: "", // error | success | info
    message: ""
  });

  const [otpState, setOtpState] = useState({
    sent: false,
    generatedOtp: "",
    enteredOtp: "",
    verified: false
  });

  const [profileForm, setProfileForm] = useState({
    fullName: currentUser?.fullName || currentUser?.name || "Consumer Shopper",
    phone: currentUser?.phone || "9848011223",
    upiId: currentUser?.upiId || "khodayanvesh@ybl",
    bankName: currentUser?.bankName || "State Bank of India (Adilabad Main)",
    accountNumber: currentUser?.accountNumber || "30984451209",
    ifscCode: currentUser?.ifscCode || "SBIN0000801"
  });

  const [newAddrForm, setNewAddrForm] = useState({
    label: "Home",
    fullAddress: "",
    landmark: ""
  });

  const [adminGateForm, setAdminGateForm] = useState({
    username: "",
    password: "",
    pin: ""
  });
  const [adminGateMsg, setAdminGateMsg] = useState("");
  const [otaProgress, setOtaProgress] = useState(null);

  useEffect(() => {
    if (currentUser && !currentUser.isGuest) {
      setProfileForm((prev) => ({
        ...prev,
        fullName: currentUser.fullName || currentUser.name || prev.fullName,
        phone: currentUser.phone || prev.phone,
        upiId: currentUser.upiId || prev.upiId,
        bankName: currentUser.bankName || prev.bankName,
        accountNumber: currentUser.accountNumber || prev.accountNumber,
        ifscCode: currentUser.ifscCode || prev.ifscCode
      }));
    }
  }, [currentUser]);

  const currentRoleMeta =
    ROLE_OPTIONS.find((r) => r.id === selectedRoleKey) || ROLE_OPTIONS[0];
  const isConsumerSelected = Boolean(currentRoleMeta.isConsumer);

  const cleanPhoneDigits = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) {
      return digits.slice(2);
    }
    return digits.slice(0, 10);
  };

  const cleanPinDigits = (raw) => String(raw || "").replace(/\D/g, "").slice(0, 4);

  const normalizeUpiId = (rawUpi, fallbackPhone) => {
    const trimmed = String(rawUpi || "").trim();
    if (!trimmed) return `${fallbackPhone || "user"}@ybl`;
    if (!trimmed.includes("@")) return `${trimmed}@ybl`;
    return trimmed;
  };

  // Detailed, helpful validation that tells the user the EXACT field if anything is missing
  const validateBeforeOtp = () => {
    const phoneDigits = cleanPhoneDigits(regForm.phone);
    const pinDigits = cleanPinDigits(regForm.pin);

    if (authMode === "login") {
      if (phoneDigits.length !== 10) {
        return {
          ok: false,
          msg: `Mobile Number currently has ${phoneDigits.length} digits. Please enter a 10-digit mobile number.`
        };
      }
      if (pinDigits.length !== 4) {
        return {
          ok: false,
          msg: `Security PIN currently has ${pinDigits.length} digits. Please enter all 4 digits of your PIN.`
        };
      }
      return { ok: true };
    }

    // Registration validation
    if (!regForm.fullName.trim() || regForm.fullName.trim().length < 2) {
      return {
        ok: false,
        msg: "Please enter your Full Name (at least 2 characters)."
      };
    }
    if (phoneDigits.length !== 10) {
      return {
        ok: false,
        msg: `10-Digit Mobile Number has ${phoneDigits.length} digits. Please enter a valid 10-digit number.`
      };
    }
    if (!isConsumerSelected) {
      if (!regForm.kycIdNumber.trim() && !regForm.businessName.trim()) {
        return {
          ok: false,
          msg: "For Partner KYC, please enter your Shop/Business Name or Trade/License/DL ID."
        };
      }
    }
    if (pinDigits.length !== 4) {
      return {
        ok: false,
        msg: `4-Digit PIN currently has ${pinDigits.length} digits (${
          pinDigits.length === 3 ? "1 more digit needed" : "must be 4 digits"
        }). Tap 'Show PIN' to verify.`
      };
    }
    return { ok: true };
  };

  const handleSendOtpClick = () => {
    const check = validateBeforeOtp();
    if (!check.ok) {
      setFormFeedback({ type: "error", message: check.msg });
      onTriggerToast(check.msg);
      return;
    }

    const generated = String(Math.floor(1000 + Math.random() * 9000));
    setOtpState({
      sent: true,
      generatedOtp: generated,
      enteredOtp: generated, // Auto-filled so user can verify immediately in 1 click
      verified: false
    });
    const phoneDigits = cleanPhoneDigits(regForm.phone);
    const successText = `OTP ${generated} sent to +91 ${phoneDigits} (Auto-filled below — tap Verify to finish!)`;
    setFormFeedback({ type: "info", message: successText });
    onTriggerToast(successText);
  };

  const handleCompleteVerification = () => {
    if (!otpState.sent) {
      handleSendOtpClick();
      return;
    }
    if (
      otpState.enteredOtp.trim() !== otpState.generatedOtp &&
      otpState.enteredOtp.trim() !== "1234"
    ) {
      const msg = `Invalid OTP. Please enter ${otpState.generatedOtp} (or 1234).`;
      setFormFeedback({ type: "error", message: msg });
      onTriggerToast(msg);
      return;
    }

    const phoneDigits = cleanPhoneDigits(regForm.phone);
    const pinDigits = cleanPinDigits(regForm.pin);
    const finalUpi = normalizeUpiId(regForm.upiId, phoneDigits);
    const cloudSnap = loadCloudAndLocalState() || {};
    const existingUsers = Array.isArray(cloudSnap.registeredUsers)
      ? cloudSnap.registeredUsers
      : Array.isArray(registeredUsers)
      ? registeredUsers
      : [];

    // LOGIN FLOW
    if (authMode === "login") {
      const matchedUser = existingUsers.find(
        (u) => cleanPhoneDigits(u?.phone) === phoneDigits
      );
      const loggedInUser = matchedUser || {
        id: `usr_${phoneDigits}`,
        fullName: regForm.fullName.trim() || `Verified ${currentRoleMeta.id.toUpperCase()}`,
        name: regForm.fullName.trim() || `Verified ${currentRoleMeta.id.toUpperCase()}`,
        phone: phoneDigits,
        role: selectedRoleKey,
        portal: selectedRoleKey,
        upiId: finalUpi,
        pin: pinDigits,
        area: regForm.area || "Subhash Nagar, Adilabad",
        isGuest: false,
        status: "Approved",
        loggedInAt: new Date().toLocaleString()
      };

      if (setCurrentUser) setCurrentUser(loggedInUser);
      if (setActivePortal) setActivePortal(loggedInUser.role || selectedRoleKey);
      if (onSelectRole) onSelectRole(loggedInUser.role || selectedRoleKey);

      try {
        localStorage.setItem("we4all_device_bound_user_v5", JSON.stringify(loggedInUser));
      } catch (e) {}

      saveCloudAndLocalState({
        currentUser: loggedInUser,
        registeredUsers: matchedUser ? existingUsers : [loggedInUser, ...existingUsers]
      });

      const msg = `\u2713 Logged in as ${loggedInUser.fullName} (${String(
        loggedInUser.role || selectedRoleKey
      ).toUpperCase()})!`;
      setFormFeedback({ type: "success", message: msg });
      onTriggerToast(msg);
      return;
    }

    // REGISTRATION FLOW (CONSUMER OR PARTNER KYC)
    const newRecordId = `${selectedRoleKey}_${Date.now()}`;
    const displayFullName = regForm.fullName.trim();
    const displayBizName =
      regForm.businessName.trim() ||
      (isConsumerSelected ? displayFullName : `${displayFullName} (${currentRoleMeta.id})`);

    const userRecord = {
      id: newRecordId,
      fullName: displayFullName,
      name: isConsumerSelected ? displayFullName : displayBizName,
      businessName: displayBizName,
      providerName: displayBizName,
      captainName: displayFullName,
      owner: displayFullName,
      phone: phoneDigits,
      role: selectedRoleKey,
      portal: selectedRoleKey,
      upiId: finalUpi,
      kycIdNumber: regForm.kycIdNumber.trim() || "VERIFIED-LOCAL-ID",
      pin: pinDigits,
      area: regForm.area || "Subhash Nagar, Adilabad",
      address: regForm.area || "Subhash Nagar, Adilabad",
      isGuest: false,
      status: isConsumerSelected ? "Approved" : "Pending Admin Approval",
      isPublished: isConsumerSelected,
      createdAt: new Date().toLocaleString()
    };

    const nextUsers = [
      userRecord,
      ...existingUsers.filter((u) => cleanPhoneDigits(u?.phone) !== phoneDigits)
    ];
    if (setRegisteredUsers) setRegisteredUsers(nextUsers);
    if (setCurrentUser) setCurrentUser(userRecord);

    try {
      localStorage.setItem("we4all_device_bound_user_v5", JSON.stringify(userRecord));
    } catch (e) {}

    const statePatch = {
      currentUser: userRecord,
      registeredUsers: nextUsers
    };

    if (!isConsumerSelected) {
      if (selectedRoleKey === "merchant") {
        const basePending = Array.isArray(cloudSnap.pendingMerchants)
          ? cloudSnap.pendingMerchants
          : pendingMerchants;
        const nextPending = [
          {
            ...userRecord,
            categoryId: "daily_needs"
          },
          ...basePending
        ];
        if (setPendingMerchants) setPendingMerchants(nextPending);
        statePatch.pendingMerchants = nextPending;
      } else if (selectedRoleKey === "service_provider") {
        const basePending = Array.isArray(cloudSnap.pendingServiceProviders)
          ? cloudSnap.pendingServiceProviders
          : pendingServiceProviders;
        const nextPending = [
          {
            ...userRecord,
            serviceCategoryId: "srv_plumbing",
            visitingFee: Number(regForm.visitingFee) || 99
          },
          ...basePending
        ];
        if (setPendingServiceProviders) setPendingServiceProviders(nextPending);
        statePatch.pendingServiceProviders = nextPending;
      } else if (selectedRoleKey === "decorator") {
        const basePending = Array.isArray(cloudSnap.pendingDecorators)
          ? cloudSnap.pendingDecorators
          : pendingDecorators;
        const nextPending = [
          {
            ...userRecord,
            decoratorSubRole: "flower_decorator"
          },
          ...basePending
        ];
        if (setPendingDecorators) setPendingDecorators(nextPending);
        statePatch.pendingDecorators = nextPending;
      } else if (selectedRoleKey === "rider") {
        const basePending = Array.isArray(cloudSnap.pendingRiders)
          ? cloudSnap.pendingRiders
          : pendingRiders;
        const nextPending = [
          {
            ...userRecord,
            vehicleType: regForm.vehicleType || "2W",
            baseRate: 25,
            perKm: 6
          },
          ...basePending
        ];
        if (setPendingRiders) setPendingRiders(nextPending);
        statePatch.pendingRiders = nextPending;
      }
    }

    saveCloudAndLocalState(statePatch);
    setOtpState({ sent: false, generatedOtp: "", enteredOtp: "", verified: true });

    const doneMsg = isConsumerSelected
      ? `\u2713 Consumer Account "${displayFullName}" Activated & Synced Live!`
      : `\u2713 Partner KYC Submitted for "${displayBizName}"! Sent to Founder Admin Approval Queue & Synced Live!`;

    setFormFeedback({ type: "success", message: doneMsg });
    onTriggerToast(doneMsg);
  };

  const phoneDigitsCount = cleanPhoneDigits(regForm.phone).length;
  const pinDigitsCount = cleanPinDigits(regForm.pin).length;

  return (
    <div className="space-y-4 pb-8 text-xs font-sans">
      {/* Top Active Identity Summary Banner */}
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 flex flex-wrap justify-between items-center gap-2">
        <div>
          <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded uppercase">
            {currentUser?.isGuest
              ? "Guest Consumer Session"
              : `Verified ${String(currentUser?.role || activePortal || "customer").toUpperCase()}`}
          </span>
          <h3 className="text-sm font-black text-white mt-1">
            {currentUser?.fullName || currentUser?.name || "Consumer Shopper"}
          </h3>
          <p className="text-[10px] text-slate-400">
            Mobile: +91 {currentUser?.phone || "9848011223"} &bull; UPI:{" "}
            <span className="text-emerald-300">{currentUser?.upiId || "khodayanvesh@ybl"}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-amber-300 font-bold">
            GPS: {Number(liveTelemetryPing?.lat || 19.6641).toFixed(4)},{" "}
            {Number(liveTelemetryPing?.lng || 78.532).toFixed(4)}
          </p>
          <p className="text-[9px] text-slate-400">
            {activeAddressObj?.fullAddress || "Subhash Nagar, Adilabad"}
          </p>
        </div>
      </div>

      {/* 4 Sub-Tab Navigation Pills */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        {[
          { id: "kyc_gate", label: "\uD83D\uDEE1\uFE0F Register / KYC" },
          { id: "profile_upi", label: "\uD83D\uDC64 Profile/UPI" },
          { id: "addresses", label: "\uD83D\uDCCD Addresses" },
          { id: "app_admin", label: "\u2699\uFE0F App & Admin" }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`py-2 px-2 rounded-xl font-black text-[11px] cursor-pointer transition ${
              subTab === t.id
                ? "bg-amber-400 text-slate-950 shadow"
                : "bg-slate-950 text-slate-300 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* =======================================================================
          SUB-TAB 1: CONSUMER & PARTNER REGISTRATION / LOGIN / KYC GATE
      ======================================================================= */}
      {subTab === "kyc_gate" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-xl">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>\uD83D\uDEE1\uFE0F</span>
                <span>Consumer &amp; Partner Registration Gate (OTP Verified)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Register as a Consumer for instant shopping or submit Partner KYC for Founder Admin approval.
              </p>
            </div>
          </div>

          {/* Mode Switcher: Login vs New Registration (Consumer + Partner) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setFormFeedback({ type: "", message: "" });
              }}
              className={`py-2.5 px-3 rounded-xl font-black text-xs cursor-pointer border ${
                authMode === "login"
                  ? "bg-emerald-500 text-slate-950 border-emerald-300 shadow"
                  : "bg-slate-950 text-slate-300 border-slate-800"
              }`}
            >
              \uD83D\uDD11 Login (PIN + OTP)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setFormFeedback({ type: "", message: "" });
              }}
              className={`py-2.5 px-3 rounded-xl font-black text-xs cursor-pointer border ${
                authMode === "register"
                  ? "bg-emerald-500 text-slate-950 border-emerald-300 shadow"
                  : "bg-slate-950 text-slate-300 border-slate-800"
              }`}
            >
              \uD83D\uDCDD New Consumer / Partner Registration
            </button>
          </div>

          {/* Dynamic Feedback Banner (Specific Field Guidance or Success/OTP Notice) */}
          {formFeedback.message && (
            <div
              className={`p-3 rounded-2xl border font-bold text-xs ${
                formFeedback.type === "error"
                  ? "bg-rose-950/70 border-rose-500 text-rose-200"
                  : formFeedback.type === "success"
                  ? "bg-emerald-950/70 border-emerald-400 text-emerald-200"
                  : "bg-amber-950/70 border-amber-400 text-amber-200"
              }`}
            >
              {formFeedback.message}
            </div>
          )}

          {/* Account Type Selector (Includes Consumer Registration First!) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">
              Select Account / Portal Category:
            </label>
            <select
              value={selectedRoleKey}
              onChange={(e) => {
                setSelectedRoleKey(e.target.value);
                setFormFeedback({ type: "", message: "" });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Registration / Login Input Fields */}
          <div className="space-y-2.5">
            {authMode === "register" && (
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400 font-bold">Full Name *</span>
                  <span
                    className={
                      regForm.fullName.trim().length >= 2
                        ? "text-emerald-400 font-black"
                        : "text-amber-400"
                    }
                  >
                    {regForm.fullName.trim().length >= 2 ? "\u2713 Ready" : "Required"}
                  </span>
                </div>
                <input
                  type="text"
                  value={regForm.fullName}
                  onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                  placeholder="Enter Your Full Name"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            )}

            {authMode === "register" && !isConsumerSelected && (
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400 font-bold">
                    Shop / Business / Trade Title *
                  </span>
                  <span
                    className={
                      regForm.businessName.trim().length >= 2
                        ? "text-emerald-400 font-black"
                        : "text-amber-400"
                    }
                  >
                    {regForm.businessName.trim().length >= 2 ? "\u2713 Ready" : "Required"}
                  </span>
                </div>
                <input
                  type="text"
                  value={regForm.businessName}
                  onChange={(e) =>
                    setRegForm({ ...regForm, businessName: e.target.value })
                  }
                  placeholder="Shop Name / Service Title / Vehicle Name"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            )}

            {/* 10-Digit Mobile Number */}
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-slate-400 font-bold">10-Digit Mobile Number *</span>
                <span
                  className={
                    phoneDigitsCount === 10
                      ? "text-emerald-400 font-black"
                      : "text-amber-400 font-bold"
                  }
                >
                  {phoneDigitsCount}/10 digits {phoneDigitsCount === 10 ? "\u2713" : ""}
                </span>
              </div>
              <input
                type="tel"
                maxLength={13}
                value={regForm.phone}
                onChange={(e) =>
                  setRegForm({ ...regForm, phone: cleanPhoneDigits(e.target.value) })
                }
                placeholder="10-Digit Mobile Number"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold tracking-wide"
              />
            </div>

            {/* Partner KYC / GST / Trade License / DL Number (Only for Partners) */}
            {authMode === "register" && !isConsumerSelected && (
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400 font-bold">
                    GST / Trade License / DL / Registration ID
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {regForm.kycIdNumber.trim() ? "\u2713 Entered" : "Optional if Shop Name set"}
                  </span>
                </div>
                <input
                  type="text"
                  value={regForm.kycIdNumber}
                  onChange={(e) =>
                    setRegForm({ ...regForm, kycIdNumber: e.target.value })
                  }
                  placeholder="Enter GST / Shop License / Driving License ID"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            )}

            {/* UPI ID */}
            {authMode === "register" && (
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400 font-bold">
                    UPI ID (For Instant Refunds / Direct Payouts)
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {regForm.upiId.trim() ? "\u2713 Ready" : "Auto-formats @ybl"}
                  </span>
                </div>
                <input
                  type="text"
                  value={regForm.upiId}
                  onChange={(e) => setRegForm({ ...regForm, upiId: e.target.value })}
                  placeholder="e.g. yourname@ybl or 9848011223@axl"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            )}

            {/* 4-Digit Security PIN with Live Counter + Show/Hide Toggle */}
            <div>
              <div className="flex justify-between items-center text-[10px] mb-1">
                <span className="text-slate-400 font-bold">4-Digit Security PIN *</span>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      pinDigitsCount === 4
                        ? "text-emerald-400 font-black"
                        : "text-amber-400 font-bold"
                    }
                  >
                    {pinDigitsCount}/4 digits {pinDigitsCount === 4 ? "\u2713" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPinText(!showPinText)}
                    className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded text-[9px] font-black cursor-pointer"
                  >
                    {showPinText ? "Hide PIN" : "Show PIN"}
                  </button>
                </div>
              </div>
              <input
                type={showPinText ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                value={regForm.pin}
                onChange={(e) =>
                  setRegForm({ ...regForm, pin: cleanPinDigits(e.target.value) })
                }
                placeholder="Enter 4-Digit PIN (e.g. 1990)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono tracking-widest"
              />
            </div>
          </div>

          {/* OTP Verification Box (Appears as soon as Send Mobile OTP is clicked) */}
          {otpState.sent && (
            <div className="bg-emerald-950/40 border-2 border-emerald-400 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-emerald-300 font-black text-xs">
                  \uD83D\uDCF2 Live Mobile OTP Generated: {otpState.generatedOtp}
                </span>
                <span className="bg-emerald-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded">
                  Auto-Filled
                </span>
              </div>
              <input
                type="text"
                maxLength={4}
                value={otpState.enteredOtp}
                onChange={(e) =>
                  setOtpState({ ...otpState, enteredOtp: e.target.value })
                }
                placeholder="Enter 4-Digit OTP"
                className="w-full bg-slate-950 border border-emerald-400 rounded-xl p-2.5 text-center text-emerald-300 font-black tracking-widest text-sm"
              />
              <button
                type="button"
                onClick={handleCompleteVerification}
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3 rounded-xl cursor-pointer shadow-lg text-xs"
              >
                \u2713 Verify OTP &amp; Complete{" "}
                {authMode === "login"
                  ? "Login"
                  : isConsumerSelected
                  ? "Consumer Registration"
                  : "Partner KYC Submission"}{" "}
                &rarr;
              </button>
            </div>
          )}

          {/* Primary Send OTP Button */}
          <button
            type="button"
            onClick={handleSendOtpClick}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl cursor-pointer shadow-lg text-xs"
          >
            \uD83D\uDCF2{" "}
            {otpState.sent
              ? "Resend Mobile OTP"
              : authMode === "login"
              ? "Send Mobile OTP for Login \u2192"
              : isConsumerSelected
              ? "Send Mobile OTP for Consumer Registration \u2192"
              : "Send Mobile OTP for KYC Submission \u2192"}
          </button>
        </div>
      )}

      {/* =======================================================================
          SUB-TAB 2: PROFILE & UPI BANK VAULT
      ======================================================================= */}
      {subTab === "profile_upi" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
          <h3 className="text-sm font-black text-emerald-400">
            \uD83D\uDC64 Personal Profile &amp; Instant UPI Settlement Vault
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Full Name</label>
              <input
                type="text"
                value={profileForm.fullName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, fullName: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Mobile Number</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, phone: cleanPhoneDigits(e.target.value) })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Primary UPI ID</label>
              <input
                type="text"
                value={profileForm.upiId}
                onChange={(e) => setProfileForm({ ...profileForm, upiId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-emerald-300 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Bank Name</label>
              <input
                type="text"
                value={profileForm.bankName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, bankName: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const updatedUser = {
                ...(currentUser || {}),
                ...profileForm,
                name: profileForm.fullName,
                isGuest: false
              };
              if (setCurrentUser) setCurrentUser(updatedUser);
              saveCloudAndLocalState({ currentUser: updatedUser });
              onTriggerToast("\u2713 Profile & UPI Vault Saved & Synced!");
            }}
            className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
          >
            \u2713 Save Profile &amp; UPI Details
          </button>
        </div>
      )}

      {/* =======================================================================
          SUB-TAB 3: SAVED DELIVERY ADDRESSES
      ======================================================================= */}
      {subTab === "addresses" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3">
          <h3 className="text-sm font-black text-amber-400">
            \uD83D\uDCCD Saved Delivery &amp; Service Addresses
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              value={newAddrForm.label}
              onChange={(e) => setNewAddrForm({ ...newAddrForm, label: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
            >
              <option value="Home">Home</option>
              <option value="Shop / Office">Shop / Office</option>
              <option value="Worksite">Worksite</option>
            </select>
            <input
              type="text"
              value={newAddrForm.fullAddress}
              onChange={(e) =>
                setNewAddrForm({ ...newAddrForm, fullAddress: e.target.value })
              }
              placeholder="House No, Street, Colony, Adilabad"
              className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!newAddrForm.fullAddress.trim()) return;
              const addrObj = {
                id: `addr_${Date.now()}`,
                label: newAddrForm.label,
                fullAddress: newAddrForm.fullAddress.trim(),
                lat: liveTelemetryPing?.lat || 19.6641,
                lng: liveTelemetryPing?.lng || 78.532
              };
              const nextAddrs = [addrObj, ...(Array.isArray(savedAddresses) ? savedAddresses : [])];
              if (setSavedAddresses) setSavedAddresses(nextAddrs);
              if (setActiveAddressId) setActiveAddressId(addrObj.id);
              saveCloudAndLocalState({ savedAddresses: nextAddrs });
              setNewAddrForm({ ...newAddrForm, fullAddress: "" });
              onTriggerToast("\u2713 New Delivery Address Added!");
            }}
            className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
          >
            + Add &amp; Select Address
          </button>

          <div className="space-y-2 pt-1">
            {(Array.isArray(savedAddresses) && savedAddresses.length > 0
              ? savedAddresses
              : [
                  {
                    id: "default_home",
                    label: "Home",
                    fullAddress: "Subhash Nagar, Adilabad",
                    lat: 19.6641,
                    lng: 78.532
                  }
                ]
            ).map((addr) => (
              <div
                key={addr.id}
                onClick={() => setActiveAddressId && setActiveAddressId(addr.id)}
                className={`p-3 rounded-xl border flex justify-between items-center cursor-pointer ${
                  activeAddressId === addr.id
                    ? "bg-emerald-950/40 border-emerald-400"
                    : "bg-slate-950 border-slate-800"
                }`}
              >
                <div>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded text-[9px] font-black mr-2">
                    {addr.label}
                  </span>
                  <span className="text-white font-bold">{addr.fullAddress}</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-black">
                  {activeAddressId === addr.id ? "ACTIVE \u2713" : "Select"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =======================================================================
          SUB-TAB 4: APP OTA UPDATER & FOUNDER ADMIN LOGIN GATE
      ======================================================================= */}
      {subTab === "app_admin" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border-2 border-amber-400/60 rounded-3xl p-4 space-y-3">
            <h3 className="text-sm font-black text-amber-400">
              \uD83D\uDD10 Founder Master Admin Login Gate
            </h3>
            <p className="text-[11px] text-slate-300">
              Enter your Founder Admin Username, Password, and 4-Digit PIN to open the 9-Tab Master Admin Console.
            </p>
            {adminGateMsg && (
              <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-500 text-rose-200 font-bold">
                {adminGateMsg}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                value={adminGateForm.username}
                onChange={(e) =>
                  setAdminGateForm({ ...adminGateForm, username: e.target.value })
                }
                placeholder="Admin Username"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
              />
              <input
                type="password"
                value={adminGateForm.password}
                onChange={(e) =>
                  setAdminGateForm({ ...adminGateForm, password: e.target.value })
                }
                placeholder="Admin Password"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
              />
              <input
                type="password"
                maxLength={6}
                value={adminGateForm.pin}
                onChange={(e) =>
                  setAdminGateForm({ ...adminGateForm, pin: e.target.value })
                }
                placeholder="4-Digit PIN"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-emerald-300 font-mono text-center"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const creds = getFounderCredentials();
                  if (
                    adminGateForm.username.trim() === creds.username &&
                    adminGateForm.password === creds.password &&
                    adminGateForm.pin.trim() === creds.pin
                  ) {
                    setAdminGateMsg("");
                    if (onEnterFounderAdmin) onEnterFounderAdmin();
                    else if (onOpenAdminGate) onOpenAdminGate();
                    else window.location.href = "/?admin=true";
                  } else {
                    setAdminGateMsg(
                      "Invalid Founder Admin credentials or PIN. Please check Username, Password, and PIN."
                    );
                  }
                }}
                className="flex-1 bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
              >
                Unlock Founder Admin Suite &rarr;
              </button>
              {onOpenAdminGate && (
                <button
                  type="button"
                  onClick={onOpenAdminGate}
                  className="bg-slate-800 border border-amber-400/40 text-amber-300 font-bold px-3 py-2.5 rounded-xl cursor-pointer"
                >
                  Open Header Admin Modal
                </button>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-black text-emerald-400 text-xs">
                  In-App Zero-Loss OTA Updater &amp; APK Installer
                </h4>
                <p className="text-[10px] text-slate-400">
                  Installed Version: v{appUpdateInfo?.currentVersion || "3.2.4"}
                </p>
              </div>
              <a
                href="/WE4ALL.apk?v=3.2.4"
                download="WE4ALL.apk"
                className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black px-3 py-1.5 rounded-xl text-[10px]"
              >
                \u2B07 Download Official APK
              </a>
            </div>
            {otaProgress && (
              <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40 text-emerald-300 font-bold text-[11px]">
                {otaProgress.msg} ({otaProgress.pct}%)
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                performZeroLossOtaUpdate(
                  "3.2.4",
                  "WE4ALL v3.2.4 Synced",
                  (st) => setOtaProgress(st),
                  (updated) => {
                    if (setAppUpdateInfo) setAppUpdateInfo(updated);
                    setOtaProgress(null);
                  }
                )
              }
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-2 rounded-xl cursor-pointer"
            >
              \uD83D\uDD04 Sync Latest Cloud Modules &amp; Refresh Cache
            </button>
          </div>
        </div>
      )}
    </div>
  );
}