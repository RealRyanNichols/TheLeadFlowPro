-- LeadFlow Pro Phase 3: governed buyer integrations and delivery logs.
-- Integrations route approved lead signal summaries into buyer systems without
-- exposing raw answers, admin notes, suppressed records, or webhook secrets.

create table if not exists leadflow.integrations (
  id uuid primary key default gen_random_uuid(),
  buyer_account_id uuid not null references leadflow.buyer_accounts(id) on delete cascade,
  provider text not null,
  name text not null,
  status text not null default 'draft',
  config_encrypted jsonb not null default '{}'::jsonb,
  field_mapping jsonb not null default '{}'::jsonb,
  allowed_listing_ids uuid[] not null default '{}'::uuid[],
  allowed_verticals text[] not null default '{}'::text[],
  delivery_settings jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint integrations_provider_check check (
    provider in (
      'webhook',
      'csv',
      'google_sheets',
      'hubspot',
      'gohighlevel',
      'salesforce',
      'zapier',
      'make',
      'airtable',
      'email'
    )
  ),
  constraint integrations_status_check check (
    status in ('draft', 'active', 'paused', 'failed', 'revoked')
  ),
  constraint integrations_name_not_blank check (length(trim(name)) > 0)
);

comment on table leadflow.integrations is
  'Buyer-owned delivery integrations for approved lead signal products. Provider secrets stay server-side and are never returned to clients.';
comment on column leadflow.integrations.config_encrypted is
  'Protected provider configuration. Encrypted when LEADFLOW_INTEGRATION_SECRET_KEY is configured; otherwise secrets are not stored.';
comment on column leadflow.integrations.field_mapping is
  'Buyer-approved field mapping from LeadFlow safe payload keys into the destination system.';
comment on column leadflow.integrations.allowed_listing_ids is
  'Optional entitlement-checked listing allowlist for delivery runs.';
comment on column leadflow.integrations.allowed_verticals is
  'Optional vertical allowlist. Delivery still requires active buyer entitlement.';

create table if not exists leadflow.integration_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references leadflow.integrations(id) on delete cascade,
  run_type text not null,
  status text not null default 'queued',
  listing_id uuid null references leadflow.marketplace_listings(id) on delete set null,
  profile_count integer not null default 0 check (profile_count >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  error_message text null
);

comment on table leadflow.integration_runs is
  'Audited delivery attempts for buyer integrations. Runs never store full raw lead records.';
comment on column leadflow.integration_runs.error_message is
  'Short operational error text only. Do not store raw payloads, tokens, or destination secrets.';

create table if not exists leadflow.integration_logs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references leadflow.integrations(id) on delete cascade,
  run_id uuid null references leadflow.integration_runs(id) on delete set null,
  log_level text not null default 'info',
  event_type text not null,
  message text not null,
  payload_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint integration_logs_level_check check (log_level in ('info', 'warning', 'error', 'security')),
  constraint integration_logs_event_type_not_blank check (length(trim(event_type)) > 0)
);

comment on table leadflow.integration_logs is
  'Redacted integration log entries. Payload summaries include counts, statuses, and safe field names only.';
comment on column leadflow.integration_logs.payload_summary is
  'Redacted delivery metadata. Never store admin notes, webhook secrets, raw questionnaire answers, or contact fields unless explicitly entitlement-approved.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'leadflow.integration_runs'::regclass
      and conname = 'integration_runs_type_check'
  ) then
    alter table leadflow.integration_runs
      add constraint integration_runs_type_check
      check (run_type in ('test', 'manual', 'scheduled', 'webhook_retry', 'csv_export', 'email_notification'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'leadflow.integration_runs'::regclass
      and conname = 'integration_runs_status_check'
  ) then
    alter table leadflow.integration_runs
      add constraint integration_runs_status_check
      check (status in ('queued', 'running', 'completed', 'failed', 'blocked'));
  end if;
end $$;

create index if not exists integrations_buyer_status_idx
  on leadflow.integrations(buyer_account_id, status, updated_at desc)
  where deleted_at is null;
create index if not exists integrations_provider_idx
  on leadflow.integrations(provider, status, updated_at desc)
  where deleted_at is null;
create index if not exists integrations_allowed_verticals_gin_idx
  on leadflow.integrations using gin(allowed_verticals);
create index if not exists integrations_allowed_listings_gin_idx
  on leadflow.integrations using gin(allowed_listing_ids);
create index if not exists integration_runs_integration_time_idx
  on leadflow.integration_runs(integration_id, started_at desc);
create index if not exists integration_runs_status_time_idx
  on leadflow.integration_runs(status, started_at desc);
create index if not exists integration_logs_integration_time_idx
  on leadflow.integration_logs(integration_id, created_at desc);
create index if not exists integration_logs_run_idx
  on leadflow.integration_logs(run_id, created_at desc);

drop trigger if exists set_integrations_updated_at on leadflow.integrations;
create trigger set_integrations_updated_at
  before update on leadflow.integrations
  for each row execute function leadflow.set_updated_at();

alter table leadflow.integrations enable row level security;
alter table leadflow.integration_runs enable row level security;
alter table leadflow.integration_logs enable row level security;

alter table leadflow.integrations force row level security;
alter table leadflow.integration_runs force row level security;
alter table leadflow.integration_logs force row level security;

drop policy if exists buyer_select_own_integrations on leadflow.integrations;
create policy buyer_select_own_integrations on leadflow.integrations
  for select to authenticated
  using (
    deleted_at is null
    and buyer_account_id = any(leadflow.current_buyer_account_ids())
  );

drop policy if exists buyer_select_own_integration_runs on leadflow.integration_runs;
create policy buyer_select_own_integration_runs on leadflow.integration_runs
  for select to authenticated
  using (
    exists (
      select 1
      from leadflow.integrations i
      where i.id = integration_runs.integration_id
        and i.deleted_at is null
        and i.buyer_account_id = any(leadflow.current_buyer_account_ids())
    )
  );

drop policy if exists buyer_select_own_integration_logs on leadflow.integration_logs;
create policy buyer_select_own_integration_logs on leadflow.integration_logs
  for select to authenticated
  using (
    exists (
      select 1
      from leadflow.integrations i
      where i.id = integration_logs.integration_id
        and i.deleted_at is null
        and i.buyer_account_id = any(leadflow.current_buyer_account_ids())
    )
  );

drop policy if exists lead_signal_admin_all_integrations on leadflow.integrations;
create policy lead_signal_admin_all_integrations on leadflow.integrations
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_integration_runs on leadflow.integration_runs;
create policy lead_signal_admin_all_integration_runs on leadflow.integration_runs
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_integration_logs on leadflow.integration_logs;
create policy lead_signal_admin_all_integration_logs on leadflow.integration_logs
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

create or replace function leadflow.audit_integration_change()
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
    before_redacted,
    after_redacted,
    details,
    occurred_at
  ) values (
    actor_id,
    case when actor_id is null then 'system' else 'buyer' end,
    case when tg_op = 'INSERT' then 'integration.created' else 'integration.updated' end,
    tg_table_schema,
    tg_table_name,
    new.id,
    new.buyer_account_id,
    case
      when tg_op = 'UPDATE' then jsonb_build_object(
        'provider', old.provider,
        'status', old.status,
        'allowed_listing_count', coalesce(array_length(old.allowed_listing_ids, 1), 0),
        'allowed_vertical_count', coalesce(array_length(old.allowed_verticals, 1), 0)
      )
      else '{}'::jsonb
    end,
    jsonb_build_object(
      'provider', new.provider,
      'status', new.status,
      'allowed_listing_count', coalesce(array_length(new.allowed_listing_ids, 1), 0),
      'allowed_vertical_count', coalesce(array_length(new.allowed_verticals, 1), 0)
    ),
    jsonb_build_object(
      'source', 'integrations_framework',
      'config_returned_to_client', false,
      'raw_answers_returned', false
    ),
    now()
  );

  return new;
end;
$$;

revoke all on function leadflow.audit_integration_change() from public, anon, authenticated;

drop trigger if exists audit_integration_changes on leadflow.integrations;
create trigger audit_integration_changes
  after insert or update on leadflow.integrations
  for each row execute function leadflow.audit_integration_change();

grant usage on schema leadflow to anon, authenticated, service_role;
grant select on leadflow.integrations, leadflow.integration_runs, leadflow.integration_logs to authenticated;
grant all on leadflow.integrations, leadflow.integration_runs, leadflow.integration_logs to service_role;

-- Data classification:
-- Buyer-visible: integration names, provider, status, masked destination previews, own run history, redacted logs.
-- Admin-visible: all integration rows and redacted delivery logs, still without raw secrets in UI responses.
-- Private/server-only: encrypted provider config, webhook secret material, destination tokens, raw payloads.
-- Delivery rule: every run must re-check active buyer entitlement, suppression status, review state, and approved field groups.
