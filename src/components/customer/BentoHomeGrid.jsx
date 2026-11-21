import React, { useState } from 'react';
import { VoiceSearchBar } from './VoiceSearchBar';
import { BuyAgainStrip } from './BuyAgainStrip';

const HERO_SECTORS = [
  {
    id: 'daily_needs',
    icon: '🛒',
    title: 'Daily Needs & Kirana',
    subtitle: 'Rice, groceries & fresh mandi veg in 30 mins',
    badge: 'Zero Markup',
    gradient: 'from-emerald-500 via-teal-600 to-emerald-800 text-white',
    ring: 'ring-emerald-400/30',
  },
  {
    id: 'home_services',
    icon: '⚡',
    title: '1-Hr Home Services',
    subtitle: 'AC repair, electrician & plumber slots',
    badge: 'Verified Pros',
    gradient: 'from-indigo-500 via-blue-600 to-violet-800 text-white',
    ring: 'ring-indigo-400/30',
  },
];

const COMPACT_SECTORS = [
  { id: 'rides', icon: '🛵', title: 'Bike & Auto', subtitle: 'Fast town drops', tint: 'from-amber-50 to-orange-50 border-amber-200/80 text-amber-950', iconBg: 'bg-amber-500/15' },
  { id: 'decorators', icon: '🎉', title: 'Halls & Decor', subtitle: 'Events & quotes', tint: 'from-rose-50 to-pink-50 border-rose-200/80 text-rose-950', iconBg: 'bg-rose-500/15' },
  { id: 'labour', icon: '🧱', title: 'Labour Adda', subtitle: 'Mason & Mistri', tint: 'from-sky-50 to-cyan-50 border-sky-200/80 text-sky-950', iconBg: 'bg-sky-500/15' },
  { id: 'medicines', icon: '💊', title: 'Pharmacy', subtitle: 'Trusted medicals', tint: 'from-emerald-50 to-teal-50 border-emerald-200/80 text-emerald-950', iconBg: 'bg-emerald-500/15' },
  { id: 'bakery', icon: '🥐', title: 'Bakery & Food', subtitle: 'Fresh daily picks', tint: 'from-orange-50 to-yellow-50 border-orange-200/80 text-orange-950', iconBg: 'bg-orange-500/15' },
  { id: 'parcels', icon: '📦', title: 'Send Parcel', subtitle: '2W / 3W courier', tint: 'from-violet-50 to-purple-50 border-violet-200/80 text-violet-950', iconBg: 'bg-violet-500/15' },
];

export function BentoHomeGrid({
  townName = 'Adilabad Town',
  onSelectSector,
  onSearch,
  onQuickAdd,
  onDefaultAddressLoaded,
}) {
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-3.5 we4-fade-up">
      {/* Trending Town Spotlight Card + Voice Search */}
      <div className="rounded-3xl p-3.5 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white border border-emerald-500/25 shadow-lg space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="we4-pulse-dot" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
              Live in {townName}
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-black">
            ✦ 0% Platform Markup
          </span>
        </div>

        <VoiceSearchBar
          value={query}
          onChange={setQuery}
          onSearch={onSearch}
        />
      </div>

      {/* 2026 Animated Bento Grid: 2 Hero Gradient Cards + 6 Vibrant Icon Tiles */}
      <section className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          {HERO_SECTORS.map((card, idx) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectSector?.(card.id)}
              style={{ animationDelay: `${idx * 70}ms` }}
              className={`relative overflow-hidden rounded-3xl p-3.5 text-left shadow-lg ring-1 ${card.ring} bg-gradient-to-br ${card.gradient} active:scale-[0.96] transition-all flex flex-col justify-between min-h-[136px] we4-fade-up`}
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/15 blur-xl" />
              <div className="flex items-center justify-between gap-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[9px] font-black tracking-wide">
                  ● {card.badge}
                </span>
                <span className="text-xl drop-shadow-sm">{card.icon}</span>
              </div>
              <div className="mt-2">
                <h2 className="text-sm font-black leading-tight tracking-tight">{card.title}</h2>
                <p className="text-[10px] text-white/90 mt-1 leading-snug">{card.subtitle}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {COMPACT_SECTORS.map((tile, idx) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelectSector?.(tile.id)}
              style={{ animationDelay: `${120 + idx * 45}ms` }}
              className={`rounded-2xl border bg-gradient-to-br ${tile.tint} p-2.5 text-left shadow-sm hover:shadow-md active:scale-95 transition-all we4-fade-up`}
            >
              <div className={`w-8 h-8 rounded-xl ${tile.iconBg} flex items-center justify-center text-base mb-1.5`}>
                {tile.icon}
              </div>
              <p className="text-[11px] font-black leading-tight">{tile.title}</p>
              <p className="text-[9px] opacity-70 mt-0.5 leading-tight">{tile.subtitle}</p>
            </button>
          ))}
        </div>
      </section>

      <BuyAgainStrip
        onQuickAdd={onQuickAdd}
        onDefaultAddressLoaded={onDefaultAddressLoaded}
      />
    </div>
  );
}