-- Replace the authenticated SECURITY DEFINER RPC with a service-role-only function.
-- The Edge Function verifies the customer JWT and approved customer role before calling this.
drop function if exists public.we4all_create_order(uuid,jsonb,text,jsonb,text);
create or replace function public.we4all_create_order(
 p_customer_user_id uuid,p_partner_id uuid,p_items jsonb,p_zone_id text,p_delivery_address jsonb,p_idempotency_key text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 v_partner public.we4all_partners%rowtype; v_item public.we4all_catalog_items%rowtype; v_input record;
 v_order_id uuid := pg_catalog.gen_random_uuid(); v_order_number text;
 v_subtotal numeric(12,2) := 0; v_existing public.we4all_orders%rowtype; v_item_count integer := 0;
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'SERVER_ONLY_ORDER_CREATION' using errcode='42501'; end if;
 if p_customer_user_id is null then raise exception 'CUSTOMER_REQUIRED' using errcode='22023'; end if;
 if p_partner_id is null or p_zone_id is null or pg_catalog.length(pg_catalog.trim(p_zone_id))<2 then raise exception 'INVALID_CHECKOUT_CONTEXT' using errcode='22023'; end if;
 if p_idempotency_key is null or pg_catalog.length(pg_catalog.trim(p_idempotency_key))<8 or pg_catalog.length(p_idempotency_key)>160 then raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode='22023'; end if;
 if pg_catalog.jsonb_typeof(p_items)<>'array' or pg_catalog.jsonb_array_length(p_items)<1 or pg_catalog.jsonb_array_length(p_items)>50 then raise exception 'INVALID_ORDER_ITEMS' using errcode='22023'; end if;
 if pg_catalog.jsonb_typeof(p_delivery_address)<>'object' or p_delivery_address='{}'::jsonb then raise exception 'DELIVERY_ADDRESS_REQUIRED' using errcode='22023'; end if;
 select * into v_existing from public.we4all_orders where customer_user_id=p_customer_user_id and idempotency_key=p_idempotency_key;
 if found then return pg_catalog.jsonb_build_object('ok',true,'duplicate',true,'order_id',v_existing.id,'order_number',v_existing.order_number,'status',v_existing.status,'payment_status',v_existing.payment_status,'total_inr',v_existing.total_inr); end if;
 if (select pg_catalog.count(*) from pg_catalog.jsonb_to_recordset(p_items) as x(catalog_item_id uuid,quantity integer))
 <> (select pg_catalog.count(distinct catalog_item_id) from pg_catalog.jsonb_to_recordset(p_items) as x(catalog_item_id uuid,quantity integer)) then raise exception 'DUPLICATE_CATALOG_ITEM' using errcode='22023'; end if;
 select * into v_partner from public.we4all_partners where id=p_partner_id and partner_type='merchant' and approval_status='approved' for share;
 if not found then raise exception 'MERCHANT_NOT_APPROVED' using errcode='42501'; end if;
 for v_input in select x.catalog_item_id,x.quantity from pg_catalog.jsonb_to_recordset(p_items) as x(catalog_item_id uuid,quantity integer) loop
  v_item_count:=v_item_count+1;
  if v_input.catalog_item_id is null or v_input.quantity is null or v_input.quantity<1 or v_input.quantity>100 then raise exception 'INVALID_ITEM_QUANTITY' using errcode='22023'; end if;
  select * into v_item from public.we4all_catalog_items where id=v_input.catalog_item_id and partner_id=p_partner_id and approval_status='approved' and is_active=true for update;
  if not found then raise exception 'CATALOG_ITEM_UNAVAILABLE' using errcode='P0002'; end if;
  if v_item.stock_quantity is not null and v_item.stock_quantity<v_input.quantity then raise exception 'INSUFFICIENT_STOCK' using errcode='23514'; end if;
  v_subtotal:=v_subtotal+(v_item.price_inr*v_input.quantity);
 end loop;
 if v_item_count=0 then raise exception 'EMPTY_ORDER' using errcode='22023'; end if;
 v_order_number:='WE4-'||pg_catalog.to_char(pg_catalog.now() at time zone 'UTC','YYYYMMDD')||'-'||pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(v_order_id::text,'-',''),1,8));
 insert into public.we4all_orders(id,customer_user_id,partner_id,zone_id,order_number,status,payment_status,subtotal_inr,tax_inr,delivery_fee_inr,discount_inr,total_inr,idempotency_key,delivery_address)
 values(v_order_id,p_customer_user_id,p_partner_id,p_zone_id,v_order_number,'awaiting_payment','pending',v_subtotal,0,0,0,v_subtotal,p_idempotency_key,p_delivery_address);
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
 return pg_catalog.jsonb_build_object('ok',true,'duplicate',false,'order_id',v_order_id,'order_number',v_order_number,'status','awaiting_payment','payment_status','pending','subtotal_inr',v_subtotal,'tax_inr',0,'delivery_fee_inr',0,'total_inr',v_subtotal,'message','Order created. Payment is still pending provider verification.');
end; $$;
revoke all on function public.we4all_create_order(uuid,uuid,jsonb,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.we4all_create_order(uuid,uuid,jsonb,text,jsonb,text) to service_role;
