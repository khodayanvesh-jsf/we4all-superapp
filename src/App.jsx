import React, { useState, useEffect, useRef } from "react";
import { APP_VERSION, APP_BUILD_NUMBER } from "./appVersion.js";
import {
  INITIAL_APP_UPDATE_INFO,
  GEO_ZONES,
  INITIAL_GEO_ADS,
  INITIAL_CATEGORIES,
  CUSTOMER_QUICK_LINKS,
  mergeRequiredCategories,
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
import MerchantPortal from "./modules/MerchantPortal";
import ServiceProviderPortal from "./modules/ServiceProviderPortal";
import DecoratorPortal from "./modules/DecoratorPortal";
import RiderCaptainPortal from "./modules/RiderCaptainPortal";
import { canOpenPartnerPortal, isCustomerVisibleListing, calculateDecoratorAdvance } from "./modules/workflows/portalRules";
import LabourWorksitePortal from "./modules/LabourWorksitePortal";
import FounderAdminSuite from "./modules/FounderAdminSuite";
import AdminKycAndLabManager from "./modules/AdminKycAndLabManager";
import LiveRouteMap from "./modules/LiveRouteMap";
import {
  saveCloudAndLocalState,
  loadCloudAndLocalState,
  wipeAllPreinstalledServerData,
  subscribeToRealtimeUpdates,
  checkLiveCloudOtaManifest,
  performZeroLossOtaUpdate,
  createMarketplaceOrder,
  supabase,
  activateSupabaseAccount,
  clearActiveSupabaseAccount
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
      <div
        className={
          "px-3 py-1 flex items-center justify-between text-[9px] font-bold tracking-wide border-b shrink-0 " +
          (brightTheme
            ? "bg-emerald-50 text-emerald-950 border-emerald-100"
            : "bg-[#0a171d] text-emerald-200 border-slate-800")
        }
        aria-label="Installed application version"
        data-testid="installed-app-version"
      >
        <span>INSTALLED APP v{APP_VERSION} · BUILD {APP_BUILD_NUMBER}</span>
        <span className="truncate ml-2 opacity-80">
          OTA BUNDLE {appUpdateInfo?.currentBundleVersion || "BUILT-IN"}
        </span>
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

      {floatingLiveOrder && showFooter && !floatingLiveOrder.isServerManaged && (
        <div className="absolute bottom-14 left-3 right-3 z-30">
          <button
            type="button"
            onClick={onOpenLiveOrderModal}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-2.5 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center justify-between cursor-pointer"
          >
            <div className="text-left">
              <p className="text-[10px] font-black leading-tight">
                LIVE ORDER #{floatingLiveOrder.id}: {String(floatingLiveOrder?.status ?? "").replace(/_/g, " ")}
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
  const [globalFooterTab, setGlobalFooterTab] = useState("home");
  const footerTab = globalFooterTab;
  const setFooterTab = setGlobalFooterTab;

  const openPersonalShop = (partnerRole) => {
    const allowedPartnerRoles = ["merchant", "service_provider", "decorator", "rider", "labour"];
    if (!allowedPartnerRoles.includes(partnerRole) || authenticatedPartnerRole !== partnerRole) {
      triggerToast("Personal shopping could not verify the active partner session.");
      return;
    }
    setPersonalShoppingFromPartner(partnerRole);
    setActivePortal("customer");
    setFooterTab("home");
  };

  const returnToPartnerDesk = () => {
    const partnerRole = personalShoppingFromPartner;
    const allowedPartnerRoles = ["merchant", "service_provider", "decorator", "rider", "labour"];
    if (
      allowedPartnerRoles.includes(partnerRole) &&
      authenticatedPartnerRole === partnerRole &&
      currentUser?.authUserId &&
      currentUser?.role === partnerRole
    ) {
      setActivePortal(partnerRole);
    } else {
      setActivePortal("customer");
      setPersonalShoppingFromPartner(null);
      triggerToast("Partner session expired. You are staying in Customer mode.");
      return;
    }
    setPersonalShoppingFromPartner(null);
    setFooterTab("home");
  };

  const [appUpdateInfo, setAppUpdateInfo] = useState(
    savedCloud?.appUpdateInfo || INITIAL_APP_UPDATE_INFO
  );
  const [otaProgress, setOtaProgress] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleManualCheckForUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const latest = await checkLiveCloudOtaManifest((payload) => {
        if (payload?.appUpdateInfo) setAppUpdateInfo(payload.appUpdateInfo);
      });
      if (latest?.error) throw new Error(latest.error);
      triggerToast(latest?.updateAvailable
        ? "A Capgo update is available for this device."
        : latest?.nativeUpdaterRequired
          ? "OTA updates run inside the installed Android/iOS app."
          : "WE4ALL is up to date on its Capgo channel.");
    } catch (error) {
      triggerToast(error?.message || "Could not check the Capgo update channel.");
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleRunOtaUpdate = async () => {
    setOtaProgress({ pct: 5, msg: "Preparing Capgo signature-verified update..." });
    try {
      const updatedInfo = await performZeroLossOtaUpdate(
        appUpdateInfo.latestAvailableVersion,
        appUpdateInfo.releaseNotes,
        (stage) => setOtaProgress(stage),
        (info) => setAppUpdateInfo(info)
      );
      setOtaProgress(null);
      triggerToast("Update downloaded and queued. It will activate at the next safe app background/relaunch.");
    } catch (error) {
      setOtaProgress(null);
      triggerToast(error?.message || "OTA update failed. The current app bundle remains active.");
    }
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
      id: "guest_visitor",
      fullName: "Guest Visitor",
      phone: "",
      role: "customer",
      portal: "customer",
      isGuest: true,
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      upiId: ""
    }
  );
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const [registeredUsers, setRegisteredUsers] = useState(savedCloud?.registeredUsers || []);
  if (typeof window !== "undefined") { window.__WE4ALL_USERS = registeredUsers; }
  if (typeof window !== "undefined") { window.__WE4ALL_USERS = registeredUsers; }
  const [pendingUpiPayment, setPendingUpiPayment] = useState(null);
  const [mobileToast, setMobileToast] = useState("");

  const triggerToast = (msg) => {
    setMobileToast(msg);
    setTimeout(() => setMobileToast(""), 4200);
  };

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;

    const restoreVerifiedSession = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !user) {
        if (currentUserRef.current?.authUserId) {
          clearActiveSupabaseAccount();
          setAuthenticatedPartnerRole(null);
          setCurrentUser({
            id: "guest_visitor",
            fullName: "Guest Visitor",
            phone: "",
            role: "customer",
            portal: "customer",
            isGuest: true
          });
          setActivePortal("customer");
          window.setTimeout(() => window.location.reload(), 0);
        }
        return;
      }

      const activation = await activateSupabaseAccount(user.id);
      if (!active) return;
      if (!activation.ok) throw new Error(activation.reason || "Supabase account restore failed.");
      if (activation.changed) {
        // The activation step replaced any prior user's local snapshot with this user's private cloud snapshot.
        window.location.reload();
        return;
      }

      const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
        supabase.from("we4all_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("we4all_user_roles").select("role,status").eq("user_id", user.id)
      ]);
      if (profileError) throw profileError;
      if (rolesError) throw rolesError;

      const currentSnapshot = currentUserRef.current;
      const preferredRole = currentSnapshot?.authUserId === user.id ? currentSnapshot.role : "customer";
      const roleRecord = (roles || []).find((item) => item.role === preferredRole && item.status === "approved");
      const resolvedRole = roleRecord?.role || "customer";
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
      setCurrentUser(signedInUser);
      if (resolvedRole === "customer") {
        setAuthenticatedPartnerRole(null);
        setActivePortal("customer");
      } else {
        setAuthenticatedPartnerRole(resolvedRole);
        setActivePortal(resolvedRole);
      }
    };

    restoreVerifiedSession().catch((error) => {
      console.warn("WE4ALL Supabase session restore failed:", error?.message || error);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // The Account flow verifies OTP and activates the user cache before setting app state.
      if (event === "SIGNED_OUT") {
        clearActiveSupabaseAccount();
        setAuthenticatedPartnerRole(null);
        setActivePortal("customer");
        setCurrentUser({
          id: "guest_visitor",
          fullName: "Guest Visitor",
          phone: "",
          role: "customer",
          portal: "customer",
          isGuest: true
        });
        window.setTimeout(() => window.location.reload(), 0);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);


  const [selectedZoneFilter, setSelectedZoneFilter] = useState("ALL_INDIA");
  const [killedCategoriesByZone] = useState({});
  const [geoAds, setGeoAds] = useState(savedCloud?.geoAds || INITIAL_GEO_ADS);
  const [categories, setCategories] = useState(() =>
    mergeRequiredCategories(INITIAL_CATEGORIES, savedCloud?.categories)
  );
  const [merchants, setMerchants] = useState(savedCloud?.merchants || INITIAL_MERCHANTS);
  const [serviceProviders, setServiceProviders] = useState(
    savedCloud?.serviceProviders || INITIAL_SERVICE_PROVIDERS
  );
  const [decorators, setDecorators] = useState(savedCloud?.decorators || INITIAL_DECORATORS);
  const [labourWorkers, setLabourWorkers] = useState(
    savedCloud?.labourWorkers || INITIAL_LABOUR_WORKERS
  );
  const [products, setProducts] = useState(savedCloud?.products || INITIAL_PRODUCTS);
  const [functionHalls, setFunctionHalls] = useState(
    savedCloud?.functionHalls || INITIAL_FUNCTION_HALLS
  );
  const [riders, setRiders] = useState(savedCloud?.riders || INITIAL_RIDERS);

  const [pendingMerchants, setPendingMerchants] = useState(savedCloud?.pendingMerchants || []);
  const [pendingSubCategories, setPendingSubCategories] = useState(savedCloud?.pendingSubCategories || []);
  const [rejectedItems, setRejectedItems] = useState(savedCloud?.rejectedItems || []);
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

  const [globalCustomerSubTab, setGlobalCustomerSubTab] = useState("stores");
  const customerHomeSubTab = globalCustomerSubTab;
  const setCustomerHomeSubTab = setGlobalCustomerSubTab;
  const [selectedCategory, setSelectedCategory] = useState("daily_needs");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVariantMap, setSelectedVariantMap] = useState({});
  const [selectedMerchantByProduct, setSelectedMerchantByProduct] = useState({});
  const [expandedCompareProdId, setExpandedCompareProdId] = useState(null);

  const [serviceFilterDate, setServiceFilterDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [serviceFilterSlot, setServiceFilterSlot] = useState("10:00 AM - 11:00 AM");

  const [merchantCart, setMerchantCart] = useState(savedCloud?.merchantCart || []);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const checkoutAttemptRef = useRef(null);
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
  const [decorBids, setDecorBids] = useState(savedCloud?.decorBids || []);
  const [captainRadarJobs, setCaptainRadarJobs] = useState(savedCloud?.captainRadarJobs || []);
  const [pendingServiceProviders, setPendingServiceProviders] = useState(savedCloud?.pendingServiceProviders || []);
  const [pendingDecorators, setPendingDecorators] = useState(savedCloud?.pendingDecorators || []);
  const [pendingRiders, setPendingRiders] = useState(savedCloud?.pendingRiders || []);


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
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
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
      labourBookings,
      decorBids,
      captainRadarJobs,
      pendingServiceProviders,
      pendingDecorators,
      pendingRiders
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
    labourBookings,
    decorBids,
    captainRadarJobs,
    pendingServiceProviders,
    pendingDecorators,
    pendingRiders
  ]);

  useEffect(() => {
    return subscribeToRealtimeUpdates((remoteState) => {
      if (remoteState.orders) setOrders(remoteState.orders);
      if (remoteState.serviceBookings) setServiceBookings(remoteState.serviceBookings);
      if (remoteState.labourBookings) setLabourBookings(remoteState.labourBookings);
      if (remoteState.decorBids) setDecorBids(remoteState.decorBids);
      if (remoteState.captainRadarJobs) setCaptainRadarJobs(remoteState.captainRadarJobs);
      if (remoteState.pendingServiceProviders) setPendingServiceProviders(remoteState.pendingServiceProviders);
      if (remoteState.pendingDecorators) setPendingDecorators(remoteState.pendingDecorators);
      if (remoteState.pendingRiders) setPendingRiders(remoteState.pendingRiders);
      if (remoteState.decorators) setDecorators(remoteState.decorators);
      if (remoteState.riders) setRiders(remoteState.riders);
      if (remoteState.pendingMerchants) setPendingMerchants(remoteState.pendingMerchants);
      if (remoteState.pendingSubCategories) setPendingSubCategories(remoteState.pendingSubCategories);
      if (remoteState.rejectedItems) setRejectedItems(remoteState.rejectedItems);
      if (remoteState.products) setProducts(remoteState.products);
      if (remoteState.appUpdateInfo) setAppUpdateInfo(remoteState.appUpdateInfo);
    });
  }, []);
  const totalCartCount =
    merchantCart.reduce((s, i) => s + i.qty, 0) +
    (serviceCart || []).length +
    (decorCart || []).length +
    (taxiCart || []).length;

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
      product.merchantOffers && (product.merchantOffers || []).length > 0
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
            catalogItemId: activeOffer.catalogItemId || product.catalogItemId || product.id,
            partnerId: activeOffer.partnerId || product.partnerId || "",
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

  const handlePlaceOrderForCheckout = async () => {
    if (checkoutSubmitting || (merchantCart || []).length === 0) return;
    if (!currentUser?.authUserId || currentUser?.isGuest) {
      setFooterTab("account");
      triggerToast("Sign in to a WE4ALL customer account before placing a server order.");
      return;
    }

    const catalogIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const partnerIds = [...new Set(merchantCart.map((item) => String(item.partnerId || "")))];
    if (
      merchantCart.some((item) => !catalogIdPattern.test(String(item.catalogItemId || item.productId || "")) ||
        !Number.isInteger(Number(item.qty)) || Number(item.qty) < 1 || Number(item.qty) > 100) ||
      partnerIds.length !== 1 || !catalogIdPattern.test(partnerIds[0])
    ) {
      triggerToast("This cart contains items that are not linked to one approved live merchant catalogue. No order was placed.");
      return;
    }

    const checkoutFingerprint = JSON.stringify(merchantCart.map((item) => ({
      catalogItemId: String(item.catalogItemId || item.productId),
      partnerId: String(item.partnerId),
      quantity: Number(item.qty)
    })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
    const attemptStorageKey = `we4all_checkout_attempt_${currentUser.authUserId}`;
    let attempt = checkoutAttemptRef.current;
    if (!attempt || attempt.fingerprint !== checkoutFingerprint || attempt.userId !== currentUser.authUserId) {
      try {
        const savedAttempt = JSON.parse(sessionStorage.getItem(attemptStorageKey) || "null");
        attempt = savedAttempt?.fingerprint === checkoutFingerprint &&
          savedAttempt?.userId === currentUser.authUserId &&
          typeof savedAttempt?.idempotencyKey === "string" &&
          savedAttempt.idempotencyKey.length >= 8 &&
          savedAttempt.idempotencyKey.length <= 160
          ? savedAttempt
          : null;
      } catch {
        attempt = null;
      }
      if (!attempt) {
        const idempotencyKey = globalThis.crypto?.randomUUID?.();
        if (!idempotencyKey) {
          triggerToast("Secure checkout identifiers are unavailable on this device. Your cart was not submitted.");
          return;
        }
        attempt = {
          fingerprint: checkoutFingerprint,
          userId: currentUser.authUserId,
          idempotencyKey
        };
      }
      checkoutAttemptRef.current = attempt;
      try { sessionStorage.setItem(attemptStorageKey, JSON.stringify(attempt)); } catch {}
    }

    setCheckoutSubmitting(true);
    try {
      const created = await createMarketplaceOrder({
        partnerId: partnerIds[0],
        items: merchantCart.map((item) => ({
          catalogItemId: String(item.catalogItemId || item.productId),
          quantity: Number(item.qty)
        })),
        zoneId: activeAddressObj.zoneId || "adilabad_master",
        deliveryAddress: {
          label: activeAddressObj.label || "Primary",
          fullAddress: activeAddressObj.fullAddress || "",
          area: activeAddressObj.area || ""
        },
        idempotencyKey: attempt.idempotencyKey
      });
      const placedAt = new Date().toISOString();
      const serverOrder = {
        id: created.order_number || created.order_id,
        serverOrderId: created.order_id,
        isServerManaged: true,
        customerId: currentUser.authUserId,
        customerName: currentUser.fullName || "Customer",
        partnerId: partnerIds[0],
        shopName: merchantCart[0]?.merchantName || "WE4ALL Merchant",
        address: activeAddressObj.fullAddress || "Address on order",
        items: merchantCart,
        itemsTotal: Number(created.subtotal_inr || created.total_inr || 0),
        deliveryFee: Number(created.delivery_fee_inr || 0),
        gst: Number(created.tax_inr || 0),
        grandTotal: Number(created.total_inr || 0),
        status: created.status || "awaiting_payment",
        paymentStatus: String(created.payment_status || "pending").toUpperCase(),
        createdAt: placedAt,
        dateStr: placedAt.slice(0, 10),
        periodTag: "TODAY"
      };
      setOrders((currentOrders) => [serverOrder, ...(currentOrders || []).filter((order) => order.serverOrderId !== created.order_id)]);
      setActiveOrderId(serverOrder.id);
      setMerchantCart([]);
      checkoutAttemptRef.current = null;
      try { sessionStorage.removeItem(attemptStorageKey); } catch {}
      setFooterTab("orders");
      triggerToast("Order created on the WE4ALL server. Merchant confirmation and payment status will appear in Orders.");
    } catch (error) {
      triggerToast(error?.message || "Server checkout failed. Your cart was kept; retrying will reuse the same order request.");
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const renderRolePortalContent = (portalRole) => {
    // STRICT RBAC LOCK: Block any non-customer portal unless authenticated for that exact role (or in Founder Split Lab)
    if (
      portalRole !== "customer" &&
      !canOpenPartnerPortal({ authenticatedPartnerRole, user: currentUser }, portalRole)
    ) {
      return (
        <div className="p-4 bg-white text-slate-900 rounded-2xl border border-rose-300 space-y-3 text-xs text-center shadow">
          <p className="font-black text-rose-700 text-sm">Partner Portal Locked</p>
          <p className="text-[11px] text-slate-600">
            Access to the {portalRole.toUpperCase()} desk requires a server-authenticated account, approved partner status and a verified session. Local PINs do not unlock partner portals.
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
        if (!isCustomerVisibleListing(p)) return false;
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

              <div className="grid grid-cols-5 gap-1.5" aria-label="WE4ALL ten-category quick access">
                {CUSTOMER_QUICK_LINKS
                  .filter((link) =>
                    !link.categoryId ||
                    visibleCategories.some((category) => category.id === link.categoryId)
                  )
                  .map((link) => (
                    <button
                      key={link.id}
                      type="button"
                      aria-label={link.label}
                      onClick={() => {
                        setCustomerHomeSubTab(link.tab);
                        if (link.categoryId) setSelectedCategory(link.categoryId);
                      }}
                      className="min-h-[68px] rounded-xl border border-emerald-700/50 bg-slate-900 px-1 py-2 text-white flex flex-col items-center justify-center gap-1 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <span className="text-lg leading-none">{link.icon}</span>
                      <span className="text-[9px] font-bold leading-tight text-center">{link.label}</span>
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
                        {cat.icon} {translateCategoryName(cat, lang)}
                      </button>
                    ))}
                  </div>

                  {(filteredProducts || []).length === 0 ? (
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

                            {(offers || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCompareProdId(
                                    expandedCompareProdId === prod.id ? null : prod.id
                                  )
                                }
                                className="text-[9px] font-black text-indigo-700 underline cursor-pointer"
                              >
                                Compare {(offers || []).length} Shops
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

                  {(serviceProviders || []).filter((provider) => provider.status === "Approved" && provider.isPublished !== false).length === 0 ? (
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
                    serviceProviders.filter((provider) => provider.status === "Approved" && provider.isPublished !== false).map((sp) => {
                      const slotIsAvailable =
                        Array.isArray(sp.availableSlots) &&
                        sp.availableSlots.includes(serviceFilterSlot) &&
                        !(serviceBookings || []).some((booking) =>
                          booking.providerId === sp.id &&
                          booking.bookedDate === serviceFilterDate &&
                          booking.bookedSlot === serviceFilterSlot &&
                          !["CANCELLED", "REJECTED", "COMPLETED"].includes(booking.status)
                        );
                      return (
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
                          disabled={!slotIsAvailable}
                          onClick={() => {
                            setServiceCart([
                              ...serviceCart,
                              {
                                ...sp,
                                providerId: sp.id,
                                bookingDate: serviceFilterDate,
                                bookingSlot: serviceFilterSlot
                              }
                            ]);
                            triggerToast("Added an available provider slot to the service cart. It is not booked or paid yet.");
                          }}
                          className="bg-amber-400 disabled:bg-slate-300 text-slate-950 px-3 py-1.5 rounded-xl text-[10px] font-black cursor-pointer"
                        >
                          {slotIsAvailable ? "Add available slot" : "Slot unavailable"}
                        </button>
                      </div>
                    )})
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
                  {functionHalls.filter((hall) => hall.status === "Approved" && hall.isPublished !== false).map((hall) => {
                    const advance = calculateDecoratorAdvance(hall.pricePerDay || hall.dailyRent, eventDate);
                    const isBooked = (hall.bookedDates || []).some((entry) => (typeof entry === "string" ? entry : entry.date) === eventDate);
                    return (
                      <div
                        key={hall.id}
                        className="p-3 rounded-2xl border border-slate-200 bg-white text-slate-900 flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-black text-xs">{hall.name}</h4>
                          <p className="text-[10px] text-slate-600">
                            {hall.capacity} | Rs.{hall.pricePerDay || hall.dailyRent}/day
                          </p>
                          <p className="text-[10px] text-amber-700 font-bold">
                            Required advance: {advance ? `${Math.round(advance.rate * 100)}% · ₹${advance.amount.toLocaleString("en-IN")}` : "Date unavailable"}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isBooked}
                          onClick={() => {
                            setDecorCart([
                              ...decorCart,
                              {
                                id: hall.id,
                                title: hall.name,
                                eventDate,
                                price: Number(hall.pricePerDay || hall.dailyRent || 0),
                                advanceRate: advance?.rate ?? null,
                                advanceAmount: advance?.amount ?? null,
                                hallStatus: hall.status || "Approved"
                              }
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
                  { id: "merchant_cart", label: "Stores (" + (merchantCart || []).length + ")" },
                  { id: "service_cart", label: "1-Hr (" + (serviceCart || []).length + ")" },
                  { id: "decor_cart", label: "Events (" + (decorCart || []).length + ")" },
                  { id: "taxi_cart", label: "Rides (" + (taxiCart || []).length + ")" }
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
                  {(merchantCart || []).length === 0 ? (
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
                        disabled={checkoutSubmitting}
                        onClick={handlePlaceOrderForCheckout}
                        className="w-full bg-emerald-600 disabled:bg-slate-400 text-white font-black py-2.5 rounded-xl cursor-pointer"
                      >
                        {checkoutSubmitting ? "Creating secure order…" : "Place Secure Order"}
                      </button>
                    </>
                  )}
                </div>
              )}

              {activeCartViewTab === "service_cart" && (
                <div className="space-y-2">
                  {(serviceCart || []).length === 0 ? (
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
                          if (!currentUser || currentUser.isGuest || !currentUser.authUserId) {
                            triggerToast("Secure customer sign-in is required before requesting a service booking. Your cart is unchanged.");
                            setFooterTab("account");
                            return;
                          }
                          const total = serviceCart.reduce((sum, item) => sum + Number(item.visitingFee || 0), 0);
                          if (!Number.isFinite(total) || total <= 0) {
                            triggerToast("The service cart has an invalid visiting-fee total.");
                            return;
                          }
                          const grouped = new Map();
                          for (const item of serviceCart) {
                            const providerId = item.providerId || item.id || item.providerName;
                            if (!providerId) continue;
                            const current = grouped.get(providerId) || [];
                            current.push(item);
                            grouped.set(providerId, current);
                          }
                          if (!grouped.size) {
                            triggerToast("The service cart does not contain a provider identity. No booking request was created.");
                            return;
                          }
                          const pendingBookings = [];
                          for (const [providerId, items] of grouped.entries()) {
                            const bookingKey = JSON.stringify(
                              items.map((item) => ({
                                providerId,
                                providerName: item.providerName || "",
                                bookingDate: item.bookingDate || serviceFilterDate,
                                bookingSlot: item.bookingSlot || "",
                                visitingFee: Number(item.visitingFee || 0)
                              })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
                            );
                            const existing = (serviceBookings || []).find((booking) =>
                              booking.customerId === currentUser.id &&
                              booking.bookingKey === bookingKey &&
                              ["AWAITING_VERIFIED_PAYMENT", "PAYMENT_SETUP_REQUIRED"].includes(booking.status)
                            );
                            pendingBookings.push(existing || {
                              id: "SRV-" + (globalThis.crypto?.randomUUID?.() || Date.now() + "-" + providerId),
                              bookingKey,
                              customerId: currentUser.id,
                              customerName: currentUser.fullName || currentUser.name || "Customer",
                              bookingItems: items,
                              providerId,
                              providerName: items[0]?.providerName || "Service provider",
                              bookedDate: items[0]?.bookingDate || serviceFilterDate,
                              bookedSlot: items.map((item) => item.bookingSlot).join(", "),
                              visitingFee: items.reduce((sum, item) => sum + Number(item.visitingFee || 0), 0),
                              escrowVisitingAmount: items.reduce((sum, item) => sum + Number(item.visitingFee || 0), 0),
                              escrowStatus: "NOT_FUNDED",
                              paymentStatus: "PENDING",
                              happyCodeStatus: "NOT_ISSUED",
                              status: "AWAITING_VERIFIED_PAYMENT",
                              createdAt: new Date().toISOString()
                            });
                          }
                          const knownIds = new Set((serviceBookings || []).map((booking) => booking.id));
                          const newBookings = pendingBookings.filter((booking) => !knownIds.has(booking.id));
                          if (newBookings.length) setServiceBookings([...newBookings, ...(serviceBookings || [])]);
                          setPendingUpiPayment({
                            type: "SERVICE_ESCROW",
                            orderId: pendingBookings.map((booking) => booking.id).join(","),
                            title: "Service visiting-fee payment",
                            amount: total
                          });
                        }}
                        className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                      >
                        Continue to secure visiting-fee payment
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
                  {(decorCart || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser || currentUser.isGuest || !currentUser.authUserId) {
                          triggerToast("Secure customer sign-in is required before sending an event request. Your cart is unchanged.");
                          setFooterTab("account");
                          return;
                        }
                        const total = decorCart.reduce((sum, item) => sum + Number(item.price || 0), 0);
                        const advanceTotal = decorCart.reduce((sum, item) => sum + Number(item.advanceAmount || 0), 0);
                        if (!decorCart.length || !Number.isFinite(total) || total <= 0 || !Number.isFinite(advanceTotal)) {
                          triggerToast("The event cart has invalid hall/package pricing.");
                          return;
                        }
                        const requestKey = JSON.stringify({
                          customerId: currentUser.id,
                          events: decorCart.map((item) => ({
                            hallId: item.id,
                            eventDate: item.eventDate,
                            amount: Number(item.price || 0),
                            advanceAmount: Number(item.advanceAmount || 0)
                          }))
                        });
                        const existing = (decorBids || []).find((request) =>
                          request.recordType === "DECOR_REQUEST" &&
                          request.requestKey === requestKey &&
                          request.status === "PENDING_FOUNDER_AVAILABILITY_REVIEW"
                        );
                        if (existing) {
                          triggerToast("This event request is already awaiting founder availability review.");
                          return;
                        }
                        const request = {
                          id: "DEC-" + (globalThis.crypto?.randomUUID?.() || Date.now()),
                          recordType: "DECOR_REQUEST",
                          requestKey,
                          customerId: currentUser.id,
                          customerName: currentUser.fullName || currentUser.name || "Customer",
                          title: decorCart.map((item) => item.title).join(", "),
                          events: decorCart,
                          eventDate: decorCart[0]?.eventDate || eventDate,
                          amount: total,
                          requestedAdvanceAmount: advanceTotal,
                          status: "PENDING_FOUNDER_AVAILABILITY_REVIEW",
                          paymentStatus: "NOT_PAID",
                          escrowStatus: "NOT_FUNDED",
                          createdAt: new Date().toISOString()
                        };
                        setDecorBids([request, ...(decorBids || [])]);
                        triggerToast("Event request saved pending Founder availability review. The hall is not reserved and no payment has been taken.");
                      }}
                      className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
                    >
                      Check booking requirements
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
                  {(taxiCart || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerToast("Ride request has not been dispatched. Live captain allocation and fare confirmation are not yet connected. Your ride cart is unchanged.");
                      }}
                      className="w-full bg-emerald-600 text-white font-black py-2 rounded-xl cursor-pointer"
                    >
                      Request ride (dispatch pending)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {footerTab === "orders" && (
            <OrdersHistoryAndInvoice
              orders={orders || []}
              setOrders={setOrders}
              serviceBookings={serviceBookings || []}
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
              registeredUsers={registeredUsers || []}
              setRegisteredUsers={setRegisteredUsers}
              activePortal={activePortal}
              authenticatedPartnerRole={authenticatedPartnerRole}
              onPartnerAuthenticated={(role, partnerObj) => {
                const allowedRoles = ["merchant", "service_provider", "decorator", "rider", "labour"];
                if (
                  !allowedRoles.includes(role) ||
                  partnerObj?.role !== role ||
                  partnerObj?.status !== "Approved" ||
                  !partnerObj?.authUserId
                ) {
                  setAuthenticatedPartnerRole(null);
                  triggerToast("Partner access denied: server identity, approved role and authenticated session are required.");
                  return;
                }
                setAuthenticatedPartnerRole(role);
                setCurrentUser({ ...currentUser, ...partnerObj });
                setActivePortal(role);
                setFooterTab("home");
                triggerToast("Server-authenticated " + role.toUpperCase() + " portal session opened.");
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

    const renderPartnerAccountTab = () => (
      <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3">
        <h3 className="font-black text-emerald-300">Partner Account</h3>
        <p className="text-xs">Signed-in role: {portalRole}</p>
        <p className="text-xs text-slate-400">{currentUser?.fullName || currentUser?.businessName || "Partner"}</p>
        <button
          type="button"
          onClick={() => {
            setAuthenticatedPartnerRole(null);
            setCurrentUser({ ...currentUser, isGuest: true });
            setActivePortal("customer");
            setFooterTab("home");
            triggerToast("Partner session ended. Returned to Customer Super-App.");
          }}
          className="w-full bg-rose-600 text-white font-black py-2 rounded-xl"
        >
          Lock & Exit Partner Portal
        </button>
      </div>
    );

    if (portalRole === "merchant") {
      return (
        <MerchantPortal
          footerTab={footerTab}
          setFooterTab={setFooterTab}
          currentUser={currentUser}
          categories={categories}
          products={products}
          setProducts={setProducts}
          pendingSubCategories={pendingSubCategories}
          setPendingSubCategories={setPendingSubCategories}
          rejectedItems={rejectedItems}
          orders={orders}
          setOrders={setOrders}
          onSwitchToPersonalShop={() => openPersonalShop("merchant")}
          onTriggerToast={triggerToast}
          renderAccountTab={renderPartnerAccountTab}
        />
      );
    }

    if (portalRole === "service_provider") {
      return (
        <ServiceProviderPortal
          footerTab={footerTab}
          setFooterTab={setFooterTab}
          currentUser={currentUser}
          serviceCategories={SERVICE_CATEGORIES}
          serviceProviders={serviceProviders}
          setServiceProviders={setServiceProviders}
          pendingServiceProviders={pendingServiceProviders}
          serviceBookings={serviceBookings}
          setServiceBookings={setServiceBookings}
          onSwitchToPersonalShop={() => openPersonalShop("service_provider")}
          onTriggerToast={triggerToast}
          renderAccountTab={renderPartnerAccountTab}
        />
      );
    }

    if (portalRole === "decorator") {
      return (
        <DecoratorPortal
          footerTab={footerTab}
          setFooterTab={setFooterTab}
          currentUser={currentUser}
          functionHalls={functionHalls}
          setFunctionHalls={setFunctionHalls}
          decorators={decorators}
          setDecorators={setDecorators}
          decorBids={decorBids}
          setDecorBids={setDecorBids}
          onSwitchToPersonalShop={() => openPersonalShop("decorator")}
          onTriggerToast={triggerToast}
          renderAccountTab={renderPartnerAccountTab}
        />
      );
    }

    if (portalRole === "rider") {
      return (
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
          onSwitchToPersonalShop={() => openPersonalShop("rider")}
          onTriggerToast={triggerToast}
          onReportError={(title, detail) => triggerToast(title + ": " + detail)}
          renderAccountTab={renderPartnerAccountTab}
        />
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
                  placeholder="Founder username (server authentication required)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs"
                />
                <input
                  type="password"
                  value={adminLoginForm.password}
                  onChange={(e) =>
                    setAdminLoginForm({ ...adminLoginForm, password: e.target.value })
                  }
                  placeholder="Founder password (server authentication required)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminAuthenticated(false);
                    setAdminAuthStep(1);
                    setAdminLoginError(
                      "Founder login is disabled until server-side founder authentication and step-up verification are configured. No browser-stored fallback credentials are accepted."
                    );
                  }}
                  className="w-full bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
                >
                  Founder authentication unavailable
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  placeholder="Founder PIN (server verification required)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center font-black tracking-widest text-amber-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminAuthenticated(false);
                    setAdminLoginError(
                      "Founder PIN verification is unavailable until a server-validated founder session is implemented."
                    );
                  }}
                  className="w-full bg-emerald-500 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
                >
                  Server verification required
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
              serviceProviders={serviceProviders}
              setServiceProviders={setServiceProviders}
              decorators={decorators}
              setDecorators={setDecorators}
              riders={riders}
              setRiders={setRiders}
              labourWorkers={labourWorkers}
              setLabourWorkers={setLabourWorkers}
              products={products}
              setProducts={setProducts}
              functionHalls={functionHalls}
              setFunctionHalls={setFunctionHalls}
              orders={orders || []}
              setOrders={setOrders}
              serviceBookings={serviceBookings || []}
              setServiceBookings={setServiceBookings}
              labourBookings={labourBookings || []}
              setLabourBookings={setLabourBookings}
              captainRadarJobs={captainRadarJobs}
              decorBids={decorBids}
              setDecorBids={setDecorBids}
              pendingMerchants={pendingMerchants}
              setPendingMerchants={setPendingMerchants}
              pendingServiceProviders={pendingServiceProviders}
              setPendingServiceProviders={setPendingServiceProviders}
              pendingDecorators={pendingDecorators}
              setPendingDecorators={setPendingDecorators}
              pendingRiders={pendingRiders}
              setPendingRiders={setPendingRiders}
              pendingSubCategories={pendingSubCategories}
              setPendingSubCategories={setPendingSubCategories}
              rejectedItems={rejectedItems}
              setRejectedItems={setRejectedItems}
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
                totalOrdersCount={(orders || []).length}
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
          totalOrdersCount={(orders || []).length}
          floatingLiveOrder={activeOrder}
          onOpenLiveOrderModal={() => setLiveOrderDrawerOpen(true)}
          onOpenAdminConsole={openFounderAdminGate}
          brightTheme={brightTheme}
          lang={lang}
          setLang={setLang}
          appUpdateInfo={appUpdateInfo}
          onTriggerOtaUpdate={handleRunOtaUpdate}
          personalShoppingFromPartner={personalShoppingFromPartner}
          onReturnToPartnerDesk={returnToPartnerDesk}
        >
          {renderRolePortalContent(activePortal)}
        </MobilePhoneShell>
      )}

      {liveOrderDrawerOpen && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-4 w-full max-w-md space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-amber-400 text-xs">
                LIVE ORDER #{activeOrder.id} | Delivery verification pending
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
          paymentRequest={pendingUpiPayment}
          onClose={() => setPendingUpiPayment(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
