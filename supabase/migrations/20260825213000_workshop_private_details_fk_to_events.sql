-- private.workshop_event_details is the private-address store for the live
-- funnel, which runs on public.events. Re-point its FK from the parallel
-- workshop_events table (same id for the founding event, so no data moves)
-- so future events created in /admin/events can hold a private address too.
alter table private.workshop_event_details
  drop constraint workshop_event_details_event_id_fkey;
alter table private.workshop_event_details
  add constraint workshop_event_details_event_id_fkey
  foreign key (event_id) references public.events(id) on delete cascade;
