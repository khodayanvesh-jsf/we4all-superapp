import React, { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import {
  loadCloudAndLocalState,
  performZeroLossOtaUpdate,
  getFounderCredentials,
  supabase,
  activateSupabaseAccount,
  clearActiveSupabaseAccount
} from "../supabaseClient";
import { GEO_ZONES } from "../data";
import SignaturePad from "./SignaturePad";
import { PARTNER_ROLE_FIELDS, getPartnerKycDocuments, validatePartnerRegistration } from "./workflows/partnerRegistration";

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
  const [loginMethod, setLoginMethod] = useState("pin"); // OTP is reserved for registration and PIN recovery
  const [selectedRoleKey, setSelectedRoleKey] = useState("customer");
  const [registrationRoleOptions, setRegistrationRoleOptions] = useState([ROLE_OPTIONS[0]]);
  const [showPinText, setShowPinText] = useState(false);

  const isConsumerSelected = selectedRoleKey === "customer";

  const [loginForm, setLoginForm] = useState({ identifier: "", pin: "" });

  const [regForm, setRegForm] = useState({
    fullName: "",
    businessName: "",
    phone: "",
    upiId: "",
    zoneId: "adilabad_master",
    area: "Subhash Nagar, Adilabad",
    pin: "",
    pinConfirm: "",
    partnerDetails: {}
  });

  const [formFeedback, setFormFeedback] = useState({ type: "", message: "" });
  const [otpState, setOtpState] = useState({ sent: false, phone: "", token: "", busy: false });
  const [trialChallengeId, setTrialChallengeId] = useState("");
  const [partnerApplication, setPartnerApplication] = useState(null);
  const [partnerApplicationLoading, setPartnerApplicationLoading] = useState(false);
  const [kycFiles, setKycFiles] = useState({});
  const [uploadedKycPaths, setUploadedKycPaths] = useState({});
  const [signatureMode, setSignatureMode] = useState("typed_name");
  const [signatureFile, setSignatureFile] = useState(null);
  const [signatureName, setSignatureName] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(() => {
    try { return typeof window !== "undefined" && window.localStorage.getItem("we4all_biometric_login_v1") === "enabled"; }
    catch { return false; }
  });
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycFeedback, setKycFeedback] = useState({ type: "", message: "" });
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
    (async () => {
      if (!supabase) return;
      const { data, error } = await supabase.from("we4all_registration_roles")
        .select("role_key,label").eq("enabled", true).order("sort_order");
      if (error) {
        console.warn("Could not load Founder-controlled registration roles:", error.message);
        return;
      }
      const known = new Map(ROLE_OPTIONS.map((role) => [role.id, role]));
      const activeRoles = (data || []).map((row) => {
        const baseline = known.get(row.role_key);
        return baseline ? { ...baseline, label: row.label || baseline.label } : null;
      }).filter(Boolean);
      if (!active) return;
      const safeRoles = activeRoles.some((role) => role.id === "customer") ? activeRoles : [ROLE_OPTIONS[0]];
      setRegistrationRoleOptions(safeRoles);
      setSelectedRoleKey((current) => safeRoles.some((role) => role.id === current) ? current : "customer");
    })().catch((error) => console.warn("Registration role list could not be loaded:", error?.message || error));
    return () => { active = false; };
  }, []);


  useEffect(() => {
    let active = true;
    const loadLatestPartnerApplication = async () => {
      if (!supabase || !localUser?.authUserId || localUser.isGuest) {
        setPartnerApplication(null);
        return;
      }
      setPartnerApplicationLoading(true);
      try {
        const { data, error } = await supabase
          .from("we4all_partner_applications")
          .select("id,requested_role,application_payload,status,created_at,reviewed_at")
          .eq("user_id", localUser.authUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (active) {
          setPartnerApplication(data || null);
          setUploadedKycPaths(data?.application_payload?.kyc?.files || {});
          if (!signatureName) setSignatureName(data?.application_payload?.full_name || localUser.fullName || "");
        }
      } catch (error) {
        if (active) setKycFeedback({ type: "error", message: error?.message || "Could not load your partner application." });
      } finally {
        if (active) setPartnerApplicationLoading(false);
      }
    };
    loadLatestPartnerApplication();
    return () => { active = false; };
  }, [localUser?.authUserId, localUser?.isGuest]);

  const handleKycFileChange = (key, file) => {
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setKycFeedback({ type: "error", message: "Choose a PDF, JPG, PNG, or WebP file." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setKycFeedback({ type: "error", message: "Each document must be 10 MB or smaller." });
      return;
    }
    setKycFiles((current) => ({ ...current, [key]: file }));
    setKycFeedback({ type: "", message: "" });
  };

  const uploadKycObject = async (file, key, applicationId) => {
    const extension = String(file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${localUser.authUserId}/${applicationId}/${key}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from(KYC_BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: "60",
      upsert: false
    });
    if (error) throw error;
    return path;
  };

  const submitPartnerKyc = async () => {
    if (!supabase || !partnerApplication?.id || partnerApplication.status !== "pending") return;
    if (!termsAccepted) {
      setKycFeedback({ type: "error", message: "Read the trial declaration and confirm before sending your documents." });
      return;
    }
    const signerName = String(signatureName || "").trim();
    if (signerName.length < 2 || (signatureMode !== "typed_name" && !signatureFile && !kycFiles.signature)) {
      setKycFeedback({ type: "error", message: "Add your full name and complete the selected signature method." });
      return;
    }
    const kycDocuments = getPartnerKycDocuments(partnerApplication.requested_role);
    if (!kycDocuments.length || kycDocuments.some(({ key }) => !kycFiles[key] && !uploadedKycPaths[key])) {
      setKycFeedback({ type: "error", message: "Add each document listed for your partner role before submitting." });
      return;
    }

    setKycSubmitting(true);
    setKycFeedback({ type: "info", message: "Uploading securely. Keep this screen open until submission finishes." });
    try {
      const nextPaths = { ...uploadedKycPaths };
      for (const { key } of kycDocuments) {
        if (kycFiles[key]) nextPaths[key] = await uploadKycObject(kycFiles[key], key, partnerApplication.id);
      }
      let signaturePath = "";
      const signatureToUpload = signatureFile || kycFiles.signature;
      if (signatureMode !== "typed_name" && signatureToUpload) {
        signaturePath = await uploadKycObject(signatureToUpload, "signature", partnerApplication.id);
      }
      setUploadedKycPaths(nextPaths);
      const signatureMethod = signatureMode === "drawn" ? "drawn_image" : signatureMode === "uploaded" ? "uploaded_image" : "typed_name";
      const { data, error } = await supabase.functions.invoke("we4all-submit-partner-kyc", {
        body: {
          application_id: partnerApplication.id,
          files: nextPaths,
          signature: {
            method: signatureMethod,
            signer_name: signerName,
            path: signaturePath || null
          },
          terms_accepted: true,
          terms_version: PARTNER_TERMS_VERSION
        }
      });
      if (error) throw error;
      if (data?.ok !== true) throw new Error(data?.error || "Your documents could not be submitted.");
      setPartnerApplication((current) => ({
        ...current,
        application_payload: {
          ...current.application_payload,
          kyc: {
            files: nextPaths,
            signature: { method: signatureMethod, signer_name: signerName, path: signaturePath || null },
            terms: { accepted: true, version: data.terms_version, accepted_at: data.submitted_at },
            submitted_at: data.submitted_at,
            status: "submitted"
          }
        }
      }));
      setKycFiles({});
      setKycFeedback({ type: "success", message: "Documents received. Your role stays private until an authorized reviewer finishes the checks." });
    } catch (error) {
      setKycFeedback({ type: "error", message: error?.message || "Secure document submission failed. Your account is still available; retry when connected." });
    } finally {
      setKycSubmitting(false);
    }
  };

  const cleanPhoneDigits = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.slice(0, 10);
  };

  const normalizeUpiId = (rawUpi, fallbackPhone) => {
    const trimmed = String(rawUpi || "").trim();
    if (trimmed && trimmed.includes("@")) return trimmed;
    return fallbackPhone ? `${fallbackPhone}@ybl` : "";
  };

  const cleanPinDigits = (value) => String(value || "").replace(/\D/g, "");

  const sendPhoneOtp = async () => {
    if (authMode !== "register" && loginMethod !== "otp") {
      setFormFeedback({ type: "error", message: "Phone verification is used only for registration or PIN recovery." });
      return;
    }
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
        if (!/^\d{6}$/.test(regForm.pin)) throw new Error("Create a 6-digit sign-in PIN.");
        if (regForm.pin !== regForm.pinConfirm) throw new Error("The two PIN entries do not match.");
        if (!isConsumerSelected && !regForm.businessName.trim()) throw new Error("Enter your business or partner name.");
        if (!isConsumerSelected) {
          const detailsError = validatePartnerRegistration(selectedRoleKey, regForm.partnerDetails);
          if (detailsError) throw new Error(detailsError);
        }
        if (import.meta.env.VITE_WE4ALL_TRIAL_OTP_MODE === "true") {
          const { data, error } = await supabase.functions.invoke("we4all-trial-otp-auth", {
            body: {
              action: "request", phone, requested_role: selectedRoleKey,
              full_name: regForm.fullName.trim(), business_name: regForm.businessName.trim(),
              area: regForm.area || "", zone_id: regForm.zoneId
            }
          });
          if (error) throw new Error(data?.error || error.message || "Trial OTP service is unavailable.");
          if (data?.ok !== true || !data.challenge_id || !/^\d{6}$/.test(String(data.trial_code || ""))) {
            throw new Error(data?.error || "Trial OTP service returned an invalid challenge.");
          }
          setTrialChallengeId(data.challenge_id);
          setOtpState({ sent: true, phone, token: String(data.trial_code), busy: false });
          setFormFeedback({ type: "success", message: `Trial code generated by WE4ALL server: ${data.trial_code}. This is not proof of phone ownership; use this mode only for private testing.` });
          return;
        }
        setTrialChallengeId("");
        const { error } = await supabase.auth.signInWithOtp({
          phone,
          options: {
            shouldCreateUser: true,
            data: {
              full_name: regForm.fullName.trim(),
              business_name: regForm.businessName.trim(),
            area: regForm.area || "",
            requested_role: selectedRoleKey,
            zone_id: regForm.zoneId
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
      setFormFeedback({ type: "success", message: `SMS verification code sent to +91 ${phoneDigits}. Enter it below to ${isRegistration ? "create your account" : "set a new PIN"}.` });
    } catch (error) {
      setOtpState({ sent: false, phone: "", token: "", busy: false });
      setFormFeedback({
        type: "error",
        message: error?.message || "Could not send SMS OTP. Check that Phone Auth and an SMS provider are enabled in Supabase."
      });
    }
  };

  const handleLoginSubmit = async () => {
    const phoneDigits = cleanPhoneDigits(loginForm.identifier);
    if (phoneDigits.length !== 10) {
      setFormFeedback({ type: "error", message: "Enter the 10-digit mobile number used for this account." });
      return;
    }
    if (loginMethod === "otp" && (!otpState.sent || otpState.token.trim().length !== 6 || !/^\d{6}$/.test(loginForm.pin))) {
      setFormFeedback({ type: "error", message: "Request a phone verification code and enter it with your new 6-digit PIN." });
      return;
    }
    if (loginMethod === "pin" && !/^\d{6}$/.test(loginForm.pin)) {
      setFormFeedback({ type: "error", message: "Enter your 6-digit PIN." });
      return;
    }
    setOtpState((s) => ({ ...s, busy: true }));
    try {
      const phone = `+91${phoneDigits}`;
      let data;
      if (loginMethod === "otp") {
        const verified = await supabase.auth.verifyOtp({ phone, token: otpState.token.trim(), type: "sms" });
        if (verified.error) throw verified.error;
        data = verified.data;
        const pinUpdate = await supabase.auth.updateUser({ password: loginForm.pin });
        if (pinUpdate.error) throw pinUpdate.error;
      } else {
        const signedIn = await supabase.auth.signInWithPassword({ phone, password: loginForm.pin });
        if (signedIn.error) throw signedIn.error;
        data = signedIn.data;
        if (biometricEnabled && Capacitor.isNativePlatform()) {
          try {
            await BiometricAuth.authenticate({ reason: "Confirm your WE4ALL sign-in", cancelTitle: "Use PIN" });
          } catch (biometricError) {
            await supabase.auth.signOut({ scope: "local" });
            throw new Error(biometricError?.message || "Biometric check was cancelled. Sign in again with your PIN.");
          }
        }
      }
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
        phone: user.phone || profile?.phone || phone.replace("+91", ""),
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
    if (selectedRoleKey !== "customer") {
      const detailsError = validatePartnerRegistration(selectedRoleKey, regForm.partnerDetails);
      if (detailsError) {
        setFormFeedback({ type: "error", message: detailsError });
        return;
      }
    }
    if (!otpState.sent || otpState.token.trim().length < 6) {
      setFormFeedback({ type: "error", message: "Request an SMS OTP and enter the six-digit code." });
      return;
    }
    try {
      setOtpState((s) => ({ ...s, busy: true }));
      let data;
      const isTrialRegistration = Boolean(trialChallengeId);
      if (isTrialRegistration) {
        const { data: trialData, error } = await supabase.functions.invoke("we4all-trial-otp-auth", {
          body: {
            action: "verify", phone: otpState.phone, challenge_id: trialChallengeId,
            code: otpState.token.trim(), pin: regForm.pin, requested_role: selectedRoleKey,
            full_name: regForm.fullName.trim(), business_name: regForm.businessName.trim(),
            area: regForm.area || "", zone_id: regForm.zoneId
          }
        });
        if (error) throw new Error(trialData?.error || error.message || "Could not verify trial code.");
        if (trialData?.ok !== true || !trialData.session?.access_token || !trialData.session?.refresh_token) {
          throw new Error(trialData?.error || "Trial registration did not return a server-authenticated session.");
        }
        const { error: sessionError } = await supabase.auth.setSession({ access_token: trialData.session.access_token, refresh_token: trialData.session.refresh_token });
        if (sessionError) throw sessionError;
        data = trialData;
      } else {
        const verified = await supabase.auth.verifyOtp({ phone: otpState.phone, token: otpState.token.trim(), type: "sms" });
        if (verified.error) throw verified.error;
        data = verified.data;
      }
      const user = data?.user;
      if (!user?.id || !data?.session?.access_token) throw new Error("Supabase did not return a verified account.");
      if (!isTrialRegistration) {
        const pinUpdate = await supabase.auth.updateUser({ password: regForm.pin });
        if (pinUpdate.error) throw pinUpdate.error;
      }
      setTrialChallengeId("");
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
            area: profilePayload.area,
            zone_id: regForm.zoneId,
            partner_details: regForm.partnerDetails || {}
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

  const handleBiometricSetup = async () => {
    try {
      if (biometricEnabled) {
        window.localStorage.removeItem("we4all_biometric_login_v1");
        setBiometricEnabled(false);
        setFormFeedback({ type: "success", message: "Biometric sign-in has been turned off on this device." });
        return;
      }
      if (!Capacitor.isNativePlatform()) {
        setFormFeedback({ type: "error", message: "Biometric sign-in is available in the Android/iOS app after the native build is installed." });
        return;
      }
      const availability = await BiometricAuth.checkBiometry();
      if (!availability?.isAvailable) throw new Error("No enrolled device biometric is available. Set up fingerprint or face unlock in device settings first.");
      await BiometricAuth.authenticate({ reason: "Enable biometric confirmation for WE4ALL sign-in", cancelTitle: "Cancel" });
      window.localStorage.setItem("we4all_biometric_login_v1", "enabled");
      setBiometricEnabled(true);
      setFormFeedback({ type: "success", message: "Biometric confirmation is enabled on this device. Your PIN remains available as a fallback." });
    } catch (error) {
      setFormFeedback({ type: "error", message: error?.message || "Could not enable device biometrics." });
    }
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

      {/* Account Navigation Tabs */}
      <div className={`grid ${partnerApplication ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3"} gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800`}>
        {[
          { id: isLoggedIn ? "account_details" : "kyc_gate", label: isLoggedIn ? "📋 Account Details" : "🔐 Login / Register" },
          { id: "profile_upi", label: "✏️ Profile & UPI" },
          { id: "addresses", label: "📍 Addresses" },
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
                  {registrationRoleOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={loginForm.identifier}
                  onChange={(e) => setLoginForm({ ...loginForm, identifier: cleanPhoneDigits(e.target.value) })}
                  placeholder="10-digit mobile number"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
                />
              </div>

              {loginMethod === "pin" && (
                <label className="block text-[10px] text-slate-400 font-bold">6-digit sign-in PIN *
                  <input type={showPinText ? "text" : "password"} inputMode="numeric" autoComplete="current-password" maxLength={6} value={loginForm.pin} onChange={(e) => setLoginForm({ ...loginForm, pin: cleanPinDigits(e.target.value).slice(0, 6) })} placeholder="••••••" className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-emerald-300 font-mono text-center tracking-widest text-sm font-black" />
                </label>
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
                      placeholder={trialChallengeId ? "Server-generated trial code" : "Enter 6-digit SMS code"}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-center font-black tracking-widest"
                    />
                  )}
                  <p className="text-[10px] text-slate-400">{trialChallengeId ? "Trial-only code generated by the WE4ALL server. It does not verify phone ownership and must not be used for real registrations." : "Codes are issued and verified by Supabase Auth. OTP is used for registration or PIN recovery; normal sign-in uses your PIN."}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleLoginSubmit}
                disabled={otpState.busy || (loginMethod === "pin" && (loginForm.pin.length !== 6 || cleanPhoneDigits(loginForm.identifier).length !== 10)) || (loginMethod === "otp" && (!otpState.sent || otpState.token.length !== 6 || loginForm.pin.length !== 6))}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl cursor-pointer shadow-lg text-xs"
              >
                {loginMethod === "otp" ? "Verify phone & set PIN →" : "Sign in securely →"}
              </button>
              <button type="button" onClick={() => { const next = loginMethod === "pin" ? "otp" : "pin"; setLoginMethod(next); setOtpState({ sent: false, phone: "", token: "", busy: false }); setFormFeedback({ type: "", message: "" }); }} className="w-full text-emerald-300 text-[10px] font-bold underline">
                {loginMethod === "otp" ? "Back to PIN login" : "First sign-in or forgot PIN? Verify phone once"}
              </button>
              {loginMethod === "otp" && (
                <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-[10px] text-slate-300">
                  <button type="button" disabled={otpState.busy} onClick={sendPhoneOtp} className="w-full rounded-xl bg-amber-400 px-3 py-2 font-black text-slate-950">{otpState.busy ? "Sending…" : otpState.sent ? "Resend phone code" : "Send one-time phone code"}</button>
                  {otpState.sent && <input aria-label="Phone verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otpState.token} onChange={(e) => setOtpState({ ...otpState, token: e.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="6-digit verification code" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-center font-mono tracking-widest text-white" />}
                  <p>OTP is used only to create an account or recover a forgotten PIN. Normal sign-in uses your PIN.</p>
                </div>
              )}
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

              {!isConsumerSelected && (PARTNER_ROLE_FIELDS[selectedRoleKey] || []).length > 0 && (
                <fieldset className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
                  <legend className="px-1 text-xs font-black text-amber-200">Details for your {ROLE_OPTIONS.find((role) => role.id === selectedRoleKey)?.label.replace(/^\S+\s*/, "") || "partner"} role</legend>
                  {(PARTNER_ROLE_FIELDS[selectedRoleKey] || []).map((field) => {
                    const value = regForm.partnerDetails?.[field.key] || "";
                    const inputClass = "mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-sm text-white placeholder:text-slate-500";
                    return (
                      <label key={field.key} className="block text-[11px] font-bold text-slate-200">
                        {field.label}{field.required ? " *" : ""}
                        {field.kind === "select" ? (
                          <select required={field.required} value={value} onChange={(event) => setRegForm((current) => ({ ...current, partnerDetails: { ...current.partnerDetails, [field.key]: event.target.value } }))} className={inputClass}>
                            <option value="">Choose one</option>
                            {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        ) : field.kind === "textarea" ? (
                          <textarea rows={3} value={value} onChange={(event) => setRegForm((current) => ({ ...current, partnerDetails: { ...current.partnerDetails, [field.key]: event.target.value } }))} placeholder={field.placeholder || ""} className={inputClass} />
                        ) : (
                          <input type={field.kind || "text"} min={field.kind === "number" ? "0" : undefined} step={field.kind === "number" ? "1" : undefined} required={field.required} value={value} onChange={(event) => setRegForm((current) => ({ ...current, partnerDetails: { ...current.partnerDetails, [field.key]: event.target.value } }))} placeholder={field.placeholder || ""} className={inputClass} />
                        )}
                      </label>
                    );
                  })}
                  <p className="text-[10px] text-slate-400">Do not enter bank passwords, card details, OTPs, or payment gateway credentials here. Payment account setup is a separate later step.</p>
                </fieldset>
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
                maxLength={100}
                value={regForm.area}
                onChange={(e) => setRegForm({ ...regForm, area: e.target.value })}
                placeholder="Area / address"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              />

              {!isConsumerSelected && (
                <label className="block text-[10px] text-slate-300 font-bold">
                  Operational city / service zone
                  <select
                    value={regForm.zoneId}
                    onChange={(e) => setRegForm({ ...regForm, zoneId: e.target.value })}
                    className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  >
                    {GEO_ZONES.filter((zone) => zone.active).map((zone) => (
                      <option key={zone.id} value={zone.id === "adilabad" ? "adilabad_master" : zone.id}>{zone.name}</option>
                    ))}
                  </select>
                  <span className="mt-1 block font-normal text-slate-400">Partner operations are tied to this city. Personal shopping remains available from the Customer portal.</span>
                </label>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[10px] text-slate-300 font-bold">Create 6-digit sign-in PIN *
                  <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={regForm.pin} onChange={(e) => setRegForm({ ...regForm, pin: cleanPinDigits(e.target.value).slice(0, 6) })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-center font-mono tracking-widest text-white" placeholder="••••••" />
                </label>
                <label className="text-[10px] text-slate-300 font-bold">Confirm PIN *
                  <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={regForm.pinConfirm} onChange={(e) => setRegForm({ ...regForm, pinConfirm: cleanPinDigits(e.target.value).slice(0, 6) })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-center font-mono tracking-widest text-white" placeholder="••••••" />
                </label>
              </div>
              <p className="text-[10px] text-slate-400">You will use your mobile number and PIN for normal sign-in. Phone OTP is only for account creation and PIN recovery.</p>

              <div className="space-y-2">
                <button
                  type="button"
                  disabled={otpState.busy}
                  onClick={sendPhoneOtp}
                  className="w-full bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-2 rounded-xl"
                >
                  {otpState.sent ? (trialChallengeId ? "Generate new trial code" : "Resend Registration OTP") : (import.meta.env.VITE_WE4ALL_TRIAL_OTP_MODE === "true" ? "Generate Trial OTP" : "Send Registration OTP")}
                </button>
                {otpState.sent && (
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpState.token}
                    onChange={(e) => setOtpState({ ...otpState, token: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    placeholder={trialChallengeId ? "Server-generated trial code" : "Enter 6-digit SMS code"}
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
