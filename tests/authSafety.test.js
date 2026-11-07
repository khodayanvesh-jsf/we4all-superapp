import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const [ownerAccountSource, appSource] = await Promise.all([
  read("../src/modules/OwnerAccountProfile.jsx"),
  read("../src/App.jsx")
]);

test("normal account login uses a server-verified phone PIN; OTP is for registration and recovery", () => {
  assert.match(ownerAccountSource, /supabase\.auth\.signInWithOtp/);
  assert.match(ownerAccountSource, /supabase\.auth\.verifyOtp/);
  assert.match(ownerAccountSource, /supabase\.auth\.signInWithPassword\(\{ phone, password: loginForm\.pin \}\)/);
  assert.match(ownerAccountSource, /OTP is used only to create an account or recover a forgotten PIN/);
  assert.match(ownerAccountSource, /type: "sms"/);
  assert.match(ownerAccountSource, /auth\.updateUser\(\{ password: regForm\.pin \}\)/);
  assert.match(ownerAccountSource, /BiometricAuth\.authenticate/);
});

test("registration creates a verified customer and submits partner applications as pending", () => {
  assert.match(ownerAccountSource, /we4all_profiles/);
  assert.match(ownerAccountSource, /we4all_partner_applications/);
  assert.match(ownerAccountSource, /requested_role: selectedRoleKey/);
  assert.match(ownerAccountSource, /supabase\.from\("we4all_partner_applications"\)\.insert/);
});

test("restored sessions are revalidated with Supabase rather than local identity storage", () => {
  assert.match(ownerAccountSource, /supabase\.auth\.getUser/);
  assert.match(ownerAccountSource, /activateSupabaseAccount\(user\.id\)/);
  assert.doesNotMatch(ownerAccountSource, /we4all_persistent_user_session_v8/);
  assert.match(ownerAccountSource, /currentUser\?\.authUserId/);
});

test("account screen keeps guest shopping but hides connection and guest mode notices", async () => {
  const feedback = await read("../src/modules/ActionAndErrorFeedbackLayer.jsx");
  assert.doesNotMatch(ownerAccountSource, /Supabase cloud connection|API CONNECTED · SIGN IN TO SYNC|Guest Visitor Mode \(Shopping Enabled\)/);
  assert.doesNotMatch(feedback, /Guest Visitor Mode Enabled|Explore products, add items to cart freely/);
  assert.match(ownerAccountSource, /Guest Visitor/);
  assert.match(ownerAccountSource, /activateSupabaseAccount\(user\.id\)/);
});

test("login lists all defined portals even when role settings cannot load", () => {
  assert.match(ownerAccountSource, /useState\(ROLE_OPTIONS\)/);
  assert.match(ownerAccountSource, /\{ROLE_OPTIONS\.map\(\(opt\) =>/);
  assert.match(ownerAccountSource, /Select Portal to Log Into:/);
  assert.match(ownerAccountSource, /\{registrationRoleOptions\.map\(\(opt\) =>/);
});

test("Supabase auth persists and refreshes signed-in sessions automatically", async () => {
  const client = await read("../src/supabaseClient.js");
  assert.match(client, /persistSession:\s*true/);
  assert.match(client, /autoRefreshToken:\s*true/);
});

test("partner access still requires server-verified approved role", () => {
  assert.match(appSource, /canOpenPartnerPortal/);
  assert.match(appSource, /partnerObj\?\.authUserId/);
  assert.match(appSource, /partnerObj\?\.status !== "Approved"/);
});

test("administrator credentials can be changed only in the MFA-protected Founder console", async () => {
  const founderAdmin = await read("../src/modules/FounderAdminSuite.jsx");
  assert.match(founderAdmin, /getAuthenticatorAssuranceLevel/);
  assert.match(founderAdmin, /assurance\?\.currentLevel !== "aal2"/);
  assert.match(founderAdmin, /supabase\.auth\.updateUser\(updates\)/);
  assert.match(founderAdmin, /password\.length < 12/);
  assert.match(founderAdmin, /Change administrator sign-in credentials/);
  assert.match(founderAdmin, /credentials_update/);
  assert.match(founderAdmin, /New Founder username/);
});

test("Founder bootstrap is server-verified and requires password rotation plus MFA", async () => {
  const gate = await read("../src/modules/AdminSecurityGate.jsx");
  const founderAuth = await read("../supabase/functions/we4all-founder-auth/index.ts");
  const adminFunction = await read("../supabase/functions/we4all-admin-review/index.ts");
  assert.match(gate, /we4all-founder-auth/);
  assert.match(gate, /response\.json\(\)/);
  assert.match(gate, /complete_bootstrap_password_change/);
  assert.match(gate, /supabase.auth.mfa.enroll/);
  assert.match(founderAuth, /BOOTSTRAP_PASSWORD_SHA256/);
  assert.match(founderAuth, /After first-use reset, use your new password/);
  assert.match(founderAuth, /we4all_bootstrap_required: true/);
  assert.match(adminFunction, /must_change_password/);
  assert.match(adminFunction, /Change the initial Founder password/);
  assert.match(adminFunction, /claims\.aal !== "aal2"/);
});

test("Founder pending approval lists initialize product and hall inputs before filtering", async () => {
  const founderAdmin = await read("../src/modules/FounderAdminSuite.jsx");
  assert.ok(founderAdmin.indexOf("const safeProducts =") < founderAdmin.indexOf("const safePendingProductApprovals ="));
  assert.ok(founderAdmin.indexOf("const safeHalls =") < founderAdmin.indexOf("const safePendingHallApprovals ="));
});

test("PIN and biometric sign-in use Supabase Auth and native device authentication", () => {
  assert.match(ownerAccountSource, /useState\("pin"\)/);
  assert.match(ownerAccountSource, /signInWithPassword/);
  assert.match(ownerAccountSource, /@aparajita\/capacitor-biometric-auth/);
  assert.match(ownerAccountSource, /BiometricAuth\.checkBiometry/);
  assert.doesNotMatch(ownerAccountSource, /setTimeout\(handleLoginSubmit/);
});

test("trial OTP is server generated, short-lived and disabled unless an Edge secret enables it", async () => {
  const otpFunction = await read("../supabase/functions/we4all-trial-otp-auth/index.ts");
  const otpMigration = await read("../supabase/migrations/20261107180000_we4all_trial_otp_auth.sql");
  assert.match(ownerAccountSource, /we4all-trial-otp-auth/);
  assert.match(otpFunction, /WE4ALL_TRIAL_OTP_ENABLED/);
  assert.match(otpFunction, /trial_code: code/);
  assert.match(otpFunction, /expires_at: new Date\(Date\.now\(\) \+ 2 \* 60 \* 1000\)/);
  assert.match(otpFunction, /we4all_consume_trial_otp/);
  assert.match(otpMigration, /used_at is not null/);
  assert.match(otpMigration, /attempts >= 5/);
});

test("registration roles are Founder controlled and audited; public signup cannot choose an undefined role", async () => {
  const roleMigration = await read("../supabase/migrations/20261107180100_we4all_registration_role_controls.sql");
  const adminFunction = await read("../supabase/functions/we4all-admin-review/index.ts");
  assert.match(ownerAccountSource, /from\("we4all_registration_roles"\)/);
  assert.match(roleMigration, /role_key in \('customer','merchant','service_provider','decorator','rider','labour'\)/);
  assert.match(roleMigration, /Users create own partner applications/);
  assert.match(roleMigration, /we4all_save_registration_roles/);
  assert.match(adminFunction, /registration_roles_save/);
  assert.match(adminFunction, /adminRole !== "founder"/);
});

test("trial-generated phone codes cannot approve a partner application as phone-verified", async () => {
  const adminFunction = await read("../supabase/functions/we4all-admin-review/index.ts");
  assert.match(adminFunction, /trial_phone_verification === true/);
  assert.match(adminFunction, /does not prove phone ownership/);
});
