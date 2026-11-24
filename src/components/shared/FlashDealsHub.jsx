import React, { useEffect, useState } from "react";

const DEALS_KEY = "we4all_flash_deals_v1";
const DEALS_EVT = "we4all-flash-deals-updated";

function readDeals() {
  try {
    const raw = JSON.parse(localStorage.getItem(DEALS_KEY) || "[]");
    const now = Date.now();
    return Array.isArray(raw) ? raw.filter((d) => Number(d.expiresAt) > now) : [];
  } catch { return []; }
}

function saveDeals(list) {
  try {
    localStorage.setItem(DEALS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(DEALS_EVT));
  } catch {}
}

function formatCountdown(msLeft) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export function CustomerFlashDealsStrip({ onGrabDeal }) {
  const [deals, setDeals] = useState(readDeals);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const sync = () => setDeals(readDeals());
    window.addEventListener(DEALS_EVT, sync);
    window.addEventListener("storage", sync);
    const t = setInterval(() => { setNow(Date.now()); setDeals(readDeals()); }, 1000);
    return () => { clearInterval(t); window.removeEventListener(DEALS_EVT, sync); window.removeEventListener("storage", sync); };
  }, []);

  if (!deals.length) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-extrabold text-rose-500">⚡ Live Town Flash Deals</span>
        <span className="text-[10px] font-bold text-slate-400">{deals.length} active now</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {deals.map((d) => (
          <div key={d.id} className="min-w-[210px] shrink-0 rounded-2xl border border-rose-400/40 bg-gradient-to-br from-rose-600 via-pink-600 to-indigo-700 p-2.5 text-white shadow-md">
            <div className="flex items-center justify-between gap-1 text-[10px] font-extrabold">
              <span className="rounded bg-black/30 px-1.5 py-0.5 text-amber-300">⏳ {formatCountdown(d.expiresAt - now)}</span>
              {d.couponCode && <span className="rounded bg-white/20 px-1.5 py-0.5">{d.couponCode}</span>}
            </div>
            <div className="mt-1.5 text-xs font-extrabold leading-tight">{d.title}</div>
            <div className="text-[10px] text-rose-100">{d.shopName}</div>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <span className="text-sm font-black text-amber-300">₹{d.dealPrice}</span>
                {d.mrp > d.dealPrice && <span className="ml-1 text-[10px] line-through opacity-75">₹{d.mrp}</span>}
              </div>
              <button
                type="button"
                onClick={() => onGrabDeal && onGrabDeal(d)}
                className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-rose-700 cursor-pointer"
              >
                Grab →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MerchantFlashDealCreator({ shopName = "My WE4ALL Shop" }) {
  const [title, setTitle] = useState("");
  const [dealPrice, setDealPrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [hours, setHours] = useState("2");
  const [couponCode, setCouponCode] = useState("TOWNFLASH");
  const [deals, setDeals] = useState(readDeals);

  const publishDeal = () => {
    if (!title.trim() || !Number(dealPrice)) return;
    const item = {
      id: "fd_" + Date.now(),
      title: title.trim(),
      shopName,
      dealPrice: Number(dealPrice),
      mrp: Number(mrp) || Number(dealPrice),
      couponCode: couponCode.trim().toUpperCase(),
      expiresAt: Date.now() + Math.max(1, Number(hours) || 2) * 3600 * 1000,
    };
    const next = [item, ...readDeals()].slice(0, 12);
    saveDeals(next);
    setDeals(next);
    setTitle("");
    setDealPrice("");
    setMrp("");
  };

  const removeDeal = (id) => {
    const next = readDeals().filter((d) => d.id !== id);
    saveDeals(next);
    setDeals(next);
  };

  const broadcastWhatsApp = (d) => {
    const msg = `⚡ WE4ALL FLASH DEAL — ${d.shopName}!\n${d.title} at just ₹${d.dealPrice} (MRP ₹${d.mrp})\nUse code: ${d.couponCode || "LIVE"}\nOrder now on WE4ALL: https://we-4-all-super-app.vercel.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-2xl border border-rose-200 bg-white p-3.5 shadow-sm text-slate-900 space-y-2.5">
      <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-600">⚡ Launch Hyper-Local Flash Deal &amp; Countdown Coupon</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deal Title (e.g. Fresh Mutton 1kg)" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
        <input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Coupon Code" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
        <input type="number" value={dealPrice} onChange={(e) => setDealPrice(e.target.value)} placeholder="Flash Price (₹)" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
        <div className="flex gap-2">
          <input type="number" value={mrp} onChange={(e) => setMrp(e.target.value)} placeholder="MRP (₹)" className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs" />
          <select value={hours} onChange={(e) => setHours(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs">
            <option value="1">1 hr</option><option value="2">2 hrs</option><option value="4">4 hrs</option><option value="6">6 hrs</option>
          </select>
        </div>
      </div>
      <button type="button" onClick={publishDeal} className="rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 px-3.5 py-1.5 text-xs font-extrabold text-white cursor-pointer">
        🚀 Publish Flash Deal Live
      </button>

      {deals.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {deals.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
              <span><strong>{d.title}</strong> · ₹{d.dealPrice} ({d.couponCode})</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => broadcastWhatsApp(d)} className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white cursor-pointer">📲 WhatsApp</button>
                <button type="button" onClick={() => removeDeal(d.id)} className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white cursor-pointer">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}