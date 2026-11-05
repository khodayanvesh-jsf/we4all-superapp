import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [client, edge, legacyApi, migration, storageMigration, realtimeMigration, envExample, packageJson, owner] = await Promise.all([
  read("../src/supabaseClient.js"),
  read("../supabase/functions/we4all-sync/index.ts"),
  read("../api/sync.js"),
  read("../supabase/migrations/20261105190000_secure_user_state_partner_auth.sql"),
  read("../supabase/migrations/20261105210000_secure_we4all_media_uploads.sql"),
  read("../supabase/migrations/20261105220000_we4all_user_state_realtime_publication.sql"),
  read("../.env.example"),
  read("../package.json"),
  read("../src/modules/OwnerAccountProfile.jsx")
]);

test("browser connects to the correct Supabase project with publishable key only", () => {
  assert.equal(client.includes("https://bdmbziwazpuzbukazmug.supabase.co"), true);
  assert.equal(client.includes("VITE_SUPABASE_PUBLISHABLE_KEY"), true);
  assert.equal(client.includes("createClient("), true);
  assert.equal(client.includes("VITE_SUPABASE_SECRET_KEY"), false);
  assert.equal(client.includes("customSupabaseKey"), false);
  assert.equal(packageJson.includes('"@supabase/supabase-js"'), true);
});

test("private cloud state uses @supabase/server with verified user JWT and RLS", () => {
  assert.equal(edge.includes("npm:@supabase/server@1.9.2"), true);
  assert.equal(edge.includes('withSupabase({ auth: "user" }'), true);
  assert.equal(edge.includes("ctx.supabase"), true);
  assert.equal(edge.includes("we4all_user_state"), true);
  assert.equal(edge.includes("user_id: userId"), true);
  assert.equal(edge.includes('if (req.method === "OPTIONS")'), true);
  assert.equal(edge.includes("Access-Control-Allow-Headers"), true);
  assert.equal(client.includes("/functions/v1/we4all-sync"), true);
  assert.equal(client.includes('Authorization: `Bearer ${session.access_token}`'), true);
});

test("retired global relay cannot expose or overwrite a shared snapshot", () => {
  assert.equal(legacyApi.includes("status(410)"), true);
  assert.equal(legacyApi.includes("customSupabaseKey"), false);
  assert.equal(legacyApi.includes("we4all_town_state"), false);
  assert.equal(legacyApi.includes("globalThis"), false);
});

test("database migration enables owner RLS and removes public legacy access", () => {
  assert.equal(migration.includes("REVOKE ALL PRIVILEGES ON TABLE public.we4all_town_state FROM PUBLIC, anon, authenticated"), true);
  assert.equal(migration.includes("CREATE TABLE IF NOT EXISTS public.we4all_user_state"), true);
  assert.equal(migration.includes("(SELECT auth.uid()) = user_id"), true);
  assert.equal(migration.includes("WITH CHECK ((SELECT auth.uid()) = user_id)"), true);
  assert.equal(migration.includes("we4all_partner_applications"), true);
  assert.equal(storageMigration.includes("Authenticated users upload to own WE4ALL folder"), true);
  assert.equal(storageMigration.includes("storage.foldername(name)"), true);
});

test("environment example contains public settings only and no server secret", () => {
  assert.equal(envExample.includes("VITE_SUPABASE_URL"), true);
  assert.equal(envExample.includes("VITE_SUPABASE_PUBLISHABLE_KEY"), true);
  assert.equal(envExample.includes("sb_secret_"), false);
  assert.equal(envExample.toLowerCase().includes("service_role="), false);
});

test("account authentication and file upload are bound to verified user identity", () => {
  assert.equal(owner.includes("supabase.auth.verifyOtp"), true);
  assert.equal(owner.includes("supabase.auth.getUser"), true);
  assert.equal(client.includes('const objectPath = `${user.id}/${folder}/${crypto.randomUUID()}.'), true);
  assert.equal(client.includes("auth.getUser()"), true);
});

test("debounced writes cannot cross account boundaries or sync guest changes", () => {
  assert.equal(client.includes("const ownerUserId = getActiveSupabaseUserId();"), true);
  assert.equal(client.includes("if (!ownerUserId) return; // Guest/local edits"), true);
  assert.equal(client.includes("ownerUserId !== activeUserId"), true);
  assert.equal(client.includes("expectedUserId !== activeUserId"), true);
  assert.equal(client.includes("pushPayloadToCloudServers(merged, nowIso, ownerUserId)"), true);
});

test("per-user state changes are published through Supabase Realtime and filtered by owner", () => {
  assert.equal(client.includes('"postgres_changes"'), true);
  assert.equal(client.includes('table: "we4all_user_state"'), true);
  assert.equal(client.includes('`user_id=eq.${activeUserId}`'), true);
  assert.equal(client.includes("supabase.removeChannel(realtimeChannel)"), true);
  assert.equal(realtimeMigration.includes("ALTER PUBLICATION supabase_realtime ADD TABLE public.we4all_user_state"), true);
  assert.equal(realtimeMigration.includes("DROP TABLE public.we4all_town_state"), true);
  assert.equal(realtimeMigration.includes("DROP TABLE public.we4all_orders_ledger"), true);
});
