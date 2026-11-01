import React, { useState } from "react";

// ============================================================================
// 1. PORTAL-BY-PORTAL ADDITIVE ENHANCEMENT STRIP (FOR EXISTING PORTALS 1 TO 5)
// Adds trending super-app tools to each portal without removing existing code
// ============================================================================
export function PortalPowerToolsBar({
  activePortal,
  lang = "EN",
  searchQuery = "",
  setSearchQuery = () => {},
  onTriggerToast = () => {}
}) {
  const [buzzerOn, setBuzzerOn] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [partsEstimate, setPartsEstimate] = useState({ partName: "", cost: "" });
  const [guestCount, setGuestCount] = useState(300);
  const [fuelKm, setFuelKm] = useState(35);
  const [listening, setListening] = useState(false);

  const playOrderBuzzer = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
      onTriggerToast("Loud Order Buzzer Tested! Audio alert is active.");
    } catch (e) {
      onTriggerToast("Audio Buzzer Active!");
    }
  };

  const startVoiceRecognition = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      onTriggerToast("Voice input ready on Android/Chrome.");
      return;
    }
    try {
      const rec = new SpeechRec();
      const langMap = { EN: "en-IN", TE: "te-IN", HI: "hi-IN", MR: "mr-IN", KN: "kn-IN" };
      rec.lang = langMap[lang] || "en-IN";
      setListening(true);
      rec.onresult = (ev) => {
        const text = ev.results?.[0]?.[0]?.transcript || "";
        if (text) {
          setSearchQuery(text);
          onTriggerToast(`Voice Search (${lang}): "${text}"`);
        }
        setListening(false);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      rec.start();
    } catch (e) {
      setListening(false);
    }
  };

  if (activePortal === "customer") {
    return (
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={startVoiceRecognition}
            className={`px-2.5 py-1 rounded-xl font-black cursor-pointer flex items-center gap-1 ${
              listening ? "bg-rose-600 text-white animate-pulse" : "bg-amber-400 text-slate-950"
            }`}
          >
            <span>{listening ? "Listening..." : " 5-Lang Voice Search"}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("Atta");
              onTriggerToast("1-Tap Reorder: Loaded your frequent essentials!");
            }}
            className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 px-2.5 py-1 rounded-xl font-black cursor-pointer"
          >
             Buy Again
          </button>
          <button
            type="button"
            onClick={() => onTriggerToast("WhatsApp Live Tracking Link copied to share with family!")}
            className="bg-teal-500/20 border border-teal-400 text-teal-200 px-2.5 py-1 rounded-xl font-black cursor-pointer"
          >
             Share Order on WhatsApp
          </button>
        </div>
        <span className="text-[9px] text-slate-400 font-bold">
          Smart Substitution: Auto-Enabled
        </span>
      </div>
    );
  }

  if (activePortal === "merchant") {
    return (
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-2.5 space-y-2 text-[10px] text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setBuzzerOn(!buzzerOn);
                playOrderBuzzer();
              }}
              className={`px-2.5 py-1 rounded-xl font-black cursor-pointer ${
                buzzerOn ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-400"
              }`}
            >
               Order Buzzer: {buzzerOn ? "ON" : "MUTED"}
            </button>
            <button
              type="button"
              onClick={playOrderBuzzer}
              className="bg-amber-400 text-slate-950 px-2.5 py-1 rounded-xl font-black cursor-pointer"
            >
              Test Ring
            </button>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan / Enter Barcode..."
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white w-36"
            />
            <button
              type="button"
              onClick={() => {
                const code = barcodeInput.trim() || "8901058851243";
                setBarcodeInput(code);
                onTriggerToast(`Barcode #${code} Scanned! Matched in Stock Manual.`);
              }}
              className="bg-teal-400 text-slate-950 font-black px-2.5 py-1 rounded-lg cursor-pointer"
            >
               Scan Barcode
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePortal === "service_provider") {
    return (
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white">
        <span className="font-black text-indigo-300">
           Spare-Parts Customer Approval &amp; 7-Day Warranty Badge:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <input
            type="text"
            placeholder="Part Name (e.g. Capacitor)"
            value={partsEstimate.partName}
            onChange={(e) => setPartsEstimate({ ...partsEstimate, partName: e.target.value })}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white w-36"
          />
          <input
            type="number"
            placeholder="Rs."
            value={partsEstimate.cost}
            onChange={(e) => setPartsEstimate({ ...partsEstimate, cost: e.target.value })}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white w-16"
          />
          <button
            type="button"
            onClick={() =>
              onTriggerToast(
                `Sent Spare-Part Estimate (${partsEstimate.partName || "Part"} - Rs.${
                  partsEstimate.cost || 250
                }) + 7-Day Warranty Tag to Customer!`
              )
            }
            className="bg-indigo-500 text-white font-black px-2.5 py-1 rounded-lg cursor-pointer"
          >
            Push Estimate &rarr;
          </button>
        </div>
      </div>
    );
  }

  if (activePortal === "decorator") {
    const estTotal = guestCount * 110 + 18000;
    return (
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white">
        <div>
          <span className="font-black text-amber-300 block">
             Live Muhurtham &amp; Guest Package Estimator ({guestCount} Guests)
          </span>
          <span className="text-[9px] text-slate-400">
            Suggested Hall + Orchid Mandap Package: <strong className="text-emerald-400">Rs.{estTotal.toLocaleString("en-IN")}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={guestCount}
            onChange={(e) => setGuestCount(Number(e.target.value))}
            className="w-28 accent-amber-400 cursor-pointer"
          />
          <span className="bg-amber-400/20 border border-amber-400 text-amber-300 px-2 py-0.5 rounded font-black">
            {guestCount} Pax
          </span>
        </div>
      </div>
    );
  }

  if (activePortal === "rider") {
    const estGross = Math.round(fuelKm * 14);
    const estFuelCost = Math.round(fuelKm * 2.2);
    const netTakeHome = estGross - estFuelCost;
    return (
      <div className="bg-slate-900 border border-teal-500/40 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-white">
        <div>
          <span className="font-black text-teal-300 block">
             Captain Net Take-Home Profit Calculator ({fuelKm} km driven today)
          </span>
          <span className="text-[9px] text-slate-300">
            Gross: Rs.{estGross} &bull; Est. Fuel: -Rs.{estFuelCost} &bull;{" "}
            <strong className="text-emerald-400">Net Profit: Rs.{netTakeHome}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={fuelKm}
            onChange={(e) => setFuelKm(Math.max(1, Number(e.target.value) || 1))}
            className="w-14 bg-slate-950 border border-teal-400 rounded-lg p-1 text-center font-mono text-white"
          />
          <span className="text-[9px] text-slate-400">km</span>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================================
// 2. NO-CODE DYNAMIC PORTAL RENDERER (RENDERS ANY ADMIN-CREATED PORTAL!)
// ============================================================================
export default function DynamicPortalEngine({
  portalConfig,
  footerTab,
  setFooterTab,
  currentUser,
  onUpdatePortalConfig,
  onSwitchToPersonalShop,
  onTriggerToast,
  renderAccountTab
}) {
  const [newItemForm, setNewItemForm] = useState({
    title: "",
    category: portalConfig?.badge || "General",
    price: "",
    unit: "Per Unit / Visit",
    stockOrSlots: 25
  });

  if (!portalConfig) return null;
  if (footerTab === "account") {
    return renderAccountTab();
  }

  const tabs = portalConfig.tabs || [
    { id: "home", icon: "", label: "1. Queue" },
    { id: "catalog", icon: "", label: "2. Catalog" },
    { id: "add_new", icon: "", label: "3. + Add Item" },
    { id: "orders", icon: "", label: "4. Ledger" },
    { id: "account", icon: "", label: "Account" }
  ];

  const itemsList = portalConfig.items || [];
  const bookingsList = portalConfig.bookings || [];

  const handleAddCustomItem = () => {
    if (!newItemForm.title.trim()) {
      onTriggerToast("Please enter an item or service title.");
      return;
    }
    const created = {
      id: `DYN-${Date.now()}`,
      title: newItemForm.title.trim(),
      category: newItemForm.category,
      price: Number(newItemForm.price) || 199,
      unit: newItemForm.unit,
      stockOrSlots: Number(newItemForm.stockOrSlots) || 20,
      ownerName: currentUser?.fullName || "Verified Partner",
      createdAt: new Date().toLocaleDateString()
    };
    const updatedPortal = {
      ...portalConfig,
      items: [created, ...itemsList]
    };
    onUpdatePortalConfig(updatedPortal);
    setNewItemForm({ ...newItemForm, title: "", price: "" });
    setFooterTab(tabs[1]?.id || "catalog");
    onTriggerToast(`Published "${created.title}" live to ${portalConfig.title}!`);
  };

  const handleSimulateBooking = () => {
    const sampleItem = itemsList[0] || { title: `${portalConfig.title} Standard Package`, price: 350 };
    const newBk = {
      id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: "Rameshwar Reddy (Adilabad)",
      itemTitle: sampleItem.title,
      amount: sampleItem.price || 350,
      status: "NEW_REQUEST",
      otp: String(Math.floor(1000 + Math.random() * 9000)),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    onUpdatePortalConfig({
      ...portalConfig,
      bookings: [newBk, ...bookingsList]
    });
    onTriggerToast(`Simulated new booking #${newBk.id} in ${portalConfig.title}!`);
  };

  return (
    <div className="space-y-3 text-xs text-white">
      {/* Dynamic Portal Header */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border border-emerald-500/40 flex flex-wrap justify-between items-center gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base">{portalConfig.icon || ""}</span>
            <h3 className="font-black text-emerald-400 text-sm">
              {portalConfig.title}
            </h3>
            <span className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded">
              NO-CODE ADMIN PORTAL &bull; LIVE
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {portalConfig.description || "Dynamically generated portal managed via Founder Admin Console"}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleSimulateBooking}
            className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer"
          >
            + Simulate Order
          </button>
          <button
            type="button"
            onClick={onSwitchToPersonalShop}
            className="bg-emerald-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer"
          >
            Personal Shop
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE QUEUE / BOOKINGS */}
      {footerTab === (tabs[0]?.id || "home") && (
        <div className="space-y-2.5">
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
            <h4 className="font-black text-amber-400">
              {tabs[0]?.label || "1. Live Queue"} ({bookingsList.length})
            </h4>
            <span className="text-[10px] text-slate-400">
              Real-Time Cloud Sync Active
            </span>
          </div>
          {bookingsList.length === 0 ? (
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center space-y-2">
              <p className="font-bold text-slate-300">
                No active requests in {portalConfig.title} yet.
              </p>
              <button
                type="button"
                onClick={handleSimulateBooking}
                className="bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
              >
                + Simulate Test Booking Now
              </button>
            </div>
          ) : (
            bookingsList.map((bk) => (
              <div
                key={bk.id}
                className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-black text-emerald-400">
                    #{bk.id} &bull; {bk.time}
                  </span>
                  <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded text-[9px] font-black">
                    {bk.status}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-white">{bk.itemTitle}</p>
                <p className="text-[10px] text-slate-400">
                  Customer: {bk.customerName} | Amount: <strong className="text-emerald-300">Rs.{bk.amount}</strong> | OTP: <strong className="text-amber-300">{bk.otp}</strong>
                </p>
                {bk.status !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = bookingsList.map((x) =>
                        x.id === bk.id ? { ...x, status: "COMPLETED" } : x
                      );
                      onUpdatePortalConfig({ ...portalConfig, bookings: updated });
                      onTriggerToast(`Verified OTP (${bk.otp}) & Completed #${bk.id}!`);
                    }}
                    className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer"
                  >
                    Accept, Verify OTP ({bk.otp}) &amp; Complete &rarr;
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: CATALOG / INVENTORY */}
      {footerTab === (tabs[1]?.id || "catalog") && (
        <div className="space-y-2.5">
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex justify-between items-center">
            <h4 className="font-black text-emerald-400">
              {tabs[1]?.label || "2. Active Catalog"} ({itemsList.length})
            </h4>
            <button
              type="button"
              onClick={() => setFooterTab(tabs[2]?.id || "add_new")}
              className="bg-amber-400 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[10px] cursor-pointer"
            >
              + Add Listing
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {itemsList.map((it) => (
              <div
                key={it.id}
                className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex justify-between items-center"
              >
                <div>
                  <span className="text-[9px] text-amber-300 font-black">
                    {it.category} &bull; Qty/Slots: {it.stockOrSlots}
                  </span>
                  <h5 className="font-bold text-white text-xs">{it.title}</h5>
                  <p className="text-[10px] text-emerald-400 font-bold">
                    Rs.{it.price} ({it.unit})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextItems = itemsList.map((x) =>
                      x.id === it.id ? { ...x, stockOrSlots: x.stockOrSlots + 5 } : x
                    );
                    onUpdatePortalConfig({ ...portalConfig, items: nextItems });
                    onTriggerToast(`Added +5 availability to ${it.title}`);
                  }}
                  className="bg-slate-800 text-emerald-300 font-black px-2.5 py-1 rounded-xl text-[10px] cursor-pointer"
                >
                  +5 Stock/Slot
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: + ADD NEW ITEM / SERVICE */}
      {footerTab === (tabs[2]?.id || "add_new") && (
        <div className="bg-slate-900 p-4 rounded-2xl border border-emerald-500/40 space-y-2.5">
          <h4 className="font-black text-emerald-400 text-xs">
            {tabs[2]?.label || "3. Add New Listing"} to {portalConfig.title}
          </h4>
          <input
            type="text"
            placeholder="Listing / Product / Service Title"
            value={newItemForm.title}
            onChange={(e) => setNewItemForm({ ...newItemForm, title: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Price (Rs.)"
              value={newItemForm.price}
              onChange={(e) => setNewItemForm({ ...newItemForm, price: e.target.value })}
              className="bg-slate-950 border border-emerald-500/50 rounded-xl p-2 text-white font-bold"
            />
            <input
              type="text"
              placeholder="Unit (e.g. 1 Hr / 1 Kg)"
              value={newItemForm.unit}
              onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
            <input
              type="number"
              placeholder="Available Qty"
              value={newItemForm.stockOrSlots}
              onChange={(e) => setNewItemForm({ ...newItemForm, stockOrSlots: e.target.value })}
              className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
          </div>
          <button
            type="button"
            onClick={handleAddCustomItem}
            className="w-full bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl cursor-pointer shadow"
          >
            Publish Live to {portalConfig.title} &rarr;
          </button>
        </div>
      )}

      {/* TAB 4: INVOICES & LEDGER */}
      {footerTab === (tabs[3]?.id || "orders") && (
        <div className="bg-slate-900 p-4 rounded-2xl border border-amber-500/40 space-y-2.5">
          <div className="flex justify-between items-center">
            <h4 className="font-black text-amber-400">
              {tabs[3]?.label || "4. Portal Ledger & Statements"}
            </h4>
            <span className="font-black text-emerald-400">
              Total: Rs.{bookingsList.reduce((s, b) => s + Number(b.amount || 0), 0)}
            </span>
          </div>
          {bookingsList.map((bk) => (
            <div
              key={bk.id}
              className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-white">#{bk.id} &bull; {bk.itemTitle}</p>
                <p className="text-[10px] text-slate-400">{bk.customerName} ({bk.status})</p>
              </div>
              <span className="font-black text-emerald-400">+Rs.{bk.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}