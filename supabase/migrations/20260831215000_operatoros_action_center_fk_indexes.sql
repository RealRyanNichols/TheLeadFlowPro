create index if not exists operator_outreach_events_action_idx
  on public.operator_outreach_events(action_id)
  where action_id is not null;

create index if not exists operator_outreach_events_created_by_idx
  on public.operator_outreach_events(created_by)
  where created_by is not null;
