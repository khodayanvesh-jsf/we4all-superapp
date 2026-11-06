create table if not exists public.we4all_dynamic_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  title text not null,
  description text not null default '',
  icon text not null default 'grid',
  category_key text not null default 'custom',
  portal_target text not null check (portal_target in ('customer','merchant','service_provider','decorator','rider','labour','founder')),
  zone_codes text[] not null default array['*']::text[],
  visibility_roles text[] not null default array['customer']::text[],
  is_public boolean not null default true,
  sort_order integer not null default 100,
  status text not null default 'draft' check (status in ('draft','published','disabled')),
  version integer not null default 1 check (version > 0),
  module_config jsonb not null default '{}'::jsonb check (jsonb_typeof(module_config)='object'),
  is_system boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (module_key ~ '^[a-z][a-z0-9_]{1,48}$'),
  check (char_length(title) between 2 and 80),
  check (octet_length(module_config::text) <= 32768)
);
create index if not exists we4all_dynamic_modules_public_idx on public.we4all_dynamic_modules(status,is_public,sort_order);
create index if not exists we4all_dynamic_modules_portal_idx on public.we4all_dynamic_modules(portal_target,status);
create index if not exists we4all_dynamic_modules_zones_gin on public.we4all_dynamic_modules using gin(zone_codes);
alter table public.we4all_dynamic_modules enable row level security;
revoke all on public.we4all_dynamic_modules from public;
grant select on public.we4all_dynamic_modules to anon,authenticated;
grant select,insert,update,delete on public.we4all_dynamic_modules to service_role;
create policy we4all_dynamic_modules_public_published_read on public.we4all_dynamic_modules
  for select to anon,authenticated using (status='published' and is_public=true);

create table if not exists public.we4all_dynamic_module_revisions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.we4all_dynamic_modules(id) on delete cascade,
  version integer not null,
  action text not null check (action in ('saved','published','disabled')),
  snapshot jsonb not null check (jsonb_typeof(snapshot)='object'),
  actor_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(module_id,version)
);
create index if not exists we4all_dynamic_module_revisions_module_idx on public.we4all_dynamic_module_revisions(module_id,version desc);
alter table public.we4all_dynamic_module_revisions enable row level security;
revoke all on public.we4all_dynamic_module_revisions from public,anon,authenticated;
grant select,insert,update,delete on public.we4all_dynamic_module_revisions to service_role;
create policy we4all_dynamic_module_revisions_client_deny on public.we4all_dynamic_module_revisions
  for all to anon,authenticated using (false) with check (false);

create or replace function public.we4all_save_dynamic_module(
 p_module_key text,p_title text,p_description text,p_icon text,p_category_key text,p_portal_target text,
 p_zone_codes text[],p_visibility_roles text[],p_is_public boolean,p_sort_order integer,p_module_config jsonb,p_actor_user_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_module public.we4all_dynamic_modules%rowtype;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
   raise exception 'SERVER_ONLY_DYNAMIC_MODULE_WRITE' using errcode='42501';
 end if;
 if p_module_key !~ '^[a-z][a-z0-9_]{1,48}$'
    or length(btrim(coalesce(p_title,''))) not between 2 and 80
    or p_portal_target not in ('customer','merchant','service_provider','decorator','rider','labour','founder')
    or jsonb_typeof(coalesce(p_module_config,'{}'::jsonb)) <> 'object'
    or octet_length(coalesce(p_module_config,'{}'::jsonb)::text) > 32768 then
   raise exception 'INVALID_DYNAMIC_MODULE' using errcode='22023';
 end if;
 if coalesce(p_module_config,'{}'::jsonb) ?| array['script','html','javascript','eval'] then
   raise exception 'EXECUTABLE_MODULE_CONFIG_NOT_ALLOWED' using errcode='22023';
 end if;
 insert into public.we4all_dynamic_modules(module_key,title,description,icon,category_key,portal_target,zone_codes,visibility_roles,is_public,sort_order,status,version,module_config,created_by,updated_by)
 values(p_module_key,btrim(p_title),coalesce(p_description,''),coalesce(p_icon,'grid'),coalesce(p_category_key,'custom'),p_portal_target,
        coalesce(p_zone_codes,array['*']::text[]),coalesce(p_visibility_roles,array['customer']::text[]),coalesce(p_is_public,true),coalesce(p_sort_order,100),
        'draft',1,coalesce(p_module_config,'{}'::jsonb),p_actor_user_id,p_actor_user_id)
 on conflict(module_key) do update set title=excluded.title,description=excluded.description,icon=excluded.icon,category_key=excluded.category_key,
   portal_target=excluded.portal_target,zone_codes=excluded.zone_codes,visibility_roles=excluded.visibility_roles,is_public=excluded.is_public,
   sort_order=excluded.sort_order,status='draft',version=public.we4all_dynamic_modules.version+1,module_config=excluded.module_config,
   updated_by=p_actor_user_id,updated_at=now(),published_at=null,published_by=null
 returning * into v_module;
 insert into public.we4all_dynamic_module_revisions(module_id,version,action,snapshot,actor_user_id)
 values(v_module.id,v_module.version,'saved',to_jsonb(v_module),p_actor_user_id);
 return jsonb_build_object('ok',true,'module',to_jsonb(v_module));
end $$;

create or replace function public.we4all_set_dynamic_module_status(p_module_id uuid,p_status text,p_actor_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_module public.we4all_dynamic_modules%rowtype;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
   raise exception 'SERVER_ONLY_DYNAMIC_MODULE_STATUS' using errcode='42501';
 end if;
 if p_status not in ('published','disabled') then raise exception 'INVALID_DYNAMIC_MODULE_STATUS' using errcode='22023'; end if;
 select * into v_module from public.we4all_dynamic_modules where id=p_module_id for update;
 if not found then raise exception 'DYNAMIC_MODULE_NOT_FOUND' using errcode='P0002'; end if;
 if p_status='published' and (length(btrim(v_module.title))<2 or jsonb_typeof(v_module.module_config)<>'object') then
   raise exception 'DYNAMIC_MODULE_NOT_READY' using errcode='22023';
 end if;
 update public.we4all_dynamic_modules set status=p_status,version=version+1,updated_by=p_actor_user_id,updated_at=now(),
   published_by=case when p_status='published' then p_actor_user_id else published_by end,
   published_at=case when p_status='published' then now() else null end
 where id=p_module_id returning * into v_module;
 insert into public.we4all_dynamic_module_revisions(module_id,version,action,snapshot,actor_user_id)
 values(v_module.id,v_module.version,p_status,to_jsonb(v_module),p_actor_user_id);
 return jsonb_build_object('ok',true,'module',to_jsonb(v_module));
end $$;

revoke all on function public.we4all_save_dynamic_module(text,text,text,text,text,text,text[],text[],boolean,integer,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.we4all_set_dynamic_module_status(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.we4all_save_dynamic_module(text,text,text,text,text,text,text[],text[],boolean,integer,jsonb,uuid) to service_role;
grant execute on function public.we4all_set_dynamic_module_status(uuid,text,uuid) to service_role;
