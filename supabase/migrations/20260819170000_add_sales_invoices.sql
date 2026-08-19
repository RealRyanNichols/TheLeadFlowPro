create table if not exists public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete restrict,
  stripe_customer_id text,
  stripe_invoice_id text not null unique,
  invoice_number text,
  status text not null default 'draft',
  currency text not null default 'usd' check (currency = 'usd'),
  subtotal_cents integer not null check (subtotal_cents > 0 and subtotal_cents <= 25000000),
  due_date date not null,
  memo text,
  line_items jsonb not null check (jsonb_typeof(line_items) = 'array'),
  customer_name text not null,
  customer_email text not null,
  hosted_invoice_url text,
  invoice_pdf text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_by_name text not null,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_invoices_lead_created_idx
  on public.sales_invoices (lead_id, created_at desc);
create index if not exists sales_invoices_status_created_idx
  on public.sales_invoices (status, created_at desc);

alter table public.sales_invoices enable row level security;

create policy "sales invoices admin all"
on public.sales_invoices for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "sales invoices pipeline read"
on public.sales_invoices for select to authenticated
using (public.can_access_sales_pipeline());

revoke all on public.sales_invoices from anon, authenticated;
grant select on public.sales_invoices to authenticated;
grant all on public.sales_invoices to service_role;
