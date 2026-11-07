import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const migration = await readFile(new URL("../supabase/migrations/20261106000200_we4all_order_creation_service_only.sql", import.meta.url), "utf8");
const client = await readFile(new URL("../src/supabaseClient.js", import.meta.url), "utf8");

test("order transaction is service-role-only and idempotent", () => {
  assert.match(migration, /auth\.role\(\).*service_role/);
  assert.match(migration, /p_customer_user_id/);
  assert.match(migration, /customer_user_id=p_customer_user_id and idempotency_key=p_idempotency_key/);
  assert.match(migration, /DUPLICATE_CATALOG_ITEM/);
  assert.match(migration, /revoke all on function[\s\S]*from public,anon,authenticated/);
});

test("orders use approved active catalogue records and server-calculated prices", () => {
  assert.match(migration, /approval_status='approved' and is_active=true/);
  assert.match(migration, /v_subtotal:=v_subtotal\+\(v_item\.price_inr\*v_input\.quantity\)/);
  assert.match(migration, /for update/);
});

test("stock reservations are transactional and payment remains pending", () => {
  assert.match(migration, /movement_type,quantity_delta/);
  assert.match(migration, /'reservation',-v_input\.quantity/);
  assert.match(migration, /'awaiting_payment','pending'/);
  assert.doesNotMatch(migration, /payment_status\s*=\s*'paid'/i);
});

test("customer client invokes the server Edge Function and validates pending result", () => {
  assert.match(client, /export async function createMarketplaceOrder/);
  assert.match(client, /functions\.invoke\("we4all-create-order"/);
  assert.match(client, /payment_status !== "pending"/);
  assert.doesNotMatch(client, /rpc\("we4all_create_order"/);
});
