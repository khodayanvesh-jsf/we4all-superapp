import React, { useState } from "react";

const RATINGS_KEY = "we4all_order_ratings_v1";
const STEPS = [
  { key: "accepted", label: "Accepted" },
  { key: "packed", label: "Packed" },
  { key: "en_route", label: "Rider En Route" },
  { key: "delivered", label: "Delivered" },
];

function getStepIndex(status = "") {
  const s = String(status).toLowerCase();
  if (/deliver|complet/.test(s)) return 3;
  if (/pick|route|dispatch|assign|way/.test(s)) return 2;
  if (/pack|prepar|ready/.test(s)) return 1;
  return 0;
}

function getHandoverPin(order) {
  if (order?.handover_pin || order?.delivery_otp || order?.deliveryPin) {
    return String(order.handover_pin || order.delivery_otp || order.deliveryPin).slice(0, 4);
  }
  const seed = String(order?.id || order?.order_number || "4821");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 9000;
  return String(1000 + Math.abs(hash));
}

function readRatings() {
  try { return JSON.parse(localStorage.getItem(RATINGS_KEY) || "{}"); } catch { return {}; }
}

export function OrderTimelineAndRating({ orders = [] }) {
  const [ratings, setRatings] = useState(readRatings);
  const [draftNote, setDraftNote] = useState({});

  const list = Array.isArray(orders) ? orders.slice(0, 6) : [];
  if (!list.length) return null;

  const saveRating = (orderId, stars) => {
    const next = { ...ratings, [orderId]: { stars, note: (draftNote[orderId] || "").trim(), ts: Date.now() } };
    setRatings(next);
    try { localStorage.setItem(RATINGS_KEY, JSON.stringify(next)); } catch {}
  };

  return (
    <div className="space-y-2.5 mt-3">
      <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">
        🚚 Live Order Tracking, 4-Digit Handover PIN &amp; Ratings
      </div>
      {list.map((ord, idx) => {
        const oid = String(ord?.id || ord?.order_number || `ord_${idx}`);
        const stepIdx = getStepIndex(ord?.status);
        const isDelivered = stepIdx === 3;
        const pin = getHandoverPin(ord);
        const saved = ratings[oid];

        return (
          <div key={oid} className="rounded-2xl border border-indigo-500/30 bg-slate-900/90 p-3 text-white shadow-sm space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-extrabold text-white">
                Order #{String(ord?.order_number || oid).slice(-6).toUpperCase()}
                {ord?.merchantName ? ` · ${ord.merchantName}` : ""}
              </div>
              {!isDelivered ? (
                <span className="rounded-lg bg-amber-400/20 border border-amber-400/50 px-2 py-0.5 text-[11px] font-black text-amber-300">
                  🔐 Handover PIN: {pin}
                </span>
              ) : (
                <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
                  ✅ Delivered
                </span>
              )}
            </div>

            {/* 4-Step Live Progress Timeline */}
            <div className="grid grid-cols-4 gap-1">
              {STEPS.map((st, i) => {
                const done = i <= stepIdx;
                return (
                  <div key={st.key} className="text-center">
                    <div className={"h-1.5 rounded-full mb-1 " + (done ? "bg-gradient-to-r from-violet-500 to-emerald-400" : "bg-slate-700")} />
                    <div className={"text-[9px] font-bold " + (done ? "text-emerald-300" : "text-slate-400")}>
                      {st.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verified 5-Star Rating for Delivered Orders */}
            {isDelivered && (
              <div className="rounded-xl bg-slate-800/80 p-2.5 border border-slate-700/80 space-y-1.5">
                {saved ? (
                  <div className="text-[11px] font-bold text-amber-300">
                    {"★".repeat(saved.stars)}{"☆".repeat(5 - saved.stars)} Rated {saved.stars}/5
                    {saved.note ? <span className="text-slate-300 font-normal"> — &ldquo;{saved.note}&rdquo;</span> : " — Thanks for your feedback!"}
                  </div>
                ) : (
                  <>
                    <div className="text-[11px] font-bold text-slate-200">Rate Merchant &amp; Rider Delivery:</div>
                    <input
                      value={draftNote[oid] || ""}
                      onChange={(e) => setDraftNote((d) => ({ ...d, [oid]: e.target.value }))}
                      placeholder="Optional quick feedback (fast delivery, fresh items...)"
                      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-white outline-none"
                    />
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => saveRating(oid, star)}
                          className="rounded-lg bg-amber-400/20 hover:bg-amber-400 hover:text-slate-950 px-2 py-1 text-xs font-black text-amber-300 transition cursor-pointer"
                        >
                          {star}★
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default OrderTimelineAndRating;