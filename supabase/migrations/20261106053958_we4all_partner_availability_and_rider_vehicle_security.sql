-- Trusted partner availability and rider class are server-owned; never rely on browser profile fields.
alter table public.we4all_partners
  add column if not exists vehicle_class text,
  add column if not exists availability_rules jsonb not null default '{}'::jsonb;
alter table public.we4all_partners
  drop constraint if exists we4all_partners_vehicle_class_check;
alter table public.we4all_partners
  add constraint we4all_partners_vehicle_class_check
  check (vehicle_class is null or vehicle_class in ('2W','3W','4W'));
alter table public.we4all_partners
  drop constraint if exists we4all_partners_availability_rules_check;
alter table public.we4all_partners
  add constraint we4all_partners_availability_rules_check
  check (jsonb_typeof(availability_rules)='object');
revoke all on public.we4all_partners from anon,authenticated;
grant select on public.we4all_partners to authenticated;

-- Fix rowtype selection in partner-owned quote transactions.
create or replace function public.we4all_quote_booking(
 p_booking_id uuid,p_partner_owner_user_id uuid,p_quote_inr numeric,p_advance_inr numeric,p_note text
) returns jsonb language plpgsql set search_path = '' as $$
declare v_booking public.we4all_bookings%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_BOOKING_REVIEW' using errcode='42501'; end if;
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
end; $$;

create or replace function public.we4all_quote_labour_engagement(
 p_engagement_id uuid,p_partner_owner_user_id uuid,p_agreed_total_inr numeric,p_decision text
) returns jsonb language plpgsql set search_path = '' as $$
declare v_engagement public.we4all_labour_engagements%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_LABOUR_REVIEW' using errcode='42501'; end if;
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
end; $$;

create or replace function public.we4all_claim_dispatch_job(p_dispatch_id uuid,p_rider_user_id uuid,p_vehicle_class text)
returns jsonb language plpgsql set search_path = '' as $$
declare v_job public.we4all_dispatch_jobs%rowtype; v_partner public.we4all_partners%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_DISPATCH_CLAIM' using errcode='42501'; end if;
 if not exists(select 1 from public.we4all_user_roles r where r.user_id=p_rider_user_id and r.role='rider' and r.status='approved') then raise exception 'APPROVED_RIDER_REQUIRED' using errcode='42501'; end if;
 select * into v_partner from public.we4all_partners p where p.owner_user_id=p_rider_user_id and p.partner_type='rider' and p.approval_status='approved';
 if not found then raise exception 'APPROVED_RIDER_PARTNER_REQUIRED' using errcode='42501'; end if;
 if v_partner.vehicle_class is null or p_vehicle_class<>v_partner.vehicle_class then raise exception 'RIDER_VEHICLE_CLASS_MISMATCH' using errcode='42501'; end if;
 select * into v_job from public.we4all_dispatch_jobs where id=p_dispatch_id for update;
 if not found then raise exception 'DISPATCH_JOB_NOT_FOUND' using errcode='P0002'; end if;
 if v_job.status not in ('queued','offered') or (v_job.rider_user_id is not null and v_job.rider_user_id<>p_rider_user_id) then raise exception 'DISPATCH_JOB_ALREADY_CLAIMED' using errcode='40001'; end if;
 if v_job.vehicle_class<>v_partner.vehicle_class then raise exception 'RIDER_VEHICLE_CLASS_MISMATCH' using errcode='42501'; end if;
 update public.we4all_dispatch_jobs set rider_user_id=p_rider_user_id,status='accepted',assigned_at=coalesce(assigned_at,pg_catalog.now()),updated_at=pg_catalog.now() where id=p_dispatch_id returning * into v_job;
 update public.we4all_orders set status='assigned',updated_at=pg_catalog.now() where id=v_job.order_id and payment_status='paid';
 insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,metadata)
 values(p_rider_user_id,'rider','dispatch_claimed','dispatch_job',v_job.id,pg_catalog.jsonb_build_object('order_id',v_job.order_id,'vehicle_class',v_job.vehicle_class));
 return pg_catalog.jsonb_build_object('ok',true,'dispatch_id',v_job.id,'order_id',v_job.order_id,'status',v_job.status);
end; $$;
grant select on public.we4all_partners to authenticated;
revoke all on public.we4all_partners from anon;
