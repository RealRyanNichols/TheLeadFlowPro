-- LeadFlow Pro exclusive listing logic.
-- Supports shared access, limited seats, exclusive listings, territories, verticals, and time windows.

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

-- Keep audit logging compatible with buyer/admin/server code paths.
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
-- Marketplace listing access model
-- ---------------------------------------------------------------------------

alter table if exists leadflow.marketplace_listings add column if not exists access_model text not null default 'shared';
alter table if exists leadflow.marketplace_listings add column if not exists max_buyers integer;
alter table if exists leadflow.marketplace_listings add column if not exists current_buyer_count integer not null default 0;
alter table if exists leadflow.marketplace_listings add column if not exists exclusive_buyer_id uuid references leadflow.buyer_accounts(id) on delete set null;
alter table if exists leadflow.marketplace_listings add column if not exists exclusive_starts_at timestamptz;
alter table if exists leadflow.marketplace_listings add column if not exists exclusive_ends_at timestamptz;
alter table if exists leadflow.marketplace_listings add column if not exists territory text;
alter table if exists leadflow.marketplace_listings add column if not exists exclusivity_notes text;

comment on column leadflow.marketplace_listings.access_model is
  'Access model for buyer release: shared, limited seats, exclusive listing, exclusive geo, exclusive vertical, exclusive time window, or internal only.';
comment on column leadflow.marketplace_listings.max_buyers is
  'Maximum active buyers for limited seat listings. Null means no cap for shared listings.';
comment on column leadflow.marketplace_listings.current_buyer_count is
  'Cached count of active non-sample buyer entitlements. Recalculated by admin/server workflows.';
comment on column leadflow.marketplace_listings.exclusive_buyer_id is
  'Buyer account holding active exclusive access when listing_status is reserved or sold exclusive.';
comment on column leadflow.marketplace_listings.exclusivity_notes is
  'Buyer-facing and admin review notes for territory, vertical, profile batch, or time-window exclusivity.';

-- Existing migrations created narrower listing_status checks. Replace them without relying on generated names.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'leadflow.marketplace_listings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%listing_status%'
  loop
    execute format('alter table leadflow.marketplace_listings drop constraint %I', constraint_row.conname);
  end loop;

  alter table leadflow.marketplace_listings
    add constraint marketplace_listings_listing_status_check
    check (listing_status in (
      'draft',
      'review',
      'sample_available',
      'available',
      'reserved',
      'sold_shared',
      'sold_exclusive',
      'expired',
      'archived',
      'suppressed'
    ));
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.marketplace_listings'::regclass
      and conname = 'marketplace_listings_access_model_check'
  ) then
    alter table leadflow.marketplace_listings
      add constraint marketplace_listings_access_model_check
      check (access_model in (
        'shared',
        'limited_seats',
        'exclusive_listing',
        'exclusive_geo',
        'exclusive_vertical',
        'exclusive_time_window',
        'internal_only'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.marketplace_listings'::regclass
      and conname = 'marketplace_listings_buyer_count_check'
  ) then
    alter table leadflow.marketplace_listings
      add constraint marketplace_listings_buyer_count_check
      check (current_buyer_count >= 0 and (max_buyers is null or max_buyers >= current_buyer_count));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.marketplace_listings'::regclass
      and conname = 'marketplace_listings_exclusive_window_check'
  ) then
    alter table leadflow.marketplace_listings
      add constraint marketplace_listings_exclusive_window_check
      check (exclusive_ends_at is null or exclusive_starts_at is null or exclusive_ends_at > exclusive_starts_at);
  end if;
end $$;

update leadflow.marketplace_listings
set access_model = case
      when coalesce(release_mode, '') ilike '%exclusive%' then 'exclusive_listing'
      when coalesce(release_mode, '') ilike '%aggregate%' then 'internal_only'
      else access_model
    end,
    listing_status = case
      when listing_status = 'paused' then 'review'
      when listing_status = 'sold' then 'sold_shared'
      else listing_status
    end,
    max_buyers = case when access_model = 'limited_seats' and max_buyers is null then 3 else max_buyers end
where deleted_at is null;

create index if not exists marketplace_listings_access_model_idx
  on leadflow.marketplace_listings(access_model, listing_status, current_buyer_count, updated_at desc)
  where deleted_at is null;
create index if not exists marketplace_listings_exclusive_window_idx
  on leadflow.marketplace_listings(exclusive_buyer_id, exclusive_starts_at, exclusive_ends_at, listing_status)
  where deleted_at is null;
create index if not exists marketplace_listings_territory_idx
  on leadflow.marketplace_listings(territory, vertical, access_model, listing_status)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Buyer entitlement metadata for exclusive access
-- ---------------------------------------------------------------------------

alter table if exists leadflow.buyer_entitlements add column if not exists exclusive_request_id uuid;
alter table if exists leadflow.buyer_entitlements add column if not exists access_model text;
alter table if exists leadflow.buyer_entitlements add column if not exists territory text;
alter table if exists leadflow.buyer_entitlements add column if not exists exclusive_starts_at timestamptz;
alter table if exists leadflow.buyer_entitlements add column if not exists exclusive_ends_at timestamptz;
alter table if exists leadflow.buyer_entitlements add column if not exists exclusivity_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.buyer_entitlements'::regclass
      and conname = 'buyer_entitlements_access_model_check'
  ) then
    alter table leadflow.buyer_entitlements
      add constraint buyer_entitlements_access_model_check
      check (access_model is null or access_model in (
        'shared',
        'limited_seats',
        'exclusive_listing',
        'exclusive_geo',
        'exclusive_vertical',
        'exclusive_time_window',
        'internal_only'
      ));
  end if;
end $$;

create index if not exists buyer_entitlements_exclusive_listing_idx
  on leadflow.buyer_entitlements(listing_id, access_level, status, starts_at, expires_at)
  where status = 'active' and access_level = 'exclusive';

-- ---------------------------------------------------------------------------
-- Exclusive requests
-- ---------------------------------------------------------------------------

create table if not exists leadflow.exclusive_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid not null references leadflow.buyer_accounts(id) on delete cascade,
  listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  listing_slug text,
  requested_access_model text not null default 'exclusive_listing',
  requested_territory text,
  requested_vertical text,
  requested_start timestamptz,
  requested_end timestamptz,
  budget_range text,
  intended_use text not null,
  urgency text,
  request_notes text,
  status text not null default 'submitted',
  reviewed_by uuid,
  reviewed_at timestamptz,
  admin_notes text,
  admin_notes_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  deleted_at timestamptz,
  constraint exclusive_requests_access_model_check
    check (requested_access_model in (
      'exclusive_listing',
      'exclusive_geo',
      'exclusive_vertical',
      'exclusive_time_window'
    )),
  constraint exclusive_requests_status_check
    check (status in (
      'submitted',
      'needs_review',
      'needs_more_info',
      'approved',
      'denied',
      'reserved',
      'granted',
      'expired',
      'revoked',
      'archived'
    )),
  constraint exclusive_requests_window_check
    check (requested_end is null or requested_start is null or requested_end > requested_start)
);

comment on table leadflow.exclusive_requests is
  'Buyer requests for exclusive listing, territory, vertical, profile batch, or time-window access. Approval is manual and audited.';
comment on column leadflow.exclusive_requests.request_notes is
  'Private request notes for admin review. Never send this value to frontend analytics.';
comment on column leadflow.exclusive_requests.metadata is
  'Operational metadata only. Do not store card numbers, private account data, protected-trait targeting data, or hidden raw lead records.';

alter table leadflow.buyer_entitlements
  drop constraint if exists buyer_entitlements_exclusive_request_fkey;
alter table leadflow.buyer_entitlements
  add constraint buyer_entitlements_exclusive_request_fkey
  foreign key (exclusive_request_id) references leadflow.exclusive_requests(id) on delete set null;

create index if not exists exclusive_requests_buyer_status_idx
  on leadflow.exclusive_requests(buyer_account_id, status, created_at desc)
  where deleted_at is null;
create index if not exists exclusive_requests_listing_status_idx
  on leadflow.exclusive_requests(listing_id, listing_slug, status, created_at desc)
  where deleted_at is null;
create index if not exists exclusive_requests_window_idx
  on leadflow.exclusive_requests(requested_start, requested_end, status)
  where deleted_at is null;

drop trigger if exists set_exclusive_requests_updated_at on leadflow.exclusive_requests;
create trigger set_exclusive_requests_updated_at
  before update on leadflow.exclusive_requests
  for each row execute function leadflow.set_updated_at();

-- ---------------------------------------------------------------------------
-- Availability helpers
-- ---------------------------------------------------------------------------

create or replace function leadflow.listing_has_active_exclusive_entitlement(target_listing_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1
    from leadflow.buyer_entitlements be
    where be.listing_id = target_listing_id
      and be.access_level = 'exclusive'
      and be.status = 'active'
      and be.starts_at <= now()
      and (be.expires_at is null or be.expires_at > now())
  );
$$;

create or replace function leadflow.recalculate_listing_buyer_count(target_listing_id uuid)
returns integer
language plpgsql
security definer
set search_path = leadflow, public
as $$
declare
  active_count integer;
begin
  select count(*)::integer
  into active_count
  from leadflow.buyer_entitlements be
  where be.listing_id = target_listing_id
    and be.status = 'active'
    and be.access_level in ('summary', 'full_profile', 'raw_export', 'exclusive', 'aggregate')
    and be.starts_at <= now()
    and (be.expires_at is null or be.expires_at > now());

  update leadflow.marketplace_listings
  set current_buyer_count = active_count
  where id = target_listing_id;

  return active_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table leadflow.exclusive_requests enable row level security;
alter table leadflow.exclusive_requests force row level security;
alter table leadflow.marketplace_listings enable row level security;
alter table leadflow.buyer_entitlements enable row level security;

drop policy if exists buyer_select_own_exclusive_requests on leadflow.exclusive_requests;
create policy buyer_select_own_exclusive_requests on leadflow.exclusive_requests
  for select to authenticated
  using (
    deleted_at is null
    and buyer_account_id = any(leadflow.current_buyer_account_ids())
  );

drop policy if exists buyer_insert_own_exclusive_requests on leadflow.exclusive_requests;
create policy buyer_insert_own_exclusive_requests on leadflow.exclusive_requests
  for insert to authenticated
  with check (buyer_account_id = any(leadflow.current_buyer_account_ids()));

drop policy if exists lead_signal_admin_all_exclusive_requests on leadflow.exclusive_requests;
create policy lead_signal_admin_all_exclusive_requests on leadflow.exclusive_requests
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

-- Expand public marketplace previews to show reserved/sold states without exposing raw lead records.
drop policy if exists marketplace_listings_select_approved on leadflow.marketplace_listings;
create policy marketplace_listings_select_approved on leadflow.marketplace_listings
  for select to anon, authenticated
  using (
    deleted_at is null
    and review_status = 'approved'
    and listing_status in ('sample_available', 'available', 'reserved', 'sold_shared', 'sold_exclusive')
    and access_model <> 'internal_only'
    and compliance_status not in ('suppressed', 'prohibited')
  );

-- ---------------------------------------------------------------------------
-- Audit triggers
-- ---------------------------------------------------------------------------

create or replace function leadflow.audit_exclusive_request_change()
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
      when tg_op = 'INSERT' then 'buyer'
      when actor_id is null then 'system'
      else 'admin'
    end,
    case when tg_op = 'INSERT' then 'exclusive_request.created' else 'exclusive_request.updated' end,
    tg_table_schema,
    tg_table_name,
    new.id,
    new.buyer_account_id,
    new.listing_id,
    case when tg_op = 'UPDATE' then jsonb_build_object('status', old.status, 'requested_access_model', old.requested_access_model) else '{}'::jsonb end,
    jsonb_build_object('status', new.status, 'requested_access_model', new.requested_access_model),
    jsonb_build_object(
      'requested_territory', new.requested_territory,
      'requested_vertical', new.requested_vertical,
      'requested_start', new.requested_start,
      'requested_end', new.requested_end,
      'raw_records_returned', false
    ),
    now()
  );

  return new;
end;
$$;

drop trigger if exists audit_exclusive_request_changes on leadflow.exclusive_requests;
create trigger audit_exclusive_request_changes
  after insert or update on leadflow.exclusive_requests
  for each row execute function leadflow.audit_exclusive_request_change();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema leadflow to anon, authenticated, service_role;
grant select on leadflow.marketplace_listings to anon, authenticated;
grant select, insert on leadflow.exclusive_requests to authenticated;
grant select on leadflow.buyer_entitlements to authenticated;
grant all on leadflow.exclusive_requests, leadflow.marketplace_listings, leadflow.buyer_entitlements to service_role;
grant execute on function leadflow.listing_has_active_exclusive_entitlement(uuid) to authenticated, service_role;
grant execute on function leadflow.recalculate_listing_buyer_count(uuid) to service_role;

-- Safe seed values for existing sample listings.
update leadflow.marketplace_listings
set access_model = case
      when access_model = 'shared' and coalesce(release_mode, '') ilike '%exclusive%' then 'exclusive_listing'
      else access_model
    end,
    listing_status = case
      when listing_status = 'available' and sample_enabled = true then 'sample_available'
      else listing_status
    end
where deleted_at is null;
