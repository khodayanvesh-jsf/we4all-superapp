import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(
  new URL("../supabase/migrations/20261106155109_we4all_explicit_client_deny_policies_for_server_tables.sql", import.meta.url),
  "utf8"
);

test("server-only tables are enumerated and receive explicit deny-all client policies", () => {
  for (const table of [
    "we4all_audit_events",
    "we4all_delivery_test_otps",
    "we4all_inventory_movements",
    "we4all_orders_ledger",
    "we4all_p2p_deliveries",
    "we4all_payment_webhook_events",
    "we4all_rider_location_pings",
    "we4all_town_state"
  ]) {
    assert.ok(migration.includes("'" + table + "'"), `missing server-only table: ${table}`);
  }
  assert.match(migration, /table_name \|\| '_client_deny'/);
  assert.match(migration, /for all to anon, authenticated using \(false\) with check \(false\)/i);
});
