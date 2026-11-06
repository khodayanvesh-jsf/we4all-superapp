create or replace function public.we4all_adjust_inventory(
 p_owner_user_id uuid,p_partner_id uuid,p_catalog_item_id uuid,p_quantity_delta integer,p_idempotency_key text
) returns jsonb language plpgsql set search_path = '' as $$
declare v_item public.we4all_catalog_items%rowtype; v_existing public.we4all_inventory_movements%rowtype; v_new_quantity integer;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_INVENTORY_ADJUSTMENT' using errcode='42501'; end if;
 if p_owner_user_id is null or p_partner_id is null or p_catalog_item_id is null then raise exception 'INVALID_INVENTORY_CONTEXT' using errcode='22023'; end if;
 if p_quantity_delta is null or p_quantity_delta=0 or pg_catalog.abs(p_quantity_delta)>100000 then raise exception 'INVALID_STOCK_DELTA' using errcode='22023'; end if;
 if p_idempotency_key is null or pg_catalog.length(pg_catalog.btrim(p_idempotency_key))<8 or pg_catalog.length(p_idempotency_key)>160 then raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode='22023'; end if;
 select * into v_existing from public.we4all_inventory_movements where idempotency_key=p_idempotency_key;
 if found then select * into v_item from public.we4all_catalog_items where id=p_catalog_item_id;
  return pg_catalog.jsonb_build_object('ok',true,'duplicate',true,'catalog_item_id',p_catalog_item_id,'stock_quantity',v_item.stock_quantity); end if;
 if not exists(select 1 from public.we4all_partners p where p.id=p_partner_id and p.owner_user_id=p_owner_user_id and p.partner_type='merchant' and p.approval_status='approved') then raise exception 'APPROVED_MERCHANT_REQUIRED' using errcode='42501'; end if;
 select * into v_item from public.we4all_catalog_items where id=p_catalog_item_id and partner_id=p_partner_id for update;
 if not found then raise exception 'CATALOG_ITEM_NOT_FOUND' using errcode='P0002'; end if;
 v_new_quantity:=pg_catalog.coalesce(v_item.stock_quantity,0)+p_quantity_delta;
 if v_new_quantity<0 then raise exception 'INSUFFICIENT_STOCK' using errcode='23514'; end if;
 update public.we4all_catalog_items set stock_quantity=v_new_quantity,updated_at=pg_catalog.now() where id=p_catalog_item_id;
 insert into public.we4all_inventory_movements(catalog_item_id,partner_id,movement_type,quantity_delta,reference_type,reference_id,idempotency_key,created_by)
 values(p_catalog_item_id,p_partner_id,'adjustment',p_quantity_delta,'merchant_stock_adjustment',p_catalog_item_id,p_idempotency_key,p_owner_user_id);
 return pg_catalog.jsonb_build_object('ok',true,'duplicate',false,'catalog_item_id',p_catalog_item_id,'stock_quantity',v_new_quantity);
end; $$;
revoke all on function public.we4all_adjust_inventory(uuid,uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.we4all_adjust_inventory(uuid,uuid,uuid,integer,text) to service_role;
