import { withSupabase } from "npm:@supabase/server@1.9.2";

const BUCKET = "we4all-partner-kyc";
const TERMS_VERSION = "trial-draft-1";
const MAX_DOCUMENTS = 5;
const REQUIRED_DOCUMENT_KEYS: Record<string, string[]> = {
  merchant: ["identity", "business_proof", "payout_proof"],
  service_provider: ["identity", "trade_proof", "payout_proof"],
  decorator: ["identity", "business_proof", "payout_proof"],
  rider: ["identity", "driving_license", "vehicle_registration", "payout_proof"],
  labour: ["identity", "trade_proof", "payout_proof"]
};
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  const userId = typeof ctx.jwtClaims?.sub === "string" ? ctx.jwtClaims.sub : "";
  if (!userId) return json({ ok: false, error: "A signed-in account is required" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ ok: false, error: "Request body must be valid JSON" }, 400); }

  const applicationId = String(body.application_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) return json({ ok: false, error: "Select a valid partner application" }, 400);
  if (body.terms_accepted !== true || body.terms_version !== TERMS_VERSION) {
    return json({ ok: false, error: "Review and accept the current trial declaration before submitting" }, 400);
  }

  const signature = body.signature as Record<string, unknown> | undefined;
  const signerName = typeof signature?.signer_name === "string" ? signature.signer_name.trim() : "";
  const signatureMethod = String(signature?.method || "");
  const allowedSignatureMethods = ["typed_name", "drawn_image", "uploaded_image"];
  if (signerName.length < 2 || signerName.length > 160 || !allowedSignatureMethods.includes(signatureMethod)) {
    return json({ ok: false, error: "Add your name and a valid signature method" }, 400);
  }

  const files = body.files as Record<string, unknown> | undefined;
  const { data: application, error: applicationError } = await ctx.supabaseAdmin
    .from("we4all_partner_applications")
    .select("id,user_id,requested_role,application_payload,status")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (applicationError) return json({ ok: false, error: "Could not load your partner application" }, 500);
  if (!application || application.status !== "pending") return json({ ok: false, error: "Only your pending application can receive KYC files" }, 404);

  const requiredFileKeys = REQUIRED_DOCUMENT_KEYS[application.requested_role] || [];
  if (!requiredFileKeys.length) return json({ ok: false, error: "This partner role does not have a document checklist" }, 400);
  if (!files || requiredFileKeys.some((key) => !(key in files)) || Object.keys(files).some((key) => !requiredFileKeys.includes(key))) {
    return json({ ok: false, error: "Upload only the documents listed for your partner role" }, 400);
  }
  const filePaths = Object.fromEntries(requiredFileKeys.map((key) => [key, String(files[key] || "")]));
  const signaturePath = signature?.path ? String(signature.path) : "";
  const requestedPaths = [...Object.values(filePaths), ...(signaturePath ? [signaturePath] : [])];
  if (requestedPaths.length > MAX_DOCUMENTS || new Set(requestedPaths).size !== requestedPaths.length || requestedPaths.some((path) => !path.startsWith(`${userId}/${applicationId}/`))) {
    return json({ ok: false, error: "KYC files must be uploaded to this account's private application folder" }, 400);
  }
  if (requiredFileKeys.some((key) => !filePaths[key]) || ((signatureMethod === "typed_name") !== !signaturePath)) {
    return json({ ok: false, error: "Upload every required document and complete the selected signature method" }, 400);
  }

  const admin = ctx.supabaseAdmin;
  const folder = `${userId}/${applicationId}`;
  const { data: objects, error: storageError } = await admin.storage.from(BUCKET).list(folder, { limit: 20 });
  if (storageError) {
    console.error("WE4ALL partner KYC storage verification failed:", storageError.message);
    return json({ ok: false, error: "Secure KYC storage is not ready. Your application has not been marked complete." }, 503);
  }
  const uploadedNames = new Set((objects || []).map((object) => object.name));
  const expectedNames = requestedPaths.map((path) => path.slice(`${folder}/`.length));
  if (expectedNames.some((name) => !uploadedNames.has(name))) {
    return json({ ok: false, error: "One or more uploaded files could not be verified. Check each file and try again." }, 400);
  }

  const now = new Date().toISOString();
  const kyc = {
    files: filePaths,
    signature: { method: signatureMethod, signer_name: signerName, path: signaturePath || null },
    terms: { accepted: true, version: TERMS_VERSION, accepted_at: now },
    submitted_at: now,
    status: "submitted"
  };
  const payload = { ...(application.application_payload || {}), kyc };
  const { data: updated, error: updateError } = await admin
    .from("we4all_partner_applications")
    .update({ application_payload: payload })
    .eq("id", applicationId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (updateError) {
    console.error("WE4ALL partner KYC submission failed:", updateError.message);
    return json({ ok: false, error: "Could not save the KYC submission. Try again." }, 500);
  }
  if (!updated) return json({ ok: false, error: "This application has changed. Refresh your account before submitting again." }, 409);

  const { error: auditError } = await admin.from("we4all_audit_events").insert({
    actor_user_id: userId,
    actor_role: "applicant",
    action: "partner_kyc_submitted",
    entity_type: "partner_application",
    entity_id: applicationId,
    zone_id: application.application_payload?.zone_id || null,
    metadata: { requested_role: application.requested_role, document_count: requestedPaths.length, terms_version: TERMS_VERSION }
  });
  if (auditError) console.error("WE4ALL partner KYC audit insert failed:", auditError.message);

  return json({ ok: true, status: "submitted", submitted_at: now, terms_version: TERMS_VERSION });
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: CORS_HEADERS });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
