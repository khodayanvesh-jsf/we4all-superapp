-- Preserve the private KYC review and allow Founder-issued trial identities to accept the trial declaration.
CREATE OR REPLACE FUNCTION public.we4all_review_partner_application(p_application_id uuid, p_new_status text, p_reviewer_id uuid)
 RETURNS TABLE(application_id uuid, user_id uuid, requested_role text, status text, reviewed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_application public.we4all_partner_applications%rowtype;
 v_reviewed_at timestamptz := pg_catalog.now();
 v_role_status text; v_display_name text; v_contact_phone text; v_market_id text;
 v_lat numeric(9,6); v_lng numeric(9,6);
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'SERVER_ONLY_PARTNER_REVIEW' using errcode='42501'; end if;
 if p_new_status not in ('approved','rejected','suspended') or p_reviewer_id is null then raise exception 'Invalid reviewer or decision' using errcode='22023'; end if;
 select * into v_application from public.we4all_partner_applications where id=p_application_id for update;
 if not found then raise exception 'Partner application not found' using errcode='P0002'; end if;
 if v_application.status<>'pending' then raise exception 'Partner application has already been reviewed' using errcode='40001'; end if;
 v_lat:=nullif(v_application.application_payload->>'latitude','')::numeric;
 v_lng:=nullif(v_application.application_payload->>'longitude','')::numeric;
 if p_new_status='approved' and (v_lat is null or v_lng is null or v_lat not between -90 and 90 or v_lng not between -180 and 180) then
   raise exception 'VALID_BUSINESS_LOCATION_REQUIRED' using errcode='22023';
 end if;
 update public.we4all_partner_applications set status=p_new_status,reviewed_at=v_reviewed_at,reviewed_by=p_reviewer_id where id=p_application_id;
 v_role_status:=case when p_new_status='approved' then 'approved' else 'suspended' end;
 insert into public.we4all_user_roles(user_id,role,status,updated_at) values(v_application.user_id,v_application.requested_role,v_role_status,v_reviewed_at)
 on conflict on constraint we4all_user_roles_pkey do update set status=excluded.status,updated_at=excluded.updated_at;
 if p_new_status='approved' then
   v_display_name:=coalesce(nullif(pg_catalog.btrim(v_application.application_payload->>'business_name'),''),nullif(pg_catalog.btrim(v_application.application_payload->>'full_name'),''),'WE4ALL Partner');
   v_contact_phone:=nullif(pg_catalog.btrim(v_application.application_payload->>'phone'),'');
   v_market_id:=v_application.application_payload->>'market_id';
   if v_market_id is null or v_market_id='' then raise exception 'VALID_BUSINESS_MARKET_REQUIRED' using errcode='22023'; end if;
   insert into public.we4all_partners(owner_user_id,partner_type,display_name,contact_phone,zone_id,market_id,business_latitude,business_longitude,approval_status)
   values(v_application.user_id,v_application.requested_role,v_display_name,v_contact_phone,v_market_id,v_market_id,v_lat,v_lng,'approved')
   on conflict(owner_user_id,partner_type) do update set display_name=excluded.display_name,contact_phone=excluded.contact_phone,zone_id=excluded.zone_id,market_id=excluded.market_id,business_latitude=excluded.business_latitude,business_longitude=excluded.business_longitude,approval_status='approved',updated_at=v_reviewed_at;
 else
   update public.we4all_partners set approval_status=p_new_status,updated_at=v_reviewed_at where owner_user_id=v_application.user_id and partner_type=v_application.requested_role;
 end if;
 return query select p_application_id,v_application.user_id,v_application.requested_role,p_new_status,v_reviewed_at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.we4all_review_partner_application_kyc(p_application_id uuid, p_new_status text, p_reviewer_id uuid, p_checklist jsonb, p_reason text DEFAULT ''::text)
 RETURNS TABLE(application_id uuid, user_id uuid, requested_role text, status text, reviewed_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_application public.we4all_partner_applications%rowtype;
  v_kyc jsonb;
  v_now timestamptz := pg_catalog.now();
  v_zone text;
  v_required_keys text[];
  v_key text;
begin
  if p_reviewer_id is null or p_new_status not in ('approved','rejected','suspended') then
    raise exception 'Invalid reviewer or decision' using errcode = '22023';
  end if;

  select * into v_application
    from public.we4all_partner_applications
    where id = p_application_id
    for update;
  if not found then raise exception 'Partner application not found' using errcode = 'P0002'; end if;
  if v_application.status <> 'pending' then
    raise exception 'Partner application has already been reviewed' using errcode = '40001';
  end if;

  v_kyc := v_application.application_payload->'kyc';
  v_zone := v_application.application_payload->>'zone_id';
  v_required_keys := case v_application.requested_role
    when 'merchant' then array['identity','business_proof','payout_proof']
    when 'service_provider' then array['identity','trade_proof','payout_proof']
    when 'decorator' then array['identity','business_proof','payout_proof']
    when 'rider' then array['identity','driving_license','vehicle_registration','payout_proof']
    when 'labour' then array['identity','trade_proof','payout_proof']
    else null
  end;
  if v_required_keys is null then
    raise exception 'Unsupported partner role for KYC review' using errcode = '22023';
  end if;
  if p_new_status = 'approved' then
    if coalesce(v_kyc->>'status','') <> 'submitted' then
      raise exception 'Partner KYC evidence is incomplete' using errcode = '22023';
    end if;
    if coalesce(v_kyc#>>'{terms,version}','') not like 'final-%' and not (
      coalesce(v_kyc#>>'{terms,version}','') = 'trial-draft-1'
      and coalesce(v_kyc#>>'{terms,accepted}','false') = 'true'
      and exists (
        select 1 from auth.users u
        where u.id = v_application.user_id
          and u.raw_app_meta_data->>'we4all_trial_account' = 'true'
          and u.raw_app_meta_data->>'we4all_trial_issued_by' is not null
      )
      and exists (
        select 1 from auth.users u
        where u.id = p_reviewer_id and u.raw_app_meta_data->>'we4all_role' = 'founder'
      )
    ) then
      raise exception 'Founder must publish the final partner terms before approval' using errcode = '22023';
    end if;
    if jsonb_typeof(p_checklist) <> 'object'
      or coalesce(p_checklist->>'identity','false') <> 'true'
      or coalesce(p_checklist->>'role_proof','false') <> 'true'
      or coalesce(p_checklist->>'payout_proof','false') <> 'true'
      or coalesce(p_checklist->>'terms','false') <> 'true'
      or coalesce(p_checklist->>'signature','false') <> 'true' then
      raise exception 'All five evidence-backed checks are required' using errcode = '22023';
    end if;
    foreach v_key in array v_required_keys loop
      if not exists (
        select 1 from storage.objects o
        where o.bucket_id = 'we4all-partner-kyc'
          and o.name = (v_kyc->'files'->>v_key)
      ) then
        raise exception 'One or more required KYC files are missing' using errcode = '22023';
      end if;
    end loop;
  elsif pg_catalog.length(pg_catalog.btrim(coalesce(p_reason,''))) < 4 then
    raise exception 'A reason is required for rejection or suspension' using errcode = '22023';
  end if;

  return query select * from public.we4all_review_partner_application(p_application_id,p_new_status,p_reviewer_id);
  insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,zone_id,metadata)
  values (
    p_reviewer_id,
    case when coalesce(auth.jwt()->'app_metadata'->>'we4all_role','')='founder' then 'founder' else 'city_manager' end,
    'partner_application_' || p_new_status,
    'partner_application',
    p_application_id,
    v_zone,
    jsonb_build_object('checklist',coalesce(p_checklist,'{}'::jsonb),'reason',nullif(pg_catalog.btrim(coalesce(p_reason,'')),''))
  );
end;
$function$;

revoke execute on function public.we4all_review_partner_application(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.we4all_review_partner_application(uuid,text,uuid) to service_role;
revoke execute on function public.we4all_review_partner_application_kyc(uuid,text,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.we4all_review_partner_application_kyc(uuid,text,uuid,jsonb,text) to service_role;

-- Permit the existing merchant form to insert draft catalogue fields only.
-- The existing INSERT policy enforces ownership, approval status, inactive state and zero stock.
grant insert (partner_id,sku,title,description,category_key,item_type,price_inr,mrp_inr,stock_quantity,unit_label,metadata)
on public.we4all_catalog_items to authenticated;
