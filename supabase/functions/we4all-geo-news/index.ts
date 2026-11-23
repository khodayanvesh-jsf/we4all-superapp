// WE4ALL All-India Stateless Geo-Location Live News Edge Function (v3.3.74)
// ZERO database queries, ZERO storage — fetch, parse, edge-cache (15m), return.

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
  ml: { hl: "ml", gl: "IN", ceid: "IN:ml" },
  gu: { hl: "gu", gl: "IN", ceid: "IN:gu" },
  bn: { hl: "bn", gl: "IN", ceid: "IN:bn" },
  pa: { hl: "pa", gl: "IN", ceid: "IN:pa" },
};

const CITY_TO_STATE: Record<string, string> = {
  adilabad: "Telangana", hyderabad: "Telangana", warangal: "Telangana", nizamabad: "Telangana",
  karimnagar: "Telangana", khammam: "Telangana", nalgonda: "Telangana", mahbubnagar: "Telangana",
  mancherial: "Telangana", nirmal: "Telangana", siddipet: "Telangana", sangareddy: "Telangana",
  vijayawada: "Andhra Pradesh", visakhapatnam: "Andhra Pradesh", guntur: "Andhra Pradesh",
  tirupati: "Andhra Pradesh", nellore: "Andhra Pradesh", kurnool: "Andhra Pradesh", kakinada: "Andhra Pradesh",
  mumbai: "Maharashtra", pune: "Maharashtra", nagpur: "Maharashtra", nashik: "Maharashtra",
  aurangabad: "Maharashtra", solapur: "Maharashtra", yavatmal: "Maharashtra", chandrapur: "Maharashtra",
  bengaluru: "Karnataka", bangalore: "Karnataka", mysuru: "Karnataka", hubballi: "Karnataka", mangaluru: "Karnataka",
  chennai: "Tamil Nadu", coimbatore: "Tamil Nadu", madurai: "Tamil Nadu", tiruchirappalli: "Tamil Nadu", salem: "Tamil Nadu",
  delhi: "Delhi", "new delhi": "Delhi", noida: "Uttar Pradesh", lucknow: "Uttar Pradesh",
  kanpur: "Uttar Pradesh", varanasi: "Uttar Pradesh", agra: "Uttar Pradesh", prayagraj: "Uttar Pradesh",
  jaipur: "Rajasthan", udaipur: "Rajasthan", jodhpur: "Rajasthan", kota: "Rajasthan",
  ahmedabad: "Gujarat", surat: "Gujarat", vadodara: "Gujarat", rajkot: "Gujarat",
  kolkata: "West Bengal", siliguri: "West Bengal", bhopal: "Madhya Pradesh", indore: "Madhya Pradesh",
  patna: "Bihar", ranchi: "Jharkhand", kochi: "Kerala", thiruvananthapuram: "Kerala", kozhikode: "Kerala",
  chandigarh: "Punjab", ludhiana: "Punjab", amritsar: "Punjab", bhubaneswar: "Odisha", cuttack: "Odisha",
  guwahati: "Assam", raipur: "Chhattisgarh", dehradun: "Uttarakhand", shimla: "Himachal Pradesh",
  panaji: "Goa", srinagar: "Jammu and Kashmir", jammu: "Jammu and Kashmir",
};

const dec = (s: string) =>
  String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

interface NewsItem {
  title: string;
  summary: string;
  pubDate: string;
  source: string;
  bucket: string;
  scopeLabel: string;
}

function parseRss(xml: string, bucket: string, scopeLabel: string, max = 8): NewsItem[] {
  const out: NewsItem[] = [];
  for (const b of xml.match(/<item\b[\s\S]*?<\/item>/gi) || []) {
    if (out.length >= max) break;
    let title = dec((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
    let source = dec((b.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [])[1] || "");
    const rawDesc = dec((b.match(/<description[^>]*>([\s\S]*?)<\/description>/i) || [])[1] || "");
    const pubDate = dec((b.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [])[1] || "");
    if (!title || title.length < 8) continue;
    if (!source && title.includes(" - ")) {
      const i = title.lastIndexOf(" - ");
      if (i > 12) {
        source = title.slice(i + 3).trim();
        title = title.slice(0, i).trim();
      }
    } else if (source && title.endsWith(" - " + source)) {
      title = title.slice(0, -(source.length + 3)).trim();
    }
    let summary = rawDesc;
    if (!summary || summary.toLowerCase().startsWith(title.toLowerCase().slice(0, 35))) {
      summary = `Latest ${scopeLabel} update reported by ${source || "News Desk"}.`;
    } else if (summary.length > 260) {
      summary = summary.slice(0, 257).trim() + "…";
    }
    out.push({ title, summary, pubDate, source: source || "LIVE", bucket, scopeLabel });
  }
  return out;
}

async function fetchRss(url: string, bucket: string, scopeLabel: string, max = 8): Promise<NewsItem[]> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4500);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": "Mozilla/5.0 WE4ALLNewsBot/1.0" },
    });
    return r.ok ? parseRss(await r.text(), bucket, scopeLabel, max) : [];
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const p: Record<string, string> = {};
    new URL(req.url).searchParams.forEach((v, k) => (p[k] = v));
    if (req.method === "POST") {
      try {
        const b = await req.json();
        if (b && typeof b === "object") {
          Object.entries(b).forEach(([k, v]) => {
            if (v != null) p[k] = String(v);
          });
        }
      } catch {}
    }

    const rawCity = (p.city || "").trim();
    const city = rawCity && rawCity.toLowerCase() !== "all" && rawCity.toLowerCase() !== "auto" ? rawCity : "Adilabad";
    const mappedState = CITY_TO_STATE[city.toLowerCase()] || "";
    const rawState = (p.state || "").trim();
    const state =
      rawState && rawState.toLowerCase() !== "auto"
        ? rawState
        : mappedState || req.headers.get("x-vercel-ip-country-region") || "Telangana";

    const lang = (p.lang || "en").trim().toLowerCase().slice(0, 2);
    const lc = LANGS[lang] || LANGS.en;
    const isOn = (k: string) => p[k] === "1" || p[k] === "true";

    if (isOn("pauseAll")) {
      return new Response(
        JSON.stringify({ ok: true, stateless: true, pausedAll: true, city, state, lang, fetchedAt: new Date().toISOString(), count: 0, items: [] }),
        { status: 200, headers: CORS }
      );
    }

    const qs = `hl=${encodeURIComponent(lc.hl)}&gl=${encodeURIComponent(lc.gl)}&ceid=${encodeURIComponent(lc.ceid)}`;
    const tasks: Array<Promise<NewsItem[]>> = [];

    if (!isOn("pauseLocal")) {
      tasks.push(fetchRss(`https://news.google.com/rss/search?q=${encodeURIComponent(city + " " + state + " when:2d")}&${qs}`, "local", city, 8));
    }
    if (!isOn("pauseState")) {
      tasks.push(fetchRss(`https://news.google.com/rss/search?q=${encodeURIComponent(state + " latest news when:1d")}&${qs}`, "state", state, 10));
    }
    if (!isOn("pauseIndia")) {
      tasks.push(fetchRss(`https://news.google.com/rss?${qs}`, "india", "India Top", 10));
    }
    if (!isOn("pauseCustom") && p.customRss && /^https?:\/\//i.test(p.customRss.trim())) {
      tasks.push(fetchRss(p.customRss.trim(), "custom", "Featured", 6));
    }

    const groups = await Promise.all(tasks);
    const seen = new Set<string>();
    const items: NewsItem[] = [];
    const maxLen = Math.max(0, ...groups.map((g) => g.length));
    for (let i = 0; i < maxLen && items.length < 24; i++) {
      for (const grp of groups) {
        const it = grp[i];
        if (!it) continue;
        const key = it.title.toLowerCase().slice(0, 60);
        if (seen.has(key)) continue;
        seen.add(key);
        items.push(it);
        if (items.length >= 24) break;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, stateless: true, city, state, lang, fetchedAt: new Date().toISOString(), count: items.length, items }),
      { status: 200, headers: CORS }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Fetch failed", items: [] }),
      { status: 200, headers: CORS }
    );
  }
});