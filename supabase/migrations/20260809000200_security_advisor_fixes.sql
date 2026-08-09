-- Supabase security advisor fixes (Aug 9, 2026).
-- No RLS policies are touched. The leadflow schema stays deny-all.
--
-- 1. analytics_summary(int): SECURITY DEFINER admin analytics helper. Only the
--    admin dashboard (authenticated) calls it. Remove anon/PUBLIC execute.
-- 2. handle_new_user(): auth.users trigger. No API role ever calls it directly.
--    Remove anon/authenticated/PUBLIC execute; the auth admin role keeps it.
-- 3. public.is_admin() is intentionally NOT revoked from anon: RLS policies on
--    leads/messages/page_views/profiles apply to role public and reference
--    is_admin(), so anon queries must be able to evaluate it. It is SECURITY
--    DEFINER with a pinned search_path and returns false for anonymous callers.
-- 4. Pin search_path on the three leadflow.* functions flagged by the advisor.

revoke execute on function public.analytics_summary(integer) from public, anon;
grant execute on function public.analytics_summary(integer) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

alter function leadflow.set_updated_at() set search_path = '';
alter function leadflow.current_buyer_account_ids() set search_path = '';
alter function leadflow.is_platform_admin() set search_path = '';

-- ============================================================
-- ROLLBACK (run manually to undo this migration):
--
-- grant execute on function public.analytics_summary(integer) to public;
-- grant execute on function public.handle_new_user() to public;
-- alter function leadflow.set_updated_at() reset search_path;
-- alter function leadflow.current_buyer_account_ids() reset search_path;
-- alter function leadflow.is_platform_admin() reset search_path;
-- ============================================================
