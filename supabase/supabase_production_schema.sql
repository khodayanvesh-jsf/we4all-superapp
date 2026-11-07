-- RETIRED SQL SCRIPT — DO NOT EXECUTE.
-- Earlier WE4ALL versions created public write policies on shared global JSON state.
-- The live project now uses owner-scoped RLS tables and authenticated Edge Function sync.
-- Canonical, already-applied database changes are recorded in:
--   supabase/migrations/20261105190000_secure_user_state_partner_auth.sql
--   supabase/migrations/20261105200000_we4all_auth_profiles_customer_bootstrap.sql
--   supabase/migrations/20261105210000_secure_we4all_media_uploads.sql
-- Do not recreate public policies or the old shared global sync bus.
DO $we4all_retired$
BEGIN
  RAISE EXCEPTION 'This legacy WE4ALL setup script is retired. Apply the secure versioned migrations instead.';
END
$we4all_retired$;
