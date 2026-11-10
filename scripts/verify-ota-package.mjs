import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { constants, createDecipheriv, createHash, createPublicKey, publicDecrypt, sign } from "node:crypto";
import { APP_BUILD_NUMBER, APP_VERSION } from "../src/appVersion.js";
import { APP_ID, payloadBytes, verifyRelease } from "../supabase/functions/we4all-ota-staging/release.mjs";

const [, , packPath, bundlePath, keyPath] = process.argv;
const [pack, bundle, privateKey] = await Promise.all([
  readFile(packPath, "utf8").then(JSON.parse), readFile(bundlePath), readFile(keyPath, "utf8")
]);
const publicKey = createPublicKey(privateKey);
const expectedPublicKey = process.env.WE4ALL_OTA_PUBLIC_KEY;
if (expectedPublicKey) {
  assert(publicKey.equals(createPublicKey(expectedPublicKey)), "The bundle key must match the native staging key");
}
assert.equal(pack.app_id, APP_ID);
assert.equal(pack.checksum_algorithm, "sha256");
assert.equal(pack.size_bytes, bundle.length);
assert.equal(pack.encryption_method, "v2");
const [iv, wrappedKey] = pack.session_key.split(":").map(value => Buffer.from(value, "base64"));
const unwrap = (value) => publicDecrypt({ key: publicKey, padding: constants.RSA_PKCS1_PADDING }, value);
const decipher = createDecipheriv("aes-128-cbc", unwrap(wrappedKey), iv);
const zip = Buffer.concat([decipher.update(bundle), decipher.final()]);
assert.equal(zip.subarray(0, 4).toString("hex"), "504b0304", "Decrypted payload is a ZIP");
assert.deepEqual(createHash("sha256").update(zip).digest(), unwrap(Buffer.from(pack.checksum, "hex")));

const release = {
  app_id: APP_ID, channel: "staging", version: pack.bundle, native_build: APP_BUILD_NUMBER, native_version: APP_VERSION,
  path: `bundles/${pack.bundle}.zip`, checksum: pack.checksum, session_key: pack.session_key,
  encrypted_sha256: createHash("sha256").update(bundle).digest("hex"), notes: "Packaging check"
};
release.signature = sign("sha256", payloadBytes(release), privateKey).toString("base64");
const pem = publicKey.export({ type: "spki", format: "pem" });
assert(await verifyRelease(release, pem), "Signed manifest verifies");
assert.equal(await verifyRelease({ ...release, notes: "Changed" }, pem), false, "Modified manifest is rejected");
console.log("Encrypted ZIP, native-compatible SHA-256 signature, and signed manifest verified.");
