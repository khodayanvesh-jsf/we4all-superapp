const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
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
  for (const block of itemMatches.slice(0, 15)) {
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
      summary: decodeXml(descMatch?.[2] || "").slice(0, 240),
      geo: geoTag
    });
  }
  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Request? {} : new Response("ok", { headers: CORS });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const city = String(body.city || "Adilabad").trim().slice(0, 60) || "Adilabad";
    const state = String(body.state || "Telangana").trim().slice(0, 60) || "Telangana";
    const lang = String(body.lang || "en").trim().toLowerCase();
    const hl = lang === "te" ? "te" : lang === "hi" ? "hi" : "en-IN";
    const ceid = lang === "te" ? "IN:te" : lang === "hi" ? "IN:hi" : "IN:en";

    const defaultSources = [
      {
        name: city + " Local News",
        geo: city,
        url: "https://news.google.com/rss/search?q=" + encodeURIComponent(city + " " + state) + "&hl=" + hl + "&gl=IN&ceid=" + ceid
      },
      {
        name: state + " State News",
        geo: state,
        url: "https://news.google.com/rss/search?q=" + encodeURIComponent(state + " news") + "&hl=" + hl + "&gl=IN&ceid=" + ceid
      },
      {
        name: "India Daily E-News",
        geo: "India",
        url: "https://news.google.com/rss?hl=" + hl + "&gl=IN&ceid=" + ceid
      }
    ];

    const customSources = Array.isArray(body.customSources)
      ? body.customSources
          .filter((s: Record<string, unknown>) => s && typeof s.url === "string" && /^https?:\/\//i.test(String(s.url)))
          .slice(0, 8)
          .map((s: Record<string, unknown>) => ({
            name: String(s.name || "Custom News").slice(0, 60),
            geo: String(s.geo || city).slice(0, 40),
            url: String(s.url).trim()
          }))
      : [];

    const allSources = [...customSources, ...defaultSources];
    const settled = await Promise.all(
      allSources.map(async (src) => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 6500);
          const resp = await fetch(src.url, {
            signal: ctrl.signal,
            headers: { "User-Agent": "WE4ALL-GeoNews-Reader/1.0 (+https://we-4-all-super-app.vercel.app)" }
          });
          clearTimeout(timer);
          if (!resp.ok) return [];
          const xml = await resp.text();
          return parseRssItems(xml, src.name, src.geo);
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
      city,
      state,
      lang,
      fetchedAt: new Date().toISOString(),
      count: articles.length,
      articles: articles.slice(0, 45)
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : "Geo news fetch failed" }, 500);
  }
});
