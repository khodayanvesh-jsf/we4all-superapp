-- WE4ALL partner KYC private storage and evidence-backed review gate.
-- Prepared locally; apply only after staging schema and storage verification.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'we4all-partner-kyc',
  'we4all-partner-kyc',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Partner KYC applicants upload own pending documents" on storage.objects;
create policy "Partner KYC applicants upload own pending documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'we4all-partner-kyc'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.we4all_partner_applications a
    where a.user_id = (select auth.uid())
      and a.id::text = (storage.foldername(name))[2]
      and a.status = 'pending'
  )
);

drop policy if exists "Partner KYC applicants read own pending documents" on storage.objects;
create policy "Partner KYC applicants read own pending documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'we4all-partner-kyc'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.we4all_partner_applications a
    where a.user_id = (select auth.uid())
      and a.id::text = (storage.foldername(name))[2]
  )
);

drop policy if exists "Partner KYC applicants remove own pending documents" on storage.objects;
create policy "Partner KYC applicants remove own pending documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'we4all-partner-kyc'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.we4all_partner_applications a
    where a.user_id = (select auth.uid())
      and a.id::text = (storage.foldername(name))[2]
      and a.status = 'pending'
  )
);

create or replace function public.we4all_review_partner_application_kyc(
  p_application_id uuid,
  p_new_status text,
  p_reviewer_id uuid,
  p_checklist jsonb,
  p_reason text default ''
)
returns table(application_id uuid, user_id uuid, requested_role text, status text, reviewed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $function$
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
    if coalesce(v_kyc#>>'{terms,version}','') not like 'final-%' then
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

revoke all on function public.we4all_review_partner_application_kyc(uuid,text,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.we4all_review_partner_application_kyc(uuid,text,uuid,jsonb,text) to service_role;

