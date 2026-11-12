import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canMarkOrderPacked, isCodOrder } from "../src/modules/workflows/portalRules.js";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const [app, account, ordersUi, merchantUi, founderUi, client, codMigration, founderAuth] = await Promise.all([
  read("../src/App.jsx"),
  read("../src/modules/OwnerAccountProfile.jsx"),
  read("../src/modules/OrdersHistoryAndInvoice.jsx"),
  read("../src/modules/MerchantPortal.jsx"),
  read("../src/modules/FounderAdminSuite.jsx"),
  read("../src/supabaseClient.js"),
  read("../supabase/migrations/20261112120000_we4all_cod_and_pilot_onboarding.sql"),
  read("../supabase/functions/we4all-founder-auth/index.ts")
]);

test("COD order helpers allow merchant packing after confirmation while blocking cancelled or unconfirmed orders", () => {
  assert.equal(isCodOrder({ paymentMethod: "COD" }), true);
  assert.equal(isCodOrder({ payment_method: "cod" }), true);
  assert.equal(isCodOrder({ paymentMethod: "UPI" }), false);
  assert.equal(canMarkOrderPacked({ paymentMethod: "COD", status: "accepted" }), true);
  assert.equal(canMarkOrderPacked({ paymentMethod: "COD", status: "merchant_confirmed" }), true);
  assert.equal(canMarkOrderPacked({ paymentMethod: "COD", status: "awaiting_payment" }), false);
  assert.equal(canMarkOrderPacked({ paymentMethod: "COD", status: "cancelled" }), false);
});

test("Customer checkout, Order History, and Merchant Portal wire Cash on Delivery (COD) end-to-end", () => {
  assert.match(app, /checkoutPaymentMethod/);
  assert.match(app, /Cash on Delivery \(COD\)/);
  assert.match(ordersUi, /selectOrderCodPayment/);
  assert.match(ordersUi, /Pay on Delivery \(COD\)/);
  assert.match(merchantUi, /confirmCodOrderCollection/);
  assert.match(client, /we4all_select_cod_payment/);
  assert.match(client, /we4all_confirm_cod_collection/);
  assert.match(codMigration, /payment_method in \('upi', 'cod', 'cashfree'\)/);
  assert.match(codMigration, /we4all_select_cod_payment/);
  assert.match(codMigration, /we4all_confirm_cod_collection/);
});

test("Account screen renders Profile & UPI and Addresses sub-tabs and supports Pilot Mobile OTP registration", () => {
  assert.match(account, /subTab === "profile_upi"/);
  assert.match(account, /subTab === "addresses"/);
  assert.match(account, /Save Profile & UPI Details/);
  assert.match(account, /Delivery Address Book/);
  assert.match(account, /pilotInstantMode/);
  assert.match(account, /bootstrapCustomerAccount/);
  assert.match(codMigration, /we4all_bootstrap_customer_account/);
});

test("Founder auth accepts KhodayAnvesh and Partner review allows trial-draft-1 terms approval", () => {
  assert.match(founderAuth, /khodayanvesh/);
  assert.match(founderUi, /version === "trial-draft-1"/);
});
