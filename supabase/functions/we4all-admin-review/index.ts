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
  const adminRole = appMetadata.we4all_role;
  const zoneId = typeof appMetadata.we4all_zone_id === "string" ? appMetadata.we4all_zone_id : "";

  // app_metadata is trusted-server managed. Never authorize from user_metadata or request fields.
  if (!reviewerId || !["founder", "city_manager"].includes(adminRole)) {
    return json({ ok: false, error: "WE4ALL administrator authorization is required" }, 403);
  }
  if (claims.aal !== "aal2") {
    return json({ ok: false, error: "Complete authenticator verification before administrator access" }, 403);
  }
  if (adminRole === "city_manager" && (!zoneId || zoneId === "ALL_INDIA")) {
    return json({ ok: false, error: "City Manager account has no valid assigned zone" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Request body must be valid JSON" }, 400);
  }

  const admin = ctx.supabaseAdmin;

  if (body.action === "whoami") {
    return json({
      ok: true,
      user_id: reviewerId,
      role: adminRole,
      zone_id: adminRole === "founder" ? null : zoneId,
      username: typeof appMetadata.we4all_username === "string" ? appMetadata.we4all_username : null,
      must_change_password: adminRole === "founder" && appMetadata.we4all_bootstrap_required === true
    });
  }

  if (body.action === "complete_bootstrap_password_change") {
    if (adminRole !== "founder" || appMetadata.we4all_bootstrap_required !== true) {
      return json({ ok: false, error: "No pending Founder bootstrap password change was found" }, 409);
    }
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(reviewerId);
    if (userError || !userData?.user) return json({ ok: false, error: "Could not verify the Founder account" }, 500);
    const nextMetadata = {
      ...(userData.user.app_metadata || {}),
      we4all_bootstrap_required: false,
      we4all_bootstrap_complete: true,
      we4all_bootstrap_used_at: new Date().toISOString()
    };
    const { error: updateError } = await admin.auth.admin.updateUserById(reviewerId, { app_metadata: nextMetadata });
    if (updateError) return json({ ok: false, error: "Could not complete Founder bootstrap" }, 500);
    return json({ ok: true });
  }

  if (adminRole === "founder" && appMetadata.we4all_bootstrap_required === true) {
    return json({ ok: false, error: "Change the initial Founder password before opening administrator tools" }, 403);
  }

  if (body.action === "credentials_update") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to update the Founder username" }, 403);
    const username = String(body.username || "").trim();
    if (!/^[A-Za-z0-9._-]{3,64}$/.test(username)) return json({ ok: false, error: "Use 3–64 letters, numbers, dots, underscores or hyphens for the Founder username" }, 400);
    const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return json({ ok: false, error: "Could not verify username availability" }, 500);
    const taken = (users?.users || []).some((user) => user.id !== reviewerId && user.app_metadata?.we4all_role === "founder" && String(user.app_metadata?.we4all_username || "").toLowerCase() === username.toLowerCase());
    if (taken) return json({ ok: false, error: "That Founder username is already in use" }, 409);
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(reviewerId);
    if (userError || !userData?.user) return json({ ok: false, error: "Could not verify the Founder account" }, 500);
    const nextMetadata = { ...(userData.user.app_metadata || {}), we4all_username: username };
    const { error: updateError } = await admin.auth.admin.updateUserById(reviewerId, { app_metadata: nextMetadata });
    if (updateError) return json({ ok: false, error: "Could not update the Founder username" }, 500);
    return json({ ok: true, username });
  }

  if (body.action === "registration_roles_list") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to manage registration roles" }, 403);
    const { data: roles, error } = await admin.from("we4all_registration_roles").select("role_key,label,enabled,sort_order,updated_at").order("sort_order");
    if (error) return json({ ok: false, error: "Could not load registration roles" }, 500);
    return json({ ok: true, roles: roles || [] });
  }

  if (body.action === "registration_roles_save") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to manage registration roles" }, 403);
    const allowed = new Set(["customer", "merchant", "service_provider", "decorator", "rider", "labour"]);
    if (!Array.isArray(body.enabled_roles) || body.enabled_roles.some((role) => typeof role !== "string" || !allowed.has(role)) || !body.enabled_roles.includes("customer")) {
      return json({ ok: false, error: "Choose only the defined registration roles. Customer registration must remain enabled." }, 400);
    }
    const { data: roles, error: saveError } = await admin.rpc("we4all_save_registration_roles", {
      p_enabled_roles: body.enabled_roles as string[], p_actor_user_id: reviewerId
    });
    if (saveError) return json({ ok: false, error: "Could not save registration role settings" }, 500);
    return json({ ok: true, roles });
  }

  if (body.action === "fee_list") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to manage fee policies" }, 403);
    const { data: policies, error } = await admin
      .from("we4all_fee_policies")
      .select("id,fee_type,scope_type,scope_key,rate_percent,fixed_inr,fee_basis,display_name,disclosure_text,terms_version,active,effective_at,ends_at,version,updated_at")
      .order("fee_type", { ascending: true })
      .order("scope_type", { ascending: true })
      .order("scope_key", { ascending: true });
    if (error) {
      console.error("WE4ALL fee policy list failed:", error.message);
      return json({ ok: false, error: "Could not load the server fee policies" }, 500);
    }
    return json({ ok: true, policies: policies || [] });
  }

  if (body.action === "fee_save") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to manage fee policies" }, 403);
    if (!body.policy || typeof body.policy !== "object" || Array.isArray(body.policy)) {
      return json({ ok: false, error: "A valid fee policy is required" }, 400);
    }
    const { data, error } = await admin.rpc("we4all_manage_fee_policy", {
      p_policy: body.policy,
      p_actor_id: reviewerId
    });
    if (error) {
      console.error("WE4ALL fee policy save failed:", error.message);
      const status = error.code === "42501" ? 403 : 400;
      return json({ ok: false, error: error.message || "Could not save the fee policy" }, status);
    }
    return json({ ok: true, result: data });
  }

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

    const scopedApplications = adminRole === "founder"
      ? (applications || [])
      : (applications || []).filter((application) => application.application_payload?.zone_id === zoneId);

    const userIds = [...new Set(scopedApplications.map((item) => item.user_id).filter(Boolean))];
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
    const applicationsWithKycLinks = await Promise.all(scopedApplications.map(async (application) => {
      const kyc = application.application_payload?.kyc || {};
      const files = kyc.files && typeof kyc.files === "object" ? kyc.files : {};
      const documentUrls: Record<string, string> = {};
      for (const [key, pathValue] of Object.entries(files)) {
        const path = String(pathValue || "");
        if (!path.startsWith(`${application.user_id}/${application.id}/`)) continue;
        const { data, error: signedUrlError } = await admin.storage.from("we4all-partner-kyc").createSignedUrl(path, 300);
        if (!signedUrlError && data?.signedUrl) documentUrls[key] = data.signedUrl;
      }
      const signaturePath = String(kyc.signature?.path || "");
      if (signaturePath.startsWith(`${application.user_id}/${application.id}/`)) {
        const { data, error: signedUrlError } = await admin.storage.from("we4all-partner-kyc").createSignedUrl(signaturePath, 300);
        if (!signedUrlError && data?.signedUrl) documentUrls.signature = data.signedUrl;
      }
      return {
        ...application,
        profile: profileByUserId.get(application.user_id) || null,
        kyc_document_urls: documentUrls
      };
    }));

    return json({ ok: true, applications: applicationsWithKycLinks });
  }

  if (body.action === "review") {
    const applicationId = String(body.application_id || "");
    const decision = String(body.decision || "");
    if (!applicationId || !["approved", "rejected", "suspended"].includes(decision)) {
      return json({ ok: false, error: "application_id and a valid decision are required" }, 400);
    }

    const { data: application, error: applicationError } = await admin
      .from("we4all_partner_applications")
      .select("id,user_id,requested_role,application_payload,status")
      .eq("id", applicationId)
      .maybeSingle();
    if (applicationError) return json({ ok: false, error: "Could not verify application zone" }, 500);
    if (!application || application.status !== "pending") return json({ ok: false, error: "Pending application not found" }, 404);
    if (decision === "approved") {
      const { data: applicant, error: applicantError } = await admin.auth.admin.getUserById(application.user_id);
      if (applicantError) return json({ ok: false, error: "Could not verify applicant authentication status" }, 500);
      if (applicant?.user?.user_metadata?.trial_phone_verification === true) {
        return json({ ok: false, error: "This account used a trial-generated code, which does not prove phone ownership. Complete real phone verification before partner approval." }, 409);
      }
    }
    if (adminRole === "city_manager" && application.application_payload?.zone_id !== zoneId) {
      return json({ ok: false, error: "Application is outside your assigned city zone" }, 403);
    }

    const reason = String(body.reason || "").trim();
    if (decision !== "approved" && reason.length < 4) {
      return json({ ok: false, error: "Enter a short reason for rejection or suspension" }, 400);
    }

    const { data, error } = await admin.rpc("we4all_review_partner_application_kyc", {
      p_application_id: applicationId,
      p_new_status: decision,
      p_reviewer_id: reviewerId,
      p_checklist: body.checklist && typeof body.checklist === "object" ? body.checklist : {},
      p_reason: reason
    });

    if (error) {
      console.error("WE4ALL partner application review failed:", error.message);
      const status = error.code === "P0002" ? 404 : error.code === "40001" ? 409 : error.code === "42501" ? 403 : 400;
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
