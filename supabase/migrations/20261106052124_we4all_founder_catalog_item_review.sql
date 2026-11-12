create or replace function public.we4all_review_catalog_item(
  p_catalog_item_id uuid,
  p_decision text,
  p_reviewer_id uuid
) returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_item public.we4all_catalog_items%rowtype;
  v_status text;
  v_active boolean;
begin
  if coalesce(pg_catalog.current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'SERVER_ONLY_CATALOG_REVIEW' using errcode = '42501';
  end if;
  if p_catalog_item_id is null or p_reviewer_id is null then
    raise exception 'INVALID_REVIEW_CONTEXT' using errcode = '22023';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'INVALID_CATALOG_DECISION' using errcode = '22023';
  end if;
  select * into v_item from public.we4all_catalog_items where id=p_catalog_item_id for update;
  if not found then raise exception 'CATALOG_ITEM_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_item.approval_status <> 'pending' then
    raise exception 'CATALOG_ITEM_ALREADY_REVIEWED' using errcode = '40001';
  end if;
  v_status := p_decision;
  v_active := (p_decision='approved');
  update public.we4all_catalog_items
  set approval_status=v_status, is_active=v_active, updated_at=pg_catalog.now()
  where id=p_catalog_item_id;
  insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,metadata)
  values(p_reviewer_id,'founder','catalog_'||p_decision,'catalog_item',p_catalog_item_id,
    pg_catalog.jsonb_build_object('previous_status',v_item.approval_status,'stock_quantity',v_item.stock_quantity));
  return pg_catalog.jsonb_build_object('ok',true,'catalog_item_id',p_catalog_item_id,'approval_status',v_status,'is_active',v_active,'stock_quantity',v_item.stock_quantity);
end;
$$;
revoke all on function public.we4all_review_catalog_item(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.we4all_review_catalog_item(uuid,text,uuid) to service_role;
