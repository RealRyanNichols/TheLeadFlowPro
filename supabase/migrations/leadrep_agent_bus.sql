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

create table if not exists public.agent_handoffs (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  branch text not null default 'main',
  source_agent text not null,
  target_agent text not null,
  status text not null default 'queued',
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  cost_estimate numeric(10, 4) not null default 0,
  approval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  branch text not null default 'main',
  source_agent text not null,
  target_agent text not null,
  status text not null default 'queued',
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  cost_estimate numeric(10, 4) not null default 0,
  approval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_results (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  branch text not null default 'main',
  source_agent text not null,
  target_agent text not null,
  status text not null default 'queued',
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  cost_estimate numeric(10, 4) not null default 0,
  approval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approval_queue (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  branch text not null default 'main',
  source_agent text not null,
  target_agent text not null,
  status text not null default 'needs_approval',
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  cost_estimate numeric(10, 4) not null default 0,
  approval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.predictive_signals (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  branch text not null default 'main',
  source_agent text not null,
  target_agent text not null,
  status text not null default 'candidate',
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  cost_estimate numeric(10, 4) not null default 0,
  approval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.package_ideas (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  branch text not null default 'main',
  source_agent text not null,
  target_agent text not null,
  status text not null default 'candidate',
  payload_json jsonb not null default '{}'::jsonb,
  result_json jsonb not null default '{}'::jsonb,
  cost_estimate numeric(10, 4) not null default 0,
  approval_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_handoffs_repo_branch_status_idx on public.agent_handoffs (repo, branch, status, created_at desc);
create index if not exists agent_runs_repo_branch_status_idx on public.agent_runs (repo, branch, status, created_at desc);
create index if not exists agent_results_repo_branch_status_idx on public.agent_results (repo, branch, status, created_at desc);
create index if not exists approval_queue_repo_branch_status_idx on public.approval_queue (repo, branch, status, created_at desc);
create index if not exists predictive_signals_repo_branch_status_idx on public.predictive_signals (repo, branch, status, created_at desc);
create index if not exists package_ideas_repo_branch_status_idx on public.package_ideas (repo, branch, status, created_at desc);

drop trigger if exists set_agent_handoffs_updated_at on public.agent_handoffs;
create trigger set_agent_handoffs_updated_at
before update on public.agent_handoffs
for each row execute function public.set_leadrep_updated_at();

drop trigger if exists set_agent_runs_updated_at on public.agent_runs;
create trigger set_agent_runs_updated_at
before update on public.agent_runs
for each row execute function public.set_leadrep_updated_at();

drop trigger if exists set_agent_results_updated_at on public.agent_results;
create trigger set_agent_results_updated_at
before update on public.agent_results
for each row execute function public.set_leadrep_updated_at();

drop trigger if exists set_approval_queue_updated_at on public.approval_queue;
create trigger set_approval_queue_updated_at
before update on public.approval_queue
for each row execute function public.set_leadrep_updated_at();

drop trigger if exists set_predictive_signals_updated_at on public.predictive_signals;
create trigger set_predictive_signals_updated_at
before update on public.predictive_signals
for each row execute function public.set_leadrep_updated_at();

drop trigger if exists set_package_ideas_updated_at on public.package_ideas;
create trigger set_package_ideas_updated_at
before update on public.package_ideas
for each row execute function public.set_leadrep_updated_at();

alter table public.agent_handoffs enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_results enable row level security;
alter table public.approval_queue enable row level security;
alter table public.predictive_signals enable row level security;
alter table public.package_ideas enable row level security;

revoke all on public.agent_handoffs from anon, authenticated;
revoke all on public.agent_runs from anon, authenticated;
revoke all on public.agent_results from anon, authenticated;
revoke all on public.approval_queue from anon, authenticated;
revoke all on public.predictive_signals from anon, authenticated;
revoke all on public.package_ideas from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.agent_handoffs to service_role;
grant select, insert, update, delete on public.agent_runs to service_role;
grant select, insert, update, delete on public.agent_results to service_role;
grant select, insert, update, delete on public.approval_queue to service_role;
grant select, insert, update, delete on public.predictive_signals to service_role;
grant select, insert, update, delete on public.package_ideas to service_role;
