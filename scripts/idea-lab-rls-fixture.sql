-- Run only in a newly created, disposable PostgreSQL validation database.
-- The transaction rolls back every fixture and role; no production records.
\set ON_ERROR_STOP on
begin;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema public, auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
create table public.profiles(id uuid primary key, role text not null);
create function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
alter table public.profiles enable row level security;
create policy "admin profile all" on public.profiles for all using (is_admin());
create policy "own profile read" on public.profiles for select using (id = auth.uid() or is_admin());
create policy "own profile update" on public.profiles for update using (id = auth.uid() or is_admin());
grant select on public.profiles to authenticated;
insert into public.profiles values
  ('00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'admin'),
  ('00000000-0000-0000-0000-000000000003', 'member');
\ir ../supabase/migrations/20260930210000_idea_lab.sql
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin
  if public.save_idea_lab_state(auth.uid(), '{"version":1,"importedUrls":[],"briefs":[]}',0) <> 1 then raise exception 'initial revision'; end if;
  if (select count(*) from public.idea_lab_states) <> 1 then raise exception 'own read'; end if;
  begin
    perform public.save_idea_lab_state(auth.uid(), '{}',0);
    raise exception 'duplicate creation was accepted';
  exception when serialization_failure then null; end;
  if public.save_idea_lab_state(auth.uid(), '{"version":1,"importedUrls":[],"briefs":[]}',1) <> 2 then raise exception 'update revision'; end if;
  begin
    perform public.save_idea_lab_state(auth.uid(), '{}',1);
    raise exception 'stale revision was accepted';
  exception when serialization_failure then null; end;
  begin
    perform public.save_idea_lab_state('00000000-0000-0000-0000-000000000002', '{}',0);
    raise exception 'cross-owner RPC accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_idea_lab_state(auth.uid(), jsonb_build_object('oversized', repeat('x',200001)),2);
    raise exception 'oversized document accepted';
  exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
  if (select count(*) from public.idea_lab_states) <> 0 then raise exception 'admin B saw admin A'; end if;
  if public.save_idea_lab_state(auth.uid(), '{}',0) <> 1 then raise exception 'admin B save'; end if;
  update public.idea_lab_states set document = '{"leaked":true}' where owner_id = '00000000-0000-0000-0000-000000000001';
  if found then raise exception 'cross-owner update accepted'; end if;
  begin
    insert into public.idea_lab_states(owner_id,document) values ('00000000-0000-0000-0000-000000000001','{}');
    raise exception 'cross-owner insert accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ begin
  if (select count(*) from public.idea_lab_states) <> 0 then raise exception 'member read'; end if;
  begin
    perform public.save_idea_lab_state(auth.uid(),'{}',0);
    raise exception 'member save accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform * from public.idea_lab_states;
    raise exception 'anonymous read accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_idea_lab_state(null,'{}',0);
    raise exception 'anonymous RPC accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
\echo IDEA_LAB_RLS_VALIDATION_PASSED
