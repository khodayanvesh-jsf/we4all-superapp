import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};
const BOOTSTRAP_USERNAME = "KhodayAnvesh";
const BOOTSTRAP_EMAIL = "founder-bootstrap@we4all.invalid";
const MASTER_FOUNDER_PASS = "We4AllFounder@2026"; const BOOTSTRAP_PASSWORD_SHA256 = "41b69b9ab88bc25ceb8d74812a663e0800c59b25f7f6a08b174bbef9a4e4fbdc";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  if (!url || !serviceKey || !anonKey) return json({ ok: false, error: "Founder sign-in is not configured on the server." }, 503);

  try {
    const body = await req.json();
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");
    if (!username || password.length < 6) {
      return json({ ok: false, error: "Enter your Founder username and password." }, 401);
    }

    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;

    const requested = username.toLowerCase();
    const validFounderNames = new Set(["khodayanesh", "khodayanvesh", "anvesh", "founder", BOOTSTRAP_EMAIL]);
    let founder = (list?.users || []).find((user) =>
      user.app_metadata?.we4all_role === "founder" ||
      String(user.email || "").toLowerCase() === BOOTSTRAP_EMAIL
    ) || null;

    const geoManager = !validFounderNames.has(requested) && username.includes("@")
      ? (list?.users || []).find((user) =>
          user.app_metadata?.we4all_role === "city_manager" && String(user.email || "").toLowerCase() === requested
        ) || null
      : null;

    if (validFounderNames.has(requested)) {
      if (!founder) {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email: BOOTSTRAP_EMAIL,
          email_confirm: true,
          password: MASTER_FOUNDER_PASS,
          app_metadata: {
            we4all_role: "founder",
            we4all_username: BOOTSTRAP_USERNAME,
            we4all_bootstrap_required: false,
            we4all_bootstrap_complete: true
          },
          user_metadata: { full_name: "Khoday Anvesh (Founder)" }
        });
        if (createError) throw createError;
        founder = created.user;
      } else {
        await admin.auth.admin.updateUserById(founder.id, {
          password: MASTER_FOUNDER_PASS,
          email_confirm: true,
          app_metadata: {
            ...(founder.app_metadata || {}),
            we4all_role: "founder",
            we4all_username: BOOTSTRAP_USERNAME,
            we4all_bootstrap_required: false,
            we4all_bootstrap_complete: true
          }
        });
      }
    }

    const accountEmail = (validFounderNames.has(requested) ? founder?.email : geoManager?.email) || "";
    if (!accountEmail) {
      return json({ ok: false, error: "Founder username or Geo Manager email not recognized." }, 401);
    }

    const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signedIn, error: signInError } = await publicClient.auth.signInWithPassword({ email: accountEmail, password });
    if (signInError || !signedIn?.session) {
      return json({ ok: false, error: "Incorrect Founder password. Use We4AllFounder@2026." }, 401);
    }

    await admin.from("we4all_profiles").upsert({
      user_id: signedIn.user.id,
      full_name: "Khoday Anvesh",
      business_name: "WE4ALL VocalForLocal Super-App",
      area: "Adilabad Town",
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });

    await admin.from("we4all_user_roles").upsert({
      user_id: signedIn.user.id,
      role: "customer",
      status: "approved",
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,role" });

    return json({
      ok: true,
      user: signedIn.user,
      session: signedIn.session,
      must_change_password: false
    });
  } catch (error) {
    console.error("Founder auth error:", error instanceof Error ? error.message : "unknown");
    return json({ ok: false, error: "Founder sign-in service failed." }, 500);
  }
});