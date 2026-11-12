-- Consolidate participant read access into one permissive policy per table.
drop policy if exists we4all_catalog_public_select on public.we4all_catalog_items;
drop policy if exists we4all_catalog_owner_select on public.we4all_catalog_items;
create policy we4all_catalog_select on public.we4all_catalog_items for select to anon,authenticated using (
 (approval_status='approved' and is_active=true and exists(select 1 from public.we4all_partners p where p.id=partner_id and p.approval_status='approved'))
 or ((select auth.uid()) is not null and exists(select 1 from public.we4all_partners p where p.id=partner_id and p.owner_user_id=(select auth.uid())))
);
drop policy if exists we4all_orders_customer_select on public.we4all_orders;
drop policy if exists we4all_orders_partner_select on public.we4all_orders;
create policy we4all_orders_participant_select on public.we4all_orders for select to authenticated using (
 customer_user_id=(select auth.uid()) or exists(select 1 from public.we4all_partners p where p.id=partner_id and p.owner_user_id=(select auth.uid()))
);
drop policy if exists we4all_bookings_customer_select on public.we4all_bookings;
drop policy if exists we4all_bookings_partner_select on public.we4all_bookings;
create policy we4all_bookings_participant_select on public.we4all_bookings for select to authenticated using (
 customer_user_id=(select auth.uid()) or exists(select 1 from public.we4all_partners p where p.id=partner_id and p.owner_user_id=(select auth.uid()))
);
drop policy if exists we4all_dispatch_customer_select on public.we4all_dispatch_jobs;
drop policy if exists we4all_dispatch_assigned_rider_select on public.we4all_dispatch_jobs;
create policy we4all_dispatch_participant_select on public.we4all_dispatch_jobs for select to authenticated using (
 rider_user_id=(select auth.uid()) or exists(select 1 from public.we4all_orders o where o.id=order_id and o.customer_user_id=(select auth.uid()))
);
drop policy if exists we4all_labour_customer_select on public.we4all_labour_engagements;
drop policy if exists we4all_labour_partner_select on public.we4all_labour_engagements;
create policy we4all_labour_participant_select on public.we4all_labour_engagements for select to authenticated using (
 customer_user_id=(select auth.uid()) or exists(select 1 from public.we4all_partners p where p.id=labour_partner_id and p.owner_user_id=(select auth.uid()))
);
drop policy if exists we4all_payment_customer_select on public.we4all_payment_transactions;
drop policy if exists we4all_payment_partner_select on public.we4all_payment_transactions;
create policy we4all_payment_participant_select on public.we4all_payment_transactions for select to authenticated using (
 customer_user_id=(select auth.uid())
 or (order_id is not null and exists(select 1 from public.we4all_orders o join public.we4all_partners p on p.id=o.partner_id where o.id=order_id and p.owner_user_id=(select auth.uid())))
 or (booking_id is not null and exists(select 1 from public.we4all_bookings b join public.we4all_partners p on p.id=b.partner_id where b.id=booking_id and p.owner_user_id=(select auth.uid())))
 or (labour_engagement_id is not null and exists(select 1 from public.we4all_labour_engagements e join public.we4all_partners p on p.id=e.labour_partner_id where e.id=labour_engagement_id and p.owner_user_id=(select auth.uid())))
);
create index if not exists we4all_inventory_movements_partner_idx on public.we4all_inventory_movements(partner_id);
create index if not exists we4all_inventory_movements_created_by_idx on public.we4all_inventory_movements(created_by);
create index if not exists we4all_labour_attendance_worker_idx on public.we4all_labour_attendance(worker_user_id);
create index if not exists we4all_order_items_catalog_idx on public.we4all_order_items(catalog_item_id);
create index if not exists we4all_payment_booking_idx on public.we4all_payment_transactions(booking_id);
create index if not exists we4all_payment_labour_idx on public.we4all_payment_transactions(labour_engagement_id);
create index if not exists we4all_payment_order_idx on public.we4all_payment_transactions(order_id);
