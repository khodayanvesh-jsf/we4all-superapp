create unique index if not exists we4all_partners_owner_type_uidx
  on public.we4all_partners(owner_user_id, partner_type);

create or replace function public.we4all_review_partner_application(
  p_application_id uuid,
  p_new_status text,
  p_reviewer_id uuid
)
returns table(application_id uuid,user_id uuid,requested_role text,status text,reviewed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_application public.we4all_partner_applications%rowtype;
  v_reviewed_at timestamptz := pg_catalog.now();
  v_role_status text;
  v_display_name text;
  v_contact_phone text;
  v_zone_id text;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'SERVER_ONLY_PARTNER_REVIEW' using errcode = '42501';
  end if;
  if p_new_status not in ('approved','rejected','suspended') then
    raise exception 'Invalid partner application status' using errcode = '22023';
  end if;
  if p_reviewer_id is null then
    raise exception 'A verified reviewer identity is required' using errcode = '22023';
  end if;

  select * into v_application from public.we4all_partner_applications
  where id = p_application_id for update;
  if not found then raise exception 'Partner application not found' using errcode = 'P0002'; end if;
  if v_application.status <> 'pending' then
    raise exception 'Partner application has already been reviewed' using errcode = '40001';
  end if;

  update public.we4all_partner_applications
  set status=p_new_status,reviewed_at=v_reviewed_at,reviewed_by=p_reviewer_id
  where id=p_application_id;

  v_role_status := case when p_new_status='approved' then 'approved' else 'suspended' end;
  insert into public.we4all_user_roles(user_id,role,status,updated_at)
  values(v_application.user_id,v_application.requested_role,v_role_status,v_reviewed_at)
  on conflict(user_id,role) do update set status=excluded.status,updated_at=excluded.updated_at;

  if p_new_status='approved' then
    v_display_name := coalesce(
      nullif(pg_catalog.btrim(v_application.application_payload->>'business_name'),''),
      nullif(pg_catalog.btrim(v_application.application_payload->>'full_name'),''),
      'WE4ALL Partner'
    );
    v_contact_phone := nullif(pg_catalog.btrim(v_application.application_payload->>'phone'),'');
    v_zone_id := coalesce(nullif(pg_catalog.btrim(v_application.application_payload->>'zone_id'),''),'adilabad_master');
    insert into public.we4all_partners(owner_user_id,partner_type,display_name,contact_phone,zone_id,approval_status)
    values(v_application.user_id,v_application.requested_role,v_display_name,v_contact_phone,v_zone_id,'approved')
    on conflict(owner_user_id,partner_type) do update set
      display_name=excluded.display_name,contact_phone=excluded.contact_phone,
      zone_id=excluded.zone_id,approval_status='approved',updated_at=v_reviewed_at;
  else
    update public.we4all_partners set approval_status=p_new_status,updated_at=v_reviewed_at
    where owner_user_id=v_application.user_id and partner_type=v_application.requested_role;
  end if;

  return query select p_application_id,v_application.user_id,v_application.requested_role,p_new_status,v_reviewed_at;
end;
$function$;
revoke all on function public.we4all_review_partner_application(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.we4all_review_partner_application(uuid,text,uuid) to service_role;
