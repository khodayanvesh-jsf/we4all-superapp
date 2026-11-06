import React, { useState, useEffect } from "react";
import {
  loadCloudAndLocalState,
  performZeroLossOtaUpdate,
  getFounderCredentials,
  supabase,
  activateSupabaseAccount,
  clearActiveSupabaseAccount,
  probeSupabaseConnection
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
  const [selectedRoleKey, setSelectedRoleKey] = useState("customer");
  const [showPinText, setShowPinText] = useState(false);

  const isConsumerSelected = selectedRoleKey === "customer";

  const [loginForm, setLoginForm] = useState({ identifier: "", password: "" });

  const [regForm, setRegForm] = useState({
    fullName: "",
    businessName: "",
    email: "",
    password: "",
    phone: "",
    upiId: "",
    area: "Subhash Nagar, Adilabad"
  });

  const [formFeedback, setFormFeedback] = useState({ type: "", message: "" });
  const [authState, setAuthState] = useState({ busy: false });
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
          .select("id,partner_type,approval_status,vehicle_class")
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
        vehicleCode: partnerRecord?.vehicle_class === "4W" ? "4W_HEAVY" : (partnerRecord?.vehicle_class || "UNVERIFIED"),
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

  const handleLoginSubmit = async () => {
    const email = String(loginForm.identifier || "").trim().toLowerCase();
    const password = String(loginForm.password || "");
    if (!email.includes("@") || password.length < 8) {
      setFormFeedback({ type: "error", message: "Enter your registered email address and password (minimum 8 characters)." });
      return;
    }
    if (!supabase) {
      setFormFeedback({ type: "error", message: "WE4ALL database is not configured. The connection checker is separate from sign-in; SMS is not required." });
      return;
    }
    setAuthState((state) => ({ ...state, busy: true }));
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const user = data?.user;
      if (!user?.id || !data?.session?.access_token) throw new Error("Supabase did not return a signed-in session.");
      const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("we4all_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("we4all_user_roles").select("role,status").eq("user_id", user.id)
      ]);
      if (profileError) throw profileError;
      if (rolesError) throw rolesError;
      const activation = await activateSupabaseAccount(user.id);
      if (!activation.ok) throw new Error(activation.reason || "Could not restore your Supabase account data.");
      if (activation.changed && typeof window !== "undefined") { window.location.reload(); return; }
      const customerRole = (roles || []).find((role) => role.role === "customer" && role.status === "approved");
      if (!customerRole) throw new Error("Customer role is not yet provisioned. Please contact WE4ALL support.");
      const baseUser = {
        id: user.id, authUserId: user.id, email: user.email || email,
        phone: user.phone || profile?.phone || "",
        fullName: profile?.full_name || user.user_metadata?.full_name || "",
        businessName: profile?.business_name || user.user_metadata?.business_name || "",
        area: profile?.area || user.user_metadata?.area || "", isGuest: false
      };
      if (selectedRoleKey !== "customer") {
        const approved = (roles || []).find((role) => role.role === selectedRoleKey && role.status === "approved");
        if (!approved) {
          const customer = { ...baseUser, role: "customer", status: "Approved" };
          setLocalUser(customer); setCurrentUser?.(customer); setActivePortal?.("customer"); onSelectRole?.("customer");
          setFormFeedback({ type: "error", message: `Your customer account is active. The ${selectedRoleKey.replace("_", " ")} portal is pending Founder approval.` });
          setSubTab("account_details"); return;
        }
        const { data: partner, error: partnerError } = await supabase.from("we4all_partners")
          .select("id,partner_type,approval_status,vehicle_class").eq("owner_user_id", user.id)
          .eq("partner_type", selectedRoleKey).eq("approval_status", "approved").maybeSingle();
        if (partnerError) throw partnerError;
        if (!partner) throw new Error("Your approved portal has no active partner profile.");
        const partnerUser = { ...baseUser, role: selectedRoleKey, partnerId: partner.id, vehicleCode: partner.vehicle_class === "4W" ? "4W_HEAVY" : (partner.vehicle_class || "UNVERIFIED"), status: "Approved" };
        setLocalUser(partnerUser); setCurrentUser?.(partnerUser);
        onPartnerAuthenticated?.(selectedRoleKey, partnerUser);
        setFormFeedback({ type: "success", message: `${selectedRoleKey.replace("_", " ")} portal access verified.` });
      } else {
        const customer = { ...baseUser, role: "customer", status: "Approved" };
        setLocalUser(customer); setCurrentUser?.(customer); setActivePortal?.("customer"); onSelectRole?.("customer");
        setFormFeedback({ type: "success", message: "Signed in. Your WE4ALL account is connected to Supabase." });
      }
      setSubTab("account_details");
    } catch (error) {
      setFormFeedback({ type: "error", message: error?.message || "Email/password sign-in failed." });
    } finally {
      setAuthState((state) => ({ ...state, busy: false }));
    }
  };

  const handleRegistrationSubmit = async () => {
    const email = String(regForm.email || "").trim().toLowerCase();
    const password = String(regForm.password || "");
    if (!regForm.fullName.trim()) { setFormFeedback({ type: "error", message: "Enter your full name." }); return; }
    if (!email.includes("@")) { setFormFeedback({ type: "error", message: "Enter a valid email address." }); return; }
    if (password.length < 8) { setFormFeedback({ type: "error", message: "Choose a password with at least 8 characters." }); return; }
    if (!isConsumerSelected && !regForm.businessName.trim()) { setFormFeedback({ type: "error", message: "Enter your business or partner name." }); return; }
    if (!supabase) { setFormFeedback({ type: "error", message: "WE4ALL database is not configured. SMS is not required for the database connection." }); return; }
    setOtpState((state) => ({ ...state, busy: true }));
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: {
          full_name: regForm.fullName.trim(),
          business_name: regForm.businessName.trim(),
          phone: cleanPhoneDigits(regForm.phone),
          area: regForm.area || ""
        } }
      });
      if (error) throw error;
      const user = data?.user;
      if (!user?.id) throw new Error("Supabase did not create an account.");
      if (!data.session) {
        setFormFeedback({
          type: "success",
          message: "Account registration started. Check your email for Supabase's free verification link, then return here and sign in. No SMS was sent."
        });
        setAuthMode("login");
        setLoginForm({ identifier: email, password: "" });
        setAuthState({ busy: false });
        return;
      }
      const profilePayload = {
        user_id: user.id, full_name: regForm.fullName.trim(),
        business_name: regForm.businessName.trim(),
        phone: cleanPhoneDigits(regForm.phone), area: regForm.area || "",
        updated_at: new Date().toISOString()
      };
      const { error: profileError } = await supabase.from("we4all_profiles").upsert(profilePayload, { onConflict: "user_id" });
      if (profileError) throw profileError;
      if (selectedRoleKey !== "customer") {
        const { error: applicationError } = await supabase.from("we4all_partner_applications").insert({
          user_id: user.id, requested_role: selectedRoleKey,
          application_payload: { full_name: profilePayload.full_name, business_name: profilePayload.business_name, phone: profilePayload.phone, area: profilePayload.area }
        });
        if (applicationError) throw applicationError;
      }
      const activation = await activateSupabaseAccount(user.id);
      if (!activation.ok) throw new Error(activation.reason || "Could not activate your WE4ALL account.");
      const customer = {
        id: user.id, authUserId: user.id, email,
        phone: profilePayload.phone, fullName: profilePayload.full_name,
        businessName: profilePayload.business_name, area: profilePayload.area,
        role: "customer", status: "Approved", isGuest: false
      };
      setLocalUser(customer); setCurrentUser?.(customer); setActivePortal?.("customer"); onSelectRole?.("customer");
      setSubTab("account_details");
      setFormFeedback({ type: "success", message: selectedRoleKey === "customer"
        ? "Customer account created and connected to WE4ALL."
        : "Customer account created. Your partner application is awaiting Founder approval." });
    } catch (error) {
      setFormFeedback({ type: "error", message: error?.message || "Could not complete registration." });
    } finally {
      setOtpState((state) => ({ ...state, busy: false }));
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
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Email address *</label>
                <input type="email" autoComplete="username" value={loginForm.identifier}
                  onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Password *</label>
                <input type="password" autoComplete="current-password" value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white" />
              </div>
              <p className="text-[10px] text-emerald-300">Free sign-in: SMS OTP is temporarily paused. Database connection is checked separately and never requires a text message.</p>
              <button type="button" onClick={handleLoginSubmit} disabled={authState.busy}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-2xl cursor-pointer shadow-lg text-xs">
                {otpState.busy ? "Signing in…" : "Sign in securely →"}
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

              <p className="text-[10px] text-emerald-300">No paid SMS is used. Supabase may send a free email confirmation link depending on your Auth settings. Your database connection is tested separately.</p>
              <button type="button" disabled={otpState.busy} onClick={handleRegistrationSubmit}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-2xl shadow text-xs">
                {otpState.busy ? "Creating account…" : "Create free WE4ALL account →"}
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
