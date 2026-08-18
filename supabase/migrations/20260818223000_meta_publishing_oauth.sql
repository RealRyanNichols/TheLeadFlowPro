-- Secure normal-browser Meta authorization for the LeadFlow Pro publisher.
-- OAuth app credentials and access tokens are encrypted by Supabase Vault.
-- Only the trusted service-role API can read or replace them.

create extension if not exists supabase_vault with schema vault;

alter table public.social_connections
  add column if not exists connected_by uuid references public.profiles(id) on delete set null,
  add column if not exists connected_at timestamptz,
  add column if not exists authorization_scope text[] not null default '{}'::text[],
  add column if not exists user_token_expires_at timestamptz;

create index if not exists social_connections_connected_by_idx
  on public.social_connections (connected_by);

create table if not exists public.social_oauth_states (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'facebook' check (provider = 'facebook'),
  state_hash text not null unique check (state_hash ~ '^[0-9a-f]{64}$'),
  admin_user_id uuid not null references public.profiles(id) on delete cascade,
  redirect_uri text not null check (char_length(redirect_uri) between 12 and 2000),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.social_oauth_states is
  'One-time, hashed OAuth state for the admin-only Meta publishing connection. No tokens are stored here.';

create index if not exists social_oauth_states_admin_user_id_idx
  on public.social_oauth_states (admin_user_id);
create index if not exists social_oauth_states_expires_at_idx
  on public.social_oauth_states (expires_at);

alter table public.social_oauth_states enable row level security;

drop policy if exists social_oauth_states_no_direct_access on public.social_oauth_states;
create policy social_oauth_states_no_direct_access on public.social_oauth_states
  for all to authenticated
  using (false)
  with check (false);

revoke all on public.social_oauth_states from public, anon, authenticated;
grant select, insert, update, delete on public.social_oauth_states to service_role;

create or replace function public.set_social_vault_secret(
  p_name text,
  p_value text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_vault_name text;
  v_request_role text;
begin
  v_request_role := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  if v_request_role <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_name not in (
    'meta_app_id',
    'meta_app_secret',
    'facebook_page_access_token',
    'facebook_user_access_token'
  ) then
    raise exception 'unsupported social secret name' using errcode = '22023';
  end if;
  if p_value is null or char_length(btrim(p_value)) < 1 or char_length(p_value) > 20000 then
    raise exception 'invalid social secret value' using errcode = '22023';
  end if;

  v_vault_name := 'leadflow_social_' || p_name;
  select id
    into v_secret_id
    from vault.secrets
   where name = v_vault_name
   limit 1;

  if v_secret_id is null then
    perform vault.create_secret(
      p_value,
      v_vault_name,
      'LeadFlow Pro encrypted Meta publishing credential'
    );
  else
    perform vault.update_secret(
      v_secret_id,
      p_value,
      v_vault_name,
      'LeadFlow Pro encrypted Meta publishing credential'
    );
  end if;

  return true;
end;
$$;

create or replace function public.get_social_vault_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_value text;
  v_vault_name text;
  v_request_role text;
begin
  v_request_role := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  if v_request_role <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_name not in (
    'meta_app_id',
    'meta_app_secret',
    'facebook_page_access_token',
    'facebook_user_access_token'
  ) then
    raise exception 'unsupported social secret name' using errcode = '22023';
  end if;

  v_vault_name := 'leadflow_social_' || p_name;
  select decrypted_secret
    into v_value
    from vault.decrypted_secrets
   where name = v_vault_name
   limit 1;

  return v_value;
end;
$$;

revoke all on function public.set_social_vault_secret(text, text)
  from public, anon, authenticated;
revoke all on function public.get_social_vault_secret(text)
  from public, anon, authenticated;
grant execute on function public.set_social_vault_secret(text, text) to service_role;
grant execute on function public.get_social_vault_secret(text) to service_role;

comment on function public.set_social_vault_secret(text, text) is
  'Service-role-only writer for the four allowlisted LeadFlow Meta credentials.';
comment on function public.get_social_vault_secret(text) is
  'Service-role-only reader for the four allowlisted LeadFlow Meta credentials.';

-- ROLLBACK (run manually only after disconnecting Meta publishing):
-- drop function if exists public.get_social_vault_secret(text);
-- drop function if exists public.set_social_vault_secret(text, text);
-- drop table if exists public.social_oauth_states;
-- alter table public.social_connections
--   drop column if exists user_token_expires_at,
--   drop column if exists authorization_scope,
--   drop column if exists connected_at,
--   drop column if exists connected_by;
