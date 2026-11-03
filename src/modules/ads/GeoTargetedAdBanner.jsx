import React, { useState, useEffect } from "react";

export default function GeoTargetedAdBanner({
  adsList = [],
  userZone = "Adilabad",
  userState = "Telangana",
  brightTheme = true,
  onSelectAdAction
}) {
  const [selectedTier, setSelectedTier] = useState("ALL_PRIORITY");
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  const tierWeight = { GEO_LOCAL: 1, STATE_LEVEL: 2, BRAND_NATIONAL: 3 };
  const sortedAds = [...adsList]
    .filter((ad) => selectedTier === "ALL_PRIORITY" || ad.tier === selectedTier)
    .sort((a, b) => (tierWeight[a.tier] || 9) - (tierWeight[b.tier] || 9));

  useEffect(() => {
    if (sortedAds.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlideIdx((prev) => (prev + 1) % sortedAds.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [sortedAds.length, selectedTier]);

  const currentAd = sortedAds[activeSlideIdx % Math.max(sortedAds.length, 1)] || sortedAds[0];
  if (!currentAd) return null;

  return (
    <div
      className={`rounded-2xl p-2.5 border transition-all space-y-2 ${
        brightTheme
          ? "bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border-emerald-400 text-slate-900 shadow-sm"
          : "bg-gradient-to-r from-emerald-950/90 via-teal-950/80 to-slate-900 border-emerald-500/40 text-white"
      }`}
    >
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {[
            { id: "ALL_PRIORITY", label: "Auto 1-2-3" },
            { id: "GEO_LOCAL", label: `1. ${userZone} GPS` },
            { id: "STATE_LEVEL", label: `2. ${userState}` },
            { id: "BRAND_NATIONAL", label: "3. Brand Ads" }
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelectedTier(t.id);
                setActiveSlideIdx(0);
              }}
              className={`px-2 py-0.5 rounded-full text-[9px] font-black cursor-pointer ${
                selectedTier === t.id
                  ? "bg-emerald-600 text-white"
                  : brightTheme
                  ? "bg-white text-slate-700 border border-slate-300"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-[9px] font-bold text-emerald-600">
          {(activeSlideIdx % sortedAds.length) + 1}/{sortedAds.length}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <span className="bg-amber-400 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">
            {currentAd.tier === "GEO_LOCAL"
              ? `1ST PRIORITY: ${currentAd.regionLabel}`
              : currentAd.tier === "STATE_LEVEL"
              ? `2ND PRIORITY: ${currentAd.regionLabel}`
              : `3RD PRIORITY: ${currentAd.regionLabel}`}
          </span>
          <p className="text-xs font-black truncate mt-1">{currentAd.title}</p>
          <p className={`text-[10px] truncate ${brightTheme ? "text-slate-600" : "text-slate-300"}`}>
            {currentAd.subtitle}
          </p>
        </div>
        {currentAd.image && (
          <img
            src={currentAd.image}
            alt={currentAd.title}
            onClick={() => onSelectAdAction && onSelectAdAction(currentAd)}
            className="w-12 h-12 rounded-xl object-cover border border-emerald-400/50 shrink-0 cursor-pointer"
          />
        )}
      </div>
    </div>
  );
}