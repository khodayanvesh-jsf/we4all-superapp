import { withSupabase } from "npm:@supabase/server@1.9.2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CASHFREE_ORDER_PATTERN = /^[A-Za-z0-9_-]{3,45}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function cashfreeBaseUrl(mode: string) {
  if (mode === "sandbox") return "https://sandbox.cashfree.com/pg";
  if (mode === "production") return "https://api.cashfree.com/pg";
  return "";
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
  const clientId = Deno.env.get("CASHFREE_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("CASHFREE_CLIENT_SECRET") || "";
  const mode = (Deno.env.get("CASHFREE_ENV") || "sandbox").toLowerCase();
  const apiVersion = Deno.env.get("CASHFREE_API_VERSION") || "2026-01-01";
  const baseUrl = cashfreeBaseUrl(mode);
  if (!clientId || !clientSecret || !baseUrl) return json({ ok: false, error: "CASHFREE_NOT_CONFIGURED" }, 503);

  const { data: order, error: orderError } = await ctx.supabaseAdmin.from("we4all_orders")
    .select("id,customer_user_id,order_number,status,payment_status,total_inr")
    .eq("id", orderId).eq("customer_user_id", customerUserId).maybeSingle();
  if (orderError) return json({ ok: false, error: "ORDER_LOOKUP_FAILED" }, 503);
  if (!order) return json({ ok: false, error: "ORDER_NOT_FOUND" }, 404);

  const { data: paymentOrder, error: paymentOrderError } = await ctx.supabaseAdmin.from("we4all_payment_transactions")
    .select("provider_order_id,amount_inr,currency,status")
    .eq("provider", "cashfree").eq("order_id", orderId).eq("customer_user_id", customerUserId)
    .eq("idempotency_key", `cashfree:order:${orderId}`).maybeSingle();
  if (paymentOrderError) return json({ ok: false, error: "PAYMENT_ORDER_LOOKUP_FAILED" }, 503);
  if (!paymentOrder || !CASHFREE_ORDER_PATTERN.test(String(paymentOrder.provider_order_id || ""))) {
    return json({ ok: false, error: "PAYMENT_ORDER_NOT_FOUND" }, 404);
  }

  const expectedAmountPaise = Math.round(Number(order.total_inr) * 100);
  if (Math.round(Number(paymentOrder.amount_inr) * 100) !== expectedAmountPaise || paymentOrder.currency !== "INR") {
    return json({ ok: false, error: "PAYMENT_ORDER_AMOUNT_CONFLICT" }, 409);
  }

  let paymentResponse: Response;
  try {
    paymentResponse = await fetch(`${baseUrl}/orders/${encodeURIComponent(paymentOrder.provider_order_id)}/payments`, {
      headers: {
        "x-client-id": clientId,
        "x-client-secret": clientSecret,
        "x-api-version": apiVersion,
        "accept": "application/json"
      }
    });
  } catch {
    return json({ ok: false, error: "CASHFREE_UNREACHABLE" }, 502);
  }
  if (!paymentResponse.ok) {
    console.error("Cashfree payment status lookup failed with status:", paymentResponse.status);
    return json({ ok: false, error: "CASHFREE_PAYMENT_LOOKUP_FAILED" }, 502);
  }

  let attempts: unknown;
  try { attempts = await paymentResponse.json(); }
  catch { return json({ ok: false, error: "INVALID_CASHFREE_PAYMENT_RESPONSE" }, 502); }
  if (!Array.isArray(attempts)) return json({ ok: false, error: "INVALID_CASHFREE_PAYMENT_RESPONSE" }, 502);
  const successfulPayment = attempts
    .filter((payment) => payment && typeof payment === "object")
    .map((payment) => payment as Record<string, unknown>)
    .find((payment) => payment.payment_status === "SUCCESS");
  if (!successfulPayment) {
    const mostRecent = attempts.filter((payment) => payment && typeof payment === "object")
      .map((payment) => payment as Record<string, unknown>)
      .sort((left, right) => String(right.payment_completion_time || "").localeCompare(String(left.payment_completion_time || "")))[0];
    return json({
      ok: true,
      verified: true,
      processed: false,
      payment_status: order.payment_status,
      gateway_status: String(mostRecent?.payment_status || "PENDING"),
      message: "Cashfree has not confirmed a successful payment. The WE4ALL order remains unpaid."
    }, 202);
  }

  const paymentId = String(successfulPayment.cf_payment_id || "");
  const paymentAmountPaise = Math.round(Number(successfulPayment.payment_amount) * 100);
  if (!paymentId || String(successfulPayment.order_id || "") !== paymentOrder.provider_order_id ||
      paymentAmountPaise !== expectedAmountPaise || successfulPayment.payment_currency !== "INR") {
    return json({ ok: false, error: "CASHFREE_PAYMENT_DETAILS_MISMATCH" }, 409);
  }

  const eventId = `checkout:${paymentId}`;
  const normalizedEvent = {
    schemaVersion: 1,
    provider: "cashfree",
    eventId,
    eventType: "payment.captured",
    issuedAt: Math.floor(Date.now() / 1000),
    orderId: order.id,
    orderReference: order.order_number,
    paymentId,
    // The live ledger enforces one row per provider order. Keep the order-link
    // row as the provider-order mapping and store the captured payment as a
    // separate payment row keyed by its payment ID.
    providerOrderId: null,
    cashfreeOrderId: paymentOrder.provider_order_id,
    amountPaise: paymentAmountPaise,
    currency: "INR"
  };
  const { data, error } = await ctx.supabaseAdmin.rpc("we4all_process_payment_event", {
    p_provider: "cashfree",
    p_provider_event_id: eventId,
    p_event_type: "payment.captured",
    p_event_payload: normalizedEvent,
    p_order_id: order.id,
    p_order_reference: order.order_number,
    p_provider_payment_id: paymentId,
    p_provider_order_id: null,
    p_amount_paise: paymentAmountPaise,
    p_currency: "INR",
    p_signature_verified: true
  });
  if (error) {
    console.error("WE4ALL Cashfree payment processing failed:", error.code || "DATABASE_ERROR");
    return json({ ok: false, error: "PAYMENT_PROCESSING_FAILED" }, 500);
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.ok) return json({ ok: false, error: "INVALID_PAYMENT_PROCESSING_RESULT" }, 502);
  return json({ ...result, verified: true }, result.processed === false ? 202 : 200);
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: CORS_HEADERS });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
