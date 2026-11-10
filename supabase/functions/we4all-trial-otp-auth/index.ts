import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";

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
const trialLoginEmail = (phone: string) => `w4all-${phone.replace(/\D/g, "")}@login.we4all.invalid`;

async function trialPinSession(url: string, anonKey: string, phone: string, pin: string) {
  const email = trialLoginEmail(phone);
  const publicClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await publicClient.auth.signInWithPassword({ email, password: pin });
  const user = result.data.user;
  const legacyTrial = user?.email === email && user?.user_metadata?.trial_phone_verification === true;
  if (result.error || !user || user.phone?.replace(/\D/g, "") !== phone.replace(/\D/g, "") ||
      !(user.app_metadata.we4all_trial_account === true || legacyTrial)) {
    if (result.data.session) await publicClient.auth.signOut({ scope: "local" });
    return { data: null, error: new Error("Invalid mobile number or PIN.") };
  }
  return result;
}

async function savePendingPartnerApplication(admin: SupabaseClient, body: Record<string, unknown>, userId: string, phone: string) {
  const role = String(body.requested_role || "");
  if (!roles.has(role) || role === "customer") return { id: null, marketId: null };
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Add a valid business GPS location before submitting the partner application.");
  }

  const { data: roleSetting, error: roleError } = await admin.from("we4all_registration_roles")
    .select("enabled").eq("role_key", role).maybeSingle();
  if (roleError) throw roleError;
  if (!roleSetting?.enabled) throw new Error("This partner role is currently closed for registration.");

  const area = String(body.area || "").trim().slice(0, 100);
  const businessName = String(body.business_name || "").trim().slice(0, 120);
  const fullName = String(body.full_name || "").trim().slice(0, 120);
  const latitudeCell = Math.floor(latitude * 20 + 0.5);
  const longitudeCell = Math.floor(longitude * 20 + 0.5);
  const marketId = `m_${latitudeCell}_${longitudeCell}`;
  const { data: market, error: marketReadError } = await admin.from("we4all_markets").select("id").eq("id", marketId).maybeSingle();
  if (marketReadError) throw marketReadError;
  if (!market) {
    const { error: marketInsertError } = await admin.from("we4all_markets").insert({
      id: marketId,
      display_name: area || `Local market ${marketId}`,
      center_lat: latitudeCell / 20,
      center_lng: longitudeCell / 20,
      state_name: "",
      active: true
    });
    if (marketInsertError && marketInsertError.code !== "23505") throw marketInsertError;
  }

  const profilePayload = {
    user_id: userId, full_name: fullName, business_name: businessName,
    phone, area, updated_at: new Date().toISOString()
  };
  const { error: profileError } = await admin.from("we4all_profiles").upsert(profilePayload, { onConflict: "user_id" });
  if (profileError) throw profileError;

  const { data: pending, error: pendingError } = await admin.from("we4all_partner_applications")
    .select("id,application_payload").eq("user_id", userId).eq("requested_role", role).eq("status", "pending")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (pendingError) throw pendingError;
  const applicationPayload = {
    ...(pending?.application_payload || {}),
    full_name: fullName,
    business_name: businessName,
    phone,
    area,
    zone_id: marketId,
    market_id: marketId,
    latitude,
    longitude,
    partner_details: body.partner_details && typeof body.partner_details === "object" ? body.partner_details : {},
    kyc: pending?.application_payload?.kyc || { status: "not_submitted", files: {} }
  };

  if (pending?.id) {
    const { error } = await admin.from("we4all_partner_applications").update({ application_payload: applicationPayload }).eq("id", pending.id);
    if (error) throw error;
    return { id: pending.id, marketId };
  }
  const { data: inserted, error: insertError } = await admin.from("we4all_partner_applications").insert({
    user_id: userId, requested_role: role, application_payload: applicationPayload, status: "pending"
  }).select("id").single();
  if (insertError) throw insertError;
  return { id: inserted.id, marketId };
}

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

    if (action === "trial_pin_login") {
      const pin = String(body?.pin || "");
      if (!/^\d{6}$/.test(pin)) return json({ ok: false, error: "Enter your six-digit PIN." }, 400);
      const signedIn = await trialPinSession(url, anonKey, phone, pin);
      if (signedIn.error || !signedIn.data?.session) return json({ ok: false, error: signedIn.error?.message || "Invalid mobile number or PIN." }, 401);
      return json({ ok: true, user: signedIn.data.user, session: signedIn.data.session, trial_only: true });
    }

    const phoneHash = await hash(`${pepper}:${phone}`);

    const allowedTrialPhones = (Deno.env.get("WE4ALL_TRIAL_OTP_ALLOWED_PHONES") || "").split(",").map(value => value.trim());
    if ((action === "request" || action === "verify") && !allowedTrialPhones.includes(phone)) {
      return json({ ok: false, error: "Use an authorized private test number or register by email." }, 403);
    }

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
        phone, phone_confirm: true, password: pin,
        email: trialLoginEmail(phone), email_confirm: true,
        user_metadata: metadata, app_metadata: { we4all_trial_account: true }
      });
      const userId = created?.user?.id;
      if (createError || !userId) {
        return json({ ok: false, error: "This test account could not be created. If already registered, use its existing PIN." }, 409);
      }

      let pendingApplication: { id: string | null; marketId: string | null } = { id: null, marketId: null };
      if (requestedRole !== "customer") {
        pendingApplication = await savePendingPartnerApplication(admin, body, userId, phone);
      }

      const signedIn = await trialPinSession(url, anonKey, phone, pin);
      const signInError = signedIn.error;
      if (signInError || !signedIn.data?.session) {
        console.error("Trial account created but sign-in could not be issued", signInError?.message || "missing session");
        if (pendingApplication.id) {
          return json({
            ok: true, user_id: userId, pending_review: true, trial_only: true,
            partner_application_id: pendingApplication.id, market_id: pendingApplication.marketId,
            message: "Partner application submitted for Founder/Admin review. Partner portal access remains locked until approval."
          });
        }
        return json({ ok: false, error: "Account created, but PIN sign-in is unavailable. Enable the Supabase phone provider or contact the Founder." }, 503);
      }
      return json({
        ok: true, user: signedIn.data.user, session: signedIn.data.session, trial_only: true,
        pending_review: Boolean(pendingApplication.id), partner_application_id: pendingApplication.id,
        market_id: pendingApplication.marketId
      });
    }
    return json({ ok: false, error: "Unsupported trial OTP action." }, 400);
  } catch (error) {
    console.error("Trial OTP auth request failed", error instanceof Error ? error.message : "unknown error");
    return json({ ok: false, error: "Trial registration could not be completed." }, 500);
  }
});
