import React, { useState, useEffect } from "react";

const FEATURED_PROMO_SLIDES = [
  {
    id: "promo_instant",
    badge: "⚡ FLASH DELIVERY",
    title: "30-Min Town Delivery · 0% Markup",
    subtitle: "Fresh groceries, veggies & daily essentials straight from trusted local shops",
    cta: "Explore Stores",
    icon: "🛍️",
    gradient: "from-violet-600 via-fuchsia-600 to-rose-500",
  },
  {
    id: "promo_services",
    badge: "✨ VERIFIED PROS",
    title: "1-Hour Home Experts at Your Door",
    subtitle: "AC repair, electricians, plumbers & Mistri toli — transparent upfront pricing",
    cta: "Book Service",
    icon: "🛠️",
    gradient: "from-blue-600 via-indigo-600 to-violet-700",
  },
  {
    id: "promo_rides",
    badge: "🚀 TOWN MOBILITY",
    title: "Bike, Auto & Same-Hour Parcels",
    subtitle: "Fast local rides and 2W/3W parcel drops across town with live OTP safety",
    cta: "Book Ride",
    icon: "🛵",
    gradient: "from-orange-500 via-rose-500 to-pink-600",
  },
];

export default function GeoTargetedAdBanner({
  ads,
  adsList = [],
  selectedZone,
  userZone = "Adilabad",
  userState = "Telangana",
  onSelectAdAction
}) {
  const effectiveAds = Array.isArray(ads) ? ads : (Array.isArray(adsList) ? adsList : []);
  const effectiveZone = selectedZone || userZone || "Adilabad";
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [customSlides, setCustomSlides] = useState(() => {
    try { const r = JSON.parse(localStorage.getItem('we4all_custom_promo_slides_v1') || '[]'); return Array.isArray(r) ? r : []; } catch { return []; }
  });
  useEffect(() => {
    const onUpdate = (e) => { if (Array.isArray(e?.detail?.slides)) setCustomSlides(e.detail.slides); };
    window.addEventListener('we4all:promo-slides-updated', onUpdate);
    return () => window.removeEventListener('we4all:promo-slides-updated', onUpdate);
  }, []);

  const tierWeight = { GEO_LOCAL: 1, STATE_LEVEL: 2, BRAND_NATIONAL: 3 };
  const sortedAds = [...effectiveAds].sort((a, b) => (tierWeight[a.tier] || 9) - (tierWeight[b.tier] || 9));
  const slides = sortedAds.length > 0 ? sortedAds : (customSlides.length > 0 ? customSlides : FEATURED_PROMO_SLIDES);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveSlideIdx((prev) => (prev + 1) % slides.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [slides.length]);

  const current = slides[activeSlideIdx % slides.length] || slides[0];
  const isLiveAd = sortedAds.length > 0;
  const gradient = current.gradient || "from-violet-600 via-indigo-600 to-fuchsia-600";

  return (
    <div
      onClick={() => onSelectAdAction && onSelectAdAction(current)}
      className={`relative overflow-hidden rounded-3xl p-4 text-white bg-gradient-to-r ${gradient} shadow-lg cursor-pointer we4-fade-up`}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -left-6 -bottom-10 h-24 w-24 rounded-full bg-black/15 blur-2xl" />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-black tracking-wider uppercase">
              {isLiveAd ? `SPONSORED · ${current.regionLabel || effectiveZone}` : current.badge}
            </span>
            <span className="text-[9px] font-bold text-white/80">{userState}</span>
          </div>
          {current?.videoUrl && (
        <video
          key={current.videoUrl}
          src={current.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-36 object-cover rounded-2xl mb-2 border border-white/20"
        />
      )}
      <h3 className="text-sm font-black leading-snug tracking-tight truncate">{current.title}</h3>
          <p className="text-[11px] text-white/90 leading-snug line-clamp-2">{current.subtitle}</p>
        </div>

        {current.image ? (
          <img
            src={current.image}
            alt={current.title}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/40 shadow-md shrink-0"
          />
        ) : (
          <div className="w-13 h-13 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-2xl shadow-inner shrink-0 p-2.5">
            {current.icon || "✨"}
          </div>
        )}
      </div>

      {slides.length > 1 && (
        <div className="relative flex items-center justify-between mt-3 pt-1">
          <div className="flex items-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.id || idx}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSlideIdx(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeSlideIdx % slides.length ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/20">
            {current.cta || "Tap to Explore"} &rarr;
          </span>
        </div>
      )}
    </div>
  );
}