-- Fix registration setup error: allow idempotent customer role bootstrap without tripping role-lock trigger
CREATE OR REPLACE FUNCTION public.we4all_bootstrap_customer_account(
  p_full_name text DEFAULT '',
  p_phone text DEFAULT '',
  p_area text DEFAULT ''
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := coalesce(nullif(pg_catalog.btrim(p_full_name), ''), 'WE4ALL Customer');
  v_phone text := coalesce(nullif(pg_catalog.btrim(p_phone), ''), '');
  v_area text := coalesce(nullif(pg_catalog.btrim(p_area), ''), 'Adilabad');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.we4all_profiles(user_id, full_name, phone, area, updated_at)
  VALUES (v_uid, v_name, v_phone, v_area, pg_catalog.now())
  ON CONFLICT (user_id) DO UPDATE
    SET full_name = CASE WHEN pg_catalog.length(pg_catalog.btrim(public.we4all_profiles.full_name)) = 0 THEN excluded.full_name ELSE public.we4all_profiles.full_name END,
        phone = CASE WHEN pg_catalog.length(pg_catalog.btrim(public.we4all_profiles.phone)) = 0 THEN excluded.phone ELSE public.we4all_profiles.phone END,
        area = CASE WHEN pg_catalog.length(pg_catalog.btrim(public.we4all_profiles.area)) = 0 THEN excluded.area ELSE public.we4all_profiles.area END,
        updated_at = pg_catalog.now();

  INSERT INTO public.we4all_user_roles(user_id, role, status, updated_at)
  VALUES (v_uid, 'customer', 'approved', pg_catalog.now())
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'user_id', v_uid, 'role', 'customer', 'status', 'approved');
END;
$function$;

REVOKE ALL ON FUNCTION public.we4all_bootstrap_customer_account(text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.we4all_bootstrap_customer_account(text, text, text) TO authenticated, service_role;
