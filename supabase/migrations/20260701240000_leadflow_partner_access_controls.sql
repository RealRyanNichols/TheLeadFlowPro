-- LeadFlow Pro partner access controls.
-- Extends partner accounts for contributors, affiliates, data partners,
-- agencies, niche operators, source owners, and review-gated earnings.

create schema if not exists leadflow;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Partner account fields
-- ---------------------------------------------------------------------------

alter table if exists leadflow.partner_accounts add column if not exists auth_user_id uuid;
alter table if exists leadflow.partner_accounts add column if not exists email text;
alter table if exists leadflow.partner_accounts add column if not exists phone text;
alter table if exists leadflow.partner_accounts add column if not exists company text;
alter table if exists leadflow.partner_accounts add column if not exists website text;
alter table if exists leadflow.partner_accounts add column if not exists partner_type text not null default 'source_contributor';
alter table if exists leadflow.partner_accounts add column if not exists payout_preference text;
alter table if exists leadflow.partner_accounts add column if not exists status text not null default 'pending_review';
alter table if exists leadflow.partner_accounts add column if not exists admin_notes text;
alter table if exists leadflow.partner_accounts add column if not exists admin_notes_visible boolean not null default false;
alter table if exists leadflow.partner_accounts add column if not exists compliance_confirmations jsonb not null default '{}';
alter table if exists leadflow.partner_accounts add column if not exists last_login_at timestamptz;

update leadflow.partner_accounts
set company = coalesce(company, legal_name, name)
where company is null;

update leadflow.partner_accounts
set website = coalesce(website, website_url)
where website is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.partner_accounts'::regclass
      and conname = 'partner_accounts_partner_type_check'
  ) then
    alter table leadflow.partner_accounts
      add constraint partner_accounts_partner_type_check
      check (partner_type in (
        'source_contributor',
        'agency_partner',
        'creator_partner',
        'local_operator',
        'research_partner',
        'referral_partner',
        'data_partner',
        'client_partner'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.partner_accounts'::regclass
      and conname = 'partner_accounts_status_check'
  ) then
    alter table leadflow.partner_accounts
      add constraint partner_accounts_status_check
      check (status in ('pending_review', 'approved', 'restricted', 'suspended', 'denied'));
  end if;
end;
$$;

create unique index if not exists partner_accounts_auth_user_uidx
  on leadflow.partner_accounts(auth_user_id)
  where auth_user_id is not null and deleted_at is null;

create index if not exists partner_accounts_email_idx
  on leadflow.partner_accounts(lower(email), created_at desc)
  where email is not null and deleted_at is null;

create index if not exists partner_accounts_status_type_idx
  on leadflow.partner_accounts(status, partner_type, created_at desc)
  where deleted_at is null;

comment on column leadflow.partner_accounts.auth_user_id is
  'Supabase Auth user id for partner portal login. Authorization must not use user-editable metadata.';
comment on column leadflow.partner_accounts.partner_type is
  'Partner role: source contributor, agency, creator, local operator, research, referral, data, or client partner.';
comment on column leadflow.partner_accounts.status is
  'Review-gated partner status. Suspended and denied partners cannot submit or view restricted partner data.';
comment on column leadflow.partner_accounts.compliance_confirmations is
  'Partner assertions that they have rights to submit the source and are not submitting prohibited data.';

-- ---------------------------------------------------------------------------
-- Partner source, earnings, and payout tables
-- ---------------------------------------------------------------------------

create table if not exists leadflow.partner_sources (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete cascade,
  submitted_source_id uuid references leadflow.submitted_sources(id) on delete set null,
  marketplace_listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  source_name text not null,
  source_type text not null,
  source_url text,
  review_result text,
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'prohibited')),
  source_status text not null default 'submitted' check (source_status in (
    'submitted',
    'needs_review',
    'approved_for_research',
    'approved_for_marketplace',
    'rejected',
    'suppressed',
    'needs_permission',
    'duplicate',
    'archived'
  )),
  marketplace_status text not null default 'not_listed',
  buyer_requests_generated integer not null default 0 check (buyer_requests_generated >= 0),
  estimated_earnings numeric(12,2) not null default 0 check (estimated_earnings >= 0),
  partner_visible_admin_notes text,
  admin_notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.partner_sources is
  'Partner-visible source records connecting partner-owned or partner-submitted opportunities to review status, risk, marketplace status, and estimated earnings.';

create table if not exists leadflow.partner_earnings (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete cascade,
  source_id uuid references leadflow.partner_sources(id) on delete set null,
  listing_id uuid references leadflow.marketplace_listings(id) on delete set null,
  buyer_request_id uuid references leadflow.buyer_requests(id) on delete set null,
  earning_type text not null check (earning_type in (
    'source_submission_bonus',
    'marketplace_sale_share',
    'referral_commission',
    'exclusive_listing_bonus',
    'manual_adjustment'
  )),
  amount numeric(12,2) not null default 0,
  status text not null default 'estimated' check (status in ('estimated', 'pending', 'approved', 'paid', 'voided', 'disputed')),
  calculation_note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  deleted_at timestamptz
);

comment on table leadflow.partner_earnings is
  'Review-gated partner earning estimates and approvals. Amounts are not guaranteed until approved and paid.';

create table if not exists leadflow.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete cascade,
  payout_preference text,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'voided', 'disputed')),
  period_start date,
  period_end date,
  admin_notes text,
  created_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.partner_payouts is
  'Partner payout batches used by admins to approve and mark revenue-share or referral payments paid.';

create index if not exists partner_sources_partner_status_idx
  on leadflow.partner_sources(partner_account_id, source_status, risk_level, created_at desc)
  where deleted_at is null;

create index if not exists partner_sources_submission_idx
  on leadflow.partner_sources(submitted_source_id)
  where submitted_source_id is not null and deleted_at is null;

create index if not exists partner_sources_listing_idx
  on leadflow.partner_sources(marketplace_listing_id, marketplace_status)
  where marketplace_listing_id is not null and deleted_at is null;

create index if not exists partner_earnings_partner_status_idx
  on leadflow.partner_earnings(partner_account_id, status, created_at desc)
  where deleted_at is null;

create index if not exists partner_earnings_source_idx
  on leadflow.partner_earnings(source_id, earning_type, status)
  where source_id is not null and deleted_at is null;

create index if not exists partner_payouts_partner_status_idx
  on leadflow.partner_payouts(partner_account_id, status, created_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- Access helpers and RLS
-- ---------------------------------------------------------------------------

create or replace function leadflow.can_access_partner(target_partner_account_id uuid)
returns boolean
language sql
stable
security invoker
as $$
  select leadflow.is_platform_admin()
    or exists (
      select 1
      from leadflow.partner_accounts pa
      where pa.id = target_partner_account_id
        and pa.deleted_at is null
        and pa.status not in ('suspended', 'denied')
        and (
          (select auth.uid()) = pa.auth_user_id
          or (select auth.uid()) = pa.owner_user_id
          or (select auth.uid()) = any(pa.team_user_ids)
        )
    );
$$;

comment on function leadflow.can_access_partner(uuid) is
  'Partner membership predicate for source partners and admins. Uses auth_user_id, owner_user_id, team_user_ids, and platform-admin app_metadata only.';

create or replace function leadflow.current_partner_account_ids()
returns uuid[]
language sql
stable
security invoker
as $$
  select coalesce(array_agg(pa.id), '{}'::uuid[])
  from leadflow.partner_accounts pa
  where pa.deleted_at is null
    and pa.status not in ('suspended', 'denied')
    and (
      (select auth.uid()) = pa.auth_user_id
      or (select auth.uid()) = pa.owner_user_id
      or (select auth.uid()) = any(pa.team_user_ids)
    );
$$;

comment on function leadflow.current_partner_account_ids() is
  'Current Supabase Auth user partner account ids, excluding suspended and denied partners.';

alter table leadflow.partner_accounts enable row level security;
alter table leadflow.partner_sources enable row level security;
alter table leadflow.partner_earnings enable row level security;
alter table leadflow.partner_payouts enable row level security;

alter table leadflow.partner_accounts force row level security;
alter table leadflow.partner_sources force row level security;
alter table leadflow.partner_earnings force row level security;
alter table leadflow.partner_payouts force row level security;

drop policy if exists partner_accounts_select_portal_or_admin on leadflow.partner_accounts;
create policy partner_accounts_select_portal_or_admin on leadflow.partner_accounts
  for select to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      deleted_at is null
      and (
        (select auth.uid()) = auth_user_id
        or (select auth.uid()) = owner_user_id
        or (select auth.uid()) = any(team_user_ids)
      )
    )
  );

drop policy if exists partner_accounts_insert_portal_or_admin on leadflow.partner_accounts;
create policy partner_accounts_insert_portal_or_admin on leadflow.partner_accounts
  for insert to authenticated
  with check (
    leadflow.is_platform_admin()
    or (select auth.uid()) = auth_user_id
    or (select auth.uid()) = owner_user_id
  );

drop policy if exists partner_accounts_update_portal_or_admin on leadflow.partner_accounts;
create policy partner_accounts_update_portal_or_admin on leadflow.partner_accounts
  for update to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      deleted_at is null
      and (
        (select auth.uid()) = auth_user_id
        or (select auth.uid()) = owner_user_id
        or (select auth.uid()) = any(team_user_ids)
      )
    )
  )
  with check (
    leadflow.is_platform_admin()
    or (select auth.uid()) = auth_user_id
    or (select auth.uid()) = owner_user_id
    or (select auth.uid()) = any(team_user_ids)
  );

drop policy if exists lead_signal_admin_all_partner_sources on leadflow.partner_sources;
create policy lead_signal_admin_all_partner_sources on leadflow.partner_sources
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists partner_sources_select_own on leadflow.partner_sources;
create policy partner_sources_select_own on leadflow.partner_sources
  for select to authenticated
  using (deleted_at is null and partner_account_id = any(leadflow.current_partner_account_ids()));

drop policy if exists lead_signal_admin_all_partner_earnings on leadflow.partner_earnings;
create policy lead_signal_admin_all_partner_earnings on leadflow.partner_earnings
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists partner_earnings_select_own on leadflow.partner_earnings;
create policy partner_earnings_select_own on leadflow.partner_earnings
  for select to authenticated
  using (deleted_at is null and partner_account_id = any(leadflow.current_partner_account_ids()));

drop policy if exists lead_signal_admin_all_partner_payouts on leadflow.partner_payouts;
create policy lead_signal_admin_all_partner_payouts on leadflow.partner_payouts
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists partner_payouts_select_own on leadflow.partner_payouts;
create policy partner_payouts_select_own on leadflow.partner_payouts
  for select to authenticated
  using (deleted_at is null and partner_account_id = any(leadflow.current_partner_account_ids()));

grant usage on schema leadflow to authenticated, service_role;
grant execute on function leadflow.can_access_partner(uuid) to authenticated, service_role;
grant execute on function leadflow.current_partner_account_ids() to authenticated, service_role;

grant select, insert, update on leadflow.partner_accounts to authenticated;
grant select on leadflow.partner_sources to authenticated;
grant select on leadflow.partner_earnings to authenticated;
grant select on leadflow.partner_payouts to authenticated;

grant all on leadflow.partner_accounts to service_role;
grant all on leadflow.partner_sources to service_role;
grant all on leadflow.partner_earnings to service_role;
grant all on leadflow.partner_payouts to service_role;
grant select, insert on leadflow.audit_log to service_role;
grant select, insert on leadflow.events to service_role;

-- ---------------------------------------------------------------------------
-- Triggers and audit
-- ---------------------------------------------------------------------------

drop trigger if exists set_partner_sources_updated_at on leadflow.partner_sources;
create trigger set_partner_sources_updated_at
  before update on leadflow.partner_sources
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_partner_earnings_updated_at on leadflow.partner_earnings;
create trigger set_partner_earnings_updated_at
  before update on leadflow.partner_earnings
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_partner_payouts_updated_at on leadflow.partner_payouts;
create trigger set_partner_payouts_updated_at
  before update on leadflow.partner_payouts
  for each row execute function leadflow.set_updated_at();

create or replace function leadflow.audit_partner_access_change()
returns trigger
language plpgsql
security definer
set search_path = leadflow, public
as $$
declare
  audit_action text;
  row_json jsonb;
  old_json jsonb;
  actor_id uuid;
begin
  row_json := to_jsonb(new);
  old_json := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;

  begin
    actor_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  exception when others then
    actor_id := null;
  end;

  if tg_table_name = 'partner_accounts' and tg_op = 'UPDATE'
    and old.status is distinct from new.status then
    audit_action := 'partner.reviewed';
  elsif tg_table_name = 'partner_sources' and tg_op = 'UPDATE'
    and old.source_status is distinct from new.source_status then
    audit_action := 'partner_source.reviewed';
  elsif tg_table_name = 'partner_earnings' and tg_op = 'UPDATE'
    and old.status is distinct from new.status then
    audit_action := 'partner_earning.updated';
  elsif tg_table_name = 'partner_payouts' and tg_op = 'UPDATE'
    and old.status is distinct from new.status then
    audit_action := 'partner_payout.updated';
  elsif tg_op = 'INSERT' then
    audit_action := tg_table_name || '.created';
  else
    return new;
  end if;

  insert into leadflow.audit_log (
    partner_account_id,
    actor_user_id,
    actor_type,
    action,
    object_schema,
    object_table,
    object_id,
    before_redacted,
    after_redacted,
    details,
    occurred_at
  ) values (
    coalesce(nullif(row_json ->> 'partner_account_id', '')::uuid, case when tg_table_name = 'partner_accounts' then (row_json ->> 'id')::uuid else null end),
    actor_id,
    case when actor_id is null then 'system' else 'admin' end,
    audit_action,
    tg_table_schema,
    tg_table_name,
    (row_json ->> 'id')::uuid,
    jsonb_build_object(
      'status', old_json ->> 'status',
      'source_status', old_json ->> 'source_status',
      'risk_level', old_json ->> 'risk_level'
    ),
    jsonb_build_object(
      'status', row_json ->> 'status',
      'source_status', row_json ->> 'source_status',
      'risk_level', row_json ->> 'risk_level'
    ),
    jsonb_build_object('source', 'partner_access_trigger', 'operation', tg_op),
    now()
  );

  return new;
end;
$$;

drop trigger if exists audit_partner_account_review on leadflow.partner_accounts;
create trigger audit_partner_account_review
  after insert or update on leadflow.partner_accounts
  for each row execute function leadflow.audit_partner_access_change();

drop trigger if exists audit_partner_sources_review on leadflow.partner_sources;
create trigger audit_partner_sources_review
  after insert or update on leadflow.partner_sources
  for each row execute function leadflow.audit_partner_access_change();

drop trigger if exists audit_partner_earnings_changes on leadflow.partner_earnings;
create trigger audit_partner_earnings_changes
  after insert or update on leadflow.partner_earnings
  for each row execute function leadflow.audit_partner_access_change();

drop trigger if exists audit_partner_payouts_changes on leadflow.partner_payouts;
create trigger audit_partner_payouts_changes
  after insert or update on leadflow.partner_payouts
  for each row execute function leadflow.audit_partner_access_change();

revoke all on function leadflow.audit_partner_access_change() from public, anon, authenticated;
grant execute on function leadflow.audit_partner_access_change() to service_role;

-- Safe non-PII demo seed for local and preview environments.
insert into leadflow.partner_accounts (
  id,
  auth_user_id,
  owner_user_id,
  name,
  email,
  company,
  website,
  partner_type,
  payout_preference,
  status,
  compliance_confirmations,
  metadata
) values (
  '00000000-0000-0000-0000-000000000701',
  null,
  null,
  'Demo Source Partner',
  'partner-demo@example.com',
  'Demo Partner Co',
  'https://example.com',
  'source_contributor',
  'manual_review',
  'pending_review',
  '{"rights_to_submit":true,"no_prohibited_data":true,"review_gated":true,"no_guaranteed_payment":true}'::jsonb,
  '{"seed":"partner_access_controls"}'::jsonb
)
on conflict (id) do nothing;

insert into leadflow.partner_sources (
  id,
  partner_account_id,
  source_name,
  source_type,
  source_url,
  review_result,
  risk_level,
  source_status,
  marketplace_status,
  buyer_requests_generated,
  estimated_earnings,
  partner_visible_admin_notes,
  metadata
) values (
  '00000000-0000-0000-0000-000000000702',
  '00000000-0000-0000-0000-000000000701',
  'Demo local service route',
  'local_service_route',
  'https://example.com/demo-route',
  'Needs source proof review before marketplace release.',
  'medium',
  'needs_review',
  'not_listed',
  2,
  125.00,
  'Demo note visible to the partner.',
  '{"seed":"partner_access_controls"}'::jsonb
)
on conflict (id) do nothing;

insert into leadflow.partner_earnings (
  id,
  partner_account_id,
  source_id,
  earning_type,
  amount,
  status,
  calculation_note,
  metadata
) values (
  '00000000-0000-0000-0000-000000000703',
  '00000000-0000-0000-0000-000000000701',
  '00000000-0000-0000-0000-000000000702',
  'source_submission_bonus',
  25.00,
  'estimated',
  'Demo estimate only. Partner earnings are review-gated and not guaranteed.',
  '{"seed":"partner_access_controls"}'::jsonb
)
on conflict (id) do nothing;
