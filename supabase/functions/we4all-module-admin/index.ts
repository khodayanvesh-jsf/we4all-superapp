import { withSupabase } from "npm:@supabase/server@1.9.2";
import { createAdminClient } from "npm:@supabase/server@1.9.2/core";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });

const handler = withSupabase({ auth: "user" }, async (req: Request, ctx) => {
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  const claims = ctx.jwtClaims || {};
  const actorId = typeof claims.sub === "string" ? claims.sub : "";
  if (!actorId || claims.app_metadata?.we4all_role !== "founder") {
    return json({ ok: false, error: "FOUNDER_AUTHORIZATION_REQUIRED" }, 403);
  }

  if (claims.aal !== "aal2" || claims.app_metadata?.we4all_bootstrap_required === true) {
    return json({ ok: false, error: "FOUNDER_STEP_UP_REQUIRED" }, 403);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ ok: false, error: "INVALID_JSON_BODY" }, 400); }

  const admin = createAdminClient({ auth: { keyName: "we4allbackendrotation202611" } });

  if (body.action === "list") {
    const { data, error } = await admin.from("we4all_dynamic_modules")
      .select("id,module_key,title,description,icon,category_key,portal_target,zone_codes,visibility_roles,is_public,sort_order,status,version,module_config,is_system,created_at,updated_at,published_at")
      .order("sort_order", { ascending: true }).order("module_key", { ascending: true });
    if (error) {
      console.error("Dynamic module list failed:", error.message);
      return json({ ok: false, error: "DYNAMIC_MODULE_LIST_FAILED" }, 500);
    }
    return json({ ok: true, modules: data || [] });
  }

  if (body.action === "save_draft") {
    const moduleKey = String(body.moduleKey || "").trim().toLowerCase();
    const title = String(body.title || "").trim();
    const config = body.moduleConfig && typeof body.moduleConfig === "object" && !Array.isArray(body.moduleConfig)
      ? body.moduleConfig : {};
    if (!/^[a-z][a-z0-9_]{1,48}$/.test(moduleKey) || title.length < 2 || title.length > 80) {
      return json({ ok: false, error: "INVALID_MODULE_KEY_OR_TITLE" }, 400);
    }
    const configText = JSON.stringify(config);
    if (new TextEncoder().encode(configText).length > 32768) return json({ ok: false, error: "MODULE_CONFIG_TOO_LARGE" }, 400);
    for (const key of ["script", "html", "javascript", "eval"]) {
      if (Object.prototype.hasOwnProperty.call(config, key)) return json({ ok: false, error: "EXECUTABLE_MODULE_CONFIG_NOT_ALLOWED" }, 400);
    }
    const portalTarget = String(body.portalTarget || "customer");
    const allowedTargets = ["customer","merchant","service_provider","decorator","rider","labour","founder"];
    if (!allowedTargets.includes(portalTarget)) return json({ ok: false, error: "INVALID_PORTAL_TARGET" }, 400);
    const { data, error } = await admin.rpc("we4all_save_dynamic_module", {
      p_module_key: moduleKey,
      p_title: title,
      p_description: String(body.description || "").slice(0, 500),
      p_icon: String(body.icon || "grid").slice(0, 32),
      p_category_key: String(body.categoryKey || "custom").slice(0, 48),
      p_portal_target: portalTarget,
      p_zone_codes: Array.isArray(body.zoneCodes) ? body.zoneCodes.slice(0, 50).map(String) : ["*"],
      p_visibility_roles: Array.isArray(body.visibilityRoles) ? body.visibilityRoles.slice(0, 10).map(String) : ["customer"],
      p_is_public: body.isPublic !== false,
      p_sort_order: Number.isInteger(body.sortOrder) ? body.sortOrder : 100,
      p_module_config: config,
      p_actor_user_id: actorId
    });
    if (error) {
      console.error("Dynamic module draft save failed:", error.message);
      return json({ ok: false, error: "DYNAMIC_MODULE_SAVE_FAILED" }, 400);
    }
    return json({ ok: true, result: data });
  }

  if (body.action === "publish" || body.action === "disable") {
    const moduleId = String(body.moduleId || "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(moduleId)) {
      return json({ ok: false, error: "INVALID_MODULE_ID" }, 400);
    }
    const targetStatus = body.action === "publish" ? "published" : "disabled";
    const { data, error } = await admin.rpc("we4all_set_dynamic_module_status", {
      p_module_id: moduleId,
      p_status: targetStatus,
      p_actor_user_id: actorId
    });
    if (error) {
      console.error("Dynamic module status change failed:", error.message);
      return json({ ok: false, error: "DYNAMIC_MODULE_STATUS_FAILED" }, 400);
    }
    return json({ ok: true, result: data });
  }

  return json({ ok: false, error: "UNSUPPORTED_ACTION" }, 400);
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
