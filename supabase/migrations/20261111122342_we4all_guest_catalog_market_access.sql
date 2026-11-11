-- Market IDs are public catalogue filters. Keep private partner columns restricted.
grant select (market_id) on public.we4all_partners to anon;
