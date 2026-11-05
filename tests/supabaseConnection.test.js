import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [client, edge, legacyApi, migration, envExample, packageJson, owner] = await Promise.all([
  read("../src/supabaseClient.js"),
  read("../supabase/functions/we4all-sync/index.ts"),
  read("../api/sync.js"),
  read("../supabase/migrations/20261105190000_secure_user_state_partner_auth.sql"),
  read("../.env.example"),
  read("../package.json"),
  read("../src/modules/OwnerAccountProfile.jsx")
]);

test("browser connects to the correct Supabase project with publishable key only", () => {
  assert.match(client, /bdmbziwazpuzbukazmug\.supabase\.co/);
  assert.match(client, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(client, /createClient\(/);
  assert.doesNotMatch(client, /VITE_SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(client, /customSupabaseKey/);
  assert.match(packageJson, /"@supabase\/supabase-js"/);
});

test("private cloud state is synchronized through a JWT-protected server function", () => {
  assert.match(edge, /@supabase\/server@1\.9\.2/);
  assert.match(edge, /withSupabase\(\{ auth: "user" \}/);
  assert.match(edge, /ctx\.supabase/);
  assert.match(edge, /we4all_user_state/);
  assert.match(edge, /user_id: userId/);
  assert.match(client, /functions\/v1\/we4all-sync/);
  assert.match(client, /Authorization: `Bearer \${session\.access_token}`/);
});

test("retired global relay cannot expose or overwrite a shared snapshot", () => {
  assert.match(legacyApi, /status\(410\)/);
  assert.doesNotMatch(legacyApi, /customSupabaseKey|we4all_town_state|globalThis/);
});

test("database migration enables owner RLS and removes public legacy access", () => {
  assert.match(migration, /REVOKE ALL PRIVILEGES ON TABLE public\.we4all_town_state FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.we4all_user_state/);
  assert.match(migration, /\(SELECT auth\.uid\(\)\) = user_id/);
  assert.match(migration, /WITH CHECK \(\(SELECT auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /we4all_partner_applications/);
});

test("environment example contains no server secret", () => {
  assert.match(envExample, /VITE_SUPABASE_URL/);
  assert.match(envExample, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(envExample, /sb_secret_/);
  assert.doesNotMatch(envExample, /service_role/i);
});

test("account authentication and upload path are tied to the verified account", () => {
  assert.match(owner, /supabase\.auth\.verifyOtp/);
  assert.match(owner, /supabase\.auth\.getUser/);
  assert.match(client, /user\.id}\/\${folder}/);
  assert.match(client, /auth\.getUser\(\)/);
});
