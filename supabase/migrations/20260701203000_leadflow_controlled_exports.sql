-- LeadFlow Pro controlled exports.
-- Adds scoped export metadata and export_items for permissioned, audited buyer/admin delivery.

create schema if not exists leadflow;

alter table if exists leadflow.exports add column if not exists format text not null default 'csv';
alter table if exists leadflow.exports add column if not exists field_groups text[] not null default '{public_profile,source_proof,compliance}';
alter table if exists leadflow.exports add column if not exists profile_count integer not null default 0;
alter table if exists leadflow.exports add column if not exists file_url text;
alter table if exists leadflow.exports add column if not exists reason text;
alter table if exists leadflow.exports add column if not exists created_by text;
alter table if exists leadflow.exports add column if not exists signed_url_expires_at timestamptz;
alter table if exists leadflow.exports add column if not exists metadata jsonb not null default '{}';

update leadflow.exports
set profile_count = row_count
where profile_count = 0
  and row_count > 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exports_format_check'
      and conrelid = 'leadflow.exports'::regclass
  ) then
    alter table leadflow.exports
      add constraint exports_format_check check (format in ('csv', 'json', 'xlsx', 'pdf'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'exports_profile_count_check'
      and conrelid = 'leadflow.exports'::regclass
  ) then
    alter table leadflow.exports
      add constraint exports_profile_count_check check (profile_count >= 0);
  end if;
end $$;

comment on column leadflow.exports.format is
  'Requested export format. Current implementation generates CSV and admin JSON server-side.';
comment on column leadflow.exports.field_groups is
  'Approved field groups selected for the export: public_profile, contact, source_proof, compliance, admin.';
comment on column leadflow.exports.profile_count is
  'Number of lead profiles included after suppression, entitlement, and risk checks.';
comment on column leadflow.exports.file_url is
  'Internal protected download route or signed storage URL. Do not use public bucket URLs for restricted exports.';
comment on column leadflow.exports.reason is
  'Plain-English reason or approved use for the export.';
comment on column leadflow.exports.created_by is
  'Actor identifier for systems that cannot store a UUID user id.';
comment on column leadflow.exports.signed_url_expires_at is
  'Expiration timestamp for signed or protected download access.';

create table if not exists leadflow.export_items (
  id uuid primary key default gen_random_uuid(),
  export_id uuid not null references leadflow.exports(id) on delete cascade,
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null,
  included_fields text[] not null default '{}',
  included_field_groups text[] not null default '{}',
  field_group_summary jsonb not null default '{}',
  created_at timestamptz not null default now()
);

comment on table leadflow.export_items is
  'Per-profile export membership rows. Stores the field groups included without copying raw lead data into the audit trail.';
comment on column leadflow.export_items.included_fields is
  'Allowed output field groups or specific field names included for this exported profile.';
comment on column leadflow.export_items.field_group_summary is
  'Redacted details about why the profile was included, never raw answers or private admin notes.';

create index if not exists exports_type_status_created_idx
  on leadflow.exports(export_type, export_status, created_at desc)
  where deleted_at is null;
create index if not exists exports_listing_status_idx
  on leadflow.exports(marketplace_listing_id, export_status, created_at desc)
  where deleted_at is null;
create index if not exists exports_expiry_idx
  on leadflow.exports(expires_at, export_status)
  where deleted_at is null;
create index if not exists export_items_export_idx
  on leadflow.export_items(export_id, created_at desc);
create index if not exists export_items_profile_idx
  on leadflow.export_items(lead_profile_id, created_at desc);

alter table leadflow.export_items enable row level security;
alter table leadflow.export_items force row level security;

drop policy if exists lead_signal_admin_all_export_items on leadflow.export_items;
create policy lead_signal_admin_all_export_items on leadflow.export_items
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists export_items_select_own_buyer on leadflow.export_items;
create policy export_items_select_own_buyer on leadflow.export_items
  for select to authenticated
  using (
    exists (
      select 1
      from leadflow.exports e
      where e.id = export_items.export_id
        and e.deleted_at is null
        and e.buyer_account_id = any(leadflow.current_buyer_account_ids())
        and e.raw_answers_included = false
    )
  );

grant usage on schema leadflow to authenticated, service_role;
grant select on leadflow.export_items to authenticated;
grant all on leadflow.export_items to service_role;
grant select, insert, update on leadflow.exports to authenticated;
grant all on leadflow.exports to service_role;
grant usage, select on all sequences in schema leadflow to service_role;

-- Export security rules implemented in application code:
-- - buyers must have active entitlement and confirmed allowed use;
-- - suppressed profiles are excluded;
-- - contact fields require full_profile, raw_export, or exclusive entitlement;
-- - admin-only fields are blocked for buyer exports;
-- - downloads are served through protected server routes with expiration checks.
