-- Private, per-admin drafts. No service-role credential is sent to the browser.
create table public.idea_lab_states (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  document jsonb not null default '{"version":1,"importedUrls":[],"briefs":[]}',
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(document) = 'object' and octet_length(document::text) <= 200000)
);
alter table public.idea_lab_states enable row level security;
create policy "admins own their idea lab" on public.idea_lab_states
  for all to authenticated
  using (owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
revoke all on public.idea_lab_states from anon;
grant select, insert, update on public.idea_lab_states to authenticated;

-- Compare-and-swap prevents one browser tab from silently overwriting another.
create function public.save_idea_lab_state(p_owner uuid, p_document jsonb, p_revision bigint)
returns bigint language plpgsql security invoker set search_path = public as $$
declare saved_revision bigint;
begin
  if p_owner is distinct from auth.uid() then raise insufficient_privilege; end if;
  if p_revision = 0 then
    insert into public.idea_lab_states(owner_id, document) values (p_owner, p_document)
    on conflict do nothing returning revision into saved_revision;
  else
    update public.idea_lab_states set document = p_document, revision = revision + 1, updated_at = now()
    where owner_id = p_owner and revision = p_revision returning revision into saved_revision;
  end if;
  if saved_revision is null then raise exception 'Workspace revision conflict' using errcode = '40001'; end if;
  return saved_revision;
end; $$;
revoke all on function public.save_idea_lab_state(uuid,jsonb,bigint) from public, anon;
grant execute on function public.save_idea_lab_state(uuid,jsonb,bigint) to authenticated;
