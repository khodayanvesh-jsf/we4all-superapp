import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';

const INR = '\u20B9';

function formatShortAddress(address) {
  if (!address) return '';
  if (typeof address === 'string') return address;
  if (address.full_address) return address.full_address;
  return [address.line1, address.area, address.town || address.city]
    .filter(Boolean)
    .join(', ');
}

export function BuyAgainStrip({ onQuickAdd, onDefaultAddressLoaded }) {
  const [topItems, setTopItems] = useState([]);
  const [defaultAddress, setDefaultAddress] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) {
        if (active) setLoading(false);
        return;
      }

      const { data: orders } = await supabase
        .from('we4all_orders')
        .select('id, delivery_address, created_at')
        .eq('customer_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(15);

      if (!active || !orders || orders.length === 0) {
        if (active) setLoading(false);
        return;
      }

      const latestAddr = orders.find((o) => o.delivery_address)?.delivery_address || null;
      if (latestAddr) {
        setDefaultAddress(formatShortAddress(latestAddr));
        onDefaultAddressLoaded?.(latestAddr);
      }

      const orderIds = orders.map((o) => o.id);
      const { data: items } = await supabase
        .from('we4all_order_items')
        .select('catalog_item_id, item_title_snapshot, unit_price_inr, quantity')
        .in('order_id', orderIds);

      if (!active || !items) {
        if (active) setLoading(false);
        return;
      }

      const counts = new Map();
      for (const row of items) {
        const key = row.catalog_item_id || row.item_title_snapshot;
        const prev = counts.get(key) || {
          key,
          catalog_item_id: row.catalog_item_id,
          title: row.item_title_snapshot,
          unit_price_inr: Number(row.unit_price_inr ?? 0),
          timesOrdered: 0,
        };
        prev.timesOrdered += Number(row.quantity ?? 1);
        counts.set(key, prev);
      }

      const ranked = Array.from(counts.values())
        .sort((a, b) => b.timesOrdered - a.timesOrdered)
        .slice(0, 5);

      setTopItems(ranked);
      setLoading(false);
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, [onDefaultAddressLoaded]);

  if (loading) {
    return (
      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-40 shrink-0 rounded-2xl we4-shimmer" />
        ))}
      </div>
    );
  }

  if (topItems.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider opacity-75">
          Order Again (2-Tap Repeat)
        </h3>
        {defaultAddress && (
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full truncate max-w-[180px]">
            Deliver to: {defaultAddress}
          </span>
        )}
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {topItems.map((item) => (
          <div
            key={item.key}
            className="w-44 shrink-0 rounded-2xl border p-3 shadow-sm flex flex-col justify-between gap-2 we4-surface"
          >
            <div>
              <p className="text-xs font-bold line-clamp-2">{item.title}</p>
              <p className="text-[11px] opacity-65 mt-0.5">
                {INR}
                {item.unit_price_inr.toFixed(0)} &middot; Ordered {item.timesOrdered}x
              </p>
            </div>
            <button
              type="button"
              onClick={() => onQuickAdd?.(item)}
              className="w-full py-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 active:scale-95 transition-transform"
            >
              + Add Again
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}