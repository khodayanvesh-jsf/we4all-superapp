import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};
const BOOTSTRAP_USERNAME = "KhodayAnesh";
const BOOTSTRAP_EMAIL = "founder-bootstrap@we4all.invalid";
const BOOTSTRAP_PASSWORD_SHA256 = "41b69b9ab88bc25ceb8d74812a663e0800c59b25f7f6a08b174bbef9a4e4fbdc";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const sha256 = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, "0")).join("");
};
const secureEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

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
    if (!/^[A-Za-z0-9._-]{3,64}$/.test(username) || password.length < 8 || password.length > 256) {
      return json({ ok: false, error: "Check the Founder username and password." }, 401);
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    const requested = username.toLowerCase();
    const founder = (list?.users || []).find((user) =>
      user.app_metadata?.we4all_role === "founder" &&
      String(user.app_metadata?.we4all_username || "").toLowerCase() === requested
    ) || null;
    let accountEmail = founder?.email || "";
    if (!founder) {
      const matchesBootstrap = requested === BOOTSTRAP_USERNAME.toLowerCase() &&
        secureEqual(await sha256(password), BOOTSTRAP_PASSWORD_SHA256);
      if (!matchesBootstrap) return json({ ok: false, error: "Founder sign-in failed. Check the username and password." }, 401);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: BOOTSTRAP_EMAIL,
        email_confirm: true,
        password,
        app_metadata: {
          we4all_role: "founder",
          we4all_username: BOOTSTRAP_USERNAME,
          we4all_bootstrap_required: true
        },
        user_metadata: { full_name: "WE4ALL Founder" }
      });
      if (createError || !created?.user?.id) {
        return json({ ok: false, error: "Founder bootstrap is already initialized. Sign in with the current credentials or use account recovery." }, 409);
      }
      accountEmail = created.user.email || BOOTSTRAP_EMAIL;
    }
    const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signedIn, error: signInError } = await publicClient.auth.signInWithPassword({ email: accountEmail, password });
    if (signInError || !signedIn?.session) {
      console.error("Founder sign-in rejected", signInError?.message || "missing session");
      return json({ ok: false, error: "Founder sign-in failed. Check the username and password." }, 401);
    }
    return json({
      ok: true,
      user: signedIn.user,
      session: signedIn.session,
      must_change_password: signedIn.user?.app_metadata?.we4all_bootstrap_required === true
    });
  } catch (error) {
    console.error("Founder auth request failed", error instanceof Error ? error.message : "unknown error");
    return json({ ok: false, error: "Founder sign-in service failed." }, 500);
  }
});

