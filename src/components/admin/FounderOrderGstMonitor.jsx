import React, { useMemo, useState } from 'react';
import {
  useAdminOrderMonitor,
  TERMINAL_ORDER_STATUSES,
  CANCELLED_ORDER_STATUSES,
  isOrderStuck,
} from '../../hooks/useAdminOrderMonitor';

const INR = '\u20B9';

const ADMIN_STATUS_OPTIONS = [
  'placed',
  'accepted',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'stuck', label: 'Stuck' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

function getBadgeStyle(state) {
  if (state === 'live') {
    return {
      wrapper: 'bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500 animate-ping',
      text: 'Live Feed',
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

function escapeCsvCell(value) {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportGstCsv(rows) {
  const headers = [
    'order_number',
    'order_id',
    'created_ist',
    'zone_id',
    'status',
    'payment_method',
    'payment_status',
    'subtotal_inr',
    'gst_inr',
    'delivery_fee_inr',
    'platform_fee_inr',
    'discount_inr',
    'total_inr',
    'cod_collected_at',
  ];

  const csvLines = [
    headers.join(','),
    ...rows.map((o) =>
      [
        o.order_number || `WE4-${o.id.slice(0, 8).toUpperCase()}`,
        o.id,
        new Date(o.created_at).toLocaleString('en-IN'),
        o.zone_id || 'Adilabad Town',
        o.status,
        o.payment_method || '',
        o.payment_status || '',
        o.subtotal_inr.toFixed(2),
        o.tax_inr.toFixed(2),
        o.delivery_fee_inr.toFixed(2),
        o.customer_platform_fee_inr.toFixed(2),
        o.discount_inr.toFixed(2),
        o.total_inr.toFixed(2),
        o.cod_collected_at || '',
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];

  const blob = new Blob([csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `we4all-orders-gst-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function FounderOrderGstMonitor() {
  const [filter, setFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const {
    orders,
    stats,
    connectionState,
    loading,
    updatingId,
    error,
    overrideOrderStatus,
    markCodCollected,
    refetch,
  } = useAdminOrderMonitor(100);

  const zones = useMemo(() => {
    const unique = new Set();
    for (const o of orders) {
      unique.add(o.zone_id || 'Adilabad Town');
    }
    return Array.from(unique).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      const statusKey = (order.status || '').toLowerCase().trim();
      const orderZone = order.zone_id || 'Adilabad Town';

      if (zoneFilter !== 'ALL' && orderZone !== zoneFilter) return false;
      if (filter === 'active' && TERMINAL_ORDER_STATUSES.includes(statusKey)) {
        return false;
      }
      if (filter === 'stuck' && !isOrderStuck(order)) return false;
      if (
        filter === 'delivered' &&
        !['delivered', 'completed'].includes(statusKey)
      ) {
        return false;
      }
      if (
        filter === 'cancelled' &&
        !CANCELLED_ORDER_STATUSES.includes(statusKey)
      ) {
        return false;
      }

      if (query) {
        const hay = `${order.order_number || ''} ${order.id} ${orderZone} ${order.status}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }

      return true;
    });
  }, [orders, filter, zoneFilter, search]);

  const badge = getBadgeStyle(connectionState);

  const getTabCount = (key) => {
    if (key === 'all') return ` (${orders.length})`;
    if (key === 'active') return ` (${stats.activeCount})`;
    if (key === 'stuck') return ` (${stats.stuckCount})`;
    return '';
  };

  return (
    <section className="w-full max-w-6xl mx-auto p-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Founder Live Order {'&'} GST Monitor
          </h2>
          <p className="text-xs text-slate-500">
            Real-time telemetry from public.we4all_orders across active zones
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
            onClick={() => exportGstCsv(filteredOrders)}
            disabled={filteredOrders.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
          >
            Export GST CSV
          </button>

          <button
            type="button"
            onClick={refetch}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Gross GMV (Excl. Cancelled)
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {INR}
            {stats.totalGmvInr.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {stats.totalOrders} recent orders loaded
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            GST Collected (tax_inr)
          </p>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {INR}
            {stats.totalGstInr.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Platform fees: {INR}
            {stats.totalPlatformFeeInr.toFixed(2)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Active / Stuck (30m+)
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {stats.activeCount}{' '}
            <span
              className={`text-sm font-semibold ${
                stats.stuckCount > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              / {stats.stuckCount} stuck
            </span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Flags un-updated active orders
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Pending COD Cash
          </p>
          <p className="text-xl font-bold text-amber-700 mt-1">
            {INR}
            {stats.codPendingInr.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Unreconciled cash on delivery
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === tab.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
              {getTabCount(tab.key)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700"
          >
            <option value="ALL">All Zones</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or ID..."
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 w-48"
          />
        </div>
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

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
            <div className="h-10 bg-slate-100 rounded" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No orders match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold">Order</th>
                  <th className="py-3 px-4 font-semibold">Zone</th>
                  <th className="py-3 px-4 font-semibold">Payment</th>
                  <th className="py-3 px-4 font-semibold text-right">Subtotal</th>
                  <th className="py-3 px-4 font-semibold text-right">GST</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 font-semibold">
                    Status {'&'} Override
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const stuck = isOrderStuck(order);
                  const isBusy = updatingId === order.id;
                  const displayNo =
                    order.order_number ||
                    `WE4-${order.id.slice(0, 8).toUpperCase()}`;
                  const statusValue = (order.status || 'placed')
                    .toLowerCase()
                    .trim();
                  const isCodPending =
                    (order.payment_method || '').toLowerCase() === 'cod' &&
                    !order.cod_collected_at &&
                    !CANCELLED_ORDER_STATUSES.includes(statusValue);

                  return (
                    <tr
                      key={order.id}
                      className={stuck ? 'bg-rose-50/40' : 'hover:bg-slate-50'}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>#{displayNo}</span>
                          {stuck && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                              STUCK
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {new Date(order.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {order.zone_id || 'Adilabad Town'}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold uppercase text-slate-700">
                          {order.payment_method || 'UPI'}
                        </span>
                        <div className="text-[11px] text-slate-500 capitalize">
                          {order.payment_status || 'pending'}
                        </div>
                        {isCodPending && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => markCodCollected(order.id)}
                            className="mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold hover:bg-amber-200 disabled:opacity-50"
                          >
                            Mark COD Paid
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-700">
                        {INR}
                        {order.subtotal_inr.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-emerald-700">
                        {INR}
                        {order.tax_inr.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {INR}
                        {order.total_inr.toFixed(2)}
                      </td>

                      <td className="py-3 px-4">
                        <select
                          aria-label={`Status for order ${displayNo}`}
                          disabled={isBusy}
                          value={statusValue}
                          onChange={(e) =>
                            overrideOrderStatus(order.id, e.target.value)
                          }
                          className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 disabled:opacity-50"
                        >
                          {!ADMIN_STATUS_OPTIONS.includes(statusValue) && (
                            <option value={order.status}>{order.status}</option>
                          )}
                          {ADMIN_STATUS_OPTIONS.map((st) => (
                            <option key={st} value={st}>
                              {st.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}