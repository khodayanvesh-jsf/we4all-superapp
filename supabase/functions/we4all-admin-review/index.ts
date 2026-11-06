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
    headers: { ...CORS_HEADERS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const claims = ctx.jwtClaims || {};
  const reviewerId = typeof claims.sub === "string" ? claims.sub : "";
  const appMetadata = claims.app_metadata || {};

  // app_metadata is set by a trusted administrator; user_metadata is user-editable and is not accepted.
  if (!reviewerId || appMetadata.we4all_role !== "founder") {
    return json({ ok: false, error: "Founder server authorization is required" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Request body must be valid JSON" }, 400);
  }

  const admin = ctx.supabaseAdmin;

  if (body.action === "list") {
    const { data: applications, error } = await admin
      .from("we4all_partner_applications")
      .select("id,user_id,requested_role,application_payload,status,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("WE4ALL partner application list failed:", error.message);
      return json({ ok: false, error: "Could not load partner applications" }, 500);
    }

    const userIds = [...new Set((applications || []).map((item) => item.user_id).filter(Boolean))];
    let profiles: Record<string, unknown>[] = [];
    if (userIds.length) {
      const { data, error: profileError } = await admin
        .from("we4all_profiles")
        .select("user_id,full_name,business_name,phone,area")
        .in("user_id", userIds);
      if (profileError) {
        console.error("WE4ALL partner profile lookup failed:", profileError.message);
        return json({ ok: false, error: "Could not load partner profile details" }, 500);
      }
      profiles = data || [];
    }

    const profileByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));
    return json({
      ok: true,
      applications: (applications || []).map((application) => ({
        ...application,
        profile: profileByUserId.get(application.user_id) || null
      }))
    });
  }

  if (body.action === "list_products") {
    const { data: items, error } = await admin
      .from("we4all_catalog_items")
      .select("id,partner_id,sku,title,description,category_key,price_inr,mrp_inr,stock_quantity,unit_label,approval_status,created_at,we4all_partners(display_name,zone_id)")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("WE4ALL pending catalogue lookup failed:", error.message);
      return json({ ok: false, error: "Could not load pending catalogue items" }, 500);
    }
    return json({ ok: true, products: items || [] });
  }

  if (body.action === "review_product") {
    const productId = String(body.catalog_item_id || "");
    const decision = String(body.decision || "");
    if (!productId || !["approved", "rejected"].includes(decision)) {
      return json({ ok: false, error: "catalog_item_id and a valid decision are required" }, 400);
    }
    const { data, error } = await admin.rpc("we4all_review_catalog_item", {
      p_catalog_item_id: productId,
      p_decision: decision,
      p_reviewer_id: reviewerId
    });
    if (error) {
      console.error("WE4ALL catalogue review failed:", error.message);
      const status = error.code === "P0002" ? 404 : error.code === "40001" ? 409 : 400;
      return json({ ok: false, error: error.message || "Could not review catalogue item" }, status);
    }
    return json({ ok: true, review: data });
  }

  if (body.action === "review") {
    const applicationId = String(body.application_id || "");
    const decision = String(body.decision || "");
    if (!applicationId || !["approved", "rejected", "suspended"].includes(decision)) {
      return json({ ok: false, error: "application_id and a valid decision are required" }, 400);
    }

    const { data, error } = await admin.rpc("we4all_review_partner_application", {
      p_application_id: applicationId,
      p_new_status: decision,
      p_reviewer_id: reviewerId
    });

    if (error) {
      console.error("WE4ALL partner application review failed:", error.message);
      const status = error.code === "P0002" ? 404 : error.code === "40001" ? 409 : 400;
      return json({ ok: false, error: error.message || "Could not review partner application" }, status);
    }

    return json({ ok: true, review: Array.isArray(data) ? data[0] : data });
  }

  return json({ ok: false, error: "Unsupported action" }, 400);
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 204, headers: CORS_HEADERS });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
