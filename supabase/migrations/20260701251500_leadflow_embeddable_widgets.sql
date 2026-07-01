-- LeadFlow Pro embeddable widgets.
-- Public embeds collect first-party signal responses through server-side
-- endpoints. Tables stay RLS-controlled and service-role mediated.

create schema if not exists leadflow;
create extension if not exists pgcrypto;

create or replace function leadflow.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Make the older consent ledger compatible with anonymous widget consent.
alter table if exists leadflow.consent_ledger alter column partner_account_id drop not null;
alter table if exists leadflow.consent_ledger alter column identity_id drop not null;
alter table if exists leadflow.consent_ledger add column if not exists anonymous_session_id uuid references leadflow.anonymous_sessions(id) on delete set null;
alter table if exists leadflow.consent_ledger add column if not exists consent_type text;
alter table if exists leadflow.consent_ledger add column if not exists seller_id uuid;
alter table if exists leadflow.consent_ledger add column if not exists accepted_at timestamptz;
alter table if exists leadflow.consent_ledger add column if not exists tool_slug text;
alter table if exists leadflow.consent_ledger add column if not exists capture_url text;

alter table if exists leadflow.answers add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'leadflow.consent_ledger'::regclass
      and conname = 'consent_ledger_identity_or_anonymous_chk'
  ) then
    alter table leadflow.consent_ledger
      add constraint consent_ledger_identity_or_anonymous_chk
      check (identity_id is not null or anonymous_session_id is not null or response_id is not null);
  end if;
end $$;

create table if not exists leadflow.widgets (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid,
  widget_type text not null,
  name text not null,
  slug text not null unique,
  status text not null default 'draft',
  allowed_domains text[] not null default '{}'::text[],
  theme jsonb not null default '{}'::jsonb,
  questionnaire_id uuid references leadflow.questionnaires(id) on delete set null,
  redirect_url text,
  completion_message text not null default 'Your signal score is ready.',
  consent_required boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint widgets_widget_type_check check (
    widget_type in (
      'lead_leak_audit',
      'website_money_leak_checker',
      'ai_automation_readiness',
      'lead_type_finder',
      'local_demand_finder',
      'ecommerce_growth_finder',
      'mortgage_lead_readiness',
      'buyer_personality_signal',
      'contact_router',
      'custom_questionnaire'
    )
  ),
  constraint widgets_status_check check (status in ('draft', 'active', 'paused', 'archived', 'deleted')),
  constraint widgets_name_not_blank check (length(trim(name)) > 0),
  constraint widgets_slug_safe check (slug ~ '^[a-z0-9][a-z0-9-]{1,88}[a-z0-9]$')
);

comment on table leadflow.widgets is
  'Embeddable LeadFlow questionnaire widgets. Public scripts load active widgets, but submissions are validated and saved server-side.';
comment on column leadflow.widgets.allowed_domains is
  'Domain allowlist. Empty or {*} means public. Exact domains and .example.com suffixes are supported by API validation.';
comment on column leadflow.widgets.theme is
  'Safe visual theme tokens for iframe rendering. No arbitrary script or HTML is allowed.';
comment on column leadflow.widgets.settings is
  'Redacted widget builder settings. Do not store private keys, raw answers, or destination secrets here.';

create table if not exists leadflow.widget_domains (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references leadflow.widgets(id) on delete cascade,
  domain text not null,
  status text not null default 'allowed',
  created_at timestamptz not null default now(),
  constraint widget_domains_status_check check (status in ('allowed', 'blocked', 'pending_review')),
  constraint widget_domains_domain_not_blank check (length(trim(domain)) > 0),
  unique (widget_id, domain)
);

comment on table leadflow.widget_domains is
  'Optional normalized per-widget domain allowlist and blocklist rows.';

create table if not exists leadflow.widget_submissions (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references leadflow.widgets(id) on delete cascade,
  domain text,
  response_id uuid references leadflow.responses(id) on delete set null,
  anonymous_session_id uuid references leadflow.anonymous_sessions(id) on delete set null,
  identity_id uuid references leadflow.identities(id) on delete set null,
  score numeric(6,2) check (score is null or (score >= 0 and score <= 100)),
  tags text[] not null default '{}'::text[],
  source_url text,
  page_url text,
  consent_version text,
  created_at timestamptz not null default now()
);

comment on table leadflow.widget_submissions is
  'Completed widget submissions linked to private responses and anonymous sessions. Raw answers live in leadflow.answers.';

create table if not exists leadflow.widget_events (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references leadflow.widgets(id) on delete cascade,
  event_name text not null,
  domain text,
  page_url text,
  anonymous_session_id uuid references leadflow.anonymous_sessions(id) on delete set null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint widget_events_name_check check (
    event_name in (
      'widget_loaded',
      'widget_started',
      'widget_step_completed',
      'widget_completed',
      'widget_result_viewed',
      'widget_contact_submitted'
    )
  )
);

comment on table leadflow.widget_events is
  'Privacy-safe widget analytics by widget, domain, page, event, and anonymous session. Never store raw answers or contact data here.';

create index if not exists widgets_status_type_idx
  on leadflow.widgets(status, widget_type, updated_at desc)
  where deleted_at is null;
create index if not exists widgets_slug_idx
  on leadflow.widgets(slug)
  where deleted_at is null;
create index if not exists widgets_allowed_domains_gin_idx
  on leadflow.widgets using gin(allowed_domains);
create index if not exists widget_domains_widget_domain_idx
  on leadflow.widget_domains(widget_id, domain, status);
create index if not exists widget_submissions_widget_time_idx
  on leadflow.widget_submissions(widget_id, created_at desc);
create index if not exists widget_submissions_domain_time_idx
  on leadflow.widget_submissions(domain, created_at desc);
create index if not exists widget_submissions_score_idx
  on leadflow.widget_submissions(score, created_at desc);
create index if not exists widget_submissions_tags_gin_idx
  on leadflow.widget_submissions using gin(tags);
create index if not exists widget_events_widget_event_time_idx
  on leadflow.widget_events(widget_id, event_name, created_at desc);
create index if not exists widget_events_domain_time_idx
  on leadflow.widget_events(domain, created_at desc);
create index if not exists consent_ledger_anonymous_session_idx
  on leadflow.consent_ledger(anonymous_session_id, created_at desc)
  where anonymous_session_id is not null;

drop trigger if exists set_widgets_updated_at on leadflow.widgets;
create trigger set_widgets_updated_at
  before update on leadflow.widgets
  for each row execute function leadflow.set_updated_at();

alter table leadflow.widgets enable row level security;
alter table leadflow.widget_domains enable row level security;
alter table leadflow.widget_submissions enable row level security;
alter table leadflow.widget_events enable row level security;

alter table leadflow.widgets force row level security;
alter table leadflow.widget_domains force row level security;
alter table leadflow.widget_submissions force row level security;
alter table leadflow.widget_events force row level security;

drop policy if exists admin_manage_widgets on leadflow.widgets;
create policy admin_manage_widgets on leadflow.widgets
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists owner_select_widgets on leadflow.widgets;
create policy owner_select_widgets on leadflow.widgets
  for select to authenticated
  using (
    owner_account_id is not null
    and owner_account_id = any(leadflow.current_buyer_account_ids())
    and deleted_at is null
  );

drop policy if exists admin_manage_widget_domains on leadflow.widget_domains;
create policy admin_manage_widget_domains on leadflow.widget_domains
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists owner_select_widget_domains on leadflow.widget_domains;
create policy owner_select_widget_domains on leadflow.widget_domains
  for select to authenticated
  using (
    exists (
      select 1
      from leadflow.widgets w
      where w.id = widget_domains.widget_id
        and w.deleted_at is null
        and w.owner_account_id = any(leadflow.current_buyer_account_ids())
    )
  );

drop policy if exists admin_select_widget_submissions on leadflow.widget_submissions;
create policy admin_select_widget_submissions on leadflow.widget_submissions
  for select to authenticated
  using (leadflow.is_platform_admin());

drop policy if exists owner_select_widget_submissions on leadflow.widget_submissions;
create policy owner_select_widget_submissions on leadflow.widget_submissions
  for select to authenticated
  using (
    exists (
      select 1
      from leadflow.widgets w
      where w.id = widget_submissions.widget_id
        and w.deleted_at is null
        and w.owner_account_id = any(leadflow.current_buyer_account_ids())
    )
  );

drop policy if exists admin_select_widget_events on leadflow.widget_events;
create policy admin_select_widget_events on leadflow.widget_events
  for select to authenticated
  using (leadflow.is_platform_admin());

drop policy if exists owner_select_widget_events on leadflow.widget_events;
create policy owner_select_widget_events on leadflow.widget_events
  for select to authenticated
  using (
    exists (
      select 1
      from leadflow.widgets w
      where w.id = widget_events.widget_id
        and w.deleted_at is null
        and w.owner_account_id = any(leadflow.current_buyer_account_ids())
    )
  );

grant usage on schema leadflow to anon, authenticated, service_role;
grant select on leadflow.widgets to authenticated;
grant select on leadflow.widget_domains to authenticated;
grant select on leadflow.widget_submissions to authenticated;
grant select on leadflow.widget_events to authenticated;
grant all on leadflow.widgets to service_role;
grant all on leadflow.widget_domains to service_role;
grant all on leadflow.widget_submissions to service_role;
grant all on leadflow.widget_events to service_role;

insert into leadflow.widgets (
  widget_type,
  name,
  slug,
  status,
  allowed_domains,
  completion_message,
  consent_required,
  settings
)
values
  (
    'lead_leak_audit',
    'Lead Leak Audit',
    'lead-leak-audit',
    'active',
    '{*}'::text[],
    'Your lead leak score is ready. Fix the weakest follow-up path first.',
    true,
    '{"seeded": true, "consent_version": "leadflow-widget-consent-v1"}'::jsonb
  ),
  (
    'website_money_leak_checker',
    'Website Money Leak Checker',
    'website-money-leak-checker',
    'active',
    '{*}'::text[],
    'Your website leak score is ready. Start with the clearest next step.',
    true,
    '{"seeded": true, "consent_version": "leadflow-widget-consent-v1"}'::jsonb
  ),
  (
    'ai_automation_readiness',
    'AI Automation Readiness Score',
    'ai-automation-readiness',
    'active',
    '{*}'::text[],
    'Your automation readiness score is ready. Build the first repeatable task.',
    true,
    '{"seeded": true, "consent_version": "leadflow-widget-consent-v1"}'::jsonb
  )
on conflict (slug) do update
set widget_type = excluded.widget_type,
    name = excluded.name,
    status = excluded.status,
    completion_message = excluded.completion_message,
    settings = leadflow.widgets.settings || excluded.settings,
    updated_at = now();
