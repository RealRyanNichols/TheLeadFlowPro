-- LeadFlow web analytics: shared first-party data layer (core).
--
-- One event store feeds two projections with different permission levels:
--   * /admin/analytics reads detailed aggregates through admin-only RPCs.
--   * /live reads sanitized, thresholded aggregates through public RPCs.
-- Raw events are never publicly selectable. The old public.page_views table
-- keeps receiving page views (nothing existing breaks); its history is
-- backfilled here so trends start from real data, not an empty chart.

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  client_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  visitor_id text,
  session_id text,
  path text not null default '/',
  page_title text,
  label text,
  target_host text,
  tool_slug text,
  referrer text,
  referrer_host text,
  source_family text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  device text,
  browser text,
  country text,
  region text,
  visitor_type text,
  is_internal boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  constraint analytics_events_client_id_key unique (client_id),
  constraint analytics_events_name_shape check (event_name ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint analytics_events_path_len check (char_length(path) <= 300),
  constraint analytics_events_title_len check (page_title is null or char_length(page_title) <= 200),
  constraint analytics_events_label_len check (label is null or char_length(label) <= 120),
  constraint analytics_events_host_len check (target_host is null or char_length(target_host) <= 120),
  constraint analytics_events_tool_len check (tool_slug is null or char_length(tool_slug) <= 80),
  constraint analytics_events_ref_len check (referrer is null or char_length(referrer) <= 500),
  constraint analytics_events_refhost_len check (referrer_host is null or char_length(referrer_host) <= 120),
  constraint analytics_events_utm_len check (
    (utm_source is null or char_length(utm_source) <= 100)
    and (utm_medium is null or char_length(utm_medium) <= 100)
    and (utm_campaign is null or char_length(utm_campaign) <= 100)
    and (utm_content is null or char_length(utm_content) <= 100)
  ),
  constraint analytics_events_id_len check (
    (visitor_id is null or char_length(visitor_id) <= 100)
    and (session_id is null or char_length(session_id) <= 100)
  ),
  constraint analytics_events_enum_len check (
    (device is null or device in ('mobile', 'tablet', 'desktop'))
    and (browser is null or char_length(browser) <= 40)
    and (country is null or char_length(country) <= 8)
    and (region is null or char_length(region) <= 80)
    and (visitor_type is null or visitor_type in ('new', 'returning'))
    and (source_family is null or char_length(source_family) <= 40)
  ),
  constraint analytics_events_meta_size check (pg_column_size(meta) <= 2048)
);

comment on table public.analytics_events is
  'First-party web analytics events. Anonymous visitor/session ids only. No PII: the insert policy rejects identity-shaped meta keys, and nothing here should ever hold names, emails, phones, IPs, or form answers.';

create index if not exists analytics_events_time_idx
  on public.analytics_events (created_at desc);
create index if not exists analytics_events_name_time_idx
  on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_path_time_idx
  on public.analytics_events (path, created_at desc);
create index if not exists analytics_events_session_idx
  on public.analytics_events (session_id, created_at);
create index if not exists analytics_events_visitor_idx
  on public.analytics_events (visitor_id, created_at);
create index if not exists analytics_events_tool_idx
  on public.analytics_events (tool_slug) where tool_slug is not null;

alter table public.analytics_events enable row level security;

-- Anonymous inserts are allowed (that is how first-party tracking works) but
-- tightly shaped: canonical event names only, and meta may not carry
-- identity-shaped keys even by accident.
drop policy if exists analytics_events_public_insert on public.analytics_events;
create policy analytics_events_public_insert on public.analytics_events
  for insert to anon, authenticated
  with check (
    event_name ~ '^[a-z][a-z0-9_]{1,63}$'
    and path !~* '(email|token|password|secret|credit|ssn)'
    and not (
      meta ?| array[
        'email', 'phone', 'name', 'first_name', 'last_name', 'full_name',
        'address', 'street', 'message', 'notes', 'answer', 'raw_answer',
        'value_text', 'query_string', 'password', 'token', 'ip', 'ip_address',
        'user_id', 'lead_id', 'credit_card', 'ssn', 'dob'
      ]
    )
  );

drop policy if exists analytics_events_admin_read on public.analytics_events;
create policy analytics_events_admin_read on public.analytics_events
  for select using (public.is_admin());

grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;
grant select, insert, update, delete on public.analytics_events to service_role;

-- ---------------------------------------------------------------------------
-- Helpers shared by backfill, tracking, and reporting
-- ---------------------------------------------------------------------------

create or replace function public.analytics_source_family(
  p_utm_source text,
  p_utm_medium text,
  p_referrer_host text
) returns text
language sql
immutable
as $$
  select case
    when coalesce(p_utm_medium, '') ilike '%paid%'
      or coalesce(p_utm_medium, '') in ('cpc', 'ppc', 'cpm', 'ads') then 'paid'
    when coalesce(p_utm_source, '') <> '' then
      case
        when p_utm_source ilike '%facebook%' or p_utm_source ilike 'fb%' then 'facebook'
        when p_utm_source ilike '%instagram%' or p_utm_source ilike 'ig%' then 'instagram'
        when p_utm_source ilike '%tiktok%' then 'tiktok'
        when p_utm_source ilike '%linkedin%' then 'linkedin'
        when p_utm_source ilike '%youtube%' then 'youtube'
        when p_utm_source in ('x', 'twitter') or p_utm_source ilike '%twitter%' then 'x'
        when p_utm_source ilike '%google%' then 'google'
        when p_utm_source ilike '%email%' or coalesce(p_utm_medium, '') = 'email' then 'email'
        else 'campaign'
      end
    when coalesce(p_referrer_host, '') = '' then 'direct'
    when p_referrer_host ilike '%google.%' then 'google'
    when p_referrer_host ilike '%bing.%'
      or p_referrer_host ilike '%duckduckgo.%'
      or p_referrer_host ilike '%yahoo.%'
      or p_referrer_host ilike '%ecosia.%'
      or p_referrer_host ilike '%brave.%' then 'search_other'
    when p_referrer_host ilike '%facebook.%' or p_referrer_host ilike '%fb.%' then 'facebook'
    when p_referrer_host ilike '%instagram.%' then 'instagram'
    when p_referrer_host ilike '%t.co' or p_referrer_host ilike '%twitter.%' or p_referrer_host ilike '%x.com' then 'x'
    when p_referrer_host ilike '%linkedin.%' or p_referrer_host ilike '%lnkd.in' then 'linkedin'
    when p_referrer_host ilike '%youtube.%' or p_referrer_host ilike '%youtu.be' then 'youtube'
    when p_referrer_host ilike '%tiktok.%' then 'tiktok'
    when p_referrer_host ilike '%theleadflowpro.com' then 'internal'
    else 'referral'
  end;
$$;

-- Paths that may ever be named on the public dashboard. Everything else
-- aggregates namelessly.
create or replace function public.analytics_is_public_path(p_path text)
returns boolean
language sql
immutable
as $$
  select p_path = '/'
    or p_path ~ '^/(tools|pricing|free-build|about|portfolio|articles|start|book|contact|events|showcase|system|live|packages|add-ons|training)(/|$)';
$$;

-- ---------------------------------------------------------------------------
-- Backfill: real page-view history becomes page_view events (one time).
-- ---------------------------------------------------------------------------

insert into public.analytics_events (
  created_at, event_name, visitor_id, path, referrer, referrer_host,
  utm_source, utm_medium, utm_campaign, source_family
)
select
  pv.created_at,
  'page_view',
  pv.visitor_id,
  left(coalesce(pv.path, '/'), 300),
  left(pv.referrer, 500),
  lower(substring(pv.referrer from '^[a-z]+://([^/]+)')),
  pv.utm_source,
  pv.utm_medium,
  pv.utm_campaign,
  public.analytics_source_family(
    pv.utm_source,
    pv.utm_medium,
    lower(substring(pv.referrer from '^[a-z]+://([^/]+)'))
  )
from public.page_views pv
where not exists (
  select 1 from public.analytics_events e where e.event_name = 'page_view' limit 1
);

-- ---------------------------------------------------------------------------
-- Google Search Console snapshots (filled by /api/cron/analytics when the
-- service account is connected; empty tables are the honest default).
-- ---------------------------------------------------------------------------

create table if not exists public.gsc_site_daily (
  date date primary key,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr double precision not null default 0,
  position double precision,
  fetched_at timestamptz not null default now()
);

create table if not exists public.gsc_page_daily (
  date date not null,
  page text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr double precision not null default 0,
  position double precision,
  primary key (date, page)
);

create table if not exists public.gsc_query_daily (
  date date not null,
  query text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  ctr double precision not null default 0,
  position double precision,
  primary key (date, query)
);

create table if not exists public.gsc_page_query_daily (
  date date not null,
  page text not null,
  query text not null,
  clicks integer not null default 0,
  impressions integer not null default 0,
  position double precision,
  primary key (date, page, query)
);

create index if not exists gsc_page_daily_page_idx on public.gsc_page_daily (page, date desc);
create index if not exists gsc_query_daily_query_idx on public.gsc_query_daily (query, date desc);
create index if not exists gsc_page_query_page_idx on public.gsc_page_query_daily (page, date desc);

-- URL index monitoring. One row per important URL; refreshed by the cron.
create table if not exists public.url_inspections (
  url text primary key,
  sitemap_listed boolean not null default false,
  http_status integer,
  verdict text,               -- indexed | not_indexed | blocked | redirected |
                              -- canonical_mismatch | crawled_not_indexed |
                              -- discovered | inspection_unavailable | awaiting_data
  coverage_state text,        -- raw Google coverageState when available
  robots_state text,
  indexing_state text,
  google_canonical text,
  user_canonical text,
  last_crawl_time timestamptz,
  inspected_at timestamptz,
  method text,                -- inspection_api | gsc_data | sitemap_http
  note text,
  updated_at timestamptz not null default now()
);

-- Integration health shown in the admin config panel.
create table if not exists public.analytics_integrations (
  key text primary key,
  status text not null default 'not_connected',  -- connected | not_connected | error
  detail text,
  last_sync_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.analytics_integrations (key, status, detail) values
  ('first_party_events', 'connected', 'First-party event tracking writes to analytics_events in this database.'),
  ('vercel_analytics', 'connected', 'Vercel Web Analytics is mounted in the root layout.'),
  ('search_console', 'not_connected', 'Add GSC_CLIENT_EMAIL, GSC_PRIVATE_KEY, and GSC_SITE_URL to enable Search Console sync.'),
  ('url_inspection', 'not_connected', 'Uses the same Search Console service account; enables per-URL index verification.'),
  ('meta_pixel', 'not_connected', 'Managed in Settings; connected when a pixel id is saved.')
on conflict (key) do nothing;

-- Admin-only visibility for every reporting table.
alter table public.gsc_site_daily enable row level security;
alter table public.gsc_page_daily enable row level security;
alter table public.gsc_query_daily enable row level security;
alter table public.gsc_page_query_daily enable row level security;
alter table public.url_inspections enable row level security;
alter table public.analytics_integrations enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'gsc_site_daily', 'gsc_page_daily', 'gsc_query_daily',
    'gsc_page_query_daily', 'url_inspections', 'analytics_integrations'
  ] loop
    execute format('drop policy if exists %I_admin_read on public.%I', t, t);
    execute format(
      'create policy %I_admin_read on public.%I for select using (public.is_admin())',
      t, t
    );
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Public dashboard configuration lives in the existing site_settings table
-- (public read / admin write already enforced there). Values seeded only if
-- missing so nothing Ryan already saved gets overwritten.
-- ---------------------------------------------------------------------------

insert into public.site_settings (key, value) values
  ('live_public_enabled', 'on'),
  ('live_feed_enabled', 'on'),
  ('live_show_leads', 'off'),
  ('live_min_threshold', '3'),
  ('live_feed_delay_seconds', '90'),
  ('seo_brand_terms', 'leadflow, lead flow pro, ryan nichols'),
  ('inspect_urls', '/, /free-build, /pricing, /tools, /start, /about, /portfolio, /contact, /book, /live'),
  ('proof_1_value', ''), ('proof_1_label', ''),
  ('proof_2_value', ''), ('proof_2_label', ''),
  ('proof_3_value', ''), ('proof_3_label', ''),
  ('proof_4_value', ''), ('proof_4_label', '')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Retention: raw events older than the window are purged by the daily cron.
-- ---------------------------------------------------------------------------

create or replace function public.analytics_purge(p_days integer default 400)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare deleted integer;
begin
  delete from public.analytics_events
  where created_at < now() - make_interval(days => greatest(p_days, 30));
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

revoke execute on function public.analytics_purge(integer) from public, anon, authenticated;
grant execute on function public.analytics_purge(integer) to service_role;
