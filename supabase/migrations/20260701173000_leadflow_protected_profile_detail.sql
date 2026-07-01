-- LeadFlow Pro protected profile detail pages.
-- Adds buyer-visible proof metadata, profile signals, issue reports, and
-- entitlement-by-slug checks for the protected /lead-profile/[id] route.

create extension if not exists pgcrypto;

alter table if exists leadflow.lead_profiles
  add column if not exists slug text;

update leadflow.lead_profiles
set slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
where slug is null
  and title is not null;

create unique index if not exists lead_profiles_slug_uidx
  on leadflow.lead_profiles(slug)
  where slug is not null and deleted_at is null;

create index if not exists lead_profiles_slug_status_idx
  on leadflow.lead_profiles(slug, review_status, status, suppression_status);

comment on column leadflow.lead_profiles.slug is
  'Stable route slug for protected profile pages and buyer entitlements. Does not contain personal data.';

alter table if exists leadflow.source_proofs
  add column if not exists source_title text,
  add column if not exists source_type text,
  add column if not exists found_at timestamptz,
  add column if not exists verified_at timestamptz,
  add column if not exists proof_snippet text,
  add column if not exists screenshot_url text,
  add column if not exists buyer_visible boolean not null default true,
  add column if not exists admin_notes text,
  add column if not exists admin_notes_visible boolean not null default false;

comment on column leadflow.source_proofs.buyer_visible is
  'When false, the proof row is admin-only even if the buyer has a profile entitlement.';
comment on column leadflow.source_proofs.admin_notes is
  'Private review notes. The app must only show this when the viewer is an admin or admin_notes_visible is true.';

create table if not exists leadflow.profile_signals (
  id uuid primary key default gen_random_uuid(),
  lead_profile_id uuid not null references leadflow.lead_profiles(id) on delete cascade,
  signal_type text not null,
  tag text not null,
  value text not null,
  signal_timestamp timestamptz,
  source_label text,
  confidence numeric(5,4) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  explanation text,
  buyer_visible boolean not null default true,
  admin_notes text,
  admin_notes_visible boolean not null default false,
  status text not null default 'approved' check (status in ('submitted', 'review', 'approved', 'suppressed', 'archived')),
  review_status text not null default 'approved' check (review_status in ('pending', 'review', 'approved', 'rejected', 'suppressed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.profile_signals is
  'Buyer-visible normalized signals behind protected lead profiles. Must not include protected traits, hidden sensitive data, or raw private answers.';
comment on column leadflow.profile_signals.buyer_visible is
  'When false, the signal stays admin-only even if a buyer has profile entitlement.';

create index if not exists profile_signals_profile_status_idx
  on leadflow.profile_signals(lead_profile_id, review_status, status, created_at desc);
create index if not exists profile_signals_tag_idx
  on leadflow.profile_signals(tag, created_at desc);
create index if not exists profile_signals_confidence_idx
  on leadflow.profile_signals(confidence desc);

create table if not exists leadflow.profile_issue_reports (
  id uuid primary key default gen_random_uuid(),
  lead_profile_id uuid references leadflow.lead_profiles(id) on delete set null,
  lead_profile_slug text,
  buyer_account_id uuid not null references leadflow.buyer_accounts(id) on delete cascade,
  report_type text not null default 'issue' check (report_type in ('issue', 'clarification', 'incorrect_data', 'suppression', 'access')),
  message text,
  status text not null default 'submitted' check (status in ('submitted', 'review', 'resolved', 'rejected', 'archived')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  resolution_note text,
  source_path text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table leadflow.profile_issue_reports is
  'Buyer-submitted clarification and issue reports for entitled protected profiles.';

create index if not exists profile_issue_reports_buyer_idx
  on leadflow.profile_issue_reports(buyer_account_id, status, created_at desc);
create index if not exists profile_issue_reports_profile_idx
  on leadflow.profile_issue_reports(lead_profile_id, status, created_at desc);
create index if not exists profile_issue_reports_slug_idx
  on leadflow.profile_issue_reports(lead_profile_slug, status, created_at desc);

drop trigger if exists set_profile_signals_updated_at on leadflow.profile_signals;
create trigger set_profile_signals_updated_at
  before update on leadflow.profile_signals
  for each row execute function leadflow.set_updated_at();

drop trigger if exists set_profile_issue_reports_updated_at on leadflow.profile_issue_reports;
create trigger set_profile_issue_reports_updated_at
  before update on leadflow.profile_issue_reports
  for each row execute function leadflow.set_updated_at();

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
    where be.status = 'active'
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
        be.lead_profile_id = target_lead_profile_id
        or (lp.slug is not null and be.listing_slug = lp.slug)
        or (lp.slug is not null and be.metadata ->> 'profile_slug' = lp.slug)
        or (lp.slug is not null and be.metadata ->> 'lead_profile_slug' = lp.slug)
      )
      and (
        (select auth.uid()) = ba.auth_user_id
        or (select auth.uid()) = ba.owner_user_id
        or (select auth.uid()) = any(ba.team_user_ids)
      )
      and not leadflow.lead_profile_has_active_suppression(target_lead_profile_id)
  );
$$;

comment on function leadflow.buyer_has_lead_profile_entitlement(uuid) is
  'Checks whether the current buyer has active profile access by profile ID, listing slug, or entitlement metadata profile_slug, and blocks suppressed/deleted profiles.';

alter table leadflow.profile_signals enable row level security;
alter table leadflow.profile_issue_reports enable row level security;
alter table leadflow.profile_signals force row level security;
alter table leadflow.profile_issue_reports force row level security;

drop policy if exists lead_signal_admin_all_profile_signals on leadflow.profile_signals;
create policy lead_signal_admin_all_profile_signals on leadflow.profile_signals
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists lead_signal_admin_all_profile_issue_reports on leadflow.profile_issue_reports;
create policy lead_signal_admin_all_profile_issue_reports on leadflow.profile_issue_reports
  for all to authenticated
  using (leadflow.is_platform_admin())
  with check (leadflow.is_platform_admin());

drop policy if exists profile_signals_select_entitled_buyer on leadflow.profile_signals;
create policy profile_signals_select_entitled_buyer on leadflow.profile_signals
  for select to authenticated
  using (
    buyer_visible = true
    and deleted_at is null
    and review_status = 'approved'
    and status = 'approved'
    and leadflow.buyer_has_lead_profile_entitlement(lead_profile_id)
  );

drop policy if exists profile_issue_reports_select_own on leadflow.profile_issue_reports;
create policy profile_issue_reports_select_own on leadflow.profile_issue_reports
  for select to authenticated
  using (
    deleted_at is null
    and buyer_account_id = any(leadflow.current_buyer_account_ids())
  );

drop policy if exists profile_issue_reports_insert_own_entitled on leadflow.profile_issue_reports;
create policy profile_issue_reports_insert_own_entitled on leadflow.profile_issue_reports
  for insert to authenticated
  with check (
    buyer_account_id = any(leadflow.current_buyer_account_ids())
    and (
      (lead_profile_id is not null and leadflow.buyer_has_lead_profile_entitlement(lead_profile_id))
      or exists (
        select 1
        from leadflow.lead_profiles lp
        where lp.slug = lead_profile_slug
          and leadflow.buyer_has_lead_profile_entitlement(lp.id)
      )
    )
  );

drop policy if exists source_proofs_select_entitled_buyer_portal on leadflow.source_proofs;
create policy source_proofs_select_entitled_buyer_portal on leadflow.source_proofs
  for select to authenticated
  using (
    buyer_visible = true
    and review_status = 'approved'
    and status = 'approved'
    and leadflow.buyer_has_lead_profile_entitlement(lead_profile_id)
  );

drop policy if exists source_proofs_select_entitled_buyer on leadflow.source_proofs;
create policy source_proofs_select_entitled_buyer on leadflow.source_proofs
  for select to authenticated
  using (
    buyer_visible = true
    and review_status = 'approved'
    and status = 'approved'
    and leadflow.buyer_has_lead_profile_entitlement(lead_profile_id)
  );

grant select on leadflow.profile_signals to authenticated;
grant select, insert on leadflow.profile_issue_reports to authenticated;
grant all on leadflow.profile_signals to service_role;
grant all on leadflow.profile_issue_reports to service_role;
grant select on leadflow.lead_profiles to authenticated;
grant select on leadflow.source_proofs to authenticated;
grant execute on function leadflow.buyer_has_lead_profile_entitlement(uuid) to authenticated, service_role;

-- Test data for protected profile development. These are sample business signal
-- profiles, not raw people records.
insert into leadflow.lead_profiles (
  slug,
  title,
  vertical,
  category,
  buyer_use_case,
  tags,
  score,
  confidence,
  consent_status,
  suppression_status,
  source_proof_status,
  status,
  review_status,
  buyer_visible_summary,
  last_verified_at
)
values
  (
    'website-neglect-signal',
    'Website Neglect Signal',
    'Website conversion and follow-up systems',
    'Business owners',
    'Offer website funnel fixes, AI receptionist setup, missed-call recovery, CRM routing, or follow-up automation.',
    array['website audit', 'first-party intake', 'follow-up', 'AI automation'],
    88,
    0.91,
    'first_party_named_review',
    'unchecked',
    'approved',
    'sample_available',
    'approved',
    '{"summary":"High-intent business-owner signal from website review and follow-up gap context.","allowed_fields":["summary","score","source_proof","buyer_fit","compliance_status"]}'::jsonb,
    now()
  ),
  (
    'ecommerce-vendor-signal-pack',
    'Ecommerce Vendor Signal Pack',
    'Ecommerce and marketplace sourcing',
    'Ecommerce',
    'Find vendor categories, sourcing lanes, and marketplace opportunities worth deeper manual review.',
    array['vendor', 'marketplace', 'product sourcing', 'review gated'],
    87,
    0.88,
    'source_backed_review',
    'unchecked',
    'approved',
    'sample_available',
    'approved',
    '{"summary":"Source-backed ecommerce vendor opportunity set with category and platform context.","allowed_fields":["summary","score","source_proof","buyer_fit","compliance_status"]}'::jsonb,
    now()
  )
on conflict (slug) where deleted_at is null do update
set title = excluded.title,
    vertical = excluded.vertical,
    category = excluded.category,
    buyer_use_case = excluded.buyer_use_case,
    tags = excluded.tags,
    score = excluded.score,
    confidence = excluded.confidence,
    consent_status = excluded.consent_status,
    suppression_status = excluded.suppression_status,
    source_proof_status = excluded.source_proof_status,
    status = excluded.status,
    review_status = excluded.review_status,
    buyer_visible_summary = excluded.buyer_visible_summary,
    last_verified_at = excluded.last_verified_at,
    updated_at = now();

insert into leadflow.source_proofs (
  lead_profile_id,
  proof_type,
  source_url,
  source_label,
  source_title,
  source_type,
  found_at,
  verified_at,
  proof_snippet,
  confidence,
  status,
  review_status,
  buyer_visible
)
select lp.id, proof.proof_type, proof.source_url, proof.source_label, proof.source_title, proof.source_type,
       now(), now(), proof.proof_snippet, proof.confidence, 'approved', 'approved', true
from leadflow.lead_profiles lp
cross join (values
  ('website-neglect-signal', 'questionnaire', 'https://www.theleadflowpro.com/tools', 'Questionnaire path', 'Website Money Leak Checker intake', 'First-party intake', 'Problem, website, follow-up, and budget-band answers are captured through a tool flow.', 0.91::numeric),
  ('website-neglect-signal', 'website_audit', 'https://www.theleadflowpro.com/profile-model', 'Page review sample', 'Website conversion-path review', 'Website audit', 'CTA, form, speed-to-lead, and route gaps are scored from the submitted website.', 0.84::numeric),
  ('ecommerce-vendor-signal-pack', 'public_source', 'https://www.theleadflowpro.com/marketplace', 'Sample source map', 'Redacted ecommerce vendor source map', 'Public marketplace plus platform tags', 'Redacted sample rows show vendor category, platform clue, public source label, and freshness bucket.', 0.88::numeric),
  ('ecommerce-vendor-signal-pack', 'release_control', 'https://www.theleadflowpro.com/privacy-center', 'Suppression review', 'Suppression and release control', 'Release control', 'Release is blocked if a source, person, or business has a matching suppression request.', 0.80::numeric)
) as proof(slug, proof_type, source_url, source_label, source_title, source_type, proof_snippet, confidence)
where lp.slug = proof.slug
  and not exists (
    select 1
    from leadflow.source_proofs existing
    where existing.lead_profile_id = lp.id
      and existing.source_label = proof.source_label
  );

insert into leadflow.profile_signals (
  lead_profile_id,
  signal_type,
  tag,
  value,
  signal_timestamp,
  source_label,
  confidence,
  explanation,
  buyer_visible,
  status,
  review_status
)
select lp.id, signal.signal_type, signal.tag, signal.value, now(), signal.source_label,
       signal.confidence, signal.explanation, true, 'approved', 'approved'
from leadflow.lead_profiles lp
cross join (values
  ('website-neglect-signal', 'Intent score', 'website audit', 'High', 'Questionnaire path', 0.90::numeric, 'The visitor submitted a business problem and received a website leak score before identity capture.'),
  ('website-neglect-signal', 'Contactability score', 'follow-up', 'High', 'Consent ledger', 0.86::numeric, 'The profile can route through the submitted business path if consent scope is approved.'),
  ('website-neglect-signal', 'Compliance readiness score', 'named consent', 'High', 'Privacy review', 0.89::numeric, 'The profile is strongest when routed through a named consent mode and suppression check.'),
  ('ecommerce-vendor-signal-pack', 'Intent score', 'vendor', 'High', 'Sample source map', 0.88::numeric, 'Multiple marketplace and category clues point to a useful sourcing or agency conversation.'),
  ('ecommerce-vendor-signal-pack', 'Source proof score', 'public source', 'Strong', 'Platform tag review', 0.91::numeric, 'The sample has public source labels and proof notes attached before release.'),
  ('ecommerce-vendor-signal-pack', 'Contactability score', 'business route', 'Medium high', 'Suppression review', 0.76::numeric, 'Public business routes appear usable, but direct outreach details stay gated until approval.')
) as signal(slug, signal_type, tag, value, source_label, confidence, explanation)
where lp.slug = signal.slug
  and not exists (
    select 1
    from leadflow.profile_signals existing
    where existing.lead_profile_id = lp.id
      and existing.signal_type = signal.signal_type
      and existing.tag = signal.tag
  );

-- To test buyer access manually after a buyer account exists:
-- insert into leadflow.buyer_entitlements
--   (buyer_account_id, listing_slug, access_level, status, metadata)
-- values
--   ('<buyer_account_uuid>', 'website-neglect-signal', 'full_profile', 'active',
--    '{"profile_slug":"website-neglect-signal","test_data":true}'::jsonb);

-- Exposure summary:
-- Public: marketplace listing previews only.
-- Buyer-visible: approved profile rows, approved source proofs, approved profile_signals, and own issue reports only when entitlement exists.
-- Admin-only: raw/private profile fields, admin_notes, scores/source mutations, suppression controls, exports, and access grants.
-- Service role: server API writes for buyer actions, events, audits, and admin actions.
