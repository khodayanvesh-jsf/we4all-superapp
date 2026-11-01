import React, { useState } from "react";

export default function FounderAdminSuite({
  founderLogoUrl,
  onUploadFounderPhoto,
  categories = [],
  setCategories = () => {},
  geoAds = [],
  setGeoAds = () => {},
  merchants = [],
  setMerchants = () => {},
  serviceProviders = [],
  setServiceProviders = () => {},
  decorators = [],
  setDecorators = () => {},
  riders = [],
  setRiders = () => {},
  pendingMerchants = [],
  setPendingMerchants = () => {},
  pendingServiceProviders = [],
  setPendingServiceProviders = () => {},
  pendingDecorators = [],
  setPendingDecorators = () => {},
  pendingRiders = [],
  setPendingRiders = () => {},
  orders = [],
  serviceBookings = [],
  customPortals = [],
  setCustomPortals = () => {},
  monetizationConfig = {},
  setMonetizationConfig = () => {},
  appUpdateInfo = {},
  setAppUpdateInfo = () => {},
  onBroadcastOtaPushNotification = () => {},
  onLaunchMultiPhoneView = () => {},
  onTeleportToScreen = () => {},
  onExitAdminToApp = () => {},
  onTriggerToast = () => {}
}) {
  const [adminTab, setAdminTab] = useState("command_center");
  const [surgeActive, setSurgeActive] = useState(false);
  const [surgeBonusRs, setSurgeBonusRs] = useState(15);

  // 5-Point Mandatory KYC & T&C Checklist State per Pending Partner ID
  const [kycChecksMap, setKycChecksMap] = useState({});

  // No-Code Dynamic Portal Builder State
  const [newPortalForm, setNewPortalForm] = useState({
    id: "",
    title: "",
    badge: "Partner",
    icon: "",
    description: "",
    tab1Label: "1. Live Queue",
    tab2Label: "2. Catalog",
    tab3Label: "3. + Add Item",
    tab4Label: "4. Ledger",
    sampleItemTitle: "",
    sampleItemPrice: 299
  });

  // Category Creator State
  const [newCatForm, setNewCatForm] = useState({ name: "", icon: "" });

  // OTA Broadcast State
  const [otaVersionInput, setOtaVersionInput] = useState("3.0.0");
  const [otaNotesInput, setOtaNotesInput] = useState(
    "WE4ALL v3.0.0: Dual Mobile + Web Consoles for all Portals, No-Code Dynamic Portal Builder, 5-Point KYC Checklist & Captain OTP Sync."
  );

  const toggleKycCheck = (partnerKey, checkIdx) => {
    const curr = kycChecksMap[partnerKey] || [false, false, false, false, false];
    const next = curr.map((v, i) => (i === checkIdx ? !v : v));
    setKycChecksMap({ ...kycChecksMap, [partnerKey]: next });
  };

  const isAll5Checked = (partnerKey) => {
    const curr = kycChecksMap[partnerKey] || [false, false, false, false, false];
    return curr.every(Boolean);
  };

  const checkAll5AtOnce = (partnerKey) => {
    setKycChecksMap({
      ...kycChecksMap,
      [partnerKey]: [true, true, true, true, true]
    });
  };

  // Export Partner Payouts CSV
  const handleExportPayoutsCsv = () => {
    const rows = [
      "OrderID,Customer,PartnerOrShop,Vehicle,TotalAmount,Status",
      ...(orders || []).map(
        (o) =>
          `${o.id},"${o.customerName}","${o.shopName}",${o.requiredVehicleCode || "2W"},${o.grandTotal},${o.status}`
      )
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "WE4ALL_Partner_Payout_Settlement.csv";
    a.click();
    URL.revokeObjectURL(url);
    onTriggerToast("Downloaded Partner Payout CSV Sheet!");
  };

  // Create New Portal Without Coding
  const handleCreateNoCodePortal = () => {
    if (!newPortalForm.title.trim()) {
      onTriggerToast("Please enter a Portal Title (e.g., 6. Pharmacy & Tele-Clinic).");
      return;
    }
    const slug =
      newPortalForm.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") ||
      `portal_${Date.now()}`;
    const createdPortal = {
      id: slug,
      title: newPortalForm.title.trim(),
      badge: newPortalForm.badge.trim() || "Partner",
      icon: newPortalForm.icon || "",
      description:
        newPortalForm.description.trim() ||
        `Official ${newPortalForm.title.trim()} Mobile & Web Console`,
      isPublished: true,
      tabs: [
        { id: "home", icon: "", label: newPortalForm.tab1Label || "1. Queue" },
        { id: "catalog", icon: "", label: newPortalForm.tab2Label || "2. Catalog" },
        { id: "add_new", icon: "", label: newPortalForm.tab3Label || "3. + Add" },
        { id: "orders", icon: "", label: newPortalForm.tab4Label || "4. Ledger" },
        { id: "account", icon: "", label: "Account" }
      ],
      items: [
        {
          id: `ITEM-${Date.now()}`,
          title:
            newPortalForm.sampleItemTitle.trim() ||
            `${newPortalForm.title.trim()} Standard Package`,
          category: newPortalForm.badge,
          price: Number(newPortalForm.sampleItemPrice) || 299,
          unit: "Per Order / Visit",
          stockOrSlots: 30
        }
      ],
      bookings: []
    };
    setCustomPortals([...customPortals, createdPortal]);
    setNewPortalForm({
      ...newPortalForm,
      id: "",
      title: "",
      description: "",
      sampleItemTitle: ""
    });
    onTriggerToast(
      `No-Code Portal "${createdPortal.title}" created & published live to all Mobile and Web Consoles!`
    );
  };

  const totalPendingCount =
    pendingMerchants.length +
    pendingServiceProviders.length +
    pendingDecorators.length +
    pendingRiders.length;

  return (
    <div className="min-h-screen bg-[#04090e] text-white p-3 md:p-6 space-y-4 text-xs">
      {/* TOP FOUNDER EXECUTIVE HEADER */}
      <div className="bg-slate-900 border-2 border-amber-400 rounded-3xl p-4 flex flex-wrap justify-between items-center gap-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <img
            src={founderLogoUrl || "/logo.png"}
            alt="WE4ALL"
            className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-black text-amber-400">
                WE4ALL FOUNDER MASTER WEB CONSOLE (v3.0.0)
              </h1>
              <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded">
                SUPABASE REALTIME ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Manage All 5 Core Portals + {customPortals.length} Dynamic No-Code Portals Across Mobile &amp; Web Consoles
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onLaunchMultiPhoneView}
            className="bg-indigo-500 text-white font-black px-3 py-2 rounded-xl cursor-pointer shadow"
          >
             5-Phone Split Simulator
          </button>
          <button
            type="button"
            onClick={handleExportPayoutsCsv}
            className="bg-teal-400 text-slate-950 font-black px-3 py-2 rounded-xl cursor-pointer shadow"
          >
             Export Payouts CSV
          </button>
          <button
            type="button"
            onClick={onExitAdminToApp}
            className="bg-emerald-400 text-slate-950 font-black px-3 py-2 rounded-xl cursor-pointer shadow"
          >
            Open App / Web Consoles &rarr;
          </button>
        </div>
      </div>

      {/* 6 ADMIN NAVIGATION TABS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
        {[
          { id: "command_center", label: "1. Command & Heatmap" },
          { id: "kyc_approvals", label: `2. KYC Checklist (${totalPendingCount})` },
          { id: "portal_builder", label: `3. + No-Code Portals (${customPortals.length})` },
          { id: "categories_ads", label: "4. Categories & Ads" },
          { id: "monetization", label: "5. Fees & Consort" },
          { id: "ota_broadcaster", label: "6. Push OTA Update" }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAdminTab(t.id)}
            className={`py-2.5 px-2 rounded-xl font-black text-[11px] cursor-pointer transition ${
              adminTab === t.id
                ? "bg-amber-400 text-slate-950 shadow"
                : "bg-slate-950 text-slate-300 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ================================================================== */}
      {/* ADMIN TAB 1: LIVE TOWN COMMAND CENTER, HEATMAP & PORTAL TELEPORT   */}
      {/* ================================================================== */}
      {adminTab === "command_center" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-emerald-500/40">
              <p className="text-[10px] text-slate-400">Live Merchants</p>
              <p className="text-xl font-black text-emerald-400">{merchants.length}</p>
            </div>
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-indigo-500/40">
              <p className="text-[10px] text-slate-400">1-Hr Service Pros</p>
              <p className="text-xl font-black text-indigo-400">{serviceProviders.length}</p>
            </div>
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-amber-500/40">
              <p className="text-[10px] text-slate-400">Decorators &amp; Halls</p>
              <p className="text-xl font-black text-amber-400">{decorators.length}</p>
            </div>
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-teal-500/40">
              <p className="text-[10px] text-slate-400">2W/3W/4W Captains</p>
              <p className="text-xl font-black text-teal-300">{riders.length}</p>
            </div>
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-rose-500/40">
              <p className="text-[10px] text-slate-400">Total Portals Active</p>
              <p className="text-xl font-black text-rose-400">{5 + customPortals.length}</p>
            </div>
          </div>

          {/* 1-Click Teleport to Any Mobile or Web Console */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2.5">
            <h3 className="font-black text-amber-400 text-xs">
              1-Click Teleport to Any Portal (Supports Both Mobile View &amp; Widescreen Web Console):
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => onTeleportToScreen("portal_customer")}
                className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 p-2.5 rounded-xl font-black cursor-pointer"
              >
                1. Customer Console
              </button>
              <button
                type="button"
                onClick={() => onTeleportToScreen("portal_merchant")}
                className="bg-amber-500/20 border border-amber-400 text-amber-300 p-2.5 rounded-xl font-black cursor-pointer"
              >
                2. Merchant Console
              </button>
              <button
                type="button"
                onClick={() => onTeleportToScreen("portal_service")}
                className="bg-indigo-500/20 border border-indigo-400 text-indigo-300 p-2.5 rounded-xl font-black cursor-pointer"
              >
                3. Service Pro Console
              </button>
              <button
                type="button"
                onClick={() => onTeleportToScreen("portal_decorator")}
                className="bg-rose-500/20 border border-rose-400 text-rose-300 p-2.5 rounded-xl font-black cursor-pointer"
              >
                4. Decorator Console
              </button>
              <button
                type="button"
                onClick={() => onTeleportToScreen("portal_rider")}
                className="bg-teal-500/20 border border-teal-400 text-teal-300 p-2.5 rounded-xl font-black cursor-pointer"
              >
                5. Captain Console
              </button>
              {customPortals.map((cp) => (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => onTeleportToScreen(cp.id)}
                  className="bg-purple-500/20 border border-purple-400 text-purple-200 p-2.5 rounded-xl font-black cursor-pointer"
                >
                  {cp.icon} {cp.title}
                </button>
              ))}
            </div>
          </div>

          {/* Colony Demand Heatmap & Weather/Festival Captain Surge */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-900 p-4 rounded-2xl border border-teal-500/40 space-y-2">
              <h4 className="font-black text-teal-300">
                Adilabad Colony Demand vs. Vehicle Supply Heatmap
              </h4>
              {[
                { zone: "Subhash Nagar & Main Bazar", orders: 18, captains: "9 (2W) | 3 (3W)" },
                { zone: "Collectorate Chowk & Station Rd", orders: 14, captains: "7 (2W) | 2 (3W)" },
                { zone: "Dasnapur & Bypass Industrial", orders: 9, captains: "3 (3W) | 4 (4W Heavy)" }
              ].map((z, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-white">{z.zone}</p>
                    <p className="text-[10px] text-slate-400">Active Supply: {z.captains}</p>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg font-black">
                    {z.orders} Live Orders
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 p-4 rounded-2xl border border-amber-500/40 space-y-3">
              <h4 className="font-black text-amber-400">
                Weather / Festival Captain Surge Bonus Controller
              </h4>
              <p className="text-[11px] text-slate-300">
                Pass 100% of rain or festival surge bonus directly to 2W/3W/4W Delivery Captains to keep acceptance rates at 99%.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={surgeBonusRs}
                  onChange={(e) => setSurgeBonusRs(Number(e.target.value) || 0)}
                  className="w-24 bg-slate-950 border border-amber-400 rounded-xl p-2 text-white font-black"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSurgeActive(!surgeActive);
                    onTriggerToast(
                      `Captain Surge Bonus (Rs.${surgeBonusRs}/order) is now ${
                        !surgeActive ? "ACTIVE" : "OFF"
                      }!`
                    );
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-black cursor-pointer ${
                    surgeActive ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {surgeActive
                    ? `Surge Active (+Rs.${surgeBonusRs}/Trip) - Click to Disable`
                    : `Activate +Rs.${surgeBonusRs} Captain Surge Bonus`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ADMIN TAB 2: 5-POINT PARTNER KYC & DIGITAL SIGNATURE APPROVAL VAULT*/}
      {/* ================================================================== */}
      {adminTab === "kyc_approvals" && (
        <div className="space-y-3">
          <div className="bg-slate-900 p-4 rounded-2xl border border-amber-500/40">
            <h3 className="font-black text-amber-400 text-sm">
              Mandatory 5-Point KYC, T&amp;C &amp; Digital Signature Verification Vault
            </h3>
            <p className="text-[11px] text-slate-300">
              All 5 compliance checkpoints must be verified before a Merchant, Service Provider, Decorator, or Captain is published live to the public Customer Super-App.
            </p>
          </div>

          {totalPendingCount === 0 && (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center space-y-2">
              <p className="font-bold text-emerald-400 text-sm">
                All Partner Registrations Are Verified &amp; Published Live!
              </p>
              <button
                type="button"
                onClick={() => {
                  setPendingMerchants([
                    {
                      id: Date.now(),
                      businessName: "Annapurna Wholesale Supermart",
                      fullName: "Annapurna Wholesale Supermart",
                      phone: "9848099112",
                      upiId: "annapurnamart@ybl",
                      kycDocName: "GST_FSSAI_Certificate.pdf",
                      digitalSignatureText: "Srinivas Goud (Digitally Signed)",
                      acceptedAt: new Date().toLocaleString(),
                      status: "Pending_Admin_Approval"
                    },
                    ...pendingMerchants
                  ]);
                  onTriggerToast("Simulated a Pending Supermart Registration for Admin Review!");
                }}
                className="bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl cursor-pointer"
              >
                + Simulate Pending Partner Registration to Test Checklist
              </button>
            </div>
          )}

          {[
            ...pendingMerchants.map((m) => ({ ...m, _pType: "merchant", _title: m.businessName || m.fullName })),
            ...pendingServiceProviders.map((s) => ({ ...s, _pType: "service_provider", _title: s.providerName || s.fullName })),
            ...pendingDecorators.map((d) => ({ ...d, _pType: "decorator", _title: d.businessName || d.fullName })),
            ...pendingRiders.map((r) => ({ ...r, _pType: "rider", _title: r.captainName || r.fullName }))
          ].map((partner) => {
            const pKey = `${partner._pType}_${partner.id}`;
            const checks = kycChecksMap[pKey] || [false, false, false, false, false];
            const readyToPublish = isAll5Checked(pKey);
            const checklistLabels = [
              "1. Mobile OTP & Identity Proof Verified",
              "2. Business / Trade / Vehicle RC & DL Document Inspected",
              "3. Instant Settlement UPI ID & Bank IFSC Verified",
              "4. Platform Consort Rules & Commission Slab Accepted",
              "5. Legal Digital Signature & Timestamp Authenticated"
            ];

            return (
              <div
                key={pKey}
                className="bg-slate-900 p-4 rounded-2xl border-2 border-amber-400/60 space-y-3"
              >
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[9px] uppercase">
                      PENDING {partner._pType.replace("_", " ")}
                    </span>
                    <h4 className="font-black text-white text-sm mt-1">
                      {partner._title} ({partner.phone})
                    </h4>
                    <p className="text-[10px] text-slate-300">
                      UPI: {partner.upiId || "verified@ybl"} | Doc: {partner.kycDocName || "KYC_Verified.pdf"} | Signed: &ldquo;{partner.digitalSignatureText || partner._title}&rdquo;
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => checkAll5AtOnce(pKey)}
                    className="bg-slate-800 border border-emerald-400 text-emerald-300 px-3 py-1 rounded-xl text-[10px] font-black cursor-pointer"
                  >
                    &#x2713; Tick All 5 Checkpoints
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {checklistLabels.map((lbl, idx) => (
                    <label
                      key={idx}
                      className="flex items-start gap-1.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checks[idx]}
                        onChange={() => toggleKycCheck(pKey, idx)}
                        className="mt-0.5 accent-emerald-400"
                      />
                      <span className="text-[10px] text-slate-200 font-bold leading-tight">
                        {lbl}
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!readyToPublish}
                  onClick={() => {
                    if (partner._pType === "merchant") {
                      setMerchants([
                        { ...partner, status: "Approved", isPublished: true },
                        ...merchants
                      ]);
                      setPendingMerchants(pendingMerchants.filter((x) => x.id !== partner.id));
                    } else if (partner._pType === "service_provider") {
                      setServiceProviders([
                        { ...partner, maskedId: partner._title, isPublished: true },
                        ...serviceProviders
                      ]);
                      setPendingServiceProviders(
                        pendingServiceProviders.filter((x) => x.id !== partner.id)
                      );
                    } else if (partner._pType === "decorator") {
                      setDecorators([
                        { ...partner, status: "Approved", isPublished: true },
                        ...decorators
                      ]);
                      setPendingDecorators(pendingDecorators.filter((x) => x.id !== partner.id));
                    } else if (partner._pType === "rider") {
                      setRiders([
                        { ...partner, name: partner._title, status: "Approved" },
                        ...riders
                      ]);
                      setPendingRiders(pendingRiders.filter((x) => x.id !== partner.id));
                    }
                    onTriggerToast(
                      `Approved & Published "${partner._title}" Live to Public Market!`
                    );
                  }}
                  className={`w-full py-2.5 rounded-xl font-black transition ${
                    readyToPublish
                      ? "bg-emerald-400 text-slate-950 cursor-pointer shadow-lg"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {readyToPublish
                    ? `Approve & Publish "${partner._title}" Live to Public Market `
                    : "Tick All 5 KYC & T&C Checkboxes Above to Unlock Approval"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================== */}
      {/* ADMIN TAB 3: NO-CODE DYNAMIC PORTAL BUILDER (ADD PORTALS ANYTIME!) */}
      {/* ================================================================== */}
      {adminTab === "portal_builder" && (
        <div className="space-y-4">
          <div className="bg-slate-900 p-4 rounded-2xl border-2 border-emerald-400 space-y-3">
            <div>
              <span className="bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded text-[9px]">
                ZERO-CODING ARCHITECTURE
              </span>
              <h3 className="font-black text-emerald-400 text-sm mt-1">
                No-Code Dynamic Portal Builder (Add New Portals Instantly)
              </h3>
              <p className="text-[11px] text-slate-300">
                Want to launch a 6th, 7th, or 8th portal (e.g., Pharmacy &amp; Tele-Clinic, Agriculture &amp; Mandi, Real Estate &amp; Rentals, Catering)? Fill in the details below and click <strong>Create &amp; Publish Portal Live</strong>—it immediately adds the new portal to the Role Selector, Mobile Console, and Widescreen Web Console with zero coding!
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Portal Title (e.g. 6. Pharmacy & Clinic)"
                value={newPortalForm.title}
                onChange={(e) => setNewPortalForm({ ...newPortalForm, title: e.target.value })}
                className="bg-slate-950 border border-emerald-400 rounded-xl p-2 text-white font-bold md:col-span-2"
              />
              <input
                type="text"
                placeholder="Short Badge (e.g. Health / Mandi)"
                value={newPortalForm.badge}
                onChange={(e) => setNewPortalForm({ ...newPortalForm, badge: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <input
                type="text"
                placeholder="Icon Emoji (e.g.  or )"
                value={newPortalForm.icon}
                onChange={(e) => setNewPortalForm({ ...newPortalForm, icon: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
            </div>

            <input
              type="text"
              placeholder="Portal Description (e.g. Book doctor consultations, lab tests & 15-min medicine delivery)"
              value={newPortalForm.description}
              onChange={(e) => setNewPortalForm({ ...newPortalForm, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Tab 1 Label (1. Queue)"
                value={newPortalForm.tab1Label}
                onChange={(e) => setNewPortalForm({ ...newPortalForm, tab1Label: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-amber-300 font-bold"
              />
              <input
                type="text"
                placeholder="Tab 2 Label (2. Catalog)"
                value={newPortalForm.tab2Label}
                onChange={(e) => setNewPortalForm({ ...newPortalForm, tab2Label: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-emerald-300 font-bold"
              />
              <input
                type="text"
                placeholder="Tab 3 Label (3. + Add)"
                value={newPortalForm.tab3Label}
                onChange={(e) => setNewPortalForm({ ...newPortalForm, tab3Label: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-teal-300 font-bold"
              />
              <input
                type="text"
                placeholder="Tab 4 Label (4. Ledger)"
                value={newPortalForm.tab4Label}
                onChange={(e) => setNewPortalForm({ ...newPortalForm, tab4Label: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-indigo-300 font-bold"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCreateNoCodePortal}
                className="flex-1 bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow-lg"
              >
                + Create &amp; Publish New Portal Live (Zero Coding) &rarr;
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewPortalForm({
                    id: "agri_mandi",
                    title: "6. Agriculture & Kisan Mandi",
                    badge: "Kisan Mandi",
                    icon: "",
                    description: "Direct farmer-to-consumer cotton, soya, seeds, fertilizers & tractor rental portal",
                    tab1Label: "1. Mandi Bids",
                    tab2Label: "2. Crop Stock",
                    tab3Label: "3. + List Crop",
                    tab4Label: "4. Kisan Ledger",
                    sampleItemTitle: "Organic Sharbati Wheat / Cotton Bale",
                    sampleItemPrice: 2450
                  });
                  onTriggerToast("Loaded Preset: 6. Agriculture & Kisan Mandi! Click Create to publish.");
                }}
                className="bg-amber-400/20 border border-amber-400 text-amber-300 font-black px-3 py-2.5 rounded-xl cursor-pointer"
              >
                Load Preset: 6. Kisan Mandi
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewPortalForm({
                    id: "health_clinic",
                    title: "7. Doctor & Diagnostics Hub",
                    badge: "MediHub",
                    icon: "",
                    description: "1-Hr home lab sample collection, clinic token booking & prescription delivery",
                    tab1Label: "1. Patient Queue",
                    tab2Label: "2. Lab Tests",
                    tab3Label: "3. + Add Test",
                    tab4Label: "4. Clinic Bills",
                    sampleItemTitle: "Full Body Blood Profile (Home Sample)",
                    sampleItemPrice: 499
                  });
                  onTriggerToast("Loaded Preset: 7. Doctor & Diagnostics Hub! Click Create to publish.");
                }}
                className="bg-teal-400/20 border border-teal-400 text-teal-200 font-black px-3 py-2.5 rounded-xl cursor-pointer"
              >
                Load Preset: 7. MediHub
              </button>
            </div>
          </div>

          {/* List of Active Dynamic Portals */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2.5">
            <h4 className="font-black text-amber-400">
              Active Admin-Created Dynamic Portals ({customPortals.length})
            </h4>
            {customPortals.length === 0 ? (
              <p className="text-slate-400">
                No custom portals added yet. Use the builder or presets above to launch Portal #6 in one click!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {customPortals.map((cp) => (
                  <div
                    key={cp.id}
                    className="bg-slate-950 p-3 rounded-2xl border border-emerald-500/40 flex justify-between items-center gap-2"
                  >
                    <div>
                      <p className="font-black text-emerald-400 text-xs">
                        {cp.icon} {cp.title} ({cp.badge})
                      </p>
                      <p className="text-[10px] text-slate-400">{cp.description}</p>
                      <p className="text-[9px] text-amber-300 mt-0.5">
                        Tabs: {(cp.tabs || []).map((t) => t.label).join(" | ")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onTeleportToScreen(cp.id)}
                        className="bg-emerald-400 text-slate-950 font-black px-3 py-1 rounded-lg text-[10px] cursor-pointer"
                      >
                        Open Portal &rarr;
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPortals(customPortals.filter((x) => x.id !== cp.id));
                          onTriggerToast(`Removed dynamic portal ${cp.title}`);
                        }}
                        className="bg-rose-950 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-lg text-[9px] font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ADMIN TAB 4: DYNAMIC CATEGORIES & GEO-TARGETED ADS                 */}
      {/* ================================================================== */}
      {adminTab === "categories_ads" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 p-4 rounded-2xl border border-emerald-500/40 space-y-3">
            <h4 className="font-black text-emerald-400">
              Dynamic Storefront Category Manager ({categories.length})
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New Category Name (e.g. Organic Honey)"
                value={newCatForm.name}
                onChange={(e) => setNewCatForm({ ...newCatForm, name: e.target.value })}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
              />
              <input
                type="text"
                placeholder="Icon"
                value={newCatForm.icon}
                onChange={(e) => setNewCatForm({ ...newCatForm, icon: e.target.value })}
                className="w-16 bg-slate-950 border border-slate-700 rounded-xl p-2 text-center text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newCatForm.name.trim()) return;
                  const nextCat = {
                    id: `cat_${Date.now()}`,
                    name: newCatForm.name.trim(),
                    icon: newCatForm.icon || "",
                    badge: "New"
                  };
                  setCategories([...categories, nextCat]);
                  setNewCatForm({ name: "", icon: "" });
                  onTriggerToast(`Added Category "${nextCat.name}" live!`);
                }}
                className="bg-emerald-400 text-slate-950 font-black px-3 rounded-xl cursor-pointer"
              >
                + Add
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-between items-center"
                >
                  <span>
                    {c.icon} <strong>{c.name}</strong>
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold">ACTIVE</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-amber-500/40 space-y-3">
            <h4 className="font-black text-amber-400">
              App Emblem &amp; Geo-Targeted Banner Manager
            </h4>
            <label className="block bg-slate-950 border border-amber-400/50 p-3 rounded-xl text-center cursor-pointer">
              <span className="font-black text-amber-300 block">
                 Upload New Official App Emblem / Logo
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={onUploadFounderPhoto}
                className="hidden"
              />
            </label>
            {(geoAds || []).map((ad, i) => (
              <div
                key={ad.id || i}
                className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold text-white">{ad.title}</p>
                  <p className="text-[10px] text-slate-400">{ad.subtitle}</p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[9px] font-black">
                  LIVE
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ADMIN TAB 5: MONETIZATION & CONSORT RULES                          */}
      {/* ================================================================== */}
      {adminTab === "monetization" && (
        <div className="bg-slate-900 p-4 rounded-2xl border border-emerald-500/40 space-y-3">
          <h4 className="font-black text-emerald-400 text-sm">
            Platform Commission &amp; Consort Fee Controller
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">
                Global Platform Fee (Rs.):
              </label>
              <input
                type="number"
                value={monetizationConfig?.globalPlatformFee ?? 0}
                onChange={(e) =>
                  setMonetizationConfig({
                    ...monetizationConfig,
                    globalPlatformFee: Number(e.target.value) || 0
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black"
              />
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">
                1-Hr Service Escrow Surcharge (Rs.):
              </label>
              <input
                type="number"
                value={monetizationConfig?.serviceBookingSurcharge ?? 0}
                onChange={(e) =>
                  setMonetizationConfig({
                    ...monetizationConfig,
                    serviceBookingSurcharge: Number(e.target.value) || 0
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-black"
              />
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <label className="text-[10px] text-slate-400 font-bold">
                Decor &amp; Hall Escrow Split Rule:
              </label>
              <div className="p-2 bg-slate-900 rounded-lg text-amber-300 font-black">
                35% (&ge;5 Days) | 85% (&lt;5 Days)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* ADMIN TAB 6: OTA UPDATE PUSHER & COMPULSORY OS NOTIFICATION BAR    */}
      {/* ================================================================== */}
      {adminTab === "ota_broadcaster" && (
        <div className="bg-slate-900 p-4 rounded-2xl border-2 border-amber-400 space-y-3">
          <h4 className="font-black text-amber-400 text-sm">
            Broadcast Live In-App OTA Update &amp; Compulsory Mobile OS Notification Shade Push
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              value={otaVersionInput}
              onChange={(e) => setOtaVersionInput(e.target.value)}
              placeholder="Target Version (e.g. 3.0.0)"
              className="bg-slate-950 border border-amber-400 rounded-xl p-2.5 text-white font-black"
            />
            <input
              type="text"
              value={otaNotesInput}
              onChange={(e) => setOtaNotesInput(e.target.value)}
              placeholder="Release Notes..."
              className="bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white md:col-span-2"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const nextInfo = {
                ...(appUpdateInfo || {}),
                currentVersion: appUpdateInfo?.currentVersion || "2.9.8",
                latestAvailableVersion: otaVersionInput.trim() || "3.0.0",
                updateAvailable: true,
                releaseNotes: otaNotesInput.trim()
              };
              setAppUpdateInfo(nextInfo);
              onBroadcastOtaPushNotification(nextInfo);
            }}
            className="w-full bg-emerald-400 text-slate-950 font-black py-3 rounded-xl cursor-pointer shadow-lg"
          >
            Broadcast OTA v{otaVersionInput} &amp; Push Compulsory OS Notification to All Devices &rarr;
          </button>
        </div>
      )}
    </div>
  );
}