-- Preserve legacy rows but remove public API access from the old shared state and order tables.
DROP POLICY IF EXISTS "Allow public read we4all_town_state" ON public.we4all_town_state;
DROP POLICY IF EXISTS "Allow public update we4all_town_state" ON public.we4all_town_state;
DROP POLICY IF EXISTS "Allow public write we4all_town_state" ON public.we4all_town_state;
DROP POLICY IF EXISTS "Allow public all we4all_orders_ledger" ON public.we4all_orders_ledger;
REVOKE ALL PRIVILEGES ON TABLE public.we4all_town_state FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.we4all_orders_ledger FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.we4all_user_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  app_version text NOT NULL DEFAULT '3.2.8',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT we4all_user_state_payload_object CHECK (jsonb_typeof(state_payload) = 'object')
);
ALTER TABLE public.we4all_user_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.we4all_user_state FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.we4all_user_state TO authenticated;
DROP POLICY IF EXISTS "Users read own WE4ALL state" ON public.we4all_user_state;
DROP POLICY IF EXISTS "Users insert own WE4ALL state" ON public.we4all_user_state;
DROP POLICY IF EXISTS "Users update own WE4ALL state" ON public.we4all_user_state;
DROP POLICY IF EXISTS "Users delete own WE4ALL state" ON public.we4all_user_state;
CREATE POLICY "Users read own WE4ALL state" ON public.we4all_user_state
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own WE4ALL state" ON public.we4all_user_state
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own WE4ALL state" ON public.we4all_user_state
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own WE4ALL state" ON public.we4all_user_state
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.we4all_partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_role text NOT NULL CHECK (requested_role IN ('merchant','service_provider','decorator','rider','labour')),
  application_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);
ALTER TABLE public.we4all_partner_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.we4all_partner_applications FROM PUBLIC, anon;
GRANT SELECT, INSERT ON TABLE public.we4all_partner_applications TO authenticated;
DROP POLICY IF EXISTS "Users read own partner applications" ON public.we4all_partner_applications;
DROP POLICY IF EXISTS "Users create own partner applications" ON public.we4all_partner_applications;
CREATE POLICY "Users read own partner applications" ON public.we4all_partner_applications
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users create own partner applications" ON public.we4all_partner_applications
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);

CREATE TABLE IF NOT EXISTS public.we4all_user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('customer','merchant','service_provider','decorator','rider','labour')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('approved','pending','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);
ALTER TABLE public.we4all_user_roles ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.we4all_user_roles FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.we4all_user_roles TO authenticated;
DROP POLICY IF EXISTS "Users read own WE4ALL roles" ON public.we4all_user_roles;
CREATE POLICY "Users read own WE4ALL roles" ON public.we4all_user_roles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS we4all_partner_applications_user_created_idx
  ON public.we4all_partner_applications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS we4all_partner_applications_status_created_idx
  ON public.we4all_partner_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS we4all_partner_applications_reviewed_by_idx
  ON public.we4all_partner_applications (reviewed_by);
