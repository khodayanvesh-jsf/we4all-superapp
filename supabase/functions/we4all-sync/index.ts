import { withSupabase } from "npm:@supabase/server@1.9.2";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, no-cache, must-revalidate"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

Deno.serve(withSupabase({ auth: "user" }, async (req, ctx) => {
  if (!["GET", "PUT", "POST"].includes(req.method)) {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const userId = ctx.jwtClaims?.sub || ctx.userClaims?.sub || ctx.userClaims?.id;
  if (!userId || typeof userId !== "string") {
    return json({ ok: false, error: "A verified Supabase user is required" }, 401);
  }

  const userClient = ctx.supabase;

  if (req.method === "GET") {
    const { data, error } = await userClient
      .from("we4all_user_state")
      .select("state_payload, app_version, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("we4all-sync read failed", error.message);
      return json({ ok: false, error: "Could not load this account's saved state" }, 500);
    }

    return json({
      ok: true,
      user_id: userId,
      state_payload: data?.state_payload || {},
      app_version: data?.app_version || null,
      updated_at: data?.updated_at || null
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Request body must be valid JSON" }, 400);
  }

  const candidate = body?.state_payload;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return json({ ok: false, error: "state_payload must be a JSON object" }, 400);
  }

  const payload = { ...(candidate as Record<string, unknown>) };
  delete payload.founderCredentials;
  delete payload.supabaseSecretKey;
  delete payload.serviceRoleKey;

  const { data, error } = await userClient
    .from("we4all_user_state")
    .upsert({
      user_id: userId,
      state_payload: payload,
      app_version: typeof body.app_version === "string" ? body.app_version.slice(0, 32) : "3.2.8",
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" })
    .select("updated_at")
    .single();

  if (error) {
    console.error("we4all-sync write failed", error.message);
    return json({ ok: false, error: "Could not save this account's state" }, 500);
  }

  return json({ ok: true, user_id: userId, updated_at: data.updated_at });
}));
