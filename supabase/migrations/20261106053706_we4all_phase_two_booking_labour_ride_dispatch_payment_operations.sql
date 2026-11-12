
-- WE4ALL phase 2 operations: server-only bookings, labour, rides, dispatch and payments.
create table if not exists public.we4all_ride_bookings (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete restrict,
  rider_partner_id uuid references public.we4all_partners(id) on delete restrict,
  zone_id text not null,
  vehicle_class text not null check (vehicle_class in ('2W','3W','4W')),
  pickup_location jsonb not null check (jsonb_typeof(pickup_location)='object'),
  dropoff_location jsonb not null check (jsonb_typeof(dropoff_location)='object'),
  requested_start_at timestamptz not null,
  quoted_total_inr numeric(12,2) check (quoted_total_inr is null or quoted_total_inr >= 0),
  status text not null default 'requested' check (status in ('requested','quoted','awaiting_payment','confirmed','assigned','in_progress','completed','cancelled','disputed','refunded')),
  payment_status text not null default 'pending' check (payment_status in ('pending','authorized','paid','failed','refund_pending','refunded')),
  customer_note text not null default '',
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_user_id,idempotency_key)
);
create index if not exists we4all_ride_customer_idx on public.we4all_ride_bookings(customer_user_id,created_at desc);
create index if not exists we4all_ride_partner_idx on public.we4all_ride_bookings(rider_partner_id,requested_start_at,status);
alter table public.we4all_ride_bookings enable row level security;
revoke all on public.we4all_ride_bookings from public,anon,authenticated;
grant select on public.we4all_ride_bookings to authenticated;
create policy we4all_ride_customer_select on public.we4all_ride_bookings
  for select to authenticated using (customer_user_id=(select auth.uid()));
create policy we4all_ride_partner_select on public.we4all_ride_bookings
  for select to authenticated using (exists(select 1 from public.we4all_partners p where p.id=rider_partner_id and p.owner_user_id=(select auth.uid())));

alter table public.we4all_payment_transactions add column if not exists ride_booking_id uuid references public.we4all_ride_bookings(id) on delete restrict;
alter table public.we4all_payment_transactions drop constraint if exists we4all_payment_transactions_check;
alter table public.we4all_payment_transactions add constraint we4all_payment_transactions_single_target_check
  check (num_nonnulls(order_id,booking_id,labour_engagement_id,ride_booking_id)=1);
create unique index if not exists we4all_payment_provider_order_idx
  on public.we4all_payment_transactions(provider,provider_order_id) where provider_order_id is not null;
create index if not exists we4all_payment_ride_idx on public.we4all_payment_transactions(ride_booking_id) where ride_booking_id is not null;

create or replace function public.we4all_create_booking(
 p_customer_user_id uuid,p_partner_id uuid,p_booking_type text,p_zone_id text,
 p_start timestamptz,p_end timestamptz,p_note text,p_metadata jsonb,p_idempotency_key text
) returns jsonb language plpgsql set search_path = '' as $$
declare v_partner public.we4all_partners%rowtype; v_booking public.we4all_bookings%rowtype; v_expected_type text;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_BOOKING_CREATE' using errcode='42501'; end if;
 if p_customer_user_id is null or p_partner_id is null or p_start is null or p_end is null or p_end<=p_start then raise exception 'INVALID_BOOKING_WINDOW' using errcode='22023'; end if;
 if p_booking_type not in ('service','decorator','function_hall') then raise exception 'INVALID_BOOKING_TYPE' using errcode='22023'; end if;
 if p_start < pg_catalog.now() - interval '2 minutes' then raise exception 'BOOKING_START_IN_PAST' using errcode='22023'; end if;
 if p_idempotency_key is null or pg_catalog.length(pg_catalog.btrim(p_idempotency_key))<8 or pg_catalog.length(p_idempotency_key)>160 then raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode='22023'; end if;
 if pg_catalog.jsonb_typeof(coalesce(p_metadata,'{}'::jsonb)) <> 'object' then raise exception 'INVALID_BOOKING_METADATA' using errcode='22023'; end if;
 if not exists(select 1 from public.we4all_user_roles r where r.user_id=p_customer_user_id and r.role='customer' and r.status='approved') then raise exception 'APPROVED_CUSTOMER_REQUIRED' using errcode='42501'; end if;
 v_expected_type := case p_booking_type when 'service' then 'service_provider' when 'decorator' then 'decorator' else 'function_hall' end;
 select * into v_partner from public.we4all_partners p where p.id=p_partner_id and p.partner_type=v_expected_type and p.approval_status='approved';
 if not found then raise exception 'APPROVED_BOOKING_PARTNER_REQUIRED' using errcode='42501'; end if;
 select * into v_booking from public.we4all_bookings b where b.customer_user_id=p_customer_user_id and b.idempotency_key=p_idempotency_key;
 if found then return pg_catalog.jsonb_build_object('ok',true,'duplicate',true,'booking_id',v_booking.id,'status',v_booking.status,'payment_status',v_booking.payment_status); end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_partner_id::text,0));
 if exists(select 1 from public.we4all_bookings b where b.partner_id=p_partner_id and b.status in ('requested','quoted','awaiting_advance','confirmed','in_progress')
   and b.requested_start_at < p_end and coalesce(b.requested_end_at,b.requested_start_at+interval '1 hour') > p_start) then
   raise exception 'BOOKING_SLOT_UNAVAILABLE' using errcode='23P01';
 end if;
 insert into public.we4all_bookings(customer_user_id,partner_id,booking_type,zone_id,status,payment_status,requested_start_at,requested_end_at,customer_note,metadata,idempotency_key)
 values(p_customer_user_id,p_partner_id,p_booking_type,coalesce(nullif(p_zone_id,''),v_partner.zone_id),'requested','pending',p_start,p_end,coalesce(p_note,''),coalesce(p_metadata,'{}'::jsonb),p_idempotency_key)
 returning * into v_booking;
 insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,zone_id,metadata)
 values(p_customer_user_id,'customer','booking_requested','booking',v_booking.id,v_booking.zone_id,pg_catalog.jsonb_build_object('booking_type',p_booking_type,'partner_id',p_partner_id));
 return pg_catalog.jsonb_build_object('ok',true,'duplicate',false,'booking_id',v_booking.id,'status',v_booking.status,'payment_status',v_booking.payment_status);
end; $$;
revoke all on function public.we4all_create_booking(uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.we4all_create_booking(uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb,text) to service_role;

create or replace function public.we4all_quote_booking(
 p_booking_id uuid,p_partner_owner_user_id uuid,p_quote_inr numeric,p_advance_inr numeric,p_note text
) returns jsonb language plpgsql set search_path = '' as $$
declare v_booking public.we4all_bookings%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_BOOKING_REVIEW' using errcode='42501'; end if;
 select * into v_booking from public.we4all_bookings b join public.we4all_partners p on p.id=b.partner_id
 where b.id=p_booking_id and p.owner_user_id=p_partner_owner_user_id and p.approval_status='approved' for update of b;
 if not found then raise exception 'BOOKING_NOT_FOUND_OR_NOT_OWNED' using errcode='42501'; end if;
 if v_booking.status not in ('requested','quoted') then raise exception 'BOOKING_NOT_QUOTABLE' using errcode='40001'; end if;
 if p_quote_inr is null or p_quote_inr<=0 or p_advance_inr is null or p_advance_inr<0 or p_advance_inr>p_quote_inr then raise exception 'INVALID_BOOKING_QUOTE' using errcode='22023'; end if;
 update public.we4all_bookings set quoted_total_inr=p_quote_inr,advance_required_inr=p_advance_inr,
  customer_note=case when coalesce(p_note,'')='' then customer_note else customer_note||E'\n'||p_note end,
  status=case when p_advance_inr>0 then 'awaiting_advance' else 'quoted' end,updated_at=pg_catalog.now()
 where id=p_booking_id returning * into v_booking;
 insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,zone_id,metadata)
 values(p_partner_owner_user_id,'partner','booking_quoted','booking',v_booking.id,v_booking.zone_id,pg_catalog.jsonb_build_object('quote',p_quote_inr,'advance',p_advance_inr));
 return pg_catalog.jsonb_build_object('ok',true,'booking_id',v_booking.id,'status',v_booking.status,'quoted_total_inr',v_booking.quoted_total_inr,'advance_required_inr',v_booking.advance_required_inr);
end; $$;
revoke all on function public.we4all_quote_booking(uuid,uuid,numeric,numeric,text) from public,anon,authenticated;
grant execute on function public.we4all_quote_booking(uuid,uuid,numeric,numeric,text) to service_role;

create or replace function public.we4all_create_labour_engagement(
 p_customer_user_id uuid,p_labour_partner_id uuid,p_zone_id text,p_trade_key text,p_worker_count integer,
 p_start timestamptz,p_duration numeric,p_worksite jsonb,p_idempotency_key text
) returns jsonb language plpgsql set search_path = '' as $$
declare v_partner public.we4all_partners%rowtype; v_engagement public.we4all_labour_engagements%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_LABOUR_CREATE' using errcode='42501'; end if;
 if not exists(select 1 from public.we4all_user_roles r where r.user_id=p_customer_user_id and r.role='customer' and r.status='approved') then raise exception 'APPROVED_CUSTOMER_REQUIRED' using errcode='42501'; end if;
 select * into v_partner from public.we4all_partners p where p.id=p_labour_partner_id and p.partner_type='labour' and p.approval_status='approved';
 if not found then raise exception 'APPROVED_LABOUR_PARTNER_REQUIRED' using errcode='42501'; end if;
 if p_worker_count is null or p_worker_count<1 or p_worker_count>100 or p_duration is null or p_duration<=0 or p_duration>744 or p_start is null or p_start<pg_catalog.now()-interval '2 minutes' then raise exception 'INVALID_LABOUR_REQUEST' using errcode='22023'; end if;
 if p_idempotency_key is null or pg_catalog.length(pg_catalog.btrim(p_idempotency_key))<8 or pg_catalog.length(p_idempotency_key)>160 then raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode='22023'; end if;
 if pg_catalog.jsonb_typeof(p_worksite)<>'object' or coalesce(pg_catalog.length(pg_catalog.btrim(p_trade_key)),0)<2 then raise exception 'INVALID_LABOUR_DETAILS' using errcode='22023'; end if;
 select * into v_engagement from public.we4all_labour_engagements e where e.customer_user_id=p_customer_user_id and e.idempotency_key=p_idempotency_key;
 if found then return pg_catalog.jsonb_build_object('ok',true,'duplicate',true,'engagement_id',v_engagement.id,'status',v_engagement.status,'payment_status',v_engagement.payment_status); end if;
 insert into public.we4all_labour_engagements(customer_user_id,labour_partner_id,zone_id,trade_key,worker_count,requested_start_at,requested_duration_hours,status,payment_status,idempotency_key,worksite_address)
 values(p_customer_user_id,p_labour_partner_id,coalesce(nullif(p_zone_id,''),v_partner.zone_id),p_trade_key,p_worker_count,p_start,p_duration,'requested','pending',p_idempotency_key,p_worksite)
 returning * into v_engagement;
 insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,zone_id,metadata)
 values(p_customer_user_id,'customer','labour_requested','labour_engagement',v_engagement.id,v_engagement.zone_id,pg_catalog.jsonb_build_object('trade_key',p_trade_key,'worker_count',p_worker_count));
 return pg_catalog.jsonb_build_object('ok',true,'duplicate',false,'engagement_id',v_engagement.id,'status',v_engagement.status,'payment_status',v_engagement.payment_status);
end; $$;
revoke all on function public.we4all_create_labour_engagement(uuid,uuid,text,text,integer,timestamptz,numeric,jsonb,text) from public,anon,authenticated;
grant execute on function public.we4all_create_labour_engagement(uuid,uuid,text,text,integer,timestamptz,numeric,jsonb,text) to service_role;

create or replace function public.we4all_quote_labour_engagement(
 p_engagement_id uuid,p_partner_owner_user_id uuid,p_agreed_total_inr numeric,p_decision text
) returns jsonb language plpgsql set search_path = '' as $$
declare v_engagement public.we4all_labour_engagements%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_LABOUR_REVIEW' using errcode='42501'; end if;
 select * into v_engagement from public.we4all_labour_engagements e join public.we4all_partners p on p.id=e.labour_partner_id
 where e.id=p_engagement_id and p.owner_user_id=p_partner_owner_user_id and p.approval_status='approved' for update of e;
 if not found then raise exception 'LABOUR_ENGAGEMENT_NOT_FOUND_OR_NOT_OWNED' using errcode='42501'; end if;
 if v_engagement.status<>'requested' then raise exception 'LABOUR_ENGAGEMENT_ALREADY_REVIEWED' using errcode='40001'; end if;
 if p_decision='accept' and (p_agreed_total_inr is null or p_agreed_total_inr<=0) then raise exception 'VALID_LABOUR_QUOTE_REQUIRED' using errcode='22023'; end if;
 if p_decision not in ('accept','decline') then raise exception 'INVALID_LABOUR_DECISION' using errcode='22023'; end if;
 update public.we4all_labour_engagements set status=case when p_decision='accept' then 'accepted' else 'cancelled' end,
  agreed_total_inr=case when p_decision='accept' then p_agreed_total_inr else null end,updated_at=pg_catalog.now()
 where id=p_engagement_id returning * into v_engagement;
 insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,zone_id,metadata)
 values(p_partner_owner_user_id,'partner','labour_'||p_decision,'labour_engagement',v_engagement.id,v_engagement.zone_id,pg_catalog.jsonb_build_object('agreed_total_inr',v_engagement.agreed_total_inr));
 return pg_catalog.jsonb_build_object('ok',true,'engagement_id',v_engagement.id,'status',v_engagement.status,'agreed_total_inr',v_engagement.agreed_total_inr);
end; $$;
revoke all on function public.we4all_quote_labour_engagement(uuid,uuid,numeric,text) from public,anon,authenticated;
grant execute on function public.we4all_quote_labour_engagement(uuid,uuid,numeric,text) to service_role;

create or replace function public.we4all_create_ride_booking(
 p_customer_user_id uuid,p_zone_id text,p_vehicle_class text,p_pickup jsonb,p_dropoff jsonb,p_start timestamptz,p_note text,p_idempotency_key text
) returns jsonb language plpgsql set search_path = '' as $$
declare v_ride public.we4all_ride_bookings%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_RIDE_CREATE' using errcode='42501'; end if;
 if not exists(select 1 from public.we4all_user_roles r where r.user_id=p_customer_user_id and r.role='customer' and r.status='approved') then raise exception 'APPROVED_CUSTOMER_REQUIRED' using errcode='42501'; end if;
 if p_vehicle_class not in ('2W','3W','4W') or pg_catalog.jsonb_typeof(p_pickup)<>'object' or pg_catalog.jsonb_typeof(p_dropoff)<>'object' or p_start is null or p_start<pg_catalog.now()-interval '2 minutes' then raise exception 'INVALID_RIDE_REQUEST' using errcode='22023'; end if;
 if p_idempotency_key is null or pg_catalog.length(pg_catalog.btrim(p_idempotency_key))<8 or pg_catalog.length(p_idempotency_key)>160 then raise exception 'INVALID_IDEMPOTENCY_KEY' using errcode='22023'; end if;
 select * into v_ride from public.we4all_ride_bookings r where r.customer_user_id=p_customer_user_id and r.idempotency_key=p_idempotency_key;
 if found then return pg_catalog.jsonb_build_object('ok',true,'duplicate',true,'ride_booking_id',v_ride.id,'status',v_ride.status); end if;
 insert into public.we4all_ride_bookings(customer_user_id,zone_id,vehicle_class,pickup_location,dropoff_location,requested_start_at,customer_note,idempotency_key)
 values(p_customer_user_id,coalesce(nullif(p_zone_id,''),'adilabad_master'),p_vehicle_class,p_pickup,p_dropoff,p_start,coalesce(p_note,''),p_idempotency_key)
 returning * into v_ride;
 insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,zone_id,metadata)
 values(p_customer_user_id,'customer','ride_requested','ride_booking',v_ride.id,v_ride.zone_id,pg_catalog.jsonb_build_object('vehicle_class',p_vehicle_class));
 return pg_catalog.jsonb_build_object('ok',true,'duplicate',false,'ride_booking_id',v_ride.id,'status',v_ride.status);
end; $$;
revoke all on function public.we4all_create_ride_booking(uuid,text,text,jsonb,jsonb,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.we4all_create_ride_booking(uuid,text,text,jsonb,jsonb,timestamptz,text,text) to service_role;

create or replace function public.we4all_claim_dispatch_job(p_dispatch_id uuid,p_rider_user_id uuid,p_vehicle_class text)
returns jsonb language plpgsql set search_path = '' as $$
declare v_job public.we4all_dispatch_jobs%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_DISPATCH_CLAIM' using errcode='42501'; end if;
 if not exists(select 1 from public.we4all_user_roles r where r.user_id=p_rider_user_id and r.role='rider' and r.status='approved') then raise exception 'APPROVED_RIDER_REQUIRED' using errcode='42501'; end if;
 if not exists(select 1 from public.we4all_partners p where p.owner_user_id=p_rider_user_id and p.partner_type='rider' and p.approval_status='approved') then raise exception 'APPROVED_RIDER_PARTNER_REQUIRED' using errcode='42501'; end if;
 select * into v_job from public.we4all_dispatch_jobs where id=p_dispatch_id for update;
 if not found then raise exception 'DISPATCH_JOB_NOT_FOUND' using errcode='P0002'; end if;
 if v_job.status not in ('queued','offered') or (v_job.rider_user_id is not null and v_job.rider_user_id<>p_rider_user_id) then raise exception 'DISPATCH_JOB_ALREADY_CLAIMED' using errcode='40001'; end if;
 if v_job.vehicle_class<>p_vehicle_class then raise exception 'RIDER_VEHICLE_CLASS_MISMATCH' using errcode='42501'; end if;
 update public.we4all_dispatch_jobs set rider_user_id=p_rider_user_id,status='accepted',assigned_at=coalesce(assigned_at,pg_catalog.now()),updated_at=pg_catalog.now() where id=p_dispatch_id returning * into v_job;
 update public.we4all_orders set status='assigned',updated_at=pg_catalog.now() where id=v_job.order_id and payment_status='paid';
 insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,metadata)
 values(p_rider_user_id,'rider','dispatch_claimed','dispatch_job',v_job.id,pg_catalog.jsonb_build_object('order_id',v_job.order_id,'vehicle_class',v_job.vehicle_class));
 return pg_catalog.jsonb_build_object('ok',true,'dispatch_id',v_job.id,'order_id',v_job.order_id,'status',v_job.status);
end; $$;
revoke all on function public.we4all_claim_dispatch_job(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.we4all_claim_dispatch_job(uuid,uuid,text) to service_role;

create or replace function public.we4all_capture_payment(
 p_provider text,p_provider_event_id text,p_event_type text,p_payment_order_id text,p_payment_id text,p_amount_paise bigint,p_currency text,p_payload jsonb
) returns jsonb language plpgsql set search_path = '' as $$
declare v_tx public.we4all_payment_transactions%rowtype; v_inserted uuid;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_PAYMENT_CAPTURE' using errcode='42501'; end if;
 if p_provider<>'razorpay' or p_provider_event_id is null or p_payment_order_id is null then raise exception 'INVALID_PAYMENT_EVENT' using errcode='22023'; end if;
 insert into public.we4all_payment_webhook_events(provider,provider_event_id,event_type,signature_verified,payload)
 values(p_provider,p_provider_event_id,p_event_type,true,coalesce(p_payload,'{}'::jsonb))
 on conflict(provider,provider_event_id) do nothing returning id into v_inserted;
 if v_inserted is null then return pg_catalog.jsonb_build_object('ok',true,'duplicate',true); end if;
 select * into v_tx from public.we4all_payment_transactions t where t.provider='razorpay' and t.provider_order_id=p_payment_order_id for update;
 if not found then
  update public.we4all_payment_webhook_events set processing_error='PAYMENT_TRANSACTION_NOT_FOUND',processed_at=pg_catalog.now() where provider=p_provider and provider_event_id=p_provider_event_id;
  return pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_TRANSACTION_NOT_FOUND');
 end if;
 if p_currency<>'INR' or p_amount_paise <> (v_tx.amount_inr*100)::bigint then
  update public.we4all_payment_webhook_events set processing_error='PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH',processed_at=pg_catalog.now() where provider=p_provider and provider_event_id=p_provider_event_id;
  return pg_catalog.jsonb_build_object('ok',false,'error','PAYMENT_AMOUNT_OR_CURRENCY_MISMATCH');
 end if;
 if p_event_type='payment.captured' then
  update public.we4all_payment_transactions set status='captured',provider_payment_id=p_payment_id,updated_at=pg_catalog.now() where id=v_tx.id;
  if v_tx.order_id is not null then update public.we4all_orders set payment_status='paid',status=case when status='awaiting_payment' then 'paid' else status end,updated_at=pg_catalog.now() where id=v_tx.order_id;
  elsif v_tx.booking_id is not null then update public.we4all_bookings set payment_status='paid',status=case when status in ('awaiting_advance','quoted') then 'confirmed' else status end,updated_at=pg_catalog.now() where id=v_tx.booking_id;
  elsif v_tx.labour_engagement_id is not null then update public.we4all_labour_engagements set payment_status='paid',updated_at=pg_catalog.now() where id=v_tx.labour_engagement_id;
  elsif v_tx.ride_booking_id is not null then update public.we4all_ride_bookings set payment_status='paid',status=case when status in ('awaiting_payment','quoted') then 'confirmed' else status end,updated_at=pg_catalog.now() where id=v_tx.ride_booking_id;
  end if;
 elsif p_event_type='payment.failed' then
  update public.we4all_payment_transactions set status='failed',provider_payment_id=p_payment_id,updated_at=pg_catalog.now() where id=v_tx.id;
  if v_tx.order_id is not null then update public.we4all_orders set payment_status='failed',updated_at=pg_catalog.now() where id=v_tx.order_id;
  elsif v_tx.booking_id is not null then update public.we4all_bookings set payment_status='failed',updated_at=pg_catalog.now() where id=v_tx.booking_id;
  elsif v_tx.labour_engagement_id is not null then update public.we4all_labour_engagements set payment_status='failed',updated_at=pg_catalog.now() where id=v_tx.labour_engagement_id;
  elsif v_tx.ride_booking_id is not null then update public.we4all_ride_bookings set payment_status='failed',updated_at=pg_catalog.now() where id=v_tx.ride_booking_id;
  end if;
 else
  update public.we4all_payment_webhook_events set processed_at=pg_catalog.now(),processing_error='UNSUPPORTED_EVENT_TYPE' where provider=p_provider and provider_event_id=p_provider_event_id;
  return pg_catalog.jsonb_build_object('ok',true,'ignored',true);
 end if;
 update public.we4all_payment_webhook_events set processed_at=pg_catalog.now() where provider=p_provider and provider_event_id=p_provider_event_id;
 insert into public.we4all_audit_events(actor_role,action,entity_type,entity_id,metadata)
 values('payment_webhook','payment_'||p_event_type,'payment_transaction',v_tx.id,pg_catalog.jsonb_build_object('provider',p_provider,'provider_order_id',p_payment_order_id,'provider_payment_id',p_payment_id));
 return pg_catalog.jsonb_build_object('ok',true,'duplicate',false,'payment_transaction_id',v_tx.id,'status',case when p_event_type='payment.captured' then 'captured' else 'failed' end);
end; $$;
revoke all on function public.we4all_capture_payment(text,text,text,text,text,bigint,text,jsonb) from public,anon,authenticated;
grant execute on function public.we4all_capture_payment(text,text,text,text,text,bigint,text,jsonb) to service_role;

-- Only authenticated participants can read their own ride records; all writes remain server-only.
do $$
declare t text;
begin
 foreach t in array array['we4all_bookings','we4all_labour_engagements','we4all_dispatch_jobs','we4all_payment_transactions','we4all_ride_bookings'] loop
  execute format('alter table public.%I replica identity full',t);
 end loop;
end $$;
do $$
declare t text;
begin
 foreach t in array array['we4all_bookings','we4all_labour_engagements','we4all_dispatch_jobs','we4all_ride_bookings','we4all_payment_transactions'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
end $$;
