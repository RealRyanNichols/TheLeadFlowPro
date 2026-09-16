-- A plan the owner has set to end at the close of the current period is
-- still live until then. Stripe reports it as cancel_at_period_end with a
-- cancel_at timestamp. HQ needs that date so Billing can say "ends
-- September 26, will not renew" instead of reading like a plan that will
-- renew, and so the trial reminders stop asking for a card that is not
-- going to be charged.

alter table public.hq_workspaces add column if not exists cancel_at timestamptz;

grant select (cancel_at) on public.hq_workspaces to authenticated;
