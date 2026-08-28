-- Admins are included by can_access_sales_pipeline(), so one staff policy is
-- sufficient. Keeping a single permissive SELECT policy avoids evaluating two
-- equivalent access paths for every questionnaire read.

drop policy if exists "business growth diagnostics admin read"
  on public.business_growth_diagnostics;
drop policy if exists "business growth diagnostics sales read"
  on public.business_growth_diagnostics;

create policy "business growth diagnostics staff read"
  on public.business_growth_diagnostics
  for select to authenticated
  using ((select public.can_access_sales_pipeline()));
