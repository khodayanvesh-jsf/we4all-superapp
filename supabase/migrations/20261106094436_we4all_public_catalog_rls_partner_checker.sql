
create or replace function public.we4all_is_approved_partner(p_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.we4all_partners as p
    where p.id = p_partner_id
      and p.approval_status = 'approved'
  );
$$;

revoke all on function public.we4all_is_approved_partner(uuid) from public;
grant execute on function public.we4all_is_approved_partner(uuid) to anon, authenticated;

drop policy if exists we4all_catalog_select on public.we4all_catalog_items;
create policy we4all_catalog_select
on public.we4all_catalog_items
for select
to anon, authenticated
using (
  (
    approval_status = 'approved'
    and is_active = true
    and public.we4all_is_approved_partner(partner_id)
  )
  or
  (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.we4all_partners as p
      where p.id = we4all_catalog_items.partner_id
        and p.owner_user_id = (select auth.uid())
    )
  )
);
