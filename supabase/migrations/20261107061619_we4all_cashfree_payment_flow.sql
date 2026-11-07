-- Server-only linkage for Cashfree orders. The payment_session_id is returned
-- only to the authenticated customer and is not stored in exposed row payloads.

create or replace function public.we4all_record_cashfree_order(
  p_order_id uuid,
  p_customer_user_id uuid,
  p_provider_order_id text,
  p_amount_paise bigint,
  p_provider_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.we4all_orders%rowtype;
  v_payment public.we4all_payment_transactions%rowtype;
  v_inserted boolean := false;
begin
  if p_order_id is null or p_customer_user_id is null
     or p_provider_order_id is null
     or pg_catalog.length(p_provider_order_id) not between 3 and 45
     or p_provider_order_id !~ '^[A-Za-z0-9_-]+$'
     or p_amount_paise is null or p_amount_paise < 100
     or pg_catalog.jsonb_typeof(p_provider_payload) is distinct from 'object' then
    raise exception 'INVALID_CASHFREE_ORDER' using errcode = '22023';
  end if;

  select * into v_order
  from public.we4all_orders o
  where o.id = p_order_id and o.customer_user_id = p_customer_user_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND_OR_NOT_OWNED' using errcode = '42501';
  end if;
  if v_order.payment_status not in ('pending', 'failed')
     or v_order.status not in ('awaiting_payment', 'merchant_confirmed') then
    raise exception 'ORDER_NOT_PAYABLE' using errcode = '22023';
  end if;
  if p_amount_paise <> pg_catalog.round(v_order.total_inr * 100)::bigint then
    raise exception 'PAYMENT_AMOUNT_MISMATCH' using errcode = '22023';
  end if;

  insert into public.we4all_payment_transactions(
    customer_user_id, order_id, provider, provider_order_id, amount_inr,
    currency, status, idempotency_key, provider_payload
  ) values (
    p_customer_user_id, p_order_id, 'cashfree', p_provider_order_id,
    p_amount_paise::numeric / 100, 'INR', 'created',
    'cashfree:order:' || p_order_id::text, p_provider_payload
  )
  on conflict (idempotency_key) do nothing
  returning * into v_payment;

  if found then
    v_inserted := true;
  else
    select * into v_payment
    from public.we4all_payment_transactions t
    where t.idempotency_key = 'cashfree:order:' || p_order_id::text
    for update;
    if not found or v_payment.order_id is distinct from p_order_id
       or v_payment.customer_user_id is distinct from p_customer_user_id
       or v_payment.provider is distinct from 'cashfree'
       or v_payment.provider_order_id is distinct from p_provider_order_id
       or v_payment.amount_inr is distinct from p_amount_paise::numeric / 100 then
      raise exception 'PAYMENT_ORDER_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'created', v_inserted,
    'provider_order_id', v_payment.provider_order_id,
    'amount_paise', (v_payment.amount_inr * 100)::bigint,
    'currency', v_payment.currency,
    'status', v_payment.status
  );
end;
$function$;

revoke all on function public.we4all_record_cashfree_order(uuid, uuid, text, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.we4all_record_cashfree_order(uuid, uuid, text, bigint, jsonb)
  to service_role;
