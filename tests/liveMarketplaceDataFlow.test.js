import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const client = await readFile(new URL("../src/supabaseClient.js", import.meta.url), "utf8");
const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const merchant = await readFile(new URL("../src/modules/MerchantPortal.jsx", import.meta.url), "utf8");
const orderEdge = await readFile(new URL("../supabase/functions/we4all-create-order/index.ts", import.meta.url), "utf8");
const orderSql = await readFile(new URL("../supabase/migrations/20261106000200_we4all_order_creation_service_only.sql", import.meta.url), "utf8");
const adminEdge = await readFile(new URL("../supabase/functions/we4all-admin-review/index.ts", import.meta.url), "utf8");
const founderUi = await readFile(new URL("../src/modules/FounderAdminSuite.jsx", import.meta.url), "utf8");
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

test("Founder Admin loads and reviews pending live products through founder Edge Function", () => {
  assert.match(adminEdge, /appMetadata\\.we4all_role !== "founder"/);
  assert.match(adminEdge, /body\\.action === "list_products"/);
  assert.match(adminEdge, /body\\.action === "review_product"/);
  assert.match(adminEdge, /we4all_review_catalog_item/);
  assert.match(founderUi, /Live Supabase catalogue queue/);
  assert.match(founderUi, /reviewServerCatalogItem/);
});
test("Founder pending product arrays are initialized after safe product arrays", () => {
  assert.ok(founderUi.indexOf("const safeProducts =") < founderUi.indexOf("const safePendingProductApprovals ="));
  assert.ok(founderUi.indexOf("const safeHalls =") < founderUi.indexOf("const safePendingHallApprovals ="));
});
test("connection diagnostics verify the Supabase Data API as well as Auth", () => {
  assert.match(client, /dataApiReachable/);
  assert.match(client, /from\\("we4all_catalog_items"\\)/);
});
