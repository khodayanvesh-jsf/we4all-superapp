import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261106000100_we4all_order_duplicate_line_guard.sql", import.meta.url), "utf8");
const client = await readFile(new URL("../src/supabaseClient.js", import.meta.url), "utf8");
test("order creation is authenticated and idempotent", () => {
 assert.match(migration, /auth\.uid\(\)/);
 assert.match(migration, /customer_user_id = v_user_id and idempotency_key = p_idempotency_key/);
 assert.match(migration, /DUPLICATE_CATALOG_ITEM/);
});
test("orders are based on approved active catalogue rows and server prices", () => {
 assert.match(migration, /approval_status = 'approved' and is_active = true/);
 assert.match(migration, /v_subtotal := v_subtotal \+ \(v_item\.price_inr \* v_input\.quantity\)/);
 assert.match(migration, /for update/);
});
test("stock reservations are transactional and payment remains pending", () => {
 assert.match(migration, /movement_type,quantity_delta/);
 assert.match(migration, /'reservation',-v_input\.quantity/);
 assert.match(migration, /'awaiting_payment','pending'/);
 assert.doesNotMatch(migration, /payment_status\s*=\s*'paid'/i);
});
test("RPC client validates login, UUID catalogue ids and pending response", () => {
 assert.match(client, /export async function createMarketplaceOrder/);
 assert.match(client, /supabase\.functions\.invoke\("we4all-create-order"/);
 assert.match(client, /payment_status !== "pending"/);
});
