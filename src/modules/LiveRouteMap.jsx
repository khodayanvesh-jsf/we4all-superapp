import React from "react";

export default function LiveRouteMap({ pickupLabel = "Merchant Store, Adilabad", dropLabel = "Customer Doorstep, Adilabad", riderName = "Raju Local Rider", vehicle = "2W Bike Captain", distanceKm = 2.2 }) {
  return (
    <div className="bg-slate-950 rounded-2xl border border-teal-500/40 overflow-hidden space-y-2 p-2.5 text-xs text-white">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-teal-300">
          \uD83D\uDCCD 3-POINT LIVE GPS ROUTE: Captain &rarr; Pickup &rarr; Drop ({distanceKm} km)
        </span>
        <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[9px] font-black">LIVE GPS</span>
      </div>
      <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-800">
        <iframe title="Live Route Map" width="100%" height="100%" frameBorder="0" src="https://maps.google.com/maps?q=19.6641,78.5320&z=14&output=embed" />
      </div>
      <div className="text-[10px] space-y-0.5">
        <p className="text-emerald-300 font-bold">1. Pickup: <span className="text-white">{pickupLabel}</span></p>
        <p className="text-amber-300 font-bold">2. Drop: <span className="text-white">{dropLabel}</span></p>
        <p className="text-slate-400">Captain: <strong>{riderName}</strong> ({vehicle})</p>
      </div>
    </div>
  );
}