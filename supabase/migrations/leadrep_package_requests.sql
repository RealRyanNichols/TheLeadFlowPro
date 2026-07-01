create extension if not exists pgcrypto;

create or replace function public.set_leadrep_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.leadrep_package_requests (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  branch text not null default 'main',
  package_type text not null,
  industry text,
  buyer_type text,
  source_url text,
  urgency text,
  budget_range text,
  confidence_score integer check (confidence_score between 0 and 100),
  requested_report boolean not null default false,
  recurring_interest boolean not null default false,
  source_agent text not null default 'site_package_form',
  target_agent text not null default 'SignalScout',
  status text not null default 'new',
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  cost_estimate numeric(10, 4) not null default 0,
  approval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leadrep_package_requests_type_status_idx
  on public.leadrep_package_requests (package_type, status, created_at desc);

create index if not exists leadrep_package_requests_buyer_idx
  on public.leadrep_package_requests (buyer_type, industry, urgency);

drop trigger if exists set_leadrep_package_requests_updated_at on public.leadrep_package_requests;
create trigger set_leadrep_package_requests_updated_at
before update on public.leadrep_package_requests
for each row execute function public.set_leadrep_updated_at();

alter table public.leadrep_package_requests enable row level security;
revoke all on public.leadrep_package_requests from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.leadrep_package_requests to service_role;
