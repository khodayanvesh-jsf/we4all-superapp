import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [ownerAccountSource, appSource] = await Promise.all([
  read("../src/modules/OwnerAccountProfile.jsx"),
  read("../src/App.jsx")
]);

test("phone sign-in sends and verifies a Supabase-issued SMS OTP", () => {
  assert.match(ownerAccountSource, /supabase\.auth\.signInWithOtp/);
  assert.match(ownerAccountSource, /supabase\.auth\.verifyOtp/);
  assert.match(ownerAccountSource, /type: "sms"/);
  assert.match(ownerAccountSource, /SMS verification code sent/);
  assert.doesNotMatch(ownerAccountSource, /generatedOtp/);
  assert.doesNotMatch(ownerAccountSource, /Instant OTP Generated/);
});

test("registration creates a verified customer and submits partner applications as pending", () => {
  assert.match(ownerAccountSource, /we4all_profiles/);
  assert.match(ownerAccountSource, /we4all_partner_applications/);
  assert.match(ownerAccountSource, /requested_role: selectedRoleKey/);
  assert.match(ownerAccountSource, /supabase\.from\("we4all_partner_applications"\)\.insert/);
});

test("restored sessions are revalidated with Supabase rather than local identity storage", () => {
  assert.match(ownerAccountSource, /supabase\.auth\.getUser/);
  assert.doesNotMatch(ownerAccountSource, /we4all_persistent_user_session_v8/);
  assert.match(ownerAccountSource, /currentUser\?\.authUserId/);
});

test("partner access still requires server-verified approved role", () => {
  assert.match(appSource, /canOpenPartnerPortal/);
  assert.match(appSource, /partnerObj\?\.authUserId/);
  assert.match(appSource, /partnerObj\?\.status !== "Approved"/);
});

test("browser-side PIN and biometric shortcuts are not available as login choices", () => {
  assert.match(ownerAccountSource, /\{ id: "otp", label: "Mobile OTP" \}/);
  assert.doesNotMatch(ownerAccountSource, /Biometric Passkey Verified/);
  assert.doesNotMatch(ownerAccountSource, /setTimeout\(handleLoginSubmit/);
});
