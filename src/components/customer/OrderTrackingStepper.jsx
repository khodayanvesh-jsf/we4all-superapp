import React from 'react';
import { useOrderTracking } from '../../hooks/useOrderTracking';

const INR = '\u20B9';
const CHECK = '\u2713';
const TIMES = '\u00D7';

const ORDER_STEPS = [
  {
    id: 'placed',
    matches: ['placed', 'pending', 'created', 'new'],
    label: 'Order Placed',
    description: 'Sent to partner store',
  },
  {
    id: 'accepted',
    matches: ['accepted', 'confirmed'],
    label: 'Confirmed by Store',
    description: 'Partner has accepted your order',
  },
  {
    id: 'preparing',
    matches: ['preparing', 'packing', 'packed', 'ready', 'ready_for_pickup'],
    label: 'Packing Items',
    description: 'Items are being packed for dispatch',
  },
  {
    id: 'out_for_delivery',
    matches: ['out_for_delivery', 'dispatched', 'in_transit', 'picked_up'],
    label: 'Out for Delivery',
    description: 'Rider is on the way',
  },
  {
    id: 'delivered',
    matches: ['delivered', 'completed'],
    label: 'Delivered',
    description: 'Order completed',
  },
];

const CANCELLED_STATUSES = ['cancelled', 'canceled', 'rejected', 'failed'];

function formatAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (typeof address.full_address === 'string' && address.full_address.trim()) {
    return address.full_address;
  }
  return [
    address.line1,
    address.line2,
    address.landmark,
    address.area,
    address.town ?? address.city,
    address.pincode,
  ]
    .filter((p) => typeof p === 'string' && p.trim().length > 0)
    .join(', ');
}

function getConnectionBadge(state) {
  if (state === 'live') {
    return {
      wrapper: 'bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500 animate-ping',
      text: 'Live',
    };
  }
  if (state === 'reconnecting' || state === 'connecting') {
    return {
      wrapper: 'bg-amber-50 text-amber-700',
      dot: 'bg-amber-500',
      text: 'Syncing',
    };
  }
  return {
    wrapper: 'bg-rose-50 text-rose-700',
    dot: 'bg-rose-500',
    text: 'Offline',
  };
}

export function OrderTrackingStepper({
  orderId,
  partnerName = 'WE4ALL Partner Store',
}) {
  const { order, items, connectionState, loading, error, refetch } =
    useOrderTracking(orderId);

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100 animate-pulse max-w-md mx-auto">
        <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-10 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between gap-3 max-w-md mx-auto">
        <span>{error || 'Unable to load order details.'}</span>
        <button
          type="button"
          onClick={refetch}
          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold shrink-0"
        >
          Retry
        </button>
      </div>
    );
  }

  const statusKey = (order.status || 'placed').toLowerCase().trim();
  const isCancelled = CANCELLED_STATUSES.includes(statusKey);
  const currentStepIndex = ORDER_STEPS.findIndex((step) =>
    step.matches.includes(statusKey)
  );
  const displayOrderNo =
    order.order_number || `WE4-${order.id.slice(0, 8).toUpperCase()}`;
  const addressText = formatAddress(order.delivery_address);
  const badge = getConnectionBadge(connectionState);

  return (
    <div className="p-5 rounded-2xl bg-white shadow-sm border border-slate-200 max-w-md mx-auto">
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Order #{displayOrderNo}
          </p>
          <h3 className="text-base font-bold text-slate-900 mt-0.5">
            {partnerName}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {order.payment_method && (
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold uppercase">
                {order.payment_method}
              </span>
            )}
            {order.payment_status && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-medium capitalize">
                {order.payment_status}
              </span>
            )}
            {order.cod_collected_at && (
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-medium">
                COD Collected
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <button
            type="button"
            onClick={refetch}
            title="Tap to refresh order status"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.wrapper}`}
          >
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            {badge.text}
          </button>
          <p className="text-base font-bold text-slate-900 mt-1.5">
            {INR}
            {order.total_inr.toFixed(2)}
          </p>
        </div>
      </div>

      {isCancelled ? (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          <p className="font-semibold">Order Cancelled</p>
          <p className="text-xs mt-1 text-rose-600">
            This order was cancelled. Any prepaid UPI amount will be refunded automatically.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {ORDER_STEPS.map((step, index) => {
            const isCompleted = currentStepIndex >= 0 && index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <div key={step.id} className="relative flex items-start gap-3.5">
                {index < ORDER_STEPS.length - 1 && (
                  <span
                    className={`absolute left-3.5 top-7 -ml-px h-8 w-0.5 transition-colors duration-300 ${
                      index < currentStepIndex ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                    aria-hidden="true"
                  />
                )}

                <div
                  className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                >
                  {index < currentStepIndex ? CHECK : index + 1}
                </div>

                <div className="pt-0.5">
                  <p
                    className={`text-sm font-semibold ${
                      isCompleted ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-5 pt-3 border-t border-slate-100 space-y-1.5">
          <p className="text-xs font-semibold text-slate-700">Items</p>
          {items.map((item) => (
            <div
              key={item.id}
              className="flex justify-between text-xs text-slate-600 gap-2"
            >
              <span>
                {item.quantity} {TIMES} {item.item_title_snapshot}
              </span>
              <span className="shrink-0 font-medium">
                {INR}
                {item.line_total_inr.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>
            {INR}
            {order.subtotal_inr.toFixed(2)}
          </span>
        </div>
        {order.tax_inr > 0 && (
          <div className="flex justify-between">
            <span>GST</span>
            <span>
              {INR}
              {order.tax_inr.toFixed(2)}
            </span>
          </div>
        )}
        {order.delivery_fee_inr > 0 && (
          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span>
              {INR}
              {order.delivery_fee_inr.toFixed(2)}
            </span>
          </div>
        )}
        {order.customer_platform_fee_inr > 0 && (
          <div className="flex justify-between">
            <span>Platform Fee</span>
            <span>
              {INR}
              {order.customer_platform_fee_inr.toFixed(2)}
            </span>
          </div>
        )}
        {order.discount_inr > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Discount</span>
            <span>
              -{INR}
              {order.discount_inr.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {(addressText || order.customer_note) && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
          {addressText && (
            <p>
              <span className="font-semibold text-slate-700">Deliver to: </span>
              {addressText}
            </p>
          )}
          {order.customer_note && (
            <p>
              <span className="font-semibold text-slate-700">Note: </span>
              {order.customer_note}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
        <span>{order.zone_id || 'Adilabad Town'}</span>
        <span>
          Updated{' '}
          {new Date(order.updated_at || order.created_at).toLocaleTimeString(
            'en-IN',
            { hour: '2-digit', minute: '2-digit' }
          )}
        </span>
      </div>
    </div>
  );
}