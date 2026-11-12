import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { useRef } from "react";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { APP_VERSION, APP_BUILD_NUMBER } from "../appVersion.js";
import {
  loadCloudAndLocalState,
  performZeroLossOtaUpdate,
  getFounderCredentials,
  supabase,
  activateSupabaseAccount,
  clearActiveSupabaseAccount,
  probeSupabaseConnection
} from "../supabaseClient";
import SignaturePad from "./SignaturePad";
import AccountRecovery, { BackupCodeForm, RecoveryEmailSettings } from "./AccountRecovery";
import { accountLoginIdentity, realAccountEmail } from "./workflows/accountIdentity";
import { PARTNER_ROLE_FIELDS, getPartnerKycDocuments, validatePartnerRegistration } from "./workflows/partnerRegistration";
import { marketCellId } from "./workflows/marketLocation";

const ROLE_OPTIONS = [
  { id: "customer", label: "🛒 Consumer / Customer Portal", isConsumer: true },
  { id: "merchant", label: "🏪 Product Merchant Partner", isConsumer: false },
  { id: "service_provider", label: "🔧 Home Service Provider Partner", isConsumer: false },
  { id: "decorator", label: "🌺 Event Decorator & Function Hall Partner", isConsumer: false },
  { id: "rider", label: "🛵 Delivery Captain & Bike/Auto Taxi Partner", isConsumer: false },
  { id: "labour", label: "🧱 Labour & Mistri Worker Partner", isConsumer: false }
];
const KYC_BUCKET = "we4all-partner-kyc";
const PARTNER_TERMS_VERSION = "trial-draft-1";
const getFunctionResponseError = async (error, fallback) => {
  const response = error?.context;
  if (response && typeof response.clone === "function") {
    try {
      const payload = await response.clone().json();
      if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
      if (typeof payload?.message === "string" && payload.message.trim()) return payload.message;
    } catch { /* Use the SDK message if the response has no JSON error body. */ }
  }
  return error?.message || fallback;
};
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
    onCheckForUpdate = () => {},
    checkingUpdate = false,
    onRunOtaUpdate = () => {},
    otaProgress = null,
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
  const [registrationRoleOptions, setRegistrationRoleOptions] = useState(ROLE_OPTIONS);
  const [showPinText, setShowPinText] = useState(false);

  const isConsumerSelected = selectedRoleKey === "customer";
  // Private test builds may explicitly opt in. Public builds use email registration.
  const [privateTestMode, setPrivateTestMode] = useState(false);
  const [privateTestPass, setPrivateTestPass] = useState("");
  const privateTestSession = useRef(null);
  const trialOtpModeEnabled = !privateTestMode && import.meta.env.VITE_WE4ALL_TRIAL_OTP_MODE === "true";

  const [loginForm, setLoginForm] = useState({
    identifier: "", // phone or username
  });

  const [regForm, setRegForm] = useState({
    fullName: "",
    businessName: "",
    email: "",
    password: "",
    phone: "",
    email: "",
    upiId: "",
    area: "Subhash Nagar, Adilabad"
  });

  const [formFeedback, setFormFeedback] = useState({ type: "", message: "" });
  const [otpState, setOtpState] = useState({ sent: false, phone: "", token: "", busy: false });
  const [connectionHealth, setConnectionHealth] = useState({
    checking: true,
    configured: false,
    backendReachable: false,
    authenticated: false,
    accountLinked: false,
    syncReady: false,
    message: "Checking Supabase connection…"
  });

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
      let partnerRecord = null;
      if (resolvedRole !== "customer") {
        const { data, error: partnerError } = await supabase
          .from("we4all_partners")
          .select("id,partner_type,approval_status")
          .eq("owner_user_id", user.id)
          .eq("partner_type", resolvedRole)
          .eq("approval_status", "approved")
          .maybeSingle();
        if (partnerError) throw partnerError;
        if (!data) throw new Error("Your approved role has no active WE4ALL partner profile. Contact Founder support.");
        partnerRecord = data;
      }
      const signedInUser = {
        id: user.id,
        authUserId: user.id,
        phone: user.phone || profile?.phone || "",
        fullName: profile?.full_name || user.user_metadata?.full_name || "",
        businessName: profile?.business_name || "",
        area: profile?.area || "",
        role: resolvedRole,
        partnerId: partnerRecord?.id || null,
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


  useEffect(() => {
    let active = true;
    const refreshConnection = async () => {
      const result = await probeSupabaseConnection();
      if (active) setConnectionHealth({ checking: false, ...result });
    };
    refreshConnection();
    const timer = window.setInterval(refreshConnection, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [localUser?.authUserId]);

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

      const activation = await activateSupabaseAccount(user.id);
      if (!activation.ok) throw new Error(activation.reason || "Could not restore your Supabase account data.");
      if (activation.changed && typeof window !== "undefined") {
        window.location.reload();
        return;
      }

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
        const { data: partnerRecord, error: partnerError } = await supabase
          .from("we4all_partners")
          .select("id,partner_type,approval_status")
          .eq("owner_user_id", user.id)
          .eq("partner_type", requestedRole)
          .eq("approval_status", "approved")
          .maybeSingle();
        if (partnerError) throw partnerError;
        if (!partnerRecord) throw new Error("Founder-approved role has no active WE4ALL partner profile yet.");
        const partnerUser = { ...baseUser, role: requestedRole, partnerId: partnerRecord.id, status: "Approved" };
        setLocalUser(partnerUser);
        setCurrentUser?.(partnerUser);
        onPartnerAuthenticated?.(requestedRole, partnerUser);
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

      const activation = await activateSupabaseAccount(user.id);
      if (!activation.ok) throw new Error(activation.reason || "Could not restore your Supabase account data.");
      if (activation.changed && typeof window !== "undefined") {
        window.location.reload();
        return;
      }

      setLocalUser(customer);
      setCurrentUser?.(customer);
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
      {isLoggedIn && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
          <p className="truncate font-black text-white">{localUser.fullName || localUser.name || "My Account"}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-black text-white"
          >
            Log out
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-black text-slate-200">Supabase cloud connection</span>
          <span className={connectionHealth.backendReachable ? "text-emerald-300 font-black" : "text-rose-300 font-black"}>
            {connectionHealth.checking
              ? "CHECKING"
              : connectionHealth.syncReady
                ? "CONNECTED · ACCOUNT SYNC VERIFIED"
                : connectionHealth.backendReachable
                  ? "API CONNECTED"
                  : connectionHealth.configured
                    ? "API UNREACHABLE"
                    : "NOT CONFIGURED"}
          </span>
        </div>
        <p className="text-slate-400">{connectionHealth.message}</p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-[10px] space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-black text-slate-200">Supabase cloud connection</span>
          <span className={connectionHealth.syncReady ? "text-emerald-300 font-black" : connectionHealth.backendReachable ? "text-amber-300 font-black" : "text-rose-300 font-black"}>
            {connectionHealth.checking
              ? "CHECKING"
              : connectionHealth.syncReady
                ? "CONNECTED · ACCOUNT SYNC VERIFIED"
                : connectionHealth.backendReachable
                  ? connectionHealth.authenticated
                    ? "API CONNECTED · ACCOUNT LINK PENDING"
                    : "API CONNECTED · SIGN IN TO SYNC"
                  : connectionHealth.configured
                    ? "API UNREACHABLE"
                    : "NOT CONFIGURED"}
          </span>
        </div>
        <p className="text-slate-400">{connectionHealth.message}</p>
      </div>

      {/* Account Navigation Tabs */}
      <div className={`grid ${partnerApplication ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"} gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800`}>
        {[
          { id: isLoggedIn ? "account_details" : "kyc_gate", label: isLoggedIn ? "📋 Account Details" : "🔐 Login / Register" },
          { id: "profile_upi", label: "✏️ Profile & UPI" },
          { id: "addresses", label: "📍 Addresses" },
          { id: "about_app", label: "ℹ️ About App" },
          ...(partnerApplication ? [{ id: "partner_kyc", label: "🛡️ Partner application" }] : [])
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
                setLoginMethod("pin");
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
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3">
                <p className="text-xs font-black text-emerald-200">Step 1 of 3 · Your profile and role</p>
                <p className="mt-1 text-[10px] text-slate-300">Choose the role you need. We’ll ask only for details relevant to that role; documents and signature come after phone verification.</p>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Select Portal to Log Into:</label>
                <select
                  value={selectedRoleKey}
                  onChange={(e) => {
                    setSelectedRoleKey(e.target.value);
                    setRegForm((current) => ({ ...current, partnerDetails: {} }));
                    setOtpState({ sent: false, phone: "", token: "", busy: false });
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

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Email address *</label>
                <input type="email" autoComplete="username" value={loginForm.identifier}
                  onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold" />
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
                  disabled={otpState.sent || otpState.busy}
                  onChange={(e) => setSelectedRoleKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                >
                  {registrationRoleOptions.map((opt) => (
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

              <input type="email" autoComplete="email" required value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                placeholder="Email address *" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white" />
              <input type="password" autoComplete="new-password" required minLength={8} value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                placeholder="Create password (minimum 8 characters) *" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white" />
              <input type="tel" maxLength={10} value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: cleanPhoneDigits(e.target.value) })}
                placeholder="Mobile number (optional contact only)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold" />

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
          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-3 space-y-2">
            <p className="text-xs font-black text-white">Device sign-in security</p>
            <p className="text-[10px] text-slate-400">Use your account PIN on every sign-in. You can also enable device biometrics for an additional confirmation on this phone.</p>
            <button type="button" onClick={handleBiometricSetup} className="rounded-xl bg-emerald-500 px-3 py-2 text-[10px] font-black text-slate-950">
              {biometricEnabled ? "Turn off biometric confirmation" : "Enable fingerprint / face confirmation"}
            </button>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950 p-3">
            <RecoveryEmailSettings />
          </div>
          <details className="rounded-2xl border border-slate-700 bg-slate-950 p-3">
            <summary className="mb-2 cursor-pointer text-xs font-bold">One-time backup codes</summary>
            <BackupCodeForm enrollment />
          </details>
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

      {subTab === "about_app" && (
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4 shadow-xl" aria-labelledby="about-app-title">
          <div>
            <h3 id="about-app-title" className="text-base font-black text-emerald-300">ℹ️ About WE4ALL</h3>
            <p className="mt-1 text-xs text-slate-400">App version and safe update status for this device.</p>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <dt className="text-[10px] text-slate-400">Installed app version</dt>
              <dd className="mt-1 text-sm font-black text-white">{appUpdateInfo.installedAppVersion || appUpdateInfo.currentVersion || APP_VERSION}</dd>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <dt className="text-[10px] text-slate-400">Build number</dt>
              <dd className="mt-1 text-sm font-black text-white">{appUpdateInfo.installedBuildNumber || APP_BUILD_NUMBER}</dd>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <dt className="text-[10px] text-slate-400">Installed update bundle</dt>
              <dd className="mt-1 text-sm font-black text-white">{appUpdateInfo.currentBundleVersion || "Built-in app"}</dd>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
              <dt className="text-[10px] text-slate-400">Latest available bundle</dt>
              <dd className="mt-1 text-sm font-black text-white">{appUpdateInfo.latestAvailableVersion || APP_VERSION}</dd>
            </div>
          </dl>
          <div role="status" className={`rounded-2xl border p-3 text-xs ${appUpdateInfo.updateAvailable ? "border-amber-400/40 bg-amber-950/40 text-amber-100" : "border-emerald-500/30 bg-emerald-950/30 text-emerald-100"}`}>
            {checkingUpdate ? "Checking the secure update channel…" : otaProgress?.msg || (appUpdateInfo.updateAvailable ? "A verified update is ready to install." : appUpdateInfo.nativeUpdaterRequired ? "Automatic OTA updates are available in the installed Android/iOS app." : "This app is up to date on its current channel.")}
            {appUpdateInfo.releaseNotes && <p className="mt-2 text-[10px] text-slate-300">{appUpdateInfo.releaseNotes}</p>}
            {otaProgress && <progress className="mt-2 h-2 w-full accent-emerald-400" max="100" value={otaProgress.pct || 0} />}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button type="button" onClick={onCheckForUpdate} disabled={checkingUpdate || Boolean(otaProgress)} className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-black text-white disabled:opacity-50">
              {checkingUpdate ? "Checking…" : "Check for updates"}
            </button>
            {appUpdateInfo.updateAvailable && <button type="button" onClick={onRunOtaUpdate} disabled={checkingUpdate || Boolean(otaProgress)} className="rounded-xl bg-emerald-400 px-3 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50">Download and install update</button>}
          </div>
          <p className="text-[10px] text-slate-500">Verified native updates are queued safely and activate after the app backgrounds or relaunches.</p>
        </section>
      )}

      {isLoggedIn && subTab === "partner_kyc" && partnerApplication && (
        <section className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-4 md:p-6 space-y-5 shadow-xl" aria-labelledby="partner-kyc-title">
          <div className="flex flex-wrap justify-between gap-3 items-start">
            <div>
              <p className="text-[10px] uppercase tracking-wider font-black text-emerald-300">Partner setup · step 2 of 3</p>
              <h3 id="partner-kyc-title" className="text-lg font-black text-white mt-1">Finish your partner application</h3>
              <p className="text-xs text-slate-300 mt-1">Your customer account remains usable while we review your partner request.</p>
            </div>
            <span className="rounded-full bg-amber-400/10 border border-amber-300/40 text-amber-200 px-3 py-1 text-[10px] font-black">
              {partnerApplicationLoading ? "Loading status…" : partnerApplication.application_payload?.kyc?.status === "submitted" ? "Documents submitted · under review" : partnerApplication.status === "pending" ? "Action needed" : String(partnerApplication.status || "Application").replaceAll("_", " ")}
            </span>
          </div>

          {partnerApplicationLoading ? <p className="text-sm text-slate-300">Loading your saved application…</p> : (
            <>
              <div className="grid grid-cols-3 gap-2" aria-label="Application steps">
                {["Phone verified", "Documents & signature", "Founder review"].map((step, index) => (
                  <div key={step} className={`rounded-xl p-2 text-center border text-[10px] font-bold ${index === 0 || (index === 1 && partnerApplication.application_payload?.kyc?.status === "submitted") ? "bg-emerald-950 border-emerald-500/40 text-emerald-200" : "bg-slate-950 border-slate-700 text-slate-400"}`}>
                    <span className="block text-base">{index === 0 || (index === 1 && partnerApplication.application_payload?.kyc?.status === "submitted") ? "✓" : index + 1}</span>{step}
                  </div>
                ))}
              </div>

              {partnerApplication.status !== "pending" ? (
                <div className="rounded-2xl bg-slate-950 p-4 text-sm text-slate-200">This application is {String(partnerApplication.status).replaceAll("_", " ")}. Contact WE4ALL support if you need help with the next step.</div>
              ) : partnerApplication.application_payload?.kyc?.status === "submitted" ? (
                <div className="rounded-2xl bg-emerald-950/50 border border-emerald-500/30 p-4 space-y-1">
                  <p className="text-emerald-200 font-black">We received your documents.</p>
                  <p className="text-xs text-slate-300">An authorized reviewer will check the application. You can keep using your Customer portal in the meantime.</p>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-300">
                    <strong className="text-white">Before you upload:</strong> use clear, readable files (PDF, JPG, PNG, or WebP; up to 10 MB each). Documents are stored in a private area and shown only to authorized reviewers. Do not upload card numbers, passwords, or OTPs.
                  </div>
                  <div className="space-y-3">
                    {getPartnerKycDocuments(partnerApplication.requested_role).map(({ key, title, help }, index) => (
                      <label key={key} className="block rounded-2xl border border-slate-700 bg-slate-950 p-3 space-y-1.5">
                        <span className="block text-xs font-black text-white">{index + 1}. {title} <span className="text-rose-300">*</span></span>
                        <span className="block text-[10px] text-slate-400">{help}</span>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input type="file" aria-label={`Choose ${title}`} accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => handleKycFileChange(key, event.target.files?.[0])} className="block w-full text-[10px] text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-3 file:py-2 file:font-black file:text-slate-950" />
                          <input type="file" aria-label={`Take a photo of ${title}`} accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => handleKycFileChange(key, event.target.files?.[0])} className="block w-full text-[10px] text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-700 file:px-3 file:py-2 file:font-black file:text-white" />
                        </div>
                        <span className="block text-[10px] text-emerald-200">{kycFiles[key]?.name || (uploadedKycPaths[key] ? "Previously uploaded · ready to submit" : "No file selected")}</span>
                      </label>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-950 p-3 space-y-3">
                    <div><h4 className="text-sm font-black text-white">3. Sign the trial declaration</h4><p className="text-[10px] text-slate-400 mt-1">This prototype declaration is for testing. Final partner terms must be published before applications can be activated.</p></div>
                    <label className="block text-[10px] font-bold text-slate-300">Full name of person signing
                      <input value={signatureName} onChange={(event) => setSignatureName(event.target.value)} autoComplete="name" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white" placeholder="Type your full legal name" />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[{ id: "typed_name", label: "Type my name" }, { id: "drawn", label: "Draw signature" }, { id: "uploaded", label: "Upload signature" }].map((item) => <button key={item.id} type="button" onClick={() => { setSignatureMode(item.id); setSignatureFile(null); }} className={`rounded-lg px-3 py-2 text-[10px] font-black ${signatureMode === item.id ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-200"}`}>{item.label}</button>)}
                    </div>
                    {signatureMode === "drawn" && <SignaturePad onSignatureChange={setSignatureFile} />}
                    {signatureMode === "uploaded" && <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleKycFileChange("signature", event.target.files?.[0])} className="block w-full text-[10px] text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:font-bold file:text-white" />}
                    {signatureMode === "uploaded" && <p className="text-[10px] text-emerald-200">{kycFiles.signature?.name || "No signature image selected"}</p>}
                    <label className="flex items-start gap-2 text-[10px] text-slate-300"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-0.5 accent-emerald-400" /><span>I confirm the details and documents are mine and accurate, and understand this is a trial declaration pending final partner terms.</span></label>
                  </div>
                  {kycFeedback.message && <p role="status" className={`rounded-xl border p-3 text-xs ${kycFeedback.type === "error" ? "border-rose-500/40 bg-rose-950/40 text-rose-200" : kycFeedback.type === "success" ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200" : "border-sky-500/40 bg-sky-950/40 text-sky-200"}`}>{kycFeedback.message}</p>}
                  <button type="button" disabled={kycSubmitting || !termsAccepted || !partnerApplication.id} onClick={submitPartnerKyc} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{kycSubmitting ? "Uploading securely…" : "Save and send for review"}</button>
                  <p className="text-center text-[10px] text-slate-500">You can continue shopping as a customer. Payment gateway setup is not part of partner KYC.</p>
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
