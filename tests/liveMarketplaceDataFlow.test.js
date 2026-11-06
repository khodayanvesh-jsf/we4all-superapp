import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const client = await readFile(new URL("../src/supabaseClient.js", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const merchant = await readFile(new URL("../src/modules/MerchantPortal.jsx", import.meta.url), "utf8");
const orderEdge = await readFile(new URL("../supabase/functions/we4all-create-order/index.ts", import.meta.url), "utf8");
const stockEdge = await readFile(new URL("../supabase/functions/we4all-adjust-stock/index.ts", import.meta.url), "utf8");

test("catalogue loads normalized rows and keeps server catalogue ids", () => {
  assert.match(client, /from\("we4all_catalog_items"\)/);
  assert.match(client, /we4all_partners!inner/);
  assert.match(client, /catalogItemId: row\.id/);
  assert.match(client, /merchantId: row\.partner_id/);
});
test("customer shell refreshes catalogue and orders from Realtime", () => {
  assert.match(app, /loadMarketplaceCatalog\(\)/);
  assert.match(app, /loadMarketplaceOrders\(currentUser\)/);
  assert.match(app, /postgres_changes/);
  assert.match(app, /table: "we4all_catalog_items"/);
  assert.match(app, /table: "we4all_orders"/);
});
test("out-of-stock items cannot be added to cart", () => {
  assert.match(app, /disabled=\{prod\.inStock === false\}/);
  assert.match(app, /Out of stock/);
});
test("checkout requires authenticated customer and one merchant", () => {
  assert.match(app, /currentUser\?\.authUserId/);
  assert.match(app, /partnerIds\.length !== 1/);
  assert.match(client, /functions\.invoke\("we4all-create-order"/);
  assert.match(orderEdge, /APPROVED_CUSTOMER_ROLE_REQUIRED/);
});
test("merchant stock changes use the verified server endpoint", () => {
  assert.match(merchant, /adjustMarketplaceStock\(/);
  assert.match(client, /functions\.invoke\("we4all-adjust-stock"/);
  assert.match(stockEdge, /auth\.getUser\(token\)/);
  assert.match(stockEdge, /we4all_adjust_inventory/);
});
test("checkout does not claim payment is completed", () => {
  assert.match(app, /payment is PENDING/i);
  assert.match(orderEdge, /payment_status/);
  assert.doesNotMatch(orderEdge, /payment_status\s*[:=]\s*["']paid/i);
});
