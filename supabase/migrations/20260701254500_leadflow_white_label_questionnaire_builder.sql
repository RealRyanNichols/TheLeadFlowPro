-- LeadFlow Pro white-label questionnaire builder.
-- Additive migration. Existing questionnaire intake stays intact while builder
-- drafts, versions, result pages, consent modules, routes, and widgets become
-- auditable product objects.

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

alter table if exists leadflow.questionnaires add column if not exists owner_account_id uuid;
alter table if exists leadflow.questionnaires add column if not exists owner_account_type text not null default 'platform';
alter table if exists leadflow.questionnaires add column if not exists visibility text not null default 'internal';
alter table if exists leadflow.questionnaires add column if not exists theme_id uuid;
alter table if exists leadflow.questionnaires add column if not exists active_version_id uuid;
alter table if exists leadflow.questionnaires add column if not exists published_route text;
alter table if exists leadflow.questionnaires add column if not exists share_url text;
alter table if exists leadflow.questionnaires add column if not exists embed_widget_id uuid;
alter table if exists leadflow.questionnaires add column if not exists plan_required text not null default 'admin';
alter table if exists leadflow.questionnaires add column if not exists archived_at timestamptz;

alter table if exists leadflow.questionnaire_versions add column if not exists version_label text;
alter table if exists leadflow.questionnaire_versions add column if not exists created_by uuid;
alter table if exists leadflow.questionnaire_versions add column if not exists safety_status text not null default 'clear';
alter table if exists leadflow.questionnaire_versions add column if not exists validation_errors text[] not null default '{}';
alter table if exists leadflow.questionnaire_versions add column if not exists scoring_snapshot jsonb not null default '{}'::jsonb;
alter table if exists leadflow.questionnaire_versions add column if not exists result_snapshot jsonb not null default '{}'::jsonb;
alter table if exists leadflow.questionnaire_versions add column if not exists consent_snapshot jsonb not null default '{}'::jsonb;

alter table if exists leadflow.questions add column if not exists step_number integer not null default 1;
alter table if exists leadflow.questions add column if not exists question_order integer not null default 0;
alter table if exists leadflow.questions add column if not exists field_key text;
alter table if exists leadflow.questions add column if not exists helper_text text;
alter table if exists leadflow.questions add column if not exists validation_rules jsonb not null default '{}'::jsonb;

create table if not exists leadflow.questionnaire_themes (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid,
  owner_account_type text not null default 'platform',
  name text not null,
  slug text not null,
  status text not null default 'active',
  variables jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint questionnaire_themes_status_check check (status in ('active', 'draft', 'archived')),
  constraint questionnaire_themes_slug_check check (slug ~ '^[a-z0-9][a-z0-9-]{1,88}[a-z0-9]$')
);

comment on table leadflow.questionnaire_themes is
  'Reusable white-label questionnaire themes with token variables for public tools, widgets, and client-branded intake surfaces.';

create table if not exists leadflow.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references leadflow.questions(id) on delete cascade,
  option_order integer not null default 0,
  option_key text not null,
  label text not null,
  value jsonb,
  score_delta numeric(8,2) not null default 0,
  tags_to_add text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, option_key)
);

comment on table leadflow.question_options is
  'Normalized option rows for builder-managed select, ranking, seller-selection, and scoring choices.';

create table if not exists leadflow.conditional_logic (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references leadflow.questionnaire_versions(id) on delete cascade,
  question_id uuid references leadflow.questions(id) on delete cascade,
  depends_on_question_id uuid references leadflow.questions(id) on delete cascade,
  field_key text,
  operator text not null,
  value jsonb,
  action text not null default 'show',
  rule_group text not null default 'and',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conditional_logic_operator_check check (operator in ('equals', 'not_equals', 'includes', 'not_includes', 'exists', 'not_exists', 'gt', 'gte', 'lt', 'lte')),
  constraint conditional_logic_action_check check (action in ('show', 'hide', 'skip_to_step', 'add_tag', 'set_result')),
  constraint conditional_logic_group_check check (rule_group in ('and', 'or'))
);

comment on table leadflow.conditional_logic is
  'Builder-safe conditional logic. Admins and approved builders choose dropdown rules instead of raw SQL.';

create table if not exists leadflow.scoring_rules (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references leadflow.questionnaire_versions(id) on delete cascade,
  question_id uuid references leadflow.questions(id) on delete cascade,
  answer_match jsonb not null default '{}'::jsonb,
  score_delta numeric(8,2) not null default 0,
  tags_to_add text[] not null default '{}',
  recommended_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table leadflow.scoring_rules is
  'Explainable scoring rules for questionnaire versions. Do not use protected-trait, medical, private financial, or private political attributes.';

create table if not exists leadflow.result_pages (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references leadflow.questionnaire_versions(id) on delete cascade,
  result_key text not null,
  min_score integer not null default 0,
  max_score integer not null default 100,
  title text not null,
  summary text not null,
  recommended_next_action text not null,
  cta_label text,
  cta_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (questionnaire_version_id, result_key),
  constraint result_pages_score_range_check check (min_score >= 0 and max_score <= 100 and max_score >= min_score)
);

comment on table leadflow.result_pages is
  'Score-based result pages shown after questionnaire completion before identity capture or routing.';

create table if not exists leadflow.questionnaire_routes (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references leadflow.questionnaires(id) on delete cascade,
  questionnaire_version_id uuid references leadflow.questionnaire_versions(id) on delete set null,
  route_path text not null,
  share_token text not null default encode(gen_random_bytes(12), 'hex'),
  status text not null default 'draft',
  embed_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_path),
  unique (share_token),
  constraint questionnaire_routes_status_check check (status in ('draft', 'published', 'archived')),
  constraint questionnaire_routes_path_check check (route_path ~ '^/q/[a-z0-9][a-z0-9-]{1,88}[a-z0-9]$')
);

comment on table leadflow.questionnaire_routes is
  'Published share routes for white-label questionnaires. Public rendering still goes through server-side lookup and safety checks.';

create table if not exists leadflow.consent_modules (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid references leadflow.questionnaires(id) on delete cascade,
  questionnaire_version_id uuid references leadflow.questionnaire_versions(id) on delete cascade,
  module_type text not null,
  label text not null,
  body text not null,
  required boolean not null default false,
  consent_scope text not null,
  consent_version text not null,
  display_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consent_modules_type_check check (module_type in ('tool_answers_only', 'contact_me', 'single_seller', 'selected_sellers', 'anonymous_insights', 'submit_source_review', 'buyer_request_access', 'do_not_contact', 'delete_my_data')),
  constraint consent_modules_status_check check (status in ('active', 'draft', 'archived'))
);

comment on table leadflow.consent_modules is
  'Reusable consent modules for questionnaire tools. Phone/text routing and seller sharing require separate explicit modules.';

alter table if exists leadflow.widgets add column if not exists questionnaire_version_id uuid references leadflow.questionnaire_versions(id) on delete set null;
alter table if exists leadflow.widgets add column if not exists builder_source text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.questionnaires'::regclass
      and conname = 'questionnaires_owner_type_check'
  ) then
    alter table leadflow.questionnaires
      add constraint questionnaires_owner_type_check
      check (owner_account_type in ('platform', 'buyer', 'partner'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.questionnaires'::regclass
      and conname = 'questionnaires_visibility_check'
  ) then
    alter table leadflow.questionnaires
      add constraint questionnaires_visibility_check
      check (visibility in ('internal', 'private', 'unlisted', 'public'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'leadflow.questionnaire_versions'::regclass
      and conname = 'questionnaire_versions_safety_status_check'
  ) then
    alter table leadflow.questionnaire_versions
      add constraint questionnaire_versions_safety_status_check
      check (safety_status in ('clear', 'warning', 'blocked'));
  end if;
end $$;

create index if not exists questionnaires_owner_idx on leadflow.questionnaires(owner_account_type, owner_account_id, status, updated_at desc) where deleted_at is null;
create index if not exists questionnaires_slug_idx on leadflow.questionnaires(slug) where deleted_at is null;
create index if not exists questionnaire_versions_builder_idx on leadflow.questionnaire_versions(questionnaire_id, status, version_number desc);
create index if not exists questions_builder_version_idx on leadflow.questions(questionnaire_version_id, step_number, question_order);
create index if not exists question_options_order_idx on leadflow.question_options(question_id, option_order);
create index if not exists conditional_logic_version_idx on leadflow.conditional_logic(questionnaire_version_id, question_id);
create index if not exists scoring_rules_version_idx on leadflow.scoring_rules(questionnaire_version_id, question_id);
create index if not exists result_pages_version_idx on leadflow.result_pages(questionnaire_version_id, min_score, max_score);
create index if not exists questionnaire_routes_status_idx on leadflow.questionnaire_routes(status, route_path);
create index if not exists consent_modules_version_idx on leadflow.consent_modules(questionnaire_version_id, display_order);
create index if not exists widgets_questionnaire_version_idx on leadflow.widgets(questionnaire_id, questionnaire_version_id);

drop trigger if exists set_questionnaire_themes_updated_at on leadflow.questionnaire_themes;
create trigger set_questionnaire_themes_updated_at before update on leadflow.questionnaire_themes for each row execute function leadflow.set_updated_at();
drop trigger if exists set_question_options_updated_at on leadflow.question_options;
create trigger set_question_options_updated_at before update on leadflow.question_options for each row execute function leadflow.set_updated_at();
drop trigger if exists set_conditional_logic_updated_at on leadflow.conditional_logic;
create trigger set_conditional_logic_updated_at before update on leadflow.conditional_logic for each row execute function leadflow.set_updated_at();
drop trigger if exists set_scoring_rules_updated_at on leadflow.scoring_rules;
create trigger set_scoring_rules_updated_at before update on leadflow.scoring_rules for each row execute function leadflow.set_updated_at();
drop trigger if exists set_result_pages_updated_at on leadflow.result_pages;
create trigger set_result_pages_updated_at before update on leadflow.result_pages for each row execute function leadflow.set_updated_at();
drop trigger if exists set_questionnaire_routes_updated_at on leadflow.questionnaire_routes;
create trigger set_questionnaire_routes_updated_at before update on leadflow.questionnaire_routes for each row execute function leadflow.set_updated_at();
drop trigger if exists set_consent_modules_updated_at on leadflow.consent_modules;
create trigger set_consent_modules_updated_at before update on leadflow.consent_modules for each row execute function leadflow.set_updated_at();

alter table leadflow.questionnaire_themes enable row level security;
alter table leadflow.question_options enable row level security;
alter table leadflow.conditional_logic enable row level security;
alter table leadflow.scoring_rules enable row level security;
alter table leadflow.result_pages enable row level security;
alter table leadflow.questionnaire_routes enable row level security;
alter table leadflow.consent_modules enable row level security;

alter table leadflow.questionnaire_themes force row level security;
alter table leadflow.question_options force row level security;
alter table leadflow.conditional_logic force row level security;
alter table leadflow.scoring_rules force row level security;
alter table leadflow.result_pages force row level security;
alter table leadflow.questionnaire_routes force row level security;
alter table leadflow.consent_modules force row level security;

create or replace function leadflow.current_user_can_manage_questionnaire(target_questionnaire_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = leadflow, public
as $$
  select
    leadflow.is_platform_admin()
    or exists (
      select 1
      from leadflow.questionnaires q
      where q.id = target_questionnaire_id
        and q.deleted_at is null
        and (
          (q.owner_account_type = 'buyer' and exists (
            select 1 from leadflow.buyer_accounts ba
            where ba.id = q.owner_account_id
              and ((ba.auth_user_id = (select auth.uid())) or (ba.owner_user_id = (select auth.uid())))
              and coalesce(ba.account_status, ba.status, '') in ('approved_basic', 'approved_partner', 'approved_premium', 'approved', 'active')
          ))
          or
          (q.owner_account_type = 'partner' and exists (
            select 1 from leadflow.partner_accounts pa
            where pa.id = q.owner_account_id
              and ((pa.auth_user_id = (select auth.uid())) or (pa.owner_user_id = (select auth.uid())))
              and pa.status in ('approved', 'restricted')
          ))
        )
    );
$$;

revoke all on function leadflow.current_user_can_manage_questionnaire(uuid) from public;
grant execute on function leadflow.current_user_can_manage_questionnaire(uuid) to authenticated, service_role;

drop policy if exists questionnaire_builder_owner_questionnaires on leadflow.questionnaires;
create policy questionnaire_builder_owner_questionnaires on leadflow.questionnaires
  for all to authenticated
  using (
    leadflow.is_platform_admin()
    or (
      owner_account_type = 'buyer'
      and exists (
        select 1 from leadflow.buyer_accounts ba
        where ba.id = questionnaires.owner_account_id
          and ((ba.auth_user_id = (select auth.uid())) or (ba.owner_user_id = (select auth.uid())))
          and coalesce(ba.account_status, ba.status, '') in ('approved_basic', 'approved_partner', 'approved_premium', 'approved', 'active')
      )
    )
    or (
      owner_account_type = 'partner'
      and exists (
        select 1 from leadflow.partner_accounts pa
        where pa.id = questionnaires.owner_account_id
          and ((pa.auth_user_id = (select auth.uid())) or (pa.owner_user_id = (select auth.uid())))
          and pa.status in ('approved', 'restricted')
      )
    )
  )
  with check (
    leadflow.is_platform_admin()
    or (
      owner_account_type = 'buyer'
      and exists (
        select 1 from leadflow.buyer_accounts ba
        where ba.id = questionnaires.owner_account_id
          and ((ba.auth_user_id = (select auth.uid())) or (ba.owner_user_id = (select auth.uid())))
          and coalesce(ba.account_status, ba.status, '') in ('approved_basic', 'approved_partner', 'approved_premium', 'approved', 'active')
      )
    )
    or (
      owner_account_type = 'partner'
      and exists (
        select 1 from leadflow.partner_accounts pa
        where pa.id = questionnaires.owner_account_id
          and ((pa.auth_user_id = (select auth.uid())) or (pa.owner_user_id = (select auth.uid())))
          and pa.status in ('approved', 'restricted')
      )
    )
  );

drop policy if exists questionnaire_builder_owner_versions on leadflow.questionnaire_versions;
create policy questionnaire_builder_owner_versions on leadflow.questionnaire_versions
  for all to authenticated
  using (leadflow.current_user_can_manage_questionnaire(questionnaire_id))
  with check (leadflow.current_user_can_manage_questionnaire(questionnaire_id));

drop policy if exists questionnaire_builder_owner_questions on leadflow.questions;
create policy questionnaire_builder_owner_questions on leadflow.questions
  for all to authenticated
  using (
    exists (
      select 1 from leadflow.questionnaire_versions qv
      where qv.id = questions.questionnaire_version_id
        and leadflow.current_user_can_manage_questionnaire(qv.questionnaire_id)
    )
  )
  with check (
    exists (
      select 1 from leadflow.questionnaire_versions qv
      where qv.id = questions.questionnaire_version_id
        and leadflow.current_user_can_manage_questionnaire(qv.questionnaire_id)
    )
  );

drop policy if exists questionnaire_builder_admin_all_themes on leadflow.questionnaire_themes;
create policy questionnaire_builder_admin_all_themes on leadflow.questionnaire_themes
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists questionnaire_builder_owner_select_themes on leadflow.questionnaire_themes;
create policy questionnaire_builder_owner_select_themes on leadflow.questionnaire_themes
  for select to authenticated
  using (deleted_at is null and (owner_account_id is null or leadflow.is_platform_admin()));

drop policy if exists questionnaire_builder_admin_all_options on leadflow.question_options;
create policy questionnaire_builder_admin_all_options on leadflow.question_options
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists questionnaire_builder_owner_options on leadflow.question_options;
create policy questionnaire_builder_owner_options on leadflow.question_options
  for all to authenticated
  using (
    exists (
      select 1 from leadflow.questions qu
      join leadflow.questionnaire_versions qv on qv.id = qu.questionnaire_version_id
      where qu.id = question_options.question_id
        and leadflow.current_user_can_manage_questionnaire(qv.questionnaire_id)
    )
  )
  with check (
    exists (
      select 1 from leadflow.questions qu
      join leadflow.questionnaire_versions qv on qv.id = qu.questionnaire_version_id
      where qu.id = question_options.question_id
        and leadflow.current_user_can_manage_questionnaire(qv.questionnaire_id)
    )
  );

drop policy if exists questionnaire_builder_admin_all_logic on leadflow.conditional_logic;
create policy questionnaire_builder_admin_all_logic on leadflow.conditional_logic
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists questionnaire_builder_owner_logic on leadflow.conditional_logic;
create policy questionnaire_builder_owner_logic on leadflow.conditional_logic
  for all to authenticated
  using (
    exists (
      select 1 from leadflow.questionnaire_versions qv
      where qv.id = conditional_logic.questionnaire_version_id
        and leadflow.current_user_can_manage_questionnaire(qv.questionnaire_id)
    )
  )
  with check (
    exists (
      select 1 from leadflow.questionnaire_versions qv
      where qv.id = conditional_logic.questionnaire_version_id
        and leadflow.current_user_can_manage_questionnaire(qv.questionnaire_id)
    )
  );

drop policy if exists questionnaire_builder_admin_all_scoring on leadflow.scoring_rules;
create policy questionnaire_builder_admin_all_scoring on leadflow.scoring_rules
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists questionnaire_builder_owner_scoring on leadflow.scoring_rules;
create policy questionnaire_builder_owner_scoring on leadflow.scoring_rules
  for all to authenticated
  using (
    exists (
      select 1 from leadflow.questionnaire_versions qv
      where qv.id = scoring_rules.questionnaire_version_id
        and leadflow.current_user_can_manage_questionnaire(qv.questionnaire_id)
    )
  )
  with check (
    exists (
      select 1 from leadflow.questionnaire_versions qv
      where qv.id = scoring_rules.questionnaire_version_id
        and leadflow.current_user_can_manage_questionnaire(qv.questionnaire_id)
    )
  );

drop policy if exists questionnaire_builder_admin_all_results on leadflow.result_pages;
create policy questionnaire_builder_admin_all_results on leadflow.result_pages
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists questionnaire_builder_owner_results on leadflow.result_pages;
create policy questionnaire_builder_owner_results on leadflow.result_pages
  for all to authenticated
  using (
    exists (
      select 1 from leadflow.questionnaire_versions qv
      where qv.id = result_pages.questionnaire_version_id
        and leadflow.current_user_can_manage_questionnaire(qv.questionnaire_id)
    )
  )
  with check (
    exists (
      select 1 from leadflow.questionnaire_versions qv
      where qv.id = result_pages.questionnaire_version_id
        and leadflow.current_user_can_manage_questionnaire(qv.questionnaire_id)
    )
  );

drop policy if exists questionnaire_builder_admin_all_routes on leadflow.questionnaire_routes;
create policy questionnaire_builder_admin_all_routes on leadflow.questionnaire_routes
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists questionnaire_builder_owner_routes on leadflow.questionnaire_routes;
create policy questionnaire_builder_owner_routes on leadflow.questionnaire_routes
  for all to authenticated
  using (leadflow.current_user_can_manage_questionnaire(questionnaire_id))
  with check (leadflow.current_user_can_manage_questionnaire(questionnaire_id));

drop policy if exists questionnaire_builder_admin_all_consent_modules on leadflow.consent_modules;
create policy questionnaire_builder_admin_all_consent_modules on leadflow.consent_modules
  for all to authenticated using (leadflow.is_platform_admin()) with check (leadflow.is_platform_admin());
drop policy if exists questionnaire_builder_owner_consent_modules on leadflow.consent_modules;
create policy questionnaire_builder_owner_consent_modules on leadflow.consent_modules
  for all to authenticated
  using (
    questionnaire_id is not null
    and leadflow.current_user_can_manage_questionnaire(questionnaire_id)
  )
  with check (
    questionnaire_id is not null
    and leadflow.current_user_can_manage_questionnaire(questionnaire_id)
  );

grant usage on schema leadflow to anon, authenticated, service_role;
grant select, insert, update on leadflow.questionnaires to authenticated;
grant select, insert, update on leadflow.questionnaire_versions to authenticated;
grant select, insert, update on leadflow.questions to authenticated;
grant select, insert, update on leadflow.questionnaire_themes to authenticated;
grant select, insert, update on leadflow.question_options to authenticated;
grant select, insert, update on leadflow.conditional_logic to authenticated;
grant select, insert, update on leadflow.scoring_rules to authenticated;
grant select, insert, update on leadflow.result_pages to authenticated;
grant select, insert, update on leadflow.questionnaire_routes to authenticated;
grant select, insert, update on leadflow.consent_modules to authenticated;
grant all on leadflow.questionnaire_themes to service_role;
grant all on leadflow.question_options to service_role;
grant all on leadflow.conditional_logic to service_role;
grant all on leadflow.scoring_rules to service_role;
grant all on leadflow.result_pages to service_role;
grant all on leadflow.questionnaire_routes to service_role;
grant all on leadflow.consent_modules to service_role;

insert into leadflow.questionnaire_themes (name, slug, status, variables)
values
  ('LeadFlow Default', 'leadflow-default', 'active', '{"accent":"#67e8f9","background":"#050711","surface":"#07101b","button":"#f7b733"}'::jsonb),
  ('Local Operator', 'local-operator', 'active', '{"accent":"#a6e36b","background":"#06110b","surface":"#0d1a13","button":"#67e8f9"}'::jsonb)
on conflict do nothing;
