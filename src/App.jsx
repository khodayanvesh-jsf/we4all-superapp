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
  performZeroLossOtaUpdate,
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

// ============================================================================
// ULTRA-CLEAN AMAZON-STYLE HEADER SHELL:
// Zero notification bells, zero update buttons, and zero language dropdowns!
// Language & Geo-Slang selection are managed exclusively inside Account tab.
// ============================================================================
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
      {/* Pure Amazon-Style Top Header Bar */}
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

  // DEFAULT ENGLISH ("EN") ON INSTALLATION; PERSISTED WHEN CHANGED IN ACCOUNT SECTION
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem("we4all_app_lang_v4") || "EN";
  });
  const setLang = (nextLang) => {
    localStorage.setItem("we4all_app_lang_v4", nextLang);
    setLangState(nextLang);
  };

  // GEO-LOCATION REGIONAL SLANG STATE (TELANGANA, MAHARASHTRA, KARNATAKA, TAMIL_NADU, NORTH_HINDI)
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

  const [deviceBoundUser] = useState(() => {
    const raw = localStorage.getItem("we4all_device_bound_user_v4");
    return raw ? JSON.parse(raw) : null;
  });

  const [onboardingStep, setOnboardingStep] = useState(() => {
    return localStorage.getItem("we4all_persistent_session_v4") === "logged_out"
      ? "auth"
      : "app";
  });
  const [selectedRole, setSelectedRole] = useState(
    deviceBoundUser?.role || savedCloud?.activePortal || "customer"
  );
  const [activePortal, setActivePortal] = useState(
    deviceBoundUser?.role || savedCloud?.activePortal || "customer"
  );
  const [personalShoppingFromPartner, setPersonalShoppingFromPartner] =
    useState(null);
  const [footerTab, setFooterTab] = useState("home");

  // AUTOMATIC STARTUP OTA UPDATE CHECKER (SKIPS IF ALREADY ON LATEST VERSION)
  const [appUpdateInfo, setAppUpdateInfo] = useState(() => {
    const installedVer = getDeviceInstalledVersion("3.0.2");
    return (
      savedCloud?.appUpdateInfo || {
        ...(INITIAL_APP_UPDATE_INFO || {}),
        currentVersion: installedVer,
        latestAvailableVersion: "3.0.3",
        updateAvailable: installedVer !== "3.0.3",
        releaseNotes:
          "WE4ALL v3.0.3: Geo-Location Regional Slang Titles (Telangana, Maharashtra, Karnataka, Tamil Nadu & Hindi), Default English Install, Account-Only Language Switcher & Labour Adda Hub."
      }
    );
  });
  const [startupUpdatePrompt, setStartupUpdatePrompt] = useState(null);
  const [otaProgress, setOtaProgress] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const triggerToast = (msg) => {
    sendMobileOsTrayNotification("WE4ALL Super-App", msg, `we4all-${Date.now()}`);
  };

  useEffect(() => {
    linkMobileHardwareServicesSilently();
    const runStartupUpdateCheck = async () => {
      const installedVer =
        localStorage.getItem("we4all_installed_ota_ver_v4") || "3.0.2";
      const remoteOta = await checkLiveCloudOtaManifest((payload) => {
        if (payload?.appUpdateInfo) setAppUpdateInfo(payload.appUpdateInfo);
      });
      const latestVer =
        remoteOta?.latestAvailableVersion ||
        appUpdateInfo?.latestAvailableVersion ||
        "3.0.3";
      const notes =
        remoteOta?.releaseNotes ||
        appUpdateInfo?.releaseNotes ||
        "New geo-regional slang and market features available.";

      if (latestVer && latestVer !== installedVer) {
        setStartupUpdatePrompt({
          currentVersion: installedVer,
          latestAvailableVersion: latestVer,
          releaseNotes: notes
        });
      }
    };
    runStartupUpdateCheck();
  }, []);

  const handleManualCheckForUpdate = async () => {
    setCheckingUpdate(true);
    triggerToast("Checking WE4ALL Cloud Server for updates...");
    const latest = await checkLiveCloudOtaManifest((payload) => {
      if (payload?.appUpdateInfo) setAppUpdateInfo(payload.appUpdateInfo);
    });
    setTimeout(() => {
      setCheckingUpdate(false);
      const installedVer =
        localStorage.getItem("we4all_installed_ota_ver_v4") || "3.0.3";
      const targetVer =
        latest?.latestAvailableVersion ||
        appUpdateInfo?.latestAvailableVersion ||
        "3.0.3";
      const isNewer = targetVer !== installedVer;
      setAppUpdateInfo((prev) => ({
        ...prev,
        ...(latest || {}),
        currentVersion: installedVer,
        latestAvailableVersion: targetVer,
        updateAvailable: isNewer
      }));
      if (isNewer) {
        setStartupUpdatePrompt({
          currentVersion: installedVer,
          latestAvailableVersion: targetVer,
          releaseNotes:
            latest?.releaseNotes || appUpdateInfo?.releaseNotes || ""
        });
      } else {
        triggerToast(`You are already on the latest version (v${installedVer})!`);
      }
    }, 450);
  };

  const handleRunOtaUpdate = (targetVerOverride = null) => {
    const targetVer =
      targetVerOverride ||
      startupUpdatePrompt?.latestAvailableVersion ||
      appUpdateInfo?.latestAvailableVersion ||
      "3.0.3";
    setStartupUpdatePrompt(null);
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
        triggerToast(`Updated to WE4ALL v${targetVer}!`);
      }
    );
  };

  const [labourPortalEnabled] = useState(true);
  const [labourWorkers, setLabourWorkers] = useState(
    savedCloud?.labourWorkers && savedCloud.labourWorkers.length > 0
      ? savedCloud.labourWorkers
      : INITIAL_LABOUR_WORKERS
  );
  const [labourBookings, setLabourBookings] = useState(
    savedCloud?.labourBookings || []
  );
  const [labourFilterSkill, setLabourFilterSkill] = useState("ALL");
  const [labourBookingForm, setLabourBookingForm] = useState({
    shiftType: "Full-Day Shift (09:00 AM - 05:30 PM)",
    workersRequired: 2,
    sitePin: "Subhash Nagar Site, Adilabad",
    needOwnTools: true,
    pickupFromAdda: false
  });

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
    deviceBoundUser ||
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

  const [captainRadarJobs, setCaptainRadarJobs] = useState(
    savedCloud?.captainRadarJobs && savedCloud.captainRadarJobs.length > 0
      ? savedCloud.captainRadarJobs
      : [
          {
            id: "RDR-2W-101",
            requiredVehicleCode: "2W",
            vehicleLabel: "2W Bike Captain (Up to 45 kg)",
            weightKg: 6,
            badge: "2W Bike Taxi / Kirana Pack (6 kg)",
            bookedBy: "Customer: Rameshwar Reddy (Chose 2W Bike)",
            pickupPin: "Sri Laxmi Supermart, Main Bazar",
            dropPin: "Subhash Nagar, Adilabad",
            distFromCaptainKm: 0.4,
            distanceKm: 2.5,
            captainPayout: 42,
            secretOtp: "3388",
            status: "OPEN_ON_RADAR",
            paymentReqStatus: "PENDING_TRIP_COMPLETION"
          }
        ]
  );

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

  const [selectedCategory, setSelectedCategory] = useState("ALL_MARKET");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVariantMap, setSelectedVariantMap] = useState({});
  const [selectedMerchantByProduct, setSelectedMerchantByProduct] = useState({});
  const [expandedCompareProdId, setExpandedCompareProdId] = useState(null);

  const [serviceFilterDate] = useState("2026-11-02");
  const [serviceFilterSlot] = useState("10:00 AM - 11:00 AM");

  const [customerBookingForm, setCustomerBookingForm] = useState({
    forWhom: "For Myself",
    weightKg: 10,
    chosenVehicleCode: "2W",
    pickupPin: "Subhash Nagar, Adilabad",
    dropPin: "Collectorate Chowk, Adilabad",
    distanceKm: 2.8
  });

  const [merchantCart, setMerchantCart] = useState(
    savedCloud?.merchantCart || []
  );
  const [serviceCart, setServiceCart] = useState(savedCloud?.serviceCart || []);
  const [decorCart, setDecorCart] = useState(savedCloud?.decorCart || []);
  const [cartChosenVehicleCode] = useState("2W");

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
    serviceCart,
    decorCart,
    orders,
    serviceBookings
  ]);

  useEffect(() => {
    return subscribeToRealtimeUpdates((remoteState) => {
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
    serviceCart.length +
    decorCart.length;
  const activeOrder =
    orders.find(
      (o) => o.id === activeOrderId && !o.status?.includes("CANCELLED")
    ) ||
    orders[0] ||
    null;

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

  const handlePlaceOrderForMerchantApproval = (
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
      `Order #${newOrder.id} sent to Merchant Queue & ${vRule.shortLabel} Captain Radar!`
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

  const renderAuthVault = () => (
    <MobilePhoneShell
      title="Security & KYC Vault"
      badge="v3.0.3"
      activePortal={activePortal}
      footerTab={footerTab}
      setFooterTab={setFooterTab}
      totalCartCount={totalCartCount}
      totalOrdersCount={orders.length}
      brightTheme={brightTheme}
      lang={lang}
      showFooter={false}
    >
      <div className="space-y-3 text-xs">
        <div className="bg-slate-900 text-white border border-emerald-500/40 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FounderLogoBadge logoUrl={founderLogoUrl} />
              <div>
                <h2 className="font-black text-amber-400 text-xs">
                  WE4ALL MEGA SUPER JOINT MARKET VAULT
                </h2>
                <p className="text-[10px] text-slate-300">
                  {t.biometricProtected}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openAdminGate}
              className="bg-slate-800 border border-amber-400/40 text-amber-300 px-2.5 py-1 rounded-lg text-[9px] font-black cursor-pointer"
            >
              Founder Admin
            </button>
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl p-2 text-white font-bold text-xs"
          >
            <option value="customer">1. Mega Super Joint Market (Customer App)</option>
            <option value="merchant">2. Product Merchant Portal (Kirana / Supermart)</option>
            <option value="service_provider">3. 1-Hr Home Service Provider Portal</option>
            <option value="decorator">4. Flower Decorator &amp; Function Halls Portal</option>
            <option value="rider">5. Delivery Captain Portal (2W / 3W / 4W)</option>
            <option value="labour_portal">
              6. {geoSlang.standSlang} Portal (Mistri / Kooli / Hamali)
            </option>
          </select>
          <button
            type="button"
            onClick={async () => {
              await verifyPhoneHardwareBiometric(
                currentUser?.fullName || "WE4ALL User"
              );
              localStorage.setItem("we4all_persistent_session_v4", "active");
              setActivePortal(selectedRole);
              setFooterTab("home");
              setOnboardingStep("app");
            }}
            className="w-full py-2.5 rounded-xl font-black text-[11px] bg-emerald-400 text-slate-950 cursor-pointer shadow"
          >
            1-Tap Biometric Login
          </button>
        </div>
      </div>
    </MobilePhoneShell>
  );

  // ==========================================================================
  // PORTAL 1: UNIFIED MEGA SUPER JOINT LOCAL MARKET (GEO-SLANG ADAPTIVE!)
  // ==========================================================================
  const renderCustomerPortal = () => {
    const q = searchQuery.trim().toLowerCase();

    // Helper: Get Geo-Slang Category Name (e.g. "Kirana & Inti Sarukulu" in TS, "Maligai Kadai" in TN)
    const getGeoCategoryLabel = (cat) => {
      return geoSlang?.categories?.[cat.id] || cleanLabel(cat.name);
    };

    const getGeoLabourRoleLabel = (skillId, fallback) => {
      return geoSlang?.labourRoles?.[skillId] || cleanLabel(fallback);
    };

    const matchingProducts = products.filter(
      (p) =>
        (selectedCategory === "ALL_MARKET" ||
          p.categoryId === selectedCategory) &&
        p.isPublished !== false &&
        p.inStock !== false &&
        (p.stockQty ?? 10) > 0 &&
        cleanLabel(p.subCategoryBrand).toLowerCase().includes(q)
    );

    const matchingServices = serviceProviders.filter(
      (sp) =>
        sp.isPublished !== false &&
        sp.isPublishedToPublic !== false &&
        (cleanLabel(sp.serviceCategory).toLowerCase().includes(q) ||
          cleanLabel(sp.specialization).toLowerCase().includes(q) ||
          cleanLabel(sp.maskedId).toLowerCase().includes(q))
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

    const matchingDecor = decorPortfolio.filter(
      (dp) =>
        cleanLabel(dp.title).toLowerCase().includes(q) ||
        cleanLabel(dp.merchantName).toLowerCase().includes(q)
    );

    const { topProducts } = getPersonalizedRecommendations(
      products,
      matchingServices
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

    // Geo-Slang Sector Strip
    const megaMarketSectors = [
      { id: "ALL_MARKET", label: "All Local Market", badge: "MEGA HUB" },
      ...categories.map((c) => ({
        id: c.id,
        label: getGeoCategoryLabel(c),
        badge: "SHOP"
      })),
      {
        id: "SECTOR_LABOUR",
        label: geoSlang.standSlang,
        badge: geoSlang.groupSlang
      },
      { id: "SECTOR_SERVICES", label: t.services || "1-Hr Services", badge: "PRO" },
      { id: "SECTOR_DECOR", label: t.decor || "Decor & Halls", badge: "EVENTS" },
      { id: "SECTOR_TAXI", label: t.taxi || "2W/3W/4W Rides", badge: "TAXI" }
    ];

    const showStoresSection =
      selectedCategory === "ALL_MARKET" ||
      categories.some((c) => c.id === selectedCategory);
    const showLabourSection =
      labourPortalEnabled &&
      (selectedCategory === "ALL_MARKET" ||
        selectedCategory === "SECTOR_LABOUR");
    const showServicesSection =
      selectedCategory === "ALL_MARKET" ||
      selectedCategory === "SECTOR_SERVICES";
    const showDecorSection =
      selectedCategory === "ALL_MARKET" || selectedCategory === "SECTOR_DECOR";
    const showTaxiSection =
      selectedCategory === "ALL_MARKET" || selectedCategory === "SECTOR_TAXI";

    return (
      <MobilePhoneShell
        title="Mega Super Joint Market"
        badge="Prime"
        activePortal="customer"
        footerTab={footerTab}
        setFooterTab={setFooterTab}
        totalCartCount={totalCartCount}
        totalOrdersCount={orders.length + serviceBookings.length}
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
        {/* Sub-Header: Deliver To Address + Quick Geo-Location Slang Switcher + Portal Switcher */}
        <div className="bg-[#232f3e] text-white px-3 py-2 rounded-xl flex flex-wrap justify-between items-center gap-2 text-[10px]">
          <div className="flex items-center gap-2 truncate">
            <FounderLogoBadge logoUrl={founderLogoUrl} />
            <div>
              <span className="text-slate-300 block text-[8px]">
                {t.deliverTo} {cleanLabel(currentUser.fullName)} ({geoSlang.stateName.split(" ")[0]} Slang)
              </span>
              <span className="text-amber-300 font-black text-[10px]">
                {activeAddressObj.label}: {activeAddressObj.fullAddress}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={geoRegion}
              onChange={(e) => {
                setGeoRegion(e.target.value);
                const found = getGeoSlangConfig(e.target.value);
                triggerToast(`Local Slang updated to ${found.stateName}!`);
              }}
              className="bg-slate-900 text-amber-300 border border-amber-400/50 rounded-lg px-2 py-1 text-[9px] font-black cursor-pointer"
              title="Geo-Location Local Slang Region"
            >
              {GEO_SLANG_REGIONS.map((gr) => (
                <option key={gr.id} value={gr.id}>
                  Geo: {gr.id}
                </option>
              ))}
            </select>
            <select
              value={activePortal}
              onChange={(e) => {
                if (e.target.value === "founder_admin") {
                  openAdminGate();
                  return;
                }
                setActivePortal(e.target.value);
                setFooterTab("home");
              }}
              className="bg-slate-900 text-emerald-300 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-black cursor-pointer"
            >
              <option value="customer">1. Mega Super Joint Market</option>
              <option value="merchant">2. Product Merchant Portal</option>
              <option value="service_provider">3. 1-Hr Service Provider Portal</option>
              <option value="decorator">4. Flower Decorator &amp; Halls Portal</option>
              <option value="rider">5. Delivery Captain Portal (2W/3W/4W)</option>
              <option value="labour_portal">
                6. {geoSlang.standSlang} Portal
              </option>
              <option value="founder_admin">7. Founder Admin Console</option>
            </select>
          </div>
        </div>

        {footerTab === "home" && (
          <div className="space-y-3">
            <GeoTargetedAdBanner
              adsList={geoAds}
              userTown="Adilabad"
              userState="Telangana"
              brightTheme={brightTheme}
            />

            {/* Universal Mega Market Search & Geo-Slang Sector Strip */}
            <div className="bg-slate-900 p-2.5 rounded-2xl border border-emerald-500/40 space-y-2">
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

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {megaMarketSectors.map((sec) => {
                  const active = selectedCategory === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSelectedCategory(sec.id)}
                      className={`px-3 py-1.5 rounded-xl border text-left shrink-0 cursor-pointer transition ${
                        active
                          ? "bg-emerald-500 text-slate-950 border-white font-black shadow"
                          : "bg-slate-950 text-slate-200 border-slate-800 hover:border-slate-600"
                      }`}
                    >
                      <span className="text-[7px] font-black uppercase block opacity-80">
                        {sec.badge}
                      </span>
                      <span className="text-[10px] font-bold block">
                        {sec.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {topProducts.length > 0 && (
              <div className="bg-emerald-950 text-white p-2.5 rounded-2xl border border-emerald-500/40 space-y-1.5">
                <p className="text-[10px] font-black text-amber-300">
                  {t.recommendedForYou}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-0.5">
                  {topProducts.map((tp) => (
                    <button
                      key={tp.id}
                      type="button"
                      onClick={() => handleAddToUnifiedMerchantCart(tp)}
                      className="bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-xl text-[10px] font-bold shrink-0 cursor-pointer hover:border-emerald-400"
                    >
                      + {cleanLabel(tp.subCategoryBrand)} (Rs.
                      {tp.variants?.[0]?.price})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* SECTION A: LOCAL SUPERMARTS & SHOPS (WITH GEO-SLANG TITLES)    */}
            {/* ============================================================== */}
            {showStoresSection && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-black text-emerald-700 text-xs uppercase tracking-wide">
                    1. {geoSlang.categories.daily_needs}, {geoSlang.categories.veg_fruits} &amp; {geoSlang.categories.construction} ({matchingProducts.length})
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
            {/* SECTION B: GEO-SLANG LABOUR ADDA / MAJOOR NAKA / KOTHANAR HUB  */}
            {/* ============================================================== */}
            {showLabourSection && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border-2 border-amber-400/70 space-y-3 text-xs">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[8px]">
                        {geoSlang.stateName.toUpperCase()} SLANG
                      </span>
                      <h3 className="font-black text-amber-300 text-xs uppercase">
                        2. {geoSlang.standSlang} &amp; {geoSlang.groupSlang} Hiring
                      </h3>
                    </div>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      Hire local {geoSlang.labourRoles.mason_mistri}, {geoSlang.labourRoles.daily_helper}, or {geoSlang.labourRoles.hamali_loading}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActivePortal("labour_portal");
                      setFooterTab("home");
                    }}
                    className="bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0"
                  >
                    Open {geoSlang.standSlang} Portal
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <select
                    value={labourFilterSkill}
                    onChange={(e) => setLabourFilterSkill(e.target.value)}
                    className="bg-slate-900 border border-amber-400/50 rounded-lg p-1.5 text-amber-300 font-bold text-[10px]"
                  >
                    <option value="ALL">
                      All Local Roles ({labourWorkers.length})
                    </option>
                    {LABOUR_SKILL_CATEGORIES.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {getGeoLabourRoleLabel(sc.id, sc.name)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={labourBookingForm.shiftType}
                    onChange={(e) =>
                      setLabourBookingForm({
                        ...labourBookingForm,
                        shiftType: e.target.value
                      })
                    }
                    className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-bold text-[10px]"
                  >
                    <option value="Full-Day Shift (09:00 AM - 05:30 PM)">
                      Full-Day Shift (9:00 AM - 5:30 PM)
                    </option>
                    <option value="Half-Day Shift (4 Hours)">
                      Half-Day Shift (4 Hours)
                    </option>
                    <option value="Piece-Rate / Sq.Ft / Bag Contract">
                      Contract (Per Sq.Ft / Bag / Acre)
                    </option>
                  </select>

                  <input
                    type="text"
                    value={labourBookingForm.sitePin}
                    onChange={(e) =>
                      setLabourBookingForm({
                        ...labourBookingForm,
                        sitePin: e.target.value
                      })
                    }
                    placeholder="Work-Site Address / Colony..."
                    className="bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-[10px]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {matchingLabour.map((lw) => {
                    const localRoleTitle = getGeoLabourRoleLabel(
                      lw.skillId,
                      lw.skillLabel
                    );
                    const isHalf =
                      labourBookingForm.shiftType.includes("Half-Day");
                    const baseRate = isHalf ? lw.halfDayWage : lw.fullDayWage;
                    const estTotalWage =
                      lw.workerType === "MISTRI_TOLI"
                        ? baseRate +
                          Math.max(0, (lw.toliCount || 1) - 1) *
                            (isHalf
                              ? Math.round((lw.helperDailyWage || 500) * 0.55)
                              : lw.helperDailyWage || 500)
                        : baseRate;

                    return (
                      <div
                        key={lw.id}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-black px-2 py-0.5 rounded">
                              {lw.workerType === "MISTRI_TOLI"
                                ? `${geoSlang.groupSlang} (${lw.toliCount} WORKERS)`
                                : `SINGLE (${lw.toliCount} WORKER)`}{" "}
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

                        <div className="text-[9px] text-slate-300 space-y-0.5 bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <p>
                            <strong>Stand:</strong> {geoSlang.standSlang} ({lw.addaLocation})
                          </p>
                          <p>
                            <strong>Tools:</strong> {lw.toolsList} |{" "}
                            <strong>Perks:</strong> {geoSlang.bhattaSlang}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const sOtp = String(
                              Math.floor(1000 + Math.random() * 9000)
                            );
                            const rOtp = String(
                              Math.floor(1000 + Math.random() * 9000)
                            );
                            const newCall = {
                              id: `WRK-${Math.floor(
                                1000 + Math.random() * 9000
                              )}`,
                              customerName: currentUser.fullName,
                              siteAddress: labourBookingForm.sitePin,
                              skillNeeded: `${lw.workerName} (${localRoleTitle})`,
                              shiftType: labourBookingForm.shiftType,
                              hiringMode:
                                lw.workerType === "MISTRI_TOLI"
                                  ? `${geoSlang.groupSlang} (${lw.toliCount} Workers)`
                                  : "Single Worker",
                              workersCount: lw.toliCount || 1,
                              toolsRequirement: `Bring Tools (${lw.toolsList})`,
                              transportNote: "Direct Site Reach / Adda Auto",
                              teaBhattaNote: `${geoSlang.bhattaSlang} & Muster OTP Active`,
                              totalDailyWage: estTotalWage,
                              startWorkOtp: sOtp,
                              wageReleaseOtp: rOtp,
                              status: "OPEN_SITE_CALL",
                              createdAt: new Date().toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            };
                            setLabourBookings([newCall, ...labourBookings]);
                            triggerToast(
                              `Hired ${lw.workerName} (${localRoleTitle})! Sent to ${geoSlang.standSlang} Portal.`
                            );
                          }}
                          className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2 rounded-xl text-[10px] cursor-pointer shadow"
                        >
                          Hire {localRoleTitle.split("(")[0]} (Rs.{estTotalWage})
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION C: 1-HR HOME SERVICES */}
            {showServicesSection && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-indigo-500/40 space-y-2.5 text-xs">
                <h3 className="font-black text-indigo-300 text-xs uppercase">
                  3. {t.services || "1-Hr Home Services"} (Plumber, Electrician, AC, Carpenter)
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
                          setFooterTab("carts");
                        }}
                        className="bg-indigo-500 text-white font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0"
                      >
                        + Book 1-Hr
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION D: FUNCTION HALLS & FLOWER DECOR */}
            {showDecorSection && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-amber-500/40 space-y-2.5 text-xs">
                <h3 className="font-black text-amber-400 text-xs uppercase">
                  4. {t.decor || "Function Halls & Flower Decor"}
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
                          setFooterTab("carts");
                        }}
                        className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[9px] cursor-pointer shrink-0"
                      >
                        + Decor Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION E: 2W / 3W / 4W RIDES */}
            {showTaxiSection && (
              <div className="bg-slate-900 p-3.5 rounded-2xl border border-teal-500/40 space-y-2.5 text-xs text-white">
                <h3 className="font-black text-teal-300 uppercase">
                  5. {t.taxi || "2W Bike, 3W Auto & 4W Mini-Truck Booking"}
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
                  onClick={() => {
                    const newJob = {
                      id: `RDR-${activeVehCode}-${Math.floor(
                        100 + Math.random() * 900
                      )}`,
                      requiredVehicleCode: activeVehCode,
                      vehicleLabel: chosenRule.label,
                      weightKg: wKg,
                      badge: `${chosenRule.shortLabel} (${wKg} kg | ${customerBookingForm.forWhom})`,
                      bookedBy: `Customer: ${currentUser.fullName} (Chose ${chosenRule.shortLabel})`,
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
                      `Allocated Ride/Parcel #${newJob.id} strictly to ${chosenRule.shortLabel} Captains!`
                    );
                  }}
                  className="w-full bg-teal-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
                >
                  Book {chosenRule.shortLabel} Captain Now (Rs.{calculatedFare})
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
                  + Book 1-Hr Slot ({serviceFilterSlot}) | Rs.{sp.visitingFee} Escrow
                </button>
              </div>
            ))}
          </div>
        )}

        {footerTab === "carts" && (
          <div className="space-y-3 text-xs text-white">
            {merchantCart.length === 0 &&
              serviceCart.length === 0 &&
              decorCart.length === 0 && (
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center space-y-2">
                  <p className="font-bold text-slate-300">
                    Your Mega Market Cart is currently empty.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFooterTab("home")}
                    className="bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-[10px] cursor-pointer"
                  >
                    Explore Mega Market
                  </button>
                </div>
              )}

            {merchantCart.length > 0 && (
              <div className="bg-slate-900 p-3.5 rounded-2xl border border-emerald-500/40 space-y-2.5">
                <h4 className="font-black text-emerald-400">
                  1. Unified Store Shopping Cart ({cartWeightKg} kg Total Load)
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
                    handlePlaceOrderForMerchantApproval(
                      effectiveCartVehCode,
                      cartDeliveryFee,
                      cartWeightKg
                    )
                  }
                  className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
                >
                  Submit Order to Merchant &amp; {cartVehRule.shortLabel} Captain (Delivery Rs.{cartDeliveryFee})
                </button>
              </div>
            )}
          </div>
        )}

        {footerTab === "orders" && (
          <div className="space-y-3">
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
    setSelectedCategory("ALL_MARKET");
    setFooterTab("home");
  };

  const renderSharedAccountTab = (partnerRole) => (
    <OwnerAccountProfile
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
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
        setOnboardingStep("auth");
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
      badge={`v3.0.3 (${currentUser?.vehicleCode || "2W"})`}
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
              setStartupUpdatePrompt({
                currentVersion: appUpdateInfo?.currentVersion || "3.0.2",
                latestAvailableVersion: nextInfo.latestAvailableVersion,
                releaseNotes: nextInfo.releaseNotes
              });
              triggerToast(
                `OTA v${nextInfo.latestAvailableVersion} broadcasted!`
              );
            }}
            onLaunchMultiPhoneView={() => {
              setOnboardingStep("app");
              setActivePortal("split");
              setViewMode("mobile_app");
            }}
            onTeleportToScreen={(flowId) => {
              setViewMode("mobile_app");
              if (flowId === "auth_vault") {
                setOnboardingStep("auth");
                return;
              }
              setOnboardingStep("app");
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
                setSelectedCategory("ALL_MARKET");
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
          {onboardingStep === "auth" && renderAuthVault()}
          {onboardingStep === "app" &&
            activePortal === "customer" &&
            renderCustomerPortal()}
          {onboardingStep === "app" &&
            activePortal === "merchant" &&
            renderMerchantPortal()}
          {onboardingStep === "app" &&
            activePortal === "service_provider" &&
            renderServiceProviderPortal()}
          {onboardingStep === "app" &&
            activePortal === "decorator" &&
            renderDecoratorPortal()}
          {onboardingStep === "app" &&
            activePortal === "rider" &&
            renderRiderPortal()}
          {onboardingStep === "app" &&
            activePortal === "labour_portal" &&
            renderLabourPortal()}
          {onboardingStep === "app" &&
            activeDynamicPortal &&
            renderDynamicCustomPortal(activeDynamicPortal)}
          {onboardingStep === "app" && activePortal === "split" && (
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

      {/* AUTOMATIC STARTUP OTA UPDATE PROMPT (SKIPPED AUTOMATICALLY IF ALREADY ON LATEST) */}
      {startupUpdatePrompt && !otaProgress && (
        <div className="fixed inset-0 bg-black/85 z-[95] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-sm w-full p-5 space-y-3 text-xs text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded text-[9px] uppercase">
                AUTOMATIC STARTUP UPDATE CHECK
              </span>
              <span className="text-[10px] font-mono text-amber-300 font-bold">
                v{startupUpdatePrompt.currentVersion} &rarr; v
                {startupUpdatePrompt.latestAvailableVersion}
              </span>
            </div>
            <h3 className="font-black text-emerald-400 text-sm">
              New WE4ALL Update v{startupUpdatePrompt.latestAvailableVersion} Available!
            </h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {startupUpdatePrompt.releaseNotes}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() =>
                  handleRunOtaUpdate(startupUpdatePrompt.latestAvailableVersion)
                }
                className="flex-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow-lg"
              >
                Accept &amp; Update Now
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem(
                    "we4all_installed_ota_ver_v4",
                    startupUpdatePrompt.latestAvailableVersion
                  );
                  setStartupUpdatePrompt(null);
                }}
                className="bg-slate-800 text-slate-300 font-bold px-3.5 py-2.5 rounded-xl cursor-pointer"
              >
                Skip
              </button>
            </div>
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
              <p className="text-[10px] font-bold text-rose-200">
                What Happened:
              </p>
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
                Dismiss Popup
              </button>
            </div>
          </div>
        </div>
      )}

      {otaProgress && (
        <div className="fixed inset-0 bg-black/90 z-[110] flex items-center justify-center p-6">
          <div className="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-sm w-full p-5 text-center space-y-3 text-xs text-white">
            <h3 className="font-black text-emerald-400 text-sm">
              Installing In-App Update ({otaProgress.pct}%)
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
  return <AppContent />;
}