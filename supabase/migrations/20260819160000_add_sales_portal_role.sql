-- Give Patrick a lead-only role without exposing the owner back office.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'sales', 'client'));

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
      when lower(new.email) in ('ryan@realryannichols.com','theflashflash24@gmail.com','hello@theleadflowpro.com') then 'admin'
      when lower(new.email) = 'pat@dripgate.org' then 'sales'
      else 'client'
    end
  );
  return new;
end;
$$;

create or replace function public.can_access_sales_pipeline()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'sales')
  );
$$;

revoke all on function public.can_access_sales_pipeline() from public;
grant execute on function public.can_access_sales_pipeline() to authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an administrator can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
before update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.protect_sales_lead_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.can_access_sales_pipeline() and not public.is_admin() then
    if (to_jsonb(new) - array['status', 'owner']) is distinct from
       (to_jsonb(old) - array['status', 'owner']) then
      raise exception 'Sales users may only update lead status and owner';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_protect_sales_fields on public.leads;
create trigger leads_protect_sales_fields
before update on public.leads
for each row execute function public.protect_sales_lead_fields();

create policy "sales leads read"
on public.leads for select to authenticated
using (public.can_access_sales_pipeline());

create policy "sales leads update"
on public.leads for update to authenticated
using (public.can_access_sales_pipeline())
with check (public.can_access_sales_pipeline());

create policy "sales notes read"
on public.lead_notes for select to authenticated
using (public.can_access_sales_pipeline());
create policy "sales notes add"
on public.lead_notes for insert to authenticated
with check (public.can_access_sales_pipeline());

create policy "sales tasks read"
on public.lead_tasks for select to authenticated
using (public.can_access_sales_pipeline());
create policy "sales tasks add"
on public.lead_tasks for insert to authenticated
with check (public.can_access_sales_pipeline());
create policy "sales tasks update"
on public.lead_tasks for update to authenticated
using (public.can_access_sales_pipeline())
with check (public.can_access_sales_pipeline());

create policy "sales activity read"
on public.lead_activity for select to authenticated
using (public.can_access_sales_pipeline());
create policy "sales activity add"
on public.lead_activity for insert to authenticated
with check (public.can_access_sales_pipeline());

create policy "sales messages read"
on public.lead_messages for select to authenticated
using (public.can_access_sales_pipeline());
create policy "sales messages add"
on public.lead_messages for insert to authenticated
with check (public.can_access_sales_pipeline());

create policy "sales email history read"
on public.lead_emails for select to authenticated
using (public.can_access_sales_pipeline());
