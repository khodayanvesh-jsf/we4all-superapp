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
  bootstrapCustomerAccount
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
    savedAddresses,
    setSavedAddresses,
    addressBook = [],
    setAddressBook,
    activeAddressId,
    setActiveAddressId,
    selectedAddressId,
    setSelectedAddressId,
    activeAddressObj,
    brightTheme,
    setBrightTheme,
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
  const [loginMethod, setLoginMethod] = useState("pin");
  const [selectedRoleKey, setSelectedRoleKey] = useState("customer");
  const [registrationRoleOptions, setRegistrationRoleOptions] = useState(ROLE_OPTIONS);
  const [showPinText, setShowPinText] = useState(false);

  const isConsumerSelected = selectedRoleKey === "customer";
  // Private test builds may explicitly opt in. Public builds use email registration.
  const [privateTestMode, setPrivateTestMode] = useState(false);
  const [privateTestPass, setPrivateTestPass] = useState("");
  const privateTestSession = useRef(null);
  const [pilotInstantMode, setPilotInstantMode] = useState(false);
  const envTrialOtpMode = import.meta.env.VITE_WE4ALL_TRIAL_OTP_MODE === "true";
  const trialOtpModeEnabled = !privateTestMode && (pilotInstantMode || envTrialOtpMode);
  const resolvedAddresses = Array.isArray(savedAddresses) && savedAddresses.length > 0 ? savedAddresses : (Array.isArray(addressBook) ? addressBook : []);
  const updateAddresses = setSavedAddresses || setAddressBook || (() => {});
  const resolvedActiveAddressId = activeAddressId ?? selectedAddressId ?? (resolvedAddresses[0]?.id || "");
  const updateActiveAddressId = setActiveAddressId || setSelectedAddressId || (() => {});
  const [profileEditForm, setProfileEditForm] = useState({
    fullName: "",
    phone: "",
    area: "",
    upiId: "",
    bankName: "",
    accountNumber: "",
    ifscCode: ""
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState({
    label: "Home",
    fullAddress: "",
    area: "Adilabad Town",
    phone: ""
  });

  const [loginForm, setLoginForm] = useState({ identifier: "", pin: "" });

  const [regForm, setRegForm] = useState({
    fullName: "",
    businessName: "",
    phone: "",
    email: "",
    upiId: "",
    zoneId: "",
    area: "",
    pin: "",
    pinConfirm: "",
    partnerDetails: {}
  });

  const [formFeedback, setFormFeedback] = useState({ type: "", message: "" });
  const [businessLocation, setBusinessLocation] = useState({ latitude: null, longitude: null });
  const [locationBusy, setLocationBusy] = useState(false);
  const [otpState, setOtpState] = useState({ sent: false, phone: "", token: "", busy: false });
  const [trialChallengeId, setTrialChallengeId] = useState("");
  const otpInputRef = useRef(null);
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
    if (!otpState.sent) return undefined;
    otpInputRef.current?.focus();

    return undefined;
  }, [otpState.sent]);
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
      const activation = await activateSupabaseAccount(user.id);
      if (!activation.ok) throw new Error(activation.reason || "Could not restore your Supabase account data.");
      if (activation.changed && typeof window !== "undefined") {
        window.location.reload();
        return;
      }
      const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("we4all_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("we4all_user_roles").select("role,status").eq("user_id", user.id)
      ]);
      if (profileError) throw profileError;
      if (rolesError) throw rolesError;
      let customerRole = (roles || []).find((item) => item.role === "customer" && item.status === "approved");
      if (!customerRole) {
        const boot = await bootstrapCustomerAccount({
          fullName: profile?.full_name || user.user_metadata?.full_name || "Customer",
          phone: user.phone || profile?.phone || "",
          area: profile?.area || user.user_metadata?.area || "Adilabad"
        });
        if (boot?.ok) customerRole = { role: "customer", status: "approved" };
      }
      if (!customerRole) throw new Error("Verified Supabase session has no approved customer role.");
      const preferredRole = currentUser?.authUserId === user.id ? currentUser.role : "customer";
      const approvedRole = (roles || []).find((item) => item.role === preferredRole && item.status === "approved");
      const resolvedRole = approvedRole?.role || "customer";
      let partnerRecord = null;
      if (resolvedRole !== "customer") {
        const { data, error: partnerError } = await supabase
          .from("we4all_partners")
          .select("id,partner_type,approval_status,market_id,zone_id")
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
        marketId: partnerRecord?.market_id || partnerRecord?.zone_id || "",
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
      const safeRoles = activeRoles.some((role) => role.id === "customer") ? activeRoles : ROLE_OPTIONS;
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
      if (error) throw new Error(await getFunctionResponseError(error, "Your documents could not be submitted."));
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

  const captureBusinessLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This device does not provide location access. Enter your area and try another device."));
    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition((position) => {
      const latitude = Number(position.coords.latitude.toFixed(6));
      const longitude = Number(position.coords.longitude.toFixed(6));
      const marketId = marketCellId(latitude, longitude);
      setBusinessLocation({ latitude, longitude });
      setRegForm((current) => ({ ...current, zoneId: marketId, area: current.area || "Pinned business location" }));
      setFormFeedback({ type: "success", message: "Business location saved. WE4ALL will create or join its local market automatically." });
      setLocationBusy(false);
      resolve({ latitude, longitude, marketId });
    }, (error) => {
      setLocationBusy(false);
      reject(new Error(error?.code === 1 ? "Allow location permission to continue partner registration." : "Could not read your business location. Try again or enable device location."));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  });

  const sendRegistrationCode = async () => {
    const phone = accountLoginIdentity(regForm.phone)?.phone || "";
    const email = realAccountEmail(regForm.email);
    if (!supabase || (!trialOtpModeEnabled && !email) || (trialOtpModeEnabled && !phone)) {
      setFormFeedback({ type: "error", message: "Enter a valid registration contact and check your connection." });
      return;
    }
    if (!regForm.fullName.trim() || !/^\d{6}$/.test(regForm.pin) || regForm.pin !== regForm.pinConfirm) {
      setFormFeedback({ type: "error", message: "Enter your full name and two matching six-digit PINs." });
      return;
    }
    if (!isConsumerSelected) {
      const missingLocation = !Number.isFinite(businessLocation.latitude) || !Number.isFinite(businessLocation.longitude);
      const message = !regForm.businessName.trim() ? "Enter your business or partner name."
        : missingLocation ? "Add your business GPS location."
        : validatePartnerRegistration(selectedRoleKey, regForm.partnerDetails);
      if (message) {
        setFormFeedback({ type: "error", message });
        return;
      }
    }
    setOtpState((previous) => ({ ...previous, busy: true, token: "" }));
    try {
      if (trialOtpModeEnabled) {
        const { data, error } = await supabase.functions.invoke("we4all-trial-otp-auth", {
          body: {
            action: "request", phone, requested_role: selectedRoleKey,
            full_name: regForm.fullName.trim(), business_name: regForm.businessName.trim(),
            area: regForm.area || "", zone_id: regForm.zoneId,
            latitude: businessLocation.latitude, longitude: businessLocation.longitude
          }
        });
        if (error) throw new Error(await getFunctionResponseError(error, "Trial code service is unavailable."));
        if (data?.ok !== true || !data.challenge_id || !/^\d{6}$/.test(String(data.trial_code || ""))) {
          throw new Error("Trial code service returned an invalid challenge.");
        }
        setTrialChallengeId(data.challenge_id);
        setOtpState({ sent: true, phone, token: String(data.trial_code), busy: false });
        setFormFeedback({ type: "success", message: "Private test code filled in. This code does not verify phone ownership." });
        return;
      }

      const metadata = {
        full_name: regForm.fullName.trim(),
        business_name: regForm.businessName.trim(),
        area: regForm.area || ""
      };
      const result = otpState.sent && otpState.email === email
        ? await supabase.auth.resend({ type: "signup", email })
        : await supabase.auth.signUp({ email, password: regForm.pin, options: { data: metadata } });
      if (result.error?.code === "email_address_not_authorized" || result.error?.code === "over_email_send_rate_limit") {
        throw new Error("WE4ALL cannot send your email code right now. For a private trial, use a test pass issued by the Founder.");
      }
      if (result.error) throw result.error;
      if (result.data?.session && result.data?.user?.id) {
        // When Supabase email confirmation is turned off for frictionless pilot testing, complete registration immediately!
        await bootstrapCustomerAccount({
          fullName: regForm.fullName.trim(),
          phone,
          area: regForm.area || "Adilabad"
        });
        const instantUser = {
          id: result.data.user.id,
          authUserId: result.data.user.id,
          phone,
          fullName: regForm.fullName.trim(),
          businessName: regForm.businessName.trim(),
          area: regForm.area || "Adilabad",
          upiId: normalizeUpiId(regForm.upiId, cleanPhoneDigits(regForm.phone)),
          role: "customer",
          status: "Approved",
          isGuest: false
        };
        if (selectedRoleKey !== "customer") {
          const loc = Number.isFinite(businessLocation.latitude) ? businessLocation : { latitude: 19.6641, longitude: 78.532 };
          const mId = marketCellId(loc.latitude, loc.longitude) || "m_393_1571";
          await supabase.rpc("we4all_register_market", {
            p_latitude: loc.latitude,
            p_longitude: loc.longitude,
            p_display_name: regForm.area || `Local market ${mId}`,
            p_state_name: "Telangana"
          }).catch(() => {});
          await supabase.from("we4all_partner_applications").insert({
            user_id: result.data.user.id,
            requested_role: selectedRoleKey,
            application_payload: {
              full_name: regForm.fullName.trim(),
              business_name: regForm.businessName.trim(),
              phone,
              area: regForm.area || "Adilabad",
              zone_id: regForm.zoneId || mId,
              market_id: mId,
              latitude: loc.latitude,
              longitude: loc.longitude,
              partner_details: regForm.partnerDetails || {}
            }
          });
        }
        await activateSupabaseAccount(result.data.user.id);
        setOtpState({ sent: false, phone: "", token: "", busy: false });
        setLocalUser(instantUser);
        setCurrentUser?.(instantUser);
        setActivePortal?.("customer");
        onSelectRole?.("customer");
        setSubTab("account_details");
        setFormFeedback({
          type: "success",
          message: selectedRoleKey === "customer"
            ? "Account created and signed in immediately!"
            : "Account created! Your partner application is saved as pending Founder review; complete KYC in the Partner Application tab."
        });
        return;
      }
      setTrialChallengeId("");
      setOtpState({ sent: true, phone, email, token: "", busy: false });
      setFormFeedback({ type: "success", message: "Check your email inbox for the registration code. If you already have an account, use Sign in or Forgot PIN." });
    } catch (error) {
      setOtpState((previous) => ({ ...previous, busy: false }));
      setFormFeedback({ type: "error", message: error?.message || "Could not send your registration code." });
    }
  };

  const handleLoginSubmit = async () => {
    const identity = accountLoginIdentity(loginForm.identifier);
    if (!identity || !supabase || !/^\d{6}$/.test(loginForm.pin)) {
      setFormFeedback({ type: "error", message: "Enter your mobile number or verified email and your six-digit PIN." });
      return;
    }
    setOtpState((state) => ({ ...state, busy: true }));
    try {
      const signedIn = await supabase.auth.signInWithPassword({ ...identity, password: loginForm.pin });
      let data = signedIn.data;
      if (identity.phone && signedIn.error) {
        const digits10 = cleanPhoneDigits(identity.phone);
        const pilotAlias = digits10.length === 10 ? `pilot.${digits10}@we4all.app` : "";
        let recoveredSession = null;
        if (pilotAlias) {
          const aliasTry = await supabase.auth.signInWithPassword({ email: pilotAlias, password: loginForm.pin });
          if (!aliasTry.error && aliasTry.data?.session?.access_token) {
            recoveredSession = aliasTry.data;
          }
        }
        if (!recoveredSession) {
          const trial = await supabase.functions.invoke("we4all-trial-otp-auth", {
            body: { action: "trial_pin_login", phone: identity.phone, pin: loginForm.pin }
          });
          if (!trial.error && trial.data?.session?.access_token && trial.data?.session?.refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token: trial.data.session.access_token,
              refresh_token: trial.data.session.refresh_token
            });
            if (!error) recoveredSession = trial.data;
          }
        }
        if (!recoveredSession) {
          throw new Error("Mobile sign-in could not verify this number and PIN. Check your 6-digit PIN or register a new account.");
        }
        data = recoveredSession;
      } else if (signedIn.error) {
        throw new Error("Could not sign in. Check your login and PIN or use Forgot PIN.");
      }
      if (biometricEnabled && Capacitor.isNativePlatform()) {
        try {
          await BiometricAuth.authenticate({ reason: "Confirm your WE4ALL sign-in", cancelTitle: "Use PIN" });
        } catch (error) {
          await supabase.auth.signOut({ scope: "local" });
          throw new Error(error?.message || "Biometric check was cancelled. Sign in again with your PIN.");
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

      let customerRole = (roles || []).find((r) => r.role === "customer" && r.status === "approved");
      if (!customerRole) {
        const boot = await bootstrapCustomerAccount({
          fullName: profile?.full_name || user.user_metadata?.full_name || "Customer",
          phone: user.phone || profile?.phone || "",
          area: profile?.area || user.user_metadata?.area || "Adilabad"
        });
        if (boot?.ok) customerRole = { role: "customer", status: "approved" };
      }
      const baseUser = {
        id: user.id,
        authUserId: user.id,
        phone: user.phone || profile?.phone || "",
        fullName: profile?.full_name || user.user_metadata?.full_name || "",
        businessName: profile?.business_name || user.user_metadata?.business_name || "",
        area: profile?.area || user.user_metadata?.area || "",
        upiId: profile?.upi_id || user.user_metadata?.upi_id || "",
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
          .select("id,partner_type,approval_status,market_id,zone_id")
          .eq("owner_user_id", user.id)
          .eq("partner_type", requestedRole)
          .eq("approval_status", "approved")
          .maybeSingle();
        if (partnerError) throw partnerError;
        if (!partnerRecord) throw new Error("Founder-approved role has no active WE4ALL partner profile yet.");
        const partnerUser = { ...baseUser, role: requestedRole, partnerId: partnerRecord.id, marketId: partnerRecord.market_id || partnerRecord.zone_id || "", status: "Approved" };
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
      setFormFeedback({ type: "success", message: "Signed in to your WE4ALL account." });
      setSubTab("account_details");
    } catch (error) {
      setFormFeedback({ type: "error", message: error?.message || "Sign-in failed." });
    } finally {
      setOtpState((s) => ({ ...s, busy: false }));
    }
  };

  const handleRegistrationSubmit = async () => {
    if (selectedRoleKey !== "customer") {
        if (!Number.isFinite(businessLocation.latitude) || !Number.isFinite(businessLocation.longitude)) {
          setFormFeedback({ type: "error", message: "Add your business GPS location before submitting partner registration." });
          return;
        }
      const detailsError = validatePartnerRegistration(selectedRoleKey, regForm.partnerDetails);
      if (detailsError) {
        setFormFeedback({ type: "error", message: detailsError });
        return;
      }
    }
    if (privateTestMode && (!regForm.fullName.trim() || !/^\d{6}$/.test(regForm.pin) || regForm.pin !== regForm.pinConfirm ||
        (!privateTestSession.current && !/^[a-f0-9]{56}$/i.test(privateTestPass.trim())))) {
      setFormFeedback({ type: "error", message: "Enter your name, two matching six-digit PINs and the Founder test pass." });
      return;
    }
    if (!privateTestMode && (!otpState.sent || !/^\d{6,10}$/.test(otpState.token.trim()))) {
      setFormFeedback({ type: "error", message: "Request a registration code and enter the code you received." });
      return;
    }
    try {
      setOtpState((s) => ({ ...s, busy: true }));
      let data;
      const isTrialRegistration = Boolean(trialChallengeId);
      if (privateTestMode) {
        if (!privateTestSession.current) {
          const verified = await supabase.auth.verifyOtp({ token_hash: privateTestPass.trim(), type: "signup" });
          if (verified.error) throw new Error("This test pass is invalid, expired, or already used. Ask the Founder for a fresh pass.");
          const trialUser = verified.data?.user;
          if (trialUser?.app_metadata?.we4all_trial_account !== true ||
              !/^trial-[a-f0-9]{32}@trial\.we4all\.invalid$/.test(trialUser.email || "")) {
            await supabase.auth.signOut({ scope: "local" });
            throw new Error("Use the private pass issued for a WE4ALL trial account.");
          }
          privateTestSession.current = verified.data;
        }
        data = privateTestSession.current;
        const { error: pinError } = await supabase.auth.updateUser({ password: regForm.pin });
        if (pinError) throw pinError;
      } else if (isTrialRegistration) {
        const { data: trialData, error } = await supabase.functions.invoke("we4all-trial-otp-auth", {
          body: {
            action: "verify", phone: otpState.phone, challenge_id: trialChallengeId,
            code: otpState.token.trim(), pin: regForm.pin, requested_role: selectedRoleKey,
            full_name: regForm.fullName.trim(), business_name: regForm.businessName.trim(),
            area: regForm.area || "", zone_id: regForm.zoneId,
            latitude: businessLocation.latitude, longitude: businessLocation.longitude,
            partner_details: regForm.partnerDetails || {}
          }
        });
        if (error) throw new Error(trialData?.error || await getFunctionResponseError(error, "Could not verify trial code."));
        if (trialData?.ok === true && trialData.pending_review === true && !trialData.session?.access_token) {
          setTrialChallengeId("");
          setOtpState({ sent: false, phone: otpState.phone, token: "", busy: false });
          setFormFeedback({
            type: "success",
            message: `Partner application ${trialData.partner_application_id || ""} is now pending Founder/Admin review. Partner portal access remains locked until approval. You can sign in with your mobile number and PIN to finish the document and signature steps.`
          });
          return;
        }
        if (trialData?.ok !== true || !trialData.session?.access_token || !trialData.session?.refresh_token) {
          throw new Error(trialData?.error || "Trial registration did not return a server-authenticated session.");
        }
        const { error: sessionError } = await supabase.auth.setSession({ access_token: trialData.session.access_token, refresh_token: trialData.session.refresh_token });
        if (sessionError) throw sessionError;
        data = trialData;
      } else {
        const verified = await supabase.auth.verifyOtp({ email: otpState.email, token: otpState.token.trim(), type: "signup" });
        if (verified.error) throw verified.error;
        data = verified.data;
      }
      const user = data?.user;
      if (!user?.id || !data?.session?.access_token) throw new Error("Supabase did not return a verified account.");
      if (!privateTestMode && !isTrialRegistration && (!user.email_confirmed_at || user.email !== otpState.email)) {
        await supabase.auth.signOut({ scope: "local" });
        throw new Error("The registration email could not be confirmed.");
      }
      setTrialChallengeId("");
      const profilePayload = {
        user_id: user.id,
        full_name: regForm.fullName.trim(),
        business_name: regForm.businessName.trim(),
        phone: user.phone || accountLoginIdentity(regForm.phone)?.phone || "",
        area: regForm.area || "",
        updated_at: new Date().toISOString()
      };
      const { error: profileError } = await supabase.from("we4all_profiles").upsert(profilePayload, { onConflict: "user_id" });
      if (profileError) throw profileError;

      const customer = {
        id: user.id, authUserId: user.id,
        phone: profilePayload.phone,
        fullName: regForm.fullName.trim(),
        businessName: regForm.businessName.trim(),
        area: regForm.area || "",
        role: "customer", status: "Approved", isGuest: false
      };

      if (selectedRoleKey !== "customer" && !(isTrialRegistration && data?.partner_application_id)) {
        const location = businessLocation;
        if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
          throw new Error("Add your business GPS location before submitting partner registration.");
        }
        const { data: marketId, error: marketError } = await supabase.rpc("we4all_register_market", {
          p_latitude: location.latitude,
          p_longitude: location.longitude,
          p_display_name: regForm.area || `Local market ${regForm.zoneId}`,
          p_state_name: ""
        });
        if (marketError || typeof marketId !== "string") throw new Error(marketError?.message || "Could not create the local market for this business location.");
        const { error: applicationError } = await supabase.from("we4all_partner_applications").insert({
          user_id: user.id,
          requested_role: selectedRoleKey,
          application_payload: {
            full_name: regForm.fullName.trim(),
            business_name: regForm.businessName.trim(),
            phone: profilePayload.phone,
            area: profilePayload.area,
            zone_id: marketId,
            market_id: marketId,
            latitude: location.latitude,
            longitude: location.longitude,
            partner_details: regForm.partnerDetails || {}
          }
        });
        if (applicationError) throw applicationError;
      }

      const activation = await activateSupabaseAccount(user.id);
      if (privateTestMode && activation.ok) {
        privateTestSession.current = null;
        setPrivateTestPass("");
      }
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

              {loginMethod === "pin" ? <>
                <label className="block text-[10px] text-slate-400 font-bold">Mobile number, verified email, or test login
                  <input type="text" autoComplete="username" maxLength={254} value={loginForm.identifier} onChange={(event) => setLoginForm({ ...loginForm, identifier: event.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white" />
                </label>
                <label className="block text-[10px] text-slate-400 font-bold">Six-digit PIN
                  <input type={showPinText ? "text" : "password"} inputMode="numeric" autoComplete="current-password" maxLength={6} value={loginForm.pin} onChange={(event) => setLoginForm({ ...loginForm, pin: cleanPinDigits(event.target.value).slice(0, 6) })} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white" />
                </label>
                <button type="button" onClick={handleLoginSubmit} disabled={otpState.busy || loginForm.pin.length !== 6 || !accountLoginIdentity(loginForm.identifier)} className="w-full bg-emerald-500 disabled:opacity-50 text-slate-950 font-black py-3 rounded-2xl">
                  {otpState.busy ? "Signing in…" : "Sign in securely"}
                </button>
                <div className="flex flex-wrap gap-4 text-xs text-emerald-300">
                  <button type="button" className="underline" onClick={() => { setFormFeedback({}); setLoginMethod("reset"); }}>Forgot PIN</button>
                  <button type="button" className="underline" onClick={() => { setFormFeedback({}); setLoginMethod("identifier"); }}>Find my login</button>
                  <button type="button" className="underline" onClick={() => { setFormFeedback({}); setLoginMethod("backup"); }}>Use backup code</button>
                </div>
              </> : loginMethod === "backup" ? <BackupCodeForm onBack={() => setLoginMethod("pin")} /> :
                <AccountRecovery key={loginMethod} mode={loginMethod} onBack={() => setLoginMethod("pin")} />}
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

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={otpState.busy}
                  onClick={() => {
                    setPilotInstantMode((v) => !v);
                    setPrivateTestMode(false);
                    setTrialChallengeId("");
                    setOtpState({ sent: false, phone: "", token: "", busy: false });
                    setFormFeedback({});
                  }}
                  className={`rounded-xl px-3 py-1.5 text-[10px] font-black border cursor-pointer ${
                    pilotInstantMode
                      ? "bg-amber-400 text-slate-950 border-amber-300"
                      : "bg-slate-950 text-amber-300 border-amber-400/50"
                  }`}
                >
                  {pilotInstantMode ? "⚡ Pilot Mobile OTP Mode Active (Switch to Email)" : "⚡ Use Pilot Mobile OTP Mode (No Email Needed)"}
                </button>
                {!privateTestSession.current && <button type="button" disabled={otpState.busy} onClick={() => {
                  setPrivateTestMode((value) => !value);
                  setPilotInstantMode(false);
                  setPrivateTestPass("");
                  setTrialChallengeId("");
                  setOtpState({ sent: false, phone: "", token: "", busy: false });
                  setFormFeedback({});
                }} className="text-xs text-emerald-300 underline">
                  {privateTestMode ? "Use regular registration" : "I have a Founder test pass"}
                </button>}
              </div>
              {privateTestMode && <label className="block text-xs text-slate-300">Private test pass
                <input type="password" autoComplete="off" disabled={otpState.busy || Boolean(privateTestSession.current)} value={privateTestPass}
                  onChange={(event) => setPrivateTestPass(event.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 p-2.5 text-white" />
              </label>}
              {!privateTestMode && !trialOtpModeEnabled && <label className="block text-[10px] text-slate-300 font-bold">Email for sign-in and recovery
                <input type="email" autoComplete="email" maxLength={254} disabled={otpState.sent || otpState.busy} value={regForm.email} onChange={(event) => setRegForm({ ...regForm, email: event.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white" />
              </label>}
              <input
                type="tel"
                autoComplete="tel-national"
                maxLength={10}
                disabled={otpState.sent || otpState.busy}
                value={regForm.phone}
                onChange={(e) => setRegForm({ ...regForm, phone: cleanPhoneDigits(e.target.value) })}
                placeholder={trialOtpModeEnabled ? "Test mobile number" : "Contact mobile number (optional)"}
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
                <section className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 space-y-2" aria-label="Business location">
                  <div>
                    <p className="text-[10px] font-black text-emerald-200">Business GPS location required</p>
                    <p className="mt-1 text-[10px] font-normal text-slate-400">Your shop or service appears in the market around this pin. A new local market is created automatically when needed.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button type="button" disabled={locationBusy} onClick={() => captureBusinessLocation().catch((error) => setFormFeedback({ type: "error", message: error.message }))} className="w-full rounded-xl bg-emerald-400 px-3 py-2 text-[10px] font-black text-slate-950 disabled:opacity-50">
                      {locationBusy ? "Finding location…" : businessLocation.latitude != null ? "Update business GPS pin" : "Use device location"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const latitude = 19.6641;
                        const longitude = 78.532;
                        const marketId = marketCellId(latitude, longitude);
                        setBusinessLocation({ latitude, longitude });
                        setRegForm((current) => ({ ...current, zoneId: marketId, area: current.area || "Adilabad Town Center" }));
                        setFormFeedback({ type: "success", message: `Pinned Adilabad Town Center (${marketId}).` });
                      }}
                      className="w-full rounded-xl border border-amber-400/60 bg-slate-950 px-3 py-2 text-[10px] font-black text-amber-300"
                    >
                      📍 Pin Adilabad Town Default
                    </button>
                  </div>
                  {businessLocation.latitude != null && <p className="text-[10px] text-emerald-200">GPS {businessLocation.latitude}, {businessLocation.longitude} · Market {regForm.zoneId}</p>}
                </section>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[10px] text-slate-300 font-bold">Create 6-digit sign-in PIN *
                  <input type="password" inputMode="numeric" autoComplete="new-password" disabled={otpState.sent || otpState.busy} maxLength={6} value={regForm.pin} onChange={(e) => setRegForm({ ...regForm, pin: cleanPinDigits(e.target.value).slice(0, 6) })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-center font-mono tracking-widest text-white" placeholder="••••••" />
                </label>
                <label className="text-[10px] text-slate-300 font-bold">Confirm PIN *
                  <input type="password" inputMode="numeric" autoComplete="new-password" disabled={otpState.sent || otpState.busy} maxLength={6} value={regForm.pinConfirm} onChange={(e) => setRegForm({ ...regForm, pinConfirm: cleanPinDigits(e.target.value).slice(0, 6) })} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-center font-mono tracking-widest text-white" placeholder="••••••" />
                </label>
              </div>
              <p className="text-[10px] text-slate-400">{privateTestMode ? "Keep the test login supplied by the Founder and the PIN you create here." : trialOtpModeEnabled ? "Use your test mobile and PIN to sign in." : "Use your verified email and PIN to sign in. A contact mobile number does not become a sign-in number until verified."}</p>

              <div className="space-y-2">
                {!privateTestMode && <button
                  type="button"
                  disabled={otpState.busy}
                  onClick={sendRegistrationCode}
                  className="w-full bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-2 rounded-xl"
                >
                  {trialOtpModeEnabled ? "Generate private test code" : otpState.sent ? "Resend email code" : "Send registration email code"}
                </button>}
                {otpState.sent && (
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="Registration verification code"
                    maxLength={10}
                    value={otpState.token}
                    onChange={(e) => setOtpState({ ...otpState, token: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    placeholder={trialChallengeId ? "Server-generated test code" : "Enter email code"}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-center font-mono tracking-widest"
                  />
                )}
                {otpState.sent && <button type="button" className="text-xs text-emerald-300 underline" disabled={otpState.busy} onClick={() => { setOtpState({ sent: false, phone: "", token: "", busy: false }); setTrialChallengeId(""); }}>Change registration details</button>}
                <button
                  type="button"
                  disabled={otpState.busy || (!privateTestMode && (!otpState.sent || !/^\d{6,10}$/.test(otpState.token)))}
                  onClick={handleRegistrationSubmit}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-2xl shadow text-xs"
                >
                  {privateTestMode ? "Create test account" : "Verify code and create account"}
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

      {subTab === "profile_upi" && (
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-xl" aria-label="Profile and UPI settings">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-black text-emerald-400">✏️ Profile, Bank &amp; UPI Settings</h3>
              <p className="text-[10px] text-slate-400">Update your display name, contact mobile, area, and payout UPI/bank details.</p>
            </div>
            {typeof setBrightTheme === "function" && (
              <button
                type="button"
                onClick={() => setBrightTheme(!brightTheme)}
                className="bg-slate-800 text-amber-300 border border-amber-400/40 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
              >
                {brightTheme ? "🌙 Dark Mode" : "☀️ Bright Mode"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="block text-[10px] font-bold text-slate-300">
              Full Name
              <input
                type="text"
                value={profileEditForm.fullName || localUser.fullName || ""}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, fullName: e.target.value })}
                placeholder="Your full name"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-300">
              Contact Mobile Number (10 digits)
              <input
                type="tel"
                maxLength={10}
                value={profileEditForm.phone || cleanPhoneDigits(localUser.phone) || ""}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, phone: cleanPhoneDigits(e.target.value) })}
                placeholder="9848011223"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-300">
              Locality / Area
              <input
                type="text"
                maxLength={100}
                value={profileEditForm.area || localUser.area || ""}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, area: e.target.value })}
                placeholder="Subhash Nagar, Adilabad"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-300">
              Primary UPI ID (for Refunds &amp; Partner Payouts)
              <input
                type="text"
                value={profileEditForm.upiId || localUser.upiId || ""}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, upiId: e.target.value })}
                placeholder="name@ybl"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-emerald-300 font-mono"
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-300">
              Bank Name (Optional)
              <input
                type="text"
                value={profileEditForm.bankName || localUser.bankName || ""}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, bankName: e.target.value })}
                placeholder="State Bank of India"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
              />
            </label>
            <label className="block text-[10px] font-bold text-slate-300">
              IFSC Code (Optional)
              <input
                type="text"
                value={profileEditForm.ifscCode || localUser.ifscCode || ""}
                onChange={(e) => setProfileEditForm({ ...profileEditForm, ifscCode: e.target.value.toUpperCase() })}
                placeholder="SBIN0000801"
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
              />
            </label>
          </div>

          <button
            type="button"
            disabled={profileSaving}
            onClick={async () => {
              const nextName = (profileEditForm.fullName || localUser.fullName || "WE4ALL User").trim();
              const nextPhone = cleanPhoneDigits(profileEditForm.phone || localUser.phone || "");
              const nextArea = (profileEditForm.area || localUser.area || "Adilabad").trim();
              const nextUpi = normalizeUpiId(profileEditForm.upiId || localUser.upiId || "", nextPhone);
              const nextBank = (profileEditForm.bankName || localUser.bankName || "").trim();
              const nextIfsc = (profileEditForm.ifscCode || localUser.ifscCode || "").trim();
              setProfileSaving(true);
              try {
                if (supabase && localUser?.authUserId && !localUser.isGuest) {
                  await supabase.from("we4all_profiles").upsert({
                    user_id: localUser.authUserId,
                    full_name: nextName,
                    phone: nextPhone ? `+91${nextPhone}` : "",
                    area: nextArea,
                    updated_at: new Date().toISOString()
                  }, { onConflict: "user_id" });
                }
                const updatedUser = {
                  ...localUser,
                  fullName: nextName,
                  phone: nextPhone || localUser.phone,
                  area: nextArea,
                  upiId: nextUpi,
                  bankName: nextBank,
                  ifscCode: nextIfsc
                };
                setLocalUser(updatedUser);
                setCurrentUser?.(updatedUser);
                onTriggerToast("Profile & UPI details saved!");
              } catch (err) {
                onTriggerToast(err?.message || "Could not save profile changes.");
              } finally {
                setProfileSaving(false);
              }
            }}
            className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 py-3 text-xs font-black text-slate-950 cursor-pointer shadow"
          >
            {profileSaving ? "Saving Profile…" : "Save Profile & UPI Details"}
          </button>
        </section>
      )}

      {subTab === "addresses" && (
        <section className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-xl" aria-label="Saved delivery addresses">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-sm font-black text-emerald-400">📍 Delivery Address Book &amp; Local Market</h3>
              <p className="text-[10px] text-slate-400">Select your active delivery address or add a new doorstep location.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const lat = 19.6641;
                const lng = 78.532;
                const mId = marketCellId(lat, lng) || "m_393_1571";
                const addr = {
                  id: `addr_adilabad_${Date.now()}`,
                  label: "Adilabad Town",
                  fullAddress: "Subhash Nagar, Adilabad, Telangana 504001",
                  area: "Adilabad Town",
                  zoneId: mId,
                  marketId: mId,
                  latitude: lat,
                  longitude: lng,
                  verified: true
                };
                const nextList = [addr, ...resolvedAddresses];
                updateAddresses(nextList);
                updateActiveAddressId(addr.id);
                onTriggerToast("Adilabad Town delivery address added and set as active!");
              }}
              className="bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
            >
              + Quick Add Adilabad
            </button>
          </div>

          {resolvedAddresses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950 p-4 text-center text-slate-400">
              No saved addresses yet. Add your doorstep address below or tap &ldquo;+ Quick Add Adilabad&rdquo;.
            </div>
          ) : (
            <div className="space-y-2">
              {resolvedAddresses.map((addr) => {
                const isSelected = addr.id === resolvedActiveAddressId;
                return (
                  <div
                    key={addr.id}
                    className={`rounded-2xl border p-3 flex justify-between items-center gap-2 ${
                      isSelected ? "border-emerald-400 bg-emerald-950/30" : "border-slate-800 bg-slate-950"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-white">{addr.label || "Delivery Address"}</span>
                        {isSelected && (
                          <span className="rounded bg-emerald-400 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 truncate mt-0.5">{addr.fullAddress}</p>
                      <p className="text-[9px] text-slate-400">Market Zone: {addr.marketId || addr.zoneId || "m_393_1571"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isSelected && (
                        <button
                          type="button"
                          onClick={() => {
                            updateActiveAddressId(addr.id);
                            onTriggerToast(`Delivering to ${addr.label}: ${addr.fullAddress}`);
                          }}
                          className="rounded-xl bg-emerald-500 px-2.5 py-1.5 text-[10px] font-black text-slate-950 cursor-pointer"
                        >
                          Deliver Here
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = resolvedAddresses.filter((item) => item.id !== addr.id);
                          updateAddresses(filtered);
                          if (isSelected && filtered[0]) updateActiveAddressId(filtered[0].id);
                          onTriggerToast("Address removed.");
                        }}
                        className="rounded-xl bg-rose-950 border border-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-rose-200 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 space-y-2">
            <h4 className="text-xs font-black text-amber-300">+ Add New Doorstep Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={newAddressForm.label}
                onChange={(e) => setNewAddressForm({ ...newAddressForm, label: e.target.value })}
                className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white font-bold"
              >
                <option value="Home">🏠 Home</option>
                <option value="Work / Shop">🏪 Work / Shop</option>
                <option value="Worksite">🧱 Worksite</option>
                <option value="Other">📍 Other</option>
              </select>
              <input
                type="text"
                value={newAddressForm.area}
                onChange={(e) => setNewAddressForm({ ...newAddressForm, area: e.target.value })}
                placeholder="Colony / Mandal (e.g. Subhash Nagar)"
                className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
              />
            </div>
            <input
              type="text"
              value={newAddressForm.fullAddress}
              onChange={(e) => setNewAddressForm({ ...newAddressForm, fullAddress: e.target.value })}
              placeholder="House/Shop No., Street, Landmark, Town & PIN *"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (!newAddressForm.fullAddress.trim()) {
                  onTriggerToast("Enter your full doorstep address first.");
                  return;
                }
                const mId = activeAddressObj?.marketId || activeAddressObj?.zoneId || marketCellId(19.6641, 78.532) || "m_393_1571";
                const created = {
                  id: `addr_${Date.now()}`,
                  label: newAddressForm.label,
                  fullAddress: newAddressForm.fullAddress.trim(),
                  area: newAddressForm.area.trim() || "Adilabad",
                  zoneId: mId,
                  marketId: mId,
                  verified: true
                };
                const next = [created, ...resolvedAddresses];
                updateAddresses(next);
                updateActiveAddressId(created.id);
                setNewAddressForm({ label: "Home", fullAddress: "", area: "Adilabad Town", phone: "" });
                onTriggerToast("New delivery address saved and selected!");
              }}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-slate-950 cursor-pointer"
            >
              Save &amp; Use This Address
            </button>
          </div>
        </section>
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
