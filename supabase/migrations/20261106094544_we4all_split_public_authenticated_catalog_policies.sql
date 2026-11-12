
drop policy if exists we4all_catalog_select on public.we4all_catalog_items;

create policy we4all_catalog_public_select
on public.we4all_catalog_items
for select
to anon
using (
  approval_status = 'approved'
  and is_active = true
  and public.we4all_is_approved_partner(partner_id)
);

create policy we4all_catalog_authenticated_select
on public.we4all_catalog_items
for select
to authenticated
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
