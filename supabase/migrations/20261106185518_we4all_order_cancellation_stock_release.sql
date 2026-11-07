-- Customer cancellation and merchant decline are atomic with reservation release.
-- Paid orders require a verified provider refund flow and are intentionally blocked.

create or replace function public.we4all_cancel_order(
  p_order_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.we4all_orders%rowtype;
  v_reservation record;
  v_stock public.we4all_catalog_items%rowtype;
  v_is_customer boolean;
  v_is_merchant boolean;
  v_released_items integer := 0;
  v_actor_role text;
  v_now timestamptz := pg_catalog.now();
  v_release_key text;
begin
  if p_order_id is null or p_actor_user_id is null then
    raise exception 'INVALID_CANCELLATION_REQUEST' using errcode = '22023';
  end if;

  v_is_customer := exists (
    select 1 from public.we4all_user_roles r
    where r.user_id = p_actor_user_id and r.role = 'customer' and r.status = 'approved'
  );
  v_is_merchant := exists (
    select 1
    from public.we4all_user_roles r
    join public.we4all_partners p on p.owner_user_id = r.user_id
    where r.user_id = p_actor_user_id
      and r.role = 'merchant'
      and r.status = 'approved'
      and p.partner_type = 'merchant'
      and p.approval_status = 'approved'
  );
  if not v_is_customer and not v_is_merchant then
    raise exception 'APPROVED_ORDER_PARTICIPANT_REQUIRED' using errcode = '42501';
  end if;

  select o.* into v_order
  from public.we4all_orders o
  where o.id = p_order_id
    and (
      (v_is_customer and o.customer_user_id = p_actor_user_id)
      or (v_is_merchant and exists (
        select 1 from public.we4all_partners p
        where p.id = o.partner_id and p.owner_user_id = p_actor_user_id
          and p.partner_type = 'merchant' and p.approval_status = 'approved'
      ))
    )
  for update of o;

  if not found then
    raise exception 'ORDER_NOT_FOUND_OR_NOT_AUTHORIZED' using errcode = 'P0002';
  end if;

  v_actor_role := case
    when v_order.customer_user_id = p_actor_user_id then 'customer'
    else 'merchant'
  end;

  if v_order.status = 'cancelled' and v_order.payment_status in ('pending', 'failed') then
    return pg_catalog.jsonb_build_object(
      'ok', true, 'duplicate', true, 'order_id', v_order.id,
      'status', v_order.status, 'payment_status', v_order.payment_status,
      'released_items', 0
    );
  end if;

  if v_order.payment_status in ('authorized', 'paid')
     or v_order.status in ('paid', 'accepted', 'preparing', 'ready_for_pickup', 'assigned', 'picked_up', 'delivered') then
    raise exception 'REFUND_PROVIDER_REQUIRED' using errcode = '55000';
  end if;
  if v_order.status not in ('awaiting_payment', 'merchant_confirmed')
     or v_order.payment_status not in ('pending', 'failed') then
    raise exception 'ORDER_NOT_CANCELLABLE' using errcode = '40001';
  end if;

  for v_reservation in
    select m.catalog_item_id, m.partner_id, m.quantity_delta
    from public.we4all_inventory_movements m
    where m.reference_type = 'order'
      and m.reference_id = v_order.id
      and m.movement_type = 'reservation'
    order by m.catalog_item_id
    for update
  loop
    v_release_key := 'order-cancel:' || v_order.id::text || ':item:' || v_reservation.catalog_item_id::text;
    if exists (
      select 1 from public.we4all_inventory_movements m
      where m.idempotency_key = v_release_key
    ) then
      continue;
    end if;

    select * into v_stock
    from public.we4all_catalog_items c
    where c.id = v_reservation.catalog_item_id
      and c.partner_id = v_reservation.partner_id
    for update;
    if not found or v_stock.stock_quantity is null then
      raise exception 'STOCK_RESERVATION_DATA_INVALID' using errcode = '23514';
    end if;

    update public.we4all_catalog_items
    set stock_quantity = stock_quantity + (-v_reservation.quantity_delta),
        updated_at = v_now
    where id = v_reservation.catalog_item_id;

    insert into public.we4all_inventory_movements(
      catalog_item_id, partner_id, movement_type, quantity_delta,
      reference_type, reference_id, idempotency_key, created_by
    ) values (
      v_reservation.catalog_item_id, v_reservation.partner_id, 'reservation_release',
      -v_reservation.quantity_delta, 'order_cancel', v_order.id, v_release_key, p_actor_user_id
    );
    v_released_items := v_released_items + 1;
  end loop;

  update public.we4all_orders
  set status = 'cancelled', updated_at = v_now
  where id = v_order.id;

  insert into public.we4all_audit_events(
    actor_user_id, actor_role, action, entity_type, entity_id, zone_id, metadata
  ) values (
    p_actor_user_id,
    v_actor_role,
    'order.cancelled', 'we4all_order', v_order.id, v_order.zone_id,
    pg_catalog.jsonb_build_object(
      'from_status', v_order.status,
      'released_inventory_items', v_released_items
    )
  );

  return pg_catalog.jsonb_build_object(
    'ok', true, 'duplicate', false, 'order_id', v_order.id,
    'status', 'cancelled', 'payment_status', v_order.payment_status,
    'released_items', v_released_items
  );
end;
$function$;

revoke all on function public.we4all_cancel_order(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.we4all_cancel_order(uuid, uuid)
  to service_role;
