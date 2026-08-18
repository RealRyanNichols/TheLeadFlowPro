-- Follow-up hardening from the Supabase security and performance advisors.

-- Direct API access to the shared approval queue remains closed. The app uses
-- the trusted service role after it independently verifies an admin session.
drop policy if exists approval_queue_no_direct_access on public.approval_queue;
create policy approval_queue_no_direct_access on public.approval_queue
  for all to authenticated
  using (false)
  with check (false);

create index if not exists social_posts_approval_queue_id_idx
  on public.social_posts (approval_queue_id);
create index if not exists social_posts_approved_by_idx
  on public.social_posts (approved_by);
create index if not exists social_posts_created_by_idx
  on public.social_posts (created_by);
create index if not exists social_publish_attempts_created_by_idx
  on public.social_publish_attempts (created_by);
create index if not exists social_schedule_settings_updated_by_idx
  on public.social_schedule_settings (updated_by);

-- ROLLBACK:
-- drop policy if exists approval_queue_no_direct_access on public.approval_queue;
-- drop index if exists public.social_posts_approval_queue_id_idx;
-- drop index if exists public.social_posts_approved_by_idx;
-- drop index if exists public.social_posts_created_by_idx;
-- drop index if exists public.social_publish_attempts_created_by_idx;
-- drop index if exists public.social_schedule_settings_updated_by_idx;
