import React, { useState, useEffect } from "react";

export default function LiveRouteMap({
  pickupLabel = "Verified Local Merchant",
  dropLabel = "Customer Doorstep, Adilabad",
  riderName = "Assigned Captain",
  vehicle = "2W Bike Captain",
  distanceKm = 1.8
}) {
  const [progressPct, setProgressPct] = useState(20);
  const [mapMode, setMapMode] = useState("street");

  useEffect(() => {
    const timer = setInterval(() => {
      setProgressPct((prev) => (prev >= 95 ? 20 : prev + 5));
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const etaMins = Math.max(2, Math.ceil(((100 - progressPct) / 100) * (distanceKm * 4)));

  return (
    <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-2.5 space-y-2 text-[10px] text-white">
      <div className="flex justify-between items-center flex-wrap gap-1">
        <span className="font-black text-emerald-400">
          \uD83D\uDEF5 LIVE 3-POINT GPS ROUTE ({distanceKm} km | ETA: {etaMins} mins)
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMapMode(mapMode === "street" ? "satellite" : "street")}
            className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[9px] font-bold text-amber-300 cursor-pointer"
          >
            {mapMode === "street" ? "Satellite" : "Street"}
          </button>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dropLabel)}`}
            target="_blank"
            rel="noreferrer"
            className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-black"
          >
            Turn-by-Turn Nav
          </a>
        </div>
      </div>

      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 space-y-1.5">
        <div className="flex justify-between text-[9px] font-bold">
          <span className="text-teal-300">1. Captain GPS</span>
          <span className="text-amber-300 truncate max-w-[130px]">2. {pickupLabel}</span>
          <span className="text-emerald-400 truncate max-w-[110px]">3. {dropLabel}</span>
        </div>
        <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-teal-400 via-amber-400 to-emerald-400 h-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[9px] text-slate-300">
          <span>
            Captain: <strong className="text-white">{riderName}</strong> ({vehicle})
          </span>
          <span className="text-emerald-300 font-mono">{progressPct}% Route Covered</span>
        </div>
      </div>

      <div className="w-full h-36 rounded-xl overflow-hidden border border-slate-800">
        <iframe
          title="WE4ALL Live Route Map"
          width="100%"
          height="100%"
          frameBorder="0"
          src={`https://maps.google.com/maps?q=19.6641,78.5320&t=${
            mapMode === "satellite" ? "k" : "m"
          }&z=15&output=embed`}
        />
      </div>
    </div>
  );
}