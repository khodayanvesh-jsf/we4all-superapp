import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../supabase/migrations/20261107145000_we4all_partner_kyc_private_storage.sql", import.meta.url), "utf8");
const submit = await readFile(new URL("../supabase/functions/we4all-submit-partner-kyc/index.ts", import.meta.url), "utf8");
const review = await readFile(new URL("../supabase/functions/we4all-admin-review/index.ts", import.meta.url), "utf8");
const account = await readFile(new URL("../src/modules/OwnerAccountProfile.jsx", import.meta.url), "utf8");
const admin = await readFile(new URL("../src/modules/FounderAdminSuite.jsx", import.meta.url), "utf8");

test("partner KYC documents use private owner-scoped storage and server-verified pending applications", () => {
  assert.match(migration, /'we4all-partner-kyc',[\s\S]*?false/);
  assert.match(migration, /storage\.foldername\(name\)\)\[1\][\s\S]*?auth\.uid\(\)/);
  assert.match(submit, /\.eq\("user_id", userId\)/);
  assert.match(submit, /application\.status !== "pending"/);
  assert.match(submit, /startsWith\(`\$\{userId\}\/\$\{applicationId\}\/`\)/);
  assert.match(submit, /REQUIRED_DOCUMENT_KEYS/);
  assert.match(submit, /driving_license/);
  assert.match(submit, /vehicle_registration/);
  assert.match(submit, /signatureMethod === "typed_name"/);
  assert.match(migration, /when 'rider' then array\['identity','driving_license','vehicle_registration','payout_proof'\]/);
  assert.match(migration, /foreach v_key in array v_required_keys/);
});

test("partner application explains the steps, file limits, privacy, and draft terms in plain language", () => {
  assert.match(account, /Finish your partner application/);
  assert.match(account, /up to 10 MB each/);
  assert.match(account, /stored in a private area/);
  assert.match(account, /Final partner terms must be published/);
  assert.match(account, /Save and send for review/);
  assert.match(account, /signatureMode === "drawn" \? "drawn_image"/);
  assert.match(account, /getPartnerKycDocuments\(partnerApplication\.requested_role\)/);
  assert.match(account, /capture="environment"/);
});

test("Founder review exposes private document links and requires five checks and a decision reason", () => {
  assert.match(review, /createSignedUrl\(path, 300\)/);
  assert.match(admin, /documentKeys\.map/);
  assert.match(admin, /payout_proof/);
  assert.match(admin, /terms/);
  assert.match(admin, /signature/);
  assert.match(admin, /all five evidence checks/i);
  assert.match(admin, /reason.length < 4/);
  assert.match(migration, /All five evidence-backed checks are required/);
  assert.match(migration, /final-%/);
});
