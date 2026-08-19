-- Expand the Sales Desk into an operating CRM and delivery center.
--
-- The sales role can own qualified leads, schedule follow-up work, manage
-- projects and deliverables, and invite a client into the existing Build Room.
-- Clients can review only deliverables explicitly marked visible and may only
-- change their approval decision and feedback.

-- ============================================================
-- 1. CRM ownership and follow-up fields.
-- ============================================================

alter table public.leads
  add column if not exists priority text not null default 'normal',
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists expected_value_cents integer,
  add column if not exists close_probability integer,
  add column if not exists lost_reason text;

alter table public.leads drop constraint if exists leads_priority_check;
alter table public.leads add constraint leads_priority_check
  check (priority = any (array['low'::text, 'normal'::text, 'high'::text, 'hot'::text]));

alter table public.leads drop constraint if exists leads_expected_value_check;
alter table public.leads add constraint leads_expected_value_check
  check (expected_value_cents is null or expected_value_cents >= 0);

alter table public.leads drop constraint if exists leads_close_probability_check;
alter table public.leads add constraint leads_close_probability_check
  check (close_probability is null or close_probability between 0 and 100);

alter table public.leads drop constraint if exists leads_lost_reason_length_check;
alter table public.leads add constraint leads_lost_reason_length_check
  check (lost_reason is null or char_length(lost_reason) <= 1000);

alter table public.lead_tasks
  add column if not exists priority text not null default 'normal',
  add column if not exists assigned_to text,
  add column if not exists task_type text not null default 'call';

alter table public.lead_tasks drop constraint if exists lead_tasks_priority_check;
alter table public.lead_tasks add constraint lead_tasks_priority_check
  check (priority = any (array['low'::text, 'normal'::text, 'high'::text, 'hot'::text]));

alter table public.lead_tasks drop constraint if exists lead_tasks_type_check;
alter table public.lead_tasks add constraint lead_tasks_type_check
  check (task_type = any (array[
    'call'::text, 'email'::text, 'text'::text, 'meeting'::text,
    'proposal'::text, 'build'::text, 'other'::text
  ]));

alter table public.lead_tasks drop constraint if exists lead_tasks_assigned_to_length_check;
alter table public.lead_tasks add constraint lead_tasks_assigned_to_length_check
  check (assigned_to is null or char_length(assigned_to) <= 200);

alter table public.lead_activity drop constraint if exists lead_activity_kind_check;
alter table public.lead_activity add constraint lead_activity_kind_check check (
  kind = any (array[
    'stage_change'::text, 'owner_change'::text, 'note'::text,
    'task'::text, 'system'::text, 'message'::text, 'delete'::text,
    'sales'::text, 'call'::text, 'email'::text, 'invoice'::text,
    'delivery'::text
  ])
);

comment on column public.leads.priority is 'Sales attention level used to order the qualified pipeline.';
comment on column public.leads.next_follow_up_at is 'Next promised sales follow-up time.';
comment on column public.leads.last_contacted_at is 'Most recent manually logged contact time.';
comment on column public.leads.expected_value_cents is 'Working estimate of potential deal value in cents.';
comment on column public.leads.close_probability is 'Sales working estimate from 0 to 100.';

create index if not exists leads_sales_follow_up_idx
  on public.leads (next_follow_up_at, priority, status)
  where deleted_at is null;

create index if not exists lead_tasks_sales_queue_idx
  on public.lead_tasks (completed_at, due_date, priority);

-- Sales users may update operating CRM fields but not private intake,
-- attribution, consent, or deletion fields.
create or replace function public.protect_sales_lead_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.can_access_sales_pipeline() and not public.is_admin() then
    if (to_jsonb(new) - array[
          'status', 'owner', 'priority', 'next_follow_up_at',
          'last_contacted_at', 'expected_value_cents',
          'close_probability', 'lost_reason'
        ]) is distinct from
       (to_jsonb(old) - array[
          'status', 'owner', 'priority', 'next_follow_up_at',
          'last_contacted_at', 'expected_value_cents',
          'close_probability', 'lost_reason'
        ]) then
      raise exception 'Sales users may only update operating CRM fields';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- 2. Project delivery, proof, and client review fields.
-- ============================================================

alter table public.projects
  add column if not exists manager_name text,
  add column if not exists client_portal_invited_at timestamptz;

alter table public.projects drop constraint if exists projects_manager_name_length_check;
alter table public.projects add constraint projects_manager_name_length_check
  check (manager_name is null or char_length(manager_name) <= 200);

alter table public.deliverables
  add column if not exists description text,
  add column if not exists status text not null default 'planned',
  add column if not exists due_date date,
  add column if not exists delivered_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists visible_to_client boolean not null default false,
  add column if not exists result_summary text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists requires_approval boolean not null default true,
  add column if not exists client_decision text not null default 'pending',
  add column if not exists client_feedback text,
  add column if not exists client_reviewed_at timestamptz,
  add column if not exists created_by_name text;

alter table public.deliverables drop constraint if exists deliverables_kind_check;
alter table public.deliverables add constraint deliverables_kind_check check (
  kind = any (array[
    'site'::text, 'repo'::text, 'doc'::text, 'design'::text,
    'video'::text, 'credential'::text, 'website'::text,
    'proposal'::text, 'email_flow'::text, 'automation'::text,
    'crm'::text, 'system'::text, 'creative'::text, 'document'::text,
    'other'::text
  ])
);

alter table public.deliverables drop constraint if exists deliverables_status_check;
alter table public.deliverables add constraint deliverables_status_check check (
  status = any (array[
    'planned'::text, 'in_progress'::text, 'ready_for_review'::text,
    'revision_requested'::text, 'approved'::text, 'delivered'::text
  ])
);

alter table public.deliverables drop constraint if exists deliverables_client_decision_check;
alter table public.deliverables add constraint deliverables_client_decision_check check (
  client_decision = any (array[
    'pending'::text, 'approved'::text, 'revision_requested'::text
  ])
);

alter table public.deliverables drop constraint if exists deliverables_description_length_check;
alter table public.deliverables add constraint deliverables_description_length_check
  check (description is null or char_length(description) <= 4000);

alter table public.deliverables drop constraint if exists deliverables_result_summary_length_check;
alter table public.deliverables add constraint deliverables_result_summary_length_check
  check (result_summary is null or char_length(result_summary) <= 4000);

alter table public.deliverables drop constraint if exists deliverables_feedback_length_check;
alter table public.deliverables add constraint deliverables_feedback_length_check
  check (client_feedback is null or char_length(client_feedback) <= 4000);

create index if not exists deliverables_project_status_idx
  on public.deliverables (project_id, status, sort_order, created_at desc);

-- Keep updated_at trustworthy without requiring the browser to provide it.
create or replace function public.touch_deliverable_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists deliverables_touch_updated_at on public.deliverables;
create trigger deliverables_touch_updated_at
before update on public.deliverables
for each row execute function public.touch_deliverable_updated_at();

-- A client may approve or request changes, but cannot alter the work record,
-- visibility, links, delivery status, or result claims.
create or replace function public.protect_client_deliverable_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.can_access_sales_pipeline() then
    if (to_jsonb(new) - array['client_decision', 'client_feedback', 'client_reviewed_at'])
       is distinct from
       (to_jsonb(old) - array['client_decision', 'client_feedback', 'client_reviewed_at']) then
      raise exception 'Clients may only submit a review decision and feedback';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists deliverables_protect_client_fields on public.deliverables;
create trigger deliverables_protect_client_fields
before update on public.deliverables
for each row execute function public.protect_client_deliverable_fields();

-- ============================================================
-- 3. Role policies for the Sales Desk and client Build Room.
-- ============================================================

drop policy if exists "sales projects manage" on public.projects;
create policy "sales projects manage" on public.projects
  for all to authenticated
  using (public.can_access_sales_pipeline())
  with check (public.can_access_sales_pipeline());

drop policy if exists "sales milestones manage" on public.milestones;
create policy "sales milestones manage" on public.milestones
  for all to authenticated
  using (public.can_access_sales_pipeline())
  with check (public.can_access_sales_pipeline());

drop policy if exists "sales deliverables manage" on public.deliverables;
create policy "sales deliverables manage" on public.deliverables
  for all to authenticated
  using (public.can_access_sales_pipeline())
  with check (public.can_access_sales_pipeline());

drop policy if exists "client deliverable read" on public.deliverables;
create policy "client deliverable read" on public.deliverables
  for select to authenticated
  using (
    visible_to_client
    and exists (
      select 1 from public.projects p
      where p.id = deliverables.project_id and p.client_id = auth.uid()
    )
  );

drop policy if exists "client deliverable review" on public.deliverables;
create policy "client deliverable review" on public.deliverables
  for update to authenticated
  using (
    visible_to_client
    and exists (
      select 1 from public.projects p
      where p.id = deliverables.project_id and p.client_id = auth.uid()
    )
  )
  with check (
    visible_to_client
    and exists (
      select 1 from public.projects p
      where p.id = deliverables.project_id and p.client_id = auth.uid()
    )
  );

drop policy if exists "sales client messages read" on public.messages;
create policy "sales client messages read" on public.messages
  for select to authenticated
  using (public.can_access_sales_pipeline());

drop policy if exists "sales client messages add" on public.messages;
create policy "sales client messages add" on public.messages
  for insert to authenticated
  with check (public.can_access_sales_pipeline() and sender = 'admin');

-- Explicit Data API privileges. RLS still decides which rows each account can
-- see or change.
grant select, insert, update on table public.projects to authenticated;
grant select, insert, update on table public.milestones to authenticated;
grant select, insert, update on table public.deliverables to authenticated;
grant select, insert on table public.messages to authenticated;
grant select, update on table public.leads to authenticated;
grant select, insert, update on table public.lead_tasks to authenticated;
grant select, insert on table public.lead_notes to authenticated;
grant select, insert on table public.lead_activity to authenticated;

-- ============================================================
-- 4. Link a project to a client account after passwordless signup.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.attach_project_client_from_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.client_id is null and new.lead_id is not null then
    select p.id into new.client_id
    from public.leads l
    join public.profiles p on lower(p.email) = lower(l.email)
    where l.id = new.lead_id
    limit 1;
  end if;
  return new;
end;
$$;

create or replace function private.attach_existing_projects_to_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects p
  set client_id = new.id
  from public.leads l
  where p.lead_id = l.id
    and p.client_id is null
    and lower(l.email) = lower(new.email);
  return new;
end;
$$;

revoke all on function private.attach_project_client_from_lead() from public, anon, authenticated;
revoke all on function private.attach_existing_projects_to_profile() from public, anon, authenticated;

drop trigger if exists projects_attach_client_from_lead on public.projects;
create trigger projects_attach_client_from_lead
before insert or update of lead_id on public.projects
for each row execute function private.attach_project_client_from_lead();

drop trigger if exists profiles_attach_existing_projects on public.profiles;
create trigger profiles_attach_existing_projects
after insert or update of email on public.profiles
for each row execute function private.attach_existing_projects_to_profile();

-- ============================================================
-- 5. Put the working previews already completed for qualified leads into the
--    Delivery Center. Every insert is idempotent and keyed by lead + title.
-- ============================================================

update public.leads
set priority = 'hot', owner = coalesce(owner, 'Patrick Grabbs')
where lower(email) in (
  'jaymielbates@gmail.com',
  'scottofferle@gmail.com',
  'toddevanscalendar@gmail.com',
  'vicentejuarez88@yahoo.com'
);

insert into public.projects (
  lead_id, name, description, status, manager_name, start_date
)
select
  l.id,
  case lower(l.email)
    when 'scottofferle@gmail.com' then 'Ol Guy Farms Growth System'
    when 'toddevanscalendar@gmail.com' then 'Texas Twisted Realty Growth System'
    when 'jaymielbates@gmail.com' then 'Sista Lift Growth Plan'
    when 'vicentejuarez88@yahoo.com' then 'Jose Vicente Tree & Lawn Growth System'
  end,
  'Client-facing workspace for the sales handoff, working previews, approvals, and completed delivery.',
  case when lower(l.email) in ('scottofferle@gmail.com', 'jaymielbates@gmail.com') then 'launch' else 'build' end,
  'Patrick Grabbs',
  current_date
from public.leads l
where lower(l.email) in (
  'jaymielbates@gmail.com',
  'scottofferle@gmail.com',
  'toddevanscalendar@gmail.com',
  'vicentejuarez88@yahoo.com'
)
and not exists (
  select 1 from public.projects p where p.lead_id = l.id
);

insert into public.milestones (project_id, title, description, status, sort_order)
select p.id, seed.title, seed.description, seed.status, seed.sort_order
from public.projects p
join public.leads l on l.id = p.lead_id
cross join (values
  ('Discovery and scope', 'Confirm goals, offer, audience, and the first measurable result.', 'done', 10),
  ('Working preview', 'Create the first tangible version the client can open and react to.', 'done', 20),
  ('Client review', 'Collect approval or a precise change request in the Build Room.', 'in_progress', 30),
  ('Final delivery', 'Complete revisions, confirm ownership, and publish the final system.', 'pending', 40)
) as seed(title, description, status, sort_order)
where lower(l.email) in (
  'jaymielbates@gmail.com',
  'scottofferle@gmail.com',
  'toddevanscalendar@gmail.com',
  'vicentejuarez88@yahoo.com'
)
and not exists (
  select 1 from public.milestones m
  where m.project_id = p.id and m.title = seed.title
);

insert into public.deliverables (
  project_id, title, kind, url, notes, description, status,
  visible_to_client, result_summary, sort_order, requires_approval,
  created_by_name
)
select p.id, seed.title, seed.kind, seed.url, seed.notes, seed.description,
       'ready_for_review', true, seed.result_summary, seed.sort_order, true,
       'LeadFlow Pro Team'
from public.projects p
join public.leads l on l.id = p.lead_id
join (values
  ('scottofferle@gmail.com', 'Ol Guy Farms Website Preview', 'website', 'https://ol-guy-farms.therealryannichols.chatgpt.site', 'Open the working website preview.', 'A complete visual preview built around the farm brand and offer.', 'A tangible website is ready to review instead of waiting on a written concept.', 10),
  ('scottofferle@gmail.com', 'Ol Guy Farms Proposal', 'proposal', 'https://ol-guy-farms.therealryannichols.chatgpt.site/proposal/scott-offerle', 'Open the proposed scope and next step.', 'The proposed implementation and growth plan.', 'Scope and next steps are organized in one place for a faster decision.', 20),
  ('toddevanscalendar@gmail.com', 'Texas Twisted Realty Website Preview', 'website', 'https://texas-twisted-realty.therealryannichols.chatgpt.site', 'Open the working website preview.', 'A client-facing real estate website and growth-system preview.', 'The brand and customer journey can be reviewed before final build decisions.', 10),
  ('toddevanscalendar@gmail.com', 'Texas Twisted Realty Dashboard Concept', 'crm', 'https://texas-twisted-realty.therealryannichols.chatgpt.site/dashboard-concept', 'Open the operating dashboard concept.', 'A preview of the internal lead and client operating system.', 'The business can see how leads, follow-up, and work could live in one operating view.', 20),
  ('toddevanscalendar@gmail.com', 'Texas Twisted Realty Proposal', 'proposal', 'https://texas-twisted-realty.therealryannichols.chatgpt.site/proposal', 'Open the proposed scope and next step.', 'The proposed implementation plan.', 'The recommended path is documented and ready for review.', 30),
  ('jaymielbates@gmail.com', 'Sista Lift Growth Plan', 'proposal', 'https://sistalift-growth-plan.therealryannichols.chatgpt.site/', 'Open the working growth plan.', 'A focused growth plan based on the current Sista Lift business.', 'The recommended priorities and implementation path are visible and ready for feedback.', 10),
  ('vicentejuarez88@yahoo.com', 'Jose Vicente Tree & Lawn Website Preview', 'website', 'https://jose-vicente-tree-lawn.vercel.app', 'Open the working website preview.', 'A working local-service website preview for the tree and lawn business.', 'A client-ready website direction is available now for review.', 10),
  ('vicentejuarez88@yahoo.com', 'Jose Vicente Tree & Lawn Proposal', 'proposal', 'https://jose-vicente-tree-lawn.vercel.app/proposal', 'Open the proposed scope and next step.', 'The proposed implementation and delivery plan.', 'The next step is documented alongside the working preview.', 20)
) as seed(email, title, kind, url, notes, description, result_summary, sort_order)
  on lower(l.email) = seed.email
where not exists (
  select 1 from public.deliverables d
  where d.project_id = p.id and d.title = seed.title
);
