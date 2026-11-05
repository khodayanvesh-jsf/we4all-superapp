import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const fn = await readFile(new URL("../supabase/functions/we4all-create-order/index.ts", import.meta.url), "utf8");
const client = await readFile(new URL("../src/supabaseClient.js", import.meta.url), "utf8");
test("order endpoint verifies customer JWT and approved role", () => {
 assert.match(fn, /auth\.getUser\(token\)/);
 assert.match(fn, /APPROVED_CUSTOMER_ROLE_REQUIRED/);
});
test("service role stays server-side and executes the privileged order transaction", () => {
 assert.match(fn, /SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(fn, /admin\.rpc\("we4all_create_order"/);
 assert.doesNotMatch(client, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY/);
});
test("client calls the authenticated order Edge Function, not the privileged RPC", () => {
 assert.match(client, /functions\.invoke\("we4all-create-order"/);
 assert.doesNotMatch(client, /rpc\("we4all_create_order"/);
});
