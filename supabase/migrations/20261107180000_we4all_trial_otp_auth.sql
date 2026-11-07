-- Trial-only OTP challenges for deployments without an SMS bundle.
-- The feature stays disabled unless WE4ALL_TRIAL_OTP_ENABLED=true is set on the Edge Function.
create table if not exists public.we4all_trial_otp_challenges (
  id uuid primary key,
  phone_hash text not null,
  otp_hash text not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists we4all_trial_otp_phone_created_idx
  on public.we4all_trial_otp_challenges (phone_hash, created_at desc);
create index if not exists we4all_trial_otp_expiry_idx
  on public.we4all_trial_otp_challenges (expires_at);

alter table public.we4all_trial_otp_challenges enable row level security;
revoke all privileges on table public.we4all_trial_otp_challenges from public, anon, authenticated;
grant select, insert, update, delete on table public.we4all_trial_otp_challenges to service_role;

create or replace function public.we4all_consume_trial_otp(
  p_challenge_id uuid,
  p_phone_hash text,
  p_otp_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  challenge public.we4all_trial_otp_challenges%rowtype;
begin
  select * into challenge
  from public.we4all_trial_otp_challenges
  where id = p_challenge_id and phone_hash = p_phone_hash
  for update;

  if not found or challenge.used_at is not null or challenge.expires_at <= now() or challenge.attempts >= 5 then
    return false;
  end if;

  if challenge.otp_hash <> p_otp_hash then
    update public.we4all_trial_otp_challenges set attempts = attempts + 1 where id = p_challenge_id;
    return false;
  end if;

  update public.we4all_trial_otp_challenges
  set attempts = attempts + 1, used_at = now()
  where id = p_challenge_id;
  return true;
end;
$$;

revoke all on function public.we4all_consume_trial_otp(uuid, text, text) from public, anon, authenticated;
grant execute on function public.we4all_consume_trial_otp(uuid, text, text) to service_role;
