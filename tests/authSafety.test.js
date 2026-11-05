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

test("OTP and biometric options do not pretend to authenticate without server verification", () => {
  assert.match(ownerAccountSource, /SMS OTP is unavailable until the secure server provider is configured/);
  assert.match(ownerAccountSource, /server-side passkey enrollment and verification before this can be enabled/);
  assert.match(ownerAccountSource, /Secure sign-in is not configured yet/);
});

test("biometric UI cannot announce local-only authentication success", () => {
  assert.doesNotMatch(ownerAccountSource, /Biometric Passkey Verified/);
  assert.doesNotMatch(ownerAccountSource, /setTimeout\(handleLoginSubmit, 400\)/);
});
