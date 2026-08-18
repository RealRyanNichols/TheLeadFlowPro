-- Keep the checked schema aligned with the client Build Room query.
-- These columns already exist in production but were created before the
-- corresponding migration was checked into this repository.

alter table public.projects
  add column if not exists target_launch date,
  add column if not exists repo_url text;
