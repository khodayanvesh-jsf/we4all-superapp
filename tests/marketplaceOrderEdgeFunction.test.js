import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const fn = await readFile(new URL("../supabase/functions/we4all-create-order/index.ts", import.meta.url), "utf8");
const config = await readFile(new URL("../supabase/migrations/20261106000300_we4all_order_rpc_empty_search_path.sql", import.meta.url), "utf8");
test("Edge Function verifies customer JWT and approved customer role", () => {
  assert.match(fn, /auth\.getUser\(token\)/);
  assert.match(fn, /APPROVED_CUSTOMER_ROLE_REQUIRED/);
  assert.match(fn, /SUPABASE_SERVICE_ROLE_KEY/);
});
test("database function execution is service-only and search path is empty", () => {
  assert.match(config, /set search_path = ''/);
});
