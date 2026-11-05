import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ownerAccountSource = await readFile(
  new URL("../src/modules/OwnerAccountProfile.jsx", import.meta.url),
  "utf8"
);

test("legacy OTP flow does not generate or reveal a code in the browser", () => {
  assert.doesNotMatch(ownerAccountSource, /Instant OTP Generated/);
  assert.doesNotMatch(ownerAccountSource, /setOtpState\(\{\s*sent:\s*true/);
  assert.match(ownerAccountSource, /Local PINs, browser-stored profiles and demo codes are not accepted as authentication/);
});

test("OTP and biometric login fail closed until server verification exists", () => {
  assert.match(ownerAccountSource, /loginMethod === "otp" \|\| loginMethod === "biometric"/);
  assert.match(ownerAccountSource, /server-side passkey enrollment and challenge verification/);
  assert.match(ownerAccountSource, /SMS OTP provider and server-side verification/);
});

test("biometric UI cannot announce local-only authentication success", () => {
  assert.doesNotMatch(ownerAccountSource, /Biometric Passkey Verified/);
  assert.doesNotMatch(ownerAccountSource, /setTimeout\(handleLoginSubmit, 400\)/);
});
