import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";

const CTRL_KEY = "we4all_geo_news_controls_v1";
const CTRL_EVT = "we4all-news-controls-updated";
const GEO_KEY = "we4all_geo_news_loc_v1";
const RAM_CACHE = new Map();
const TTL = 10 * 60 * 1000;

const DEF_CTRL = { pauseLocal: false, pauseState: false, pauseIndia: false, pauseCustom: false, pauseAll: false, customRssUrl: "" };
const LANG_OPTS = [
  { code: "en", label: "English" }, { code: "te", label: "తెలుగు" }, { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" }, { code: "kn", label: "ಕನ್ನಡ" }, { code: "ta", label: "தமிழ்" },
];

export function readNewsControls() {
  try { return { ...DEF_CTRL, ...JSON.parse(localStorage.getItem(CTRL_KEY) || "{}") }; } catch { return { ...DEF_CTRL }; }
}
export function saveNewsControls(next) {
  const m = { ...DEF_CTRL, ...next };
  try { localStorage.setItem(CTRL_KEY, JSON.stringify(m)); window.dispatchEvent(new Event(CTRL_EVT)); } catch {}
  return m;
}
function readDetectedGeo() {
  try { const raw = sessionStorage.getItem(GEO_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function edgeCfg() {
  const url = (import.meta?.env?.VITE_SUPABASE_URL) || supabase?.supabaseUrl || "https://bdmbziwazpuzbukazmug.supabase.co";
  const key = (import.meta?.env?.VITE_SUPABASE_ANON_KEY) || supabase?.supabaseKey || "";
  return { url: String(url).replace(/\/+$/, ""), key: String(key || "") };
}

async function fetchLiveNews({ city, state, lang, controls, force = false }) {
  const c = (city && city !== "All" ? city : "Adilabad").trim();
  const s = (state || "auto").trim();
  const l = String(lang || "en").toLowerCase().slice(0, 2);
  const ctrl = controls || readNewsControls();
  const ck = JSON.stringify({ c, s, l, ctrl });
  const hit = RAM_CACHE.get(ck);
  if (!force && hit && Date.now() - hit.ts < TTL) return hit.data;

  const { url, key } = edgeCfg();
  const qs = new URLSearchParams({
    city: c, state: s, lang: l,
    pauseAll: ctrl.pauseAll ? "1" : "0", pauseLocal: ctrl.pauseLocal ? "1" : "0",
    pauseState: ctrl.pauseState ? "1" : "0", pauseIndia: ctrl.pauseIndia ? "1" : "0",
    pauseCustom: ctrl.pauseCustom ? "1" : "0",
  });
  if (ctrl.customRssUrl) qs.set("customRss", ctrl.customRssUrl);
  const headers = { Accept: "application/json" };
  if (key) { headers.apikey = key; headers.Authorization = `Bearer ${key}`; }
  const r = await fetch(`${url}/functions/v1/we4all-geo-news?${qs}`, { method: "GET", headers });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const data = {
    ok: Boolean(j?.ok),
    city: j?.city || c,
    state: j?.state || (s === "auto" ? "Telangana" : s),
    items: Array.isArray(j?.items) ? j.items : [],
    fetchedAt: j?.fetchedAt || new Date().toISOString(),
  };
  RAM_CACHE.set(ck, { ts: Date.now(), data });
  return data;
}

const CSS = `@keyframes we4allMarq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}.we4all-marq{display:inline-flex;align-items:center;white-space:nowrap;will-change:transform;animation-name:we4allMarq;animation-timing-function:linear;animation-iteration-count:infinite}.we4all-marq:hover,.we4all-marq:active{animation-play-state:paused}`;

export function GeoNewsHeadlinesTicker({ city = "Adilabad", state = "auto", lang = "en", pinnedNotice = "" }) {
  const [controls, setControls] = useState(readNewsControls);
  const [geo, setGeo] = useState(() => readDetectedGeo() || { city: city && city !== "All" ? city : "Adilabad", state: state || "auto" });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [readerOpen, setReaderOpen] = useState(false);

  const activeLang = String(lang || "en").toLowerCase().slice(0, 2) || "en";

  useEffect(() => {
    if (city && city !== "All" && city !== geo.city) {
      setGeo({ city, state: state && state !== "auto" ? state : "auto" });
    }
  }, [city, state]);

  useEffect(() => {
    if (readDetectedGeo()) return;
    if (typeof navigator === "undefined" || !navigator.permissions || !navigator.geolocation) return;
    navigator.permissions.query({ name: "geolocation" }).then((perm) => {
      if (perm.state !== "granted") return;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10`, { headers: { Accept: "application/json" } });
            if (!r.ok) return;
            const d = await r.json();
            const a = d?.address || {};
            const detCity = a.city || a.town || a.state_district || a.county || "";
            const detState = a.state || "";
            if (detCity || detState) {
              const nextGeo = { city: detCity || "Adilabad", state: detState || "auto" };
              try { sessionStorage.setItem(GEO_KEY, JSON.stringify(nextGeo)); } catch {}
              setGeo(nextGeo);
            }
          } catch {}
        },
        () => {},
        { maximumAge: 600000, timeout: 4000 }
      );
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const sync = () => setControls(readNewsControls());
    window.addEventListener("storage", sync);
    window.addEventListener(CTRL_EVT, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(CTRL_EVT, sync); };
  }, []);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await fetchLiveNews({ city: geo.city, state: geo.state, lang: activeLang, controls, force });
      setItems(res.items || []);
      if (res.state && geo.state === "auto") {
        setGeo((prev) => ({ ...prev, state: res.state }));
      }
    } catch {} finally { setLoading(false); }
  }, [geo.city, geo.state, activeLang, controls]);

  useEffect(() => { load(false); }, [load]);

  const entries = useMemo(() => {
    const arr = [];
    if (pinnedNotice && String(pinnedNotice).trim() && !/0% Platform Markup|1-Hr Verified Electricians/i.test(String(pinnedNotice))) {
      arr.push({ title: String(pinnedNotice).trim(), summary: String(pinnedNotice).trim(), source: "WE4ALL", bucket: "pinned", scopeLabel: "NOTICE", pubDate: "Live" });
    }
    return arr.concat(items);
  }, [pinnedNotice, items]);

  // Comfortable TV news ticker reading speed (~6.5s per headline, min 95s)
  const scrollDurationSec = Math.max(95, Math.round(entries.length * 6.5));

  const openInAppReader = (entry) => {
    setSelectedItem(entry || entries[0] || null);
    setReaderOpen(true);
  };

  return (
    <div className="w-full shrink-0" data-we4all-news-ticker="live">
      <style>{CSS}</style>
      <div className="flex items-center gap-2 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-b border-indigo-900/70 px-2 py-1 text-white">
        <button
          type="button"
          onClick={() => openInAppReader(entries[0])}
          className="shrink-0 inline-flex items-center gap-1 rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </button>

        <div className="relative flex-1 overflow-hidden">
          {loading && !entries.length ? (
            <div className="truncate text-[11px] text-indigo-200">
              Loading latest {geo.city} &amp; {geo.state !== "auto" ? geo.state : "India"} news…
            </div>
          ) : !entries.length ? (
            <div className="truncate text-[11px] text-indigo-200">
              Latest {geo.city} &amp; {geo.state !== "auto" ? geo.state : "India"} headlines updating…
            </div>
          ) : (
            <div className="we4all-marq" style={{ animationDuration: `${scrollDurationSec}s` }}>
              {[...entries, ...entries].map((e, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openInAppReader(e)}
                  className="mx-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-100 hover:text-amber-300"
                >
                  <span className={e.bucket === "pinned" ? "rounded bg-amber-400/20 px-1 py-0.5 text-[9px] font-bold text-amber-300" : "rounded bg-indigo-500/30 px-1 py-0.5 text-[9px] font-semibold text-indigo-200"}>
                    {e.scopeLabel || e.source || "TOP"}
                  </span>
                  <span>{e.title}</span>
                  <span className="ml-2 text-indigo-400/60">•</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {readerOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm" onClick={() => setReaderOpen(false)}>
          <div className="max-h-[82vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="min-w-0">
                <div className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
                  ● LIVE NEWS · {geo.city}{geo.state && geo.state !== "auto" ? `, ${geo.state}` : ""}
                </div>
                <div className="text-[11px] text-slate-400">District, State &amp; All-India Top Latest News</div>
              </div>
              <button type="button" onClick={() => setReaderOpen(false)} className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700">
                ✕ Close
              </button>
            </div>

            {selectedItem && (
              <div className="mt-3 rounded-xl border border-indigo-500/40 bg-indigo-950/50 p-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-amber-300">
                  <span className="rounded bg-indigo-600/40 px-1.5 py-0.5 text-indigo-200">{selectedItem.scopeLabel || "TOP"}</span>
                  <span>{selectedItem.source || "LIVE"}</span>
                </div>
                <h4 className="mt-1.5 text-sm font-bold leading-snug text-white">{selectedItem.title}</h4>
                {selectedItem.summary && <p className="mt-2 text-xs leading-relaxed text-slate-300">{selectedItem.summary}</p>}
                {selectedItem.pubDate && <div className="mt-2 text-[10px] text-slate-400">{selectedItem.pubDate}</div>}
              </div>
            )}

            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Latest Top Headlines ({entries.length})</div>
              <div className="space-y-1.5">
                {entries.map((it, idx) => {
                  const isActive = selectedItem && selectedItem.title === it.title;
                  return (
                    <button key={idx} type="button" onClick={() => setSelectedItem(it)} className={"w-full text-left rounded-xl border p-2.5 transition " + (isActive ? "border-indigo-400 bg-indigo-950/70" : "border-slate-800 bg-slate-800/50 hover:border-slate-600")}>
                      <div className="flex items-center gap-1.5 text-[10px] text-indigo-300 font-semibold">
                        <span>{it.scopeLabel || "TOP"}</span><span className="text-slate-500">·</span><span className="text-slate-400">{it.source || "LIVE"}</span>
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-slate-100 leading-snug">{it.title}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GeoLiveNewsHub({ mode = "admin", defaultCity = "Adilabad", defaultState = "Telangana", pinnedNotice = "", onClearPinned }) {
  const [city, setCity] = useState(defaultCity);
  const [state, setState] = useState(defaultState);
  const [lang, setLang] = useState("en");
  const [controls, setControls] = useState(readNewsControls);
  const [rss, setRss] = useState(() => readNewsControls().customRssUrl || "");
  const [st, setSt] = useState({ loading: true, count: 0, error: "" });

  const upd = (patch) => setControls(saveNewsControls({ ...controls, ...patch }));
  const probe = useCallback(async () => {
    setSt({ loading: true, count: 0, error: "" });
    try { const r = await fetchLiveNews({ city, state, lang, controls, force: true }); setSt({ loading: false, count: r.items.length, error: "" }); }
    catch (e) { setSt({ loading: false, count: 0, error: e instanceof Error ? e.message : "Error" }); }
  }, [city, state, lang, controls]);

  useEffect(() => { probe(); }, [probe]);

  if (mode === "customer") return <GeoNewsHeadlinesTicker city={city} state={state} lang={lang} pinnedNotice={pinnedNotice} />;

  const rows = [
    { key: "pauseLocal", label: `District / City (${city})` },
    { key: "pauseState", label: `State News (${state})` },
    { key: "pauseIndia", label: "All-India Top Latest" },
    { key: "pauseCustom", label: "Custom RSS Feed" },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">📺 Live News Monitor &amp; Source Controls</h3>
          <p className="text-xs text-slate-500">All-India geo news · 100% in-app reading (no external browser popups) · Zero storage</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={st.error ? "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700" : "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"}>
            {st.loading ? "Checking…" : st.error ? `Error: ${st.error}` : `🟢 Live (${st.count} headings scrolling)`}
          </span>
          <button type="button" onClick={probe} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">🔄 Refresh</button>
          {onClearPinned && pinnedNotice && <button type="button" onClick={onClearPinned} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">🗑️ Clear Pinned</button>}
        </div>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase text-indigo-900">Live Preview — Running in Users App</span>
          <div className="flex items-center gap-2">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="District/City" className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs" />
            <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs" />
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">
              {LANG_OPTS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <GeoNewsHeadlinesTicker city={city} state={state} lang={lang} pinnedNotice={pinnedNotice} />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="text-xs font-bold text-amber-900">Master Auto-News Switch</div>
        <button type="button" onClick={() => upd({ pauseAll: !controls.pauseAll })} className={controls.pauseAll ? "rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white" : "rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"}>
          {controls.pauseAll ? "⏸️ All Paused (Resume)" : "🟢 Auto-News Live (Pause All)"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {rows.map((r) => {
          const paused = Boolean(controls[r.key]) || Boolean(controls.pauseAll);
          return (
            <div key={r.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-xs font-bold text-slate-800">{r.label}</span>
              <button type="button" disabled={controls.pauseAll} onClick={() => upd({ [r.key]: !controls[r.key] })} className={paused ? "rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50" : "rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"}>
                {paused ? "⏸️ Paused" : "🟢 Live"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input type="url" value={rss} onChange={(e) => setRss(e.target.value)} placeholder="Optional Custom RSS URL (https://...)" className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs" />
        <button type="button" onClick={() => upd({ customRssUrl: rss.trim() })} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Save RSS</button>
      </div>
    </div>
  );
}

export default GeoLiveNewsHub;