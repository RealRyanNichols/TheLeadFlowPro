-- Lead CRM: a real conversation thread per lead, and a safe way to remove the
-- test leads that are cluttering the pipeline.
--
-- Ryan, Aug 12 2026: "there needs to be one where I can delete some of these
-- because some of these are test ones" and "I also wanna be able to message
-- this person from here, and they get it ... kinda like you would see on a
-- phone where I could see their messages. They see mine."
--
-- ROLLBACK
--   drop table if exists public.lead_messages;
--   alter table public.leads drop column if exists deleted_at;
--   drop index if exists leads_not_deleted_idx;

-- ============================================================
-- 1. Soft delete on leads.
-- ============================================================
-- Soft, not hard: a lead carries consent records and attribution, and an
-- accidental hard delete of a real lead is unrecoverable. Deleted leads drop
-- out of every admin view immediately and can be restored from the database if
-- someone removes the wrong one.

alter table public.leads add column if not exists deleted_at timestamptz;

comment on column public.leads.deleted_at is
  'Soft delete. Set when an admin removes a lead from the pipeline. Non-null rows are hidden from admin views and excluded from exports and follow-up automation.';

create index if not exists leads_not_deleted_idx
  on public.leads (created_at desc)
  where deleted_at is null;

-- ============================================================
-- 2. Lead message thread.
-- ============================================================
-- One row per message in either direction. `direction` is the phone metaphor:
-- 'out' is Ryan to the lead, 'in' is the lead replying.
--
-- `channel` records how it actually travelled so the thread can show it, and
-- `delivered` records whether the send provider accepted it. A message that
-- failed to send is still stored, marked undelivered, so nothing silently
-- disappears from the conversation.

create table if not exists public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  direction text not null check (direction = any (array['out'::text, 'in'::text])),
  channel text not null default 'sms' check (
    channel = any (array['sms'::text, 'email'::text, 'note'::text])
  ),
  body text not null check (char_length(body) <= 3000),
  author text,
  delivered boolean not null default false,
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

comment on table public.lead_messages is
  'Two-way conversation with a lead. Outbound sends through Quo (SMS) or Resend (email); inbound arrives from the Quo webhook or is logged by an admin.';

create index if not exists lead_messages_lead_id_idx
  on public.lead_messages (lead_id, created_at);

alter table public.lead_messages enable row level security;

-- Admin-only, matching lead_notes / lead_tasks / lead_activity.
create policy "lead_messages_admin_all" on public.lead_messages
  for all to authenticated using (is_admin()) with check (is_admin());

-- ============================================================
-- 3. Widen the activity kinds so sends and deletes show on the timeline.
-- ============================================================
alter table public.lead_activity drop constraint if exists lead_activity_kind_check;
alter table public.lead_activity add constraint lead_activity_kind_check check (
  kind = any (array[
    'stage_change'::text, 'owner_change'::text, 'note'::text,
    'task'::text, 'system'::text, 'message'::text, 'delete'::text
  ])
);
