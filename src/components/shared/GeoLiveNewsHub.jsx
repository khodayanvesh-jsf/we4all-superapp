import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

const STORAGE_SOURCES_KEY = "we4all_geo_news_sources_v1";
const STORAGE_CUSTOM_ITEMS_KEY = "we4all_geo_news_custom_v1";

const DEFAULT_SOURCES = [
  { id: "src-hindu-ts", name: "The Hindu · Telangana", geo: "Telangana", lang: "en", url: "https://www.thehindu.com/news/national/telangana/feeder/default.rss", enabled: true },
  { id: "src-bbc-india", name: "BBC News · India", geo: "India", lang: "en", url: "https://feeds.bbci.co.uk/news/world/asia/india/rss.xml", enabled: true }
];

export function loadGeoNewsSources() {
  try {
    const raw = localStorage.getItem(STORAGE_SOURCES_KEY);
    if (!raw) return DEFAULT_SOURCES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SOURCES;
  } catch { return DEFAULT_SOURCES; }
}

export function loadCustomLocalNews() {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function GeoLiveNewsHub({
  mode = "admin",
  defaultCity = "Adilabad",
  defaultState = "Telangana",
  onPinToTicker,
  onClose
}) {
  const [city, setCity] = useState(defaultCity || "Adilabad");
  const [stateName, setStateName] = useState(defaultState || "Telangana");
  const [lang, setLang] = useState("en");
  const [geoFilter, setGeoFilter] = useState("all");
  const [sources, setSources] = useState(loadGeoNewsSources);
  const [customNews, setCustomNews] = useState(loadCustomLocalNews);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Admin form states
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceGeo, setNewSourceGeo] = useState(defaultCity || "Adilabad");
  const [manualTitle, setManualTitle] = useState("");
  const [manualSummary, setManualSummary] = useState("");
  const [manualGeo, setManualGeo] = useState(defaultCity || "Adilabad");

  const persistSources = (next) => {
    setSources(next);
    try { localStorage.setItem(STORAGE_SOURCES_KEY, JSON.stringify(next)); } catch {}
  };

  const persistCustomNews = (next) => {
    setCustomNews(next);
    try { localStorage.setItem(STORAGE_CUSTOM_ITEMS_KEY, JSON.stringify(next)); } catch {}
  };

  const detectMyCity = () => {
    if (!navigator.geolocation) { setStatusMsg("GPS not available in this browser."); return; }
    setStatusMsg("Detecting your GPS location...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + pos.coords.latitude + "&lon=" + pos.coords.longitude);
          const d = await r.json();
          const detectedCity = d?.address?.city || d?.address?.town || d?.address?.county || d?.address?.state_district || "Adilabad";
          const detectedState = d?.address?.state || "Telangana";
          setCity(detectedCity);
          setStateName(detectedState);
          setStatusMsg("Location detected: " + detectedCity + ", " + detectedState);
        } catch {
          setStatusMsg("GPS locked; using " + city + ", " + stateName);
        }
      },
      () => setStatusMsg("Allow location permission to auto-detect your town.")
    );
  };

  const fetchLiveGeoNews = async () => {
    setLoading(true);
    setStatusMsg("");
    try {
      const activeCustomSources = sources.filter((s) => s.enabled !== false && /^https?:\/\//i.test(s.url));
      const { data, error } = await supabase.functions.invoke("we4all-geo-news", {
        body: { city, state: stateName, lang, customSources: activeCustomSources }
      });
      if (error || data?.ok !== true) throw new Error(data?.error || error?.message || "Could not load live geo news.");
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setStatusMsg("Loaded " + (data.count || 0) + " live geo-news stories for " + city + ", " + stateName + ".");
    } catch (e) {
      setStatusMsg(e.message || "Could not fetch live news.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveGeoNews();
  }, [city, lang]);

  const addNewsSource = (e) => {
    e.preventDefault();
    if (!newSourceName.trim() || !/^https?:\/\//i.test(newSourceUrl.trim())) {
      setStatusMsg("Enter a valid source name and https:// RSS or news feed URL.");
      return;
    }
    const next = [
      { id: "src-" + Date.now(), name: newSourceName.trim(), url: newSourceUrl.trim(), geo: newSourceGeo.trim() || city, lang, enabled: true },
      ...sources
    ];
    persistSources(next);
    setNewSourceName("");
    setNewSourceUrl("");
    setStatusMsg("Added news source. Click Refresh Live News to pull headlines.");
  };

  const publishManualStory = (e) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    const item = {
      id: "local-" + Date.now(),
      title: manualTitle.trim(),
      summary: manualSummary.trim(),
      geo: manualGeo.trim() || city,
      source: "WE4ALL Local Desk",
      publishedAt: new Date().toLocaleString(),
      link: ""
    };
    persistCustomNews([item, ...customNews]);
    setManualTitle("");
    setManualSummary("");
    setStatusMsg("Published local bulletin for " + item.geo + ".");
  };

  const allFeed = [...customNews, ...articles].filter((item) => {
    if (geoFilter === "all") return true;
    return String(item.geo || "").toLowerCase().includes(geoFilter.toLowerCase());
  });

  const isAdmin = mode === "admin";

  return (
    <div className={isAdmin ? "space-y-4 text-slate-100" : "space-y-3 text-slate-900 dark:text-slate-100"}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 p-4 text-white">
        <div>
          <h3 className="text-sm font-black tracking-tight">📰 WE4ALL Live Geo-News & Open-Source E-Newspaper Hub</h3>
          <p className="text-[11px] text-indigo-200">Auto-pulls daily local, state & national news by GPS location + custom RSS/e-newspaper websites.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={detectMyCity} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-[10px] font-bold text-white">📍 Auto-Detect GPS</button>
          <button type="button" disabled={loading} onClick={fetchLiveGeoNews} className="rounded-lg bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-50">{loading ? "Fetching..." : "🔄 Refresh Live News"}</button>
          {onClose && <button type="button" onClick={onClose} className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1.5 text-[10px] font-black text-white">✕ Close</button>}
        </div>
      </div>

      {/* Location & Language Controls */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/90 p-3 text-white">
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / Town (e.g. Adilabad)" className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white w-36" />
        <input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="State (e.g. Telangana)" className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white w-36" />
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white">
          <option value="en">English</option>
          <option value="te">తెలుగు (Telugu)</option>
          <option value="hi">हिन्दी (Hindi)</option>
        </select>
        <div className="flex flex-wrap gap-1 ml-auto">
          {[["all", "All News"], [city, "📍 " + city], [stateName, "🗺️ " + stateName], ["India", "🇮🇳 India"]].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setGeoFilter(k)} className={geoFilter === k ? "rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white" : "rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300"}>{lbl}</button>
          ))}
        </div>
      </div>

      {statusMsg && <p className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3 py-2 text-[11px] font-bold text-emerald-200">{statusMsg}</p>}

      {isAdmin && (
        <div className="grid gap-3 md:grid-cols-2">
          {/* Add Any Open-Source News Website / RSS Feed */}
          <form onSubmit={addNewsSource} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
            <h4 className="text-xs font-black text-cyan-300">🌐 Add Open-Source News / E-Paper RSS Source</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} placeholder="Source name (e.g. Eenadu Telangana)" className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" />
              <input value={newSourceGeo} onChange={(e) => setNewSourceGeo(e.target.value)} placeholder="Geo tag (e.g. Adilabad)" className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" />
            </div>
            <input value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} placeholder="https://news-site.com/rss.xml" className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" />
            <button type="submit" className="rounded-lg bg-cyan-500 hover:bg-cyan-600 px-3 py-1.5 text-[10px] font-black text-slate-950">+ Add News Source</button>
            <div className="space-y-1 pt-1">
              {sources.map((src) => (
                <div key={src.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px]">
                  <span className="truncate text-slate-200"><b>{src.name}</b> · 📍 {src.geo}</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button type="button" onClick={() => persistSources(sources.map((s) => s.id === src.id ? { ...s, enabled: s.enabled === false } : s))} className={src.enabled !== false ? "rounded bg-emerald-700 px-2 py-0.5 text-[9px] font-bold text-white" : "rounded bg-slate-700 px-2 py-0.5 text-[9px] text-slate-300"}>{src.enabled !== false ? "ON" : "OFF"}</button>
                    <button type="button" onClick={() => persistSources(sources.filter((s) => s.id !== src.id))} className="rounded bg-rose-800 px-2 py-0.5 text-[9px] font-bold text-white">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </form>

          {/* Publish Local Town Breaking News Card */}
          <form onSubmit={publishManualStory} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-3">
            <h4 className="text-xs font-black text-amber-300">📢 Publish Local Town Breaking News</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="Headline..." className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" />
              <input value={manualGeo} onChange={(e) => setManualGeo(e.target.value)} placeholder="Town / Geo" className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" />
            </div>
            <textarea value={manualSummary} onChange={(e) => setManualSummary(e.target.value)} rows={2} placeholder="Short local news details..." className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white" />
            <button type="submit" className="rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-1.5 text-[10px] font-black text-slate-950">+ Publish Local Bulletin</button>
            {customNews.length > 0 && (
              <div className="space-y-1 pt-1">
                {customNews.slice(0, 4).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px]">
                    <span className="truncate text-amber-200">📍 {c.geo}: {c.title}</span>
                    <button type="button" onClick={() => persistCustomNews(customNews.filter((x) => x.id !== c.id))} className="rounded bg-rose-800 px-2 py-0.5 text-[9px] font-bold text-white">Delete</button>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Live Geo-News Reader Cards */}
      <div className="grid gap-2.5 md:grid-cols-2">
        {allFeed.map((item, idx) => (
          <article key={(item.id || item.title) + idx} className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3 text-white">
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
                  <button type="button" onClick={() => onPinToTicker("📰 " + item.title + " (" + item.source + ")")} className="rounded-lg bg-violet-700 hover:bg-violet-600 px-2 py-1 text-[9px] font-black text-white">📌 Pin to Top Ticker</button>
                )}
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[9px] font-bold text-cyan-300">Read Story ↗</a>
                )}
                <a href={"https://wa.me/?text=" + encodeURIComponent("📰 " + item.title + (item.link ? "\n" + item.link : "") + "\n— via WE4ALL Local News")} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-2 py-1 text-[9px] font-bold text-white">📲 WhatsApp</a>
              </div>
            </div>
          </article>
        ))}
        {!loading && allFeed.length === 0 && (
          <p className="text-xs text-slate-400 col-span-2 p-3">No live headlines loaded yet. Click Refresh Live News above.</p>
        )}
      </div>
    </div>
  );
}
