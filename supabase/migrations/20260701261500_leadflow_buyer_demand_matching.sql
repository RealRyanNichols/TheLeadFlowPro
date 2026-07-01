-- LeadFlow Pro Buyer Demand Matching Engine.
-- Stores buyer-safe recommendation summaries that connect buyer requests to
-- marketplace listings, segments, samples, lead profiles, tools, or custom sourcing.

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

create table if not exists leadflow.buyer_match_results (
  id uuid primary key default gen_random_uuid(),
  buyer_request_id uuid not null references leadflow.buyer_requests(id) on delete cascade,
  buyer_account_id uuid references leadflow.buyer_accounts(id) on delete cascade,
  matched_entity_type text not null,
  matched_entity_id text not null,
  listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  segment_id uuid references leadflow.segments(id) on delete set null,
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null,
  sample_id uuid references leadflow.samples(id) on delete set null,
  tool_slug text,
  match_score numeric(6,2) not null default 0,
  match_label text not null default 'Possible match',
  match_reasons jsonb not null default '[]',
  score_components jsonb not null default '{}',
  recommended_action text not null default 'request_access',
  missing_buyer_info jsonb not null default '[]',
  caution_note text,
  status text not null default 'active',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint buyer_match_results_entity_type_check
    check (matched_entity_type in (
      'marketplace_listing',
      'segment',
      'lead_profile',
      'sample',
      'tool',
      'custom_sourcing'
    )),
  constraint buyer_match_results_action_check
    check (recommended_action in (
      'request_sample',
      'request_access',
      'request_exclusive',
      'complete_buyer_profile',
      'book_fit_call',
      'start_tool',
      'request_custom_sourcing',
      'join_waitlist',
      'no_match_found'
    )),
  constraint buyer_match_results_score_check
    check (match_score >= 0 and match_score <= 100),
  constraint buyer_match_results_status_check
    check (status in ('active', 'archived', 'dismissed')),
  constraint buyer_match_results_unique_entity
    unique (buyer_request_id, matched_entity_type, matched_entity_id)
);

comment on table leadflow.buyer_match_results is
  'Buyer-safe demand matching results. Results store recommendation summaries, component scores, reasons, and next actions, not raw answers, hidden source notes, contact fields, or admin notes.';
comment on column leadflow.buyer_match_results.match_reasons is
  'Plain-English buyer-safe reasons for the match. Do not store raw questionnaire answers or sensitive data.';
comment on column leadflow.buyer_match_results.score_components is
  'Explainable component scores for industry, geography, buyer type, budget, urgency, access model, source type, confidence, compliance, and availability.';
comment on column leadflow.buyer_match_results.missing_buyer_info is
  'Missing buyer fields needed to improve matching, such as industry, geography, buyer type, budget range, intended use, or access preference.';
comment on column leadflow.buyer_match_results.metadata is
  'Buyer-safe display metadata only. Do not store private contact fields, protected traits, raw answers, hidden source notes, or individual political persuasion labels.';

create index if not exists buyer_match_results_request_score_idx
  on leadflow.buyer_match_results(buyer_request_id, match_score desc, created_at desc)
  where status = 'active';
create index if not exists buyer_match_results_buyer_score_idx
  on leadflow.buyer_match_results(buyer_account_id, match_score desc, created_at desc)
  where status = 'active';
create index if not exists buyer_match_results_action_idx
  on leadflow.buyer_match_results(recommended_action, match_score desc, created_at desc)
  where status = 'active';
create index if not exists buyer_match_results_entity_idx
  on leadflow.buyer_match_results(matched_entity_type, matched_entity_id);

alter table leadflow.buyer_match_results enable row level security;
alter table leadflow.buyer_match_results force row level security;

drop policy if exists buyer_match_results_admin_all on leadflow.buyer_match_results;
create policy buyer_match_results_admin_all on leadflow.buyer_match_results
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists buyer_match_results_select_own on leadflow.buyer_match_results;
create policy buyer_match_results_select_own on leadflow.buyer_match_results
  for select to authenticated
  using (
    status = 'active'
    and buyer_account_id = any(leadflow.current_buyer_account_ids())
  );

grant usage on schema leadflow to authenticated, service_role;
grant select on leadflow.buyer_match_results to authenticated;
grant select, insert, update, delete on leadflow.buyer_match_results to service_role;

drop trigger if exists set_buyer_match_results_updated_at on leadflow.buyer_match_results;
create trigger set_buyer_match_results_updated_at
  before update on leadflow.buyer_match_results
  for each row execute function leadflow.set_updated_at();

grant select, insert on leadflow.audit_log to service_role;
grant select, insert on leadflow.events to service_role;
