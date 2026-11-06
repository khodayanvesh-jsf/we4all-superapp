revoke insert,update,delete on table public.we4all_dynamic_modules from anon,authenticated;
revoke all on table public.we4all_dynamic_module_revisions from anon,authenticated;
grant select on table public.we4all_dynamic_modules to anon,authenticated;
