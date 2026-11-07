import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculatePolicyFee, quoteMarketplaceFees, validateFeePolicy } from "../src/modules/workflows/feePolicies.js";

const [adminUi, adminFunction, migration, orderFunction, app, client] = await Promise.all([
  readFile(new URL("../src/modules/FounderAdminSuite.jsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/we4all-admin-review/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261107150000_we4all_fee_policy_governance.sql", import.meta.url), "utf8"),
  readFile(new URL("../supabase/migrations/20261107150100_we4all_checkout_fee_snapshot.sql", import.meta.url), "utf8"),
  readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/supabaseClient.js", import.meta.url), "utf8")
]);

test("zero commission launch policy adds no customer fee", () => {
  const quote = quoteMarketplaceFees([{ catalog_item_id: "item-1", price_inr: 100, quantity: 2 }], [
    { id: "p0", fee_type: "customer_platform_fee", scope_type: "global", scope_key: "*", rate_percent: 0, fixed_inr: 0, active: true, version: 1 }
  ]);
  assert.equal(quote.subtotal_inr, 200);
  assert.equal(quote.customer_platform_fee_inr, 0);
  assert.equal(quote.total_inr, 200);
});

test("the most specific active fee policy applies to the selected item", () => {
  const quote = quoteMarketplaceFees([{ catalog_item_id: "item-1", category_key: "grocery", price_inr: 200, quantity: 1 }], [
    { id: "global", fee_type: "customer_platform_fee", scope_type: "global", scope_key: "*", rate_percent: 2, active: true, version: 1, disclosure_text: "Platform service fee" },
    { id: "cat", fee_type: "customer_platform_fee", scope_type: "category", scope_key: "grocery", rate_percent: 4, active: true, version: 3, disclosure_text: "Grocery platform fee" },
    { id: "item", fee_type: "customer_platform_fee", scope_type: "catalog_item", scope_key: "item-1", rate_percent: 5, active: true, version: 1, disclosure_text: "Selected-item fee" }
  ]);
  assert.equal(quote.customer_platform_fee_inr, 10);
  assert.deepEqual(quote.policy_versions, { item: 1 });
  assert.equal(quote.breakdown[0].disclosure_text, "Selected-item fee");
});

test("fixed global fees apply once and scoped fixed fees apply per unit", () => {
  assert.equal(calculatePolicyFee(200, 2, { scope_type: "global", fixed_inr: 15 }, true), 15);
  assert.equal(calculatePolicyFee(200, 2, { scope_type: "global", fixed_inr: 15 }, false), 0);
  assert.equal(calculatePolicyFee(200, 2, { scope_type: "category", fixed_inr: 3 }, true), 6);
});

test("fee settings enforce the documented caps and require disclosure for nonzero fees", () => {
  assert.equal(validateFeePolicy({ fee_type: "merchant_commission", scope_type: "global", rate_percent: 0 }), "");
  assert.match(validateFeePolicy({ fee_type: "merchant_commission", scope_type: "global", rate_percent: 10.5, disclosure_text: "Commission" }), /between 0% and 10%/);
  assert.match(validateFeePolicy({ fee_type: "customer_platform_fee", scope_type: "category", scope_key: "grocery", rate_percent: 1 }), /disclosure/);
  assert.match(validateFeePolicy({ fee_type: "customer_platform_fee", scope_type: "category", scope_key: "grocery", rate_percent: 1, fixed_inr: 1, disclosure_text: "Fee shown clearly" }), /either a percentage/);
});

test("Founder fee controls use server policies, versioned audit records, and disclosure requirements", () => {
  assert.match(adminUi, /action: "fee_list"/);
  assert.match(adminUi, /action: "fee_save"/);
  assert.match(adminUi, /shown before confirmation/);
  assert.match(adminFunction, /appMetadata\.we4all_role/);
  assert.match(adminFunction, /we4all_manage_fee_policy/);
  assert.match(migration, /we4all_fee_policy_events/);
  assert.match(migration, /FEE_DISCLOSURE_REQUIRED/);
  assert.match(migration, /FEE_FLOW_NOT_CONNECTED/);
  assert.match(migration, /customer_platform_fee.*global.*\*.*0,0/s);
});

test("checkout shows the quote before order creation and locks the accepted policy version", () => {
  assert.match(app, /Review total before placing order/);
  assert.match(app, /Confirm total & place secure order/);
  assert.match(app, /checkoutQuote\.policy_versions/);
  assert.match(app, /FEE_POLICY_CHANGED/);
  assert.match(orderFunction, /p_fee_policy_versions/);
  assert.match(orderFunction, /FEE_POLICY_CHANGED/);
  assert.match(orderFunction, /customer_platform_fee_inr/);
  assert.match(client, /getMarketplaceFeeQuote/);
});
