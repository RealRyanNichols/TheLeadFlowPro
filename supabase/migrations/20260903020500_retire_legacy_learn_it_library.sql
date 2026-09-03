-- Retire the legacy "Learn It" library from the public training catalog.
-- These seven courses shipped in July 2026 for the $497 Learn It tier. That tier is gone
-- (/pricing/learn-it redirects to /pricing), the purchases table holds no learn_it rows,
-- and their lessons were never published. They rendered on /training as locked
-- "Existing members" cards that nobody could buy. Unpublish only; rows and lessons stay
-- intact so this is reversible with is_published = true.
update public.courses
set is_published = false
where slug in (
  'start-here',
  'claude-and-chatgpt',
  'github-basics',
  'vercel-deploys',
  'supabase-data',
  'figma-design',
  'build-your-dashboard'
);
