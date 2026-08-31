-- LeadFlow OperatorOS v1
-- Shared workspaces, missions, skills, workers, runs, events, and human approvals.
-- All direct browser access is RLS-gated to LeadFlow admins in v1.

create table public.operator_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  client_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  business_goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operator_workspace_members (
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'operator', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, profile_id)
);

create table public.operator_missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  target_metric text,
  target_value numeric,
  current_value numeric,
  unit text,
  score integer not null default 0 check (score between 0 and 100),
  control_json jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  target_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operator_skills (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  trigger_text text not null,
  instructions text not null,
  finish_when text not null,
  forbidden_actions text[] not null default '{}'::text[],
  provider text not null check (provider in ('openai', 'anthropic', 'human')),
  default_model text,
  risk_level text not null default 'green' check (risk_level in ('green', 'yellow', 'red')),
  enabled boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table public.operator_workers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  slug text not null,
  name text not null,
  role_title text not null,
  provider text not null check (provider in ('openai', 'anthropic', 'human')),
  model text,
  status text not null default 'waiting' check (status in ('waiting', 'working', 'blocked', 'offline')),
  status_detail text,
  capabilities text[] not null default '{}'::text[],
  last_heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

create table public.operator_worker_skills (
  worker_id uuid not null references public.operator_workers(id) on delete cascade,
  skill_id uuid not null references public.operator_skills(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (worker_id, skill_id)
);

create table public.operator_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  mission_id uuid references public.operator_missions(id) on delete set null,
  skill_id uuid not null references public.operator_skills(id) on delete restrict,
  worker_id uuid references public.operator_workers(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled', 'blocked')),
  trigger_source text not null default 'manual' check (trigger_source in ('manual', 'schedule', 'event', 'api')),
  input_json jsonb not null default '{}'::jsonb,
  context_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  risk_level text not null default 'green' check (risk_level in ('green', 'yellow', 'red')),
  started_at timestamptz,
  completed_at timestamptz,
  error_text text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operator_workers
  add column current_run_id uuid references public.operator_runs(id) on delete set null;

create table public.operator_run_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  run_id uuid not null references public.operator_runs(id) on delete cascade,
  event_type text not null check (event_type in ('queued', 'started', 'context_ready', 'model_request', 'model_response', 'recommendation', 'approval_required', 'completed', 'blocked', 'failed', 'cancelled')),
  title text not null,
  detail text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.operator_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  run_id uuid not null references public.operator_runs(id) on delete cascade,
  action_type text not null,
  risk_level text not null check (risk_level in ('yellow', 'red')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  title text not null,
  summary text not null,
  payload_json jsonb not null default '{}'::jsonb,
  requested_by_worker_id uuid references public.operator_workers(id) on delete set null,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index operator_missions_workspace_status_idx on public.operator_missions(workspace_id, status);
create index operator_skills_workspace_enabled_idx on public.operator_skills(workspace_id, enabled);
create index operator_workers_workspace_status_idx on public.operator_workers(workspace_id, status);
create index operator_runs_workspace_created_idx on public.operator_runs(workspace_id, created_at desc);
create index operator_runs_status_created_idx on public.operator_runs(status, created_at desc);
create index operator_run_events_run_created_idx on public.operator_run_events(run_id, created_at);
create index operator_run_events_workspace_created_idx on public.operator_run_events(workspace_id, created_at desc);
create index operator_approvals_workspace_status_idx on public.operator_approvals(workspace_id, status, created_at desc);

alter table public.operator_workspaces enable row level security;
alter table public.operator_workspace_members enable row level security;
alter table public.operator_missions enable row level security;
alter table public.operator_skills enable row level security;
alter table public.operator_workers enable row level security;
alter table public.operator_worker_skills enable row level security;
alter table public.operator_runs enable row level security;
alter table public.operator_run_events enable row level security;
alter table public.operator_approvals enable row level security;

create policy "operator workspaces admin all" on public.operator_workspaces
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "operator members admin all" on public.operator_workspace_members
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "operator missions admin all" on public.operator_missions
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "operator skills admin all" on public.operator_skills
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "operator workers admin all" on public.operator_workers
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "operator worker skills admin all" on public.operator_worker_skills
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "operator runs admin all" on public.operator_runs
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "operator run events admin all" on public.operator_run_events
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
create policy "operator approvals admin all" on public.operator_approvals
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on table public.operator_workspaces from anon;
revoke all on table public.operator_workspace_members from anon;
revoke all on table public.operator_missions from anon;
revoke all on table public.operator_skills from anon;
revoke all on table public.operator_workers from anon;
revoke all on table public.operator_worker_skills from anon;
revoke all on table public.operator_runs from anon;
revoke all on table public.operator_run_events from anon;
revoke all on table public.operator_approvals from anon;

grant select, insert, update, delete on table public.operator_workspaces to authenticated;
grant select, insert, update, delete on table public.operator_workspace_members to authenticated;
grant select, insert, update, delete on table public.operator_missions to authenticated;
grant select, insert, update, delete on table public.operator_skills to authenticated;
grant select, insert, update, delete on table public.operator_workers to authenticated;
grant select, insert, update, delete on table public.operator_worker_skills to authenticated;
grant select, insert, update, delete on table public.operator_runs to authenticated;
grant select, insert, update, delete on table public.operator_run_events to authenticated;
grant select, insert, update, delete on table public.operator_approvals to authenticated;

insert into public.operator_workspaces (slug, name, status, business_goal)
values (
  'the-leadflow-pro',
  'The LeadFlow Pro',
  'active',
  'Turn attention into conversations, conversations into sales, and completed work into proof.'
)
on conflict (slug) do update set
  name = excluded.name,
  status = excluded.status,
  business_goal = excluded.business_goal,
  updated_at = now();

insert into public.operator_workspace_members (workspace_id, profile_id, role)
select w.id, p.id, 'owner'
from public.operator_workspaces w
join public.profiles p on p.role = 'admin'
where w.slug = 'the-leadflow-pro'
on conflict (workspace_id, profile_id) do update set role = excluded.role;

insert into public.operator_missions (
  workspace_id,
  name,
  description,
  status,
  target_metric,
  target_value,
  current_value,
  unit,
  control_json,
  starts_at
)
select
  w.id,
  'Run a clean daily lead flow',
  'Work every new lead, clear overdue follow-up, value open opportunities, clear approvals, and ship proof.',
  'active',
  'daily_flow_score',
  100,
  0,
  'score',
  jsonb_build_object(
    'checks', jsonb_build_array(
      'new_leads_cleared',
      'overdue_follow_up_cleared',
      'open_opportunities_valued',
      'human_stopline_cleared',
      'proof_shipped'
    )
  ),
  now()
from public.operator_workspaces w
where w.slug = 'the-leadflow-pro'
  and not exists (
    select 1 from public.operator_missions m
    where m.workspace_id = w.id and m.target_metric = 'daily_flow_score'
  );

insert into public.operator_skills (
  workspace_id,
  slug,
  name,
  description,
  trigger_text,
  instructions,
  finish_when,
  forbidden_actions,
  provider,
  default_model,
  risk_level
)
select w.id, v.slug, v.name, v.description, v.trigger_text, v.instructions, v.finish_when,
       v.forbidden_actions, v.provider, v.default_model, v.risk_level
from public.operator_workspaces w
cross join (values
  (
    'operator-brief',
    'Daily Operator Brief',
    'Find the bottleneck and identify the highest-value next moves from current business data.',
    'An owner requests the current operating brief.',
    'Review the supplied business snapshot. Explain what moved, what is stuck, where revenue may be leaking, and the three highest-value next actions. Use only the supplied evidence. Never invent activity or results.',
    'The owner receives an evidence-backed brief with three ordered next actions.',
    array['send external messages','publish content','spend money','change pricing','delete records','deploy production']::text[],
    'openai',
    'gpt-5.6-terra',
    'green'
  ),
  (
    'lead-triage',
    'Lead Triage',
    'Prioritize active opportunities and identify missing next actions without contacting anyone.',
    'New or unworked leads exist in the CRM.',
    'Review the anonymized lead queue. Rank the best opportunities, explain the evidence, flag missing values or follow-up dates, and recommend the next internal action for each priority lead.',
    'Every priority lead has a clear internal next-action recommendation and supporting reason.',
    array['send email','send text message','place call','change lead status to won','create invoice']::text[],
    'openai',
    'gpt-5.6-terra',
    'yellow'
  ),
  (
    'follow-up-recovery',
    'Follow-Up Recovery',
    'Find stale or overdue opportunities and prepare a recovery plan for human review.',
    'Follow-up tasks are overdue or open leads have gone stale.',
    'Review overdue tasks and stale lead signals. Group them by urgency. Draft internal recovery recommendations and identify any customer-facing action that must enter the approval stopline.',
    'The overdue queue is ordered and every proposed external action is explicitly approval-gated.',
    array['send email','send text message','place call','publish content','offer discount']::text[],
    'openai',
    'gpt-5.6-terra',
    'yellow'
  ),
  (
    'delivery-risk-review',
    'Delivery Risk Review',
    'Inspect active client builds and surface milestone, launch, and handoff risk.',
    'An operator requests a delivery review or a build approaches its target date.',
    'Review projects and milestones. Identify blocked work, missing owners, overdue milestones, approval dependencies, and the next build action. Do not modify code or deploy.',
    'Active builds have a ranked risk list and a practical next action.',
    array['modify code','merge pull request','deploy production','delete project data','promise launch date']::text[],
    'anthropic',
    'claude-sonnet-5',
    'green'
  ),
  (
    'proof-snapshot',
    'Proof Snapshot',
    'Turn verified operating data into a factual internal proof report.',
    'The owner requests a daily or weekly proof snapshot.',
    'Use only the supplied metrics and completed records. Summarize what was captured, worked, sold, shipped, and learned. Clearly label missing data. Do not write public claims that exceed the evidence.',
    'A factual proof snapshot is ready for owner review.',
    array['publish content','claim guaranteed results','invent metrics','name private leads']::text[],
    'anthropic',
    'claude-sonnet-5',
    'yellow'
  )
) as v(slug, name, description, trigger_text, instructions, finish_when, forbidden_actions, provider, default_model, risk_level)
where w.slug = 'the-leadflow-pro'
on conflict (workspace_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  trigger_text = excluded.trigger_text,
  instructions = excluded.instructions,
  finish_when = excluded.finish_when,
  forbidden_actions = excluded.forbidden_actions,
  provider = excluded.provider,
  default_model = excluded.default_model,
  risk_level = excluded.risk_level,
  updated_at = now();

insert into public.operator_workers (
  workspace_id,
  slug,
  name,
  role_title,
  provider,
  model,
  status,
  status_detail,
  capabilities
)
select w.id, v.slug, v.name, v.role_title, v.provider, v.model, 'waiting', 'Ready for an approved mission.', v.capabilities
from public.operator_workspaces w
cross join (values
  ('chief', 'Chief', 'Operator and mission coordinator', 'openai', 'gpt-5.6-terra', array['daily brief','bottleneck detection','next-action planning']::text[]),
  ('signal', 'Signal', 'Attention intelligence', 'openai', 'gpt-5.6-terra', array['traffic review','content opportunity detection']::text[]),
  ('catcher', 'Catcher', 'Lead capture monitor', 'openai', 'gpt-5.6-terra', array['capture monitoring','source integrity checks']::text[]),
  ('scout', 'Scout', 'Lead qualification and priority', 'openai', 'gpt-5.6-terra', array['lead triage','priority scoring','next-action recommendations']::text[]),
  ('drip', 'Drip', 'Follow-up recovery', 'openai', 'gpt-5.6-terra', array['stale lead review','follow-up planning']::text[]),
  ('closer', 'Closer', 'Proposal and decision support', 'openai', 'gpt-5.6-terra', array['pipeline review','proposal readiness']::text[]),
  ('cash', 'Cash', 'Payment and revenue monitor', 'anthropic', 'claude-sonnet-5', array['payment review','revenue reconciliation']::text[]),
  ('forge', 'Forge', 'Build and delivery control', 'anthropic', 'claude-sonnet-5', array['delivery risk','milestone review','handoff planning']::text[]),
  ('lens', 'Lens', 'Proof and performance reporting', 'anthropic', 'claude-sonnet-5', array['proof snapshots','measurement quality','reporting']::text[])
) as v(slug, name, role_title, provider, model, capabilities)
where w.slug = 'the-leadflow-pro'
on conflict (workspace_id, slug) do update set
  name = excluded.name,
  role_title = excluded.role_title,
  provider = excluded.provider,
  model = excluded.model,
  capabilities = excluded.capabilities,
  updated_at = now();

insert into public.operator_worker_skills (worker_id, skill_id, is_primary)
select ow.id, os.id, true
from public.operator_workspaces w
join (values
  ('chief', 'operator-brief'),
  ('scout', 'lead-triage'),
  ('drip', 'follow-up-recovery'),
  ('forge', 'delivery-risk-review'),
  ('lens', 'proof-snapshot')
) as map(worker_slug, skill_slug) on true
join public.operator_workers ow on ow.workspace_id = w.id and ow.slug = map.worker_slug
join public.operator_skills os on os.workspace_id = w.id and os.slug = map.skill_slug
where w.slug = 'the-leadflow-pro'
on conflict (worker_id, skill_id) do update set is_primary = excluded.is_primary;

-- Realtime drives the visual mission board. RLS still determines what each signed-in user can receive.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'operator_missions') then
      alter publication supabase_realtime add table public.operator_missions;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'operator_workers') then
      alter publication supabase_realtime add table public.operator_workers;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'operator_runs') then
      alter publication supabase_realtime add table public.operator_runs;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'operator_run_events') then
      alter publication supabase_realtime add table public.operator_run_events;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'operator_approvals') then
      alter publication supabase_realtime add table public.operator_approvals;
    end if;
  end if;
end $$;
