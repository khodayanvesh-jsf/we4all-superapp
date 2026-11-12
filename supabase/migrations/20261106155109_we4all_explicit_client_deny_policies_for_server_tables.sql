
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'we4all_audit_events',
    'we4all_delivery_test_otps',
    'we4all_inventory_movements',
    'we4all_orders_ledger',
    'we4all_p2p_deliveries',
    'we4all_payment_webhook_events',
    'we4all_rider_location_pings',
    'we4all_town_state'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_client_deny', table_name);
    execute format(
      'create policy %I on public.%I for all to anon, authenticated using (false) with check (false)',
      table_name || '_client_deny',
      table_name
    );
  end loop;
end $$;
