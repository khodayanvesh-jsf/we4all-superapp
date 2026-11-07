import { withSupabase } from "npm:@supabase/server@1.9.2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-we4all-signature",
  "Access-Control-Max-Age": "86400"
};
const MAX_BODY_BYTES = 16 * 1024;
const MAX_EVENT_AGE_SECONDS = 300;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function toHex(bytes: Uint8Array) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeHexEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function verifySignature(rawBody: string, signatureHeader: string, secret: string) {
  const match = /^v1=([0-9a-f]{64})$/i.exec(signatureHeader.trim());
  if (!match) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return constantTimeHexEqual(toHex(new Uint8Array(signed)), match[1].toLowerCase());
}

const handler = withSupabase({ auth: "none" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const secret = Deno.env.get("WE4ALL_PAYMENT_WEBHOOK_SECRET") || "";
  const expectedProvider = Deno.env.get("WE4ALL_PAYMENT_PROVIDER") || "";
  if (new TextEncoder().encode(secret).length < 32 || !/^[a-z0-9][a-z0-9._-]{1,79}$/.test(expectedProvider)) {
    return json({ ok: false, error: "PAYMENT_WEBHOOK_NOT_CONFIGURED" }, 503);
  }

  let rawBody = "";
  let event: Record<string, unknown>;
  try {
    rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return json({ ok: false, error: "REQUEST_TOO_LARGE" }, 413);
    }
    event = JSON.parse(rawBody);
    if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("Invalid event");
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400);
  }

  const signature = req.headers.get("x-we4all-signature") || "";
  let signatureVerified = false;
  try {
    signatureVerified = await verifySignature(rawBody, signature, secret);
  } catch {
    return json({ ok: false, error: "SIGNATURE_VERIFICATION_FAILED" }, 401);
  }
  if (!signatureVerified) return json({ ok: false, error: "INVALID_SIGNATURE" }, 401);

  const nowSeconds = Math.floor(Date.now() / 1000);
  const issuedAt = Number(event.issuedAt);
  if (!Number.isInteger(issuedAt) || Math.abs(nowSeconds - issuedAt) > MAX_EVENT_AGE_SECONDS) {
    return json({ ok: false, error: "STALE_OR_INVALID_EVENT_TIMESTAMP" }, 401);
  }

  const provider = String(event.provider || "");
  const eventId = String(event.eventId || "");
  const eventType = String(event.eventType || "");
  const orderId = String(event.orderId || "");
  const orderReference = String(event.orderReference || "");
  const paymentId = String(event.paymentId || "");
  const providerOrderId = event.providerOrderId == null ? null : String(event.providerOrderId);
  const amountPaise = Number(event.amountPaise);
  const currency = String(event.currency || "");

  if (
    event.schemaVersion !== 1 ||
    provider !== expectedProvider ||
    !REFERENCE_PATTERN.test(eventId) ||
    !["payment.captured", "payment.failed"].includes(eventType) ||
    !UUID_PATTERN.test(orderId) ||
    !REFERENCE_PATTERN.test(orderReference) ||
    !REFERENCE_PATTERN.test(paymentId) ||
    (providerOrderId !== null && !REFERENCE_PATTERN.test(providerOrderId)) ||
    !Number.isSafeInteger(amountPaise) || amountPaise < 1 || amountPaise > 999999999999 ||
    currency !== "INR"
  ) {
    return json({ ok: false, error: "INVALID_NORMALIZED_PAYMENT_EVENT" }, 400);
  }

  const { data, error } = await ctx.supabaseAdmin.rpc("we4all_process_payment_event", {
    p_provider: provider,
    p_provider_event_id: eventId,
    p_event_type: eventType,
    p_event_payload: event,
    p_order_id: orderId,
    p_order_reference: orderReference,
    p_provider_payment_id: paymentId,
    p_provider_order_id: providerOrderId,
    p_amount_paise: amountPaise,
    p_currency: currency,
    p_signature_verified: true
  });

  if (error) {
    console.error("WE4ALL payment event processing failed:", error.code || "DATABASE_ERROR");
    return json({ ok: false, error: "PAYMENT_EVENT_PROCESSING_FAILED" }, 500);
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.ok) return json({ ok: false, error: "INVALID_PAYMENT_PROCESSING_RESULT" }, 502);
  return json(result, result.processed === false ? 202 : 200);
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: CORS_HEADERS });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
});
