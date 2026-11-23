-- 1-row global runtime switch for Admin News Source Pause/Resume (zero news articles stored)
create table if not exists public.we4all_geo_news_controls (
  id text primary key default 'global',
  pause_local boolean not null default false,
  pause_state boolean not null default false,
  pause_india boolean not null default false,
  pause_custom boolean not null default false,
  pause_all boolean not null default false,
  custom_rss_url text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.we4all_geo_news_controls (id) values ('global') on conflict (id) do nothing;

alter table public.we4all_geo_news_controls enable row level security;

drop policy if exists "we4all_geo_news_controls_public_read" on public.we4all_geo_news_controls;
create policy "we4all_geo_news_controls_public_read"
  on public.we4all_geo_news_controls for select
  to anon, authenticated
  using (true);