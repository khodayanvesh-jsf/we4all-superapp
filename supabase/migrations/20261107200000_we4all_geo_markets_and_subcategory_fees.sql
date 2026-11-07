-- Dynamic local markets are created from submitted partner coordinates.
-- A cell is ~5.5km north/south and adapts east/west by latitude.
create table if not exists public.we4all_markets (
  id text primary key,
  display_name text not null default 'Local Market',
  center_lat numeric(9,6) not null check (center_lat between -90 and 90),
  center_lng numeric(9,6) not null check (center_lng between -180 and 180),
  state_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.we4all_markets enable row level security;
revoke all on public.we4all_markets from public, anon, authenticated;
grant select on public.we4all_markets to anon, authenticated;
grant all on public.we4all_markets to service_role;
drop policy if exists "Active local markets are discoverable" on public.we4all_markets;
create policy "Active local markets are discoverable" on public.we4all_markets
  for select to anon, authenticated using (active = true);

alter table public.we4all_partners
  add column if not exists market_id text references public.we4all_markets(id),
  add column if not exists business_latitude numeric(9,6) check (business_latitude is null or business_latitude between -90 and 90),
  add column if not exists business_longitude numeric(9,6) check (business_longitude is null or business_longitude between -180 and 180);
create index if not exists we4all_partners_market_idx
  on public.we4all_partners(market_id, approval_status, partner_type);

create or replace function public.we4all_register_market(
  p_latitude double precision,
  p_longitude double precision,
  p_display_name text default '',
  p_state_name text default ''
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_lat_cell integer;
  v_lng_cell integer;
  v_market_id text;
  v_lat numeric(9,6);
  v_lng numeric(9,6);
  v_name text := coalesce(nullif(pg_catalog.left(pg_catalog.btrim(p_display_name),120),''),'Local Market');
begin
  if (select auth.uid()) is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
  if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'VALID_BUSINESS_LOCATION_REQUIRED' using errcode='22023';
  end if;
  v_lat_cell := pg_catalog.floor(p_latitude * 20 + 0.5)::integer;
  v_lng_cell := pg_catalog.floor(p_longitude * 20 + 0.5)::integer;
  v_market_id := 'm_' || v_lat_cell::text || '_' || v_lng_cell::text;
  v_lat := v_lat_cell::numeric / 20;
  v_lng := v_lng_cell::numeric / 20;
  insert into public.we4all_markets(id,display_name,center_lat,center_lng,state_name)
  values(v_market_id,v_name,v_lat,v_lng,coalesce(pg_catalog.left(pg_catalog.btrim(p_state_name),80),''))
  on conflict(id) do update set
    display_name=case when public.we4all_markets.display_name='Local Market' then excluded.display_name else public.we4all_markets.display_name end,
    state_name=case when public.we4all_markets.state_name='' then excluded.state_name else public.we4all_markets.state_name end,
    active=true,updated_at=pg_catalog.now();
  return v_market_id;
end;
$function$;
revoke all on function public.we4all_register_market(double precision,double precision,text,text) from public, anon;
grant execute on function public.we4all_register_market(double precision,double precision,text,text) to authenticated;

-- Optional product sub-catalog scope for checkout fees.
alter table public.we4all_fee_policies drop constraint if exists we4all_fee_policies_scope_type_check;
alter table public.we4all_fee_policies add constraint we4all_fee_policies_scope_type_check
  check (scope_type in ('global','category','catalog_item','service','zone','subcategory'));
create or replace function public.we4all_manage_fee_policy(p_policy jsonb,p_actor_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $function$
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
  v_before jsonb; v_after jsonb; v_id uuid; v_version integer; v_action text;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'SERVER_ONLY_FEE_POLICY_WRITE' using errcode='42501'; end if;
  if p_actor_id is null then raise exception 'FOUNDER_ACTOR_REQUIRED' using errcode='22023'; end if;
  if v_fee_type not in ('merchant_commission','customer_platform_fee','rider_priority_fee') then raise exception 'INVALID_FEE_TYPE' using errcode='22023'; end if;
  if v_scope_type not in ('global','category','catalog_item','service','zone','subcategory') then raise exception 'INVALID_FEE_SCOPE' using errcode='22023'; end if;
  if (v_scope_type='global' and v_scope_key<>'*') or (v_scope_type<>'global' and v_scope_key='*') then raise exception 'INVALID_FEE_SCOPE_KEY' using errcode='22023'; end if;
  if v_basis not in ('order','unit') or v_rate<0 or v_fixed<0 or v_fixed>10000 or (v_rate>0 and v_fixed>0) then raise exception 'INVALID_FEE_VALUE' using errcode='22023'; end if;
  if v_fee_type='merchant_commission' and v_rate>10 then raise exception 'MERCHANT_COMMISSION_LIMIT_10_PERCENT' using errcode='22023'; end if;
  if v_fee_type='customer_platform_fee' and v_rate>5 then raise exception 'CUSTOMER_FEE_LIMIT_5_PERCENT' using errcode='22023'; end if;
  if v_fee_type='rider_priority_fee' and v_rate>10 then raise exception 'RIDER_FEE_LIMIT_10_PERCENT' using errcode='22023'; end if;
  if (v_rate>0 or v_fixed>0) and pg_catalog.length(v_disclosure)<8 then raise exception 'FEE_DISCLOSURE_REQUIRED' using errcode='22023'; end if;
  if v_active and (v_rate>0 or v_fixed>0) and v_fee_type<>'customer_platform_fee' then raise exception 'FEE_FLOW_NOT_CONNECTED' using errcode='22023'; end if;
  if v_active and (v_rate>0 or v_fixed>0) and v_scope_type not in ('global','category','catalog_item','subcategory') then raise exception 'FEE_SCOPE_NOT_CONNECTED' using errcode='22023'; end if;
  if v_fee_type='merchant_commission' and v_active and (v_rate>0 or v_fixed>0) and coalesce(v_terms,'') not like 'final-%' then raise exception 'FINAL_MERCHANT_TERMS_REQUIRED' using errcode='22023'; end if;
  if v_ends is not null and v_ends<=v_effective then raise exception 'INVALID_FEE_EFFECTIVE_WINDOW' using errcode='22023'; end if;
  select pg_catalog.to_jsonb(p) into v_before from public.we4all_fee_policies p where p.fee_type=v_fee_type and p.scope_type=v_scope_type and p.scope_key=v_scope_key for update;
  insert into public.we4all_fee_policies(fee_type,scope_type,scope_key,rate_percent,fixed_inr,fee_basis,display_name,disclosure_text,terms_version,active,effective_at,ends_at,version,created_by,updated_by)
  values(v_fee_type,v_scope_type,v_scope_key,v_rate,v_fixed,v_basis,v_name,v_disclosure,v_terms,v_active,v_effective,v_ends,1,p_actor_id,p_actor_id)
  on conflict (fee_type,scope_type,scope_key) do update set rate_percent=excluded.rate_percent,fixed_inr=excluded.fixed_inr,fee_basis=excluded.fee_basis,display_name=excluded.display_name,disclosure_text=excluded.disclosure_text,terms_version=excluded.terms_version,active=excluded.active,effective_at=excluded.effective_at,ends_at=excluded.ends_at,version=public.we4all_fee_policies.version+1,updated_by=excluded.updated_by,updated_at=pg_catalog.now()
  returning id,version into v_id,v_version;
  select pg_catalog.to_jsonb(p) into v_after from public.we4all_fee_policies p where p.id=v_id;
  v_action:=case when v_before is null then 'created' when coalesce((v_before->>'active')::boolean,false) is distinct from v_active then case when v_active then 'activated' else 'deactivated' end else 'updated' end;
  insert into public.we4all_fee_policy_events(fee_policy_id,actor_user_id,action,before_snapshot,after_snapshot) values(v_id,p_actor_id,v_action,v_before,v_after);
  return v_after;
end;
$function$;
revoke all on function public.we4all_manage_fee_policy(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.we4all_manage_fee_policy(jsonb,uuid) to service_role;

-- Backward compatible review function, now attaches the verified submitted market coordinates.
create or replace function public.we4all_review_partner_application(
 p_application_id uuid,p_new_status text,p_reviewer_id uuid
) returns table(application_id uuid,user_id uuid,requested_role text,status text,reviewed_at timestamptz)
language plpgsql security definer set search_path = '' as $function$
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
 on conflict(user_id,role) do update set status=excluded.status,updated_at=excluded.updated_at;
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
revoke all on function public.we4all_review_partner_application(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.we4all_review_partner_application(uuid,text,uuid) to service_role;


-- Checkout applies sub-catalog fees before item/category/global policies.
create or replace function public.we4all_create_order(
 p_customer_user_id uuid,
 p_partner_id uuid,
 p_items jsonb,
 p_zone_id text,
 p_delivery_address jsonb,
 p_idempotency_key text,
 p_fee_policy_versions jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
 v_partner public.we4all_partners%rowtype;
 v_item public.we4all_catalog_items%rowtype;
 v_policy public.we4all_fee_policies%rowtype;
 v_input record;
 v_order_id uuid := pg_catalog.gen_random_uuid();
 v_order_number text;
 v_subtotal numeric(12,2) := 0;
 v_platform_fee numeric(12,2) := 0;
 v_line_fee numeric(12,2) := 0;
 v_existing public.we4all_orders%rowtype;
 v_item_count integer := 0;
 v_fee_breakdown jsonb := '[]'::jsonb;
 v_fee_version text;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'SERVER_ONLY_ORDER_CREATION' using errcode='42501'; end if;
 if p_customer_user_id is null then raise exception 'CUSTOMER_REQUIRED' using errcode='22023'; end if;
 if p_partner_id is null or p_zone_id is null or pg_catalog.length(pg_catalog.btrim(p_zone_id))<2 then raise exception 'INVALID_CHECKOUT_CONTEXT' using errcode='22023'; end if;
 if p_idempotency_key is null or pg_catalog.length(pg_catalog.btrim(p_idempotency_key))<8 or pg_catalog.length(p_idempotency_key)>160 then raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode='22023'; end if;
 if pg_catalog.jsonb_typeof(p_items)<>'array' or pg_catalog.jsonb_array_length(p_items)<1 or pg_catalog.jsonb_array_length(p_items)>50 then raise exception 'INVALID_ORDER_ITEMS' using errcode='22023'; end if;
 if pg_catalog.jsonb_typeof(p_delivery_address)<>'object' or p_delivery_address='{}'::jsonb then raise exception 'DELIVERY_ADDRESS_REQUIRED' using errcode='22023'; end if;
 if pg_catalog.jsonb_typeof(p_fee_policy_versions)<>'object' then raise exception 'FEE_POLICY_CHANGED' using errcode='40001'; end if;

 select * into v_existing from public.we4all_orders where customer_user_id=p_customer_user_id and idempotency_key=p_idempotency_key;
 if found then
   return pg_catalog.jsonb_build_object(
     'ok',true,'duplicate',true,'order_id',v_existing.id,'order_number',v_existing.order_number,
     'status',v_existing.status,'payment_status',v_existing.payment_status,'subtotal_inr',v_existing.subtotal_inr,
     'customer_platform_fee_inr',v_existing.customer_platform_fee_inr,'fee_breakdown',v_existing.fee_breakdown,'total_inr',v_existing.total_inr
   );
 end if;
 if (select pg_catalog.count(*) from pg_catalog.jsonb_to_recordset(p_items) as x(catalog_item_id uuid,quantity integer))
 <> (select pg_catalog.count(distinct catalog_item_id) from pg_catalog.jsonb_to_recordset(p_items) as x(catalog_item_id uuid,quantity integer)) then raise exception 'DUPLICATE_CATALOG_ITEM' using errcode='22023'; end if;

 select * into v_partner from public.we4all_partners
   where id=p_partner_id and partner_type='merchant' and approval_status='approved' for share;
 if not found then raise exception 'MERCHANT_NOT_APPROVED' using errcode='42501'; end if;

 for v_input in select x.catalog_item_id,x.quantity from pg_catalog.jsonb_to_recordset(p_items) as x(catalog_item_id uuid,quantity integer) loop
  v_item_count:=v_item_count+1;
  if v_input.catalog_item_id is null or v_input.quantity is null or v_input.quantity<1 or v_input.quantity>100 then raise exception 'INVALID_ITEM_QUANTITY' using errcode='22023'; end if;
  select * into v_item from public.we4all_catalog_items
    where id=v_input.catalog_item_id and partner_id=p_partner_id and approval_status='approved' and is_active=true for update;
  if not found then raise exception 'CATALOG_ITEM_UNAVAILABLE' using errcode='P0002'; end if;
  if v_item.stock_quantity is not null and v_item.stock_quantity<v_input.quantity then raise exception 'INSUFFICIENT_STOCK' using errcode='23514'; end if;
  v_subtotal:=v_subtotal+(v_item.price_inr*v_input.quantity);

  select * into v_policy from public.we4all_fee_policies p
   where p.fee_type='customer_platform_fee' and p.active=true
     and p.effective_at<=pg_catalog.now() and (p.ends_at is null or p.ends_at>pg_catalog.now())
     and ((p.scope_type='catalog_item' and p.scope_key=v_item.id::text)
       or (p.scope_type='subcategory' and p.scope_key=(v_item.metadata->>'subcategory_key'))
       or (p.scope_type='category' and p.scope_key=v_item.category_key)
       or (p.scope_type='global' and p.scope_key='*'))
   order by case p.scope_type when 'subcategory' then 4 when 'catalog_item' then 3 when 'category' then 2 else 1 end desc,
     p.effective_at desc, p.version desc
   limit 1 for share;
  if not found then raise exception 'FEE_POLICY_CHANGED' using errcode='40001'; end if;
  v_fee_version:=p_fee_policy_versions->>v_policy.id::text;
  if coalesce(v_fee_version,'')<>v_policy.version::text then raise exception 'FEE_POLICY_CHANGED' using errcode='40001'; end if;
  v_line_fee:=0;
  if v_policy.rate_percent>0 then
    v_line_fee:=pg_catalog.round(v_item.price_inr*v_input.quantity*v_policy.rate_percent/100,2);
  elsif v_policy.fixed_inr>0 then
    if v_policy.fee_basis='order' then
      if v_item_count=1 then v_line_fee:=v_policy.fixed_inr; end if;
    else
      v_line_fee:=v_policy.fixed_inr*v_input.quantity;
    end if;
  end if;
  v_platform_fee:=v_platform_fee+v_line_fee;
  v_fee_breakdown:=v_fee_breakdown||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'catalog_item_id',v_item.id,'title',v_item.title,'quantity',v_input.quantity,
    'subtotal_inr',pg_catalog.round(v_item.price_inr*v_input.quantity,2),
    'fee_policy_id',v_policy.id,'fee_policy_version',v_policy.version,
    'fee_label',case when v_line_fee>0 then v_policy.display_name else 'Platform fee' end,
    'platform_fee_inr',v_line_fee,
    'disclosure_text',case when v_line_fee>0 then v_policy.disclosure_text else 'No WE4ALL platform fee at launch.' end
  ));
 end loop;
 if v_item_count=0 then raise exception 'EMPTY_ORDER' using errcode='22023'; end if;

 v_order_number:='WE4-'||pg_catalog.to_char(pg_catalog.now() at time zone 'UTC','YYYYMMDD')||'-'||pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(v_order_id::text,'-',''),1,8));
 insert into public.we4all_orders(id,customer_user_id,partner_id,zone_id,order_number,status,payment_status,subtotal_inr,tax_inr,delivery_fee_inr,discount_inr,customer_platform_fee_inr,fee_breakdown,total_inr,idempotency_key,delivery_address)
 values(v_order_id,p_customer_user_id,p_partner_id,p_zone_id,v_order_number,'awaiting_payment','pending',v_subtotal,0,0,0,v_platform_fee,v_fee_breakdown,v_subtotal+v_platform_fee,p_idempotency_key,p_delivery_address);

 for v_input in select x.catalog_item_id,x.quantity from pg_catalog.jsonb_to_recordset(p_items) as x(catalog_item_id uuid,quantity integer) loop
  select * into v_item from public.we4all_catalog_items where id=v_input.catalog_item_id and partner_id=p_partner_id for update;
  insert into public.we4all_order_items(order_id,catalog_item_id,item_title_snapshot,sku_snapshot,quantity,unit_price_inr,tax_rate,line_total_inr)
  values(v_order_id,v_item.id,v_item.title,v_item.sku,v_input.quantity,v_item.price_inr,0,v_item.price_inr*v_input.quantity);
  if v_item.stock_quantity is not null then
   update public.we4all_catalog_items set stock_quantity=stock_quantity-v_input.quantity,updated_at=pg_catalog.now() where id=v_item.id;
   insert into public.we4all_inventory_movements(catalog_item_id,partner_id,movement_type,quantity_delta,reference_type,reference_id,idempotency_key,created_by)
   values(v_item.id,p_partner_id,'reservation',-v_input.quantity,'order',v_order_id,'order:'||v_order_id::text||':item:'||v_item.id::text,p_customer_user_id);
  end if;
 end loop;
 return pg_catalog.jsonb_build_object(
   'ok',true,'duplicate',false,'order_id',v_order_id,'order_number',v_order_number,
   'status','awaiting_payment','payment_status','pending','subtotal_inr',v_subtotal,
   'customer_platform_fee_inr',v_platform_fee,'fee_breakdown',v_fee_breakdown,
   'tax_inr',0,'delivery_fee_inr',0,'total_inr',v_subtotal+v_platform_fee,
   'message','Order created. Review the itemized total before provider payment.'
 );
end;
$function$;

revoke all on function public.we4all_create_order(uuid,uuid,jsonb,text,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.we4all_create_order(uuid,uuid,jsonb,text,jsonb,text,jsonb) to service_role;
