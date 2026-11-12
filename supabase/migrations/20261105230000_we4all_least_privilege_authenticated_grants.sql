-- Remove inherited/default broad grants and grant only the operations needed by the app.
-- RLS policies still enforce auth.uid() ownership for every permitted row operation.
REVOKE ALL PRIVILEGES ON TABLE public.we4all_user_state FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.we4all_profiles FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.we4all_partner_applications FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.we4all_user_roles FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.we4all_user_state TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.we4all_profiles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.we4all_partner_applications TO authenticated;
GRANT SELECT ON TABLE public.we4all_user_roles TO authenticated;
