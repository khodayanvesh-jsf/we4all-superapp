import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, adminFunction, founderSuite, gate] = await Promise.all([
  readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  readFile(new URL("../supabase/functions/we4all-admin-review/index.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/modules/FounderAdminSuite.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/modules/AdminSecurityGate.jsx", import.meta.url), "utf8")
]);

test("Founder gate verifies MFA and obtains server authorization before opening the console", () => {
  assert.match(app, /<AdminSecurityGate[\s\S]*?onAuthorized=/);
  assert.match(gate, /functions\.invoke\("we4all-founder-auth"/);
  assert.match(gate, /currentLevel !== "aal2"/);
  assert.match(gate, /functions\.invoke\("we4all-admin-review", \{ body: \{ action: "whoami" \}/);
  assert.match(gate, /onAuthorized\?\.\(\{ role: data.role/);
});

test("Founder gate does not use local credential or PIN bypass", () => {
  assert.doesNotMatch(app, /handleFounderAdminLogin|fastPin.*1234.*Founder/);
  assert.doesNotMatch(gate, /localStorage|sessionStorage|fastPin/);
});

test("server checks trusted roles, MFA and bootstrap status", () => {
  assert.match(adminFunction, /claims\.app_metadata/);
  assert.match(adminFunction, /!\["founder", "city_manager"\]\.includes\(adminRole\)/);
  assert.match(adminFunction, /claims\.aal !== "aal2"/);
  assert.match(adminFunction, /if \(adminRole === "founder" && appMetadata\.we4all_bootstrap_required === true\)/);
  assert.doesNotMatch(adminFunction, /user_metadata\.we4all_role/);
});

test("Founder Admin suite still invokes server-side review operations", () => {
  assert.match(founderSuite, /we4all-admin-review/);
  assert.match(founderSuite, /Founder server authorization was denied/);
});
