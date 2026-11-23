import React, { useEffect, useState } from "react";

const GEO_NEWS_ENDPOINT = "https://bdmbziwazpuzbukazmug.supabase.co/functions/v1/we4all-geo-news";
const RAM_CACHE = new Map();
const RAM_TTL_MS = 10 * 60 * 1000;

function normalizeNewsLang(code) {
  const c = String(code || "en").trim().toLowerCase().slice(0, 2);
  return ["en", "te", "hi", "mr", "kn", "ta"].includes(c) ? c : "en";
}

async function fetchStatelessGeoNews({ city, state, lang, customUrl = "", force = false }) {
  const key = [city, state, lang, customUrl].join("|").toLowerCase();
  const cached = RAM_CACHE.get(key);
  if (!force && cached && Date.now() - cached.at < RAM_TTL_MS) return cached.data;

  const qs = new URLSearchParams({ city, state, lang });
  if (customUrl && /^https?:\/\//i.test(customUrl)) qs.set("customUrl", customUrl);
  const resp = await fetch(GEO_NEWS_ENDPOINT + "?" + qs.toString(), { method: "GET" });
  const data = await resp.json();
  if (!resp.ok || data?.ok !== true) throw new Error(data?.error || "Could not load live news.");
  RAM_CACHE.set(key, { at: Date.now(), data });
  return data;
}

export function GeoNewsHeadlinesTicker({ city = "Adilabad", stateName = "Telangana", accountLang = "EN", onOpenReader }) {
  const [headlines, setHeadlines] = useState([]);
  const [idx, setIdx] = useState(0);
  const [readerOpen, setReaderOpen] = useState(false);
  const resolvedLang = normalizeNewsLang(accountLang);
  const resolvedCity = String(city || "Adilabad").replace(/^./, (c) => c.toUpperCase());

  useEffect(() => {
    let active = true;
    fetchStatelessGeoNews({ city: resolvedCity, state: stateName, lang: resolvedLang })
      .then((data) => {
        if (active && Array.isArray(data.articles) && data.articles.length) {
          setHeadlines(data.articles.slice(0, 12));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [resolvedCity, stateName, resolvedLang]);

  useEffect(() => {
    if (headlines.length <= 1) return;
    const t = setInterval(() => setIdx((prev) => (prev + 1) % headlines.length), 4500);
    return () => clearInterval(t);
  }, [headlines.length]);

  const current = headlines[idx];

  return (
    <>
    <div
      onClick={() => (onOpenReader ? onOpenReader() : setReaderOpen(true))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") (onOpenReader ? onOpenReader() : setReaderOpen(true)); }}
      className="mb-2 cursor-pointer flex items-center justify-between gap-2 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950 via-violet-950 to-slate-900 px-3 py-2 text-white shadow-sm hover:border-indigo-400 transition"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-amber-300">
          <span>📰 LIVE {resolvedCity} E-NEWS ({resolvedLang.toUpperCase()})</span>
          {current?.source && <span className="text-indigo-300 normal-case font-bold truncate">· {current.source}</span>}
        </div>
        <p className="text-[11px] font-bold text-white truncate">
          {current ? current.title : "Loading live " + resolvedCity + " main headings..."}
        </p>
      </div>
      <span className="shrink-0 rounded-xl bg-indigo-500 px-2.5 py-1.5 text-[10px] font-black text-white">E-Paper ↗</span>
    </div>
    {readerOpen && (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 p-3 sm:p-6">
        <div className="mx-auto max-w-4xl">
          <GeoLiveNewsHub mode="customer" defaultCity={resolvedCity} defaultState={stateName} accountLang={accountLang} onClose={() => setReaderOpen(false)} />
        </div>
      </div>
    )}
    </>
  );
}

export function GeoLiveNewsHub({
  mode = "admin",
  defaultCity = "Adilabad",
  defaultState = "Telangana",
  accountLang = "EN",
  onPinToTicker,
  onClose
}) {
  const [city, setCity] = useState(defaultCity || "Adilabad");
  const [stateName, setStateName] = useState(defaultState || "Telangana");
  const [lang, setLang] = useState(() => normalizeNewsLang(accountLang));
  const [geoFilter, setGeoFilter] = useState("all");
  const [customUrl, setCustomUrl] = useState("");
  const [articles, setArticles] = useState([]);
  const [epapers, setEpapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    setLang(normalizeNewsLang(accountLang));
  }, [accountLang]);

  const detectMyCity = () => {
    if (!navigator.geolocation) { setStatusMsg("GPS not available."); return; }
    setStatusMsg("Detecting GPS location...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + pos.coords.latitude + "&lon=" + pos.coords.longitude);
          const d = await r.json();
          setCity(d?.address?.city || d?.address?.town || d?.address?.county || "Adilabad");
          setStateName(d?.address?.state || "Telangana");
          setStatusMsg("GPS locked — showing live news for your location (zero storage).");
        } catch {
          setStatusMsg("Using " + city + ", " + stateName);
        }
      },
      () => setStatusMsg("Allow location permission to auto-detect your town.")
    );
  };

  const loadLiveNews = async (force = false) => {
    setLoading(true);
    setStatusMsg("");
    try {
      const data = await fetchStatelessGeoNews({ city, state: stateName, lang, customUrl: customUrl.trim(), force });
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setEpapers(Array.isArray(data.epapers) ? data.epapers : []);
      setStatusMsg("Live fetch only · Zero DB/device storage · " + (data.count || 0) + " headings.");
    } catch (e) {
      setStatusMsg(e.message || "Could not load live news.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveNews(false);
  }, [city, lang]);

  const filtered = articles.filter((item) => {
    if (geoFilter === "all") return true;
    return String(item.geo || "").toLowerCase().includes(geoFilter.toLowerCase());
  });

  const isAdmin = mode === "admin";

  return (
    <div className={isAdmin ? "space-y-3 text-slate-100" : "space-y-3 text-slate-900 dark:text-slate-100"}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 p-4 text-white">
        <div>
          <h3 className="text-sm font-black tracking-tight">📰 WE4ALL Live Geo-News & E-Newspapers</h3>
          <p className="text-[11px] text-indigo-200">100% live fetch & display · Zero database storage · Zero device storage · Edge-cached.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={detectMyCity} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-[10px] font-bold text-white">📍 GPS</button>
          <button type="button" disabled={loading} onClick={() => loadLiveNews(true)} className="rounded-lg bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-50">{loading ? "Loading..." : "🔄 Refresh"}</button>
          {onClose && <button type="button" onClick={onClose} className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-[10px] font-black text-white">✕ Close</button>}
        </div>
      </div>

      {epapers.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/95 p-3 text-white space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">🗞️ Today's Geo E-Newspapers ({city}, {stateName})</p>
          <div className="flex flex-wrap gap-2">
            {epapers.map((ep) => (
              <a key={ep.name} href={ep.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/60 px-3 py-1.5 text-[11px] font-black text-amber-100">
                {ep.name} <span className="text-[9px] text-amber-300">({ep.lang}) ↗</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/90 p-3 text-white">
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / Town" className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white w-32" />
        <input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="State" className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white w-32" />
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white">
          <option value="en">English</option>
          <option value="te">తెలుగు (Telugu)</option>
          <option value="hi">हिन्दी (Hindi)</option>
          <option value="mr">मराठी (Marathi)</option>
          <option value="kn">ಕನ್ನಡ (Kannada)</option>
          <option value="ta">தமிழ் (Tamil)</option>
        </select>
        {isAdmin && (
          <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="Optional live RSS URL (fetch only, not stored)" className="flex-1 min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white" />
        )}
        <div className="flex flex-wrap gap-1 ml-auto">
          {[["all", "All"], [city, "📍 " + city], [stateName, "🗺️ " + stateName], ["India", "🇮🇳 India"]].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setGeoFilter(k)} className={geoFilter === k ? "rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white" : "rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300"}>{lbl}</button>
          ))}
        </div>
      </div>

      {statusMsg && <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3 py-1.5 text-[11px] font-bold text-emerald-200">{statusMsg}</p>}

      <div className="grid gap-2.5 md:grid-cols-2">
        {filtered.map((item, idx) => (
          <article key={item.title + idx} className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-white">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] font-bold">
                <span className="rounded-full bg-indigo-950 border border-indigo-600/50 px-2 py-0.5 text-indigo-200">📍 {item.geo || city}</span>
                <span className="text-slate-400">{item.source}</span>
              </div>
              <h4 className="text-xs font-black leading-snug text-white">{item.title}</h4>
              {item.summary && <p className="text-[11px] text-slate-300 line-clamp-2">{item.summary}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-[10px]">
              <span className="text-slate-500">{item.publishedAt ? String(item.publishedAt).slice(0, 22) : "Today"}</span>
              <div className="flex flex-wrap gap-1.5">
                {isAdmin && onPinToTicker && (
                  <button type="button" onClick={() => onPinToTicker("📰 " + item.title + " (" + item.source + ")")} className="rounded-lg bg-violet-700 hover:bg-violet-600 px-2 py-1 text-[9px] font-black text-white">📌 Pin</button>
                )}
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[9px] font-bold text-cyan-300">Read ↗</a>
                )}
                <a href={"https://wa.me/?text=" + encodeURIComponent("📰 " + item.title + (item.link ? "\n" + item.link : "") + "\n— via WE4ALL")} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-2 py-1 text-[9px] font-bold text-white">📲 WhatsApp</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
