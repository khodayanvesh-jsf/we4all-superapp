import React, { useState } from "react";
import { REJECTION_REASONS, GEO_ZONES } from "../data";

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
  onTriggerToast
}) {
  const [adminDisplayMode, setAdminDisplayMode] = useState("web");
  const [founderTab, setFounderTab] = useState("live_locator");
  const [locatorSearch, setLocatorSearch] = useState("");
  const [locatorRoleFilter, setLocatorRoleFilter] = useState("ALL");
  const [selectedInspectEntity, setSelectedInspectEntity] = useState(null);

  const [approvalQueueSubTab, setApprovalQueueSubTab] = useState("captains");
  const [checklistByPartner, setChecklistByPartner] = useState({});
  const [rejectModal, setRejectModal] = useState({
    open: false,
    item: null,
    reason: REJECTION_REASONS[0],
    comment: ""
  });

  const [adminDbTab, setAdminDbTab] = useState("merchants");
  const [editingRecord, setEditingRecord] = useState(null);

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
    subCategories: ["Fresh Bread", "Cakes & Pastries"]
  });

  const [otaForm, setOtaForm] = useState({
    version: appUpdateInfo?.latestAvailableVersion || "3.2.0",
    notes:
      appUpdateInfo?.releaseNotes ||
      "WE4ALL v3.2.0 OTA: All 6 Portals, Crash-Shielded Boundaries, 12 Languages & Account-Only In-App Updater."
  });

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
    (pendingRiders?.length || 0) +
    (pendingDecorators?.length || 0) +
    (pendingServiceProviders?.length || 0) +
    (pendingMerchants?.length || 0) +
    (pendingSubCategories?.length || 0);

  const totalGmv =
    orders.reduce((s, o) => s + Number(o.grandTotal || 0), 0) +
    serviceBookings.reduce(
      (s, b) => s + Number(b.finalServiceBill || b.escrowVisitingAmount || 0),
      0
    ) +
    48500;
  const totalGst = Number((totalGmv * 0.05).toFixed(2));
  const platformRevenue = Number(
    ((totalGmv * (Number(merchantCommissionPct) + Number(consumerFeePct))) / 100).toFixed(2)
  );

  const liveTelemetryList = Object.values(liveDeviceTelemetry || {});
  const unifiedDirectory = [
    ...liveTelemetryList.map((ping) => ({
      id: `LIVE_${ping.deviceId}`,
      name: ping.fullName || "Active Device User",
      role: ping.portal || ping.role || "customer",
      phone: ping.phone || "Live Session",
      upiId: ping.upiId || "-",
      address: ping.address || "Adilabad Town",
      lat: ping.lat || 19.6641,
      lng: ping.lng || 78.5320,
      accuracyMeters: ping.accuracyMeters || 8,
      batteryPct: ping.batteryPct ?? 100,
      networkType: ping.networkType || "5G/WIFI",
      isLiveStream: true,
      rawRecord: ping
    })),
    ...registeredUsers.map((u) => ({
      id: `USR_${u.id}`,
      name: u.fullName,
      role: u.role || "customer",
      phone: u.phone,
      upiId: u.upiId || "-",
      address: u.area || "Adilabad Town",
      lat: u.lat || 19.6655,
      lng: u.lng || 78.5335,
      accuracyMeters: 10,
      batteryPct: 95,
      networkType: "4G",
      isLiveStream: false,
      rawRecord: u
    })),
    ...merchants.map((m) => ({
      id: `MER_${m.id}`,
      name: m.businessName || m.name,
      role: "merchant",
      phone: m.phone || "9848011101",
      upiId: m.upiId || "merchant@ybl",
      address: m.area || "Main Bazar, Adilabad",
      lat: m.lat || 19.6672,
      lng: m.lng || 78.5318,
      accuracyMeters: 5,
      batteryPct: 100,
      networkType: "WIFI",
      isLiveStream: false,
      rawRecord: m
    })),
    ...serviceProviders.map((sp) => ({
      id: `SRV_${sp.id}`,
      name: sp.providerName || sp.maskedId,
      role: "service_provider",
      phone: sp.phone || "9848022201",
      upiId: sp.upiId || "servicepro@ybl",
      address: sp.area || "Subhash Nagar, Adilabad",
      lat: sp.lat || 19.6631,
      lng: sp.lng || 78.5342,
      accuracyMeters: 10,
      batteryPct: 88,
      networkType: "4G",
      isLiveStream: false,
      rawRecord: sp
    })),
    ...decorators.map((d) => ({
      id: `DEC_${d.id}`,
      name: d.businessName || d.name,
      role: "decorator",
      phone: d.phone || "9848044556",
      upiId: d.upiId || "decorator@ybl",
      address: d.area || "Bypass Road, Adilabad",
      lat: d.lat || 19.6701,
      lng: d.lng || 78.5290,
      accuracyMeters: 10,
      batteryPct: 92,
      networkType: "WIFI",
      isLiveStream: false,
      rawRecord: d
    })),
    ...riders.map((r) => ({
      id: `CAP_${r.id}`,
      name: r.name || r.captainName,
      role: "rider",
      phone: r.phone || "9848055112",
      upiId: r.upiId || "captain@ybl",
      address: "Live Patrol Route, Adilabad",
      lat: r.lat || 19.6648,
      lng: r.lng || 78.5328,
      accuracyMeters: 6,
      batteryPct: 84,
      networkType: "5G",
      isLiveStream: false,
      rawRecord: r
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
    { id: "live_locator", label: "1. Live GPS Locator & Inspector", badge: `${unifiedDirectory.length}` },
    { id: "telemetry", label: "2. Telemetry, Kill-Switches & Push", badge: "God-Mode" },
    { id: "geo_ads", label: "3. 3-Tier Geo / State / Brand Ads", badge: `${geoAds.length} Ads` },
    { id: "approvals", label: "4. 5-Point Checklists & Brands", badge: `${totalPendingCount} Pending` },
    { id: "categories", label: "5. Dynamic Category & Sub-Pills", badge: `${categories.length} Cats` },
    { id: "monetization", label: "6. Commissions & Monetization", badge: `${merchantCommissionPct}%` },
    { id: "testing", label: "7. Multi-Phone Live Sandbox", badge: `${splitScreens.length} Phones` },
    { id: "flow_tester", label: "8. 1-Click Screen Flow Tester", badge: "12 Flows" },
    { id: "database", label: "9. 7-Table DB, OTA & Factory Wipe", badge: "CRUD + OTA" }
  ];

  const renderPartnerApprovalCard = (partner, partnerType) => {
    const chk = checklistByPartner[partner.id] || {};
    const allFiveChecked =
      chk.kycDocVerified &&
      chk.tradeSkillVerified &&
      chk.bankUpiVerified &&
      chk.tcAcceptedVerified &&
      chk.signatureVerified;
    const displayName = partner.captainName || partner.providerName || partner.businessName;

    return (
      <div
        key={partner.id}
        className="bg-slate-950 p-3.5 rounded-2xl border border-teal-400/50 space-y-3"
      >
        <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-800 pb-2">
          <div>
            <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded uppercase">
              Pending Admin Verification ({partnerType.toUpperCase()})
            </span>
            <h4 className="text-sm font-black text-white mt-1">{displayName}</h4>
            <p className="text-[10px] text-slate-300">
              Mobile: <strong>+91 {partner.phone}</strong> | UPI:{" "}
              <strong className="text-emerald-300">{partner.upiId}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => checkAllForPartner(partner.id)}
            className="bg-slate-800 border border-emerald-400/50 text-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black cursor-pointer"
          >
            &#x2713; Check All 5 Items
          </button>
        </div>

        <div className="space-y-1.5">
          {[
            { key: "kycDocVerified", label: "1. Uploaded KYC Document / DL / RC / License Proof Verified" },
            { key: "tradeSkillVerified", label: "2. Category, Rate Card, Portfolio & Vehicle Class Verified" },
            { key: "bankUpiVerified", label: "3. Bank Account & Instant UPI Settlement ID Verified" },
            { key: "tcAcceptedVerified", label: "4. WE4ALL Platform Terms & Conditions Accepted" },
            { key: "signatureVerified", label: "5. Digital Signature / Camera Signature Authenticated" }
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
              status: "Approved",
              isPublished: true,
              isPublishedToPublic: true,
              approvedAt: new Date().toLocaleString()
            };
            if (partnerType === "captain") {
              setRiders([approvedObj, ...riders]);
              setPendingRiders(pendingRiders.filter((x) => x.id !== partner.id));
            } else if (partnerType === "decorator") {
              setDecorators([approvedObj, ...decorators]);
              setPendingDecorators(pendingDecorators.filter((x) => x.id !== partner.id));
            } else if (partnerType === "service_provider") {
              setServiceProviders([approvedObj, ...serviceProviders]);
              setPendingServiceProviders(
                pendingServiceProviders.filter((x) => x.id !== partner.id)
              );
            } else {
              setMerchants([approvedObj, ...merchants]);
              setPendingMerchants(pendingMerchants.filter((x) => x.id !== partner.id));
            }
            onTriggerToast(`Approved & Published "${displayName}" LIVE to Public Market!`);
          }}
          className={`w-full font-black py-2.5 rounded-xl text-xs ${
            allFiveChecked
              ? "bg-emerald-400 text-slate-950 cursor-pointer shadow-lg"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {allFiveChecked
            ? `\u2713 Approve & Publish ${displayName} Live to Market`
            : "Complete All 5 Checklist Items Above to Approve"}
        </button>
      </div>
    );
  };

  const renderAdminContent = () => (
    <div className="space-y-4 text-xs">
      {/* TAB 1: LIVE GPS LOCATOR */}
      {founderTab === "live_locator" && (
        <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div>
              <h3 className="font-black text-emerald-400 text-sm">
                \uD83D\uDCE1 Real-Time User &amp; Partner GPS Locator &amp; Full Data Inspector
              </h3>
              <p className="text-[11px] text-slate-300">
                Inspect live GPS coordinates, battery/network telemetry, and KYC records for any user or partner.
              </p>
            </div>
            <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black">
              Live Stream ({liveTelemetryList.length} Active Devices)
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
                    Inspect JSON
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

      {/* TAB 2: TELEMETRY, ZONAL KILL-SWITCHES & PUSH BLAST */}
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
              <p className="text-slate-400">Live Products</p>
              <p className="text-xl font-black text-purple-400 mt-1">{products.length}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-amber-400 text-sm">
              Zonal Category Kill-Switches &amp; Surge Controls
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {geoZones.map((zone) => {
                const killed = killedCategoriesByZone[zone.id] || [];
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
                              setKilledCategoriesByZone({
                                ...killedCategoriesByZone,
                                [zone.id]: updated
                              });
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

      {/* TAB 3: 3-TIER GEO / STATE / BRAND ADS */}
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
          <input
            type="text"
            value={newAdForm.subtitle}
            onChange={(e) => setNewAdForm({ ...newAdForm, subtitle: e.target.value })}
            placeholder="Ad Subtitle"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
          />
          <button
            type="button"
            onClick={() => {
              if (!newAdForm.title.trim()) return;
              setGeoAds([{ id: `ad_${Date.now()}`, ...newAdForm }, ...geoAds]);
              setNewAdForm({ ...newAdForm, title: "", subtitle: "" });
              onTriggerToast("Published Targeted Ad Campaign!");
            }}
            className="w-full bg-amber-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
          >
            Publish Targeted Ad Campaign &rarr;
          </button>
          <div className="space-y-2 pt-2">
            {geoAds.map((ad) => (
              <div
                key={ad.id}
                className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center"
              >
                <div>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded">
                    {ad.tier} &bull; {ad.regionLabel}
                  </span>
                  <p className="font-bold text-white mt-1">{ad.title}</p>
                  <p className="text-[10px] text-slate-400">{ad.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGeoAds(geoAds.filter((x) => x.id !== ad.id))}
                  className="bg-rose-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PARTNER 5-POINT CHECKLISTS & BRAND SUB-CATEGORIES */}
      {founderTab === "approvals" && (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            {[
              { id: "captains", label: `Captains (${pendingRiders.length})` },
              { id: "decorators_halls", label: `Decor (${pendingDecorators.length})` },
              { id: "service_providers", label: `Services (${pendingServiceProviders.length})` },
              { id: "merchants", label: `Shops (${pendingMerchants.length})` },
              { id: "brands", label: `Brands (${pendingSubCategories.length})` }
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setApprovalQueueSubTab(sub.id)}
                className={`py-2 rounded-xl font-black text-[10px] cursor-pointer ${
                  approvalQueueSubTab === sub.id
                    ? "bg-emerald-400 text-slate-950"
                    : "text-slate-400"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            {approvalQueueSubTab === "captains" &&
              (pendingRiders.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No pending Delivery Captains.</p>
              ) : (
                pendingRiders.map((r) => renderPartnerApprovalCard(r, "captain"))
              ))}
            {approvalQueueSubTab === "decorators_halls" &&
              (pendingDecorators.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No pending Decorators or Halls.</p>
              ) : (
                pendingDecorators.map((d) => renderPartnerApprovalCard(d, "decorator"))
              ))}
            {approvalQueueSubTab === "service_providers" &&
              (pendingServiceProviders.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No pending Service Providers.</p>
              ) : (
                pendingServiceProviders.map((sp) =>
                  renderPartnerApprovalCard(sp, "service_provider")
                )
              ))}
            {approvalQueueSubTab === "merchants" &&
              (pendingMerchants.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No pending Product Merchants.</p>
              ) : (
                pendingMerchants.map((m) => renderPartnerApprovalCard(m, "merchant"))
              ))}
            {approvalQueueSubTab === "brands" &&
              (pendingSubCategories.length === 0 ? (
                <p className="text-slate-400 text-center py-4">
                  No pending Brand Sub-Categories. Submit a new brand from the Merchant Portal to test!
                </p>
              ) : (
                pendingSubCategories.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-950 p-3.5 rounded-2xl border border-amber-400/50 flex justify-between items-center gap-3"
                  >
                    <div>
                      <p className="font-black text-white text-sm">{item.subCategoryBrand}</p>
                      <p className="text-[10px] text-slate-400">
                        Shop: {item.shopName} | Category: {item.categoryId}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProducts([
                            ...products,
                            { ...item, status: "approved", isPublished: true, inStock: true }
                          ]);
                          setPendingSubCategories(
                            pendingSubCategories.filter((i) => i.id !== item.id)
                          );
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
                            reason: REJECTION_REASONS[0],
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
          </div>
        </div>
      )}

      {/* TAB 5: DYNAMIC CATEGORY & SUB-CATEGORY PILL BUILDER */}
      {founderTab === "categories" && (
        <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-4 space-y-3">
          <h3 className="font-black text-purple-300 text-sm">
            Dynamic Category, Sub-Category Pills &amp; Future Module Builder (Auto-Creates Isolated Cart)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              value={newCatForm.icon}
              onChange={(e) => setNewCatForm({ ...newCatForm, icon: e.target.value })}
              placeholder="Emoji Icon"
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white text-center"
            />
            <input
              type="text"
              value={newCatForm.name}
              onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
              placeholder="Category Name (e.g. Fresh Bakery / Agri Seeds)"
              className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
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
              + Pill
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
              setCategories([
                ...categories,
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
                  image:
                    "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80"
                }
              ]);
              setCategoryCarts({ ...categoryCarts, [newId]: [] });
              setNewCatForm({ ...newCatForm, name: "" });
              onTriggerToast("Launched new Category with dedicated Isolated Cart!");
            }}
            className="w-full bg-purple-500 text-white font-black py-2.5 rounded-xl cursor-pointer"
          >
            + Launch Dynamic Category &amp; Isolated Cart
          </button>
        </div>
      )}

      {/* TAB 6: COMMISSIONS & SILENT BACKEND MONETIZATION ENGINE */}
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
                  max="10"
                  step="0.5"
                  value={merchantCommissionPct}
                  onChange={(e) => setMerchantCommissionPct(Number(e.target.value))}
                  className="w-full mt-2 accent-emerald-400"
                />
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <p className="font-bold">Consumer Platform Fee: {consumerFeePct}%</p>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={consumerFeePct}
                  onChange={(e) => setConsumerFeePct(Number(e.target.value))}
                  className="w-full mt-2 accent-emerald-400"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-amber-400 text-sm">
              Silent Backend Monetization Engine (Zero User Pre-Notice Required)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="text-[10px] text-slate-400 block">
                  Global Checkout Surcharge (Rs.)
                </label>
                <input
                  type="number"
                  value={monetizationConfig.globalPlatformFee || 0}
                  onChange={(e) =>
                    setMonetizationConfig({
                      ...monetizationConfig,
                      globalPlatformFee: Number(e.target.value) || 0
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white mt-1"
                />
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="text-[10px] text-slate-400 block">
                  Service Booking Surcharge (Rs.)
                </label>
                <input
                  type="number"
                  value={monetizationConfig.serviceBookingSurcharge || 0}
                  onChange={(e) =>
                    setMonetizationConfig({
                      ...monetizationConfig,
                      serviceBookingSurcharge: Number(e.target.value) || 0
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white mt-1"
                />
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <label className="text-[10px] text-slate-400 block">
                  Per-Product Surcharge (Rs.)
                </label>
                <input
                  type="number"
                  value={monetizationConfig.productSpecificFee || 0}
                  onChange={(e) =>
                    setMonetizationConfig({
                      ...monetizationConfig,
                      productSpecificFee: Number(e.target.value) || 0
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white mt-1"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: MULTI-PHONE LIVE TESTING SANDBOX */}
      {founderTab === "testing" && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-emerald-400 text-sm">
                Multi-Phone Side-by-Side Testing Array ({splitScreens.length} Phones)
              </h3>
              <p className="text-slate-300 text-[11px]">
                Add or remove phones and watch Customer, Merchant, Service Provider, Decorator, and Captain sync live.
              </p>
            </div>
            <button
              type="button"
              onClick={onLaunchMultiPhoneView}
              className="bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl cursor-pointer shadow"
            >
              Launch {splitScreens.length}-Phone View &rarr;
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {splitScreens.map((phone, idx) => (
              <div
                key={phone.id}
                className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 relative"
              >
                <button
                  type="button"
                  onClick={() =>
                    setSplitScreens(splitScreens.filter((_, i) => i !== idx))
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
      )}

      {/* TAB 8: 1-CLICK SCREEN FLOW TESTER */}
      {founderTab === "flow_tester" && (
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
              onClick={() => onTeleportToScreen(f.id)}
              className="p-3 bg-slate-950 border border-slate-800 hover:border-emerald-400 rounded-xl text-left font-bold text-emerald-300 cursor-pointer"
            >
              {f.title}
            </button>
          ))}
        </div>
      )}

      {/* TAB 9: 7-TABLE MASTER DATABASE EDITOR + OTA BROADCASTER + 1-CLICK FACTORY WIPE */}
      {founderTab === "database" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border-2 border-emerald-400 rounded-2xl p-4 space-y-2.5">
            <h3 className="font-black text-emerald-400 text-sm">
              Broadcast In-App OTA Update (Notifies Bell Icon &amp; Installs in Account Section)
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
                if (onBroadcastOtaPushNotification) onBroadcastOtaPushNotification(nextInfo);
              }}
              className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
            >
              \uD83D\uDD14 Push OTA v{otaForm.version} Alert to Bell Icon &amp; Account Section
            </button>
          </div>

          <div className="bg-slate-900 border-2 border-rose-500/60 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="font-black text-rose-400 text-sm">
                1-Click Production Factory Reset (Online Supabase + Offline Device)
              </h3>
              <p className="text-slate-300 text-[11px]">
                Permanently clears all test orders, test bookings, test radar jobs, and test queues.
              </p>
            </div>
            <button
              type="button"
              onClick={onWipeAllTestData}
              className="bg-rose-600 hover:bg-rose-500 text-white font-black px-4 py-2.5 rounded-xl cursor-pointer shadow"
            >
              \uD83E\uDDF9 Wipe All Test Data Now
            </button>
          </div>

          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-amber-400 text-sm">
              7-Table Classified Master Database Editor (Full Root CRUD + Raw JSON)
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "merchants", label: `1. Merchants (${merchants.length})` },
                { id: "users", label: `2. Users (${registeredUsers.length})` },
                { id: "catalog", label: `3. Products (${products.length})` },
                { id: "service_providers", label: `4. Service Pros (${serviceProviders.length})` },
                { id: "decorators", label: `5. Decorators (${decorators.length})` },
                { id: "halls", label: `6. Halls (${functionHalls.length})` },
                { id: "orders", label: `7. Orders (${orders.length})` }
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAdminDbTab(t.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                    adminDbTab === t.id
                      ? "bg-amber-400 text-slate-950"
                      : "bg-slate-950 text-slate-300 border border-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {(adminDbTab === "merchants"
                ? merchants
                : adminDbTab === "users"
                ? registeredUsers
                : adminDbTab === "catalog"
                ? products
                : adminDbTab === "service_providers"
                ? serviceProviders
                : adminDbTab === "decorators"
                ? decorators
                : adminDbTab === "halls"
                ? functionHalls
                : orders
              ).map((rec, idx) => (
                <div
                  key={rec.id || idx}
                  className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-white">
                      {rec.businessName ||
                        rec.fullName ||
                        rec.subCategoryBrand ||
                        rec.providerName ||
                        rec.name ||
                        `Order #${rec.id}`}
                    </p>
                    <p className="text-[10px] text-slate-400">ID: {rec.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingRecord({
                        type: adminDbTab,
                        index: idx,
                        jsonStr: JSON.stringify(rec, null, 2)
                      })
                    }
                    className="bg-amber-400/20 border border-amber-400 text-amber-300 px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    Edit Raw JSON
                  </button>
                </div>
              ))}
            </div>
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
              WE4ALL Founder Master Admin Suite (v3.2.0 Complete)
            </h1>
            <p className="text-[10px] text-emerald-400">
              Web Console + Mobile Admin App &bull; Live GPS Locator &bull; 9 Power Modules
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

      {/* REJECTION REASON MODAL */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500 rounded-3xl max-w-sm w-full p-4 space-y-3">
            <h4 className="font-bold text-rose-400">Select Rejection Reason for Merchant</h4>
            <select
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            >
              {REJECTION_REASONS.map((r) => (
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
                  setRejectedItems([
                    ...rejectedItems,
                    {
                      ...rejectModal.item,
                      rejectReason: rejectModal.reason,
                      rejectComment: rejectModal.comment || "Please correct and resubmit"
                    }
                  ]);
                  setPendingSubCategories(
                    pendingSubCategories.filter((i) => i.id !== rejectModal.item.id)
                  );
                  setRejectModal({
                    open: false,
                    item: null,
                    reason: REJECTION_REASONS[0],
                    comment: ""
                  });
                  onTriggerToast("Brand rejected with reason sent to Merchant!");
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
                    reason: REJECTION_REASONS[0],
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
                    if (editingRecord.type === "merchants") {
                      const next = [...merchants];
                      next[editingRecord.index] = parsed;
                      setMerchants(next);
                    } else if (editingRecord.type === "users") {
                      const next = [...registeredUsers];
                      next[editingRecord.index] = parsed;
                      setRegisteredUsers(next);
                    } else if (editingRecord.type === "catalog") {
                      const next = [...products];
                      next[editingRecord.index] = parsed;
                      setProducts(next);
                    } else if (editingRecord.type === "service_providers") {
                      const next = [...serviceProviders];
                      next[editingRecord.index] = parsed;
                      setServiceProviders(next);
                    } else if (editingRecord.type === "decorators") {
                      const next = [...decorators];
                      next[editingRecord.index] = parsed;
                      setDecorators(next);
                    } else if (editingRecord.type === "halls") {
                      const next = [...functionHalls];
                      next[editingRecord.index] = parsed;
                      setFunctionHalls(next);
                    } else if (editingRecord.type === "orders") {
                      const next = [...orders];
                      next[editingRecord.index] = parsed;
                      setOrders(next);
                    }
                    setEditingRecord(null);
                    onTriggerToast("Database Record Saved!");
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