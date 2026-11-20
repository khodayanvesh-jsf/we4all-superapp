import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const ORDER_COLUMNS =
  'id, customer_user_id, partner_id, zone_id, order_number, status, payment_status, subtotal_inr, tax_inr, delivery_fee_inr, discount_inr, total_inr, idempotency_key, delivery_address, customer_note, created_at, updated_at, customer_platform_fee_inr, fee_breakdown, payment_method, cod_collected_at';

const ITEM_COLUMNS =
  'id, order_id, catalog_item_id, item_title_snapshot, sku_snapshot, quantity, unit_price_inr, tax_rate, line_total_inr, created_at';

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

function normalizeItem(raw) {
  return {
    ...raw,
    quantity: Number(raw.quantity ?? 0),
    unit_price_inr: Number(raw.unit_price_inr ?? 0),
    tax_rate: Number(raw.tax_rate ?? 0),
    line_total_inr: Number(raw.line_total_inr ?? 0),
  };
}

export function useOrderTracking(orderId) {
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [connectionState, setConnectionState] = useState('connecting');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrder = useCallback(
    async (silent = false) => {
      if (!orderId) {
        setOrder(null);
        setItems([]);
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      setError(null);

      const [orderRes, itemsRes] = await Promise.all([
        supabase
          .from('we4all_orders')
          .select(ORDER_COLUMNS)
          .eq('id', orderId)
          .single(),
        supabase
          .from('we4all_order_items')
          .select(ITEM_COLUMNS)
          .eq('order_id', orderId)
          .order('created_at', { ascending: true }),
      ]);

      if (orderRes.error) {
        setError(orderRes.error.message);
      } else if (orderRes.data) {
        setOrder(normalizeOrder(orderRes.data));
      }

      if (!itemsRes.error && itemsRes.data) {
        setItems(itemsRes.data.map((row) => normalizeItem(row)));
      }

      if (!silent) setLoading(false);
    },
    [orderId]
  );

  useEffect(() => {
    if (!orderId) return;

    let isMounted = true;
    setConnectionState('connecting');
    fetchOrder(false);

    const channel = supabase
      .channel(`we4all-order-track-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'we4all_orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (!isMounted) return;
          const updated = payload.new;
          setOrder((prev) =>
            prev
              ? normalizeOrder({ ...prev, ...updated })
              : normalizeOrder(updated)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'we4all_order_items',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          if (isMounted) fetchOrder(true);
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOrder(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [orderId, fetchOrder]);

  return {
    order,
    items,
    connectionState,
    loading,
    error,
    refetch: () => fetchOrder(false),
  };
}