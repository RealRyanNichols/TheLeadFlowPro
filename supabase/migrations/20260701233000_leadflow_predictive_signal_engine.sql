-- LeadFlow Predictive Signal Engine persistence.
-- Stores explainable score outputs and buyer-safe recommendations without raw
-- answers, protected traits, hidden scraped data, minors, or sensitive fields.

create table if not exists leadflow.predictive_signal_scores (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('lead_profile', 'buyer_request', 'marketplace_listing', 'submitted_source', 'questionnaire_response')),
  entity_id text not null,
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete cascade,
  buyer_request_id uuid references leadflow.buyer_requests(id) on delete cascade,
  buyer_account_id uuid references leadflow.buyer_accounts(id) on delete cascade,
  marketplace_listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  model_name text not null default 'LeadFlow Predictive Signal Engine',
  model_version text not null,
  overall_score numeric(6,2) not null check (overall_score >= 0 and overall_score <= 100),
  score_label text not null,
  recommended_next_action text not null,
  component_scores jsonb not null default '[]',
  explanation jsonb not null default '{}',
  feature_summary jsonb not null default '{}',
  compliance_warnings jsonb not null default '[]',
  status text not null default 'active' check (status in ('active', 'review', 'archived', 'superseded')),
  review_status text not null default 'pending' check (review_status in ('pending', 'review', 'approved', 'rejected', 'suppressed')),
  created_by_user_id uuid,
  created_at timestamptz not null default now()
);

comment on table leadflow.predictive_signal_scores is
  'Explainable predictive score snapshots for profiles and buyer requests. Scores must be based on declared intent, source proof, first-party site behavior, buyer fit, freshness, and compliance readiness only.';
comment on column leadflow.predictive_signal_scores.component_scores is
  'Component score explanations. Do not store raw questionnaire answers, names, emails, phones, notes, medical data, protected traits, or private political persuasion data.';
comment on column leadflow.predictive_signal_scores.feature_summary is
  'Allowed features used and missing. Should remain safe for audit review and must not contain raw PII.';
comment on column leadflow.predictive_signal_scores.compliance_warnings is
  'Warnings that should block or slow marketplace release, buyer access, routing, or export.';

create index if not exists predictive_signal_scores_entity_idx
  on leadflow.predictive_signal_scores(entity_type, entity_id, created_at desc);
create index if not exists predictive_signal_scores_profile_idx
  on leadflow.predictive_signal_scores(lead_profile_id, created_at desc)
  where lead_profile_id is not null;
create index if not exists predictive_signal_scores_buyer_request_idx
  on leadflow.predictive_signal_scores(buyer_request_id, created_at desc)
  where buyer_request_id is not null;
create index if not exists predictive_signal_scores_buyer_account_idx
  on leadflow.predictive_signal_scores(buyer_account_id, created_at desc)
  where buyer_account_id is not null;
create index if not exists predictive_signal_scores_score_idx
  on leadflow.predictive_signal_scores(overall_score desc, review_status, created_at desc);
create index if not exists predictive_signal_scores_component_gin_idx
  on leadflow.predictive_signal_scores using gin(component_scores);

alter table leadflow.predictive_signal_scores enable row level security;
alter table leadflow.predictive_signal_scores force row level security;

drop policy if exists predictive_signal_scores_admin_all on leadflow.predictive_signal_scores;
create policy predictive_signal_scores_admin_all on leadflow.predictive_signal_scores
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists predictive_signal_scores_buyer_select_own on leadflow.predictive_signal_scores;
create policy predictive_signal_scores_buyer_select_own on leadflow.predictive_signal_scores
  for select to authenticated
  using (
    buyer_account_id is not null
    and buyer_account_id = any(leadflow.current_buyer_account_ids())
    and review_status in ('pending', 'review', 'approved')
    and status in ('active', 'review')
  );

grant usage on schema leadflow to authenticated, service_role;
grant select on leadflow.predictive_signal_scores to authenticated;
grant select, insert, update on leadflow.predictive_signal_scores to service_role;

grant select, insert on leadflow.lead_scores to service_role;
grant insert on leadflow.audit_log to service_role;
grant insert on leadflow.events to service_role;
