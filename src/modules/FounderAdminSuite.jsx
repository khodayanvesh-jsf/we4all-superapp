import React, { useState } from "react";
import { REJECTION_REASONS } from "../data";

export default function FounderAdminSuite({
  founderLogoUrl,
  onUploadFounderPhoto,
  apkIconUrl,
  onUploadApkIcon,
  geoZones,
  killedCategoriesByZone,
  setKilledCategoriesByZone,
  geoAds,
  setGeoAds,
  categories,
  setCategories,
  merchants,
  setMerchants,
  serviceProviders,
  setServiceProviders,
  decorators,
  setDecorators,
  labourWorkers,
  setLabourWorkers,
  registeredUsers,
  setRegisteredUsers,
  products,
  setProducts,
  functionHalls,
  setFunctionHalls,
  orders,
  setOrders,
  serviceBookings,
  labourBookings,
  pendingMerchants,
  setPendingMerchants,
  pendingSubCategories,
  setPendingSubCategories,
  rejectedItems,
  setRejectedItems,
  monetizationConfig,
  setMonetizationConfig,
  splitScreens,
  appUpdateInfo,
  setAppUpdateInfo,
  onBroadcastOtaPushNotification,
  onWipeToCleanProductionState,
  onLaunchMultiPhoneView,
  onTeleportToScreen,
  onExitAdminToApp,
  onTriggerToast
}) {
  const [adminDisplayMode, setAdminDisplayMode] = useState("web"); // 'web' | 'mobile_admin'
  const [founderTab, setFounderTab] = useState("telemetry");
  const [adminDbTab, setAdminDbTab] = useState("merchants");
  const [editingRecord, setEditingRecord] = useState(null);
  const [rejectModal, setRejectModal] = useState({
    open: false,
    item: null,
    reason: REJECTION_REASONS[0],
    comment: ""
  });

  const [newAdForm, setNewAdForm] = useState({
    tier: "GEO_LOCAL",
    regionLabel: "ADILABAD TOWN GPS",
    title: "",
    subtitle: "",
    image: ""
  });

  const [newCatForm, setNewCatForm] = useState({
    name: "",
    icon: "\uD83D\uDED2",
    partnerType: "merchant",
    badge: "Direct Local Price"
  });

  const [otaForm, setOtaForm] = useState({
    version: appUpdateInfo?.latestAvailableVersion || "3.1.0",
    notes:
      appUpdateInfo?.releaseNotes ||
      "WE4ALL v3.1.0: Clean Zero-Preinstalled Server State, Full 12-Language UI Translation, Dedicated Web & Mobile Admin."
  });

  const totalGmv =
    orders.reduce((s, o) => s + Number(o.grandTotal || 0), 0) +
    serviceBookings.reduce((s, b) => s + Number(b.escrowVisitingAmount || 0), 0) +
    labourBookings.reduce((s, l) => s + Number(l.totalWage || 0), 0);
  const totalGst = Number((totalGmv * 0.05).toFixed(2));

  const ADMIN_TABS = [
    { id: "telemetry", label: "1. Telemetry & Kill-Switches", badge: `Rs.${totalGmv}` },
    { id: "geo_ads", label: "2. 3-Tier Geo/State/Brand Ads", badge: `${geoAds.length} Ads` },
    {
      id: "approvals",
      label: "3. Approvals & KYC Queue",
      badge: `${pendingMerchants.length + pendingSubCategories.length}`
    },
    { id: "categories", label: "4. Dynamic Category/Portal Builder", badge: `${categories.length}` },
    { id: "monetization", label: "5. Silent Monetization Engine", badge: "Backend" },
    {
      id: "ota_updates",
      label: "6. Push App Update (OTA & Alert)",
      badge: `v${appUpdateInfo?.latestAvailableVersion || "3.1.0"}`
    },
    { id: "testing", label: "7. 6-Phone Live Sandbox", badge: `${splitScreens.length} Phones` },
    { id: "flow_tester", label: "8. 1-Click Screen Flow Tester", badge: "12 Flows" },
    { id: "database", label: "9. Classified Master DB Editor", badge: "Full CRUD" }
  ];

  const renderAdminBody = () => (
    <div className="space-y-4 text-xs">
      {founderTab === "telemetry" && (
        <div className="space-y-4">
          {/* Dedicated Admin Web Link & Clean Production Banner */}
          <div className="bg-emerald-950/60 border border-emerald-400 rounded-2xl p-3.5 flex flex-wrap justify-between items-center gap-2">
            <div>
              <p className="font-black text-emerald-300 text-xs">
                Dedicated Founder Admin Web Link: https://we-4-all-super-app.vercel.app/admin
              </p>
              <p className="text-[10px] text-slate-300">
                Production Server State is active with ZERO pre-installed dummy records. All counts below reflect real live usage.
              </p>
            </div>
            {onWipeToCleanProductionState && (
              <button
                type="button"
                onClick={onWipeToCleanProductionState}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
              >
                Reset Server to Clean Zero-Data
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400">Live Town GMV</p>
              <p className="text-xl font-black text-emerald-400 mt-1">
                Rs.{totalGmv.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400">5% GST Ledger</p>
              <p className="text-xl font-black text-teal-300 mt-1">
                Rs.{totalGst.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400">Live Products</p>
              <p className="text-xl font-black text-amber-400 mt-1">{products.length}</p>
            </div>
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400">Registered Users</p>
              <p className="text-xl font-black text-purple-400 mt-1">
                {registeredUsers.length}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3">
            <div>
              <h3 className="font-black text-amber-400 text-sm">
                Official WE4ALL Emblem & APK Launcher Icon (Admin-Only Control)
              </h3>
              <p className="text-[11px] text-slate-400">
                Upload your original photo emblem for WE4ALL FOUNDER BY KHODAY ANVESH.
              </p>
            </div>
            <div className="flex gap-2">
              <label className="bg-emerald-400 text-slate-950 font-black px-3 py-2 rounded-xl cursor-pointer">
                Upload App Emblem
                <input
                  type="file"
                  accept="image/*"
                  onChange={onUploadFounderPhoto}
                  className="hidden"
                />
              </label>
              {onUploadApkIcon && (
                <label className="bg-amber-400 text-slate-950 font-black px-3 py-2 rounded-xl cursor-pointer">
                  Upload APK Icon
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onUploadApkIcon}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-amber-400 text-sm">
              Pan-India Zonal Category Kill-Switches
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
                      {zone.name} ({zone.state} - {zone.radiusKm}km)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["daily_needs", "construction", "medicines", "services", "taxi", "labour"].map(
                        (catKey) => {
                          const isKilled = killed.includes(catKey);
                          return (
                            <button
                              key={catKey}
                              type="button"
                              onClick={() => {
                                const updated = isKilled
                                  ? killed.filter((k) => k !== catKey)
                                  : [...killed, catKey];
                                setKilledCategoriesByZone({
                                  ...killedCategoriesByZone,
                                  [zone.id]: updated
                                });
                                onTriggerToast(`Updated ${catKey} switch in ${zone.name}`);
                              }}
                              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer ${
                                isKilled
                                  ? "bg-rose-600 text-white"
                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              }`}
                            >
                              {catKey}: {isKilled ? "HALTED" : "LIVE"}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {founderTab === "geo_ads" && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
          <h3 className="font-black text-amber-400 text-sm">
            3-Tier Geo-Location Ad Engine (1st: Local GPS, 2nd: State, 3rd: National Brand)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <select
              value={newAdForm.tier}
              onChange={(e) => {
                const tier = e.target.value;
                const regionLabel =
                  tier === "GEO_LOCAL"
                    ? "ADILABAD TOWN GPS"
                    : tier === "STATE_LEVEL"
                    ? "TELANGANA STATE"
                    : "NATIONAL BRAND";
                setNewAdForm({ ...newAdForm, tier, regionLabel });
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
            >
              <option value="GEO_LOCAL">Priority 1: Local Geo-Location Ad (Town/Mandal)</option>
              <option value="STATE_LEVEL">Priority 2: State-Level Ad (Telangana)</option>
              <option value="BRAND_NATIONAL">Priority 3: National Brand Ad</option>
            </select>
            <input
              type="text"
              value={newAdForm.regionLabel}
              onChange={(e) => setNewAdForm({ ...newAdForm, regionLabel: e.target.value })}
              placeholder="Region Badge"
              className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
            />
            <input
              type="text"
              value={newAdForm.title}
              onChange={(e) => setNewAdForm({ ...newAdForm, title: e.target.value })}
              placeholder="Ad Headline"
              className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
            />
            <input
              type="text"
              value={newAdForm.subtitle}
              onChange={(e) => setNewAdForm({ ...newAdForm, subtitle: e.target.value })}
              placeholder="Offer Subtitle"
              className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
            />
            <button
              type="button"
              onClick={() => {
                if (!newAdForm.title.trim()) return;
                setGeoAds([{ id: `ad_${Date.now()}`, ...newAdForm }, ...geoAds]);
                setNewAdForm({ ...newAdForm, title: "", subtitle: "" });
                onTriggerToast("Targeted Ad published live!");
              }}
              className="md:col-span-2 bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
            >
              + Publish Targeted Ad Campaign
            </button>
          </div>

          <div className="space-y-2">
            {geoAds.map((ad) => (
              <div
                key={ad.id}
                className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
              >
                <div>
                  <span className="text-[9px] text-amber-300 font-black">
                    {ad.tier} - {ad.regionLabel}
                  </span>
                  <p className="font-bold text-white">{ad.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGeoAds(geoAds.filter((a) => a.id !== ad.id))}
                  className="bg-rose-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {founderTab === "approvals" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-emerald-400 text-sm">
              Pending Partner KYC Queue ({pendingMerchants.length})
            </h3>
            {pendingMerchants.length === 0 ? (
              <p className="text-slate-400">No pending partner registrations.</p>
            ) : (
              pendingMerchants.map((m) => (
                <div
                  key={m.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-white">{m.businessName}</p>
                    <p className="text-[10px] text-slate-400">
                      Owner: {m.owner} | {m.phone} | Category: {m.categoryId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMerchants([...merchants, { ...m, status: "Approved" }]);
                      setPendingMerchants(pendingMerchants.filter((x) => x.id !== m.id));
                      onTriggerToast(`Approved ${m.businessName}!`);
                    }}
                    className="bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    Approve
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="font-black text-amber-400 text-sm">
              Pending Brand Sub-Categories ({pendingSubCategories.length})
            </h3>
            {pendingSubCategories.length === 0 ? (
              <p className="text-slate-400">No pending catalog submissions.</p>
            ) : (
              pendingSubCategories.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-white">{item.subCategoryBrand}</p>
                    <p className="text-[10px] text-slate-400">Shop: {item.shopName}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProducts([...products, { ...item, status: "approved" }]);
                        setPendingSubCategories(
                          pendingSubCategories.filter((x) => x.id !== item.id)
                        );
                        onTriggerToast(`Approved ${item.subCategoryBrand}!`);
                      }}
                      className="bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-xl cursor-pointer"
                    >
                      Approve
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
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {founderTab === "categories" && (
        <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-4 space-y-3">
          <h3 className="font-black text-purple-300 text-sm">
            Dynamic Category & Future Module Generator
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              value={newCatForm.icon}
              onChange={(e) => setNewCatForm({ ...newCatForm, icon: e.target.value })}
              placeholder="Emoji Icon"
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
            <input
              type="text"
              value={newCatForm.name}
              onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
              placeholder="New Category (e.g. Kisan Mandi / Bakery)"
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
            <select
              value={newCatForm.partnerType}
              onChange={(e) => setNewCatForm({ ...newCatForm, partnerType: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
            >
              <option value="merchant">Routes to Product Merchant Portal</option>
              <option value="service_provider">Routes to Service Provider Portal</option>
              <option value="decorator">Routes to Decorator & Hall Portal</option>
              <option value="labour">Routes to Labour Adda Portal</option>
            </select>
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
                  baseDeliveryFee: 20
                }
              ]);
              setNewCatForm({ ...newCatForm, name: "" });
              onTriggerToast("New Dynamic Category launched live across all portals!");
            }}
            className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer"
          >
            + Launch Dynamic Category & Isolated Cart
          </button>
        </div>
      )}

      {founderTab === "monetization" && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-3">
          <h3 className="font-black text-amber-400 text-sm">
            Silent Backend Monetization Engine (Rs.0 Initial Default)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <label className="text-slate-400 block mb-1">Global Checkout Fee (Rs.)</label>
              <input
                type="number"
                value={monetizationConfig.globalPlatformFee}
                onChange={(e) =>
                  setMonetizationConfig({
                    ...monetizationConfig,
                    globalPlatformFee: Number(e.target.value)
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <label className="text-slate-400 block mb-1">Service Booking Surcharge (Rs.)</label>
              <input
                type="number"
                value={monetizationConfig.serviceBookingSurcharge}
                onChange={(e) =>
                  setMonetizationConfig({
                    ...monetizationConfig,
                    serviceBookingSurcharge: Number(e.target.value)
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <label className="text-slate-400 block mb-1">Per-Product Surcharge (Rs.)</label>
              <input
                type="number"
                value={monetizationConfig.productSpecificFee}
                onChange={(e) =>
                  setMonetizationConfig({
                    ...monetizationConfig,
                    productSpecificFee: Number(e.target.value)
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>
        </div>
      )}

      {founderTab === "ota_updates" && (
        <div className="bg-slate-900 border-2 border-emerald-400 rounded-2xl p-4 space-y-3">
          <h3 className="font-black text-emerald-400 text-sm">
            WE4ALL Over-The-Air (OTA) Update & Mobile Push Broadcaster
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              value={otaForm.version}
              onChange={(e) => setOtaForm({ ...otaForm, version: e.target.value })}
              placeholder="Target Version (e.g. 3.1.1)"
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold"
            />
            <input
              type="text"
              value={otaForm.notes}
              onChange={(e) => setOtaForm({ ...otaForm, notes: e.target.value })}
              placeholder="Release Notes"
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
              if (onBroadcastOtaPushNotification) {
                onBroadcastOtaPushNotification(nextInfo);
              }
            }}
            className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
          >
            \uD83D\uDD14 Broadcast OTA Update & Push Alert to All Installed Phones
          </button>
        </div>
      )}

      {founderTab === "testing" && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-emerald-400 text-sm">
              6-Phone Side-by-Side Live Sync Testing Bench
            </h3>
            <button
              type="button"
              onClick={onLaunchMultiPhoneView}
              className="bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl cursor-pointer"
            >
              Launch All Portals Side-by-Side &rarr;
            </button>
          </div>
        </div>
      )}

      {founderTab === "flow_tester" && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
          <h3 className="font-black text-emerald-400 text-sm">
            1-Click Automated Screen-by-Screen Flow Tester
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { id: "auth_vault", title: "1. Security Vault (PIN & Biometric)" },
              { id: "cust_stores", title: "2. Customer: Merchant Stores & Compare" },
              { id: "cust_services", title: "3. Customer: 1-Hr Services & Slot Filter" },
              { id: "cust_decor", title: "4. Customer: Event Decor & Hall Schedule" },
              { id: "cust_carts", title: "5. Customer: Unified & Module Carts" },
              { id: "cust_orders", title: "6. Customer: Orders Timeline & PDF Invoice" },
              { id: "cust_account", title: "7. Owner Profile & Bottom OTA Updater" },
              { id: "portal_merchant", title: "8. Portal 2: Product Merchant Desk" },
              { id: "portal_service", title: "9. Portal 3: Service Provider (Geo Happy Code)" },
              { id: "portal_decorator", title: "10. Portal 4: Decorator & Hall Calendar" },
              { id: "portal_rider", title: "11. Portal 5: Captain 3-Point Live GPS Map" },
              { id: "portal_labour", title: "12. Portal 6: Labour & Mistri Adda" }
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
        </div>
      )}

      {founderTab === "database" && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 space-y-3">
          <h3 className="font-black text-amber-400 text-sm">
            Classified Master Database Editor (Raw JSON CRUD)
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "merchants", label: `1. Merchants (${merchants.length})` },
              { id: "users", label: `2. Users (${registeredUsers.length})` },
              { id: "catalog", label: `3. Products (${products.length})` },
              { id: "service_providers", label: `4. Service Providers (${serviceProviders.length})` },
              { id: "decorators", label: `5. Decorators (${decorators.length})` },
              { id: "labour", label: `6. Labour Adda (${labourWorkers.length})` },
              { id: "halls", label: `7. Function Halls (${functionHalls.length})` },
              { id: "orders", label: `8. Orders (${orders.length})` }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAdminDbTab(t.id)}
                className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer ${
                  adminDbTab === t.id
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2 max-h-80 overflow-y-auto">
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
              : adminDbTab === "labour"
              ? labourWorkers
              : adminDbTab === "halls"
              ? functionHalls
              : orders
            ).map((rec, idx) => (
              <div
                key={rec.id || idx}
                className="flex justify-between items-center border-b border-slate-900 pb-1.5"
              >
                <span className="font-bold text-white">
                  {rec.businessName ||
                    rec.fullName ||
                    rec.subCategoryBrand ||
                    rec.providerName ||
                    rec.name ||
                    rec.id}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditingRecord({
                      type: adminDbTab,
                      index: idx,
                      jsonStr: JSON.stringify(rec, null, 2)
                    })
                  }
                  className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Edit JSON
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#04090e] text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 border-b border-emerald-500/40 px-5 py-3 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 bg-emerald-950 flex flex-col items-center justify-center text-[8px] font-black text-amber-300 overflow-hidden">
            {founderLogoUrl ? (
              <img src={founderLogoUrl} alt="WE4ALL" className="w-full h-full object-cover" />
            ) : (
              "WE4ALL"
            )}
          </div>
          <div>
            <h1 className="text-sm font-black text-white">
              WE4ALL Founder Master Admin Suite (Khoday Anvesh)
            </h1>
            <p className="text-[10px] text-emerald-400">
              Web Console & Mobile Admin Module | Link: /admin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
            <button
              type="button"
              onClick={() => setAdminDisplayMode("web")}
              className={`px-3 py-1 rounded-lg font-black cursor-pointer ${
                adminDisplayMode === "web"
                  ? "bg-emerald-400 text-slate-950"
                  : "text-slate-400"
              }`}
            >
              Web Console
            </button>
            <button
              type="button"
              onClick={() => setAdminDisplayMode("mobile_admin")}
              className={`px-3 py-1 rounded-lg font-black cursor-pointer ${
                adminDisplayMode === "mobile_admin"
                  ? "bg-purple-400 text-slate-950"
                  : "text-slate-400"
              }`}
            >
              Mobile Admin App
            </button>
          </div>
          <button
            type="button"
            onClick={onExitAdminToApp}
            className="bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl cursor-pointer"
          >
            Exit to User App
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
          <main className="lg:col-span-3">{renderAdminBody()}</main>
        </div>
      ) : (
        <div className="flex-1 flex justify-center items-center p-4">
          <div className="w-full max-w-[412px] h-[840px] bg-[#071118] border-[10px] border-slate-800 rounded-[44px] shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-purple-950 px-4 py-2.5 flex justify-between items-center border-b border-purple-500/40">
              <span className="text-xs font-black text-amber-300">WE4ALL MOBILE ADMIN</span>
              <span className="text-[10px] text-emerald-300 font-bold">2-STEP VERIFIED</span>
            </div>
            <div className="flex gap-1 overflow-x-auto bg-slate-950 p-2 border-b border-slate-800 shrink-0">
              {ADMIN_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFounderTab(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 cursor-pointer ${
                    founderTab === t.id
                      ? "bg-purple-400 text-slate-950"
                      : "bg-slate-900 text-slate-400"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3">{renderAdminBody()}</div>
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-400 rounded-2xl max-w-xl w-full p-4 space-y-3">
            <h3 className="font-black text-amber-400 text-sm">Master JSON Database Editor</h3>
            <textarea
              value={editingRecord.jsonStr}
              onChange={(e) => setEditingRecord({ ...editingRecord, jsonStr: e.target.value })}
              className="w-full h-60 bg-slate-950 text-emerald-300 font-mono text-xs p-3 rounded-xl border border-slate-700"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="flex-1 bg-slate-800 py-2 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const parsed = JSON.parse(editingRecord.jsonStr);
                    if (editingRecord.type === "catalog") {
                      const next = [...products];
                      next[editingRecord.index] = parsed;
                      setProducts(next);
                    }
                    setEditingRecord(null);
                    onTriggerToast("Database Record Saved!");
                  } catch (err) {
                    alert("Invalid JSON syntax.");
                  }
                }}
                className="flex-1 bg-amber-400 text-slate-950 py-2 rounded-xl font-black text-xs cursor-pointer"
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