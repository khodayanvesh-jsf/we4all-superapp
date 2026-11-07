import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSource = (path) =>
  readFile(new URL(path, import.meta.url), "utf8");

const [app, supabase, checkout, founder, gate, adminFunction, registration, functionConfig] = await Promise.all([
  readSource("../src/App.jsx"),
  readSource("../src/supabaseClient.js"),
  readSource("../src/modules/ActionAndErrorFeedbackLayer.jsx"),
  readSource("../src/modules/FounderAdminSuite.jsx"),
  readSource("../src/modules/AdminSecurityGate.jsx"),
  readSource("../supabase/functions/we4all-admin-review/index.ts"),
  readSource("../src/modules/OwnerAccountProfile.jsx"),
  readSource("../supabase/config.toml")
]);

test("administrator gate uses authenticated Supabase MFA and server authorization", () => {
  assert.doesNotMatch(app, /we4all2026|22061969s!|adminPinInput === "1234"/);
  assert.match(app, /AdminSecurityGate/);
  assert.match(gate, /auth\.mfa\.getAuthenticatorAssuranceLevel/);
  assert.match(gate, /auth\.mfa\.verify/);
  assert.match(gate, /we4all-admin-review/);
  assert.match(adminFunction, /claims\.aal !== "aal2"/);
  assert.match(adminFunction, /new Response\(null, \{ status: 204, headers: CORS_HEADERS \}\)/);
  assert.doesNotMatch(adminFunction, /new Response\("ok", \{ status: 204/);
  assert.match(functionConfig, /\[functions\.we4all-admin-review\][\s\S]*?verify_jwt = true/);
});

test("founder credentials are not returned from or written to browser storage", () => {
  assert.doesNotMatch(supabase, /username:\s*"KhodayAnvesh"|password:\s*"22061969s!"|pin:\s*"9999"/);
  assert.match(supabase, /configured:\s*false/);
  assert.doesNotMatch(supabase, /localStorage\.setItem\(ADMIN_CREDS_KEY/);
  assert.match(supabase, /delete merged\.founderCredentials/);
});

test("founder credential editing is disabled in the admin interface", () => {
  assert.doesNotMatch(founder, /saveFounderCredentials\(adminCredsForm\)/);
  assert.match(founder, /trusted <code>app_metadata\.we4all_role<\/code>/);
  assert.match(founder, /City Manager actions remain zone-filtered on the server/);
});

test("public registration cannot self-select admin and partner applications carry an operational zone", () => {
  assert.doesNotMatch(registration, /id: "founder"|id: "city_manager"/);
  assert.match(registration, /zone_id: regForm\.zoneId/);
  assert.match(adminFunction, /appMetadata\.we4all_role/);
  assert.match(adminFunction, /application\.application_payload\?\.zone_id !== zoneId/);
});

test("guest checkout cannot create a local authenticated session", () => {
  assert.doesNotMatch(checkout, /Logged In! Payment Unlocked/);
  assert.doesNotMatch(checkout, /localStorage\.setItem\("we4all_persistent_user_session_v8"/);
  assert.match(checkout, /No account or session was created/);
});
