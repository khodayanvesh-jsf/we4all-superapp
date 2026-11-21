import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import {
  BentoHomeGrid,
  FloatingLiveOrderBar,
  BottomSheet,
} from '../we4all2026Kit';
import { OrderTrackingStepper } from './OrderTrackingStepper';

const ACTIVE_STATUSES = [
  'awaiting_payment',
  'paid',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'assigned',
  'picked_up',
];

export function Customer2026Experience({
  townName = 'Adilabad Town',
  onSelectSector,
  onSearch,
  onQuickAdd,
  headerRight = null,
}) {
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [bannerMsg, setBannerMsg] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadLatestActiveOrder() {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (!userId) return;

      const { data } = await supabase
        .from('we4all_orders')
        .select('id, status')
        .eq('customer_user_id', userId)
        .in('status', ACTIVE_STATUSES)
        .order('created_at', { ascending: false })
        .limit(1);

      if (mounted && data && data.length > 0) {
        setActiveOrderId(data[0].id);
      }
    }

    loadLatestActiveOrder();
    return () => {
      mounted = false;
    };
  }, []);

  const showNotice = (msg) => {
    setBannerMsg(msg);
    window.setTimeout(() => {
      setBannerMsg((curr) => (curr === msg ? '' : curr));
    }, 3500);
  };

  const handleSector = (sectorId) => {
    if (typeof onSelectSector === 'function') {
      onSelectSector(sectorId);
      return;
    }
    window.dispatchEvent(
      new CustomEvent('we4all:sector-select', { detail: { sectorId } })
    );
    showNotice(`Selected sector: ${sectorId.replace(/_/g, ' ')}`);
  };

  const handleSearch = (query) => {
    if (typeof onSearch === 'function') {
      onSearch(query);
      return;
    }
    window.dispatchEvent(
      new CustomEvent('we4all:search', { detail: { query } })
    );
    if (query) showNotice(`Searching "${query}" in ${townName}`);
  };

  const handleQuickAdd = (item) => {
    if (typeof onQuickAdd === 'function') {
      onQuickAdd(item);
      return;
    }
    window.dispatchEvent(
      new CustomEvent('we4all:quick-add', { detail: item })
    );
    showNotice(`Selected repeat item: ${item.title}`);
  };

  return (
    <div className="space-y-3">
      {bannerMsg && (
        <div className="max-w-xl mx-auto px-4">
          <div className="rounded-xl bg-emerald-600 text-white text-xs font-semibold px-3 py-2 shadow-sm">
            {bannerMsg}
          </div>
        </div>
      )}

      <BentoHomeGrid
        townName={townName}
        onSelectSector={handleSector}
        onSearch={handleSearch}
        onQuickAdd={handleQuickAdd}
        headerRight={headerRight}
      />

      <FloatingLiveOrderBar
        orderId={activeOrderId}
        onOpenTracking={() => setTrackingOpen(true)}
      />

      <BottomSheet
        open={trackingOpen}
        onClose={() => setTrackingOpen(false)}
        title="Live Order Tracking"
        subtitle="Real-time updates from partner store"
      >
        {activeOrderId && <OrderTrackingStepper orderId={activeOrderId} />}
      </BottomSheet>
    </div>
  );
}