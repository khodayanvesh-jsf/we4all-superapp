import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";

const CTRL_KEY = "we4all_geo_news_controls_v1";
const CTRL_EVT = "we4all-news-controls-updated";
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
function edgeCfg() {
  const url = (import.meta?.env?.VITE_SUPABASE_URL) || supabase?.supabaseUrl || "https://bdmbziwazpuzbukazmug.supabase.co";
  const key = (import.meta?.env?.VITE_SUPABASE_ANON_KEY) || supabase?.supabaseKey || "";
  return { url: String(url).replace(/\/+$/, ""), key: String(key || "") };
}
function fallbackEpapers() {
  const n = new Date();
  const dt = `${String(n.getDate()).padStart(2, "0")}/${String(n.getMonth() + 1).padStart(2, "0")}/${n.getFullYear()}`;
  return [
    { name: "Eenadu E-Paper", region: "Telangana & AP", url: `https://epaper.eenadu.net/Home/Index?date=${dt}&eid=2` },
    { name: "Sakshi E-Paper", region: "Telangana & AP", url: "https://epaper.sakshi.com/" },
    { name: "Namasthe Telangana", region: "Telangana", url: "https://epaper.ntnews.com/" },
    { name: "Andhra Jyothy", region: "Telangana & AP", url: "https://epaper.andhrajyothy.com/" },
    { name: "The Hindu E-Paper", region: "India", url: "https://epaper.thehindu.com/" },
    { name: "The Indian Express", region: "India", url: "https://epaper.indianexpress.com/" },
  ];
}
async function fetchLiveNews({ city, state, lang, controls, force = false }) {
  const c = (city && city !== "All" ? city : "Adilabad").trim();
  const s = (state || "Telangana").trim();
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
    items: Array.isArray(j?.items) ? j.items : [],
    epapers: Array.isArray(j?.epapers) && j.epapers.length ? j.epapers : fallbackEpapers(),
    fetchedAt: j?.fetchedAt || new Date().toISOString(),
  };
  RAM_CACHE.set(ck, { ts: Date.now(), data });
  return data;
}

const CSS = `@keyframes we4allMarq{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}.we4all-marq{display:inline-flex;align-items:center;white-space:nowrap;will-change:transform;animation:we4allMarq 42s linear infinite}.we4all-marq:hover{animation-play-state:paused}`;

export function GeoNewsHeadlinesTicker({ city = "Adilabad", state = "Telangana", lang = "en", pinnedNotice = "" }) {
  const [controls, setControls] = useState(readNewsControls);
  const [items, setItems] = useState([]);
  const [epapers, setEpapers] = useState(fallbackEpapers);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [activeLang, setActiveLang] = useState(String(lang || "en").toLowerCase().slice(0, 2));

  useEffect(() => { const n = String(lang || "en").toLowerCase().slice(0, 2); if (n) setActiveLang(n); }, [lang]);
  useEffect(() => {
    const sync = () => setControls(readNewsControls());
    window.addEventListener("storage", sync);
    window.addEventListener(CTRL_EVT, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(CTRL_EVT, sync); };
  }, []);

  const load = useCallback(async (force = false) => {
    setLoading(true); setErr("");
    try {
      const res = await fetchLiveNews({ city, state, lang: activeLang, controls, force });
      setItems(res.items || []);
      if (res.epapers?.length) setEpapers(res.epapers);
    } catch (e) { setErr(e instanceof Error ? e.message : "Unavailable"); }
    finally { setLoading(false); }
  }, [city, state, activeLang, controls]);

  useEffect(() => { load(false); }, [load]);

  const entries = useMemo(() => {
    const arr = [];
    if (pinnedNotice && String(pinnedNotice).trim()) arr.push({ title: String(pinnedNotice).trim(), source: "NOTICE", bucket: "pinned", link: "" });
    return arr.concat(items);
  }, [pinnedNotice, items]);

  const showCity = city && city !== "All" ? city : "Adilabad";

  return (
    <div className="w-full" data-we4all-news-ticker="live">
      <style>{CSS}</style>
      <div className="flex items-center gap-2 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-2.5 py-2 text-white shadow-sm">
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2 py-1 text-[11px] font-bold uppercase text-white hover:bg-rose-500">
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />{showCity} News
        </button>
        <div className="relative flex-1 overflow-hidden">
          {loading && !entries.length ? (
            <div className="truncate text-xs text-indigo-200">Fetching live {showCity} &amp; {state} headlines…</div>
          ) : err && !entries.length ? (
            <button type="button" onClick={() => load(true)} className="truncate text-xs text-amber-300 underline">Live news retry ({err})</button>
          ) : !entries.length ? (
            <button type="button" onClick={() => setOpen(true)} className="truncate text-xs text-indigo-200">📰 Today&apos;s {showCity} E-Newspapers ready — tap E-Papers</button>
          ) : (
            <div className="we4all-marq">
              {[...entries, ...entries].map((e, i) => (
                <button key={i} type="button" onClick={() => (e.link ? window.open(e.link, "_blank", "noopener,noreferrer") : setOpen(true))} className="mx-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-100 hover:text-amber-300">
                  <span className={e.bucket === "pinned" ? "rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300" : "rounded bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-200"}>
                    {e.bucket === "pinned" ? "📢 NOTICE" : e.source || "LIVE"}
                  </span>
                  <span>{e.title}</span><span className="ml-2 text-indigo-400/60">•</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={() => setOpen(true)} className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/25">🗞️ E-Papers</button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold">📰 {showCity} &amp; {state} Live Headlines &amp; E-Papers</h3>
                <p className="text-xs text-slate-400">Zero-storage live feed · Tap any headline or E-Paper to read</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={activeLang} onChange={(e) => setActiveLang(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-white">
                  {LANG_OPTS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
                </select>
                <button type="button" onClick={() => load(true)} className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold">🔄 Refresh</button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-slate-700 px-2.5 py-1 text-xs font-semibold">✕ Close</button>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-2 text-xs font-bold uppercase text-amber-300">Today&apos;s Geo E-Newspapers</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {epapers.map((p) => (
                  <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-700 bg-slate-800 p-2.5 hover:border-indigo-400">
                    <div className="text-xs font-bold text-white">{p.name}</div>
                    <div className="text-[11px] text-slate-400">{p.region}</div>
                  </a>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-xs font-bold uppercase text-indigo-300">Live Scrolling Main Headings ({entries.length})</div>
              <div className="space-y-1.5">
                {entries.map((it, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-xl border border-slate-800 bg-slate-800/60 p-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-100">{it.title}</div>
                      <div className="text-[11px] text-slate-400">{it.source || "LIVE"} {it.pubDate ? `· ${it.pubDate}` : ""}</div>
                    </div>
                    {it.link && <a href={it.link} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-indigo-600 px-2 py-1 text-[11px] font-semibold">Read ↗</a>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GeoLiveNewsHub({ mode = "admin", defaultCity = "Adilabad", defaultState = "Telangana", pinnedNotice = "", onClearPinned, onClose }) {
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
    { key: "pauseLocal", label: `Local City (${city})` },
    { key: "pauseState", label: `State (${state})` },
    { key: "pauseIndia", label: "India Top News" },
    { key: "pauseCustom", label: "Custom RSS Feed" },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900">📺 Live News Scrolling Monitor &amp; Source Controls</h3>
          <p className="text-xs text-slate-500">Zero-storage fetch-and-display · Streams straight into Users Module scrolling bar</p>
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
            <input value={city} onChange={(e) => setCity(e.target.value)} className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs" />
            <input value={state} onChange={(e) => setState(e.target.value)} className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs" />
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
