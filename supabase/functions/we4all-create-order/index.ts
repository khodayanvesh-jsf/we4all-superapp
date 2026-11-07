import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json(503, { ok: false, error: "SERVER_CONFIGURATION_MISSING" });

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { ok: false, error: "AUTH_REQUIRED" });
  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.id) return json(401, { ok: false, error: "INVALID_SESSION" });

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 65536) return json(413, { ok: false, error: "REQUEST_TOO_LARGE" });
    body = JSON.parse(raw);
  } catch { return json(400, { ok: false, error: "INVALID_JSON" }); }

  const partnerId = String(body.partnerId || "");
  const zoneId = String(body.zoneId || "");
  const idempotencyKey = String(body.idempotencyKey || "");
  const feePolicyVersions = body.feePolicyVersions && typeof body.feePolicyVersions === "object" && !Array.isArray(body.feePolicyVersions)
    ? body.feePolicyVersions as Record<string, unknown>
    : {};
  const items = body.items;
  const deliveryAddress = body.deliveryAddress;
  if (!partnerId || !zoneId || !idempotencyKey || !Array.isArray(items) || !items.length || items.length > 50 ||
      !deliveryAddress || typeof deliveryAddress !== "object" || Array.isArray(deliveryAddress)) {
    return json(400, { ok: false, error: "INVALID_CHECKOUT_REQUEST" });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: customerRole, error: roleError } = await admin.from("we4all_user_roles")
    .select("role,status").eq("user_id", user.id).eq("role", "customer").eq("status", "approved").maybeSingle();
  if (roleError) return json(503, { ok: false, error: "CUSTOMER_ROLE_LOOKUP_FAILED" });
  if (!customerRole) return json(403, { ok: false, error: "APPROVED_CUSTOMER_ROLE_REQUIRED" });

  const cleanItems: Array<{ catalog_item_id: string; quantity: number }> = [];
  for (const rawItem of items) {
    if (!rawItem || typeof rawItem !== "object") return json(400, { ok: false, error: "INVALID_ORDER_ITEM" });
    const item = rawItem as Record<string, unknown>;
    const catalogItemId = String(item.catalogItemId || "");
    const quantity = Number(item.quantity);
    if (!/^[0-9a-f-]{36}$/i.test(catalogItemId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return json(400, { ok: false, error: "INVALID_ORDER_ITEM" });
    }
    cleanItems.push({ catalog_item_id: catalogItemId, quantity });
  }

  const { data, error } = await admin.rpc("we4all_create_order", {
    p_customer_user_id: user.id, p_partner_id: partnerId, p_items: cleanItems,
    p_zone_id: zoneId, p_delivery_address: deliveryAddress, p_idempotency_key: idempotencyKey,
    p_fee_policy_versions: feePolicyVersions
  });
  if (error) {
    const safe = ["MERCHANT_NOT_APPROVED","CATALOG_ITEM_UNAVAILABLE","INSUFFICIENT_STOCK","INVALID_CHECKOUT_CONTEXT","INVALID_IDEMPOTENCY_KEY","INVALID_ORDER_ITEMS","INVALID_ITEM_QUANTITY","DUPLICATE_CATALOG_ITEM","DELIVERY_ADDRESS_REQUIRED","FEE_POLICY_CHANGED"];
    const match = safe.find((code) => (error.message || "").includes(code));
    if (match) return json(409, { ok: false, error: match });
    console.error("we4all-create-order failed:", error.code || "DATABASE_ERROR");
    return json(500, { ok: false, error: "ORDER_CREATION_FAILED" });
  }
  return json(200, data as Record<string, unknown>);
});
