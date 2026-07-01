-- LeadFlow Pro paid sample system.
-- Adds reviewed, scoped, non-sensitive sample access before full marketplace purchase.

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

-- Keep audit logging compatible with newer buyer/admin code paths.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'leadflow.audit_log'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%actor_type%'
  loop
    execute format('alter table leadflow.audit_log drop constraint %I', constraint_row.conname);
  end loop;

  alter table leadflow.audit_log
    add constraint audit_log_actor_type_check
    check (actor_type in ('system', 'consumer', 'buyer', 'partner', 'partner_user', 'public_contributor', 'admin', 'webhook'));
end $$;

-- ---------------------------------------------------------------------------
-- Marketplace sample settings
-- ---------------------------------------------------------------------------

alter table if exists leadflow.marketplace_listings add column if not exists sample_enabled boolean not null default false;
alter table if exists leadflow.marketplace_listings add column if not exists sample_price numeric(12,2) not null default 0;
alter table if exists leadflow.marketplace_listings add column if not exists sample_record_count integer not null default 0;
alter table if exists leadflow.marketplace_listings add column if not exists sample_field_groups text[] not null default '{public_profile,source_proof,compliance}';
alter table if exists leadflow.marketplace_listings add column if not exists requires_admin_approval boolean not null default true;
alter table if exists leadflow.marketplace_listings add column if not exists contact_fields_allowed boolean not null default false;
alter table if exists leadflow.marketplace_listings add column if not exists sample_expiration_days integer not null default 7;

comment on column leadflow.marketplace_listings.sample_enabled is
  'Allows a redacted sample or paid sample request for this listing. Samples never bypass review, suppression, or risk checks.';
comment on column leadflow.marketplace_listings.sample_price is
  'Sample price in USD. Zero means free redacted sample or admin-reviewed sample request.';
comment on column leadflow.marketplace_listings.sample_record_count is
  'Maximum sample record count for the sample product.';
comment on column leadflow.marketplace_listings.sample_field_groups is
  'Approved sample field groups: public_profile, source_proof, compliance, contact when explicitly allowed.';
comment on column leadflow.marketplace_listings.requires_admin_approval is
  'When true, paid or free sample requests remain review-gated before buyer access is granted.';
comment on column leadflow.marketplace_listings.contact_fields_allowed is
  'Controls whether approved sample access can include public contact fields. Defaults false.';
comment on column leadflow.marketplace_listings.sample_expiration_days is
  'Number of days a sample entitlement remains active after approval or payment fulfillment.';

update leadflow.marketplace_listings
set sample_enabled = true,
    sample_price = case when sample_price = 0 then 49 else sample_price end,
    sample_record_count = case when sample_record_count = 0 then 10 else sample_record_count end,
    sample_field_groups = case
      when sample_field_groups is null or array_length(sample_field_groups, 1) is null
        then '{public_profile,source_proof,compliance}'::text[]
      else sample_field_groups
    end
where listing_status in ('sample_available', 'available', 'review')
   or review_status in ('approved', 'review');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.marketplace_listings'::regclass
      and conname = 'marketplace_listings_sample_price_check'
  ) then
    alter table leadflow.marketplace_listings
      add constraint marketplace_listings_sample_price_check check (sample_price >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.marketplace_listings'::regclass
      and conname = 'marketplace_listings_sample_record_count_check'
  ) then
    alter table leadflow.marketplace_listings
      add constraint marketplace_listings_sample_record_count_check check (sample_record_count >= 0 and sample_record_count <= 500);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.marketplace_listings'::regclass
      and conname = 'marketplace_listings_sample_expiration_days_check'
  ) then
    alter table leadflow.marketplace_listings
      add constraint marketplace_listings_sample_expiration_days_check check (sample_expiration_days between 1 and 90);
  end if;
end $$;

create index if not exists marketplace_listings_sample_idx
  on leadflow.marketplace_listings(sample_enabled, listing_status, review_status, sample_price, updated_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Samples, sample items, requests, and payments
-- ---------------------------------------------------------------------------

create table if not exists leadflow.samples (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references leadflow.marketplace_listings(id) on delete cascade,
  sample_type text not null default 'free_redacted',
  title text not null,
  description text,
  price numeric(12,2) not null default 0,
  record_count integer not null default 0,
  field_groups text[] not null default '{public_profile,source_proof,compliance}',
  status text not null default 'draft',
  contact_fields_allowed boolean not null default false,
  requires_admin_approval boolean not null default true,
  allowed_use text not null default 'Review the sample to decide whether to request full marketplace access.',
  restricted_use text not null default 'Do not treat this sample as a blind list, suppressed outreach list, raw data dump, or guaranteed sales source.',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  metadata jsonb not null default '{}',
  deleted_at timestamptz,
  constraint samples_sample_type_check
    check (sample_type in ('free_redacted', 'paid_sample', 'buyer_approved', 'admin_created', 'report_only')),
  constraint samples_status_check
    check (status in ('draft', 'review', 'active', 'paused', 'archived', 'revoked')),
  constraint samples_price_check check (price >= 0),
  constraint samples_record_count_check check (record_count >= 0 and record_count <= 500)
);

comment on table leadflow.samples is
  'Limited reviewed sample products for marketplace listings. Samples expose only approved, non-sensitive field groups.';
comment on column leadflow.samples.field_groups is
  'Allowed sample field groups. Admin-only fields and raw questionnaire answers are not valid sample groups.';
comment on column leadflow.samples.contact_fields_allowed is
  'True only when this sample may include approved public contact fields under listing rules.';
comment on column leadflow.samples.metadata is
  'Redacted operational metadata only. Never store raw answers, hidden source notes, or admin-only lead details here.';

create table if not exists leadflow.sample_items (
  id uuid primary key default gen_random_uuid(),
  sample_id uuid not null references leadflow.samples(id) on delete cascade,
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null,
  profile_slug text,
  redacted_record jsonb not null default '{}',
  included_field_groups text[] not null default '{public_profile,source_proof,compliance}',
  source_proof_summary jsonb not null default '{}',
  score numeric(6,2) check (score is null or (score >= 0 and score <= 100)),
  confidence text not null default 'needs_review',
  created_at timestamptz not null default now(),
  constraint sample_items_confidence_check
    check (confidence in ('high', 'medium', 'low', 'needs_review'))
);

comment on table leadflow.sample_items is
  'Per-profile sample membership with redacted records only. Suppressed, high-risk, raw-answer, and admin-only data must not be copied here.';
comment on column leadflow.sample_items.redacted_record is
  'Buyer-safe sample record. Do not include raw answers, private notes, hidden source notes, or protected/sensitive fields.';

create table if not exists leadflow.sample_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid not null references leadflow.buyer_accounts(id) on delete cascade,
  listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  sample_id uuid references leadflow.samples(id) on delete set null,
  request_status text not null default 'submitted',
  payment_status text not null default 'not_required',
  intended_use text,
  amount numeric(12,2) not null default 0,
  currency text not null default 'usd',
  payment_provider text,
  payment_session_id text,
  payment_intent_id text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  admin_notes_visible boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  deleted_at timestamptz,
  constraint sample_requests_status_check
    check (request_status in ('submitted', 'pending_payment', 'paid_pending_review', 'pending_review', 'approved', 'denied', 'revoked', 'expired', 'fulfilled')),
  constraint sample_requests_payment_status_check
    check (payment_status in ('not_required', 'pending', 'paid', 'failed', 'refunded', 'comped', 'manual_review')),
  constraint sample_requests_amount_check check (amount >= 0)
);

comment on table leadflow.sample_requests is
  'Buyer requests for free, paid, approved, admin-created, or report-only samples. Sample access remains scoped to buyer account and request status.';

create table if not exists leadflow.payments (
  id uuid primary key default gen_random_uuid(),
  payment_provider text not null default 'stripe',
  buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null,
  listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  sample_id uuid references leadflow.samples(id) on delete set null,
  sample_request_id uuid references leadflow.sample_requests(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'usd',
  status text not null default 'pending',
  payment_session_id text,
  payment_intent_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz,
  constraint payments_provider_check check (payment_provider in ('stripe', 'manual', 'none')),
  constraint payments_status_check check (status in ('pending', 'paid', 'failed', 'refunded', 'voided', 'manual_review')),
  constraint payments_amount_check check (amount >= 0)
);

comment on table leadflow.payments is
  'Payment metadata for paid sample access and future data products. Do not store card numbers, bank data, or raw payment credentials.';

create index if not exists samples_listing_status_idx
  on leadflow.samples(listing_id, status, sample_type, created_at desc)
  where deleted_at is null;
create index if not exists samples_price_status_idx
  on leadflow.samples(price, status, created_at desc)
  where deleted_at is null;
create index if not exists sample_items_sample_idx
  on leadflow.sample_items(sample_id, created_at desc);
create index if not exists sample_items_profile_idx
  on leadflow.sample_items(lead_profile_id, created_at desc);
create index if not exists sample_requests_buyer_status_idx
  on leadflow.sample_requests(buyer_account_id, request_status, payment_status, created_at desc)
  where deleted_at is null;
create index if not exists sample_requests_sample_idx
  on leadflow.sample_requests(sample_id, request_status, payment_status, created_at desc)
  where deleted_at is null;
create index if not exists sample_requests_payment_session_idx
  on leadflow.sample_requests(payment_session_id)
  where payment_session_id is not null;
create index if not exists payments_sample_request_idx
  on leadflow.payments(sample_request_id, status, created_at desc);
create index if not exists payments_session_idx
  on leadflow.payments(payment_session_id)
  where payment_session_id is not null;

drop trigger if exists set_samples_updated_at on leadflow.samples;
create trigger set_samples_updated_at
  before update on leadflow.samples
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_sample_requests_updated_at on leadflow.sample_requests;
create trigger set_sample_requests_updated_at
  before update on leadflow.sample_requests
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_payments_updated_at on leadflow.payments;
create trigger set_payments_updated_at
  before update on leadflow.payments
  for each row execute function leadflow.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table leadflow.samples enable row level security;
alter table leadflow.samples force row level security;
alter table leadflow.sample_items enable row level security;
alter table leadflow.sample_items force row level security;
alter table leadflow.sample_requests enable row level security;
alter table leadflow.sample_requests force row level security;
alter table leadflow.payments enable row level security;
alter table leadflow.payments force row level security;

drop policy if exists lead_signal_admin_all_samples on leadflow.samples;
create policy lead_signal_admin_all_samples on leadflow.samples
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists public_select_active_redacted_samples on leadflow.samples;
create policy public_select_active_redacted_samples on leadflow.samples
  for select to anon, authenticated
  using (
    status = 'active'
    and deleted_at is null
    and sample_type in ('free_redacted', 'paid_sample', 'report_only')
  );

drop policy if exists lead_signal_admin_all_sample_items on leadflow.sample_items;
create policy lead_signal_admin_all_sample_items on leadflow.sample_items
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists public_select_active_redacted_sample_items on leadflow.sample_items;
create policy public_select_active_redacted_sample_items on leadflow.sample_items
  for select to anon, authenticated
  using (
    exists (
      select 1
      from leadflow.samples s
      where s.id = sample_items.sample_id
        and s.status = 'active'
        and s.deleted_at is null
        and s.sample_type in ('free_redacted', 'paid_sample', 'report_only')
    )
  );

drop policy if exists buyer_select_own_sample_requests on leadflow.sample_requests;
create policy buyer_select_own_sample_requests on leadflow.sample_requests
  for select to authenticated
  using (
    deleted_at is null
    and buyer_account_id = any(leadflow.current_buyer_account_ids())
  );

drop policy if exists buyer_insert_own_sample_requests on leadflow.sample_requests;
create policy buyer_insert_own_sample_requests on leadflow.sample_requests
  for insert to authenticated
  with check (buyer_account_id = any(leadflow.current_buyer_account_ids()));

drop policy if exists lead_signal_admin_all_sample_requests on leadflow.sample_requests;
create policy lead_signal_admin_all_sample_requests on leadflow.sample_requests
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists buyer_select_own_payments on leadflow.payments;
create policy buyer_select_own_payments on leadflow.payments
  for select to authenticated
  using (buyer_account_id = any(leadflow.current_buyer_account_ids()));

drop policy if exists lead_signal_admin_all_payments on leadflow.payments;
create policy lead_signal_admin_all_payments on leadflow.payments
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Audit triggers
-- ---------------------------------------------------------------------------

create or replace function leadflow.audit_sample_request_change()
returns trigger
language plpgsql
security definer
set search_path = leadflow, public
as $$
declare
  actor_id uuid;
begin
  begin
    actor_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  exception when others then
    actor_id := null;
  end;

  insert into leadflow.audit_log (
    actor_user_id,
    actor_type,
    action,
    object_schema,
    object_table,
    object_id,
    buyer_account_id,
    marketplace_listing_id,
    before_redacted,
    after_redacted,
    details,
    occurred_at
  ) values (
    actor_id,
    case
      when tg_op = 'INSERT' then 'consumer'
      when new.payment_status = 'paid' and coalesce(old.payment_status, '') <> 'paid' then 'webhook'
      when actor_id is null then 'system'
      else 'admin'
    end,
    case when tg_op = 'INSERT' then 'sample_request.created' else 'sample_request.updated' end,
    tg_table_schema,
    tg_table_name,
    new.id,
    new.buyer_account_id,
    new.listing_id,
    case when tg_op = 'UPDATE' then jsonb_build_object('request_status', old.request_status, 'payment_status', old.payment_status) else '{}'::jsonb end,
    jsonb_build_object('request_status', new.request_status, 'payment_status', new.payment_status),
    jsonb_build_object(
      'sample_id', new.sample_id,
      'amount', new.amount,
      'currency', new.currency,
      'raw_records_returned', false
    ),
    now()
  );

  return new;
end;
$$;

drop trigger if exists audit_sample_request_changes on leadflow.sample_requests;
create trigger audit_sample_request_changes
  after insert or update on leadflow.sample_requests
  for each row execute function leadflow.audit_sample_request_change();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema leadflow to anon, authenticated, service_role;
grant select on leadflow.samples, leadflow.sample_items to anon, authenticated;
grant select, insert on leadflow.sample_requests to authenticated;
grant select on leadflow.payments to authenticated;
grant all on leadflow.samples, leadflow.sample_items, leadflow.sample_requests, leadflow.payments to service_role;
grant usage, select on all sequences in schema leadflow to service_role;

-- Safe test seed for environments with at least one marketplace listing.
do $$
declare
  listing record;
  sample_id uuid;
begin
  select id, title, category, vertical, source_url
  into listing
  from leadflow.marketplace_listings
  where deleted_at is null
  order by created_at desc
  limit 1;

  if listing.id is not null and not exists (select 1 from leadflow.samples where listing_id = listing.id and deleted_at is null) then
    insert into leadflow.samples (
      listing_id,
      sample_type,
      title,
      description,
      price,
      record_count,
      field_groups,
      status,
      contact_fields_allowed,
      requires_admin_approval,
      allowed_use,
      restricted_use,
      metadata
    ) values (
      listing.id,
      'paid_sample',
      listing.title || ' Sample',
      'Small proof-backed sample for review before full access.',
      49,
      5,
      '{public_profile,source_proof,compliance}'::text[],
      'active',
      false,
      true,
      'Review source proof, scoring context, and buyer-use fit before requesting full access.',
      'Do not use as a blind list, suppressed outreach list, or guaranteed sales source.',
      jsonb_build_object('seeded', true, 'source', 'leadflow_paid_sample_system')
    )
    returning id into sample_id;

    insert into leadflow.sample_items (
      sample_id,
      redacted_record,
      included_field_groups,
      source_proof_summary,
      score,
      confidence
    ) values (
      sample_id,
      jsonb_build_object(
        'profile_title', listing.title,
        'category', listing.category,
        'vertical', listing.vertical,
        'summary', 'Redacted proof-backed sample row. Full data is review-gated.',
        'buyer_use_case', 'Validate source proof and fit before requesting full access.'
      ),
      '{public_profile,source_proof,compliance}'::text[],
      jsonb_build_object('source_url', listing.source_url, 'proof_status', 'sample'),
      82,
      'medium'
    );
  end if;
end $$;
