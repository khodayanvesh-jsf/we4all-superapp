-- Require evidence-backed review at the database boundary, including alternate admin tools.
create schema if not exists private;

create or replace function private.we4all_check_merchant_application()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  evidence jsonb := new.application_payload->'kyc';
  prefix text := new.user_id::text || '/' || new.id::text || '/';
  document_path text;
  signature_path text;
  signature_method text;
  document_paths text[] := array[]::text[];
  required_key text;
begin
  if new.requested_role <> 'merchant' or new.status <> 'approved' then return new; end if;
  if new.reviewed_at is null or not exists (
    select 1 from auth.users reviewer where reviewer.id = new.reviewed_by
      and (reviewer.raw_app_meta_data->>'we4all_role' = 'founder'
        or (reviewer.raw_app_meta_data->>'we4all_role' = 'city_manager'
          and nullif(reviewer.raw_app_meta_data->>'we4all_zone_id', '') is not null
          and reviewer.raw_app_meta_data->>'we4all_zone_id' <> 'ALL_INDIA'
          and reviewer.raw_app_meta_data->>'we4all_zone_id' = new.application_payload->>'zone_id'))
  ) then raise exception 'Merchant approval requires a Founder or assigned administrator' using errcode = '42501'; end if;
  if evidence->>'status' is distinct from 'submitted' or evidence#>>'{terms,accepted}' is distinct from 'true'
      or coalesce(length(btrim(evidence#>>'{signature,signer_name}')),0) < 2 then
    raise exception 'Merchant documents, accepted terms and signature are required' using errcode = '22023';
  end if;

  foreach required_key in array array['identity','business_proof','payout_proof'] loop
    document_path := evidence->'files'->>required_key;
    if document_path is null or not starts_with(document_path,prefix) or document_path = any(document_paths)
        or not exists (select 1 from storage.objects where bucket_id='we4all-partner-kyc' and name=document_path) then
      raise exception 'A merchant document is missing from private storage' using errcode = '22023';
    end if;
    document_paths := array_append(document_paths,document_path);
  end loop;

  signature_method := evidence#>>'{signature,method}';
  signature_path := evidence#>>'{signature,path}';
  if signature_method is null or signature_method not in ('typed_name','drawn_image','uploaded_image')
      or (signature_method='typed_name' and coalesce(signature_path,'') <> '')
      or (signature_method in ('drawn_image','uploaded_image') and (
        signature_path is null or not starts_with(signature_path,prefix) or signature_path = any(document_paths)
        or not exists (select 1 from storage.objects where bucket_id='we4all-partner-kyc' and name=signature_path
          and metadata->>'mimetype' in ('image/png','image/jpeg','image/webp'))
      )) then
    raise exception 'The merchant signature is missing or invalid' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.we4all_check_merchant_application() from public, anon, authenticated;

drop trigger if exists we4all_check_merchant_application on public.we4all_partner_applications;
create trigger we4all_check_merchant_application before insert or update of status, reviewed_by, reviewed_at, application_payload
on public.we4all_partner_applications for each row execute function private.we4all_check_merchant_application();

create or replace function private.we4all_require_approved_merchant()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid;
begin
  if tg_table_name = 'we4all_user_roles' then
    if new.role <> 'merchant' or new.status <> 'approved' then return new; end if;
    owner_id := new.user_id;
  else
    if new.partner_type <> 'merchant' or new.approval_status <> 'approved' then return new; end if;
    owner_id := new.owner_user_id;
  end if;
  if not exists (
    select 1 from public.we4all_partner_applications a
      where a.user_id = owner_id and a.requested_role = 'merchant' and a.status = 'approved'
        and a.reviewed_by is not null and a.reviewed_at is not null
        and a.application_payload#>>'{kyc,status}' = 'submitted'
  ) then
    raise exception 'Approve the merchant application in Partner Review before enabling access' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.we4all_require_approved_merchant() from public, anon, authenticated;

drop trigger if exists we4all_require_approved_merchant_role on public.we4all_user_roles;
create trigger we4all_require_approved_merchant_role before insert or update of user_id, role, status
on public.we4all_user_roles for each row execute function private.we4all_require_approved_merchant();

drop trigger if exists we4all_require_approved_merchant_partner on public.we4all_partners;
create trigger we4all_require_approved_merchant_partner before insert or update of owner_user_id, partner_type, approval_status
on public.we4all_partners for each row execute function private.we4all_require_approved_merchant();
