grant insert (partner_id,sku,title,description,category_key,item_type,price_inr,mrp_inr,stock_quantity,unit_label,metadata)
on public.we4all_catalog_items to authenticated;
drop policy if exists we4all_catalog_owner_insert on public.we4all_catalog_items;
create policy we4all_catalog_owner_insert on public.we4all_catalog_items
for insert to authenticated with check (
  approval_status='pending'
  and is_active=false
  and stock_quantity=0
  and exists (
    select 1 from public.we4all_partners p
    where p.id=partner_id and p.owner_user_id=(select auth.uid()) and p.approval_status='approved'
  )
);
