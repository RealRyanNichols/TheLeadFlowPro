-- LeadFlow Pro Phase 3 Supabase contract.
-- Status: review-ready SQL contract, not automatically applied.
--
-- Supabase CLI is not installed in this workspace. Before applying:
-- 1. Install or authenticate Supabase CLI/MCP.
-- 2. Run: supabase migration new phase3_machine_contract
-- 3. Move reviewed SQL into the generated migration file.
-- 4. Run on a Supabase branch or local database first.
-- 5. Run advisors and RLS tests before production.
--
-- Design notes:
-- - Use the private leadflow schema created by the existing consent platform migration.
-- - Keep RLS enabled and deny by default.
-- - Grant service_role only until partner-facing access policies are reviewed.
-- - Do not expose raw answers, contact fields, protected traits, minors, hacked/leaked data, or hidden sensitive data.

create schema if not exists leadflow;

create table if not exists leadflow.signal_products (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  title text not null,
  vertical leadflow.vertical not null default 'general',
  exclusivity_level leadflow.exclusivity_level not null default 'aggregated_only',
  lifecycle_stage leadflow.lifecycle_stage not null default 'known',
  product_type text not null check (product_type in ('exclusive_lead', 'named_partner_lead', 'aggregated_insight', 'source_package', 'weekly_report')),
  source_summary text not null,
  proof_requirements text[] not null default '{}',
  allowed_fields text[] not null default '{}',
  blocked_fields text[] not null default array[
    'ssn',
    'drivers_license',
    'financial_account',
    'biometric',
    'health',
    'race_ethnicity',
    'religion',
    'sexual_orientation',
    'political_persuasion_profile',
    'minor_data'
  ],
  aggregation_threshold integer not null default 25 check (aggregation_threshold between 5 and 10000),
  review_status text not null default 'draft' check (review_status in ('draft', 'needs_review', 'approved', 'rejected', 'suppressed', 'archived')),
  review_notes text,
  reviewed_by_user_id uuid,
  reviewed_at timestamptz,
  release_after_at timestamptz,
  expires_at timestamptz,
  provenance jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hard_deleted_at timestamptz
);

comment on table leadflow.signal_products is
  'Review-gated buyer products such as exclusive leads, named partner leads, source packages, weekly reports, and aggregated insights.';

create table if not exists leadflow.routing_decisions (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  signal_product_id uuid references leadflow.signal_products(id) on delete set null,
  identity_id uuid references leadflow.identities(id) on delete set null,
  profile_id uuid references leadflow.profiles(id) on delete set null,
  buyer_partner_account_id uuid references leadflow.partner_accounts(id) on delete restrict,
  routing_mode leadflow.exclusivity_level not null,
  consent_ledger_id uuid references leadflow.consent_ledger(id) on delete restrict,
  entitlement_id uuid references leadflow.partner_entitlements(id) on delete restrict,
  decision_status text not null default 'needs_review' check (decision_status in ('needs_review', 'approved', 'routed', 'held', 'rejected', 'expired', 'refunded')),
  reason_codes text[] not null default '{}',
  suppression_checked_at timestamptz,
  admt_opt_out_checked_at timestamptz,
  duplicate_group_key text,
  decay_window_ends_at timestamptz,
  sla_due_at timestamptz,
  refund_policy text,
  reviewer_user_id uuid,
  reviewed_at timestamptz,
  audit_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hard_deleted_at timestamptz,
  constraint routing_personal_or_product_chk check (
    signal_product_id is not null or profile_id is not null or identity_id is not null
  ),
  constraint routing_named_buyer_chk check (
    routing_mode not in ('exclusive_single_seller', 'named_multi_partner') or buyer_partner_account_id is not null
  )
);

comment on table leadflow.routing_decisions is
  'Auditable routing decisions showing why a lead or signal product was routed, held, rejected, refunded, or expired.';

create table if not exists leadflow.review_queue_items (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  source_table text not null,
  source_id uuid not null,
  queue_type text not null check (queue_type in ('source_proof', 'sensitive_data', 'suppression', 'score_review', 'route_review', 'export_review', 'dsar_review')),
  priority integer not null default 50 check (priority between 0 and 100),
  status text not null default 'open' check (status in ('open', 'in_review', 'approved', 'rejected', 'suppressed', 'closed')),
  assigned_user_id uuid,
  reviewer_user_id uuid,
  decision_reason text,
  required_checks text[] not null default '{}',
  completed_checks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  deleted_at timestamptz,
  hard_deleted_at timestamptz
);

comment on table leadflow.review_queue_items is
  'Operator queue for reviewing source proof, sensitive-data flags, suppression, scores, routing, exports, and DSAR workflows.';

create table if not exists leadflow.export_ledger (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  buyer_partner_account_id uuid references leadflow.partner_accounts(id) on delete restrict,
  signal_product_id uuid references leadflow.signal_products(id) on delete set null,
  export_type text not null check (export_type in ('sample', 'paid_access', 'aggregated_report', 'named_partner_route', 'exclusive_route')),
  allowed_fields text[] not null default '{}',
  excluded_fields text[] not null default '{}',
  record_count integer not null default 0 check (record_count >= 0),
  aggregation_threshold_met boolean not null default false,
  suppression_checked_at timestamptz,
  reviewer_user_id uuid,
  reviewed_at timestamptz,
  delivered_at timestamptz,
  expires_at timestamptz,
  status text not null default 'needs_review' check (status in ('needs_review', 'approved', 'delivered', 'revoked', 'expired', 'rejected')),
  purpose text not null,
  audit_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  hard_deleted_at timestamptz
);

comment on table leadflow.export_ledger is
  'Review-gated export ledger for buyer samples, paid access, named routes, exclusive routes, and aggregated reports.';

create index if not exists signal_products_partner_status_idx
  on leadflow.signal_products (partner_account_id, review_status, created_at desc);

create index if not exists signal_products_vertical_type_idx
  on leadflow.signal_products (vertical, product_type, review_status);

create index if not exists routing_decisions_partner_status_idx
  on leadflow.routing_decisions (partner_account_id, decision_status, created_at desc);

create index if not exists routing_decisions_buyer_idx
  on leadflow.routing_decisions (buyer_partner_account_id, decision_status, created_at desc);

create index if not exists review_queue_partner_status_idx
  on leadflow.review_queue_items (partner_account_id, status, priority desc, created_at desc);

create index if not exists export_ledger_partner_status_idx
  on leadflow.export_ledger (partner_account_id, status, created_at desc);

alter table leadflow.signal_products enable row level security;
alter table leadflow.routing_decisions enable row level security;
alter table leadflow.review_queue_items enable row level security;
alter table leadflow.export_ledger enable row level security;

revoke all on leadflow.signal_products from anon, authenticated;
revoke all on leadflow.routing_decisions from anon, authenticated;
revoke all on leadflow.review_queue_items from anon, authenticated;
revoke all on leadflow.export_ledger from anon, authenticated;

grant usage on schema leadflow to service_role;
grant select, insert, update, delete on leadflow.signal_products to service_role;
grant select, insert, update, delete on leadflow.routing_decisions to service_role;
grant select, insert, update, delete on leadflow.review_queue_items to service_role;
grant select, insert, update, delete on leadflow.export_ledger to service_role;

drop policy if exists signal_products_platform_admin_all on leadflow.signal_products;
create policy signal_products_platform_admin_all
on leadflow.signal_products
for all
to authenticated
using (leadflow.is_platform_admin())
with check (leadflow.is_platform_admin());

drop policy if exists routing_decisions_platform_admin_all on leadflow.routing_decisions;
create policy routing_decisions_platform_admin_all
on leadflow.routing_decisions
for all
to authenticated
using (leadflow.is_platform_admin())
with check (leadflow.is_platform_admin());

drop policy if exists review_queue_platform_admin_all on leadflow.review_queue_items;
create policy review_queue_platform_admin_all
on leadflow.review_queue_items
for all
to authenticated
using (leadflow.is_platform_admin())
with check (leadflow.is_platform_admin());

drop policy if exists export_ledger_platform_admin_all on leadflow.export_ledger;
create policy export_ledger_platform_admin_all
on leadflow.export_ledger
for all
to authenticated
using (leadflow.is_platform_admin())
with check (leadflow.is_platform_admin());

-- Partner-readable product summaries can be added later after field-level
-- access is implemented. Keep the default as service_role/platform-admin only.

create or replace view leadflow.aggregated_signal_product_overview
with (security_invoker = true)
as
select
  sp.partner_account_id,
  sp.vertical,
  sp.product_type,
  sp.review_status,
  count(*) as product_count,
  min(sp.created_at) as first_created_at,
  max(sp.created_at) as last_created_at
from leadflow.signal_products sp
where sp.deleted_at is null
  and sp.hard_deleted_at is null
  and sp.exclusivity_level = 'aggregated_only'
  and sp.review_status = 'approved'
group by sp.partner_account_id, sp.vertical, sp.product_type, sp.review_status
having count(*) >= 1;

comment on view leadflow.aggregated_signal_product_overview is
  'Security-invoker aggregate overview. Do not grant to buyers until aggregation thresholds and product entitlements are reviewed.';
