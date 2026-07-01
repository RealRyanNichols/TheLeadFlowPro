-- LeadFlow Pro checkout orders.
-- Adds payment/order records for samples, listing access, exclusive deposits,
-- custom sourcing deposits, and future subscription placeholders.

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

-- Keep audit logging compatible with webhook and checkout flows.
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
-- Marketplace checkout settings
-- ---------------------------------------------------------------------------

alter table if exists leadflow.marketplace_listings add column if not exists checkout_enabled boolean not null default true;
alter table if exists leadflow.marketplace_listings add column if not exists full_access_price numeric(12,2) not null default 149;
alter table if exists leadflow.marketplace_listings add column if not exists exclusive_deposit_amount numeric(12,2) not null default 497;
alter table if exists leadflow.marketplace_listings add column if not exists auto_fulfill_enabled boolean not null default false;
alter table if exists leadflow.marketplace_listings add column if not exists checkout_requires_admin_approval boolean not null default true;
alter table if exists leadflow.marketplace_listings add column if not exists contact_fields_release_approved boolean not null default false;
alter table if exists leadflow.marketplace_listings add column if not exists checkout_notes text;

comment on column leadflow.marketplace_listings.checkout_enabled is
  'Allows buyer checkout attempts for this listing. Checkout never bypasses suppression, review, entitlement, or exclusivity rules.';
comment on column leadflow.marketplace_listings.full_access_price is
  'Listing access price in USD for shared or reviewed full listing access.';
comment on column leadflow.marketplace_listings.exclusive_deposit_amount is
  'Deposit amount in USD for reviewed exclusive access requests. Deposit does not automatically grant exclusive access.';
comment on column leadflow.marketplace_listings.auto_fulfill_enabled is
  'True only for low-risk, reviewed listing products that may grant scoped buyer entitlement after confirmed payment.';
comment on column leadflow.marketplace_listings.checkout_requires_admin_approval is
  'When true, paid orders go to manual review after confirmed payment before entitlement is granted.';
comment on column leadflow.marketplace_listings.contact_fields_release_approved is
  'Controls whether paid access can include contact field groups. Defaults false.';
comment on column leadflow.marketplace_listings.checkout_notes is
  'Buyer-facing or admin review notes about checkout limits. Do not store private lead records here.';

update leadflow.marketplace_listings
set full_access_price = case
      when price_cents is not null and price_cents > 0 then round(price_cents::numeric / 100, 2)
      when full_access_price = 149 and sample_price > 0 then greatest(sample_price * 3, 149)
      else full_access_price
    end
where deleted_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.marketplace_listings'::regclass
      and conname = 'marketplace_listings_full_access_price_check'
  ) then
    alter table leadflow.marketplace_listings
      add constraint marketplace_listings_full_access_price_check
      check (full_access_price >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.marketplace_listings'::regclass
      and conname = 'marketplace_listings_exclusive_deposit_amount_check'
  ) then
    alter table leadflow.marketplace_listings
      add constraint marketplace_listings_exclusive_deposit_amount_check
      check (exclusive_deposit_amount >= 0);
  end if;
end $$;

create index if not exists marketplace_listings_checkout_idx
  on leadflow.marketplace_listings(checkout_enabled, listing_status, review_status, full_access_price, updated_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Orders and order items
-- ---------------------------------------------------------------------------

create table if not exists leadflow.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid references leadflow.buyer_accounts(id) on delete set null,
  order_type text not null,
  listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  listing_slug text,
  sample_id uuid references leadflow.samples(id) on delete set null,
  sample_request_id uuid references leadflow.sample_requests(id) on delete set null,
  exclusive_request_id uuid references leadflow.exclusive_requests(id) on delete set null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'usd',
  status text not null default 'draft',
  payment_provider text not null default 'stripe',
  payment_session_id text,
  payment_intent_id text,
  receipt_url text,
  field_groups text[] not null default '{public_profile,source_proof,compliance}',
  access_level text not null default 'summary',
  requires_manual_review boolean not null default true,
  auto_fulfillable boolean not null default false,
  allowed_use_confirmed boolean not null default false,
  reason text,
  created_by uuid,
  fulfilled_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  canceled_at timestamptz,
  fulfilled_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}',
  deleted_at timestamptz,
  constraint orders_type_check
    check (order_type in ('sample', 'listing_access', 'exclusive_deposit', 'custom_signal_request', 'subscription_placeholder')),
  constraint orders_status_check
    check (status in ('draft', 'pending_payment', 'paid', 'failed', 'canceled', 'refunded', 'fulfilled', 'manual_review')),
  constraint orders_payment_provider_check
    check (payment_provider in ('stripe', 'manual', 'none')),
  constraint orders_amount_check check (amount >= 0),
  constraint orders_access_level_check
    check (access_level in ('sample', 'summary', 'full_profile', 'raw_export', 'exclusive', 'aggregate'))
);

comment on table leadflow.orders is
  'Audited buyer checkout orders for samples, listing access, exclusive deposits, custom sourcing deposits, and future subscriptions. Payment never automatically exposes raw lead data.';
comment on column leadflow.orders.metadata is
  'Operational checkout metadata only. Do not store card data, raw answers, hidden source notes, admin-only lead records, or sensitive personal data.';
comment on column leadflow.orders.auto_fulfillable is
  'True only when entitlement can be granted after confirmed payment under review, suppression, risk, and listing availability rules.';
comment on column leadflow.orders.requires_manual_review is
  'True when payment should create or update the order but access must wait for admin review.';

create table if not exists leadflow.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references leadflow.orders(id) on delete cascade,
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null,
  listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  sample_id uuid references leadflow.samples(id) on delete set null,
  item_type text not null default 'listing',
  included_fields text[] not null default '{public_profile,source_proof,compliance}',
  quantity integer not null default 1,
  unit_amount numeric(12,2) not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint order_items_type_check
    check (item_type in ('sample', 'listing', 'profile', 'exclusive_deposit', 'custom_signal_request', 'subscription_placeholder')),
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_unit_amount_check check (unit_amount >= 0)
);

comment on table leadflow.order_items is
  'Line items for LeadFlow orders. Items identify product scope without storing raw lead records or payment credentials.';

alter table if exists leadflow.payments add column if not exists order_id uuid references leadflow.orders(id) on delete set null;
alter table if exists leadflow.payments add column if not exists order_type text;
alter table if exists leadflow.payments add column if not exists receipt_url text;
alter table if exists leadflow.payments add column if not exists failure_code text;
alter table if exists leadflow.payments add column if not exists failure_message text;

comment on column leadflow.payments.order_id is
  'Optional link to a LeadFlow checkout order. Sample payments may also link to sample_requests.';
comment on column leadflow.payments.failure_message is
  'Redacted payment failure text only. Do not store card numbers, bank data, or full Stripe payloads.';

create index if not exists orders_buyer_status_idx
  on leadflow.orders(buyer_account_id, status, created_at desc)
  where deleted_at is null;
create index if not exists orders_listing_status_idx
  on leadflow.orders(listing_id, listing_slug, status, created_at desc)
  where deleted_at is null;
create index if not exists orders_payment_session_idx
  on leadflow.orders(payment_session_id)
  where payment_session_id is not null;
create index if not exists orders_payment_intent_idx
  on leadflow.orders(payment_intent_id)
  where payment_intent_id is not null;
create index if not exists orders_type_status_idx
  on leadflow.orders(order_type, status, created_at desc)
  where deleted_at is null;
create index if not exists order_items_order_idx
  on leadflow.order_items(order_id, created_at desc);
create index if not exists payments_order_idx
  on leadflow.payments(order_id, status, created_at desc)
  where order_id is not null;

drop trigger if exists set_orders_updated_at on leadflow.orders;
create trigger set_orders_updated_at
  before update on leadflow.orders
  for each row execute function leadflow.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table leadflow.orders enable row level security;
alter table leadflow.orders force row level security;
alter table leadflow.order_items enable row level security;
alter table leadflow.order_items force row level security;
alter table leadflow.payments enable row level security;

drop policy if exists buyer_select_own_orders on leadflow.orders;
create policy buyer_select_own_orders on leadflow.orders
  for select to authenticated
  using (
    deleted_at is null
    and buyer_account_id = any(leadflow.current_buyer_account_ids())
  );

drop policy if exists lead_signal_admin_all_orders on leadflow.orders;
create policy lead_signal_admin_all_orders on leadflow.orders
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists buyer_select_own_order_items on leadflow.order_items;
create policy buyer_select_own_order_items on leadflow.order_items
  for select to authenticated
  using (
    exists (
      select 1
      from leadflow.orders o
      where o.id = order_items.order_id
        and o.deleted_at is null
        and o.buyer_account_id = any(leadflow.current_buyer_account_ids())
    )
  );

drop policy if exists lead_signal_admin_all_order_items on leadflow.order_items;
create policy lead_signal_admin_all_order_items on leadflow.order_items
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

create or replace function leadflow.audit_order_change()
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
      when tg_op = 'UPDATE' and new.status = 'paid' and coalesce(old.status, '') <> 'paid' then 'webhook'
      when tg_op = 'UPDATE' and new.status = 'fulfilled' and coalesce(old.status, '') <> 'fulfilled' then 'webhook'
      when actor_id is null then 'system'
      else 'admin'
    end,
    case
      when tg_op = 'INSERT' then 'order.created'
      when tg_op = 'UPDATE' and new.status = 'paid' and coalesce(old.status, '') <> 'paid' then 'order.paid'
      when tg_op = 'UPDATE' and new.status = 'fulfilled' and coalesce(old.status, '') <> 'fulfilled' then 'order.fulfilled'
      else 'order.updated'
    end,
    tg_table_schema,
    tg_table_name,
    new.id,
    new.buyer_account_id,
    new.listing_id,
    case when tg_op = 'UPDATE' then jsonb_build_object('status', old.status, 'amount', old.amount, 'payment_session_id', old.payment_session_id) else '{}'::jsonb end,
    jsonb_build_object('status', new.status, 'amount', new.amount, 'payment_session_id', new.payment_session_id),
    jsonb_build_object(
      'order_type', new.order_type,
      'requires_manual_review', new.requires_manual_review,
      'auto_fulfillable', new.auto_fulfillable,
      'raw_records_returned', false,
      'admin_only_fields_returned', false
    ),
    now()
  );

  return new;
end;
$$;

revoke all on function leadflow.audit_order_change() from public, anon, authenticated;

drop trigger if exists audit_order_changes on leadflow.orders;
create trigger audit_order_changes
  after insert or update on leadflow.orders
  for each row execute function leadflow.audit_order_change();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema leadflow to anon, authenticated, service_role;
grant select on leadflow.orders, leadflow.order_items to authenticated;
grant select on leadflow.payments to authenticated;
grant all on leadflow.orders, leadflow.order_items, leadflow.payments to service_role;
