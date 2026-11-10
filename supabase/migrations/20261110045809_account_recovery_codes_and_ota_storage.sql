create table public.we4all_account_recovery_codes (
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index we4all_account_recovery_codes_user_idx on public.we4all_account_recovery_codes(user_id);
alter table public.we4all_account_recovery_codes enable row level security;
revoke all on public.we4all_account_recovery_codes from public, anon, authenticated;
grant select, insert, delete on public.we4all_account_recovery_codes to service_role;

create function public.we4all_rotate_recovery_codes(p_user_id uuid, p_hashes text[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if cardinality(p_hashes) is distinct from 4 then
    raise exception 'Expected four recovery codes';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  delete from public.we4all_account_recovery_codes where user_id = p_user_id;
  insert into public.we4all_account_recovery_codes (user_id, code_hash)
    select p_user_id, hash from unnest(p_hashes) as hash;
end;
$$;
revoke all on function public.we4all_rotate_recovery_codes(uuid, text[]) from public, anon, authenticated;
grant execute on function public.we4all_rotate_recovery_codes(uuid, text[]) to service_role;

-- Recovery runs without a user session. Only the authenticated server handler may
-- revoke this account's refresh sessions after changing its PIN through Auth Admin.
create function public.we4all_revoke_recovered_sessions(p_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = p_user_id;
$$;
revoke all on function public.we4all_revoke_recovered_sessions(uuid) from public, anon, authenticated;
grant execute on function public.we4all_revoke_recovered_sessions(uuid) to service_role;

-- Release files are distributable app code. Clients cannot write to this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('we4all-ota-staging', 'we4all-ota-staging', true, 10485760, array['application/json','application/octet-stream'])
on conflict (id) do nothing;
