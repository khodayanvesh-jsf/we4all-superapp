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
      zone_id: adminRole === "founder" ? null : zoneId
    });
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
