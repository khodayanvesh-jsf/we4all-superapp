import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
const hex = (bytes: Uint8Array) => Array.from(bytes, n => n.toString(16).padStart(2, "0")).join("");
const digest = async (code: string) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code))));
const isStaff = (user: { app_metadata: Record<string, unknown> }) =>
  ["founder", "city_manager", "admin"].includes(String(user.app_metadata.we4all_role || ""));
const invalid = () => json({ error: "This recovery code could not be used. Try another code or contact support." }, 400);

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !serviceKey || !publicKey) return json({ error: "Recovery service is unavailable." }, 503);
  const authOptions = { auth: { persistSession: false, autoRefreshToken: false } };
  const server = createClient(url, serviceKey, authOptions);

  try {
    const body = await request.json();
    const pin = typeof body?.pin === "string" ? body.pin : "";
    if (!/^\d{6}$/.test(pin)) return json({ error: "Enter a six-digit PIN." }, 400);

    if (body.action === "rotate") {
      const bearer = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
      if (!bearer) return json({ error: "Sign in again to generate backup codes." }, 401);
      const { data, error } = await server.auth.getUser(bearer);
      const user = data?.user;
      if (error || !user || isStaff(user)) return json({ error: "Account cannot generate backup codes." }, 403);
      const identity = user.email && user.email_confirmed_at ? { email: user.email } : { phone: user.phone || "" };
      const verifier = createClient(url, publicKey, authOptions);
      const proof = await verifier.auth.signInWithPassword({ ...identity, password: pin });
      if (proof.error || proof.data.user?.id !== user.id) return json({ error: "Your current PIN could not be verified." }, 401);
      await verifier.auth.signOut({ scope: "local" });
      const codes = Array.from({ length: 4 }, () => hex(crypto.getRandomValues(new Uint8Array(16))));
      const hashes = await Promise.all(codes.map(digest));
      const { error: rotateError } = await server.rpc("we4all_rotate_recovery_codes", { p_user_id: user.id, p_hashes: hashes });
      if (rotateError) throw rotateError;
      return json({ codes });
    }

    if (body.action === "reset") {
      const code = typeof body.code === "string" ? body.code.trim().toLowerCase().replace(/-/g, "") : "";
      if (!/^[a-f0-9]{32}$/.test(code)) return invalid();
      const hash = await digest(code);
      const { data: match, error: lookupError } = await server.from("we4all_account_recovery_codes")
        .select("user_id").eq("code_hash", hash).maybeSingle();
      if (lookupError) throw lookupError;
      if (!match) return invalid();
      const lookup = await server.auth.admin.getUserById(match.user_id);
      const user = lookup.data.user;
      if (lookup.error || !user || isStaff(user)) return invalid();

      // Delete with a predicate and return the row in one statement. Concurrent
      // replays cannot both consume the same code.
      const consumed = await server.from("we4all_account_recovery_codes")
        .delete().eq("code_hash", hash).eq("user_id", match.user_id).select("user_id").maybeSingle();
      if (consumed.error) throw consumed.error;
      if (!consumed.data) return invalid();
      const changed = await server.auth.admin.updateUserById(match.user_id, { password: pin });
      if (changed.error) throw changed.error;
      const revoked = await server.rpc("we4all_revoke_recovered_sessions", { p_user_id: match.user_id });
      const identifier = user.email_confirmed_at && user.email && !user.email.endsWith(".invalid")
        ? user.email
        : user.phone_confirmed_at && user.phone ? "+" + user.phone.replace(/\D/g, "") : "";
      return json({ ok: true, sessions_revoked: !revoked.error, identifier });
    }
    return json({ error: "Unknown recovery action." }, 400);
  } catch {
    return json({ error: "Recovery could not finish. If you used a backup code, use another code or contact support." }, 503);
  }
});
