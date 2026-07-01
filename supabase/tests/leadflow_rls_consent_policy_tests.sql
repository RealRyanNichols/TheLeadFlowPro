-- Lead Flow Pro RLS consent-policy tests.
-- Run after the leadflow schema and RLS hardening migrations on a Supabase
-- development branch or local Supabase database.
--
-- The script seeds test rows inside a transaction, impersonates Supabase
-- authenticated users with request.jwt.claims, verifies allowed/denied cases,
-- then rolls everything back.

begin;

create or replace function pg_temp.ok(condition boolean, label text)
returns void
language plpgsql
as $$
begin
  if not condition then
    raise exception 'not ok: %', label;
  end if;

  raise notice 'ok: %', label;
end;
$$;

create or replace function pg_temp.as_user(target_user_id uuid, app_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', target_user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', target_user_id::text,
      'role', 'authenticated',
      'app_metadata', app_metadata
    )::text,
    true
  );
end;
$$;

create or replace function pg_temp.expect_rls_error(statement text, label text)
returns void
language plpgsql
as $$
begin
  begin
    execute statement;
  exception
    when insufficient_privilege then
      raise notice 'ok: %', label;
      return;
  end;

  raise exception 'not ok: %', label;
end;
$$;

reset role;

-- Users
-- source owner: 11111111-1111-1111-1111-111111111111
-- named buyer:  22222222-2222-2222-2222-222222222222
-- unrelated:    33333333-3333-3333-3333-333333333333
-- admin:        44444444-4444-4444-4444-444444444444

insert into leadflow.partner_accounts (id, owner_user_id, name, legal_name, vertical, data_api_enabled)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'RLS Source Partner', 'RLS Source Partner LLC', 'consumer_shopping', true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'RLS Named Buyer', 'RLS Named Buyer LLC', 'consumer_shopping', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', 'RLS Unrelated Buyer', 'RLS Unrelated Buyer LLC', 'consumer_shopping', true);

insert into leadflow.identities (id, partner_account_id, anonymous_id, email_sha256, lifecycle_stage, provenance)
values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anon-rls-001', 'hash-rls-001', 'known', '{"test": true}'),
  ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anon-rls-002', 'hash-rls-002', 'known', '{"test": true}'),
  ('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anon-rls-003', 'hash-rls-003', 'known', '{"test": true}'),
  ('10000000-0000-0000-0000-000000000004', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anon-rls-004', 'hash-rls-004', 'known', '{"test": true}'),
  ('10000000-0000-0000-0000-000000000005', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'anon-rls-005', 'hash-rls-005', 'known', '{"test": true}');

insert into leadflow.profiles (
  id,
  partner_account_id,
  identity_id,
  vertical,
  sales_channel,
  lifecycle_stage,
  preference_summary,
  normalized_attributes,
  data_categories,
  source_confidence
)
values
  (
    '20000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000001',
    'consumer_shopping',
    'web_quiz',
    'qualified',
    '{"intent": "vehicle", "timeline": "30_days"}',
    '{"category": "vehicle", "budget": "mid", "style": "utility"}',
    array['vehicle', 'budget', 'timeline'],
    91.2
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000002',
    'consumer_shopping',
    'web_quiz',
    'qualified',
    '{"intent": "home", "timeline": "90_days"}',
    '{"category": "home", "budget": "high", "style": "quiet"}',
    array['home', 'budget', 'timeline'],
    82.5
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000003',
    'consumer_shopping',
    'web_quiz',
    'qualified',
    '{"intent": "travel"}',
    '{"category": "travel", "budget": "mid"}',
    array['travel', 'budget'],
    76.0
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000004',
    'consumer_shopping',
    'web_quiz',
    'qualified',
    '{"intent": "food"}',
    '{"category": "food", "budget": "low"}',
    array['food', 'budget'],
    64.0
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000005',
    'consumer_shopping',
    'web_quiz',
    'qualified',
    '{"intent": "boat"}',
    '{"category": "boat", "budget": "high"}',
    array['boat', 'budget'],
    88.0
  );

insert into leadflow.questionnaires (id, partner_account_id, slug, title, vertical, sales_channel)
values (
  '40000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'rls-preference-test',
  'RLS Preference Test',
  'consumer_shopping',
  'web_quiz'
);

insert into leadflow.question_versions (
  id,
  partner_account_id,
  questionnaire_id,
  version_number,
  question_schema,
  consent_copy_snapshot,
  created_by_user_id
)
values (
  '41000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '40000000-0000-0000-0000-000000000001',
  1,
  '{"questions": [{"key": "perfect_vehicle", "type": "text"}]}',
  '{"notice": "Named sellers only with explicit selection."}',
  '11111111-1111-1111-1111-111111111111'
);

insert into leadflow.consent_ledger (
  id,
  partner_account_id,
  identity_id,
  profile_id,
  buyer_partner_account_id,
  scope,
  granted,
  exclusivity_level,
  sales_channel,
  vertical,
  notice_version,
  consent_text,
  provenance
)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'named_partner_routing',
    true,
    'named_multi_partner',
    'web_quiz',
    'consumer_shopping',
    'rls-test-v1',
    'I agree this profile can be routed to the named buyer partner selected in this test.',
    '{"test": true}'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'named_partner_routing',
    true,
    'named_multi_partner',
    'web_quiz',
    'consumer_shopping',
    'rls-test-v1',
    'I agree this profile can be routed to the named buyer partner selected in this test.',
    '{"test": true}'
  ),
  (
    '31000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    null,
    'aggregated_insights',
    true,
    'aggregated_only',
    'web_quiz',
    'consumer_shopping',
    'rls-test-v1',
    'I agree this answer can be used in non-personal aggregate insights.',
    '{"test": true}'
  ),
  (
    '31000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    null,
    'aggregated_insights',
    true,
    'aggregated_only',
    'web_quiz',
    'consumer_shopping',
    'rls-test-v1',
    'I agree this answer can be used in non-personal aggregate insights.',
    '{"test": true}'
  ),
  (
    '31000000-0000-0000-0000-000000000003',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    null,
    'aggregated_insights',
    true,
    'aggregated_only',
    'web_quiz',
    'consumer_shopping',
    'rls-test-v1',
    'I agree this answer can be used in non-personal aggregate insights.',
    '{"test": true}'
  ),
  (
    '31000000-0000-0000-0000-000000000004',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000004',
    null,
    'aggregated_insights',
    true,
    'aggregated_only',
    'web_quiz',
    'consumer_shopping',
    'rls-test-v1',
    'I agree this answer can be used in non-personal aggregate insights.',
    '{"test": true}'
  ),
  (
    '31000000-0000-0000-0000-000000000005',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '10000000-0000-0000-0000-000000000005',
    '20000000-0000-0000-0000-000000000005',
    null,
    'aggregated_insights',
    true,
    'aggregated_only',
    'web_quiz',
    'consumer_shopping',
    'rls-test-v1',
    'I agree this answer can be used in non-personal aggregate insights.',
    '{"test": true}'
  );

insert into leadflow.partner_entitlements (
  id,
  partner_account_id,
  buyer_partner_account_id,
  identity_id,
  profile_id,
  consent_ledger_id,
  exclusivity_level,
  vertical,
  allowed_scopes,
  allowed_sales_channels,
  entitlement_reason
)
values
  (
    '70000000-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'named_multi_partner',
    'consumer_shopping',
    array['named_partner_routing', 'admt_scoring']::leadflow.consent_scope[],
    array['web_quiz']::leadflow.sales_channel[],
    'RLS named buyer route'
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000002',
    'named_multi_partner',
    'consumer_shopping',
    array['named_partner_routing']::leadflow.consent_scope[],
    array['web_quiz']::leadflow.sales_channel[],
    'RLS named buyer route for deleted-row test'
  );

insert into leadflow.answers (
  id,
  partner_account_id,
  questionnaire_id,
  question_version_id,
  identity_id,
  profile_id,
  consent_ledger_id,
  question_key,
  answer_value,
  answer_text,
  answer_sha256,
  sales_channel,
  vertical,
  provenance,
  source_url
)
values (
  '50000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '40000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'perfect_vehicle',
  '{"make": "Toyota", "style": "SUV", "budget": "mid"}',
  'Toyota SUV with a mid-range budget',
  'answer-hash-001',
  'web_quiz',
  'consumer_shopping',
  '{"test": true}',
  'https://theleadflowpro.test/rls'
);

insert into leadflow.score_runs (id, partner_account_id, vertical, model_name, model_version, scoring_purpose)
values (
  '60000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'consumer_shopping',
  'rls-policy-score',
  'v1',
  'RLS policy validation'
);

insert into leadflow.scores (
  id,
  partner_account_id,
  score_run_id,
  identity_id,
  profile_id,
  consent_ledger_id,
  score_type,
  score_value,
  score_band,
  explanation,
  feature_snapshot
)
values (
  '61000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '60000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'buyer_fit',
  92.500,
  'critical',
  '{"why": "high-intent named consent test"}',
  '{"source": "rls-test"}'
);

set role authenticated;
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', '{}'::jsonb);
select pg_temp.ok(
  (select count(*) = 2 from leadflow.named_partner_leads where buyer_partner_account_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'named buyer sees only the two consented named-partner leads'
);
select pg_temp.ok(
  (select count(*) = 1 from leadflow.profiles where id = '20000000-0000-0000-0000-000000000001'),
  'named buyer can see routed profile summary'
);
select pg_temp.ok(
  (select count(*) = 1 from leadflow.scores where profile_id = '20000000-0000-0000-0000-000000000001'),
  'named buyer can see a score when entitlement allows ADMT scoring fields'
);
select pg_temp.ok(
  (select count(*) = 0 from leadflow.answers where profile_id = '20000000-0000-0000-0000-000000000001'),
  'named buyer cannot see raw answer rows'
);
reset role;

set role authenticated;
select pg_temp.as_user('33333333-3333-3333-3333-333333333333', '{}'::jsonb);
select pg_temp.ok(
  (select count(*) = 0 from leadflow.named_partner_leads where buyer_partner_account_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'unrelated partner cannot see named buyer leads'
);
select pg_temp.ok(
  (select count(*) = 0 from leadflow.profiles where id = '20000000-0000-0000-0000-000000000001'),
  'unrelated partner cannot see identified profile rows'
);
select pg_temp.ok(
  (select count(*) >= 1 from leadflow.aggregated_insights where partner_account_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' and profile_count >= 5),
  'unrelated authenticated user can see only k-thresholded non-personal aggregate insights'
);
reset role;

set role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', '{}'::jsonb);
select pg_temp.ok(
  (select count(*) = 1 from leadflow.answers where profile_id = '20000000-0000-0000-0000-000000000001'),
  'source partner can see its own raw answer rows'
);
reset role;

update leadflow.profiles
set deleted_at = now(), lifecycle_stage = 'deleted'
where id = '20000000-0000-0000-0000-000000000002';

set role authenticated;
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', '{}'::jsonb);
select pg_temp.ok(
  (select count(*) = 0 from leadflow.named_partner_leads where profile_id = '20000000-0000-0000-0000-000000000002'),
  'deleted routed profile is removed from buyer lead view'
);
reset role;

insert into leadflow.suppression_requests (
  id,
  partner_account_id,
  identity_id,
  scope,
  global_to_platform,
  reason,
  source,
  provenance
)
values (
  '80000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '10000000-0000-0000-0000-000000000001',
  'do_not_sell_share',
  false,
  'RLS suppression test',
  'web_quiz',
  '{"test": true}'
);

set role authenticated;
select pg_temp.as_user('22222222-2222-2222-2222-222222222222', '{}'::jsonb);
select pg_temp.ok(
  (select count(*) = 0 from leadflow.named_partner_leads where profile_id = '20000000-0000-0000-0000-000000000001'),
  'suppressed routed profile is removed from buyer lead view'
);
select pg_temp.ok(
  (select count(*) = 0 from leadflow.scores where profile_id = '20000000-0000-0000-0000-000000000001'),
  'suppressed routed profile score is hidden from buyer'
);
reset role;

insert into leadflow.dsar_requests (
  id,
  partner_account_id,
  identity_id,
  request_type,
  status,
  verification_status,
  request_payload
)
values (
  '90000000-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '10000000-0000-0000-0000-000000000005',
  'admt_opt_out',
  'processing',
  'verified',
  '{"test": true}'
);

set role authenticated;
select pg_temp.as_user('11111111-1111-1111-1111-111111111111', '{}'::jsonb);
select pg_temp.ok(
  (select count(*) = 0 from leadflow.scoreable_profiles where profile_id = '20000000-0000-0000-0000-000000000005'),
  'ADMT opted-out profile is excluded from scoreable_profiles'
);
select pg_temp.expect_rls_error(
  $sql$
    insert into leadflow.scores (
      id,
      partner_account_id,
      score_run_id,
      profile_id,
      score_type,
      score_value,
      score_band,
      explanation,
      feature_snapshot
    )
    values (
      '61000000-0000-0000-0000-000000000005',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '60000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000005',
      'post_opt_out_score',
      80.000,
      'high',
      '{"why": "should be blocked"}',
      '{"source": "rls-test"}'
    )
  $sql$,
  'source partner cannot score an ADMT opted-out profile'
);
reset role;

set role authenticated;
select pg_temp.as_user('44444444-4444-4444-4444-444444444444', '{"leadflow_role": "platform_admin"}'::jsonb);
select pg_temp.ok(
  (select count(*) = 3 from leadflow.partner_accounts where id in (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc'
  )),
  'platform admin can inspect every partner account'
);
select pg_temp.ok(
  (select count(*) = 1 from leadflow.profiles where id = '20000000-0000-0000-0000-000000000001'),
  'platform admin can inspect suppressed operational profile rows'
);
select pg_temp.ok(
  (select count(*) = 1 from leadflow.answers where id = '50000000-0000-0000-0000-000000000001'),
  'platform admin can inspect raw answer rows'
);
reset role;

rollback;
