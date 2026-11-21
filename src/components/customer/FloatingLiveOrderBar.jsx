import React from 'react';
import { useOrderTracking } from '../../hooks/useOrderTracking';
import { getOrderStatusMeta } from '../../utils/orderStatusMeta';

const DOT = '\u00B7';
const INR = '\u20B9';

export function FloatingLiveOrderBar({
  orderId,
  partnerName = 'WE4ALL Partner Store',
  onOpenTracking,
}) {
  const { order, connectionState } = useOrderTracking(orderId);

  if (!orderId || !order) return null;

  const meta = getOrderStatusMeta(order.status);
  if (!meta.isActive) return null;

  const orderNo = order.order_number || `WE4-${order.id.slice(0, 6).toUpperCase()}`;

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2">
      <button
        type="button"
        onClick={() => onOpenTracking?.(order.id)}
        className="w-full rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-emerald-500/40 flex items-center justify-between gap-3 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-2.5 min-w-0 text-left">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              connectionState === 'live'
                ? 'bg-emerald-400 animate-ping'
                : 'bg-amber-400'
            }`}
          />
          <div className="min-w-0">
            <p className="text-xs font-bold truncate">
              {meta.label} {DOT} {partnerName}
            </p>
            <p className="text-[11px] text-slate-300 truncate">
              #{orderNo} {DOT} {INR}
              {order.total_inr.toFixed(0)} {DOT} Tap to track live
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 text-[11px] font-black shrink-0">
          Track
        </span>
      </button>
    </div>
  );
}