-- WE4ALL normalized marketplace foundation, phase 1.
-- Backward-compatible: retain legacy tables/data. Server-only writes for transaction ledgers.

create table if not exists public.we4all_partners (
 id uuid primary key default gen_random_uuid(),
 owner_user_id uuid not null references auth.users(id) on delete restrict,
 partner_type text not null check (partner_type in ('merchant','service_provider','decorator','function_hall','rider','labour')),
 display_name text not null check (length(trim(display_name)) between 2 and 160),
 contact_phone text,
 zone_id text not null default 'adilabad_master',
 approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected','suspended')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (id, owner_user_id)
);
create index if not exists we4all_partners_owner_idx on public.we4all_partners(owner_user_id, partner_type);
create index if not exists we4all_partners_zone_status_idx on public.we4all_partners(zone_id, approval_status, partner_type);

create table if not exists public.we4all_catalog_items (
 id uuid primary key default gen_random_uuid(),
 partner_id uuid not null references public.we4all_partners(id) on delete restrict,
 sku text, title text not null check (length(trim(title)) between 1 and 200),
 description text not null default '', category_key text not null,
 item_type text not null default 'physical' check (item_type in ('physical','service','rental')),
 price_inr numeric(12,2) not null check (price_inr >= 0),
 mrp_inr numeric(12,2) check (mrp_inr is null or mrp_inr >= price_inr),
 stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
 unit_label text not null default 'unit',
 approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected','suspended')),
 is_active boolean not null default false,
 metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (partner_id, sku)
);
create index if not exists we4all_catalog_partner_idx on public.we4all_catalog_items(partner_id, approval_status, is_active);
create index if not exists we4all_catalog_category_idx on public.we4all_catalog_items(category_key, approval_status, is_active);

create table if not exists public.we4all_inventory_movements (
 id uuid primary key default gen_random_uuid(),
 catalog_item_id uuid not null references public.we4all_catalog_items(id) on delete restrict,
 partner_id uuid not null references public.we4all_partners(id) on delete restrict,
 movement_type text not null check (movement_type in ('opening','purchase','sale','return','adjustment','damage','reservation','reservation_release')),
 quantity_delta integer not null check (quantity_delta <> 0),
 reference_type text, reference_id uuid, idempotency_key text not null unique,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists we4all_inventory_item_created_idx on public.we4all_inventory_movements(catalog_item_id, created_at desc);

create table if not exists public.we4all_orders (
 id uuid primary key default gen_random_uuid(),
 customer_user_id uuid not null references auth.users(id) on delete restrict,
 partner_id uuid not null references public.we4all_partners(id) on delete restrict,
 zone_id text not null, order_number text not null unique,
 status text not null default 'awaiting_payment' check (status in ('awaiting_payment','paid','accepted','preparing','ready_for_pickup','assigned','picked_up','delivered','cancelled','disputed','refunded')),
 payment_status text not null default 'pending' check (payment_status in ('pending','authorized','paid','failed','refund_pending','refunded','partially_refunded')),
 subtotal_inr numeric(12,2) not null check (subtotal_inr >= 0),
 tax_inr numeric(12,2) not null default 0 check (tax_inr >= 0),
 delivery_fee_inr numeric(12,2) not null default 0 check (delivery_fee_inr >= 0),
 discount_inr numeric(12,2) not null default 0 check (discount_inr >= 0),
 total_inr numeric(12,2) not null check (total_inr >= 0),
 idempotency_key text not null,
 delivery_address jsonb not null check (jsonb_typeof(delivery_address) = 'object'),
 customer_note text not null default '', created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique (customer_user_id, idempotency_key)
);
create index if not exists we4all_orders_customer_idx on public.we4all_orders(customer_user_id, created_at desc);
create index if not exists we4all_orders_partner_idx on public.we4all_orders(partner_id, status, created_at desc);
create index if not exists we4all_orders_zone_status_idx on public.we4all_orders(zone_id, status, created_at desc);

create table if not exists public.we4all_order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.we4all_orders(id) on delete restrict,
 catalog_item_id uuid not null references public.we4all_catalog_items(id) on delete restrict,
 item_title_snapshot text not null, sku_snapshot text,
 quantity numeric(12,3) not null check (quantity > 0),
 unit_price_inr numeric(12,2) not null check (unit_price_inr >= 0),
 tax_rate numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
 line_total_inr numeric(12,2) not null check (line_total_inr >= 0),
 created_at timestamptz not null default now()
);
create index if not exists we4all_order_items_order_idx on public.we4all_order_items(order_id);

create table if not exists public.we4all_bookings (
 id uuid primary key default gen_random_uuid(),
 customer_user_id uuid not null references auth.users(id) on delete restrict,
 partner_id uuid not null references public.we4all_partners(id) on delete restrict,
 booking_type text not null check (booking_type in ('service','decorator','function_hall')),
 zone_id text not null,
 status text not null default 'requested' check (status in ('requested','quoted','awaiting_advance','confirmed','in_progress','completed','cancelled','disputed','refunded')),
 payment_status text not null default 'pending' check (payment_status in ('pending','authorized','paid','failed','refund_pending','refunded','partially_refunded')),
 requested_start_at timestamptz not null, requested_end_at timestamptz,
 quoted_total_inr numeric(12,2) check (quoted_total_inr is null or quoted_total_inr >= 0),
 advance_required_inr numeric(12,2) check (advance_required_inr is null or advance_required_inr >= 0),
 customer_note text not null default '', metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
 idempotency_key text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (requested_end_at is null or requested_end_at > requested_start_at),
 unique (customer_user_id, idempotency_key)
);
create index if not exists we4all_bookings_customer_idx on public.we4all_bookings(customer_user_id, requested_start_at desc);
create index if not exists we4all_bookings_partner_idx on public.we4all_bookings(partner_id, requested_start_at, status);

create table if not exists public.we4all_dispatch_jobs (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.we4all_orders(id) on delete restrict,
 rider_user_id uuid references auth.users(id) on delete restrict,
 vehicle_class text not null check (vehicle_class in ('2W','3W','4W')),
 status text not null default 'queued' check (status in ('queued','offered','accepted','at_pickup','picked_up','at_dropoff','delivered','cancelled','failed')),
 pickup_location jsonb not null check (jsonb_typeof(pickup_location) = 'object'),
 dropoff_location jsonb not null check (jsonb_typeof(dropoff_location) = 'object'),
 pickup_code_hash text, delivery_code_hash text, assigned_at timestamptz, picked_up_at timestamptz, delivered_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists we4all_dispatch_rider_idx on public.we4all_dispatch_jobs(rider_user_id, status, created_at desc);

create table if not exists public.we4all_labour_engagements (
 id uuid primary key default gen_random_uuid(),
 customer_user_id uuid not null references auth.users(id) on delete restrict,
 labour_partner_id uuid not null references public.we4all_partners(id) on delete restrict,
 zone_id text not null, trade_key text not null,
 worker_count integer not null default 1 check (worker_count between 1 and 100),
 requested_start_at timestamptz not null,
 requested_duration_hours numeric(6,2) not null check (requested_duration_hours > 0 and requested_duration_hours <= 744),
 agreed_total_inr numeric(12,2) check (agreed_total_inr is null or agreed_total_inr >= 0),
 status text not null default 'requested' check (status in ('requested','accepted','checked_in','work_completed','awaiting_customer_confirmation','settlement_pending','settled','cancelled','disputed')),
 payment_status text not null default 'pending' check (payment_status in ('pending','authorized','paid','failed','refund_pending','refunded')),
 idempotency_key text not null, worksite_address jsonb not null check (jsonb_typeof(worksite_address) = 'object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (customer_user_id, idempotency_key)
);
create index if not exists we4all_labour_customer_idx on public.we4all_labour_engagements(customer_user_id, created_at desc);
create index if not exists we4all_labour_partner_idx on public.we4all_labour_engagements(labour_partner_id, requested_start_at, status);

create table if not exists public.we4all_labour_attendance (
 id uuid primary key default gen_random_uuid(),
 engagement_id uuid not null references public.we4all_labour_engagements(id) on delete restrict,
 worker_user_id uuid references auth.users(id) on delete restrict,
 attendance_type text not null check (attendance_type in ('check_in','check_out','customer_confirmed','disputed')),
 recorded_at timestamptz not null default now(),
 verification_method text not null check (verification_method in ('server_otp','customer_confirmation','admin_review')),
 verification_reference text, metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);
create index if not exists we4all_labour_attendance_engagement_idx on public.we4all_labour_attendance(engagement_id, recorded_at);

create table if not exists public.we4all_payment_transactions (
 id uuid primary key default gen_random_uuid(),
 customer_user_id uuid not null references auth.users(id) on delete restrict,
 order_id uuid references public.we4all_orders(id) on delete restrict,
 booking_id uuid references public.we4all_bookings(id) on delete restrict,
 labour_engagement_id uuid references public.we4all_labour_engagements(id) on delete restrict,
 provider text not null, provider_payment_id text, provider_order_id text,
 amount_inr numeric(12,2) not null check (amount_inr > 0),
 currency text not null default 'INR' check (currency = 'INR'),
 status text not null default 'created' check (status in ('created','pending','authorized','captured','failed','refund_pending','refunded','partially_refunded')),
 idempotency_key text not null unique,
 provider_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(provider_payload) = 'object'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (num_nonnulls(order_id,booking_id,labour_engagement_id) = 1)
);
create unique index if not exists we4all_payment_provider_ref_idx on public.we4all_payment_transactions(provider, provider_payment_id) where provider_payment_id is not null;
create index if not exists we4all_payment_customer_idx on public.we4all_payment_transactions(customer_user_id, created_at desc);

create table if not exists public.we4all_payment_webhook_events (
 id uuid primary key default gen_random_uuid(), provider text not null, provider_event_id text not null,
 event_type text not null, signature_verified boolean not null default false,
 payload jsonb not null check (jsonb_typeof(payload) = 'object'),
 processed_at timestamptz, processing_error text, received_at timestamptz not null default now(),
 unique (provider, provider_event_id)
);

create table if not exists public.we4all_audit_events (
 id uuid primary key default gen_random_uuid(),
 actor_user_id uuid references auth.users(id) on delete set null,
 actor_role text, action text not null, entity_type text not null, entity_id uuid,
 zone_id text, request_id text,
 metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
 created_at timestamptz not null default now()
);
create index if not exists we4all_audit_entity_idx on public.we4all_audit_events(entity_type, entity_id, created_at desc);
create index if not exists we4all_audit_actor_idx on public.we4all_audit_events(actor_user_id, created_at desc);

do $$
declare t text;
begin
 foreach t in array array['we4all_partners','we4all_catalog_items','we4all_inventory_movements','we4all_orders','we4all_order_items','we4all_bookings','we4all_dispatch_jobs','we4all_labour_engagements','we4all_labour_attendance','we4all_payment_transactions','we4all_payment_webhook_events','we4all_audit_events'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on table public.%I from anon, authenticated', t);
 end loop;
end $$;

grant select on public.we4all_partners to authenticated;
grant insert (owner_user_id,partner_type,display_name,contact_phone,zone_id) on public.we4all_partners to authenticated;
create policy we4all_partners_owner_select on public.we4all_partners for select to authenticated using (owner_user_id = (select auth.uid()));
create policy we4all_partners_owner_insert on public.we4all_partners for insert to authenticated with check (owner_user_id = (select auth.uid()) and approval_status = 'pending');

grant select on public.we4all_catalog_items to anon, authenticated;
grant insert (partner_id,sku,title,description,category_key,item_type,price_inr,mrp_inr,unit_label,metadata) on public.we4all_catalog_items to authenticated;
grant update (sku,title,description,category_key,item_type,price_inr,mrp_inr,unit_label,metadata) on public.we4all_catalog_items to authenticated;
create policy we4all_catalog_public_select on public.we4all_catalog_items for select to anon, authenticated using (
 approval_status='approved' and is_active=true and exists (select 1 from public.we4all_partners p where p.id=partner_id and p.approval_status='approved')
);
create policy we4all_catalog_owner_select on public.we4all_catalog_items for select to authenticated using (
 exists (select 1 from public.we4all_partners p where p.id=partner_id and p.owner_user_id=(select auth.uid()))
);
create policy we4all_catalog_owner_insert on public.we4all_catalog_items for insert to authenticated with check (
 approval_status='pending' and is_active=false and exists (select 1 from public.we4all_partners p where p.id=partner_id and p.owner_user_id=(select auth.uid()) and p.approval_status='approved')
);
create policy we4all_catalog_owner_update on public.we4all_catalog_items for update to authenticated
 using (exists (select 1 from public.we4all_partners p where p.id=partner_id and p.owner_user_id=(select auth.uid()) and p.approval_status='approved'))
 with check (exists (select 1 from public.we4all_partners p where p.id=partner_id and p.owner_user_id=(select auth.uid()) and p.approval_status='approved'));

grant select on public.we4all_orders, public.we4all_order_items to authenticated;
create policy we4all_orders_customer_select on public.we4all_orders for select to authenticated using (customer_user_id=(select auth.uid()));
create policy we4all_orders_partner_select on public.we4all_orders for select to authenticated using (exists (select 1 from public.we4all_partners p where p.id=partner_id and p.owner_user_id=(select auth.uid())));
create policy we4all_order_items_participant_select on public.we4all_order_items for select to authenticated using (
 exists (select 1 from public.we4all_orders o where o.id=order_id and (o.customer_user_id=(select auth.uid()) or exists (select 1 from public.we4all_partners p where p.id=o.partner_id and p.owner_user_id=(select auth.uid()))))
);

grant select on public.we4all_bookings to authenticated;
grant insert (customer_user_id,partner_id,booking_type,zone_id,requested_start_at,requested_end_at,customer_note,idempotency_key,metadata) on public.we4all_bookings to authenticated;
create policy we4all_bookings_customer_select on public.we4all_bookings for select to authenticated using (customer_user_id=(select auth.uid()));
create policy we4all_bookings_partner_select on public.we4all_bookings for select to authenticated using (exists (select 1 from public.we4all_partners p where p.id=partner_id and p.owner_user_id=(select auth.uid())));
create policy we4all_bookings_customer_insert on public.we4all_bookings for insert to authenticated with check (
 customer_user_id=(select auth.uid()) and status='requested' and payment_status='pending'
 and exists (select 1 from public.we4all_partners p where p.id=partner_id and p.approval_status='approved' and
 ((booking_type='service' and p.partner_type='service_provider') or (booking_type='decorator' and p.partner_type='decorator') or (booking_type='function_hall' and p.partner_type='function_hall')))
);

grant select on public.we4all_labour_engagements to authenticated;
grant insert (customer_user_id,labour_partner_id,zone_id,trade_key,worker_count,requested_start_at,requested_duration_hours,idempotency_key,worksite_address) on public.we4all_labour_engagements to authenticated;
create policy we4all_labour_customer_select on public.we4all_labour_engagements for select to authenticated using (customer_user_id=(select auth.uid()));
create policy we4all_labour_partner_select on public.we4all_labour_engagements for select to authenticated using (exists (select 1 from public.we4all_partners p where p.id=labour_partner_id and p.owner_user_id=(select auth.uid())));
create policy we4all_labour_customer_insert on public.we4all_labour_engagements for insert to authenticated with check (
 customer_user_id=(select auth.uid()) and status='requested' and payment_status='pending'
 and exists (select 1 from public.we4all_partners p where p.id=labour_partner_id and p.partner_type='labour' and p.approval_status='approved')
);

grant select on public.we4all_labour_attendance to authenticated;
create policy we4all_labour_attendance_participant_select on public.we4all_labour_attendance for select to authenticated using (
 exists (select 1 from public.we4all_labour_engagements e where e.id=engagement_id and (e.customer_user_id=(select auth.uid()) or exists (select 1 from public.we4all_partners p where p.id=e.labour_partner_id and p.owner_user_id=(select auth.uid()))))
);

grant select on public.we4all_dispatch_jobs to authenticated;
create policy we4all_dispatch_customer_select on public.we4all_dispatch_jobs for select to authenticated using (exists (select 1 from public.we4all_orders o where o.id=order_id and o.customer_user_id=(select auth.uid())));
create policy we4all_dispatch_assigned_rider_select on public.we4all_dispatch_jobs for select to authenticated using (rider_user_id=(select auth.uid()));

grant select on public.we4all_payment_transactions to authenticated;
create policy we4all_payment_customer_select on public.we4all_payment_transactions for select to authenticated using (customer_user_id=(select auth.uid()));
create policy we4all_payment_partner_select on public.we4all_payment_transactions for select to authenticated using (
 (order_id is not null and exists (select 1 from public.we4all_orders o join public.we4all_partners p on p.id=o.partner_id where o.id=order_id and p.owner_user_id=(select auth.uid())))
 or (booking_id is not null and exists (select 1 from public.we4all_bookings b join public.we4all_partners p on p.id=b.partner_id where b.id=booking_id and p.owner_user_id=(select auth.uid())))
 or (labour_engagement_id is not null and exists (select 1 from public.we4all_labour_engagements e join public.we4all_partners p on p.id=e.labour_partner_id where e.id=labour_engagement_id and p.owner_user_id=(select auth.uid())))
);

revoke all on public.we4all_inventory_movements, public.we4all_payment_webhook_events, public.we4all_audit_events from anon, authenticated;
grant all on public.we4all_partners,public.we4all_catalog_items,public.we4all_inventory_movements,public.we4all_orders,public.we4all_order_items,public.we4all_bookings,public.we4all_dispatch_jobs,public.we4all_labour_engagements,public.we4all_labour_attendance,public.we4all_payment_transactions,public.we4all_payment_webhook_events,public.we4all_audit_events to service_role;
