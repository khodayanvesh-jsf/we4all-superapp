import React, { useEffect, useState, useMemo } from "react";
import { INDIAN_LANGUAGES } from "../../modules/i18n/indianLanguages";

const LANG_CHOSEN_KEY = "we4all_lang_chosen_v1";
const GEO_KEY = "we4all_geo_news_loc_v1";
const GEO_EVT = "we4all-geo-loc-updated";

const STATE_TO_LANG = {
  telangana: "TE",
  "andhra pradesh": "TE",
  maharashtra: "MR",
  karnataka: "KN",
  "tamil nadu": "TA",
  kerala: "ML",
  gujarat: "GU",
  "west bengal": "BN",
  punjab: "PA",
  "uttar pradesh": "HI",
  "madhya pradesh": "HI",
  rajasthan: "HI",
  bihar: "HI",
  delhi: "HI",
  haryana: "HI",
  jharkhand: "HI",
  chhattisgarh: "HI",
  uttarakhand: "HI",
  "himachal pradesh": "HI",
};

export function readSavedGeo() {
  try {
    const raw = localStorage.getItem(GEO_KEY) || sessionStorage.getItem(GEO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { city: "Adilabad", state: "Telangana", gpsTagged: false };
}

export function saveGeoLocation(geo) {
  const next = { city: geo?.city || "Adilabad", state: geo?.state || "Telangana", gpsTagged: Boolean(geo?.gpsTagged) };
  try {
    localStorage.setItem(GEO_KEY, JSON.stringify(next));
    sessionStorage.setItem(GEO_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(GEO_EVT, { detail: next }));
  } catch {}
  return next;
}

export function getGeoRecommendedLangCode(stateName = "Telangana") {
  const key = String(stateName || "Telangana").trim().toLowerCase();
  const code = STATE_TO_LANG[key] || "TE";
  // Ensure the code exists in INDIAN_LANGUAGES
  const match = INDIAN_LANGUAGES.find((l) => String(l.code).toUpperCase() === code);
  return match ? match.code : (INDIAN_LANGUAGES[1]?.code || "TE");
}

export function getOrderedLanguages(stateName = "Telangana") {
  const localCode = getGeoRecommendedLangCode(stateName);
  const en = INDIAN_LANGUAGES.find((l) => String(l.code).toUpperCase() === "EN");
  const local = INDIAN_LANGUAGES.find((l) => l.code === localCode && String(l.code).toUpperCase() !== "EN");
  const rest = INDIAN_LANGUAGES.filter((l) => l.code !== en?.code && l.code !== local?.code);
  const ordered = [];
  if (en) ordered.push({ ...en, badge: "1 · Default" });
  if (local) ordered.push({ ...local, badge: `2 · Local (${stateName || "Geo"})` });
  for (const r of rest) ordered.push({ ...r, badge: "" });
  return ordered;
}

/**
 * Section 2: Compact Live Geo-Tag Location Strip right below top header
 */
export function GeoLocationStrip() {
  const [geo, setGeo] = useState(readSavedGeo);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    const sync = () => setGeo(readSavedGeo());
    window.addEventListener(GEO_EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(GEO_EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleDetectGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10`,
            { headers: { Accept: "application/json" } }
          );
          if (r.ok) {
            const d = await r.json();
            const a = d?.address || {};
            const city = a.city || a.town || a.state_district || a.county || geo.city || "Adilabad";
            const state = a.state || geo.state || "Telangana";
            setGeo(saveGeoLocation({ city, state, gpsTagged: true }));
          }
        } catch {}
        finally { setDetecting(false); }
      },
      () => setDetecting(false),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 300000 }
    );
  };

  return (
    <div className="bg-slate-900/95 text-white px-2.5 py-1 flex items-center justify-between gap-2 border-b border-indigo-900/60 shrink-0 text-[11px]">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-emerald-400 shrink-0">📍</span>
        <span className="font-bold text-slate-100 truncate">
          {geo.city}, {geo.state}
        </span>
        <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
          {geo.gpsTagged ? "GPS GEO-TAG" : "GEO-ZONE"}
        </span>
      </div>
      <button
        type="button"
        onClick={handleDetectGps}
        disabled={detecting}
        className="shrink-0 rounded-md bg-indigo-600/90 hover:bg-indigo-500 px-2 py-0.5 text-[10px] font-bold text-white disabled:opacity-60 cursor-pointer"
      >
        {detecting ? "Locating…" : "📡 Update GPS"}
      </button>
    </div>
  );
}

/**
 * Account Section Language Selector (1. English, 2. Geo-Tagged Local Language, etc.)
 */
export function AccountLanguageCard({ lang, setLang }) {
  const [geo, setGeo] = useState(readSavedGeo);
  useEffect(() => {
    const sync = () => setGeo(readSavedGeo());
    window.addEventListener(GEO_EVT, sync);
    return () => window.removeEventListener(GEO_EVT, sync);
  }, []);

  const ordered = useMemo(() => getOrderedLanguages(geo.state), [geo.state]);

  return (
    <div className="bg-indigo-950/90 text-white px-3 py-2 border-b border-indigo-800/70 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold text-amber-300">
          🌐 App Language <span className="text-slate-300 font-normal">({geo.state})</span>
        </div>
        <select
          value={lang}
          onChange={(e) => {
            try { localStorage.setItem(LANG_CHOSEN_KEY, "1"); } catch {}
            setLang(e.target.value);
          }}
          className="bg-slate-900 text-amber-300 border border-indigo-600 rounded-lg px-2 py-1 text-[11px] font-bold outline-none cursor-pointer"
        >
          {ordered.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native} ({l.code}){l.badge ? ` — ${l.badge}` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/**
 * First-Launch Language Picker right after install/permissions
 * Top options: 1. English, 2. Geo-Tagged Local Language, then others
 */
export function FirstLaunchLanguageModal({ lang, setLang }) {
  const [open, setOpen] = useState(() => {
    try { return !localStorage.getItem(LANG_CHOSEN_KEY); } catch { return false; }
  });
  const [geo, setGeo] = useState(readSavedGeo);

  useEffect(() => {
    const sync = () => setGeo(readSavedGeo());
    window.addEventListener(GEO_EVT, sync);
    return () => window.removeEventListener(GEO_EVT, sync);
  }, []);

  const ordered = useMemo(() => getOrderedLanguages(geo.state), [geo.state]);

  if (!open) return null;

  const choose = (code) => {
    try { localStorage.setItem(LANG_CHOSEN_KEY, "1"); } catch {}
    setLang(code);
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-indigo-500/40 bg-slate-900 p-4 text-white shadow-2xl">
        <div className="text-center mb-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
            📍 {geo.city}, {geo.state}
          </div>
          <h3 className="mt-1 text-base font-extrabold text-white">Choose Your App Language</h3>
          <p className="text-[11px] text-slate-400">You can change this anytime in your Account section</p>
        </div>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {ordered.map((l, idx) => {
            const isSelected = l.code === lang;
            const isTopTwo = idx < 2;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => choose(l.code)}
                className={
                  "w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition cursor-pointer " +
                  (isTopTwo
                    ? "border-indigo-400/70 bg-indigo-950/80 hover:bg-indigo-900/80"
                    : "border-slate-700 bg-slate-800/70 hover:border-slate-500") +
                  (isSelected ? " ring-2 ring-amber-400" : "")
                }
              >
                <div>
                  <div className="text-sm font-bold text-white">
                    {idx + 1}. {l.native} <span className="text-xs text-slate-300">({l.code})</span>
                  </div>
                  {l.badge && <div className="text-[10px] font-semibold text-emerald-300">{l.badge}</div>}
                </div>
                <span className="text-xs font-bold text-amber-300">Select →</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}