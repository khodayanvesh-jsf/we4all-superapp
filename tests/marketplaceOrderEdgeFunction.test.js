import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const fn = await readFile(new URL("../supabase/functions/we4all-create-order/index.ts", import.meta.url), "utf8");
const sqlConfig = await readFile(new URL("../supabase/migrations/20261106000300_we4all_order_rpc_empty_search_path.sql", import.meta.url), "utf8");
const supabaseConfig = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");
test("Edge Function verifies customer JWT and approved customer role", () => {
  assert.match(fn, /auth\.getUser\(token\)/);
  assert.match(fn, /APPROVED_CUSTOMER_ROLE_REQUIRED/);
});
test("Supabase requires JWT verification for the order Edge Function", () => {
  assert.match(supabaseConfig, /\[functions\.we4all-create-order\]/);
  assert.match(supabaseConfig, /verify_jwt = true/);
});
test("database order function has an empty search path", () => {
  assert.match(sqlConfig, /set search_path = ''/);
});
