-- Founder-controlled, versioned marketplace fee policies. All launch rates are zero.
-- Non-zero customer fees require a disclosure shown before checkout confirmation.

create table if not exists public.we4all_fee_policies (
  id uuid primary key default gen_random_uuid(),
  fee_type text not null check (fee_type in ('merchant_commission','customer_platform_fee','rider_priority_fee')),
  scope_type text not null check (scope_type in ('global','category','catalog_item','service','zone')),
  scope_key text not null default '*',
  rate_percent numeric(5,2) not null default 0 check (rate_percent between 0 and 10),
  fixed_inr numeric(12,2) not null default 0 check (fixed_inr between 0 and 10000),
  fee_basis text not null default 'order' check (fee_basis in ('order','unit')),
  display_name text not null default 'WE4ALL fee' check (length(btrim(display_name)) between 2 and 100),
  disclosure_text text not null default '',
  terms_version text,
  active boolean not null default false,
  effective_at timestamptz not null default now(),
  ends_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fee_type, scope_type, scope_key),
  check (ends_at is null or ends_at > effective_at),
  check (rate_percent = 0 or fixed_inr = 0),
  check (scope_type <> 'global' or scope_key = '*'),
  check (scope_type = 'global' or length(btrim(scope_key)) > 0),
  check (rate_percent = 0 and fixed_inr = 0 or length(btrim(disclosure_text)) >= 8)
);

create index if not exists we4all_fee_policies_active_lookup_idx
  on public.we4all_fee_policies(fee_type, active, effective_at desc)
  where active = true;
create index if not exists we4all_fee_policies_scope_lookup_idx
  on public.we4all_fee_policies(scope_type, scope_key, fee_type)
  where active = true;

create table if not exists public.we4all_fee_policy_events (
  id bigint generated always as identity primary key,
  fee_policy_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('created','updated','activated','deactivated')),
  before_snapshot jsonb,
  after_snapshot jsonb not null,
  occurred_at timestamptz not null default now()
);
create index if not exists we4all_fee_policy_events_policy_time_idx
  on public.we4all_fee_policy_events(fee_policy_id, occurred_at desc);

alter table public.we4all_fee_policies enable row level security;
alter table public.we4all_fee_policy_events enable row level security;
revoke all on public.we4all_fee_policies, public.we4all_fee_policy_events from public, anon, authenticated;
grant select on public.we4all_fee_policies to authenticated;
grant all on public.we4all_fee_policies, public.we4all_fee_policy_events to service_role;

drop policy if exists "Users can read current customer-facing fee policies" on public.we4all_fee_policies;
create policy "Users can read current customer-facing fee policies"
on public.we4all_fee_policies for select to authenticated
using (
  fee_type in ('customer_platform_fee','rider_priority_fee')
  and active = true
  and effective_at <= now()
  and (ends_at is null or ends_at > now())
);

insert into public.we4all_fee_policies(fee_type,scope_type,scope_key,rate_percent,fixed_inr,fee_basis,display_name,active,version)
values
  ('merchant_commission','global','*',0,0,'order','Merchant commission',true,1),
  ('customer_platform_fee','global','*',0,0,'order','WE4ALL platform fee',true,1),
  ('rider_priority_fee','global','*',0,0,'order','Rider priority service fee',true,1)
on conflict (fee_type,scope_type,scope_key) do nothing;

create or replace function public.we4all_manage_fee_policy(
  p_policy jsonb,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_fee_type text := p_policy->>'fee_type';
  v_scope_type text := coalesce(nullif(p_policy->>'scope_type',''),'global');
  v_scope_key text := coalesce(nullif(pg_catalog.btrim(p_policy->>'scope_key'),''),'*');
  v_rate numeric(5,2) := coalesce(nullif(p_policy->>'rate_percent','')::numeric,0);
  v_fixed numeric(12,2) := coalesce(nullif(p_policy->>'fixed_inr','')::numeric,0);
  v_basis text := coalesce(nullif(p_policy->>'fee_basis',''),'order');
  v_name text := coalesce(nullif(pg_catalog.btrim(p_policy->>'display_name'),''),'WE4ALL fee');
  v_disclosure text := coalesce(pg_catalog.btrim(p_policy->>'disclosure_text'),'');
  v_terms text := nullif(pg_catalog.btrim(p_policy->>'terms_version'),'');
  v_active boolean := coalesce((p_policy->>'active')::boolean,false);
  v_effective timestamptz := coalesce(nullif(p_policy->>'effective_at','')::timestamptz,pg_catalog.now());
  v_ends timestamptz := nullif(p_policy->>'ends_at','')::timestamptz;
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
  v_version integer;
  v_action text;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'SERVER_ONLY_FEE_POLICY_WRITE' using errcode='42501';
  end if;
  if p_actor_id is null then raise exception 'FOUNDER_ACTOR_REQUIRED' using errcode='22023'; end if;
  if v_fee_type not in ('merchant_commission','customer_platform_fee','rider_priority_fee') then
    raise exception 'INVALID_FEE_TYPE' using errcode='22023';
  end if;
  if v_scope_type not in ('global','category','catalog_item','service','zone') then
    raise exception 'INVALID_FEE_SCOPE' using errcode='22023';
  end if;
  if (v_scope_type='global' and v_scope_key<>'*') or (v_scope_type<>'global' and v_scope_key='*') then
    raise exception 'INVALID_FEE_SCOPE_KEY' using errcode='22023';
  end if;
  if v_basis not in ('order','unit') or v_rate < 0 or v_fixed < 0 or v_fixed > 10000 or (v_rate>0 and v_fixed>0) then
    raise exception 'INVALID_FEE_VALUE' using errcode='22023';
  end if;
  if v_fee_type='merchant_commission' and v_rate>10 then raise exception 'MERCHANT_COMMISSION_LIMIT_10_PERCENT' using errcode='22023'; end if;
  if v_fee_type='customer_platform_fee' and v_rate>5 then raise exception 'CUSTOMER_FEE_LIMIT_5_PERCENT' using errcode='22023'; end if;
  if v_fee_type='rider_priority_fee' and v_rate>10 then raise exception 'RIDER_FEE_LIMIT_10_PERCENT' using errcode='22023'; end if;
  if (v_rate>0 or v_fixed>0) and pg_catalog.length(v_disclosure)<8 then
    raise exception 'FEE_DISCLOSURE_REQUIRED' using errcode='22023';
  end if;
  if v_active and (v_rate>0 or v_fixed>0) and v_fee_type<>'customer_platform_fee' then
    raise exception 'FEE_FLOW_NOT_CONNECTED' using errcode='22023';
  end if;
  if v_active and (v_rate>0 or v_fixed>0) and v_scope_type not in ('global','category','catalog_item') then
    raise exception 'FEE_SCOPE_NOT_CONNECTED' using errcode='22023';
  end if;
  if v_fee_type='merchant_commission' and v_active and (v_rate>0 or v_fixed>0) and coalesce(v_terms,'') not like 'final-%' then
    raise exception 'FINAL_MERCHANT_TERMS_REQUIRED' using errcode='22023';
  end if;
  if v_ends is not null and v_ends<=v_effective then raise exception 'INVALID_FEE_EFFECTIVE_WINDOW' using errcode='22023'; end if;

  select pg_catalog.to_jsonb(p) into v_before from public.we4all_fee_policies p
    where p.fee_type=v_fee_type and p.scope_type=v_scope_type and p.scope_key=v_scope_key for update;
  insert into public.we4all_fee_policies(
    fee_type,scope_type,scope_key,rate_percent,fixed_inr,fee_basis,display_name,disclosure_text,
    terms_version,active,effective_at,ends_at,version,created_by,updated_by
  ) values (
    v_fee_type,v_scope_type,v_scope_key,v_rate,v_fixed,v_basis,v_name,v_disclosure,v_terms,v_active,
    v_effective,v_ends,1,p_actor_id,p_actor_id
  )
  on conflict (fee_type,scope_type,scope_key) do update set
    rate_percent=excluded.rate_percent,
    fixed_inr=excluded.fixed_inr,
    fee_basis=excluded.fee_basis,
    display_name=excluded.display_name,
    disclosure_text=excluded.disclosure_text,
    terms_version=excluded.terms_version,
    active=excluded.active,
    effective_at=excluded.effective_at,
    ends_at=excluded.ends_at,
    version=public.we4all_fee_policies.version+1,
    updated_by=excluded.updated_by,
    updated_at=pg_catalog.now()
  returning id,version into v_id,v_version;

  select pg_catalog.to_jsonb(p) into v_after
    from public.we4all_fee_policies p where p.id=v_id;

  v_action := case when v_before is null then 'created'
    when coalesce((v_before->>'active')::boolean,false) and not v_active then 'deactivated'
    when not coalesce((v_before->>'active')::boolean,false) and v_active then 'activated'
    else 'updated' end;
  insert into public.we4all_fee_policy_events(fee_policy_id,actor_user_id,action,before_snapshot,after_snapshot)
  values(v_id,p_actor_id,v_action,v_before,v_after);

  return pg_catalog.jsonb_build_object('ok',true,'action',v_action,'policy',v_after);
end;
$function$;

revoke all on function public.we4all_manage_fee_policy(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.we4all_manage_fee_policy(jsonb,uuid) to service_role;
