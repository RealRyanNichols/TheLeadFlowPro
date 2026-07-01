-- LeadFlow Pro civic issue signal engine.
-- Civic data stays separated from commercial lead selling. Public surfaces use
-- aggregate, public-source, consented, or manually reviewed data only.

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

-- Keep consent compatible with anonymous civic surveys.
alter table if exists leadflow.consent_ledger alter column partner_account_id drop not null;
alter table if exists leadflow.consent_ledger alter column identity_id drop not null;
alter table if exists leadflow.consent_ledger add column if not exists anonymous_session_id uuid references leadflow.anonymous_sessions(id) on delete set null;
alter table if exists leadflow.consent_ledger add column if not exists consent_type text;
alter table if exists leadflow.consent_ledger add column if not exists consent_scope text;
alter table if exists leadflow.consent_ledger add column if not exists disclosure_text text;
alter table if exists leadflow.consent_ledger add column if not exists seller_id uuid;
alter table if exists leadflow.consent_ledger add column if not exists accepted_at timestamptz;
alter table if exists leadflow.consent_ledger add column if not exists tool_slug text;
alter table if exists leadflow.consent_ledger add column if not exists capture_url text;

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

create table if not exists leadflow.civic_districts (
  id uuid primary key default gen_random_uuid(),
  geography text not null,
  district text not null,
  district_type text not null default 'local',
  state text,
  source_url text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint civic_districts_status_check check (status in ('active', 'review', 'archived')),
  constraint civic_districts_not_blank check (length(trim(geography)) > 0 and length(trim(district)) > 0)
);

comment on table leadflow.civic_districts is
  'Public district and geography reference records for aggregate civic issue dashboards.';

create table if not exists leadflow.civic_issues (
  id uuid primary key default gen_random_uuid(),
  issue_category text not null unique,
  label text not null,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint civic_issues_category_check check (
    issue_category in (
      'taxes',
      'roads',
      'schools',
      'crime',
      'courts',
      'police',
      'housing',
      'business',
      'property_rights',
      'healthcare',
      'local_government',
      'elections',
      'transparency',
      'corruption_concerns',
      'family_issues',
      'veteran_issues',
      'other'
    )
  ),
  constraint civic_issues_status_check check (status in ('active', 'review', 'archived'))
);

comment on table leadflow.civic_issues is
  'Approved issue categories for civic aggregate dashboards. These are topics, not individual persuasion labels.';

create table if not exists leadflow.civic_surveys (
  id uuid primary key default gen_random_uuid(),
  anonymous_session_id uuid references leadflow.anonymous_sessions(id) on delete set null,
  location text not null,
  district text,
  issue_priority text not null,
  concern_category text not null,
  urgency integer not null check (urgency between 1 and 5),
  personal_story text,
  contact_email text,
  contact_email_sha256 text,
  save_response_consent boolean not null default false,
  contact_consent boolean not null default false,
  public_display_consent boolean not null default false,
  share_with_civic_org_consent boolean not null default false,
  anonymous_allowed boolean not null default true,
  consent_version text not null,
  review_status text not null default 'pending',
  risk_level text not null default 'low',
  source_url text,
  source_path text,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint civic_surveys_category_check check (
    concern_category in (
      'taxes',
      'roads',
      'schools',
      'crime',
      'courts',
      'police',
      'housing',
      'business',
      'property_rights',
      'healthcare',
      'local_government',
      'elections',
      'transparency',
      'corruption_concerns',
      'family_issues',
      'veteran_issues',
      'other'
    )
  ),
  constraint civic_surveys_review_status_check check (review_status in ('pending', 'review', 'approved', 'rejected', 'suppressed', 'public_display_approved')),
  constraint civic_surveys_risk_level_check check (risk_level in ('low', 'medium', 'high', 'prohibited')),
  constraint civic_surveys_contact_requires_consent check (contact_email is null or contact_consent is true)
);

comment on table leadflow.civic_surveys is
  'Consented civic issue survey responses. Raw responses are private and never become individual political persuasion profiles.';
comment on column leadflow.civic_surveys.personal_story is
  'Optional story text. Public display requires explicit public_display_consent plus admin approval.';
comment on column leadflow.civic_surveys.contact_email is
  'Private opt-in email for issue updates only. Do not expose in analytics, public dashboards, or marketplace products.';

create table if not exists leadflow.civic_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  title text not null,
  source_url text,
  geography text,
  district text,
  issue_category text,
  source_summary text,
  status text not null default 'review',
  review_status text not null default 'pending',
  risk_level text not null default 'low',
  public_visible boolean not null default false,
  found_at timestamptz,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint civic_sources_type_check check (
    source_type in (
      'public_meeting_agenda',
      'public_comment',
      'government_page',
      'candidate_website',
      'campaign_finance_link',
      'public_survey_result',
      'public_civic_event',
      'voluntary_submission',
      'rep_profile_public_source'
    )
  ),
  constraint civic_sources_status_check check (status in ('submitted', 'review', 'approved', 'archived', 'rejected', 'suppressed')),
  constraint civic_sources_risk_level_check check (risk_level in ('low', 'medium', 'high', 'prohibited'))
);

comment on table leadflow.civic_sources is
  'Public-source civic monitoring records. Login-only, hacked, leaked, private-message, protected-trait, and individual persuasion data is prohibited.';

create table if not exists leadflow.civic_submissions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references leadflow.civic_surveys(id) on delete set null,
  submission_type text not null default 'issue_concern',
  title text not null,
  body text,
  location text,
  district text,
  issue_category text,
  source_url text,
  public_display_consent boolean not null default false,
  public_display_approved boolean not null default false,
  contact_consent boolean not null default false,
  share_with_civic_org_consent boolean not null default false,
  anonymous_allowed boolean not null default true,
  review_status text not null default 'pending',
  risk_level text not null default 'low',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint civic_submissions_type_check check (
    submission_type in (
      'issue_concern',
      'public_comment',
      'local_accountability',
      'public_source_tip',
      'candidate_page_check',
      'rep_profile_public_source'
    )
  ),
  constraint civic_submissions_review_status_check check (review_status in ('pending', 'review', 'approved', 'rejected', 'suppressed', 'public_display_approved')),
  constraint civic_submissions_risk_level_check check (risk_level in ('low', 'medium', 'high', 'prohibited'))
);

comment on table leadflow.civic_submissions is
  'Voluntary civic submissions and public comments. Public display requires explicit consent plus admin approval.';

create table if not exists leadflow.civic_aggregates (
  id uuid primary key default gen_random_uuid(),
  geography text not null,
  district text,
  issue_category text not null,
  response_count integer not null default 0 check (response_count >= 0),
  urgency_average numeric(4,2) not null default 0 check (urgency_average between 0 and 5),
  top_concerns text[] not null default '{}'::text[],
  source_type text not null,
  time_period text not null default 'rolling_30_days',
  public_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint civic_aggregates_time_period_not_blank check (length(trim(time_period)) > 0)
);

comment on table leadflow.civic_aggregates is
  'Aggregate civic issue counts for public dashboards. No private contact info or individual persuasion labels.';

create index if not exists civic_districts_geo_idx on leadflow.civic_districts(geography, district) where deleted_at is null;
create index if not exists civic_surveys_category_time_idx on leadflow.civic_surveys(concern_category, created_at desc) where deleted_at is null;
create index if not exists civic_surveys_review_risk_idx on leadflow.civic_surveys(review_status, risk_level, created_at desc) where deleted_at is null;
create index if not exists civic_surveys_location_idx on leadflow.civic_surveys(location, district, created_at desc) where deleted_at is null;
create index if not exists civic_surveys_contact_idx on leadflow.civic_surveys(contact_consent, created_at desc) where deleted_at is null;
create index if not exists civic_sources_status_idx on leadflow.civic_sources(status, review_status, public_visible, created_at desc) where deleted_at is null;
create index if not exists civic_submissions_public_idx on leadflow.civic_submissions(public_display_approved, review_status, created_at desc) where deleted_at is null;
create index if not exists civic_submissions_review_idx on leadflow.civic_submissions(review_status, risk_level, created_at desc) where deleted_at is null;
create index if not exists civic_aggregates_public_idx on leadflow.civic_aggregates(public_visible, geography, district, issue_category);
create index if not exists civic_aggregates_issue_idx on leadflow.civic_aggregates(issue_category, response_count desc, updated_at desc);

drop trigger if exists set_civic_districts_updated_at on leadflow.civic_districts;
create trigger set_civic_districts_updated_at before update on leadflow.civic_districts for each row execute function leadflow.set_updated_at();
drop trigger if exists set_civic_issues_updated_at on leadflow.civic_issues;
create trigger set_civic_issues_updated_at before update on leadflow.civic_issues for each row execute function leadflow.set_updated_at();
drop trigger if exists set_civic_surveys_updated_at on leadflow.civic_surveys;
create trigger set_civic_surveys_updated_at before update on leadflow.civic_surveys for each row execute function leadflow.set_updated_at();
drop trigger if exists set_civic_sources_updated_at on leadflow.civic_sources;
create trigger set_civic_sources_updated_at before update on leadflow.civic_sources for each row execute function leadflow.set_updated_at();
drop trigger if exists set_civic_submissions_updated_at on leadflow.civic_submissions;
create trigger set_civic_submissions_updated_at before update on leadflow.civic_submissions for each row execute function leadflow.set_updated_at();
drop trigger if exists set_civic_aggregates_updated_at on leadflow.civic_aggregates;
create trigger set_civic_aggregates_updated_at before update on leadflow.civic_aggregates for each row execute function leadflow.set_updated_at();

alter table leadflow.civic_districts enable row level security;
alter table leadflow.civic_issues enable row level security;
alter table leadflow.civic_surveys enable row level security;
alter table leadflow.civic_sources enable row level security;
alter table leadflow.civic_submissions enable row level security;
alter table leadflow.civic_aggregates enable row level security;

alter table leadflow.civic_districts force row level security;
alter table leadflow.civic_issues force row level security;
alter table leadflow.civic_surveys force row level security;
alter table leadflow.civic_sources force row level security;
alter table leadflow.civic_submissions force row level security;
alter table leadflow.civic_aggregates force row level security;

drop policy if exists public_select_active_civic_districts on leadflow.civic_districts;
create policy public_select_active_civic_districts on leadflow.civic_districts
  for select to anon, authenticated
  using (status = 'active' and deleted_at is null);

drop policy if exists public_select_active_civic_issues on leadflow.civic_issues;
create policy public_select_active_civic_issues on leadflow.civic_issues
  for select to anon, authenticated
  using (status = 'active');

drop policy if exists public_select_approved_civic_sources on leadflow.civic_sources;
create policy public_select_approved_civic_sources on leadflow.civic_sources
  for select to anon, authenticated
  using (public_visible is true and status = 'approved' and review_status in ('approved', 'public_display_approved') and deleted_at is null);

drop policy if exists public_select_approved_civic_submissions on leadflow.civic_submissions;
create policy public_select_approved_civic_submissions on leadflow.civic_submissions
  for select to anon, authenticated
  using (public_display_approved is true and review_status = 'public_display_approved' and deleted_at is null);

drop policy if exists public_select_civic_aggregates on leadflow.civic_aggregates;
create policy public_select_civic_aggregates on leadflow.civic_aggregates
  for select to anon, authenticated
  using (public_visible is true);

drop policy if exists admin_manage_civic_districts on leadflow.civic_districts;
create policy admin_manage_civic_districts on leadflow.civic_districts
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists admin_manage_civic_issues on leadflow.civic_issues;
create policy admin_manage_civic_issues on leadflow.civic_issues
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists admin_manage_civic_surveys on leadflow.civic_surveys;
create policy admin_manage_civic_surveys on leadflow.civic_surveys
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists admin_manage_civic_sources on leadflow.civic_sources;
create policy admin_manage_civic_sources on leadflow.civic_sources
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists admin_manage_civic_submissions on leadflow.civic_submissions;
create policy admin_manage_civic_submissions on leadflow.civic_submissions
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists admin_manage_civic_aggregates on leadflow.civic_aggregates;
create policy admin_manage_civic_aggregates on leadflow.civic_aggregates
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());

grant usage on schema leadflow to anon, authenticated, service_role;
grant select on leadflow.civic_districts to anon, authenticated;
grant select on leadflow.civic_issues to anon, authenticated;
grant select on leadflow.civic_sources to anon, authenticated;
grant select on leadflow.civic_submissions to anon, authenticated;
grant select on leadflow.civic_aggregates to anon, authenticated;
grant all on leadflow.civic_districts to service_role;
grant all on leadflow.civic_issues to service_role;
grant all on leadflow.civic_surveys to service_role;
grant all on leadflow.civic_sources to service_role;
grant all on leadflow.civic_submissions to service_role;
grant all on leadflow.civic_aggregates to service_role;

insert into leadflow.civic_issues (issue_category, label, description)
values
  ('taxes', 'Taxes', 'Tax burden, assessments, fees, and local spending questions.'),
  ('roads', 'Roads', 'Road repair, traffic, bridges, drainage, and infrastructure.'),
  ('schools', 'Schools', 'School quality, board decisions, safety, curriculum, and funding concerns.'),
  ('crime', 'Crime', 'Public safety, prosecution, local incidents, and community concern.'),
  ('courts', 'Courts', 'Court access, due process, transparency, and case-system concerns.'),
  ('police', 'Police', 'Policing, accountability, staffing, safety, and public trust.'),
  ('housing', 'Housing', 'Housing costs, rentals, development, zoning, and homelessness.'),
  ('business', 'Business', 'Small business rules, permits, taxes, and local economic pressure.'),
  ('property_rights', 'Property rights', 'Land use, code enforcement, takings, and ownership concerns.'),
  ('healthcare', 'Healthcare', 'Public healthcare access and local service availability.'),
  ('local_government', 'Local government', 'City, county, board, agency, and public process concerns.'),
  ('elections', 'Elections', 'Election administration, candidate pages, ballot information, and public trust.'),
  ('transparency', 'Transparency', 'Open records, meeting access, budgets, and public accountability.'),
  ('corruption_concerns', 'Corruption concerns', 'Reported misuse, conflicts, favoritism, or public-integrity concerns.'),
  ('family_issues', 'Family issues', 'Community concern around family courts, parents, children, and local systems.'),
  ('veteran_issues', 'Veteran issues', 'Veteran services, benefits navigation, local support, and accountability.'),
  ('other', 'Other', 'Public civic concerns that need review and classification.')
on conflict (issue_category) do update
set label = excluded.label,
    description = excluded.description,
    updated_at = now();

insert into leadflow.civic_districts (geography, district, district_type, state, source_url, status)
values
  ('Longview, Texas', 'Longview City Council', 'city', 'TX', 'https://www.longviewtexas.gov/', 'active'),
  ('Gregg County, Texas', 'Gregg County', 'county', 'TX', 'https://www.co.gregg.tx.us/', 'active'),
  ('East Texas', 'Regional civic watch', 'region', 'TX', null, 'active')
on conflict do nothing;

insert into leadflow.civic_aggregates (geography, district, issue_category, response_count, urgency_average, top_concerns, source_type, time_period, public_visible)
values
  ('Longview, Texas', 'Longview City Council', 'roads', 18, 4.10, '{"potholes","drainage","traffic timing"}'::text[], 'seeded_public_demo', 'rolling_30_days', true),
  ('Gregg County, Texas', 'Gregg County', 'transparency', 11, 4.40, '{"open records","meeting visibility","budget clarity"}'::text[], 'seeded_public_demo', 'rolling_30_days', true),
  ('East Texas', 'Regional civic watch', 'veteran_issues', 9, 3.80, '{"benefit navigation","transportation","local support"}'::text[], 'seeded_public_demo', 'rolling_30_days', true),
  ('East Texas', 'Regional civic watch', 'local_government', 14, 3.90, '{"agenda access","public comments","agency follow-up"}'::text[], 'seeded_public_demo', 'rolling_30_days', true)
on conflict do nothing;

insert into leadflow.civic_sources (source_type, title, source_url, geography, district, issue_category, source_summary, status, review_status, risk_level, public_visible, found_at, verified_at)
values
  ('government_page', 'Longview public meeting and agenda pages', 'https://www.longviewtexas.gov/', 'Longview, Texas', 'Longview City Council', 'local_government', 'Public government pages can be monitored for meeting, agenda, and public comment signals.', 'approved', 'approved', 'low', true, now(), now()),
  ('government_page', 'Gregg County public information pages', 'https://www.co.gregg.tx.us/', 'Gregg County, Texas', 'Gregg County', 'transparency', 'Public county pages can support aggregate transparency and records-access monitoring.', 'approved', 'approved', 'low', true, now(), now())
on conflict do nothing;
