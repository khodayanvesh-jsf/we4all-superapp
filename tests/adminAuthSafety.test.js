import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readSource = (path) =>
  readFile(new URL(path, import.meta.url), "utf8");

const [app, supabase, checkout, founder] = await Promise.all([
  readSource("../src/App.jsx"),
  readSource("../src/supabaseClient.js"),
  readSource("../src/modules/ActionAndErrorFeedbackLayer.jsx"),
  readSource("../src/modules/FounderAdminSuite.jsx")
]);

test("founder admin gate has no hard-coded username, password or PIN bypass", () => {
  assert.doesNotMatch(app, /we4all2026|22061969s!|adminPinInput === "1234"/);
  assert.match(app, /handleFounderAdminLogin/);
  assert.match(app, /signInWithPassword/);
  assert.match(app, /we4all-admin-review/);
  assert.match(app, /app_metadata/);
  assert.doesNotMatch(app, /Founder authentication unavailable/);
});

test("founder credentials are not returned from or written to browser storage", () => {
  assert.doesNotMatch(supabase, /username:\s*"KhodayAnvesh"|password:\s*"22061969s!"|pin:\s*"9999"/);
  assert.match(supabase, /configured:\s*false/);
  assert.doesNotMatch(supabase, /localStorage\.setItem\(ADMIN_CREDS_KEY/);
  assert.match(supabase, /delete merged\.founderCredentials/);
});

test("founder credential editing is disabled in the admin interface", () => {
  assert.doesNotMatch(founder, /saveFounderCredentials\(adminCredsForm\)/);
  assert.match(founder, /Server-side founder authentication required/);
});

test("guest checkout cannot create a local authenticated session", () => {
  assert.doesNotMatch(checkout, /Logged In! Payment Unlocked/);
  assert.doesNotMatch(checkout, /localStorage\.setItem\("we4all_persistent_user_session_v8"/);
  assert.match(checkout, /No account or session was created/);
});
