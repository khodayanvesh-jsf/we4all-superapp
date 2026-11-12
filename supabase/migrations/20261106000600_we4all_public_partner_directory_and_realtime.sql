-- Partner profile display data needed by the public product catalogue.
drop policy if exists we4all_partners_public_approved_select on public.we4all_partners;
create policy we4all_partners_public_approved_select
on public.we4all_partners
for select to anon,authenticated
using (approval_status='approved');

do $$
declare t text;
begin
  foreach t in array array['we4all_catalog_items','we4all_orders','we4all_order_items'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
