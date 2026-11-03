import React, { useState } from "react";

const MASTER_ONE_HOUR_SLOTS = [
  "08:00 AM - 09:00 AM", "09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM", "12:00 PM - 01:00 PM", "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM", "04:00 PM - 05:00 PM", "05:00 PM - 06:00 PM"
];

export default function ServiceProviderPortal({ footerTab, setFooterTab, currentUser, serviceCategories = [], serviceProviders = [], setServiceProviders, serviceBookings = [], setServiceBookings, onSwitchToPersonalShop, onTriggerToast, renderAccountTab }) {
  const [providerInsideGeoFence, setProviderInsideGeoFence] = useState(true);
  const [happyCodeInputs, setHappyCodeInputs] = useState({});
  const [partsFormMap, setPartsFormMap] = useState({});
  const activePro = serviceProviders[0] || { id: "sp_1", providerName: currentUser?.fullName || "Ramesh Master Plumber", visitingFee: 89, hourlyRate: 150, availableSlots: ["09:00 AM - 10:00 AM", "10:00 AM - 11:00 AM", "02:00 PM - 03:00 PM"] };

  if (footerTab === "account") return renderAccountTab();

  return (
    <div className="space-y-3 text-xs text-white">
      <div className="bg-slate-900 p-3 rounded-2xl border border-indigo-500/40 flex justify-between items-center">
        <div>
          <h3 className="font-black text-indigo-300 text-xs">{activePro.providerName}</h3>
          <p className="text-[10px] text-slate-400">1-Hr Slots, Geo-Fenced Happy Code &amp; Spare Parts Billing</p>
        </div>
        <button type="button" onClick={onSwitchToPersonalShop} className="bg-indigo-400 text-slate-950 font-black px-2.5 py-1.5 rounded-xl text-[10px] cursor-pointer">
          Personal Shop
        </button>
      </div>

      {footerTab === "home" && (
        <div className="space-y-2.5">
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-black text-indigo-300">Customer Doorstep Geo-Fence Status:</span>
              <button type="button" onClick={() => setProviderInsideGeoFence(!providerInsideGeoFence)} className={`px-2.5 py-1 rounded-lg font-black text-[9px] cursor-pointer ${providerInsideGeoFence ? "bg-emerald-400 text-slate-950" : "bg-rose-600 text-white"}`}>
                {providerInsideGeoFence ? "\uD83D\uDCCD INSIDE GEO-FENCE" : "\u26D4 OUTSIDE GEO-FENCE"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const sim = { id: `SRV-${Math.floor(1000 + Math.random() * 9000)}`, providerName: activePro.providerName, customerName: "Anil Reddy", address: "Subhash Nagar, Adilabad", bookedDate: "2026-11-05", bookedSlot: "10:00 AM - 11:00 AM", visitingFee: 89, hourlyRate: 150, escrowVisitingAmount: 89, happyCode: String(Math.floor(1000 + Math.random() * 9000)), escrowStatus: "VISITING_FEE_HELD_IN_ESCROW", status: "CONFIRMED_PROVIDER_EN_ROUTE" };
                setServiceBookings([sim, ...serviceBookings]);
                onTriggerToast(`Simulated Customer Visit #${sim.id}!`);
              }}
              className="w-full bg-amber-400 text-slate-950 font-black py-1.5 rounded-xl text-[10px] cursor-pointer"
            >
              + Simulate Customer 1-Hr Visit Booking
            </button>
          </div>

          {serviceBookings.map((sb) => {
            const pForm = partsFormMap[sb.id] || { extraHours: 0, sparePartsDesc: "", sparePartsCost: 0, repairLaborFee: 0 };
            return (
              <div key={sb.id} className="bg-slate-900 p-3 rounded-2xl border border-indigo-500/40 space-y-2">
                <div className="flex justify-between font-bold">
                  <span className="text-indigo-300">#{sb.id} &bull; {sb.customerName} ({sb.bookedSlot})</span>
                  <span className="text-amber-300">Escrow: Rs.{sb.escrowVisitingAmount}</span>
                </div>
                <div className="flex gap-1.5">
                  <input type="text" maxLength={4} value={happyCodeInputs[sb.id] ?? ""} onChange={(e) => setHappyCodeInputs({ ...happyCodeInputs, [sb.id]: e.target.value })} placeholder={`Happy Code (${sb.happyCode})`} className="w-36 bg-slate-950 border border-indigo-400 rounded-xl p-1.5 text-center font-mono text-white" />
                  <button
                    type="button"
                    onClick={() => {
                      if (!providerInsideGeoFence) { alert("GEO-FENCE BLOCKED: Must be inside customer GPS Geo-Fence to verify Happy Code!"); return; }
                      setServiceBookings(serviceBookings.map((b) => (b.id === sb.id ? { ...b, escrowStatus: "RELEASED_TO_PROVIDER_WALLET" } : b)));
                      onTriggerToast(`Happy Code (${sb.happyCode}) Verified! Visiting Escrow Released.`);
                    }}
                    className="flex-1 bg-emerald-400 text-slate-950 font-black rounded-xl text-[10px] cursor-pointer"
                  >
                    Verify Happy Code ({sb.happyCode})
                  </button>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-1.5">
                  <input type="text" value={pForm.sparePartsDesc} onChange={(e) => setPartsFormMap({ ...partsFormMap, [sb.id]: { ...pForm, sparePartsDesc: e.target.value } })} placeholder="Spare Parts Used (e.g. MCB, Pipe, Capacitor)" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-[10px]" />
                  <div className="grid grid-cols-3 gap-1.5">
                    <input type="number" placeholder="Extra Hrs" onChange={(e) => setPartsFormMap({ ...partsFormMap, [sb.id]: { ...pForm, extraHours: Number(e.target.value) || 0 } })} className="bg-slate-900 border border-slate-700 rounded-lg p-1 text-white" />
                    <input type="number" placeholder="Parts Rs." onChange={(e) => setPartsFormMap({ ...partsFormMap, [sb.id]: { ...pForm, sparePartsCost: Number(e.target.value) || 0 } })} className="bg-slate-900 border border-slate-700 rounded-lg p-1 text-white" />
                    <input type="number" placeholder="Labor Rs." onChange={(e) => setPartsFormMap({ ...partsFormMap, [sb.id]: { ...pForm, repairLaborFee: Number(e.target.value) || 0 } })} className="bg-slate-900 border border-slate-700 rounded-lg p-1 text-white" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const total = Number(sb.escrowVisitingAmount || 89) + Number(pForm.extraHours || 0) * Number(sb.hourlyRate || 150) + Number(pForm.sparePartsCost || 0) + Number(pForm.repairLaborFee || 0);
                      setServiceBookings(serviceBookings.map((b) => (b.id === sb.id ? { ...b, ...pForm, finalServiceBill: total, status: "FINAL_BILL_SENT_WAIT_PAYMENT" } : b)));
                      onTriggerToast(`Pushed Final Service & Spare Parts Bill (Rs.${total}) to Customer!`);
                    }}
                    className="w-full bg-indigo-500 text-white font-black py-1.5 rounded-lg text-[10px] cursor-pointer"
                  >
                    Push Spare Parts &amp; Labor Bill to Customer &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {footerTab === "slots" && (
        <div className="space-y-1.5">
          <h4 className="font-black text-indigo-300">2. 1-Hour Slot Availability Matrix (Tap to Toggle)</h4>
          {MASTER_ONE_HOUR_SLOTS.map((slot) => {
            const enabled = (activePro.availableSlots || []).includes(slot);
            return (
              <div
                key={slot}
                onClick={() => {
                  const curr = activePro.availableSlots || [];
                  const nextSlots = enabled ? curr.filter((s) => s !== slot) : [...curr, slot];
                  setServiceProviders(serviceProviders.map((sp, i) => (i === 0 ? { ...sp, availableSlots: nextSlots } : sp)));
                }}
                className={`p-2.5 rounded-xl border flex justify-between items-center cursor-pointer ${enabled ? "bg-slate-900 border-emerald-500/40" : "bg-slate-950 border-slate-800 opacity-60"}`}
              >
                <span className="font-bold">{slot}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black ${enabled ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-rose-300"}`}>
                  {enabled ? "AVAILABLE" : "OFF-DUTY"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {(footerTab === "add_service" || footerTab === "orders") && (
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-indigo-500/40 space-y-2">
          <h4 className="font-black text-indigo-300">Master Rate Card &amp; Escrow Ledger</h4>
          <p className="text-[11px] text-slate-300">Visiting Escrow: <strong>Rs.{activePro.visitingFee}</strong> | Hourly Labor: <strong>Rs.{activePro.hourlyRate}/hr</strong></p>
        </div>
      )}
    </div>
  );
}