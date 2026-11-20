import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { OrderTrackingStepper } from './OrderTrackingStepper';

const INR = '\u20B9';

export function CustomerActiveOrdersPanel({
  initialOrderId = null,
  partnerName,
}) {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId);
    }
  }, [initialOrderId]);

  const loadRecentOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user) {
      setError('Sign in to view live order tracking.');
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from('we4all_orders')
      .select('id, order_number, status, total_inr, created_at')
      .eq('customer_user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (queryError) {
      setError(queryError.message);
    } else if (data) {
      const normalized = data.map((row) => ({
        ...row,
        total_inr: Number(row.total_inr ?? 0),
      }));
      setOrders(normalized);
      setSelectedOrderId((prev) => prev ?? normalized[0]?.id ?? null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadRecentOrders();
  }, [loadRecentOrders]);

  if (loading && !selectedOrderId) {
    return (
      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-sm text-slate-500">
        Loading your orders...
      </div>
    );
  }

  if (error && !selectedOrderId) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between gap-3">
        <span>{error}</span>
        <button
          type="button"
          onClick={loadRecentOrders}
          className="px-3 py-1 rounded-lg bg-amber-600 text-white text-xs font-semibold shrink-0"
        >
          Refresh
        </button>
      </div>
    );
  }

  if (!selectedOrderId) {
    return (
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center text-sm text-slate-500">
        No active orders yet. Place an order from Adilabad Town stores to track it live here.
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {orders.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {orders.map((ord) => {
            const isSelected = ord.id === selectedOrderId;
            const label =
              ord.order_number || `WE4-${ord.id.slice(0, 6).toUpperCase()}`;
            return (
              <button
                key={ord.id}
                type="button"
                onClick={() => setSelectedOrderId(ord.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                #{label} - {INR}
                {ord.total_inr.toFixed(0)}
              </button>
            );
          })}
        </div>
      )}

      <OrderTrackingStepper
        orderId={selectedOrderId}
        partnerName={partnerName}
      />
    </section>
  );
}