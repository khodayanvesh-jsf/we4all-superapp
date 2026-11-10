import { APP_ID, BUCKET, chooseRelease, missingReleasePointer, verifyRelease } from "./release.mjs";

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const noUpdate = () => json({ kind: "up_to_date", error: "no_new_version", message: "WE4ALL is up to date on staging." });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const client = await request.json();
    if (client?.platform !== "android" || client?.app_id !== APP_ID) return noUpdate();
    const url = Deno.env.get("SUPABASE_URL") || "";
    const publicKey = Deno.env.get("WE4ALL_OTA_MANIFEST_PUBLIC_KEY") || "";
    if (!url.startsWith("https://") || !publicKey) return json({ error: "staging_unconfigured" }, 503);
    const storage = `${url.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}`;
    const manifest = await fetch(`${storage}/current.json`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (await missingReleasePointer(manifest)) return noUpdate();
    if (!manifest.ok) return json({ error: "manifest_unavailable" }, 503);
    const raw = await manifest.text();
    if (raw.length > 8192) return json({ error: "invalid_manifest" }, 503);
    const release = JSON.parse(raw);
    if (!await verifyRelease(release, publicKey)) return json({ error: "invalid_manifest" }, 503);
    const result = chooseRelease(client, release, storage);
    return result ? json(result) : noUpdate();
  } catch {
    return json({ error: "update_check_failed" }, 503);
  }
});
