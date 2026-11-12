grant select (
  id,
  partner_type,
  display_name,
  zone_id,
  approval_status,
  vehicle_class,
  availability_rules
) on table public.we4all_partners to anon;

comment on table public.we4all_partners is
  'WE4ALL partner records; anon receives column-limited access to approved public directory fields only, filtered by RLS.';
