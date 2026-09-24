-- Speed to lead: every new row in public.leads, from any door, gets three
-- delivery jobs the moment it commits.
--
--   staff_sms    a text to Ryan and Pat (SPEED_TO_LEAD_STAFF_PHONES)
--   staff_email  the NEW LEAD email to hello@ and pat@
--   lead_sms     the one automatic first text to the lead
--
-- The database cannot call out (pg_net and pg_cron are not installed), so
-- the application delivers: the intake routes dispatch a lead's jobs right
-- after the insert, and /api/cron/speed-to-lead sweeps anything due every
-- minute (lib/speedToLeadAlertsServer.ts). Nothing sends until
-- SPEED_TO_LEAD_ENABLED is exactly "true"; until then the jobs wait.
--
-- The trigger can never block a lead from being saved: its whole body sits in
-- an exception block that only raises a WARNING, and it always returns NEW.
-- Existing leads are not backfilled.

begin;

create table if not exists public.speed_to_lead_jobs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel text not null check (channel in ('staff_sms', 'staff_email', 'lead_sms')),
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 50),
  next_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  provider_message_ids text[] not null default '{}',
  skip_reason text check (skip_reason is null or char_length(skip_reason) <= 300),
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, channel),
  constraint speed_to_lead_jobs_sent_check check (status <> 'sent' or sent_at is not null),
  constraint speed_to_lead_jobs_skipped_check check (status <> 'skipped' or skip_reason is not null)
);

comment on table public.speed_to_lead_jobs is
  'Speed-to-lead outbox: one staff text, one staff email and one first text to the lead per new lead. Written by the leads insert trigger and the service role only.';
comment on column public.speed_to_lead_jobs.status is
  'pending -> sending (atomic claim) -> sent | failed | skipped. A sending row older than five minutes is reclaimed by the sweep.';
comment on column public.speed_to_lead_jobs.skip_reason is
  'Why nothing was sent: test record, no sms consent, replied STOP, sms kill switch on, stale, staff number, owner alert outbox, and so on.';

create index if not exists speed_to_lead_jobs_due_idx
  on public.speed_to_lead_jobs (status, next_attempt_at);

alter table public.speed_to_lead_jobs enable row level security;

revoke all on table public.speed_to_lead_jobs from public, anon, authenticated;
grant select on table public.speed_to_lead_jobs to authenticated;
grant select, insert, update, delete, references
  on table public.speed_to_lead_jobs to service_role;

drop policy if exists "speed to lead jobs staff read" on public.speed_to_lead_jobs;
create policy "speed to lead jobs staff read"
  on public.speed_to_lead_jobs
  for select to authenticated
  using (
    (select public.is_admin())
    or (select public.can_access_sales_pipeline())
  );

create or replace function public.enqueue_speed_to_lead_jobs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_skip text;
  v_role text := '';
  v_owner_alert boolean := false;
  v_own_door_alert boolean := false;
  v_diagnostic_draft boolean := false;
begin
  begin
    if coalesce(new.is_test, false) then
      v_skip := 'test record';
    elsif new.deleted_at is not null then
      v_skip := 'lead deleted';
    end if;

    if v_skip is not null then
      -- Recorded, never sent. This is also how a synthetic is_test row proves
      -- the trigger without contacting anyone.
      insert into public.speed_to_lead_jobs (lead_id, channel, status, skip_reason)
      values
        (new.id, 'staff_sms', 'skipped', v_skip),
        (new.id, 'staff_email', 'skipped', v_skip),
        (new.id, 'lead_sms', 'skipped', v_skip)
      on conflict (lead_id, channel) do nothing;
    else
      -- The same condition public.enqueue_lead_email_notifications() uses to
      -- queue the existing owner alert. When that email is coming, this one
      -- is recorded as skipped so Ryan and Pat get one NEW LEAD email, not two.
      begin
        v_role := coalesce(
          nullif(current_setting('request.jwt.claim.role', true), ''),
          (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
          ''
        );
      exception when others then
        v_role := '';
      end;
      v_owner_alert := v_role = 'service_role'
        and coalesce(new.diagnostic ->> 'notification_pipeline', '') = 'lead_intake_v1';
      -- Doors that already email hello@ and pat@ themselves: Stripe paid
      -- orders, the follow-up and Time Back intakes, the business diagnostic.
      -- They still get the staff text; only the second email is skipped.
      v_diagnostic_draft := coalesce(new.external_id, '') like 'business-diagnostic:%';
      v_own_door_alert := coalesce(new.source, '') in ('stripe_checkout', 'stripe_payment_link', 'lead_follow_up_funnel')
        or coalesce(new.diagnostic ->> 'source', '') = 'time_back_funnel'
        or v_diagnostic_draft;

      insert into public.speed_to_lead_jobs (lead_id, channel)
      values (new.id, 'staff_sms')
      on conflict (lead_id, channel) do nothing;

      if v_owner_alert then
        insert into public.speed_to_lead_jobs (lead_id, channel, status, skip_reason)
        values (new.id, 'staff_email', 'skipped', 'owner alert outbox')
        on conflict (lead_id, channel) do nothing;
      elsif v_own_door_alert then
        insert into public.speed_to_lead_jobs (lead_id, channel, status, skip_reason)
        values (new.id, 'staff_email', 'skipped', 'door sends its own alert')
        on conflict (lead_id, channel) do nothing;
      else
        insert into public.speed_to_lead_jobs (lead_id, channel)
        values (new.id, 'staff_email')
        on conflict (lead_id, channel) do nothing;
      end if;

      -- The business diagnostic creates its lead on the first draft save,
      -- while the person is still answering questions. No text mid-form.
      if v_diagnostic_draft then
        insert into public.speed_to_lead_jobs (lead_id, channel, status, skip_reason)
        values (new.id, 'lead_sms', 'skipped', 'diagnostic draft')
        on conflict (lead_id, channel) do nothing;
      else
        insert into public.speed_to_lead_jobs (lead_id, channel)
        values (new.id, 'lead_sms')
        on conflict (lead_id, channel) do nothing;
      end if;
    end if;
  exception when others then
    -- Never block the lead. The sweep cannot see a lead with no jobs, so the
    -- warning in the Postgres log is the record; the call sheet still shows it.
    raise warning 'enqueue_speed_to_lead_jobs failed for lead %: % (SQLSTATE %)',
      new.id, sqlerrm, sqlstate;
  end;
  return new;
end;
$$;

comment on function public.enqueue_speed_to_lead_jobs() is
  'Queues the three speed-to-lead jobs for every new lead. Wrapped in an exception block: it can never stop a lead from being saved.';

revoke all on function public.enqueue_speed_to_lead_jobs() from public, anon, authenticated;
grant execute on function public.enqueue_speed_to_lead_jobs() to service_role;

drop trigger if exists speed_to_lead_enqueue_after_insert on public.leads;
create trigger speed_to_lead_enqueue_after_insert
  after insert on public.leads
  for each row execute function public.enqueue_speed_to_lead_jobs();

commit;

-- ROLLBACK (run by hand; nothing else depends on these objects):
--
--   begin;
--   drop trigger if exists speed_to_lead_enqueue_after_insert on public.leads;
--   drop function if exists public.enqueue_speed_to_lead_jobs();
--   drop table if exists public.speed_to_lead_jobs;
--   commit;
--
-- Setting SPEED_TO_LEAD_ENABLED to anything other than "true" in Vercel stops
-- every send without touching the database.
