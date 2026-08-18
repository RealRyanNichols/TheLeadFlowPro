-- LeadFlow Pro Facebook publishing control plane.
--
-- The database stores drafts, approvals, schedules, Meta object ids, and a
-- sanitized attempt log. Meta credentials never enter these tables. They stay
-- in the trusted server runtime as encrypted environment variables.
--
-- A post cannot reach Meta until it has an approval_queue record and an admin
-- explicitly approves it through the back office.

create extension if not exists pgcrypto;

create or replace function public.set_social_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- This table already exists in the LeadRep agent-bus migration in some
-- environments. Keep the same shape so this feature is safe whether that
-- broader migration has run yet or not.
create table if not exists public.approval_queue (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  branch text not null default 'main',
  source_agent text not null,
  target_agent text not null,
  status text not null default 'needs_approval',
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  cost_estimate numeric(10, 4) not null default 0,
  approval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists approval_queue_repo_branch_status_idx
  on public.approval_queue (repo, branch, status, created_at desc);

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'facebook'
    check (provider in ('facebook')),
  page_id text not null check (char_length(page_id) between 3 and 100),
  page_name text check (page_name is null or char_length(page_name) <= 200),
  graph_version text not null default 'v26.0'
    check (graph_version ~ '^v[0-9]+\.[0-9]+$'),
  status text not null default 'unverified'
    check (status in ('unverified', 'connected', 'limited', 'error')),
  permission_names text[] not null default '{}'::text[],
  page_tasks text[] not null default '{}'::text[],
  last_verified_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, page_id)
);

comment on table public.social_connections is
  'Non-secret Meta connection health. Tokens and app secrets remain in server environment variables.';

create table if not exists public.social_schedule_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true,
  timezone text not null default 'America/Chicago'
    check (char_length(timezone) between 3 and 100),
  daily_slots text[] not null default array['07:15', '10:30', '13:30', '16:30', '19:45'],
  minimum_posts smallint not null default 3 check (minimum_posts between 1 and 5),
  maximum_posts smallint not null default 5 check (maximum_posts between 1 and 5),
  fifth_post_optional boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_posts <= maximum_posts),
  check (cardinality(daily_slots) between 1 and 5),
  check (array_to_string(daily_slots, ',') ~ '^(([01][0-9]|2[0-3]):[0-5][0-9])(,([01][0-9]|2[0-3]):[0-5][0-9]){0,4}$')
);

insert into public.social_schedule_settings (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'facebook'
    check (provider in ('facebook')),
  page_id text not null check (char_length(page_id) between 3 and 100),
  status text not null default 'draft'
    check (status in (
      'draft', 'pending_approval', 'approved', 'scheduled',
      'published', 'failed', 'cancelled'
    )),
  message text not null
    check (char_length(btrim(message)) between 1 and 12000),
  media_type text not null default 'text'
    check (media_type in ('text', 'link', 'photo', 'video')),
  media_url text check (media_url is null or char_length(media_url) <= 2000),
  link_url text check (link_url is null or char_length(link_url) <= 2000),
  content_pillar text check (content_pillar is null or char_length(content_pillar) <= 100),
  campaign text check (campaign is null or char_length(campaign) <= 160),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 3000),
  source text not null default 'manual'
    check (source in ('manual', 'chatgpt', 'import', 'api')),
  scheduled_for timestamptz,
  timezone text not null default 'America/Chicago'
    check (char_length(timezone) between 3 and 100),
  approval_queue_id uuid references public.approval_queue(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  meta_object_id text check (meta_object_id is null or char_length(meta_object_id) <= 200),
  meta_post_id text check (meta_post_id is null or char_length(meta_post_id) <= 200),
  meta_permalink text check (meta_permalink is null or char_length(meta_permalink) <= 2000),
  publish_attempts smallint not null default 0 check (publish_attempts between 0 and 50),
  last_error text check (last_error is null or char_length(last_error) <= 3000),
  published_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (media_type <> 'photo' or media_url is not null),
  check (media_type <> 'video' or media_url is not null),
  check (media_type <> 'link' or link_url is not null)
);

comment on table public.social_posts is
  'Approval-gated Facebook Page drafts and schedules. No credentials are stored here.';

create index if not exists social_posts_status_schedule_idx
  on public.social_posts (status, scheduled_for, created_at desc);
create index if not exists social_posts_page_created_idx
  on public.social_posts (page_id, created_at desc);
create unique index if not exists social_posts_meta_post_id_unique
  on public.social_posts (meta_post_id)
  where meta_post_id is not null;

create table if not exists public.social_publish_attempts (
  id uuid primary key default gen_random_uuid(),
  social_post_id uuid not null references public.social_posts(id) on delete cascade,
  action text not null check (action in ('verify', 'schedule', 'publish', 'cancel')),
  status text not null check (status in ('started', 'succeeded', 'failed')),
  http_status integer check (http_status is null or http_status between 100 and 599),
  meta_error_code text check (meta_error_code is null or char_length(meta_error_code) <= 100),
  meta_error_subcode text check (meta_error_subcode is null or char_length(meta_error_subcode) <= 100),
  meta_trace_id text check (meta_trace_id is null or char_length(meta_trace_id) <= 300),
  summary_json jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.social_publish_attempts is
  'Sanitized Meta publishing audit log. Access tokens and raw request bodies are never stored.';

create index if not exists social_publish_attempts_post_created_idx
  on public.social_publish_attempts (social_post_id, created_at desc);

drop trigger if exists set_approval_queue_updated_at on public.approval_queue;
create trigger set_approval_queue_updated_at
before update on public.approval_queue
for each row execute function public.set_social_updated_at();

drop trigger if exists set_social_connections_updated_at on public.social_connections;
create trigger set_social_connections_updated_at
before update on public.social_connections
for each row execute function public.set_social_updated_at();

drop trigger if exists set_social_schedule_settings_updated_at on public.social_schedule_settings;
create trigger set_social_schedule_settings_updated_at
before update on public.social_schedule_settings
for each row execute function public.set_social_updated_at();

drop trigger if exists set_social_posts_updated_at on public.social_posts;
create trigger set_social_posts_updated_at
before update on public.social_posts
for each row execute function public.set_social_updated_at();

alter table public.approval_queue enable row level security;
alter table public.social_connections enable row level security;
alter table public.social_schedule_settings enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_publish_attempts enable row level security;

drop policy if exists social_connections_admin_read on public.social_connections;
create policy social_connections_admin_read on public.social_connections
  for select to authenticated using (public.is_admin());

drop policy if exists social_schedule_settings_admin_all on public.social_schedule_settings;
create policy social_schedule_settings_admin_all on public.social_schedule_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists social_posts_admin_all on public.social_posts;
create policy social_posts_admin_all on public.social_posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists social_publish_attempts_admin_read on public.social_publish_attempts;
create policy social_publish_attempts_admin_read on public.social_publish_attempts
  for select to authenticated using (public.is_admin());

revoke all on public.approval_queue from public, anon, authenticated;
revoke all on public.social_connections from public, anon, authenticated;
revoke all on public.social_schedule_settings from public, anon, authenticated;
revoke all on public.social_posts from public, anon, authenticated;
revoke all on public.social_publish_attempts from public, anon, authenticated;

grant select on public.social_connections to authenticated;
grant select, insert, update, delete on public.social_schedule_settings to authenticated;
grant select, insert, update, delete on public.social_posts to authenticated;
grant select on public.social_publish_attempts to authenticated;

grant select, insert, update, delete on public.approval_queue to service_role;
grant select, insert, update, delete on public.social_connections to service_role;
grant select, insert, update, delete on public.social_schedule_settings to service_role;
grant select, insert, update, delete on public.social_posts to service_role;
grant select, insert, update, delete on public.social_publish_attempts to service_role;

revoke execute on function public.set_social_updated_at() from public, anon, authenticated;
grant execute on function public.set_social_updated_at() to service_role;

-- ============================================================
-- ROLLBACK (run manually to undo this migration):
--
-- drop table if exists public.social_publish_attempts;
-- drop table if exists public.social_posts;
-- drop table if exists public.social_schedule_settings;
-- drop table if exists public.social_connections;
-- drop trigger if exists set_approval_queue_updated_at on public.approval_queue;
-- drop function if exists public.set_social_updated_at();
--
-- approval_queue is intentionally retained because other LeadRep workflows may
-- use it. Remove it only after confirming no other agent-bus feature depends on it.
-- ============================================================
