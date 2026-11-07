-- Process normalized provider events only after the Edge Function verifies
-- the provider adapter's HMAC signature. All writes are server-role only.

create or replace function public.we4all_process_payment_event(
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_event_payload jsonb,
  p_order_id uuid,
  p_order_reference text,
  p_provider_payment_id text,
  p_provider_order_id text,
  p_amount_paise bigint,
  p_currency text,
  p_signature_verified boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.we4all_orders%rowtype;
  v_event public.we4all_payment_webhook_events%rowtype;
  v_payment public.we4all_payment_transactions%rowtype;
  v_event_id uuid;
  v_payment_status text;
  v_processing_error text;
  v_payment_record_preexisting boolean := false;
  v_now timestamptz := pg_catalog.now();
begin
  if p_signature_verified is distinct from true then
    raise exception 'UNVERIFIED_PAYMENT_EVENT' using errcode = '42501';
  end if;
  if p_provider is null or pg_catalog.length(p_provider) not between 2 and 80
     or p_provider !~ '^[a-z0-9][a-z0-9._-]*$'
     or p_provider_event_id is null or pg_catalog.length(p_provider_event_id) not between 1 and 160
     or p_provider_payment_id is null or pg_catalog.length(p_provider_payment_id) not between 1 and 160
     or p_order_id is null
     or p_order_reference is null or pg_catalog.length(p_order_reference) not between 1 and 160
     or p_amount_paise is null or p_amount_paise < 1
     or p_currency is distinct from 'INR'
     or p_event_type is null or p_event_type not in ('payment.captured', 'payment.failed')
     or pg_catalog.jsonb_typeof(p_event_payload) is distinct from 'object' then
    raise exception 'INVALID_PAYMENT_EVENT' using errcode = '22023';
  end if;

  if p_event_payload->>'provider' is distinct from p_provider
     or p_event_payload->>'schemaVersion' is distinct from '1'
     or p_event_payload->>'eventId' is distinct from p_provider_event_id
     or p_event_payload->>'eventType' is distinct from p_event_type
     or p_event_payload->>'orderId' is distinct from p_order_id::text
     or p_event_payload->>'orderReference' is distinct from p_order_reference
     or p_event_payload->>'paymentId' is distinct from p_provider_payment_id
     or p_event_payload->>'providerOrderId' is distinct from nullif(p_provider_order_id, '')
     or p_event_payload->>'amountPaise' is distinct from p_amount_paise::text
     or p_event_payload->>'currency' is distinct from p_currency then
    raise exception 'PAYMENT_EVENT_ARGUMENT_MISMATCH' using errcode = '22023';
  end if;

  insert into public.we4all_payment_webhook_events(
    provider, provider_event_id, event_type, signature_verified, payload
  ) values (
    p_provider, p_provider_event_id, p_event_type, true, p_event_payload
  )
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event_id;

  if not found then
    select * into v_event
    from public.we4all_payment_webhook_events e
    where e.provider = p_provider and e.provider_event_id = p_provider_event_id;
    return pg_catalog.jsonb_build_object(
      'ok', true, 'duplicate', true, 'processed', v_event.processed_at is not null,
      'processing_error', v_event.processing_error
    );
  end if;
  select * into v_order
  from public.we4all_orders o
  where o.id = p_order_id
  for update;
  if not found then
    v_processing_error := 'ORDER_NOT_FOUND';
  elsif v_order.order_number is distinct from p_order_reference then
    v_processing_error := 'ORDER_REFERENCE_MISMATCH';
  elsif p_amount_paise <> pg_catalog.round(v_order.total_inr * 100)::bigint then
    v_processing_error := 'PAYMENT_AMOUNT_MISMATCH';
  end if;

  if v_processing_error is not null then
    update public.we4all_payment_webhook_events
    set processed_at = v_now, processing_error = v_processing_error
    where id = v_event_id;
    return pg_catalog.jsonb_build_object(
      'ok', true, 'duplicate', false, 'processed', false,
      'event_id', v_event_id, 'error', v_processing_error
    );
  end if;

  v_payment_status := v_order.payment_status;

  insert into public.we4all_payment_transactions(
    customer_user_id, order_id, provider, provider_payment_id, provider_order_id,
    amount_inr, currency, status, idempotency_key, provider_payload
  ) values (
    v_order.customer_user_id, v_order.id, p_provider, p_provider_payment_id,
    nullif(p_provider_order_id, ''), p_amount_paise::numeric / 100, p_currency,
    case when p_event_type = 'payment.captured' then 'captured' else 'failed' end,
    p_provider || ':payment:' || p_provider_payment_id, p_event_payload
  )
  on conflict (provider, provider_payment_id) where provider_payment_id is not null
  do nothing
  returning * into v_payment;

  if not found then
      v_payment_record_preexisting := true;
    select * into v_payment
    from public.we4all_payment_transactions t
    where t.provider = p_provider and t.provider_payment_id = p_provider_payment_id
    for update;
    if not found or v_payment.order_id is distinct from v_order.id then
      v_processing_error := 'PAYMENT_REFERENCE_CONFLICT';
    end if;
  end if;

  if v_processing_error is not null then
    update public.we4all_payment_webhook_events
    set processed_at = v_now, processing_error = v_processing_error
    where id = v_event_id;
    return pg_catalog.jsonb_build_object(
      'ok', true, 'duplicate', false, 'processed', false,
      'event_id', v_event_id, 'error', v_processing_error
    );
  end if;

  if p_event_type = 'payment.failed' and v_payment.status = 'captured' then
    v_processing_error := 'LATE_FAILURE_IGNORED_AFTER_CAPTURE';
  elsif p_event_type = 'payment.captured' and v_payment.status in ('refunded', 'refund_pending', 'partially_refunded') then
    v_processing_error := 'CAPTURE_EVENT_CONFLICTS_WITH_REFUND_STATE';
  else
    v_payment_status := case when p_event_type = 'payment.captured' then 'captured' else 'failed' end;
    update public.we4all_payment_transactions
    set status = v_payment_status,
        provider_order_id = coalesce(nullif(p_provider_order_id, ''), provider_order_id),
        provider_payload = p_event_payload,
        updated_at = v_now
    where id = v_payment.id;

    if p_event_type = 'payment.captured' then
      if v_order.status in ('cancelled', 'refunded', 'disputed') then
        v_processing_error := 'CAPTURED_AFTER_CANCELLATION_REFUND_REVIEW_REQUIRED';
      elsif v_order.payment_status in ('paid', 'refund_pending', 'partially_refunded', 'refunded')
         and not v_payment_record_preexisting then
        v_processing_error := 'ADDITIONAL_CAPTURE_REFUND_REVIEW_REQUIRED';
      end if;
      if v_order.payment_status not in ('paid', 'refund_pending', 'partially_refunded', 'refunded') then
        update public.we4all_orders
        set payment_status = 'paid', updated_at = v_now
        where id = v_order.id;
        v_payment_status := 'paid';
      end if;
    else
      if v_order.payment_status in ('paid', 'refund_pending', 'partially_refunded', 'refunded') then
        v_processing_error := 'LATE_FAILURE_IGNORED_AFTER_PAID_STATUS';
        v_payment_status := v_order.payment_status;
      else
        update public.we4all_orders
        set payment_status = 'failed', updated_at = v_now
        where id = v_order.id;
        v_payment_status := 'failed';
      end if;
    end if;
  end if;

  update public.we4all_payment_webhook_events
  set processed_at = v_now, processing_error = v_processing_error
  where id = v_event_id;

  insert into public.we4all_audit_events(
    actor_role, action, entity_type, entity_id, zone_id, metadata
  ) values (
    'payment_provider',
    case when p_event_type = 'payment.captured' then 'order.payment_captured' else 'order.payment_failed' end,
    'we4all_order', v_order.id, v_order.zone_id,
    pg_catalog.jsonb_build_object(
      'provider', p_provider,
      'provider_event_id', p_provider_event_id,
      'provider_payment_id', p_provider_payment_id,
      'payment_status', v_payment_status,
      'processing_error', v_processing_error
    )
  );

  return pg_catalog.jsonb_build_object(
    'ok', true, 'duplicate', false, 'processed', true,
    'order_id', v_order.id, 'status', v_order.status,
    'payment_status', v_payment_status,
    'requires_refund_review', v_processing_error in (
      'CAPTURED_AFTER_CANCELLATION_REFUND_REVIEW_REQUIRED',
      'ADDITIONAL_CAPTURE_REFUND_REVIEW_REQUIRED'
    ),
    'processing_error', v_processing_error
  );
end;
$function$;

revoke all on function public.we4all_process_payment_event(
  text, text, text, jsonb, uuid, text, text, text, bigint, text, boolean
) from public, anon, authenticated;
grant execute on function public.we4all_process_payment_event(
  text, text, text, jsonb, uuid, text, text, text, bigint, text, boolean
) to service_role;
