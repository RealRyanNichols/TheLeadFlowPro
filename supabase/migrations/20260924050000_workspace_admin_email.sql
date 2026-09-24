-- Google Workspace sign-in for the admin (docs/infrastructure/google-workspace-migration.md).
--
-- Once email moves to Google Workspace, Ryan signs in to /admin with
-- ryan@theleadflowpro.com through "Continue with Google Workspace". A new
-- account gets its role here, so that address joins the admin list.
--
-- Everything else matches the function live on September 24, 2026, which had
-- already added pat@theleadflowpro.com as sales outside the migration files.
-- Every other new account is still a client; Google sign-in grants no role.
--
-- Rollback: re-run this without 'ryan@theleadflowpro.com'.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when lower(new.email) in (
        'ryan@realryannichols.com',
        'theflashflash24@gmail.com',
        'hello@theleadflowpro.com',
        'ryan@theleadflowpro.com'
      ) then 'admin'
      when lower(new.email) in ('pat@theleadflowpro.com', 'pat@dripgate.org') then 'sales'
      else 'client'
    end
  );
  return new;
end;
$$;
