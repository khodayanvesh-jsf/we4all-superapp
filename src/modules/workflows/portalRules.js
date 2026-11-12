const APPROVED_STATUSES = new Set(["Approved", "ACTIVE"]);

export function canOpenPartnerPortal(session, requestedRole) {
  return Boolean(
    requestedRole &&
    requestedRole !== "customer" &&
    session?.authenticatedPartnerRole === requestedRole &&
    session?.user?.authUserId &&
    session?.user?.role === requestedRole &&
    session?.user?.status === "Approved"
  );
}

export function isCustomerVisibleListing(record) {
  if (!record || typeof record !== "object") return false;
  return !record.status || APPROVED_STATUSES.has(record.status);
}

export function isMerchantOrderOwned(order, merchant) {
  if (!order || !merchant) return false;
  const id = String(merchant.id || "");
  const name = String(merchant.businessName || merchant.fullName || "");
  if (id && [order.merchantId, order.merchantOwnerId].some((value) => String(value || "") === id)) {
    return true;
  }
  if (name && [order.merchantName, order.shopName].some((value) => String(value || "") === name)) {
    return true;
  }
  return Array.isArray(order.items) && order.items.some((item) =>
    (id && String(item.merchantId || "") === id) ||
    (name && [item.merchantName, item.shopName].some((value) => String(value || "") === name))
  );
}

export function canMarkOrderPacked(order) {
  const paid = order?.paymentStatus === "VERIFIED" ||
    order?.paymentStatus === "PAID" ||
    order?.status === "PAYMENT_VERIFIED" ||
    order?.status === "PAID";
  return paid && !["CANCELLED", "REFUNDED", "DELIVERED"].includes(order?.status);
}

export function vehicleClassForWeight(weightKg) {
  const weight = Number(weightKg);
  if (!Number.isFinite(weight) || weight <= 0 || weight > 2000) return null;
  if (weight <= 45) return "2W";
  if (weight <= 300) return "3W";
  return "4W_HEAVY";
}

export function calculateDecoratorAdvance(totalAmount, eventDate, now = new Date()) {
  const total = Number(totalAmount);
  const event = new Date(`${eventDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!Number.isFinite(total) || total <= 0 || Number.isNaN(event.getTime())) return null;
  const daysUntilEvent = Math.ceil((event.getTime() - today.getTime()) / 86400000);
  if (daysUntilEvent < 0) return null;
  const rate = daysUntilEvent >= 5 ? 0.35 : 0.85;
  return {
    rate,
    amount: Number((total * rate).toFixed(2)),
    daysUntilEvent
  };
}

export function canReleaseServiceEscrow(booking, verification = {}) {
  return Boolean(
    booking?.escrowStatus === "VISITING_FEE_HELD_IN_ESCROW" &&
    verification.serverVerified === true &&
    verification.codeOrderId === booking.id &&
    verification.gpsVerified === true &&
    verification.paymentHoldConfirmed === true
  );
}

export function canReleaseLabourWage(booking, verification = {}) {
  return Boolean(
    booking?.status === "WORK_IN_PROGRESS_ON_SITE" &&
    verification.serverVerified === true &&
    verification.customerAttendanceConfirmed === true &&
    verification.workerAttendanceConfirmed === true &&
    verification.paymentSettlementConfirmed === true
  );
}
