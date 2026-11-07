import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400"
};
const roles = new Set(["customer", "merchant", "service_provider", "decorator", "rider", "labour"]);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});
const hash = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((n) => n.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  if (Deno.env.get("WE4ALL_TRIAL_OTP_ENABLED") !== "true" || Deno.env.get("WE4ALL_TRIAL_OTP_ENV") !== "preview") {
    return json({ ok: false, error: "Trial OTP is disabled. Configure a real phone verification provider before enabling registration." }, 503);
  }

  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  const pepper = Deno.env.get("WE4ALL_TRIAL_OTP_PEPPER") || "";
  if (!url || !serviceKey || !anonKey || pepper.length < 32) {
    return json({ ok: false, error: "Trial OTP server configuration is incomplete." }, 503);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await req.json();
    const action = String(body?.action || "");
    const phone = String(body?.phone || "");
    if (!/^\+91[6-9]\d{9}$/.test(phone)) return json({ ok: false, error: "Enter a valid Indian mobile number." }, 400);
    const phoneHash = await hash(`${pepper}:${phone}`);

    if (action === "request") {
      const requestedRole = String(body?.requested_role || "customer");
      if (!roles.has(requestedRole)) return json({ ok: false, error: "Choose one of the available registration roles." }, 400);
      const { data: roleSetting, error: roleError } = await admin.from("we4all_registration_roles")
        .select("enabled").eq("role_key", requestedRole).maybeSingle();
      if (roleError) throw roleError;
      if (!roleSetting?.enabled) return json({ ok: false, error: "This registration role is temporarily closed. Choose an available role." }, 400);
      const fullName = String(body?.full_name || "").trim().slice(0, 120);
      const businessName = String(body?.business_name || "").trim().slice(0, 120);
      if (!fullName || (requestedRole !== "customer" && !businessName)) {
        return json({ ok: false, error: "Complete the required name and partner fields first." }, 400);
      }
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await admin.from("we4all_trial_otp_challenges")
        .select("id", { count: "exact", head: true }).eq("phone_hash", phoneHash).gte("created_at", since);
      if (countError) throw countError;
      if ((count || 0) >= 3) return json({ ok: false, error: "Too many trial codes. Wait one hour or ask the Founder for help." }, 429);

      const id = crypto.randomUUID();
      const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
      const otpHash = await hash(`${pepper}:${phone}:${id}:${code}`);
      const { error: insertError } = await admin.from("we4all_trial_otp_challenges").insert({
        id, phone_hash: phoneHash, otp_hash: otpHash, expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString()
      });
      if (insertError) throw insertError;

      // This code is returned only in an explicitly enabled trial deployment. It is not phone verification.
      return json({ ok: true, challenge_id: id, trial_code: code, expires_in_seconds: 120, trial_only: true });
    }

    if (action === "verify") {
      const challengeId = String(body?.challenge_id || "");
      const code = String(body?.code || "");
      const pin = String(body?.pin || "");
      const requestedRole = String(body?.requested_role || "customer");
      if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code) || !/^\d{6}$/.test(pin) || !roles.has(requestedRole)) {
        return json({ ok: false, error: "The trial code, PIN, or role is invalid." }, 400);
      }
      const otpHash = await hash(`${pepper}:${phone}:${challengeId}:${code}`);
      const { data: consumed, error: consumeError } = await admin.rpc("we4all_consume_trial_otp", {
        p_challenge_id: challengeId, p_phone_hash: phoneHash, p_otp_hash: otpHash
      });
      if (consumeError) throw consumeError;
      if (consumed !== true) return json({ ok: false, error: "That code is invalid, expired, or already used. Request a new code." }, 400);

      const fullName = String(body?.full_name || "").trim().slice(0, 120);
      const businessName = String(body?.business_name || "").trim().slice(0, 120);
      const metadata = {
        full_name: fullName,
        business_name: businessName,
        area: String(body?.area || "").trim().slice(0, 100),
        requested_role: requestedRole,
        zone_id: String(body?.zone_id || "adilabad_master").slice(0, 80),
        trial_phone_verification: true
      };
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        phone, phone_confirm: true, password: pin, user_metadata: metadata
      });
      if (createError || !created?.user?.id) {
        return json({ ok: false, error: "This number may already have an account. Try PIN sign-in or use PIN recovery." }, 409);
      }

      const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data: signedIn, error: signInError } = await publicClient.auth.signInWithPassword({ phone, password: pin });
      if (signInError || !signedIn?.session) {
        console.error("Trial account created but sign-in could not be issued", signInError?.message || "missing session");
        return json({ ok: false, error: "Account created. Sign in using your mobile number and new PIN." }, 500);
      }
      return json({ ok: true, user: signedIn.user, session: signedIn.session, trial_only: true });
    }
    return json({ ok: false, error: "Unsupported trial OTP action." }, 400);
  } catch (error) {
    console.error("Trial OTP auth request failed", error instanceof Error ? error.message : "unknown error");
    return json({ ok: false, error: "Trial registration could not be completed." }, 500);
  }
});
