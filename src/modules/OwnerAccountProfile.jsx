import React, { useState, useEffect } from "react";
import {
  loadCloudAndLocalState,
  performZeroLossOtaUpdate,
  getFounderCredentials,
  supabase,
  activateSupabaseAccount,
  clearActiveSupabaseAccount
} from "../supabaseClient";

const ROLE_OPTIONS = [
  { id: "customer", label: "🛒 Consumer / Customer Portal", isConsumer: true },
  { id: "merchant", label: "🏪 Product Merchant Partner", isConsumer: false },
  { id: "service_provider", label: "🔧 Home Service Provider Partner", isConsumer: false },
  { id: "decorator", label: "🌺 Event Decorator & Function Hall Partner", isConsumer: false },
  { id: "rider", label: "🛵 Delivery Captain & Bike/Auto Taxi Partner", isConsumer: false },
  { id: "labour", label: "🧱 Labour & Mistri Worker Partner", isConsumer: false }
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
    onPartnerAuthenticated,
    onLogoutPartner,
    onTriggerToast = () => {}
  } = rawProps;

  const [localUser, setLocalUser] = useState({ isGuest: true, role: "customer", fullName: "Guest Visitor" });

  const isLoggedIn = Boolean(localUser?.authUserId && !localUser.isGuest);

  // If logged in, default to account details; if guest, show login/register gate
  const [subTab, setSubTab] = useState(() => (isLoggedIn ? "account_details" : "kyc_gate"));
  const [authMode, setAuthMode] = useState("login"); // login | register
  const [loginMethod, setLoginMethod] = useState("otp"); // OTP is the only enabled login method
  const [selectedRoleKey, setSelectedRoleKey] = useState("customer");
  const [showPinText, setShowPinText] = useState(false);

  const isConsumerSelected = selectedRoleKey === "customer";

  const [loginForm, setLoginForm] = useState({
    identifier: "", // phone or username
  });

  const [regForm, setRegForm] = useState({
    fullName: "",
    businessName: "",
    phone: "",
    upiId: "",
    area: "Subhash Nagar, Adilabad"
  });

  const [formFeedback, setFormFeedback] = useState({ type: "", message: "" });
  const [otpState, setOtpState] = useState({ sent: false, phone: "", token: "", busy: false });

  useEffect(() => {
    let active = true;
    const guest = { isGuest: true, role: "customer", fullName: "Guest Visitor" };
    (async () => {
      if (!supabase) {
        if (active) setLocalUser(guest);
        return;
      }
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        if (active) {
          setLocalUser(guest);
          if (currentUser?.authUserId) {
            setCurrentUser?.(guest);
            setActivePortal?.("customer");
            onSelectRole?.("customer");
          }
        }
        return;
      }
      const user = data.user;
      const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("we4all_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("we4all_user_roles").select("role,status").eq("user_id", user.id)
      ]);
      if (profileError) throw profileError;
      if (rolesError) throw rolesError;
      const customerRole = (roles || []).find((item) => item.role === "customer" && item.status === "approved");
      if (!customerRole) throw new Error("Verified Supabase session has no approved customer role.");
      const preferredRole = currentUser?.authUserId === user.id ? currentUser.role : "customer";
      const approvedRole = (roles || []).find((item) => item.role === preferredRole && item.status === "approved");
      const resolvedRole = approvedRole?.role || "customer";
      const signedInUser = {
        id: user.id,
        authUserId: user.id,
        phone: user.phone || profile?.phone || "",
        fullName: profile?.full_name || user.user_metadata?.full_name || "",
        businessName: profile?.business_name || "",
        area: profile?.area || "",
        role: resolvedRole,
        status: "Approved",
        isGuest: false
      };
      if (!active) return;
      setLocalUser(signedInUser);
      setCurrentUser?.(signedInUser);
      if (resolvedRole !== "customer") {
        onPartnerAuthenticated?.(resolvedRole, signedInUser);
      } else {
        setActivePortal?.("customer");
        onSelectRole?.("customer");
      }
    })().catch((error) => {
      console.warn("WE4ALL session restore failed:", error?.message || error);
      if (active) {
        setLocalUser(guest);
        setCurrentUser?.(guest);
        setActivePortal?.("customer");
      }
    });
    return () => { active = false; };
  }, [currentUser?.authUserId]);

  const cleanPhoneDigits = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.slice(0, 10);
  };

  const normalizeUpiId = (rawUpi, fallbackPhone) => {
    const trimmed = String(rawUpi || "").trim();
    if (trimmed && trimmed.includes("@")) return trimmed;
    return fallbackPhone ? `${fallbackPhone}@ybl` : "";
  };

  const sendPhoneOtp = async () => {
    const phoneDigits = cleanPhoneDigits(authMode === "register" ? regForm.phone : loginForm.identifier);
    if (phoneDigits.length !== 10) {
      setFormFeedback({ type: "error", message: "Enter a valid 10-digit Indian mobile number." });
      return;
    }
    if (!supabase) {
      setFormFeedback({ type: "error", message: "Supabase client is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY." });
      return;
    }
    setOtpState({ sent: false, phone: "", token: "", busy: true });
    const phone = `+91${phoneDigits}`;
    try {
      const isRegistration = authMode === "register";
      if (isRegistration) {
        if (!regForm.fullName.trim()) throw new Error("Enter your full name before requesting OTP.");
        if (!isConsumerSelected && !regForm.businessName.trim()) throw new Error("Enter your business or partner name.");
        const { error } = await supabase.auth.signInWithOtp({
          phone,
          options: {
            shouldCreateUser: true,
            data: {
              full_name: regForm.fullName.trim(),
              business_name: regForm.businessName.trim(),
              area: regForm.area || ""
            }
          }
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone,
          options: { shouldCreateUser: false }
        });
        if (error) throw error;
      }
      setOtpState({ sent: true, phone, token: "", busy: false });
      setFormFeedback({ type: "success", message: `SMS verification code sent to +91 ${phoneDigits}. Enter it below to continue.` });
    } catch (error) {
      setOtpState({ sent: false, phone: "", token: "", busy: false });
      setFormFeedback({
        type: "error",
        message: error?.message || "Could not send SMS OTP. Check that Phone Auth and an SMS provider are enabled in Supabase."
      });
    }
  };

  const handleLoginSubmit = async () => {
    if (loginMethod !== "otp") {
      setFormFeedback({ type: "error", message: "Only server-verified SMS OTP sign-in is enabled. PIN and biometric login are not active." });
      return;
    }
    if (!otpState.sent || otpState.token.trim().length < 6) {
      setFormFeedback({ type: "error", message: "Request an SMS OTP and enter the six-digit code." });
      return;
    }
    setOtpState((s) => ({ ...s, busy: true }));
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: otpState.phone,
        token: otpState.token.trim(),
        type: "sms"
      });
      if (error) throw error;
      const user = data?.user;
      if (!user?.id || !data?.session?.access_token) throw new Error("Supabase did not return a verified user session.");

      const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("we4all_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("we4all_user_roles").select("role,status").eq("user_id", user.id)
      ]);
      if (profileError) throw profileError;
      if (rolesError) throw rolesError;

      const customerRole = (roles || []).find((r) => r.role === "customer" && r.status === "approved");
      const baseUser = {
        id: user.id,
        authUserId: user.id,
        phone: user.phone || profile?.phone || otpState.phone.replace("+91", ""),
        fullName: profile?.full_name || user.user_metadata?.full_name || "",
        businessName: profile?.business_name || user.user_metadata?.business_name || "",
        area: profile?.area || user.user_metadata?.area || "",
        isGuest: false
      };
      if (!customerRole) throw new Error("Customer profile is not yet provisioned. Contact WE4ALL support.");

      const requestedRole = selectedRoleKey;
      if (requestedRole !== "customer") {
        const approved = (roles || []).find((r) => r.role === requestedRole && r.status === "approved");
        if (!approved) {
          const partnerUser = { ...baseUser, role: "customer", status: "Approved" };
          setLocalUser(partnerUser);
          setCurrentUser?.(partnerUser);
          setActivePortal?.("customer");
          onSelectRole?.("customer");
          setFormFeedback({ type: "error", message: `Your customer account is active. The ${requestedRole.replace("_", " ")} portal is still pending Founder approval.` });
          setSubTab("account_details");
          return;
        }
        const partnerUser = { ...baseUser, role: requestedRole, status: "Approved" };
        setLocalUser(partnerUser);
        setCurrentUser?.(partnerUser);
        setFormFeedback({ type: "success", message: `${requestedRole.replace("_", " ")} portal access verified.` });
        setSubTab("account_details");
        return;
      }

      const customer = { ...baseUser, role: "customer", status: "Approved" };
      setLocalUser(customer);
      setCurrentUser?.(customer);
      setActivePortal?.("customer");
      onSelectRole?.("customer");
      setFormFeedback({ type: "success", message: "Phone verified. Your WE4ALL customer account is connected to Supabase." });
      setSubTab("account_details");
    } catch (error) {
      setFormFeedback({ type: "error", message: error?.message || "OTP verification failed." });
    } finally {
      setOtpState((s) => ({ ...s, busy: false }));
    }
  };

  const handleRegistrationSubmit = async () => {
    if (!otpState.sent || otpState.token.trim().length < 6) {
      setFormFeedback({ type: "error", message: "Request an SMS OTP and enter the six-digit code." });
      return;
    }
    try {
      setOtpState((s) => ({ ...s, busy: true }));
      const { data, error } = await supabase.auth.verifyOtp({
        phone: otpState.phone,
        token: otpState.token.trim(),
        type: "sms"
      });
      if (error) throw error;
      const user = data?.user;
      if (!user?.id || !data?.session?.access_token) throw new Error("Supabase did not return a verified account.");
      const profilePayload = {
        user_id: user.id,
        full_name: regForm.fullName.trim(),
        business_name: regForm.businessName.trim(),
        phone: user.phone || otpState.phone,
        area: regForm.area || "",
        updated_at: new Date().toISOString()
      };
      const { error: profileError } = await supabase.from("we4all_profiles").upsert(profilePayload, { onConflict: "user_id" });
      if (profileError) throw profileError;

      const customer = {
        id: user.id, authUserId: user.id,
        phone: user.phone || otpState.phone.replace("+91", ""),
        fullName: regForm.fullName.trim(),
        businessName: regForm.businessName.trim(),
        area: regForm.area || "",
        role: "customer", status: "Approved", isGuest: false
      };

      if (selectedRoleKey !== "customer") {
        const { error: applicationError } = await supabase.from("we4all_partner_applications").insert({
          user_id: user.id,
          requested_role: selectedRoleKey,
          application_payload: {
            full_name: regForm.fullName.trim(),
            business_name: regForm.businessName.trim(),
            phone: profilePayload.phone,
            area: profilePayload.area
          }
        });
        if (applicationError) throw applicationError;
      }

      setLocalUser(customer);
      setCurrentUser?.(customer);
      saveCloudAndLocalState({ currentUser: customer });
      setActivePortal?.("customer");
      onSelectRole?.("customer");
      setSubTab("account_details");
      setFormFeedback({
        type: "success",
        message: selectedRoleKey === "customer"
          ? "Customer account created and verified. Your account is now connected to Supabase."
          : "Customer account created. Your partner application was submitted as pending Founder approval."
      });
    } catch (error) {
      setFormFeedback({ type: "error", message: error?.message || "Could not complete registration." });
    } finally {
      setOtpState((s) => ({ ...s, busy: false }));
    }
  };


  const handleLogout = async () => {
    try {
      await supabase?.auth.signOut();
      clearActiveSupabaseAccount();
    } catch (error) {
      console.warn("WE4ALL sign-out failed:", error?.message || error);
    }
    const guestUser = { isGuest: true, role: "customer", fullName: "Guest Visitor" };
    setLocalUser(guestUser);
    if (setCurrentUser) setCurrentUser(guestUser);
    if (setActivePortal) setActivePortal("customer");
    if (onSelectRole) onSelectRole("customer");
    onLogoutPartner?.();
    setOtpState({ sent: false, phone: "", token: "", busy: false });
    setSubTab("kyc_gate");
    onTriggerToast("Signed out of Supabase. Returned to Guest Visitor mode.");
    if (typeof window !== "undefined") window.location.reload();
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
                  { id: "otp", label: "Mobile OTP" }
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

              {false && loginMethod === "pin" && (
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
                  <button
                    type="button"
                    disabled={otpState.busy}
                    onClick={sendPhoneOtp}
                    className="w-full bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl px-3 py-2"
                  >
                    {otpState.busy ? "Working…" : otpState.sent ? "Resend SMS OTP" : "Send SMS OTP"}
                  </button>
                  {otpState.sent && (
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otpState.token}
                      onChange={(e) => setOtpState({ ...otpState, token: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      placeholder="Enter 6-digit SMS code"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center font-black tracking-widest"
                    />
                  )}
                  <p className="text-[10px] text-slate-400">Codes are issued and verified by Supabase Auth. WE4ALL does not generate or display OTPs.</p>
                </div>
              )}

              {false && loginMethod === "biometric" && (
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
                disabled={otpState.busy || !otpState.sent || otpState.token.length !== 6}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl cursor-pointer shadow-lg text-xs"
              >
                Verify OTP &amp; Sign In →
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
                value={regForm.area}
                onChange={(e) => setRegForm({ ...regForm, area: e.target.value })}
                placeholder="Area / address"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              />

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={otpState.busy}
                  onClick={sendPhoneOtp}
                  className="w-full bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-2 rounded-xl"
                >
                  {otpState.sent ? "Resend Registration OTP" : "Send Registration OTP"}
                </button>
                {otpState.sent && (
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpState.token}
                    onChange={(e) => setOtpState({ ...otpState, token: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    placeholder="Enter 6-digit SMS code"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-center font-mono tracking-widest"
                  />
                )}
                <button
                  type="button"
                  disabled={otpState.busy || !otpState.sent || otpState.token.length !== 6}
                  onClick={handleRegistrationSubmit}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-2xl shadow text-xs"
                >
                  Verify OTP &amp; Create Account →
                </button>
              </div>
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
