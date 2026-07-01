-- LeadFlow Pro buyer portal access controls.
-- Adds Supabase Auth buyer linkage, buyer entitlement records, watchlists,
-- and RLS helpers for review-gated lead signal access.

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
-- Buyer account compatibility fields
-- ---------------------------------------------------------------------------

alter table if exists leadflow.buyer_accounts add column if not exists auth_user_id uuid;
alter table if exists leadflow.buyer_accounts add column if not exists email text;
alter table if exists leadflow.buyer_accounts add column if not exists phone text;
alter table if exists leadflow.buyer_accounts add column if not exists website text;
alter table if exists leadflow.buyer_accounts add column if not exists buyer_type text;
alter table if exists leadflow.buyer_accounts add column if not exists industry text;
alter table if exists leadflow.buyer_accounts add column if not exists location_served text;
alter table if exists leadflow.buyer_accounts add column if not exists budget_range text;
alter table if exists leadflow.buyer_accounts add column if not exists intended_use text;
alter table if exists leadflow.buyer_accounts add column if not exists account_status text not null default 'pending_review';
alter table if exists leadflow.buyer_accounts add column if not exists approved_access_level text not null default 'none';
alter table if exists leadflow.buyer_accounts add column if not exists communication_preference text;
alter table if exists leadflow.buyer_accounts add column if not exists consent_status text not null default 'not_requested';
alter table if exists leadflow.buyer_accounts add column if not exists last_login_at timestamptz;

update leadflow.buyer_accounts
set website = coalesce(website, website_url)
where website is null
  and website_url is not null;

update leadflow.buyer_accounts
set auth_user_id = owner_user_id
where auth_user_id is null
  and owner_user_id is not null;

update leadflow.buyer_accounts
set account_status = case
  when status = 'suspended' then 'suspended'
  when review_status = 'rejected' then 'denied'
  when status in ('active', 'approved') and review_status = 'approved' then 'approved_basic'
  else coalesce(account_status, 'pending_review')
end
where account_status is null
   or account_status not in ('pending_review', 'approved_basic', 'approved_partner', 'approved_premium', 'suspended', 'denied');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.buyer_accounts'::regclass
      and conname = 'buyer_accounts_account_status_check'
  ) then
    alter table leadflow.buyer_accounts
      add constraint buyer_accounts_account_status_check
      check (account_status in ('pending_review', 'approved_basic', 'approved_partner', 'approved_premium', 'suspended', 'denied'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.buyer_accounts'::regclass
      and conname = 'buyer_accounts_approved_access_level_check'
  ) then
    alter table leadflow.buyer_accounts
      add constraint buyer_accounts_approved_access_level_check
      check (approved_access_level in ('none', 'basic', 'partner', 'premium', 'exclusive', 'admin'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.buyer_accounts'::regclass
      and conname = 'buyer_accounts_consent_status_check'
  ) then
    alter table leadflow.buyer_accounts
      add constraint buyer_accounts_consent_status_check
      check (consent_status in ('not_requested', 'viewed', 'accepted', 'declined', 'revoked'));
  end if;
end $$;

create unique index if not exists buyer_accounts_auth_user_uidx
  on leadflow.buyer_accounts(auth_user_id)
  where auth_user_id is not null and deleted_at is null;
create index if not exists buyer_accounts_email_idx on leadflow.buyer_accounts(email);
create index if not exists buyer_accounts_status_access_idx
  on leadflow.buyer_accounts(account_status, approved_access_level, created_at desc);

-- ---------------------------------------------------------------------------
-- Marketplace and buyer request compatibility fields
-- ---------------------------------------------------------------------------

alter table if exists leadflow.marketplace_listings add column if not exists slug text;

with base_slugs as (
  select
    id,
    coalesce(
      nullif(
        regexp_replace(
          regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g'),
          '(^-|-$)',
          '',
          'g'
        ),
        ''
      ),
      'listing'
    ) as base_slug
  from leadflow.marketplace_listings
  where slug is null
),
numbered as (
  select
    id,
    base_slug,
    row_number() over (partition by base_slug order by id) as duplicate_number
  from base_slugs
)
update leadflow.marketplace_listings ml
set slug = case
  when n.duplicate_number = 1 then n.base_slug
  else n.base_slug || '-' || left(ml.id::text, 8)
end
from numbered n
where ml.id = n.id;

create unique index if not exists marketplace_listings_slug_uidx
  on leadflow.marketplace_listings(slug)
  where slug is not null and deleted_at is null;
create index if not exists marketplace_listings_public_preview_idx
  on leadflow.marketplace_listings(review_status, listing_status, compliance_status, created_at desc);

alter table if exists leadflow.buyer_requests add column if not exists listing_id uuid references leadflow.marketplace_listings(id) on delete set null;
alter table if exists leadflow.buyer_requests add column if not exists listing_slug text;
alter table if exists leadflow.buyer_requests add column if not exists message text;
alter table if exists leadflow.buyer_requests add column if not exists intended_use text;
alter table if exists leadflow.buyer_requests add column if not exists budget_range text;
alter table if exists leadflow.buyer_requests add column if not exists urgency text;
alter table if exists leadflow.buyer_requests add column if not exists reviewed_by uuid;
alter table if exists leadflow.buyer_requests add column if not exists reviewed_at timestamptz;
alter table if exists leadflow.buyer_requests add column if not exists admin_notes text;
alter table if exists leadflow.buyer_requests add column if not exists admin_notes_visible boolean not null default false;

update leadflow.buyer_requests br
set listing_id = coalesce(br.listing_id, br.marketplace_listing_id),
    listing_slug = coalesce(br.listing_slug, ml.slug, br.metadata ->> 'listing_id'),
    intended_use = coalesce(br.intended_use, br.buyer_use_case),
    budget_range = coalesce(br.budget_range, br.filters ->> 'monthlyBudgetRange', br.metadata ->> 'monthly_budget_range'),
    urgency = coalesce(br.urgency, br.filters ->> 'speed'),
    message = coalesce(br.message, br.metadata ->> 'notes')
from leadflow.marketplace_listings ml
where ml.id = br.marketplace_listing_id;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'leadflow.buyer_requests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%request_type%'
  loop
    execute format('alter table leadflow.buyer_requests drop constraint %I', constraint_row.conname);
  end loop;

  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'leadflow.buyer_requests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
      and pg_get_constraintdef(oid) not ilike '%review_status%'
  loop
    execute format('alter table leadflow.buyer_requests drop constraint %I', constraint_row.conname);
  end loop;
end $$;

alter table leadflow.buyer_requests
  add constraint buyer_requests_request_type_check
  check (request_type in ('sample', 'access', 'purchase', 'exclusive', 'build_system', 'custom_pack'));

alter table leadflow.buyer_requests
  add constraint buyer_requests_status_check
  check (status in ('submitted', 'pending_review', 'review', 'approved', 'denied', 'rejected', 'fulfilled', 'cancelled'));

create index if not exists buyer_requests_listing_slug_idx
  on leadflow.buyer_requests(buyer_account_id, listing_slug, status, created_at desc);
create index if not exists buyer_requests_listing_id_idx
  on leadflow.buyer_requests(listing_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- Buyer entitlements and watchlist
-- ---------------------------------------------------------------------------

create table if not exists leadflow.buyer_entitlements (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid not null references leadflow.buyer_accounts(id) on delete cascade,
  listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  listing_slug text,
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null,
  access_level text not null default 'summary',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}',
  constraint buyer_entitlements_access_level_check
    check (access_level in ('sample', 'summary', 'full_profile', 'raw_export', 'exclusive', 'aggregate')),
  constraint buyer_entitlements_status_check
    check (status in ('active', 'paused', 'expired', 'revoked', 'cancelled'))
);

comment on table leadflow.buyer_entitlements is
  'Buyer-specific access grants for marketplace listings and lead profiles. Buyers only see full data when an active entitlement permits it.';

create index if not exists buyer_entitlements_buyer_status_idx
  on leadflow.buyer_entitlements(buyer_account_id, status, starts_at desc);
create index if not exists buyer_entitlements_listing_idx
  on leadflow.buyer_entitlements(listing_id, listing_slug, status);
create index if not exists buyer_entitlements_profile_idx
  on leadflow.buyer_entitlements(lead_profile_id, status);
create index if not exists buyer_entitlements_window_idx
  on leadflow.buyer_entitlements(starts_at, expires_at);

create table if not exists leadflow.buyer_watchlist (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid not null references leadflow.buyer_accounts(id) on delete cascade,
  listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  listing_slug text not null,
  title text not null,
  category text not null default 'Marketplace',
  source_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_account_id, listing_slug)
);

comment on table leadflow.buyer_watchlist is
  'Saved marketplace listings for a buyer account. Watchlist membership is not an access grant.';

create index if not exists buyer_watchlist_buyer_idx
  on leadflow.buyer_watchlist(buyer_account_id, created_at desc);
create index if not exists buyer_watchlist_listing_slug_idx
  on leadflow.buyer_watchlist(listing_slug, created_at desc);

drop trigger if exists set_buyer_entitlements_updated_at on leadflow.buyer_entitlements;
create trigger set_buyer_entitlements_updated_at
  before update on leadflow.buyer_entitlements
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_buyer_watchlist_updated_at on leadflow.buyer_watchlist;
create trigger set_buyer_watchlist_updated_at
  before update on leadflow.buyer_watchlist
  for each row execute function leadflow.set_updated_at();

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function leadflow.current_buyer_account_ids()
returns uuid[]
language sql
stable
security invoker
as $$
  select coalesce(array_agg(ba.id), '{}'::uuid[])
  from leadflow.buyer_accounts ba
  where ba.deleted_at is null
    and coalesce(ba.account_status, 'pending_review') not in ('suspended', 'denied')
    and coalesce(ba.status, 'pending') not in ('suspended', 'closed')
    and (
      (select auth.uid()) = ba.auth_user_id
      or (select auth.uid()) = ba.owner_user_id
      or (select auth.uid()) = any(ba.team_user_ids)
    );
$$;

comment on function leadflow.current_buyer_account_ids() is
  'Buyer account ids attached to the current Supabase Auth user, excluding suspended and denied accounts.';

create or replace function leadflow.buyer_account_is_approved(target_buyer_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = leadflow, public
as $$
  select exists (
    select 1
    from leadflow.buyer_accounts ba
    where ba.id = target_buyer_account_id
      and ba.deleted_at is null
      and ba.account_status in ('approved_basic', 'approved_partner', 'approved_premium')
      and coalesce(ba.status, 'pending') not in ('suspended', 'closed')
      and (
        (select auth.uid()) = ba.auth_user_id
        or (select auth.uid()) = ba.owner_user_id
        or (select auth.uid()) = any(ba.team_user_ids)
      )
  );
$$;

create or replace function leadflow.buyer_has_listing_entitlement(
  target_listing_id uuid,
  target_listing_slug text default null
)
returns boolean
language sql
stable
security definer
set search_path = leadflow, public
as $$
  select exists (
    select 1
    from leadflow.buyer_entitlements be
    join leadflow.buyer_accounts ba on ba.id = be.buyer_account_id
    where be.status = 'active'
      and be.starts_at <= now()
      and (be.expires_at is null or be.expires_at > now())
      and ba.deleted_at is null
      and ba.account_status in ('approved_basic', 'approved_partner', 'approved_premium')
      and coalesce(ba.status, 'pending') not in ('suspended', 'closed')
      and (
        be.listing_id = target_listing_id
        or (
          target_listing_slug is not null
          and be.listing_slug = target_listing_slug
        )
      )
      and (
        (select auth.uid()) = ba.auth_user_id
        or (select auth.uid()) = ba.owner_user_id
        or (select auth.uid()) = any(ba.team_user_ids)
      )
  );
$$;

create or replace function leadflow.buyer_has_lead_profile_entitlement(target_lead_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = leadflow, public
as $$
  select exists (
    select 1
    from leadflow.buyer_entitlements be
    join leadflow.buyer_accounts ba on ba.id = be.buyer_account_id
    join leadflow.lead_profiles lp on lp.id = target_lead_profile_id
    where be.lead_profile_id = target_lead_profile_id
      and be.status = 'active'
      and be.starts_at <= now()
      and (be.expires_at is null or be.expires_at > now())
      and ba.deleted_at is null
      and ba.account_status in ('approved_basic', 'approved_partner', 'approved_premium')
      and coalesce(ba.status, 'pending') not in ('suspended', 'closed')
      and lp.deleted_at is null
      and lp.review_status = 'approved'
      and lp.status in ('sample_available', 'available', 'sold')
      and lp.suppression_status not in ('suppressed', 'do_not_contact', 'delete_requested')
      and (
        (select auth.uid()) = ba.auth_user_id
        or (select auth.uid()) = ba.owner_user_id
        or (select auth.uid()) = any(ba.team_user_ids)
      )
      and not leadflow.lead_profile_has_active_suppression(target_lead_profile_id)
  );
$$;

comment on function leadflow.buyer_has_listing_entitlement(uuid, text) is
  'Checks whether the current buyer has an active listing entitlement.';
comment on function leadflow.buyer_has_lead_profile_entitlement(uuid) is
  'Checks whether the current buyer has an active lead-profile entitlement and the profile is not suppressed.';

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

alter table leadflow.buyer_accounts enable row level security;
alter table leadflow.buyer_requests enable row level security;
alter table leadflow.buyer_entitlements enable row level security;
alter table leadflow.buyer_watchlist enable row level security;
alter table leadflow.marketplace_listings enable row level security;
alter table leadflow.lead_profiles enable row level security;
alter table leadflow.lead_scores enable row level security;
alter table leadflow.source_proofs enable row level security;
alter table leadflow.answers enable row level security;

alter table leadflow.buyer_accounts force row level security;
alter table leadflow.buyer_requests force row level security;
alter table leadflow.buyer_entitlements force row level security;
alter table leadflow.buyer_watchlist force row level security;

drop policy if exists buyer_accounts_select_own_lead_signal on leadflow.buyer_accounts;
create policy buyer_accounts_select_own_lead_signal on leadflow.buyer_accounts
  for select to authenticated
  using (
    deleted_at is null
    and (
      (select auth.uid()) = auth_user_id
      or (select auth.uid()) = owner_user_id
      or (select auth.uid()) = any(team_user_ids)
    )
  );

drop policy if exists buyer_accounts_insert_own_lead_signal on leadflow.buyer_accounts;
create policy buyer_accounts_insert_own_lead_signal on leadflow.buyer_accounts
  for insert to authenticated
  with check (
    (select auth.uid()) = auth_user_id
    or (select auth.uid()) = owner_user_id
  );

drop policy if exists buyer_accounts_update_own_lead_signal on leadflow.buyer_accounts;
create policy buyer_accounts_update_own_lead_signal on leadflow.buyer_accounts
  for update to authenticated
  using (
    deleted_at is null
    and coalesce(account_status, 'pending_review') not in ('suspended', 'denied')
    and (
      (select auth.uid()) = auth_user_id
      or (select auth.uid()) = owner_user_id
      or (select auth.uid()) = any(team_user_ids)
    )
  )
  with check (
    (select auth.uid()) = auth_user_id
    or (select auth.uid()) = owner_user_id
    or (select auth.uid()) = any(team_user_ids)
  );

drop policy if exists marketplace_listings_select_approved on leadflow.marketplace_listings;
create policy marketplace_listings_select_approved on leadflow.marketplace_listings
  for select to anon, authenticated
  using (
    deleted_at is null
    and review_status = 'approved'
    and listing_status in ('sample_available', 'available')
    and compliance_status not in ('blocked', 'suppressed')
  );

drop policy if exists buyer_requests_select_own on leadflow.buyer_requests;
create policy buyer_requests_select_own on leadflow.buyer_requests
  for select to authenticated
  using (
    buyer_account_id = any(leadflow.current_buyer_account_ids())
  );

drop policy if exists buyer_requests_insert_own on leadflow.buyer_requests;
create policy buyer_requests_insert_own on leadflow.buyer_requests
  for insert to authenticated
  with check (
    buyer_account_id = any(leadflow.current_buyer_account_ids())
    and status in ('submitted', 'pending_review')
  );

drop policy if exists buyer_entitlements_select_own on leadflow.buyer_entitlements;
create policy buyer_entitlements_select_own on leadflow.buyer_entitlements
  for select to authenticated
  using (
    buyer_account_id = any(leadflow.current_buyer_account_ids())
    and status = 'active'
    and starts_at <= now()
    and (expires_at is null or expires_at > now())
  );

drop policy if exists buyer_watchlist_select_own on leadflow.buyer_watchlist;
create policy buyer_watchlist_select_own on leadflow.buyer_watchlist
  for select to authenticated
  using (buyer_account_id = any(leadflow.current_buyer_account_ids()));

drop policy if exists buyer_watchlist_insert_own on leadflow.buyer_watchlist;
create policy buyer_watchlist_insert_own on leadflow.buyer_watchlist
  for insert to authenticated
  with check (buyer_account_id = any(leadflow.current_buyer_account_ids()));

drop policy if exists buyer_watchlist_delete_own on leadflow.buyer_watchlist;
create policy buyer_watchlist_delete_own on leadflow.buyer_watchlist
  for delete to authenticated
  using (buyer_account_id = any(leadflow.current_buyer_account_ids()));

drop policy if exists lead_profiles_select_entitled_buyer_portal on leadflow.lead_profiles;
create policy lead_profiles_select_entitled_buyer_portal on leadflow.lead_profiles
  for select to authenticated
  using (leadflow.buyer_has_lead_profile_entitlement(id));

drop policy if exists lead_scores_select_entitled_buyer_portal on leadflow.lead_scores;
create policy lead_scores_select_entitled_buyer_portal on leadflow.lead_scores
  for select to authenticated
  using (
    review_status = 'approved'
    and leadflow.buyer_has_lead_profile_entitlement(lead_profile_id)
  );

drop policy if exists source_proofs_select_entitled_buyer_portal on leadflow.source_proofs;
create policy source_proofs_select_entitled_buyer_portal on leadflow.source_proofs
  for select to authenticated
  using (
    review_status = 'approved'
    and status = 'approved'
    and leadflow.buyer_has_lead_profile_entitlement(lead_profile_id)
  );

drop policy if exists answers_select_buyer_entitled_raw_approval on leadflow.answers;
create policy answers_select_buyer_entitled_raw_approval on leadflow.answers
  for select to authenticated
  using (
    approved_for_buyer = true
    and response_id is not null
    and exists (
      select 1
      from leadflow.lead_profiles lp
      where lp.response_id = answers.response_id
        and leadflow.buyer_has_lead_profile_entitlement(lp.id)
        and exists (
          select 1
          from leadflow.buyer_entitlements be
          where be.lead_profile_id = lp.id
            and be.access_level in ('full_profile', 'raw_export', 'exclusive')
            and be.status = 'active'
            and be.buyer_account_id = any(leadflow.current_buyer_account_ids())
        )
    )
  );

drop policy if exists lead_signal_admin_all_buyer_entitlements on leadflow.buyer_entitlements;
create policy lead_signal_admin_all_buyer_entitlements on leadflow.buyer_entitlements
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_buyer_watchlist on leadflow.buyer_watchlist;
create policy lead_signal_admin_all_buyer_watchlist on leadflow.buyer_watchlist
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Audit buyer entitlement grants and summary views
-- ---------------------------------------------------------------------------

create or replace function leadflow.audit_buyer_entitlement_change()
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
    lead_profile_id,
    marketplace_listing_id,
    before_redacted,
    after_redacted,
    details,
    occurred_at
  ) values (
    actor_id,
    case when actor_id is null then 'system' else 'admin' end,
    case when tg_op = 'INSERT' then 'buyer_entitlement.granted' else 'buyer_entitlement.updated' end,
    tg_table_schema,
    tg_table_name,
    new.id,
    new.buyer_account_id,
    new.lead_profile_id,
    new.listing_id,
    case when tg_op = 'UPDATE' then jsonb_build_object('status', old.status, 'access_level', old.access_level) else '{}'::jsonb end,
    jsonb_build_object('status', new.status, 'access_level', new.access_level),
    jsonb_build_object('source', 'buyer_portal_access_controls', 'listing_slug', new.listing_slug),
    now()
  );

  return new;
end;
$$;

drop trigger if exists audit_buyer_entitlement_changes on leadflow.buyer_entitlements;
create trigger audit_buyer_entitlement_changes
  after insert or update on leadflow.buyer_entitlements
  for each row execute function leadflow.audit_buyer_entitlement_change();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema leadflow to anon, authenticated, service_role;
grant select on leadflow.marketplace_listings to anon, authenticated;
grant select, insert, update on leadflow.buyer_accounts to authenticated;
grant select, insert on leadflow.buyer_requests to authenticated;
grant select on leadflow.buyer_entitlements to authenticated;
grant select, insert, delete on leadflow.buyer_watchlist to authenticated;
grant select on leadflow.lead_profiles to authenticated;
grant select on leadflow.lead_scores to authenticated;
grant select on leadflow.source_proofs to authenticated;
grant select on leadflow.answers to authenticated;
grant execute on function leadflow.current_buyer_account_ids() to authenticated, service_role;
grant execute on function leadflow.buyer_account_is_approved(uuid) to authenticated, service_role;
grant execute on function leadflow.buyer_has_listing_entitlement(uuid, text) to authenticated, service_role;
grant execute on function leadflow.buyer_has_lead_profile_entitlement(uuid) to authenticated, service_role;
grant all on leadflow.buyer_entitlements to service_role;
grant all on leadflow.buyer_watchlist to service_role;

-- Data classification notes:
-- Public: marketplace_listings previews only.
-- Buyer-visible: buyer_accounts own row, buyer_requests own rows, buyer_watchlist own rows,
-- buyer_entitlements own active grants, and entitlement-approved lead summaries.
-- Private/admin-only: raw answers, private profiles, audit details, suppression records, exports.
-- Service role is used only server-side for governed portal APIs and must never be exposed to clients.
