-- Company OS stack: scoreboard feed (opt-in). Gives a stack client the same
-- aggregate-only daily function every other board reads, against the
-- stack's own tables, plus a minimal page_events table the stack app writes
-- through the service role. The function is security definer and granted to
-- anon on purpose: it returns counts per day and nothing else, so the
-- client's publishable key is enough to read it. Apply only when the client
-- has opted in (stack config scoreboard.publicBoard or ownerView).

create table if not exists public.page_events (
  id bigint generated always as identity primary key,
  event text not null check (event in ('page_view', 'click', 'form_submit')),
  path text not null default '/',
  -- A salted hash the app computes; never an IP or a cookie value.
  visitor_hash text,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists page_events_created_idx on public.page_events (created_at);
alter table public.page_events enable row level security;
revoke all on table public.page_events from anon, authenticated;

create or replace function public.scoreboard_public_daily(days_back integer default 90)
returns table (
  day date,
  views bigint,
  visitors bigint,
  clicks bigint,
  leads bigint,
  paid_leads bigint,
  unpaid_leads bigint,
  calls bigint,
  forms bigint,
  sales bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with bounds as (
    select ((now() at time zone 'America/Chicago')::date - least(greatest(coalesce(days_back, 90), 1), 400) + 1) as start_day
  ),
  days as (
    select generate_series((select start_day from bounds), (now() at time zone 'America/Chicago')::date, interval '1 day')::date as day
  ),
  ev as (
    select (created_at at time zone 'America/Chicago')::date as day,
           count(*) filter (where event = 'page_view') as views,
           count(distinct visitor_hash) filter (where event = 'page_view' and visitor_hash is not null) as visitors,
           count(*) filter (where event = 'click') as clicks,
           count(*) filter (where event = 'form_submit') as forms
    from public.page_events
    where is_internal = false
      and created_at >= ((select start_day from bounds)::timestamp at time zone 'America/Chicago')
    group by 1
  ),
  ppl as (
    select (created_at at time zone 'America/Chicago')::date as day,
           count(*) as leads,
           count(*) filter (where lower(first_source) in ('meta', 'meta_lead_ad', 'facebook_lead_ad', 'google_ads', 'paid', 'cpc', 'ppc', 'paid_social')) as paid_leads
    from public.people
    where created_at >= ((select start_day from bounds)::timestamp at time zone 'America/Chicago')
    group by 1
  ),
  cl as (
    select (created_at at time zone 'America/Chicago')::date as day, count(*) as calls
    from public.interactions
    where channel = 'call' and direction = 'in'
      and created_at >= ((select start_day from bounds)::timestamp at time zone 'America/Chicago')
    group by 1
  ),
  pay as (
    select (created_at at time zone 'America/Chicago')::date as day, count(*) as sales
    from public.payments
    where status = 'paid'
      and created_at >= ((select start_day from bounds)::timestamp at time zone 'America/Chicago')
    group by 1
  )
  select d.day,
         coalesce(ev.views, 0)::bigint,
         coalesce(ev.visitors, 0)::bigint,
         coalesce(ev.clicks, 0)::bigint,
         coalesce(ppl.leads, 0)::bigint,
         coalesce(ppl.paid_leads, 0)::bigint,
         (coalesce(ppl.leads, 0) - coalesce(ppl.paid_leads, 0))::bigint,
         coalesce(cl.calls, 0)::bigint,
         coalesce(ev.forms, 0)::bigint,
         coalesce(pay.sales, 0)::bigint
  from days d
  left join ev on ev.day = d.day
  left join ppl on ppl.day = d.day
  left join cl on cl.day = d.day
  left join pay on pay.day = d.day
  order by d.day
$$;

revoke all on function public.scoreboard_public_daily(integer) from public;
grant execute on function public.scoreboard_public_daily(integer) to anon, authenticated;
