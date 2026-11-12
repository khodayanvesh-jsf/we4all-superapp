import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { accountLoginIdentity, confirmedLoginIdentifier, isStaffAccount } from "../src/modules/workflows/accountIdentity.js";
import { APP_BUILD_NUMBER, APP_VERSION } from "../src/appVersion.js";
import { APP_ID, chooseRelease, missingReleasePointer, payloadBytes, verifyRelease } from "../supabase/functions/we4all-ota-staging/release.mjs";

test("normalize valid email and Indian mobile logins without accepting synthetic addresses", () => {
  assert.deepEqual(accountLoginIdentity(" MEMBER@Example.com "), { email: "member@example.com" });
  assert.deepEqual(accountLoginIdentity("+91 90000 00001"), { phone: "+919000000001" });
  assert.equal(accountLoginIdentity("acct@login.we4all.invalid"), null);
  assert.equal(accountLoginIdentity("junk 9000000001"), null);
  assert.equal(accountLoginIdentity("5000000001"), null);
});

test("recovery reveals only a sign-in backed by a confirmed email and real mobile binding", () => {
  const verified = { email: "member@example.com", email_confirmed_at: "time", phone: "919000000001" };
  assert.equal(confirmedLoginIdentifier(verified), verified.email);
  assert.equal(confirmedLoginIdentifier({ ...verified, phone_confirmed_at: "time" }), "+919000000001");
  assert.equal(confirmedLoginIdentifier({ ...verified, email_confirmed_at: null }), "");
  assert.equal(confirmedLoginIdentifier({ ...verified, email: "acct@login.we4all.invalid" }), "");
  assert.equal(confirmedLoginIdentifier({ ...verified, phone_confirmed_at: "time", user_metadata: { trial_phone_verification: true } }), verified.email);
  assert.equal(isStaffAccount({ user_metadata: { we4all_role: "founder" } }), false);
  assert.equal(isStaffAccount({ app_metadata: { we4all_role: "founder" } }), true);
});

const release = {
  app_id: APP_ID, channel: "staging", native_build: APP_BUILD_NUMBER, native_version: APP_VERSION, version: "3.3.1000",
  path: "bundles/3.3.1000.zip", checksum: "ab".repeat(256), encrypted_sha256: "cd".repeat(32),
  session_key: `${"a".repeat(24)}:${"a".repeat(344)}`, notes: "Staging"
};
const android = { app_id: APP_ID, platform: "android", version_code: String(APP_BUILD_NUMBER), version_build: APP_VERSION, version_name: "builtin" };
const storage = "https://staging.supabase.co/storage/v1/object/public/we4all-ota-staging";

test("release selection restricts app, OS, native build, and downgrade", () => {
  assert.equal(chooseRelease(android, release, storage).url, storage + "/" + release.path);
  for (const fields of [
    { platform: "ios" }, { app_id: "another.app" }, { version_code: "330" },
    { version_build: "3.3.0" }, { version_name: release.version }, { version_name: "3.3.1001" }
  ]) assert.equal(chooseRelease({ ...android, ...fields }, release, storage), null);
});

test("release authentication rejects tampering, wrong keys, and paths outside its bucket", async () => {
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = rsa.publicKey.export({ type: "spki", format: "pem" });
  const signed = { ...release, signature: sign("sha256", payloadBytes(release), rsa.privateKey).toString("base64") };
  assert.equal(await verifyRelease(signed, pem), true);
  for (const fields of [
    { native_build: 999 }, { version: "3.3.1001" }, { checksum: "cd".repeat(256) },
    { path: "../../test.zip" }, { session_key: "" }, { notes: "Edited" }
  ]) assert.equal(await verifyRelease({ ...signed, ...fields }, pem), false);
  assert.equal(await verifyRelease(signed, "invalid key"), false);
});

test("first release accepts an absent Storage pointer and fails closed on other errors", async () => {
  assert.equal(await missingReleasePointer(new Response(null, { status: 404 })), true);
  assert.equal(await missingReleasePointer(Response.json({ statusCode: "404", error: "not_found" }, { status: 400 })), true);
  assert.equal(await missingReleasePointer(Response.json({ statusCode: "400", error: "bad_request" }, { status: 400 })), false);
  assert.equal(await missingReleasePointer(new Response(null, { status: 403 })), false);
});
