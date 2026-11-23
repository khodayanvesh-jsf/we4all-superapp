const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200 ? "public, max-age=600, s-maxage=900, stale-while-revalidate=1800" : "no-store"
    }
  });

function decodeXml(str: string): string {
  return String(str || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssItems(xml: string, fallbackSource: string, geoTag: string) {
  const items: Array<{ title: string; link: string; publishedAt: string; source: string; summary: string; geo: string }> = [];
  const itemMatches = xml.match(/<(item|entry)[\s>][\s\S]*?<\/(item|entry)>/gi) || [];
  for (const block of itemMatches.slice(0, 12)) {
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || block.match(/<link[^>]*href=["']([^"']+)["']/i);
    const dateMatch = block.match(/<(pubDate|updated|published)[^>]*>([\s\S]*?)<\/(pubDate|updated|published)>/i);
    const descMatch = block.match(/<(description|summary)[^>]*>([\s\S]*?)<\/(description|summary)>/i);
    const srcMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    const title = decodeXml(titleMatch?.[1] || "");
    const link = decodeXml(linkMatch?.[1] || "");
    if (!title || title.length < 4) continue;
    items.push({
      title: title.slice(0, 220),
      link: link.startsWith("http") ? link : "",
      publishedAt: decodeXml(dateMatch?.[2] || ""),
      source: decodeXml(srcMatch?.[1] || "") || fallbackSource,
      summary: decodeXml(descMatch?.[2] || "").slice(0, 200),
      geo: geoTag
    });
  }
  return items;
}

function getTodayDdMmYyyy(): string {
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = now.getUTCFullYear();
  return dd + "/" + mm + "/" + yyyy;
}

function getGeoEpapers(city: string, state: string, lang: string) {
  const today = getTodayDdMmYyyy();
  const s = (state + " " + city).toLowerCase();
  const papers = [];
  if (s.includes("telangana") || s.includes("adilabad") || s.includes("hyderabad") || s.includes("andhra") || lang === "te") {
    papers.push(
      { name: "Eenadu E-Paper (ఈనాడు)", lang: "TE", geo: city || "Telangana", url: "https://epaper.eenadu.net/Home/Index?date=" + encodeURIComponent(today) + "&eid=2" },
      { name: "Sakshi E-Paper (సాక్షి)", lang: "TE", geo: "Telangana", url: "https://epaper.sakshi.com/" },
      { name: "Namasthe Telangana", lang: "TE", geo: "Telangana", url: "https://epaper.ntnews.com/" },
      { name: "Andhra Jyothy", lang: "TE", geo: "Telangana & AP", url: "https://epaper.andhrajyothy.com/" }
    );
  }
  if (s.includes("maharashtra") || lang === "mr") {
    papers.push({ name: "Lokmat E-Paper", lang: "MR", geo: "Maharashtra", url: "https://epaper.lokmat.com/" });
  }
  if (lang === "hi" || s.includes("delhi") || s.includes("madhya") || s.includes("uttar")) {
    papers.push({ name: "Dainik Bhaskar E-Paper", lang: "HI", geo: "India", url: "https://epaper.bhaskar.com/" });
  }
  papers.push(
    { name: "The Hindu (Telangana)", lang: "EN", geo: "Telangana", url: "https://www.thehindu.com/news/national/telangana/" },
    { name: "Indian Express E-Paper", lang: "EN", geo: "India", url: "https://epaper.indianexpress.com/" }
  );
  return papers;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const reqUrl = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const city = String(reqUrl.searchParams.get("city") || body.city || "Adilabad").trim().slice(0, 60) || "Adilabad";
    const state = String(reqUrl.searchParams.get("state") || body.state || "Telangana").trim().slice(0, 60) || "Telangana";
    const rawLang = String(reqUrl.searchParams.get("lang") || body.lang || "en").trim().toLowerCase().slice(0, 2);

    const langMap: Record<string, { hl: string; ceid: string }> = {
      te: { hl: "te", ceid: "IN:te" },
      hi: { hl: "hi", ceid: "IN:hi" },
      mr: { hl: "mr", ceid: "IN:mr" },
      kn: { hl: "kn", ceid: "IN:kn" },
      ta: { hl: "ta", ceid: "IN:ta" },
      en: { hl: "en-IN", ceid: "IN:en" }
    };
    const { hl, ceid } = langMap[rawLang] || langMap.en;

    const sources = [
      {
        name: city + " Main Headings",
        geo: city,
        url: "https://news.google.com/rss/search?q=" + encodeURIComponent(city + " " + state + (rawLang === "te" ? " eenadu OR sakshi OR telangana" : "")) + "&hl=" + hl + "&gl=IN&ceid=" + ceid
      },
      {
        name: state + " E-News",
        geo: state,
        url: "https://news.google.com/rss/search?q=" + encodeURIComponent(state + " news") + "&hl=" + hl + "&gl=IN&ceid=" + ceid
      },
      {
        name: "India Daily Headings",
        geo: "India",
        url: "https://news.google.com/rss?hl=" + hl + "&gl=IN&ceid=" + ceid
      }
    ];

    const customUrl = String(reqUrl.searchParams.get("customUrl") || body.customUrl || "").trim();
    if (/^https?:\/\//i.test(customUrl)) {
      sources.unshift({ name: "Custom E-News Feed", geo: city, url: customUrl });
    }

    const settled = await Promise.all(
      sources.map(async (src) => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 5000);
          const resp = await fetch(src.url, {
            signal: ctrl.signal,
            headers: { "User-Agent": "WE4ALL-Stateless-News/1.0" }
          });
          clearTimeout(timer);
          if (!resp.ok) return [];
          return parseRssItems(await resp.text(), src.name, src.geo);
        } catch {
          return [];
        }
      })
    );

    const seen = new Set<string>();
    const articles = [];
    for (const group of settled) {
      for (const item of group) {
        const key = item.title.toLowerCase().slice(0, 70);
        if (seen.has(key)) continue;
        seen.add(key);
        articles.push(item);
      }
    }

    return json({
      ok: true,
      stateless: true,
      storageUsed: 0,
      city,
      state,
      lang: rawLang,
      epapers: getGeoEpapers(city, state, rawLang),
      count: articles.length,
      articles: articles.slice(0, 30)
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Geo news fetch failed" }, 500);
  }
});
