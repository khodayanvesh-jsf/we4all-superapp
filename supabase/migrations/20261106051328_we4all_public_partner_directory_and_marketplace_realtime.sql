-- Make only approved partner display data readable for the public catalogue.
-- Do not expose owner_user_id, phone, bank or KYC fields to anonymous visitors.
grant select (id, partner_type, display_name, zone_id, approval_status)
on public.we4all_partners to anon;
drop policy if exists we4all_partners_public_approved_select on public.we4all_partners;
create policy we4all_partners_public_approved_select
on public.we4all_partners
for select to anon
using (approval_status = 'approved');

-- Enable Postgres Changes for the domain tables used in the initial online testing slice.
do $$
declare t text;
begin
  foreach t in array array['we4all_catalog_items','we4all_orders','we4all_order_items'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
