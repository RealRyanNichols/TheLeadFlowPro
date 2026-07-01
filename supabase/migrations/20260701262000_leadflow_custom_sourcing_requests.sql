-- LeadFlow Pro custom sourcing requests.
-- Stores buyer demand for signal packs that do not already exist in the marketplace.
-- Public submissions are written through server route handlers with the service role.

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

create table if not exists leadflow.custom_sourcing_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null,
  buyer_request_id uuid references leadflow.buyer_requests(id) on delete set null,
  product_factory_run_id uuid references leadflow.product_factory_runs(id) on delete set null,
  marketplace_listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  attached_segment_id uuid references leadflow.segments(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  company text not null,
  website text,
  industry text not null,
  vertical text not null,
  lead_type text not null,
  buyer_type text not null,
  geography text not null,
  source_preference text not null,
  offer text not null,
  target_customer text not null,
  problem_solved text not null,
  ideal_lead text not null,
  bad_fit_lead text,
  urgency text,
  intended_use text[] not null default '{}',
  desired_fields text[] not null default '{}',
  budget_range text not null,
  desired_volume text,
  access_preference text not null,
  timeline text not null,
  sample_first boolean not null default true,
  notes text,
  status text not null default 'submitted',
  admin_notes text,
  quote_amount numeric(12,2),
  quote_notes text,
  feasibility_score integer not null default 0 check (feasibility_score >= 0 and feasibility_score <= 100),
  feasibility_breakdown jsonb not null default '{}',
  source_url text,
  source_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint custom_sourcing_requests_status_check check (status in (
    'submitted',
    'needs_review',
    'feasible',
    'not_feasible',
    'needs_more_info',
    'quoted',
    'accepted',
    'rejected',
    'in_progress',
    'completed',
    'archived'
  ))
);

comment on table leadflow.custom_sourcing_requests is
  'Review-gated custom sourcing requests from buyers who need source-backed lead signal products not already listed in the marketplace.';
comment on column leadflow.custom_sourcing_requests.desired_fields is
  'Requested field groups such as business name, website, category, location, buyer intent, public source proof, and reviewed contact route. Do not use for protected-trait targeting.';
comment on column leadflow.custom_sourcing_requests.intended_use is
  'Buyer-stated intended use such as outreach, ads, CRM enrichment, research, sales team, market analysis, or internal planning.';
comment on column leadflow.custom_sourcing_requests.feasibility_breakdown is
  'Explainable feasibility scoring factors: clarity, source likelihood, budget, timeline, compliance risk, field availability, and exclusivity complexity.';
comment on column leadflow.custom_sourcing_requests.metadata is
  'Operational metadata only. Do not store hidden sensitive data, raw scraped records, minors data, protected traits, hacked data, leaked data, or individual political persuasion labels.';

create index if not exists custom_sourcing_requests_status_idx
  on leadflow.custom_sourcing_requests(status, created_at desc)
  where deleted_at is null;
create index if not exists custom_sourcing_requests_buyer_idx
  on leadflow.custom_sourcing_requests(buyer_account_id, created_at desc)
  where deleted_at is null;
create index if not exists custom_sourcing_requests_vertical_idx
  on leadflow.custom_sourcing_requests(vertical, industry, lead_type, feasibility_score desc)
  where deleted_at is null;
create index if not exists custom_sourcing_requests_score_idx
  on leadflow.custom_sourcing_requests(feasibility_score desc, created_at desc)
  where deleted_at is null;
create index if not exists custom_sourcing_requests_product_factory_idx
  on leadflow.custom_sourcing_requests(product_factory_run_id, marketplace_listing_id, attached_segment_id)
  where deleted_at is null;

drop trigger if exists set_custom_sourcing_requests_updated_at on leadflow.custom_sourcing_requests;
create trigger set_custom_sourcing_requests_updated_at
  before update on leadflow.custom_sourcing_requests
  for each row execute function leadflow.set_updated_at();

alter table leadflow.custom_sourcing_requests enable row level security;
alter table leadflow.custom_sourcing_requests force row level security;

drop policy if exists custom_sourcing_requests_admin_all on leadflow.custom_sourcing_requests;
create policy custom_sourcing_requests_admin_all on leadflow.custom_sourcing_requests
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists custom_sourcing_requests_select_own on leadflow.custom_sourcing_requests;
create policy custom_sourcing_requests_select_own on leadflow.custom_sourcing_requests
  for select to authenticated
  using (
    deleted_at is null
    and buyer_account_id = any(leadflow.current_buyer_account_ids())
  );

grant usage on schema leadflow to authenticated, service_role;
grant select on leadflow.custom_sourcing_requests to authenticated;
grant select, insert, update, delete on leadflow.custom_sourcing_requests to service_role;
grant select, insert, update on leadflow.buyer_requests to service_role;
grant select, insert, update on leadflow.product_factory_runs to service_role;
grant select, insert on leadflow.audit_log to service_role;
grant select, insert on leadflow.events to service_role;

-- Access classification:
-- Public route: insert via server route handler only.
-- Buyer-visible: own rows through RLS when linked to buyer_account_id.
-- Admin-visible: all rows for platform admins through RLS.
-- Service role: server-side create, review, audit, and Product Factory handoff.
