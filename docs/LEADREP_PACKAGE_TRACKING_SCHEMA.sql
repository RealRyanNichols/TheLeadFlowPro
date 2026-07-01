-- LeadRep package tracking schema proposal.
-- Review before applying. Keep public access denied by default.

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
  approval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leadrep_package_requests enable row level security;
revoke all on public.leadrep_package_requests from anon, authenticated;
grant select, insert, update, delete on public.leadrep_package_requests to service_role;

create index if not exists leadrep_package_requests_type_status_idx
  on public.leadrep_package_requests (package_type, status, created_at desc);

create index if not exists leadrep_package_requests_buyer_idx
  on public.leadrep_package_requests (buyer_type, industry, urgency);
