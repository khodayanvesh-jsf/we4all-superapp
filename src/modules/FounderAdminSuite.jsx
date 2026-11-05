import React, { useState } from "react";
import { REJECTION_REASONS, GEO_ZONES } from "../data";
import {
  getFounderCredentials,
  saveFounderCredentials,
  getServerConfig,
  saveServerConfig,
  saveCloudAndLocalState,
  pullRemoteSupabaseState
} from "../supabaseClient";

export default function FounderAdminSuite({
  founderLogoUrl,
  onUploadFounderPhoto,
  geoZones = GEO_ZONES,
  selectedZoneFilter = "ALL_INDIA",
  setSelectedZoneFilter = () => {},
  killedCategoriesByZone = {},
  setKilledCategoriesByZone = () => {},
  geoAds = [],
  setGeoAds = () => {},
  categories = [],
  setCategories = () => {},
  categoryCarts = {},
  setCategoryCarts = () => {},
  merchants = [],
  setMerchants = () => {},
  serviceProviders = [],
  setServiceProviders = () => {},
  decorators = [],
  setDecorators = () => {},
  riders = [],
  setRiders = () => {},
  registeredUsers = [],
  setRegisteredUsers = () => {},
  products = [],
  setProducts = () => {},
  functionHalls = [],
  setFunctionHalls = () => {},
  orders = [],
  setOrders = () => {},
  serviceBookings = [],
  setServiceBookings = () => {},
  captainRadarJobs = [],
  decorPortfolio = [],
  setDecorPortfolio = () => {},
  pendingMerchants = [],
  setPendingMerchants = () => {},
  pendingServiceProviders = [],
  setPendingServiceProviders = () => {},
  pendingDecorators = [],
  setPendingDecorators = () => {},
  pendingRiders = [],
  setPendingRiders = () => {},
  pendingSubCategories = [],
  setPendingSubCategories = () => {},
  rejectedItems = [],
  setRejectedItems = () => {},
  merchantCommissionPct = 0,
  setMerchantCommissionPct = () => {},
  consumerFeePct = 0,
  setConsumerFeePct = () => {},
  monetizationConfig = {},
  setMonetizationConfig = () => {},
  liveDeviceTelemetry = {},
  appUpdateInfo = {},
  setAppUpdateInfo = () => {},
  onBroadcastOtaPushNotification,
  onWipeAllTestData,
  splitScreens = [],
  setSplitScreens = () => {},
  onLaunchMultiPhoneView,
  onTeleportToScreen,
  onExitAdminToApp,
  onTriggerToast = () => {}
}) {
  const safeGeoZones = Array.isArray(geoZones) ? geoZones : GEO_ZONES;
  const safeGeoAds = Array.isArray(geoAds) ? geoAds : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeMerchants = Array.isArray(merchants) ? merchants : [];
  const safeServiceProviders = Array.isArray(serviceProviders) ? serviceProviders : [];
  const safeDecorators = Array.isArray(decorators) ? decorators : [];
  const safeRiders = Array.isArray(riders) ? riders : [];
  const safeUsers = Array.isArray(registeredUsers) ? registeredUsers : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeHalls = Array.isArray(functionHalls) ? functionHalls : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeServiceBookings = Array.isArray(serviceBookings) ? serviceBookings : [];
  const safePendingMerchants = Array.isArray(pendingMerchants) ? pendingMerchants : [];
  const safePendingServices = Array.isArray(pendingServiceProviders) ? pendingServiceProviders : [];
  const safePendingDecorators = Array.isArray(pendingDecorators) ? pendingDecorators : [];
  const safePendingRiders = Array.isArray(pendingRiders) ? pendingRiders : [];
  const safePendingBrands = Array.isArray(pendingSubCategories) ? pendingSubCategories : [];
  const safeRejectedItems = Array.isArray(rejectedItems) ? rejectedItems : [];
  const safeSplitScreens = Array.isArray(splitScreens) ? splitScreens : [];

  const [adminDisplayMode, setAdminDisplayMode] = useState("web");
  const [founderTab, setFounderTab] = useState("approvals");
  const [locatorSearch, setLocatorSearch] = useState("");
  const [locatorRoleFilter, setLocatorRoleFilter] = useState("ALL");
  const [selectedInspectEntity, setSelectedInspectEntity] = useState(null);

  const [approvalQueueSubTab, setApprovalQueueSubTab] = useState("captains");
  const [checklistByPartner, setChecklistByPartner] = useState({});
  const [rejectModal, setRejectModal] = useState({
    open: false,
    item: null,
    partnerType: "brand",
    reason: (REJECTION_REASONS || [])[0] || "Incomplete KYC or Details",
    comment: ""
  });

  // Direct Admin Partner Onboarding State
  const [directPartnerForm, setDirectPartnerForm] = useState({
    partnerType: "merchant",
    name: "",
    owner: "",
    phone: "",
    upiId: "",
    category: "daily_needs",
    area: "Subhash Nagar, Adilabad",
    priceOrFee: 99,
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80"
  });

  // Classified Master Database State (Visual + JSON)
  const [adminDbTab, setAdminDbTab] = useState("stock");
  const [dbSearch, setDbSearch] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [visualEditItem, setVisualEditItem] = useState(null);

  // Direct Stock/Product Adder in Categories/DB
  const [quickStockForm, setQuickStockForm] = useState({
    categoryId: "daily_needs",
    subCategoryBrand: "",
    shopName: "Sri Laxmi Supermart",
    variantLabel: "1 kg Pack",
    price: 60,
    mrp: 70,
    stockQty: 50,
    curiosityTag: "Direct Wholesale Rate",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80"
  });

  const [pushBlast, setPushBlast] = useState({
    title: "Flash Zero-Delivery Window!",
    message: "Order Daily Home Needs & Mandi Vegetables with Rs.0 platform fee."
  });

  const [newAdForm, setNewAdForm] = useState({
    tier: "GEO_LOCAL",
    regionLabel: "ADILABAD TOWN GPS",
    title: "",
    subtitle: "",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80"
  });

  const [newCatForm, setNewCatForm] = useState({
    name: "",
    icon: "\uD83E\uDD56",
    partnerType: "merchant",
    badge: "Direct Local Price",
    minOrderValue: 99,
    baseDeliveryFee: 20,
    subInput: "",
    subCategories: ["Fresh Bread", "Cakes & Pastries"],
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80"
  });

  // Dynamic Admin Credentials State
  const [adminCredsForm, setAdminCredsForm] = useState(() => getFounderCredentials());
  const [showCredsPass, setShowCredsPass] = useState(false);

  // Cloud Data Server Config State
  const [serverCfgForm, setServerCfgForm] = useState(() => getServerConfig());
  const [syncStatusMsg, setSyncStatusMsg] = useState("Live Cloud Relay & Local Vault Ready");

  const [otaForm, setOtaForm] = useState({
    version: appUpdateInfo?.latestAvailableVersion || "3.2.2",
    notes:
      appUpdateInfo?.releaseNotes ||
      "WE4ALL v3.2.2 OTA: Ultimate Founder Admin Powers, Dynamic Credentials & Live Multi-Device Cloud Server Sync."
  });

  const handleImageFileRead = (e, onLoadedUrl) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (onLoadedUrl) onLoadedUrl(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const toggleCheckItem = (partnerId, key) => {
    const current = checklistByPartner[partnerId] || {
      kycDocVerified: false,
      tradeSkillVerified: false,
      bankUpiVerified: false,
      tcAcceptedVerified: false,
      signatureVerified: false
    };
    setChecklistByPartner({
      ...checklistByPartner,
      [partnerId]: { ...current, [key]: !current[key] }
    });
  };

  const checkAllForPartner = (partnerId) => {
    setChecklistByPartner({
      ...checklistByPartner,
      [partnerId]: {
        kycDocVerified: true,
        tradeSkillVerified: true,
        bankUpiVerified: true,
        tcAcceptedVerified: true,
        signatureVerified: true
      }
    });
  };

  const totalPendingCount =
    safePendingRiders.length +
    safePendingDecorators.length +
    safePendingServices.length +
    safePendingMerchants.length +
    safePendingBrands.length;

  const totalGmv =
    safeOrders.reduce((s, o) => s + Number(o?.grandTotal || 0), 0) +
    safeServiceBookings.reduce(
      (s, b) => s + Number(b?.finalServiceBill || b?.escrowVisitingAmount || 0),
      0
    ) +
    48500;
  const totalGst = Number((totalGmv * 0.05).toFixed(2));
  const platformRevenue = Number(
    ((totalGmv * (Number(merchantCommissionPct || 0) + Number(consumerFeePct || 0))) / 100).toFixed(2)
  );

  const liveTelemetryList = Object.values(liveDeviceTelemetry || {});
  const unifiedDirectory = [
    ...liveTelemetryList.map((ping, idx) => ({
      id: `LIVE_${ping?.deviceId || idx}`,
      name: ping?.fullName || "Active Device User",
      role: ping?.portal || ping?.role || "customer",
      phone: ping?.phone || "Live Session",
      upiId: ping?.upiId || "-",
      address: ping?.address || "Adilabad Town",
      lat: ping?.lat || 19.6641,
      lng: ping?.lng || 78.532,
      batteryPct: ping?.batteryPct ?? 100,
      networkType: ping?.networkType || "5G/WIFI",
      rawRecord: ping || {}
    })),
    ...safeUsers.map((u, idx) => ({
      id: `USR_${u?.id || idx}`,
      name: u?.fullName || u?.name || "Registered User",
      role: u?.role || "customer",
      phone: u?.phone || "-",
      upiId: u?.upiId || "-",
      address: u?.area || u?.address || "Adilabad Town",
      lat: u?.lat || 19.6655,
      lng: u?.lng || 78.5335,
      batteryPct: 95,
      networkType: "4G",
      rawRecord: u || {}
    })),
    ...safeMerchants.map((m, idx) => ({
      id: `MER_${m?.id || idx}`,
      name: m?.businessName || m?.name || "Merchant",
      role: "merchant",
      phone: m?.phone || "9848011101",
      upiId: m?.upiId || "merchant@ybl",
      address: m?.area || "Adilabad",
      lat: m?.lat || 19.6672,
      lng: m?.lng || 78.5318,
      batteryPct: 100,
      networkType: "WIFI",
      rawRecord: m || {}
    })),
    ...safeServiceProviders.map((sp, idx) => ({
      id: `SRV_${sp?.id || idx}`,
      name: sp?.providerName || sp?.maskedId || "Service Pro",
      role: "service_provider",
      phone: sp?.phone || "9848022201",
      upiId: sp?.upiId || "servicepro@ybl",
      address: sp?.area || "Adilabad",
      lat: sp?.lat || 19.6631,
      lng: sp?.lng || 78.5342,
      batteryPct: 88,
      networkType: "4G",
      rawRecord: sp || {}
    })),
    ...safeDecorators.map((d, idx) => ({
      id: `DEC_${d?.id || idx}`,
      name: d?.businessName || d?.name || "Decorator",
      role: "decorator",
      phone: d?.phone || "9848044556",
      upiId: d?.upiId || "decorator@ybl",
      address: d?.area || "Adilabad",
      lat: d?.lat || 19.6701,
      lng: d?.lng || 78.529,
      batteryPct: 92,
      networkType: "WIFI",
      rawRecord: d || {}
    })),
    ...safeRiders.map((r, idx) => ({
      id: `CAP_${r?.id || idx}`,
      name: r?.name || r?.captainName || "Delivery Captain",
      role: "rider",
      phone: r?.phone || "9848055112",
      upiId: r?.upiId || "captain@ybl",
      address: "Live Patrol Route, Adilabad",
      lat: r?.lat || 19.6648,
      lng: r?.lng || 78.5328,
      batteryPct: 84,
      networkType: "5G",
      rawRecord: r || {}
    }))
  ];

  const filteredDirectory = unifiedDirectory.filter((entry) => {
    if (locatorRoleFilter !== "ALL" && entry.role !== locatorRoleFilter) return false;
    if (!locatorSearch.trim()) return true;
    const q = locatorSearch.toLowerCase();
    return (
      String(entry.name || "").toLowerCase().includes(q) ||
      String(entry.phone || "").toLowerCase().includes(q) ||
      String(entry.role || "").toLowerCase().includes(q) ||
      String(entry.address || "").toLowerCase().includes(q)
    );
  });

  const ADMIN_TABS = [
    { id: "approvals", label: "1. All-Sector Approvals & KYC", badge: `${totalPendingCount} Pending` },
    { id: "database", label: "2. 8-Table Master Database CRUD", badge: "Edit All Data" },
    { id: "categories", label: "3. Categories, Sub-Pills & Stock", badge: `${safeCategories.length} Cats` },
    { id: "security_server", label: "4. Admin Credentials & Data Server", badge: "PIN + Cloud" },
    { id: "live_locator", label: "5. Live GPS Locator & Inspector", badge: `${unifiedDirectory.length}` },
    { id: "telemetry", label: "6. Telemetry, Kill-Switches & Push", badge: "God-Mode" },
    { id: "geo_ads", label: "7. 3-Tier Geo / State / Brand Ads", badge: `${safeGeoAds.length} Ads` },
    { id: "monetization", label: "8. Commissions & Monetization", badge: `${merchantCommissionPct}%` },
    { id: "testing", label: "9. Multi-Phone Sandbox & Flow QA", badge: `${safeSplitScreens.length} Phones` }
  ];

  const renderPartnerApprovalCard = (partner, partnerType) => {
    if (!partner) return null;
    const chk = checklistByPartner[partner.id] || {};
    const allFiveChecked =
      chk.kycDocVerified &&
      chk.tradeSkillVerified &&
      chk.bankUpiVerified &&
      chk.tcAcceptedVerified &&
      chk.signatureVerified;
    const displayName =
      partner.captainName ||
      partner.providerName ||
      partner.businessName ||
      partner.fullName ||
      partner.name ||
      "Partner Applicant";

    return (
      <div
        key={partner.id}
        className="bg-slate-950 p-3.5 rounded-2xl border border-teal-400/50 space-y-3"
      >
        <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-800 pb-2">
          <div>
            <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded uppercase">
              Pending Admin Verification ({String(partnerType || "").toUpperCase()})
            </span>
            <h4 className="text-sm font-black text-white mt-1">{displayName}</h4>
            <p className="text-[10px] text-slate-300">
              Mobile: <strong>+91 {partner.phone || "N/A"}</strong> | UPI:{" "}
              <strong className="text-emerald-300">{partner.upiId || "Not Set"}</strong> | Area:{" "}
              <strong>{partner.area || partner.address || "Adilabad"}</strong>
            </p>
            {(partner.bankName || partner.accountNumber) && (
              <p className="text-[10px] text-amber-300">
                Bank: {partner.bankName} | A/C: {partner.accountNumber} ({partner.ifscCode})
              </p>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => checkAllForPartner(partner.id)}
              className="bg-slate-800 border border-emerald-400/50 text-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer"
            >
              &#x2713; Check All 5
            </button>
            <button
              type="button"
              onClick={() =>
                setRejectModal({
                  open: true,
                  item: partner,
                  partnerType,
                  reason: (REJECTION_REASONS || [])[0] || "Incomplete KYC Proof",
                  comment: ""
                })
              }
              className="bg-rose-900/80 border border-rose-500 text-rose-200 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer"
            >
              Reject
            </button>
          </div>
        </div>

        {/* Uploaded KYC Document / Selfie / Signature Preview if available */}
        {(partner.kycDocUrl || partner.selfieUrl || partner.signatureUrl) && (
          <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
            {partner.kycDocUrl && (
              <div>
                <p className="text-[8px] text-slate-400 mb-1">KYC / License Doc:</p>
                <img
                  src={partner.kycDocUrl}
                  alt="KYC"
                  className="h-14 w-full object-cover rounded border border-slate-700"
                />
              </div>
            )}
            {partner.selfieUrl && (
              <div>
                <p className="text-[8px] text-slate-400 mb-1">Live Selfie:</p>
                <img
                  src={partner.selfieUrl}
                  alt="Selfie"
                  className="h-14 w-full object-cover rounded border border-slate-700"
                />
              </div>
            )}
            {partner.signatureUrl && (
              <div>
                <p className="text-[8px] text-slate-400 mb-1">Digital Signature:</p>
                <img
                  src={partner.signatureUrl}
                  alt="Sign"
                  className="h-14 w-full object-contain bg-white rounded border border-slate-700"
                />
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          {[
            { key: "kycDocVerified", label: "1. Uploaded KYC Document / DL / RC / Shop License Verified" },
            { key: "tradeSkillVerified", label: "2. Sector Category, Rate Card, Portfolio & Vehicle Verified" },
            { key: "bankUpiVerified", label: "3. Bank Account & Instant UPI Settlement ID Verified" },
            { key: "tcAcceptedVerified", label: "4. WE4ALL Platform Terms & Zero-Markup Rules Accepted" },
            { key: "signatureVerified", label: "5. Digital Signature / Owner Specimen Authenticated" }
          ].map((item) => {
            const checked = Boolean(chk[item.key]);
            return (
              <div
                key={item.key}
                onClick={() => toggleCheckItem(partner.id, item.key)}
                className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer ${
                  checked
                    ? "bg-emerald-950/40 border-emerald-400 text-emerald-200"
                    : "bg-slate-900 border-slate-800 text-slate-400"
                }`}
              >
                <span className="font-bold text-[11px]">{item.label}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-black ${
                    checked ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-amber-300"
                  }`}
                >
                  {checked ? "CHECKED \u2713" : "CLICK TO CHECK"}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!allFiveChecked}
          onClick={() => {
            const approvedObj = {
              ...partner,
              name: displayName,
              businessName: partner.businessName || displayName,
              providerName: partner.providerName || displayName,
              status: "Approved",
              isPublished: true,
              isPublishedToPublic: true,
              approvedAt: new Date().toLocaleString()
            };
            if (partnerType === "captain") {
              const nextRiders = [approvedObj, ...safeRiders];
              const nextPending = safePendingRiders.filter((x) => x.id !== partner.id);
              setRiders(nextRiders);
              setPendingRiders(nextPending);
              saveCloudAndLocalState({ riders: nextRiders, pendingRiders: nextPending });
            } else if (partnerType === "decorator") {
              const nextDec = [approvedObj, ...safeDecorators];
              const nextPending = safePendingDecorators.filter((x) => x.id !== partner.id);
              setDecorators(nextDec);
              setPendingDecorators(nextPending);
              saveCloudAndLocalState({ decorators: nextDec, pendingDecorators: nextPending });
            } else if (partnerType === "service_provider") {
              const nextSp = [approvedObj, ...safeServiceProviders];
              const nextPending = safePendingServices.filter((x) => x.id !== partner.id);
              setServiceProviders(nextSp);
              setPendingServiceProviders(nextPending);
              saveCloudAndLocalState({
                serviceProviders: nextSp,
                pendingServiceProviders: nextPending
              });
            } else {
              const nextMer = [approvedObj, ...safeMerchants];
              const nextPending = safePendingMerchants.filter((x) => x.id !== partner.id);
              setMerchants(nextMer);
              setPendingMerchants(nextPending);
              saveCloudAndLocalState({ merchants: nextMer, pendingMerchants: nextPending });
            }
            const nextRegisteredUsersAfterApproval = safeUsers.map((u) =>
              u?.id === partner.id || (u?.phone && u.phone === partner.phone)
                ? { ...u, status: "Approved", isPublished: true, approvedAt: approvedObj.approvedAt }
                : u
            );
            setRegisteredUsers(nextRegisteredUsersAfterApproval);
            saveCloudAndLocalState({
              registeredUsers: nextRegisteredUsersAfterApproval,
              lastApprovedPartnerNotification: {
                partnerId: partner.id,
                phone: partner.phone,
                name: displayName,
                role: partnerType,
                approvedAt: approvedObj.approvedAt
              }
            });
            onTriggerToast(`Approved & Notified "${displayName}" LIVE across all devices!`);
          }}
          className={`w-full font-black py-2.5 rounded-xl text-xs ${
            allFiveChecked
              ? "bg-emerald-400 text-slate-950 cursor-pointer shadow-lg"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {allFiveChecked
            ? `\u2713 Approve & Publish ${displayName} Live Across All Devices`
            : "Complete All 5 Checklist Items Above to Approve"}
        </button>
      </div>
    );
  };

  // Helper to get active dataset in Tab 2 (Master Database CRUD)
  const getCurrentDbList = () => {
    if (adminDbTab === "merchants") return safeMerchants;
    if (adminDbTab === "users") return safeUsers;
    if (adminDbTab === "stock") return safeProducts;
    if (adminDbTab === "service_providers") return safeServiceProviders;
    if (adminDbTab === "decorators") return safeDecorators;
    if (adminDbTab === "halls") return safeHalls;
    if (adminDbTab === "captains") return safeRiders;
    if (adminDbTab === "orders") return safeOrders;
    return [];
  };

  const updateCurrentDbList = (nextList) => {
    if (adminDbTab === "merchants") {
      setMerchants(nextList);
      saveCloudAndLocalState({ merchants: nextList });
    } else if (adminDbTab === "users") {
      setRegisteredUsers(nextList);
      saveCloudAndLocalState({ registeredUsers: nextList });
    } else if (adminDbTab === "stock") {
      setProducts(nextList);
      saveCloudAndLocalState({ products: nextList });
    } else if (adminDbTab === "service_providers") {
      setServiceProviders(nextList);
      saveCloudAndLocalState({ serviceProviders: nextList });
    } else if (adminDbTab === "decorators") {
      setDecorators(nextList);
      saveCloudAndLocalState({ decorators: nextList });
    } else if (adminDbTab === "halls") {
      setFunctionHalls(nextList);
      saveCloudAndLocalState({ functionHalls: nextList });
    } else if (adminDbTab === "captains") {
      setRiders(nextList);
      saveCloudAndLocalState({ riders: nextList });
    } else if (adminDbTab === "orders") {
      setOrders(nextList);
      saveCloudAndLocalState({ orders: nextList });
    }
  };

  const renderAdminContent = () => (
    <div className="space-y-4 text-xs">
      {/* =====================================================================
          TAB 1: ALL-SECTOR APPROVALS, 5-POINT CHECKLISTS & DIRECT ONBOARDING
      ===================================================================== */}
      {founderTab === "approvals" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 md:grid-cols-7 gap-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            {[
              { id: "captains", label: `1. Captains (${safePendingRiders.length})` },
              { id: "decorators_halls", label: `2. Decor (${safePendingDecorators.length})` },
              { id: "service_providers", label: `3. Services (${safePendingServices.length})` },
              { id: "merchants", label: `4. Merchants (${safePendingMerchants.length})` },
              { id: "brands", label: `5. Brands (${safePendingBrands.length})` },
              { id: "rejected", label: `6. Rejected (${safeRejectedItems.length})` },
              { id: "direct_add", label: "7. + Direct Add" }
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setApprovalQueueSubTab(sub.id)}
                className={`py-2 px-1 rounded-xl font-black text-[10px] cursor-pointer ${
                  approvalQueueSubTab === sub.id
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            {approvalQueueSubTab === "captains" &&
              (safePendingRiders.length === 0 ? (
                <p className="text-slate-400 text-center py-4">
                  No pending Delivery Captains waiting for approval. Use &ldquo;7. + Direct Add&rdquo; to onboard a Captain immediately!
                </p>
              ) : (
                safePendingRiders.map((r) => renderPartnerApprovalCard(r, "captain"))
              ))}

            {approvalQueueSubTab === "decorators_halls" &&
              (safePendingDecorators.length === 0 ? (
                <p className="text-slate-400 text-center py-4">
                  No pending Decorators or Function Halls in queue.
                </p>
              ) : (
                safePendingDecorators.map((d) => renderPartnerApprovalCard(d, "decorator"))
              ))}

            {approvalQueueSubTab === "service_providers" &&
              (safePendingServices.length === 0 ? (
                <p className="text-slate-400 text-center py-4">
                  No pending Home Service Providers in queue.
                </p>
              ) : (
                safePendingServices.map((sp) =>
                  renderPartnerApprovalCard(sp, "service_provider")
                )
              ))}

            {approvalQueueSubTab === "merchants" &&
              (safePendingMerchants.length === 0 ? (
                <p className="text-slate-400 text-center py-4">
                  No pending Product Merchants in queue.
                </p>
              ) : (
                safePendingMerchants.map((m) => renderPartnerApprovalCard(m, "merchant"))
              ))}

            {approvalQueueSubTab === "brands" &&
              (safePendingBrands.length === 0 ? (
                <p className="text-slate-400 text-center py-4">
                  No pending Brand / Product submissions.
                </p>
              ) : (
                safePendingBrands.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 p-3.5 rounded-2xl border border-amber-400/50 flex flex-wrap justify-between items-center gap-3"
                  >
                    <div className="flex items-center gap-3">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.subCategoryBrand}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                        />
                      )}
                      <div>
                        <p className="font-black text-white text-sm">{item.subCategoryBrand}</p>
                        <p className="text-[10px] text-slate-400">
                          Shop: {item.shopName} | Category: {item.categoryId} | Price: Rs.
                          {item.variants?.[0]?.price || item.price || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const nextProds = [
                            ...safeProducts,
                            { ...item, status: "approved", isPublished: true, inStock: true }
                          ];
                          const nextPending = safePendingBrands.filter((i) => i.id !== item.id);
                          setProducts(nextProds);
                          setPendingSubCategories(nextPending);
                          saveCloudAndLocalState({
                            products: nextProds,
                            pendingSubCategories: nextPending
                          });
                          onTriggerToast(`Approved "${item.subCategoryBrand}" live to catalog!`);
                        }}
                        className="bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        Approve Live
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRejectModal({
                            open: true,
                            item,
                            partnerType: "brand",
                            reason: (REJECTION_REASONS || [])[0] || "Price Exceeds Guidelines",
                            comment: ""
                          })
                        }
                        className="bg-rose-600 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                      >
                        Reject with Reason
                      </button>
                    </div>
                  </div>
                ))
              ))}

            {approvalQueueSubTab === "rejected" &&
              (safeRejectedItems.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No rejected submissions.</p>
              ) : (
                safeRejectedItems.map((rej, i) => (
                  <div
                    key={rej.id || i}
                    className="bg-slate-950 p-3 rounded-xl border border-rose-500/40 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-rose-300">
                        {rej.subCategoryBrand || rej.businessName || rej.name || "Rejected Item"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Reason: {rej.rejectReason} | Note: {rej.rejectComment}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextRej = safeRejectedItems.filter((_, idx) => idx !== i);
                        setRejectedItems(nextRej);
                        saveCloudAndLocalState({ rejectedItems: nextRej });
                      }}
                      className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                ))
              ))}

            {/* SUB-TAB 7: DIRECT ADMIN PARTNER ONBOARDING IN ANY SECTOR */}
            {approvalQueueSubTab === "direct_add" && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-500/40 space-y-3">
                <h4 className="font-black text-emerald-400 text-sm">
                  + Direct Founder Partner Onboarding (Instant Live Approval in Any Sector)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select
                    value={directPartnerForm.partnerType}
                    onChange={(e) =>
                      setDirectPartnerForm({ ...directPartnerForm, partnerType: e.target.value })
                    }
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-amber-300 font-bold"
                  >
                    <option value="merchant">1. Product Merchant Shop</option>
                    <option value="service_provider">2. Home Service Provider</option>
                    <option value="decorator">3. Flower Decorator</option>
                    <option value="hall">4. Function Hall</option>
                    <option value="captain">5. Delivery Captain (2W / 3W Auto)</option>
                  </select>
                  <input
                    type="text"
                    value={directPartnerForm.name}
                    onChange={(e) =>
                      setDirectPartnerForm({ ...directPartnerForm, name: e.target.value })
                    }
                    placeholder="Business / Partner Name"
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                  <input
                    type="tel"
                    value={directPartnerForm.phone}
                    onChange={(e) =>
                      setDirectPartnerForm({ ...directPartnerForm, phone: e.target.value })
                    }
                    placeholder="10-Digit Mobile Number"
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={directPartnerForm.upiId}
                    onChange={(e) =>
                      setDirectPartnerForm({ ...directPartnerForm, upiId: e.target.value })
                    }
                    placeholder="UPI ID (e.g. partner@ybl)"
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                  <input
                    type="text"
                    value={directPartnerForm.area}
                    onChange={(e) =>
                      setDirectPartnerForm({ ...directPartnerForm, area: e.target.value })
                    }
                    placeholder="Town Area / Address"
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                  <input
                    type="number"
                    value={directPartnerForm.priceOrFee}
                    onChange={(e) =>
                      setDirectPartnerForm({
                        ...directPartnerForm,
                        priceOrFee: Number(e.target.value) || 0
                      })
                    }
                    placeholder="Visit Fee / Hall Rent / Base Rate (Rs.)"
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!directPartnerForm.name.trim()) return;
                    const id = `${directPartnerForm.partnerType}_${Date.now()}`;
                    if (directPartnerForm.partnerType === "merchant") {
                      const next = [
                        {
                          id,
                          businessName: directPartnerForm.name.trim(),
                          owner: directPartnerForm.owner || "Verified Owner",
                          categoryId: directPartnerForm.category || "daily_needs",
                          phone: directPartnerForm.phone || "9848011101",
                          upiId: directPartnerForm.upiId || "merchant@ybl",
                          area: directPartnerForm.area,
                          status: "Approved"
                        },
                        ...safeMerchants
                      ];
                      setMerchants(next);
                      saveCloudAndLocalState({ merchants: next });
                    } else if (directPartnerForm.partnerType === "service_provider") {
                      const next = [
                        {
                          id,
                          serviceCategoryId: "srv_plumbing",
                          providerName: directPartnerForm.name.trim(),
                          maskedId: `Verified Pro #${safeServiceProviders.length + 1}`,
                          serviceCategory: "Home Services",
                          specialization: "Verified Town Specialist",
                          visitingFee: directPartnerForm.priceOrFee || 99,
                          hourlyRate: 150,
                          area: directPartnerForm.area,
                          phone: directPartnerForm.phone || "9848022201",
                          upiId: directPartnerForm.upiId || "service@ybl",
                          rating: 4.9,
                          status: "Approved",
                          isPublished: true,
                          isPublishedToPublic: true,
                          availableSlots: ["09:00 AM - 10:00 AM", "11:00 AM - 12:00 PM", "03:00 PM - 04:00 PM"],
                          image: directPartnerForm.image
                        },
                        ...safeServiceProviders
                      ];
                      setServiceProviders(next);
                      saveCloudAndLocalState({ serviceProviders: next });
                    } else if (directPartnerForm.partnerType === "decorator") {
                      const next = [
                        {
                          id,
                          name: directPartnerForm.name.trim(),
                          businessName: directPartnerForm.name.trim(),
                          decoratorSubRole: "flower_decorator",
                          expert: "Wedding, Haldi & Stage Decor",
                          phone: directPartnerForm.phone || "9848044556",
                          upiId: directPartnerForm.upiId || "decor@ybl",
                          area: directPartnerForm.area,
                          status: "Approved",
                          image: directPartnerForm.image
                        },
                        ...safeDecorators
                      ];
                      setDecorators(next);
                      saveCloudAndLocalState({ decorators: next });
                    } else if (directPartnerForm.partnerType === "hall") {
                      const next = [
                        {
                          id,
                          name: directPartnerForm.name.trim(),
                          capacity: "800 Guests",
                          pricePerDay: directPartnerForm.priceOrFee || 45000,
                          collateralVerified: true,
                          bookedDates: [],
                          image: directPartnerForm.image
                        },
                        ...safeHalls
                      ];
                      setFunctionHalls(next);
                      saveCloudAndLocalState({ functionHalls: next });
                    } else if (directPartnerForm.partnerType === "captain") {
                      const next = [
                        {
                          id,
                          name: directPartnerForm.name.trim(),
                          phone: directPartnerForm.phone || "9848055112",
                          upiId: directPartnerForm.upiId || "captain@ybl",
                          vehicleType: "2W",
                          vehicleName: "Hero Splendor Bike",
                          baseRate: directPartnerForm.priceOrFee || 25,
                          perKm: 6,
                          rating: 4.9,
                          trips: 10,
                          badge: "Admin Verified Captain",
                          isPrimeCaptain: true
                        },
                        ...safeRiders
                      ];
                      setRiders(next);
                      saveCloudAndLocalState({ riders: next });
                    }
                    setDirectPartnerForm({ ...directPartnerForm, name: "", phone: "" });
                    onTriggerToast("Partner directly onboarded, approved & synced to cloud!");
                  }}
                  className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
                >
                  &#x2713; Onboard &amp; Publish Partner Live Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: 8-TABLE CLASSIFIED MASTER DATABASE CRUD (VISUAL + JSON EDITOR)
      ===================================================================== */}
      {founderTab === "database" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <h3 className="font-black text-amber-400 text-sm">
                  Classified Master Database Control (Visual Editor + Image Changer + JSON)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Full root control over all 8 sectors: edit names, categories, sub-categories, brands, prices, images, or delete records.
                </p>
              </div>
              <input
                type="text"
                value={dbSearch}
                onChange={(e) => setDbSearch(e.target.value)}
                placeholder="Search current table..."
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "stock", label: `1. Stock & Brands (${safeProducts.length})` },
                { id: "merchants", label: `2. Merchants (${safeMerchants.length})` },
                { id: "users", label: `3. Consumers (${safeUsers.length})` },
                { id: "service_providers", label: `4. Service Pros (${safeServiceProviders.length})` },
                { id: "decorators", label: `5. Decorators (${safeDecorators.length})` },
                { id: "halls", label: `6. Function Halls (${safeHalls.length})` },
                { id: "captains", label: `7. Captains (${safeRiders.length})` },
                { id: "orders", label: `8. Orders (${safeOrders.length})` }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAdminDbTab(t.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                    adminDbTab === t.id
                      ? "bg-amber-400 text-slate-950 shadow"
                      : "bg-slate-950 text-slate-300 border border-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {getCurrentDbList()
                .filter((rec) => {
                  if (!dbSearch.trim()) return true;
                  return JSON.stringify(rec || {})
                    .toLowerCase()
                    .includes(dbSearch.toLowerCase());
                })
                .map((rec, idx) => {
                  const title =
                    rec?.subCategoryBrand ||
                    rec?.businessName ||
                    rec?.fullName ||
                    rec?.providerName ||
                    rec?.name ||
                    `Order #${rec?.id || idx}`;
                  const subInfo =
                    adminDbTab === "stock"
                      ? `Category: ${rec?.categoryId} | Shop: ${rec?.shopName} | Price: Rs.${
                          rec?.variants?.[0]?.price || rec?.price || 0
                        } | Stock: ${rec?.stockQty ?? 50}`
                      : adminDbTab === "orders"
                      ? `Customer: ${rec?.customerName || rec?.customer || "Guest"} | Total: Rs.${
                          rec?.grandTotal || rec?.amount || 0
                        } | Status: ${rec?.status}`
                      : `Phone: ${rec?.phone || "-"} | Area: ${
                          rec?.area || rec?.capacity || "Adilabad"
                        } | Status: ${rec?.status || "Active"}`;

                  return (
                    <div
                      key={rec?.id || idx}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap justify-between items-center gap-2"
                    >
                      <div className="flex items-center gap-3">
                        {rec?.image && (
                          <img
                            src={rec.image}
                            alt={title}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-700 shrink-0"
                          />
                        )}
                        <div>
                          <p className="font-bold text-white text-xs">{title}</p>
                          <p className="text-[10px] text-slate-400">{subInfo}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setVisualEditItem({
                              table: adminDbTab,
                              index: idx,
                              record: { ...rec }
                            })
                          }
                          className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
                        >
                          Visual Edit / Image
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingRecord({
                              type: adminDbTab,
                              index: idx,
                              jsonStr: JSON.stringify(rec, null, 2)
                            })
                          }
                          className="bg-amber-400/20 border border-amber-400 text-amber-300 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Raw JSON
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = getCurrentDbList().filter((_, i) => i !== idx);
                            updateCurrentDbList(next);
                            onTriggerToast(`Deleted "${title}" & synced to Cloud Server!`);
                          }}
                          className="bg-rose-950 border border-rose-700 text-rose-300 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: DYNAMIC CATEGORIES, SUB-CATEGORY PILLS & STOCK BUILDER
      ===================================================================== */}
      {founderTab === "categories" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-purple-300 text-sm">
              1. Launch New Category &amp; Sub-Category Pills (Auto-Creates Isolated Cart)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                type="text"
                value={newCatForm.icon}
                onChange={(e) => setNewCatForm({ ...newCatForm, icon: e.target.value })}
                placeholder="Icon"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-center"
              />
              <input
                type="text"
                value={newCatForm.name}
                onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
                placeholder="Category Name (e.g. Fresh Bakery / Agri Inputs)"
                className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <input
                type="text"
                value={newCatForm.badge}
                onChange={(e) => setNewCatForm({ ...newCatForm, badge: e.target.value })}
                placeholder="Specialty Badge"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCatForm.subInput}
                onChange={(e) => setNewCatForm({ ...newCatForm, subInput: e.target.value })}
                placeholder="Add Sub-Category Pill..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCatForm.subInput.trim()) return;
                  setNewCatForm({
                    ...newCatForm,
                    subCategories: [...newCatForm.subCategories, newCatForm.subInput.trim()],
                    subInput: ""
                  });
                }}
                className="bg-slate-800 text-amber-300 font-black px-3 rounded-xl cursor-pointer"
              >
                + Add Pill
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {newCatForm.subCategories.map((s) => (
                <span
                  key={s}
                  className="bg-slate-950 border border-purple-500/40 text-purple-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                >
                  {s}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newCatForm.name.trim()) return;
                const newId = `cat_${Date.now()}`;
                const nextCats = [
                  ...safeCategories,
                  {
                    id: newId,
                    name: newCatForm.name.trim(),
                    icon: newCatForm.icon || "\uD83D\uDED2",
                    partnerType: newCatForm.partnerType,
                    badge: newCatForm.badge,
                    flow: "instant_goods",
                    minOrderValue: 99,
                    baseDeliveryFee: 20,
                    subCategories: newCatForm.subCategories,
                    image: newCatForm.image
                  }
                ];
                setCategories(nextCats);
                setCategoryCarts({ ...categoryCarts, [newId]: [] });
                saveCloudAndLocalState({ categories: nextCats });
                setNewCatForm({ ...newCatForm, name: "" });
                onTriggerToast("Launched new Category & synced across all devices!");
              }}
              className="w-full bg-purple-500 text-white font-black py-2.5 rounded-xl cursor-pointer"
            >
              + Launch Dynamic Category Live
            </button>
          </div>

          {/* DIRECT ADMIN STOCK / BRAND / IMAGE CREATOR */}
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-emerald-400 text-sm">
              2. Direct Admin Stock / Brand / Product Publisher (With Image Upload)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <select
                value={quickStockForm.categoryId}
                onChange={(e) =>
                  setQuickStockForm({ ...quickStockForm, categoryId: e.target.value })
                }
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
              >
                {safeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={quickStockForm.subCategoryBrand}
                onChange={(e) =>
                  setQuickStockForm({ ...quickStockForm, subCategoryBrand: e.target.value })
                }
                placeholder="Brand & Product Title (e.g. India Gate Basmati 5Kg)"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <input
                type="text"
                value={quickStockForm.shopName}
                onChange={(e) =>
                  setQuickStockForm({ ...quickStockForm, shopName: e.target.value })
                }
                placeholder="Merchant Shop Name"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input
                type="text"
                value={quickStockForm.variantLabel}
                onChange={(e) =>
                  setQuickStockForm({ ...quickStockForm, variantLabel: e.target.value })
                }
                placeholder="Variant (e.g. 5 Kg Bag)"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <input
                type="number"
                value={quickStockForm.price}
                onChange={(e) =>
                  setQuickStockForm({ ...quickStockForm, price: Number(e.target.value) || 0 })
                }
                placeholder="Price (Rs.)"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <input
                type="number"
                value={quickStockForm.mrp}
                onChange={(e) =>
                  setQuickStockForm({ ...quickStockForm, mrp: Number(e.target.value) || 0 })
                }
                placeholder="MRP (Rs.)"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <input
                type="number"
                value={quickStockForm.stockQty}
                onChange={(e) =>
                  setQuickStockForm({ ...quickStockForm, stockQty: Number(e.target.value) || 0 })
                }
                placeholder="Stock Qty"
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={quickStockForm.image}
                onChange={(e) =>
                  setQuickStockForm({ ...quickStockForm, image: e.target.value })
                }
                placeholder="Product Image URL"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <label className="bg-slate-800 border border-amber-400/50 text-amber-300 font-black px-3 py-2 rounded-xl cursor-pointer">
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleImageFileRead(e, (url) =>
                      setQuickStockForm({ ...quickStockForm, image: url })
                    )
                  }
                  className="hidden"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!quickStockForm.subCategoryBrand.trim()) return;
                const newProd = {
                  id: `prod_${Date.now()}`,
                  zoneId: "adilabad",
                  categoryId: quickStockForm.categoryId,
                  subCategoryBrand: quickStockForm.subCategoryBrand.trim(),
                  shopName: quickStockForm.shopName.trim() || "Sri Laxmi Supermart",
                  distanceKm: 0.8,
                  rating: 4.9,
                  buyersToday: 12,
                  stockQty: quickStockForm.stockQty || 50,
                  inStock: true,
                  isPublished: true,
                  curiosityTag: quickStockForm.curiosityTag || "Direct Store Price",
                  image: quickStockForm.image,
                  status: "approved",
                  variants: [
                    {
                      id: `v_${Date.now()}`,
                      label: quickStockForm.variantLabel || "1 Pack",
                      price: quickStockForm.price,
                      mrp: quickStockForm.mrp || quickStockForm.price + 10,
                      weightGrams: 1000
                    }
                  ],
                  merchantOffers: [
                    {
                      merchantId: `m_${Date.now()}`,
                      merchantName: quickStockForm.shopName.trim() || "Sri Laxmi Supermart",
                      price: quickStockForm.price,
                      area: "Adilabad Town",
                      rating: 4.9
                    }
                  ]
                };
                const nextProds = [newProd, ...safeProducts];
                setProducts(nextProds);
                saveCloudAndLocalState({ products: nextProds });
                setQuickStockForm({ ...quickStockForm, subCategoryBrand: "" });
                onTriggerToast(`Published "${newProd.subCategoryBrand}" to live catalog!`);
              }}
              className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
            >
              + Publish Product to Store Catalog Now
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: DYNAMIC ADMIN CREDENTIALS VAULT & CLOUD DATA SERVER BRIDGE
      ===================================================================== */}
      {founderTab === "security_server" && (
        <div className="space-y-4">
          {/* 1. DYNAMIC ADMIN CREDENTIALS CHANGER */}
          <div className="bg-slate-900 border-2 border-amber-400 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-amber-400 text-sm">
                  \uD83D\uDD10 Founder Admin Login Credentials Changer (Modify Anytime)
                </h3>
                <p className="text-[11px] text-slate-300">
                  Change your Admin Username, Password, and 4-Digit Security PIN whenever you want. Changes sync immediately to the login gate and Cloud Server.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCredsPass(!showCredsPass)}
                className="bg-slate-800 text-amber-300 px-3 py-1 rounded-xl text-[10px] font-black cursor-pointer"
              >
                {showCredsPass ? "Hide Secrets" : "Show Secrets"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Admin Username</label>
                <input
                  type="text"
                  value={adminCredsForm.username}
                  onChange={(e) =>
                    setAdminCredsForm({ ...adminCredsForm, username: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Admin Password</label>
                <input
                  type={showCredsPass ? "text" : "password"}
                  value={adminCredsForm.password}
                  onChange={(e) =>
                    setAdminCredsForm({ ...adminCredsForm, password: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  4-Digit Founder PIN
                </label>
                <input
                  type={showCredsPass ? "text" : "password"}
                  maxLength={6}
                  value={adminCredsForm.pin}
                  onChange={(e) =>
                    setAdminCredsForm({ ...adminCredsForm, pin: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-emerald-300 font-mono text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Recovery Mobile</label>
                <input
                  type="tel"
                  value={adminCredsForm.recoveryPhone}
                  onChange={(e) =>
                    setAdminCredsForm({ ...adminCredsForm, recoveryPhone: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>
            </div>

            <div className="bg-amber-950/50 border border-amber-500/50 rounded-xl p-3 text-[11px] text-amber-100">
              Founder credentials are not editable in the browser. Configure the founder identity through the secured server-side authentication process; local PIN/password storage and cross-device credential syncing are disabled.
            </div>
            <button
              type="button"
              disabled
              className="w-full bg-slate-700 text-slate-400 font-black py-2.5 rounded-xl cursor-not-allowed shadow"
            >
              Server-side founder authentication required
            </button>
          </div>

          {/* 2. LIVE CLOUD DATA SERVER & MULTI-DEVICE SYNC MANAGER */}
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <h3 className="font-black text-emerald-400 text-sm">
                  \uD83C\uDF10 Live Cloud Data Server &amp; Cross-Device Sync Manager
                </h3>
                <p className="text-[11px] text-slate-300">
                  Ensures orders, partner approvals, stock changes, and categories reflect across all phones and web browsers.
                </p>
              </div>
              <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-3 py-1 rounded-xl text-[10px] font-black">
                {syncStatusMsg}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Supabase Database URL
                </label>
                <input
                  type="text"
                  value={serverCfgForm.supabaseUrl}
                  onChange={(e) =>
                    setServerCfgForm({ ...serverCfgForm, supabaseUrl: e.target.value })
                  }
                  placeholder="https://your-project.supabase.co"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Supabase Public Anon Key (Optional — Relay Active by Default)
                </label>
                <input
                  type="text"
                  value={serverCfgForm.supabaseAnonKey}
                  onChange={(e) =>
                    setServerCfgForm({ ...serverCfgForm, supabaseAnonKey: e.target.value })
                  }
                  placeholder="Paste eyJhbGciOi... anon key here if using direct Supabase"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-emerald-300 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  saveServerConfig(serverCfgForm);
                  setSyncStatusMsg("Server Links Saved & Active!");
                  onTriggerToast("Cloud Data Server Configuration Saved!");
                }}
                className="bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
              >
                Save Server Config
              </button>
              <button
                type="button"
                onClick={() => {
                  saveCloudAndLocalState({
                    categories: safeCategories,
                    products: safeProducts,
                    merchants: safeMerchants,
                    serviceProviders: safeServiceProviders,
                    decorators: safeDecorators,
                    functionHalls: safeHalls,
                    riders: safeRiders,
                    orders: safeOrders,
                    serviceBookings: safeServiceBookings,
                    geoAds: safeGeoAds,
                    founderCredentials: adminCredsForm
                  });
                  setSyncStatusMsg(`Pushed at ${new Date().toLocaleTimeString()}`);
                  onTriggerToast("Forced Full State Push to Live Cloud Server!");
                }}
                className="bg-teal-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
              >
                \u2B06 Force Push All Data to Cloud
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSyncStatusMsg("Pulling from Cloud...");
                  const remote = await pullRemoteSupabaseState();
                  if (remote) {
                    setSyncStatusMsg(`Pulled at ${new Date().toLocaleTimeString()}`);
                    onTriggerToast("Pulled latest state from Cloud Server!");
                  } else {
                    setSyncStatusMsg("Cloud Server Up-to-Date");
                    onTriggerToast("Cloud Server is already in sync!");
                  }
                }}
                className="bg-indigo-500 text-white font-black py-2 rounded-xl cursor-pointer"
              >
                \u2B07 Pull Latest Data from Cloud
              </button>
            </div>
          </div>

          {/* 3. IN-APP OTA BROADCASTER & FACTORY RESET */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
            <h3 className="font-black text-emerald-400 text-sm">
              Broadcast In-App OTA Update &amp; Production Factory Reset
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={otaForm.version}
                onChange={(e) => setOtaForm({ ...otaForm, version: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
              />
              <input
                type="text"
                value={otaForm.notes}
                onChange={(e) => setOtaForm({ ...otaForm, notes: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextInfo = {
                    ...appUpdateInfo,
                    latestAvailableVersion: otaForm.version.trim(),
                    releaseNotes: otaForm.notes.trim(),
                    updateAvailable: true
                  };
                  setAppUpdateInfo(nextInfo);
                  saveCloudAndLocalState({ appUpdateInfo: nextInfo });
                  if (onBroadcastOtaPushNotification) onBroadcastOtaPushNotification(nextInfo);
                  onTriggerToast(`OTA v${otaForm.version} broadcasted to all devices!`);
                }}
                className="bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
              >
                \uD83D\uDD14 Push OTA v{otaForm.version} Alert to All Devices
              </button>
              <button
                type="button"
                onClick={onWipeAllTestData}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black py-2 rounded-xl cursor-pointer"
              >
                \uD83E\uDDF9 1-Click Wipe Test Orders &amp; Queues
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: LIVE GPS LOCATOR & INSPECTOR
      ===================================================================== */}
      {founderTab === "live_locator" && (
        <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="font-black text-emerald-400 text-sm">
              \uD83D\uDCE1 Real-Time User &amp; Partner GPS Locator ({unifiedDirectory.length} Entities)
            </h3>
            <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black">
              Active Devices: {liveTelemetryList.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              value={locatorSearch}
              onChange={(e) => setLocatorSearch(e.target.value)}
              placeholder="Search by Name, Mobile, Address, or Role..."
              className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
            <select
              value={locatorRoleFilter}
              onChange={(e) => setLocatorRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-amber-300 font-bold"
            >
              <option value="ALL">All Roles ({unifiedDirectory.length})</option>
              <option value="customer">1. Customers / Guests</option>
              <option value="merchant">2. Product Merchants</option>
              <option value="service_provider">3. Service Providers</option>
              <option value="decorator">4. Decorators &amp; Halls</option>
              <option value="rider">5. Delivery Captains</option>
            </select>
          </div>

          {selectedInspectEntity && (
            <div className="bg-slate-950 border-2 border-amber-400 rounded-2xl p-4 space-y-2.5">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-black text-amber-300">
                  {selectedInspectEntity.name} ({selectedInspectEntity.phone})
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedInspectEntity(null)}
                  className="bg-slate-800 text-rose-300 px-2.5 py-1 rounded-lg font-black cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono overflow-x-auto max-h-40">
                <pre>{JSON.stringify(selectedInspectEntity.rawRecord, null, 2)}</pre>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredDirectory.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl border bg-slate-950 border-slate-800 flex flex-wrap justify-between items-center gap-2"
              >
                <div>
                  <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded text-[9px] font-black uppercase mr-2">
                    {item.role}
                  </span>
                  <strong className="text-white">{item.name}</strong> ({item.phone})
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {item.address} | GPS: {item.lat}, {item.lng} | Battery: {item.batteryPct}%
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedInspectEntity(item)}
                    className="bg-indigo-500 text-white font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
                  >
                    Inspect Data
                  </button>
                  <a
                    href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[10px]"
                  >
                    Map Pin
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 6: TELEMETRY, ZONAL KILL-SWITCHES & PUSH BLASTER
      ===================================================================== */}
      {founderTab === "telemetry" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400">Total Town GMV</p>
              <p className="text-xl font-black text-emerald-400 mt-1">
                Rs.{totalGmv.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400">5% GST Collected</p>
              <p className="text-xl font-black text-teal-300 mt-1">
                Rs.{totalGst.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400">Platform Revenue</p>
              <p className="text-xl font-black text-amber-400 mt-1">
                Rs.{platformRevenue.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400">Active Store Items</p>
              <p className="text-xl font-black text-purple-400 mt-1">{safeProducts.length}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-amber-400 text-sm">
              Zonal Category Kill-Switches
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {safeGeoZones.map((zone) => {
                const killed = killedCategoriesByZone?.[zone.id] || [];
                return (
                  <div
                    key={zone.id}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2"
                  >
                    <p className="font-bold text-emerald-400">
                      {zone.name} ({zone.radiusKm}km radius)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["daily_needs", "veg_fruits", "construction", "medicines", "services", "taxi"].map(
                        (cId) => (
                          <button
                            key={cId}
                            type="button"
                            onClick={() => {
                              const updated = killed.includes(cId)
                                ? killed.filter((x) => x !== cId)
                                : [...killed, cId];
                              const nextKilled = {
                                ...killedCategoriesByZone,
                                [zone.id]: updated
                              };
                              setKilledCategoriesByZone(nextKilled);
                              saveCloudAndLocalState({ killedCategoriesByZone: nextKilled });
                              onTriggerToast(`Updated ${cId} in ${zone.name}`);
                            }}
                            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                              killed.includes(cId)
                                ? "bg-rose-600 text-white"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {cId}: {killed.includes(cId) ? "PAUSED" : "ACTIVE"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-teal-500/40 rounded-2xl p-4 space-y-2.5">
            <h3 className="font-black text-teal-300 text-sm">Town Push Notification Blaster</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                type="text"
                value={pushBlast.title}
                onChange={(e) => setPushBlast({ ...pushBlast, title: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <input
                type="text"
                value={pushBlast.message}
                onChange={(e) => setPushBlast({ ...pushBlast, message: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                onTriggerToast(`Broadcasted Push Alert: "${pushBlast.title}"!`)
              }
              className="w-full bg-teal-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
            >
              Broadcast Push Notification &rarr;
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 7: 3-TIER GEO / STATE / BRAND ADS
      ===================================================================== */}
      {founderTab === "geo_ads" && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-3">
          <h3 className="font-black text-amber-400 text-sm">
            3-Tier Geo-Targeted Ad Engine (1st: Local Geo &rarr; 2nd: State &rarr; 3rd: Brand Ads)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select
              value={newAdForm.tier}
              onChange={(e) => setNewAdForm({ ...newAdForm, tier: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
            >
              <option value="GEO_LOCAL">Priority 1: Local Geo-Location Ad (Town/Mandal)</option>
              <option value="STATE_LEVEL">Priority 2: State Level Ad (Telangana)</option>
              <option value="BRAND_NATIONAL">Priority 3: National Brand Ad</option>
            </select>
            <input
              type="text"
              value={newAdForm.regionLabel}
              onChange={(e) => setNewAdForm({ ...newAdForm, regionLabel: e.target.value })}
              placeholder="Region Label"
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
          </div>
          <input
            type="text"
            value={newAdForm.title}
            onChange={(e) => setNewAdForm({ ...newAdForm, title: e.target.value })}
            placeholder="Ad Headline"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newAdForm.subtitle}
              onChange={(e) => setNewAdForm({ ...newAdForm, subtitle: e.target.value })}
              placeholder="Ad Subtitle"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
            <label className="bg-slate-800 border border-amber-400/50 text-amber-300 font-black px-3 py-2 rounded-xl cursor-pointer">
              Ad Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleImageFileRead(e, (url) => setNewAdForm({ ...newAdForm, image: url }))
                }
                className="hidden"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!newAdForm.title.trim()) return;
              const nextAds = [{ id: `ad_${Date.now()}`, ...newAdForm }, ...safeGeoAds];
              setGeoAds(nextAds);
              saveCloudAndLocalState({ geoAds: nextAds });
              setNewAdForm({ ...newAdForm, title: "", subtitle: "" });
              onTriggerToast("Published Targeted Ad Campaign!");
            }}
            className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
          >
            Publish Targeted Ad Campaign &rarr;
          </button>
          <div className="space-y-2 pt-2">
            {safeGeoAds.map((ad) => (
              <div
                key={ad.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center gap-2"
              >
                <div className="flex items-center gap-2.5">
                  {ad.image && (
                    <img
                      src={ad.image}
                      alt={ad.title}
                      className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                    />
                  )}
                  <div>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded">
                      {ad.tier} &bull; {ad.regionLabel}
                    </span>
                    <p className="font-bold text-white mt-0.5">{ad.title}</p>
                    <p className="text-[10px] text-slate-400">{ad.subtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextAds = safeGeoAds.filter((x) => x.id !== ad.id);
                    setGeoAds(nextAds);
                    saveCloudAndLocalState({ geoAds: nextAds });
                  }}
                  className="bg-rose-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 8: COMMISSIONS & SILENT BACKEND MONETIZATION ENGINE
      ===================================================================== */}
      {founderTab === "monetization" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-emerald-400 text-sm">
              Town Commission Governance Sliders
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <p className="font-bold">Merchant Commission: {merchantCommissionPct}%</p>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={merchantCommissionPct}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMerchantCommissionPct(v);
                    saveCloudAndLocalState({ merchantCommissionPct: v });
                  }}
                  className="w-full mt-2 accent-emerald-400"
                />
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <p className="font-bold">Consumer Platform Fee: {consumerFeePct}%</p>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={consumerFeePct}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setConsumerFeePct(v);
                    saveCloudAndLocalState({ consumerFeePct: v });
                  }}
                  className="w-full mt-2 accent-emerald-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-amber-400 text-sm">
              Silent Backend Monetization Engine
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="text-[10px] text-slate-400 block">
                  Global Checkout Surcharge (Rs.)
                </label>
                <input
                  type="number"
                  value={monetizationConfig?.globalPlatformFee || 0}
                  onChange={(e) => {
                    const next = {
                      ...monetizationConfig,
                      globalPlatformFee: Number(e.target.value) || 0
                    };
                    setMonetizationConfig(next);
                    saveCloudAndLocalState({ monetizationConfig: next });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white mt-1"
                />
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="text-[10px] text-slate-400 block">
                  Service Booking Surcharge (Rs.)
                </label>
                <input
                  type="number"
                  value={monetizationConfig?.serviceBookingSurcharge || 0}
                  onChange={(e) => {
                    const next = {
                      ...monetizationConfig,
                      serviceBookingSurcharge: Number(e.target.value) || 0
                    };
                    setMonetizationConfig(next);
                    saveCloudAndLocalState({ monetizationConfig: next });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white mt-1"
                />
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="text-[10px] text-slate-400 block">
                  Per-Product Surcharge (Rs.)
                </label>
                <input
                  type="number"
                  value={monetizationConfig?.productSpecificFee || 0}
                  onChange={(e) => {
                    const next = {
                      ...monetizationConfig,
                      productSpecificFee: Number(e.target.value) || 0
                    };
                    setMonetizationConfig(next);
                    saveCloudAndLocalState({ monetizationConfig: next });
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 9: MULTI-PHONE LIVE TESTING SANDBOX & 1-CLICK FLOW TESTER
      ===================================================================== */}
      {founderTab === "testing" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div>
                <h3 className="font-black text-emerald-400 text-sm">
                  Multi-Phone Side-by-Side Testing Array ({safeSplitScreens.length} Phones)
                </h3>
                <p className="text-slate-300 text-[11px]">
                  Open 4, 5, or more phones side-by-side to test Customer, Merchant, Service Provider, Decorator, and Captain syncing live.
                </p>
              </div>
              <button
                type="button"
                onClick={onLaunchMultiPhoneView}
                className="bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl cursor-pointer shadow"
              >
                Launch {safeSplitScreens.length}-Phone Live View &rarr;
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {safeSplitScreens.map((phone, idx) => (
                <div
                  key={phone.id || idx}
                  className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 relative"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSplitScreens(safeSplitScreens.filter((_, i) => i !== idx))
                    }
                    className="absolute top-1 right-2 text-rose-400 font-bold cursor-pointer"
                  >
                    X
                  </button>
                  <p className="text-[9px] text-slate-400">Phone #{idx + 1}</p>
                  <p className="font-extrabold text-emerald-300 uppercase text-[10px]">
                    {phone.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { id: "permissions_gate", title: "1. Peace-of-Mind Permissions Gateway" },
              { id: "auth_vault", title: "2. Security, KYC, PDF/Camera Docs & Digital Sign Vault" },
              { id: "cust_stores", title: "3. Customer App: Stores, Multi-Shop Buy Box & Variants" },
              { id: "cust_services", title: "4. Customer App: Service Category Grid & 1-Hr Slots" },
              { id: "cust_decor", title: "5. Customer App: 3-Page Decor Reverse-Bidding & Halls" },
              { id: "cust_taxi", title: "6. Customer App: Bike Taxi, 3W Auto & P2P Parcel" },
              { id: "cust_carts", title: "7. Customer App: 4 Isolated Module Carts & UPI Chooser" },
              { id: "cust_orders", title: "8. Customer App: Orders Timeline, PDF Invoice & Voice Review" },
              { id: "portal_merchant", title: "9. Portal 2: Product Merchant (Queue, Heavy/Labor Bill, Stock)" },
              { id: "portal_service", title: "10. Portal 3: Service Provider (Visits, 1-Hr Slots, Rate Card)" },
              { id: "portal_decorator", title: "11. Portal 4: Decorator & Halls (Calendar, Bids, 35%|85%)" },
              { id: "portal_rider", title: "12. Portal 5: Delivery Captain (Radar, 3-Pt Map, Km Rate, 9AM)" }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onTeleportToScreen && onTeleportToScreen(f.id)}
                className="p-3 bg-slate-950 border border-slate-800 hover:border-emerald-400 rounded-xl text-left font-bold text-emerald-300 cursor-pointer"
              >
                {f.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#04090e] text-slate-100 flex flex-col font-sans text-xs">
      <header className="bg-slate-900 border-b border-emerald-500/40 px-5 py-3 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <label className="w-10 h-10 rounded-full border-2 border-amber-400 bg-emerald-950 flex items-center justify-center text-[8px] font-black text-amber-300 overflow-hidden cursor-pointer">
            {founderLogoUrl ? (
              <img src={founderLogoUrl} alt="WE4ALL" className="w-full h-full object-cover" />
            ) : (
              "WE4ALL"
            )}
            {onUploadFounderPhoto && (
              <input
                type="file"
                accept="image/*"
                onChange={onUploadFounderPhoto}
                className="hidden"
              />
            )}
          </label>
          <div>
            <h1 className="text-sm font-black text-white">
              WE4ALL Founder Master Admin Suite (Ultimate Control)
            </h1>
            <p className="text-[10px] text-emerald-400">
              All-Sector Approvals &bull; 8-Table Visual &amp; JSON DB &bull; Dynamic Admin Credentials &bull; Live Cloud Sync
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setAdminDisplayMode(adminDisplayMode === "web" ? "mobile_admin" : "web")
            }
            className="bg-slate-800 border border-emerald-400/40 text-emerald-300 font-black px-3 py-1.5 rounded-xl cursor-pointer"
          >
            {adminDisplayMode === "web"
              ? "\uD83D\uDCF1 Switch to Mobile Admin App"
              : "\uD83D\uDDA5\uFE0F Switch to Web Console"}
          </button>
          <button
            type="button"
            onClick={onExitAdminToApp}
            className="bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl cursor-pointer"
          >
            Exit to Consumer App
          </button>
        </div>
      </header>

      {adminDisplayMode === "web" ? (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-5">
          <aside className="space-y-1.5">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFounderTab(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  founderTab === tab.id
                    ? "bg-emerald-500/15 border-emerald-400 text-emerald-300"
                    : "bg-slate-900/80 border-slate-800 text-slate-400"
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                  {tab.badge}
                </span>
              </button>
            ))}
          </aside>
          <main className="lg:col-span-3">{renderAdminContent()}</main>
        </div>
      ) : (
        <div className="flex-1 flex justify-center p-4">
          <div className="w-full max-w-[415px] bg-[#071318] border-[7px] border-slate-800 rounded-[44px] shadow-2xl overflow-hidden flex flex-col max-h-[840px]">
            <div className="bg-purple-950 px-4 py-2.5 flex justify-between items-center border-b border-purple-800">
              <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded">
                MOBILE ADMIN APP
              </span>
              <span className="text-[10px] text-purple-200 font-bold">On-the-Go Governance</span>
            </div>
            <div className="flex gap-1 overflow-x-auto p-2 bg-slate-950 border-b border-slate-800 shrink-0">
              {ADMIN_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFounderTab(tab.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black shrink-0 cursor-pointer ${
                    founderTab === tab.id
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-slate-900 text-slate-400"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3">{renderAdminContent()}</div>
          </div>
        </div>
      )}

      {/* VISUAL RECORD EDITOR MODAL (CHANGE NAME, CATEGORY, BRAND, PRICE, STATUS & PHOTO) */}
      {visualEditItem && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-400 rounded-3xl max-w-md w-full p-5 space-y-3">
            <h4 className="font-black text-emerald-400 text-sm">
              Visual Record &amp; Image Editor ({visualEditItem.table.toUpperCase()})
            </h4>

            <div>
              <label className="text-[10px] text-slate-400 block">
                Display Name / Brand Title
              </label>
              <input
                type="text"
                value={
                  visualEditItem.record.subCategoryBrand ||
                  visualEditItem.record.businessName ||
                  visualEditItem.record.providerName ||
                  visualEditItem.record.fullName ||
                  visualEditItem.record.name ||
                  ""
                }
                onChange={(e) => {
                  const val = e.target.value;
                  const rec = { ...visualEditItem.record };
                  if ("subCategoryBrand" in rec) rec.subCategoryBrand = val;
                  else if ("businessName" in rec) rec.businessName = val;
                  else if ("providerName" in rec) rec.providerName = val;
                  else if ("fullName" in rec) rec.fullName = val;
                  else rec.name = val;
                  setVisualEditItem({ ...visualEditItem, record: rec });
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
              />
            </div>

            {visualEditItem.table === "stock" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block">Category ID</label>
                  <select
                    value={visualEditItem.record.categoryId || "daily_needs"}
                    onChange={(e) =>
                      setVisualEditItem({
                        ...visualEditItem,
                        record: { ...visualEditItem.record, categoryId: e.target.value }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    {safeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Shop Name</label>
                  <input
                    type="text"
                    value={visualEditItem.record.shopName || ""}
                    onChange={(e) =>
                      setVisualEditItem({
                        ...visualEditItem,
                        record: { ...visualEditItem.record, shopName: e.target.value }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Selling Price (Rs.)</label>
                  <input
                    type="number"
                    value={
                      visualEditItem.record.variants?.[0]?.price ??
                      visualEditItem.record.price ??
                      0
                    }
                    onChange={(e) => {
                      const p = Number(e.target.value) || 0;
                      const rec = { ...visualEditItem.record, price: p };
                      if (Array.isArray(rec.variants) && rec.variants.length > 0) {
                        rec.variants = rec.variants.map((v, idx) =>
                          idx === 0 ? { ...v, price: p } : v
                        );
                      }
                      setVisualEditItem({ ...visualEditItem, record: rec });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-emerald-300 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Stock Quantity</label>
                  <input
                    type="number"
                    value={visualEditItem.record.stockQty ?? 50}
                    onChange={(e) =>
                      setVisualEditItem({
                        ...visualEditItem,
                        record: {
                          ...visualEditItem.record,
                          stockQty: Number(e.target.value) || 0
                        }
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 block">
                Image URL or Upload New Image
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={visualEditItem.record.image || ""}
                  onChange={(e) =>
                    setVisualEditItem({
                      ...visualEditItem,
                      record: { ...visualEditItem.record, image: e.target.value }
                    })
                  }
                  placeholder="https://..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
                <label className="bg-slate-800 border border-amber-400 text-amber-300 px-3 py-2 rounded-xl font-black cursor-pointer">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageFileRead(e, (url) =>
                        setVisualEditItem({
                          ...visualEditItem,
                          record: { ...visualEditItem.record, image: url }
                        })
                      )
                    }
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVisualEditItem(null)}
                className="flex-1 bg-slate-800 py-2 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const list = [...getCurrentDbList()];
                  list[visualEditItem.index] = visualEditItem.record;
                  updateCurrentDbList(list);
                  setVisualEditItem(null);
                  onTriggerToast("Record updated & synced to Cloud Server!");
                }}
                className="flex-1 bg-emerald-400 text-slate-950 py-2 rounded-xl font-black cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL FOR ALL SECTORS */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500 rounded-3xl max-w-sm w-full p-4 space-y-3">
            <h4 className="font-bold text-rose-400">
              Select Rejection Reason ({String(rejectModal.partnerType || "").toUpperCase()})
            </h4>
            <select
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            >
              {(REJECTION_REASONS || ["Incomplete KYC Proof", "Incorrect Category"]).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <textarea
              value={rejectModal.comment}
              onChange={(e) => setRejectModal({ ...rejectModal, comment: e.target.value })}
              placeholder="Founder comment for correction..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextRejected = [
                    ...safeRejectedItems,
                    {
                      ...rejectModal.item,
                      rejectReason: rejectModal.reason,
                      rejectComment: rejectModal.comment || "Please correct and resubmit"
                    }
                  ];
                  setRejectedItems(nextRejected);

                  if (rejectModal.partnerType === "captain") {
                    const next = safePendingRiders.filter((i) => i.id !== rejectModal.item.id);
                    setPendingRiders(next);
                    saveCloudAndLocalState({ pendingRiders: next, rejectedItems: nextRejected });
                  } else if (rejectModal.partnerType === "decorator") {
                    const next = safePendingDecorators.filter(
                      (i) => i.id !== rejectModal.item.id
                    );
                    setPendingDecorators(next);
                    saveCloudAndLocalState({
                      pendingDecorators: next,
                      rejectedItems: nextRejected
                    });
                  } else if (rejectModal.partnerType === "service_provider") {
                    const next = safePendingServices.filter(
                      (i) => i.id !== rejectModal.item.id
                    );
                    setPendingServiceProviders(next);
                    saveCloudAndLocalState({
                      pendingServiceProviders: next,
                      rejectedItems: nextRejected
                    });
                  } else if (rejectModal.partnerType === "merchant") {
                    const next = safePendingMerchants.filter(
                      (i) => i.id !== rejectModal.item.id
                    );
                    setPendingMerchants(next);
                    saveCloudAndLocalState({
                      pendingMerchants: next,
                      rejectedItems: nextRejected
                    });
                  } else {
                    const next = safePendingBrands.filter((i) => i.id !== rejectModal.item.id);
                    setPendingSubCategories(next);
                    saveCloudAndLocalState({
                      pendingSubCategories: next,
                      rejectedItems: nextRejected
                    });
                  }

                  setRejectModal({
                    open: false,
                    item: null,
                    partnerType: "brand",
                    reason: (REJECTION_REASONS || [])[0] || "Incomplete KYC",
                    comment: ""
                  });
                  onTriggerToast("Rejected with reason & logged!");
                }}
                className="flex-1 bg-rose-600 text-white py-2 rounded-xl font-bold cursor-pointer"
              >
                Confirm Reject
              </button>
              <button
                type="button"
                onClick={() =>
                  setRejectModal({
                    open: false,
                    item: null,
                    partnerType: "brand",
                    reason: (REJECTION_REASONS || [])[0] || "Incomplete KYC",
                    comment: ""
                  })
                }
                className="flex-1 bg-slate-800 text-slate-300 py-2 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RAW JSON DATABASE EDITOR MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500 rounded-3xl max-w-xl w-full p-5 space-y-3">
            <h3 className="font-black text-amber-400 text-sm">Master JSON Database Editor</h3>
            <textarea
              value={editingRecord.jsonStr}
              onChange={(e) => setEditingRecord({ ...editingRecord, jsonStr: e.target.value })}
              className="w-full h-64 bg-slate-950 text-emerald-300 font-mono text-[11px] p-3 rounded-xl border border-slate-700"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="flex-1 bg-slate-800 py-2 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(editingRecord.jsonStr);
                    const next = [...getCurrentDbList()];
                    next[editingRecord.index] = parsed;
                    updateCurrentDbList(next);
                    setEditingRecord(null);
                    onTriggerToast("Database Record Saved & Synced to Cloud!");
                  } catch (e) {
                    alert("Invalid JSON syntax. Please check commas and quotes.");
                  }
                }}
                className="flex-1 bg-amber-400 text-slate-950 py-2 rounded-xl font-black cursor-pointer"
              >
                Save JSON Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}