-- The Free Website Program is now a first-class intake path from both the
-- public /free-build form and Meta instant forms. Keep the existing narrow
-- public insert contract intact while admitting this one server-recognized
-- interest value. A second permissive policy would be unsafe because Postgres
-- ORs permissive policies, so replace the authoritative policy atomically.

begin;

alter table public.leads drop constraint if exists leads_interest_check;
alter table public.leads add constraint leads_interest_check check (
  interest = any (array[
    'learn'::text, 'build_with_you'::text, 'done_for_you'::text,
    'unsure'::text, 'blueprint'::text, 'system_map'::text,
    'launch_system'::text, 'website_launch'::text, 'lead_engine'::text,
    'training_platform'::text, 'company_os'::text, 'industry_os'::text,
    'custom_platform'::text, 'operations'::text,
    'free_website_program'::text
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
      'custom_platform'::text, 'operations'::text,
      'free_website_program'::text
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

commit;
