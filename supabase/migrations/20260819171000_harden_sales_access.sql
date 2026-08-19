-- Helper functions are used inside authenticated RLS policies, not as public RPCs.
revoke execute on function public.can_access_sales_pipeline() from anon;
revoke execute on function public.is_admin() from anon;

-- Service-role API routes perform invoice writes. Admin and sales users only
-- need the shared read policy in the browser.
drop policy if exists "sales invoices admin all" on public.sales_invoices;
