-- Lead Flow Pro RLS and consent-policy hardening.
-- Applies after 20260701000000_leadflow_consent_data_platform.sql.

drop policy if exists partner_accounts_select_own on leadflow.partner_accounts;
drop policy if exists partner_accounts_insert_own on leadflow.partner_accounts;
drop policy if exists partner_accounts_update_own on leadflow.partner_accounts;
drop policy if exists identities_partner_access on leadflow.identities;
drop policy if exists profiles_partner_access on leadflow.profiles;
drop policy if exists consent_ledger_partner_access on leadflow.consent_ledger;
drop policy if exists questionnaires_partner_access on leadflow.questionnaires;
drop policy if exists question_versions_partner_access on leadflow.question_versions;
drop policy if exists answers_partner_access on leadflow.answers;
drop policy if exists behavioral_events_partner_access on leadflow.behavioral_events;
drop policy if exists derived_features_partner_access on leadflow.derived_features;
drop policy if exists score_runs_partner_access on leadflow.score_runs;
drop policy if exists scores_partner_access on leadflow.scores;
drop policy if exists partner_entitlements_select_parties on leadflow.partner_entitlements;
drop policy if exists partner_entitlements_write_owner on leadflow.partner_entitlements;
drop policy if exists partner_entitlements_update_owner on leadflow.partner_entitlements;
drop policy if exists suppression_requests_partner_access on leadflow.suppression_requests;
drop policy if exists dsar_requests_partner_access on leadflow.dsar_requests;
drop policy if exists audit_log_partner_read on leadflow.audit_log;
drop policy if exists audit_log_partner_insert on leadflow.audit_log;
drop policy if exists exports_partner_access on leadflow.exports;
drop policy if exists webhooks_partner_access on leadflow.webhooks;

revoke all on all tables in schema leadflow from anon;
revoke all on all tables in schema leadflow from authenticated;
revoke all on all routines in schema leadflow from anon;
revoke all on all routines in schema leadflow from authenticated;

create or replace function leadflow.is_platform_admin()
returns boolean
language sql
stable
security invoker
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'leadflow_role', '') in ('platform_admin', 'super_admin')
    or coalesce((auth.jwt() -> 'app_metadata' -> 'leadflow_roles') ? 'platform_admin', false)
    or coalesce((auth.jwt() -> 'app_metadata' -> 'leadflow_roles') ? 'super_admin', false);
$$;

comment on function leadflow.is_platform_admin() is
  'Returns true when the Supabase JWT app_metadata marks the user as a Lead Flow Pro platform admin. Never uses user-editable metadata.';

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
        and (
          (select auth.uid()) = pa.owner_user_id
          or (select auth.uid()) = any(pa.team_user_ids)
        )
    );
$$;

comment on function leadflow.can_access_partner(uuid) is
  'Tenant membership predicate for source partner access, with platform-admin override.';

create or replace function leadflow.has_active_suppression(
  target_partner_account_id uuid,
  target_identity_id uuid,
  scopes leadflow.consent_scope[] default array['do_not_contact', 'do_not_sell_share', 'sale_or_share', 'admt_opt_out']::leadflow.consent_scope[]
)
returns boolean
language sql
stable
security definer
set search_path = leadflow, public
as $$
  select exists (
    select 1
    from leadflow.suppression_requests sr
    where sr.deleted_at is null
      and sr.effective_at <= now()
      and (sr.expires_at is null or sr.expires_at > now())
      and sr.scope = any(scopes)
      and (sr.global_to_platform = true or sr.partner_account_id = target_partner_account_id)
      and (
        sr.identity_id = target_identity_id
        or exists (
          select 1
          from leadflow.identities i
          where i.id = target_identity_id
            and i.partner_account_id = target_partner_account_id
            and i.hard_deleted_at is null
            and (
              (sr.email_sha256 is not null and sr.email_sha256 = i.email_sha256)
              or (sr.phone_sha256 is not null and sr.phone_sha256 = i.phone_sha256)
            )
        )
      )
  );
$$;

comment on function leadflow.has_active_suppression(uuid, uuid, leadflow.consent_scope[]) is
  'Boolean-only internal RLS predicate that checks suppression without exposing suppression rows to buyer partners.';

create or replace function leadflow.has_active_partner_consent(
  source_partner_account_id uuid,
  buyer_partner_account_id uuid,
  target_identity_id uuid,
  target_profile_id uuid,
  target_scope leadflow.consent_scope
)
returns boolean
language sql
stable
security definer
set search_path = leadflow, public
as $$
  select exists (
    select 1
    from leadflow.consent_ledger cl
    where cl.partner_account_id = source_partner_account_id
      and cl.buyer_partner_account_id = buyer_partner_account_id
      and cl.scope = target_scope
      and cl.granted = true
      and cl.revoked_at is null
      and cl.deleted_at is null
      and (cl.expires_at is null or cl.expires_at > now())
      and (cl.identity_id = target_identity_id or cl.profile_id = target_profile_id)
  );
$$;

comment on function leadflow.has_active_partner_consent(uuid, uuid, uuid, uuid, leadflow.consent_scope) is
  'Boolean-only internal RLS predicate proving a named buyer partner has active routing consent for an identity/profile.';

create or replace function leadflow.has_partner_lead_entitlement(
  source_partner_account_id uuid,
  buyer_partner_account_id uuid,
  target_identity_id uuid,
  target_profile_id uuid,
  allowed_scope leadflow.consent_scope default null
)
returns boolean
language sql
stable
security definer
set search_path = leadflow, public
as $$
  select exists (
    select 1
    from leadflow.partner_entitlements pe
    where pe.partner_account_id = source_partner_account_id
      and pe.buyer_partner_account_id = buyer_partner_account_id
      and pe.revoked_at is null
      and pe.deleted_at is null
      and pe.starts_at <= now()
      and (pe.expires_at is null or pe.expires_at > now())
      and (pe.identity_id = target_identity_id or pe.profile_id = target_profile_id)
      and (allowed_scope is null or allowed_scope = any(pe.allowed_scopes))
      and (
        (
          pe.exclusivity_level = 'exclusive_single_seller'
          and leadflow.has_active_partner_consent(
            source_partner_account_id,
            buyer_partner_account_id,
            target_identity_id,
            target_profile_id,
            'single_seller_routing'
          )
        )
        or (
          pe.exclusivity_level = 'named_multi_partner'
          and leadflow.has_active_partner_consent(
            source_partner_account_id,
            buyer_partner_account_id,
            target_identity_id,
            target_profile_id,
            'named_partner_routing'
          )
        )
      )
      and not leadflow.has_active_suppression(
        source_partner_account_id,
        coalesce(
          target_identity_id,
          pe.identity_id,
          (
            select p.identity_id
            from leadflow.profiles p
            where p.id = target_profile_id
              and p.partner_account_id = source_partner_account_id
          )
        )
      )
  );
$$;

comment on function leadflow.has_partner_lead_entitlement(uuid, uuid, uuid, uuid, leadflow.consent_scope) is
  'Boolean-only internal RLS predicate proving active entitlement plus active named consent and no suppression.';

create or replace function leadflow.has_admt_opt_out(
  target_partner_account_id uuid,
  target_identity_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = leadflow, public
as $$
  with subject as (
    select coalesce(
      target_identity_id,
      (
        select p.identity_id
        from leadflow.profiles p
        where p.id = target_profile_id
          and p.partner_account_id = target_partner_account_id
      )
    ) as identity_id
  )
  select
    leadflow.has_active_suppression(
      target_partner_account_id,
      subject.identity_id,
      array['admt_opt_out', 'admt_scoring']::leadflow.consent_scope[]
    )
    or exists (
      select 1
      from leadflow.dsar_requests dr
      where dr.partner_account_id = target_partner_account_id
        and dr.identity_id = subject.identity_id
        and dr.request_type = 'admt_opt_out'
        and dr.status in ('received', 'verifying', 'processing', 'completed')
        and dr.deleted_at is null
    )
    or exists (
      select 1
      from leadflow.consent_ledger cl
      where cl.partner_account_id = target_partner_account_id
        and (cl.identity_id = subject.identity_id or cl.profile_id = target_profile_id)
        and cl.scope = 'admt_scoring'
        and (cl.granted = false or cl.revoked_at is not null)
        and cl.deleted_at is null
    )
  from subject;
$$;

comment on function leadflow.has_admt_opt_out(uuid, uuid, uuid) is
  'Boolean-only internal RLS predicate that excludes ADMT opted-out identities/profiles from scoring.';

create or replace function leadflow.can_select_profile(
  source_partner_account_id uuid,
  target_identity_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select leadflow.is_platform_admin()
    or leadflow.can_access_partner(source_partner_account_id)
    or exists (
      select 1
      from leadflow.partner_accounts buyer
      where buyer.deleted_at is null
        and ((select auth.uid()) = buyer.owner_user_id or (select auth.uid()) = any(buyer.team_user_ids))
        and leadflow.has_partner_lead_entitlement(
          source_partner_account_id,
          buyer.id,
          target_identity_id,
          target_profile_id,
          null
        )
    );
$$;

comment on function leadflow.can_select_profile(uuid, uuid, uuid) is
  'Profile SELECT predicate: platform admin, source tenant, or named/entitled buyer partner.';

create or replace function leadflow.can_score_subject(
  source_partner_account_id uuid,
  target_identity_id uuid,
  target_profile_id uuid
)
returns boolean
language sql
stable
security invoker
as $$
  select (leadflow.is_platform_admin() or leadflow.can_access_partner(source_partner_account_id))
    and not leadflow.has_admt_opt_out(source_partner_account_id, target_identity_id, target_profile_id)
    and not leadflow.has_active_suppression(
      source_partner_account_id,
      coalesce(
        target_identity_id,
        (
          select p.identity_id
          from leadflow.profiles p
          where p.id = target_profile_id
            and p.partner_account_id = source_partner_account_id
        )
      )
    );
$$;

comment on function leadflow.can_score_subject(uuid, uuid, uuid) is
  'Scoring predicate requiring source/admin access while excluding suppressed or ADMT opted-out consumers.';

alter table leadflow.partner_accounts force row level security;
alter table leadflow.identities force row level security;
alter table leadflow.profiles force row level security;
alter table leadflow.consent_ledger force row level security;
alter table leadflow.questionnaires force row level security;
alter table leadflow.question_versions force row level security;
alter table leadflow.answers force row level security;
alter table leadflow.behavioral_events force row level security;
alter table leadflow.derived_features force row level security;
alter table leadflow.score_runs force row level security;
alter table leadflow.scores force row level security;
alter table leadflow.partner_entitlements force row level security;
alter table leadflow.suppression_requests force row level security;
alter table leadflow.dsar_requests force row level security;
alter table leadflow.audit_log force row level security;
alter table leadflow.exports force row level security;
alter table leadflow.webhooks force row level security;

create policy partner_accounts_select_member_or_admin on leadflow.partner_accounts
  for select to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      deleted_at is null
      and ((select auth.uid()) = owner_user_id or (select auth.uid()) = any(team_user_ids))
    )
  );

create policy partner_accounts_insert_self_owned on leadflow.partner_accounts
  for insert to authenticated
  with check (leadflow.is_platform_admin() or (select auth.uid()) = owner_user_id);

create policy partner_accounts_update_member_or_admin on leadflow.partner_accounts
  for update to authenticated
  using (
    leadflow.is_platform_admin()
    or (deleted_at is null and ((select auth.uid()) = owner_user_id or (select auth.uid()) = any(team_user_ids)))
  )
  with check (leadflow.is_platform_admin() or (select auth.uid()) = owner_user_id or (select auth.uid()) = any(team_user_ids));

create policy identities_select_source_or_admin on leadflow.identities
  for select to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      deleted_at is null
      and hard_deleted_at is null
      and leadflow.can_access_partner(partner_account_id)
    )
  );

create policy identities_write_source_or_admin on leadflow.identities
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy identities_update_source_or_admin on leadflow.identities
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy profiles_select_source_or_entitled_buyer on leadflow.profiles
  for select to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      deleted_at is null
      and hard_deleted_at is null
      and suppression_flag = false
      and leadflow.can_select_profile(partner_account_id, identity_id, id)
    )
  );

create policy profiles_insert_source_or_admin on leadflow.profiles
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy profiles_update_source_or_admin on leadflow.profiles
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy consent_ledger_select_parties_or_admin on leadflow.consent_ledger
  for select to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      deleted_at is null
      and (
        leadflow.can_access_partner(partner_account_id)
        or (
          buyer_partner_account_id is not null
          and leadflow.can_access_partner(buyer_partner_account_id)
        )
      )
    )
  );

create policy consent_ledger_insert_source_or_admin on leadflow.consent_ledger
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy consent_ledger_update_source_or_admin on leadflow.consent_ledger
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy questionnaires_select_source_or_admin on leadflow.questionnaires
  for select to authenticated
  using (leadflow.is_platform_admin() or (deleted_at is null and leadflow.can_access_partner(partner_account_id)));

create policy questionnaires_insert_source_or_admin on leadflow.questionnaires
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy questionnaires_update_source_or_admin on leadflow.questionnaires
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy question_versions_select_source_or_admin on leadflow.question_versions
  for select to authenticated
  using (leadflow.is_platform_admin() or (deleted_at is null and leadflow.can_access_partner(partner_account_id)));

create policy question_versions_insert_source_or_admin on leadflow.question_versions
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy question_versions_update_source_or_admin on leadflow.question_versions
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy answers_select_source_or_admin_raw_only on leadflow.answers
  for select to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      deleted_at is null
      and hard_deleted_at is null
      and leadflow.can_access_partner(partner_account_id)
    )
  );

create policy answers_insert_source_or_admin on leadflow.answers
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy answers_update_source_or_admin on leadflow.answers
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy behavioral_events_select_source_or_admin on leadflow.behavioral_events
  for select to authenticated
  using (leadflow.is_platform_admin() or (deleted_at is null and leadflow.can_access_partner(partner_account_id)));

create policy behavioral_events_insert_source_or_admin on leadflow.behavioral_events
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy behavioral_events_update_source_or_admin on leadflow.behavioral_events
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy derived_features_select_source_or_admin on leadflow.derived_features
  for select to authenticated
  using (leadflow.is_platform_admin() or (deleted_at is null and leadflow.can_access_partner(partner_account_id)));

create policy derived_features_insert_scoreable_source_or_admin on leadflow.derived_features
  for insert to authenticated
  with check (
    leadflow.can_score_subject(partner_account_id, identity_id, profile_id)
  );

create policy derived_features_update_scoreable_source_or_admin on leadflow.derived_features
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_score_subject(partner_account_id, identity_id, profile_id));

create policy score_runs_select_source_or_admin on leadflow.score_runs
  for select to authenticated
  using (leadflow.is_platform_admin() or (deleted_at is null and leadflow.can_access_partner(partner_account_id)));

create policy score_runs_insert_source_or_admin on leadflow.score_runs
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy score_runs_update_source_or_admin on leadflow.score_runs
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy scores_select_source_or_entitled_buyer on leadflow.scores
  for select to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      deleted_at is null
      and (
        leadflow.can_access_partner(partner_account_id)
        or exists (
          select 1
          from leadflow.partner_accounts buyer
          where buyer.deleted_at is null
            and ((select auth.uid()) = buyer.owner_user_id or (select auth.uid()) = any(buyer.team_user_ids))
            and leadflow.has_partner_lead_entitlement(partner_account_id, buyer.id, identity_id, profile_id, 'admt_scoring')
        )
      )
    )
  );

create policy scores_insert_scoreable_source_or_admin on leadflow.scores
  for insert to authenticated
  with check (leadflow.can_score_subject(partner_account_id, identity_id, profile_id));

create policy scores_update_scoreable_source_or_admin on leadflow.scores
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.can_score_subject(partner_account_id, identity_id, profile_id));

create policy partner_entitlements_select_source_or_buyer_or_admin on leadflow.partner_entitlements
  for select to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      deleted_at is null
      and (
        leadflow.can_access_partner(partner_account_id)
        or (
          leadflow.can_access_partner(buyer_partner_account_id)
          and leadflow.has_partner_lead_entitlement(partner_account_id, buyer_partner_account_id, identity_id, profile_id, null)
        )
      )
    )
  );

create policy partner_entitlements_insert_source_or_admin on leadflow.partner_entitlements
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy partner_entitlements_update_source_or_admin on leadflow.partner_entitlements
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy suppression_requests_select_source_or_admin on leadflow.suppression_requests
  for select to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy suppression_requests_insert_source_or_admin on leadflow.suppression_requests
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy suppression_requests_update_source_or_admin on leadflow.suppression_requests
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy dsar_requests_select_source_or_admin on leadflow.dsar_requests
  for select to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy dsar_requests_insert_source_or_admin on leadflow.dsar_requests
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy dsar_requests_update_source_or_admin on leadflow.dsar_requests
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy audit_log_select_source_or_admin on leadflow.audit_log
  for select to authenticated
  using (leadflow.is_platform_admin() or (partner_account_id is not null and leadflow.can_access_partner(partner_account_id)));

create policy audit_log_insert_source_or_admin on leadflow.audit_log
  for insert to authenticated
  with check (leadflow.is_platform_admin() or (partner_account_id is not null and leadflow.can_access_partner(partner_account_id)));

create policy exports_select_parties_or_admin on leadflow.exports
  for select to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      deleted_at is null
      and (
        leadflow.can_access_partner(partner_account_id)
        or (
          buyer_partner_account_id is not null
          and leadflow.can_access_partner(buyer_partner_account_id)
        )
      )
    )
  );

create policy exports_insert_source_or_admin on leadflow.exports
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy exports_update_source_or_admin on leadflow.exports
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy webhooks_select_source_or_admin on leadflow.webhooks
  for select to authenticated
  using (leadflow.is_platform_admin() or (deleted_at is null and leadflow.can_access_partner(partner_account_id)));

create policy webhooks_insert_source_or_admin on leadflow.webhooks
  for insert to authenticated
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create policy webhooks_update_source_or_admin on leadflow.webhooks
  for update to authenticated
  using (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id))
  with check (leadflow.is_platform_admin() or leadflow.can_access_partner(partner_account_id));

create or replace view leadflow.exclusive_leads
with (security_invoker = true)
as
select
  pe.id as entitlement_id,
  pe.partner_account_id,
  pe.buyer_partner_account_id,
  pe.profile_id,
  pe.identity_id,
  p.vertical,
  p.lifecycle_stage,
  p.preference_summary,
  p.normalized_attributes,
  s.score_value as latest_score,
  s.score_band as latest_score_band,
  pe.starts_at,
  pe.expires_at
from leadflow.partner_entitlements pe
join leadflow.profiles p on p.id = pe.profile_id
left join lateral (
  select sc.score_value, sc.score_band
  from leadflow.scores sc
  where sc.profile_id = pe.profile_id
    and sc.deleted_at is null
  order by sc.calculated_at desc
  limit 1
) s on true
where pe.exclusivity_level = 'exclusive_single_seller'
  and pe.revoked_at is null
  and pe.deleted_at is null
  and p.deleted_at is null
  and p.hard_deleted_at is null
  and p.suppression_flag = false
  and leadflow.has_partner_lead_entitlement(
    pe.partner_account_id,
    pe.buyer_partner_account_id,
    pe.identity_id,
    pe.profile_id,
    'single_seller_routing'
  );

comment on view leadflow.exclusive_leads is
  'Security-invoker view for active exclusive single-seller lead entitlements; requires active consent, entitlement, and no suppression.';

create or replace view leadflow.named_partner_leads
with (security_invoker = true)
as
select
  pe.id as entitlement_id,
  pe.partner_account_id,
  pe.buyer_partner_account_id,
  pe.profile_id,
  pe.identity_id,
  p.vertical,
  p.lifecycle_stage,
  p.preference_summary,
  p.normalized_attributes,
  s.score_value as latest_score,
  s.score_band as latest_score_band,
  pe.allowed_scopes,
  pe.starts_at,
  pe.expires_at
from leadflow.partner_entitlements pe
join leadflow.profiles p on p.id = pe.profile_id
left join lateral (
  select sc.score_value, sc.score_band
  from leadflow.scores sc
  where sc.profile_id = pe.profile_id
    and sc.deleted_at is null
  order by sc.calculated_at desc
  limit 1
) s on true
where pe.exclusivity_level = 'named_multi_partner'
  and pe.revoked_at is null
  and pe.deleted_at is null
  and p.deleted_at is null
  and p.hard_deleted_at is null
  and p.suppression_flag = false
  and leadflow.has_partner_lead_entitlement(
    pe.partner_account_id,
    pe.buyer_partner_account_id,
    pe.identity_id,
    pe.profile_id,
    'named_partner_routing'
  );

comment on view leadflow.named_partner_leads is
  'Security-invoker view for active leads routed only to named selected buyer partners.';

create or replace view leadflow.scoreable_profiles
with (security_invoker = true)
as
select
  p.id as profile_id,
  p.identity_id,
  p.partner_account_id,
  p.vertical,
  p.sales_channel,
  p.preference_summary,
  p.normalized_attributes,
  p.created_at,
  p.updated_at
from leadflow.profiles p
where p.deleted_at is null
  and p.hard_deleted_at is null
  and p.suppression_flag = false
  and leadflow.can_score_subject(p.partner_account_id, p.identity_id, p.id);

comment on view leadflow.scoreable_profiles is
  'Security-invoker view scoring jobs should use so ADMT opted-out, suppressed, and deleted profiles are excluded.';

create or replace view leadflow.aggregated_insights
as
with eligible_profiles as (
  select
    p.id,
    p.identity_id,
    p.partner_account_id,
    p.vertical,
    p.sales_channel,
    p.created_at,
    p.normalized_attributes,
    (
      select sc.score_value
      from leadflow.scores sc
      where sc.profile_id = p.id
        and sc.deleted_at is null
      order by sc.calculated_at desc
      limit 1
    ) as latest_score
  from leadflow.profiles p
  where p.deleted_at is null
    and p.hard_deleted_at is null
    and p.suppression_flag = false
    and exists (
      select 1
      from leadflow.consent_ledger cl
      where cl.profile_id = p.id
        and cl.scope = 'aggregated_insights'
        and cl.granted = true
        and cl.revoked_at is null
        and cl.deleted_at is null
        and (cl.expires_at is null or cl.expires_at > now())
    )
    and not leadflow.has_active_suppression(p.partner_account_id, p.identity_id)
),
cohorts as (
  select
    partner_account_id,
    vertical,
    sales_channel,
    date_trunc('day', created_at)::date as insight_date,
    count(distinct id) as profile_count,
    count(distinct identity_id) as identity_count,
    avg(latest_score) filter (where latest_score is not null) as avg_latest_score,
    percentile_cont(0.5) within group (order by latest_score) filter (where latest_score is not null) as median_latest_score
  from eligible_profiles
  group by partner_account_id, vertical, sales_channel, date_trunc('day', created_at)::date
  having count(distinct id) >= 5
),
attribute_counts as (
  select
    ep.partner_account_id,
    ep.vertical,
    ep.sales_channel,
    date_trunc('day', ep.created_at)::date as insight_date,
    attrs.key,
    count(*) as value_count
  from eligible_profiles ep
  cross join lateral jsonb_each_text(ep.normalized_attributes) as attrs(key, value)
  group by ep.partner_account_id, ep.vertical, ep.sales_channel, date_trunc('day', ep.created_at)::date, attrs.key
),
ranked_attributes as (
  select
    ac.*,
    row_number() over (
      partition by partner_account_id, vertical, sales_channel, insight_date
      order by value_count desc, key asc
    ) as rank
  from attribute_counts ac
)
select
  c.partner_account_id,
  c.vertical,
  c.sales_channel,
  c.insight_date,
  c.profile_count,
  c.identity_count,
  c.avg_latest_score,
  c.median_latest_score,
  coalesce(
    jsonb_object_agg(ra.key, ra.value_count) filter (where ra.key is not null and ra.rank <= 10),
    '{}'::jsonb
  ) as top_attribute_counts
from cohorts c
left join ranked_attributes ra
  on ra.partner_account_id = c.partner_account_id
  and ra.vertical = c.vertical
  and ra.sales_channel = c.sales_channel
  and ra.insight_date = c.insight_date
group by c.partner_account_id, c.vertical, c.sales_channel, c.insight_date, c.profile_count, c.identity_count, c.avg_latest_score, c.median_latest_score;

comment on view leadflow.aggregated_insights is
  'Aggregate non-personal insight view with k-thresholding. Intentionally does not expose identity/profile ids or raw answers.';

revoke all on schema leadflow from public, anon;
revoke all on all routines in schema leadflow from public;
revoke all on all routines in schema leadflow from anon;
revoke all on all routines in schema leadflow from authenticated;

grant usage on schema leadflow to authenticated, service_role;
grant execute on function leadflow.is_platform_admin() to authenticated, service_role;
grant execute on function leadflow.can_access_partner(uuid) to authenticated, service_role;
grant execute on function leadflow.can_select_profile(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function leadflow.can_score_subject(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function leadflow.has_active_suppression(uuid, uuid, leadflow.consent_scope[]) to authenticated, service_role;
grant execute on function leadflow.has_active_partner_consent(uuid, uuid, uuid, uuid, leadflow.consent_scope) to authenticated, service_role;
grant execute on function leadflow.has_partner_lead_entitlement(uuid, uuid, uuid, uuid, leadflow.consent_scope) to authenticated, service_role;
grant execute on function leadflow.has_admt_opt_out(uuid, uuid, uuid) to authenticated, service_role;

grant select, insert, update on leadflow.partner_accounts to authenticated;
grant select, insert, update on leadflow.identities to authenticated;
grant select, insert, update on leadflow.profiles to authenticated;
grant select, insert, update on leadflow.consent_ledger to authenticated;
grant select, insert, update on leadflow.questionnaires to authenticated;
grant select, insert, update on leadflow.question_versions to authenticated;
grant select, insert, update on leadflow.answers to authenticated;
grant select, insert, update on leadflow.behavioral_events to authenticated;
grant select, insert, update on leadflow.derived_features to authenticated;
grant select, insert, update on leadflow.score_runs to authenticated;
grant select, insert, update on leadflow.scores to authenticated;
grant select, insert, update on leadflow.partner_entitlements to authenticated;
grant select, insert, update on leadflow.suppression_requests to authenticated;
grant select, insert, update on leadflow.dsar_requests to authenticated;
grant select, insert on leadflow.audit_log to authenticated;
grant select, insert, update on leadflow.exports to authenticated;
grant select, insert, update on leadflow.webhooks to authenticated;

grant select on leadflow.exclusive_leads to authenticated;
grant select on leadflow.named_partner_leads to authenticated;
grant select on leadflow.scoreable_profiles to authenticated;
grant select on leadflow.aggregated_insights to authenticated;
grant all on all tables in schema leadflow to service_role;
grant all on all routines in schema leadflow to service_role;
