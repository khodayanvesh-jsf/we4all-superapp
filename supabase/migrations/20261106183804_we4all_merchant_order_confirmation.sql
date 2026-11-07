-- Merchant confirmation is a server-owned state transition.
-- The customer can see it through the existing participant SELECT policy, while
-- clients cannot directly update order status or call this RPC.

alter table public.we4all_orders
  drop constraint if exists we4all_orders_status_check;

alter table public.we4all_orders
  add constraint we4all_orders_status_check
  check (status in (
    'awaiting_payment', 'merchant_confirmed', 'paid', 'accepted', 'preparing',
    'ready_for_pickup', 'assigned', 'picked_up', 'delivered', 'cancelled',
    'disputed', 'refunded'
  ));

create or replace function public.we4all_merchant_confirm_order(
  p_order_id uuid,
  p_merchant_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.we4all_orders%rowtype;
  v_next_status text;
  v_now timestamptz := pg_catalog.now();
begin
  if p_order_id is null or p_merchant_user_id is null then
    raise exception 'INVALID_CONFIRMATION_REQUEST' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.we4all_user_roles r
    where r.user_id = p_merchant_user_id
      and r.role = 'merchant'
      and r.status = 'approved'
  ) then
    raise exception 'APPROVED_MERCHANT_REQUIRED' using errcode = '42501';
  end if;

  select o.* into v_order
  from public.we4all_orders o
  join public.we4all_partners p on p.id = o.partner_id
  where o.id = p_order_id
    and p.owner_user_id = p_merchant_user_id
    and p.partner_type = 'merchant'
    and p.approval_status = 'approved'
  for update of o;

  if not found then
    raise exception 'ORDER_NOT_FOUND_OR_NOT_OWNED' using errcode = 'P0002';
  end if;

  if (v_order.status = 'merchant_confirmed' and v_order.payment_status = 'pending')
     or (v_order.status = 'accepted' and v_order.payment_status = 'paid') then
    return pg_catalog.jsonb_build_object(
      'ok', true, 'duplicate', true, 'order_id', v_order.id,
      'status', v_order.status, 'payment_status', v_order.payment_status
    );
  end if;

  if v_order.status = 'awaiting_payment' and v_order.payment_status = 'pending' then
    v_next_status := 'merchant_confirmed';
  elsif v_order.payment_status = 'paid'
        and v_order.status in ('awaiting_payment', 'merchant_confirmed', 'paid') then
    v_next_status := 'accepted';
  else
    raise exception 'ORDER_NOT_CONFIRMABLE' using errcode = '40001';
  end if;

  update public.we4all_orders
  set status = v_next_status, updated_at = v_now
  where id = v_order.id;

  insert into public.we4all_audit_events(
    actor_user_id, actor_role, action, entity_type, entity_id, zone_id, metadata
  ) values (
    p_merchant_user_id, 'merchant', 'order.confirmed', 'we4all_order',
    v_order.id, v_order.zone_id,
    pg_catalog.jsonb_build_object('from_status', v_order.status, 'to_status', v_next_status)
  );

  return pg_catalog.jsonb_build_object(
    'ok', true, 'duplicate', false, 'order_id', v_order.id,
    'status', v_next_status, 'payment_status', v_order.payment_status
  );
end;
$function$;

revoke all on function public.we4all_merchant_confirm_order(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.we4all_merchant_confirm_order(uuid, uuid)
  to service_role;
