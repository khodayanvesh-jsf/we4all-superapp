
create table if not exists public.we4all_p2p_deliveries (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete restrict,
  rider_partner_id uuid references public.we4all_partners(id) on delete restrict,
  zone_id text not null default 'adilabad_master',
  vehicle_class text not null check (vehicle_class in ('2W','3W','4W')),
  pickup_location jsonb not null check (jsonb_typeof(pickup_location)='object'),
  dropoff_location jsonb not null check (jsonb_typeof(dropoff_location)='object'),
  parcel_details jsonb not null default '{}'::jsonb check (jsonb_typeof(parcel_details)='object'),
  quoted_fee_inr numeric(12,2) check (quoted_fee_inr is null or quoted_fee_inr >= 0),
  status text not null default 'queued' check (status in ('queued','offered','assigned','picked_up','delivered','cancelled','failed')),
  payment_status text not null default 'pending' check (payment_status in ('pending','authorized','paid','failed','refunded')),
  idempotency_key text not null,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_user_id,idempotency_key)
);
create index if not exists we4all_p2p_rider_queue_idx on public.we4all_p2p_deliveries(vehicle_class,status,created_at);
alter table public.we4all_p2p_deliveries enable row level security;
revoke all on public.we4all_p2p_deliveries from anon, authenticated;
grant select,insert,update,delete on public.we4all_p2p_deliveries to service_role;

create or replace function public.we4all_claim_p2p_delivery(
  p_delivery_id uuid,p_rider_user_id uuid,p_vehicle_class text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_delivery public.we4all_p2p_deliveries%rowtype; v_partner public.we4all_partners%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_P2P_CLAIM' using errcode='42501'; end if;
 if not exists(select 1 from public.we4all_user_roles r where r.user_id=p_rider_user_id and r.role='rider' and r.status='approved') then raise exception 'APPROVED_RIDER_REQUIRED' using errcode='42501'; end if;
 select * into v_partner from public.we4all_partners p where p.owner_user_id=p_rider_user_id and p.partner_type='rider' and p.approval_status='approved';
 if not found or v_partner.vehicle_class is null or v_partner.vehicle_class<>p_vehicle_class then raise exception 'RIDER_VEHICLE_CLASS_MISMATCH' using errcode='42501'; end if;
 select * into v_delivery from public.we4all_p2p_deliveries where id=p_delivery_id for update;
 if not found then raise exception 'P2P_DELIVERY_NOT_FOUND' using errcode='P0002'; end if;
 if v_delivery.status not in ('queued','offered') or v_delivery.rider_partner_id is not null then raise exception 'P2P_DELIVERY_ALREADY_CLAIMED' using errcode='40001'; end if;
 if v_delivery.vehicle_class<>v_partner.vehicle_class then raise exception 'RIDER_VEHICLE_CLASS_MISMATCH' using errcode='42501'; end if;
 update public.we4all_p2p_deliveries set rider_partner_id=v_partner.id,status='assigned',assigned_at=pg_catalog.now(),updated_at=pg_catalog.now() where id=p_delivery_id returning * into v_delivery;
 insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,zone_id,metadata)
 values(p_rider_user_id,'rider','p2p_delivery_claimed','p2p_delivery',v_delivery.id,v_delivery.zone_id,pg_catalog.jsonb_build_object('vehicle_class',v_delivery.vehicle_class));
 return pg_catalog.jsonb_build_object('ok',true,'delivery_id',v_delivery.id,'status',v_delivery.status);
end; $$;

create or replace function public.we4all_claim_taxi_ride(
 p_ride_booking_id uuid,p_rider_user_id uuid,p_vehicle_class text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ride public.we4all_ride_bookings%rowtype; v_partner public.we4all_partners%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_RIDE_CLAIM' using errcode='42501'; end if;
 if not exists(select 1 from public.we4all_user_roles r where r.user_id=p_rider_user_id and r.role='rider' and r.status='approved') then raise exception 'APPROVED_RIDER_REQUIRED' using errcode='42501'; end if;
 select * into v_partner from public.we4all_partners p where p.owner_user_id=p_rider_user_id and p.partner_type='rider' and p.approval_status='approved';
 if not found or v_partner.vehicle_class is null or v_partner.vehicle_class<>p_vehicle_class then raise exception 'RIDER_VEHICLE_CLASS_MISMATCH' using errcode='42501'; end if;
 select * into v_ride from public.we4all_ride_bookings where id=p_ride_booking_id for update;
 if not found then raise exception 'RIDE_BOOKING_NOT_FOUND' using errcode='P0002'; end if;
 if v_ride.status not in ('requested','quoted') or v_ride.rider_partner_id is not null then raise exception 'RIDE_ALREADY_CLAIMED' using errcode='40001'; end if;
 if v_ride.vehicle_class<>v_partner.vehicle_class then raise exception 'RIDER_VEHICLE_CLASS_MISMATCH' using errcode='42501'; end if;
 update public.we4all_ride_bookings set rider_partner_id=v_partner.id,status='assigned',updated_at=pg_catalog.now()
 where id=p_ride_booking_id returning * into v_ride;
 insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,zone_id,metadata)
 values(p_rider_user_id,'rider','taxi_ride_claimed','ride_booking',v_ride.id,v_ride.zone_id,pg_catalog.jsonb_build_object('vehicle_class',v_ride.vehicle_class));
 return pg_catalog.jsonb_build_object('ok',true,'ride_booking_id',v_ride.id,'status',v_ride.status);
end; $$;
