const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=600, s-maxage=900, stale-while-revalidate=1800",
  "X-WE4ALL-Storage": "none-stateless",
};
const LANGS: Record<string, { hl: string; gl: string; ceid: string }> = {
  en: { hl: "en-IN", gl: "IN", ceid: "IN:en" },
  te: { hl: "te", gl: "IN", ceid: "IN:te" },
  hi: { hl: "hi", gl: "IN", ceid: "IN:hi" },
  mr: { hl: "mr", gl: "IN", ceid: "IN:mr" },
  kn: { hl: "kn", gl: "IN", ceid: "IN:kn" },
  ta: { hl: "ta", gl: "IN", ceid: "IN:ta" },
};
const dec = (s: string) =>
  String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function parseRss(xml: string, bucket: string, max = 8) {
  const out: Array<{ title: string; link: string; pubDate: string; source: string; bucket: string }> = [];
  for (const b of xml.match(/<item\b[\s\S]*?<\/item>/gi) || []) {
    if (out.length >= max) break;
    let title = dec((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    let source = dec((b.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || "");
    const link = dec((b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] || "");
    const pubDate = dec((b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || "");
    if (!title || title.length < 6) continue;
    if (!source && title.includes(" - ")) {
      const i = title.lastIndexOf(" - ");
      if (i > 12) { source = title.slice(i + 3).trim(); title = title.slice(0, i).trim(); }
    } else if (source && title.endsWith(" - " + source)) {
      title = title.slice(0, -(source.length + 3)).trim();
    }
    out.push({ title, link, pubDate, source: source || bucket.toUpperCase(), bucket });
  }
  return out;
}

async function fetchRss(url: string, bucket: string, max = 8) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4500);
  try {
    const r = await fetch(url, { signal: ac.signal, headers: { "User-Agent": "Mozilla/5.0 WE4ALLNewsBot/1.0" } });
    return r.ok ? parseRss(await r.text(), bucket, max) : [];
  } catch { return []; } finally { clearTimeout(t); }
}

function epapersFor(state: string, lang: string) {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  const dt = `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
  const s = state.toLowerCase();
  return [
    { name: "Eenadu E-Paper", lang: "te", region: "Telangana & AP", url: `https://epaper.eenadu.net/Home/Index?date=${dt}&eid=2` },
    { name: "Sakshi E-Paper", lang: "te", region: "Telangana & AP", url: "https://epaper.sakshi.com/" },
    { name: "Namasthe Telangana", lang: "te", region: "Telangana", url: "https://epaper.ntnews.com/" },
    { name: "Andhra Jyothy", lang: "te", region: "Telangana & AP", url: "https://epaper.andhrajyothy.com/" },
    { name: "The Hindu E-Paper", lang: "en", region: "India", url: "https://epaper.thehindu.com/" },
    { name: "The Indian Express", lang: "en", region: "India", url: "https://epaper.indianexpress.com/" },
    { name: "Lokmat E-Paper", lang: "mr", region: "Maharashtra", url: "https://epaper.lokmat.com/" },
    { name: "Dainik Bhaskar", lang: "hi", region: "India", url: "https://epaper.bhaskar.com/" },
  ].sort((a, b) =>
    ((b.lang === lang ? 2 : 0) + (s.includes("telangana") && b.region.includes("Telangana") ? 1 : 0)) -
    ((a.lang === lang ? 2 : 0) + (s.includes("telangana") && a.region.includes("Telangana") ? 1 : 0))
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const p: Record<string, string> = {};
    new URL(req.url).searchParams.forEach((v, k) => (p[k] = v));
    if (req.method === "POST") {
      try {
        const b = await req.json();
        if (b && typeof b === "object") Object.entries(b).forEach(([k, v]) => { if (v != null) p[k] = String(v); });
      } catch {}
    }
    const city = (p.city || "Adilabad").trim() || "Adilabad";
    const state = (p.state || "Telangana").trim() || "Telangana";
    const lang = (p.lang || "en").trim().toLowerCase().slice(0, 2);
    const lc = LANGS[lang] || LANGS.en;
    const epapers = epapersFor(state, lang);
    const isOn = (k: string) => p[k] === "1" || p[k] === "true";

    if (isOn("pauseAll")) {
      return new Response(JSON.stringify({ ok: true, stateless: true, pausedAll: true, city, state, lang, fetchedAt: new Date().toISOString(), count: 0, items: [], epapers }), { status: 200, headers: CORS });
    }
    const qs = `hl=${encodeURIComponent(lc.hl)}&gl=${encodeURIComponent(lc.gl)}&ceid=${encodeURIComponent(lc.ceid)}`;
    const tasks: Array<Promise<Array<{ title: string; link: string; pubDate: string; source: string; bucket: string }>>> = [];
    if (!isOn("pauseLocal")) tasks.push(fetchRss(`https://news.google.com/rss/search?q=${encodeURIComponent(city + " " + state)}&${qs}`, "local", 8));
    if (!isOn("pauseState")) tasks.push(fetchRss(`https://news.google.com/rss/search?q=${encodeURIComponent(state + " news")}&${qs}`, "state", 8));
    if (!isOn("pauseIndia")) tasks.push(fetchRss(`https://news.google.com/rss?${qs}`, "india", 8));
    if (!isOn("pauseCustom") && p.customRss && /^https?:\/\//i.test(p.customRss.trim())) tasks.push(fetchRss(p.customRss.trim(), "custom", 6));

    const seen = new Set<string>();
    const items: Array<{ title: string; link: string; pubDate: string; source: string; bucket: string }> = [];
    for (const grp of await Promise.all(tasks)) {
      for (const it of grp) {
        const key = it.title.toLowerCase().slice(0, 60);
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(it);
        if (items.length >= 24) break;
      }
      if (items.length >= 24) break;
    }
    return new Response(JSON.stringify({ ok: true, stateless: true, city, state, lang, fetchedAt: new Date().toISOString(), count: items.length, items, epapers }), { status: 200, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Fetch failed", items: [] }), { status: 200, headers: CORS });
  }
});
