-- OperatorOS Growth Loop: Goal Mode, Prospect Command, Client War Rooms, Proof Floor, Episode Engine
-- Outbound actions are staged as drafts. Nothing in this schema sends messages automatically.

create table if not exists public.operator_prospects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  business_name text not null,
  website_url text,
  industry text,
  market text not null default 'Longview, TX',
  priority text not null default 'C' check (priority in ('A','B','C','WARM')),
  qualification_signal text,
  observed_gap text,
  best_offer text,
  contact_route text,
  source text,
  status text not null default 'ready' check (status in ('research','ready','contacted','responded','qualified','proposal','won','lost','do_not_contact')),
  owner_name text default 'Pat',
  permission_state text not null default 'not_contacted' check (permission_state in ('not_contacted','requested','granted','declined','unknown')),
  last_contacted_at timestamptz,
  next_action_at timestamptz,
  next_action text,
  response_summary text,
  compliance_review_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,business_name)
);

create table if not exists public.operator_outreach_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  prospect_id uuid not null references public.operator_prospects(id) on delete cascade,
  channel text not null default 'email_or_dm' check (channel in ('email','dm','phone','text','email_or_dm','internal')),
  action_type text not null,
  due_at timestamptz not null,
  sequence_day smallint not null default 0 check (sequence_day between 0 and 60),
  message_draft text not null,
  status text not null default 'queued' check (status in ('queued','approved','sent','skipped','responded','cancelled')),
  human_approved boolean not null default false,
  sent_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(prospect_id,sequence_day,action_type)
);

create table if not exists public.operator_client_missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  target_label text not null,
  target_value numeric not null default 0,
  current_value numeric not null default 0,
  unit text not null default 'qualified_conversations',
  status text not null default 'active' check (status in ('draft','active','paused','completed')),
  bottleneck text,
  leads_generated integer not null default 0 check (leads_generated >= 0),
  contacted integer not null default 0 check (contacted >= 0),
  qualified_conversations integer not null default 0 check (qualified_conversations >= 0),
  appointments integer not null default 0 check (appointments >= 0),
  proposals integer not null default 0 check (proposals >= 0),
  response_time_seconds integer check (response_time_seconds is null or response_time_seconds >= 0),
  activity_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,name)
);

create table if not exists public.operator_daily_episodes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  episode_date date not null,
  day_number integer not null check (day_number >= 1),
  metrics_json jsonb not null default '{}'::jsonb,
  moved text,
  failed text,
  leak text,
  fixes text,
  approvals text,
  tomorrow_target text,
  content_draft text not null,
  status text not null default 'draft' check (status in ('draft','approved','published','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id,episode_date)
);

create index if not exists operator_prospects_workspace_priority_idx on public.operator_prospects(workspace_id,priority,status);
create index if not exists operator_prospects_next_action_idx on public.operator_prospects(next_action_at) where status not in ('won','lost','do_not_contact');
create index if not exists operator_outreach_due_idx on public.operator_outreach_actions(workspace_id,status,due_at);
create index if not exists operator_outreach_prospect_idx on public.operator_outreach_actions(prospect_id);
create index if not exists operator_client_missions_project_idx on public.operator_client_missions(project_id,status);
create index if not exists operator_daily_episodes_date_idx on public.operator_daily_episodes(workspace_id,episode_date desc);

alter table public.operator_prospects enable row level security;
alter table public.operator_outreach_actions enable row level security;
alter table public.operator_client_missions enable row level security;
alter table public.operator_daily_episodes enable row level security;

drop policy if exists operator_prospects_admin_all on public.operator_prospects;
create policy operator_prospects_admin_all on public.operator_prospects for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists operator_outreach_admin_all on public.operator_outreach_actions;
create policy operator_outreach_admin_all on public.operator_outreach_actions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists operator_client_missions_admin_all on public.operator_client_missions;
create policy operator_client_missions_admin_all on public.operator_client_missions for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists operator_client_missions_client_read on public.operator_client_missions;
create policy operator_client_missions_client_read on public.operator_client_missions for select to authenticated
  using (exists (select 1 from public.projects p where p.id=project_id and p.client_id=(select auth.uid())));

drop policy if exists operator_daily_episodes_admin_all on public.operator_daily_episodes;
create policy operator_daily_episodes_admin_all on public.operator_daily_episodes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.operator_prospects from anon;
revoke all on public.operator_outreach_actions from anon;
revoke all on public.operator_client_missions from anon;
revoke all on public.operator_daily_episodes from anon;
grant select,insert,update,delete on public.operator_prospects to authenticated;
grant select,insert,update,delete on public.operator_outreach_actions to authenticated;
grant select,insert,update,delete on public.operator_client_missions to authenticated;
grant select,insert,update,delete on public.operator_daily_episodes to authenticated;

-- Start the September cash mission. Preserve the earlier daily-flow mission as paused history.
update public.operator_missions set status='paused',updated_at=now()
where workspace_id=(select id from public.operator_workspaces where slug='the-leadflow-pro') and status='active';

insert into public.operator_missions (
  workspace_id,name,description,status,target_metric,target_value,current_value,unit,score,control_json,starts_at,target_at
)
select id,
  'September 2026: $75K Cash Collected',
  'Run the LeadFlow loop backward from cash collected into targeted contacts, qualified conversations, proposals, closes, delivery, and public proof.',
  'active','cash_collected_usd',75000,0,'USD',0,
  jsonb_build_object(
    'stretch_target_value',100000,
    'assumptions',jsonb_build_object('contact_to_reply',0.12,'reply_to_qualified',0.50,'qualified_to_proposal',0.70,'proposal_to_close',0.30),
    'offer_mix',jsonb_build_array(
      jsonb_build_object('name','OperatorOS','setup',9997,'closes',3),
      jsonb_build_object('name','FlowOps','setup',4997,'closes',5),
      jsonb_build_object('name','FlowDesk','setup',2997,'closes',5),
      jsonb_build_object('name','FlowWorker','setup',1497,'closes',4)
    ),
    'daily_quotas',jsonb_build_object('new_targeted_contacts',63,'followups',20,'qualified_conversations',4,'proposals',3,'closes',1,'private_concepts',2),
    'loop',jsonb_build_array('BUILD','MEASURE','SHOW','ATTRACT','CAPTURE','SELL','BUILD')
  ),
  '2026-09-01T05:00:00Z'::timestamptz,'2026-10-01T04:59:59Z'::timestamptz
from public.operator_workspaces
where slug='the-leadflow-pro'
and not exists (
  select 1 from public.operator_missions m where m.workspace_id=operator_workspaces.id and m.name='September 2026: $75K Cash Collected'
);

-- Seed Todd's War Room target without inventing performance results.
insert into public.operator_client_missions (
  workspace_id,project_id,name,target_label,target_value,current_value,unit,status,bottleneck,
  leads_generated,contacted,qualified_conversations,appointments,proposals,activity_json
)
select w.id,p.id,'Texas Twisted Realty: Lead Recovery Mission','Qualified buyer/seller conversations',25,0,
  'qualified_conversations','active',
  'Initial discovery bottleneck: follow-up after day 2–3. Replace this with measured data as activity accumulates.',
  0,0,0,0,0,'[]'::jsonb
from public.operator_workspaces w join public.projects p on p.name='Texas Twisted Realty Growth System'
where w.slug='the-leadflow-pro'
on conflict (project_id,name) do nothing;

-- Publish only these operating tables to realtime. RLS remains the access boundary.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='operator_prospects') then alter publication supabase_realtime add table public.operator_prospects; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='operator_outreach_actions') then alter publication supabase_realtime add table public.operator_outreach_actions; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='operator_client_missions') then alter publication supabase_realtime add table public.operator_client_missions; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='operator_daily_episodes') then alter publication supabase_realtime add table public.operator_daily_episodes; end if;
end $$;
