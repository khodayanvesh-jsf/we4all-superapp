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
import { INDIAN_LANGUAGES, getLangText } from "./modules/i18n/indianLanguages";
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
import DynamicPortalEngine, { PortalPowerToolsBar } from "./modules/DynamicPortalEngine";
import LiveRouteMap from "./modules/LiveRouteMap";
import {
  saveCloudAndLocalState,
  loadCloudAndLocalState,
  subscribeToRealtimeUpdates,
  checkLiveCloudOtaManifest,
  performZeroLossOtaUpdate
} from "./supabaseClient";
import {
  linkMobileHardwareServicesSilently,
  sendMobileOsTrayNotification,
  verifyPhoneHardwareBiometric,
  recordUserActivityTelemetry,
  getPersonalizedRecommendations
} from "./modules/native/MobileHardwareBridge";

// Helper: Strip any stray unicode escape text or corrupted prefix from strings
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
// AUTOMATIC RESPONSIVE SHELL (LIKE AMAZON / FLIPKART):
// Full-screen mobile app on phones/APK, automatic widescreen on desktop browsers.
// Zero manual "Mobile / Web" toggle buttons inside the app header!
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
  setLang,
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
      {/* Clean Amazon-Style Top Header Bar (Zero manual view-toggle clutter) */}
      <div
        className={`px-3 py-2.5 flex justify-between items-center gap-2 text-xs border-b shrink-0 ${
          brightTheme
            ? "bg-[#131921] text-white border-slate-800"
            : "bg-slate-950 text-slate-100 border-emerald-950/60"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
          <span className="font-black text-amber-400 tracking-wide truncate">
            WE4ALL | {cleanLabel(title)}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="bg-slate-800 text-amber-300 border border-slate-600 rounded-lg px-2 py-1 text-[10px] font-black outline-none cursor-pointer"
          >
            {INDIAN_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.code} - {l.native}
              </option>
            ))}
          </select>
          <span className="bg-emerald-900/80 border border-emerald-500/40 text-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold truncate">
            {cleanLabel(badge)}
          </span>
        </div>
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

  const [lang, setLang] = useState("EN");
  const t = getLangText(lang);
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

  useEffect(() => {
    linkMobileHardwareServicesSilently();
  }, []);

  const [deviceBoundUser, setDeviceBoundUser] = useState(() => {
    const raw = localStorage.getItem("we4all_device_bound_user_v4");
    return raw ? JSON.parse(raw) : null;
  });

  const [onboardingStep, setOnboardingStep] = useState(() => {
    return localStorage.getItem("we4all_persistent_session_v4") === "logged_out"
      ? "auth"
      : "app";
  });
  const [regStep, setRegStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(
    deviceBoundUser?.role || savedCloud?.activePortal || "customer"
  );
  const [activePortal, setActivePortal] = useState(
    deviceBoundUser?.role || savedCloud?.activePortal || "customer"
  );
  const [personalShoppingFromPartner, setPersonalShoppingFromPartner] =
    useState(null);
  const [footerTab, setFooterTab] = useState("home");

  // Dynamic No-Code Market Portals
  const [customPortals, setCustomPortals] = useState(
    savedCloud?.customPortals || [
      {
        id: "agri_mandi",
        title: "6. Agriculture & Kisan Mandi",
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

  // Digital Signature Pad
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

  const [appUpdateInfo, setAppUpdateInfo] = useState(
    savedCloud?.appUpdateInfo || {
      ...(INITIAL_APP_UPDATE_INFO || {}),
      currentVersion: "3.0.0",
      latestAvailableVersion: "3.0.1",
      updateAvailable: true,
      releaseNotes:
        "WE4ALL v3.0.1: Unified Mega Super Joint Local Market (All Products, 1-Hr Services, Halls, Rides & Mandi in One Place), Clean Product Titles & Automatic Device Layout."
    }
  );
  const [otaProgress, setOtaProgress] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const triggerToast = (msg) => {
    sendMobileOsTrayNotification("WE4ALL Super-App", msg, `we4all-${Date.now()}`);
  };

  const handleManualCheckForUpdate = async () => {
    setCheckingUpdate(true);
    triggerToast("Checking WE4ALL Cloud Server for v3.0.1...");
    const latest = await checkLiveCloudOtaManifest((payload) => {
      if (payload?.appUpdateInfo) setAppUpdateInfo(payload.appUpdateInfo);
    });
    setTimeout(() => {
      setCheckingUpdate(false);
      const targetVer =
        latest?.latestAvailableVersion ||
        appUpdateInfo?.latestAvailableVersion ||
        "3.0.1";
      setAppUpdateInfo((prev) => ({
        ...prev,
        ...(latest || {}),
        latestAvailableVersion: targetVer,
        updateAvailable: true
      }));
      triggerToast(`Update v${targetVer} Ready in Account Section!`);
    }, 500);
  };

  const handleRunOtaUpdate = () => {
    performZeroLossOtaUpdate(
      appUpdateInfo.latestAvailableVersion || "3.0.1",
      appUpdateInfo.releaseNotes,
      (stage) => setOtaProgress(stage),
      (updatedInfo) => {
        setAppUpdateInfo(updatedInfo);
        setOtaProgress(null);
        triggerToast(`In-App Update v${updatedInfo.currentVersion} Installed!`);
      }
    );
  };

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
    { id: 5, role: "rider" }
  ]);

  const [addressBook] = useState([
    {
      id: "addr_home",
      label: "Home",
      fullAddress: "Subhash Nagar, Adilabad",
      distanceKm: 1.8,
      verified: true
    },
    {
      id: "addr_office",
      label: "Office",
      fullAddress: "Collectorate Chowk, Adilabad",
      distanceKm: 2.5,
      verified: true
    }
  ]);
  const [selectedAddressId, setSelectedAddressId] = useState("addr_home");
  const activeAddressObj =
    addressBook.find((a) => a.id === selectedAddressId) || addressBook[0];

  // "ALL_MARKET" shows everything in the Mega Super Joint Market in one place!
  const [selectedCategory, setSelectedCategory] = useState("ALL_MARKET");
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

  const [merchantCart, setMerchantCart] = useState(
    savedCloud?.merchantCart || []
  );
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
            merchantName: cleanLabel(activeOffer.merchantName || product.shopName),
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

  // ==========================================================================
  // SECURITY & BIOMETRIC VAULT
  // ==========================================================================
  const renderAuthVault = () => (
    <MobilePhoneShell
      title="Security & KYC Vault"
      badge="v3.0.1"
      activePortal={activePortal}
      footerTab={footerTab}
      setFooterTab={setFooterTab}
      totalCartCount={totalCartCount}
      totalOrdersCount={orders.length}
      brightTheme={brightTheme}
      lang={lang}
      setLang={setLang}
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
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setRegForm({ ...regForm, role: e.target.value });
            }}
            className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl p-2 text-white font-bold text-xs"
          >
            <option value="customer">1. Mega Super Joint Market (Customer App)</option>
            <option value="merchant">2. Product Merchant Portal (Kirana / Supermart)</option>
            <option value="service_provider">3. 1-Hr Home Service Provider Portal</option>
            <option value="decorator">4. Flower Decorator &amp; Function Halls Portal</option>
            <option value="rider">5. Delivery Captain Portal (2W / 3W / 4W)</option>
            {customPortals.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cleanLabel(cp.title)}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
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
                triggerToast(
                  `Biometric Verified! Opened ${selectedRole.toUpperCase()}.`
                );
              }}
              className="py-2 rounded-xl font-black text-[10px] bg-emerald-400 text-slate-950 cursor-pointer shadow"
            >
              1-Tap Biometric Login
            </button>
            <button
              type="button"
              onClick={() => setRegStep(1)}
              className="py-2 rounded-xl font-black text-[10px] bg-amber-400 text-slate-950 cursor-pointer"
            >
              New KYC Registration
            </button>
          </div>
        </div>

        {/* 3-Step Registration */}
        <div className="bg-slate-900 text-white border border-amber-500/40 rounded-2xl p-3.5 space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="font-black text-amber-400 text-xs">
              3-Step Partner / User Registration ({selectedRole.toUpperCase()})
            </span>
            <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">
              Step {regStep} of 3
            </span>
          </div>

          {regStep === 1 && (
            <div className="space-y-2.5">
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
                    const otp = String(Math.floor(1000 + Math.random() * 9000));
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
                  Verify OTP ({regForm.generatedOtp}) &amp; Continue
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
                placeholder="Full Legal / Business Name"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <input
                type="text"
                value={regForm.upiId}
                onChange={(e) =>
                  setRegForm({ ...regForm, upiId: e.target.value })
                }
                placeholder="Instant Payout UPI ID (e.g. name@ybl)"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRegStep(1)}
                  className="bg-slate-800 text-slate-300 px-3 py-2 rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setRegStep(3)}
                  className="flex-1 bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                >
                  Continue to Step 3 (Digital Sign)
                </button>
              </div>
            </div>
          )}

          {regStep === 3 && (
            <div className="space-y-2.5">
              <canvas
                ref={sigCanvasRef}
                width={310}
                height={70}
                onMouseDown={startSigDraw}
                onMouseMove={moveSigDraw}
                onMouseUp={endSigDraw}
                onTouchStart={startSigDraw}
                onTouchMove={moveSigDraw}
                onTouchEnd={endSigDraw}
                className="w-full h-[70px] bg-white rounded-xl border-2 border-emerald-400 cursor-crosshair touch-none"
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
                onClick={async () => {
                  const newUser = {
                    id: Date.now(),
                    fullName: regForm.fullName.trim() || "Verified Partner",
                    businessName: regForm.fullName.trim() || "Verified Partner",
                    providerName: regForm.fullName.trim() || "Verified Partner",
                    captainName: regForm.fullName.trim() || "Verified Partner",
                    phone: regForm.phone.trim() || "9848055112",
                    role: selectedRole,
                    vehicleCode: regForm.vehicleCode || "2W",
                    upiId: regForm.upiId || "partner@ybl",
                    digitalSignatureText:
                      regForm.digitalSignatureText || regForm.fullName || "Signed",
                    tcAccepted: true,
                    acceptedAt: new Date().toLocaleString(),
                    status: "Pending_Admin_Approval"
                  };
                  if (selectedRole === "merchant") {
                    setPendingMerchants([newUser, ...pendingMerchants]);
                  } else if (selectedRole === "service_provider") {
                    setPendingServiceProviders([newUser, ...pendingServiceProviders]);
                  } else if (selectedRole === "decorator") {
                    setPendingDecorators([newUser, ...pendingDecorators]);
                  } else if (selectedRole === "rider") {
                    setPendingRiders([newUser, ...pendingRiders]);
                  }
                  await linkMobileHardwareServicesSilently();
                  localStorage.setItem("we4all_persistent_session_v4", "active");
                  setCurrentUser(newUser);
                  setDeviceBoundUser(newUser);
                  localStorage.setItem(
                    "we4all_device_bound_user_v4",
                    JSON.stringify(newUser)
                  );
                  setActivePortal(selectedRole);
                  setFooterTab("home");
                  setOnboardingStep("app");
                  triggerToast(
                    `Registered "${newUser.fullName}"! Sent to Admin 5-Point KYC Checklist.`
                  );
                }}
                className="w-full bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
              >
                Sign &amp; Open Portal
              </button>
            </div>
          )}
        </div>
      </div>
    </MobilePhoneShell>
  );

  // ==========================================================================
  // PORTAL 1: UNIFIED MEGA SUPER JOINT LOCAL MARKET (ALL PRODUCTS & SERVICES)
  // ==========================================================================
  const renderCustomerPortal = () => {
    const q = searchQuery.trim().toLowerCase();

    // Filter products across ALL categories or selected category
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

    const matchingDecor = decorPortfolio.filter(
      (dp) =>
        cleanLabel(dp.title).toLowerCase().includes(q) ||
        cleanLabel(dp.merchantName).toLowerCase().includes(q) ||
        cleanLabel(dp.decorType).toLowerCase().includes(q)
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

    // Unified Mega Market Category Sectors (All Products + Services + Halls + Taxi + Mandi in 1 Strip)
    const megaMarketSectors = [
      { id: "ALL_MARKET", label: "All Local Market", badge: "MEGA HUB" },
      ...categories.map((c) => ({
        id: c.id,
        label: cleanLabel(c.name),
        badge: "SHOP"
      })),
      { id: "SECTOR_SERVICES", label: "1-Hr Home Services", badge: "PRO" },
      { id: "SECTOR_DECOR", label: "Halls & Flower Decor", badge: "EVENTS" },
      { id: "SECTOR_TAXI", label: "2W / 3W / 4W Rides", badge: "TAXI" },
      ...customPortals.map((cp) => ({
        id: `DYN_${cp.id}`,
        label: cleanLabel(cp.title),
        badge: cleanLabel(cp.badge)
      }))
    ];

    const showStoresSection =
      selectedCategory === "ALL_MARKET" ||
      categories.some((c) => c.id === selectedCategory);
    const showServicesSection =
      selectedCategory === "ALL_MARKET" ||
      selectedCategory === "SECTOR_SERVICES";
    const showDecorSection =
      selectedCategory === "ALL_MARKET" || selectedCategory === "SECTOR_DECOR";
    const showTaxiSection =
      selectedCategory === "ALL_MARKET" || selectedCategory === "SECTOR_TAXI";
    const showDynamicSection =
      selectedCategory === "ALL_MARKET" ||
      selectedCategory.startsWith("DYN_");

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
        setLang={setLang}
        personalShoppingFromPartner={personalShoppingFromPartner}
        onReturnToPartnerDesk={() => {
          setActivePortal(personalShoppingFromPartner);
          setPersonalShoppingFromPartner(null);
          setFooterTab("home");
        }}
      >
        {/* Clean Amazon-Style Sub-Header: Deliver To Address + Partner Role Switcher */}
        <div className="bg-[#232f3e] text-white px-3 py-2 rounded-xl flex flex-wrap justify-between items-center gap-2 text-[10px]">
          <div className="flex items-center gap-2 truncate">
            <FounderLogoBadge logoUrl={founderLogoUrl} />
            <div>
              <span className="text-slate-300 block text-[8px]">
                {t.deliverTo} {cleanLabel(currentUser.fullName)}
              </span>
              <span className="text-amber-300 font-black text-[10px]">
                {activeAddressObj.label}: {activeAddressObj.fullAddress}
              </span>
            </div>
          </div>
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
            {customPortals.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cleanLabel(cp.title)}
              </option>
            ))}
            <option value="founder_admin">6. Founder Admin Console</option>
          </select>
        </div>

        {footerTab === "home" && (
          <div className="space-y-3">
            <GeoTargetedAdBanner
              adsList={geoAds}
              userTown="Adilabad"
              userState="Telangana"
              brightTheme={brightTheme}
            />

            {/* Universal Mega Market Search Bar */}
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

              {/* Unified All-In-One Mega Market Sector Strip */}
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

            {/* Personalized Recommendations Strip (Clean product titles, zero raw codes) */}
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
            {/* SECTION A: LOCAL SUPERMARTS & MERCHANT SHOPS                   */}
            {/* ============================================================== */}
            {showStoresSection && (
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-black text-emerald-700 text-xs uppercase tracking-wide">
                    1. Local Supermarts, Kirana, Veg, Meat, Hardware &amp; Pharmacy ({matchingProducts.length})
                  </h3>
                  <span className="text-[10px] font-bold text-slate-500">
                    Multi-Shop Price Comparison Active
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
                    const cleanTag = cleanLabel(prod.curiosityTag || "Verified Local Stock");
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
                            <span className="text-[9px] text-amber-600 font-black block">
                              {cleanTag} | Stock: {prod.stockQty ?? 25} left
                            </span>
                            <h4 className="text-xs font-black text-slate-900 truncate">
                              {cleanTitle}
                            </h4>
                            <div className="flex justify-between items-center mt-0.5">
                              <p className="text-[10px] text-emerald-700 font-bold truncate">
                                Shop: {cleanLabel(activeOffer.merchantName)}
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
                                      merchantCart.filter((x) => x !== inCartItem)
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
            {/* SECTION B: 1-HR HOME SERVICES IN THE SAME MEGA JOINT MARKET    */}
            {/* ============================================================== */}
            {showServicesSection && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-indigo-500/40 space-y-2.5 text-xs">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="font-black text-indigo-300 text-xs uppercase">
                      2. 1-Hr Home Services Market (Plumber, Electrician, AC, Carpenter)
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Book verified local technicians directly from the Mega Market
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="date"
                      value={serviceFilterDate}
                      onChange={(e) => setServiceFilterDate(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-[10px]"
                    />
                    <select
                      value={serviceFilterSlot}
                      onChange={(e) => setServiceFilterSlot(e.target.value)}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-[10px] font-bold"
                    >
                      <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                      <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                      <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                    </select>
                  </div>
                </div>
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
                          <p className="text-[10px] text-indigo-300 truncate">
                            {cleanLabel(sp.specialization)}
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
                          triggerToast(
                            `Added ${cleanLabel(sp.maskedId)} (${serviceFilterSlot}) to Service Cart!`
                          );
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

            {/* ============================================================== */}
            {/* SECTION C: FUNCTION HALLS & FLOWER DECORATORS IN MEGA MARKET   */}
            {/* ============================================================== */}
            {showDecorSection && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-amber-500/40 space-y-2.5 text-xs">
                <h3 className="font-black text-amber-400 text-xs uppercase">
                  3. Function Halls &amp; Flower Decoration Market (Reverse Bidding &amp; 35%|85% Escrow)
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
                          triggerToast(`Added "${cleanLabel(item.title)}" to Decor Cart!`);
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

            {/* ============================================================== */}
            {/* SECTION D: 2W / 3W / 4W RIDES & PARCEL LOGISTICS IN MEGA MARKET*/}
            {/* ============================================================== */}
            {showTaxiSection && (
              <div className="bg-slate-900 p-3.5 rounded-2xl border border-teal-500/40 space-y-2.5 text-xs text-white">
                <h3 className="font-black text-teal-300 uppercase">
                  4. Instant Local Transport: 2W Bike, 3W Auto &amp; 4W Mini-Truck Booking
                </h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[9px] text-amber-300 font-bold">
                      Parcel / Load Weight (kg):
                    </label>
                    <input
                      type="number"
                      value={customerBookingForm.weightKg}
                      onChange={(e) => {
                        const nextW = Math.max(1, Number(e.target.value) || 1);
                        let nextVeh = customerBookingForm.chosenVehicleCode;
                        if (nextW > 300) nextVeh = "4W_HEAVY";
                        else if (nextW > 45 && nextVeh === "2W") nextVeh = "3W";
                        setCustomerBookingForm({
                          ...customerBookingForm,
                          weightKg: nextW,
                          chosenVehicleCode: nextVeh
                        });
                      }}
                      className="w-full bg-slate-950 border border-amber-400 rounded-xl p-1.5 text-white font-black mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold">
                      Booking For:
                    </label>
                    <select
                      value={customerBookingForm.forWhom}
                      onChange={(e) =>
                        setCustomerBookingForm({
                          ...customerBookingForm,
                          forWhom: e.target.value
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white font-bold mt-0.5"
                    >
                      <option value="For Self">For Myself</option>
                      <option value="For Family">For Family / Friend</option>
                    </select>
                  </div>
                </div>
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

            {/* ============================================================== */}
            {/* SECTION E: DYNAMIC MARKET HUBS (KISAN MANDI & ADMIN PORTALS)   */}
            {/* ============================================================== */}
            {showDynamicSection && customPortals.length > 0 && (
              <div className="bg-slate-900 p-3.5 rounded-2xl border border-purple-500/40 space-y-2.5 text-xs text-white">
                <h3 className="font-black text-purple-300 uppercase">
                  5. Direct Kisan Mandi &amp; Specialized Local Markets ({customPortals.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {customPortals.map((cp) => (
                    <div
                      key={cp.id}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-black text-emerald-400">
                            {cleanLabel(cp.title)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {cleanLabel(cp.description)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActivePortal(cp.id);
                            setFooterTab("home");
                          }}
                          className="bg-purple-400 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[9px] cursor-pointer shrink-0"
                        >
                          Partner Desk
                        </button>
                      </div>
                      {(cp.items || []).map((it) => (
                        <div
                          key={it.id}
                          className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-white text-[11px]">
                              {cleanLabel(it.title)}
                            </p>
                            <p className="text-[9px] text-amber-300">
                              Rs.{it.price} ({it.unit}) | Avail: {it.stockOrSlots}
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
                            className="bg-emerald-500 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[9px] cursor-pointer"
                          >
                            + Add to Cart
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sticky Bottom Cart Bar when items are in Cart */}
            {merchantCart.length > 0 && (
              <div className="sticky bottom-2 z-30 pt-1">
                <button
                  type="button"
                  onClick={() => setFooterTab("carts")}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl shadow-2xl border-2 border-amber-400 flex justify-between items-center cursor-pointer"
                >
                  <div className="text-left">
                    <span className="text-xs font-black block">
                      {merchantCart.reduce((s, i) => s + i.qty, 0)} Items in Mega Market Cart | Rs.
                      {merchantCart.reduce((s, i) => s + i.price * i.qty, 0)}
                    </span>
                    <span className="text-[9px] text-amber-200 font-bold block">
                      Unified Checkout with 2W / 3W / 4W Delivery Vehicle Selection
                    </span>
                  </div>
                  <span className="bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-xl text-[10px]">
                    Go to Cart
                  </span>
                </button>
              </div>
            )}
          </div>
        )}

        {footerTab === "services" && (
          <div className="space-y-2.5 text-xs text-white">
            <div className="bg-slate-900 p-2.5 rounded-2xl border border-indigo-500/40 grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={serviceFilterDate}
                onChange={(e) => setServiceFilterDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white text-[10px]"
              />
              <select
                value={serviceFilterSlot}
                onChange={(e) => setServiceFilterSlot(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-white text-[10px] font-bold"
              >
                <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
              </select>
            </div>
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
                      Visit Escrow: Rs.{sp.visitingFee} | Hourly: Rs.
                      {sp.hourlyRate}/hr
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
                    triggerToast(
                      `Added ${cleanLabel(sp.maskedId)} (${serviceFilterSlot}) to Service Cart!`
                    );
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

            {serviceCart.length > 0 && (
              <div className="bg-slate-900 p-3 rounded-2xl border border-indigo-500/40 space-y-2">
                <h4 className="font-black text-indigo-300">
                  2. 1-Hr Home Service Escrow Cart
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
                    setPendingUpiPayment({
                      type: "SERVICE_ESCROW",
                      title: "Visiting Fee Escrow",
                      amount: serviceCart.reduce((s, i) => s + i.visitingFee, 0)
                    })
                  }
                  className="w-full bg-indigo-500 text-white font-black py-2.5 rounded-xl cursor-pointer"
                >
                  Pay Visiting Fee via UPI (Held in Escrow)
                </button>
              </div>
            )}
          </div>
        )}

        {footerTab === "orders" && (
          <div className="space-y-3">
            {orders
              .filter((o) => o.status === "MERCHANT_APPROVED_AWAITING_PAYMENT")
              .map((ord) => (
                <div
                  key={ord.id}
                  className="bg-slate-900 border-2 border-amber-400 rounded-2xl p-3 space-y-2 text-xs text-white"
                >
                  <div className="flex justify-between font-bold">
                    <span>#{ord.id} Approved by Merchant</span>
                    <span className="text-emerald-400">
                      Rs.{ord.grandTotal}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingUpiPayment({
                        type: "APPROVED_MERCHANT_ORDER",
                        orderId: ord.id,
                        title: `Order #${ord.id}`,
                        amount: ord.grandTotal
                      })
                    }
                    className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                  >
                    {t.payUpi} (Rs.{ord.grandTotal})
                  </button>
                </div>
              ))}
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
      appUpdateInfo={appUpdateInfo}
      onCheckForUpdate={handleManualCheckForUpdate}
      checkingUpdate={checkingUpdate}
      onRunOtaUpdate={handleRunOtaUpdate}
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
      setLang={setLang}
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
      setLang={setLang}
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
      setLang={setLang}
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
      badge={`v3.0.1 (${currentUser?.vehicleCode || "2W"})`}
      activePortal="rider"
      footerTab={footerTab}
      setFooterTab={setFooterTab}
      totalCartCount={totalCartCount}
      totalOrdersCount={captainRadarJobs.length + orders.length}
      brightTheme={brightTheme}
      lang={lang}
      setLang={setLang}
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
      setLang={setLang}
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
              triggerToast(
                `OTA v${nextInfo.latestAvailableVersion} broadcasted to Mobile OS Notification Bar!`
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
                </div>
              ))}
            </div>
          )}
        </main>
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
            <div className="bg-slate-950 p-2.5 rounded-xl border border-amber-400/40">
              <p className="text-[10px] font-bold text-amber-300">
                How to Resolve Immediately:
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5">
                {diagnosticErrorModal.hint}
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
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6">
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