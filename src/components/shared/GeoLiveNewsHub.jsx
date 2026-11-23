import React, { useEffect, useState } from "react";

const GEO_NEWS_ENDPOINT = "https://bdmbziwazpuzbukazmug.supabase.co/functions/v1/we4all-geo-news";
const SOURCE_CTRL_KEY = "we4all_news_source_controls_v1";
const RAM_CACHE = new Map();
const RAM_TTL_MS = 10 * 60 * 1000;

const DEFAULT_CONTROLS = {
  pausedAll: false,
  localCity: true,
  stateNews: true,
  indiaNews: true,
  customUrl: "",
  customEnabled: true
};

export function loadNewsSourceControls() {
  try {
    const raw = localStorage.getItem(SOURCE_CTRL_KEY);
    if (!raw) return DEFAULT_CONTROLS;
    return { ...DEFAULT_CONTROLS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONTROLS;
  }
}

function saveNewsSourceControls(next) {
  try {
    localStorage.setItem(SOURCE_CTRL_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("we4all-news-controls-updated", { detail: next }));
  } catch {}
}

function normalizeNewsLang(code) {
  const c = String(code || "en").trim().toLowerCase().slice(0, 2);
  return ["en", "te", "hi", "mr", "kn", "ta"].includes(c) ? c : "en";
}

function filterBySourceControls(articles, controls, city, state) {
  if (controls.pausedAll) return [];
  const cityLc = String(city || "").toLowerCase();
  const stateLc = String(state || "").toLowerCase();
  return (articles || []).filter((item) => {
    const geo = String(item.geo || "").toLowerCase();
    const src = String(item.source || "").toLowerCase();
    if (src.includes("custom")) return controls.customEnabled !== false;
    if (geo === "india") return controls.indiaNews !== false;
    if (stateLc && geo.includes(stateLc)) return controls.stateNews !== false;
    if (cityLc && geo.includes(cityLc)) return controls.localCity !== false;
    return controls.localCity !== false;
  });
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
  const [controls, setControls] = useState(loadNewsSourceControls);
  const [headlines, setHeadlines] = useState([]);
  const [idx, setIdx] = useState(0);
  const [readerOpen, setReaderOpen] = useState(false);
  const resolvedLang = normalizeNewsLang(accountLang);
  const resolvedCity = String(city || "Adilabad").replace(/^./, (c) => c.toUpperCase());

  useEffect(() => {
    const onCtrl = (e) => setControls(e?.detail || loadNewsSourceControls());
    window.addEventListener("we4all-news-controls-updated", onCtrl);
    return () => window.removeEventListener("we4all-news-controls-updated", onCtrl);
  }, []);

  useEffect(() => {
    let active = true;
    const pinned = (() => {
      try { return localStorage.getItem("we4all_live_news_ticker") || ""; } catch { return ""; }
    })();
    if (controls.pausedAll) {
      setHeadlines(pinned ? [{ title: pinned, source: "WE4ALL Notice" }] : []);
      return () => { active = false; };
    }
    fetchStatelessGeoNews({
      city: resolvedCity,
      state: stateName,
      lang: resolvedLang,
      customUrl: controls.customEnabled ? controls.customUrl : ""
    })
      .then((data) => {
        if (!active) return;
        const allowed = filterBySourceControls(data.articles || [], controls, resolvedCity, stateName);
        const list = [
          ...(pinned ? [{ title: pinned, source: "WE4ALL Live Notice" }] : []),
          ...allowed.slice(0, 15)
        ];
        setHeadlines(list);
        setIdx(0);
      })
      .catch(() => {
        if (active && pinned) setHeadlines([{ title: pinned, source: "WE4ALL Notice" }]);
      });
    return () => { active = false; };
  }, [resolvedCity, stateName, resolvedLang, controls]);

  useEffect(() => {
    if (headlines.length <= 1) return;
    const t = setInterval(() => setIdx((prev) => (prev + 1) % headlines.length), 4200);
    return () => clearInterval(t);
  }, [headlines.length]);

  if (controls.pausedAll && headlines.length === 0) return null;
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
            <span>📰 LIVE {resolvedCity} NEWS ({resolvedLang.toUpperCase()})</span>
            {current?.source && <span className="text-indigo-300 normal-case font-bold truncate">· {current.source}</span>}
          </div>
          <p className="text-[11px] font-bold text-white truncate">
            {current ? current.title : "Loading live " + resolvedCity + " headlines..."}
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
  const [controls, setControls] = useState(loadNewsSourceControls);
  const [geoFilter, setGeoFilter] = useState("all");
  const [articles, setArticles] = useState([]);
  const [epapers, setEpapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [monitorIdx, setMonitorIdx] = useState(0);
  const [pinnedTicker, setPinnedTicker] = useState(() => {
    try { return localStorage.getItem("we4all_live_news_ticker") || ""; } catch { return ""; }
  });

  useEffect(() => {
    setLang(normalizeNewsLang(accountLang));
  }, [accountLang]);

  const updateControls = (patch) => {
    const next = { ...controls, ...patch };
    setControls(next);
    saveNewsSourceControls(next);
    setStatusMsg("Live news source controls updated immediately for Users App.");
  };

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
          setStatusMsg("GPS locked — live fetch only (zero storage).");
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
      const data = await fetchStatelessGeoNews({
        city,
        state: stateName,
        lang,
        customUrl: controls.customEnabled ? controls.customUrl : "",
        force
      });
      setArticles(Array.isArray(data.articles) ? data.articles : []);
      setEpapers(Array.isArray(data.epapers) ? data.epapers : []);
      setStatusMsg("Live fetch active · Zero DB/device news storage · " + (data.count || 0) + " headlines ready for Users App.");
    } catch (e) {
      setStatusMsg(e.message || "Could not load live news.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveNews(false);
  }, [city, lang, controls.customUrl, controls.customEnabled]);

  const activeUserFeed = filterBySourceControls(articles, controls, city, stateName);
  const liveScrollingList = [
    ...(pinnedTicker ? [{ title: pinnedTicker, source: "Pinned Admin Notice", geo: "All Users" }] : []),
    ...activeUserFeed.slice(0, 15)
  ];

  useEffect(() => {
    if (liveScrollingList.length <= 1) return;
    const t = setInterval(() => setMonitorIdx((prev) => (prev + 1) % liveScrollingList.length), 3500);
    return () => clearInterval(t);
  }, [liveScrollingList.length]);

  const isAdmin = mode === "admin";

  // ADMIN VIEW: Clean Live Scrolling Monitor Window + Source Pause/Resume Controls (NO 30-card news dump!)
  if (isAdmin) {
    const activeHeadline = liveScrollingList[monitorIdx];
    return (
      <div className="space-y-4 text-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 p-4 text-white">
          <div>
            <h3 className="text-sm font-black tracking-tight">🎛️ Live News Monitor & Source Pause Control</h3>
            <p className="text-[11px] text-indigo-200">Headlines stream directly to the Users App scrolling bar (zero DB storage). Monitor & pause sources here.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => updateControls({ pausedAll: !controls.pausedAll })}
              className={controls.pausedAll ? "rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-[10px] font-black text-white" : "rounded-lg bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-[10px] font-black text-white"}
            >
              {controls.pausedAll ? "▶️ Resume All News" : "⏸️ Pause All Auto-News"}
            </button>
            <button type="button" disabled={loading} onClick={() => loadLiveNews(true)} className="rounded-lg bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 text-[10px] font-black text-white disabled:opacity-50">
              {loading ? "Syncing..." : "🔄 Refresh Live Feed"}
            </button>
          </div>
        </div>

        {/* 1. LIVE SCROLLING MONITOR WINDOW (Shows exactly what is scrolling right now in Users App) */}
        <div className="rounded-2xl border border-emerald-500/40 bg-slate-950 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
              📺 Currently Scrolling Live in Users App ({liveScrollingList.length} active headline{liveScrollingList.length === 1 ? "" : "s"})
            </span>
            {pinnedTicker && (
              <button
                type="button"
                onClick={() => {
                  try { localStorage.removeItem("we4all_live_news_ticker"); } catch {}
                  setPinnedTicker("");
                  if (onPinToTicker) onPinToTicker("");
                  setStatusMsg("Cleared pinned Admin notice from Users scrolling bar.");
                }}
                className="rounded-lg bg-rose-700 hover:bg-rose-800 px-2.5 py-1 text-[10px] font-black text-white"
              >
                🗑️ Clear Pinned Notice
              </button>
            )}
          </div>

          <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/60 px-3.5 py-2.5">
            {controls.pausedAll && !pinnedTicker ? (
              <p className="text-xs font-bold text-amber-300">⏸️ All auto-news sources are currently PAUSED in the Users App.</p>
            ) : activeHeadline ? (
              <div>
                <p className="text-[10px] font-black text-amber-300 uppercase">NOW SCROLLING ({monitorIdx + 1}/{liveScrollingList.length}) · {activeHeadline.source}</p>
                <p className="text-xs font-bold text-white mt-0.5">{activeHeadline.title}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Waiting for live headlines...</p>
            )}
          </div>

          {liveScrollingList.length > 0 && (
            <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
              {liveScrollingList.map((item, i) => (
                <div key={item.title + i} className={i === monitorIdx ? "flex items-center justify-between gap-2 rounded-lg bg-indigo-900/50 border border-indigo-500/40 px-2.5 py-1.5 text-[11px]" : "flex items-center justify-between gap-2 rounded-lg bg-slate-900/80 px-2.5 py-1.5 text-[11px]"}>
                  <span className="truncate text-slate-100"><b className="text-amber-300">#{i + 1}</b> {item.title}</span>
                  <span className="shrink-0 text-[9px] font-bold text-slate-400">{item.source}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. SOURCE PAUSE / RESUME CONTROLS */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <h4 className="text-xs font-black text-cyan-300">📡 Manage & Pause News Sources (Deployed to Users App)</h4>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ["localCity", "📍 Local City News (" + city + ")"],
              ["stateNews", "🗺️ State News (" + stateName + ")"],
              ["indiaNews", "🇮🇳 National / India News"]
            ].map(([key, label]) => {
              const active = !controls.pausedAll && controls[key] !== false;
              return (
                <div key={key} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <span className="text-[11px] font-bold text-white">{label}</span>
                  <button
                    type="button"
                    onClick={() => updateControls({ [key]: controls[key] === false })}
                    className={active ? "rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[10px] font-black text-white" : "rounded-lg bg-amber-700 hover:bg-amber-800 px-2.5 py-1 text-[10px] font-black text-white"}
                  >
                    {active ? "🟢 LIVE" : "⏸️ PAUSED"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Optional Custom Open-Source RSS / E-Paper Feed URL with Pause toggle */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <input
              value={controls.customUrl || ""}
              onChange={(e) => updateControls({ customUrl: e.target.value })}
              placeholder="Optional custom open-source RSS URL (e.g. https://www.thehindu.com/news/national/telangana/feeder/default.rss)"
              className="flex-1 min-w-[240px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => updateControls({ customEnabled: controls.customEnabled === false })}
              className={controls.customEnabled !== false ? "rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black text-white" : "rounded-xl bg-amber-700 px-3 py-2 text-[10px] font-black text-white"}
            >
              {controls.customEnabled !== false ? "🟢 Custom Source LIVE" : "⏸️ Custom Source PAUSED"}
            </button>
          </div>
          {statusMsg && <p className="text-[11px] font-bold text-emerald-300">{statusMsg}</p>}
        </div>
      </div>
    );
  }

  // CUSTOMER READER VIEW (Opens when user taps the live scrolling news bar on Customer Home)
  const filtered = activeUserFeed.filter((item) => {
    if (geoFilter === "all") return true;
    return String(item.geo || "").toLowerCase().includes(geoFilter.toLowerCase());
  });

  return (
    <div className="space-y-3 text-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950 via-slate-900 to-violet-950 p-4 text-white">
        <div>
          <h3 className="text-sm font-black tracking-tight">📰 WE4ALL Live Geo-News & E-Newspapers</h3>
          <p className="text-[11px] text-indigo-200">100% live fetch & display · Zero storage · Synced to your language.</p>
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
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white">
          <option value="en">English</option>
          <option value="te">తెలుగు (Telugu)</option>
          <option value="hi">हिन्दी (Hindi)</option>
          <option value="mr">मराठी (Marathi)</option>
          <option value="kn">ಕನ್ನಡ (Kannada)</option>
          <option value="ta">தமிழ் (Tamil)</option>
        </select>
        <div className="flex flex-wrap gap-1 ml-auto">
          {[["all", "All"], [city, "📍 " + city], [stateName, "🗺️ " + stateName], ["India", "🇮🇳 India"]].map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setGeoFilter(k)} className={geoFilter === k ? "rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-black text-white" : "rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-slate-300"}>{lbl}</button>
          ))}
        </div>
      </div>

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
                {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[9px] font-bold text-cyan-300">Read ↗</a>}
                <a href={"https://wa.me/?text=" + encodeURIComponent("📰 " + item.title + (item.link ? "\n" + item.link : "") + "\n— via WE4ALL")} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-2 py-1 text-[9px] font-bold text-white">📲 WhatsApp</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
