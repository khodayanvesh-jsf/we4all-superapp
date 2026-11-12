-- Trial-only dispatch. No fares, settlement, public GPS feed, or paid provider.
-- Enable only on a separate staging project after schema and account verification.
create schema if not exists we4all_rides_private;
revoke all on schema we4all_rides_private from public, anon, authenticated;
grant usage on schema we4all_rides_private to authenticated, service_role;

create table we4all_rides_private.settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false
);
insert into we4all_rides_private.settings default values;
create table we4all_rides_private.presence (
  rider_id uuid primary key references auth.users(id) on delete cascade,
  vehicle text not null check (vehicle in ('2W','3W','4W')),
  online boolean not null default false,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  accuracy double precision check (accuracy between 0 and 200),
  updated_at timestamptz not null default now()
);
create table we4all_rides_private.trips (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  rider_id uuid references auth.users(id) on delete restrict,
  request_key uuid not null,
  service text not null check (service in ('passenger','parcel')),
  vehicle text not null check (vehicle in ('2W','3W','4W')),
  pickup text not null check (length(pickup) between 1 and 160),
  drop_label text not null check (length(drop_label) between 1 and 160),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  status text not null default 'requested' check (status in ('requested','accepted','at_pickup','in_progress','awaiting_confirmation','completed','cancelled','expired')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, request_key),
  check (rider_id is null or rider_id <> customer_id)
);
create unique index we4all_one_active_customer_trip on we4all_rides_private.trips(customer_id)
where status not in ('completed','cancelled','expired');
create unique index we4all_one_active_rider_trip on we4all_rides_private.trips(rider_id)
where rider_id is not null and status not in ('completed','cancelled','expired');
create index we4all_rides_customer_history on we4all_rides_private.trips(customer_id, created_at desc);
create index we4all_rides_rider_history on we4all_rides_private.trips(rider_id, created_at desc);
create index we4all_rides_open_requests on we4all_rides_private.trips(vehicle, created_at) where status='requested';
create table we4all_rides_private.events (
  id bigint generated always as identity primary key,
  trip_id uuid not null references we4all_rides_private.trips(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);
create index we4all_rides_events_trip on we4all_rides_private.events(trip_id, created_at);
create index we4all_rides_events_actor on we4all_rides_private.events(actor_id);
-- Tables are never exposed to app clients. Mutations are atomic and authorized below.
alter table we4all_rides_private.settings enable row level security;
alter table we4all_rides_private.presence enable row level security;
alter table we4all_rides_private.trips enable row level security;
alter table we4all_rides_private.events enable row level security;
revoke all on all tables in schema we4all_rides_private from public, anon, authenticated;
revoke all on all sequences in schema we4all_rides_private from public, anon, authenticated;
grant all on all tables in schema we4all_rides_private to service_role;
grant usage, select on all sequences in schema we4all_rides_private to service_role;

create function we4all_rides_private.distance_km(a double precision,b double precision,c double precision,d double precision)
returns double precision language sql immutable strict security invoker set search_path='' as $$
  select 12742 * asin(least(1::double precision, sqrt(power(sin(radians(c-a)/2),2) + cos(radians(a))*cos(radians(c))*power(sin(radians(d-b)/2),2))));
$$;
revoke all on function we4all_rides_private.distance_km(double precision,double precision,double precision,double precision) from public, anon, authenticated;

create function we4all_rides_private.command(p_action text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid();
  v_enabled boolean;
  v_rider boolean;
  v_vehicle text;
  v_details jsonb;
  v_presence we4all_rides_private.presence%rowtype;
  v_trip we4all_rides_private.trips%rowtype;
  v_mode text := coalesce(p_payload->>'mode','customer');
  v_next text;
  v_lat double precision;
  v_lng double precision;
  v_accuracy double precision;
  v_trips jsonb;
  v_offers jsonb := '[]'::jsonb;
begin
  if uid is null or not exists (
    select 1 from auth.users u join auth.sessions s on s.user_id=u.id
    where u.id=uid and s.id::text=auth.jwt()->>'session_id'
      and (u.banned_until is null or u.banned_until < now())
      and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
  ) then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or p_action is null then
    raise exception 'INVALID_REQUEST' using errcode='22023';
  end if;
  -- Serialize commands from the same account, including requests and online changes.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 0));
  select enabled into v_enabled from we4all_rides_private.settings where singleton;
  if p_action not in ('snapshot','cancel') and not (p_action='availability' and p_payload->>'online'='false') and not v_enabled then
    raise exception 'RIDES_DISABLED' using errcode='42501';
  end if;
  if not exists (select 1 from public.we4all_user_roles where user_id=uid and role='customer' and status='approved') then
    raise exception 'ACCOUNT_NOT_APPROVED' using errcode='42501';
  end if;
  select exists(select 1 from public.we4all_user_roles r join public.we4all_partners p
    on p.owner_user_id=r.user_id and p.partner_type='rider' and p.approval_status='approved'
    where r.user_id=uid and r.role='rider' and r.status='approved') into v_rider;
  if v_rider then
    select application_payload->'partner_details' into v_details from public.we4all_partner_applications
    where user_id=uid and requested_role='rider' and status='approved' order by reviewed_at desc nulls last, created_at desc limit 1;
    v_vehicle := case split_part(coalesce(v_details->>'vehicleClass',''),' ',1)
      when '2W' then '2W' when '3W' then '3W' when '4W' then '4W' else null end;
    v_rider := v_vehicle is not null and length(coalesce(v_details->>'vehicleRegistration',''))>0;
  end if;
  -- Expire old unaccepted requests, recording every expiry in the audit trail.
  with expired as (
    update we4all_rides_private.trips set status='expired',version=version+1,updated_at=now()
    where status='requested' and created_at < now()-interval '10 minutes' returning id
  ) insert into we4all_rides_private.events(trip_id,action) select id,'expire' from expired;

  if p_action='availability' then
    if not v_rider then raise exception 'RIDER_NOT_APPROVED' using errcode='42501'; end if;
    if coalesce((p_payload->>'online')::boolean,false) then
      v_lat := (p_payload->>'lat')::double precision; v_lng := (p_payload->>'lng')::double precision;
      v_accuracy := (p_payload->>'accuracy')::double precision;
      if v_lat is null or v_lng is null or v_accuracy is null or v_lat not between -90 and 90 or v_lng not between -180 and 180 or v_accuracy not between 0 and 200 then
        raise exception 'LOCATION_REQUIRED' using errcode='22023';
      end if;
      insert into we4all_rides_private.presence(rider_id,vehicle,online,lat,lng,accuracy,updated_at)
      values(uid,v_vehicle,true,v_lat,v_lng,v_accuracy,now()) on conflict(rider_id) do update
      set vehicle=excluded.vehicle,online=true,lat=excluded.lat,lng=excluded.lng,accuracy=excluded.accuracy,updated_at=now();
    else
      update we4all_rides_private.presence set online=false,lat=null,lng=null,accuracy=null,updated_at=now() where rider_id=uid;
    end if;
    return jsonb_build_object('ok',true);
  elsif p_action='request' then
    v_lat := (p_payload->>'lat')::double precision; v_lng := (p_payload->>'lng')::double precision;
    v_accuracy := (p_payload->>'accuracy')::double precision;
    if v_lat is null or v_lng is null or v_accuracy is null or v_lat not between -90 and 90 or v_lng not between -180 and 180 or v_accuracy not between 0 and 200 then
      raise exception 'LOCATION_REQUIRED' using errcode='22023';
    end if;
    if coalesce(p_payload->>'service','') not in ('passenger','parcel') or coalesce(p_payload->>'vehicle','') not in ('2W','3W','4W')
      or length(btrim(coalesce(p_payload->>'pickup',''))) not between 1 and 160 or length(btrim(coalesce(p_payload->>'drop',''))) not between 1 and 160
      or lower(btrim(p_payload->>'pickup'))=lower(btrim(p_payload->>'drop')) or p_payload->>'key' is null then
      raise exception 'INVALID_REQUEST' using errcode='22023';
    end if;
    select * into v_trip from we4all_rides_private.trips where customer_id=uid and request_key=(p_payload->>'key')::uuid;
    if found then
      if v_trip.pickup<>btrim(p_payload->>'pickup') or v_trip.drop_label<>btrim(p_payload->>'drop') or v_trip.service<>p_payload->>'service'
        or v_trip.vehicle<>p_payload->>'vehicle' or v_trip.lat<>v_lat or v_trip.lng<>v_lng then
        raise exception 'IDEMPOTENCY_CONFLICT' using errcode='22023';
      end if;
      return jsonb_build_object('id',v_trip.id,'status',v_trip.status);
    end if;
    if exists(select 1 from we4all_rides_private.trips where (customer_id=uid or rider_id=uid) and status not in ('completed','cancelled','expired')) then
      raise exception 'ACTIVE_TRIP_EXISTS' using errcode='23505';
    end if;
    if (select count(*) from we4all_rides_private.trips where customer_id=uid and created_at>now()-interval '1 hour')>=10 then
      raise exception 'RATE_LIMITED' using errcode='54000';
    end if;
    insert into we4all_rides_private.trips(customer_id,request_key,service,vehicle,pickup,drop_label,lat,lng)
    values(uid,(p_payload->>'key')::uuid,p_payload->>'service',p_payload->>'vehicle',btrim(p_payload->>'pickup'),btrim(p_payload->>'drop'),v_lat,v_lng)
    returning * into v_trip;
    insert into we4all_rides_private.events(trip_id,actor_id,action) values(v_trip.id,uid,'request');
    return jsonb_build_object('id',v_trip.id,'status',v_trip.status);
  elsif p_action='snapshot' then
    if v_mode not in ('customer','rider') then raise exception 'INVALID_REQUEST' using errcode='22023'; end if;
    if v_mode='rider' and not v_rider then raise exception 'RIDER_NOT_APPROVED' using errcode='42501'; end if;
    select * into v_presence from we4all_rides_private.presence where rider_id=uid;
    select coalesce(jsonb_agg(t.row_data order by t.created_at desc),'[]'::jsonb) into v_trips from (
      select t.created_at, jsonb_build_object('id',t.id,'service',t.service,'vehicle',t.vehicle,'pickup',t.pickup,'drop',t.drop_label,
        'status',t.status,'version',t.version,'rider_id',t.rider_id,'created_at',t.created_at,
        'rider_name',case when t.rider_id is not null then (select display_name from public.we4all_partners where owner_user_id=t.rider_id and partner_type='rider' limit 1) end,
        'vehicle_registration',case when t.rider_id is not null then (select application_payload->'partner_details'->>'vehicleRegistration' from public.we4all_partner_applications where user_id=t.rider_id and requested_role='rider' and status='approved' order by reviewed_at desc nulls last, created_at desc limit 1) end,
        'rider_location',case when t.status in ('accepted','at_pickup','in_progress','awaiting_confirmation') then
          (select jsonb_build_object('lat',p.lat,'lng',p.lng,'at',p.updated_at) from we4all_rides_private.presence p
           where p.rider_id=t.rider_id and p.online and p.updated_at>now()-interval '2 minutes'
           and exists(select 1 from public.we4all_user_roles where user_id=p.rider_id and role='rider' and status='approved')) end) row_data
      from we4all_rides_private.trips t where (v_mode='customer' and t.customer_id=uid) or (v_mode='rider' and t.rider_id=uid)
      order by t.created_at desc limit 30
    ) t;
    if v_enabled and v_mode='rider' and v_presence.online and v_presence.updated_at>now()-interval '2 minutes'
      and not exists(select 1 from we4all_rides_private.trips where (rider_id=uid or customer_id=uid) and status not in ('completed','cancelled','expired')) then
      select coalesce(jsonb_agg(o.row_data),'[]'::jsonb) into v_offers from (
        select jsonb_build_object('id',t.id,'service',t.service,'vehicle',t.vehicle,'version',t.version,
          'distance_km',round(we4all_rides_private.distance_km(v_presence.lat,v_presence.lng,t.lat,t.lng)::numeric,1)) row_data
        from we4all_rides_private.trips t where t.status='requested' and t.vehicle=v_vehicle and t.customer_id<>uid
          and we4all_rides_private.distance_km(v_presence.lat,v_presence.lng,t.lat,t.lng)<=10
        order by t.created_at limit 20
      ) o;
    end if;
    return jsonb_build_object('enabled',v_enabled,'trips',v_trips,'offers',v_offers,'vehicle',v_vehicle,
      'vehicleRegistration',v_details->>'vehicleRegistration',
      'presence',jsonb_build_object('online',coalesce(v_rider and v_presence.online and v_presence.updated_at>now()-interval '2 minutes',false)));
  elsif p_action in ('accept','arrive','start','finish','complete','cancel') then
    select * into v_trip from we4all_rides_private.trips where id=(p_payload->>'id')::uuid for update;
    if not found then raise exception 'TRIP_UNAVAILABLE' using errcode='42501'; end if;
    if p_action='accept' then
      if not v_rider then raise exception 'RIDER_NOT_APPROVED' using errcode='42501'; end if;
      select * into v_presence from we4all_rides_private.presence where rider_id=uid;
      if v_presence.rider_id is null or not v_presence.online or v_presence.updated_at<=now()-interval '2 minutes' then
        raise exception 'LOCATION_STALE' using errcode='42501';
      end if;
      if v_trip.status<>'requested' or v_trip.vehicle<>v_vehicle or v_trip.customer_id=uid
        or we4all_rides_private.distance_km(v_presence.lat,v_presence.lng,v_trip.lat,v_trip.lng)>10 then
        raise exception 'TRIP_UNAVAILABLE' using errcode='42501';
      end if;
      if exists(select 1 from we4all_rides_private.trips where (rider_id=uid or customer_id=uid) and status not in ('completed','cancelled','expired')) then
        raise exception 'ACTIVE_TRIP_EXISTS' using errcode='23505';
      end if;
      v_next := 'accepted';
    else
      if uid<>v_trip.customer_id and (v_trip.rider_id is null or uid<>v_trip.rider_id) then
        raise exception 'TRIP_UNAVAILABLE' using errcode='42501';
      end if;
      if p_action in ('arrive','finish') and (not v_rider or uid is distinct from v_trip.rider_id) then
        raise exception 'RIDER_NOT_APPROVED' using errcode='42501';
      end if;
      v_next := case
        when p_action='arrive' and v_trip.status='accepted' then 'at_pickup'
        when p_action='start' and v_trip.status='at_pickup' and uid=v_trip.customer_id then 'in_progress'
        when p_action='finish' and v_trip.status='in_progress' then 'awaiting_confirmation'
        when p_action='complete' and v_trip.status='awaiting_confirmation' and uid=v_trip.customer_id then 'completed'
        when p_action='cancel' and v_trip.status in ('requested','accepted','at_pickup') then 'cancelled'
        else null end;
      if v_next is null then raise exception 'INVALID_TRANSITION' using errcode='22023'; end if;
    end if;
    if (p_payload->>'version')::integer is distinct from v_trip.version then raise exception 'TRIP_CHANGED' using errcode='40001'; end if;
    update we4all_rides_private.trips set status=v_next,version=version+1,updated_at=now(),
      rider_id=case when p_action='accept' then uid else rider_id end where id=v_trip.id;
    insert into we4all_rides_private.events(trip_id,actor_id,action) values(v_trip.id,uid,p_action);
    return jsonb_build_object('id',v_trip.id,'status',v_next,'version',v_trip.version+1);
  end if;
  raise exception 'INVALID_REQUEST' using errcode='22023';
end;
$$;
revoke all on function we4all_rides_private.command(text,jsonb) from public, anon, authenticated;
grant execute on function we4all_rides_private.command(text,jsonb) to authenticated;
-- Public API wrapper is invoker; the privileged implementation stays outside the exposed schema.
create function public.we4all_ride_command(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
  select we4all_rides_private.command(p_action,p_payload);
$$;
revoke all on function public.we4all_ride_command(text,jsonb) from public, anon, authenticated;
grant execute on function public.we4all_ride_command(text,jsonb) to authenticated;
