-- LeadFlow Segment Builder.
-- Admin-only saved segments for turning reviewed, permissioned, source-backed,
-- consent-aware records into sellable lead products.

create schema if not exists leadflow;
create extension if not exists pgcrypto;

create table if not exists leadflow.segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  segment_type text not null check (segment_type in (
    'lead_profiles',
    'buyer_requests',
    'marketplace_listings',
    'submitted_sources',
    'questionnaire_responses',
    'aggregate_civic_signals'
  )),
  vertical text,
  category text,
  status text not null default 'review' check (status in ('draft', 'review', 'active', 'blocked', 'archived')),
  visibility text not null default 'internal' check (visibility in ('internal', 'buyer_preview', 'buyer_visible')),
  created_by text,
  last_run_at timestamptz,
  member_count integer not null default 0 check (member_count >= 0),
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'prohibited')),
  compliance_status text not null default 'needs_review' check (compliance_status in ('ready', 'needs_review', 'blocked', 'aggregate_only')),
  rule_summary jsonb not null default '{}',
  quality_summary jsonb not null default '{}',
  compliance_warnings jsonb not null default '[]',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.segments is
  'Admin-created saved rule sets that group reviewed, permissioned, source-backed, consent-aware records into product candidates. Not public or buyer-visible by default.';
comment on column leadflow.segments.segment_type is
  'Source object type for the segment. Civic data must stay aggregate_civic_signals unless explicit legal and consent review approves another path.';
comment on column leadflow.segments.visibility is
  'Internal by default. Buyer visibility should only be enabled after compliance, proof, suppression, and buyer-use review.';
comment on column leadflow.segments.compliance_warnings is
  'Safe, audit-facing warnings. Do not store raw answers, contact details, protected traits, medical data, private financial data, or individual political persuasion data.';

create table if not exists leadflow.segment_rules (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references leadflow.segments(id) on delete cascade,
  field text not null check (field in (
    'vertical',
    'category',
    'score_range',
    'confidence',
    'source_type',
    'freshness',
    'review_status',
    'compliance_status',
    'suppression_status',
    'location',
    'buyer_type',
    'budget_range',
    'tool_slug',
    'consent_status',
    'source_proof_status',
    'recommended_next_action',
    'marketplace_status'
  )),
  operator text not null check (operator in (
    'equals',
    'not_equals',
    'contains',
    'greater_than',
    'less_than',
    'between',
    'in',
    'not_in',
    'exists',
    'not_exists'
  )),
  value jsonb,
  rule_group text not null default 'and' check (rule_group in ('and', 'or')),
  rule_order integer not null default 1 check (rule_order > 0),
  created_at timestamptz not null default now()
);

comment on table leadflow.segment_rules is
  'Dropdown-built segment rules. Raw SQL, prohibited sensitive fields, and hidden targeting rules are not supported.';
comment on column leadflow.segment_rules.field is
  'Allowlisted rule field. Race, religion, medical status, sexual orientation, minors, private financial accounts, hacked/leaked data, and individual political persuasion fields are intentionally absent.';
comment on column leadflow.segment_rules.value is
  'Rule value stored as JSON for strings, lists, and ranges. Values must stay free of raw PII and sensitive traits.';

create table if not exists leadflow.segment_runs (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references leadflow.segments(id) on delete cascade,
  status text not null default 'completed' check (status in ('queued', 'running', 'completed', 'blocked', 'failed')),
  estimated_count integer not null default 0 check (estimated_count >= 0),
  member_count integer not null default 0 check (member_count >= 0),
  suppression_count integer not null default 0 check (suppression_count >= 0),
  high_risk_count integer not null default 0 check (high_risk_count >= 0),
  missing_source_proof_count integer not null default 0 check (missing_source_proof_count >= 0),
  risk_warnings jsonb not null default '[]',
  compliance_warnings jsonb not null default '[]',
  blocked_reason text,
  run_by text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table leadflow.segment_runs is
  'Append-only segment execution records with safety counts and warnings. Every product-facing segment run should be auditable.';
comment on column leadflow.segment_runs.blocked_reason is
  'Reason the run was blocked, such as prohibited data, sensitive political targeting, or unsupported rule fields.';

create table if not exists leadflow.segment_members (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references leadflow.segments(id) on delete cascade,
  segment_run_id uuid references leadflow.segment_runs(id) on delete set null,
  member_entity_type text not null check (member_entity_type in (
    'lead_profiles',
    'buyer_requests',
    'marketplace_listings',
    'submitted_sources',
    'questionnaire_responses',
    'aggregate_civic_signals'
  )),
  member_entity_id text not null,
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete cascade,
  buyer_request_id uuid references leadflow.buyer_requests(id) on delete cascade,
  marketplace_listing_id uuid references leadflow.marketplace_listings(id) on delete cascade,
  submitted_source_id uuid references leadflow.submitted_sources(id) on delete cascade,
  score numeric(6,2) check (score is null or (score >= 0 and score <= 100)),
  confidence text,
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'prohibited')),
  compliance_status text not null default 'needs_review',
  suppression_status text not null default 'unchecked',
  source_proof_status text not null default 'review',
  export_eligible boolean not null default false,
  snapshot jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table leadflow.segment_members is
  'Members captured for a segment run. Suppressed and prohibited records must not be exported or sold.';
comment on column leadflow.segment_members.snapshot is
  'Buyer-safe member summary used for admin review. Do not include raw answers, private contact fields, admin notes, or sensitive data.';

create index if not exists segments_type_status_idx
  on leadflow.segments(segment_type, status, updated_at desc)
  where deleted_at is null;
create index if not exists segments_vertical_idx
  on leadflow.segments(vertical, category, compliance_status, updated_at desc)
  where deleted_at is null;
create index if not exists segments_risk_idx
  on leadflow.segments(risk_level, compliance_status, updated_at desc)
  where deleted_at is null;

create index if not exists segment_rules_segment_idx
  on leadflow.segment_rules(segment_id, rule_group, rule_order);
create index if not exists segment_rules_field_idx
  on leadflow.segment_rules(field, operator);

create index if not exists segment_runs_segment_idx
  on leadflow.segment_runs(segment_id, created_at desc);
create index if not exists segment_runs_status_idx
  on leadflow.segment_runs(status, created_at desc);

create index if not exists segment_members_segment_idx
  on leadflow.segment_members(segment_id, created_at desc);
create index if not exists segment_members_run_idx
  on leadflow.segment_members(segment_run_id, created_at desc);
create index if not exists segment_members_entity_idx
  on leadflow.segment_members(member_entity_type, member_entity_id);
create index if not exists segment_members_export_idx
  on leadflow.segment_members(segment_id, export_eligible, risk_level, suppression_status);

alter table leadflow.segments enable row level security;
alter table leadflow.segment_rules enable row level security;
alter table leadflow.segment_runs enable row level security;
alter table leadflow.segment_members enable row level security;

alter table leadflow.segments force row level security;
alter table leadflow.segment_rules force row level security;
alter table leadflow.segment_runs force row level security;
alter table leadflow.segment_members force row level security;

drop policy if exists segments_admin_all on leadflow.segments;
create policy segments_admin_all on leadflow.segments
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists segment_rules_admin_all on leadflow.segment_rules;
create policy segment_rules_admin_all on leadflow.segment_rules
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists segment_runs_admin_all on leadflow.segment_runs;
create policy segment_runs_admin_all on leadflow.segment_runs
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists segment_members_admin_all on leadflow.segment_members;
create policy segment_members_admin_all on leadflow.segment_members
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

grant usage on schema leadflow to authenticated, service_role;
grant select, insert, update on leadflow.segments to authenticated;
grant select, insert, update on leadflow.segment_rules to authenticated;
grant select, insert, update on leadflow.segment_runs to authenticated;
grant select, insert, update on leadflow.segment_members to authenticated;
grant all on leadflow.segments to service_role;
grant all on leadflow.segment_rules to service_role;
grant all on leadflow.segment_runs to service_role;
grant all on leadflow.segment_members to service_role;
grant select, insert on leadflow.audit_log to service_role;
grant select, insert on leadflow.events to service_role;

drop trigger if exists set_segments_updated_at on leadflow.segments;
create trigger set_segments_updated_at
  before update on leadflow.segments
  for each row execute function leadflow.set_updated_at();

-- ---------------------------------------------------------------------------
-- Safe test segments
-- ---------------------------------------------------------------------------

insert into leadflow.segments (
  name,
  description,
  segment_type,
  vertical,
  category,
  status,
  visibility,
  created_by,
  member_count,
  risk_level,
  compliance_status,
  metadata
)
select
  'High-score ecommerce vendor signals',
  'Reviewed ecommerce profiles with strong score ranges and source proof ready for product packaging.',
  'lead_profiles',
  'Ecommerce',
  'Vendor signals',
  'review',
  'internal',
  'seed',
  0,
  'low',
  'needs_review',
  '{"seed": true}'::jsonb
where not exists (
  select 1 from leadflow.segments where name = 'High-score ecommerce vendor signals'
);

insert into leadflow.segments (
  name,
  description,
  segment_type,
  vertical,
  category,
  status,
  visibility,
  created_by,
  member_count,
  risk_level,
  compliance_status,
  metadata
)
select
  'Buyer requests over 1500',
  'Buyer requests with enough budget clarity to route into matching or custom sourcing.',
  'buyer_requests',
  'Ecommerce',
  'Buyer demand',
  'active',
  'internal',
  'seed',
  0,
  'low',
  'ready',
  '{"seed": true}'::jsonb
where not exists (
  select 1 from leadflow.segments where name = 'Buyer requests over 1500'
);

insert into leadflow.segments (
  name,
  description,
  segment_type,
  vertical,
  category,
  status,
  visibility,
  created_by,
  member_count,
  risk_level,
  compliance_status,
  metadata
)
select
  'Civic issue pulse aggregate',
  'Aggregate issue-level civic signals only. No person-level persuasion labels.',
  'aggregate_civic_signals',
  'Civic',
  'Issue pulse',
  'review',
  'internal',
  'seed',
  0,
  'low',
  'aggregate_only',
  '{"seed": true}'::jsonb
where not exists (
  select 1 from leadflow.segments where name = 'Civic issue pulse aggregate'
);

insert into leadflow.segment_rules (segment_id, field, operator, value, rule_group, rule_order)
select s.id, 'vertical', 'equals', '"Ecommerce"'::jsonb, 'and', 1
from leadflow.segments s
where s.name = 'High-score ecommerce vendor signals'
  and not exists (select 1 from leadflow.segment_rules r where r.segment_id = s.id and r.field = 'vertical');

insert into leadflow.segment_rules (segment_id, field, operator, value, rule_group, rule_order)
select s.id, 'score_range', 'in', '["75-89", "90-100"]'::jsonb, 'and', 2
from leadflow.segments s
where s.name = 'High-score ecommerce vendor signals'
  and not exists (select 1 from leadflow.segment_rules r where r.segment_id = s.id and r.field = 'score_range');

insert into leadflow.segment_rules (segment_id, field, operator, value, rule_group, rule_order)
select s.id, 'source_proof_status', 'exists', null, 'and', 3
from leadflow.segments s
where s.name = 'High-score ecommerce vendor signals'
  and not exists (select 1 from leadflow.segment_rules r where r.segment_id = s.id and r.field = 'source_proof_status');

insert into leadflow.segment_rules (segment_id, field, operator, value, rule_group, rule_order)
select s.id, 'budget_range', 'contains', '"$1,500"'::jsonb, 'and', 1
from leadflow.segments s
where s.name = 'Buyer requests over 1500'
  and not exists (select 1 from leadflow.segment_rules r where r.segment_id = s.id and r.field = 'budget_range');

insert into leadflow.segment_rules (segment_id, field, operator, value, rule_group, rule_order)
select s.id, 'compliance_status', 'equals', '"aggregate_only"'::jsonb, 'and', 1
from leadflow.segments s
where s.name = 'Civic issue pulse aggregate'
  and not exists (select 1 from leadflow.segment_rules r where r.segment_id = s.id and r.field = 'compliance_status');
