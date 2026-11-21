import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useMerchantOrderQueue } from '../../hooks/useMerchantOrderQueue';
import { DoorstepUpiQrModal } from '../shared/DoorstepUpiQrModal';
import { PartnerChangeRequestModal } from '../partner/PartnerChangeRequestModal';

import { PendingPartnerGate } from '../partner/PendingPartnerGate';
const INR = '\u20B9';
const TIMES = '\u00D7';
const DOT = '\u00B7';

const TERMINAL_STATUSES = ['delivered', 'cancelled', 'disputed', 'refunded'];

function getNextAction(status) {
  const key = (status || 'awaiting_payment').toLowerCase().trim();

  if (key === 'awaiting_payment' || key === 'paid') {
    return {
      nextStatus: 'accepted',
      label: 'Accept Order',
      buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    };
  }
  if (key === 'accepted') {
    return {
      nextStatus: 'preparing',
      label: 'Start Packing',
      buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    };
  }
  if (key === 'preparing') {
    return {
      nextStatus: 'ready_for_pickup',
      label: 'Mark Ready for Pickup',
      buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    };
  }
  if (key === 'ready_for_pickup' || key === 'assigned') {
    return {
      nextStatus: 'picked_up',
      label: 'Hand Off to Rider',
      buttonClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    };
  }
  if (key === 'picked_up') {
    return {
      nextStatus: 'delivered',
      label: 'Mark Delivered',
      buttonClass: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    };
  }

  return null;
}

function canReject(status) {
  const key = (status || 'awaiting_payment').toLowerCase().trim();
  return ['awaiting_payment', 'paid', 'accepted'].includes(key);
}

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

function getBadgeStyle(state) {
  if (state === 'live') {
    return {
      wrapper: 'bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500 animate-ping',
      text: 'Live Queue',
    };
  }
  if (state === 'connecting' || state === 'reconnecting') {
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

export function MerchantOrderQueue({
  partnerId = null,
  merchantVpa = '',
  merchantName = 'WE4ALL Partner Store',
}) {
  const [filter, setFilter] = useState('active');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [qrOrder, setQrOrder] = useState(null);
  const [changeReqOpen, setChangeReqOpen] = useState(false);
  const [resolvedVpa, setResolvedVpa] = useState(merchantVpa || '');
  const [profileSnapshot, setProfileSnapshot] = useState({});

  useEffect(() => {
    let active = true;

    async function hydrateMerchantMeta() {
      if (merchantVpa) {
        setResolvedVpa(merchantVpa);
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!active || !user) return;

      const meta = user.user_metadata || {};
      const fallbackVpa =
        merchantVpa ||
        meta.upi_id ||
        meta.upiId ||
        (typeof localStorage !== 'undefined'
          ? localStorage.getItem('we4all_merchant_vpa') || ''
          : '');

      if (fallbackVpa) setResolvedVpa(fallbackVpa);

      const { data: profileRow } = await supabase
        .from('we4all_profiles')
        .select('full_name, business_name, area, phone')
        .eq('user_id', user.id)
        .maybeSingle();

      if (active) {
        setProfileSnapshot({
          full_name: profileRow?.full_name || meta.full_name || '',
          business_name: profileRow?.business_name || meta.business_name || merchantName,
          area: profileRow?.area || '',
          phone: profileRow?.phone || user.phone || '',
          upi_id: fallbackVpa,
        });
      }
    }

    hydrateMerchantMeta();
    return () => {
      active = false;
    };
  }, [merchantVpa, merchantName]);

  const {
    orders,
    itemsByOrder,
    connectionState,
    loading,
    updatingId,
    error,
    updateOrderStatus,
    markCodCollected,
    refetch,
  } = useMerchantOrderQueue(partnerId, soundEnabled);

  const activeCount = useMemo(
    () =>
      orders.filter(
        (o) => !TERMINAL_STATUSES.includes((o.status || '').toLowerCase().trim())
      ).length,
    [orders]
  );

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'active') {
      return orders.filter(
        (o) => !TERMINAL_STATUSES.includes((o.status || '').toLowerCase().trim())
      );
    }
    return orders.filter((o) =>
      TERMINAL_STATUSES.includes((o.status || '').toLowerCase().trim())
    );
  }, [orders, filter]);

  const badge = getBadgeStyle(connectionState);

  const tabs = [
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'completed', label: 'Completed' },
    { key: 'all', label: `All (${orders.length})` },
  ];

  return (
    <section className="w-full max-w-2xl mx-auto p-4 space-y-4"><PendingPartnerGate portalRole="merchant" partnerName={profileSnapshot.business_name || merchantName} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Incoming Order Queue
          </h2>
          <p className="text-xs text-slate-500">
            Real-time orders from public.we4all_orders
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.wrapper}`}
          >
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            {badge.text}
          </span>

          <button
            type="button"
            onClick={() => setChangeReqOpen(true)}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
          >
            Request Profile Change
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
              soundEnabled
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {soundEnabled ? 'Sound On' : 'Muted'}
          </button>

          <button
            type="button"
            onClick={refetch}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === tab.key
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={refetch}
            className="px-2.5 py-1 rounded bg-rose-600 text-white font-semibold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-32 rounded-2xl bg-slate-100" />
          <div className="h-32 rounded-2xl bg-slate-100" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">
          No {filter === 'all' ? '' : filter} orders right now. New Adilabad Town orders will appear here automatically.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const items = itemsByOrder[order.id] ?? [];
            const nextAction = getNextAction(order.status);
            const showReject = canReject(order.status);
            const isBusy = updatingId === order.id;
            const statusLower = (order.status || 'awaiting_payment')
              .toLowerCase()
              .trim();
            const isCodPending =
              (order.payment_method || '').toLowerCase() === 'cod' &&
              !order.cod_collected_at &&
              !['cancelled', 'refunded'].includes(statusLower);
            const displayNo =
              order.order_number || `WE4-${order.id.slice(0, 8).toUpperCase()}`;
            const addressText = formatAddress(order.delivery_address);

            return (
              <article
                key={order.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        #{displayNo}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-slate-100 text-slate-700">
                        {statusLower.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(order.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      {DOT} {order.zone_id || 'Adilabad Town'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-slate-900">
                      {INR}
                      {order.total_inr.toFixed(2)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 uppercase">
                      {order.payment_method || 'UPI'}{' '}
                      {order.payment_status
                        ? `(${order.payment_status.replace(/_/g, ' ')})`
                        : ''}
                    </p>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 space-y-1">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-xs text-slate-700 gap-2"
                      >
                        <span>
                          {item.quantity} {TIMES} {item.item_title_snapshot}
                        </span>
                        <span className="font-semibold shrink-0">
                          {INR}
                          {item.line_total_inr.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {(addressText || order.customer_note) && (
                  <div className="text-xs text-slate-600 space-y-1">
                    {addressText && (
                      <p>
                        <span className="font-semibold text-slate-700">
                          Address:{' '}
                        </span>
                        {addressText}
                      </p>
                    )}
                    {order.customer_note && (
                      <p>
                        <span className="font-semibold text-slate-700">
                          Note:{' '}
                        </span>
                        {order.customer_note}
                      </p>
                    )}
                  </div>
                )}

                {(nextAction || showReject || isCodPending) && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                    {nextAction && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          updateOrderStatus(order.id, nextAction.nextStatus)
                        }
                        className={`flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${nextAction.buttonClass}`}
                      >
                        {isBusy ? 'Updating...' : nextAction.label}
                      </button>
                    )}

                    {isCodPending && (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setQrOrder(order)}
                          className="py-2 px-3 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50"
                        >
                          Show Doorstep UPI QR
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => markCodCollected(order.id)}
                          className="py-2 px-3 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 disabled:opacity-50"
                        >
                          Mark COD Collected
                        </button>
                      </>
                    )}

                    {showReject && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        className="py-2 px-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <DoorstepUpiQrModal
        open={Boolean(qrOrder)}
        onClose={() => setQrOrder(null)}
        order={qrOrder}
        merchantVpa={resolvedVpa}
        merchantName={profileSnapshot.business_name || merchantName}
        onSettled={() => refetch()}
      />

      <PartnerChangeRequestModal
        open={changeReqOpen}
        onClose={() => setChangeReqOpen(false)}
        portalRole="merchant"
        currentProfile={profileSnapshot}
      />
    </section>
  );
}