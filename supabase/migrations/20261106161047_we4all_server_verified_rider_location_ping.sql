create or replace function public.we4all_upsert_rider_location_ping(
  p_rider_user_id uuid,
  p_longitude double precision,
  p_latitude double precision,
  p_accuracy_m numeric default null,
  p_heading_deg numeric default null,
  p_speed_mps numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_partner public.we4all_partners%rowtype;
  v_ping_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception 'SERVER_ONLY_RIDER_LOCATION' using errcode='42501';
  end if;
  if p_longitude is null or p_latitude is null or p_longitude not between -180 and 180 or p_latitude not between -90 and 90 then
    raise exception 'INVALID_GPS_COORDINATES' using errcode='22023';
  end if;
  if not exists (
    select 1 from public.we4all_user_roles
    where user_id=p_rider_user_id and role='rider' and status='approved'
  ) then
    raise exception 'APPROVED_RIDER_REQUIRED' using errcode='42501';
  end if;
  select * into v_partner from public.we4all_partners
  where owner_user_id=p_rider_user_id and partner_type='rider' and approval_status='approved'
  limit 1;
  if not found or v_partner.vehicle_class is null then
    raise exception 'FOUNDER_VERIFIED_VEHICLE_CLASS_REQUIRED' using errcode='42501';
  end if;
  insert into public.we4all_rider_location_pings(
    rider_partner_id,rider_user_id,position,accuracy_m,heading_deg,speed_mps,observed_at,expires_at
  ) values (
    v_partner.id,p_rider_user_id,
    extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography,
    p_accuracy_m,p_heading_deg,p_speed_mps,now(),now()+interval '2 hours'
  ) returning id into v_ping_id;
  delete from public.we4all_rider_location_pings
   where rider_partner_id=v_partner.id and id<>v_ping_id and observed_at<now()-interval '2 hours';
  return jsonb_build_object('ok',true,'ping_id',v_ping_id,'observed_at',now(),'expires_at',now()+interval '2 hours');
end $$;

revoke all on function public.we4all_upsert_rider_location_ping(uuid,double precision,double precision,numeric,numeric,numeric) from public,anon,authenticated;
grant execute on function public.we4all_upsert_rider_location_ping(uuid,double precision,double precision,numeric,numeric,numeric) to service_role;
