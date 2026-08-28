-- Business Growth Diagnostic: secure draft/resume state for the deep public
-- questionnaire. Final submissions are also copied into leads.diagnostic so
-- the existing CRM remains the operator's source of truth.
--
-- The browser never talks to this table directly. A server-only route uses
-- the Supabase service key, while authenticated admins and sales users may
-- read the record from the workspace. Resume tokens are stored only as a
-- SHA-256 hash.

create table if not exists public.business_growth_diagnostics (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  request_id uuid not null unique,
  resume_token_hash text not null unique check (resume_token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'draft' check (status = any (array['draft'::text, 'submitted'::text])),
  form_version integer not null default 1 check (form_version >= 1 and form_version <= 100),
  answers jsonb not null default '{}'::jsonb check (
    jsonb_typeof(answers) = 'object' and pg_column_size(answers) <= 131072
  ),
  source_channel text not null default 'website' check (char_length(source_channel) <= 100),
  source_detail text check (source_detail is null or char_length(source_detail) <= 200),
  referrer text check (referrer is null or char_length(referrer) <= 1000),
  utm jsonb not null default '{}'::jsonb check (
    jsonb_typeof(utm) = 'object' and pg_column_size(utm) <= 4096
  ),
  consent_snapshot jsonb not null default '{}'::jsonb check (
    jsonb_typeof(consent_snapshot) = 'object' and pg_column_size(consent_snapshot) <= 8192
  ),
  completeness_score integer not null default 0 check (
    completeness_score >= 0 and completeness_score <= 100
  ),
  opportunity_score integer not null default 0 check (
    opportunity_score >= 0 and opportunity_score <= 100
  ),
  tags text[] not null default '{}'::text[] check (cardinality(tags) <= 40),
  core_completed_at timestamptz,
  submitted_at timestamptz,
  resume_expires_at timestamptz not null default (now() + interval '30 days'),
  resume_state text not null default 'active' check (
    resume_state = any (array['active'::text, 'revoked'::text])
  ),
  resume_revoked_at timestamptz,
  resume_revocation_reason text check (
    resume_revocation_reason is null or char_length(resume_revocation_reason) <= 200
  ),
  resume_email_sent_at timestamptz,
  email_campaign text not null default 'business_growth_diagnostic_7_day_v1' check (
    char_length(btrim(email_campaign)) between 1 and 100
  ),
  email_campaign_status text not null default 'not_enrolled' check (
    email_campaign_status = any (
      array['not_enrolled'::text, 'active'::text, 'completed'::text, 'stopped'::text]
    )
  ),
  email_campaign_enrolled_at timestamptz,
  email_campaign_completed_at timestamptz,
  email_campaign_stopped_at timestamptz,
  email_campaign_stop_reason text check (
    email_campaign_stop_reason is null or char_length(email_campaign_stop_reason) <= 200
  ),
  revision_count integer not null default 1 check (revision_count >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_growth_diagnostics_status_submission_check check (
    (
      status = 'draft'
      and submitted_at is null
    )
    or (
      status = 'submitted'
      and submitted_at is not null
      and core_completed_at is not null
    )
  ),
  constraint business_growth_diagnostics_resume_state_consistency_check check (
    (
      resume_state = 'active'
      and resume_revoked_at is null
      and resume_revocation_reason is null
    )
    or (
      resume_state = 'revoked'
      and resume_revoked_at is not null
    )
  ),
  constraint business_growth_diagnostics_campaign_state_check check (
    (
      email_campaign_status = 'not_enrolled'
      and email_campaign_enrolled_at is null
      and email_campaign_completed_at is null
      and email_campaign_stopped_at is null
      and email_campaign_stop_reason is null
    )
    or (
      email_campaign_status = 'active'
      and status = 'submitted'
      and email_campaign_enrolled_at is not null
      and email_campaign_completed_at is null
      and email_campaign_stopped_at is null
      and email_campaign_stop_reason is null
    )
    or (
      email_campaign_status = 'completed'
      and status = 'submitted'
      and email_campaign_enrolled_at is not null
      and email_campaign_completed_at is not null
      and email_campaign_stopped_at is null
      and email_campaign_stop_reason is null
    )
    or (
      email_campaign_status = 'stopped'
      and status = 'submitted'
      and email_campaign_enrolled_at is not null
      and email_campaign_completed_at is null
      and email_campaign_stopped_at is not null
    )
  ),
  constraint business_growth_diagnostics_timestamp_order_check check (
    updated_at >= created_at
    and resume_expires_at > created_at
    and resume_expires_at <= created_at + interval '90 days'
    and (core_completed_at is null or core_completed_at >= created_at)
    and (submitted_at is null or submitted_at >= created_at)
    and (
      core_completed_at is null
      or submitted_at is null
      or core_completed_at <= submitted_at
    )
    and (resume_revoked_at is null or resume_revoked_at >= created_at)
    and (resume_email_sent_at is null or resume_email_sent_at >= created_at)
    and (
      email_campaign_enrolled_at is null
      or (
        submitted_at is not null
        and email_campaign_enrolled_at >= submitted_at
      )
    )
    and (
      email_campaign_completed_at is null
      or email_campaign_completed_at >= email_campaign_enrolled_at
    )
    and (
      email_campaign_stopped_at is null
      or email_campaign_stopped_at >= email_campaign_enrolled_at
    )
  )
);

comment on table public.business_growth_diagnostics is
  'Server-managed Business Growth Diagnostic drafts and final submissions. Full answers are also summarized into the linked CRM lead.';
comment on column public.business_growth_diagnostics.resume_token_hash is
  'SHA-256 hash of the opaque save-and-resume token. The plaintext token is never stored.';
comment on column public.business_growth_diagnostics.resume_expires_at is
  'Hard expiry for the opaque resume token. Server reads must also require resume_state = active and resume_expires_at > now().';
comment on column public.business_growth_diagnostics.resume_state is
  'Explicit token revocation state. Time-based expiry remains authoritative through resume_expires_at.';
comment on column public.business_growth_diagnostics.answers is
  'Versioned, size-bounded questionnaire answers. Never store passwords, payment card data, private customer records, or API keys.';
comment on column public.business_growth_diagnostics.email_campaign_status is
  'Enrollment state for the consent-based seven-day diagnostic value sequence. Individual sends use reserved lead_emails steps 200 through 206.';

create index if not exists business_growth_diagnostics_status_updated_idx
  on public.business_growth_diagnostics(status, updated_at desc);
create index if not exists business_growth_diagnostics_submitted_idx
  on public.business_growth_diagnostics(submitted_at desc)
  where submitted_at is not null;
create index if not exists business_growth_diagnostics_active_campaign_idx
  on public.business_growth_diagnostics(email_campaign, submitted_at)
  where email_campaign_status = 'active';

-- Keep updated_at database-owned. This dedicated trigger function has no
-- caller-controlled dynamic SQL, fixes its search path, and is not executable
-- directly by a browser role. It lives in public so this migration does not
-- change privileges on the repo's pre-existing private schema.
create or replace function public.touch_business_growth_diagnostic_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function public.touch_business_growth_diagnostic_updated_at()
  from public, anon, authenticated;
grant execute on function public.touch_business_growth_diagnostic_updated_at()
  to service_role;

drop trigger if exists business_growth_diagnostics_touch_updated_at
  on public.business_growth_diagnostics;
create trigger business_growth_diagnostics_touch_updated_at
before update on public.business_growth_diagnostics
for each row execute function public.touch_business_growth_diagnostic_updated_at();

alter table public.business_growth_diagnostics enable row level security;

revoke all on table public.business_growth_diagnostics from public;
revoke all on table public.business_growth_diagnostics from anon;
revoke all on table public.business_growth_diagnostics from authenticated;
grant select on table public.business_growth_diagnostics to authenticated;
grant select, insert, update, delete, references
  on table public.business_growth_diagnostics to service_role;

drop policy if exists "business growth diagnostics admin read"
  on public.business_growth_diagnostics;
create policy "business growth diagnostics admin read"
  on public.business_growth_diagnostics
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "business growth diagnostics sales read"
  on public.business_growth_diagnostics;
create policy "business growth diagnostics sales read"
  on public.business_growth_diagnostics
  for select to authenticated
  using ((select public.can_access_sales_pipeline()));

-- Repair the public lead door while the new server-only diagnostic route is
-- introduced. The live policy predates later CRM, deletion, unsubscribe, and
-- external-id columns, so a caller with the anon key could otherwise set
-- values the public form never owns. Existing /api/leads payload fields remain
-- allowed, size-bounded, and consent timestamps must agree with the opt-ins.
-- Leave the pre-existing authenticated/admin ACL unchanged; narrowing it in a
-- feature migration could regress unrelated CRM workflows.
revoke all on table public.leads from anon;
grant insert on table public.leads to anon;
grant select, insert, update, delete, references on table public.leads to service_role;

-- /api/leads validates against INTEREST_LABELS. The live database constraint
-- predates five currently emitted paths, so align the database and RLS
-- allowlists before recreating the anon policy.
alter table public.leads drop constraint if exists leads_interest_check;
alter table public.leads add constraint leads_interest_check check (
  interest = any (array[
    'learn'::text, 'build_with_you'::text, 'done_for_you'::text,
    'unsure'::text, 'blueprint'::text, 'system_map'::text,
    'launch_system'::text, 'website_launch'::text, 'lead_engine'::text,
    'training_platform'::text, 'company_os'::text, 'industry_os'::text,
    'custom_platform'::text, 'operations'::text
  ])
);

drop policy if exists "public lead insert" on public.leads;
create policy "public lead insert" on public.leads
  for insert to anon
  with check (
    status = 'new'::text
    and source = 'website'::text
    and notes is null
    and owner is null
    and external_id is null
    and deleted_at is null
    and is_test = false
    and priority = 'normal'::text
    and next_follow_up_at is null
    and last_contacted_at is null
    and expected_value_cents is null
    and close_probability is null
    and lost_reason is null
    and email_unsubscribed_at is null
    and sms_unsubscribed_at is null
    and created_at >= now() - interval '5 minutes'
    and created_at <= now() + interval '1 minute'
    and char_length(btrim(full_name)) between 1 and 200
    and char_length(email) between 3 and 200
    and position('@' in email) > 1
    and (phone is null or char_length(phone) <= 50)
    and (business_name is null or char_length(business_name) <= 200)
    and (website_url is null or char_length(website_url) <= 300)
    and (current_platform is null or char_length(current_platform) <= 100)
    and (
      monthly_platform_spend is null
      or char_length(monthly_platform_spend) <= 50
    )
    and (industry is null or char_length(industry) <= 100)
    and cardinality(desired_modules) <= 20
    and desired_modules <@ array[
      'website_funnels'::text, 'crm_pipeline'::text,
      'admin_workspace'::text, 'customer_portal'::text,
      'forms_tools'::text, 'courses_training'::text,
      'archive_library'::text, 'email_automation'::text,
      'calls_texts'::text, 'booking_routing'::text,
      'ads_attribution'::text, 'analytics_reporting'::text,
      'ai_agent'::text, 'payments_checkout'::text,
      'commerce_hub'::text, 'connector_mcp'::text
    ]
    and interest = any (array[
      'learn'::text, 'build_with_you'::text, 'done_for_you'::text,
      'unsure'::text, 'blueprint'::text, 'system_map'::text,
      'launch_system'::text, 'website_launch'::text, 'lead_engine'::text,
      'training_platform'::text, 'company_os'::text, 'industry_os'::text,
      'custom_platform'::text, 'operations'::text
    ])
    and (goals is null or char_length(goals) <= 2000)
    and (budget_range is null or char_length(budget_range) <= 50)
    and (timeline is null or char_length(timeline) <= 100)
    and (
      best_contact_method is null
      or char_length(best_contact_method) <= 50
    )
    and (utm_source is null or char_length(utm_source) <= 100)
    and (utm_medium is null or char_length(utm_medium) <= 100)
    and (utm_campaign is null or char_length(utm_campaign) <= 100)
    and (not sms_consent or phone is not null)
    and (
      (
        (sms_consent or marketing_email_consent)
        and consent_at is not null
        and consent_at >= now() - interval '5 minutes'
        and consent_at <= now() + interval '1 minute'
      )
      or (
        not sms_consent
        and not marketing_email_consent
        and consent_at is null
      )
    )
    and (
      diagnostic is null
      or (
        jsonb_typeof(diagnostic) = 'object'
        and pg_column_size(diagnostic) <= 20000
      )
    )
  );

-- The live admin policy is currently TO PUBLIC even though only signed-in
-- admins should ever reach the CRM. Narrow the policy role without changing
-- the pre-existing authenticated ACL. Sales access continues through its
-- existing authenticated select/update policies and field-protection trigger.
drop policy if exists "admin leads all" on public.leads;
create policy "admin leads all" on public.leads
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
