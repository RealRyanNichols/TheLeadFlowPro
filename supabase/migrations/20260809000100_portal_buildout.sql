-- Portal buildout: admin lead workspace + guided diagnostic handoff.
-- Additive only. Rollback statements are commented at the bottom.
--
-- 1. leads.owner       — which admin is working the lead.
-- 2. leads.diagnostic  — the guided Map My System payload (answers, labels,
--                        recommendation, next action) for the System Map viewer.
-- 3. Widen the leads.interest CHECK to match the values the RLS insert policy
--    already allows (the guided router submits launch_system / industry_os /
--    custom_platform).
-- 4. Recreate the anon insert policy: raise the desired_modules cap from 12 to
--    20 (the full catalog is 16 modules and "Show me everything" selects all of
--    them) and bound the diagnostic payload size.
-- 5. New admin-only tables: lead_notes, lead_tasks, lead_activity.

alter table public.leads add column if not exists owner text;
alter table public.leads add column if not exists diagnostic jsonb;

comment on column public.leads.owner is 'Admin working this lead (display name or email).';
comment on column public.leads.diagnostic is 'Guided Map My System diagnostic: answers, labels, recommendation, next action.';

alter table public.leads drop constraint if exists leads_interest_check;
alter table public.leads add constraint leads_interest_check check (
  interest = any (array[
    'learn'::text, 'build_with_you'::text, 'done_for_you'::text, 'unsure'::text,
    'blueprint'::text, 'launch_system'::text, 'industry_os'::text,
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
    and is_test = false
    and char_length(btrim(full_name)) >= 1 and char_length(btrim(full_name)) <= 200
    and char_length(email) >= 3 and char_length(email) <= 200
    and position('@' in email) > 1
    and (phone is null or char_length(phone) <= 50)
    and (business_name is null or char_length(business_name) <= 200)
    and (website_url is null or char_length(website_url) <= 300)
    and (industry is null or char_length(industry) <= 100)
    and cardinality(desired_modules) <= 20
    and interest = any (array[
      'learn'::text, 'build_with_you'::text, 'done_for_you'::text, 'unsure'::text,
      'blueprint'::text, 'launch_system'::text, 'industry_os'::text,
      'custom_platform'::text, 'operations'::text
    ])
    and (goals is null or char_length(goals) <= 2000)
    and (not sms_consent or phone is not null)
    and (diagnostic is null or pg_column_size(diagnostic) <= 20000)
  );

-- Multi-note thread on a lead.
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  body text not null check (char_length(body) <= 4000),
  author text,
  created_at timestamptz not null default now()
);

-- Follow-up tasks with completion.
create table if not exists public.lead_tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null check (char_length(title) <= 300),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Activity timeline (stage changes, owner changes, and manual entries).
create table if not exists public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  kind text not null default 'note' check (
    kind = any (array['stage_change'::text, 'owner_change'::text, 'note'::text, 'task'::text, 'system'::text])
  ),
  detail text not null check (char_length(detail) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_id_idx on public.lead_notes(lead_id, created_at desc);
create index if not exists lead_tasks_lead_id_idx on public.lead_tasks(lead_id, created_at desc);
create index if not exists lead_activity_lead_id_idx on public.lead_activity(lead_id, created_at desc);

alter table public.lead_notes enable row level security;
alter table public.lead_tasks enable row level security;
alter table public.lead_activity enable row level security;

-- Admin-only, via the existing public.is_admin() helper.
create policy "lead_notes_admin_all" on public.lead_notes
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "lead_tasks_admin_all" on public.lead_tasks
  for all to authenticated using (is_admin()) with check (is_admin());
create policy "lead_activity_admin_all" on public.lead_activity
  for all to authenticated using (is_admin()) with check (is_admin());

-- ============================================================
-- ROLLBACK (run manually to undo this migration):
--
-- drop table if exists public.lead_activity;
-- drop table if exists public.lead_tasks;
-- drop table if exists public.lead_notes;
--
-- drop policy if exists "public lead insert" on public.leads;
-- create policy "public lead insert" on public.leads
--   for insert to anon
--   with check (
--     status = 'new' and source = 'website' and notes is null and is_test = false
--     and char_length(btrim(full_name)) >= 1 and char_length(btrim(full_name)) <= 200
--     and char_length(email) >= 3 and char_length(email) <= 200
--     and position('@' in email) > 1
--     and (phone is null or char_length(phone) <= 50)
--     and (business_name is null or char_length(business_name) <= 200)
--     and (website_url is null or char_length(website_url) <= 300)
--     and (industry is null or char_length(industry) <= 100)
--     and cardinality(desired_modules) <= 12
--     and interest = any (array['learn','build_with_you','done_for_you','unsure',
--       'blueprint','launch_system','industry_os','custom_platform','operations'])
--     and (goals is null or char_length(goals) <= 2000)
--     and (not sms_consent or phone is not null)
--   );
--
-- alter table public.leads drop constraint if exists leads_interest_check;
-- alter table public.leads add constraint leads_interest_check check (
--   interest = any (array['learn','build_with_you','done_for_you','unsure'])
-- );
--
-- alter table public.leads drop column if exists diagnostic;
-- alter table public.leads drop column if exists owner;
-- ============================================================
