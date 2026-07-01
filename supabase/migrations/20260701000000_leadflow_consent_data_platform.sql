-- Lead Flow Pro consent-based data platform schema.
-- Target: Supabase Postgres. Keep this schema private unless explicitly exposed.
-- If exposed through Supabase Data API, keep RLS enabled and grant only reviewed access.

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists leadflow;

create type leadflow.sales_channel as enum (
  'web_quiz',
  'embedded_widget',
  'partner_site',
  'marketplace',
  'api',
  'crm_import',
  'manual_admin',
  'webhook',
  'paid_media'
);

create type leadflow.consent_scope as enum (
  'anonymous_analytics',
  'profile_personalization',
  'email_contact',
  'sms_contact',
  'phone_contact',
  'single_seller_routing',
  'named_partner_routing',
  'aggregated_insights',
  'sale_or_share',
  'admt_scoring',
  'data_export',
  'do_not_contact',
  'do_not_sell_share'
);

create type leadflow.exclusivity_level as enum (
  'none',
  'exclusive_single_seller',
  'named_multi_partner',
  'aggregated_only',
  'internal_only'
);

create type leadflow.vertical as enum (
  'local_business',
  'real_estate',
  'mortgage_refi',
  'ecommerce',
  'b2b_saas',
  'consumer_shopping',
  'general'
);

create type leadflow.lifecycle_stage as enum (
  'anonymous',
  'known',
  'qualified',
  'routed',
  'sold',
  'suppressed',
  'deleted',
  'merged',
  'archived'
);

create or replace function leadflow.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table leadflow.partner_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  team_user_ids uuid[] not null default '{}',
  name text not null,
  legal_name text,
  website_url text,
  vertical leadflow.vertical not null default 'general',
  default_sales_channel leadflow.sales_channel not null default 'web_quiz',
  lifecycle_stage leadflow.lifecycle_stage not null default 'known',
  data_api_enabled boolean not null default false,
  default_retention_days integer not null default 365 check (default_retention_days between 1 and 3650),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz
);

comment on table leadflow.partner_accounts is
  'Tenant accounts for Lead Flow Pro buyers, sellers, and first-party questionnaire owners. Owner/team fields drive RLS access.';

create table leadflow.identities (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  anonymous_id text,
  external_user_id text,
  email citext,
  phone_e164 text,
  email_sha256 text,
  phone_sha256 text,
  stitch_group_id uuid not null default gen_random_uuid(),
  merged_into_identity_id uuid references leadflow.identities(id) on delete set null,
  stitch_confidence numeric(5,4) not null default 1.0000 check (stitch_confidence between 0 and 1),
  lifecycle_stage leadflow.lifecycle_stage not null default 'anonymous',
  first_seen_at timestamptz not null default now(),
  known_at timestamptz,
  last_seen_at timestamptz,
  provenance jsonb not null default '{}',
  retention_category text not null default 'identity',
  retention_days integer not null default 730 check (retention_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz,
  constraint identities_contact_or_anonymous_chk check (
    anonymous_id is not null or external_user_id is not null or email is not null or phone_e164 is not null or email_sha256 is not null or phone_sha256 is not null
  ),
  constraint identities_merge_not_self_chk check (merged_into_identity_id is null or merged_into_identity_id <> id)
);

comment on table leadflow.identities is
  'Canonical anonymous or known person/business identity per tenant, including anonymous-to-known stitching and merge tracking.';

create table leadflow.profiles (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  identity_id uuid not null references leadflow.identities(id) on delete restrict,
  vertical leadflow.vertical not null default 'general',
  sales_channel leadflow.sales_channel not null default 'web_quiz',
  lifecycle_stage leadflow.lifecycle_stage not null default 'known',
  preference_summary jsonb not null default '{}',
  normalized_attributes jsonb not null default '{}',
  data_categories text[] not null default '{}',
  sensitive_data_flag boolean not null default false,
  suppression_flag boolean not null default false,
  source_confidence numeric(5,2) not null default 0 check (source_confidence between 0 and 100),
  retention_category text not null default 'profile',
  retention_days integer not null default 730 check (retention_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz
);

comment on table leadflow.profiles is
  'Normalized first-party preference and lead profile data linked to identities, scoped by tenant and vertical.';

create table leadflow.consent_ledger (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  identity_id uuid not null references leadflow.identities(id) on delete restrict,
  profile_id uuid references leadflow.profiles(id) on delete set null,
  buyer_partner_account_id uuid references leadflow.partner_accounts(id) on delete restrict,
  scope leadflow.consent_scope not null,
  granted boolean not null,
  exclusivity_level leadflow.exclusivity_level not null default 'none',
  sales_channel leadflow.sales_channel not null,
  vertical leadflow.vertical not null default 'general',
  notice_version text not null,
  consent_text text not null,
  capture_url text,
  ip_hash text,
  user_agent_hash text,
  provenance jsonb not null default '{}',
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz,
  constraint consent_named_buyer_chk check (
    scope not in ('single_seller_routing', 'named_partner_routing') or buyer_partner_account_id is not null
  ),
  constraint consent_expiry_chk check (expires_at is null or expires_at > effective_at)
);

comment on table leadflow.consent_ledger is
  'Append-first consent ledger recording what the user agreed to, for which scope, seller, channel, notice, and provenance.';

create table leadflow.questionnaires (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  slug text not null,
  title text not null,
  description text,
  vertical leadflow.vertical not null default 'general',
  sales_channel leadflow.sales_channel not null default 'web_quiz',
  lifecycle_stage leadflow.lifecycle_stage not null default 'known',
  default_consent_scopes leadflow.consent_scope[] not null default '{}',
  metadata jsonb not null default '{}',
  retention_category text not null default 'questionnaire',
  retention_days integer not null default 1095 check (retention_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz
);

comment on table leadflow.questionnaires is
  'Tenant-owned questionnaire definitions for public quizzes, embedded widgets, and vertical-specific intake flows.';

create table leadflow.question_versions (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  questionnaire_id uuid not null references leadflow.questionnaires(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  question_schema jsonb not null,
  consent_copy_snapshot jsonb not null default '{}',
  published_at timestamptz,
  retired_at timestamptz,
  created_by_user_id uuid,
  retention_category text not null default 'question_version',
  retention_days integer not null default 1095 check (retention_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz,
  constraint question_versions_retired_after_publish_chk check (retired_at is null or published_at is null or retired_at > published_at)
);

comment on table leadflow.question_versions is
  'Immutable-ish versioned questionnaire schemas and consent-copy snapshots used to prove what question and notice text was shown.';

create table leadflow.answers (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  questionnaire_id uuid not null references leadflow.questionnaires(id) on delete restrict,
  question_version_id uuid not null references leadflow.question_versions(id) on delete restrict,
  identity_id uuid references leadflow.identities(id) on delete restrict,
  profile_id uuid references leadflow.profiles(id) on delete set null,
  consent_ledger_id uuid references leadflow.consent_ledger(id) on delete set null,
  question_key text not null,
  answer_value jsonb not null,
  answer_text text,
  answer_sha256 text,
  sales_channel leadflow.sales_channel not null,
  vertical leadflow.vertical not null default 'general',
  provenance jsonb not null,
  source_url text,
  ip_hash text,
  user_agent_hash text,
  occurred_at timestamptz not null default now(),
  prohibited_data_detected boolean not null default false,
  retention_category text not null default 'answer',
  retention_days integer not null default 730 check (retention_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz,
  constraint answers_identity_or_profile_chk check (identity_id is not null or profile_id is not null)
);

comment on table leadflow.answers is
  'Raw and normalized questionnaire answers with provenance, source context, consent pointer, and retention metadata.';

create table leadflow.behavioral_events (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  identity_id uuid references leadflow.identities(id) on delete set null,
  anonymous_id text,
  session_id text,
  event_name text not null,
  event_type text not null,
  sales_channel leadflow.sales_channel not null default 'web_quiz',
  vertical leadflow.vertical not null default 'general',
  page_url text,
  path text,
  target text,
  value numeric,
  referrer text,
  utm jsonb not null default '{}',
  event_payload jsonb not null default '{}',
  provenance jsonb not null,
  occurred_at timestamptz not null default now(),
  retention_category text not null default 'anonymous_event',
  retention_days integer not null default 395 check (retention_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz,
  constraint behavioral_events_identity_or_anonymous_chk check (identity_id is not null or anonymous_id is not null or session_id is not null)
);

comment on table leadflow.behavioral_events is
  'Anonymous and identified behavioral telemetry with provenance; keep anonymous analytics separate from identified lead profiles.';

create table leadflow.derived_features (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  identity_id uuid references leadflow.identities(id) on delete cascade,
  profile_id uuid references leadflow.profiles(id) on delete cascade,
  feature_namespace text not null,
  feature_key text not null,
  feature_value jsonb not null,
  model_name text,
  model_version text,
  source_answer_ids uuid[] not null default '{}',
  source_event_ids uuid[] not null default '{}',
  provenance jsonb not null default '{}',
  calculated_at timestamptz not null default now(),
  expires_at timestamptz,
  retention_category text not null default 'derived_feature',
  retention_days integer not null default 730 check (retention_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz,
  constraint derived_features_subject_chk check (identity_id is not null or profile_id is not null)
);

comment on table leadflow.derived_features is
  'Engineered features generated from disclosed answers and events, with source ids and model provenance.';

create table leadflow.score_runs (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  vertical leadflow.vertical not null default 'general',
  model_name text not null,
  model_version text not null,
  scoring_purpose text not null,
  parameters jsonb not null default '{}',
  lifecycle_stage leadflow.lifecycle_stage not null default 'known',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz,
  constraint score_runs_completed_after_start_chk check (completed_at is null or completed_at >= started_at)
);

comment on table leadflow.score_runs is
  'Batch or realtime scoring run metadata for predictive lead, fit, urgency, and channel-preference models.';

create table leadflow.scores (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  score_run_id uuid not null references leadflow.score_runs(id) on delete restrict,
  identity_id uuid references leadflow.identities(id) on delete cascade,
  profile_id uuid references leadflow.profiles(id) on delete cascade,
  consent_ledger_id uuid references leadflow.consent_ledger(id) on delete set null,
  score_type text not null,
  score_value numeric(7,3) not null check (score_value between 0 and 100),
  score_band text not null check (score_band in ('low', 'medium', 'high', 'critical')),
  explanation jsonb not null default '{}',
  feature_snapshot jsonb not null default '{}',
  calculated_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz,
  constraint scores_subject_chk check (identity_id is not null or profile_id is not null)
);

comment on table leadflow.scores is
  'Per-profile or per-identity predictive scores with explanations, feature snapshots, and ADMT consent linkage.';

create table leadflow.partner_entitlements (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  buyer_partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  identity_id uuid references leadflow.identities(id) on delete restrict,
  profile_id uuid references leadflow.profiles(id) on delete restrict,
  consent_ledger_id uuid not null references leadflow.consent_ledger(id) on delete restrict,
  exclusivity_level leadflow.exclusivity_level not null,
  vertical leadflow.vertical not null default 'general',
  allowed_scopes leadflow.consent_scope[] not null,
  allowed_sales_channels leadflow.sales_channel[] not null default '{}',
  lifecycle_stage leadflow.lifecycle_stage not null default 'routed',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  entitlement_reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz,
  constraint partner_entitlements_subject_chk check (identity_id is not null or profile_id is not null),
  constraint partner_entitlements_not_self_chk check (partner_account_id <> buyer_partner_account_id),
  constraint partner_entitlements_expiry_chk check (expires_at is null or expires_at > starts_at)
);

comment on table leadflow.partner_entitlements is
  'Explicit buyer access grants proving which partner can receive which lead/profile under which consent scope and exclusivity level.';

create table leadflow.suppression_requests (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  identity_id uuid references leadflow.identities(id) on delete set null,
  email_sha256 text,
  phone_sha256 text,
  scope leadflow.consent_scope not null,
  global_to_platform boolean not null default false,
  reason text,
  source leadflow.sales_channel not null default 'web_quiz',
  provenance jsonb not null default '{}',
  requested_at timestamptz not null default now(),
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz,
  constraint suppression_subject_chk check (identity_id is not null or email_sha256 is not null or phone_sha256 is not null)
);

comment on table leadflow.suppression_requests is
  'Do-not-contact, do-not-sell/share, revocation, and suppression records used to block routing, export, and outreach.';

create table leadflow.dsar_requests (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  identity_id uuid references leadflow.identities(id) on delete set null,
  request_type text not null check (request_type in ('access', 'delete', 'correct', 'do_not_sell_share', 'admt_opt_out', 'do_not_contact')),
  status text not null default 'received' check (status in ('received', 'verifying', 'processing', 'completed', 'denied', 'expired')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'failed')),
  request_payload jsonb not null default '{}',
  response_payload jsonb not null default '{}',
  submitted_at timestamptz not null default now(),
  due_at timestamptz not null default (now() + interval '45 days'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz
);

comment on table leadflow.dsar_requests is
  'Consumer privacy requests for access, deletion, correction, sale/share opt-out, ADMT opt-out, and do-not-contact workflows.';

create table leadflow.audit_log (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid references leadflow.partner_accounts(id) on delete set null,
  actor_user_id uuid,
  actor_type text not null default 'system' check (actor_type in ('system', 'consumer', 'partner_user', 'admin', 'webhook')),
  action text not null,
  object_schema text not null default 'leadflow',
  object_table text not null,
  object_id uuid,
  before_redacted jsonb not null default '{}',
  after_redacted jsonb not null default '{}',
  request_id text,
  ip_hash text,
  user_agent_hash text,
  provenance jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table leadflow.audit_log is
  'Append-only operational audit log for consent, routing, scoring, export, DSAR, suppression, and admin changes.';

create table leadflow.exports (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  buyer_partner_account_id uuid references leadflow.partner_accounts(id) on delete restrict,
  created_by_user_id uuid,
  export_type text not null check (export_type in ('exclusive_leads', 'named_partner_leads', 'aggregated_insights', 'dsar_access', 'suppression_sync')),
  lifecycle_stage leadflow.lifecycle_stage not null default 'routed',
  row_count integer not null default 0 check (row_count >= 0),
  filter_summary jsonb not null default '{}',
  entitlement_ids uuid[] not null default '{}',
  storage_path text,
  checksum_sha256 text,
  generated_at timestamptz,
  downloaded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz
);

comment on table leadflow.exports is
  'Tracked lead, insight, DSAR, and suppression exports with entitlement references, checksums, storage path, and expiry.';

create table leadflow.webhooks (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  endpoint_url text not null,
  event_types text[] not null,
  signing_secret_ref text,
  lifecycle_stage leadflow.lifecycle_stage not null default 'known',
  metadata jsonb not null default '{}',
  last_delivery_at timestamptz,
  last_error text,
  failure_count integer not null default 0 check (failure_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  delete_after_at timestamptz,
  hard_deleted_at timestamptz
);

comment on table leadflow.webhooks is
  'Partner webhook endpoints for consent-safe lead routing, export notifications, suppression sync, and score events.';

create unique index if not exists partner_accounts_owner_name_uidx
  on leadflow.partner_accounts(owner_user_id, lower(name))
  where deleted_at is null;

create unique index if not exists identities_partner_anonymous_uidx
  on leadflow.identities(partner_account_id, anonymous_id)
  where anonymous_id is not null and deleted_at is null;

create unique index if not exists identities_partner_email_uidx
  on leadflow.identities(partner_account_id, lower(email::text))
  where email is not null and deleted_at is null;

create unique index if not exists identities_partner_phone_uidx
  on leadflow.identities(partner_account_id, phone_e164)
  where phone_e164 is not null and deleted_at is null;

create unique index if not exists questionnaires_partner_slug_uidx
  on leadflow.questionnaires(partner_account_id, slug)
  where deleted_at is null;

create unique index if not exists question_versions_questionnaire_version_uidx
  on leadflow.question_versions(questionnaire_id, version_number)
  where deleted_at is null;

create unique index if not exists partner_entitlements_exclusive_profile_uidx
  on leadflow.partner_entitlements(profile_id)
  where exclusivity_level = 'exclusive_single_seller'
    and revoked_at is null
    and deleted_at is null;

create index if not exists identities_partner_stage_idx on leadflow.identities(partner_account_id, lifecycle_stage, updated_at desc);
create index if not exists identities_stitch_group_idx on leadflow.identities(stitch_group_id);
create index if not exists profiles_partner_vertical_stage_idx on leadflow.profiles(partner_account_id, vertical, lifecycle_stage, updated_at desc);
create index if not exists profiles_identity_idx on leadflow.profiles(identity_id);
create index if not exists consent_partner_identity_scope_idx on leadflow.consent_ledger(partner_account_id, identity_id, scope, effective_at desc);
create index if not exists consent_active_scope_idx on leadflow.consent_ledger(scope, buyer_partner_account_id, effective_at desc) where granted = true and revoked_at is null and deleted_at is null;
create index if not exists questionnaires_partner_vertical_idx on leadflow.questionnaires(partner_account_id, vertical);
create index if not exists answers_partner_profile_time_idx on leadflow.answers(partner_account_id, profile_id, occurred_at desc);
create index if not exists answers_question_key_idx on leadflow.answers(partner_account_id, question_key);
create index if not exists answers_value_gin_idx on leadflow.answers using gin(answer_value);
create index if not exists behavioral_events_partner_time_idx on leadflow.behavioral_events(partner_account_id, occurred_at desc);
create index if not exists behavioral_events_identity_time_idx on leadflow.behavioral_events(identity_id, occurred_at desc);
create index if not exists behavioral_events_payload_gin_idx on leadflow.behavioral_events using gin(event_payload);
create index if not exists derived_features_subject_key_idx on leadflow.derived_features(partner_account_id, profile_id, feature_namespace, feature_key);
create index if not exists score_runs_partner_model_idx on leadflow.score_runs(partner_account_id, model_name, model_version, started_at desc);
create index if not exists scores_partner_profile_type_idx on leadflow.scores(partner_account_id, profile_id, score_type, calculated_at desc);
create index if not exists scores_high_band_idx on leadflow.scores(partner_account_id, score_type, score_value desc) where score_band in ('high', 'critical') and deleted_at is null;
create index if not exists partner_entitlements_buyer_idx on leadflow.partner_entitlements(buyer_partner_account_id, lifecycle_stage, starts_at desc);
create index if not exists partner_entitlements_profile_idx on leadflow.partner_entitlements(profile_id, exclusivity_level);
create index if not exists suppression_partner_scope_idx on leadflow.suppression_requests(partner_account_id, scope, effective_at desc);
create index if not exists suppression_email_idx on leadflow.suppression_requests(email_sha256) where email_sha256 is not null;
create index if not exists suppression_phone_idx on leadflow.suppression_requests(phone_sha256) where phone_sha256 is not null;
create index if not exists dsar_partner_status_due_idx on leadflow.dsar_requests(partner_account_id, status, due_at);
create index if not exists audit_log_partner_time_idx on leadflow.audit_log(partner_account_id, occurred_at desc);
create index if not exists audit_log_object_idx on leadflow.audit_log(object_schema, object_table, object_id);
create index if not exists exports_partner_type_idx on leadflow.exports(partner_account_id, export_type, created_at desc);
create index if not exists webhooks_partner_stage_idx on leadflow.webhooks(partner_account_id, lifecycle_stage);

create trigger set_partner_accounts_updated_at before update on leadflow.partner_accounts for each row execute function leadflow.set_updated_at();
create trigger set_identities_updated_at before update on leadflow.identities for each row execute function leadflow.set_updated_at();
create trigger set_profiles_updated_at before update on leadflow.profiles for each row execute function leadflow.set_updated_at();
create trigger set_consent_ledger_updated_at before update on leadflow.consent_ledger for each row execute function leadflow.set_updated_at();
create trigger set_questionnaires_updated_at before update on leadflow.questionnaires for each row execute function leadflow.set_updated_at();
create trigger set_question_versions_updated_at before update on leadflow.question_versions for each row execute function leadflow.set_updated_at();
create trigger set_answers_updated_at before update on leadflow.answers for each row execute function leadflow.set_updated_at();
create trigger set_behavioral_events_updated_at before update on leadflow.behavioral_events for each row execute function leadflow.set_updated_at();
create trigger set_derived_features_updated_at before update on leadflow.derived_features for each row execute function leadflow.set_updated_at();
create trigger set_score_runs_updated_at before update on leadflow.score_runs for each row execute function leadflow.set_updated_at();
create trigger set_scores_updated_at before update on leadflow.scores for each row execute function leadflow.set_updated_at();
create trigger set_partner_entitlements_updated_at before update on leadflow.partner_entitlements for each row execute function leadflow.set_updated_at();
create trigger set_suppression_requests_updated_at before update on leadflow.suppression_requests for each row execute function leadflow.set_updated_at();
create trigger set_dsar_requests_updated_at before update on leadflow.dsar_requests for each row execute function leadflow.set_updated_at();
create trigger set_exports_updated_at before update on leadflow.exports for each row execute function leadflow.set_updated_at();
create trigger set_webhooks_updated_at before update on leadflow.webhooks for each row execute function leadflow.set_updated_at();

create or replace function leadflow.can_access_partner(target_partner_account_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from leadflow.partner_accounts pa
    where pa.id = target_partner_account_id
      and pa.deleted_at is null
      and (
        (select auth.uid()) = pa.owner_user_id
        or (select auth.uid()) = any(pa.team_user_ids)
      )
  );
$$;

alter table leadflow.partner_accounts enable row level security;
alter table leadflow.identities enable row level security;
alter table leadflow.profiles enable row level security;
alter table leadflow.consent_ledger enable row level security;
alter table leadflow.questionnaires enable row level security;
alter table leadflow.question_versions enable row level security;
alter table leadflow.answers enable row level security;
alter table leadflow.behavioral_events enable row level security;
alter table leadflow.derived_features enable row level security;
alter table leadflow.score_runs enable row level security;
alter table leadflow.scores enable row level security;
alter table leadflow.partner_entitlements enable row level security;
alter table leadflow.suppression_requests enable row level security;
alter table leadflow.dsar_requests enable row level security;
alter table leadflow.audit_log enable row level security;
alter table leadflow.exports enable row level security;
alter table leadflow.webhooks enable row level security;

create policy partner_accounts_select_own on leadflow.partner_accounts
  for select to authenticated
  using (deleted_at is null and ((select auth.uid()) = owner_user_id or (select auth.uid()) = any(team_user_ids)));

create policy partner_accounts_insert_own on leadflow.partner_accounts
  for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);

create policy partner_accounts_update_own on leadflow.partner_accounts
  for update to authenticated
  using (deleted_at is null and ((select auth.uid()) = owner_user_id or (select auth.uid()) = any(team_user_ids)))
  with check ((select auth.uid()) = owner_user_id or (select auth.uid()) = any(team_user_ids));

create policy identities_partner_access on leadflow.identities
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy profiles_partner_access on leadflow.profiles
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy consent_ledger_partner_access on leadflow.consent_ledger
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id) or leadflow.can_access_partner(buyer_partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy questionnaires_partner_access on leadflow.questionnaires
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy question_versions_partner_access on leadflow.question_versions
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy answers_partner_access on leadflow.answers
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy behavioral_events_partner_access on leadflow.behavioral_events
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy derived_features_partner_access on leadflow.derived_features
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy score_runs_partner_access on leadflow.score_runs
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy scores_partner_access on leadflow.scores
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy partner_entitlements_select_parties on leadflow.partner_entitlements
  for select to authenticated
  using (leadflow.can_access_partner(partner_account_id) or leadflow.can_access_partner(buyer_partner_account_id));

create policy partner_entitlements_write_owner on leadflow.partner_entitlements
  for insert to authenticated
  with check (leadflow.can_access_partner(partner_account_id));

create policy partner_entitlements_update_owner on leadflow.partner_entitlements
  for update to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy suppression_requests_partner_access on leadflow.suppression_requests
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy dsar_requests_partner_access on leadflow.dsar_requests
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy audit_log_partner_read on leadflow.audit_log
  for select to authenticated
  using (partner_account_id is not null and leadflow.can_access_partner(partner_account_id));

create policy audit_log_partner_insert on leadflow.audit_log
  for insert to authenticated
  with check (partner_account_id is not null and leadflow.can_access_partner(partner_account_id));

create policy exports_partner_access on leadflow.exports
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id) or leadflow.can_access_partner(buyer_partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create policy webhooks_partner_access on leadflow.webhooks
  for all to authenticated
  using (leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_access_partner(partner_account_id));

create or replace view leadflow.exclusive_leads
with (security_invoker = true)
as
select
  pe.id as entitlement_id,
  pe.partner_account_id,
  pe.buyer_partner_account_id,
  pe.profile_id,
  pe.identity_id,
  p.vertical,
  p.lifecycle_stage,
  p.preference_summary,
  p.normalized_attributes,
  s.score_value as latest_score,
  s.score_band as latest_score_band,
  pe.starts_at,
  pe.expires_at
from leadflow.partner_entitlements pe
join leadflow.profiles p on p.id = pe.profile_id
left join lateral (
  select sc.score_value, sc.score_band
  from leadflow.scores sc
  where sc.profile_id = pe.profile_id
    and sc.deleted_at is null
  order by sc.calculated_at desc
  limit 1
) s on true
where pe.exclusivity_level = 'exclusive_single_seller'
  and pe.revoked_at is null
  and pe.deleted_at is null
  and p.deleted_at is null
  and p.suppression_flag = false
  and not exists (
    select 1 from leadflow.suppression_requests sr
    where sr.partner_account_id = pe.partner_account_id
      and sr.identity_id = pe.identity_id
      and sr.deleted_at is null
      and sr.effective_at <= now()
      and (sr.expires_at is null or sr.expires_at > now())
  );

comment on view leadflow.exclusive_leads is
  'Security-invoker view for active exclusive single-seller lead entitlements; excludes deleted and suppressed profiles.';

create or replace view leadflow.named_partner_leads
with (security_invoker = true)
as
select
  pe.id as entitlement_id,
  pe.partner_account_id,
  pe.buyer_partner_account_id,
  pe.profile_id,
  pe.identity_id,
  p.vertical,
  p.lifecycle_stage,
  p.preference_summary,
  p.normalized_attributes,
  s.score_value as latest_score,
  s.score_band as latest_score_band,
  pe.allowed_scopes,
  pe.starts_at,
  pe.expires_at
from leadflow.partner_entitlements pe
join leadflow.profiles p on p.id = pe.profile_id
left join lateral (
  select sc.score_value, sc.score_band
  from leadflow.scores sc
  where sc.profile_id = pe.profile_id
    and sc.deleted_at is null
  order by sc.calculated_at desc
  limit 1
) s on true
where pe.exclusivity_level = 'named_multi_partner'
  and pe.revoked_at is null
  and pe.deleted_at is null
  and p.deleted_at is null
  and p.suppression_flag = false
  and not exists (
    select 1 from leadflow.suppression_requests sr
    where sr.partner_account_id = pe.partner_account_id
      and sr.identity_id = pe.identity_id
      and sr.deleted_at is null
      and sr.effective_at <= now()
      and (sr.expires_at is null or sr.expires_at > now())
  );

comment on view leadflow.named_partner_leads is
  'Security-invoker view for leads routed only to named buyer partners selected by consent or entitlement.';

create or replace view leadflow.aggregated_insights
with (security_invoker = true)
as
with eligible_profiles as (
  select
    p.id,
    p.identity_id,
    p.partner_account_id,
    p.vertical,
    p.sales_channel,
    p.created_at,
    p.normalized_attributes,
    (
      select sc.score_value
      from leadflow.scores sc
      where sc.profile_id = p.id
        and sc.deleted_at is null
      order by sc.calculated_at desc
      limit 1
    ) as latest_score
  from leadflow.profiles p
  where p.deleted_at is null
    and p.suppression_flag = false
    and exists (
      select 1
      from leadflow.consent_ledger cl
      where cl.profile_id = p.id
        and cl.scope = 'aggregated_insights'
        and cl.granted = true
        and cl.revoked_at is null
        and cl.deleted_at is null
        and (cl.expires_at is null or cl.expires_at > now())
    )
),
cohorts as (
  select
    partner_account_id,
    vertical,
    sales_channel,
    date_trunc('day', created_at)::date as insight_date,
    count(distinct id) as profile_count,
    count(distinct identity_id) as identity_count,
    avg(latest_score) filter (where latest_score is not null) as avg_latest_score,
    percentile_cont(0.5) within group (order by latest_score) filter (where latest_score is not null) as median_latest_score
  from eligible_profiles
  group by partner_account_id, vertical, sales_channel, date_trunc('day', created_at)::date
  having count(distinct id) >= 5
),
attribute_counts as (
  select
    ep.partner_account_id,
    ep.vertical,
    ep.sales_channel,
    date_trunc('day', ep.created_at)::date as insight_date,
    attrs.key,
    count(*) as value_count
  from eligible_profiles ep
  cross join lateral jsonb_each_text(ep.normalized_attributes) as attrs(key, value)
  group by ep.partner_account_id, ep.vertical, ep.sales_channel, date_trunc('day', ep.created_at)::date, attrs.key
),
ranked_attributes as (
  select
    ac.*,
    row_number() over (
      partition by partner_account_id, vertical, sales_channel, insight_date
      order by value_count desc, key asc
    ) as rank
  from attribute_counts ac
)
select
  c.partner_account_id,
  c.vertical,
  c.sales_channel,
  c.insight_date,
  c.profile_count,
  c.identity_count,
  c.avg_latest_score,
  c.median_latest_score,
  coalesce(
    jsonb_object_agg(ra.key, ra.value_count) filter (where ra.key is not null and ra.rank <= 10),
    '{}'::jsonb
  ) as top_attribute_counts
from cohorts c
left join ranked_attributes ra
  on ra.partner_account_id = c.partner_account_id
  and ra.vertical = c.vertical
  and ra.sales_channel = c.sales_channel
  and ra.insight_date = c.insight_date
group by c.partner_account_id, c.vertical, c.sales_channel, c.insight_date, c.profile_count, c.identity_count, c.avg_latest_score, c.median_latest_score;

comment on view leadflow.aggregated_insights is
  'Security-invoker aggregate view for consented insight products; applies a minimum group threshold to avoid one-person reporting.';

grant usage on schema leadflow to authenticated, service_role;
grant execute on function leadflow.can_access_partner(uuid) to authenticated, service_role;
grant select, insert, update on all tables in schema leadflow to authenticated;
grant select on leadflow.exclusive_leads to authenticated;
grant select on leadflow.named_partner_leads to authenticated;
grant select on leadflow.aggregated_insights to authenticated;
grant all on all tables in schema leadflow to service_role;
grant all on all routines in schema leadflow to service_role;

-- Retention operation notes:
-- 1. Soft delete first: set deleted_at = now(), lifecycle_stage = 'deleted' where present,
--    and delete_after_at = now() + a policy-specific grace interval.
-- 2. Hard delete later from shortest-lived child records first: behavioral_events, answers,
--    derived_features, scores, partner_entitlements, profiles, identities.
-- 3. Keep audit_log redacted and append-only. Do not store raw answer text, raw PII, or secrets in audit rows.
-- 4. Anonymous analytics should use shorter retention than identified lead/profile records.
-- 5. Suppression records may need longer retention than marketing records so opt-outs remain enforceable.
-- 6. For California-style sale/share or ADMT opt-out, write both consent_ledger revocation and a suppression_requests row.
