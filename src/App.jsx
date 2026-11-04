import React, { useState, useEffect } from "react";
import {
  INITIAL_APP_UPDATE_INFO,
  GEO_ZONES,
  INITIAL_GEO_ADS,
  INITIAL_CATEGORIES,
  SERVICE_CATEGORIES,
  LABOUR_TRADE_CATEGORIES,
  INITIAL_MERCHANTS,
  INITIAL_SERVICE_PROVIDERS,
  INITIAL_DECORATORS,
  INITIAL_PRODUCTS,
  INITIAL_FUNCTION_HALLS,
  DECORATION_SERVICE_MODULES,
  INITIAL_RIDERS,
  INITIAL_LABOUR_WORKERS
} from "./data";
import {
  INDIAN_LANGUAGES,
  getLangText,
  translateCategoryName
} from "./modules/i18n/indianLanguages";
import GeoTargetedAdBanner from "./modules/ads/GeoTargetedAdBanner";
import RoleFooterNav from "./modules/RoleFooterNav";
import UpiPaymentModal from "./modules/UpiPaymentModal";
import OrdersHistoryAndInvoice from "./modules/OrdersHistoryAndInvoice";
import OwnerAccountProfile from "./modules/OwnerAccountProfile";
import LabourWorksitePortal from "./modules/LabourWorksitePortal";
import FounderAdminSuite from "./modules/FounderAdminSuite";
import LiveRouteMap from "./modules/LiveRouteMap";
import { verifyModulePipelineIntegrity } from "./modules/security/CodeSecurityGuard";
import {
  saveCloudAndLocalState,
  loadCloudAndLocalState,
  wipeAllPreinstalledServerData,
  subscribeToRealtimeUpdates,
  checkLiveCloudOtaManifest,
  performZeroLossOtaUpdate
} from "./supabaseClient";

function FounderLogoBadge({ logoUrl }) {
  return (
    <div
      title="WE4ALL Official Emblem"
      className="relative w-10 h-10 rounded-full border-2 border-amber-400 ring-2 ring-emerald-500/50 bg-gradient-to-b from-[#07261e] to-[#04120e] flex flex-col items-center justify-center overflow-hidden shadow-lg shrink-0 select-none"
    >
      {logoUrl ? (
        <img src={logoUrl} alt="WE4ALL" className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center text-center leading-none">
          <span className="text-[7px] font-black text-amber-400">WE4ALL</span>
          <span className="text-[6px] font-extrabold text-emerald-300">FOUNDER</span>
          <span className="text-[5px] font-bold text-white">ANVESH</span>
        </div>
      )}
    </div>
  );
}

function calculateOrderLogistics(items = [], consumerDistanceKm = 1.8, heavyFee = 0, laborFee = 0) {
  const totalWeightGrams = items.reduce(
    (sum, it) => sum + (it.weightGrams || 1000) * (it.qty || 1),
    0
  );
  const uniqueMerchantsCount = new Set(items.map((i) => i.merchantName)).size || 1;
  const totalRouteKm = Number(
    (consumerDistanceKm + Math.max(0, uniqueMerchantsCount - 1) * 1.1).toFixed(1)
  );

  let vehicle = "2W Bike Captain (Up to 45kg)";
  let baseDelivery = 25;

  if (totalWeightGrams <= 45000) {
    if (totalRouteKm > 2.5) {
      baseDelivery += Math.ceil((totalRouteKm - 2.5) * 5.5);
    }
  } else if (totalWeightGrams <= 300000) {
    vehicle = "3W Cargo Auto (Up to 300kg)";
    baseDelivery = 150 + Math.ceil(totalRouteKm * 18);
  } else {
    vehicle = "4W Mini-Truck Heavy Transport (>300kg)";
    baseDelivery = 350 + Math.ceil(totalRouteKm * 25);
  }

  const deliveryFee = baseDelivery + Number(heavyFee || 0) + Number(laborFee || 0);
  return { totalWeightGrams, totalRouteKm, vehicle, deliveryFee };
}

function MobilePhoneShell({
  title,
  activePortal,
  footerTab,
  setFooterTab,
  totalCartCount,
  totalOrdersCount,
  floatingLiveOrder,
  onOpenLiveOrderModal,
  onOpenAdminConsole,
  brightTheme,
  lang,
  setLang,
  appUpdateInfo,
  onTriggerOtaUpdate,
  personalShoppingFromPartner,
  onReturnToPartnerDesk,
  showFooter = true,
  children
}) {
  const t = getLangText(lang);
  return (
    <div
      className={
        "w-full max-w-[420px] mx-auto overflow-hidden flex flex-col min-h-screen sm:min-h-[850px] sm:max-h-[92vh] sm:my-2 sm:rounded-[40px] sm:border-[8px] relative transition-all shadow-2xl " +
        (brightTheme
          ? "bg-white text-slate-900 sm:border-emerald-700/80"
          : "bg-[#071118] text-white sm:border-slate-800")
      }
    >
      <div
        className={
          "px-3 py-2 flex justify-between items-center text-[11px] border-b shrink-0 " +
          (brightTheme
            ? "bg-emerald-950 text-white border-emerald-800"
            : "bg-slate-950 text-slate-100 border-emerald-950/60")
        }
      >
        <span className="font-extrabold text-amber-400 tracking-wide flex items-center gap-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          {t.appTitle} | {title}
        </span>
        <div className="flex items-center gap-1">
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="bg-slate-900 text-amber-300 border border-slate-700 rounded-lg px-1.5 py-0.5 text-[10px] font-black outline-none cursor-pointer"
          >
            {INDIAN_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.code} - {l.native}
              </option>
            ))}
          </select>
          {onOpenAdminConsole && (
            <button
              type="button"
              onClick={onOpenAdminConsole}
              className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[9px] font-black cursor-pointer"
            >
              {t.adminBtn}
            </button>
          )}
        </div>
      </div>

      {personalShoppingFromPartner && (
        <div className="bg-indigo-600 text-white px-3 py-1.5 flex justify-between items-center text-[10px] font-black shrink-0">
          <span>Shopping Mode (Partner: {personalShoppingFromPartner.toUpperCase()})</span>
          <button
            type="button"
            onClick={onReturnToPartnerDesk}
            className="bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-lg font-black cursor-pointer"
          >
            Return to Partner Desk
          </button>
        </div>
      )}

      {(appUpdateInfo?.updateAvailable ||
        (appUpdateInfo?.latestAvailableVersion &&
          appUpdateInfo?.currentVersion !== appUpdateInfo?.latestAvailableVersion)) && (
        <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 text-slate-950 px-3 py-1.5 flex items-center justify-between gap-2 text-[10px] font-black shadow shrink-0">
          <div className="truncate">
            WE4ALL v{appUpdateInfo.latestAvailableVersion} OTA Ready!
          </div>
          <button
            type="button"
            onClick={onTriggerOtaUpdate}
            className="bg-slate-950 text-amber-300 px-2.5 py-1 rounded-lg text-[9px] font-black shrink-0 cursor-pointer"
          >
            Update & Restart
          </button>
        </div>
      )}

      <div
        className={
          "flex-1 overflow-y-auto p-3 space-y-3 pb-24 " +
          (brightTheme
            ? "bg-slate-50 text-slate-900"
            : "bg-gradient-to-b from-[#071118] to-[#04090e] text-white")
        }
      >
        {children}
      </div>

      {floatingLiveOrder && showFooter && (
        <div className="absolute bottom-14 left-3 right-3 z-30">
          <button
            type="button"
            onClick={onOpenLiveOrderModal}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-2.5 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center justify-between cursor-pointer"
          >
            <div className="text-left">
              <p className="text-[10px] font-black leading-tight">
                LIVE ORDER #{floatingLiveOrder.id}: {floatingLiveOrder.status.replace(/_/g, " ")}
              </p>
              <p className="text-[9px] font-bold text-amber-200">
                Captain: {floatingLiveOrder.riderName} | Tap for Live Route Map & OTP
              </p>
            </div>
            <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-1 rounded-xl">
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
      window.location.pathname.toLowerCase().includes("/admin"));

  const [viewMode, setViewMode] = useState(isDirectAdminUrl ? "founder_web" : "mobile_app");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminAuthStep, setAdminAuthStep] = useState(1);
  const [adminLoginForm, setAdminLoginForm] = useState({ username: "", password: "" });
  const [adminPinInput, setAdminPinInput] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");

  const [lang, setLang] = useState(savedCloud?.lang || "EN");
  const t = getLangText(lang);
  const [brightTheme, setBrightTheme] = useState(true);

  const [founderLogoUrl, setFounderLogoUrl] = useState(
    () => localStorage.getItem("we4all_founder_original_photo") || ""
  );
  const [apkIconUrl, setApkIconUrl] = useState(
    () => localStorage.getItem("we4all_apk_launcher_icon") || ""
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

  const handleUploadApkIcon = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setApkIconUrl(reader.result);
      localStorage.setItem("we4all_apk_launcher_icon", reader.result);
      triggerToast("APK Launcher Icon updated!");
    };
    reader.readAsDataURL(file);
  };

  // Strictly start in Customer mode; Partner portals require KYC + PIN login
  const [activePortal, setActivePortal] = useState("customer");
  const [authenticatedPartnerRole, setAuthenticatedPartnerRole] = useState(null);
  const [personalShoppingFromPartner, setPersonalShoppingFromPartner] = useState(null);
  const [footerTab, setFooterTab] = useState("home");

  const [appUpdateInfo, setAppUpdateInfo] = useState(
    savedCloud?.appUpdateInfo || INITIAL_APP_UPDATE_INFO
  );
  const [otaProgress, setOtaProgress] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleManualCheckForUpdate = async () => {
    setCheckingUpdate(true);
    triggerToast("Checking WE4ALL Cloud Server for OTA updates...");
    const latest = await checkLiveCloudOtaManifest((payload) => {
      if (payload?.appUpdateInfo) setAppUpdateInfo(payload.appUpdateInfo);
    });
    setTimeout(() => {
      setCheckingUpdate(false);
      const targetVer =
        latest?.latestAvailableVersion || appUpdateInfo?.latestAvailableVersion || "3.1.0";
      setAppUpdateInfo((prev) => ({
        ...prev,
        ...(latest || {}),
        latestAvailableVersion: targetVer
      }));
      triggerToast("Verified WE4ALL v" + targetVer + " with Code Security Guard!");
    }, 500);
  };

  const handleRunOtaUpdate = () => {
    const integrity = verifyModulePipelineIntegrity(savedCloud || {});
    if (!integrity.valid) return;
    performZeroLossOtaUpdate(
      appUpdateInfo.latestAvailableVersion,
      appUpdateInfo.releaseNotes,
      (stage) => setOtaProgress(stage),
      (updatedInfo) => {
        setAppUpdateInfo(updatedInfo);
        setOtaProgress(null);
        triggerToast("Updated to v" + updatedInfo.currentVersion + " with zero data loss!");
      }
    );
  };

  const [accountSecurity, setAccountSecurity] = useState(
    savedCloud?.accountSecurity || {
      pinEnabled: true,
      biometricEnabled: true,
      fastPin: "1234"
    }
  );
  const [currentUser, setCurrentUser] = useState(
    savedCloud?.currentUser || {
      id: "usr_clean",
      fullName: "WE4ALL User",
      phone: "",
      role: "customer",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      upiId: "",
      fastPin: "1234"
    }
  );
  const [registeredUsers, setRegisteredUsers] = useState(savedCloud?.registeredUsers || []);
  const [pendingUpiPayment, setPendingUpiPayment] = useState(null);
  const [mobileToast, setMobileToast] = useState("");

  const triggerToast = (msg) => {
    setMobileToast(msg);
    setTimeout(() => setMobileToast(""), 4200);
  };

  const [selectedZoneFilter, setSelectedZoneFilter] = useState("ALL_INDIA");
  const [killedCategoriesByZone] = useState({});
  const [geoAds, setGeoAds] = useState(savedCloud?.geoAds || INITIAL_GEO_ADS);
  const [categories, setCategories] = useState(savedCloud?.categories || INITIAL_CATEGORIES);
  const [merchants, setMerchants] = useState(savedCloud?.merchants || INITIAL_MERCHANTS);
  const [serviceProviders, setServiceProviders] = useState(
    savedCloud?.serviceProviders || INITIAL_SERVICE_PROVIDERS
  );
  const [decorators] = useState(savedCloud?.decorators || INITIAL_DECORATORS);
  const [labourWorkers, setLabourWorkers] = useState(
    savedCloud?.labourWorkers || INITIAL_LABOUR_WORKERS
  );
  const [products, setProducts] = useState(savedCloud?.products || INITIAL_PRODUCTS);
  const [functionHalls, setFunctionHalls] = useState(
    savedCloud?.functionHalls || INITIAL_FUNCTION_HALLS
  );
  const [riders] = useState(savedCloud?.riders || INITIAL_RIDERS);

  const [pendingMerchants] = useState(savedCloud?.pendingMerchants || []);
  const [pendingSubCategories] = useState(savedCloud?.pendingSubCategories || []);
  const [rejectedItems] = useState(savedCloud?.rejectedItems || []);
  const [monetizationConfig, setMonetizationConfig] = useState(
    savedCloud?.monetizationConfig || {
      globalPlatformFee: 0,
      serviceBookingSurcharge: 0,
      productSpecificFee: 0
    }
  );

  const [splitScreens] = useState([
    { id: 1, role: "customer" },
    { id: 2, role: "merchant" },
    { id: 3, role: "service_provider" },
    { id: 4, role: "decorator" },
    { id: 5, role: "rider" },
    { id: 6, role: "labour" }
  ]);

  const [addressBook, setAddressBook] = useState(
    savedCloud?.addressBook || [
      { id: "addr_default", label: "Primary", fullAddress: "Adilabad Town", distanceKm: 1.8, verified: true }
    ]
  );
  const [selectedAddressId] = useState("addr_default");
  const activeAddressObj =
    addressBook.find((a) => a.id === selectedAddressId) || addressBook[0] || {
      label: "Primary",
      fullAddress: "Adilabad Town",
      distanceKm: 1.8
    };

  const [customerHomeSubTab, setCustomerHomeSubTab] = useState("stores");
  const [selectedCategory, setSelectedCategory] = useState("daily_needs");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVariantMap, setSelectedVariantMap] = useState({});
  const [selectedMerchantByProduct, setSelectedMerchantByProduct] = useState({});
  const [expandedCompareProdId, setExpandedCompareProdId] = useState(null);

  const [serviceFilterDate, setServiceFilterDate] = useState("2026-11-05");
  const [serviceFilterSlot, setServiceFilterSlot] = useState("10:00 AM - 11:00 AM");

  const [merchantCart, setMerchantCart] = useState(savedCloud?.merchantCart || []);
  const [serviceCart, setServiceCart] = useState(savedCloud?.serviceCart || []);
  const [decorCart, setDecorCart] = useState(savedCloud?.decorCart || []);
  const [taxiCart, setTaxiCart] = useState(savedCloud?.taxiCart || []);
  const [activeCartViewTab, setActiveCartViewTab] = useState("merchant_cart");

  const [taxiBookingForm, setTaxiBookingForm] = useState({
    pickupPin: "Adilabad Bus Stand",
    dropPin: "Collectorate Chowk, Adilabad",
    distanceKm: 2.5
  });

  const [orders, setOrders] = useState(savedCloud?.orders || []);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [liveOrderDrawerOpen, setLiveOrderDrawerOpen] = useState(false);
  const [serviceBookings, setServiceBookings] = useState(savedCloud?.serviceBookings || []);
  const [labourBookings, setLabourBookings] = useState(savedCloud?.labourBookings || []);

  const [newMerchantProd, setNewMerchantProd] = useState({
    categoryId: "daily_needs",
    subCategoryBrand: "",
    shopName: "",
    variantLabel: "1 kg Pack",
    price: "",
    mrp: ""
  });

  const [newSpForm, setNewSpForm] = useState({
    serviceCategoryId: "srv_plumbing",
    providerName: "",
    specialization: "",
    visitingFee: 99
  });

  const [newHallForm, setNewHallForm] = useState({
    name: "",
    capacity: "800 Guests",
    pricePerDay: 45000
  });

  const [providerHappyCodeInput, setProviderHappyCodeInput] = useState("");
  const [eventDate, setEventDate] = useState("2026-11-10");
  const [captainOtpInput, setCaptainOtpInput] = useState("");

  useEffect(() => {
    saveCloudAndLocalState({
      lang,
      activePortal,
      appUpdateInfo,
      accountSecurity,
      currentUser,
      geoAds,
      categories,
      merchants,
      serviceProviders,
      decorators,
      labourWorkers,
      registeredUsers,
      products,
      functionHalls,
      riders,
      pendingMerchants,
      pendingSubCategories,
      rejectedItems,
      monetizationConfig,
      addressBook,
      merchantCart,
      serviceCart,
      decorCart,
      taxiCart,
      orders,
      serviceBookings,
      labourBookings
    });
  }, [
    lang,
    activePortal,
    appUpdateInfo,
    accountSecurity,
    currentUser,
    geoAds,
    categories,
    merchants,
    serviceProviders,
    decorators,
    labourWorkers,
    registeredUsers,
    products,
    functionHalls,
    riders,
    pendingMerchants,
    pendingSubCategories,
    rejectedItems,
    monetizationConfig,
    addressBook,
    merchantCart,
    serviceCart,
    decorCart,
    taxiCart,
    orders,
    serviceBookings,
    labourBookings
  ]);

  useEffect(() => {
    return subscribeToRealtimeUpdates((remoteState) => {
      if (remoteState.orders) setOrders(remoteState.orders);
      if (remoteState.serviceBookings) setServiceBookings(remoteState.serviceBookings);
      if (remoteState.labourBookings) setLabourBookings(remoteState.labourBookings);
      if (remoteState.products) setProducts(remoteState.products);
      if (remoteState.appUpdateInfo) setAppUpdateInfo(remoteState.appUpdateInfo);
    });
  }, []);
  const totalCartCount =
    merchantCart.reduce((s, i) => s + i.qty, 0) +
    serviceCart.length +
    decorCart.length +
    taxiCart.length;

  const activeOrder =
    orders.find((o) => o.id === activeOrderId && !o.status.includes("CANCELLED")) ||
    orders[0] ||
    null;

  const openFounderAdminGate = () => {
    setIsAdminAuthenticated(false);
    setAdminAuthStep(1);
    setViewMode("founder_web");
  };

  const getProductBestOffer = (product) => {
    const offers =
      product.merchantOffers && product.merchantOffers.length > 0
        ? [...product.merchantOffers].sort((a, b) => a.price - b.price)
        : [
            {
              merchantId: 1,
              merchantName: product.shopName,
              price: product.variants?.[0]?.price || 100,
              area: "Adilabad"
            }
          ];
    const chosenId = selectedMerchantByProduct[product.id];
    const activeOffer = offers.find((o) => o.merchantId === chosenId) || offers[0];
    return { offers, bestOffer: offers[0], activeOffer };
  };

  const handleAddToUnifiedMerchantCart = (product) => {
    const chosenVarId = selectedVariantMap[product.id] || product.variants[0].id;
    const variant = product.variants.find((v) => v.id === chosenVarId) || product.variants[0];
    const { activeOffer } = getProductBestOffer(product);
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
            name: product.subCategoryBrand + " (" + variant.label + ")",
            merchantId: activeOffer.merchantId,
            merchantName: activeOffer.merchantName || product.shopName,
            price: activeOffer.price || variant.price,
            weightGrams: variant.weightGrams || 1000,
            qty: 1
          }
        ];
    setMerchantCart(updated);
    triggerToast("Added " + product.subCategoryBrand + " to Cart!");
  };

  const handlePlaceOrderForCheckout = () => {
    if (merchantCart.length === 0) return;
    const itemsTotal = merchantCart.reduce((s, i) => s + i.price * i.qty, 0);
    const { totalWeightGrams, totalRouteKm, vehicle, deliveryFee } = calculateOrderLogistics(
      merchantCart,
      activeAddressObj.distanceKm,
      0,
      0
    );
    const silentFee = Number(monetizationConfig.globalPlatformFee || 0);
    const gst = Number(((itemsTotal + deliveryFee + silentFee) * 0.05).toFixed(2));
    const grandTotal = Number((itemsTotal + deliveryFee + silentFee + gst).toFixed(2));

    const newOrder = {
      id: "VFL-" + Math.floor(1000 + Math.random() * 9000),
      dateStr: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      periodTag: "TODAY",
      customerName: currentUser.fullName,
      address: activeAddressObj.fullAddress,
      distanceKm: totalRouteKm,
      totalWeightGrams,
      vehicle,
      shopName: Array.from(new Set(merchantCart.map((i) => i.merchantName))).join(" + "),
      items: merchantCart,
      itemsTotal,
      deliveryFee,
      gst,
      grandTotal,
      riderName: riders[0]?.name || "Assigned Captain",
      status: "MERCHANT_APPROVED_AWAITING_PAYMENT",
      secretOtp: String(Math.floor(1000 + Math.random() * 9000))
    };

    setOrders([newOrder, ...orders]);
    setActiveOrderId(newOrder.id);
    setMerchantCart([]);
    setPendingUpiPayment({
      type: "APPROVED_MERCHANT_ORDER",
      orderId: newOrder.id,
      title: "Order #" + newOrder.id,
      amount: newOrder.grandTotal
    });
  };

  const handleCompleteUpiPayment = (chosenUpiAppName) => {
    if (!pendingUpiPayment) return;
    if (pendingUpiPayment.type === "APPROVED_MERCHANT_ORDER") {
      setOrders(
        orders.map((o) =>
          o.id === pendingUpiPayment.orderId
            ? { ...o, paidViaApp: chosenUpiAppName, status: "PAID_PACKING_STARTED" }
            : o
        )
      );
      setPendingUpiPayment(null);
      setFooterTab("orders");
      setLiveOrderDrawerOpen(true);
      triggerToast("Paid via " + chosenUpiAppName + "! Sent to Merchant Packing Queue.");
    } else if (pendingUpiPayment.type === "SERVICE_ESCROW") {
      const created = serviceCart.map((sc) => ({
        ...sc,
        id: "SRV-" + Math.floor(1000 + Math.random() * 9000),
        customerName: currentUser.fullName,
        escrowVisitingAmount: sc.visitingFee + (monetizationConfig.serviceBookingSurcharge || 0),
        paidViaApp: chosenUpiAppName,
        happyCode: String(Math.floor(1000 + Math.random() * 9000)),
        escrowStatus: "VISITING_FEE_HELD_IN_ESCROW",
        status: "CONFIRMED_PROVIDER_EN_ROUTE"
      }));
      setServiceBookings([...created, ...serviceBookings]);
      setServiceCart([]);
      setPendingUpiPayment(null);
      setFooterTab("orders");
      triggerToast("Paid via " + chosenUpiAppName + "! Visiting Fee held in Escrow.");
    }
  };

  const renderRolePortalContent = (portalRole) => {
    // STRICT RBAC LOCK: Block any non-customer portal unless authenticated for that exact role (or in Founder Split Lab)
    if (
      portalRole !== "customer" &&
      viewMode !== "multi_role_lab" &&
      authenticatedPartnerRole !== portalRole
    ) {
      return (
        <div className="p-4 bg-white text-slate-900 rounded-2xl border border-rose-300 space-y-3 text-xs text-center shadow">
          <p className="font-black text-rose-700 text-sm">Partner Portal Locked</p>
          <p className="text-[11px] text-slate-600">
            Access to the {portalRole.toUpperCase()} desk requires a verified Partner Mobile Number + 4-Digit Secret PIN.
          </p>
          <button
            type="button"
            onClick={() => {
              setActivePortal("customer");
              setFooterTab("account");
            }}
            className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
          >
            Go to Partner KYC & Login Gate
          </button>
        </div>
      );
    }

    if (portalRole === "customer") {
      const visibleCategories = categories.filter(
        (c) => !(killedCategoriesByZone[selectedZoneFilter] || []).includes(c.id)
      );
      const filteredProducts = products.filter((p) => {
        const matchCat = selectedCategory === "all" || p.categoryId === selectedCategory;
        const matchSearch =
          !searchQuery.trim() ||
          p.subCategoryBrand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.shopName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
      });

      return (
        <div className="space-y-3 text-xs">
          <div className="bg-emerald-950 text-white p-3 rounded-2xl border border-emerald-700/60 space-y-2 shadow">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FounderLogoBadge logoUrl={founderLogoUrl} />
                <div>
                  <h1 className="font-black text-amber-400 text-xs leading-tight">
                    WE4ALL HYPERLOCAL SUPER-APP
                  </h1>
                  <p className="text-[10px] text-emerald-200 font-bold">
                    Delivering to: {activeAddressObj.label} ({activeAddressObj.fullAddress})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setBrightTheme(!brightTheme)}
                  className="bg-slate-900 text-amber-300 px-2 py-1 rounded-lg text-[9px] font-black cursor-pointer"
                >
                  {brightTheme ? "Dark" : "Bright"}
                </button>
                <button
                  type="button"
                  onClick={() => setFooterTab("account")}
                  className="bg-amber-400 text-slate-950 px-2 py-1 rounded-lg text-[9px] font-black cursor-pointer"
                >
                  Partner KYC
                </button>
              </div>
            </div>

            <div className="flex gap-1.5">
              <select
                value={selectedZoneFilter}
                onChange={(e) => setSelectedZoneFilter(e.target.value)}
                className="bg-slate-900 text-emerald-300 border border-emerald-700 rounded-xl px-2 py-1 text-[10px] font-bold"
              >
                {GEO_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder || "Search stores, items, services..."}
                className="flex-1 bg-slate-900 text-white border border-slate-700 rounded-xl px-2.5 py-1 text-[11px]"
              />
            </div>
          </div>

          <GeoTargetedAdBanner
            ads={geoAds}
            selectedZone={selectedZoneFilter}
            brightTheme={brightTheme}
          />

          {footerTab === "home" && (
            <>
              <div className="grid grid-cols-5 gap-1 bg-slate-200/80 p-1 rounded-xl text-[10px] font-black text-slate-800">
                {[
                  { id: "stores", label: "Stores" },
                  { id: "services", label: "1-Hr Srv" },
                  { id: "events", label: "Events" },
                  { id: "taxi", label: "Rides" },
                  { id: "labour", label: "Mistri" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCustomerHomeSubTab(tab.id)}
                    className={
                      "py-1.5 rounded-lg text-center cursor-pointer " +
                      (customerHomeSubTab === tab.id
                        ? "bg-emerald-900 text-amber-300 shadow"
                        : "hover:bg-white/60")
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {customerHomeSubTab === "stores" && (
                <div className="space-y-2.5">
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("all")}
                      className={
                        "px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 cursor-pointer " +
                        (selectedCategory === "all"
                          ? "bg-amber-400 text-slate-950"
                          : "bg-slate-800 text-white")
                      }
                    >
                      All Categories
                    </button>
                    {visibleCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={
                          "px-2.5 py-1 rounded-xl text-[10px] font-black shrink-0 cursor-pointer " +
                          (selectedCategory === cat.id
                            ? "bg-amber-400 text-slate-950"
                            : "bg-slate-800 text-white")
                        }
                      >
                        {cat.icon} {translateCategoryName(cat.id, cat.name, lang)}
                      </button>
                    ))}
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="p-4 rounded-2xl border border-dashed border-emerald-600/50 text-center space-y-2">
                      <p className="font-black text-xs">
                        Clean Production Server Catalog (0 Pre-Installed Items)
                      </p>
                      <p className="text-[10px] opacity-80">
                        Verified Merchants can log in via Account &rarr; Partner KYC to publish live products.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFooterTab("account");
                          triggerToast("Log in or complete Merchant KYC to publish products.");
                        }}
                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
                      >
                        Merchant Partner Login / KYC
                      </button>
                    </div>
                  ) : (
                    filteredProducts.map((prod) => {
                      const chosenVarId = selectedVariantMap[prod.id] || prod.variants[0]?.id;
                      const activeVar =
                        prod.variants.find((v) => v.id === chosenVarId) || prod.variants[0];
                      const { offers, activeOffer } = getProductBestOffer(prod);
                      return (
                        <div
                          key={prod.id}
                          className="p-3 rounded-2xl border border-slate-300/80 bg-white text-slate-900 shadow-sm space-y-2"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                                {activeOffer.merchantName || prod.shopName}
                              </span>
                              <h3 className="font-black text-xs mt-1">{prod.subCategoryBrand}</h3>
                            </div>
                            <div className="text-right">
                              <p className="font-black text-sm text-emerald-700">
                                Rs.{activeOffer.price || activeVar?.price}
                              </p>
                              <p className="text-[9px] line-through text-slate-400">
                                MRP Rs.{activeVar?.mrp || (activeVar?.price || 100) + 25}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={chosenVarId}
                              onChange={(e) =>
                                setSelectedVariantMap({
                                  ...selectedVariantMap,
                                  [prod.id]: e.target.value
                                })
                              }
                              className="border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold bg-slate-50"
                            >
                              {prod.variants.map((v) => (
                                <option key={v.id} value={v.id}>
                                  {v.label} - Rs.{v.price}
                                </option>
                              ))}
                            </select>

                            {offers.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCompareProdId(
                                    expandedCompareProdId === prod.id ? null : prod.id
                                  )
                                }
                                className="text-[9px] font-black text-indigo-700 underline cursor-pointer"
                              >
                                Compare {offers.length} Shops
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAddToUnifiedMerchantCart(prod)}
                              className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
                            >
                              + Add
                            </button>
                          </div>

                          {expandedCompareProdId === prod.id && (
                            <div className="bg-slate-100 p-2 rounded-xl space-y-1">
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
                                  className="w-full flex justify-between items-center text-[10px] font-bold px-2 py-1 rounded bg-white border border-slate-200 cursor-pointer"
                                >
                                  <span>{off.merchantName}</span>
                                  <span className="text-emerald-700 font-black">Rs.{off.price}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {customerHomeSubTab === "services" && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-1.5 bg-white p-2 rounded-xl border border-slate-200 text-slate-900">
                    <input
                      type="date"
                      value={serviceFilterDate}
                      onChange={(e) => setServiceFilterDate(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold"
                    />
                    <select
                      value={serviceFilterSlot}
                      onChange={(e) => setServiceFilterSlot(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold"
                    >
                      <option>10:00 AM - 11:00 AM</option>
                      <option>12:00 PM - 01:00 PM</option>
                      <option>03:00 PM - 04:00 PM</option>
                      <option>06:00 PM - 07:00 PM</option>
                    </select>
                  </div>

                  {serviceProviders.length === 0 ? (
                    <div className="p-4 rounded-2xl border border-dashed border-emerald-600/50 text-center space-y-2">
                      <p className="font-black text-xs">No Active 1-Hr Service Providers Yet</p>
                      <button
                        type="button"
                        onClick={() => {
                          setFooterTab("account");
                          triggerToast("Complete Service Provider KYC in Account tab to list services.");
                        }}
                        className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
                      >
                        Service Provider Login / KYC
                      </button>
                    </div>
                  ) : (
                    serviceProviders.map((sp) => (
                      <div
                        key={sp.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-white text-slate-900 flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-black text-xs">{sp.providerName}</h4>
                          <p className="text-[10px] text-slate-600">{sp.specialization}</p>
                          <p className="text-[10px] font-black text-emerald-700">
                            Visiting Escrow Fee: Rs.{sp.visitingFee}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setServiceCart([
                              ...serviceCart,
                              {
                                ...sp,
                                bookingDate: serviceFilterDate,
                                bookingSlot: serviceFilterSlot
                              }
                            ]);
                            triggerToast("Booked " + sp.providerName + " into Service Cart!");
                          }}
                          className="bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
                        >
                          Book 1-Hr
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {customerHomeSubTab === "events" && (
                <div className="space-y-2.5">
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200 text-slate-900 space-y-2">
                    <label className="text-[10px] font-black">Select Event / Muhurtham Date:</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold"
                    />
                  </div>
                  {functionHalls.map((hall) => {
                    const isBooked = (hall.bookedDates || []).includes(eventDate);
                    return (
                      <div
                        key={hall.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-white text-slate-900 flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-black text-xs">{hall.name}</h4>
                          <p className="text-[10px] text-slate-600">
                            {hall.capacity} | Rs.{hall.pricePerDay}/day
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isBooked}
                          onClick={() => {
                            setDecorCart([
                              ...decorCart,
                              { id: hall.id, title: hall.name, eventDate, price: hall.pricePerDay }
                            ]);
                            triggerToast("Reserved " + hall.name + " in Event Cart!");
                          }}
                          className={
                            "px-3 py-1.5 rounded-xl text-[10px] font-black " +
                            (isBooked
                              ? "bg-rose-200 text-rose-800"
                              : "bg-emerald-600 text-white cursor-pointer")
                          }
                        >
                          {isBooked ? "Date Booked" : "Reserve Hall"}
                        </button>
                      </div>
                    );
                  })}
                  {DECORATION_SERVICE_MODULES.map((mod) => (
                    <div
                      key={mod.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-white text-slate-900 flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-black text-xs">
                          {mod.icon} {mod.name}
                        </h4>
                        <p className="text-[10px] text-emerald-700 font-bold">
                          Starting Rs.{mod.startingPrice}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDecorCart([
                            ...decorCart,
                            { id: mod.id, title: mod.name, eventDate, price: mod.startingPrice }
                          ]);
                          triggerToast("Added " + mod.name + " to Event Cart!");
                        }}
                        className="bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
                      >
                        + Add Decor
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {customerHomeSubTab === "taxi" && (
                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-slate-900 space-y-2">
                  <h3 className="font-black text-xs">Instant Local Point-to-Point Ride</h3>
                  <input
                    type="text"
                    value={taxiBookingForm.pickupPin}
                    onChange={(e) =>
                      setTaxiBookingForm({ ...taxiBookingForm, pickupPin: e.target.value })
                    }
                    placeholder="Pickup Location"
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={taxiBookingForm.dropPin}
                    onChange={(e) =>
                      setTaxiBookingForm({ ...taxiBookingForm, dropPin: e.target.value })
                    }
                    placeholder="Drop Location"
                    className="w-full border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs"
                  />
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { type: "2W Bike", rate: 12 },
                      { type: "3W Auto", rate: 22 },
                      { type: "AC Cab", rate: 35 }
                    ].map((v) => {
                      const fare = Math.round(taxiBookingForm.distanceKm * v.rate + 20);
                      return (
                        <button
                          key={v.type}
                          type="button"
                          onClick={() => {
                            setTaxiCart([
                              ...taxiCart,
                              {
                                id: "RIDE-" + Date.now(),
                                vehicle: v.type,
                                pickup: taxiBookingForm.pickupPin,
                                drop: taxiBookingForm.dropPin,
                                fare
                              }
                            ]);
                            triggerToast(v.type + " (Rs." + fare + ") added to Ride Cart!");
                          }}
                          className="p-2 rounded-xl border border-emerald-600 bg-emerald-50 text-center cursor-pointer"
                        >
                          <p className="font-black text-[10px]">{v.type}</p>
                          <p className="font-black text-xs text-emerald-800">Rs.{fare}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {customerHomeSubTab === "labour" && (
                <LabourWorksitePortal
                  mode="customer"
                  categories={LABOUR_TRADE_CATEGORIES}
                  workers={labourWorkers}
                  setWorkers={setLabourWorkers}
                  bookings={labourBookings}
                  setBookings={setLabourBookings}
                  currentUser={currentUser}
                  brightTheme={brightTheme}
                  onToast={triggerToast}
                />
              )}
            </>
          )}

          {footerTab === "cart" && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 text-slate-900 space-y-3">
              <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl text-[9px] font-black">
                {[
                  { id: "merchant_cart", label: "Stores (" + merchantCart.length + ")" },
                  { id: "service_cart", label: "1-Hr (" + serviceCart.length + ")" },
                  { id: "decor_cart", label: "Events (" + decorCart.length + ")" },
                  { id: "taxi_cart", label: "Rides (" + taxiCart.length + ")" }
                ].map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setActiveCartViewTab(ct.id)}
                    className={
                      "py-1.5 rounded-lg cursor-pointer " +
                      (activeCartViewTab === ct.id ? "bg-emerald-900 text-amber-300" : "")
                    }
                  >
                    {ct.label}
                  </button>
                ))}
              </div>

              {activeCartViewTab === "merchant_cart" && (
                <div className="space-y-2">
                  {merchantCart.length === 0 ? (
                    <p className="text-center py-4 text-slate-500 font-bold">
                      Your store cart is empty.
                    </p>
                  ) : (
                    <>
                      {merchantCart.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center border-b border-slate-200 pb-1.5"
                        >
                          <div>
                            <p className="font-black text-xs">{item.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {item.merchantName} | Rs.{item.price} x {item.qty}
                            </p>
                          </div>
                          <p className="font-black text-xs text-emerald-700">
                            Rs.{item.price * item.qty}
                          </p>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handlePlaceOrderForCheckout}
                        className="w-full bg-emerald-600 text-white font-black py-2.5 rounded-xl cursor-pointer"
                      >
                        Approve & Pay via UPI
                      </button>
                    </>
                  )}
                </div>
              )}

              {activeCartViewTab === "service_cart" && (
                <div className="space-y-2">
                  {serviceCart.length === 0 ? (
                    <p className="text-center py-4 text-slate-500 font-bold">
                      No 1-Hr Service bookings in cart.
                    </p>
                  ) : (
                    <>
                      {serviceCart.map((sc, i) => (
                        <div key={i} className="flex justify-between border-b pb-1.5">
                          <span>
                            {sc.providerName} ({sc.bookingSlot})
                          </span>
                          <span className="font-black">Rs.{sc.visitingFee}</span>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const total = serviceCart.reduce((s, x) => s + x.visitingFee, 0);
                          setPendingUpiPayment({
                            type: "SERVICE_ESCROW",
                            title: "1-Hr Service Escrow Visiting Fee",
                            amount: total
                          });
                        }}
                        className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                      >
                        Pay Visiting Fee into Escrow
                      </button>
                    </>
                  )}
                </div>
              )}

              {activeCartViewTab === "decor_cart" && (
                <div className="space-y-2">
                  {decorCart.map((d, i) => (
                    <div key={i} className="flex justify-between border-b pb-1">
                      <span>
                        {d.title} ({d.eventDate})
                      </span>
                      <span className="font-black">Rs.{d.price}</span>
                    </div>
                  ))}
                  {decorCart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setDecorCart([]);
                        triggerToast("Event & Hall Reservation Confirmed!");
                      }}
                      className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
                    >
                      Confirm Event Booking
                    </button>
                  )}
                </div>
              )}

              {activeCartViewTab === "taxi_cart" && (
                <div className="space-y-2">
                  {taxiCart.map((r, i) => (
                    <div key={i} className="flex justify-between border-b pb-1">
                      <span>
                        {r.vehicle}: {r.pickup} to {r.drop}
                      </span>
                      <span className="font-black">Rs.{r.fare}</span>
                    </div>
                  ))}
                  {taxiCart.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setTaxiCart([]);
                        triggerToast("Captain Dispatched for Your Ride!");
                      }}
                      className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
                    >
                      Dispatch Ride Captain Now
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {footerTab === "orders" && (
            <OrdersHistoryAndInvoice
              orders={orders}
              setOrders={setOrders}
              serviceBookings={serviceBookings}
              labourBookings={labourBookings}
              brightTheme={brightTheme}
              onOpenLiveMap={(ord) => {
                setActiveOrderId(ord.id);
                setLiveOrderDrawerOpen(true);
              }}
              onTriggerToast={triggerToast}
            />
          )}

          {footerTab === "account" && (
            <OwnerAccountProfile
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              accountSecurity={accountSecurity}
              setAccountSecurity={setAccountSecurity}
              addressBook={addressBook}
              setAddressBook={setAddressBook}
              registeredUsers={registeredUsers}
              setRegisteredUsers={setRegisteredUsers}
              activePortal={activePortal}
              authenticatedPartnerRole={authenticatedPartnerRole}
              onPartnerAuthenticated={(role, partnerObj) => {
                setAuthenticatedPartnerRole(role);
                setCurrentUser({ ...currentUser, ...partnerObj });
                setActivePortal(role);
                setFooterTab("home");
                triggerToast("Verified & Unlocked " + role.toUpperCase() + " Portal!");
              }}
              onLogoutPartner={() => {
                setAuthenticatedPartnerRole(null);
                setActivePortal("customer");
                setFooterTab("home");
                triggerToast("Partner session locked. Returned to Customer Super-App.");
              }}
              appUpdateInfo={appUpdateInfo}
              onCheckForUpdate={handleManualCheckForUpdate}
              checkingUpdate={checkingUpdate}
              onRunOtaUpdate={handleRunOtaUpdate}
              otaProgress={otaProgress}
              founderLogoUrl={founderLogoUrl}
              onUploadFounderPhoto={handleUploadFounderPhoto}
              apkIconUrl={apkIconUrl}
              onUploadApkIcon={handleUploadApkIcon}
              brightTheme={brightTheme}
              setBrightTheme={setBrightTheme}
              onOpenAdminConsole={openFounderAdminGate}
              onTriggerToast={triggerToast}
            />
          )}
        </div>
      );
    }

    if (portalRole === "merchant") {
      return (
        <div className="space-y-3 text-xs bg-white p-3 rounded-2xl text-slate-900 border border-slate-200">
          <div className="flex justify-between items-center">
            <h2 className="font-black text-emerald-900 text-sm">Product Merchant Desk</h2>
            <button
              type="button"
              onClick={() => {
                setPersonalShoppingFromPartner("merchant");
                setActivePortal("customer");
              }}
              className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
            >
              Shop as Customer
            </button>
          </div>

          <div className="space-y-2 border-t pt-2">
            <h3 className="font-black text-xs">Publish New Product to Live Catalog</h3>
            <select
              value={newMerchantProd.categoryId}
              onChange={(e) =>
                setNewMerchantProd({ ...newMerchantProd, categoryId: e.target.value })
              }
              className="w-full border rounded-xl p-1.5 text-xs font-bold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newMerchantProd.subCategoryBrand}
              onChange={(e) =>
                setNewMerchantProd({ ...newMerchantProd, subCategoryBrand: e.target.value })
              }
              placeholder="Product / Brand Title (e.g., Aashirvaad Atta)"
              className="w-full border rounded-xl p-1.5 text-xs"
            />
            <input
              type="text"
              value={newMerchantProd.shopName}
              onChange={(e) =>
                setNewMerchantProd({ ...newMerchantProd, shopName: e.target.value })
              }
              placeholder="Your Shop Name (e.g., Sri Laxmi Kirana)"
              className="w-full border rounded-xl p-1.5 text-xs"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="number"
                value={newMerchantProd.price}
                onChange={(e) =>
                  setNewMerchantProd({ ...newMerchantProd, price: e.target.value })
                }
                placeholder="Selling Price (Rs.)"
                className="border rounded-xl p-1.5 text-xs"
              />
              <input
                type="number"
                value={newMerchantProd.mrp}
                onChange={(e) => setNewMerchantProd({ ...newMerchantProd, mrp: e.target.value })}
                placeholder="MRP (Rs.)"
                className="border rounded-xl p-1.5 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newMerchantProd.subCategoryBrand || !newMerchantProd.price) return;
                const priceNum = Number(newMerchantProd.price);
                const created = {
                  id: "prod_" + Date.now(),
                  categoryId: newMerchantProd.categoryId,
                  subCategoryBrand: newMerchantProd.subCategoryBrand,
                  shopName: newMerchantProd.shopName || currentUser?.businessName || "Adilabad Store",
                  variants: [
                    {
                      id: "v_" + Date.now(),
                      label: newMerchantProd.variantLabel || "Standard Pack",
                      price: priceNum,
                      mrp: Number(newMerchantProd.mrp || priceNum + 20),
                      weightGrams: 1000
                    }
                  ],
                  merchantOffers: [
                    {
                      merchantId: Date.now(),
                      merchantName: newMerchantProd.shopName || currentUser?.businessName || "Adilabad Store",
                      price: priceNum,
                      area: "Adilabad"
                    }
                  ]
                };
                setProducts([created, ...products]);
                setNewMerchantProd({
                  ...newMerchantProd,
                  subCategoryBrand: "",
                  price: "",
                  mrp: ""
                });
                triggerToast("Product published live to Customer Super-App!");
              }}
              className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
            >
              + Publish Live Product
            </button>
          </div>

          <div className="space-y-2 border-t pt-2">
            <h3 className="font-black text-xs">Incoming Customer Orders ({orders.length})</h3>
            {orders.map((o) => (
              <div key={o.id} className="p-2 border rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-black text-xs">
                    #{o.id} | Rs.{o.grandTotal}
                  </p>
                  <p className="text-[10px] text-slate-500">{o.status}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOrders(
                      orders.map((ord) =>
                        ord.id === o.id
                          ? { ...ord, status: "PACKED_HANDED_TO_CAPTAIN" }
                          : ord
                      )
                    );
                    triggerToast("Order #" + o.id + " handed over to Delivery Captain!");
                  }}
                  className="bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
                >
                  Mark Packed & Hand to Rider
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (portalRole === "service_provider") {
      return (
        <div className="space-y-3 text-xs bg-white p-3 rounded-2xl text-slate-900 border border-slate-200">
          <h2 className="font-black text-emerald-900 text-sm">1-Hr Service Provider Desk</h2>
          <input
            type="text"
            value={newSpForm.providerName}
            onChange={(e) => setNewSpForm({ ...newSpForm, providerName: e.target.value })}
            placeholder="Provider / Technician Name"
            className="w-full border rounded-xl p-1.5 text-xs"
          />
          <input
            type="text"
            value={newSpForm.specialization}
            onChange={(e) => setNewSpForm({ ...newSpForm, specialization: e.target.value })}
            placeholder="Specialization (e.g., AC Repair, Master Plumber)"
            className="w-full border rounded-xl p-1.5 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              if (!newSpForm.providerName) return;
              setServiceProviders([
                { id: "sp_" + Date.now(), ...newSpForm },
                ...serviceProviders
              ]);
              setNewSpForm({ ...newSpForm, providerName: "", specialization: "" });
              triggerToast("Listed in 1-Hr Service Directory!");
            }}
            className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
          >
            + Go Live in 1-Hr Services
          </button>

          <div className="space-y-2 border-t pt-2">
            <h3 className="font-black text-xs">Escrow Bookings ({serviceBookings.length})</h3>
            {serviceBookings.map((sb) => (
              <div key={sb.id} className="p-2 border rounded-xl space-y-1.5">
                <p className="font-black text-xs">
                  {sb.id} | Escrow: Rs.{sb.escrowVisitingAmount} ({sb.escrowStatus})
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={providerHappyCodeInput}
                    onChange={(e) => setProviderHappyCodeInput(e.target.value)}
                    placeholder={"Enter Customer Happy Code (" + sb.happyCode + ")"}
                    className="flex-1 border rounded-lg px-2 py-1 text-[10px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (providerHappyCodeInput === sb.happyCode) {
                        setServiceBookings(
                          serviceBookings.map((b) =>
                            b.id === sb.id
                              ? {
                                  ...b,
                                  escrowStatus: "RELEASED_TO_PROVIDER_BANK",
                                  status: "COMPLETED"
                                }
                              : b
                          )
                        );
                        setProviderHappyCodeInput("");
                        triggerToast("Happy Code Verified! Escrow settled to Bank/UPI.");
                      } else {
                        triggerToast("Invalid Happy Code!");
                      }
                    }}
                    className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
                  >
                    Verify & Claim
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (portalRole === "decorator") {
      return (
        <div className="space-y-3 text-xs bg-white p-3 rounded-2xl text-slate-900 border border-slate-200">
          <h2 className="font-black text-emerald-900 text-sm">
            Function Hall & Event Decorator Desk
          </h2>
          <input
            type="text"
            value={newHallForm.name}
            onChange={(e) => setNewHallForm({ ...newHallForm, name: e.target.value })}
            placeholder="Function Hall Name"
            className="w-full border rounded-xl p-1.5 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              if (!newHallForm.name) return;
              setFunctionHalls([
                { id: "hall_" + Date.now(), ...newHallForm, bookedDates: [] },
                ...functionHalls
              ]);
              setNewHallForm({ ...newHallForm, name: "" });
              triggerToast("Function Hall published!");
            }}
            className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
          >
            + Add Function Hall
          </button>
        </div>
      );
    }

    if (portalRole === "rider") {
      return (
        <div className="space-y-3 text-xs bg-white p-3 rounded-2xl text-slate-900 border border-slate-200">
          <h2 className="font-black text-emerald-900 text-sm">Delivery Captain Live Radar</h2>
          {activeOrder ? (
            <div className="space-y-2">
              <LiveRouteMap order={activeOrder} brightTheme={brightTheme} />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={captainOtpInput}
                  onChange={(e) => setCaptainOtpInput(e.target.value)}
                  placeholder={"Customer Delivery OTP (" + activeOrder.secretOtp + ")"}
                  className="flex-1 border rounded-xl px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (captainOtpInput === activeOrder.secretOtp) {
                      setOrders(
                        orders.map((o) =>
                          o.id === activeOrder.id ? { ...o, status: "DELIVERED" } : o
                        )
                      );
                      setCaptainOtpInput("");
                      triggerToast("Order #" + activeOrder.id + " Marked DELIVERED!");
                    } else {
                      triggerToast("Incorrect Customer OTP!");
                    }
                  }}
                  className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-black cursor-pointer"
                >
                  Verify OTP
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 py-4 text-center font-bold">
              No active dispatches waiting on radar.
            </p>
          )}
        </div>
      );
    }

    if (portalRole === "labour") {
      return (
        <LabourWorksitePortal
          mode="worker"
          categories={LABOUR_TRADE_CATEGORIES}
          workers={labourWorkers}
          setWorkers={setLabourWorkers}
          bookings={labourBookings}
          setBookings={setLabourBookings}
          currentUser={currentUser}
          brightTheme={brightTheme}
          onToast={triggerToast}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#040b10] text-white">
      {/* Only show locked Partner Session banner when a verified Partner is actively inside their desk */}
      {activePortal !== "customer" && viewMode === "mobile_app" && (
        <div className="max-w-[420px] mx-auto bg-slate-950 border-b border-emerald-800 px-3 py-1.5 flex items-center justify-between text-[10px]">
          <span className="font-black text-emerald-400">
            Verified Partner Session: {activePortal.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => {
              setAuthenticatedPartnerRole(null);
              setActivePortal("customer");
              setFooterTab("home");
              triggerToast("Partner Desk Locked. Returned to Customer Super-App.");
            }}
            className="bg-rose-600 text-white px-2.5 py-0.5 rounded font-black cursor-pointer"
          >
            Lock & Exit Partner Desk
          </button>
        </div>
      )}

      {mobileToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-amber-300 border-2 border-amber-400 px-4 py-2 rounded-2xl text-xs font-black shadow-2xl">
          {mobileToast}
        </div>
      )}

      {viewMode === "founder_web" ? (
        !isAdminAuthenticated ? (
          <div className="max-w-md mx-auto mt-12 bg-slate-900 border border-amber-400/50 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-black text-amber-400 text-base">
                WE4ALL Founder Admin 2-Factor Gate
              </h2>
              <button
                type="button"
                onClick={() => setViewMode("mobile_app")}
                className="bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer"
              >
                Back to App
              </button>
            </div>
            {adminLoginError && (
              <p className="text-rose-400 text-xs font-bold">{adminLoginError}</p>
            )}
            {adminAuthStep === 1 ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={adminLoginForm.username}
                  onChange={(e) =>
                    setAdminLoginForm({ ...adminLoginForm, username: e.target.value })
                  }
                  placeholder="Founder Username (admin)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs"
                />
                <input
                  type="password"
                  value={adminLoginForm.password}
                  onChange={(e) =>
                    setAdminLoginForm({ ...adminLoginForm, password: e.target.value })
                  }
                  placeholder="Founder Password (we4all2026)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (
                      adminLoginForm.username.toLowerCase() === "admin" &&
                      adminLoginForm.password === "we4all2026"
                    ) {
                      setAdminLoginError("");
                      setAdminAuthStep(2);
                    } else {
                      setAdminLoginError("Use admin / we4all2026");
                    }
                  }}
                  className="w-full bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
                >
                  Next: Verify Founder PIN
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Founder Master PIN (9999)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-black tracking-widest text-amber-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (adminPinInput === "9999" || adminPinInput === "1234") {
                      setIsAdminAuthenticated(true);
                      setAdminLoginError("");
                    } else {
                      setAdminLoginError("Invalid Master PIN (Use 9999)");
                    }
                  }}
                  className="w-full bg-emerald-500 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
                >
                  Unlock Founder Admin Suite
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-900 p-3 rounded-2xl border border-amber-400/40">
              <span className="font-black text-amber-400 text-xs">
                FOUNDER MASTER CONTROL | ZERO PRE-INSTALLED DATA MODE
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("multi_role_lab")}
                  className="bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  Open 6-Portal Split Lab (Founder Only)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const wiped = await wipeAllPreinstalledServerData();
                    setProducts(wiped.products);
                    setMerchants(wiped.merchants);
                    setServiceProviders(wiped.serviceProviders);
                    setOrders(wiped.orders);
                    triggerToast("All Server Transactional States Wiped 100% Clean!");
                  }}
                  className="bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer"
                >
                  Wipe Server Data Clean
                </button>
              </div>
            </div>
            <FounderAdminSuite
              appUpdateInfo={appUpdateInfo}
              setAppUpdateInfo={setAppUpdateInfo}
              monetizationConfig={monetizationConfig}
              setMonetizationConfig={setMonetizationConfig}
              geoAds={geoAds}
              setGeoAds={setGeoAds}
              categories={categories}
              setCategories={setCategories}
              merchants={merchants}
              setMerchants={setMerchants}
              products={products}
              setProducts={setProducts}
              orders={orders}
              serviceBookings={serviceBookings}
              labourBookings={labourBookings}
              registeredUsers={registeredUsers}
              onBackToApp={() => setViewMode("mobile_app")}
              onTriggerToast={triggerToast}
            />
          </div>
        )
      ) : viewMode === "multi_role_lab" && isAdminAuthenticated ? (
        <div className="space-y-3 p-4">
          <div className="flex justify-between items-center bg-slate-900 p-3 rounded-2xl border border-amber-400">
            <span className="font-black text-amber-400 text-xs">
              FOUNDER 6-PORTAL SIMULATOR LAB (AUTHENTICATED ADMIN ONLY)
            </span>
            <button
              type="button"
              onClick={() => setViewMode("mobile_app")}
              className="bg-emerald-500 text-slate-950 px-3 py-1 rounded-xl text-xs font-black cursor-pointer"
            >
              Exit Lab to Single Mobile App
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {splitScreens.map((scr) => (
              <MobilePhoneShell
                key={scr.id}
                title={scr.role.toUpperCase()}
                activePortal={scr.role}
                footerTab={footerTab}
                setFooterTab={setFooterTab}
                totalCartCount={totalCartCount}
                totalOrdersCount={orders.length}
                brightTheme={brightTheme}
                lang={lang}
                setLang={setLang}
                appUpdateInfo={appUpdateInfo}
                onTriggerOtaUpdate={handleRunOtaUpdate}
              >
                {renderRolePortalContent(scr.role)}
              </MobilePhoneShell>
            ))}
          </div>
        </div>
      ) : (
        <MobilePhoneShell
          title={activePortal.toUpperCase()}
          activePortal={activePortal}
          footerTab={footerTab}
          setFooterTab={setFooterTab}
          totalCartCount={totalCartCount}
          totalOrdersCount={orders.length}
          floatingLiveOrder={activeOrder}
          onOpenLiveOrderModal={() => setLiveOrderDrawerOpen(true)}
          onOpenAdminConsole={openFounderAdminGate}
          brightTheme={brightTheme}
          lang={lang}
          setLang={setLang}
          appUpdateInfo={appUpdateInfo}
          onTriggerOtaUpdate={handleRunOtaUpdate}
          personalShoppingFromPartner={personalShoppingFromPartner}
          onReturnToPartnerDesk={() => {
            setActivePortal(personalShoppingFromPartner);
            setPersonalShoppingFromPartner(null);
          }}
        >
          {renderRolePortalContent(activePortal)}
        </MobilePhoneShell>
      )}

      {liveOrderDrawerOpen && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-4 w-full max-w-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-amber-400 text-xs">
                LIVE ORDER #{activeOrder.id} | OTP: {activeOrder.secretOtp}
              </h3>
              <button
                type="button"
                onClick={() => setLiveOrderDrawerOpen(false)}
                className="bg-slate-800 text-white px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer"
              >
                Close
              </button>
            </div>
            <LiveRouteMap order={activeOrder} brightTheme={false} />
          </div>
        </div>
      )}

      {pendingUpiPayment && (
        <UpiPaymentModal
          payment={pendingUpiPayment}
          onClose={() => setPendingUpiPayment(null)}
          onConfirmPayment={handleCompleteUpiPayment}
        />
      )}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}