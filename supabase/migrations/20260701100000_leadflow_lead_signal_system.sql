-- Lead Flow Pro lead signal system.
-- Additive canonical schema for first-party questionnaire intake, source-backed
-- lead profiles, buyer entitlements, marketplace requests, and anonymous events.

create schema if not exists leadflow;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function leadflow.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function leadflow.is_platform_admin()
returns boolean
language sql
stable
security invoker
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'leadflow_role', '') in ('platform_admin', 'super_admin', 'admin')
    or coalesce((auth.jwt() -> 'app_metadata' -> 'leadflow_roles') ? 'platform_admin', false)
    or coalesce((auth.jwt() -> 'app_metadata' -> 'leadflow_roles') ? 'super_admin', false)
    or coalesce((auth.jwt() -> 'app_metadata' -> 'leadflow_roles') ? 'admin', false);
$$;

comment on function leadflow.is_platform_admin() is
  'Platform-admin check based only on Supabase JWT app_metadata, never user-editable metadata.';

-- ---------------------------------------------------------------------------
-- Requested tables
-- ---------------------------------------------------------------------------

create table if not exists leadflow.identities (
  id uuid primary key default gen_random_uuid(),
  anonymous_user_id text,
  external_user_id text,
  email_sha256 text,
  phone_sha256 text,
  lifecycle_stage text not null default 'anonymous',
  status text not null default 'active',
  review_status text not null default 'pending',
  source_url text,
  source_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  consent_version text,
  metadata jsonb not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hard_deleted_at timestamptz
);

comment on table leadflow.identities is
  'Private identity stitching table. Buyers should never receive raw identity records directly.';

create table if not exists leadflow.anonymous_sessions (
  id uuid primary key default gen_random_uuid(),
  anonymous_user_id text not null unique,
  source_url text,
  source_path text,
  referrer_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_page text,
  user_agent_hash text,
  ip_hash text,
  metadata jsonb not null default '{}',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table leadflow.anonymous_sessions is
  'Public insert-only session envelope for anonymous quiz and analytics activity. No names, emails, or phone numbers.';

create table if not exists leadflow.buyer_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  team_user_ids uuid[] not null default '{}',
  name text not null,
  company_name text,
  website_url text,
  verticals text[] not null default '{}',
  buyer_types text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'active', 'approved', 'paused', 'suspended', 'closed')),
  review_status text not null default 'pending' check (review_status in ('pending', 'review', 'approved', 'rejected', 'suppressed')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.buyer_accounts is
  'Authenticated buyer organizations that can request samples, purchase access, and receive entitlement-gated lead profiles.';

create table if not exists leadflow.questionnaires (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  description text,
  vertical text not null default 'general',
  category text,
  status text not null default 'draft',
  review_status text not null default 'pending',
  default_consent_version text,
  source_url text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.questionnaires is
  'Questionnaire definitions for public tools, buyer qualification, and consented first-party signal collection.';

create table if not exists leadflow.questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references leadflow.questionnaires(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  consent_version text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired', 'archived')),
  review_status text not null default 'pending' check (review_status in ('pending', 'review', 'approved', 'rejected')),
  question_schema jsonb not null default '{}',
  disclosure_snapshot jsonb not null default '{}',
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (questionnaire_id, version_number)
);

comment on table leadflow.questionnaire_versions is
  'Versioned question and disclosure snapshots proving what the user saw at collection time.';

create table if not exists leadflow.questions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references leadflow.questionnaire_versions(id) on delete cascade,
  question_key text not null,
  question_type text not null,
  label text not null,
  help_text text,
  options jsonb not null default '[]',
  tags text[] not null default '{}',
  score_weight numeric(8,4) not null default 0,
  required boolean not null default false,
  display_order integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive', 'retired')),
  review_status text not null default 'pending' check (review_status in ('pending', 'review', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (questionnaire_version_id, question_key)
);

comment on table leadflow.questions is
  'Atomic questionnaire questions with tags and scoring hints. Avoid protected-trait or sensitive-data questions in the general product.';

create table if not exists leadflow.responses (
  id uuid primary key default gen_random_uuid(),
  anonymous_session_id uuid references leadflow.anonymous_sessions(id) on delete set null,
  identity_id uuid references leadflow.identities(id) on delete set null,
  questionnaire_id uuid references leadflow.questionnaires(id) on delete set null,
  questionnaire_version_id uuid references leadflow.questionnaire_versions(id) on delete set null,
  tool_slug text,
  vertical text not null default 'general',
  category text,
  status text not null default 'started' check (status in ('started', 'partial', 'completed', 'abandoned', 'voided')),
  review_status text not null default 'pending' check (review_status in ('pending', 'review', 'approved', 'rejected', 'suppressed')),
  consent_status text not null default 'not_requested' check (consent_status in ('not_requested', 'viewed', 'accepted', 'declined', 'revoked')),
  consent_version text,
  suppression_status text not null default 'unchecked' check (suppression_status in ('unchecked', 'clear', 'suppressed', 'do_not_contact', 'delete_requested')),
  tags text[] not null default '{}',
  score numeric(6,2) check (score is null or (score >= 0 and score <= 100)),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  recommended_next_action text,
  source_url text,
  source_path text,
  referrer_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  metadata jsonb not null default '{}',
  export_ready_profile jsonb not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.responses is
  'Questionnaire response envelope. Public clients may insert minimal response records, but raw answers stay private.';

create table if not exists leadflow.answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references leadflow.responses(id) on delete cascade,
  question_id uuid references leadflow.questions(id) on delete set null,
  question_key text not null,
  raw_answer jsonb not null,
  normalized_answer jsonb not null default '{}',
  answer_text text,
  answer_sha256 text,
  answer_tags text[] not null default '{}',
  approved_for_buyer boolean not null default false,
  review_status text not null default 'pending',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.answers is
  'Private raw and normalized answer data. Buyer reads require explicit answer approval plus an active raw-answer entitlement.';

create table if not exists leadflow.consent_ledger (
  id uuid primary key default gen_random_uuid(),
  response_id uuid references leadflow.responses(id) on delete set null,
  identity_id uuid references leadflow.identities(id) on delete set null,
  buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null,
  consent_scope text not null,
  consent_status text not null default 'accepted',
  consent_version text not null,
  disclosure_text text,
  source_url text,
  source_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb not null default '{}',
  accepted_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table leadflow.consent_ledger is
  'Private ledger proving what permission was requested, shown, accepted, declined, or revoked.';

create table if not exists leadflow.lead_profiles (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid references leadflow.identities(id) on delete set null,
  anonymous_session_id uuid references leadflow.anonymous_sessions(id) on delete set null,
  response_id uuid references leadflow.responses(id) on delete set null,
  title text not null,
  vertical text not null default 'general',
  category text,
  buyer_use_case text,
  tags text[] not null default '{}',
  score numeric(6,2) check (score is null or (score >= 0 and score <= 100)),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  consent_status text not null default 'unverified',
  suppression_status text not null default 'unchecked',
  source_proof_status text not null default 'missing',
  status text not null default 'draft' check (status in ('draft', 'sample_available', 'available', 'sold', 'suppressed', 'archived')),
  review_status text not null default 'pending' check (review_status in ('pending', 'review', 'approved', 'rejected', 'suppressed')),
  source_url text,
  source_path text,
  consent_version text,
  buyer_visible_summary jsonb not null default '{}',
  private_profile jsonb not null default '{}',
  approved_at timestamptz,
  approved_by_user_id uuid,
  last_scored_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.lead_profiles is
  'Review-gated lead signal profile assembled from consented responses, source proof, scores, tags, and suppression state.';

create table if not exists leadflow.lead_scores (
  id uuid primary key default gen_random_uuid(),
  lead_profile_id uuid not null references leadflow.lead_profiles(id) on delete cascade,
  score_type text not null,
  score numeric(6,2) not null check (score >= 0 and score <= 100),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  model_version text not null,
  feature_summary jsonb not null default '{}',
  explanation jsonb not null default '{}',
  status text not null default 'active',
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

comment on table leadflow.lead_scores is
  'Explainable score outputs for lead quality, urgency, partner fit, and confidence. No protected-trait features.';

create table if not exists leadflow.source_proofs (
  id uuid primary key default gen_random_uuid(),
  lead_profile_id uuid not null references leadflow.lead_profiles(id) on delete cascade,
  proof_type text not null,
  source_url text,
  source_label text,
  proof_payload jsonb not null default '{}',
  proof_hash text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  status text not null default 'submitted' check (status in ('submitted', 'review', 'approved', 'rejected', 'expired')),
  review_status text not null default 'pending' check (review_status in ('pending', 'review', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table leadflow.source_proofs is
  'Source proof rows that explain why a lead signal exists without exposing hacked, leaked, or private data.';

create table if not exists leadflow.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null,
  title text not null,
  vertical text not null default 'general',
  category text,
  buyer_type text,
  source_type text,
  location_label text,
  listing_status text not null default 'draft' check (listing_status in ('draft', 'sample_available', 'available', 'paused', 'sold', 'suppressed', 'archived')),
  review_status text not null default 'pending' check (review_status in ('pending', 'review', 'approved', 'rejected', 'suppressed')),
  release_mode text not null default 'review_gated' check (release_mode in ('sample_only', 'review_gated', 'exclusive', 'named_multi_seller', 'aggregated_only')),
  score numeric(6,2) check (score is null or (score >= 0 and score <= 100)),
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  sample_count integer not null default 0 check (sample_count >= 0),
  price_cents integer check (price_cents is null or price_cents >= 0),
  freshness_label text,
  compliance_status text not null default 'review_required',
  buyer_visible_summary jsonb not null default '{}',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.marketplace_listings is
  'Approved marketplace summaries buyers can browse before requesting sample or access. Does not contain raw identity dossiers.';

create table if not exists leadflow.buyer_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null,
  marketplace_listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  request_type text not null default 'access' check (request_type in ('sample', 'access', 'build_system', 'custom_pack')),
  vertical text,
  category text,
  buyer_use_case text,
  filters jsonb not null default '{}',
  status text not null default 'submitted' check (status in ('submitted', 'review', 'approved', 'rejected', 'fulfilled', 'cancelled')),
  review_status text not null default 'pending',
  source_url text,
  source_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table leadflow.buyer_requests is
  'Buyer sample/access/build requests with filters and use case, review-gated before any lead release.';

create table if not exists leadflow.partner_entitlements (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid not null references leadflow.buyer_accounts(id) on delete cascade,
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete cascade,
  marketplace_listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  consent_ledger_id uuid references leadflow.consent_ledger(id) on delete set null,
  entitlement_type text not null default 'profile_access',
  status text not null default 'active',
  raw_answers_approved boolean not null default false,
  allowed_fields text[] not null default '{}',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  granted_by_user_id uuid,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table leadflow.partner_entitlements is
  'Explicit access grants tying a buyer to a reviewed profile/listing, consent record, allowed fields, and expiry window.';

create table if not exists leadflow.suppression_requests (
  id uuid primary key default gen_random_uuid(),
  identity_id uuid references leadflow.identities(id) on delete set null,
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null,
  response_id uuid references leadflow.responses(id) on delete set null,
  email_sha256 text,
  phone_sha256 text,
  suppression_type text not null default 'do_not_contact',
  status text not null default 'active',
  reason text,
  source_url text,
  requested_at timestamptz not null default now(),
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.suppression_requests is
  'Consumer suppression, do-not-contact, do-not-sell/share, deletion, and ADMT opt-out records used to block buyer visibility and exports.';

create table if not exists leadflow.exports (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null,
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null,
  marketplace_listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  export_type text not null,
  export_status text not null default 'queued',
  row_count integer not null default 0 check (row_count >= 0),
  raw_answers_included boolean not null default false,
  filter_summary jsonb not null default '{}',
  storage_path text,
  checksum_sha256 text,
  created_by_user_id uuid,
  generated_at timestamptz,
  exported_at timestamptz,
  downloaded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.exports is
  'Audited exports for approved lead access, samples, aggregate insights, DSAR, and suppression syncs.';

create table if not exists leadflow.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_type text not null default 'system',
  action text not null,
  object_schema text not null default 'leadflow',
  object_table text not null,
  object_id uuid,
  buyer_account_id uuid,
  lead_profile_id uuid,
  marketplace_listing_id uuid,
  before_redacted jsonb not null default '{}',
  after_redacted jsonb not null default '{}',
  details jsonb not null default '{}',
  request_id text,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now(),
  occurred_at timestamptz not null default now()
);

comment on table leadflow.audit_log is
  'Append-only audit trail for approvals, buyer grants, suppressions, exports, and governed data access.';

create table if not exists leadflow.events (
  id uuid primary key default gen_random_uuid(),
  anonymous_session_id uuid references leadflow.anonymous_sessions(id) on delete set null,
  response_id uuid references leadflow.responses(id) on delete set null,
  event_name text not null,
  event_type text not null default 'anonymous',
  tool_slug text,
  vertical text,
  category text,
  source_url text,
  source_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table leadflow.events is
  'Anonymous event stream for page views, quiz starts, branch/drop-off points, and CTA clicks. Do not store raw PII or free-text answers.';

-- Compatibility columns for tables already created by the consent platform.

alter table if exists leadflow.identities add column if not exists status text not null default 'active';
alter table if exists leadflow.identities add column if not exists review_status text not null default 'pending';
alter table if exists leadflow.identities add column if not exists source_url text;
alter table if exists leadflow.identities add column if not exists source_path text;
alter table if exists leadflow.identities add column if not exists utm_source text;
alter table if exists leadflow.identities add column if not exists utm_medium text;
alter table if exists leadflow.identities add column if not exists utm_campaign text;
alter table if exists leadflow.identities add column if not exists utm_term text;
alter table if exists leadflow.identities add column if not exists utm_content text;
alter table if exists leadflow.identities add column if not exists consent_version text;

alter table if exists leadflow.questionnaires add column if not exists category text;
alter table if exists leadflow.questionnaires add column if not exists status text not null default 'draft';
alter table if exists leadflow.questionnaires add column if not exists review_status text not null default 'pending';
alter table if exists leadflow.questionnaires add column if not exists default_consent_version text;
alter table if exists leadflow.questionnaires add column if not exists source_url text;

alter table if exists leadflow.answers add column if not exists response_id uuid references leadflow.responses(id) on delete set null;
alter table if exists leadflow.answers add column if not exists question_id uuid references leadflow.questions(id) on delete set null;
alter table if exists leadflow.answers add column if not exists raw_answer jsonb;
alter table if exists leadflow.answers add column if not exists normalized_answer jsonb not null default '{}';
alter table if exists leadflow.answers add column if not exists answer_tags text[] not null default '{}';
alter table if exists leadflow.answers add column if not exists approved_for_buyer boolean not null default false;
alter table if exists leadflow.answers add column if not exists review_status text not null default 'pending';

alter table if exists leadflow.consent_ledger add column if not exists response_id uuid references leadflow.responses(id) on delete set null;
alter table if exists leadflow.consent_ledger add column if not exists buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null;
alter table if exists leadflow.consent_ledger add column if not exists consent_status text not null default 'accepted';
alter table if exists leadflow.consent_ledger add column if not exists consent_version text;
alter table if exists leadflow.consent_ledger add column if not exists source_url text;
alter table if exists leadflow.consent_ledger add column if not exists source_path text;
alter table if exists leadflow.consent_ledger add column if not exists utm_source text;
alter table if exists leadflow.consent_ledger add column if not exists utm_medium text;
alter table if exists leadflow.consent_ledger add column if not exists utm_campaign text;

alter table if exists leadflow.partner_entitlements add column if not exists buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null;
alter table if exists leadflow.partner_entitlements add column if not exists lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null;
alter table if exists leadflow.partner_entitlements add column if not exists marketplace_listing_id uuid references leadflow.marketplace_listings(id) on delete set null;
alter table if exists leadflow.partner_entitlements add column if not exists entitlement_type text not null default 'profile_access';
alter table if exists leadflow.partner_entitlements add column if not exists status text not null default 'active';
alter table if exists leadflow.partner_entitlements add column if not exists raw_answers_approved boolean not null default false;
alter table if exists leadflow.partner_entitlements add column if not exists allowed_fields text[] not null default '{}';
alter table if exists leadflow.partner_entitlements add column if not exists granted_by_user_id uuid;
alter table if exists leadflow.partner_entitlements add column if not exists granted_at timestamptz not null default now();

alter table if exists leadflow.suppression_requests add column if not exists lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null;
alter table if exists leadflow.suppression_requests add column if not exists response_id uuid references leadflow.responses(id) on delete set null;
alter table if exists leadflow.suppression_requests add column if not exists suppression_type text not null default 'do_not_contact';
alter table if exists leadflow.suppression_requests add column if not exists status text not null default 'active';
alter table if exists leadflow.suppression_requests add column if not exists source_url text;

alter table if exists leadflow.exports add column if not exists buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null;
alter table if exists leadflow.exports add column if not exists lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null;
alter table if exists leadflow.exports add column if not exists marketplace_listing_id uuid references leadflow.marketplace_listings(id) on delete set null;
alter table if exists leadflow.exports add column if not exists export_status text not null default 'queued';
alter table if exists leadflow.exports add column if not exists raw_answers_included boolean not null default false;
alter table if exists leadflow.exports add column if not exists exported_at timestamptz;

alter table if exists leadflow.audit_log add column if not exists buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null;
alter table if exists leadflow.audit_log add column if not exists lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null;
alter table if exists leadflow.audit_log add column if not exists marketplace_listing_id uuid references leadflow.marketplace_listings(id) on delete set null;
alter table if exists leadflow.audit_log add column if not exists details jsonb not null default '{}';

-- ---------------------------------------------------------------------------
-- Buyer access predicates
-- ---------------------------------------------------------------------------

create or replace function leadflow.current_buyer_account_ids()
returns uuid[]
language sql
stable
security invoker
as $$
  select coalesce(array_agg(ba.id), '{}'::uuid[])
  from leadflow.buyer_accounts ba
  where ba.deleted_at is null
    and ba.status in ('active', 'approved')
    and (
      (select auth.uid()) = ba.owner_user_id
      or (select auth.uid()) = any(ba.team_user_ids)
    );
$$;

create or replace function leadflow.lead_profile_has_active_suppression(target_lead_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = leadflow, public
as $$
  select exists (
    select 1
    from leadflow.lead_profiles lp
    join leadflow.suppression_requests sr
      on sr.deleted_at is null
     and sr.status in ('active', 'received', 'processing', 'completed')
     and sr.effective_at <= now()
     and (sr.expires_at is null or sr.expires_at > now())
     and (
       sr.lead_profile_id = lp.id
       or sr.identity_id = lp.identity_id
       or sr.response_id = lp.response_id
     )
    where lp.id = target_lead_profile_id
      and lp.deleted_at is null
  );
$$;

create or replace function leadflow.buyer_can_access_lead_profile(
  target_lead_profile_id uuid,
  require_raw_answers boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = leadflow, public
as $$
  select exists (
    select 1
    from leadflow.partner_entitlements pe
    join leadflow.buyer_accounts ba
      on ba.id = pe.buyer_account_id
     and ba.deleted_at is null
     and ba.status in ('active', 'approved')
    join leadflow.lead_profiles lp
      on lp.id = target_lead_profile_id
     and lp.deleted_at is null
     and lp.review_status = 'approved'
     and lp.status in ('sample_available', 'available', 'sold')
     and lp.suppression_status not in ('suppressed', 'do_not_contact', 'delete_requested')
    where pe.lead_profile_id = target_lead_profile_id
      and pe.status = 'active'
      and pe.revoked_at is null
      and pe.starts_at <= now()
      and (pe.expires_at is null or pe.expires_at > now())
      and (not require_raw_answers or pe.raw_answers_approved = true)
      and (
        (select auth.uid()) = ba.owner_user_id
        or (select auth.uid()) = any(ba.team_user_ids)
      )
      and not leadflow.lead_profile_has_active_suppression(target_lead_profile_id)
      and (
        pe.consent_ledger_id is null
        or exists (
          select 1
          from leadflow.consent_ledger cl
          where cl.id = pe.consent_ledger_id
            and cl.consent_status in ('accepted', 'granted')
            and cl.revoked_at is null
            and (cl.expires_at is null or cl.expires_at > now())
        )
      )
  );
$$;

comment on function leadflow.buyer_can_access_lead_profile(uuid, boolean) is
  'Buyer RLS predicate requiring active buyer membership, entitlement, approved profile, no suppression, and active consent when attached.';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists anonymous_sessions_created_at_idx on leadflow.anonymous_sessions(created_at desc);
create index if not exists anonymous_sessions_source_idx on leadflow.anonymous_sessions(source_path, utm_campaign);

create index if not exists identities_status_idx on leadflow.identities(status, review_status, created_at desc);
create index if not exists identities_source_idx on leadflow.identities(source_url, utm_campaign);

create index if not exists questionnaires_vertical_status_idx on leadflow.questionnaires(vertical, category, status, review_status);
create index if not exists questionnaire_versions_status_idx on leadflow.questionnaire_versions(status, review_status, created_at desc);
create index if not exists questions_version_status_idx on leadflow.questions(questionnaire_version_id, status, review_status, display_order);

create index if not exists responses_vertical_status_idx on leadflow.responses(vertical, category, status, review_status, created_at desc);
create index if not exists responses_score_confidence_idx on leadflow.responses(score desc, confidence desc);
create index if not exists responses_session_idx on leadflow.responses(anonymous_session_id, created_at desc);
create index if not exists responses_source_idx on leadflow.responses(source_path, utm_campaign, created_at desc);

create index if not exists answers_response_idx on leadflow.answers(response_id, created_at desc);
create index if not exists answers_review_idx on leadflow.answers(review_status, approved_for_buyer);
create index if not exists answers_tags_gin_idx on leadflow.answers using gin(answer_tags);

create index if not exists consent_response_idx on leadflow.consent_ledger(response_id, consent_status, created_at desc);
create index if not exists consent_buyer_idx on leadflow.consent_ledger(buyer_account_id, consent_status, created_at desc);

create index if not exists lead_profiles_vertical_category_idx on leadflow.lead_profiles(vertical, category, created_at desc);
create index if not exists lead_profiles_score_confidence_idx on leadflow.lead_profiles(score desc, confidence desc);
create index if not exists lead_profiles_status_idx on leadflow.lead_profiles(status, review_status, suppression_status, created_at desc);
create index if not exists lead_profiles_tags_gin_idx on leadflow.lead_profiles using gin(tags);

create index if not exists lead_scores_profile_type_idx on leadflow.lead_scores(lead_profile_id, score_type, created_at desc);
create index if not exists lead_scores_score_confidence_idx on leadflow.lead_scores(score desc, confidence desc);
create index if not exists lead_scores_status_idx on leadflow.lead_scores(status, review_status, created_at desc);

create index if not exists source_proofs_profile_status_idx on leadflow.source_proofs(lead_profile_id, status, review_status, created_at desc);
create index if not exists source_proofs_confidence_idx on leadflow.source_proofs(confidence desc);

create index if not exists marketplace_vertical_category_idx on leadflow.marketplace_listings(vertical, category, listing_status, review_status);
create index if not exists marketplace_score_confidence_idx on leadflow.marketplace_listings(score desc, confidence desc);
create index if not exists marketplace_created_at_idx on leadflow.marketplace_listings(created_at desc);

create index if not exists buyer_accounts_owner_idx on leadflow.buyer_accounts(owner_user_id, status, review_status);
create index if not exists buyer_requests_buyer_status_idx on leadflow.buyer_requests(buyer_account_id, status, created_at desc);
create index if not exists buyer_requests_vertical_category_idx on leadflow.buyer_requests(vertical, category, status, created_at desc);

create index if not exists partner_entitlements_buyer_profile_idx on leadflow.partner_entitlements(buyer_account_id, lead_profile_id, status);
create index if not exists partner_entitlements_listing_idx on leadflow.partner_entitlements(marketplace_listing_id, status);
create index if not exists partner_entitlements_window_idx on leadflow.partner_entitlements(starts_at, expires_at, revoked_at);

create index if not exists suppression_identity_idx on leadflow.suppression_requests(identity_id, status, effective_at desc);
create index if not exists suppression_profile_idx on leadflow.suppression_requests(lead_profile_id, status, effective_at desc);
create index if not exists suppression_response_idx on leadflow.suppression_requests(response_id, status, effective_at desc);

create index if not exists exports_buyer_status_idx on leadflow.exports(buyer_account_id, export_status, created_at desc);
create index if not exists exports_profile_idx on leadflow.exports(lead_profile_id, created_at desc);

create index if not exists audit_log_action_time_idx on leadflow.audit_log(action, occurred_at desc);
create index if not exists audit_log_profile_idx on leadflow.audit_log(lead_profile_id, occurred_at desc);
create index if not exists audit_log_buyer_idx on leadflow.audit_log(buyer_account_id, occurred_at desc);

create index if not exists events_name_time_idx on leadflow.events(event_name, created_at desc);
create index if not exists events_tool_vertical_idx on leadflow.events(tool_slug, vertical, category, created_at desc);
create index if not exists events_session_idx on leadflow.events(anonymous_session_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS and policies
-- ---------------------------------------------------------------------------

alter table leadflow.identities enable row level security;
alter table leadflow.anonymous_sessions enable row level security;
alter table leadflow.questionnaires enable row level security;
alter table leadflow.questionnaire_versions enable row level security;
alter table leadflow.questions enable row level security;
alter table leadflow.responses enable row level security;
alter table leadflow.answers enable row level security;
alter table leadflow.consent_ledger enable row level security;
alter table leadflow.lead_profiles enable row level security;
alter table leadflow.lead_scores enable row level security;
alter table leadflow.source_proofs enable row level security;
alter table leadflow.marketplace_listings enable row level security;
alter table leadflow.buyer_accounts enable row level security;
alter table leadflow.buyer_requests enable row level security;
alter table leadflow.partner_entitlements enable row level security;
alter table leadflow.suppression_requests enable row level security;
alter table leadflow.exports enable row level security;
alter table leadflow.audit_log enable row level security;
alter table leadflow.events enable row level security;

alter table leadflow.identities force row level security;
alter table leadflow.anonymous_sessions force row level security;
alter table leadflow.questionnaires force row level security;
alter table leadflow.questionnaire_versions force row level security;
alter table leadflow.questions force row level security;
alter table leadflow.responses force row level security;
alter table leadflow.answers force row level security;
alter table leadflow.consent_ledger force row level security;
alter table leadflow.lead_profiles force row level security;
alter table leadflow.lead_scores force row level security;
alter table leadflow.source_proofs force row level security;
alter table leadflow.marketplace_listings force row level security;
alter table leadflow.buyer_accounts force row level security;
alter table leadflow.buyer_requests force row level security;
alter table leadflow.partner_entitlements force row level security;
alter table leadflow.suppression_requests force row level security;
alter table leadflow.exports force row level security;
alter table leadflow.audit_log force row level security;
alter table leadflow.events force row level security;

-- Public insert-only surfaces. No public SELECT policies are created.
drop policy if exists anonymous_sessions_public_insert on leadflow.anonymous_sessions;
create policy anonymous_sessions_public_insert on leadflow.anonymous_sessions
  for insert to anon, authenticated
  with check (anonymous_user_id is not null);

drop policy if exists responses_public_insert on leadflow.responses;
create policy responses_public_insert on leadflow.responses
  for insert to anon, authenticated
  with check (
    identity_id is null
    and score is null
    and confidence is null
    and review_status = 'pending'
    and status in ('started', 'partial', 'completed', 'abandoned')
    and suppression_status in ('unchecked', 'clear')
  );

drop policy if exists events_public_insert on leadflow.events;
create policy events_public_insert on leadflow.events
  for insert to anon, authenticated
  with check (
    event_type = 'anonymous'
    and not (properties ? 'email')
    and not (properties ? 'phone')
    and not (properties ? 'name')
    and not (properties ? 'raw_answer')
  );

-- Admin access. Sensitive tables stay unavailable to non-admins unless a
-- narrower buyer/public policy below permits the operation.
drop policy if exists lead_signal_admin_all_identities on leadflow.identities;
create policy lead_signal_admin_all_identities on leadflow.identities for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_anonymous_sessions on leadflow.anonymous_sessions;
create policy lead_signal_admin_all_anonymous_sessions on leadflow.anonymous_sessions for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_questionnaires on leadflow.questionnaires;
create policy lead_signal_admin_all_questionnaires on leadflow.questionnaires for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_questionnaire_versions on leadflow.questionnaire_versions;
create policy lead_signal_admin_all_questionnaire_versions on leadflow.questionnaire_versions for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_questions on leadflow.questions;
create policy lead_signal_admin_all_questions on leadflow.questions for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_responses on leadflow.responses;
create policy lead_signal_admin_all_responses on leadflow.responses for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_answers on leadflow.answers;
create policy lead_signal_admin_all_answers on leadflow.answers for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_consent_ledger on leadflow.consent_ledger;
create policy lead_signal_admin_all_consent_ledger on leadflow.consent_ledger for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_lead_profiles on leadflow.lead_profiles;
create policy lead_signal_admin_all_lead_profiles on leadflow.lead_profiles for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_lead_scores on leadflow.lead_scores;
create policy lead_signal_admin_all_lead_scores on leadflow.lead_scores for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_source_proofs on leadflow.source_proofs;
create policy lead_signal_admin_all_source_proofs on leadflow.source_proofs for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_marketplace_listings on leadflow.marketplace_listings;
create policy lead_signal_admin_all_marketplace_listings on leadflow.marketplace_listings for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_buyer_accounts on leadflow.buyer_accounts;
create policy lead_signal_admin_all_buyer_accounts on leadflow.buyer_accounts for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_buyer_requests on leadflow.buyer_requests;
create policy lead_signal_admin_all_buyer_requests on leadflow.buyer_requests for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_partner_entitlements on leadflow.partner_entitlements;
create policy lead_signal_admin_all_partner_entitlements on leadflow.partner_entitlements for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_suppression_requests on leadflow.suppression_requests;
create policy lead_signal_admin_all_suppression_requests on leadflow.suppression_requests for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_exports on leadflow.exports;
create policy lead_signal_admin_all_exports on leadflow.exports for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_audit_log on leadflow.audit_log;
create policy lead_signal_admin_all_audit_log on leadflow.audit_log for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_events on leadflow.events;
create policy lead_signal_admin_all_events on leadflow.events for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

-- Buyer-facing policies.
drop policy if exists buyer_accounts_select_own_lead_signal on leadflow.buyer_accounts;
create policy buyer_accounts_select_own_lead_signal on leadflow.buyer_accounts
  for select to authenticated
  using (
    deleted_at is null
    and ((select auth.uid()) = owner_user_id or (select auth.uid()) = any(team_user_ids))
  );

drop policy if exists buyer_accounts_insert_own_lead_signal on leadflow.buyer_accounts;
create policy buyer_accounts_insert_own_lead_signal on leadflow.buyer_accounts
  for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists buyer_accounts_update_own_lead_signal on leadflow.buyer_accounts;
create policy buyer_accounts_update_own_lead_signal on leadflow.buyer_accounts
  for update to authenticated
  using (
    deleted_at is null
    and ((select auth.uid()) = owner_user_id or (select auth.uid()) = any(team_user_ids))
  )
  with check ((select auth.uid()) = owner_user_id or (select auth.uid()) = any(team_user_ids));

drop policy if exists marketplace_listings_select_approved on leadflow.marketplace_listings;
create policy marketplace_listings_select_approved on leadflow.marketplace_listings
  for select to authenticated
  using (
    deleted_at is null
    and review_status = 'approved'
    and listing_status in ('sample_available', 'available')
    and compliance_status not in ('blocked', 'suppressed')
  );

drop policy if exists buyer_requests_select_own on leadflow.buyer_requests;
create policy buyer_requests_select_own on leadflow.buyer_requests
  for select to authenticated
  using (buyer_account_id = any(leadflow.current_buyer_account_ids()));

drop policy if exists buyer_requests_insert_own on leadflow.buyer_requests;
create policy buyer_requests_insert_own on leadflow.buyer_requests
  for insert to authenticated
  with check (buyer_account_id = any(leadflow.current_buyer_account_ids()));

drop policy if exists buyer_requests_update_own on leadflow.buyer_requests;
create policy buyer_requests_update_own on leadflow.buyer_requests
  for update to authenticated
  using (buyer_account_id = any(leadflow.current_buyer_account_ids()))
  with check (buyer_account_id = any(leadflow.current_buyer_account_ids()));

drop policy if exists lead_profiles_select_entitled_buyer on leadflow.lead_profiles;
create policy lead_profiles_select_entitled_buyer on leadflow.lead_profiles
  for select to authenticated
  using (leadflow.buyer_can_access_lead_profile(id, false));

drop policy if exists lead_scores_select_entitled_buyer on leadflow.lead_scores;
create policy lead_scores_select_entitled_buyer on leadflow.lead_scores
  for select to authenticated
  using (
    review_status = 'approved'
    and leadflow.buyer_can_access_lead_profile(lead_profile_id, false)
  );

drop policy if exists source_proofs_select_entitled_buyer on leadflow.source_proofs;
create policy source_proofs_select_entitled_buyer on leadflow.source_proofs
  for select to authenticated
  using (
    review_status = 'approved'
    and status = 'approved'
    and leadflow.buyer_can_access_lead_profile(lead_profile_id, false)
  );

drop policy if exists partner_entitlements_select_own_buyer on leadflow.partner_entitlements;
create policy partner_entitlements_select_own_buyer on leadflow.partner_entitlements
  for select to authenticated
  using (
    buyer_account_id = any(leadflow.current_buyer_account_ids())
    and status = 'active'
    and revoked_at is null
  );

drop policy if exists answers_select_buyer_explicit_raw_approval on leadflow.answers;
create policy answers_select_buyer_explicit_raw_approval on leadflow.answers
  for select to authenticated
  using (
    approved_for_buyer = true
    and response_id is not null
    and exists (
      select 1
      from leadflow.lead_profiles lp
      where lp.response_id = answers.response_id
        and leadflow.buyer_can_access_lead_profile(lp.id, true)
    )
  );

drop policy if exists exports_select_own_buyer on leadflow.exports;
create policy exports_select_own_buyer on leadflow.exports
  for select to authenticated
  using (buyer_account_id = any(leadflow.current_buyer_account_ids()));

-- ---------------------------------------------------------------------------
-- Grants for Data API exposure. Grants are intentionally narrower than RLS.
-- ---------------------------------------------------------------------------

grant usage on schema leadflow to anon, authenticated, service_role;

grant insert on leadflow.anonymous_sessions to anon, authenticated;
grant insert on leadflow.responses to anon, authenticated;
grant insert on leadflow.events to anon, authenticated;

grant select, insert, update on leadflow.buyer_accounts to authenticated;
grant select, insert, update on leadflow.buyer_requests to authenticated;
grant select on leadflow.marketplace_listings to authenticated;
grant select on leadflow.lead_profiles to authenticated;
grant select on leadflow.lead_scores to authenticated;
grant select on leadflow.source_proofs to authenticated;
grant select on leadflow.partner_entitlements to authenticated;
grant select on leadflow.answers to authenticated;
grant select on leadflow.exports to authenticated;

grant select, insert, update on leadflow.identities to authenticated;
grant select, insert, update on leadflow.questionnaires to authenticated;
grant select, insert, update on leadflow.questionnaire_versions to authenticated;
grant select, insert, update on leadflow.questions to authenticated;
grant select, insert, update on leadflow.responses to authenticated;
grant select, insert, update on leadflow.consent_ledger to authenticated;
grant select, insert, update on leadflow.suppression_requests to authenticated;
grant select, insert on leadflow.audit_log to authenticated;
grant select on leadflow.anonymous_sessions to authenticated;
grant select on leadflow.events to authenticated;

grant execute on function leadflow.is_platform_admin() to authenticated, service_role;
grant execute on function leadflow.current_buyer_account_ids() to authenticated, service_role;
grant execute on function leadflow.lead_profile_has_active_suppression(uuid) to authenticated, service_role;
grant execute on function leadflow.buyer_can_access_lead_profile(uuid, boolean) to authenticated, service_role;

grant all on all tables in schema leadflow to service_role;
grant all on all routines in schema leadflow to service_role;

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists set_anonymous_sessions_updated_at on leadflow.anonymous_sessions;
create trigger set_anonymous_sessions_updated_at
  before update on leadflow.anonymous_sessions
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_buyer_accounts_updated_at on leadflow.buyer_accounts;
create trigger set_buyer_accounts_updated_at
  before update on leadflow.buyer_accounts
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_questionnaire_versions_updated_at on leadflow.questionnaire_versions;
create trigger set_questionnaire_versions_updated_at
  before update on leadflow.questionnaire_versions
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_questions_updated_at on leadflow.questions;
create trigger set_questions_updated_at
  before update on leadflow.questions
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_responses_updated_at on leadflow.responses;
create trigger set_responses_updated_at
  before update on leadflow.responses
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_lead_profiles_updated_at on leadflow.lead_profiles;
create trigger set_lead_profiles_updated_at
  before update on leadflow.lead_profiles
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_source_proofs_updated_at on leadflow.source_proofs;
create trigger set_source_proofs_updated_at
  before update on leadflow.source_proofs
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_marketplace_listings_updated_at on leadflow.marketplace_listings;
create trigger set_marketplace_listings_updated_at
  before update on leadflow.marketplace_listings
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_buyer_requests_updated_at on leadflow.buyer_requests;
create trigger set_buyer_requests_updated_at
  before update on leadflow.buyer_requests
  for each row execute function leadflow.set_updated_at();

-- ---------------------------------------------------------------------------
-- Audit logging for profile approval, export, suppression, and access grants.
-- ---------------------------------------------------------------------------

create or replace function leadflow.audit_lead_signal_change()
returns trigger
language plpgsql
security definer
set search_path = leadflow, public
as $$
declare
  audit_action text;
  row_json jsonb;
  old_json jsonb;
  actor_id uuid;
begin
  row_json := to_jsonb(new);
  old_json := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;

  begin
    actor_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  exception when others then
    actor_id := null;
  end;

  if tg_table_name = 'lead_profiles' and tg_op = 'UPDATE'
    and old.review_status is distinct from new.review_status
    and new.review_status = 'approved' then
    audit_action := 'lead_profile.approved';
  elsif tg_table_name = 'exports' and tg_op = 'INSERT' then
    audit_action := 'export.created';
  elsif tg_table_name = 'exports' and tg_op = 'UPDATE' then
    audit_action := 'export.updated';
  elsif tg_table_name = 'suppression_requests' and tg_op = 'INSERT' then
    audit_action := 'suppression.created';
  elsif tg_table_name = 'suppression_requests' and tg_op = 'UPDATE' then
    audit_action := 'suppression.updated';
  elsif tg_table_name = 'partner_entitlements' and tg_op = 'INSERT' then
    audit_action := 'buyer_access.granted';
  elsif tg_table_name = 'partner_entitlements' and tg_op = 'UPDATE'
    and old.status is distinct from new.status then
    audit_action := 'buyer_access.updated';
  else
    return new;
  end if;

  insert into leadflow.audit_log (
    actor_user_id,
    actor_type,
    action,
    object_schema,
    object_table,
    object_id,
    buyer_account_id,
    lead_profile_id,
    marketplace_listing_id,
    before_redacted,
    after_redacted,
    details,
    occurred_at
  ) values (
    actor_id,
    case when actor_id is null then 'system' else 'admin' end,
    audit_action,
    tg_table_schema,
    tg_table_name,
    (row_json ->> 'id')::uuid,
    nullif(row_json ->> 'buyer_account_id', '')::uuid,
    coalesce(nullif(row_json ->> 'lead_profile_id', '')::uuid, case when tg_table_name = 'lead_profiles' then (row_json ->> 'id')::uuid else null end),
    nullif(row_json ->> 'marketplace_listing_id', '')::uuid,
    jsonb_build_object(
      'status', old_json ->> 'status',
      'review_status', old_json ->> 'review_status',
      'export_status', old_json ->> 'export_status'
    ),
    jsonb_build_object(
      'status', row_json ->> 'status',
      'review_status', row_json ->> 'review_status',
      'export_status', row_json ->> 'export_status'
    ),
    jsonb_build_object('source', 'trigger', 'operation', tg_op),
    now()
  );

  return new;
end;
$$;

drop trigger if exists audit_lead_profile_approval on leadflow.lead_profiles;
create trigger audit_lead_profile_approval
  after update on leadflow.lead_profiles
  for each row execute function leadflow.audit_lead_signal_change();

drop trigger if exists audit_exports_changes on leadflow.exports;
create trigger audit_exports_changes
  after insert or update on leadflow.exports
  for each row execute function leadflow.audit_lead_signal_change();

drop trigger if exists audit_suppression_changes on leadflow.suppression_requests;
create trigger audit_suppression_changes
  after insert or update on leadflow.suppression_requests
  for each row execute function leadflow.audit_lead_signal_change();

drop trigger if exists audit_buyer_access_grants on leadflow.partner_entitlements;
create trigger audit_buyer_access_grants
  after insert or update on leadflow.partner_entitlements
  for each row execute function leadflow.audit_lead_signal_change();

revoke all on function leadflow.audit_lead_signal_change() from public, anon, authenticated;
grant execute on function leadflow.audit_lead_signal_change() to service_role;
