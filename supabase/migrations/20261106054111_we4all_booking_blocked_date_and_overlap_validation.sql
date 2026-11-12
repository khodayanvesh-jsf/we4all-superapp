create or replace function public.we4all_create_booking(
 p_customer_user_id uuid,p_partner_id uuid,p_booking_type text,p_zone_id text,
 p_start timestamptz,p_end timestamptz,p_note text,p_metadata jsonb,p_idempotency_key text
) returns jsonb language plpgsql set search_path = '' as $$
declare v_partner public.we4all_partners%rowtype; v_booking public.we4all_bookings%rowtype; v_expected_type text; v_local_date text;
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
end; $$;
revoke all on function public.we4all_create_booking(uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.we4all_create_booking(uuid,uuid,text,text,timestamptz,timestamptz,text,jsonb,text) to service_role;
