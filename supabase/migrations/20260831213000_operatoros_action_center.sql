-- OperatorOS Action Center: human-gated outreach execution, contact coverage, and non-secret operating setup.

alter table public.operator_prospects
  add column if not exists contact_name text,
  add column if not exists contact_title text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists contact_source text,
  add column if not exists contact_verified_at timestamptz,
  add column if not exists last_outreach_channel text,
  add column if not exists do_not_contact_reason text;

create table if not exists public.operator_workspace_settings (
  workspace_id uuid primary key references public.operator_workspaces(id) on delete cascade,
  sender_name text,
  sender_email text,
  sender_phone text,
  booking_url text,
  outbound_owner text not null default 'Pat',
  closer_owner text not null default 'Ryan',
  default_market text not null default 'Longview, TX',
  daily_new_contact_limit integer not null default 50 check (daily_new_contact_limit between 0 and 500),
  daily_followup_limit integer not null default 20 check (daily_followup_limit between 0 and 500),
  reply_target_minutes integer not null default 15 check (reply_target_minutes between 1 and 10080),
  business_timezone text not null default 'America/Chicago',
  allowed_channels text[] not null default array['email','dm','phone','text']::text[],
  approval_mode text not null default 'human_required' check (approval_mode in ('human_required')),
  content_publish_mode text not null default 'draft_only' check (content_publish_mode in ('draft_only')),
  operator_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operator_outreach_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  prospect_id uuid not null references public.operator_prospects(id) on delete cascade,
  action_id uuid references public.operator_outreach_actions(id) on delete set null,
  event_type text not null,
  detail_json jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists operator_prospects_contact_email_idx
  on public.operator_prospects(lower(contact_email))
  where contact_email is not null;
create index if not exists operator_outreach_events_prospect_idx
  on public.operator_outreach_events(prospect_id, created_at desc);
create index if not exists operator_outreach_events_workspace_idx
  on public.operator_outreach_events(workspace_id, created_at desc);

alter table public.operator_workspace_settings enable row level security;
alter table public.operator_outreach_events enable row level security;

drop policy if exists operator_workspace_settings_admin_all on public.operator_workspace_settings;
create policy operator_workspace_settings_admin_all
  on public.operator_workspace_settings for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists operator_outreach_events_admin_all on public.operator_outreach_events;
create policy operator_outreach_events_admin_all
  on public.operator_outreach_events for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.operator_workspace_settings from anon;
revoke all on public.operator_outreach_events from anon;
grant select,insert,update,delete on public.operator_workspace_settings to authenticated;
grant select,insert,update,delete on public.operator_outreach_events to authenticated;

insert into public.operator_workspace_settings (
  workspace_id,
  sender_name,
  sender_email,
  outbound_owner,
  closer_owner,
  default_market
)
select
  id,
  'Ryan Nichols',
  'hello@theleadflowpro.com',
  'Pat',
  'Ryan',
  'Longview, TX'
from public.operator_workspaces
where slug='the-leadflow-pro'
on conflict (workspace_id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='operator_workspace_settings'
  ) then
    alter publication supabase_realtime add table public.operator_workspace_settings;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='operator_outreach_events'
  ) then
    alter publication supabase_realtime add table public.operator_outreach_events;
  end if;
end $$;
