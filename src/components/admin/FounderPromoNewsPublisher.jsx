import React, { useState } from 'react';

const PROMO_STORAGE_KEY = 'we4all_custom_promo_slides_v1';
const NEWS_STORAGE_KEY = 'we4all_live_news_ticker_v1';
const GRADIENT_PRESETS = [
  { id: 'violet', label: 'Royal Violet', cls: 'from-violet-600 via-fuchsia-600 to-rose-500' },
  { id: 'indigo', label: 'Electric Indigo', cls: 'from-blue-600 via-indigo-600 to-violet-700' },
  { id: 'coral', label: 'Sunset Coral', cls: 'from-orange-500 via-rose-500 to-pink-600' },
  { id: 'teal', label: 'Fresh Teal', cls: 'from-teal-500 via-emerald-600 to-cyan-700' },
];
const QUICK_NEWS_PRESETS = [
  "",
  '🎉 Festival Mega Offers Live across Local Town Shops  •  🚚 Free Doorstep Delivery on First 3 Orders  •  💳 Pay via UPI or Cash on Delivery',
  '📢 Local Shop Owners, Captains & Mistri Toli: Join WE4ALL with 0% Launch Commission — Register in Accounts Tab!',
];

export function FounderPromoNewsPublisher({ onTriggerToast = () => {} }) {
  const [slides, setSlides] = useState(() => {
    try { const r = JSON.parse(localStorage.getItem(PROMO_STORAGE_KEY) || '[]'); return Array.isArray(r) ? r : []; } catch { return []; }
  });
  const [badge, setBadge] = useState('⚡ TOWN OFFER');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [icon, setIcon] = useState('🎁');
  const [gradient, setGradient] = useState(GRADIENT_PRESETS[0].cls);

  const persistSlides = (next) => {
    setSlides(next);
    try { localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new CustomEvent('we4all:promo-slides-updated', { detail: { slides: next } }));
  };

  const handleAddSlide = (e) => {
    e.preventDefault();
    if (!title.trim()) { onTriggerToast('Enter a promo headline first.'); return; }
    persistSlides([{ id: `promo_${Date.now()}`, badge: badge.trim() || '✨ FEATURED', title: title.trim(), subtitle: subtitle.trim() || 'Live across your local WE4ALL town market', cta: 'Explore', icon: icon.trim() || '✨', gradient }, ...slides]);
    setTitle(''); setSubtitle('');
    onTriggerToast('Promo carousel slide published live!');
  };

  const handleApplyNewsPreset = (text) => {
    try { localStorage.setItem(NEWS_STORAGE_KEY, text); } catch {}
    window.dispatchEvent(new CustomEvent('we4all:news-ticker-updated', { detail: { text } }));
    onTriggerToast('Live Scrolling News Ticker updated!');
  };

  return (
    <div className="rounded-3xl border border-violet-500/35 bg-slate-900/95 p-4 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-white">🎨 Visual Promo Carousel &amp; News Studio</h3>
          <p className="text-[11px] text-slate-400">Publish animated home-screen promo banners and 1-tap scrolling news</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-violet-600/25 border border-violet-400/40 text-violet-200 text-[10px] font-black">{slides.length} Custom Slides</span>
      </div>
      <div className={`rounded-2xl p-3.5 text-white bg-gradient-to-r ${gradient} shadow-md flex items-center justify-between gap-3`}>
        <div className="min-w-0">
          <span className="inline-block px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-black uppercase">{badge || '✨ FEATURED'}</span>
          <p className="text-sm font-black mt-1 truncate">{title.trim() || 'Preview: Your Promo Headline Appears Here'}</p>
          <p className="text-[11px] text-white/90 truncate">{subtitle.trim() || 'Add an offer subtitle and pick a trending gradient below'}</p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-xl shrink-0">{icon || '🎁'}</div>
      </div>
      <form onSubmit={handleAddSlide} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Badge" className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white" />
        <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Emoji Icon" className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white" />
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Promo Headline *" className="sm:col-span-2 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white" />
        <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Offer description" className="sm:col-span-2 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-white" />
        <div className="flex flex-wrap gap-1.5 sm:col-span-2">
          {GRADIENT_PRESETS.map((g) => (
            <button key={g.id} type="button" onClick={() => setGradient(g.cls)} className={`px-2.5 py-1 rounded-xl text-[10px] font-black text-white bg-gradient-to-r ${g.cls} ${gradient === g.cls ? 'ring-2 ring-white scale-105' : 'opacity-70'}`}>{g.label}</button>
          ))}
        </div>
        <button type="submit" className="sm:col-span-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-black shadow">+ Publish Slide to Home Carousel</button>
      </form>
      {slides.length > 0 && (
        <div className="space-y-1.5">
          {slides.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-950 border border-slate-800 px-3 py-2">
              <div className="min-w-0"><p className="font-bold text-white truncate">{s.icon} {s.title}</p><p className="text-[10px] text-slate-400 truncate">{s.subtitle}</p></div>
              <button type="button" onClick={() => persistSlides(slides.filter((x) => x.id !== s.id))} className="px-2.5 py-1 rounded-lg bg-rose-900/70 text-rose-200 font-bold text-[10px]">Remove</button>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1.5 pt-2 border-t border-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300">1-Tap Scrolling Town News Presets</p>
        {QUICK_NEWS_PRESETS.map((preset, i) => (
          <button key={i} type="button" onClick={() => handleApplyNewsPreset(preset)} className="w-full text-left rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-2 text-[11px] text-slate-200 truncate">▶ {preset}</button>
        ))}
      </div>
    </div>
  );
}