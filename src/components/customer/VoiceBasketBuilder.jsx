import React, { useState, useMemo } from "react";

const SAMPLE_PROMPTS = [
  "2 kg rice, 1L oil, half kg chicken",
  "1 kg tomato, 2 kg onion, milk",
  "500g mutton, biryani masala, curd",
];

function parseSpokenList(input) {
  const raw = String(input || "").trim();
  if (!raw) return [];
  return raw
    .split(/,|;|\band\b|\bమరియు\b|\bऔर\b|\n/i)
    .map((part) => part.trim())
    .filter((p) => p.length >= 2)
    .map((part) => {
      let qty = 1;
      const halfMatch = /\b(half|1\/2|500\s*g|అర|आधा)\b/i.test(part);
      const numMatch = part.match(/\b(\d+(?:\.\d+)?)\s*(kg|kgs|l|ltr|liter|litre|g|gm|pcs|pack|pkt)?\b/i);
      if (halfMatch) qty = 1;
      else if (numMatch) qty = Math.max(1, Math.min(20, Math.round(Number(numMatch[1]) || 1)));
      const cleanName = part
        .replace(/\b(half|1\/2|500\s*g|అర|आधा)\b/gi, "")
        .replace(/\b\d+(?:\.\d+)?\s*(kg|kgs|l|ltr|liter|litre|g|gm|pcs|pack|pkt)?\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      return { raw: part, query: cleanName || part, qty };
    });
}

export function VoiceBasketBuilder({ products = [], onAddToCart, lang = "en" }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [addedMsg, setAddedMsg] = useState("");

  const startVoice = () => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setAddedMsg("Voice mic not available in this browser — type your list below.");
      return;
    }
    const rec = new SR();
    const lc = String(lang || "en").toLowerCase().slice(0, 2);
    rec.lang = lc === "te" ? "te-IN" : lc === "hi" ? "hi-IN" : lc === "mr" ? "mr-IN" : lc === "ta" ? "ta-IN" : lc === "kn" ? "kn-IN" : "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    setAddedMsg("");
    rec.onresult = (e) => {
      const spoken = e?.results?.[0]?.[0]?.transcript || "";
      if (spoken) setText((prev) => (prev ? `${prev}, ${spoken}` : spoken));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try { rec.start(); } catch { setListening(false); }
  };

  const parsedItems = useMemo(() => parseSpokenList(text), [text]);

  const shopBaskets = useMemo(() => {
    if (!parsedItems.length || !Array.isArray(products) || !products.length) return [];
    const byShop = new Map();
    for (const p of products) {
      const shop = p.merchantName || p.shopName || "Local Verified Shop";
      if (!byShop.has(shop)) byShop.set(shop, []);
      byShop.get(shop).push(p);
    }
    const ranked = [];
    for (const [shop, shopProds] of byShop.entries()) {
      const matched = [];
      let total = 0;
      for (const req of parsedItems) {
        const tokens = req.query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
        const hit = shopProds.find((sp) => {
          const hay = `${sp.name || ""} ${sp.title || ""} ${sp.category || ""}`.toLowerCase();
          return tokens.some((tk) => hay.includes(tk));
        });
        if (hit) {
          const price = Number(hit.price || hit.sellingPrice || 0);
          total += price * req.qty;
          matched.push({ product: hit, qty: req.qty, price, lineTotal: price * req.qty });
        }
      }
      if (matched.length > 0) {
        ranked.push({ shop, matched, matchedCount: matched.length, total });
      }
    }
    return ranked.sort((a, b) => b.matchedCount - a.matchedCount || a.total - b.total).slice(0, 3);
  }, [parsedItems, products]);

  const highestTotal = shopBaskets.length > 1 ? Math.max(...shopBaskets.map((b) => b.total)) : 0;

  const addBasket = (basket) => {
    if (typeof onAddToCart === "function") {
      for (const m of basket.matched) {
        for (let i = 0; i < m.qty; i++) onAddToCart(m.product);
      }
      setAddedMsg(`✅ Added ${basket.matched.length} item(s) from ${basket.shop} (₹${basket.total}) to your Cart!`);
    } else {
      setAddedMsg(`Matched ${basket.matched.length} items at ${basket.shop} (₹${basket.total}).`);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950 via-violet-950 to-slate-900 p-3 text-white shadow-md">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-amber-300">🎙️ AI Voice-to-Cart &amp; Lowest-Price Compare</div>
          <div className="text-[10px] text-indigo-200">Speak in Telugu, Hindi or English — compare nearby shops in 1 tap</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-xl bg-gradient-to-r from-violet-500 to-rose-500 px-3 py-1.5 text-[11px] font-extrabold text-white shadow cursor-pointer"
        >
          {open ? "Hide" : "Try Now"}
        </button>
      </div>

      {open && (
        <div className="mt-2.5 space-y-2 border-t border-indigo-800/60 pt-2.5">
          <div className="flex gap-1.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='e.g. "2 kg rice, 1L oil, half kg chicken"'
              className="flex-1 rounded-xl border border-indigo-700 bg-slate-900/90 px-2.5 py-2 text-xs text-white placeholder-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={startVoice}
              className={"shrink-0 rounded-xl px-3 py-2 text-xs font-extrabold cursor-pointer " + (listening ? "bg-rose-600 animate-pulse text-white" : "bg-amber-400 text-slate-950")}
            >
              {listening ? "● Listening" : "🎤 Speak"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1">
            {SAMPLE_PROMPTS.map((sp) => (
              <button key={sp} type="button" onClick={() => setText(sp)} className="rounded-full bg-white/10 hover:bg-white/20 px-2 py-0.5 text-[10px] text-indigo-100 cursor-pointer">
                {sp}
              </button>
            ))}
          </div>

          {addedMsg && <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-1.5 text-[11px] font-bold text-emerald-200">{addedMsg}</div>}

          {parsedItems.length > 0 && shopBaskets.length === 0 && (
            <div className="rounded-xl bg-slate-900/70 p-2.5 text-[11px] text-slate-300">
              Parsed {parsedItems.length} item(s): <strong>{parsedItems.map((i) => `${i.qty}× ${i.query}`).join(", ")}</strong>. Approved local shop listings will auto-compare here as merchants publish items.
            </div>
          )}

          {shopBaskets.length > 0 && (
            <div className="space-y-2">
              {shopBaskets.map((b, idx) => {
                const savings = idx === 0 && highestTotal > b.total ? highestTotal - b.total : 0;
                return (
                  <div key={b.shop} className={"rounded-xl border p-2.5 " + (idx === 0 ? "border-emerald-400/60 bg-emerald-950/40" : "border-slate-700 bg-slate-900/60")}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-extrabold text-white">
                          {idx === 0 ? "🏆 Lowest Price: " : ""}{b.shop}
                        </div>
                        <div className="text-[10px] text-slate-300">
                          Matched {b.matchedCount}/{parsedItems.length} items · Total <strong>₹{b.total.toLocaleString("en-IN")}</strong>
                          {savings > 0 && <span className="ml-1.5 rounded bg-emerald-500/25 px-1.5 py-0.5 font-bold text-emerald-300">Save ₹{savings}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addBasket(b)}
                        className="shrink-0 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-2.5 py-1.5 text-[11px] font-extrabold text-slate-950 cursor-pointer"
                      >
                        🛒 Add All
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VoiceBasketBuilder;