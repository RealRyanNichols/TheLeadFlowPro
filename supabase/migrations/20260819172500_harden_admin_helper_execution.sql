-- public.is_admin() is used inside RLS policies. Remove the default PUBLIC
-- function privilege so anonymous callers cannot invoke it as an API RPC.
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
