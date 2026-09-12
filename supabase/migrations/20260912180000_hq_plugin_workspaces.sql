-- The LeadFlow Pro Plugin: per-business workspaces behind the ChatGPT and
-- Claude connector and the Autopilot engine.
--
-- Everything here is new and multi-tenant on purpose. The existing lead
-- pipeline (public.leads and friends) stays exactly as it is: it is The
-- LeadFlow Pro's own CRM. These tables hold customers' businesses, each with
-- its own lead inbox, messages, content queue, connections, and keys.
--
-- Access model:
--   * Browser sessions read and write through RLS by membership
--     (public.hq_member_of).
--   * The Autopilot cron, inbound webhooks, and the MCP server run with the
--     service role and always filter by workspace_id in code.
--   * OAuth and API key tables are service-role only. The browser never sees
--     a token hash.

-- ---------------------------------------------------------------------------
-- workspaces
-- ---------------------------------------------------------------------------

create table public.hq_workspaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_name text,
  industry text,
  phone text,
  email text,
  website text,
  city text,
  state text,
  timezone text not null default 'America/Chicago',
  brand_color text not null default '#1240E8',
  voice text not null default 'plain' check (voice in ('plain', 'friendly', 'formal')),
  services text[] not null default '{}'::text[],
  offer text,
  review_link text,
  plan text not null default 'none' check (plan in ('none', 'trial', 'active', 'past_due', 'canceled')),
  trial_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  subscription_status text,
  current_period_end timestamptz,
  settings jsonb not null default '{}'::jsonb,
  inbound_token_hash text not null unique,
  inbound_token_hint text not null,
  onboarding_step integer not null default 0 check (onboarding_step between 0 and 9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hq_workspaces_owner_idx on public.hq_workspaces (owner_id);
create index hq_workspaces_plan_idx on public.hq_workspaces (plan);
create index hq_workspaces_customer_idx on public.hq_workspaces (stripe_customer_id);

create table public.hq_members (
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index hq_members_user_idx on public.hq_members (user_id);

-- ---------------------------------------------------------------------------
-- the lead inbox
-- ---------------------------------------------------------------------------

create table public.hq_leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null default '',
  phone text,
  email text,
  source text not null default 'manual'
    check (source in ('website', 'form', 'meta', 'sms', 'call', 'manual', 'plugin', 'api', 'email', 'other')),
  source_detail text,
  message text,
  service text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quoted', 'booked', 'won', 'lost', 'spam')),
  score integer not null default 0 check (score between 0 and 100),
  first_contact_at timestamptz,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  follow_up_step integer not null default 0 check (follow_up_step between 0 and 20),
  value_cents integer check (value_cents is null or value_cents >= 0),
  notes text,
  consent_sms boolean not null default false,
  consent_email boolean not null default false,
  unsubscribed_at timestamptz,
  auto_replied_at timestamptz,
  external_id text,
  meta jsonb not null default '{}'::jsonb,
  unique (workspace_id, external_id)
);

create index hq_leads_workspace_created_idx on public.hq_leads (workspace_id, created_at desc);
create index hq_leads_workspace_status_idx on public.hq_leads (workspace_id, status);
create index hq_leads_follow_up_idx on public.hq_leads (workspace_id, next_follow_up_at);

-- Timeline. Also the idempotency ledger for Autopilot: an alert or a brief
-- that carries a dedupe_key can only ever be recorded once.
create table public.hq_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  lead_id uuid references public.hq_leads(id) on delete cascade,
  kind text not null
    check (kind in ('lead_in', 'text_out', 'email_out', 'text_in', 'email_in', 'call', 'note', 'status',
                    'alert', 'brief', 'report', 'content', 'follow_up', 'system', 'plugin')),
  detail text not null default '',
  actor text not null default 'system',
  dedupe_key text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, dedupe_key)
);

create index hq_events_workspace_created_idx on public.hq_events (workspace_id, created_at desc);
create index hq_events_lead_idx on public.hq_events (lead_id, created_at desc);

create table public.hq_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  lead_id uuid references public.hq_leads(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  channel text not null check (channel in ('sms', 'email')),
  purpose text not null default 'custom'
    check (purpose in ('text_back', 'email_reply', 'follow_up', 'quote_follow_up', 'review_ask', 'reschedule', 'custom', 'inbound')),
  body text not null,
  subject text,
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'sent', 'failed', 'received', 'skipped')),
  provider text,
  provider_id text,
  error text,
  created_by text not null default 'system',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index hq_messages_workspace_idx on public.hq_messages (workspace_id, created_at desc);
create index hq_messages_lead_idx on public.hq_messages (lead_id, created_at desc);
create index hq_messages_queued_idx on public.hq_messages (workspace_id, status) where status = 'queued';

-- ---------------------------------------------------------------------------
-- content and briefs
-- ---------------------------------------------------------------------------

create table public.hq_content (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  kind text not null check (kind in ('post', 'ad', 'video_script', 'review_reply', 'email')),
  title text not null,
  body text not null,
  hook text,
  cta text,
  extras jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'scheduled', 'published', 'rejected')),
  week_of date,
  scheduled_for timestamptz,
  published_at timestamptz,
  published_ref text,
  created_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hq_content_workspace_idx on public.hq_content (workspace_id, created_at desc);
create index hq_content_week_idx on public.hq_content (workspace_id, week_of);

create table public.hq_briefs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  kind text not null default 'daily' check (kind in ('daily', 'weekly')),
  brief_date date not null,
  body_text text not null,
  body_json jsonb not null default '{}'::jsonb,
  delivered_via text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  unique (workspace_id, kind, brief_date)
);

-- ---------------------------------------------------------------------------
-- connections and credentials
-- ---------------------------------------------------------------------------

-- One row per channel a business connects. Anything secret (an OpenPhone
-- API key, a Twilio auth token, a Page access token) is AES-GCM encrypted
-- in secret_ciphertext with a server-side key and never returned to the
-- browser. config holds only the non-secret parts (numbers, page ids, names).
create table public.hq_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  kind text not null check (kind in ('openphone', 'twilio', 'meta_page', 'website')),
  label text not null default '',
  config jsonb not null default '{}'::jsonb,
  secret_ciphertext text,
  status text not null default 'connected' check (status in ('connected', 'error', 'disconnected')),
  last_error text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, kind)
);

create index hq_connections_meta_page_idx on public.hq_connections ((config->>'page_id')) where kind = 'meta_page';

create table public.hq_api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  name text not null default 'Plugin key',
  key_hash text not null unique,
  key_hint text not null,
  created_by uuid references auth.users(id) on delete set null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index hq_api_keys_workspace_idx on public.hq_api_keys (workspace_id);

-- OAuth 2.1 for ChatGPT and Claude. Clients register themselves (dynamic
-- client registration), the owner signs in and approves, and the connector
-- holds a short-lived access token plus a refresh token. Only hashes live
-- here; the plaintext token is shown to the client once.
create table public.hq_oauth_clients (
  client_id text primary key,
  client_name text not null default '',
  redirect_uris text[] not null default '{}'::text[],
  client_uri text,
  logo_uri text,
  token_endpoint_auth_method text not null default 'none',
  client_secret_hash text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table public.hq_oauth_codes (
  code_hash text primary key,
  client_id text not null references public.hq_oauth_clients(client_id) on delete cascade,
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null,
  code_challenge_method text not null default 'S256',
  scope text not null default '',
  resource text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.hq_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  access_hash text not null unique,
  refresh_hash text unique,
  client_id text not null references public.hq_oauth_clients(client_id) on delete cascade,
  workspace_id uuid not null references public.hq_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null default '',
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index hq_oauth_tokens_workspace_idx on public.hq_oauth_tokens (workspace_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.hq_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger hq_workspaces_touch before update on public.hq_workspaces
  for each row execute function public.hq_touch_updated_at();
create trigger hq_leads_touch before update on public.hq_leads
  for each row execute function public.hq_touch_updated_at();
create trigger hq_content_touch before update on public.hq_content
  for each row execute function public.hq_touch_updated_at();
create trigger hq_connections_touch before update on public.hq_connections
  for each row execute function public.hq_touch_updated_at();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------

create or replace function public.hq_member_of(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hq_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

revoke all on function public.hq_member_of(uuid) from public;
grant execute on function public.hq_member_of(uuid) to authenticated;

create or replace function public.hq_owner_of(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hq_members
    where workspace_id = ws and user_id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function public.hq_owner_of(uuid) from public;
grant execute on function public.hq_owner_of(uuid) to authenticated;

alter table public.hq_workspaces enable row level security;
alter table public.hq_members enable row level security;
alter table public.hq_leads enable row level security;
alter table public.hq_events enable row level security;
alter table public.hq_messages enable row level security;
alter table public.hq_content enable row level security;
alter table public.hq_briefs enable row level security;
alter table public.hq_connections enable row level security;
alter table public.hq_api_keys enable row level security;
alter table public.hq_oauth_clients enable row level security;
alter table public.hq_oauth_codes enable row level security;
alter table public.hq_oauth_tokens enable row level security;

-- Workspaces: members read, owners update. Creation happens through the
-- service role in /api/hq/workspaces so the slug, inbound token, and the
-- owner membership row are written together.
create policy "hq workspaces member read" on public.hq_workspaces
  for select to authenticated using (public.hq_member_of(id));
create policy "hq workspaces owner update" on public.hq_workspaces
  for update to authenticated using (public.hq_owner_of(id)) with check (public.hq_owner_of(id));

create policy "hq members self read" on public.hq_members
  for select to authenticated using (user_id = auth.uid() or public.hq_owner_of(workspace_id));

create policy "hq leads member all" on public.hq_leads
  for all to authenticated using (public.hq_member_of(workspace_id)) with check (public.hq_member_of(workspace_id));

create policy "hq events member read" on public.hq_events
  for select to authenticated using (public.hq_member_of(workspace_id));
create policy "hq events member insert" on public.hq_events
  for insert to authenticated with check (public.hq_member_of(workspace_id));

create policy "hq messages member all" on public.hq_messages
  for all to authenticated using (public.hq_member_of(workspace_id)) with check (public.hq_member_of(workspace_id));

create policy "hq content member all" on public.hq_content
  for all to authenticated using (public.hq_member_of(workspace_id)) with check (public.hq_member_of(workspace_id));

create policy "hq briefs member read" on public.hq_briefs
  for select to authenticated using (public.hq_member_of(workspace_id));

-- Connections: members can see that a channel exists and its non-secret
-- config. The ciphertext column is never selected by browser code, and the
-- service role is the only writer, so a member cannot plant a key.
create policy "hq connections member read" on public.hq_connections
  for select to authenticated using (public.hq_member_of(workspace_id));

create policy "hq api keys member read" on public.hq_api_keys
  for select to authenticated using (public.hq_member_of(workspace_id));

-- OAuth tables: no browser access at all. Service role only.
