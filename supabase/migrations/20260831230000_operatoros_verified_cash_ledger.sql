-- OperatorOS verified cash ledger.
-- Keeps Stripe checkout, Stripe invoice, and human-verified offline receipts separate by source.
-- The ledger is admin-only. Public proof queries aggregate it through the service role.

alter table public.sales_invoices
  add column if not exists paid_at timestamptz;

update public.sales_invoices
set paid_at = coalesce(paid_at, updated_at, created_at)
where status = 'paid' and paid_at is null;

create or replace function public.operator_stamp_invoice_paid_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.status = 'paid' then
    if tg_op = 'INSERT' then
      new.paid_at := coalesce(new.paid_at, now());
    elsif old.status is distinct from 'paid' or new.paid_at is null then
      new.paid_at := coalesce(new.paid_at, now());
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.operator_stamp_invoice_paid_at() from public, anon, authenticated;

drop trigger if exists sales_invoices_stamp_paid_at on public.sales_invoices;
create trigger sales_invoices_stamp_paid_at
before insert or update of status on public.sales_invoices
for each row execute function public.operator_stamp_invoice_paid_at();

create table if not exists public.operator_manual_cash_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.operator_workspaces(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  amount_cents integer not null check (amount_cents > 0 and amount_cents <= 25000000),
  currency text not null default 'usd' check (currency = 'usd'),
  received_at timestamptz not null,
  source text not null check (source in ('check','ach','cash','wire','other')),
  payer_name text,
  memo text,
  external_reference text,
  status text not null default 'pending' check (status in ('pending','verified','void')),
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (payer_name is null or char_length(payer_name) <= 300),
  check (memo is null or char_length(memo) <= 3000),
  check (external_reference is null or char_length(external_reference) <= 300),
  check (void_reason is null or char_length(void_reason) <= 2000),
  check (
    (status = 'verified' and verified_at is not null)
    or status in ('pending','void')
  ),
  check (
    status <> 'void'
    or (voided_at is not null and void_reason is not null and char_length(btrim(void_reason)) >= 3)
  )
);

create unique index if not exists operator_manual_cash_reference_uidx
  on public.operator_manual_cash_events(workspace_id, source, lower(external_reference))
  where external_reference is not null and status <> 'void';
create index if not exists operator_manual_cash_workspace_received_idx
  on public.operator_manual_cash_events(workspace_id, received_at desc)
  where status = 'verified';
create index if not exists operator_manual_cash_lead_idx
  on public.operator_manual_cash_events(lead_id)
  where lead_id is not null;
create index if not exists operator_manual_cash_project_idx
  on public.operator_manual_cash_events(project_id)
  where project_id is not null;
create index if not exists operator_manual_cash_created_by_idx
  on public.operator_manual_cash_events(created_by)
  where created_by is not null;
create index if not exists operator_manual_cash_verified_by_idx
  on public.operator_manual_cash_events(verified_by)
  where verified_by is not null;
create index if not exists operator_manual_cash_voided_by_idx
  on public.operator_manual_cash_events(voided_by)
  where voided_by is not null;
create index if not exists sales_invoices_paid_at_idx
  on public.sales_invoices(paid_at desc)
  where status = 'paid';

alter table public.operator_manual_cash_events enable row level security;

drop policy if exists operator_manual_cash_admin_all on public.operator_manual_cash_events;
create policy operator_manual_cash_admin_all
  on public.operator_manual_cash_events for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.operator_manual_cash_events from anon;
grant select,insert,update,delete on public.operator_manual_cash_events to authenticated;

create or replace view public.operator_verified_cash_entries
with (security_invoker = true, security_barrier = true)
as
with allowed_workspace as (
  select id as workspace_id
  from public.operator_workspaces
  where slug = 'the-leadflow-pro'
    and ((select auth.role()) = 'service_role' or (select public.is_admin()))
)
select
  w.workspace_id,
  'checkout'::text as source_type,
  p.id as source_id,
  p.stripe_session_id as external_reference,
  p.email as payer_label,
  p.kind as description,
  p.amount_cents,
  p.created_at as received_at
from allowed_workspace w
join public.purchases p on true
where lower(coalesce(p.status,'')) in ('paid','complete','completed','succeeded')
  and coalesce(p.amount_cents,0) > 0
union all
select
  w.workspace_id,
  'invoice'::text as source_type,
  i.id as source_id,
  coalesce(i.stripe_invoice_id, i.invoice_number) as external_reference,
  coalesce(nullif(i.customer_name,''), nullif(i.customer_email,''), 'Stripe invoice') as payer_label,
  coalesce(nullif(i.memo,''), nullif(i.invoice_number,''), 'Paid invoice') as description,
  i.subtotal_cents as amount_cents,
  coalesce(i.paid_at, i.updated_at, i.created_at) as received_at
from allowed_workspace w
join public.sales_invoices i on true
where i.status = 'paid'
  and coalesce(i.subtotal_cents,0) > 0
union all
select
  m.workspace_id,
  'manual_' || m.source as source_type,
  m.id as source_id,
  m.external_reference,
  coalesce(nullif(m.payer_name,''), 'Offline payment') as payer_label,
  coalesce(nullif(m.memo,''), initcap(m.source) || ' payment') as description,
  m.amount_cents,
  m.received_at
from public.operator_manual_cash_events m
where m.status = 'verified'
  and ((select auth.role()) = 'service_role' or (select public.is_admin()));

revoke all on public.operator_verified_cash_entries from anon;
grant select on public.operator_verified_cash_entries to authenticated, service_role;

-- Global checkout/invoice rows currently belong to The LeadFlow Pro workspace.
-- The trigger is SECURITY DEFINER so webhook writes and human-verified entries
-- refresh the mission consistently without depending on the caller's table grants.
create or replace function public.operator_refresh_cash_mission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.operator_missions mission
  set
    current_value = (
      coalesce((
        select sum(p.amount_cents)::numeric
        from public.purchases p
        where lower(coalesce(p.status,'')) in ('paid','complete','completed','succeeded')
          and coalesce(p.amount_cents,0) > 0
          and p.created_at >= coalesce(mission.starts_at, '-infinity'::timestamptz)
          and p.created_at <= coalesce(mission.target_at, 'infinity'::timestamptz)
      ), 0)
      + coalesce((
        select sum(i.subtotal_cents)::numeric
        from public.sales_invoices i
        where i.status = 'paid'
          and coalesce(i.subtotal_cents,0) > 0
          and coalesce(i.paid_at, i.updated_at, i.created_at) >= coalesce(mission.starts_at, '-infinity'::timestamptz)
          and coalesce(i.paid_at, i.updated_at, i.created_at) <= coalesce(mission.target_at, 'infinity'::timestamptz)
      ), 0)
      + coalesce((
        select sum(c.amount_cents)::numeric
        from public.operator_manual_cash_events c
        where c.workspace_id = mission.workspace_id
          and c.status = 'verified'
          and c.received_at >= coalesce(mission.starts_at, '-infinity'::timestamptz)
          and c.received_at <= coalesce(mission.target_at, 'infinity'::timestamptz)
      ), 0)
    ) / 100,
    updated_at = now()
  where mission.status = 'active'
    and mission.target_metric = 'cash_collected_usd'
    and mission.workspace_id = (
      select w.id from public.operator_workspaces w where w.slug = 'the-leadflow-pro' limit 1
    );
  return null;
end;
$$;

revoke all on function public.operator_refresh_cash_mission() from public, anon, authenticated;

drop trigger if exists purchases_refresh_operator_cash on public.purchases;
create trigger purchases_refresh_operator_cash
after insert or update or delete on public.purchases
for each statement execute function public.operator_refresh_cash_mission();

drop trigger if exists sales_invoices_refresh_operator_cash on public.sales_invoices;
create trigger sales_invoices_refresh_operator_cash
after insert or update or delete on public.sales_invoices
for each statement execute function public.operator_refresh_cash_mission();

drop trigger if exists manual_cash_refresh_operator_cash on public.operator_manual_cash_events;
create trigger manual_cash_refresh_operator_cash
after insert or update or delete on public.operator_manual_cash_events
for each statement execute function public.operator_refresh_cash_mission();

-- Initialize the active LeadFlow cash mission after installing the ledger.
update public.operator_missions mission
set current_value = (
  coalesce((
    select sum(p.amount_cents)::numeric
    from public.purchases p
    where lower(coalesce(p.status,'')) in ('paid','complete','completed','succeeded')
      and coalesce(p.amount_cents,0) > 0
      and p.created_at >= coalesce(mission.starts_at, '-infinity'::timestamptz)
      and p.created_at <= coalesce(mission.target_at, 'infinity'::timestamptz)
  ), 0)
  + coalesce((
    select sum(i.subtotal_cents)::numeric
    from public.sales_invoices i
    where i.status = 'paid'
      and coalesce(i.subtotal_cents,0) > 0
      and coalesce(i.paid_at, i.updated_at, i.created_at) >= coalesce(mission.starts_at, '-infinity'::timestamptz)
      and coalesce(i.paid_at, i.updated_at, i.created_at) <= coalesce(mission.target_at, 'infinity'::timestamptz)
  ), 0)
  + coalesce((
    select sum(c.amount_cents)::numeric
    from public.operator_manual_cash_events c
    where c.workspace_id = mission.workspace_id
      and c.status = 'verified'
      and c.received_at >= coalesce(mission.starts_at, '-infinity'::timestamptz)
      and c.received_at <= coalesce(mission.target_at, 'infinity'::timestamptz)
  ), 0)
) / 100, updated_at = now()
where mission.status = 'active'
  and mission.target_metric = 'cash_collected_usd'
  and mission.workspace_id = (
    select w.id from public.operator_workspaces w where w.slug = 'the-leadflow-pro' limit 1
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='operator_manual_cash_events'
  ) then
    alter publication supabase_realtime add table public.operator_manual_cash_events;
  end if;
end $$;
