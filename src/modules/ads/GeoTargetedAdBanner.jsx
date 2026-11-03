import React, { useState, useEffect } from "react";

export default function GeoTargetedAdBanner({ adsList = [], userTown = "Adilabad", userState = "Telangana", brightTheme = false, onOpenDealBox }) {
  const [selectedTier, setSelectedTier] = useState("ALL_PRIORITY");
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const tierWeight = { GEO_LOCAL: 1, STATE_LEVEL: 2, BRAND_NATIONAL: 3 };
  const sortedAds = [...adsList]
    .filter((ad) => selectedTier === "ALL_PRIORITY" || ad.tier === selectedTier)
    .sort((a, b) => (tierWeight[a.tier] || 9) - (tierWeight[b.tier] || 9));

  useEffect(() => {
    if (sortedAds.length <= 1) return;
    const timer = setInterval(() => setActiveSlideIdx((prev) => (prev + 1) % sortedAds.length), 4500);
    return () => clearInterval(timer);
  }, [sortedAds.length, selectedTier]);

  const currentAd = sortedAds[activeSlideIdx % Math.max(1, sortedAds.length)] || sortedAds[0];
  if (!currentAd) return null;

  return (
    <div className={`rounded-2xl p-2.5 border space-y-2 ${brightTheme ? "bg-emerald-50 border-emerald-300 text-slate-900" : "bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-emerald-500/40 text-white"}`}>
      <div className="flex items-center justify-between gap-1">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: "ALL_PRIORITY", label: "1\u21922\u21923 Auto Geo" },
            { id: "GEO_LOCAL", label: `1. ${userTown} Geo` },
            { id: "STATE_LEVEL", label: `2. ${userState}` },
            { id: "BRAND_NATIONAL", label: "3. Brand Ads" }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setSelectedTier(t.id); setActiveSlideIdx(0); }}
              className={`px-2 py-0.5 rounded-full text-[8px] font-black cursor-pointer shrink-0 ${selectedTier === t.id ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-300 border border-slate-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {onOpenDealBox && (
          <button type="button" onClick={onOpenDealBox} className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-lg text-[8px] cursor-pointer shrink-0">
            Deal Box
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <span className="bg-amber-400 text-slate-950 text-[7px] font-black px-1.5 py-0.5 rounded uppercase">
            {currentAd.tier} &bull; {currentAd.regionLabel}
          </span>
          <p className="text-[11px] font-black truncate mt-0.5">{currentAd.title}</p>
          <p className="text-[9px] opacity-80 truncate">{currentAd.subtitle}</p>
        </div>
        {currentAd.image && (
          <img src={currentAd.image} alt={currentAd.title} className="w-12 h-12 rounded-xl object-cover border border-emerald-400/50 shrink-0" />
        )}
      </div>
    </div>
  );
}