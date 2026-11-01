import React, { useState } from "react";

export const DEFAULT_MANDI_RATES = [
  { id: "m1", item: "Broiler Chicken (Skinless)", unit: "1 kg", price: 220, categoryId: "meat_daily" },
  { id: "m2", item: "Fresh Local Mutton", unit: "1 kg", price: 780, categoryId: "meat_daily" },
  { id: "m3", item: "NECC Farm Eggs", unit: "Tray (30)", price: 165, categoryId: "daily_needs" },
  { id: "m4", item: "Mandi Red Onions", unit: "5 kg", price: 175, categoryId: "vegetables" },
  { id: "m5", item: "UltraTech / Local Cement", unit: "50 kg Bag", price: 380, categoryId: "construction" }
];

export const DEFAULT_LANDMARK_PRESETS = [
  { id: "lm_bus", label: "RTC Bus Stand", pickup: "RTC Bus Stand, Adilabad", drop: "Subhash Nagar, Adilabad", km: 2.1 },
  { id: "lm_rail", label: "Railway Station", pickup: "Railway Station Gate, Adilabad", drop: "Collectorate Chowk, Adilabad", km: 2.9 },
  { id: "lm_rims", label: "RIMS Hospital", pickup: "RIMS Hospital Main Gate", drop: "Vidya Nagar, Adilabad", km: 2.4 },
  { id: "lm_mandal", label: "Mandal Bus Parcel", pickup: "Main Bazar Wholesale Shop", drop: "RTC Cargo / Village Auto Stand", km: 3.5 }
];

export function TownMandiTicker({ onSelectCategory, onTriggerToast }) {
  return (
    <div className="bg-slate-900 text-white p-2.5 rounded-2xl border border-amber-500/40 space-y-1.5 shadow">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-amber-400 flex items-center gap-1">
          \uD83D\uDCE2 TODAY&apos;S ADILABAD MANDI & ESSENTIAL RATES
        </span>
        <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded">
          LIVE MORNING BOARD
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DEFAULT_MANDI_RATES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              if (onSelectCategory) onSelectCategory(m.categoryId);
              if (onTriggerToast) onTriggerToast(`Filtered to ${m.item} (Rs.${m.price}/${m.unit})`);
            }}
            className="bg-slate-950 border border-slate-800 hover:border-emerald-400 px-2.5 py-1.5 rounded-xl shrink-0 text-left cursor-pointer"
          >
            <p className="text-[9px] font-bold text-slate-300 truncate max-w-[125px]">{m.item}</p>
            <p className="text-[10px] font-black text-emerald-400">
              Rs.{m.price} <span className="text-[8px] text-slate-400">/{m.unit}</span>
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ParchaAndVoiceOrderBox({
  currentUser,
  activeAddressObj,
  orders,
  setOrders,
  onNavigateToOrders,
  onTriggerToast
}) {
  const [openParcha, setOpenParcha] = useState(false);
  const [parchaShopType, setParchaShopType] = useState("Sri Laxmi Supermart (Kirana List)");
  const [parchaNotes, setParchaNotes] = useState("");
  const [parchaImageName, setParchaImageName] = useState("");
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecordedLabel, setVoiceRecordedLabel] = useState("");

  const handleParchaPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setParchaImageName(f.name);
    onTriggerToast(`Attached Parcha / Prescription Slip: ${f.name}`);
  };

  const handleToggleVoiceRecord = () => {
    if (!isRecordingVoice) {
      setIsRecordingVoice(true);
      onTriggerToast("Recording 15-sec Voice Order (Speak in Telugu / Hindi / English)...");
      setTimeout(() => {
        setIsRecordingVoice(false);
        setVoiceRecordedLabel("Voice_Note_12sec_Kirana_List.mp3");
      }, 2200);
    } else {
      setIsRecordingVoice(false);
      setVoiceRecordedLabel("Voice_Note_Kirana_List.mp3");
      onTriggerToast("Voice Note Saved!");
    }
  };

  const handleSubmitParchaOrder = () => {
    if (!parchaImageName && !voiceRecordedLabel && !parchaNotes.trim()) {
      alert("Please snap a photo of your handwritten slip/prescription, record a voice note, or type your list.");
      return;
    }
    const newParchaOrder = {
      id: `PRC-${Math.floor(1000 + Math.random() * 9000)}`,
      isParchaOrder: true,
      parchaImageName: parchaImageName || "Handwritten_Parcha_Slip.jpg",
      voiceNoteLabel: voiceRecordedLabel || "",
      parchaText: parchaNotes.trim() || "Handwritten Kirana / Medical Slip Attached",
      dateStr: "2026-11-01",
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      periodTag: "TODAY",
      customerName: currentUser?.fullName || "Town Customer",
      address: activeAddressObj?.fullAddress || "Subhash Nagar, Adilabad",
      distanceKm: activeAddressObj?.distanceKm || 1.8,
      weightKg: 5,
      requiredVehicleCode: "2W",
      vehicle: "2W Bike Captain (Up to 45 kg)",
      shopName: parchaShopType,
      items: [
        {
          name: `Parcha / Voice Order (${parchaImageName || voiceRecordedLabel || "Custom List"})`,
          qty: 1,
          price: 250,
          merchantName: parchaShopType,
          approvalStatus: "PENDING_MERCHANT_PRICING"
        }
      ],
      itemsTotal: 250,
      deliveryFee: 25,
      gst: 13.75,
      grandTotal: 288.75,
      paymentMethod: "PENDING_SELECTION",
      riderName: "Raju Local Rider",
      status: "AWAITING_MERCHANT_APPROVAL",
      secretOtp: String(Math.floor(1000 + Math.random() * 9000))
    };
    setOrders([newParchaOrder, ...orders]);
    setParchaNotes("");
    setParchaImageName("");
    setVoiceRecordedLabel("");
    setOpenParcha(false);
    if (onNavigateToOrders) onNavigateToOrders();
    onTriggerToast(
      `Parcha Order #${newParchaOrder.id} sent to Merchant Queue for itemized billing!`
    );
  };

  return (
    <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white p-3 rounded-2xl border border-emerald-500/50 space-y-2 shadow">
      <div className="flex justify-between items-center gap-2">
        <div>
          <h4 className="font-black text-amber-300 text-xs">
            \uD83D\uDCDD Quick Parcha (Handwritten Slip) & Voice-Note Order
          </h4>
          <p className="text-[10px] text-slate-300">
            Snap your paper kirana list, medical prescription, or record a voice note!
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenParcha(!openParcha)}
          className="bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer shrink-0"
        >
          {openParcha ? "Close" : "+ Upload Slip / Voice"}
        </button>
      </div>

      {openParcha && (
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2 text-[10px]">
          <select
            value={parchaShopType}
            onChange={(e) => setParchaShopType(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-bold"
          >
            <option value="Sri Laxmi Supermart (Kirana List)">
              1. Kirana / Supermart Handwritten Parcha (Sri Laxmi Supermart)
            </option>
            <option value="Apollo / Local Medical Store (Prescription)">
              2. Doctor Prescription Slip (Local Pharmacy / Medical Store)
            </option>
            <option value="Hardware & Construction Estimate">
              3. Plumbing / Electrical / Cement Estimate Slip
            </option>
          </select>

          <div className="grid grid-cols-2 gap-1.5">
            <label className="bg-slate-900 border border-emerald-500/50 rounded-xl p-2 text-center cursor-pointer block">
              <span className="font-black text-emerald-300 block">
                \uD83D\uDCF7 Snap Parcha / Rx Photo
              </span>
              <span className="text-[8px] text-slate-400 truncate block mt-0.5">
                {parchaImageName || "Camera or Gallery"}
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                capture="environment"
                onChange={handleParchaPhoto}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleToggleVoiceRecord}
              className={`border rounded-xl p-2 text-center cursor-pointer ${
                isRecordingVoice
                  ? "bg-rose-600 border-white text-white animate-pulse"
                  : "bg-slate-900 border-amber-400/50 text-amber-300"
              }`}
            >
              <span className="font-black block">
                \uD83C\uDF99\uFE0F {isRecordingVoice ? "Recording... Tap Stop" : "Record Voice Note"}
              </span>
              <span className="text-[8px] text-slate-300 truncate block mt-0.5">
                {voiceRecordedLabel || "Speak in Telugu/Hindi"}
              </span>
            </button>
          </div>

          <input
            type="text"
            value={parchaNotes}
            onChange={(e) => setParchaNotes(e.target.value)}
            placeholder="Or type quick items (e.g. 5kg Atta, 1L Oil, Dolo 650)..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
          />

          <button
            type="button"
            onClick={handleSubmitParchaOrder}
            className="w-full bg-emerald-400 text-slate-950 font-black py-2 rounded-xl cursor-pointer shadow"
          >
            Send Parcha / Voice Note to Merchant for Instant Bill &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

export function TownLandmarkPresetBar({ onApplyLandmark }) {
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-amber-300">
        1-Tap Town Landmarks & Village Bus-Parcel Presets:
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {DEFAULT_LANDMARK_PRESETS.map((lm) => (
          <button
            key={lm.id}
            type="button"
            onClick={() => onApplyLandmark(lm)}
            className="bg-slate-950 border border-teal-500/40 hover:border-amber-400 p-1.5 rounded-xl text-left cursor-pointer"
          >
            <div className="font-black text-teal-300 text-[10px]">\uD83D\uDCCD {lm.label}</div>
            <div className="text-[8px] text-slate-400 truncate">
              {lm.pickup} &rarr; {lm.drop}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}