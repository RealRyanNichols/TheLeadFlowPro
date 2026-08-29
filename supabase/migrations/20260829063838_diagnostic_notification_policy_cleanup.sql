-- Keep staff visibility in one permissive SELECT policy so Postgres only
-- evaluates one policy expression for authenticated diagnostic notification reads.

drop policy if exists "diagnostic notifications admin read"
  on public.diagnostic_notifications;
drop policy if exists "diagnostic notifications sales read"
  on public.diagnostic_notifications;

drop policy if exists "diagnostic notifications staff read"
  on public.diagnostic_notifications;
create policy "diagnostic notifications staff read"
  on public.diagnostic_notifications
  for select to authenticated
  using (
    (select public.is_admin())
    or (select public.can_access_sales_pipeline())
  );
