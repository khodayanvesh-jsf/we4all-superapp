import test from "node:test";
import assert from "node:assert/strict";
import {
  canOpenPartnerPortal,
  isCustomerVisibleListing,
  isMerchantOrderOwned,
  canMarkOrderPacked,
  vehicleClassForWeight,
  calculateDecoratorAdvance,
  canReleaseServiceEscrow,
  canReleaseLabourWage
} from "../src/modules/workflows/portalRules.js";

test("partner portal requires matching authenticated approved role", () => {
  const session = {
    authenticatedPartnerRole: "merchant",
    user: { authUserId: "auth-1", role: "merchant", status: "Approved" }
  };
  assert.equal(canOpenPartnerPortal(session, "merchant"), true);
  assert.equal(canOpenPartnerPortal(session, "rider"), false);
  assert.equal(canOpenPartnerPortal({ ...session, user: { ...session.user, authUserId: "" } }, "merchant"), false);
  assert.equal(canOpenPartnerPortal({ ...session, user: { ...session.user, status: "Pending Admin Approval" } }, "merchant"), false);
  assert.equal(canOpenPartnerPortal({ ...session, user: { ...session.user, role: "customer" } }, "merchant"), false);
});

test("customer cannot see pending or rejected catalogue records", () => {
  assert.equal(isCustomerVisibleListing({ id: "legacy-no-status" }), true);
  assert.equal(isCustomerVisibleListing({ id: "approved", status: "Approved" }), true);
  assert.equal(isCustomerVisibleListing({ id: "active", status: "ACTIVE" }), true);
  assert.equal(isCustomerVisibleListing({ id: "pending", status: "PENDING_ADMIN_APPROVAL" }), false);
  assert.equal(isCustomerVisibleListing({ id: "rejected", status: "REJECTED" }), false);
});

test("merchant can see only order records matching its own owner id or merchant identity", () => {
  const merchant = { id: "m1", businessName: "Town Stores" };
  assert.equal(isMerchantOrderOwned({ merchantId: "m1" }, merchant), true);
  assert.equal(isMerchantOrderOwned({ items: [{ merchantName: "Town Stores" }] }, merchant), true);
  assert.equal(isMerchantOrderOwned({ merchantId: "m2", merchantName: "Other Shop" }, merchant), false);
  assert.equal(isMerchantOrderOwned({ merchantId: "m1" }, null), false);
});

test("merchant packing requires server-verifiable paid status", () => {
  assert.equal(canMarkOrderPacked({ status: "READY_FOR_PICKUP" }), false);
  assert.equal(canMarkOrderPacked({ status: "PAYMENT_VERIFIED", paymentStatus: "VERIFIED" }), true);
  assert.equal(canMarkOrderPacked({ status: "CANCELLED", paymentStatus: "VERIFIED" }), false);
  assert.equal(canMarkOrderPacked({ status: "DELIVERED", paymentStatus: "PAID" }), false);
});

test("vehicle weight boundaries follow 2W/3W/4W specification", () => {
  assert.equal(vehicleClassForWeight(0), null);
  assert.equal(vehicleClassForWeight(45), "2W");
  assert.equal(vehicleClassForWeight(45.01), "3W");
  assert.equal(vehicleClassForWeight(300), "3W");
  assert.equal(vehicleClassForWeight(300.01), "4W_HEAVY");
  assert.equal(vehicleClassForWeight(2000), "4W_HEAVY");
  assert.equal(vehicleClassForWeight(2000.01), null);
  assert.equal(vehicleClassForWeight("invalid"), null);
});

test("decorator advance rule is 35 percent at five or more days and 85 percent below five", () => {
  const now = new Date("2026-11-06T10:00:00+05:30");
  assert.deepEqual(calculateDecoratorAdvance(10000, "2026-11-11", now), {
    rate: 0.35, amount: 3500, daysUntilEvent: 5
  });
  assert.deepEqual(calculateDecoratorAdvance(10000, "2026-11-10", now), {
    rate: 0.85, amount: 8500, daysUntilEvent: 4
  });
  assert.deepEqual(calculateDecoratorAdvance(10000, "2026-11-06", now), {
    rate: 0.85, amount: 8500, daysUntilEvent: 0
  });
  assert.equal(calculateDecoratorAdvance(10000, "2026-11-05", now), null);
  assert.equal(calculateDecoratorAdvance(0, "2026-11-11", now), null);
});

test("service escrow release requires server code, GPS and confirmed payment hold", () => {
  const booking = { id: "svc-1", escrowStatus: "VISITING_FEE_HELD_IN_ESCROW" };
  assert.equal(canReleaseServiceEscrow(booking), false);
  assert.equal(canReleaseServiceEscrow(booking, {
    serverVerified: true, codeOrderId: "other", gpsVerified: true, paymentHoldConfirmed: true
  }), false);
  assert.equal(canReleaseServiceEscrow(booking, {
    serverVerified: true, codeOrderId: "svc-1", gpsVerified: true, paymentHoldConfirmed: true
  }), true);
});

test("labour wage release requires both parties and confirmed provider settlement", () => {
  const booking = { id: "lab-1", status: "WORK_IN_PROGRESS_ON_SITE" };
  assert.equal(canReleaseLabourWage(booking), false);
  assert.equal(canReleaseLabourWage(booking, {
    serverVerified: true, customerAttendanceConfirmed: true,
    workerAttendanceConfirmed: true, paymentSettlementConfirmed: false
  }), false);
  assert.equal(canReleaseLabourWage(booking, {
    serverVerified: true, customerAttendanceConfirmed: true,
    workerAttendanceConfirmed: true, paymentSettlementConfirmed: true
  }), true);
});
