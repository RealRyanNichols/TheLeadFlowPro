-- LeadFlow Product Factory.
-- Admin-only workflow for turning reviewed segments, profiles, sources, and
-- aggregate signal groups into review-gated marketplace products.

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

-- ---------------------------------------------------------------------------
-- Product factory run ledger
-- ---------------------------------------------------------------------------

create table if not exists leadflow.product_factory_runs (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text,
  created_by uuid,
  status text not null default 'draft',
  quality_summary jsonb not null default '{}',
  compliance_summary jsonb not null default '{}',
  generated_listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  generated_sample_id uuid references leadflow.samples(id) on delete set null,
  generated_copy jsonb not null default '{}',
  buyer_use_case jsonb not null default '{}',
  listing_settings jsonb not null default '{}',
  selected_member_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint product_factory_runs_source_type_check check (source_type in (
    'segment',
    'lead_profiles',
    'submitted_source',
    'questionnaire_result_group',
    'civic_aggregate',
    'manual_selection',
    'predictive_recommendation'
  )),
  constraint product_factory_runs_status_check check (status in (
    'draft',
    'review',
    'listing_created',
    'sample_created',
    'exclusive_offer_created',
    'published',
    'blocked',
    'archived'
  ))
);

comment on table leadflow.product_factory_runs is
  'Admin-only Product Factory run ledger. Turns reviewed, permissioned, suppression-aware inputs into marketplace listings, samples, and exclusive offers.';
comment on column leadflow.product_factory_runs.quality_summary is
  'Safe operational summary only: counts, score ranges, proof coverage, missing fields, suppression counts, and export eligibility.';
comment on column leadflow.product_factory_runs.compliance_summary is
  'Compliance checklist and block warnings. Do not store raw answers, protected traits, minors data, medical data, private financial data, or individual political persuasion data.';
comment on column leadflow.product_factory_runs.generated_copy is
  'Editable generated listing copy. No guaranteed revenue, lead volume, ROAS, CPL, conversion rate, or hidden identity dossier claims.';
comment on column leadflow.product_factory_runs.selected_member_ids is
  'Selected source/member identifiers. Member IDs are references only and must not be raw personal data.';

-- ---------------------------------------------------------------------------
-- Marketplace listing metadata created by the factory
-- ---------------------------------------------------------------------------

alter table if exists leadflow.marketplace_listings add column if not exists product_factory_run_id uuid references leadflow.product_factory_runs(id) on delete set null;
alter table if exists leadflow.marketplace_listings add column if not exists allowed_use text;
alter table if exists leadflow.marketplace_listings add column if not exists restricted_use text;
alter table if exists leadflow.marketplace_listings add column if not exists proof_summary jsonb not null default '{}';
alter table if exists leadflow.marketplace_listings add column if not exists source_profile_ids uuid[] not null default '{}';
alter table if exists leadflow.marketplace_listings add column if not exists tags text[] not null default '{}';
alter table if exists leadflow.marketplace_listings add column if not exists visibility text not null default 'buyer_preview';

comment on column leadflow.marketplace_listings.product_factory_run_id is
  'Product Factory run that generated or last refreshed this marketplace listing.';
comment on column leadflow.marketplace_listings.allowed_use is
  'Plain-English allowed use shown to buyers before access, sample, export, or integration delivery.';
comment on column leadflow.marketplace_listings.restricted_use is
  'Plain-English restricted use shown to buyers. Must block suppressed, outdated, prohibited, raw-answer, and unauthorized contact use.';
comment on column leadflow.marketplace_listings.proof_summary is
  'Source proof summary with coverage metrics and review notes. Must not include hidden source notes or raw private data.';
comment on column leadflow.marketplace_listings.source_profile_ids is
  'Reviewed lead profile IDs attached to this listing. Suppressed or prohibited profiles must be excluded.';
comment on column leadflow.marketplace_listings.visibility is
  'Visibility state for product-generated listings: internal, buyer_preview, buyer_visible, archived.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.marketplace_listings'::regclass
      and conname = 'marketplace_listings_visibility_check'
  ) then
    alter table leadflow.marketplace_listings
      add constraint marketplace_listings_visibility_check
      check (visibility in ('internal', 'buyer_preview', 'buyer_visible', 'archived'));
  end if;
end $$;

create index if not exists product_factory_runs_source_idx
  on leadflow.product_factory_runs(source_type, source_id, created_at desc)
  where deleted_at is null;
create index if not exists product_factory_runs_status_idx
  on leadflow.product_factory_runs(status, created_at desc)
  where deleted_at is null;
create index if not exists product_factory_runs_listing_idx
  on leadflow.product_factory_runs(generated_listing_id, generated_sample_id)
  where deleted_at is null;
create index if not exists marketplace_listings_product_factory_idx
  on leadflow.marketplace_listings(product_factory_run_id, listing_status, updated_at desc)
  where deleted_at is null;
create index if not exists marketplace_listings_source_profile_ids_gin_idx
  on leadflow.marketplace_listings using gin(source_profile_ids);
create index if not exists marketplace_listings_tags_factory_gin_idx
  on leadflow.marketplace_listings using gin(tags);
create index if not exists marketplace_listings_visibility_idx
  on leadflow.marketplace_listings(visibility, listing_status, review_status, updated_at desc)
  where deleted_at is null;

drop trigger if exists set_product_factory_runs_updated_at on leadflow.product_factory_runs;
create trigger set_product_factory_runs_updated_at
  before update on leadflow.product_factory_runs
  for each row execute function leadflow.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS and grants
-- ---------------------------------------------------------------------------

alter table leadflow.product_factory_runs enable row level security;
alter table leadflow.product_factory_runs force row level security;

drop policy if exists product_factory_runs_admin_all on leadflow.product_factory_runs;
create policy product_factory_runs_admin_all on leadflow.product_factory_runs
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

grant usage on schema leadflow to authenticated, service_role;
grant select, insert, update on leadflow.product_factory_runs to authenticated;
grant all on leadflow.product_factory_runs to service_role;
grant select, insert, update on leadflow.marketplace_listings to authenticated;
grant all on leadflow.marketplace_listings to service_role;
grant all on leadflow.samples, leadflow.sample_items to service_role;
grant select, insert on leadflow.audit_log to service_role;
grant select, insert on leadflow.events to service_role;
grant usage, select on all sequences in schema leadflow to service_role;

