CREATE OR REPLACE FUNCTION public.we4all_is_backend_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    current_setting('role', true) = 'service_role'
    OR coalesce(auth.jwt() -> 'app_metadata' ->> 'we4all_role', '') IN ('founder', 'admin', 'super_admin')
    OR coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('founder', 'admin', 'super_admin');
$$;

CREATE OR REPLACE FUNCTION public.we4all_normalize_phone_10(raw_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN raw_phone IS NULL THEN NULL
    WHEN length(regexp_replace(raw_phone, '\D', '', 'g')) >= 10
      THEN right(regexp_replace(raw_phone, '\D', '', 'g'), 10)
    ELSE NULL
  END;
$$;

CREATE TABLE IF NOT EXISTS public.we4all_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'pending_admin_approval',
  is_locked boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.we4all_user_roles
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT true;

ALTER TABLE public.we4all_user_roles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.we4all_enforce_role_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.we4all_is_backend_admin() THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Cannot register a portal role for another user.'
        USING ERRCODE = '42501';
    END IF;

    NEW.role := lower(trim(coalesce(NEW.role, '')));

    IF NEW.role IN ('founder', 'admin', 'super_admin', 'city_manager') THEN
      RAISE EXCEPTION 'Admin roles can only be provisioned by WE4ALL backend.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.role = 'customer' THEN
      NEW.status := 'approved';
    ELSIF NEW.role IN ('merchant', 'rider', 'service_provider', 'decorator', 'labour') THEN
      NEW.status := 'pending_admin_approval';
    ELSE
      RAISE EXCEPTION 'Unsupported portal role: %', NEW.role
        USING ERRCODE = '22023';
    END IF;

    NEW.is_locked := true;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Registered portal details are locked. Submit a change request for WE4ALL Admin approval.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_we4all_lock_portal_registration ON public.we4all_user_roles;
CREATE TRIGGER trg_we4all_lock_portal_registration
  BEFORE INSERT OR UPDATE OR DELETE ON public.we4all_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.we4all_enforce_role_lock();

CREATE OR REPLACE FUNCTION public.we4all_guard_profile_edits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm_new text := public.we4all_normalize_phone_10(NEW.phone);
  norm_old text := CASE WHEN TG_OP = 'UPDATE' THEN public.we4all_normalize_phone_10(OLD.phone) ELSE NULL END;
  has_partner_role boolean := false;
BEGIN
  IF public.we4all_is_backend_admin() THEN
    RETURN NEW;
  END IF;

  IF norm_new IS NOT NULL AND (TG_OP = 'INSERT' OR norm_new IS DISTINCT FROM norm_old) THEN
    IF EXISTS (
      SELECT 1
      FROM public.we4all_profiles p
      WHERE p.user_id <> NEW.user_id
        AND public.we4all_normalize_phone_10(p.phone) = norm_new
    ) THEN
      RAISE EXCEPTION 'This mobile number is already registered with another WE4ALL account.'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.we4all_user_roles r
      WHERE r.user_id = NEW.user_id
        AND r.role <> 'customer'
    ) INTO has_partner_role;

    IF norm_old IS NOT NULL AND norm_new IS DISTINCT FROM norm_old THEN
      RAISE EXCEPTION 'Registered mobile number can only be modified by WE4ALL Admin.'
        USING ERRCODE = '42501';
    END IF;

    IF has_partner_role AND coalesce(NEW.business_name, '') IS DISTINCT FROM coalesce(OLD.business_name, '') THEN
      RAISE EXCEPTION 'Partner business details are locked. Submit a change request for WE4ALL Admin approval.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.we4all_profiles') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_we4all_guard_profile_edits ON public.we4all_profiles;
    CREATE TRIGGER trg_we4all_guard_profile_edits
      BEFORE INSERT OR UPDATE ON public.we4all_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.we4all_guard_profile_edits();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.we4all_profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_role text NOT NULL,
  requested_changes jsonb NOT NULL CHECK (jsonb_typeof(requested_changes) = 'object'),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.we4all_profile_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own change requests" ON public.we4all_profile_change_requests;
CREATE POLICY "Users can read own change requests"
ON public.we4all_profile_change_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.we4all_is_backend_admin());

DROP POLICY IF EXISTS "Users can submit own change requests" ON public.we4all_profile_change_requests;
CREATE POLICY "Users can submit own change requests"
ON public.we4all_profile_change_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "Admins can review change requests" ON public.we4all_profile_change_requests;
CREATE POLICY "Admins can review change requests"
ON public.we4all_profile_change_requests
FOR UPDATE
TO authenticated
USING (public.we4all_is_backend_admin())
WITH CHECK (public.we4all_is_backend_admin());

CREATE OR REPLACE FUNCTION public.we4all_admin_review_change_request(
  p_request_id uuid,
  p_decision text,
  p_admin_note text DEFAULT NULL
)
RETURNS public.we4all_profile_change_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.we4all_profile_change_requests;
BEGIN
  IF NOT public.we4all_is_backend_admin() THEN
    RAISE EXCEPTION 'Only WE4ALL Founder/Admin can review change requests.'
      USING ERRCODE = '42501';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.we4all_profile_change_requests
  SET
    status = p_decision,
    admin_note = p_admin_note,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_request_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Change request not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_decision = 'approved' AND to_regclass('public.we4all_profiles') IS NOT NULL THEN
    UPDATE public.we4all_profiles
    SET
      full_name = coalesce(nullif(v_row.requested_changes ->> 'full_name', ''), full_name),
      business_name = coalesce(nullif(v_row.requested_changes ->> 'business_name', ''), business_name),
      area = coalesce(nullif(v_row.requested_changes ->> 'area', ''), area),
      phone = coalesce(nullif(v_row.requested_changes ->> 'phone', ''), phone),
      updated_at = now()
    WHERE user_id = v_row.user_id;
  END IF;

  RETURN v_row;
END;
$$;