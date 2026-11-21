import React, { useState } from 'react';
import { useWe4AllTheme } from '../../hooks/useWe4AllTheme';
import { VoiceSearchBar } from './VoiceSearchBar';
import { BuyAgainStrip } from './BuyAgainStrip';

const HERO_SECTORS = [
  {
    id: 'daily_needs',
    title: 'Daily Needs & Kirana',
    subtitle: 'Rice, groceries & mandi veg in 30 mins',
    badge: 'Zero Markup',
    gradient: 'from-emerald-600 to-teal-700 text-white',
  },
  {
    id: 'home_services',
    title: 'Home Services',
    subtitle: 'AC repair, electrician & plumber slots',
    badge: 'Verified Pros',
    gradient: 'from-indigo-600 to-blue-700 text-white',
  },
];

const COMPACT_SECTORS = [
  { id: 'rides', title: 'Bike & Auto Rides', subtitle: 'Local town drops' },
  { id: 'decorators', title: 'Halls & Decor', subtitle: 'Events & quotes' },
  { id: 'labour', title: 'Labour Adda', subtitle: 'Mason & Mistri Toli' },
  { id: 'medicines', title: 'Local Pharmacy', subtitle: 'Trusted town stores' },
  { id: 'bakery', title: 'Bakery & Food', subtitle: 'Fresh daily picks' },
  { id: 'parcels', title: 'Send Parcel', subtitle: '2W / 3W town courier' },
];

export function BentoHomeGrid({
  townName = 'Adilabad Town',
  onSelectSector,
  onSearch,
  onQuickAdd,
  onDefaultAddressLoaded,
  headerRight = null,
}) {
  const [query, setQuery] = useState('');
  const { resolved, toggleTheme } = useWe4AllTheme();

  return (
    <div className="max-w-xl mx-auto p-4 space-y-5 we4-page">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            WE4ALL Hyperlocal
          </p>
          <h1 className="text-lg font-black">{townName}</h1>
        </div>

        <div className="flex items-center gap-2">
          {headerRight}
          <button
            type="button"
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-full border text-xs font-bold we4-surface"
          >
            {resolved === 'dark' ? 'Daylight' : 'Dark'}
          </button>
        </div>
      </div>

      {/* Telugu / Hindi / English Voice Search */}
      <VoiceSearchBar
        value={query}
        onChange={setQuery}
        onSearch={onSearch}
      />

      {/* 2026 Bento Grid: 2 Hero Cards + Compact Sector Tiles */}
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {HERO_SECTORS.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectSector?.(card.id)}
              className={`rounded-3xl p-4 text-left shadow-md bg-gradient-to-br ${card.gradient} active:scale-[0.98] transition-transform flex flex-col justify-between min-h-[132px]`}
            >
              <span className="inline-block self-start px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                {card.badge}
              </span>
              <div>
                <h2 className="text-sm font-black leading-tight">{card.title}</h2>
                <p className="text-[11px] opacity-90 mt-1">{card.subtitle}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {COMPACT_SECTORS.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelectSector?.(tile.id)}
              className="rounded-2xl border p-3 text-left shadow-sm active:scale-95 transition-transform we4-surface"
            >
              <p className="text-xs font-bold leading-snug">{tile.title}</p>
              <p className="text-[10px] opacity-65 mt-0.5">{tile.subtitle}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Zero-Click Repeat Orders & Smart Address */}
      <BuyAgainStrip
        onQuickAdd={onQuickAdd}
        onDefaultAddressLoaded={onDefaultAddressLoaded}
      />
    </div>
  );
}