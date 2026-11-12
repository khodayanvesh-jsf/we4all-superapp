import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const foundation = await readFile(new URL("supabase/migrations/20261105231605_we4all_marketplace_operational_foundation.sql", root), "utf8");
const rlsFix = await readFile(new URL("supabase/migrations/20261105231651_we4all_marketplace_rls_policy_consolidation.sql", root), "utf8");

const requiredTables = [
  "we4all_partners", "we4all_catalog_items", "we4all_inventory_movements",
  "we4all_orders", "we4all_order_items", "we4all_bookings",
  "we4all_dispatch_jobs", "we4all_labour_engagements", "we4all_labour_attendance",
  "we4all_payment_transactions", "we4all_payment_webhook_events", "we4all_audit_events"
];

test("all marketplace domain tables are present and protected by RLS", () => {
  for (const table of requiredTables) {
    assert.match(foundation, new RegExp("create table if not exists public\\." + table + "\\b"), table);
    assert.match(foundation, /enable row level security/);
    assert.match(foundation, new RegExp("'" + table + "'"));
  }
});

test("partner self-registration is owner-scoped and pending by default", () => {
  assert.match(foundation, /owner_user_id = \(select auth\.uid\(\)\)/);
  assert.match(foundation, /approval_status = 'pending'/);
  assert.doesNotMatch(foundation, /grant update .*we4all_partners/i);
});

test("catalogue public reads require both approved listing and approved partner", () => {
  assert.match(rlsFix, /approval_status='approved' and is_active=true/);
  assert.match(rlsFix, /p\.approval_status='approved'/);
  assert.match(rlsFix, /p\.owner_user_id=\(select auth\.uid\(\)\)/);
});

test("orders and financial state cannot be directly created or changed by authenticated clients", () => {
  assert.match(foundation, /grant select on public\.we4all_orders, public\.we4all_order_items to authenticated/);
  assert.doesNotMatch(foundation, /grant insert[^;]*we4all_orders/i);
  assert.doesNotMatch(foundation, /grant update[^;]*we4all_orders/i);
  assert.doesNotMatch(foundation, /grant insert[^;]*we4all_payment_transactions/i);
  assert.doesNotMatch(foundation, /grant update[^;]*we4all_payment_transactions/i);
});

test("booking and labour requests are limited to the current customer and pending states", () => {
  assert.match(foundation, /customer_user_id=\(select auth\.uid\(\)\) and status='requested' and payment_status='pending'/);
  assert.match(foundation, /p\.partner_type='labour' and p\.approval_status='approved'/);
});

test("inventory, webhook and audit ledgers have no authenticated direct write grants", () => {
  assert.match(foundation, /revoke all on public\.we4all_inventory_movements, public\.we4all_payment_webhook_events, public\.we4all_audit_events from anon, authenticated/);
  assert.match(foundation, /to service_role/);
});

test("participant SELECT policies are consolidated to one per table and operation", () => {
  for (const policy of [
    "we4all_catalog_select", "we4all_orders_participant_select",
    "we4all_bookings_participant_select", "we4all_dispatch_participant_select",
    "we4all_labour_participant_select", "we4all_payment_participant_select"
  ]) assert.match(rlsFix, new RegExp("create policy " + policy));
});
