-- Cover every OperatorOS foreign key used by joins, deletes, and approval reconciliation.

create index if not exists operator_workspaces_client_profile_idx
  on public.operator_workspaces(client_profile_id);
create index if not exists operator_workspace_members_profile_idx
  on public.operator_workspace_members(profile_id);
create index if not exists operator_skills_created_by_idx
  on public.operator_skills(created_by);
create index if not exists operator_workers_current_run_idx
  on public.operator_workers(current_run_id);
create index if not exists operator_worker_skills_skill_idx
  on public.operator_worker_skills(skill_id);
create index if not exists operator_runs_mission_idx
  on public.operator_runs(mission_id);
create index if not exists operator_runs_skill_idx
  on public.operator_runs(skill_id);
create index if not exists operator_runs_worker_idx
  on public.operator_runs(worker_id);
create index if not exists operator_runs_created_by_idx
  on public.operator_runs(created_by);
create index if not exists operator_approvals_run_idx
  on public.operator_approvals(run_id);
create index if not exists operator_approvals_requested_worker_idx
  on public.operator_approvals(requested_by_worker_id);
create index if not exists operator_approvals_decided_by_idx
  on public.operator_approvals(decided_by);
