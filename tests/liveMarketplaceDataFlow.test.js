import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (p) => readFile(new URL(p, import.meta.url), "utf8");
const [client, app, merchant, orderEdge, orderSql, adminEdge, founderUi, stockEdge, orders] = await Promise.all([
  read("../src/supabaseClient.js"),
  read("../src/App.jsx"),
  read("../src/modules/MerchantPortal.jsx"),
  read("../supabase/functions/we4all-create-order/index.ts"),
  read("../supabase/migrations/20261106000200_we4all_order_creation_service_only.sql"),
  read("../supabase/functions/we4all-admin-review/index.ts"),
  read("../src/modules/FounderAdminSuite.jsx"),
  read("../supabase/functions/we4all-adjust-stock/index.ts"),
  read("../src/modules/OrdersHistoryAndInvoice.jsx")
]);

test("catalogue loads normalized rows and keeps server IDs", () => {
  assert.ok(app.includes("we4all_catalog_items"));
  assert.ok(app.includes("we4all_partners!inner"));
  assert.ok(app.includes("catalogItemId: item.id"));
  assert.ok(app.includes("merchantId: item.partner_id"));
});
test("customer catalogue is market-scoped and orders refresh from the server", () => {
  assert.ok(app.includes('.eq("partner.market_id", selectedZoneFilter)'));
  assert.ok(app.includes("setInterval(refreshMarketCatalog,"));
  assert.ok(orders.includes("await listMarketplaceOrders()"));
  assert.ok(orders.includes("setInterval(refreshOrders,"));
  assert.ok(merchant.includes("await listMarketplaceOrders({ partnerId })"));
});
test("out-of-stock products are disabled in storefront", () => {
  assert.ok(app.includes("disabled={prod.inStock === false}"));
  assert.ok(app.includes("Out of stock"));
});
test("checkout requires authenticated customer and one merchant", () => {
  assert.ok(app.includes("currentUser?.authUserId"));
  assert.ok(app.includes("partnerIds.length !== 1"));
  assert.ok(client.includes('functions.invoke("we4all-create-order"'));
  assert.ok(orderEdge.includes("APPROVED_CUSTOMER_ROLE_REQUIRED"));
});
test("merchant stock changes are server-verified", () => {
  assert.ok(merchant.includes("adjustLiveStock("));
  assert.ok(merchant.includes('functions.invoke("we4all-adjust-stock"'));
  assert.ok(stockEdge.includes("auth.getUser(token)"));
  assert.ok(stockEdge.includes("we4all_adjust_inventory"));
});
test("checkout stays pending until a provider verifies payment", () => {
  assert.ok(client.includes('data?.payment_status !== "pending"'));
  assert.ok(orderSql.includes("'payment_status','pending'"));
  assert.ok(orderSql.includes("'awaiting_payment','pending'"));
  assert.ok(!orderSql.toLowerCase().includes("payment_status = 'paid'"));
});
test("Founder Admin loads/reviews products through the founder-authorized Edge Function", () => {
  assert.ok(adminEdge.includes('adminRole !== "founder"'));
  assert.ok(adminEdge.includes('body.action === "listings_list"'));
  assert.ok(adminEdge.includes('body.action === "listing_review"'));
  assert.ok(adminEdge.includes("we4all_review_catalog_item"));
  assert.ok(founderUi.includes("listings_list"));
  assert.ok(founderUi.includes("reviewListing"));
});
test("Founder pending queue arrays are initialized after base arrays", () => {
  assert.ok(founderUi.indexOf("const safeProducts =") < founderUi.indexOf("const safePendingProductApprovals ="));
  assert.ok(founderUi.indexOf("const safeHalls =") < founderUi.indexOf("const safePendingHallApprovals ="));
});
test("connection diagnostics verify Supabase Data API reachability", () => {
  assert.ok(client.includes("dataApiReachable"));
  assert.ok(client.includes('from("we4all_catalog_items")'));
});
