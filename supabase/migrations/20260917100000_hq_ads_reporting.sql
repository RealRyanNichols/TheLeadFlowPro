-- Ads reporting engine (7.2). Not applied to production until approved.
--
-- Two ad platforms become connection kinds on the existing hq_connections
-- table, so a client's ad token is stored the same way their text line's
-- key is: encrypted, per workspace, never readable from the browser.
-- Daily spend rows and the weekly report drafts live in two new tables,
-- each scoped to one workspace. Rollback: drop the two tables and restore
-- the previous kind check.

alter table public.hq_connections drop constraint if exists hq_connections_kind_check;
alter table public.hq_connections
  add constraint hq_connections_kind_check
  check (kind in ('openphone', 'twilio', 'meta_page', 'website', 'meta_ads', 'google_ads'));

create table if not exists public.hq_ads_daily (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  platform text not null check (platform in ('meta', 'google')),
  account_id text not null,
  campaign text not null default '',
  date date not null,
  spend_cents integer not null default 0 check (spend_cents >= 0),
  currency text not null default 'USD',
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  platform_leads integer not null default 0 check (platform_leads >= 0),
  fetched_at timestamptz not null default now(),
  unique (workspace_id, platform, account_id, campaign, date)
);

create index if not exists hq_ads_daily_workspace_date_idx on public.hq_ads_daily (workspace_id, date desc);

create table if not exists public.hq_ads_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  week_start date not null,
  report jsonb not null,
  email_subject text not null default '',
  email_text text not null default '',
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent')),
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, week_start)
);

drop trigger if exists hq_ads_reports_touch on public.hq_ads_reports;
create trigger hq_ads_reports_touch before update on public.hq_ads_reports
  for each row execute function public.hq_touch_updated_at();

alter table public.hq_ads_daily enable row level security;
alter table public.hq_ads_reports enable row level security;

revoke all on table public.hq_ads_daily, public.hq_ads_reports from anon, authenticated;
grant select on public.hq_ads_daily, public.hq_ads_reports to authenticated;

drop policy if exists "hq ads daily member read" on public.hq_ads_daily;
create policy "hq ads daily member read" on public.hq_ads_daily
  for select to authenticated using (public.hq_member_of(workspace_id));

drop policy if exists "hq ads reports member read" on public.hq_ads_reports;
create policy "hq ads reports member read" on public.hq_ads_reports
  for select to authenticated using (public.hq_member_of(workspace_id));
