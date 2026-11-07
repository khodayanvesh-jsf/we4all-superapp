DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'we4all_user_state'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.we4all_user_state;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'we4all_town_state'
    ) THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.we4all_town_state;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'we4all_orders_ledger'
    ) THEN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.we4all_orders_ledger;
    END IF;
  END IF;
END
$$;
