import { withSupabase } from "npm:@supabase/server@1.9.2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPI_ID_PATTERN = /^[A-Za-z0-9._-]{2,128}@[A-Za-z0-9.-]{2,64}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  const customerUserId = typeof ctx.jwtClaims?.sub === "string" ? ctx.jwtClaims.sub : "";
  if (!UUID_PATTERN.test(customerUserId)) return json({ ok: false, error: "AUTH_REQUIRED" }, 401);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 4096) return json({ ok: false, error: "REQUEST_TOO_LARGE" }, 413);
    body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400);
  }

  const orderId = String(body.orderId || "");
  if (!UUID_PATTERN.test(orderId)) return json({ ok: false, error: "INVALID_ORDER_ID" }, 400);
  if (Deno.env.get("WE4ALL_UPI_INTENT_ENABLED") !== "true") {
    return json({ ok: false, error: "UPI_INTENT_NOT_ENABLED" }, 503);
  }
  const payeeVpa = Deno.env.get("WE4ALL_UPI_PAYEE_VPA") || "";
  const payeeName = (Deno.env.get("WE4ALL_UPI_PAYEE_NAME") || "WE4ALL").trim().slice(0, 70);
  if (!UPI_ID_PATTERN.test(payeeVpa)) return json({ ok: false, error: "UPI_PAYEE_NOT_CONFIGURED" }, 503);

  const { data: role, error: roleError } = await ctx.supabaseAdmin.from("we4all_user_roles")
    .select("role,status").eq("user_id", customerUserId).eq("role", "customer").eq("status", "approved").maybeSingle();
  if (roleError) return json({ ok: false, error: "CUSTOMER_ROLE_LOOKUP_FAILED" }, 503);
  if (!role) return json({ ok: false, error: "APPROVED_CUSTOMER_ROLE_REQUIRED" }, 403);

  const { data: order, error: orderError } = await ctx.supabaseAdmin.from("we4all_orders")
    .select("id,customer_user_id,order_number,status,payment_status,total_inr")
    .eq("id", orderId).eq("customer_user_id", customerUserId).maybeSingle();
  if (orderError) return json({ ok: false, error: "ORDER_LOOKUP_FAILED" }, 503);
  if (!order) return json({ ok: false, error: "ORDER_NOT_FOUND" }, 404);
  if (!(["pending", "failed"].includes(order.payment_status)) ||
      !(["awaiting_payment", "merchant_confirmed"].includes(order.status))) {
    return json({ ok: false, error: "ORDER_NOT_PAYABLE" }, 409);
  }

  const amountPaise = Math.round(Number(order.total_inr) * 100);
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 1) return json({ ok: false, error: "INVALID_ORDER_AMOUNT" }, 409);
  const amount = (amountPaise / 100).toFixed(2);
  const orderReference = String(order.order_number).replace(/[^A-Za-z0-9._-]/g, "").slice(0, 35);
  if (!orderReference) return json({ ok: false, error: "INVALID_ORDER_REFERENCE" }, 409);

  const query = new URLSearchParams({
    pa: payeeVpa,
    pn: payeeName,
    tr: orderReference,
    tn: `WE4ALL order ${orderReference}`.slice(0, 80),
    am: amount,
    cu: "INR"
  });

  return json({
    ok: true,
    provider: "upi_intent",
    intentUri: `upi://pay?${query.toString()}`,
    amountPaise,
    currency: "INR",
    orderReference,
    verification: "not_available_pending"
  });
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: CORS_HEADERS });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
