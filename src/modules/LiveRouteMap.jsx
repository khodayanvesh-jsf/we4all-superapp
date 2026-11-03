import React from "react";

export default function LiveRouteMap({
  pickupLabel = "Sri Laxmi Supermart, Main Bazar",
  dropLabel = "Subhash Nagar, Adilabad",
  riderName = "Raju Local Rider",
  vehicle = "2W Bike Captain",
  distanceKm = 2.4
}) {
  const etaMins = Math.max(4, Math.round(Number(distanceKm || 2) * 3.5));
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    pickupLabel + ", Adilabad"
  )}&destination=${encodeURIComponent(
    dropLabel + ", Adilabad"
  )}&travelmode=driving`;

  return (
    <div className="bg-slate-950 border border-teal-500/40 rounded-2xl p-3 space-y-2 text-[10px] text-white">
      <div className="flex justify-between items-center">
        <span className="font-black text-teal-300">
           LIVE GPS CORRIDOR ({distanceKm} km &bull; ETA ~{etaMins} mins)
        </span>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-lg text-[9px] cursor-pointer"
        >
          Open Google Maps Nav &nearr;
        </a>
      </div>
      <div className="relative flex items-center justify-between bg-slate-900 px-3 py-2.5 rounded-xl border border-slate-800">
        <div className="text-left max-w-[38%]">
          <span className="text-[8px] text-emerald-400 font-black block">
            1. PICKUP POINT
          </span>
          <span className="font-bold text-white truncate block">
            {pickupLabel}
          </span>
        </div>
        <div className="flex-1 mx-2 border-t-2 border-dashed border-amber-400 relative flex justify-center">
          <span className=" -top-3 bg-teal-400 text-slate-950 font-black px-1.5 py-0.5 rounded text-[8px]">
            {vehicle}
          </span>
        </div>
        <div className="text-right max-w-[38%]">
          <span className="text-[8px] text-amber-300 font-black block">
            2. DROP DOORSTEP
          </span>
          <span className="font-bold text-white truncate block">
            {dropLabel}
          </span>
        </div>
      </div>
      <div className="flex justify-between text-[9px] text-slate-400">
        <span>Captain: <strong className="text-slate-200">{riderName}</strong></span>
        <span className="text-emerald-400 font-bold">Live Telemetry Active</span>
      </div>
    </div>
  );
}