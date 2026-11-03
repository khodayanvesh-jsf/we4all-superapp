import React, { useState } from "react";

export default function FounderAdminSuite({
  founderLogoUrl,
  merchants = [],
  setMerchants = () => {},
  serviceProviders = [],
  setServiceProviders = () => {},
  decorators = [],
  setDecorators = () => {},
  riders = [],
  setRiders = () => {},
  registeredUsers = [],
  orders = [],
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
  liveDeviceTelemetry = {},
  onWipeAllTestData,
  splitScreens = [],
  onLaunchMultiPhoneView,
  onTeleportToScreen,
  onExitAdminToApp,
  onTriggerToast
}) {
  const [founderTab, setFounderTab] = useState("live_locator");
  const [locatorSearch, setLocatorSearch] = useState("");
  const [locatorRoleFilter, setLocatorRoleFilter] = useState("ALL");
  const [selectedInspectEntity, setSelectedInspectEntity] = useState(null);

  const [approvalQueueSubTab, setApprovalQueueSubTab] = useState("captains");
  const [checklistByPartner, setChecklistByPartner] = useState({});

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
    (pendingMerchants?.length || 0);

  // Build Unified Directory of ALL Live Devices + Registered Users + Partners for Admin Locator (Req 6)
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
      speedKmh: ping.speedKmh || 0,
      batteryPct: ping.batteryPct ?? 100,
      networkType: ping.networkType || "4G/WIFI",
      lastActiveAt: ping.lastActiveAt || "Live Now",
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
      speedKmh: 0,
      batteryPct: 95,
      networkType: "4G",
      lastActiveAt: u.acceptedAt || "Registered",
      isLiveStream: false,
      rawRecord: u
    })),
    ...merchants.map((m) => ({
      id: `MER_${m.id}`,
      name: m.businessName || m.name,
      role: "merchant",
      phone: m.phone || "9848011100",
      upiId: m.upiId || "merchant@ybl",
      address: m.area || "Main Bazar, Adilabad",
      lat: m.lat || 19.6672,
      lng: m.lng || 78.5318,
      accuracyMeters: 5,
      speedKmh: 0,
      batteryPct: 100,
      networkType: "WIFI",
      lastActiveAt: "Store Active",
      isLiveStream: false,
      rawRecord: m
    })),
    ...serviceProviders.map((sp) => ({
      id: `SRV_${sp.id}`,
      name: sp.providerName || sp.maskedId,
      role: "service_provider",
      phone: sp.phone || "9848022334",
      upiId: sp.upiId || "servicepro@ybl",
      address: sp.area || "Subhash Nagar, Adilabad",
      lat: sp.lat || 19.6631,
      lng: sp.lng || 78.5342,
      accuracyMeters: 10,
      speedKmh: 0,
      batteryPct: 88,
      networkType: "4G",
      lastActiveAt: "On-Duty Slots",
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
      speedKmh: 0,
      batteryPct: 92,
      networkType: "WIFI",
      lastActiveAt: "Hall/Decor Active",
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
      speedKmh: 24,
      batteryPct: 84,
      networkType: "5G",
      lastActiveAt: "GPS Radar Online",
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
    {
      id: "live_locator",
      label: "1. Live GPS Locator & User Data Inspector",
      badge: `${unifiedDirectory.length} Tracked`
    },
    {
      id: "approvals",
      label: "2. Partner & Captain 5-Point Checklists",
      badge: `${totalPendingCount} Pending`
    },
    {
      id: "data_reset",
      label: "3. Production Data Wipe (Online + Offline)",
      badge: "Clean DB"
    },
    { id: "flow_tester", label: "4. 1-Click Portal Flow Tester", badge: "5 Portals" },
    { id: "testing", label: "5. 5-Phone Live Sandbox", badge: `${splitScreens.length} Phones` }
  ];

  const renderPartnerApprovalCard = (partner, partnerType) => {
    const chk = checklistByPartner[partner.id] || {};
    const allFiveChecked =
      chk.kycDocVerified &&
      chk.tradeSkillVerified &&
      chk.bankUpiVerified &&
      chk.tcAcceptedVerified &&
      chk.signatureVerified;

    const displayName =
      partner.captainName || partner.providerName || partner.businessName;

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
            { key: "kycDocVerified", label: "1. KYC Document & Trade / DL / RC Proof Verified" },
            { key: "tradeSkillVerified", label: "2. Category, Rate Card & Vehicle Class Verified" },
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

  return (
    <div className="min-h-screen bg-[#04090e] text-slate-100 flex flex-col font-sans text-xs">
      <header className="bg-slate-900 border-b border-emerald-500/40 px-5 py-3 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-400 bg-emerald-950 flex items-center justify-center text-[8px] font-black text-amber-300 overflow-hidden">
            {founderLogoUrl ? (
              <img src={founderLogoUrl} alt="WE4ALL" className="w-full h-full object-cover" />
            ) : (
              "WE4ALL"
            )}
          </div>
          <div>
            <h1 className="text-sm font-black text-white">
              WE4ALL Founder Master Admin Suite (v3.0.0 Production)
            </h1>
            <p className="text-[10px] text-emerald-400">
              Real-Time User & Partner GPS Locator, Full Data Inspector & Production Control
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExitAdminToApp}
          className="bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl cursor-pointer"
        >
          Exit to Consumer App
        </button>
      </header>

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

        <main className="lg:col-span-3 space-y-4">
          {/* ============================================================== */}
          {/* TAB 1: LIVE GPS LOCATOR & FULL USER/PARTNER DATA INSPECTOR     */}
          {/* ============================================================== */}
          {founderTab === "live_locator" && (
            <div className="space-y-4">
              <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="font-black text-emerald-400 text-sm">
                      \uD83D\uDCE1 Real-Time User & Partner GPS Locator & Full Data Inspector
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Locate any Customer, Merchant, Service Provider, Decorator, or Captain in real time and inspect all data shared with WE4ALL.
                    </p>
                  </div>
                  <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-2.5 py-1 rounded-xl text-[10px] font-black">
                    Live GPS Stream Active ({liveTelemetryList.length} Live Devices)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={locatorSearch}
                    onChange={(e) => setLocatorSearch(e.target.value)}
                    placeholder="Search by Name, Mobile Number, Address, or Role..."
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
                    <option value="decorator">4. Decorators & Halls</option>
                    <option value="rider">5. Delivery Captains</option>
                  </select>
                </div>

                {/* Selected Entity Full Data Inspector Drawer */}
                {selectedInspectEntity && (
                  <div className="bg-slate-950 border-2 border-amber-400 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                          FULL PLATFORM DATA RECORD &bull; {selectedInspectEntity.role.toUpperCase()}
                        </span>
                        <h4 className="text-sm font-black text-white mt-1">
                          {selectedInspectEntity.name} ({selectedInspectEntity.phone})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedInspectEntity(null)}
                        className="bg-slate-800 text-rose-300 px-2.5 py-1 rounded-lg font-black cursor-pointer"
                      >
                        Close Inspector
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <p className="text-slate-400">Live GPS Coordinates</p>
                        <p className="font-mono font-black text-emerald-400 mt-0.5">
                          {selectedInspectEntity.lat}, {selectedInspectEntity.lng}
                        </p>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <p className="text-slate-400">Speed & GPS Accuracy</p>
                        <p className="font-black text-amber-300 mt-0.5">
                          {selectedInspectEntity.speedKmh} km/h (&plusmn;{selectedInspectEntity.accuracyMeters}m)
                        </p>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <p className="text-slate-400">Device Battery & Net</p>
                        <p className="font-black text-teal-300 mt-0.5">
                          {selectedInspectEntity.batteryPct}% &bull; {selectedInspectEntity.networkType}
                        </p>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <p className="text-slate-400">UPI / Settlement ID</p>
                        <p className="font-black text-white mt-0.5">
                          {selectedInspectEntity.upiId}
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[10px] font-mono overflow-x-auto max-h-40">
                      <p className="text-amber-300 font-sans font-bold mb-1">
                        Complete Shared JSON Telemetry & KYC Data:
                      </p>
                      <pre>{JSON.stringify(selectedInspectEntity.rawRecord, null, 2)}</pre>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`https://www.google.com/maps?q=${selectedInspectEntity.lat},${selectedInspectEntity.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-[11px]"
                      >
                        \uD83D\uDCCD Open Exact Pin on Google Maps &rarr;
                      </a>
                    </div>
                  </div>
                )}

                {/* Directory List */}
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {filteredDirectory.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border flex flex-wrap justify-between items-center gap-2 ${
                        item.isLiveStream
                          ? "bg-emerald-950/30 border-emerald-400"
                          : "bg-slate-950 border-slate-800"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                              item.isLiveStream
                                ? "bg-emerald-400 text-slate-950"
                                : "bg-slate-800 text-amber-300"
                            }`}
                          >
                            {item.isLiveStream ? "\uD83D\uDFE2 LIVE DEVICE GPS" : item.role}
                          </span>
                          <h4 className="font-black text-white text-xs">{item.name}</h4>
                          <span className="text-[10px] text-slate-400">({item.phone})</span>
                        </div>
                        <p className="text-[10px] text-slate-300">
                          Location: <strong>{item.address}</strong> | Coords:{" "}
                          <span className="font-mono text-emerald-300">
                            {item.lat}, {item.lng}
                          </span>{" "}
                          (&plusmn;{item.accuracyMeters}m) | Battery: {item.batteryPct}% ({item.networkType})
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInspectEntity(item)}
                          className="bg-indigo-500 text-white font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
                        >
                          Inspect All Data
                        </button>
                        <a
                          href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[10px]"
                        >
                          Locate on Map
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARTNER APPROVAL CHECKLISTS */}
          {founderTab === "approvals" && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setApprovalQueueSubTab("captains")}
                  className={`py-2 rounded-xl font-black cursor-pointer ${
                    approvalQueueSubTab === "captains"
                      ? "bg-teal-400 text-slate-950"
                      : "text-slate-400"
                  }`}
                >
                  5. Captains ({pendingRiders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalQueueSubTab("decorators_halls")}
                  className={`py-2 rounded-xl font-black cursor-pointer ${
                    approvalQueueSubTab === "decorators_halls"
                      ? "bg-amber-400 text-slate-950"
                      : "text-slate-400"
                  }`}
                >
                  4. Decor/Halls ({pendingDecorators.length})
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalQueueSubTab("service_providers")}
                  className={`py-2 rounded-xl font-black cursor-pointer ${
                    approvalQueueSubTab === "service_providers"
                      ? "bg-indigo-500 text-white"
                      : "text-slate-400"
                  }`}
                >
                  3. Services ({pendingServiceProviders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setApprovalQueueSubTab("merchants")}
                  className={`py-2 rounded-xl font-black cursor-pointer ${
                    approvalQueueSubTab === "merchants"
                      ? "bg-emerald-400 text-slate-950"
                      : "text-slate-400"
                  }`}
                >
                  2. Merchants ({pendingMerchants.length})
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                {approvalQueueSubTab === "captains" &&
                  (pendingRiders.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">
                      No pending Delivery Captains in queue.
                    </p>
                  ) : (
                    pendingRiders.map((r) => renderPartnerApprovalCard(r, "captain"))
                  ))}
                {approvalQueueSubTab === "decorators_halls" &&
                  (pendingDecorators.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">
                      No pending Decorators or Function Halls in queue.
                    </p>
                  ) : (
                    pendingDecorators.map((d) => renderPartnerApprovalCard(d, "decorator"))
                  ))}
                {approvalQueueSubTab === "service_providers" &&
                  (pendingServiceProviders.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">
                      No pending Service Providers in queue.
                    </p>
                  ) : (
                    pendingServiceProviders.map((sp) =>
                      renderPartnerApprovalCard(sp, "service_provider")
                    )
                  ))}
                {approvalQueueSubTab === "merchants" &&
                  (pendingMerchants.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">
                      No pending Product Merchants in queue.
                    </p>
                  ) : (
                    pendingMerchants.map((m) => renderPartnerApprovalCard(m, "merchant"))
                  ))}
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCTION DATA WIPE (ONLINE + OFFLINE) */}
          {founderTab === "data_reset" && (
            <div className="bg-slate-900 border-2 border-rose-500/60 rounded-2xl p-5 space-y-3">
              <h3 className="font-black text-rose-400 text-sm">
                Production Factory Reset: Empty All Test Data (Online Supabase + Offline Device)
              </h3>
              <p className="text-slate-300 text-xs">
                Click below to permanently clear all test orders, test service bookings, test radar rides, test reverse bids, and pending test queues from both your live Supabase PostgreSQL database and local device storage.
              </p>
              <button
                type="button"
                onClick={onWipeAllTestData}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-xl cursor-pointer shadow-lg"
              >
                \uD83E\uDDF9 Wipe All Test Data Now (Online Cloud + Offline Device)
              </button>
            </div>
          )}

          {founderTab === "flow_tester" && (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { id: "cust_stores", title: "1. Consumer Portal (Guest Shopping Mode)" },
                { id: "portal_merchant", title: "2. Portal 2: Product Merchant" },
                { id: "portal_service", title: "3. Portal 3: Service Provider" },
                { id: "portal_decorator", title: "4. Portal 4: Decorator & Halls" },
                { id: "portal_rider", title: "5. Portal 5: Delivery Captain" },
                { id: "auth_vault", title: "6. Security & Registration Vault" }
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

          {founderTab === "testing" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
              <span>Launch all 5 Portals side-by-side:</span>
              <button
                type="button"
                onClick={onLaunchMultiPhoneView}
                className="bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl cursor-pointer"
              >
                Launch 5-Phone View &rarr;
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}