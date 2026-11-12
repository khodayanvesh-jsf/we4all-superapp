create or replace function public.we4all_create_dispatch_job(p_order_id uuid,p_actor_user_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare v_order public.we4all_orders%rowtype; v_partner public.we4all_partners%rowtype; v_job public.we4all_dispatch_jobs%rowtype;
begin
 if coalesce(pg_catalog.current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVER_ONLY_DISPATCH_CREATE' using errcode='42501'; end if;
 select * into v_order from public.we4all_orders where id=p_order_id for update;
 if not found then raise exception 'ORDER_NOT_FOUND' using errcode='P0002'; end if;
 if v_order.payment_status<>'paid' or v_order.status not in ('paid','accepted') then raise exception 'VERIFIED_PAYMENT_AND_ACCEPTANCE_REQUIRED' using errcode='42501'; end if;
 if not exists(select 1 from public.we4all_user_roles where user_id=p_actor_user_id and role='merchant' and status='approved') and
    not exists(select 1 from auth.users where id=p_actor_user_id and raw_app_meta_data->>'we4all_role'='founder') then
   raise exception 'FOUNDER_OR_APPROVED_MERCHANT_REQUIRED' using errcode='42501';
 end if;
 if not exists(select 1 from public.we4all_partners where id=v_order.partner_id and owner_user_id=p_actor_user_id and approval_status='approved') and
    not exists(select 1 from auth.users where id=p_actor_user_id and raw_app_meta_data->>'we4all_role'='founder') then
   raise exception 'ORDER_MERCHANT_OWNERSHIP_REQUIRED' using errcode='42501';
 end if;
 select * into v_job from public.we4all_dispatch_jobs where order_id=p_order_id;
 if found then return pg_catalog.jsonb_build_object('ok',true,'duplicate',true,'dispatch_id',v_job.id,'status',v_job.status); end if;
 select * into v_partner from public.we4all_partners where id=v_order.partner_id;
 insert into public.we4all_dispatch_jobs(order_id,vehicle_class,status,pickup_location,dropoff_location)
 values(v_order.id,'2W','queued',pg_catalog.jsonb_build_object('partner_id',v_partner.id,'name',v_partner.display_name,'zone_id',v_partner.zone_id),v_order.delivery_address)
 returning * into v_job;
 update public.we4all_orders set status='accepted',updated_at=pg_catalog.now() where id=v_order.id and status='paid';
 insert into public.we4all_audit_events(actor_user_id,actor_role,action,entity_type,entity_id,zone_id,metadata)
 values(p_actor_user_id,'merchant','dispatch_queued','dispatch_job',v_job.id,v_order.zone_id,pg_catalog.jsonb_build_object('order_id',v_order.id));
 return pg_catalog.jsonb_build_object('ok',true,'duplicate',false,'dispatch_id',v_job.id,'status',v_job.status);
end; $$;
revoke all on function public.we4all_create_dispatch_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.we4all_create_dispatch_job(uuid,uuid) to service_role;
grant all on public.we4all_ride_bookings to service_role;
