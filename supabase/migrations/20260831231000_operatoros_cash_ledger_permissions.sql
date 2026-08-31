-- Remove default API grants and add back only the operations this feature requires.
revoke all on table public.operator_manual_cash_events from anon, authenticated, service_role;
grant select,insert,update,delete on table public.operator_manual_cash_events to authenticated, service_role;

revoke all on table public.operator_verified_cash_entries from anon, authenticated, service_role;
grant select on table public.operator_verified_cash_entries to authenticated, service_role;
