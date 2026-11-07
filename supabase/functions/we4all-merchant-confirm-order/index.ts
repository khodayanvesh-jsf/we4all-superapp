import { withSupabase } from "npm:@supabase/server@1.9.2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const claims = ctx.jwtClaims || {};
  const merchantUserId = typeof claims.sub === "string" ? claims.sub : "";
  if (!UUID_PATTERN.test(merchantUserId)) {
    return json({ ok: false, error: "AUTH_REQUIRED" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 4096) return json({ ok: false, error: "REQUEST_TOO_LARGE" }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400);
  }

  const orderId = String(body.orderId || "");
  if (!UUID_PATTERN.test(orderId)) {
    return json({ ok: false, error: "INVALID_ORDER_ID" }, 400);
  }

  const { data, error } = await ctx.supabaseAdmin.rpc("we4all_merchant_confirm_order", {
    p_order_id: orderId,
    p_merchant_user_id: merchantUserId
  });

  if (error) {
    const message = error.message || "";
    if (message.includes("APPROVED_MERCHANT_REQUIRED")) {
      return json({ ok: false, error: "APPROVED_MERCHANT_REQUIRED" }, 403);
    }
    if (message.includes("ORDER_NOT_FOUND_OR_NOT_OWNED")) {
      return json({ ok: false, error: "ORDER_NOT_FOUND" }, 404);
    }
    if (message.includes("ORDER_NOT_CONFIRMABLE")) {
      return json({ ok: false, error: "ORDER_NOT_CONFIRMABLE" }, 409);
    }
    console.error("WE4ALL merchant order confirmation failed:", error.code || "DATABASE_ERROR");
    return json({ ok: false, error: "ORDER_CONFIRMATION_FAILED" }, 500);
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.ok || !result?.order_id || !result?.status) {
    return json({ ok: false, error: "INVALID_SERVER_CONFIRMATION" }, 502);
  }
  return json({ ok: true, ...result });
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
