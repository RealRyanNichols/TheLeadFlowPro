-- LeadFlow Content Command Center.
--
-- Daily content artifacts arrive from the approved Notion package or the
-- automation import endpoint. Every external action remains approval-gated.
-- Credentials stay in Supabase Vault or the trusted worker environment and
-- never enter these tables.

create extension if not exists pgcrypto;

create or replace function public.set_content_command_updated_at()
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

create table if not exists public.content_artifacts (
  id uuid primary key default gen_random_uuid(),
  artifact_date date not null unique,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  status text not null default 'draft'
    check (status in ('generating', 'draft', 'ready', 'archived', 'failed')),
  timezone text not null default 'America/Chicago',
  notion_page_id text,
  notion_page_url text,
  source text not null default 'notion'
    check (source in ('notion', 'automation', 'manual', 'api')),
  source_hash text,
  unit_count smallint not null default 0 check (unit_count between 0 and 100),
  channel_blockers jsonb not null default '{}'::jsonb,
  verification jsonb not null default '{}'::jsonb,
  raw_source jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.content_units (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references public.content_artifacts(id) on delete cascade,
  position smallint not null check (position between 1 and 100),
  title text not null check (char_length(btrim(title)) between 1 and 240),
  content_type text not null default 'text-led' check (char_length(content_type) <= 120),
  content_bucket text check (content_bucket is null or char_length(content_bucket) <= 160),
  target_persona text check (target_persona is null or char_length(target_persona) <= 500),
  objective text check (objective is null or char_length(objective) <= 1000),
  cta text check (cta is null or char_length(cta) <= 1000),
  asset_direction text check (asset_direction is null or char_length(asset_direction) <= 3000),
  asset_url text check (asset_url is null or char_length(asset_url) <= 3000),
  verified_url text check (verified_url is null or char_length(verified_url) <= 3000),
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'partially_queued', 'queued', 'partially_published', 'published', 'blocked', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artifact_id, position)
);

create table if not exists public.content_variants (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.content_units(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'x', 'instagram', 'youtube', 'tiktok')),
  format text check (format is null or char_length(format) <= 160),
  title text check (title is null or char_length(title) <= 500),
  copy text not null default '' check (char_length(copy) <= 30000),
  description text check (description is null or char_length(description) <= 12000),
  hook text check (hook is null or char_length(hook) <= 1000),
  talking_points text[] not null default '{}'::text[],
  scheduled_for timestamptz,
  timezone text not null default 'America/Chicago',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'queued', 'processing', 'scheduled', 'published', 'verified', 'blocked', 'failed', 'cancelled')),
  external_id text,
  external_url text,
  published_at timestamptz,
  verified_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 4000),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, platform)
);

create table if not exists public.content_channel_connections (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique check (platform in ('facebook', 'x', 'instagram', 'youtube', 'tiktok')),
  status text not null default 'not_connected'
    check (status in ('not_connected', 'connected', 'limited', 'expired', 'error')),
  display_name text,
  external_account_id text,
  capabilities text[] not null default '{}'::text[],
  auth_source text not null default 'worker'
    check (auth_source in ('worker', 'supabase_vault', 'oauth', 'manual')),
  last_synced_at timestamptz,
  last_verified_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 4000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.content_channel_connections (platform)
values ('facebook'), ('x'), ('instagram'), ('youtube'), ('tiktok')
on conflict (platform) do nothing;

create table if not exists public.content_reply_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  kind text not null check (kind in ('comment', 'dm', 'review', 'message')),
  platform text check (platform is null or platform in ('facebook', 'x', 'instagram', 'youtube', 'tiktok')),
  category text not null default 'general' check (char_length(category) <= 100),
  body text not null check (char_length(btrim(body)) between 1 and 12000),
  variables text[] not null default '{}'::text[],
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (title, kind, platform)
);

insert into public.content_reply_templates
  (title, kind, category, body, variables, sort_order)
values
  ('Clarify the handoff', 'comment', 'discovery', 'Good question. What happens now after someone calls, sends a DM, or fills out your form?', '{}', 10),
  ('Move private details off the feed', 'comment', 'privacy', 'I can help with that. Please do not post account details here. Send the business name and the workflow you want fixed through the secure contact form.', '{}', 20),
  ('No guarantees', 'comment', 'expectations', 'We do not guarantee leads, revenue, rankings, or reach. We map the current system, build the missing handoffs, and measure what actually happens.', '{}', 30),
  ('Direct next step', 'dm', 'discovery', 'Thanks for reaching out. Tell me what kind of business you run and which part is breaking right now: calls, forms, follow-up, scheduling, reporting, or something else?', '{}', 40),
  ('Review acknowledgment', 'review', 'reputation', 'Thank you for taking the time to leave this. We appreciate the specific feedback and will use it to improve the next handoff.', '{}', 50),
  ('Not a fit', 'message', 'qualification', 'Thanks for the detail. This is not a fit for the work we are set up to do right now. I would rather tell you that clearly than waste your time.', '{}', 60),
  ('Checking the record', 'message', 'status', 'I have this. I am checking the record and the next owner now. I will reply with the next step instead of guessing.', '{}', 70)
on conflict (title, kind, platform) do nothing;

create table if not exists public.content_threads (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook', 'x', 'instagram', 'youtube', 'tiktok')),
  thread_type text not null check (thread_type in ('comment', 'dm', 'review', 'mention')),
  external_thread_id text not null,
  external_parent_id text,
  external_url text,
  subject text,
  author_name text,
  author_handle text,
  status text not null default 'open' check (status in ('open', 'waiting', 'replied', 'closed', 'blocked')),
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, external_thread_id)
);

create table if not exists public.content_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.content_threads(id) on delete cascade,
  external_message_id text,
  direction text not null check (direction in ('inbound', 'outbound')),
  body text not null check (char_length(btrim(body)) between 1 and 30000),
  author_name text,
  reply_template_id uuid references public.content_reply_templates(id) on delete set null,
  status text not null default 'received'
    check (status in ('received', 'draft', 'approved', 'queued', 'sent', 'verified', 'blocked', 'failed')),
  sent_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

drop index if exists public.content_messages_platform_external_unique;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'content_messages_thread_external_unique'
      and conrelid = 'public.content_messages'::regclass
  ) then
    alter table public.content_messages
      add constraint content_messages_thread_external_unique
      unique (thread_id, external_message_id);
  end if;
end;
$$;

create table if not exists public.content_publish_jobs (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.content_variants(id) on delete cascade,
  message_id uuid references public.content_messages(id) on delete cascade,
  platform text not null check (platform in ('facebook', 'x', 'instagram', 'youtube', 'tiktok')),
  action text not null check (action in ('publish', 'schedule', 'reply', 'comment', 'verify')),
  status text not null default 'awaiting_approval'
    check (status in ('awaiting_approval', 'approved', 'queued', 'processing', 'succeeded', 'blocked', 'failed', 'cancelled')),
  payload jsonb not null default '{}'::jsonb,
  attempt_count smallint not null default 0 check (attempt_count between 0 and 50),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  completed_at timestamptz,
  external_id text,
  external_url text,
  last_error text check (last_error is null or char_length(last_error) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((variant_id is not null)::integer + (message_id is not null)::integer = 1)
);

create table if not exists public.content_activity_events (
  id bigint generated by default as identity primary key,
  kind text not null check (char_length(kind) <= 120),
  entity_type text not null check (char_length(entity_type) <= 80),
  entity_id text,
  summary text not null check (char_length(summary) <= 1000),
  details jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists content_units_artifact_position_idx on public.content_units (artifact_id, position);
create index if not exists content_variants_status_schedule_idx on public.content_variants (status, scheduled_for, platform);
create index if not exists content_threads_status_recent_idx on public.content_threads (status, last_message_at desc);
create index if not exists content_messages_thread_recent_idx on public.content_messages (thread_id, created_at desc);
create index if not exists content_publish_jobs_queue_idx on public.content_publish_jobs (status, available_at, created_at);
create index if not exists content_activity_recent_idx on public.content_activity_events (created_at desc);

drop trigger if exists set_content_artifacts_updated_at on public.content_artifacts;
create trigger set_content_artifacts_updated_at before update on public.content_artifacts
for each row execute function public.set_content_command_updated_at();
drop trigger if exists set_content_units_updated_at on public.content_units;
create trigger set_content_units_updated_at before update on public.content_units
for each row execute function public.set_content_command_updated_at();
drop trigger if exists set_content_variants_updated_at on public.content_variants;
create trigger set_content_variants_updated_at before update on public.content_variants
for each row execute function public.set_content_command_updated_at();
drop trigger if exists set_content_channel_connections_updated_at on public.content_channel_connections;
create trigger set_content_channel_connections_updated_at before update on public.content_channel_connections
for each row execute function public.set_content_command_updated_at();
drop trigger if exists set_content_reply_templates_updated_at on public.content_reply_templates;
create trigger set_content_reply_templates_updated_at before update on public.content_reply_templates
for each row execute function public.set_content_command_updated_at();
drop trigger if exists set_content_threads_updated_at on public.content_threads;
create trigger set_content_threads_updated_at before update on public.content_threads
for each row execute function public.set_content_command_updated_at();
drop trigger if exists set_content_publish_jobs_updated_at on public.content_publish_jobs;
create trigger set_content_publish_jobs_updated_at before update on public.content_publish_jobs
for each row execute function public.set_content_command_updated_at();

alter table public.content_artifacts enable row level security;
alter table public.content_units enable row level security;
alter table public.content_variants enable row level security;
alter table public.content_channel_connections enable row level security;
alter table public.content_reply_templates enable row level security;
alter table public.content_threads enable row level security;
alter table public.content_messages enable row level security;
alter table public.content_publish_jobs enable row level security;
alter table public.content_activity_events enable row level security;

drop policy if exists content_artifacts_admin_all on public.content_artifacts;
drop policy if exists content_units_admin_all on public.content_units;
drop policy if exists content_variants_admin_all on public.content_variants;
drop policy if exists content_channel_connections_admin_all on public.content_channel_connections;
drop policy if exists content_reply_templates_admin_all on public.content_reply_templates;
drop policy if exists content_threads_admin_all on public.content_threads;
drop policy if exists content_messages_admin_all on public.content_messages;
drop policy if exists content_publish_jobs_admin_all on public.content_publish_jobs;
drop policy if exists content_activity_events_admin_all on public.content_activity_events;

create policy content_artifacts_admin_all on public.content_artifacts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy content_units_admin_all on public.content_units for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy content_variants_admin_all on public.content_variants for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy content_channel_connections_admin_all on public.content_channel_connections for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy content_reply_templates_admin_all on public.content_reply_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy content_threads_admin_all on public.content_threads for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy content_messages_admin_all on public.content_messages for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy content_publish_jobs_admin_all on public.content_publish_jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy content_activity_events_admin_all on public.content_activity_events for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.content_artifacts to authenticated, service_role;
grant select, insert, update, delete on public.content_units to authenticated, service_role;
grant select, insert, update, delete on public.content_variants to authenticated, service_role;
grant select, insert, update, delete on public.content_channel_connections to authenticated, service_role;
grant select, insert, update, delete on public.content_reply_templates to authenticated, service_role;
grant select, insert, update, delete on public.content_threads to authenticated, service_role;
grant select, insert, update, delete on public.content_messages to authenticated, service_role;
grant select, insert, update, delete on public.content_publish_jobs to authenticated, service_role;
grant select, insert on public.content_activity_events to authenticated, service_role;
grant usage, select on sequence public.content_activity_events_id_seq to authenticated, service_role;

revoke execute on function public.set_content_command_updated_at() from public, anon, authenticated;
grant execute on function public.set_content_command_updated_at() to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'content_artifacts', 'content_units', 'content_variants',
    'content_channel_connections', 'content_reply_templates', 'content_threads',
    'content_messages', 'content_publish_jobs', 'content_activity_events'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;

-- ROLLBACK (manual, only after exporting retained content and stopping worker):
-- drop table if exists public.content_activity_events;
-- drop table if exists public.content_publish_jobs;
-- drop table if exists public.content_messages;
-- drop table if exists public.content_threads;
-- drop table if exists public.content_reply_templates;
-- drop table if exists public.content_channel_connections;
-- drop table if exists public.content_variants;
-- drop table if exists public.content_units;
-- drop table if exists public.content_artifacts;
-- drop function if exists public.set_content_command_updated_at();
