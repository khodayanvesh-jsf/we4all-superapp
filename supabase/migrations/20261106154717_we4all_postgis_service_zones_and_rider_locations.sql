create extension if not exists postgis with schema extensions;

create table if not exists public.we4all_service_zones (
  id uuid primary key default gen_random_uuid(),
  zone_code text not null unique,
  zone_name text not null,
  state_code text,
  center extensions.geography(Point,4326),
  boundary extensions.geography(MultiPolygon,4326),
  radius_m integer not null default 15000 check (radius_m between 500 and 100000),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (center is not null or boundary is not null or metadata ? 'geometry_pending')
);

create index if not exists we4all_service_zones_center_gix
  on public.we4all_service_zones using gist(center);
create index if not exists we4all_service_zones_boundary_gix
  on public.we4all_service_zones using gist(boundary);
create index if not exists we4all_service_zones_active_idx
  on public.we4all_service_zones(is_active,zone_code);

alter table public.we4all_service_zones enable row level security;
revoke all on public.we4all_service_zones from public;
grant select on public.we4all_service_zones to anon,authenticated;
drop policy if exists we4all_service_zones_public_active_read on public.we4all_service_zones;
create policy we4all_service_zones_public_active_read
  on public.we4all_service_zones for select
  to anon,authenticated using (is_active=true);

create or replace function public.we4all_nearest_service_zones(
  p_longitude double precision,
  p_latitude double precision,
  p_limit integer default 10
)
returns table (
  id uuid,
  zone_code text,
  zone_name text,
  state_code text,
  distance_m double precision,
  radius_m integer
)
language sql
stable
security invoker
set search_path=''
as $$
  with point as (
    select extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326)::extensions.geography as location
  )
  select z.id,z.zone_code,z.zone_name,z.state_code,
         extensions.st_distance(z.center,p.location) as distance_m,
         z.radius_m
  from public.we4all_service_zones z
  cross join point p
  where z.is_active=true
    and z.center is not null
    and extensions.st_dwithin(z.center,p.location,z.radius_m)
  order by extensions.st_distance(z.center,p.location)
  limit greatest(1,least(coalesce(p_limit,10),50));
$$;

revoke all on function public.we4all_nearest_service_zones(double precision,double precision,integer) from public;
grant execute on function public.we4all_nearest_service_zones(double precision,double precision,integer) to anon,authenticated;

create table if not exists public.we4all_rider_location_pings (
  id uuid primary key default gen_random_uuid(),
  rider_partner_id uuid not null references public.we4all_partners(id) on delete cascade,
  rider_user_id uuid not null references auth.users(id) on delete cascade,
  position extensions.geography(Point,4326) not null,
  accuracy_m numeric(8,2) check (accuracy_m is null or accuracy_m between 0 and 10000),
  heading_deg numeric(6,2) check (heading_deg is null or heading_deg between 0 and 360),
  speed_mps numeric(8,2) check (speed_mps is null or speed_mps between 0 and 150),
  observed_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '2 hours'),
  created_at timestamptz not null default now()
);

create index if not exists we4all_rider_location_pings_position_gix
  on public.we4all_rider_location_pings using gist(position);
create index if not exists we4all_rider_location_pings_partner_time_idx
  on public.we4all_rider_location_pings(rider_partner_id,observed_at desc);
create index if not exists we4all_rider_location_pings_expiry_idx
  on public.we4all_rider_location_pings(expires_at);

alter table public.we4all_rider_location_pings enable row level security;
revoke all on public.we4all_rider_location_pings from public,anon,authenticated;
grant select,insert,update,delete on public.we4all_rider_location_pings to service_role;
