-- Website grader results for the /live comparison tool.
--
-- Stores only the graded domain and its public scores — never anything about
-- the visitor who ran the check. The "average" column on /live is computed
-- from these rows (latest grade per host, reference site excluded), so the
-- benchmark is real measured data, not an invented industry number.

create table if not exists public.site_grades (
  id bigint generated always as identity primary key,
  host text not null,
  url text not null,
  checked_at timestamptz not null default now(),
  is_reference boolean not null default false,
  scores jsonb not null,
  checks jsonb not null default '{}'::jsonb,
  source text not null default 'live_grader',
  constraint site_grades_host_len check (char_length(host) <= 253),
  constraint site_grades_url_len check (char_length(url) <= 500),
  constraint site_grades_scores_size check (pg_column_size(scores) <= 4096),
  constraint site_grades_checks_size check (pg_column_size(checks) <= 4096)
);

create index if not exists site_grades_host_time_idx
  on public.site_grades (host, checked_at desc);
create index if not exists site_grades_time_idx
  on public.site_grades (checked_at desc);

alter table public.site_grades enable row level security;

-- No anon policies at all: every read and write goes through the server-side
-- /api/grade route with the service role. The back office may read directly.
drop policy if exists site_grades_admin_read on public.site_grades;
create policy site_grades_admin_read on public.site_grades
  for select using (public.is_admin());

grant select on public.site_grades to authenticated;
grant select, insert, update, delete on public.site_grades to service_role;
