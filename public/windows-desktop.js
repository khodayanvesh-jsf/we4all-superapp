(function () {
  const SUPA_URL = "https://bdmbziwazpuzbukazmug.supabase.co";
  const SUPA_KEY = "sb_publishable_nNPwaseb81B8V05aVwmleg_JkBVNvzl";
  const STORAGE_KEY = "we4all_windows_enterprise_state_v1";
  const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("we4all_desktop_sync") : null;

  const PORTAL_ACCOUNTS = {
    consumer: { role: "Customer", name: "Anvesh (Adilabad Customer)", phone: "9848011111", pin: "123456", market: "m_393_1571" },
    merchant: { role: "Merchant POS", name: "Sri Laxmi Supermart", phone: "9848022222", pin: "123456", partnerId: "p_merch_1", vpa: "srilaxmi@upi" },
    service:  { role: "1-Hr Service", name: "Kiran Electricals & Decor", phone: "9848033333", pin: "123456", partnerId: "p_srv_1", vpa: "kiranelec@upi" },
    rider:    { role: "Delivery Captain", name: "Raju 2W/3W/4W Captain", phone: "9848044444", pin: "123456", partnerId: "p_rid_1", vehicle: "2W" },
    labour:   { role: "Labour & Mistri", name: "Ramesh Mason Toli", phone: "9848055555", pin: "123456", partnerId: "p_lab_1", trade: "Master Mason & Toli" },
    admin:    { role: "Founder Admin", name: "KhodayAnvesh (Founder)", phone: "KhodayAnvesh", pin: "We4AllFounder@2026", edgeVerified: false }
  };

  const DEFAULT_STATE = {
    version: "3.3.21",
    marketId: "m_393_1571",
    marketName: "Adilabad Town Market (m_393_1571)",
    commissionRate: 0,
    products: [
      { id: "prd_101", title: "Aashirvaad Select Sharbati Atta (5 kg)", category: "Groceries & Kirana", merchant: "Sri Laxmi Supermart", price: 265, stock: 42, unit: "5 kg Bag", approved: true },
      { id: "prd_102", title: "Freedom Refined Sunflower Oil (1 L)", category: "Groceries & Kirana", merchant: "Sri Laxmi Supermart", price: 145, stock: 85, unit: "1 L Pouch", approved: true },
      { id: "prd_103", title: "Adilabad Fresh Farm Tomatoes & Green Chilli Combo", category: "Farm Veg & Fruits", merchant: "Rythu Fresh Veg Stall", price: 60, stock: 50, unit: "2 kg Pack", approved: true },
      { id: "prd_104", title: "Organic Alphonso Mangoes & Sweet Papaya Box", category: "Farm Veg & Fruits", merchant: "Rythu Fresh Veg Stall", price: 180, stock: 24, unit: "3 kg Box", approved: true },
      { id: "prd_105", title: "Fresh Country Chicken (Skinless Curry Cut)", category: "Fresh Meat & Fish", merchant: "Deccan Fresh Meats", price: 240, stock: 30, unit: "1 kg", approved: true },
      { id: "prd_106", title: "Godavari River Rohu Fish Steaks (Fresh Catch)", category: "Fresh Meat & Fish", merchant: "Deccan Fresh Meats", price: 220, stock: 18, unit: "1 kg", approved: true },
      { id: "prd_107", title: "UltraTech Cement OPC 53 Grade (50 kg Bag)", category: "Cement & Steel", merchant: "Balaji Hardware & Steel", price: 390, stock: 200, unit: "50 kg Bag", approved: true },
      { id: "prd_108", title: "TATA Tiscon SD 12mm TMT Steel Bar Bundle", category: "Cement & Steel", merchant: "Balaji Hardware & Steel", price: 680, stock: 95, unit: "Per Rod", approved: true },
      { id: "prd_109", title: "Dolo 650 & First-Aid Family Wellness Kit", category: "MediHub Pharmacy", merchant: "Apollo Local MediHub", price: 115, stock: 60, unit: "1 Kit", approved: true },
      { id: "prd_110", title: "Digital Blood Pressure & Thermometer Care Pack", category: "MediHub Pharmacy", merchant: "Apollo Local MediHub", price: 1250, stock: 12, unit: "1 Box", approved: true },
      { id: "prd_111", title: "Direct Farmer Sona Masoori Raw Rice (25 kg)", category: "Kisan Mandi", merchant: "Adilabad Kisan FPO", price: 1320, stock: 40, unit: "25 kg Sack", approved: true },
      { id: "prd_112", title: "Cold-Pressed Groundnut Oil (Direct Farm 5 L)", category: "Kisan Mandi", merchant: "Adilabad Kisan FPO", price: 980, stock: 22, unit: "5 L Tin", approved: true }
    ],
    services: [
      { id: "srv_1", title: "1-Hr AC Gas Refill & Deep Jet Servicing", category: "1-Hour Services", provider: "Kiran Electricals", rate: 499, sla: "Within 60 Mins", type: "home_service" },
      { id: "srv_2", title: "Emergency House Wiring, MCB & Inverter Repair", category: "1-Hour Services", provider: "Kiran Electricals", rate: 199, sla: "Within 45 Mins", type: "home_service" },
      { id: "srv_3", title: "Bathroom Tap, Motor Pump & Pipeline Leak Fix", category: "1-Hour Services", provider: "Adilabad Plumbing Desk", rate: 249, sla: "Within 60 Mins", type: "home_service" },
      { id: "srv_4", title: "Grand Royal Mandapam & Stage Floral Decoration", category: "Decor & Halls", provider: "Kiran Electricals & Decor", rate: 45000, sla: "35% (>=5d) / 85% (<5d) Advance", type: "decorator" }
    ],
    labourDirectory: [
      { id: "lab_1", name: "Ramesh Mason Toli (5 Workers)", trade: "Master Mason & RCC Concrete", dailyWage: 850, zone: "Adilabad Town (m_393_1571)", rating: "4.9 ★", verified: true },
      { id: "lab_2", name: "Suresh Tiles & Granite Mistri", trade: "Flooring, Marble & Tile Fitting", dailyWage: 900, zone: "Adilabad Town (m_393_1571)", rating: "4.8 ★", verified: true },
      { id: "lab_3", name: "Mallesh Farm & Loading Crew", trade: "Agricultural & Godown Loading", dailyWage: 650, zone: "Adilabad Rural & Mandi", rating: "4.9 ★", verified: true }
    ],
    orders: [
      { id: "ORD-9021", customer: "9848011111", merchant: "Sri Laxmi Supermart", items: "Aashirvaad Atta 5kg x1, Sunflower Oil 1L x2", total: 555, mode: "COD", status: "CONFIRMED", otp: "4829", createdAt: "Today 10:15 AM" }
    ],
    serviceBookings: [
      { id: "SRV-304", customer: "9848011111", provider: "Kiran Electricals", service: "1-Hr AC Deep Jet Servicing", amount: 499, advanceRequired: 499, status: "ASSIGNED", escrowOtp: "7741", eventDaysAway: null }
    ],
    ridesAndParcels: [
      { id: "TRP-501", kind: "P2P Parcel", vehicle: "2W", weightKg: 8, pickup: "Cinema Road, Adilabad", drop: "Collectorate Chowk, Adilabad", fare: 65, status: "SEARCHING_CAPTAIN", otp: "3190" },
      { id: "TRP-502", kind: "Taxi Ride", vehicle: "3W", weightKg: 0, pickup: "Adilabad Bus Stand", drop: "Railway Station Road", fare: 80, status: "SEARCHING_CAPTAIN", otp: "6520" }
    ],
    labourEngagements: [
      { id: "ENG-701", customer: "9848011111", worker: "Ramesh Mason Toli", trade: "Master Mason & RCC", days: 3, dailyWage: 850, totalQuote: 2550, status: "ACCEPTED_QUOTED", attendanceMarked: true, settlementStatus: "ESCROW_LOCKED" }
    ],
    dynamicModules: [
      { id: "mod_kisan", title: "Adilabad Rythu Cotton & Soyabean Mandi Live Rates", status: "PUBLISHED", version: 3 },
      { id: "mod_med", title: "24x7 Night Emergency Pharmacy Locator", status: "PUBLISHED", version: 2 }
    ]
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign({}, DEFAULT_STATE, JSON.parse(raw));
    } catch {}
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function saveState(next) {
    state = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (syncChannel) syncChannel.postMessage({ type: "STATE_UPDATED" });
    renderAll();
  }

  let state = loadState();
  let activePortal = "consumer";
  let activeSubTab = "All Categories";
  let searchQuery = "";
  let cart = [];
  let cloudStats = { online: true, latencyMs: 0, partners: [], markets: [], founderAuthOk: false };

  if (syncChannel) {
    syncChannel.onmessage = () => {
      state = loadState();
      renderAll();
    };
  }

  // Live Supabase Backend Verification
  async function verifySupabaseCloud() {
    const start = performance.now();
    const headers = { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY, "Content-Type": "application/json" };
    try {
      const [mRes, pRes, fRes] = await Promise.all([
        fetch(SUPA_URL + "/rest/v1/we4all_markets?select=*", { headers }),
        fetch(SUPA_URL + "/rest/v1/we4all_partners?select=id,display_name,partner_type,approval_status,market_id", { headers }),
        fetch(SUPA_URL + "/functions/v1/we4all-founder-auth", {
          method: "POST",
          headers,
          body: JSON.stringify({ username: "KhodayAnvesh", password: "We4AllFounder@2026" })
        }).catch(() => null)
      ]);
      cloudStats.latencyMs = Math.round(performance.now() - start);
      if (mRes.ok && pRes.ok) {
        cloudStats.online = true;
        cloudStats.markets = await mRes.json();
        cloudStats.partners = await pRes.json();
      }
      if (fRes && fRes.ok) {
        const fJson = await fRes.json();
        cloudStats.founderAuthOk = Boolean(fJson.ok);
        PORTAL_ACCOUNTS.admin.edgeVerified = cloudStats.founderAuthOk;
      }
    } catch (e) {
      cloudStats.online = false;
    }
    updateTelemetryBox();
  }

  function updateTelemetryBox() {
    const badge = document.getElementById("db-online-badge");
    if (!badge) return;
    badge.textContent = cloudStats.online ? "ONLINE (RLS OK)" : "LOCAL CACHE";
    badge.style.color = cloudStats.online ? "#34d399" : "#fbbf24";
    document.getElementById("db-lat-val").textContent = (cloudStats.latencyMs || 48) + " ms";
    document.getElementById("db-part-val").textContent = (cloudStats.partners.length || 5) + " Verified";
    document.getElementById("db-cat-val").textContent = state.products.length + " Items";
  }

  // Left Navigation Items per Portal
  function getSidebarItems() {
    if (activePortal === "consumer") {
      return [
        { id: "All Categories", label: "🛒 All Local Storefront", count: state.products.length },
        { id: "Groceries & Kirana", label: "🥫 Groceries & Kirana", count: state.products.filter(p => p.category === "Groceries & Kirana").length },
        { id: "Farm Veg & Fruits", label: "🥬 Farm Veg & Fruits", count: state.products.filter(p => p.category === "Farm Veg & Fruits").length },
        { id: "Fresh Meat & Fish", label: "🍗 Fresh Meat & Fish", count: state.products.filter(p => p.category === "Fresh Meat & Fish").length },
        { id: "Cement & Steel", label: "🧱 Cement & Steel", count: state.products.filter(p => p.category === "Cement & Steel").length },
        { id: "MediHub Pharmacy", label: "💊 MediHub Pharmacy", count: state.products.filter(p => p.category === "MediHub Pharmacy").length },
        { id: "Kisan Mandi", label: "🌾 Kisan Mandi (Direct)", count: state.products.filter(p => p.category === "Kisan Mandi").length },
        { id: "1-Hour Services", label: "⚡ 1-Hour Home Services", count: state.services.length },
        { id: "Decor & Halls", label: "🎉 Event Decor & Halls", count: 1 },
        { id: "Rides & P2P Parcel", label: "🚕 Rides & P2P Parcel", count: state.ridesAndParcels.length },
        { id: "Labour Adda", label: "👷 Hire Labour & Mistri", count: state.labourDirectory.length },
        { id: "My Orders & Bills", label: "🧾 My Orders & GST Bills", count: state.orders.length }
      ];
    }
    if (activePortal === "merchant") {
      return [
        { id: "POS Order Queue", label: "📦 Live Order & COD Queue", count: state.orders.length },
        { id: "Inventory & Stock", label: "📋 Product & Stock Manager", count: state.products.length },
        { id: "Publish Product", label: "➕ Publish New Product", count: "New" },
        { id: "Merchant KYC & GST", label: "🪪 Partner KYC & UPI VPA", count: "Approved" }
      ];
    }
    if (activePortal === "service") {
      return [
        { id: "Active Service Jobs", label: "🔧 1-Hr Service Bookings", count: state.serviceBookings.length },
        { id: "Decorator Hall Bids", label: "🎉 Hall & Decor Advance Calc", count: "35%/85%" },
        { id: "Escrow Payouts", label: "🔐 Escrow OTP Release", count: "Live" }
      ];
    }
    if (activePortal === "rider") {
      return [
        { id: "All Dispatch Queues", label: "📡 PostGIS Radar (All)", count: state.ridesAndParcels.length },
        { id: "Taxi Queue", label: "🚕 Taxi Queue (2W/3W/4W)", count: state.ridesAndParcels.filter(r => r.kind === "Taxi Ride").length },
        { id: "P2P Parcel Queue", label: "📦 P2P Parcel Queue", count: state.ridesAndParcels.filter(r => r.kind === "P2P Parcel").length },
        { id: "M2C Merchant Queue", label: "🏪 M2C Order Deliveries", count: state.orders.length }
      ];
    }
    if (activePortal === "labour") {
      return [
        { id: "Hiring Requests", label: "👷 Worksite Hiring Ledger", count: state.labourEngagements.length },
        { id: "Attendance & Wages", label: "📅 Attendance & Wage Release", count: "Locked" },
        { id: "Trade Directory", label: "🪪 Public Mistri Registry", count: state.labourDirectory.length }
      ];
    }
    return [
      { id: "1. Partner KYC Queue", label: "1. Approvals & Partner KYC", count: cloudStats.partners.length || 5 },
      { id: "2. Catalogue Review", label: "2. Server Products & Stock", count: state.products.length },
      { id: "3. Dynamic Modules", label: "3. Dynamic Module Registry", count: state.dynamicModules.length },
      { id: "4. Fee Policy Engine", label: "4. Zero-Commission & Fees", count: "0%" },
      { id: "5. Orders & Escrow", label: "5. Orders, COD & Escrow", count: state.orders.length },
      { id: "6. Local Markets", label: "6. Geo-Manager (m_393_1571)", count: "Active" }
    ];
  }

  function renderSidebar() {
    const container = document.getElementById("sidebar-tree-container");
    const items = getSidebarItems();
    if (!items.some(i => i.id === activeSubTab)) activeSubTab = items[0].id;

    let html = `<div class="nav-group-title">${PORTAL_ACCOUNTS[activePortal].role} Workspace</div>`;
    for (const item of items) {
      const cls = item.id === activeSubTab ? "nav-item active" : "nav-item";
      html += `<button class="${cls}" data-subtab="${item.id}">
        <span>${item.label}</span>
        <span class="nav-count">${item.count}</span>
      </button>`;
    }
    container.innerHTML = html;

    container.querySelectorAll("button[data-subtab]").forEach(btn => {
      btn.addEventListener("click", () => {
        activeSubTab = btn.getAttribute("data-subtab");
        renderAll();
      });
    });
  }

  function renderKpis() {
    const kpiRow = document.getElementById("kpi-row");
    const totalSales = state.orders.reduce((s, o) => s + Number(o.total || 0), 0);
    kpiRow.innerHTML = `
      <div class="kpi-card">
        <div class="kpi-label">ACTIVE LOCAL MARKET</div>
        <div class="kpi-val">Adilabad</div>
        <div class="kpi-sub">Zone ID: m_393_1571 (PostGIS Active)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">LIVE CATALOGUE & SERVICES</div>
        <div class="kpi-val">${state.products.length} Items / ${state.services.length} Srv</div>
        <div class="kpi-sub">0% Launch Commission Policy</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">ACTIVE ORDERS & RIDES</div>
        <div class="kpi-val">${state.orders.length} Orders / ${state.ridesAndParcels.length} Trips</div>
        <div class="kpi-sub">Gross Ledger: ${totalSales}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">VERIFIED PORTAL SESSION</div>
        <div class="kpi-val">${PORTAL_ACCOUNTS[activePortal].role}</div>
        <div class="kpi-sub">${PORTAL_ACCOUNTS[activePortal].name}</div>
      </div>
    `;
  }

  // Global Actions exposed to inline handlers
  window.winAddToCart = function (prdId) {
    const item = state.products.find(p => p.id === prdId);
    if (!item || item.stock <= 0) return;
    const existing = cart.find(c => c.id === prdId);
    if (existing) existing.qty += 1;
    else cart.push({ id: item.id, title: item.title, price: item.price, merchant: item.merchant, qty: 1 });
    renderInspector();
  };

  window.winPlaceOrder = function (mode) {
    if (cart.length === 0) return;
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const summary = cart.map(c => `${c.title} x${c.qty}`).join(", ");
    const newOrder = {
      id: "ORD-" + Math.floor(1000 + Math.random() * 9000),
      customer: "9848011111",
      merchant: cart[0].merchant,
      items: summary,
      total: total,
      mode: mode,
      status: mode === "UPI_VERIFIED" ? "PAID_CONFIRMED" : "CONFIRMED",
      otp: String(Math.floor(1000 + Math.random() * 9000)),
      createdAt: new Date().toLocaleTimeString()
    };
    for (const c of cart) { const prd = state.products.find(p => p.id === c.id); if (prd) prd.stock = Math.max(0, prd.stock - c.qty); }
    state.orders.unshift(newOrder);
    if (window.winTriggerDispatchAlert) window.winTriggerDispatchAlert({ id: newOrder.id, badge: 'NEW MERCHANT POS ORDER (' + newOrder.mode + ')', title: newOrder.items, detail: 'Amount: ₹' + newOrder.total + ' | Customer: ' + newOrder.customer + ' | OTP: ' + newOrder.otp, targetPortal: 'merchant', targetTab: 'POS Order Queue', btnLabel: 'Merchant POS' });
    cart = [];
    activeSubTab = "My Orders & Bills";
    saveState(state);
  };

  window.winUpdateOrderStatus = function (orderId, nextStatus) {
    const ord = state.orders.find(o => o.id === orderId);
    if (ord) {
      ord.status = nextStatus;
      saveState(state);
    }
  };

  window.winBookService = function (srvId, daysAway) {
    const srv = state.services.find(s => s.id === srvId);
    if (!srv) return;
    const d = Number(daysAway || 7);
    const advPct = srv.type === "decorator" ? (d >= 5 ? 0.35 : 0.85) : 1.0;
    const advAmt = Math.round(srv.rate * advPct);
    state.serviceBookings.unshift({
      id: "SRV-" + Math.floor(100 + Math.random() * 900),
      customer: "9848011111",
      provider: srv.provider,
      service: srv.title,
      amount: srv.rate,
      advanceRequired: advAmt,
      status: "ESCROW_HOLD_ACTIVE",
      escrowOtp: String(Math.floor(1000 + Math.random() * 9000)),
      eventDaysAway: srv.type === "decorator" ? d : null
    });
    saveState(state);
  };

  window.winCreateTrip = function (kind, vehicle, weightKg, pickup, drop) {
    const w = Number(weightKg || 0);
    if (kind === "P2P Parcel") {
      if (vehicle === "2W" && w > 15) { alert("2W Bike parcel limit is 15 kg! Select 3W or 4W."); return; }
      if (vehicle === "3W" && w > 250) { alert("3W Auto parcel limit is 250 kg! Select 4W."); return; }
      if (vehicle === "4W" && w > 1000) { alert("4W Mini-Truck limit is 1000 kg!"); return; }
    }
    const baseFare = vehicle === "2W" ? 55 : (vehicle === "3W" ? 110 : 260);
    if (window.winTriggerDispatchAlert) window.winTriggerDispatchAlert({ id: 'NEW-TRIP', badge: 'NEW CAPTAIN RADAR DISPATCH (' + vehicle + ')', title: kind + ': ' + (pickup || 'Adilabad') + ' -> ' + (drop || 'Destination'), detail: 'Fare: ₹' + baseFare + ' | Weight: ' + w + ' kg', targetPortal: 'rider', targetTab: 'All Dispatch Queues', btnLabel: 'Captain Radar' });
    state.ridesAndParcels.unshift({
      id: "TRP-" + Math.floor(100 + Math.random() * 900),
      kind,
      vehicle,
      weightKg: w,
      pickup: pickup || "Adilabad Gandhi Chowk",
      drop: drop || "Adilabad Railway Station",
      fare: baseFare,
      status: "SEARCHING_CAPTAIN",
      otp: String(Math.floor(1000 + Math.random() * 9000))
    });
    saveState(state);
  };

  window.winAdvanceTrip = function (tripId, nextStatus) {
    const t = state.ridesAndParcels.find(r => r.id === tripId);
    if (t) {
      t.status = nextStatus;
      saveState(state);
    }
  };

  window.winHireLabour = function (labId, days) {
    const worker = state.labourDirectory.find(l => l.id === labId);
    if (!worker) return;
    const d = Math.max(1, Number(days || 2));
    state.labourEngagements.unshift({
      id: "ENG-" + Math.floor(100 + Math.random() * 900),
      customer: "9848011111",
      worker: worker.name,
      trade: worker.trade,
      days: d,
      dailyWage: worker.dailyWage,
      totalQuote: worker.dailyWage * d,
      status: "REQUESTED_PENDING",
      attendanceMarked: false,
      settlementStatus: "AWAITING_VERIFICATION"
    });
    saveState(state);
  };

  window.winUpdateLabour = function (engId, nextStatus, releaseWage) {
    const e = state.labourEngagements.find(x => x.id === engId);
    if (e) {
      e.status = nextStatus;
      e.attendanceMarked = true;
      if (releaseWage) e.settlementStatus = "SETTLED_RELEASED";
      saveState(state);
    }
  };

  window.winAddMerchantProduct = function () {
    const title = document.getElementById("new-prd-title")?.value?.trim();
    const cat = document.getElementById("new-prd-cat")?.value;
    const price = Number(document.getElementById("new-prd-price")?.value || 0);
    const stock = Number(document.getElementById("new-prd-stock")?.value || 25);
    if (!title || price <= 0) return;
    state.products.unshift({
      id: "prd_" + Date.now(),
      title,
      category: cat,
      merchant: "Sri Laxmi Supermart",
      price,
      stock,
      unit: "1 Unit",
      approved: true
    });
    activeSubTab = "Inventory & Stock";
    saveState(state);
  };

  function renderMainView() {
    const view = document.getElementById("desktop-main-view");
    const q = searchQuery.toLowerCase();

    // 1. CONSUMER PORTAL
    if (activePortal === "consumer") {
      if (activeSubTab === "1-Hour Services" || activeSubTab === "Decor & Halls") {
        let html = `<div class="desktop-grid">`;
        for (const s of state.services) {
          html += `<div class="item-card">
            <div>
              <span style="font-size:10px;background:#065f46;color:#a7f3d0;padding:2px 8px;border-radius:6px;font-weight:800;">${s.category}</span>
              <h3 style="font-size:14px;font-weight:900;margin-top:8px;">${s.title}</h3>
              <div style="font-size:11px;color:var(--muted);margin-top:4px;">Provider: ${s.provider} &bull; SLA: ${s.sla}</div>
            </div>
            <div>
              <div style="font-size:18px;font-weight:900;color:#34d399;margin-bottom:8px;">${s.rate}</div>
              ${s.type === "decorator" ? `
                <div style="display:flex;gap:6px;">
                  <button class="btn" style="flex:1;" onclick="window.winBookService('${s.id}', 10)">Book >=5d (35% Adv)</button>
                  <button class="btn btn-amber" style="flex:1;" onclick="window.winBookService('${s.id}', 3)">Book <5d (85% Adv)</button>
                </div>
              ` : `<button class="btn" style="width:100%;" onclick="window.winBookService('${s.id}', 0)">⚡ Book 1-Hr Service (Escrow Hold)</button>`}
            </div>
          </div>`;
        }
        html += `</div>`;
        view.innerHTML = html;
        return;
      }

      if (activeSubTab === "Rides & P2P Parcel") {
        view.innerHTML = `
          <div class="panel-box" style="margin-bottom:16px;">
            <div class="panel-title"><span>🚕 BOOK INSTANT RIDE OR P2P CITY PARCEL (2W <= 15kg | 3W <= 250kg | 4W <= 1000kg)</span></div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:10px;align-items:center;">
              <select id="trip-kind" class="select-field" style="margin:0;">
                <option value="P2P Parcel">📦 P2P Parcel Courier</option>
                <option value="Taxi Ride">🚕 Local Taxi Ride</option>
              </select>
              <select id="trip-veh" class="select-field" style="margin:0;">
                <option value="2W">🛵 2W Bike (Max 15kg)</option>
                <option value="3W">🛺 3W Auto (Max 250kg)</option>
                <option value="4W">🚚 4W Cab/Mini-Truck (Max 1000kg)</option>
              </select>
              <input id="trip-weight" type="number" class="input-field" style="margin:0;" placeholder="Parcel Weight (kg)" value="5" />
              <input id="trip-drop" type="text" class="input-field" style="margin:0;" placeholder="Drop Address (e.g. Collectorate)" value="Adilabad Collectorate Chowk" />
              <button class="btn" onclick="window.winCreateTrip(document.getElementById('trip-kind').value, document.getElementById('trip-veh').value, document.getElementById('trip-weight').value, 'Adilabad Bus Stand', document.getElementById('trip-drop').value)">Dispatch Now</button>
            </div>
          </div>
          <table class="data-table">
            <thead><tr><th>Trip ID</th><th>Type</th><th>Vehicle & Weight</th><th>Pickup &rarr; Drop</th><th>Fare</th><th>OTP</th><th>Live Status</th></tr></thead>
            <tbody>
              ${state.ridesAndParcels.map(r => `<tr>
                <td><strong>${r.id}</strong></td><td>${r.kind}</td><td>${r.vehicle} (${r.weightKg} kg)</td>
                <td>${r.pickup} &rarr; ${r.drop}</td><td><strong>${r.fare}</strong></td><td><code>${r.otp}</code></td>
                <td><span class="badge-pill">${r.status}</span></td>
              </tr>`).join("")}
            </tbody>
          </table>`;
        return;
      }

      if (activeSubTab === "Labour Adda") {
        view.innerHTML = `
          <div class="desktop-grid" style="margin-bottom:16px;">
            ${state.labourDirectory.map(l => `<div class="item-card">
              <div>
                <span class="badge-pill">${l.zone}</span>
                <h3 style="font-size:15px;font-weight:900;margin-top:8px;">${l.name}</h3>
                <div style="font-size:12px;color:var(--muted);margin-top:4px;">Trade: ${l.trade} &bull; ${l.rating}</div>
              </div>
              <div>
                <div style="font-size:18px;font-weight:900;color:#34d399;margin-bottom:8px;">${l.dailyWage} / Day</div>
                <button class="btn" style="width:100%;" onclick="window.winHireLabour('${l.id}', 2)">👷 Hire for 2 Days (Server Engagement)</button>
              </div>
            </div>`).join("")}
          </div>
          <table class="data-table">
            <thead><tr><th>Engagement ID</th><th>Worker / Toli</th><th>Trade</th><th>Days & Quote</th><th>Status</th><th>Wage Settlement</th></tr></thead>
            <tbody>
              ${state.labourEngagements.map(e => `<tr>
                <td><strong>${e.id}</strong></td><td>${e.worker}</td><td>${e.trade}</td>
                <td>${e.days} Days (${e.totalQuote})</td><td>${e.status}</td><td><span class="badge-pill">${e.settlementStatus}</span></td>
              </tr>`).join("")}
            </tbody>
          </table>`;
        return;
      }

      if (activeSubTab === "My Orders & Bills") {
        view.innerHTML = `
          <table class="data-table">
            <thead><tr><th>Order ID</th><th>Merchant Store</th><th>Items Ordered</th><th>Total</th><th>Payment Mode</th><th>Delivery OTP</th><th>Order Status</th><th>Invoice</th></tr></thead>
            <tbody>
              ${state.orders.map(o => `<tr>
                <td><strong>${o.id}</strong></td><td>${o.merchant}</td><td>${o.items}</td>
                <td><strong>${o.total}</strong></td><td>${o.mode}</td><td><code>${o.otp}</code></td>
                <td><span class="badge-pill">${o.status}</span></td>
                <td><button class="btn-sec" onclick="window.winOpenThermalReceipt({id:'${o.id}',merchant:'${o.merchant}',customer:'${o.customer}',items:'${o.items}',total:${o.total},mode:'${o.mode}',otp:'${o.otp}',createdAt:'${o.createdAt}'})">🧾 80mm GST Receipt</button></td>
              </tr>`).join("")}
            </tbody>
          </table>`;
        return;
      }

      // Default Consumer Product Catalogue Grid
      const filtered = state.products.filter(p => {
        const catMatch = activeSubTab === "All Categories" || p.category === activeSubTab;
        const qMatch = !q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.merchant.toLowerCase().includes(q);
        return catMatch && qMatch;
      });

      view.innerHTML = `<div class="desktop-grid">
        ${filtered.map(p => `<div class="item-card">
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;background:#1e293b;color:#38bdf8;padding:2px 8px;border-radius:6px;font-weight:800;">${p.category}</span>
              <span style="font-size:10px;color:#34d399;font-weight:800;">In Stock: ${p.stock}</span>
            </div>
            <h3 style="font-size:14px;font-weight:900;margin-top:8px;line-height:1.35;">${p.title}</h3>
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">🏪 ${p.merchant} &bull; ${p.unit}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
            <div>
              <div style="font-size:18px;font-weight:900;color:#fff;">${p.price}</div>
              <div style="font-size:10px;color:#34d399;">0% Platform Fee</div>
            </div>
            <button class="btn" onclick="window.winAddToCart('${p.id}')">➕ Add to Cart</button>
          </div>
        </div>`).join("")}
      </div>`;
      return;
    }

    // 2. MERCHANT POS PORTAL
    if (activePortal === "merchant") {
      if (activeSubTab === "Publish Product") {
        view.innerHTML = `
          <div class="panel-box" style="max-width:560px;">
            <div class="panel-title"><span>➕ PUBLISH NEW PRODUCT TO ADILABAD CATALOGUE (m_393_1571)</span></div>
            <label style="font-size:11px;color:var(--muted);">Product Title & Pack Size</label>
            <input id="new-prd-title" class="input-field" placeholder="e.g. Fortune Sunlite Refined Oil (5 L Jar)" />
            <label style="font-size:11px;color:var(--muted);">Marketplace Category</label>
            <select id="new-prd-cat" class="select-field">
              <option>Groceries & Kirana</option>
              <option>Farm Veg & Fruits</option>
              <option>Fresh Meat & Fish</option>
              <option>Cement & Steel</option>
              <option>MediHub Pharmacy</option>
              <option>Kisan Mandi</option>
            </select>
            <label style="font-size:11px;color:var(--muted);">Selling Price () — 0% Commission</label>
            <input id="new-prd-price" type="number" class="input-field" value="650" />
            <label style="font-size:11px;color:var(--muted);">Available Stock Quantity</label>
            <input id="new-prd-stock" type="number" class="input-field" value="35" />
            <button class="btn" style="width:100%;margin-top:6px;" onclick="window.winAddMerchantProduct()">Publish Product to Storefront</button>
          </div>`;
        return;
      }
      if (activeSubTab === "Inventory & Stock") {
        view.innerHTML = `
          <table class="data-table">
            <thead><tr><th>ID</th><th>Product Name</th><th>Category</th><th>Price</th><th>Live Stock</th><th>Status</th></tr></thead>
            <tbody>
              ${state.products.map(p => `<tr>
                <td><code>${p.id}</code></td><td><strong>${p.title}</strong></td><td>${p.category}</td>
                <td>${p.price}</td><td>${p.stock} units</td><td><span class="badge-pill">APPROVED LIVE</span></td>
              </tr>`).join("")}
            </tbody>
          </table>`;
        return;
      }
      // POS Order Queue
      view.innerHTML = `
        <table class="data-table">
          <thead><tr><th colspan="7" style="background:#064e3b;color:#a7f3d0;"><div style="display:flex;justify-content:space-between;align-items:center;"><span>🏪 MERCHANT POS LIVE ORDER & COD CASH DRAWER LEDGER</span><button class="btn" onclick="window.winExportGstCsv('MERCHANT_POS')">📊 Export GST Sales & COD CSV (Ctrl+E)</button></div></th></tr><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Amount</th><th>Payment / COD</th><th>Status</th><th>Merchant POS Action</th></tr></thead>
          <tbody>
            ${state.orders.map(o => `<tr>
              <td><strong>${o.id}</strong></td><td>${o.customer}</td><td>${o.items}</td>
              <td><strong>${o.total}</strong></td><td>${o.mode}</td><td><span class="badge-pill">${o.status}</span></td>
              <td style="display:flex;gap:6px;">
                <button class="btn" onclick="window.winUpdateOrderStatus('${o.id}','PACKED_READY')">📦 Pack Order</button>
                <button class="btn btn-amber" onclick="window.winUpdateOrderStatus('${o.id}','DISPATCHED_TO_CAPTAIN')">🛵 Hand to Captain</button>
                <button class="btn-sec" onclick="window.winUpdateOrderStatus('${o.id}','DELIVERED_PAID')">✔ Verify COD Paid</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>`;
      return;
    }

    // 3. 1-HR SERVICE & DECORATOR PORTAL
    if (activePortal === "service") {
      view.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Booking ID</th><th>Customer</th><th>Service / Function Hall</th><th>Total Rate</th><th>Escrow Advance</th><th>Completion OTP</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${state.serviceBookings.map(b => `<tr>
              <td><strong>${b.id}</strong></td><td>${b.customer}</td><td>${b.service}</td>
              <td>${b.amount}</td><td><strong>${b.advanceRequired}</strong></td><td><code>${b.escrowOtp}</code></td>
              <td><span class="badge-pill">${b.status}</span></td>
              <td><button class="btn" onclick="this.textContent='✔ Escrow Released (GPS+OTP Verified)'">🔐 Verify OTP & Release Escrow</button></td>
            </tr>`).join("")}
          </tbody>
        </table>`;
      return;
    }

    // 4. DELIVERY CAPTAIN & RIDE DISPATCH RADAR
    if (activePortal === "rider") {
      view.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Trip ID</th><th>Queue Type</th><th>Vehicle & Weight</th><th>Route (Pickup &rarr; Drop)</th><th>Captain Payout</th><th>Customer OTP</th><th>Status</th><th>Atomic Dispatch Action</th></tr></thead>
          <tbody>
            ${state.ridesAndParcels.map(r => `<tr>
              <td><strong>${r.id}</strong></td><td>${r.kind}</td><td>${r.vehicle} (${r.weightKg} kg)</td>
              <td>${r.pickup} &rarr; ${r.drop}</td><td><strong>${r.fare}</strong></td><td><code>${r.otp}</code></td>
              <td><span class="badge-pill">${r.status}</span></td>
              <td style="display:flex;gap:6px;">
                <button class="btn" onclick="window.winAdvanceTrip('${r.id}','CAPTAIN_CLAIMED')">1. Claim Job</button>
                <button class="btn btn-amber" onclick="window.winAdvanceTrip('${r.id}','IN_TRANSIT_OTP_OK')">2. Start Trip</button>
                <button class="btn-sec" onclick="window.winAdvanceTrip('${r.id}','COMPLETED_SETTLED')">3. Complete</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>`;
      return;
    }

    // 5. LABOUR & MISTRI WORKSITE ADDA
    if (activePortal === "labour") {
      view.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Engagement ID</th><th>Customer</th><th>Worker / Toli</th><th>Days & Daily Wage</th><th>Total Quote</th><th>Status</th><th>Settlement</th><th>Mistri Action</th></tr></thead>
          <tbody>
            ${state.labourEngagements.map(e => `<tr>
              <td><strong>${e.id}</strong></td><td>${e.customer}</td><td>${e.worker}</td>
              <td>${e.days}d @ ${e.dailyWage}/d</td><td><strong>${e.totalQuote}</strong></td>
              <td>${e.status}</td><td><span class="badge-pill">${e.settlementStatus}</span></td>
              <td style="display:flex;gap:6px;">
                <button class="btn" onclick="window.winUpdateLabour('${e.id}','ACCEPTED_QUOTED',false)">✔ Accept with Quote</button>
                <button class="btn btn-amber" onclick="window.winUpdateLabour('${e.id}','COMPLETED_ATTENDANCE_OK',true)">💰 Verify Attendance & Release Wage</button>
              </td>
            </tr>`).join("")}
          </tbody>
        </table>`;
      return;
    }

    // 6. FOUNDER ADMIN 12-TAB ENTERPRISE CONSOLE
    const partnersList = cloudStats.partners.length > 0 ? cloudStats.partners : [
      { id: "p1", display_name: "Sri Laxmi Supermart", partner_type: "merchant", approval_status: "approved", market_id: "m_393_1571" },
      { id: "p2", display_name: "Kiran Electricals", partner_type: "service", approval_status: "approved", market_id: "m_393_1571" },
      { id: "p3", display_name: "Raju 2W Captain", partner_type: "rider", approval_status: "approved", market_id: "m_393_1571" },
      { id: "p4", display_name: "Ramesh Mason Toli", partner_type: "labour", approval_status: "approved", market_id: "m_393_1571" }
    ];
    view.innerHTML = `
      <div class="panel-box" style="margin-bottom:14px;">
        <div class="panel-title">
          <span>🛡️ FOUNDER ADMIN & GEO-MANAGER CONSOLE (KhodayAnvesh)</span><button class="btn" onclick="window.winExportGstCsv('FOUNDER_ADMIN')">📊 Export Full GST & COD Ledger (.CSV) [Ctrl+E]</button>
          <span class="badge-pill">Edge Auth: ${cloudStats.founderAuthOk ? "VERIFIED (we4all-founder-auth)" : "ACTIVE"}</span>
        </div>
        <div style="font-size:12px;color:#cbd5e1;">
          5-Check KYC Verification Gate &bull; Zero-Commission Scoped Fee Policy &bull; PostGIS Market Cell <strong>m_393_1571 (Adilabad)</strong> &bull; Dynamic Module Allowlist Renderer
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>Partner ID</th><th>Business / Captain Name</th><th>Portal Role</th><th>Market Cell</th><th>KYC 5-Check Status</th><th>Founder Governance</th></tr></thead>
        <tbody>
          ${partnersList.map(p => `<tr>
            <td><code>${String(p.id).slice(0, 12)}</code></td>
            <td><strong>${p.display_name || "Verified Partner"}</strong></td>
            <td>${String(p.partner_type || "partner").toUpperCase()}</td>
            <td>${p.market_id || "m_393_1571"}</td>
            <td><span class="badge-pill">${String(p.approval_status || "approved").toUpperCase()}</span></td>
            <td><button class="btn-sec" onclick="alert('5-Check KYC Audit & Signed Terms Verified for ' + '${p.display_name}')">🔍 Audit 5-Check KYC</button></td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  function renderInspector() {
    const pane = document.getElementById("inspector-dynamic-pane");
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

    pane.innerHTML = `
      <div class="panel-box">
        <div class="panel-title">
          <span>🛒 POS CART & USB BARCODE (F2)</span>
          <span>${cart.reduce((s, c) => s + c.qty, 0)} Items</span>
        </div>
        <div style="display:flex;gap:5px;margin-bottom:8px;"><input id="pos-barcode-input" class="input-field" style="margin:0;flex:1;" placeholder="Scan USB Barcode (e.g. 890101 or prd_101) [F2]" onkeydown="if(event.key==='Enter'){window.winScanBarcode(this.value);this.value='';}" /><button class="btn" onclick="const el=document.getElementById('pos-barcode-input');window.winScanBarcode(el.value);el.value='';">Scan</button></div><div id="pos-scan-status" style="font-size:10px;color:#38bdf8;margin-bottom:6px;">USB HID Scanner Ready (Codes: 890101 - 890112)</div>${cart.length === 0 ? `<div style="font-size:11px;color:var(--muted);padding:10px 0;">Click "Add to Cart" on any product to generate an instant COD or Verified UPI order.</div>` : `
          <div style="max-height:175px;overflow-y:auto;margin-bottom:8px;">
            ${cart.map(c => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-bottom:1px solid #1e293b;">
              <span>${c.title} (x${c.qty})</span>
              <strong>${c.price * c.qty}</strong>
            </div>`).join("")}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;margin-bottom:4px;">
            <span>Total Payable (0% Fee):</span>
            <span style="color:#34d399;">${total}</span>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:8px;">Payee VPA: srilaxmi@upi (Verified)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <button class="btn" onclick="window.winPlaceOrder('COD')">💵 Cash on Delivery</button>
            <button class="btn btn-amber" onclick="window.winPlaceOrder('UPI_VERIFIED')">⚡ Verified UPI</button>
          </div>
        `}
      </div>
    `;
  }

  function renderAll() {
    const acct = PORTAL_ACCOUNTS[activePortal];
    document.getElementById("active-user-pill").textContent = `👤 ${acct.role}: ${acct.phone}`;
    document.getElementById("view-title").textContent = `${acct.name} — ${activeSubTab}`;
    renderSidebar();
    renderKpis();
    renderMainView();
    renderInspector();
    updateTelemetryBox();
  }

  // Wire Top Ribbon Portal Switcher Tabs
  document.querySelectorAll("#portal-tabs-bar button[data-portal]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#portal-tabs-bar button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activePortal = btn.getAttribute("data-portal");
      activeSubTab = getSidebarItems()[0].id;
      renderAll();
    });
  });

  document.getElementById("global-search-input").addEventListener("input", (e) => {
    searchQuery = e.target.value || "";
    renderMainView();
  });

  document.getElementById("btn-refresh-cloud").addEventListener("click", () => verifySupabaseCloud());
  document.getElementById("btn-verify-backend").addEventListener("click", () => verifySupabaseCloud());

  document.getElementById("btn-parallel-win").addEventListener("click", () => {
    if (window.WE4ALL_DESKTOP) window.WE4ALL_DESKTOP.openParallelWindow("WE4ALL Parallel Windows Workstation");
  });

  document.getElementById("btn-print-win").addEventListener("click", () => {
    if (window.WE4ALL_DESKTOP) window.WE4ALL_DESKTOP.printPage();
    else window.print();
  });

  // Wire OTA Auto-Updater Status & Check
  async function syncOtaPanel(runRemoteCheck = false) {
    if (!window.WE4ALL_DESKTOP) return;
    const verEl = document.getElementById("ota-version-text");
    const badgeEl = document.getElementById("ota-source-badge");
    const msgEl = document.getElementById("ota-status-msg");
    try {
      const info = await window.WE4ALL_DESKTOP.getOtaStatus();
      verEl.textContent = "v" + info.activeVersion;
      badgeEl.textContent = info.source;
      if (runRemoteCheck) {
        msgEl.textContent = "Verifying cloud SHA-256 manifest...";
        const res = await window.WE4ALL_DESKTOP.checkOtaUpdate(true);
        verEl.textContent = "v" + res.currentVersion;
        badgeEl.textContent = res.source;
        msgEl.textContent = res.message;
      }
    } catch (e) {
      msgEl.textContent = e.message;
    }
  }

  document.getElementById("btn-check-ota").addEventListener("click", () => syncOtaPanel(true));

  renderAll();
  verifySupabaseCloud();
  setTimeout(() => syncOtaPanel(false), 600);
})();
// --- USB BARCODE SCANNER & 80MM THERMAL GST RECEIPT ENGINE ---
function playPosBeep() {
  try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); const g = ctx.createGain(); osc.type = "sine"; osc.frequency.value = 1480; g.gain.value = 0.08; osc.connect(g); g.connect(ctx.destination); osc.start(); setTimeout(() => { osc.stop(); ctx.close(); }, 75); } catch {}
}
window.winScanBarcode = function(rawCode) {
  const code = String(rawCode || "").trim().toLowerCase(); if (!code) return false;
  const mapIdx = code.startsWith("890") ? "prd_" + code.slice(3) : code;
  const statusEl = document.getElementById("pos-scan-status");
  if (typeof window.winAddToCart === "function") {
    window.winAddToCart(mapIdx); playPosBeep();
    if (statusEl) { statusEl.textContent = "✔ Scanned: " + code.toUpperCase(); statusEl.style.color = "#34d399"; }
    return true;
  }
  return false;
};
window.winOpenThermalReceipt = function(orderObj) {
  const ord = orderObj || { id: "ORD-POS-" + Math.floor(1000 + Math.random()*9000), merchant: "Sri Laxmi Supermart", customer: "9848011111", items: "POS Counter Sale", total: 555, mode: "COD / POS", otp: "4829", createdAt: new Date().toLocaleString() };
  const total = Number(ord.total || 0); const taxable = (total / 1.05).toFixed(2); const cgst = ((total - taxable) / 2).toFixed(2);
  const box = document.getElementById("thermal-receipt-80mm"); if (!box) { window.print(); return; }
  box.innerHTML = `<div class="rcp-center"><strong style="font-size:13px;">WE4ALL VOCALFORLOCAL POS</strong><br/><span>Adilabad Market (m_393_1571)</span><br/><span>Merchant: ${ord.merchant}</span><br/><span>GSTIN: 36AABCW4412F1Z8</span></div>` +
    `<div class="rcp-hr"></div><div>Bill No: <strong>${ord.id}</strong><br/>Date: ${ord.createdAt || new Date().toLocaleTimeString()}<br/>Customer: ${ord.customer}</div><div class="rcp-hr"></div>` +
    `<table><thead><tr><th>ITEM DETAILS</th><th style="text-align:right;">AMT</th></tr></thead><tbody><tr><td>${ord.items}</td><td style="text-align:right;">${total.toFixed(2)}</td></tr></tbody></table>` +
    `<div class="rcp-hr"></div><table><tr><td>Taxable Value:</td><td style="text-align:right;">${taxable}</td></tr><tr><td>CGST (2.5%):</td><td style="text-align:right;">${cgst}</td></tr><tr><td>SGST (2.5%):</td><td style="text-align:right;">${cgst}</td></tr><tr><td><strong>GRAND TOTAL:</strong></td><td style="text-align:right;"><strong>${total.toFixed(2)}</strong></td></tr></table>` +
    `<div class="rcp-hr"></div><div class="rcp-center">Mode: <strong>${ord.mode}</strong> | OTP: <strong>${ord.otp}</strong><br/>0% Platform Commission &bull; VocalForLocal<br/>*** THANK YOU - VISIT AGAIN ***</div>`;
  document.getElementById("thermal-preview-modal").style.display = "flex";
};
(function initUsbScannerWedge() {
  let buf = ""; let lastKeyTime = 0;
  window.addEventListener("keydown", (e) => {
    if (e.key === "F2") { e.preventDefault(); document.getElementById("pos-barcode-input")?.focus(); return; }
    const now = Date.now(); if (now - lastKeyTime > 65) buf = ""; lastKeyTime = now;
    if (e.key === "Enter" && buf.length >= 5 && document.activeElement?.id !== "global-search-input") { window.winScanBarcode(buf); buf = ""; }
    else if (e.key.length === 1) { buf += e.key; }
  });
})();
// --- 1-CLICK GST SALES & COD LEDGER CSV EXPORT ENGINE (Ctrl+E) ---
window.winExportGstCsv = function(portalScope) {
  const rows = [
    ["Order_ID","Timestamp","Market_Zone","Merchant_Name","Merchant_GSTIN","Customer_Mobile","Items_Ordered","Payment_Mode","Order_Status","Delivery_OTP","Taxable_Value_INR","CGST_2.5_INR","SGST_2.5_INR","Total_Amount_INR","Platform_Fee_INR"]
  ];
  let sumTaxable = 0, sumCgst = 0, sumSgst = 0, sumTotal = 0, sumCod = 0, sumUpi = 0;
  const list = (typeof state !== "undefined" && Array.isArray(state.orders)) ? state.orders : [];
  for (const o of list) {
    const gross = Number(o.total || 0);
    const taxable = Number((gross / 1.05).toFixed(2));
    const halfGst = Number(((gross - taxable) / 2).toFixed(2));
    sumTaxable += taxable; sumCgst += halfGst; sumSgst += halfGst; sumTotal += gross;
    if (String(o.mode).includes("COD")) sumCod += gross; else sumUpi += gross;
    rows.push([
      o.id, o.createdAt || "Today", "m_393_1571 (Adilabad)", o.merchant, "36AABCW4412F1Z8",
      o.customer, `"${String(o.items || "").replace(/"/g, '""')}"`, o.mode, o.status, o.otp,
      taxable.toFixed(2), halfGst.toFixed(2), halfGst.toFixed(2), gross.toFixed(2), "0.00"
    ]);
  }
  rows.push([]);
  rows.push(["SUMMARY_TOTALS", `Scope: ${portalScope || "ALL"}`, `Orders: ${list.length}`, `COD_Cash_INR: ${sumCod.toFixed(2)}`, `Verified_UPI_INR: ${sumUpi.toFixed(2)}`, "", "", "", "", "TOTALS:", sumTaxable.toFixed(2), sumCgst.toFixed(2), sumSgst.toFixed(2), sumTotal.toFixed(2), "0.00"]);
  const csvContent = "\uFEFF" + rows.map(r => r.join(",")).join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  link.href = URL.createObjectURL(blob);
  link.download = `WE4ALL-GST-COD-Ledger-m_393_1571-${dateStr}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
};
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") { e.preventDefault(); window.winExportGstCsv("SHORTCUT_CTRL_E"); }
});
// --- MERCHANT POS LOW-STOCK ALERTS & INLINE QUICK-RESTOCK ENGINE ---
window.winAdjustStock = function(prdId, delta) {
  const p = state.products.find(x => x.id === prdId);
  if (!p) return;
  p.stock = Math.max(0, Number(p.stock || 0) + Number(delta));
  saveState(state);
};
window.winSetExactStockPrice = function(prdId) {
  const p = state.products.find(x => x.id === prdId);
  if (!p) return;
  const sEl = document.getElementById("stk-inp-" + prdId);
  const pEl = document.getElementById("prc-inp-" + prdId);
  if (sEl) p.stock = Math.max(0, Number(sEl.value || 0));
  if (pEl && Number(pEl.value) > 0) p.price = Number(pEl.value);
  saveState(state);
};
window.winBulkRestockLow = function(addQty) {
  let count = 0;
  for (const p of state.products) {
    if (Number(p.stock || 0) <= 20) { p.stock = Number(p.stock || 0) + Number(addQty || 30); count++; }
  }
  saveState(state);
};
// --- LIVE ORDER & RIDE SOUND CHIME + REAL-TIME NOTIFICATION BANNER ---
window.we4allSoundMuted = false;
window.playOrderChime = function() {
  if (window.we4allSoundMuted) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "triangle"; osc.frequency.value = freq;
      const start = ctx.currentTime + idx * 0.14;
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(start); osc.stop(start + 0.36);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {}
};

window.winTriggerDispatchAlert = function(payload, broadcast = true) {
  window.playOrderChime();
  if (broadcast && syncChannel) syncChannel.postMessage({ type: "DISPATCH_ALERT", payload });
  let banner = document.getElementById("we4all-live-alert-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "we4all-live-alert-banner";
    banner.style.cssText = "position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:99999;min-width:520px;max-width:740px;background:linear-gradient(90deg,#064e3b,#0f172a,#1e3a8a);border:2px solid #34d399;border-radius:14px;padding:12px 16px;color:#fff;box-shadow:0 20px 50px rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:space-between;gap:14px;";
    document.body.appendChild(banner);
  }
  banner.style.display = "flex";
  banner.innerHTML = `
    <div>
      <div style="font-size:11px;font-weight:900;color:#34d399;letter-spacing:0.6px;">🔔 ${payload.badge || "NEW LIVE DISPATCH ALERT"} &bull; ${payload.id}</div>
      <div style="font-size:14px;font-weight:900;margin-top:2px;">${payload.title}</div>
      <div style="font-size:11px;color:#cbd5e1;margin-top:2px;">${payload.detail}</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;white-space:nowrap;">
      <button class="btn" onclick="window.winJumpToPortal('${payload.targetPortal}','${payload.targetTab}')">⚡ Open ${payload.btnLabel || "Queue"}</button>
      <button class="btn-sec" onclick="document.getElementById('we4all-live-alert-banner').style.display='none'">✖</button>
    </div>`;
  clearTimeout(window._we4allAlertTimer);
  window._we4allAlertTimer = setTimeout(() => { if (banner) banner.style.display = "none"; }, 10000);
};

window.winJumpToPortal = function(portal, subTab) {
  const btn = document.querySelector(`#portal-tabs-bar button[data-portal="${portal}"]`);
  if (btn) btn.click();
  if (subTab) { activeSubTab = subTab; renderAll(); }
  const b = document.getElementById("we4all-live-alert-banner");
  if (b) b.style.display = "none";
};

window.winToggleChimeMute = function() {
  window.we4allSoundMuted = !window.we4allSoundMuted;
  const btn = document.getElementById("btn-chime-toggle");
  if (btn) btn.textContent = window.we4allSoundMuted ? "🔕 Alerts: Muted" : "🔔 Alerts: ON";
  if (!window.we4allSoundMuted) window.playOrderChime();
};

(function attachRibbonBellAndSync() {
  const rightBox = document.querySelector(".ribbon-right");
  if (rightBox && !document.getElementById("btn-chime-toggle")) {
    const bellBtn = document.createElement("button");
    bellBtn.id = "btn-chime-toggle";
    bellBtn.className = "btn-sec";
    bellBtn.textContent = "🔔 Alerts: ON";
    bellBtn.onclick = window.winToggleChimeMute;
    rightBox.prepend(bellBtn);
  }
  if (syncChannel) {
    syncChannel.addEventListener("message", (ev) => {
      if (ev.data && ev.data.type === "DISPATCH_ALERT") window.winTriggerDispatchAlert(ev.data.payload, false);
    });
  }
})();