const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const CASHFREE_ORDER_PATTERN = /^[A-Za-z0-9_-]{3,45}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function verifyCashfreeSignature(secret: string, timestamp: string, rawBody: string, signature: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp + rawBody)));
  const expected = toBase64(digest);
  if (expected.length !== signature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  const secret = Deno.env.get("CASHFREE_CLIENT_SECRET") || "";
  if (!secret) return json({ ok: false, error: "CASHFREE_NOT_CONFIGURED" }, 503);

  const timestamp = req.headers.get("x-webhook-timestamp") || "";
  const signature = req.headers.get("x-webhook-signature") || "";
  if (!timestamp || !signature || timestamp.length > 80 || signature.length > 512) {
    return json({ ok: false, error: "MISSING_WEBHOOK_SIGNATURE" }, 401);
  }

  const rawBody = await req.text();
  if (rawBody.length > 1_000_000) return json({ ok: false, error: "WEBHOOK_TOO_LARGE" }, 413);
  let signatureValid = false;
  try { signatureValid = await verifyCashfreeSignature(secret, timestamp, rawBody, signature); }
  catch { signatureValid = false; }
  if (!signatureValid) return json({ ok: false, error: "INVALID_WEBHOOK_SIGNATURE" }, 401);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (!isRecord(parsed)) throw new Error("Invalid webhook object");
    body = parsed;
  } catch {
    return json({ ok: false, error: "INVALID_WEBHOOK_JSON" }, 400);
  }

  const eventName = String(body.type || "");
  if (!new Set(["PAYMENT_SUCCESS_WEBHOOK", "PAYMENT_FAILED_WEBHOOK"]).has(eventName)) {
    // Other Cashfree events are not payment-finalization events for this adapter.
    return json({ ok: true, ignored: true });
  }
  const data = isRecord(body.data) ? body.data : {};
  const providerOrder = isRecord(data.order) ? data.order : {};
  const payment = isRecord(data.payment) ? data.payment : {};
  const providerOrderId = String(providerOrder.order_id || "");
  const paymentId = String(payment.cf_payment_id || "");
  const paymentStatus = String(payment.payment_status || "");
  const eventType = eventName === "PAYMENT_SUCCESS_WEBHOOK" ? "payment.captured" : "payment.failed";
  const wantedStatus = eventType === "payment.captured" ? "SUCCESS" : "FAILED";
  if (!CASHFREE_ORDER_PATTERN.test(providerOrderId) || !paymentId || paymentId.length > 160 || paymentStatus !== wantedStatus) {
    return json({ ok: false, error: "INVALID_PAYMENT_EVENT" }, 400);
  }

  const orderId = providerOrderId.startsWith("WE4ALL-") ? providerOrderId.slice("WE4ALL-".length) : "";
  if (!UUID_PATTERN.test(orderId)) return json({ ok: false, error: "UNKNOWN_CASHFREE_ORDER" }, 404);
  const amountPaise = Math.round(Number(payment.payment_amount) * 100);
  const orderAmountPaise = Math.round(Number(providerOrder.order_amount) * 100);
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100 || orderAmountPaise !== amountPaise ||
      payment.payment_currency !== "INR" || providerOrder.order_currency !== "INR") {
    return json({ ok: false, error: "PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH" }, 409);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) return json({ ok: false, error: "PAYMENT_PROCESSOR_NOT_CONFIGURED" }, 503);
  const headers = { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, "content-type": "application/json" };

  const lookupUrl = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/we4all_payment_transactions`);
  lookupUrl.searchParams.set("select", "order_id,customer_user_id,provider_order_id,amount_inr,currency");
  lookupUrl.searchParams.set("provider", "eq.cashfree");
  lookupUrl.searchParams.set("provider_order_id", `eq.${providerOrderId}`);
  lookupUrl.searchParams.set("order_id", `eq.${orderId}`);
  lookupUrl.searchParams.set("limit", "1");
  let linkageResponse: Response;
  try { linkageResponse = await fetch(lookupUrl, { headers }); }
  catch { return json({ ok: false, error: "PAYMENT_LEDGER_UNREACHABLE" }, 502); }
  if (!linkageResponse.ok) return json({ ok: false, error: "PAYMENT_LEDGER_LOOKUP_FAILED" }, 502);
  let linkRows: unknown;
  try { linkRows = await linkageResponse.json(); } catch { return json({ ok: false, error: "INVALID_PAYMENT_LEDGER_RESPONSE" }, 502); }
  const linkage = Array.isArray(linkRows) && isRecord(linkRows[0]) ? linkRows[0] : null;
  if (!linkage) return json({ ok: false, error: "PAYMENT_ORDER_LINK_NOT_FOUND" }, 404);
  if (Math.round(Number(linkage.amount_inr) * 100) !== amountPaise || linkage.currency !== "INR") {
    return json({ ok: false, error: "PAYMENT_LEDGER_AMOUNT_MISMATCH" }, 409);
  }

  const orderUrl = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/we4all_orders`);
  orderUrl.searchParams.set("select", "id,order_number,total_inr");
  orderUrl.searchParams.set("id", `eq.${orderId}`);
  orderUrl.searchParams.set("limit", "1");
  let orderResponse: Response;
  try { orderResponse = await fetch(orderUrl, { headers }); }
  catch { return json({ ok: false, error: "ORDER_LEDGER_UNREACHABLE" }, 502); }
  if (!orderResponse.ok) return json({ ok: false, error: "ORDER_LEDGER_LOOKUP_FAILED" }, 502);
  let orderRows: unknown;
  try { orderRows = await orderResponse.json(); } catch { return json({ ok: false, error: "INVALID_ORDER_LEDGER_RESPONSE" }, 502); }
  const order = Array.isArray(orderRows) && isRecord(orderRows[0]) ? orderRows[0] : null;
  if (!order || Math.round(Number(order.total_inr) * 100) !== amountPaise) {
    return json({ ok: false, error: "ORDER_AMOUNT_MISMATCH" }, 409);
  }

  const eventId = `cashfree:${paymentId}:${eventType}`;
  if (eventId.length > 160) return json({ ok: false, error: "INVALID_EVENT_ID" }, 400);
  const normalizedEvent = {
    schemaVersion: 1,
    provider: "cashfree",
    eventId,
    eventType,
    issuedAt: Math.floor(Date.now() / 1000),
    orderId,
    orderReference: String(order.order_number),
    paymentId,
    // The deployment's ledger has a unique provider/order index. The
    // provider-order mapping remains on the order-link row; this payment row
    // is identified by provider payment ID.
    providerOrderId: null,
    cashfreeOrderId: providerOrderId,
    amountPaise,
    currency: "INR"
  };
  let rpcResponse: Response;
  try {
    rpcResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/we4all_process_payment_event`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_provider: "cashfree",
        p_provider_event_id: eventId,
        p_event_type: eventType,
        p_event_payload: normalizedEvent,
        p_order_id: orderId,
        p_order_reference: String(order.order_number),
        p_provider_payment_id: paymentId,
        p_provider_order_id: null,
        p_amount_paise: amountPaise,
        p_currency: "INR",
        p_signature_verified: true
      })
    });
  } catch { return json({ ok: false, error: "PAYMENT_PROCESSOR_UNREACHABLE" }, 502); }
  if (!rpcResponse.ok) return json({ ok: false, error: "PAYMENT_PROCESSING_FAILED" }, 502);
  let result: unknown;
  try { result = await rpcResponse.json(); } catch { return json({ ok: false, error: "INVALID_PAYMENT_PROCESSING_RESULT" }, 502); }
  const outcome = Array.isArray(result) ? result[0] : result;
  if (!isRecord(outcome) || outcome.ok !== true) return json({ ok: false, error: "INVALID_PAYMENT_PROCESSING_RESULT" }, 502);
  return json({ ok: true, processed: outcome.processed === true, duplicate: outcome.duplicate === true });
});
