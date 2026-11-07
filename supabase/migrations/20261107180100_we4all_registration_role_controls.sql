-- Founder-managed public registration roles. The table contains display configuration only.
create table if not exists public.we4all_registration_roles (
  role_key text primary key check (role_key in ('customer','merchant','service_provider','decorator','rider','labour')),
  label text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.we4all_registration_role_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id),
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);

insert into public.we4all_registration_roles(role_key,label,enabled,sort_order) values
  ('customer','Consumer / Customer',true,1),
  ('merchant','Product Merchant Partner',true,2),
  ('service_provider','Home Service Provider Partner',true,3),
  ('decorator','Event Decorator & Function Hall Partner',true,4),
  ('rider','Delivery Captain & Bike/Auto Taxi Partner',true,5),
  ('labour','Labour & Mistri Worker Partner',true,6)
on conflict (role_key) do nothing;

alter table public.we4all_registration_roles enable row level security;
alter table public.we4all_registration_role_events enable row level security;
revoke all privileges on public.we4all_registration_roles, public.we4all_registration_role_events from public, anon, authenticated;
grant select on public.we4all_registration_roles to anon, authenticated;
grant select, insert, update, delete on public.we4all_registration_roles, public.we4all_registration_role_events to service_role;
create policy "Public can read enabled registration roles" on public.we4all_registration_roles
  for select to anon, authenticated using (enabled = true);

drop policy if exists "Users create own partner applications" on public.we4all_partner_applications;
create policy "Users create own partner applications" on public.we4all_partner_applications
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and exists (
      select 1 from public.we4all_registration_roles r
      where r.role_key = requested_role and r.enabled = true and r.role_key <> 'customer'
    )
  );

create or replace function public.we4all_save_registration_roles(p_enabled_roles text[], p_actor_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_json jsonb;
  after_json jsonb;
begin
  if p_actor_user_id is null or p_enabled_roles is null or not ('customer' = any(p_enabled_roles)) then
    raise exception 'Customer registration must remain enabled';
  end if;
  if exists (select 1 from unnest(p_enabled_roles) as u(role_key) where u.role_key not in ('customer','merchant','service_provider','decorator','rider','labour')) then
    raise exception 'Unsupported registration role';
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.sort_order), '[]'::jsonb) into before_json
  from public.we4all_registration_roles r;
  update public.we4all_registration_roles
  set enabled = role_key = any(p_enabled_roles), updated_at = now(), updated_by = p_actor_user_id;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.sort_order), '[]'::jsonb) into after_json
  from public.we4all_registration_roles r;
  insert into public.we4all_registration_role_events(actor_user_id,before_state,after_state)
  values (p_actor_user_id,before_json,after_json);
  return after_json;
end;
$$;
revoke all on function public.we4all_save_registration_roles(text[],uuid) from public, anon, authenticated;
grant execute on function public.we4all_save_registration_roles(text[],uuid) to service_role;
