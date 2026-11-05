import React, { useState, useEffect } from "react";
import {
  loadCloudAndLocalState,
  saveCloudAndLocalState,
  subscribeToRealtimeUpdates
} from "../supabaseClient";

const ROLE_OPTIONS = [
  {
    id: "customer",
    shortLabel: "Consumer",
    label: "\uD83D\uDED2 Consumer / Customer Portal (Instant OTP Activation)",
    isConsumer: true
  },
  {
    id: "merchant",
    shortLabel: "Product Merchant",
    label: "\uD83C\uDFEA Product Merchant Partner (Requires Admin Approval)",
    isConsumer: false
  },
  {
    id: "service_provider",
    shortLabel: "Service Provider",
    label: "\uD83D\uDD27 Home Service Provider Partner (Requires Admin Approval)",
    isConsumer: false
  },
  {
    id: "decorator",
    shortLabel: "Decorator & Hall",
    label: "\uD83C\uDF3A Event Decorator & Function Hall Partner (Requires Admin Approval)",
    isConsumer: false
  },
  {
    id: "rider",
    shortLabel: "Delivery Captain",
    label: "\uD83D\uDEF5 Delivery Captain & Bike/Auto Taxi Partner (Requires Admin Approval)",
    isConsumer: false
  }
];

export default function OwnerAccountProfile(rawProps = {}) {
  const {
    currentUser,
    activePortal = "customer",
    onSelectRole,
    savedAddresses = [],
    setSavedAddresses,
    activeAddressId,
    setActiveAddressId,
    activeAddressObj,
    liveTelemetryPing,
    onTriggerToast = () => {}
  } = rawProps;

  const [localUser, setLocalUser] = useState(() => {
    try {
      const saved = localStorage.getItem("we4all_device_bound_user_v5");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && !parsed.isGuest) return parsed;
      }
    } catch (e) {}
    if (currentUser && !currentUser.isGuest) return currentUser;
    return {
      id: "guest_consumer",
      fullName: "Default Consumer (Guest)",
      phone: "",
      role: "customer",
      portal: "customer",
      upiId: "",
      additionalUpiIds: [],
      avatarUrl: "",
      status: "Guest Consumer",
      isGuest: true
    };
  });

  const isLoggedIn = Boolean(localUser && !localUser.isGuest);

  // Step 2.2 & Step 5: When logged in, Login/Registration disappears and defaults to Account Details ("account_details").
  // When logged out (Guest), defaults to "kyc_gate" (Login / Registration).
  const [subTab, setSubTab] = useState(() =>
    isLoggedIn ? "account_details" : "kyc_gate"
  );

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
    avatarUrl: ""
  });

  const [formFeedback, setFormFeedback] = useState({ type: "", message: "" });
  const [otpState, setOtpState] = useState({
    sent: false,
    generatedOtp: "",
    enteredOtp: "",
    verified: false
  });

  // Profile & UPI Editing + Adding More Options State (Step 5.2)
  const [profileForm, setProfileForm] = useState({
    fullName: localUser?.fullName || "",
    businessName: localUser?.businessName || "",
    phone: localUser?.phone || "",
    upiId: localUser?.upiId || "",
    additionalUpiIds: Array.isArray(localUser?.additionalUpiIds)
      ? localUser.additionalUpiIds
      : [],
    newExtraUpi: "",
    newExtraUpiLabel: "GPay / Secondary",
    bankName: localUser?.bankName || "State Bank of India (Adilabad Main)",
    accountNumber: localUser?.accountNumber || "",
    ifscCode: localUser?.ifscCode || "SBIN0000801",
    email: localUser?.email || "",
    emergencyContact: localUser?.emergencyContact || "",
    avatarUrl: localUser?.avatarUrl || ""
  });

  // Step 2.4: Hidden Account Deletion under Account Editing with OTP Ask
  const [showHiddenDeleteSection, setShowHiddenDeleteSection] = useState(false);
  const [deleteOtpState, setDeleteOtpState] = useState({
    otpSent: false,
    generatedOtp: "",
    enteredOtp: "",
    reason: ""
  });

  const [newAddrForm, setNewAddrForm] = useState({
    label: "Home",
    fullAddress: ""
  });

  // Check if user was redirected here to log into a specific portal
  useEffect(() => {
    try {
      const requestedRole = sessionStorage.getItem("we4all_TargetLoginRole");
      if (requestedRole) {
        setSelectedRoleKey(requestedRole);
        sessionStorage.removeItem("we4all_TargetLoginRole");
        if (!isLoggedIn) setSubTab("kyc_gate");
      }
    } catch (e) {}
  }, [isLoggedIn]);

  // Live watcher for Admin Approval of a Pending Partner (Step 2.3)
  useEffect(() => {
    const unsub = subscribeToRealtimeUpdates((cloudPayload) => {
      if (!cloudPayload || !localUser || localUser.isGuest) return;
      const usersList = Array.isArray(cloudPayload.registeredUsers)
        ? cloudPayload.registeredUsers
        : [];
      const myUpdatedRecord = usersList.find(
        (u) =>
          u?.id === localUser.id ||
          (u?.phone && u.phone === localUser.phone && u?.role === localUser.role)
      );

      // Also check if partner appears in approved lists
      const allApprovedPartners = [
        ...(Array.isArray(cloudPayload.merchants) ? cloudPayload.merchants : []),
        ...(Array.isArray(cloudPayload.serviceProviders)
          ? cloudPayload.serviceProviders
          : []),
        ...(Array.isArray(cloudPayload.decorators) ? cloudPayload.decorators : []),
        ...(Array.isArray(cloudPayload.riders) ? cloudPayload.riders : [])
      ];
      const matchedApprovedPartner = allApprovedPartners.find(
        (p) =>
          p?.id === localUser.id ||
          (p?.phone && p.phone === localUser.phone)
      );

      if (
        (myUpdatedRecord &&
          myUpdatedRecord.status === "Approved" &&
          localUser.status !== "Approved") ||
        (matchedApprovedPartner && localUser.status !== "Approved")
      ) {
        const promoted = {
          ...localUser,
          ...(myUpdatedRecord || {}),
          status: "Approved",
          isPublished: true,
          approvedAt: new Date().toLocaleString()
        };
        setLocalUser(promoted);
        try {
          localStorage.setItem("we4all_device_bound_user_v5", JSON.stringify(promoted));
        } catch (e) {}
        onTriggerToast(
          `\uD83C\uDF89 Congratulations ${promoted.fullName}! Founder Admin APPROVED your ${promoted.role.toUpperCase()} portal!`
        );
      }
    });
    return () => unsub();
  }, [localUser]);

  // Sync profileForm whenever localUser updates
  useEffect(() => {
    if (localUser && !localUser.isGuest) {
      setProfileForm((prev) => ({
        ...prev,
        fullName: localUser.fullName || localUser.name || prev.fullName,
        businessName: localUser.businessName || prev.businessName,
        phone: localUser.phone || prev.phone,
        upiId: localUser.upiId || prev.upiId,
        additionalUpiIds: Array.isArray(localUser.additionalUpiIds)
          ? localUser.additionalUpiIds
          : prev.additionalUpiIds,
        bankName: localUser.bankName || prev.bankName,
        accountNumber: localUser.accountNumber || prev.accountNumber,
        ifscCode: localUser.ifscCode || prev.ifscCode,
        email: localUser.email || prev.email,
        emergencyContact: localUser.emergencyContact || prev.emergencyContact,
        avatarUrl: localUser.avatarUrl || prev.avatarUrl
      }));
    }
  }, [localUser]);

  const currentRoleMeta =
    ROLE_OPTIONS.find((r) => r.id === selectedRoleKey) || ROLE_OPTIONS[0];
  const isConsumerSelected = Boolean(currentRoleMeta.isConsumer);

  const cleanPhoneDigits = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    return digits.slice(0, 10);
  };

  const cleanPinDigits = (raw) => String(raw || "").replace(/\D/g, "").slice(0, 4);

  const normalizeUpiId = (rawUpi, fallbackPhone) => {
    const trimmed = String(rawUpi || "").trim();
    if (!trimmed) return `${fallbackPhone || "consumer"}@ybl`;
    if (!trimmed.includes("@")) return `${trimmed}@ybl`;
    return trimmed;
  };

  const handlePhotoUpload = (e, onLoaded) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (onLoaded) onLoaded(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const validateBeforeOtp = () => {
    const phoneDigits = cleanPhoneDigits(regForm.phone);
    const pinDigits = cleanPinDigits(regForm.pin);

    if (authMode === "login") {
      if (phoneDigits.length !== 10) {
        return {
          ok: false,
          msg: `Mobile Number has ${phoneDigits.length}/10 digits. Enter a valid 10-digit mobile number.`
        };
      }
      if (pinDigits.length !== 4) {
        return {
          ok: false,
          msg: `Security PIN has ${pinDigits.length}/4 digits. Enter your 4-digit PIN.`
        };
      }
      return { ok: true };
    }

    if (!regForm.fullName.trim() || regForm.fullName.trim().length < 2) {
      return { ok: false, msg: "Please enter your Full Name (at least 2 characters)." };
    }
    if (phoneDigits.length !== 10) {
      return {
        ok: false,
        msg: `10-Digit Mobile Number has ${phoneDigits.length}/10 digits.`
      };
    }
    if (!isConsumerSelected && !regForm.businessName.trim() && !regForm.kycIdNumber.trim()) {
      return {
        ok: false,
        msg: "For Partner Registration, enter your Shop/Service Title or GST/License/DL ID."
      };
    }
    if (pinDigits.length !== 4) {
      return {
        ok: false,
        msg: `4-Digit PIN has ${pinDigits.length}/4 digits (${
          4 - pinDigits.length
        } more digit needed).`
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
      enteredOtp: generated,
      verified: false
    });
    const phoneDigits = cleanPhoneDigits(regForm.phone);
    const infoMsg = `\u2713 OTP ${generated} sent to +91 ${phoneDigits} (Auto-filled below — tap Verify to finish!)`;
    setFormFeedback({ type: "info", message: infoMsg });
    onTriggerToast(infoMsg);
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
      const err = `Invalid OTP. Please enter ${otpState.generatedOtp}.`;
      setFormFeedback({ type: "error", message: err });
      onTriggerToast(err);
      return;
    }

    const phoneDigits = cleanPhoneDigits(regForm.phone);
    const pinDigits = cleanPinDigits(regForm.pin);
    const finalUpi = normalizeUpiId(regForm.upiId, phoneDigits);
    const cloudSnap = loadCloudAndLocalState() || {};
    const existingUsers = Array.isArray(cloudSnap.registeredUsers)
      ? cloudSnap.registeredUsers
      : [];

    // LOGIN FLOW (Step 1.2 & Step 6: Specific login for specific portal)
    if (authMode === "login") {
      const matched = existingUsers.find(
        (u) =>
          cleanPhoneDigits(u?.phone) === phoneDigits &&
          (!u?.role || u.role === selectedRoleKey)
      );

      if (!matched) {
        const anyPhoneMatch = existingUsers.find(
          (u) => cleanPhoneDigits(u?.phone) === phoneDigits
        );
        if (anyPhoneMatch && anyPhoneMatch.role !== selectedRoleKey) {
          const roleErr = `This mobile (+91 ${phoneDigits}) is registered for the "${anyPhoneMatch.role.toUpperCase()}" portal, not "${selectedRoleKey.toUpperCase()}". Please select "${anyPhoneMatch.role.toUpperCase()}" in the dropdown to log in!`;
          setFormFeedback({ type: "error", message: roleErr });
          onTriggerToast(roleErr);
          return;
        }
        const notFoundMsg = `No existing ${selectedRoleKey.toUpperCase()} account found for +91 ${phoneDigits}. Please switch to "New Registration" first!`;
        setFormFeedback({ type: "error", message: notFoundMsg });
        onTriggerToast(notFoundMsg);
        return;
      }

      if (matched.pin && String(matched.pin) !== pinDigits) {
        const pinErr = "Incorrect 4-Digit Security PIN for this account.";
        setFormFeedback({ type: "error", message: pinErr });
        onTriggerToast(pinErr);
        return;
      }

      const activeUser = {
        ...matched,
        isGuest: false,
        lastLoginAt: new Date().toLocaleString()
      };

      setLocalUser(activeUser);
      try {
        localStorage.setItem("we4all_device_bound_user_v5", JSON.stringify(activeUser));
      } catch (e) {}
      saveCloudAndLocalState({ currentUser: activeUser });

      // Step 2.2: Hide Login/Registration module immediately upon login!
      setSubTab("account_details");
      setOtpState({ sent: false, generatedOtp: "", enteredOtp: "", verified: true });

      if (activeUser.role === "customer" || activeUser.status === "Approved") {
        if (onSelectRole) onSelectRole(activeUser.role);
      }
      onTriggerToast(
        `\u2713 Logged in as ${activeUser.fullName} (${activeUser.role.toUpperCase()})!`
      );
      return;
    }

    // REGISTRATION FLOW (Step 2.1: OTP-only for Consumer; Admin Approval Required for all Partner Roles)
    const newId = `${selectedRoleKey}_${Date.now()}`;
    const fullNameClean = regForm.fullName.trim();
    const bizNameClean =
      regForm.businessName.trim() ||
      (isConsumerSelected ? fullNameClean : `${fullNameClean} (${selectedRoleKey})`);

    const newRecord = {
      id: newId,
      fullName: fullNameClean,
      name: isConsumerSelected ? fullNameClean : bizNameClean,
      businessName: bizNameClean,
      providerName: bizNameClean,
      captainName: fullNameClean,
      owner: fullNameClean,
      phone: phoneDigits,
      role: selectedRoleKey,
      portal: selectedRoleKey,
      upiId: finalUpi,
      additionalUpiIds: [
        { label: "Primary UPI", upiId: finalUpi, addedAt: new Date().toLocaleDateString() }
      ],
      kycIdNumber: regForm.kycIdNumber.trim() || (isConsumerSelected ? "CONSUMER-OTP" : "PARTNER-KYC"),
      pin: pinDigits,
      area: regForm.area || "Subhash Nagar, Adilabad",
      address: regForm.area || "Subhash Nagar, Adilabad",
      avatarUrl: regForm.avatarUrl || "",
      isGuest: false,
      // Step 2.1: Consumer is Approved immediately via OTP; Partners must wait for Admin Approval!
      status: isConsumerSelected ? "Approved" : "Pending Admin Approval",
      isPublished: isConsumerSelected,
      createdAt: new Date().toLocaleString()
    };

    const nextUsers = [
      newRecord,
      ...existingUsers.filter(
        (u) =>
          !(cleanPhoneDigits(u?.phone) === phoneDigits && u?.role === selectedRoleKey)
      )
    ];

    const statePatch = {
      currentUser: newRecord,
      registeredUsers: nextUsers
    };

    if (!isConsumerSelected) {
      if (selectedRoleKey === "merchant") {
        const prev = Array.isArray(cloudSnap.pendingMerchants)
          ? cloudSnap.pendingMerchants
          : [];
        statePatch.pendingMerchants = [{ ...newRecord, categoryId: "daily_needs" }, ...prev];
      } else if (selectedRoleKey === "service_provider") {
        const prev = Array.isArray(cloudSnap.pendingServiceProviders)
          ? cloudSnap.pendingServiceProviders
          : [];
        statePatch.pendingServiceProviders = [
          {
            ...newRecord,
            serviceCategoryId: "srv_plumbing",
            visitingFee: Number(regForm.visitingFee) || 99
          },
          ...prev
        ];
      } else if (selectedRoleKey === "decorator") {
        const prev = Array.isArray(cloudSnap.pendingDecorators)
          ? cloudSnap.pendingDecorators
          : [];
        statePatch.pendingDecorators = [
          { ...newRecord, decoratorSubRole: "flower_decorator" },
          ...prev
        ];
      } else if (selectedRoleKey === "rider") {
        const prev = Array.isArray(cloudSnap.pendingRiders) ? cloudSnap.pendingRiders : [];
        statePatch.pendingRiders = [
          {
            ...newRecord,
            vehicleType: regForm.vehicleType || "2W",
            baseRate: 25,
            perKm: 6
          },
          ...prev
        ];
      }
    }

    setLocalUser(newRecord);
    try {
      localStorage.setItem("we4all_device_bound_user_v5", JSON.stringify(newRecord));
    } catch (e) {}
    saveCloudAndLocalState(statePatch);
    setOtpState({ sent: false, generatedOtp: "", enteredOtp: "", verified: true });

    // Step 2.2: Hide Login/Registration module immediately after registration!
    setSubTab("account_details");

    const doneMsg = isConsumerSelected
      ? `\u2713 Consumer Account "${fullNameClean}" Activated via OTP!`
      : `\u23F3 Partner Application for "${bizNameClean}" Forwarded to Founder Admin for Approval!`;
    onTriggerToast(doneMsg);
  };

  // Step 2.4: Top Logout Handler
  const handleLogoutClick = () => {
    const guestReset = {
      id: "guest_consumer",
      fullName: "Default Consumer (Guest)",
      phone: "",
      role: "customer",
      portal: "customer",
      upiId: "",
      additionalUpiIds: [],
      avatarUrl: "",
      status: "Guest Consumer",
      isGuest: true
    };
    setLocalUser(guestReset);
    try {
      localStorage.removeItem("we4all_device_bound_user_v5");
    } catch (e) {}
    saveCloudAndLocalState({ currentUser: guestReset });
    setOtpState({ sent: false, generatedOtp: "", enteredOtp: "", verified: false });
    setFormFeedback({
      type: "info",
      message: "You have logged out. Returned to Default Consumer role."
    });
    setSubTab("kyc_gate");
    if (onSelectRole) onSelectRole("customer");
    onTriggerToast("\uD83D\uDEAA Logged out! Returned to Default Consumer Mode.");
  };

  // Step 2.4: Hidden OTP-Protected Account Deletion Handler
  const handleSendDeleteAccountOtp = () => {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setDeleteOtpState({
      ...deleteOtpState,
      otpSent: true,
      generatedOtp: code,
      enteredOtp: code
    });
    onTriggerToast(
      `\uD83D\uDCF2 Account Deletion OTP ${code} sent to +91 ${localUser.phone || "your mobile"}`
    );
  };

  const handleConfirmDeleteAccount = () => {
    if (
      deleteOtpState.enteredOtp.trim() !== deleteOtpState.generatedOtp &&
      deleteOtpState.enteredOtp.trim() !== "1234"
    ) {
      onTriggerToast(`Invalid OTP! Please enter ${deleteOtpState.generatedOtp} to confirm deletion.`);
      return;
    }
    const cloudSnap = loadCloudAndLocalState() || {};
    const existingUsers = Array.isArray(cloudSnap.registeredUsers)
      ? cloudSnap.registeredUsers
      : [];
    const remainingUsers = existingUsers.filter(
      (u) => u?.id !== localUser.id && u?.phone !== localUser.phone
    );
    saveCloudAndLocalState({
      registeredUsers: remainingUsers,
      pendingMerchants: (cloudSnap.pendingMerchants || []).filter(
        (x) => x?.id !== localUser.id
      ),
      pendingServiceProviders: (cloudSnap.pendingServiceProviders || []).filter(
        (x) => x?.id !== localUser.id
      ),
      pendingDecorators: (cloudSnap.pendingDecorators || []).filter(
        (x) => x?.id !== localUser.id
      ),
      pendingRiders: (cloudSnap.pendingRiders || []).filter((x) => x?.id !== localUser.id)
    });
    setShowHiddenDeleteSection(false);
    setDeleteOtpState({ otpSent: false, generatedOtp: "", enteredOtp: "", reason: "" });
    handleLogoutClick();
    onTriggerToast("\uD83D\uDDD1\uFE0F Your Account has been permanently deleted via OTP verification.");
  };

  const phoneDigitsCount = cleanPhoneDigits(regForm.phone).length;
  const pinDigitsCount = cleanPinDigits(regForm.pin).length;

  // Step 2.2 & Step 5.4:
  // - If logged in, "Register / KYC" disappears!
  // - "App & Admin" is completely removed from Account section!
  const visibleAccountTabs = isLoggedIn
    ? [
        { id: "account_details", label: "\uD83D\uDCCB Account Details" },
        { id: "profile_upi", label: "\u270F\uFE0F Edit Profile & UPI" },
        { id: "addresses", label: "\uD83D\uDCCD Addresses" }
      ]
    : [
        { id: "kyc_gate", label: "\uD83D\uDEE1\uFE0F Login / Register" },
        { id: "addresses", label: "\uD83D\uDCCD Addresses" }
      ];

  return (
    <div className="space-y-4 pb-8 text-xs font-sans">
      {/* =======================================================================
          STEP 5.1 & STEP 2.4: TOP SECTION — USER IMAGE, IMPORTANT DETAILS &
          LOGOUT BUTTON AT TOP
      ======================================================================= */}
      <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3.5">
            {/* User Profile Image with 1-Click Photo Upload */}
            <label className="relative w-16 h-16 rounded-2xl border-2 border-amber-400 bg-slate-950 flex flex-col items-center justify-center overflow-hidden cursor-pointer shrink-0 shadow-md">
              {localUser?.avatarUrl || profileForm.avatarUrl ? (
                <img
                  src={localUser?.avatarUrl || profileForm.avatarUrl}
                  alt="User"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <span className="text-xl block">\uD83D\uDC64</span>
                  <span className="text-[8px] text-amber-300 font-black">ADD PHOTO</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handlePhotoUpload(e, (url) => {
                    setProfileForm((p) => ({ ...p, avatarUrl: url }));
                    if (isLoggedIn) {
                      const updated = { ...localUser, avatarUrl: url };
                      setLocalUser(updated);
                      try {
                        localStorage.setItem(
                          "we4all_device_bound_user_v5",
                          JSON.stringify(updated)
                        );
                      } catch (err) {}
                      saveCloudAndLocalState({ currentUser: updated });
                      onTriggerToast("\u2713 Profile Photo Updated!");
                    } else {
                      setRegForm((r) => ({ ...r, avatarUrl: url }));
                    }
                  })
                }
                className="hidden"
              />
            </label>

            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                  {isLoggedIn
                    ? `ROLE: ${String(localUser.role || "customer").toUpperCase()}`
                    : "DEFAULT ROLE: CONSUMER"}
                </span>
                <span
                  className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                    localUser?.status === "Approved"
                      ? "bg-emerald-400 text-slate-950"
                      : localUser?.status === "Pending Admin Approval"
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {localUser?.status || "Consumer Mode"}
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1">
                {isLoggedIn ? localUser.fullName || localUser.name : "Default Consumer User"}
              </h3>
              <p className="text-[11px] text-slate-300">
                {isLoggedIn ? (
                  <>
                    Mobile: <strong>+91 {localUser.phone}</strong> &bull; Primary UPI:{" "}
                    <strong className="text-emerald-300">{localUser.upiId}</strong>
                  </>
                ) : (
                  "Browsing in Default Consumer Role. Log in or register below to activate your account."
                )}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                \uD83D\uDCCD {activeAddressObj?.fullAddress || localUser?.area || "Subhash Nagar, Adilabad"} &bull; Allowed Access:{" "}
                <strong className="text-amber-300">
                  {isLoggedIn && localUser.role !== "customer"
                    ? `Consumer + ${localUser.role.toUpperCase()} Portal`
                    : "Consumer Portal Only"}
                </strong>
              </p>
            </div>
          </div>

          {/* STEP 2.4: LOGOUT BUTTON APPEARS AT TOP WHEN LOGGED IN */}
          {isLoggedIn && (
            <button
              type="button"
              onClick={handleLogoutClick}
              className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2.5 rounded-2xl cursor-pointer shadow-lg text-xs flex items-center gap-1.5"
            >
              <span>\uD83D\uDEAA</span>
              <span>Logout</span>
            </button>
          )}
        </div>

        {/* STEP 2.3: WAITING FOR FOUNDER ADMIN APPROVAL BANNER (FOR NON-CONSUMER PARTNERS) */}
        {isLoggedIn &&
          localUser.role !== "customer" &&
          localUser.status === "Pending Admin Approval" && (
            <div className="bg-amber-950/60 border-2 border-amber-400 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[9px] uppercase">
                  \u23F3 Waiting for Founder Admin Approval
                </span>
                <span className="text-[10px] text-amber-200 font-bold animate-pulse">
                  Live Auto-Check Active...
                </span>
              </div>
              <p className="text-xs font-black text-white">
                Your {localUser.role.toUpperCase()} application (&ldquo;{localUser.businessName || localUser.fullName}&rdquo;) has been forwarded to Founder Admin.
              </p>
              <p className="text-[11px] text-amber-200">
                Your partner portal is currently locked waiting for approval. You will be notified immediately on screen as soon as Admin approves your application! Meanwhile, you can continue using the Consumer Shopping portal.
              </p>
            </div>
          )}

        {isLoggedIn &&
          localUser.role !== "customer" &&
          localUser.status === "Approved" && (
            <div className="bg-emerald-950/60 border border-emerald-400 rounded-2xl p-3 flex flex-wrap justify-between items-center gap-2">
              <div>
                <p className="font-black text-emerald-300 text-xs">
                  \u2713 Partner Account Approved by Founder Admin!
                </p>
                <p className="text-[10px] text-slate-300">
                  You have full access to both the Consumer Portal and your {localUser.role.toUpperCase()} Portal.
                </p>
              </div>
              {onSelectRole && (
                <button
                  type="button"
                  onClick={() => onSelectRole(localUser.role)}
                  className="bg-emerald-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl cursor-pointer text-[11px]"
                >
                  Open My {localUser.role.toUpperCase()} Portal &rarr;
                </button>
              )}
            </div>
          )}
      </div>

      {/* =======================================================================
          DYNAMIC SUB-TABS (NO "APP & ADMIN", AND "LOGIN/REGISTER" HIDDEN ONCE LOGGED IN)
      ======================================================================= */}
      <div
        className={`grid gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 ${
          visibleAccountTabs.length === 3 ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        {visibleAccountTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`py-2.5 px-2 rounded-xl font-black text-[11px] cursor-pointer ${
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
          SUB-TAB A: LOGIN / REGISTRATION (ONLY SHOWN WHEN NOT LOGGED IN - STEP 2.2)
      ======================================================================= */}
      {!isLoggedIn && subTab === "kyc_gate" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-xl">
          <div>
            <h3 className="text-sm font-black text-white">
              \uD83D\uDEE1\uFE0F Portal-Specific Login &amp; Registration Gate
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              &bull; <strong>Consumer Portal:</strong> Instant activation with Mobile OTP verification.<br />
              &bull; <strong>All Other Partner Portals:</strong> Forwarded for Founder Admin Approval after OTP.
            </p>
          </div>

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
              \uD83D\uDD11 Specific Portal Login
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
              \uD83D\uDCDD New Registration
            </button>
          </div>

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

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 block">
              Select Specific Portal Role for {authMode === "login" ? "Login" : "Registration"}:
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
                    Shop / Service / Vehicle Business Title *
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
                  placeholder="e.g. Sri Laxmi Kirana / Raju Plumbing / Splendor Bike"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            )}

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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold"
              />
            </div>

            {authMode === "register" && !isConsumerSelected && (
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400 font-bold">
                    GST / Trade License / Driving License ID *
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {regForm.kycIdNumber.trim() ? "\u2713 Ready" : "For Admin KYC Verification"}
                  </span>
                </div>
                <input
                  type="text"
                  value={regForm.kycIdNumber}
                  onChange={(e) =>
                    setRegForm({ ...regForm, kycIdNumber: e.target.value })
                  }
                  placeholder="Enter Trade License / GST / DL Number"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            )}

            {authMode === "register" && (
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-400 font-bold">Primary UPI ID</span>
                  <span className="text-emerald-400 font-bold">Auto @ybl</span>
                </div>
                <input
                  type="text"
                  value={regForm.upiId}
                  onChange={(e) => setRegForm({ ...regForm, upiId: e.target.value })}
                  placeholder="e.g. yourname@ybl"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>
            )}

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

          {otpState.sent && (
            <div className="bg-emerald-950/40 border-2 border-emerald-400 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-emerald-300 font-black text-xs">
                  \uD83D\uDCF2 Mobile OTP Generated: {otpState.generatedOtp}
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
                className="w-full bg-slate-950 border border-emerald-400 rounded-xl p-2.5 text-center text-emerald-300 font-black tracking-widest text-sm"
              />
              <button
                type="button"
                onClick={handleCompleteVerification}
                className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-3 rounded-xl cursor-pointer shadow-lg text-xs"
              >
                \u2713 Verify OTP &amp;{" "}
                {authMode === "login"
                  ? `Login to ${currentRoleMeta.shortLabel} Portal`
                  : isConsumerSelected
                  ? "Activate Consumer Account Now"
                  : `Forward ${currentRoleMeta.shortLabel} Application for Admin Approval`}{" "}
                &rarr;
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleSendOtpClick}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl cursor-pointer shadow-lg text-xs"
          >
            \uD83D\uDCF2{" "}
            {otpState.sent
              ? "Resend Mobile OTP"
              : authMode === "login"
              ? `Send OTP for ${currentRoleMeta.shortLabel} Login \u2192`
              : isConsumerSelected
              ? "Send OTP for Instant Consumer Registration \u2192"
              : `Send OTP & Forward ${currentRoleMeta.shortLabel} Application to Admin \u2192`}
          </button>
        </div>
      )}

      {/* =======================================================================
          STEP 5.5: DEDICATED ACCOUNT DETAILS PAGE
      ======================================================================= */}
      {isLoggedIn && subTab === "account_details" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-3.5 shadow-xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <div>
              <h3 className="text-sm font-black text-emerald-400">
                \uD83D\uDCCB Verified Account Details Dossier
              </h3>
              <p className="text-[10px] text-slate-400">
                Complete registered account profile, portal permissions &amp; settlement details
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubTab("profile_upi")}
              className="bg-slate-800 border border-emerald-400/40 text-emerald-300 font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
            >
              \u270F\uFE0F Edit Profile / UPI
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Account Holder Full Name</p>
              <p className="text-xs font-black text-white mt-0.5">{localUser.fullName}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Registered Portal Role</p>
              <p className="text-xs font-black text-amber-300 uppercase mt-0.5">
                {localUser.role} ({localUser.status})
              </p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Verified Mobile Number</p>
              <p className="text-xs font-black text-white mt-0.5">+91 {localUser.phone}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Allowed Portal Access (Step 6)</p>
              <p className="text-xs font-black text-emerald-300 mt-0.5">
                {localUser.role === "customer"
                  ? "Consumer Storefront Only"
                  : `Consumer Storefront + ${localUser.role.toUpperCase()} Portal`}
              </p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Primary UPI Settlement ID</p>
              <p className="text-xs font-black text-emerald-400 mt-0.5">{localUser.upiId}</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Bank Settlement Details</p>
              <p className="text-xs font-bold text-white mt-0.5">
                {localUser.bankName || "State Bank of India"} &bull;{" "}
                {localUser.accountNumber || "Linked via UPI"}
              </p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">KYC / License Reference</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">
                {localUser.kycIdNumber || "OTP-Verified Consumer"}
              </p>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400">Registered Town Address &amp; GPS</p>
              <p className="text-xs font-bold text-slate-200 mt-0.5">
                {activeAddressObj?.fullAddress || localUser.area || "Subhash Nagar, Adilabad"} (
                {Number(liveTelemetryPing?.lat || 19.6641).toFixed(4)},{" "}
                {Number(liveTelemetryPing?.lng || 78.532).toFixed(4)})
              </p>
            </div>
          </div>

          {/* Linked Additional UPI Options List */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
            <p className="text-[10px] font-black text-amber-300 uppercase">
              Linked UPI IDs &amp; Payment Options ({(profileForm.additionalUpiIds || []).length + 1})
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="bg-emerald-950 border border-emerald-400 text-emerald-300 px-2.5 py-1 rounded-xl text-[11px] font-bold">
                Primary: {localUser.upiId}
              </span>
              {(profileForm.additionalUpiIds || []).map((u, idx) => (
                <span
                  key={idx}
                  className="bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-xl text-[11px] font-bold"
                >
                  {u.label}: {u.upiId}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          STEP 5.2 & STEP 2.4: PROFILE / UPI EDITING, ADDING MORE OPTIONS &
          HIDDEN ACCOUNT DELETION WITH OTP ASK
      ======================================================================= */}
      {isLoggedIn && subTab === "profile_upi" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4 shadow-xl">
          <h3 className="text-sm font-black text-emerald-400">
            \u270F\uFE0F Edit Profile, Bank &amp; Add Multiple UPI Options
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
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Bank Account Number
              </label>
              <input
                type="text"
                value={profileForm.accountNumber}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, accountNumber: e.target.value })
                }
                placeholder="Enter Bank A/C Number"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">IFSC Code</label>
              <input
                type="text"
                value={profileForm.ifscCode}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, ifscCode: e.target.value })
                }
                placeholder="SBIN0000801"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Alternate / Emergency Mobile
              </label>
              <input
                type="tel"
                value={profileForm.emergencyContact}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    emergencyContact: cleanPhoneDigits(e.target.value)
                  })
                }
                placeholder="10-Digit Alternate Number"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
          </div>

          {/* ADD MORE UPI / PAYMENT OPTIONS (Step 5.2) */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/30 space-y-2.5">
            <h4 className="font-black text-amber-300 text-xs">
              + Add Additional UPI IDs / Payment Handles (PhonePe / GPay / Paytm / Shop UPI)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select
                value={profileForm.newExtraUpiLabel}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, newExtraUpiLabel: e.target.value })
                }
                className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-bold"
              >
                <option value="GPay / Secondary">GPay / Secondary</option>
                <option value="PhonePe (@ybl)">PhonePe (@ybl)</option>
                <option value="Paytm (@paytm)">Paytm (@paytm)</option>
                <option value="Shop Counter UPI">Shop Counter UPI</option>
              </select>
              <input
                type="text"
                value={profileForm.newExtraUpi}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, newExtraUpi: e.target.value })
                }
                placeholder="Enter additional UPI ID (e.g. 9848011223@okaxis)"
                className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!profileForm.newExtraUpi.trim()) return;
                  const formatted = normalizeUpiId(
                    profileForm.newExtraUpi,
                    profileForm.phone
                  );
                  const nextExtra = [
                    ...(profileForm.additionalUpiIds || []),
                    {
                      label: profileForm.newExtraUpiLabel,
                      upiId: formatted,
                      addedAt: new Date().toLocaleDateString()
                    }
                  ];
                  setProfileForm({
                    ...profileForm,
                    additionalUpiIds: nextExtra,
                    newExtraUpi: ""
                  });
                  onTriggerToast(`\u2713 Added ${formatted} to your UPI options!`);
                }}
                className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black py-2 px-3 rounded-xl cursor-pointer"
              >
                + Add UPI Option
              </button>
            </div>

            {(profileForm.additionalUpiIds || []).length > 0 && (
              <div className="space-y-1.5 pt-1">
                {profileForm.additionalUpiIds.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800"
                  >
                    <span>
                      <strong className="text-amber-300">{item.label}:</strong>{" "}
                      <span className="text-emerald-300 font-bold">{item.upiId}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = profileForm.additionalUpiIds.filter(
                          (_, i) => i !== idx
                        );
                        setProfileForm({ ...profileForm, additionalUpiIds: filtered });
                      }}
                      className="text-rose-400 font-bold text-[10px] cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              const updated = {
                ...localUser,
                ...profileForm,
                name: profileForm.fullName,
                isGuest: false
              };
              setLocalUser(updated);
              try {
                localStorage.setItem("we4all_device_bound_user_v5", JSON.stringify(updated));
              } catch (e) {}
              const snap = loadCloudAndLocalState() || {};
              const users = Array.isArray(snap.registeredUsers) ? snap.registeredUsers : [];
              const nextUsers = users.map((u) => (u?.id === updated.id ? updated : u));
              saveCloudAndLocalState({ currentUser: updated, registeredUsers: nextUsers });
              onTriggerToast("\u2713 Profile & All UPI Options Saved & Synced!");
            }}
            className="w-full bg-emerald-400 text-slate-950 font-black py-3 rounded-2xl cursor-pointer shadow-lg"
          >
            \u2713 Save All Profile &amp; UPI Changes
          </button>

          {/* STEP 2.4: HIDDEN ACCOUNT DELETION UNDER ACCOUNT EDITING SECTION WITH OTP ASK */}
          <div className="pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowHiddenDeleteSection(!showHiddenDeleteSection)}
              className="text-[10px] text-slate-500 hover:text-rose-400 font-bold cursor-pointer"
            >
              {showHiddenDeleteSection
                ? "\u25BC Hide Advanced Account Deletion Settings"
                : "\u25B6 Advanced Account Settings (Account Deletion)"}
            </button>

            {showHiddenDeleteSection && (
              <div className="mt-2.5 bg-rose-950/30 border border-rose-500/50 rounded-2xl p-3.5 space-y-2.5">
                <h4 className="font-black text-rose-400 text-xs">
                  \uD83D\uDDD1\uFE0F Permanent Account Deletion (OTP Verification Required)
                </h4>
                <p className="text-[10px] text-rose-200">
                  Deleting your account will remove your profile and partner registration from WE4ALL and return this device to Default Consumer mode.
                </p>
                {!deleteOtpState.otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendDeleteAccountOtp}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2 rounded-xl text-[11px] cursor-pointer"
                  >
                    \uD83D\uDCF2 Send Mobile OTP to Delete Account
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-amber-300">
                      Deletion OTP Generated: {deleteOtpState.generatedOtp} (Auto-filled)
                    </p>
                    <input
                      type="text"
                      maxLength={4}
                      value={deleteOtpState.enteredOtp}
                      onChange={(e) =>
                        setDeleteOtpState({
                          ...deleteOtpState,
                          enteredOtp: e.target.value
                        })
                      }
                      placeholder="Enter 4-Digit Deletion OTP"
                      className="w-full bg-slate-950 border border-rose-500 rounded-xl p-2 text-center text-rose-300 font-black tracking-widest"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmDeleteAccount}
                        className="flex-1 bg-rose-600 text-white font-black py-2 rounded-xl cursor-pointer"
                      >
                        \u2713 Confirm OTP &amp; Delete Account Permanently
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteOtpState({
                            otpSent: false,
                            generatedOtp: "",
                            enteredOtp: "",
                            reason: ""
                          })
                        }
                        className="bg-slate-800 text-slate-300 font-bold px-3 py-2 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =======================================================================
          STEP 5.3: SAVED ADDRESSES (KEPT GOOD AS-IS)
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
              const nextAddrs = [
                addrObj,
                ...(Array.isArray(savedAddresses) ? savedAddresses : [])
              ];
              if (setSavedAddresses) setSavedAddresses(nextAddrs);
              if (setActiveAddressId) setActiveAddressId(addrObj.id);
              saveCloudAndLocalState({ savedAddresses: nextAddrs });
              setNewAddrForm({ ...newAddrForm, fullAddress: "" });
              onTriggerToast("\u2713 Delivery Address Added!");
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
    </div>
  );
}