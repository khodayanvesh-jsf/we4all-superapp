import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

export const TERMINAL_ORDER_STATUSES = [
  'delivered',
  'cancelled',
  'disputed',
  'refunded',
];

export const CANCELLED_ORDER_STATUSES = [
  'cancelled',
  'refunded',
];

const STUCK_THRESHOLD_MS = 30 * 60 * 1000;

const ADMIN_ORDER_COLUMNS =
  'id, customer_user_id, partner_id, zone_id, order_number, status, payment_status, subtotal_inr, tax_inr, delivery_fee_inr, discount_inr, total_inr, customer_platform_fee_inr, payment_method, cod_collected_at, customer_note, created_at, updated_at';

function normalizeOrder(raw) {
  return {
    ...raw,
    subtotal_inr: Number(raw.subtotal_inr ?? 0),
    tax_inr: Number(raw.tax_inr ?? 0),
    delivery_fee_inr: Number(raw.delivery_fee_inr ?? 0),
    discount_inr: Number(raw.discount_inr ?? 0),
    total_inr: Number(raw.total_inr ?? 0),
    customer_platform_fee_inr: Number(raw.customer_platform_fee_inr ?? 0),
  };
}

export function isOrderStuck(order) {
  const statusKey = (order.status || '').toLowerCase().trim();
  if (TERMINAL_ORDER_STATUSES.includes(statusKey)) return false;
  const lastTouch = new Date(order.updated_at || order.created_at).getTime();
  if (Number.isNaN(lastTouch)) return false;
  return Date.now() - lastTouch > STUCK_THRESHOLD_MS;
}

export function useAdminOrderMonitor(limit = 100) {
  const [orders, setOrders] = useState([]);
  const [connectionState, setConnectionState] = useState('connecting');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  const loadOrders = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('we4all_orders')
        .select(ADMIN_ORDER_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setOrders(data.map((row) => normalizeOrder(row)));
      }

      if (!silent) setLoading(false);
    },
    [limit]
  );

  useEffect(() => {
    let isMounted = true;
    setConnectionState('connecting');
    loadOrders(false);

    const channel = supabase
      .channel('founder-admin-we4all-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'we4all_orders',
        },
        (payload) => {
          if (!isMounted) return;

          if (payload.eventType === 'INSERT') {
            const incoming = normalizeOrder(payload.new);
            setOrders((prev) =>
              [incoming, ...prev.filter((o) => o.id !== incoming.id)].slice(0, limit)
            );
          } else if (payload.eventType === 'UPDATE') {
            const updated = normalizeOrder(payload.new);
            setOrders((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
            );
          } else if (payload.eventType === 'DELETE') {
            const removedId = payload.old?.id;
            if (removedId) {
              setOrders((prev) => prev.filter((o) => o.id !== removedId));
            }
          }
        }
      )
      .subscribe((status) => {
        if (!isMounted) return;
        if (status === 'SUBSCRIBED') {
          setConnectionState('live');
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnectionState('reconnecting');
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionState('error');
        }
      });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadOrders(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [limit, loadOrders]);

  const stats = useMemo(() => {
    let totalGmvInr = 0;
    let totalGstInr = 0;
    let totalPlatformFeeInr = 0;
    let activeCount = 0;
    let stuckCount = 0;
    let codPendingInr = 0;

    for (const order of orders) {
      const statusKey = (order.status || '').toLowerCase().trim();
      const isCancelled = CANCELLED_ORDER_STATUSES.includes(statusKey);
      const isTerminal = TERMINAL_ORDER_STATUSES.includes(statusKey);

      if (!isCancelled) {
        totalGmvInr += order.total_inr;
        totalGstInr += order.tax_inr;
        totalPlatformFeeInr += order.customer_platform_fee_inr;

        if (
          (order.payment_method || '').toLowerCase() === 'cod' &&
          !order.cod_collected_at
        ) {
          codPendingInr += order.total_inr;
        }
      }

      if (!isTerminal) {
        activeCount += 1;
        if (isOrderStuck(order)) {
          stuckCount += 1;
        }
      }
    }

    return {
      totalOrders: orders.length,
      totalGmvInr,
      totalGstInr,
      totalPlatformFeeInr,
      activeCount,
      stuckCount,
      codPendingInr,
    };
  }, [orders]);

  const overrideOrderStatus = useCallback(async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    setError(null);

    const nowIso = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from('we4all_orders')
      .update({ status: nextStatus, updated_at: nowIso })
      .eq('id', orderId)
      .select(ADMIN_ORDER_COLUMNS)
      .single();

    if (updateError) {
      setError(updateError.message);
    } else if (data) {
      const updated = normalizeOrder(data);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
      );
    }

    setUpdatingId(null);
  }, []);

  const markCodCollected = useCallback(async (orderId) => {
    setUpdatingId(orderId);
    setError(null);

    const nowIso = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from('we4all_orders')
      .update({
        cod_collected_at: nowIso,
        payment_status: 'paid',
        updated_at: nowIso,
      })
      .eq('id', orderId)
      .select(ADMIN_ORDER_COLUMNS)
      .single();

    if (updateError) {
      setError(updateError.message);
    } else if (data) {
      const updated = normalizeOrder(data);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
      );
    }

    setUpdatingId(null);
  }, []);

  return {
    orders,
    stats,
    connectionState,
    loading,
    updatingId,
    error,
    overrideOrderStatus,
    markCodCollected,
    refetch: () => loadOrders(false),
  };
}