-- Use the effective PostgREST service role for service and Labour transactions.
CREATE OR REPLACE FUNCTION public.we4all_create_booking(p_customer_user_id uuid, p_partner_id uuid, p_booking_type text, p_zone_id text, p_start timestamp with time zone, p_end timestamp with time zone, p_note text, p_metadata jsonb, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_partner public.we4all_partners%rowtype; v_booking public.we4all_bookings%rowtype; v_expected_type text; v_local_date text;
begin
 if current_user <> 'service_role' then raise exception 'SERVER_ONLY_BOOKING_CREATE' using errcode='42501'; end if;
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
 v_local_date := pg_catalog.to_char(p_start at time zone 'Asia/Kolkata','YYYY-MM-DD');
 if exists(select 1 from pg_catalog.jsonb_array_elements_text(coalesce(v_partner.availability_rules->'blocked_dates','[]'::jsonb)) as dates(day) where dates.day=v_local_date) then
   raise exception 'BOOKING_DATE_BLOCKED' using errcode='23P01';
 end if;
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
end; $function$;

CREATE OR REPLACE FUNCTION public.we4all_create_labour_engagement(p_customer_user_id uuid, p_labour_partner_id uuid, p_zone_id text, p_trade_key text, p_worker_count integer, p_start timestamp with time zone, p_duration numeric, p_worksite jsonb, p_idempotency_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_partner public.we4all_partners%rowtype; v_engagement public.we4all_labour_engagements%rowtype;
begin
 if current_user <> 'service_role' then raise exception 'SERVER_ONLY_LABOUR_CREATE' using errcode='42501'; end if;
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
end; $function$;

CREATE OR REPLACE FUNCTION public.we4all_quote_booking(p_booking_id uuid, p_partner_owner_user_id uuid, p_quote_inr numeric, p_advance_inr numeric, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_booking public.we4all_bookings%rowtype;
begin
 if current_user <> 'service_role' then raise exception 'SERVER_ONLY_BOOKING_REVIEW' using errcode='42501'; end if;
 select b.* into v_booking from public.we4all_bookings b join public.we4all_partners p on p.id=b.partner_id
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
end; $function$;

CREATE OR REPLACE FUNCTION public.we4all_quote_labour_engagement(p_engagement_id uuid, p_partner_owner_user_id uuid, p_agreed_total_inr numeric, p_decision text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_engagement public.we4all_labour_engagements%rowtype;
begin
 if current_user <> 'service_role' then raise exception 'SERVER_ONLY_LABOUR_REVIEW' using errcode='42501'; end if;
 select e.* into v_engagement from public.we4all_labour_engagements e join public.we4all_partners p on p.id=e.labour_partner_id
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
end; $function$;
