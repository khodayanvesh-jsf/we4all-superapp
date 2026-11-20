import { useCallback, useEffect, useRef, useState } from 'react';
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

function playIncomingChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    [880, 1174.66].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.14 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.24);
    });
  } catch {
    // Autoplay policies may block audio before first interaction
  }
}

export function useMerchantOrderQueue(partnerId = null, soundEnabled = true) {
  const [orders, setOrders] = useState([]);
  const [itemsByOrder, setItemsByOrder] = useState({});
  const [connectionState, setConnectionState] = useState('connecting');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);
  const soundRef = useRef(soundEnabled);

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  const fetchItemsForOrderIds = useCallback(async (orderIds) => {
    if (!orderIds || orderIds.length === 0) return;

    const { data, error: itemsError } = await supabase
      .from('we4all_order_items')
      .select(ITEM_COLUMNS)
      .in('order_id', orderIds)
      .order('created_at', { ascending: true });

    if (itemsError || !data) return;

    const grouped = {};
    for (const row of data) {
      const item = normalizeItem(row);
      if (!grouped[item.order_id]) grouped[item.order_id] = [];
      grouped[item.order_id].push(item);
    }

    setItemsByOrder((prev) => ({ ...prev, ...grouped }));
  }, []);

  const loadOrders = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      let query = supabase
        .from('we4all_orders')
        .select(ORDER_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(50);

      if (partnerId) {
        query = query.eq('partner_id', partnerId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        const normalized = data.map((row) => normalizeOrder(row));
        setOrders(normalized);
        await fetchItemsForOrderIds(normalized.map((o) => o.id));
      }

      if (!silent) setLoading(false);
    },
    [partnerId, fetchItemsForOrderIds]
  );

  useEffect(() => {
    let isMounted = true;
    setConnectionState('connecting');
    loadOrders(false);

    const channelName = partnerId
      ? `merchant-we4all-queue-${partnerId}`
      : 'merchant-we4all-queue-rls';

    const pgConfig = {
      event: '*',
      schema: 'public',
      table: 'we4all_orders',
    };

    if (partnerId) {
      pgConfig.filter = `partner_id=eq.${partnerId}`;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', pgConfig, (payload) => {
        if (!isMounted) return;

        if (payload.eventType === 'INSERT') {
          const incoming = normalizeOrder(payload.new);
          setOrders((prev) => [
            incoming,
            ...prev.filter((o) => o.id !== incoming.id),
          ]);
          fetchItemsForOrderIds([incoming.id]);
          if (soundRef.current) {
            playIncomingChime();
          }
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
      })
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
  }, [partnerId, loadOrders, fetchItemsForOrderIds]);

  const updateOrderStatus = useCallback(async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    setError(null);

    const nowIso = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from('we4all_orders')
      .update({ status: nextStatus, updated_at: nowIso })
      .eq('id', orderId)
      .select(ORDER_COLUMNS)
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
      .select(ORDER_COLUMNS)
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
    itemsByOrder,
    connectionState,
    loading,
    updatingId,
    error,
    updateOrderStatus,
    markCodCollected,
    refetch: () => loadOrders(false),
  };
}