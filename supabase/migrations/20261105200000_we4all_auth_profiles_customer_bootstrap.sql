CREATE TABLE IF NOT EXISTS public.we4all_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.we4all_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.we4all_profiles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.we4all_profiles TO authenticated;
DROP POLICY IF EXISTS "Users read own WE4ALL profile" ON public.we4all_profiles;
DROP POLICY IF EXISTS "Users insert own WE4ALL profile" ON public.we4all_profiles;
DROP POLICY IF EXISTS "Users update own WE4ALL profile" ON public.we4all_profiles;
CREATE POLICY "Users read own WE4ALL profile" ON public.we4all_profiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own WE4ALL profile" ON public.we4all_profiles
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own WE4ALL profile" ON public.we4all_profiles
  FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.we4all_handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.we4all_user_roles (user_id, role, status)
  VALUES (NEW.id, 'customer', 'approved')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.we4all_profiles (user_id, full_name, business_name, phone, area)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'business_name', ''),
    COALESCE(NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'area', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.we4all_handle_new_auth_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_we4all_auth_user_created ON auth.users;
CREATE TRIGGER on_we4all_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.we4all_handle_new_auth_user();
