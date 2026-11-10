export const APP_ID = "com.we4all.superapp";
export const BUCKET = "we4all-ota-staging";
const VERSION = /^(?:0|[1-9]\d{0,7})\.(?:0|[1-9]\d{0,7})\.(?:0|[1-9]\d{0,7})$/;
const HEX = /^[0-9a-f]+$/i;
const SESSION_KEY = /^[A-Za-z0-9+/=]{20,40}:[A-Za-z0-9+/=]{300,800}$/;

// Storage versions may wrap the object-level 404 in an HTTP 400 response.
export async function missingReleasePointer(response) {
  if (response.status === 404) return true;
  if (response.status !== 400) return false;
  try {
    const error = await response.json();
    return String(error.statusCode) === "404" && ["not_found", "Not Found"].includes(error.error);
  } catch {
    return false;
  }
}

export function compareVersions(left, right) {
  if (!VERSION.test(left) || !VERSION.test(right)) throw new Error("Invalid bundle version");
  const lhs = left.split(".").map(Number);
  const rhs = right.split(".").map(Number);
  return lhs[0] - rhs[0] || lhs[1] - rhs[1] || lhs[2] - rhs[2];
}

export function releasePayload(value) {
  if (!value || value.app_id !== APP_ID || value.channel !== "staging" ||
      !VERSION.test(value.version) || !Number.isSafeInteger(value.native_build) || value.native_build < 1 ||
      !VERSION.test(value.native_version) || compareVersions(value.version, value.native_version) <= 0 ||
      value.path !== `bundles/${value.version}.zip` ||
      typeof value.checksum !== "string" || value.checksum.length !== 512 || !HEX.test(value.checksum) ||
      typeof value.session_key !== "string" || !SESSION_KEY.test(value.session_key) ||
      typeof value.encrypted_sha256 !== "string" || value.encrypted_sha256.length !== 64 || !HEX.test(value.encrypted_sha256) ||
      typeof value.notes !== "string" || value.notes.length > 500) throw new Error("Invalid staging release");
  const { app_id, channel, version, native_build, native_version, path, checksum, session_key, encrypted_sha256, notes } = value;
  return { app_id, channel, version, native_build, native_version, path, checksum, session_key, encrypted_sha256, notes };
}

const bytes = (base64) => Uint8Array.from(atob(base64), char => char.charCodeAt(0));
export const payloadBytes = (release) => new TextEncoder().encode(JSON.stringify(releasePayload(release)));

export async function verifyRelease(release, publicKey) {
  try {
    const pem = publicKey.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, "");
    const key = await crypto.subtle.importKey("spki", bytes(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    if (typeof release.signature !== "string" || release.signature.length > 800) return false;
    return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, bytes(release.signature), payloadBytes(release));
  } catch {
    return false;
  }
}

export function chooseRelease(request, release, storageBase) {
  if (request?.platform !== "android" || request?.app_id !== APP_ID) return null;
  if (String(request.version_code) !== String(release.native_build) || request.version_build !== release.native_version) return null;
  if (request.version_name !== "builtin") {
    if (!VERSION.test(request.version_name) || compareVersions(release.version, request.version_name) <= 0) return null;
  }
  return {
    version: release.version,
    url: `${storageBase}/${release.path}`,
    checksum: release.checksum,
    session_key: release.session_key,
    comment: release.notes
  };
}
