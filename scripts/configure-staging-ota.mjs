import { readFile, writeFile } from "node:fs/promises";
import { createPublicKey } from "node:crypto";

const base = new URL(process.env.WE4ALL_STAGING_SUPABASE_URL || "");
if (base.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(base.hostname) ||
    base.hostname === "bdmbziwazpuzbukazmug.supabase.co" ||
    base.pathname !== "/" || base.username || base.password || base.search || base.hash || base.port) {
  throw new Error("Use the HTTPS URL of a separate WE4ALL staging Supabase project.");
}
const key = createPublicKey(process.env.WE4ALL_OTA_PUBLIC_KEY || "");
if (key.asymmetricKeyType !== "rsa" || key.asymmetricKeyDetails?.modulusLength !== 2048) {
  throw new Error("The OTA updater requires a 2048-bit RSA key.");
}

const path = new URL("../capacitor.config.json", import.meta.url);
const config = JSON.parse(await readFile(path, "utf8"));
Object.assign(config.plugins.CapacitorUpdater, {
  updateUrl: new URL("/functions/v1/we4all-ota-staging", base).href,
  autoUpdate: "atBackground",
  publicKey: key.export({ type: "pkcs1", format: "pem" }).trim()
});
await writeFile(path, JSON.stringify(config, null, 2) + "\n");
