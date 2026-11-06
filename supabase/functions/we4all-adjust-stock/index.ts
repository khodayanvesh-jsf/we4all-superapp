import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
const respond = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return respond(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return respond(503, { ok: false, error: "SERVER_CONFIGURATION_MISSING" });

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return respond(401, { ok: false, error: "AUTH_REQUIRED" });

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user?.id) return respond(401, { ok: false, error: "INVALID_SESSION" });

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 8192) return respond(413, { ok: false, error: "REQUEST_TOO_LARGE" });
    body = JSON.parse(raw);
  } catch { return respond(400, { ok: false, error: "INVALID_JSON" }); }

  const partnerId = String(body.partnerId || "");
  const catalogItemId = String(body.catalogItemId || "");
  const delta = Number(body.quantityDelta);
  const idempotencyKey = String(body.idempotencyKey || "");
  if (!/^[0-9a-f-]{36}$/i.test(partnerId) || !/^[0-9a-f-]{36}$/i.test(catalogItemId) ||
      !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100000 ||
      idempotencyKey.length < 8 || idempotencyKey.length > 160) {
    return respond(400, { ok: false, error: "INVALID_STOCK_ADJUSTMENT" });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: partner, error: partnerError } = await admin
    .from("we4all_partners")
    .select("id")
    .eq("id", partnerId)
    .eq("owner_user_id", user.id)
    .eq("partner_type", "merchant")
    .eq("approval_status", "approved")
    .maybeSingle();
  if (partnerError) return respond(503, { ok: false, error: "PARTNER_LOOKUP_FAILED" });
  if (!partner) return respond(403, { ok: false, error: "APPROVED_MERCHANT_REQUIRED" });

  const { data, error } = await admin.rpc("we4all_adjust_inventory", {
    p_owner_user_id: user.id,
    p_partner_id: partnerId,
    p_catalog_item_id: catalogItemId,
    p_quantity_delta: delta,
    p_idempotency_key: idempotencyKey
  });
  if (error) {
    const known = ["CATALOG_ITEM_NOT_FOUND", "INSUFFICIENT_STOCK", "INVALID_STOCK_DELTA", "INVALID_IDEMPOTENCY_KEY"];
    const match = known.find((code) => (error.message || "").includes(code));
    if (match) return respond(409, { ok: false, error: match });
    console.error("we4all-adjust-stock failed:", error.code || "DATABASE_ERROR");
    return respond(500, { ok: false, error: "STOCK_ADJUSTMENT_FAILED" });
  }
  return respond(200, data as Record<string, unknown>);
});
