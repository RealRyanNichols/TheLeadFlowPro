-- Keep public workshop reads and admin draft access in one permissive SELECT
-- policy per role. This removes duplicate policy evaluation for authenticated
-- requests without exposing unpublished events to non-admin users.

drop policy if exists workshop_events_public_read on public.workshop_events;
drop policy if exists workshop_events_admin_all on public.workshop_events;

create policy workshop_events_anon_read on public.workshop_events
  for select to anon
  using (is_published and starts_at is not null and starts_at > now());

create policy workshop_events_authenticated_read on public.workshop_events
  for select to authenticated
  using (
    public.is_admin()
    or (is_published and starts_at is not null and starts_at > now())
  );

create policy workshop_events_admin_insert on public.workshop_events
  for insert to authenticated
  with check (public.is_admin());

create policy workshop_events_admin_update on public.workshop_events
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy workshop_events_admin_delete on public.workshop_events
  for delete to authenticated
  using (public.is_admin());
