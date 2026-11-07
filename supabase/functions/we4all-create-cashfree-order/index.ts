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

function cashfreeHeaders(clientId: string, clientSecret: string, apiVersion: string) {
  return {
    "content-type": "application/json",
    "x-client-id": clientId,
    "x-client-secret": clientSecret,
    "x-api-version": apiVersion
  };
}

async function readJson(response: Response) {
  try { return await response.json() as Record<string, unknown>; }
  catch { return null; }
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

  const { data: role, error: roleError } = await ctx.supabaseAdmin.from("we4all_user_roles")
    .select("role,status").eq("user_id", customerUserId).eq("role", "customer").eq("status", "approved").maybeSingle();
  if (roleError) return json({ ok: false, error: "CUSTOMER_ROLE_LOOKUP_FAILED" }, 503);
  if (!role) return json({ ok: false, error: "APPROVED_CUSTOMER_ROLE_REQUIRED" }, 403);

  const { data: order, error: orderError } = await ctx.supabaseAdmin.from("we4all_orders")
    .select("id,customer_user_id,order_number,status,payment_status,total_inr,delivery_address")
    .eq("id", orderId).eq("customer_user_id", customerUserId).maybeSingle();
  if (orderError) return json({ ok: false, error: "ORDER_LOOKUP_FAILED" }, 503);
  if (!order) return json({ ok: false, error: "ORDER_NOT_FOUND" }, 404);
  if (!(["pending", "failed"].includes(order.payment_status)) ||
      !(["awaiting_payment", "merchant_confirmed"].includes(order.status))) {
    return json({ ok: false, error: "ORDER_NOT_PAYABLE" }, 409);
  }

  const amountInr = Number(Number(order.total_inr).toFixed(2));
  const amountPaise = Math.round(amountInr * 100);
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) return json({ ok: false, error: "INVALID_ORDER_AMOUNT" }, 409);

  const { data: existing, error: existingError } = await ctx.supabaseAdmin.from("we4all_payment_transactions")
    .select("provider_order_id,amount_inr,currency,status")
    .eq("provider", "cashfree").eq("order_id", orderId)
    .eq("idempotency_key", `cashfree:order:${orderId}`).maybeSingle();
  if (existingError) return json({ ok: false, error: "PAYMENT_ORDER_LOOKUP_FAILED" }, 503);
  if (existing && (Math.round(Number(existing.amount_inr) * 100) !== amountPaise || existing.currency !== "INR")) {
    return json({ ok: false, error: "PAYMENT_ORDER_AMOUNT_CONFLICT" }, 409);
  }

  const { data: authResult, error: authLookupError } = await ctx.supabaseAdmin.auth.admin.getUserById(customerUserId);
  if (authLookupError || !authResult?.user) return json({ ok: false, error: "CUSTOMER_PROFILE_LOOKUP_FAILED" }, 503);
  const address = order.delivery_address && typeof order.delivery_address === "object"
    ? order.delivery_address as Record<string, unknown>
    : {};
  const rawPhone = String(authResult.user.phone || address.phone || address.mobile || "");
  const customerPhone = rawPhone.replace(/\D/g, "").slice(-10);
  if (!/^\d{10}$/.test(customerPhone)) return json({ ok: false, error: "CUSTOMER_PHONE_REQUIRED" }, 409);

  const cashfreeOrderId = `WE4ALL-${orderId}`;
  if (!CASHFREE_ORDER_PATTERN.test(cashfreeOrderId)) return json({ ok: false, error: "INVALID_CASHFREE_ORDER_ID" }, 500);
  const notifyUrl = `${(Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "")}/functions/v1/we4all-cashfree-webhook`;
  if (!notifyUrl.startsWith("https://")) return json({ ok: false, error: "SUPABASE_URL_NOT_CONFIGURED" }, 503);

  const apiHeaders = cashfreeHeaders(clientId, clientSecret, apiVersion);
  const requestBody = {
    order_id: cashfreeOrderId,
    order_amount: amountInr,
    order_currency: "INR",
    customer_details: {
      customer_id: customerUserId,
      customer_phone: customerPhone,
      ...(authResult.user.email ? { customer_email: authResult.user.email } : {})
    },
    order_meta: {
      payment_methods: "upi",
      notify_url: notifyUrl
    },
    order_note: `WE4ALL ${String(order.order_number).slice(0, 80)}`
  };

  let cashfreeOrder: Record<string, unknown> | null = null;
  let gatewayErrorStatus = 0;
  try {
    const response = await fetch(`${baseUrl}/orders`, {
      method: "POST",
      headers: { ...apiHeaders, "x-idempotency-key": orderId },
      body: JSON.stringify(requestBody)
    });
    gatewayErrorStatus = response.status;
    if (response.ok) cashfreeOrder = await readJson(response);
    else if (response.status === 409) {
      // The first request may have reached Cashfree even if the local ledger
      // write failed. Recover the deterministic provider order by ID.
      const existingResponse = await fetch(`${baseUrl}/orders/${encodeURIComponent(cashfreeOrderId)}`, {
        headers: apiHeaders
      });
      if (existingResponse.ok) cashfreeOrder = await readJson(existingResponse);
    }
  } catch {
    return json({ ok: false, error: "CASHFREE_UNREACHABLE" }, 502);
  }
  if (!cashfreeOrder) {
    console.error("Cashfree order creation failed with status:", gatewayErrorStatus || "NO_RESPONSE");
    return json({ ok: false, error: "CASHFREE_ORDER_CREATION_FAILED" }, 502);
  }

  const returnedOrderId = String(cashfreeOrder.order_id || "");
  const paymentSessionId = String(cashfreeOrder.payment_session_id || "");
  if (returnedOrderId !== cashfreeOrderId || !paymentSessionId ||
      Math.round(Number(cashfreeOrder.order_amount) * 100) !== amountPaise || cashfreeOrder.order_currency !== "INR") {
    return json({ ok: false, error: "INVALID_CASHFREE_ORDER_RESPONSE" }, 502);
  }

  const safePayload = {
    order_id: returnedOrderId,
    cf_order_id: String(cashfreeOrder.cf_order_id || ""),
    order_amount: amountInr,
    order_currency: "INR",
    order_status: String(cashfreeOrder.order_status || "ACTIVE")
  };
  const { data: recorded, error: recordError } = await ctx.supabaseAdmin.rpc("we4all_record_cashfree_order", {
    p_order_id: orderId,
    p_customer_user_id: customerUserId,
    p_provider_order_id: returnedOrderId,
    p_amount_paise: amountPaise,
    p_provider_payload: safePayload
  });
  if (recordError) {
    console.error("Cashfree order linkage failed:", recordError.code || "DATABASE_ERROR");
    return json({ ok: false, error: "PAYMENT_ORDER_RECORDING_FAILED" }, 500);
  }
  const saved = Array.isArray(recorded) ? recorded[0] : recorded;
  if (!saved?.ok || saved.provider_order_id !== returnedOrderId) {
    return json({ ok: false, error: "INVALID_PAYMENT_ORDER_RESULT" }, 502);
  }

  return json({
    ok: true,
    provider: "cashfree",
    mode,
    cashfreeOrderId: returnedOrderId,
    paymentSessionId,
    amountPaise,
    currency: "INR",
    orderReference: order.order_number
  });
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: CORS_HEADERS });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
