-- Minimal live bootstrap for custom sourcing persistence.
-- This is intentionally additive and idempotent. It creates the LeadFlow tables
-- required by the deployed custom sourcing request flow before the fuller Phase
-- migrations are applied to production.

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

create or replace function leadflow.is_platform_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'leadflow_role') = 'admin', false);
$$;

create table if not exists leadflow.buyer_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  owner_user_id uuid,
  name text,
  email text not null,
  phone text,
  company_name text,
  website text,
  website_url text,
  buyer_type text,
  industry text,
  location_served text,
  budget_range text,
  intended_use text,
  account_status text not null default 'pending_review',
  approved_access_level text not null default 'none',
  communication_preference text,
  consent_status text not null default 'not_requested',
  status text not null default 'pending',
  review_status text not null default 'pending',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  deleted_at timestamptz
);

create table if not exists leadflow.buyer_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null,
  listing_id uuid,
  listing_slug text,
  request_type text not null default 'access',
  message text,
  intended_use text,
  budget_range text,
  urgency text,
  status text not null default 'submitted',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  admin_notes_visible boolean not null default false,
  vertical text,
  category text,
  buyer_use_case text,
  review_status text not null default 'pending',
  source_url text,
  source_path text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists leadflow.segments (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled segment',
  description text,
  segment_type text not null default 'lead_profiles',
  vertical text,
  category text,
  status text not null default 'draft',
  visibility text not null default 'admin_only',
  member_count integer not null default 0,
  risk_level text not null default 'medium',
  compliance_status text not null default 'needs_review',
  metadata jsonb not null default '{}',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_run_at timestamptz,
  deleted_at timestamptz
);

create table if not exists leadflow.product_factory_runs (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'manual_selection',
  source_id uuid,
  attached_buyer_request_id uuid references leadflow.buyer_requests(id) on delete set null,
  created_by uuid,
  status text not null default 'draft',
  quality_summary jsonb not null default '{}',
  compliance_summary jsonb not null default '{}',
  generated_copy jsonb not null default '{}',
  buyer_use_case jsonb not null default '{}',
  listing_settings jsonb not null default '{}',
  selected_member_ids uuid[] not null default '{}',
  generated_listing_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leadflow.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  product_factory_run_id uuid references leadflow.product_factory_runs(id) on delete set null,
  title text not null,
  slug text,
  vertical text not null default 'general',
  category text,
  buyer_type text,
  source_type text,
  location_label text,
  listing_status text not null default 'draft',
  review_status text not null default 'review',
  release_mode text not null default 'review_gated',
  access_model text not null default 'shared',
  max_buyers integer,
  current_buyer_count integer not null default 0,
  exclusive_buyer_id uuid references leadflow.buyer_accounts(id) on delete set null,
  exclusive_starts_at timestamptz,
  exclusive_ends_at timestamptz,
  territory text,
  exclusivity_notes text,
  score numeric(6,2),
  confidence numeric(5,4),
  sample_count integer not null default 0,
  price_cents integer,
  freshness_label text,
  compliance_status text not null default 'review_required',
  buyer_visible_summary jsonb not null default '{}',
  source_url text,
  sample_enabled boolean not null default false,
  sample_price numeric(12,2) not null default 0,
  sample_record_count integer not null default 0,
  sample_field_groups text[] not null default '{public_profile,source_proof,compliance}',
  requires_admin_approval boolean not null default true,
  contact_fields_allowed boolean not null default false,
  sample_expiration_days integer not null default 7,
  full_access_price numeric(12,2) not null default 149,
  exclusive_deposit_amount numeric(12,2) not null default 497,
  auto_fulfill_enabled boolean not null default false,
  checkout_requires_admin_approval boolean not null default true,
  contact_fields_release_approved boolean not null default false,
  checkout_notes text,
  allowed_use text,
  restricted_use text,
  proof_summary jsonb not null default '{}',
  source_profile_ids uuid[] not null default '{}',
  tags text[] not null default '{}',
  visibility text not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'leadflow.product_factory_runs'::regclass
      and conname = 'product_factory_runs_generated_listing_fk'
  ) then
    alter table leadflow.product_factory_runs
      add constraint product_factory_runs_generated_listing_fk
      foreign key (generated_listing_id) references leadflow.marketplace_listings(id) on delete set null
      not valid;
  end if;
end $$;

create table if not exists leadflow.events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_type text,
  route text,
  anonymous_session_id uuid,
  auth_user_id uuid,
  user_role text,
  source_path text,
  tool_slug text,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists leadflow.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_type text not null default 'system',
  action text not null,
  object_schema text,
  object_table text,
  object_id uuid,
  buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function leadflow.current_buyer_account_ids()
returns uuid[]
language sql
stable
as $$
  select coalesce(array_agg(id), '{}'::uuid[])
  from leadflow.buyer_accounts
  where auth_user_id = auth.uid()
    and deleted_at is null;
$$;

create index if not exists buyer_accounts_auth_user_idx on leadflow.buyer_accounts(auth_user_id) where deleted_at is null;
create index if not exists buyer_requests_buyer_idx on leadflow.buyer_requests(buyer_account_id, created_at desc) where deleted_at is null;
create index if not exists marketplace_listings_status_idx on leadflow.marketplace_listings(listing_status, review_status, updated_at desc) where deleted_at is null;
create index if not exists events_name_created_idx on leadflow.events(event_name, created_at desc);
create index if not exists audit_log_action_created_idx on leadflow.audit_log(action, created_at desc);

alter table leadflow.buyer_accounts enable row level security;
alter table leadflow.buyer_requests enable row level security;
alter table leadflow.segments enable row level security;
alter table leadflow.product_factory_runs enable row level security;
alter table leadflow.marketplace_listings enable row level security;
alter table leadflow.events enable row level security;
alter table leadflow.audit_log enable row level security;

grant usage on schema leadflow to authenticated, service_role;
grant select, insert, update on leadflow.buyer_accounts to service_role;
grant select, insert, update on leadflow.buyer_requests to service_role;
grant select, insert, update on leadflow.segments to service_role;
grant select, insert, update on leadflow.product_factory_runs to service_role;
grant select, insert, update on leadflow.marketplace_listings to service_role;
grant select, insert on leadflow.events to service_role;
grant select, insert on leadflow.audit_log to service_role;
