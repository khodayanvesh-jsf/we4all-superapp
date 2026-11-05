import React, { useState, useEffect } from "react";
import {
  loadCloudAndLocalState,
  saveCloudAndLocalState,
  performZeroLossOtaUpdate,
  getFounderCredentials
} from "../supabaseClient";

const ROLE_OPTIONS = [
  { id: "customer", label: "🛒 Consumer / Customer Portal", isConsumer: true },
  { id: "merchant", label: "🏪 Product Merchant Partner", isConsumer: false },
  { id: "service_provider", label: "🔧 Home Service Provider Partner", isConsumer: false },
  { id: "decorator", label: "🌺 Event Decorator & Function Hall Partner", isConsumer: false },
  { id: "rider", label: "🛵 Delivery Captain & Bike/Auto Taxi Partner", isConsumer: false }
];

export default function OwnerAccountProfile(rawProps = {}) {
  const {
    currentUser,
    setCurrentUser,
    activePortal = "customer",
    setActivePortal,
    onSelectRole,
    savedAddresses = [],
    setSavedAddresses,
    activeAddressId,
    setActiveAddressId,
    activeAddressObj,
    liveTelemetryPing,
    appUpdateInfo = {},
    setAppUpdateInfo,
    onOpenAdminGate,
    onTriggerToast = () => {}
  } = rawProps;

  const [localUser, setLocalUser] = useState(() => {
    if (currentUser && !currentUser.isGuest) return currentUser;
    try {
      const saved = localStorage.getItem("we4all_persistent_user_session_v8");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return currentUser || { isGuest: true, role: "customer", fullName: "Guest Visitor" };
  });

  const isLoggedIn = Boolean(localUser && !localUser.isGuest);

  // If logged in, default to account details; if guest, show login/register gate
  const [subTab, setSubTab] = useState(() => (isLoggedIn ? "account_details" : "kyc_gate"));
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [loginMethod, setLoginMethod] = useState("pin"); // pin | otp | biometric
  const [selectedRoleKey, setSelectedRoleKey] = useState("customer");
  const [showPinText, setShowPinText] = useState(false);

  const isConsumerSelected = selectedRoleKey === "customer";

  const [loginForm, setLoginForm] = useState({
    identifier: "", // phone or username
    pin: ""
  });

  const [regForm, setRegForm] = useState({
    fullName: "",
    businessName: "",
    phone: "",
    upiId: "",
    pin: "",
    area: "Subhash Nagar, Adilabad"
  });

  const [formFeedback, setFormFeedback] = useState({ type: "", message: "" });
  const [otpState, setOtpState] = useState({ sent: false, generatedOtp: "", enteredOtp: "" });

  useEffect(() => {
    if (currentUser && !currentUser.isGuest) {
      setLocalUser(currentUser);
    }
  }, [currentUser]);

  const cleanPhoneDigits = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.slice(0, 10);
  };

  const cleanPinDigits = (raw) => String(raw || "").replace(/\D/g, "").slice(0, 4);

  const normalizeUpiId = (rawUpi, fallbackPhone) => {
    const trimmed = String(rawUpi || "").trim();
    if (trimmed && trimmed.includes("@")) return trimmed;
    return fallbackPhone ? `${fallbackPhone}@ybl` : "";
  };

  const handleLoginSubmit = () => {
    const ident = String(loginForm.identifier || "").trim();
    if (!ident) {
      setFormFeedback({ type: "error", message: "Enter the registered phone number." });
      return;
    }
    setFormFeedback({
      type: "error",
      message:
        "Secure sign-in is not configured yet. WE4ALL must verify a server-issued SMS OTP and load the approved role from the server. Local PINs, browser-stored profiles and demo codes are not accepted as authentication."
    });
  };

  const handleLogout = () => {
    const guestUser = { isGuest: true, role: "customer", fullName: "Guest Visitor" };
    setLocalUser(guestUser);
    try {
      localStorage.removeItem("we4all_persistent_user_session_v8");
    } catch (e) {}
    saveCloudAndLocalState({ currentUser: guestUser });
    if (setCurrentUser) setCurrentUser(guestUser);
    if (setActivePortal) setActivePortal("customer");
    if (onSelectRole) onSelectRole("customer");
    setSubTab("kyc_gate");
    onTriggerToast("🚪 Logged out successfully. Returned to Guest Visitor mode.");
  };

  return (
    <div className="space-y-4 pb-8 text-xs font-sans">
      {/* Top Session Status Card */}
      <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-4 shadow-xl flex flex-wrap justify-between items-center gap-3">
        <div>
          <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[9px] font-black px-2.5 py-0.5 rounded uppercase">
            {isLoggedIn
              ? `Active Session: ${(localUser.role || "customer").toUpperCase()} Portal`
              : "Guest Visitor Mode (Shopping Enabled)"}
          </span>
          <h3 className="text-base font-black text-white mt-1">
            {isLoggedIn ? localUser.fullName || localUser.name : "Guest Visitor (Explore & Add to Cart)"}
          </h3>
          <p className="text-[11px] text-slate-300">
            {isLoggedIn
              ? `Mobile: +91 ${localUser.phone} | UPI: ${localUser.upiId || "N/A"}`
              : "Browse products, add items to cart freely. Login/Registration is required only before payment."}
          </p>
        </div>
        {isLoggedIn && (
          <button
            type="button"
            onClick={handleLogout}
            className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2 rounded-2xl cursor-pointer shadow text-xs"
          >
            🚪 Logout Session
          </button>
        )}
      </div>

      {/* Account Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        {[
          { id: isLoggedIn ? "account_details" : "kyc_gate", label: isLoggedIn ? "📋 Account Details" : "🔐 Login / Register" },
          { id: "profile_upi", label: "✏️ Profile & UPI" },
          { id: "addresses", label: "📍 Addresses" }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`py-2.5 px-2 rounded-xl font-black text-[11px] cursor-pointer ${
              subTab === t.id ? "bg-amber-400 text-slate-950 shadow" : "bg-slate-950 text-slate-300 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* LOGIN / REGISTRATION GATE */}
      {!isLoggedIn && subTab === "kyc_gate" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-xl">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setFormFeedback({ type: "", message: "" });
              }}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs cursor-pointer border ${
                authMode === "login"
                  ? "bg-emerald-500 text-slate-950 border-emerald-300"
                  : "bg-slate-950 text-slate-300 border-slate-800"
              }`}
            >
              🔑 Portal Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("register");
                setFormFeedback({ type: "", message: "" });
              }}
              className={`flex-1 py-2.5 rounded-xl font-black text-xs cursor-pointer border ${
                authMode === "register"
                  ? "bg-emerald-500 text-slate-950 border-emerald-300"
                  : "bg-slate-950 text-slate-300 border-slate-800"
              }`}
            >
              📝 New Registration
            </button>
          </div>

          {formFeedback.message && (
            <div
              className={`p-3 rounded-2xl border font-bold text-xs ${
                formFeedback.type === "error"
                  ? "bg-rose-950/70 border-rose-500 text-rose-200"
                  : "bg-emerald-950/70 border-emerald-400 text-emerald-200"
              }`}
            >
              {formFeedback.message}
            </div>
          )}

          {/* LOGIN VIEW */}
          {authMode === "login" ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Select Portal to Log Into:</label>
                <select
                  value={selectedRoleKey}
                  onChange={(e) => setSelectedRoleKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Username or Phone Number *</label>
                <input
                  type="text"
                  value={loginForm.identifier}
                  onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                  placeholder="Enter Username or 10-Digit Mobile"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                />
              </div>

              <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {[
                  { id: "pin", label: "PIN Code" },
                  { id: "otp", label: "Mobile OTP" },
                  { id: "biometric", label: "Biometric / Passkey" }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLoginMethod(m.id)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black cursor-pointer ${
                      loginMethod === m.id ? "bg-amber-400 text-slate-950" : "text-slate-400"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {loginMethod === "pin" && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-slate-400 font-bold">4-Digit Security PIN *</label>
                    <button
                      type="button"
                      onClick={() => setShowPinText(!showPinText)}
                      className="text-[10px] text-emerald-400 font-bold cursor-pointer"
                    >
                      {showPinText ? "Hide PIN" : "Show PIN"}
                    </button>
                  </div>
                  <input
                    type={showPinText ? "text" : "password"}
                    maxLength={4}
                    value={loginForm.pin}
                    onChange={(e) => setLoginForm({ ...loginForm, pin: cleanPinDigits(e.target.value) })}
                    placeholder="••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-emerald-300 font-mono text-center tracking-widest text-sm font-black"
                  />
                </div>
              )}

              {loginMethod === "otp" && (
                <div className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex gap-2">
                    <div className="flex-1 bg-amber-950/50 border border-amber-500/50 rounded-xl px-3 py-2 text-amber-200 text-[10px]">
                      SMS OTP is unavailable until the secure server provider is configured. No demo OTP is generated.
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value=""
                      disabled
                      placeholder="OTP unavailable"
                      className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-500 font-mono text-center font-black"
                    />
                  </div>
                </div>
              )}

              {loginMethod === "biometric" && (
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 text-center space-y-2">
                  <p className="text-emerald-300 font-bold text-xs">Touch Fingerprint Sensor or FaceID</p>
                  <button
                    type="button"
                    onClick={() => setFormFeedback({
                      type: "error",
                      message: "Biometric/passkey sign-in is not configured yet. WE4ALL needs server-side passkey enrollment and verification before this can be enabled."
                    })}
                    className="bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl cursor-pointer text-xs"
                  >
                    Authenticate with Device Biometrics 👆
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleLoginSubmit}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl cursor-pointer shadow-lg text-xs"
              >
                Unlock &amp; Stay Logged In to Portal →
              </button>
            </div>
          ) : (
            /* REGISTRATION VIEW */
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Select Registration Role:</label>
                <select
                  value={selectedRoleKey}
                  onChange={(e) => setSelectedRoleKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                value={regForm.fullName}
                onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                placeholder="Full Name *"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              />

              {!isConsumerSelected && (
                <input
                  type="text"
                  value={regForm.businessName}
                  onChange={(e) => setRegForm({ ...regForm, businessName: e.target.value })}
                  placeholder="Business / Shop Name *"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              )}

              <input
                type="tel"
                maxLength={10}
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: cleanPhoneDigits(e.target.value) })}
                placeholder="10-Digit Mobile Number *"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
              />

              <input
                type="text"
                maxLength={4}
                value={regForm.pin}
                onChange={(e) => setRegForm({ ...regForm, pin: cleanPinDigits(e.target.value) })}
                placeholder="Create 4-Digit PIN * (e.g. 1990)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-emerald-300 font-mono text-center tracking-widest font-black"
              />

              <button
                type="button"
                onClick={() => {
                  const phone = cleanPhoneDigits(regForm.phone);
                  if (!regForm.fullName.trim() || phone.length !== 10) {
                    setFormFeedback({ type: "error", message: "Enter your name and valid 10-digit mobile number." });
                    return;
                  }
                  setFormFeedback({
                    type: "error",
                    message:
                      "Registration cannot create an authenticated account yet. Secure SMS verification and the server-side account/partner approval API must be configured first. No PIN or local session was saved."
                  });
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl cursor-pointer shadow text-xs"
              >
                Request Secure Registration →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ACCOUNT DETAILS TAB */}
      {isLoggedIn && subTab === "account_details" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-black text-emerald-400">📋 Active Session Account Details</h3>
            <button
              type="button"
              onClick={() => setSubTab("profile_upi")}
              className="bg-slate-800 text-emerald-300 font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
            >
              ✏️ Edit Profile
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Account Holder Name</p>
              <p className="text-xs font-black text-white mt-0.5">{localUser.fullName || localUser.name}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Active Portal Role (Persists till Logout)</p>
              <p className="text-xs font-black text-amber-300 uppercase mt-0.5">{localUser.role || activePortal}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Registered Mobile Number</p>
              <p className="text-xs font-black text-white mt-0.5">+91 {localUser.phone}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Primary UPI ID</p>
              <p className="text-xs font-black text-emerald-400 mt-0.5">{localUser.upiId || "Not Set"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
