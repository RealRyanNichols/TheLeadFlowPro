-- LeadFlow Pro source submission intake.
-- Structured public source submission records, upload metadata, review actions,
-- admin conversions, and review-gated source proof linkage.

create schema if not exists leadflow;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists leadflow.contributor_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company_name text,
  website_url text,
  payout_interest boolean not null default false,
  partnership_interest boolean not null default false,
  consent_version text not null default 'source-submission-v1',
  source_path text,
  status text not null default 'active' check (status in ('active', 'blocked', 'suppressed', 'archived')),
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table leadflow.contributor_accounts is
  'Private contributor contact table for people submitting source opportunities. Not buyer-visible.';

create table if not exists leadflow.submitted_sources (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid references leadflow.contributor_accounts(id) on delete set null,
  source_type text not null,
  source_name text not null,
  source_url text,
  source_url_submitted text,
  description text not null,
  vertical text not null,
  categories text[] not null default '{}',
  geography text,
  buyer_type text,
  best_use_case text,
  data_fields_present text[] not null default '{}',
  origin_type text not null,
  origin_notes text,
  permission_claim jsonb not null default '{}',
  resale_claim text not null default 'unknown' check (resale_claim in ('yes', 'no', 'unknown', 'research_only')),
  outreach_claim text not null default 'unknown' check (outreach_claim in ('yes', 'no', 'unknown', 'research_only')),
  sensitive_data_flag boolean not null default false,
  minors_flag boolean not null default false,
  restrictions text,
  review_status text not null default 'submitted'
    check (review_status in (
      'submitted',
      'needs_review',
      'approved_for_research',
      'approved_for_marketplace',
      'rejected',
      'suppressed',
      'needs_permission',
      'duplicate',
      'archived'
    )),
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'prohibited')),
  risk_flags text[] not null default '{}',
  source_hash text,
  source_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  consent_version text not null default 'source-submission-v1',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.submitted_sources is
  'Review-gated source opportunity records. Public submissions become structured source records before any marketplace use.';

create table if not exists leadflow.source_uploads (
  id uuid primary key default gen_random_uuid(),
  submitted_source_id uuid not null references leadflow.submitted_sources(id) on delete cascade,
  upload_type text not null default 'pasted_sample' check (upload_type in ('file_sample', 'pasted_sample', 'url_list', 'notes')),
  file_name text,
  mime_type text,
  file_size_bytes integer check (file_size_bytes is null or file_size_bytes >= 0),
  storage_status text not null default 'metadata_only'
    check (storage_status in ('metadata_only', 'metadata_only_blocked', 'stored_private', 'rejected', 'deleted')),
  storage_path text,
  sample_text text,
  url_list text[] not null default '{}',
  notes text,
  blocked_reason text,
  created_by_contributor_id uuid references leadflow.contributor_accounts(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.source_uploads is
  'Private sample upload metadata and limited text previews. Prohibited or restricted samples stay metadata-only until admin review.';

create table if not exists leadflow.source_reviews (
  id uuid primary key default gen_random_uuid(),
  submitted_source_id uuid not null references leadflow.submitted_sources(id) on delete cascade,
  action text not null,
  from_status text,
  to_status text,
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'prohibited')),
  reviewer_type text not null default 'system' check (reviewer_type in ('system', 'admin', 'contributor')),
  reviewer_email text,
  notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table leadflow.source_reviews is
  'Append-only source review actions for approvals, rejections, permission requests, duplicates, conversions, and prohibited marks.';

alter table if exists leadflow.source_proofs add column if not exists submitted_source_id uuid references leadflow.submitted_sources(id) on delete set null;
alter table if exists leadflow.source_proofs alter column lead_profile_id drop not null;
alter table if exists leadflow.source_proofs add column if not exists buyer_visible boolean not null default false;
alter table if exists leadflow.source_proofs add column if not exists admin_notes text;
alter table if exists leadflow.source_proofs add column if not exists admin_notes_visible boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'source_proofs_profile_or_submission_check'
      and conrelid = 'leadflow.source_proofs'::regclass
  ) then
    alter table leadflow.source_proofs
      add constraint source_proofs_profile_or_submission_check
      check (lead_profile_id is not null or submitted_source_id is not null) not valid;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists contributor_accounts_email_idx on leadflow.contributor_accounts(lower(email), created_at desc);
create index if not exists contributor_accounts_status_idx on leadflow.contributor_accounts(status, created_at desc);

create index if not exists submitted_sources_review_idx
  on leadflow.submitted_sources(review_status, risk_level, created_at desc)
  where deleted_at is null;
create index if not exists submitted_sources_vertical_idx
  on leadflow.submitted_sources(vertical, source_type, origin_type, created_at desc)
  where deleted_at is null;
create index if not exists submitted_sources_hash_idx
  on leadflow.submitted_sources(source_hash)
  where source_hash is not null and deleted_at is null;
create index if not exists submitted_sources_flags_gin_idx
  on leadflow.submitted_sources using gin(risk_flags);
create index if not exists submitted_sources_categories_gin_idx
  on leadflow.submitted_sources using gin(categories);
create index if not exists submitted_sources_fields_gin_idx
  on leadflow.submitted_sources using gin(data_fields_present);

create index if not exists source_uploads_source_idx
  on leadflow.source_uploads(submitted_source_id, created_at desc)
  where deleted_at is null;
create index if not exists source_reviews_source_idx
  on leadflow.source_reviews(submitted_source_id, created_at desc);
create index if not exists source_reviews_action_idx
  on leadflow.source_reviews(action, created_at desc);
create index if not exists source_proofs_submitted_source_idx
  on leadflow.source_proofs(submitted_source_id, status, review_status, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS and policies
-- ---------------------------------------------------------------------------

alter table leadflow.contributor_accounts enable row level security;
alter table leadflow.submitted_sources enable row level security;
alter table leadflow.source_uploads enable row level security;
alter table leadflow.source_reviews enable row level security;

alter table leadflow.contributor_accounts force row level security;
alter table leadflow.submitted_sources force row level security;
alter table leadflow.source_uploads force row level security;
alter table leadflow.source_reviews force row level security;

drop policy if exists lead_signal_admin_all_contributor_accounts on leadflow.contributor_accounts;
create policy lead_signal_admin_all_contributor_accounts on leadflow.contributor_accounts
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_submitted_sources on leadflow.submitted_sources;
create policy lead_signal_admin_all_submitted_sources on leadflow.submitted_sources
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_source_uploads on leadflow.source_uploads;
create policy lead_signal_admin_all_source_uploads on leadflow.source_uploads
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_source_reviews on leadflow.source_reviews;
create policy lead_signal_admin_all_source_reviews on leadflow.source_reviews
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

-- No anon policies are created for source submissions. The public page writes
-- through the server route, which uses the service role and records audit rows.

grant usage on schema leadflow to anon, authenticated, service_role;

grant select, insert, update on leadflow.contributor_accounts to authenticated;
grant select, insert, update on leadflow.submitted_sources to authenticated;
grant select, insert, update on leadflow.source_uploads to authenticated;
grant select, insert on leadflow.source_reviews to authenticated;

grant all on leadflow.contributor_accounts to service_role;
grant all on leadflow.submitted_sources to service_role;
grant all on leadflow.source_uploads to service_role;
grant all on leadflow.source_reviews to service_role;
grant select, insert, update on leadflow.source_proofs to service_role;
grant select, insert, update on leadflow.marketplace_listings to service_role;
grant select, insert, update on leadflow.lead_profiles to service_role;
grant select, insert on leadflow.audit_log to service_role;
grant select, insert on leadflow.events to service_role;

-- ---------------------------------------------------------------------------
-- Triggers and audit
-- ---------------------------------------------------------------------------

drop trigger if exists set_contributor_accounts_updated_at on leadflow.contributor_accounts;
create trigger set_contributor_accounts_updated_at
  before update on leadflow.contributor_accounts
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_submitted_sources_updated_at on leadflow.submitted_sources;
create trigger set_submitted_sources_updated_at
  before update on leadflow.submitted_sources
  for each row execute function leadflow.set_updated_at();

create or replace function leadflow.audit_source_submission_review()
returns trigger
language plpgsql
security definer
set search_path = leadflow, public
as $$
begin
  if tg_op = 'UPDATE'
    and (
      old.review_status is distinct from new.review_status
      or old.risk_level is distinct from new.risk_level
    ) then
    insert into leadflow.audit_log (
      actor_type,
      action,
      object_schema,
      object_table,
      object_id,
      before_redacted,
      after_redacted,
      details,
      occurred_at
    ) values (
      'system',
      'source_submission.review_status_changed',
      tg_table_schema,
      tg_table_name,
      new.id,
      jsonb_build_object('review_status', old.review_status, 'risk_level', old.risk_level),
      jsonb_build_object('review_status', new.review_status, 'risk_level', new.risk_level),
      jsonb_build_object('source_type', new.source_type, 'vertical', new.vertical),
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists audit_submitted_source_review_status on leadflow.submitted_sources;
create trigger audit_submitted_source_review_status
  after update on leadflow.submitted_sources
  for each row execute function leadflow.audit_source_submission_review();

-- ---------------------------------------------------------------------------
-- Test submissions
-- ---------------------------------------------------------------------------

with contributor as (
  insert into leadflow.contributor_accounts (
    name,
    email,
    company_name,
    payout_interest,
    partnership_interest,
    consent_version,
    source_path,
    metadata
  )
  values (
    'LeadFlow Test Contributor',
    'source-review-test@theleadflowpro.com',
    'LeadFlow Review Desk',
    true,
    true,
    'source-submission-v1',
    '/submit-source',
    '{"seed": true}'::jsonb
  )
  returning id
),
local_route as (
  insert into leadflow.submitted_sources (
    contributor_id,
    source_type,
    source_name,
    source_url,
    description,
    vertical,
    categories,
    geography,
    buyer_type,
    best_use_case,
    data_fields_present,
    origin_type,
    permission_claim,
    resale_claim,
    outreach_claim,
    sensitive_data_flag,
    minors_flag,
    review_status,
    risk_level,
    risk_flags,
    source_hash,
    source_path,
    consent_version,
    metadata
  )
  select
    id,
    'local_service_route',
    'East Texas HVAC Public Directory Route',
    'https://example.com/public-hvac-directory',
    'Public directory route for local HVAC businesses with websites, business names, and visible service areas.',
    'Home services',
    array['Public directory', 'Local route', 'Service need'],
    'East Texas',
    'Local service agencies',
    'Build a reviewed sample of contractors with website and follow-up gaps.',
    array['business_names', 'websites', 'location'],
    'public_website',
    '{"ownsData": false, "publiclyAvailable": true, "permissionToShare": true, "canBeResold": false, "canBeUsedForOutreach": false, "researchOnly": true}'::jsonb,
    'research_only',
    'research_only',
    false,
    false,
    'submitted',
    'low',
    '{}',
    encode(digest('east-texas-hvac-public-directory-route', 'sha256'), 'hex'),
    '/submit-source',
    'source-submission-v1',
    '{"seed": true}'::jsonb
  from contributor
  returning id
)
insert into leadflow.source_uploads (
  submitted_source_id,
  upload_type,
  storage_status,
  sample_text,
  url_list,
  notes,
  metadata
)
select
  id,
  'pasted_sample',
  'metadata_only',
  'Sample: business name, website, city, service category.',
  array['https://example.com/public-hvac-directory'],
  'Seeded safe public-directory sample.',
  '{"seed": true}'::jsonb
from local_route;

insert into leadflow.source_reviews (
  submitted_source_id,
  action,
  to_status,
  risk_level,
  reviewer_type,
  notes,
  metadata
)
select
  id,
  'submitted',
  review_status,
  risk_level,
  'system',
  'Seeded source submission for dashboard review testing.',
  '{"seed": true}'::jsonb
from leadflow.submitted_sources
where source_name = 'East Texas HVAC Public Directory Route'
  and metadata ->> 'seed' = 'true'
order by created_at desc
limit 1;
