import { readFile } from "node:fs/promises";
import { createHash, sign } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { APP_VERSION, APP_BUILD_NUMBER } from "../src/appVersion.js";
import { APP_ID, BUCKET, compareVersions, missingReleasePointer, payloadBytes, releasePayload } from "../supabase/functions/we4all-ota-staging/release.mjs";

const [, , packPath, bundlePath, privateKeyPath] = process.argv;
const origin = new URL(process.env.WE4ALL_STAGING_SUPABASE_URL || "");
if (origin.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(origin.hostname) ||
    origin.hostname === "bdmbziwazpuzbukazmug.supabase.co" ||
    origin.pathname !== "/" || origin.username || origin.password || origin.search || origin.hash || origin.port) {
  throw new Error("Use the HTTPS URL of a separate WE4ALL staging Supabase project.");
}
const serviceKey = process.env.WE4ALL_STAGING_SUPABASE_SERVICE_KEY;
if (!serviceKey) throw new Error("Set the staging server credential in the protected environment.");
const [pack, bundle, privateKey] = await Promise.all([
  readFile(packPath, "utf8").then(JSON.parse), readFile(bundlePath), readFile(privateKeyPath, "utf8")
]);
if (pack.app_id !== APP_ID || pack.checksum_algorithm !== "sha256" || pack.size_bytes !== bundle.length || !pack.session_key) {
  throw new Error("Expected a signed, encrypted SHA-256 Android bundle.");
}
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
const release = releasePayload({
  app_id: APP_ID, channel: "staging",
  native_build: APP_BUILD_NUMBER, native_version: APP_VERSION, version: pack.bundle,
  path: `bundles/${pack.bundle}.zip`, checksum: pack.checksum, session_key: pack.session_key,
  encrypted_sha256: sha256(bundle),
  notes: `WE4ALL staging release ${pack.bundle}`
});
const manifest = { ...release, signature: sign("sha256", payloadBytes(release), privateKey).toString("base64") };
const server = createClient(origin.href, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const storage = server.storage.from(BUCKET);
const current = await fetch(storage.getPublicUrl("current.json").data.publicUrl, { cache: "no-store" });
if (current.ok && compareVersions(release.version, (await current.json()).version) <= 0) {
  throw new Error("The bundle version must be newer than the current staging version.");
}
if (!current.ok && !await missingReleasePointer(current)) throw new Error("Could not read the staging release pointer.");
const upload = await storage.upload(release.path, bundle, { contentType: "application/octet-stream", cacheControl: "31536000", upsert: false });
if (upload.error) throw new Error("Could not upload immutable staging bundle: " + upload.error.message);
const download = await fetch(storage.getPublicUrl(release.path).data.publicUrl);
if (!download.ok || sha256(Buffer.from(await download.arrayBuffer())) !== release.encrypted_sha256) {
  throw new Error("Uploaded bundle integrity could not be verified.");
}
const pointer = await storage.upload("current.json", JSON.stringify(manifest), { contentType: "application/json", cacheControl: "0", upsert: true });
if (pointer.error) throw new Error("Bundle uploaded, but the staging release pointer could not be advanced.");
console.log(`Published verified staging bundle ${release.version}.`);
