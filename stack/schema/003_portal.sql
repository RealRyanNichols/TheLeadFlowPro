-- Company OS stack: portal module. Documents a member may see, and the
-- link between a Supabase auth user and their person row (people.auth_user_id
-- from 001). Sign-in is magic link only; the app links the user to the
-- person by verified email at first sign-in and never by a guess.

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  title text not null,
  storage_path text not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists documents_person_idx on public.documents (person_id, issued_at desc);

alter table public.documents enable row level security;
revoke all on table public.documents from anon, authenticated;
grant select on public.documents to authenticated;

drop policy if exists "documents self read" on public.documents;
create policy "documents self read" on public.documents
  for select to authenticated using (person_id in (select id from public.people where auth_user_id = (select auth.uid())));

-- A member may change only their own two consent flags. Everything else on
-- their row is the owner's to change.
grant update (consent_sms, consent_email) on public.people to authenticated;
drop policy if exists "people self preferences" on public.people;
create policy "people self preferences" on public.people
  for update to authenticated using (auth_user_id = (select auth.uid())) with check (auth_user_id = (select auth.uid()));
