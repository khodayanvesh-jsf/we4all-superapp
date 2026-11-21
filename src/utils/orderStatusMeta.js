export const ORDER_STATUS_META = {
  awaiting_payment: {
    label: 'Awaiting Payment',
    short: 'Payment Pending',
    badgeClass: 'bg-amber-100 text-amber-800',
    isActive: true,
  },
  paid: {
    label: 'Order Placed',
    short: 'Sent to Store',
    badgeClass: 'bg-sky-100 text-sky-800',
    isActive: true,
  },
  accepted: {
    label: 'Confirmed by Store',
    short: 'Store Confirmed',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    isActive: true,
  },
  preparing: {
    label: 'Packing Items',
    short: 'Packing Now',
    badgeClass: 'bg-blue-100 text-blue-800',
    isActive: true,
  },
  ready_for_pickup: {
    label: 'Ready for Pickup',
    short: 'Packed & Ready',
    badgeClass: 'bg-amber-100 text-amber-800',
    isActive: true,
  },
  assigned: {
    label: 'Captain Assigned',
    short: 'Rider Assigned',
    badgeClass: 'bg-indigo-100 text-indigo-800',
    isActive: true,
  },
  picked_up: {
    label: 'Out for Delivery',
    short: 'On the Way',
    badgeClass: 'bg-indigo-100 text-indigo-800',
    isActive: true,
  },
  delivered: {
    label: 'Delivered',
    short: 'Delivered',
    badgeClass: 'bg-emerald-100 text-emerald-800',
    isActive: false,
  },
  cancelled: {
    label: 'Cancelled',
    short: 'Cancelled',
    badgeClass: 'bg-rose-100 text-rose-700',
    isActive: false,
  },
  disputed: {
    label: 'Under Review',
    short: 'Disputed',
    badgeClass: 'bg-amber-100 text-amber-900',
    isActive: false,
  },
  refunded: {
    label: 'Refunded',
    short: 'Refunded',
    badgeClass: 'bg-slate-200 text-slate-700',
    isActive: false,
  },
};

export function getOrderStatusMeta(status) {
  const key = String(status || 'awaiting_payment').toLowerCase().trim();
  return (
    ORDER_STATUS_META[key] || {
      label: key.replace(/_/g, ' '),
      short: key.replace(/_/g, ' '),
      badgeClass: 'bg-slate-100 text-slate-700',
      isActive: true,
    }
  );
}