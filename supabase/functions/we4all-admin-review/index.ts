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

  if (body.action === "users_list") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to manage portal accounts" }, 403);
    const [{ data: roles, error: rolesError }, { data: profiles, error: profilesError }, { data: applications, error: applicationsError }] = await Promise.all([
      admin.from("we4all_user_roles").select("user_id,role,status,updated_at").order("updated_at", { ascending: false }),
      admin.from("we4all_profiles").select("user_id,full_name,business_name,phone,area"),
      admin.from("we4all_partner_applications").select("user_id,requested_role,status,created_at").order("created_at", { ascending: false })
    ]);
    if (rolesError || profilesError || applicationsError) return json({ ok: false, error: "Could not load portal accounts" }, 500);
    const byUser = new Map<string, Record<string, unknown>>();
    for (const profile of profiles || []) byUser.set(profile.user_id, { user_id: profile.user_id, profile, roles: [] });
    for (const role of roles || []) {
      const account = byUser.get(role.user_id) || { user_id: role.user_id, profile: null, roles: [] };
      (account.roles as Array<{role:string;status:string}>).push({ role: role.role, status: role.status });
      byUser.set(role.user_id, account);
    }
    for (const application of applications || []) {
      const account = byUser.get(application.user_id) || { user_id: application.user_id, profile: null, roles: [] };
      if (!account.partner_application) account.partner_application = { status: application.status, requested_role: application.requested_role };
      const accountRoles = account.roles as Array<{role:string;status:string}>;
      if (application.status === "pending" && !accountRoles.some((role) => role.role === application.requested_role)) accountRoles.push({ role: application.requested_role, status: "pending" });
      byUser.set(application.user_id, account);
    }
    const users = [...byUser.values()].map((account) => {
      const accountRoles = account.roles as Array<{role:string;status:string}>;
      const active = accountRoles.some((role) => role.status === "approved");
      const pending = accountRoles.some((role) => role.status === "pending") || (account.partner_application as Record<string,string> | undefined)?.status === "pending";
      return { ...account, portal_status: active ? "active" : pending ? "pending" : "suspended" };
    });
    return json({ ok: true, users });
  }

  if (body.action === "user_update") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to manage portal accounts" }, 403);
    const userId = String(body.user_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(userId) || userId === reviewerId) return json({ ok: false, error: "Choose a valid portal user; Founder access cannot be changed here" }, 400);
    const profile = body.profile && typeof body.profile === "object" ? body.profile as Record<string, unknown> : {};
    const { error: profileError } = await admin.from("we4all_profiles").update({
      full_name: String(profile.full_name || "").trim().slice(0, 120),
      business_name: String(profile.business_name || "").trim().slice(0, 160),
      area: String(profile.area || "").trim().slice(0, 160),
      updated_at: new Date().toISOString()
    }).eq("user_id", userId);
    if (profileError) return json({ ok: false, error: "Could not update portal profile" }, 500);
    if (body.remove_access === true) {
      const [{ error: roleError }, { error: partnerError }] = await Promise.all([
        admin.from("we4all_user_roles").update({ status: "suspended", updated_at: new Date().toISOString() }).eq("user_id", userId),
        admin.from("we4all_partners").update({ approval_status: "suspended", updated_at: new Date().toISOString() }).eq("owner_user_id", userId)
      ]);
      if (roleError || partnerError) return json({ ok: false, error: "Profile saved, but portal access could not be suspended completely" }, 500);
      return json({ ok: true, access_removed: true });
    }
    if (!Array.isArray(body.roles) || body.roles.some((item) => !item || !["customer","merchant","service_provider","decorator","rider","labour"].includes(item.role) || !["approved","pending","suspended"].includes(item.status))) {
      return json({ ok: false, error: "Choose supported portal roles and access states" }, 400);
    }
    const roles = body.roles as Array<{ role: string; status: string }>;
    const roleMap = new Map(roles.map((item) => [item.role, item.status]));
    if (!roleMap.has("customer")) roleMap.set("customer", "approved");
    const { data: existing, error: existingError } = await admin.from("we4all_user_roles").select("role").eq("user_id", userId);
    if (existingError) return json({ ok: false, error: "Could not verify current portal access" }, 500);
    const rows = [...roleMap.entries()].map(([role, status]) => ({ user_id: userId, role, status, updated_at: new Date().toISOString() }));
    const { error: roleSaveError } = await admin.from("we4all_user_roles").upsert(rows, { onConflict: "user_id,role" });
    if (roleSaveError) return json({ ok: false, error: "Could not save portal access changes" }, 500);
    const removedRoles = (existing || []).map((row) => row.role).filter((role) => !roleMap.has(role));
    if (removedRoles.length) {
      const { error } = await admin.from("we4all_user_roles").update({ status: "suspended", updated_at: new Date().toISOString() }).eq("user_id", userId).in("role", removedRoles);
      if (error) return json({ ok: false, error: "Portal roles saved, but an old role could not be suspended" }, 500);
    }
    return json({ ok: true, access_removed: false });
  }

  if (body.action === "account_remove") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to remove portal accounts" }, 403);
    const userId = String(body.user_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(userId) || userId === reviewerId) return json({ ok: false, error: "Choose another valid portal account" }, 400);
    const { data: target, error: targetError } = await admin.auth.admin.getUserById(userId);
    if (targetError || !target?.user) return json({ ok: false, error: "Portal account was not found" }, 404);
    if (target.user.app_metadata?.we4all_role === "founder") return json({ ok: false, error: "Founder accounts cannot be removed from Portal Accounts" }, 403);
    const { data: partners, error: partnerListError } = await admin.from("we4all_partners").select("id").eq("owner_user_id", userId);
    if (partnerListError) return json({ ok: false, error: "Could not load account listings" }, 500);
    const now = new Date().toISOString();
    const [{ error: roleError }, { error: partnerError }] = await Promise.all([
      admin.from("we4all_user_roles").update({ status: "suspended", updated_at: now }).eq("user_id", userId),
      admin.from("we4all_partners").update({ approval_status: "suspended", updated_at: now }).eq("owner_user_id", userId)
    ]);
    if (roleError || partnerError) return json({ ok: false, error: "Could not remove all account access" }, 500);
    for (const partner of partners || []) {
      const { error } = await admin.from("we4all_catalog_items").update({ is_active: false, updated_at: now }).eq("partner_id", partner.id);
      if (error) return json({ ok: false, error: "Account access was suspended, but a listing could not be deactivated" }, 500);
    }
    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
      app_metadata: { ...(target.user.app_metadata || {}), we4all_account_removed: true, we4all_account_removed_at: now, we4all_account_removed_by: reviewerId }
    });
    if (banError) return json({ ok: false, error: "Portal data was suspended, but sign-in could not be blocked" }, 500);
    return json({ ok: true, removed: true, retained_history: true });
  }

  if (body.action === "listings_list") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to manage listings" }, 403);
    const { data, error } = await admin.from("we4all_catalog_items").select("id,partner_id,title,item_type,approval_status,is_active,updated_at").order("updated_at", { ascending: false }).limit(250);
    if (error) return json({ ok: false, error: "Could not load product and service listings" }, 500);
    return json({ ok: true, listings: data || [] });
  }

  if (body.action === "listing_remove") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to remove listings" }, 403);
    const id = String(body.listing_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ ok: false, error: "Choose a valid listing" }, 400);
    const { data, error } = await admin.from("we4all_catalog_items").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id).select("id").maybeSingle();
    if (error || !data) return json({ ok: false, error: "Could not remove this listing" }, error ? 500 : 404);
    return json({ ok: true, removed: true, retained_history: true });
  }

  if (body.action === "managers_list") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to manage Geo Managers" }, 403);
    const [{ data: page, error: listError }, { data: markets, error: marketError }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("we4all_markets").select("id,display_name,state_name,active").eq("active", true).order("display_name")
    ]);
    if (listError || marketError) return json({ ok: false, error: "Could not load Geo Managers and markets" }, 500);
    const managers = (page?.users || []).filter((user) => user.app_metadata?.we4all_role === "city_manager").map((user) => ({
      user_id: user.id, email: user.email || "", zone_id: String(user.app_metadata?.we4all_zone_id || ""),
      display_name: String(user.user_metadata?.full_name || "Geo Manager")
    }));
    return json({ ok: true, managers, markets: markets || [] });
  }

  if (body.action === "manager_invite") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to add Geo Managers" }, 403);
    const email = String(body.email || "").trim().toLowerCase();
    const marketId = String(body.market_id || "");
    const displayName = String(body.full_name || "").trim().slice(0, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !displayName || !marketId) return json({ ok: false, error: "Enter manager name, valid email, and assigned local market" }, 400);
    const { data: market, error: marketError } = await admin.from("we4all_markets").select("id").eq("id", marketId).eq("active", true).maybeSingle();
    if (marketError || !market) return json({ ok: false, error: "Select an active Geo market" }, 400);
    const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: displayName } });
    if (inviteError || !invite?.user?.id) return json({ ok: false, error: inviteError?.message || "Could not send the manager invitation" }, 400);
    const manager = invite.user;
    const { error: updateError } = await admin.auth.admin.updateUserById(manager.id, { app_metadata: {
      ...(manager.app_metadata || {}), we4all_role: "city_manager", we4all_zone_id: marketId,
      we4all_manager_created_by: reviewerId
    } });
    if (updateError) return json({ ok: false, error: "Invitation sent but the Geo Manager role could not be assigned" }, 500);
    return json({ ok: true, manager: { user_id: manager.id, email, zone_id: marketId, display_name: displayName } });
  }

  if (body.action === "manager_assign") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to assign Geo Managers" }, 403);
    const userId = String(body.user_id || "");
    const marketId = String(body.market_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ ok: false, error: "Choose a valid manager" }, 400);
    const { data: market } = await admin.from("we4all_markets").select("id").eq("id", marketId).eq("active", true).maybeSingle();
    if (!market) return json({ ok: false, error: "Select an active Geo market" }, 400);
    const { data: userData, error: getError } = await admin.auth.admin.getUserById(userId);
    if (getError || !userData?.user || userData.user.app_metadata?.we4all_role !== "city_manager") return json({ ok: false, error: "Geo Manager account not found" }, 404);
    const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { ...(userData.user.app_metadata || {}), we4all_zone_id: marketId } });
    if (error) return json({ ok: false, error: "Could not update the assigned market" }, 500);
    return json({ ok: true });
  }

  if (body.action === "manager_remove") {
    if (adminRole !== "founder") return json({ ok: false, error: "Founder authorization is required to remove Geo Managers" }, 403);
    const userId = String(body.user_id || "");
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ ok: false, error: "Choose a valid manager" }, 400);
    const { data: userData, error: getError } = await admin.auth.admin.getUserById(userId);
    if (getError || !userData?.user || userData.user.app_metadata?.we4all_role !== "city_manager") return json({ ok: false, error: "Geo Manager account not found" }, 404);
    const { error } = await admin.auth.admin.updateUserById(userId, { app_metadata: { ...(userData.user.app_metadata || {}), we4all_role: null, we4all_zone_id: null } });
    if (error) return json({ ok: false, error: "Could not remove Geo Manager access" }, 500);
    return json({ ok: true });
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
    const applicantUserResults = await Promise.all(userIds.map((userId) => admin.auth.admin.getUserById(userId)));
    const trialPhoneByUserId = new Map(userIds.map((userId, index) => [
      userId,
      applicantUserResults[index]?.data?.user?.user_metadata?.trial_phone_verification === true
    ]));
    const trialApprovalOverrideAllowed = adminRole === "founder" &&
      Deno.env.get("WE4ALL_TRIAL_OTP_ENABLED") === "true" &&
      Deno.env.get("WE4ALL_TRIAL_OTP_ENV") === "preview";
    const applicationsWithKycLinks = await Promise.all(scopedApplications.map(async (application) => {
      const kyc = application.application_payload?.kyc || {};
      const files = kyc.files && typeof kyc.files === "object" ? kyc.files : {};
      const documentUrls: Record<string, string> = {};
      const documentErrors: Record<string, string> = {};
      for (const [key, pathValue] of Object.entries(files)) {
        const path = String(pathValue || "");
        if (!path.startsWith(`${application.user_id}/${application.id}/`)) continue;
        const { data, error: signedUrlError } = await admin.storage.from("we4all-partner-kyc").createSignedUrl(path, 3600);
        if (!signedUrlError && data?.signedUrl) documentUrls[key] = data.signedUrl;
        else documentErrors[key] = signedUrlError?.message || "File is missing from private storage";
      }
      const signaturePath = String(kyc.signature?.path || "");
      if (signaturePath.startsWith(`${application.user_id}/${application.id}/`)) {
        const { data, error: signedUrlError } = await admin.storage.from("we4all-partner-kyc").createSignedUrl(signaturePath, 3600);
        if (!signedUrlError && data?.signedUrl) documentUrls.signature = data.signedUrl;
        else documentErrors.signature = signedUrlError?.message || "Signature file is missing from private storage";
      }
      return {
        ...application,
        profile: profileByUserId.get(application.user_id) || null,
        trial_phone_verification: trialPhoneByUserId.get(application.user_id) === true,
        trial_approval_override_allowed: trialApprovalOverrideAllowed,
        kyc_document_urls: documentUrls,
        kyc_document_errors: documentErrors
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
        const trialOverrideEnabled = adminRole === "founder" &&
          Deno.env.get("WE4ALL_TRIAL_OTP_ENABLED") === "true" &&
          Deno.env.get("WE4ALL_TRIAL_OTP_ENV") === "preview";
        if (!trialOverrideEnabled || body.allow_trial_phone_override !== true) {
          return json({ ok: false, error: "The trial-generated code does not prove phone ownership. Preview approval requires the Founder’s explicit test override after completing every KYC and signature check." }, 409);
        }
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
  // A 204 response must not carry a body; otherwise Deno throws during the
  // browser's CORS preflight and the client reports a network-level failure.
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  const response = await handler(req);
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
