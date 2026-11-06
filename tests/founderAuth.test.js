import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, adminFunction, founderSuite] = await Promise.all([
  readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/we4all-admin-review/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/modules/FounderAdminSuite.jsx", import.meta.url), "utf8")
]);

test("Founder gate signs in with Supabase email/password and calls server authorization", () => {
  assert.match(app, /handleFounderAdminLogin/);
  assert.match(app, /supabase\.auth\.signInWithPassword/);
  assert.match(app, /functions\.invoke\("we4all-admin-review"/);
  assert.match(app, /founderCheck\?\.ok !== true/);
  assert.match(app, /setIsAdminAuthenticated\(true\)/);
});

test("Founder gate does not use hard-coded credentials or local PIN bypass", () => {
  assert.doesNotMatch(app, /Founder authentication unavailable/);
  assert.doesNotMatch(app, /fastPin.*1234.*Founder/);
  assert.match(app, /trusted Founder role/);
  assert.match(app, /app_metadata\.we4all_role = founder/);
});

test("server checks trusted app_metadata and denies other accounts", () => {
  assert.match(adminFunction, /claims\.app_metadata/);
  assert.match(adminFunction, /appMetadata\.we4all_role !== "founder"/);
  assert.doesNotMatch(adminFunction, /user_metadata\.we4all_role/);
  assert.match(adminFunction, /createAdminClient\(\{ auth: \{ keyName: "we4allbackendrotation202611" \} \}\)/);
});

test("Founder Admin suite still invokes server-side review operations", () => {
  assert.match(founderSuite, /we4all-admin-review/);
  assert.match(founderSuite, /Founder server authorization was denied/);
});
