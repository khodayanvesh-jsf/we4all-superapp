import React, { useState, useEffect, useRef } from "react";
import {
  INITIAL_APP_UPDATE_INFO,
  INITIAL_GEO_ADS,
  INITIAL_CATEGORIES,
  SERVICE_CATEGORIES,
  INITIAL_MERCHANTS,
  INITIAL_SERVICE_PROVIDERS,
  INITIAL_DECORATORS,
  INITIAL_PRODUCTS,
  INITIAL_FUNCTION_HALLS,
  INITIAL_RIDERS
} from "./data";
import {
  getLangText,
  getGeoSlangConfig,
  GEO_SLANG_REGIONS
} from "./modules/i18n/indianLanguages";
import GeoTargetedAdBanner from "./modules/ads/GeoTargetedAdBanner";
import RoleFooterNav from "./modules/RoleFooterNav";
import UpiPaymentModal from "./modules/UpiPaymentModal";
import OrdersHistoryAndInvoice from "./modules/OrdersHistoryAndInvoice";
import OwnerAccountProfile from "./modules/OwnerAccountProfile";
import FounderAdminSuite from "./modules/FounderAdminSuite";
import MerchantPortal from "./modules/MerchantPortal";
import ServiceProviderPortal from "./modules/ServiceProviderPortal";
import DecoratorPortal from "./modules/DecoratorPortal";
import RiderCaptainPortal, { VEHICLE_CONSORT_RULES } from "./modules/RiderCaptainPortal";
import LabourWorksitePortal, {
  LABOUR_SKILL_CATEGORIES,
  INITIAL_LABOUR_WORKERS
} from "./modules/LabourWorksitePortal";
import DynamicPortalEngine, { PortalPowerToolsBar } from "./modules/DynamicPortalEngine";
import LiveRouteMap from "./modules/LiveRouteMap";
import {
  saveCloudAndLocalState,
  loadCloudAndLocalState,
  subscribeToRealtimeUpdates,
  checkLiveCloudOtaManifest,
  performZeroLossOtaUpdate, wipeAllOnlineAndOfflineData, startRealtimeMobileSensorStream,
  getDeviceInstalledVersion
} from "./supabaseClient";
import {
  linkMobileHardwareServicesSilently,
  sendMobileOsTrayNotification,
  verifyPhoneHardwareBiometric,
  recordUserActivityTelemetry,
  getPersonalizedRecommendations
} from "./modules/native/MobileHardwareBridge";

function cleanLabel(str = "") {
  return String(str || "")
    .replace(/\\u[0-9a-fA-F]{4}/g, "")
    .replace(/^u[0-9a-fA-F]{3,4}\s*/i, "")
    .trim();
}

function FounderLogoBadge({ logoUrl }) {
  return (
    <div
      title="WE4ALL Official Emblem"
      className="relative w-9 h-9 rounded-full border-2 border-amber-400 ring-2 ring-emerald-500/50 bg-gradient-to-b from-[#07261e] to-[#04120e] flex flex-col items-center justify-center overflow-hidden shadow-lg shrink-0 select-none"
    >
      {logoUrl ? (
        <img src={logoUrl} alt="WE4ALL" className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center text-center leading-none">
          <span className="text-[7px] font-black text-amber-400">WE4ALL</span>
          <span className="text-[5px] font-extrabold text-emerald-300">FOUNDER</span>
          <span className="text-[5px] font-bold text-white">ANVESH</span>
        </div>
      )}
    </div>
  );
}

// Clean Amazon-Style Mobile & Web Shell (Zero Header Clutter)
function MobilePhoneShell({
  title,
  badge,
  activePortal,
  footerTab,
  setFooterTab,
  totalCartCount,
  totalOrdersCount,
  floatingLiveOrder,
  onOpenLiveOrderModal,
  brightTheme,
  lang,
  personalShoppingFromPartner,
  onReturnToPartnerDesk,
  customPortalTabs = null,
  showFooter = true,
  children
}) {
  return (
    <div
      className={`w-full max-w-6xl mx-auto overflow-hidden flex flex-col min-h-screen relative transition-all ${
        brightTheme ? "bg-white text-slate-900" : "bg-[#071118] text-white"
      }`}
    >
      <div
        className={`px-3.5 py-2.5 flex justify-between items-center gap-2 text-xs border-b shrink-0 ${
          brightTheme
            ? "bg-[#131921] text-white border-slate-800"
            : "bg-slate-950 text-slate-100 border-emerald-950/60"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-black text-amber-400 tracking-wide truncate">
            WE4ALL.in | {cleanLabel(title)}
          </span>
        </div>
        <span className="bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 px-2.5 py-0.5 rounded text-[10px] font-bold truncate shrink-0">
          {cleanLabel(badge)}
        </span>
      </div>

      {personalShoppingFromPartner && (
        <div className="bg-indigo-600 text-white px-3 py-1.5 flex justify-between items-center text-[10px] font-black shrink-0">
          <span>
            Shopping Mode (From: {personalShoppingFromPartner.toUpperCase()})
          </span>
          <button
            type="button"
            onClick={onReturnToPartnerDesk}
            className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-lg font-black cursor-pointer"
          >
            Return to Partner Desk
          </button>
        </div>
      )}

      <div
        className={`flex-1 overflow-y-auto p-3 md:p-5 space-y-3 pb-24 ${
          brightTheme
            ? "bg-slate-50 text-slate-900"
            : "bg-gradient-to-b from-[#071118] to-[#04090e] text-white"
        }`}
      >
        {children}
      </div>

      {floatingLiveOrder && showFooter && activePortal === "customer" && (
        <div className="sticky bottom-14 left-3 right-3 px-3 z-30">
          <button
            type="button"
            onClick={onOpenLiveOrderModal}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-2.5 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center justify-between cursor-pointer"
          >
            <div className="text-left">
              <p className="text-[10px] font-black leading-tight">
                LIVE ORDER #{floatingLiveOrder.id}:{" "}
                {floatingLiveOrder.status.replace(/_/g, " ")}
              </p>
              <p className="text-[9px] font-bold text-amber-200">
                Captain: {floatingLiveOrder.riderName} | Doorstep OTP:{" "}
                {floatingLiveOrder.secretOtp}
              </p>
            </div>
            <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2.5 py-1 rounded-xl">
              Live Map
            </span>
          </button>
        </div>
      )}

      {showFooter && (
        <RoleFooterNav
          activePortal={activePortal}
          footerTab={footerTab}
          setFooterTab={setFooterTab}
          totalCartCount={totalCartCount}
          totalOrdersCount={totalOrdersCount}
          brightTheme={brightTheme}
          lang={lang}
          customPortalTabs={customPortalTabs}
        />
      )}
    </div>
  );
}

function AppContent() {
  const savedCloud = loadCloudAndLocalState();
  const isDirectAdminUrl =
    typeof window !== "undefined" &&
    (window.location.search.includes("admin=true") ||
      window.location.pathname.includes("/admin"));
  const [viewMode, setViewMode] = useState(
    isDirectAdminUrl ? "founder_web" : "mobile_app"
  );

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminAuthStep, setAdminAuthStep] = useState(1);
  const [adminLoginForm, setAdminLoginForm] = useState({
    username: "",
    password: ""
  });
  const [adminPinInput, setAdminPinInput] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");

  // Default English ("EN") on fresh install
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem("we4all_app_lang_v4") || "EN";
  });
  const setLang = (nextLang) => {
    localStorage.setItem("we4all_app_lang_v4", nextLang);
    setLangState(nextLang);
  };

  // Geo-Location Regional Slang
  const [geoRegion, setGeoRegionState] = useState(() => {
    return localStorage.getItem("we4all_geo_region_v4") || "TELANGANA";
  });
  const setGeoRegion = (nextGeo) => {
    localStorage.setItem("we4all_geo_region_v4", nextGeo);
    setGeoRegionState(nextGeo);
  };

  const t = getLangText(lang);
  const geoSlang = getGeoSlangConfig(geoRegion);
  const [brightTheme, setBrightTheme] = useState(true);

  const [founderLogoUrl, setFounderLogoUrl] = useState(
    () => localStorage.getItem("we4all_founder_original_photo") || "/logo.png"
  );

  const handleUploadFounderPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFounderLogoUrl(reader.result);
      localStorage.setItem("we4all_founder_original_photo", reader.result);
      triggerToast("Official WE4ALL App Emblem updated!");
    };
    reader.readAsDataURL(file);
  };

  // Universal Live Diagnostic Error Popup Modal
  const [diagnosticErrorModal, setDiagnosticErrorModal] = useState(null);
  const reportAppError = (
    title,
    details,
    hint = "Verify input values or tap Auto-Fix below.",
    autoFixCallback = null
  ) => {
    setDiagnosticErrorModal({
      title: title || "Application Diagnostic Alert",
      details: details || "An unexpected operation issue occurred.",
      hint,
      time: new Date().toLocaleTimeString(),
      autoFixCallback
    });
  };

  // ==========================================================================
  // REQ 2, 6, 7 & 8: DEFAULT CONSUMER CONSOLE ON INSTALL + CHECKOUT AUTH GATE
  // ==========================================================================
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("we4all_persistent_session_v4") !== "logged_out";
  });
  // Always open directly into the Consumer Console ("customer") on install/startup!
  const [activePortal, setActivePortal] = useState("customer");
  const [personalShoppingFromPartner, setPersonalShoppingFromPartner] =
    useState(null);
  const [footerTab, setFooterTab] = useState("home");

  // Checkout / Account Login & Sign-Up Modal State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login"); // "login" | "signup"
  const [pendingCheckoutCallback, setPendingCheckoutCallback] = useState(null);
  const [regStep, setRegStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState("customer");
  const [loginInput, setLoginInput] = useState({ phoneOrName: "", pin: "1990" });
  const [regForm, setRegForm] = useState({
    role: "customer",
    vehicleCode: "2W",
    vehicleModel: "Hero Splendor / Activa",
    rcPlate: "",
    phone: "",
    generatedOtp: "",
    fullName: "",
    upiId: "",
    tcAccepted: false,
    digitalSignatureText: ""
  });

  const sigCanvasRef = useRef(null);
  const [isDrawingSig, setIsDrawingSig] = useState(false);
  const startSigDraw = (e) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawingSig(true);
  };
  const moveSigDraw = (e) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const ctx = canvas.getContext("2d");
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };
  const endSigDraw = () => setIsDrawingSig(false);

  // ==========================================================================
  // REQ 9: SILENT AUTOMATIC OTA UPDATE ON APP OPEN (ZERO APPROVAL NEEDED!)
  // If cloud version !== installed version -> automatically updates & reloads!
  // If cloud version === installed version -> skips and opens Consumer Console!
  // ==========================================================================
  const [appUpdateInfo, setAppUpdateInfo] = useState(() => {
    const installedVer = getDeviceInstalledVersion("3.0.3");
    return (
      savedCloud?.appUpdateInfo || {
        ...(INITIAL_APP_UPDATE_INFO || {}),
        currentVersion: installedVer,
        latestAvailableVersion: "3.0.4",
        updateAvailable: installedVer !== "3.0.4",
        releaseNotes:
          "WE4ALL v3.0.4: Default Consumer Console on Install, Visual Category Icon Grid with Labour Cart Ordering, Checkout Login/Sign-Up Gate & Silent Auto-Update on App Open."
      }
    );
  });
  const [otaProgress, setOtaProgress] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const triggerToast = (msg) => {
    sendMobileOsTrayNotification("WE4ALL Super-App", msg, `we4all-${Date.now()}`);
  };

  const handleRunOtaUpdate = (targetVerOverride = null) => {
    const targetVer =
      targetVerOverride ||
      appUpdateInfo?.latestAvailableVersion ||
      "3.0.4";
    localStorage.setItem("we4all_installed_ota_ver_v4", targetVer);
    performZeroLossOtaUpdate(
      targetVer,
      appUpdateInfo?.releaseNotes,
      (stage) => setOtaProgress(stage),
      (updatedInfo) => {
        setAppUpdateInfo({
          ...updatedInfo,
          currentVersion: targetVer,
          latestAvailableVersion: targetVer,
          updateAvailable: false
        });
        setOtaProgress(null);
      }
    );
  };

  useEffect(() => {
    linkMobileHardwareServicesSilently();
    // Automatic Zero-Click Startup OTA Check
    const runAutoStartupOta = async () => {
      const installedVer =
        localStorage.getItem("we4all_installed_ota_ver_v4") || "3.0.3";
      const remoteOta = await checkLiveCloudOtaManifest((payload) => {
        if (payload?.appUpdateInfo) setAppUpdateInfo(payload.appUpdateInfo);
      });
      const latestVer =
        remoteOta?.latestAvailableVersion ||
        appUpdateInfo?.latestAvailableVersion ||
        "3.0.4";

      // If a newer version exists, automatically update immediately without asking for approval!
      // If installedVer === latestVer, skip completely and stay in Consumer Console.
      if (latestVer && latestVer !== installedVer) {
        handleRunOtaUpdate(latestVer);
      }
    };
    runAutoStartupOta();
  }, []);

  const handleManualCheckForUpdate = async () => {
    setCheckingUpdate(true);
    const latest = await checkLiveCloudOtaManifest((payload) => {
      if (payload?.appUpdateInfo) setAppUpdateInfo(payload.appUpdateInfo);
    });
    setTimeout(() => {
      setCheckingUpdate(false);
      const installedVer =
        localStorage.getItem("we4all_installed_ota_ver_v4") || "3.0.4";
      const targetVer =
        latest?.latestAvailableVersion ||
        appUpdateInfo?.latestAvailableVersion ||
        "3.0.4";
      if (targetVer !== installedVer) {
        handleRunOtaUpdate(targetVer);
      } else {
        triggerToast(`Already on latest version (v${installedVer})!`);
      }
    }, 400);
  };

  // Labour & Work-Site Portal States (Integrated into Consumer Console & Cart!)
  const [labourWorkers, setLabourWorkers] = useState(
    savedCloud?.labourWorkers && savedCloud.labourWorkers.length > 0
      ? savedCloud.labourWorkers
      : INITIAL_LABOUR_WORKERS
  );
  const [labourBookings, setLabourBookings] = useState(
    savedCloud?.labourBookings || []
  );
  const [labourFilterSkill, setLabourFilterSkill] = useState("ALL");
  const [labourShiftMap, setLabourShiftMap] = useState({});
  const [labourCountMap, setLabourCountMap] = useState({});

  const [customPortals, setCustomPortals] = useState(
    savedCloud?.customPortals || [
      {
        id: "agri_mandi",
        title: "7. Agriculture & Kisan Mandi",
        badge: "Kisan Mandi",
        icon: "MANDI",
        description:
          "Direct farmer-to-buyer cotton, soya, seeds, fertilizers & tractor booking market",
        isPublished: true,
        tabs: [
          { id: "home", shortTag: "BID", label: "1. Mandi Bids" },
          { id: "catalog", shortTag: "CRP", label: "2. Crop Stock" },
          { id: "add_new", shortTag: "ADD", label: "3. + List Crop" },
          { id: "orders", shortTag: "LDG", label: "4. Kisan Ledger" },
          { id: "account", shortTag: "ACC", label: "Account" }
        ],
        items: [
          {
            id: "MANDI-101",
            title: "Adilabad Fresh Cotton / Soya Quintal",
            category: "Kisan Mandi",
            price: 6850,
            unit: "Per Quintal",
            stockOrSlots: 45
          }
        ],
        bookings: []
      }
    ]
  );

  const [accountSecurity, setAccountSecurity] = useState(
    savedCloud?.accountSecurity || {
      pinEnabled: true,
      biometricEnabled: true,
      fastPin: "1990"
    }
  );

  const [currentUser, setCurrentUser] = useState(
    savedCloud?.currentUser || {
      id: 1,
      fullName: "Khoday Anvesh",
      username: "anvesh_k",
      phone: "9848011223",
      role: "customer",
      vehicleCode: "2W",
      vehicleClass: "2W Bike Captain (Up to 45 kg)",
      vehicleModel: "Hero Splendor Plus 125cc",
      dlNumber: "TS-01-2022009812",
      rcPlate: "TS-01-EF-4599",
      decoratorSubRole: "flower_decorator",
      bankName: "State Bank of India",
      accountNumber: "30984451209",
      ifscCode: "SBIN0000801",
      upiId: "khodayanvesh@ybl",
      fastPin: "1990"
    }
  );

  const [pendingUpiPayment, setPendingUpiPayment] = useState(null);
  const [geoAds, setGeoAds] = useState(savedCloud?.geoAds || INITIAL_GEO_ADS);
  const [categories, setCategories] = useState(
    savedCloud?.categories || INITIAL_CATEGORIES
  );
  const [serviceCategories] = useState(SERVICE_CATEGORIES);
  const [merchants, setMerchants] = useState(
    savedCloud?.merchants || INITIAL_MERCHANTS
  );
  const [serviceProviders, setServiceProviders] = useState(
    savedCloud?.serviceProviders || INITIAL_SERVICE_PROVIDERS
  );
  const [decorators, setDecorators] = useState(
    savedCloud?.decorators || INITIAL_DECORATORS
  );
  const [products, setProducts] = useState(
    savedCloud?.products || INITIAL_PRODUCTS
  );
  const [functionHalls, setFunctionHalls] = useState(
    savedCloud?.functionHalls || INITIAL_FUNCTION_HALLS
  );
  const [riders, setRiders] = useState(savedCloud?.riders || INITIAL_RIDERS);

  const [captainRadarJobs, setCaptainRadarJobs] = useState(savedCloud?.captainRadarJobs || []);

  const [decorPortfolio, setDecorPortfolio] = useState(
    savedCloud?.decorPortfolio && savedCloud.decorPortfolio.length > 0
      ? savedCloud.decorPortfolio
      : [
          {
            id: "pf_101",
            ownerId: 401,
            ownerPhone: "9848044556",
            merchantName: "Padmavathi Royal Flower Decorators",
            subRole: "flower_decorator",
            title: "Royal Imported Orchid & Dutch Rose Wedding Mandap",
            decorType: "Wedding Mandap",
            materialUsed: "Fresh Bangkok Orchids, Dutch Roses, Warm LED Truss",
            albumName: "2026 Royal Muhurtham Collection",
            dimensionsSize: "40 ft x 16 ft Stage",
            baseEstimate: 26500,
            image:
              "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=85",
            isApproved: true
          }
        ]
  );

  const [decorReverseBids, setDecorReverseBids] = useState(
    savedCloud?.decorReverseBids || []
  );
  const [decorEscrowBookings, setDecorEscrowBookings] = useState(
    savedCloud?.decorEscrowBookings || []
  );
  const [pendingMerchants, setPendingMerchants] = useState(
    savedCloud?.pendingMerchants || []
  );
  const [pendingServiceProviders, setPendingServiceProviders] = useState(
    savedCloud?.pendingServiceProviders || []
  );
  const [pendingDecorators, setPendingDecorators] = useState(
    savedCloud?.pendingDecorators || []
  );
  const [pendingRiders, setPendingRiders] = useState(
    savedCloud?.pendingRiders || []
  );
  const [pendingSubCategories, setPendingSubCategories] = useState(
    savedCloud?.pendingSubCategories || []
  );
  const [monetizationConfig, setMonetizationConfig] = useState(
    savedCloud?.monetizationConfig || {
      globalPlatformFee: 0,
      serviceBookingSurcharge: 0
    }
  );

  const [splitScreens] = useState([
    { id: 1, role: "customer" },
    { id: 2, role: "merchant" },
    { id: 3, role: "service_provider" },
    { id: 4, role: "decorator" },
    { id: 5, role: "rider" },
    { id: 6, role: "labour_portal" }
  ]);

  const [addressBook] = useState([
    {
      id: "addr_home",
      label: "Home",
      fullAddress: "Subhash Nagar, Adilabad",
      distanceKm: 1.8,
      verified: true
    }
  ]);
  const activeAddressObj = addressBook[0];

  // REQ 5: Category-Wise Icon Selection State (Defaults to "daily_needs" or any chosen Category Icon)
  const [selectedCategory, setSelectedCategory] = useState("daily_needs");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVariantMap, setSelectedVariantMap] = useState({});
  const [selectedMerchantByProduct, setSelectedMerchantByProduct] = useState({});
  const [expandedCompareProdId, setExpandedCompareProdId] = useState(null);

  const [serviceFilterDate, setServiceFilterDate] = useState("2026-11-02");
  const [serviceFilterSlot, setServiceFilterSlot] = useState(
    "10:00 AM - 11:00 AM"
  );

  const [customerBookingForm, setCustomerBookingForm] = useState({
    forWhom: "For Myself",
    weightKg: 10,
    chosenVehicleCode: "2W",
    pickupPin: "Subhash Nagar, Adilabad",
    dropPin: "Collectorate Chowk, Adilabad",
    distanceKm: 2.8
  });

  // Unified Carts: Store Cart + Labour Cart + Service Cart + Decor Cart
  const [merchantCart, setMerchantCart] = useState(
    savedCloud?.merchantCart || []
  );
  const [labourCart, setLabourCart] = useState(savedCloud?.labourCart || []);
  const [serviceCart, setServiceCart] = useState(savedCloud?.serviceCart || []);
  const [decorCart, setDecorCart] = useState(savedCloud?.decorCart || []);
  const [cartChosenVehicleCode, setCartChosenVehicleCode] = useState("2W");

  const [orders, setOrders] = useState(savedCloud?.orders || []);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [liveOrderDrawerOpen, setLiveOrderDrawerOpen] = useState(false);
  const [serviceBookings, setServiceBookings] = useState(
    savedCloud?.serviceBookings || []
  );

  useEffect(() => {
    saveCloudAndLocalState({
      activePortal,
      appUpdateInfo,
      accountSecurity,
      currentUser,
      geoAds,
      categories,
      merchants,
      serviceProviders,
      decorators,
      riders,
      captainRadarJobs,
      pendingRiders,
      decorPortfolio,
      decorReverseBids,
      decorEscrowBookings,
      products,
      functionHalls,
      pendingMerchants,
      pendingServiceProviders,
      pendingDecorators,
      labourWorkers,
      labourBookings,
      customPortals,
      monetizationConfig,
      merchantCart,
      labourCart,
      serviceCart,
      decorCart,
      orders,
      serviceBookings
    });
  }, [
    activePortal,
    appUpdateInfo,
    accountSecurity,
    currentUser,
    geoAds,
    categories,
    merchants,
    serviceProviders,
    decorators,
    riders,
    captainRadarJobs,
    pendingRiders,
    decorPortfolio,
    decorReverseBids,
    decorEscrowBookings,
    products,
    functionHalls,
    pendingMerchants,
    pendingServiceProviders,
    pendingDecorators,
    labourWorkers,
    labourBookings,
    customPortals,
    monetizationConfig,
    merchantCart,
    labourCart,
    serviceCart,
    decorCart,
    orders,
    serviceBookings
  ]);

  useEffect(() => {
    let devId = localStorage.getItem("we4all_hw_device_id");
    if (!devId) {
      devId = `DEV-${Math.floor(10000 + Math.random() * 90000)}`;
      localStorage.setItem("we4all_hw_device_id", devId);
    }
    return startRealtimeMobileSensorStream(
      () => ({
        deviceId: devId,
        userId: currentUser?.id || "GUEST",
        fullName: currentUser?.fullName || "Guest Shopper",
        phone: currentUser?.phone || "Guest",
        role: currentUser?.role || "customer",
        portal: activePortal,
        vehicleCode: currentUser?.vehicleCode || "2W",
        upiId: currentUser?.upiId || "",
        address: "Adilabad Town, Telangana"
      }),
      (ping) => {
        setMyLivePing(ping);
        setLiveDeviceTelemetry((prev) => {
          const next = { ...(prev || {}), [ping.deviceId]: ping };
          saveCloudAndLocalState({ liveDeviceTelemetry: next });
          return next;
        });
      }
    );
  }, [currentUser, activePortal]);

  useEffect(() => {
    return subscribeToRealtimeUpdates((remoteState) => {
      if (remoteState.liveDeviceTelemetry) setLiveDeviceTelemetry(remoteState.liveDeviceTelemetry);
      if (remoteState.orders) setOrders(remoteState.orders);
      if (remoteState.serviceBookings)
        setServiceBookings(remoteState.serviceBookings);
      if (remoteState.captainRadarJobs)
        setCaptainRadarJobs(remoteState.captainRadarJobs);
      if (remoteState.labourWorkers)
        setLabourWorkers(remoteState.labourWorkers);
      if (remoteState.labourBookings)
        setLabourBookings(remoteState.labourBookings);
      if (remoteState.customPortals)
        setCustomPortals(remoteState.customPortals);
      if (remoteState.appUpdateInfo)
        setAppUpdateInfo(remoteState.appUpdateInfo);
    });
  }, []);

  const totalCartCount =
    merchantCart.reduce((s, i) => s + (i.qty || 1), 0) +
    labourCart.reduce((s, l) => s + (l.workersCount || 1), 0) +
    serviceCart.length +
    decorCart.length;

  const activeOrder =
    orders.find(
      (o) => o.id === activeOrderId && !o.status?.includes("CANCELLED")
    ) ||
    orders[0] ||
    null;

  // Gate Helper: Requires Login / Sign-Up only at Order Checkout!
  const requireAuthAtCheckout = (actionCallback) => {
    if (isAuthenticated) {
      actionCallback();
    } else {
      setPendingCheckoutCallback(() => actionCallback);
      setAuthModalMode("login");
      setAuthModalOpen(true);
    }
  };

  const getProductBestOffer = (product) => {
    const offers =
      product.merchantOffers && product.merchantOffers.length > 0
        ? [...product.merchantOffers].sort((a, b) => a.price - b.price)
        : [
            {
              merchantId: "m1",
              merchantName: cleanLabel(product.shopName),
              price: product.variants?.[0]?.price || 100,
              area: "Adilabad",
              rating: 4.9
            }
          ];
    const chosenId = selectedMerchantByProduct[product.id];
    const activeOffer =
      offers.find((o) => o.merchantId === chosenId) || offers[0];
    return { offers, lowestOffer: offers[0], activeOffer };
  };

  const handleAddToUnifiedMerchantCart = (product) => {
    recordUserActivityTelemetry("PRODUCT_INTERACT", {
      productId: product.id,
      categoryId: product.categoryId
    });
    const chosenVarId =
      selectedVariantMap[product.id] || product.variants[0].id;
    const variant =
      product.variants.find((v) => v.id === chosenVarId) || product.variants[0];
    const { activeOffer } = getProductBestOffer(product);
    const cleanName = cleanLabel(product.subCategoryBrand);
    const existing = merchantCart.find(
      (i) =>
        i.productId === product.id &&
        i.variantId === variant.id &&
        i.merchantId === activeOffer.merchantId
    );
    const updated = existing
      ? merchantCart.map((i) =>
          i.productId === product.id &&
          i.variantId === variant.id &&
          i.merchantId === activeOffer.merchantId
            ? { ...i, qty: i.qty + 1 }
            : i
        )
      : [
          ...merchantCart,
          {
            productId: product.id,
            categoryId: product.categoryId,
            variantId: variant.id,
            name: `${cleanName} (${variant.label})`,
            merchantId: activeOffer.merchantId,
            merchantName: cleanLabel(
              activeOffer.merchantName || product.shopName
            ),
            price: activeOffer.price || variant.price,
            weightGrams: variant.weightGrams || 1000,
            qty: 1
          }
        ];
    setMerchantCart(updated);
    triggerToast(`Added ${cleanName} to Cart!`);
  };

  // Add Labour / Mistri to Consumer Cart!
  const handleAddLabourToCart = (lw, localRoleTitle) => {
    const chosenShift =
      labourShiftMap[lw.id] || "Full-Day Shift (09:00 AM - 05:30 PM)";
    const chosenWorkers =
      labourCountMap[lw.id] ||
      (lw.workerType === "MISTRI_TOLI" ? lw.toliCount || 4 : 1);
    const isHalf = chosenShift.includes("Half-Day");
    const unitRate = isHalf ? lw.halfDayWage : lw.fullDayWage;
    const totalWage =
      chosenWorkers === 1
        ? unitRate
        : unitRate +
          Math.max(0, chosenWorkers - 1) *
            (isHalf
              ? Math.round((lw.helperDailyWage || 500) * 0.55)
              : lw.helperDailyWage || 500);

    const newLabourCartItem = {
      cartItemId: `lab_cart_${Date.now()}`,
      workerId: lw.id,
      workerName: lw.workerName,
      skillLabel: localRoleTitle,
      shiftType: chosenShift,
      workersCount: chosenWorkers,
      toolsList: lw.toolsList,
      addaLocation: lw.addaLocation,
      totalDailyWage: totalWage,
      siteAddress: activeAddressObj.fullAddress
    };
    setLabourCart([...labourCart, newLabourCartItem]);
    triggerToast(
      `Added ${lw.workerName} (${chosenWorkers} Workers - Rs.${totalWage}) to Cart!`
    );
  };

  const executeMerchantOrderCheckout = (
    enforcedVehCode,
    deliveryFee,
    totalWeightKg
  ) => {
    if (merchantCart.length === 0) return;
    const vRule =
      VEHICLE_CONSORT_RULES[enforcedVehCode] || VEHICLE_CONSORT_RULES["2W"];
    const itemsTotal = merchantCart.reduce((s, i) => s + i.price * i.qty, 0);
    const gst = Number(((itemsTotal + deliveryFee) * 0.05).toFixed(2));
    const grandTotal = Number((itemsTotal + deliveryFee + gst).toFixed(2));
    const shopNames = Array.from(
      new Set(merchantCart.map((i) => i.merchantName))
    ).join(" + ");
    const generatedOtp = String(Math.floor(1000 + Math.random() * 9000));
    const newOrder = {
      id: `VFL-${Math.floor(1000 + Math.random() * 9000)}`,
      dateStr: "2026-11-01",
      createdAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      }),
      periodTag: "TODAY",
      customerName: currentUser.fullName,
      address: activeAddressObj.fullAddress,
      distanceKm: activeAddressObj.distanceKm,
      totalWeightGrams: totalWeightKg * 1000,
      weightKg: totalWeightKg,
      requiredVehicleCode: enforcedVehCode,
      vehicle: vRule.label,
      shopName: shopNames,
      items: merchantCart.map((it) => ({
        ...it,
        approvalStatus: "PENDING_MERCHANT"
      })),
      itemsTotal,
      deliveryFee,
      gst,
      grandTotal,
      riderName: riders[0]?.name || "Raju Local Rider",
      status: "AWAITING_MERCHANT_APPROVAL",
      secretOtp: generatedOtp
    };

    const radarDispatch = {
      id: newOrder.id,
      requiredVehicleCode: enforcedVehCode,
      vehicleLabel: vRule.label,
      weightKg: totalWeightKg,
      badge: `Store Order (${totalWeightKg} kg | ${vRule.shortLabel})`,
      bookedBy: `Customer: ${currentUser.fullName} (Shop: ${shopNames})`,
      pickupPin: shopNames,
      dropPin: activeAddressObj.fullAddress,
      distFromCaptainKm: 0.5,
      distanceKm: activeAddressObj.distanceKm,
      captainPayout: deliveryFee,
      secretOtp: generatedOtp,
      status: "OPEN_ON_RADAR",
      paymentReqStatus: "PENDING_TRIP_COMPLETION"
    };

    setOrders([newOrder, ...orders]);
    setCaptainRadarJobs([radarDispatch, ...captainRadarJobs]);
    setActiveOrderId(newOrder.id);
    setMerchantCart([]);
    setFooterTab("orders");
    triggerToast(
      `Order #${newOrder.id} placed! Sent to Merchant Queue & ${vRule.shortLabel} Captain Radar.`
    );
  };

  const executeLabourOrderCheckout = () => {
    if (labourCart.length === 0) return;
    const createdCalls = labourCart.map((lc, idx) => ({
      id: `WRK-${Math.floor(1000 + Math.random() * 9000) + idx}`,
      customerName: currentUser.fullName,
      siteAddress: lc.siteAddress || activeAddressObj.fullAddress,
      skillNeeded: `${lc.workerName} (${lc.skillLabel})`,
      shiftType: lc.shiftType,
      hiringMode: `${lc.workersCount} Worker(s)`,
      workersCount: lc.workersCount,
      toolsRequirement: `Bring Tools (${lc.toolsList})`,
      transportNote: `From ${lc.addaLocation}`,
      teaBhattaNote: `${geoSlang.bhattaSlang} & Muster OTP Active`,
      totalDailyWage: lc.totalDailyWage,
      startWorkOtp: String(Math.floor(1000 + Math.random() * 9000)),
      wageReleaseOtp: String(Math.floor(1000 + Math.random() * 9000)),
      status: "OPEN_SITE_CALL",
      createdAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    }));
    setLabourBookings([...createdCalls, ...labourBookings]);
    setLabourCart([]);
    setFooterTab("orders");
    triggerToast(
      `Booked ${createdCalls.length} Labour Work-Site Call(s)! Dispatched to ${geoSlang.standSlang}.`
    );
  };

  const handleCompleteUpiPayment = (chosenUpiAppName) => {
    if (!pendingUpiPayment) return;
    if (pendingUpiPayment.type === "APPROVED_MERCHANT_ORDER") {
      setOrders(
        orders.map((o) =>
          o.id === pendingUpiPayment.orderId
            ? {
                ...o,
                paidViaApp: chosenUpiAppName,
                status: "PAID_PACKING_STARTED"
              }
            : o
        )
      );
      setPendingUpiPayment(null);
      setFooterTab("orders");
      setLiveOrderDrawerOpen(true);
      triggerToast(`Paid via ${chosenUpiAppName}! Merchant packing started.`);
    } else if (pendingUpiPayment.type === "SERVICE_ESCROW") {
      const created = serviceCart.map((sc) => ({
        ...sc,
        id: `SRV-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: currentUser.fullName,
        escrowVisitingAmount: sc.visitingFee,
        paidViaApp: chosenUpiAppName,
        happyCode: String(Math.floor(1000 + Math.random() * 9000)),
        periodTag: "TODAY",
        escrowStatus: "VISITING_FEE_HELD_IN_ESCROW",
        status: "CONFIRMED_PROVIDER_EN_ROUTE"
      }));
      setServiceBookings([...created, ...serviceBookings]);
      setServiceCart([]);
      setPendingUpiPayment(null);
      setFooterTab("orders");
      triggerToast(`Paid via ${chosenUpiAppName}! Visiting Fee held in Escrow.`);
    }
  };

  const openAdminGate = () => {
    setIsAdminAuthenticated(false);
    setAdminAuthStep(1);
    setViewMode("founder_web");
  };

  // ==========================================================================
  // PORTAL 1: CONSUMER SUPER-APP (CATEGORY ICON GRID + LABOUR + CHECKOUT GATE)
  // ==========================================================================
  const renderCustomerPortal = () => {
    const q = searchQuery.trim().toLowerCase();

    const getGeoCategoryLabel = (catId, fallback) => {
      return geoSlang?.categories?.[catId] || cleanLabel(fallback);
    };

    const getGeoLabourRoleLabel = (skillId, fallback) => {
      return geoSlang?.labourRoles?.[skillId] || cleanLabel(fallback);
    };

    // Visual Category-Wise Icons Grid (Tap any icon to open that specific section!)
    const categoryIconGrid = [
      {
        id: "daily_needs",
        icon: "\uD83D\uDED2",
        label: getGeoCategoryLabel("daily_needs", "Kirana & Daily")
      },
      {
        id: "veg_fruits",
        icon: "\uD83E\uDD66",
        label: getGeoCategoryLabel("veg_fruits", "Fresh Veg")
      },
      {
        id: "meat_fish",
        icon: "\uD83C\uDF57",
        label: getGeoCategoryLabel("meat_fish", "Meat & Fish")
      },
      {
        id: "construction",
        icon: "\uD83E\uDDF1",
        label: getGeoCategoryLabel("construction", "Cement & Steel")
      },
      {
        id: "medicines",
        icon: "\uD83D\uDC8A",
        label: getGeoCategoryLabel("medicines", "Medicines")
      },
      {
        id: "CAT_LABOUR",
        icon: "\uD83D\uDC77",
        label: geoSlang.standSlang.split("(")[0].trim()
      },
      {
        id: "CAT_SERVICES",
        icon: "\uD83D\uDEE0\uFE0F",
        label: t.services || "1-Hr Services"
      },
      {
        id: "CAT_DECOR",
        icon: "\uD83C\uDF38",
        label: t.decor || "Decor & Halls"
      },
      {
        id: "CAT_TAXI",
        icon: "\uD83D\uDEF5",
        label: t.taxi || "2W/3W/4W Rides"
      },
      {
        id: "CAT_MANDI",
        icon: "\uD83C\uDF3E",
        label: "Kisan Mandi"
      }
    ];

    const isStoreCategory = categories.some((c) => c.id === selectedCategory);

    const matchingProducts = products.filter(
      (p) =>
        (searchQuery.trim() !== "" || p.categoryId === selectedCategory) &&
        p.isPublished !== false &&
        p.inStock !== false &&
        (p.stockQty ?? 10) > 0 &&
        cleanLabel(p.subCategoryBrand).toLowerCase().includes(q)
    );

    const matchingLabour = labourWorkers.filter((lw) => {
      const roleSlang = getGeoLabourRoleLabel(lw.skillId, lw.skillLabel);
      return (
        lw.isAvailableToday !== false &&
        (labourFilterSkill === "ALL" || lw.skillId === labourFilterSkill) &&
        (cleanLabel(lw.workerName).toLowerCase().includes(q) ||
          roleSlang.toLowerCase().includes(q) ||
          cleanLabel(lw.addaLocation).toLowerCase().includes(q))
      );
    });

    const matchingServices = serviceProviders.filter(
      (sp) =>
        sp.isPublished !== false &&
        sp.isPublishedToPublic !== false &&
        (cleanLabel(sp.serviceCategory).toLowerCase().includes(q) ||
          cleanLabel(sp.specialization).toLowerCase().includes(q) ||
          cleanLabel(sp.maskedId).toLowerCase().includes(q))
    );

    const matchingDecor = decorPortfolio.filter(
      (dp) =>
        cleanLabel(dp.title).toLowerCase().includes(q) ||
        cleanLabel(dp.merchantName).toLowerCase().includes(q)
    );

    const cartTotalWeightGrams = merchantCart.reduce(
      (sum, it) => sum + (it.weightGrams || 1000) * (it.qty || 1),
      0
    );
    const cartWeightKg = Math.max(1, Math.ceil(cartTotalWeightGrams / 1000));
    const cartAllow2W = cartWeightKg <= 45;
    const cartAllow3W = cartWeightKg <= 300;
    const effectiveCartVehCode =
      !cartAllow2W && cartChosenVehicleCode === "2W"
        ? cartAllow3W
          ? "3W"
          : "4W_HEAVY"
        : !cartAllow3W && cartChosenVehicleCode === "3W"
        ? "4W_HEAVY"
        : cartChosenVehicleCode;
    const cartVehRule =
      VEHICLE_CONSORT_RULES[effectiveCartVehCode] ||
      VEHICLE_CONSORT_RULES["2W"];
    const cartDeliveryFee = Math.round(
      cartVehRule.baseFare2Km +
        activeAddressObj.distanceKm * cartVehRule.perKmRate
    );

    const wKg = Number(customerBookingForm.weightKg) || 1;
    const is2WAllowed = wKg <= 45;
    const is3WAllowed = wKg <= 300;
    const activeVehCode =
      !is2WAllowed && customerBookingForm.chosenVehicleCode === "2W"
        ? is3WAllowed
          ? "3W"
          : "4W_HEAVY"
        : !is3WAllowed && customerBookingForm.chosenVehicleCode === "3W"
        ? "4W_HEAVY"
        : customerBookingForm.chosenVehicleCode;
    const chosenRule =
      VEHICLE_CONSORT_RULES[activeVehCode] || VEHICLE_CONSORT_RULES["2W"];
    const calculatedFare = Math.round(
      chosenRule.baseFare2Km +
        customerBookingForm.distanceKm * chosenRule.perKmRate
    );

    return (
      <MobilePhoneShell
        title="Customer Super-App"
        badge={isAuthenticated ? "Prime" : "Guest"}
        activePortal="customer"
        footerTab={footerTab}
        setFooterTab={setFooterTab}
        totalCartCount={totalCartCount}
        totalOrdersCount={
          orders.length + serviceBookings.length + labourBookings.length
        }
        floatingLiveOrder={activeOrder}
        onOpenLiveOrderModal={() => setLiveOrderDrawerOpen(true)}
        brightTheme={brightTheme}
        lang={lang}
        personalShoppingFromPartner={personalShoppingFromPartner}
        onReturnToPartnerDesk={() => {
          setActivePortal(personalShoppingFromPartner);
          setPersonalShoppingFromPartner(null);
          setFooterTab("home");
        }}
      >
        {/* Clean Amazon-Style Delivery Location Bar */}
        <div className="bg-[#232f3e] text-white px-3 py-2 rounded-xl flex justify-between items-center gap-2 text-[10px]">
          <div className="flex items-center gap-2 truncate">
            <FounderLogoBadge logoUrl={founderLogoUrl} />
            <div>
              <span className="text-slate-300 block text-[8px]">
                {t.deliverTo}{" "}
                {isAuthenticated ? cleanLabel(currentUser.fullName) : "Guest"} (
                {geoSlang.stateName.split(" ")[0]})
              </span>
              <span className="text-amber-300 font-black text-[10px]">
                {activeAddressObj.label}: {activeAddressObj.fullAddress}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFooterTab("carts")}
            className="bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0 shadow"
          >
            Cart ({totalCartCount})
          </button>
        </div>

        {footerTab === "home" && (
          <div className="space-y-3">
            <GeoTargetedAdBanner
              adsList={geoAds}
              userTown="Adilabad"
              userState="Telangana"
              brightTheme={brightTheme}
            />

            {/* Universal Search Bar */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  recordUserActivityTelemetry("SEARCH", {
                    query: e.target.value
                  });
                }}
                placeholder={t.searchPlaceholder}
                className="flex-1 bg-white border-2 border-amber-400 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="bg-slate-800 text-white px-3 rounded-xl text-[10px] font-black cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* ============================================================== */}
            {/* REQ 1 & 5: VISUAL CATEGORY-WISE ICONS GRID (INCLUDING LABOUR!) */}
            {/* ============================================================== */}
            <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-slate-700 uppercase">
                  Shop &amp; Book by Category (Tap Any Icon):
                </span>
                <span className="text-[9px] font-bold text-emerald-700">
                  {geoSlang.stateName.split("(")[0]} Slang Active
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {categoryIconGrid.map((cat) => {
                  const active = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSearchQuery("");
                      }}
                      className={`p-2 rounded-xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${
                        active
                          ? "border-emerald-600 bg-emerald-600 text-white font-black shadow-md scale-[1.02]"
                          : "border-slate-200 bg-slate-50 text-slate-800 hover:border-emerald-400"
                      }`}
                    >
                      <span className="text-lg leading-none">{cat.icon}</span>
                      <span className="text-[9px] font-bold mt-1 leading-tight line-clamp-2">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ============================================================== */}
            {/* VIEW 1: STORE CATEGORY PRODUCTS (KIRANA, VEG, MEAT, CEMENT...) */}
            {/* ============================================================== */}
            {(isStoreCategory || searchQuery.trim() !== "") && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-black text-emerald-800 text-xs uppercase">
                    {getGeoCategoryLabel(selectedCategory, "Store Products")} (
                    {matchingProducts.length} Items)
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500">
                    {t.compareShops}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {matchingProducts.map((prod) => {
                    const chosenVarId =
                      selectedVariantMap[prod.id] || prod.variants[0].id;
                    const currentVar =
                      prod.variants.find((v) => v.id === chosenVarId) ||
                      prod.variants[0];
                    const { offers, activeOffer } = getProductBestOffer(prod);
                    const isCompareOpen = expandedCompareProdId === prod.id;
                    const cleanTitle = cleanLabel(prod.subCategoryBrand);
                    const localCatTitle =
                      geoSlang?.categories?.[prod.categoryId] ||
                      cleanLabel(prod.curiosityTag || "Local Market");
                    const inCartItem = merchantCart.find(
                      (i) =>
                        i.productId === prod.id &&
                        i.variantId === currentVar.id
                    );

                    return (
                      <div
                        key={prod.id}
                        className="rounded-2xl p-3 space-y-2 border bg-white border-slate-200 text-slate-900 shadow-sm"
                      >
                        <div className="flex gap-2.5 items-center">
                          <img
                            src={prod.image}
                            alt={cleanTitle}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] text-amber-600 font-black block truncate">
                              {localCatTitle} | Stock: {prod.stockQty ?? 25}
                            </span>
                            <h4 className="text-xs font-black text-slate-900 truncate">
                              {cleanTitle}
                            </h4>
                            <div className="flex justify-between items-center mt-0.5">
                              <p className="text-[10px] text-emerald-700 font-bold truncate">
                                {cleanLabel(activeOffer.merchantName)}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCompareProdId(
                                    isCompareOpen ? null : prod.id
                                  )
                                }
                                className="text-[9px] text-indigo-600 underline font-black cursor-pointer shrink-0"
                              >
                                {t.compareShops} ({offers.length})
                              </button>
                            </div>
                          </div>
                        </div>

                        {isCompareOpen && (
                          <div className="bg-slate-900 text-white p-2 rounded-xl space-y-1 text-[10px]">
                            {offers.map((off) => (
                              <button
                                key={off.merchantId}
                                type="button"
                                onClick={() =>
                                  setSelectedMerchantByProduct({
                                    ...selectedMerchantByProduct,
                                    [prod.id]: off.merchantId
                                  })
                                }
                                className="w-full p-1.5 rounded-lg border border-slate-700 flex justify-between cursor-pointer"
                              >
                                <span>{cleanLabel(off.merchantName)}</span>
                                <span className="text-emerald-400 font-bold">
                                  Rs.{off.price}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-1.5 items-center">
                          <select
                            value={currentVar.id}
                            onChange={(e) =>
                              setSelectedVariantMap({
                                ...selectedVariantMap,
                                [prod.id]: e.target.value
                              })
                            }
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[10px] text-emerald-300 flex-1 font-bold"
                          >
                            {prod.variants.map((v) => (
                              <option key={v.id} value={v.id}>
                                {cleanLabel(v.label)} - Rs.{v.price} (MRP Rs.{v.mrp})
                              </option>
                            ))}
                          </select>

                          {inCartItem ? (
                            <div className="flex items-center bg-emerald-600 text-white rounded-lg px-1.5 py-1 gap-2 font-black text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  if (inCartItem.qty <= 1) {
                                    setMerchantCart(
                                      merchantCart.filter(
                                        (x) => x !== inCartItem
                                      )
                                    );
                                  } else {
                                    setMerchantCart(
                                      merchantCart.map((x) =>
                                        x === inCartItem
                                          ? { ...x, qty: x.qty - 1 }
                                          : x
                                      )
                                    );
                                  }
                                }}
                                className="px-1.5 bg-emerald-800 rounded cursor-pointer"
                              >
                                -
                              </button>
                              <span>{inCartItem.qty}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddToUnifiedMerchantCart(prod)
                                }
                                className="px-1.5 bg-emerald-800 rounded cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleAddToUnifiedMerchantCart(prod)
                              }
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-lg text-[10px] cursor-pointer shrink-0"
                            >
                              {t.addCart}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* REQ 1: CONSUMER LABOUR ORDERING SECTION (SUB-CATEGORIES + CART)*/}
            {/* ============================================================== */}
            {(selectedCategory === "CAT_LABOUR" || searchQuery.trim() !== "") && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border-2 border-amber-400 space-y-3 text-xs">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[9px]">
                      ORDER LABOURERS TO CART &amp; CHECKOUT
                    </span>
                    <h3 className="font-black text-amber-300 text-xs mt-1 uppercase">
                      {geoSlang.standSlang} &amp; {geoSlang.groupSlang} Booking
                    </h3>
                    <p className="text-[10px] text-slate-300">
                      Choose work type sub-category below, select shift &amp; worker count, and tap <strong>+ Add Labour to Cart</strong>
                    </p>
                  </div>
                </div>

                {/* Sub-Category Pills for Labour Roles */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setLabourFilterSkill("ALL")}
                    className={`px-3 py-1.5 rounded-xl font-black text-[10px] shrink-0 cursor-pointer ${
                      labourFilterSkill === "ALL"
                        ? "bg-amber-400 text-slate-950"
                        : "bg-slate-950 text-slate-300 border border-slate-800"
                    }`}
                  >
                    All Labour ({labourWorkers.length})
                  </button>
                  {LABOUR_SKILL_CATEGORIES.map((sc) => {
                    const localRole = getGeoLabourRoleLabel(sc.id, sc.name);
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setLabourFilterSkill(sc.id)}
                        className={`px-3 py-1.5 rounded-xl font-black text-[10px] shrink-0 cursor-pointer ${
                          labourFilterSkill === sc.id
                            ? "bg-emerald-400 text-slate-950"
                            : "bg-slate-950 text-slate-300 border border-slate-800"
                        }`}
                      >
                        {localRole.split("(")[0].trim()}
                      </button>
                    );
                  })}
                </div>

                {/* Labour Worker / Toli Cards with + Add to Cart */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {matchingLabour.map((lw) => {
                    const localRoleTitle = getGeoLabourRoleLabel(
                      lw.skillId,
                      lw.skillLabel
                    );
                    const chosenShift =
                      labourShiftMap[lw.id] ||
                      "Full-Day Shift (09:00 AM - 05:30 PM)";
                    const chosenWorkers =
                      labourCountMap[lw.id] ??
                      (lw.workerType === "MISTRI_TOLI" ? lw.toliCount || 4 : 1);
                    const isHalf = chosenShift.includes("Half-Day");
                    const unitRate = isHalf ? lw.halfDayWage : lw.fullDayWage;
                    const estTotalWage =
                      chosenWorkers === 1
                        ? unitRate
                        : unitRate +
                          Math.max(0, chosenWorkers - 1) *
                            (isHalf
                              ? Math.round((lw.helperDailyWage || 500) * 0.55)
                              : lw.helperDailyWage || 500);

                    return (
                      <div
                        key={lw.id}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-black px-2 py-0.5 rounded">
                              {lw.workerType === "MISTRI_TOLI"
                                ? `${geoSlang.groupSlang}`
                                : "SINGLE WORKER"}{" "}
                              | {lw.experienceYrs} YRS EXP
                            </span>
                            <h4 className="font-black text-white text-xs mt-1">
                              {lw.workerName}
                            </h4>
                            <p className="text-[10px] text-amber-300 font-bold">
                              {localRoleTitle}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-black text-emerald-400 text-sm block">
                              Rs.{estTotalWage}
                            </span>
                            <span className="text-[8px] text-slate-400 block">
                              Full: Rs.{lw.fullDayWage} | Half: Rs.{lw.halfDayWage}
                            </span>
                          </div>
                        </div>

                        <p className="text-[9px] text-slate-400">
                          Stand: {lw.addaLocation} | Tools: {lw.toolsList}
                        </p>

                        <div className="grid grid-cols-3 gap-1.5 items-center pt-1">
                          <select
                            value={chosenShift}
                            onChange={(e) =>
                              setLabourShiftMap({
                                ...labourShiftMap,
                                [lw.id]: e.target.value
                              })
                            }
                            className="col-span-2 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[10px] text-white font-bold"
                          >
                            <option value="Full-Day Shift (09:00 AM - 05:30 PM)">
                              Full-Day (9AM - 5:30PM)
                            </option>
                            <option value="Half-Day Shift (4 Hours)">
                              Half-Day (4 Hours)
                            </option>
                            <option value="Contract / Piece-Rate">
                              Contract / Sq.Ft
                            </option>
                          </select>
                          <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-2 py-1">
                            <button
                              type="button"
                              onClick={() =>
                                setLabourCountMap({
                                  ...labourCountMap,
                                  [lw.id]: Math.max(1, chosenWorkers - 1)
                                })
                              }
                              className="text-amber-300 font-black cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-[10px] font-bold">
                              {chosenWorkers}P
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setLabourCountMap({
                                  ...labourCountMap,
                                  [lw.id]: chosenWorkers + 1
                                })
                              }
                              className="text-emerald-300 font-black cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleAddLabourToCart(lw, localRoleTitle)
                          }
                          className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2 rounded-xl text-[10px] cursor-pointer shadow"
                        >
                          + Add Labour to Cart ({chosenWorkers} Worker
                          {chosenWorkers > 1 ? "s" : ""} | Rs.{estTotalWage})
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 3: 1-HR HOME SERVICES */}
            {selectedCategory === "CAT_SERVICES" && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-indigo-500/40 space-y-2.5 text-xs">
                <h3 className="font-black text-indigo-300 text-xs uppercase">
                  1-Hr Home Services (Plumber, Electrician, AC, Carpenter)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {matchingServices.map((sp) => (
                    <div
                      key={sp.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center gap-2"
                    >
                      <div className="flex gap-2.5 items-center min-w-0">
                        <img
                          src={sp.image}
                          alt={cleanLabel(sp.maskedId)}
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">
                            {cleanLabel(sp.maskedId)} | {cleanLabel(sp.serviceCategory)}
                          </p>
                          <p className="text-[10px] text-emerald-400 font-bold">
                            Visit Escrow: Rs.{sp.visitingFee} | Hourly: Rs.{sp.hourlyRate}/hr
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setServiceCart([
                            ...serviceCart,
                            {
                              ...sp,
                              cartItemId: `sc_${Date.now()}`,
                              bookedDate: serviceFilterDate,
                              bookedSlot: serviceFilterSlot,
                              address: activeAddressObj.fullAddress
                            }
                          ]);
                          triggerToast(
                            `Added ${cleanLabel(sp.maskedId)} to Cart!`
                          );
                        }}
                        className="bg-indigo-500 text-white font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0"
                      >
                        + Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 4: DECOR & FUNCTION HALLS */}
            {selectedCategory === "CAT_DECOR" && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-amber-500/40 space-y-2.5 text-xs">
                <h3 className="font-black text-amber-400 text-xs uppercase">
                  Function Halls &amp; Flower Decoration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {matchingDecor.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex gap-2.5 items-center"
                    >
                      <img
                        src={item.image}
                        alt={cleanLabel(item.title)}
                        className="w-14 h-14 rounded-xl object-cover border border-amber-400/50 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-xs truncate">
                          {cleanLabel(item.title)}
                        </h4>
                        <p className="text-[10px] text-emerald-400 font-bold">
                          {cleanLabel(item.merchantName)} | Est. Rs.
                          {Number(item.baseEstimate).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDecorCart([...decorCart, item]);
                          triggerToast(
                            `Added "${cleanLabel(item.title)}" to Cart!`
                          );
                        }}
                        className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[9px] cursor-pointer shrink-0"
                      >
                        + Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 5: 2W / 3W / 4W RIDES & PARCELS */}
            {selectedCategory === "CAT_TAXI" && (
              <div className="bg-slate-900 p-3.5 rounded-2xl border border-teal-500/40 space-y-2.5 text-xs text-white">
                <h3 className="font-black text-teal-300 uppercase">
                  2W Bike, 3W Auto &amp; 4W Mini-Truck Booking
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { code: "2W", allowed: is2WAllowed, limitText: "Max 45 kg" },
                    { code: "3W", allowed: is3WAllowed, limitText: "Max 300 kg" },
                    { code: "4W_HEAVY", allowed: true, limitText: "Up to 2000 kg" }
                  ].map((opt) => {
                    const rule = VEHICLE_CONSORT_RULES[opt.code];
                    const selected = activeVehCode === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        disabled={!opt.allowed}
                        onClick={() =>
                          setCustomerBookingForm({
                            ...customerBookingForm,
                            chosenVehicleCode: opt.code
                          })
                        }
                        className={`p-2 rounded-xl border text-center transition ${
                          !opt.allowed
                            ? "bg-rose-950/30 border-rose-500/40 text-rose-400 opacity-50 cursor-not-allowed"
                            : selected
                            ? "bg-emerald-400 text-slate-950 border-white font-black cursor-pointer shadow"
                            : "bg-slate-950 text-slate-300 border-slate-800 cursor-pointer"
                        }`}
                      >
                        <div className="text-[10px] font-black">{rule.shortLabel}</div>
                        <div className="text-[8px] mt-0.5">
                          {opt.allowed ? opt.limitText : "Over Weight Limit"}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    requireAuthAtCheckout(() => {
                      const newJob = {
                        id: `RDR-${activeVehCode}-${Math.floor(
                          100 + Math.random() * 900
                        )}`,
                        requiredVehicleCode: activeVehCode,
                        vehicleLabel: chosenRule.label,
                        weightKg: wKg,
                        badge: `${chosenRule.shortLabel} (${wKg} kg)`,
                        bookedBy: `Customer: ${currentUser.fullName}`,
                        pickupPin: customerBookingForm.pickupPin,
                        dropPin: customerBookingForm.dropPin,
                        distFromCaptainKm: 0.6,
                        distanceKm: customerBookingForm.distanceKm,
                        captainPayout: calculatedFare,
                        secretOtp: String(
                          Math.floor(1000 + Math.random() * 9000)
                        ),
                        status: "OPEN_ON_RADAR",
                        paymentReqStatus: "PENDING_TRIP_COMPLETION"
                      };
                      setCaptainRadarJobs([newJob, ...captainRadarJobs]);
                      triggerToast(
                        `Booked ${chosenRule.shortLabel} #${newJob.id}!`
                      );
                    })
                  }
                  className="w-full bg-teal-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
                >
                  Book {chosenRule.shortLabel} Now (Rs.{calculatedFare})
                </button>
              </div>
            )}

            {/* VIEW 6: KISAN MANDI */}
            {selectedCategory === "CAT_MANDI" && (
              <div className="bg-slate-900 p-3.5 rounded-2xl border border-purple-500/40 space-y-2.5 text-xs text-white">
                <h3 className="font-black text-purple-300 uppercase">
                  Direct Kisan Mandi &amp; Farm Produce
                </h3>
                {customPortals.map((cp) =>
                  (cp.items || []).map((it) => (
                    <div
                      key={it.id}
                      className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-white text-xs">
                          {cleanLabel(it.title)}
                        </p>
                        <p className="text-[10px] text-amber-300">
                          Rs.{it.price} ({it.unit})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMerchantCart([
                            ...merchantCart,
                            {
                              productId: it.id,
                              variantId: "v1",
                              name: cleanLabel(it.title),
                              merchantId: cp.id,
                              merchantName: cleanLabel(cp.title),
                              price: Number(it.price) || 199,
                              weightGrams: 1000,
                              qty: 1
                            }
                          ]);
                          triggerToast(`Added ${cleanLabel(it.title)} to Cart!`);
                        }}
                        className="bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
                      >
                        + Add to Cart
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sticky Bottom Checkout Pill whenever Cart has items or labourers */}
            {totalCartCount > 0 && (
              <div className="sticky bottom-2 z-30 pt-1">
                <button
                  type="button"
                  onClick={() => setFooterTab("carts")}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-amber-400 flex justify-between items-center cursor-pointer"
                >
                  <div className="text-left">
                    <span className="text-xs font-black block">
                      {totalCartCount} Item(s) / Worker(s) in Cart
                    </span>
                    <span className="text-[9px] text-amber-200 font-bold block">
                      Tap to Review Cart &amp; Proceed to Checkout
                    </span>
                  </div>
                  <span className="bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-xl text-[10px]">
                    Go to Checkout &rarr;
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {footerTab === "services" && (
          <div className="space-y-2.5 text-xs text-white">
            {matchingServices.map((sp) => (
              <div
                key={sp.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2"
              >
                <div className="flex gap-2.5 items-center">
                  <img
                    src={sp.image}
                    alt={cleanLabel(sp.maskedId)}
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                  <div>
                    <p className="font-bold text-white">
                      {cleanLabel(sp.maskedId)} | {cleanLabel(sp.serviceCategory)}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-bold">
                      Visit Escrow: Rs.{sp.visitingFee} | Hourly: Rs.{sp.hourlyRate}/hr
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setServiceCart([
                      ...serviceCart,
                      {
                        ...sp,
                        cartItemId: `sc_${Date.now()}`,
                        bookedDate: serviceFilterDate,
                        bookedSlot: serviceFilterSlot,
                        address: activeAddressObj.fullAddress
                      }
                    ]);
                    setFooterTab("carts");
                  }}
                  className="w-full bg-indigo-500 text-white font-black py-1.5 rounded-xl text-[10px] cursor-pointer"
                >
                  + Add 1-Hr Slot to Cart (Rs.{sp.visitingFee})
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ================================================================ */}
        {/* UNIFIED CARTS TAB (STORE ITEMS + LABOUR + SERVICES + DECOR)      */}
        {/* Triggers Login / Sign-Up Gate at Checkout if Not Signed In!      */}
        {/* ================================================================ */}
        {footerTab === "carts" && (
          <div className="space-y-3 text-xs text-white">
            {totalCartCount === 0 && (
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center space-y-2">
                <p className="font-bold text-slate-300">
                  Your Cart is currently empty.
                </p>
                <button
                  type="button"
                  onClick={() => setFooterTab("home")}
                  className="bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-[10px] cursor-pointer"
                >
                  Browse Categories &amp; Add Items
                </button>
              </div>
            )}

            {/* 1. Store Products Cart */}
            {merchantCart.length > 0 && (
              <div className="bg-slate-900 p-3.5 rounded-2xl border border-emerald-500/40 space-y-2.5">
                <h4 className="font-black text-emerald-400">
                  1. Store Shopping Cart ({cartWeightKg} kg Total Load)
                </h4>
                {merchantCart.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-slate-950 p-2 rounded-xl border border-slate-800"
                  >
                    <div>
                      <p className="font-bold text-white">
                        {it.qty}x {cleanLabel(it.name)}
                      </p>
                      <p className="text-[9px] text-slate-400">
                        Shop: {cleanLabel(it.merchantName)}
                      </p>
                    </div>
                    <span className="text-amber-300 font-black">
                      Rs.{it.price * it.qty}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    requireAuthAtCheckout(() =>
                      executeMerchantOrderCheckout(
                        effectiveCartVehCode,
                        cartDeliveryFee,
                        cartWeightKg
                      )
                    )
                  }
                  className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
                >
                  Proceed to Checkout &amp; Place Store Order (Delivery Rs.{cartDeliveryFee}) &rarr;
                </button>
              </div>
            )}

            {/* 2. Labour & Mistri Cart */}
            {labourCart.length > 0 && (
              <div className="bg-slate-900 p-3.5 rounded-2xl border-2 border-amber-400 space-y-2.5">
                <div className="flex justify-between items-center">
                  <h4 className="font-black text-amber-300">
                    2. {geoSlang.standSlang} Booking Cart ({labourCart.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setLabourCart([])}
                    className="text-[9px] text-rose-300 underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                {labourCart.map((lc) => (
                  <div
                    key={lc.cartItemId}
                    className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-white">
                        {lc.workerName} ({lc.workersCount} Worker
                        {lc.workersCount > 1 ? "s" : ""})
                      </p>
                      <p className="text-[10px] text-amber-300">
                        {lc.skillLabel} | {lc.shiftType}
                      </p>
                    </div>
                    <span className="font-black text-emerald-400">
                      Rs.{lc.totalDailyWage}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    requireAuthAtCheckout(() => executeLabourOrderCheckout())
                  }
                  className="w-full bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
                >
                  Proceed to Checkout &amp; Confirm Labour Booking (Rs.
                  {labourCart.reduce((s, l) => s + l.totalDailyWage, 0)}) &rarr;
                </button>
              </div>
            )}

            {/* 3. 1-Hr Home Service Cart */}
            {serviceCart.length > 0 && (
              <div className="bg-slate-900 p-3 rounded-2xl border border-indigo-500/40 space-y-2">
                <h4 className="font-black text-indigo-300">
                  3. 1-Hr Service Escrow Cart
                </h4>
                {serviceCart.map((c) => (
                  <div
                    key={c.cartItemId}
                    className="bg-slate-950 p-2 rounded-xl flex justify-between"
                  >
                    <span>
                      {cleanLabel(c.maskedId)} ({c.bookedSlot})
                    </span>
                    <span className="text-amber-300 font-bold">
                      Rs.{c.visitingFee}
                    </span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    requireAuthAtCheckout(() =>
                      setPendingUpiPayment({
                        type: "SERVICE_ESCROW",
                        title: "Visiting Fee Escrow",
                        amount: serviceCart.reduce(
                          (s, i) => s + i.visitingFee,
                          0
                        )
                      })
                    )
                  }
                  className="w-full bg-indigo-500 text-white font-black py-2.5 rounded-xl cursor-pointer"
                >
                  Checkout &amp; Pay Visiting Fee via UPI &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {footerTab === "orders" && (
          <div className="space-y-3">
            {labourBookings.length > 0 && (
              <div className="bg-slate-900 p-3 rounded-2xl border border-amber-400/50 space-y-2 text-xs text-white">
                <h4 className="font-black text-amber-300">
                  Active Labour &amp; Work-Site Bookings ({labourBookings.length})
                </h4>
                {labourBookings.map((lb) => (
                  <div
                    key={lb.id}
                    className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-white">
                        #{lb.id} | {lb.skillNeeded}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Start OTP: <strong className="text-emerald-400">{lb.startWorkOtp}</strong> | Release OTP: <strong className="text-amber-300">{lb.wageReleaseOtp}</strong>
                      </p>
                    </div>
                    <span className="font-black text-emerald-400">
                      Rs.{lb.totalDailyWage}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <OrdersHistoryAndInvoice
              orders={orders}
              serviceBookings={serviceBookings}
              onCancelOrder={(id) =>
                setOrders(
                  orders.map((o) =>
                    o.id === id ? { ...o, status: "CANCELLED_BY_USER" } : o
                  )
                )
              }
              onReturnOrder={(id) =>
                setOrders(
                  orders.map((o) =>
                    o.id === id ? { ...o, status: "RETURN_REQUESTED" } : o
                  )
                )
              }
              onOpenLiveMap={(ord) => {
                setActiveOrderId(ord.id);
                setLiveOrderDrawerOpen(true);
              }}
              onTriggerToast={triggerToast}
            />
          </div>
        )}

        {footerTab === "account" && renderSharedAccountTab("customer")}
      </MobilePhoneShell>
    );
  };

  const switchPartnerToConsumerShopping = (partnerRoleName) => {
    setPersonalShoppingFromPartner(partnerRoleName);
    setActivePortal("customer");
    setSelectedCategory("daily_needs");
    setFooterTab("home");
  };

  const renderSharedAccountTab = (partnerRole) => (
    <OwnerAccountProfile
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
      isAuthenticated={isAuthenticated}
      onOpenAuthModal={(mode) => {
        setAuthModalMode(mode || "login");
        setAuthModalOpen(true);
      }}
      activePortal={activePortal}
      setActivePortal={(nextPortal) => {
        if (nextPortal === "customer")
          switchPartnerToConsumerShopping(partnerRole);
        else {
          setActivePortal(nextPortal);
          setFooterTab("home");
        }
      }}
      activeAddressObj={activeAddressObj}
      accountSecurity={accountSecurity}
      setAccountSecurity={setAccountSecurity}
      onLockApp={() => {
        localStorage.setItem("we4all_persistent_session_v4", "logged_out");
        setIsAuthenticated(false);
        setActivePortal("customer");
        setFooterTab("home");
        triggerToast("Signed out. Returned to Consumer Shopping Mode.");
      }}
      brightTheme={brightTheme}
      setBrightTheme={setBrightTheme}
      lang={lang}
      setLang={setLang}
      geoRegion={geoRegion}
      setGeoRegion={setGeoRegion}
      appUpdateInfo={appUpdateInfo}
      onCheckForUpdate={handleManualCheckForUpdate}
      checkingUpdate={checkingUpdate}
      onRunOtaUpdate={() => handleRunOtaUpdate()}
      otaProgress={otaProgress}
      onTriggerToast={triggerToast}
    />
  );

  const renderMerchantPortal = () => (
    <MobilePhoneShell
      title="2. Product Merchant"
      badge="Merchant"
      activePortal="merchant"
      footerTab={footerTab}
      setFooterTab={setFooterTab}
      totalCartCount={totalCartCount}
      totalOrdersCount={orders.length}
      brightTheme={brightTheme}
      lang={lang}
    >
      <PortalPowerToolsBar
        activePortal="merchant"
        lang={lang}
        onTriggerToast={triggerToast}
      />
      <MerchantPortal
        footerTab={footerTab}
        setFooterTab={setFooterTab}
        currentUser={currentUser}
        categories={categories}
        products={products}
        setProducts={setProducts}
        pendingSubCategories={pendingSubCategories}
        setPendingSubCategories={setPendingSubCategories}
        orders={orders}
        setOrders={setOrders}
        merchants={merchants}
        pendingMerchants={pendingMerchants}
        onSwitchToPersonalShop={() =>
          switchPartnerToConsumerShopping("merchant")
        }
        onTriggerToast={triggerToast}
        renderAccountTab={() => renderSharedAccountTab("merchant")}
      />
    </MobilePhoneShell>
  );

  const renderServiceProviderPortal = () => (
    <MobilePhoneShell
      title="3. Service Provider"
      badge="Service Pro"
      activePortal="service_provider"
      footerTab={footerTab}
      setFooterTab={setFooterTab}
      totalCartCount={totalCartCount}
      totalOrdersCount={serviceBookings.length}
      brightTheme={brightTheme}
      lang={lang}
    >
      <PortalPowerToolsBar
        activePortal="service_provider"
        lang={lang}
        onTriggerToast={triggerToast}
      />
      <ServiceProviderPortal
        footerTab={footerTab}
        setFooterTab={setFooterTab}
        currentUser={currentUser}
        serviceCategories={serviceCategories}
        serviceProviders={serviceProviders}
        setServiceProviders={setServiceProviders}
        pendingServiceProviders={pendingServiceProviders}
        serviceBookings={serviceBookings}
        setServiceBookings={setServiceBookings}
        onSwitchToPersonalShop={() =>
          switchPartnerToConsumerShopping("service_provider")
        }
        onTriggerToast={triggerToast}
        renderAccountTab={() => renderSharedAccountTab("service_provider")}
      />
    </MobilePhoneShell>
  );

  const renderDecoratorPortal = () => (
    <MobilePhoneShell
      title="4. Decorator & Halls"
      badge="Decor Suite"
      activePortal="decorator"
      footerTab={footerTab}
      setFooterTab={setFooterTab}
      totalCartCount={totalCartCount}
      totalOrdersCount={decorReverseBids.length}
      brightTheme={brightTheme}
      lang={lang}
    >
      <PortalPowerToolsBar
        activePortal="decorator"
        lang={lang}
        onTriggerToast={triggerToast}
      />
      <DecoratorPortal
        footerTab={footerTab}
        setFooterTab={setFooterTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        functionHalls={functionHalls}
        setFunctionHalls={setFunctionHalls}
        decorPortfolio={decorPortfolio}
        setDecorPortfolio={setDecorPortfolio}
        decorReverseBids={decorReverseBids}
        setDecorReverseBids={setDecorReverseBids}
        decorEscrowBookings={decorEscrowBookings}
        setDecorEscrowBookings={setDecorEscrowBookings}
        pendingDecorators={pendingDecorators}
        onSwitchToPersonalShop={() =>
          switchPartnerToConsumerShopping("decorator")
        }
        onTriggerToast={triggerToast}
        renderAccountTab={() => renderSharedAccountTab("decorator")}
      />
    </MobilePhoneShell>
  );

  const renderRiderPortal = () => (
    <MobilePhoneShell
      title="5. Delivery Captain"
      badge={`v3.0.4 (${currentUser?.vehicleCode || "2W"})`}
      activePortal="rider"
      footerTab={footerTab}
      setFooterTab={setFooterTab}
      totalCartCount={totalCartCount}
      totalOrdersCount={captainRadarJobs.length + orders.length}
      brightTheme={brightTheme}
      lang={lang}
    >
      <PortalPowerToolsBar
        activePortal="rider"
        lang={lang}
        onTriggerToast={triggerToast}
      />
      <RiderCaptainPortal
        footerTab={footerTab}
        setFooterTab={setFooterTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        orders={orders}
        setOrders={setOrders}
        captainRadarJobs={captainRadarJobs}
        setCaptainRadarJobs={setCaptainRadarJobs}
        pendingRiders={pendingRiders}
        onSwitchToPersonalShop={() => switchPartnerToConsumerShopping("rider")}
        onTriggerToast={triggerToast}
        onReportError={reportAppError}
        renderAccountTab={() => renderSharedAccountTab("rider")}
      />
    </MobilePhoneShell>
  );

  const renderLabourPortal = () => (
    <MobilePhoneShell
      title={`6. ${geoSlang.standSlang}`}
      badge={geoSlang.groupSlang}
      activePortal="labour_portal"
      footerTab={footerTab}
      setFooterTab={setFooterTab}
      totalCartCount={totalCartCount}
      totalOrdersCount={labourBookings.length}
      brightTheme={brightTheme}
      lang={lang}
    >
      <LabourWorksitePortal
        footerTab={footerTab}
        setFooterTab={setFooterTab}
        currentUser={currentUser}
        geoRegion={geoRegion}
        labourWorkers={labourWorkers}
        setLabourWorkers={setLabourWorkers}
        labourBookings={labourBookings}
        setLabourBookings={setLabourBookings}
        onSwitchToPersonalShop={() =>
          switchPartnerToConsumerShopping("labour_portal")
        }
        onTriggerToast={triggerToast}
        renderAccountTab={() => renderSharedAccountTab("labour_portal")}
      />
    </MobilePhoneShell>
  );

  const activeDynamicPortal = customPortals.find((cp) => cp.id === activePortal);
  const renderDynamicCustomPortal = (portalCfg) => (
    <MobilePhoneShell
      title={cleanLabel(portalCfg.title)}
      badge={cleanLabel(portalCfg.badge)}
      activePortal={portalCfg.id}
      footerTab={footerTab}
      setFooterTab={setFooterTab}
      totalCartCount={totalCartCount}
      totalOrdersCount={(portalCfg.bookings || []).length}
      brightTheme={brightTheme}
      lang={lang}
      customPortalTabs={portalCfg.tabs}
    >
      <DynamicPortalEngine
        portalConfig={portalCfg}
        footerTab={footerTab}
        setFooterTab={setFooterTab}
        currentUser={currentUser}
        onUpdatePortalConfig={(updatedCfg) => {
          setCustomPortals(
            customPortals.map((x) => (x.id === updatedCfg.id ? updatedCfg : x))
          );
        }}
        onSwitchToPersonalShop={() =>
          switchPartnerToConsumerShopping(cleanLabel(portalCfg.title))
        }
        onTriggerToast={triggerToast}
        renderAccountTab={() => renderSharedAccountTab(portalCfg.id)}
      />
    </MobilePhoneShell>
  );

  const renderAdminAuthGate = () => (
    <div className="min-h-screen bg-[#04090e] flex items-center justify-center p-4 text-white">
      <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl max-w-sm w-full p-5 space-y-3 shadow-2xl text-xs">
        <h2 className="text-sm font-black text-amber-400">
          WE4ALL 2-STEP FOUNDER ADMIN GATE
        </h2>
        {adminLoginError && (
          <div className="bg-rose-950 border border-rose-500 text-rose-200 p-2 rounded-xl text-center font-bold">
            {adminLoginError}
          </div>
        )}
        {adminAuthStep === 1 ? (
          <div className="space-y-3">
            <input
              type="text"
              value={adminLoginForm.username}
              onChange={(e) =>
                setAdminLoginForm({
                  ...adminLoginForm,
                  username: e.target.value
                })
              }
              placeholder="Founder Username (KhodayAnvesh)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
            />
            <input
              type="password"
              value={adminLoginForm.password}
              onChange={(e) =>
                setAdminLoginForm({
                  ...adminLoginForm,
                  password: e.target.value
                })
              }
              placeholder="Founder Password"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewMode("mobile_app")}
                className="bg-slate-800 text-slate-300 px-3 py-2.5 rounded-xl font-bold cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    adminLoginForm.username.trim().toLowerCase() ===
                      "khodayanvesh" &&
                    adminLoginForm.password === "22061969s!"
                  ) {
                    setAdminAuthStep(2);
                    setAdminLoginError("");
                  } else {
                    setAdminLoginError("Invalid Founder Credentials.");
                  }
                }}
                className="flex-1 bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
              >
                Step 1: Verify
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <input
              type="password"
              maxLength={4}
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              placeholder="4-Digit Founder PIN (9999)"
              className="w-full bg-slate-950 border border-amber-400 rounded-xl p-3 text-center font-mono text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (adminPinInput.trim() === "9999") {
                  setIsAdminAuthenticated(true);
                  setAdminPinInput("");
                  setAdminAuthStep(1);
                } else {
                  setAdminLoginError("Invalid PIN.");
                }
              }}
              className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
            >
              Step 2: Unlock Admin Suite
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#071118] text-white flex flex-col relative">
      {viewMode === "founder_web" ? (
        !isAdminAuthenticated ? (
          renderAdminAuthGate()
        ) : (
          <FounderAdminSuite
            registeredUsers={registeredUsers}
            orders={orders}
            serviceBookings={serviceBookings}
            captainRadarJobs={captainRadarJobs}
            liveDeviceTelemetry={liveDeviceTelemetry}
            onWipeAllTestData={async () => {
              await wipeAllOnlineAndOfflineData();
              setOrders([]);
              setServiceBookings([]);
              setCaptainRadarJobs([]);
              setPendingMerchants([]);
              setPendingServiceProviders([]);
              setPendingDecorators([]);
              setPendingRiders([]);
              setLiveDeviceTelemetry({});
              triggerToast("Production Reset Complete: All Online & Offline Test Data Wiped!");
            }}
            founderLogoUrl={founderLogoUrl}
            onUploadFounderPhoto={handleUploadFounderPhoto}
            categories={categories}
            setCategories={setCategories}
            geoAds={geoAds}
            setGeoAds={setGeoAds}
            merchants={merchants}
            setMerchants={setMerchants}
            serviceProviders={serviceProviders}
            setServiceProviders={setServiceProviders}
            decorators={decorators}
            setDecorators={setDecorators}
            riders={riders}
            setRiders={setRiders}
            pendingMerchants={pendingMerchants}
            setPendingMerchants={setPendingMerchants}
            pendingServiceProviders={pendingServiceProviders}
            setPendingServiceProviders={setPendingServiceProviders}
            pendingDecorators={pendingDecorators}
            setPendingDecorators={setPendingDecorators}
            pendingRiders={pendingRiders}
            setPendingRiders={setPendingRiders}
            orders={orders}
            serviceBookings={serviceBookings}
            customPortals={customPortals}
            setCustomPortals={setCustomPortals}
            monetizationConfig={monetizationConfig}
            setMonetizationConfig={setMonetizationConfig}
            appUpdateInfo={appUpdateInfo}
            setAppUpdateInfo={setAppUpdateInfo}
            onBroadcastOtaPushNotification={(nextInfo) => {
              saveCloudAndLocalState({ appUpdateInfo: nextInfo });
              handleRunOtaUpdate(nextInfo.latestAvailableVersion);
            }}
            onLaunchMultiPhoneView={() => {
              setActivePortal("split");
              setViewMode("mobile_app");
            }}
            onTeleportToScreen={(flowId) => {
              setViewMode("mobile_app");
              setFooterTab("home");
              if (flowId === "portal_rider") setActivePortal("rider");
              else if (flowId === "portal_decorator")
                setActivePortal("decorator");
              else if (flowId === "portal_service")
                setActivePortal("service_provider");
              else if (flowId === "portal_merchant")
                setActivePortal("merchant");
              else if (flowId === "portal_customer") {
                setActivePortal("customer");
                setSelectedCategory("daily_needs");
              } else {
                setActivePortal(flowId);
              }
            }}
            onExitAdminToApp={() => setViewMode("mobile_app")}
            onTriggerToast={triggerToast}
          />
        )
      ) : (
        <main className="flex-1 flex flex-col justify-center items-center w-full">
          {activePortal === "customer" && renderCustomerPortal()}
          {activePortal === "merchant" && renderMerchantPortal()}
          {activePortal === "service_provider" && renderServiceProviderPortal()}
          {activePortal === "decorator" && renderDecoratorPortal()}
          {activePortal === "rider" && renderRiderPortal()}
          {activePortal === "labour_portal" && renderLabourPortal()}
          {activeDynamicPortal && renderDynamicCustomPortal(activeDynamicPortal)}
          {activePortal === "split" && (
            <div className="w-full flex overflow-x-auto gap-4 p-4 snap-x snap-mandatory">
              {splitScreens.map((p, i) => (
                <div
                  key={p.id}
                  className="min-w-[395px] shrink-0 snap-center relative pt-6"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 px-3 py-0.5 rounded-full text-[10px] font-black z-40">
                    PHONE #{i + 1}: {p.role.toUpperCase()}
                  </div>
                  {p.role === "customer" && renderCustomerPortal()}
                  {p.role === "merchant" && renderMerchantPortal()}
                  {p.role === "service_provider" &&
                    renderServiceProviderPortal()}
                  {p.role === "decorator" && renderDecoratorPortal()}
                  {p.role === "rider" && renderRiderPortal()}
                  {p.role === "labour_portal" && renderLabourPortal()}
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ==================================================================== */}
      {/* REQ 6, 7 & 8: CHECKOUT & ACCOUNT LOGIN / SIGN-UP MODAL               */}
      {/* Existing User/Partner -> Login | New User/Partner -> Sign-Up Form    */}
      {/* ==================================================================== */}
      {authModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-[95] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-md w-full p-5 space-y-3 text-xs text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-black text-amber-400 text-sm">
                WE4ALL LOGIN &amp; PARTNER REGISTRATION GATE
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAuthModalOpen(false);
                  setPendingCheckoutCallback(null);
                }}
                className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl font-black cursor-pointer"
              >
                X
              </button>
            </div>

            {/* 2 Mode Switcher: Existing Login vs New Sign Up */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAuthModalMode("login")}
                className={`py-2 rounded-xl font-black cursor-pointer ${
                  authModalMode === "login"
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-300"
                }`}
              >
                1. Existing User (Login)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode("signup");
                  setRegStep(1);
                }}
                className={`py-2 rounded-xl font-black cursor-pointer ${
                  authModalMode === "signup"
                    ? "bg-amber-400 text-slate-950"
                    : "text-slate-300"
                }`}
              >
                2. New User (Sign Up)
              </button>
            </div>

            {/* Role Selector (Consumer, Merchant, Service Pro, Decorator, Captain, Labour) */}
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-300 font-bold">
                Select Account / Portal Type:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setRegForm({ ...regForm, role: e.target.value });
                }}
                className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl p-2 text-white font-bold"
              >
                <option value="customer">1. Consumer (Shopping &amp; Checkout)</option>
                <option value="merchant">2. Product Merchant (Supermart / Kirana)</option>
                <option value="service_provider">3. 1-Hr Home Service Provider</option>
                <option value="decorator">4. Flower Decorator &amp; Function Halls</option>
                <option value="rider">5. Delivery Captain (2W / 3W / 4W)</option>
                <option value="labour_portal">
                  6. {geoSlang.standSlang} Worker / Mistri
                </option>
              </select>
            </div>

            {authModalMode === "login" ? (
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={loginInput.phoneOrName}
                  onChange={(e) =>
                    setLoginInput({ ...loginInput, phoneOrName: e.target.value })
                  }
                  placeholder="Registered Mobile Number or Name"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
                <input
                  type="password"
                  maxLength={4}
                  value={loginInput.pin}
                  onChange={(e) =>
                    setLoginInput({ ...loginInput, pin: e.target.value })
                  }
                  placeholder="4-Digit Security PIN (Default: 1990)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await verifyPhoneHardwareBiometric(
                      loginInput.phoneOrName || currentUser.fullName
                    );
                    localStorage.setItem("we4all_persistent_session_v4", "active");
                    setIsAuthenticated(true);
                    if (loginInput.phoneOrName.trim()) {
                      setCurrentUser({
                        ...currentUser,
                        fullName: loginInput.phoneOrName.trim(),
                        role: selectedRole
                      });
                    }
                    setAuthModalOpen(false);
                    if (pendingCheckoutCallback) {
                      const cb = pendingCheckoutCallback;
                      setPendingCheckoutCallback(null);
                      cb();
                    } else {
                      setActivePortal(selectedRole);
                      setFooterTab("home");
                    }
                    triggerToast(`Logged in as ${selectedRole.toUpperCase()}!`);
                  }}
                  className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
                >
                  Verify Biometric / PIN &amp; Login Now &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold">
                  <span>3-Step Registration Form ({selectedRole.toUpperCase()})</span>
                  <span>Step {regStep} of 3</span>
                </div>

                {regStep === 1 && (
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      <input
                        type="tel"
                        maxLength={10}
                        value={regForm.phone}
                        onChange={(e) =>
                          setRegForm({ ...regForm, phone: e.target.value })
                        }
                        placeholder="Enter 10-Digit Mobile Number"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const otp = String(
                            Math.floor(1000 + Math.random() * 9000)
                          );
                          setRegForm({ ...regForm, generatedOtp: otp });
                          triggerToast(`Registration OTP Sent: ${otp}`);
                        }}
                        className="bg-amber-400 text-slate-950 font-black px-3 rounded-xl cursor-pointer"
                      >
                        Send OTP
                      </button>
                    </div>
                    {regForm.generatedOtp && (
                      <button
                        type="button"
                        onClick={() => setRegStep(2)}
                        className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                      >
                        Verify OTP ({regForm.generatedOtp}) &amp; Continue &rarr;
                      </button>
                    )}
                  </div>
                )}

                {regStep === 2 && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={regForm.fullName}
                      onChange={(e) =>
                        setRegForm({ ...regForm, fullName: e.target.value })
                      }
                      placeholder="Full Legal / Shop / Partner Name"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                    />
                    <input
                      type="text"
                      value={regForm.upiId}
                      onChange={(e) =>
                        setRegForm({ ...regForm, upiId: e.target.value })
                      }
                      placeholder="UPI ID (e.g. name@ybl)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setRegStep(3)}
                      className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                    >
                      Continue to Step 3 (Digital Signature &amp; T&amp;C) &rarr;
                    </button>
                  </div>
                )}

                {regStep === 3 && (
                  <div className="space-y-2">
                    <canvas
                      ref={sigCanvasRef}
                      width={310}
                      height={65}
                      onMouseDown={startSigDraw}
                      onMouseMove={moveSigDraw}
                      onMouseUp={endSigDraw}
                      onTouchStart={startSigDraw}
                      onTouchMove={moveSigDraw}
                      onTouchEnd={endSigDraw}
                      className="w-full h-[65px] bg-white rounded-xl border-2 border-emerald-400 cursor-crosshair touch-none"
                    />
                    <input
                      type="text"
                      value={regForm.digitalSignatureText}
                      onChange={(e) =>
                        setRegForm({
                          ...regForm,
                          digitalSignatureText: e.target.value
                        })
                      }
                      placeholder="Or type Full Legal Name as Digital Signature"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white text-[11px] font-serif italic"
                    />
                    <label className="flex items-start gap-2 bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={regForm.tcAccepted}
                        onChange={(e) =>
                          setRegForm({ ...regForm, tcAccepted: e.target.checked })
                        }
                        className="mt-0.5"
                      />
                      <span className="text-[10px] text-emerald-200 font-bold">
                        I accept the WE4ALL Platform Terms &amp; Conditions.
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newUser = {
                          id: Date.now(),
                          fullName:
                            regForm.fullName.trim() || "Verified Member",
                          businessName:
                            regForm.fullName.trim() || "Verified Shop",
                          providerName:
                            regForm.fullName.trim() || "Verified Pro",
                          captainName:
                            regForm.fullName.trim() || "Verified Captain",
                          phone: regForm.phone.trim() || "9848055112",
                          role: selectedRole,
                          vehicleCode: regForm.vehicleCode || "2W",
                          upiId: regForm.upiId || "member@ybl",
                          digitalSignatureText:
                            regForm.digitalSignatureText ||
                            regForm.fullName ||
                            "Signed",
                          tcAccepted: true,
                          acceptedAt: new Date().toLocaleString(),
                          status: "Pending_Admin_Approval"
                        };
                        if (selectedRole === "merchant") {
                          setPendingMerchants([newUser, ...pendingMerchants]);
                        } else if (selectedRole === "service_provider") {
                          setPendingServiceProviders([
                            newUser,
                            ...pendingServiceProviders
                          ]);
                        } else if (selectedRole === "decorator") {
                          setPendingDecorators([newUser, ...pendingDecorators]);
                        } else if (selectedRole === "rider") {
                          setPendingRiders([newUser, ...pendingRiders]);
                        }
                        localStorage.setItem(
                          "we4all_persistent_session_v4",
                          "active"
                        );
                        localStorage.setItem(
                          "we4all_device_bound_user_v4",
                          JSON.stringify(newUser)
                        );
                        setCurrentUser(newUser);
                        setIsAuthenticated(true);
                        setAuthModalOpen(false);
                        if (pendingCheckoutCallback) {
                          const cb = pendingCheckoutCallback;
                          setPendingCheckoutCallback(null);
                          cb();
                        } else {
                          setActivePortal(selectedRole);
                          setFooterTab("home");
                        }
                        triggerToast(
                          `Signed up & logged in as ${newUser.fullName}!`
                        );
                      }}
                      className="w-full bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
                    >
                      Complete Sign-Up &amp; Continue &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* UNIVERSAL LIVE DIAGNOSTIC ERROR POPUP MODAL */}
      {diagnosticErrorModal && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-sm w-full p-5 space-y-3 text-xs text-white shadow-2xl">
            <div className="flex justify-between items-start gap-2 border-b border-slate-800 pb-2">
              <div>
                <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">
                  LIVE DIAGNOSTIC POPUP | {diagnosticErrorModal.time}
                </span>
                <h3 className="font-black text-rose-400 text-sm mt-1">
                  {diagnosticErrorModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDiagnosticErrorModal(null)}
                className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl font-black cursor-pointer"
              >
                X
              </button>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-rose-500/40 space-y-1">
              <p className="text-[11px] font-mono text-white">
                {diagnosticErrorModal.details}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              {diagnosticErrorModal.autoFixCallback && (
                <button
                  type="button"
                  onClick={() => {
                    const cb = diagnosticErrorModal.autoFixCallback;
                    setDiagnosticErrorModal(null);
                    cb();
                  }}
                  className="flex-1 bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
                >
                  Auto-Fix &amp; Complete Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setDiagnosticErrorModal(null)}
                className="flex-1 bg-slate-800 text-white font-bold py-2.5 rounded-xl cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {otaProgress && (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-6">
          <div className="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-sm w-full p-5 text-center space-y-3 text-xs text-white">
            <h3 className="font-black text-emerald-400 text-sm">
              Auto-Updating WE4ALL ({otaProgress.pct}%)
            </h3>
            <p className="text-slate-300">{otaProgress.msg}</p>
          </div>
        </div>
      )}

      <UpiPaymentModal
        paymentRequest={pendingUpiPayment}
        userBankDetails={currentUser}
        onClose={() => setPendingUpiPayment(null)}
        onPaymentSuccess={handleCompleteUpiPayment}
      />

      {liveOrderDrawerOpen && activeOrder && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-sm w-full p-4 space-y-3 text-xs text-white">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-emerald-400">
                Live Order #{activeOrder.id}
              </h3>
              <button
                type="button"
                onClick={() => setLiveOrderDrawerOpen(false)}
                className="bg-slate-800 px-2.5 py-1 rounded-xl cursor-pointer"
              >
                X
              </button>
            </div>
            <LiveRouteMap
              pickupLabel={activeOrder.shopName}
              dropLabel={activeOrder.address}
              riderName={activeOrder.riderName}
              vehicle={activeOrder.vehicle}
              distanceKm={activeOrder.distanceKm || 1.8}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [liveDeviceTelemetry, setLiveDeviceTelemetry] = useState({});
  const [myLivePing, setMyLivePing] = useState(null);
  return <AppContent />;
}