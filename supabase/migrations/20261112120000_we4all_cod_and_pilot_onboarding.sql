-- WE4ALL v3.3.5: Cash on Delivery (COD) support, self-healing customer bootstrap, and pilot partner KYC approval
alter table public.we4all_orders
  add column if not exists payment_method text not null default 'upi'
    check (payment_method in ('upi', 'cod', 'cashfree')),
  add column if not exists cod_collected_at timestamptz;

-- Allow any authenticated user to self-bootstrap their own customer profile and approved customer role if missing
create or replace function public.we4all_bootstrap_customer_account(
  p_full_name text default '',
  p_phone text default '',
  p_area text default ''
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_name text := coalesce(nullif(pg_catalog.btrim(p_full_name), ''), 'WE4ALL Customer');
  v_phone text := coalesce(nullif(pg_catalog.btrim(p_phone), ''), '');
  v_area text := coalesce(nullif(pg_catalog.btrim(p_area), ''), 'Adilabad');
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  insert into public.we4all_profiles(user_id, full_name, phone, area, updated_at)
  values (v_uid, v_name, v_phone, v_area, pg_catalog.now())
  on conflict (user_id) do update
    set full_name = case when pg_catalog.length(pg_catalog.btrim(public.we4all_profiles.full_name)) = 0 then excluded.full_name else public.we4all_profiles.full_name end,
        phone = case when pg_catalog.length(pg_catalog.btrim(public.we4all_profiles.phone)) = 0 then excluded.phone else public.we4all_profiles.phone end,
        area = case when pg_catalog.length(pg_catalog.btrim(public.we4all_profiles.area)) = 0 then excluded.area else public.we4all_profiles.area end,
        updated_at = pg_catalog.now();

  insert into public.we4all_user_roles(user_id, role, status, updated_at)
  values (v_uid, 'customer', 'approved', pg_catalog.now())
  on conflict (user_id, role) do update
    set status = 'approved', updated_at = pg_catalog.now();

  return pg_catalog.jsonb_build_object('ok', true, 'user_id', v_uid, 'role', 'customer', 'status', 'approved');
end;
$function$;

revoke all on function public.we4all_bootstrap_customer_account(text, text, text) from public, anon;
grant execute on function public.we4all_bootstrap_customer_account(text, text, text) to authenticated, service_role;

-- Upgrade we4all_create_order to support optional p_payment_method ('upi' | 'cod' | 'cashfree')
create or replace function public.we4all_create_order(
  p_customer_user_id uuid,
  p_partner_id uuid,
  p_items jsonb,
  p_zone_id text,
  p_delivery_address jsonb,
  p_idempotency_key text,
  p_fee_policy_versions jsonb,
  p_payment_method text default 'upi'
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
  v_subcat text;
  v_payment_method text := case when pg_catalog.lower(coalesce(p_payment_method, 'upi')) in ('cod', 'cashfree') then pg_catalog.lower(p_payment_method) else 'upi' end;
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
      'status',v_existing.status,'payment_status',v_existing.payment_status,'payment_method',v_existing.payment_method,
      'subtotal_inr',v_existing.subtotal_inr,'customer_platform_fee_inr',v_existing.customer_platform_fee_inr,
      'fee_breakdown',v_existing.fee_breakdown,'total_inr',v_existing.total_inr
    );
  end if;

  if (select pg_catalog.count(*) from pg_catalog.jsonb_to_recordset(p_items) as x(catalog_item_id uuid,quantity integer))
  <> (select pg_catalog.count(distinct catalog_item_id) from pg_catalog.jsonb_to_recordset(p_items) as x(catalog_item_id uuid,quantity integer)) then
    raise exception 'DUPLICATE_CATALOG_ITEM' using errcode='22023';
  end if;

  select * into v_partner from public.we4all_partners
    where id=p_partner_id and partner_type='merchant' and approval_status='approved' for share;
  if not found then raise exception 'MERCHANT_NOT_APPROVED' using errcode='42501'; end if;

  for v_input in select x.catalog_item_id,x.quantity from pg_catalog.jsonb_to_recordset(p_items) as x(catalog_item_id uuid,quantity integer) loop
    v_item_count:=v_item_count+1;
    if v_input.catalog_item_id is null or v_input.quantity is null or v_input.quantity<1 or v_input.quantity>100 then
      raise exception 'INVALID_ITEM_QUANTITY' using errcode='22023';
    end if;
    select * into v_item from public.we4all_catalog_items
      where id=v_input.catalog_item_id and partner_id=p_partner_id and approval_status='approved' and is_active=true for update;
    if not found then raise exception 'CATALOG_ITEM_UNAVAILABLE' using errcode='P0002'; end if;
    if v_item.stock_quantity is not null and v_item.stock_quantity<v_input.quantity then
      raise exception 'INSUFFICIENT_STOCK' using errcode='23514';
    end if;
    v_subtotal:=v_subtotal+(v_item.price_inr*v_input.quantity);
    v_subcat := coalesce(v_item.metadata->>'subcategory_key', '');

    select * into v_policy from public.we4all_fee_policies p
     where p.fee_type='customer_platform_fee' and p.active=true
       and p.effective_at<=pg_catalog.now() and (p.ends_at is null or p.ends_at>pg_catalog.now())
       and ((p.scope_type='catalog_item' and p.scope_key=v_item.id::text)
         or (p.scope_type='subcategory' and v_subcat<>'' and p.scope_key=v_subcat)
         or (p.scope_type='category' and p.scope_key=v_item.category_key)
         or (p.scope_type='global' and p.scope_key='*'))
     order by case p.scope_type when 'catalog_item' then 4 when 'subcategory' then 3 when 'category' then 2 else 1 end desc,
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
  insert into public.we4all_orders(id,customer_user_id,partner_id,zone_id,order_number,status,payment_status,payment_method,subtotal_inr,tax_inr,delivery_fee_inr,discount_inr,customer_platform_fee_inr,fee_breakdown,total_inr,idempotency_key,delivery_address)
  values(v_order_id,p_customer_user_id,p_partner_id,p_zone_id,v_order_number,'awaiting_payment','pending',v_payment_method,v_subtotal,0,0,0,v_platform_fee,v_fee_breakdown,v_subtotal+v_platform_fee,p_idempotency_key,p_delivery_address);

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
    'status','awaiting_payment','payment_status','pending','payment_method',v_payment_method,
    'subtotal_inr',v_subtotal,'customer_platform_fee_inr',v_platform_fee,'fee_breakdown',v_fee_breakdown,
    'tax_inr',0,'delivery_fee_inr',0,'total_inr',v_subtotal+v_platform_fee,
    'message',case when v_payment_method='cod' then 'COD order created. Pay cash or UPI at doorstep upon delivery.' else 'Order created. Review the itemized total before provider payment.' end
  );
end;
$function$;

revoke all on function public.we4all_create_order(uuid,uuid,jsonb,text,jsonb,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.we4all_create_order(uuid,uuid,jsonb,text,jsonb,text,jsonb,text) to service_role;

-- Allow customer to switch their pending order to Cash on Delivery (COD)
create or replace function public.we4all_select_cod_payment(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_order public.we4all_orders%rowtype;
  v_next_status text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_order from public.we4all_orders where id = p_order_id and customer_user_id = v_uid for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_order.status in ('cancelled', 'refunded', 'delivered') then
    raise exception 'ORDER_NOT_MODIFIABLE' using errcode = '40001';
  end if;
  v_next_status := case when v_order.status = 'merchant_confirmed' then 'accepted' else v_order.status end;
  update public.we4all_orders
    set payment_method = 'cod',
        status = v_next_status,
        updated_at = pg_catalog.now()
    where id = p_order_id;
  return pg_catalog.jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'status', v_next_status,
    'payment_status', v_order.payment_status,
    'payment_method', 'cod'
  );
end;
$function$;

revoke all on function public.we4all_select_cod_payment(uuid) from public, anon;
grant execute on function public.we4all_select_cod_payment(uuid) to authenticated, service_role;

-- Allow merchant to confirm COD orders directly to 'accepted' and mark COD cash collected at delivery
create or replace function public.we4all_merchant_confirm_order(
  p_order_id uuid,
  p_merchant_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.we4all_orders%rowtype;
  v_partner public.we4all_partners%rowtype;
  v_next_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'SERVER_ONLY_ORDER_CONFIRMATION' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.we4all_user_roles
    where user_id = p_merchant_user_id and role = 'merchant' and status = 'approved'
  ) then
    raise exception 'APPROVED_MERCHANT_REQUIRED' using errcode = '42501';
  end if;
  select o.* into v_order
  from public.we4all_orders o
  join public.we4all_partners p on p.id = o.partner_id
  where o.id = p_order_id and p.owner_user_id = p_merchant_user_id and p.partner_type = 'merchant' and p.approval_status = 'approved'
  for update of o;
  if not found then
    raise exception 'ORDER_NOT_FOUND_OR_NOT_OWNED' using errcode = 'P0002';
  end if;
  if v_order.status in ('merchant_confirmed', 'accepted') then
    return pg_catalog.jsonb_build_object(
      'ok', true, 'duplicate', true, 'order_id', v_order.id, 'order_number', v_order.order_number,
      'status', v_order.status, 'payment_status', v_order.payment_status, 'payment_method', v_order.payment_method
    );
  end if;
  if v_order.status not in ('awaiting_payment', 'paid') then
    raise exception 'ORDER_NOT_CONFIRMABLE' using errcode = '40001';
  end if;
  v_next_status := case
    when v_order.payment_status = 'paid' or v_order.payment_method = 'cod' then 'accepted'
    else 'merchant_confirmed'
  end;
  update public.we4all_orders
    set status = v_next_status, updated_at = pg_catalog.now()
    where id = v_order.id;
  insert into public.we4all_audit_events(actor_user_id, actor_role, action, entity_type, entity_id, zone_id, metadata)
  values (
    p_merchant_user_id, 'merchant', 'merchant_confirm_order', 'order', v_order.id, v_order.zone_id,
    pg_catalog.jsonb_build_object('previous_status', v_order.status, 'new_status', v_next_status, 'payment_status', v_order.payment_status, 'payment_method', v_order.payment_method)
  );
  return pg_catalog.jsonb_build_object(
    'ok', true, 'duplicate', false, 'order_id', v_order.id, 'order_number', v_order.order_number,
    'status', v_next_status, 'payment_status', v_order.payment_status, 'payment_method', v_order.payment_method
  );
end;
$function$;

revoke all on function public.we4all_merchant_confirm_order(uuid, uuid) from public, anon, authenticated;
grant execute on function public.we4all_merchant_confirm_order(uuid, uuid) to service_role;

-- Allow approved merchant to confirm COD cash collection upon delivery
create or replace function public.we4all_confirm_cod_collection(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_order public.we4all_orders%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select o.* into v_order
  from public.we4all_orders o
  join public.we4all_partners p on p.id = o.partner_id
  where o.id = p_order_id and p.owner_user_id = v_uid and p.partner_type = 'merchant' and p.approval_status = 'approved'
  for update of o;
  if not found then raise exception 'ORDER_NOT_FOUND_OR_NOT_OWNED' using errcode = 'P0002'; end if;
  if v_order.payment_method <> 'cod' then raise exception 'NOT_A_COD_ORDER' using errcode = '40001'; end if;
  if v_order.status in ('cancelled', 'refunded') then raise exception 'ORDER_CANCELLED' using errcode = '40001'; end if;
  update public.we4all_orders
    set payment_status = 'paid',
        status = case when v_order.status in ('awaiting_payment', 'merchant_confirmed') then 'accepted' else v_order.status end,
        cod_collected_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where id = p_order_id;
  insert into public.we4all_audit_events(actor_user_id, actor_role, action, entity_type, entity_id, zone_id, metadata)
  values (v_uid, 'merchant', 'cod_payment_collected', 'order', v_order.id, v_order.zone_id, pg_catalog.jsonb_build_object('total_inr', v_order.total_inr));
  return pg_catalog.jsonb_build_object('ok', true, 'order_id', v_order.id, 'payment_status', 'paid', 'payment_method', 'cod');
end;
$function$;

revoke all on function public.we4all_confirm_cod_collection(uuid) from public, anon;
grant execute on function public.we4all_confirm_cod_collection(uuid) to authenticated, service_role;
