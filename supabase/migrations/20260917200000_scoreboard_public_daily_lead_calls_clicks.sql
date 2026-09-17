-- Scoreboard feed fixes for The LeadFlow Pro's own board (/scoreboard/the-leadflow-pro).
-- Replaces public.scoreboard_public_daily. Two definitions were wrong; everything
-- else is unchanged from 20260903021000_scoreboard_public_daily.sql, including
-- security definer, search_path, the days series and the Chicago bucketing.
--
-- 1. Calls read public.lead_calls, not leads.source = 'quo_call'. Nothing writes
--    'quo_call' anymore: public.log_quo_activity owns lead creation (see the
--    comment at the top of app/api/quo-inbound/route.ts) and writes calls into
--    public.lead_calls with source = 'quo', creating the lead as 'quo_inbound'.
--    The board was counting a dead value (1 call in 30 days against 4 real ones).
--    Every call is counted, inbound and outbound, by the Central day it started.
-- 2. Clicks include navigation_click (the largest real interaction on the site),
--    tool_card_open, tool_view and form_start. Passive signals (page_engagement,
--    scroll_depth, session_start, engaged_session, form_view) stay excluded so
--    the number is still a count of actions, not of scrolling.
--
-- Applied to production 2026-09-17 via the Supabase MCP (project hpzpwfymwfgwspaixrxi).
-- The Premier Dental Academy and RealRyanNichols feeds are separate functions on
-- their own projects and are not touched by this migration.
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
  events as (
    select (created_at at time zone 'America/Chicago')::date as day,
           count(*) filter (where event_name = 'page_view') as views,
           count(distinct visitor_id) filter (where event_name = 'page_view') as visitors,
           count(*) filter (where event_name in ('cta_click','outbound_click','phone_click','sms_click','email_click','tool_start','download','booking_start','checkout_start','navigation_click','tool_card_open','tool_view','form_start')) as clicks,
           count(*) filter (where event_name = 'form_submit') as forms
    from public.analytics_events
    where is_internal = false
      and created_at >= ((select start_day from bounds)::timestamp at time zone 'America/Chicago')
    group by 1
  ),
  lead_rows as (
    select (created_at at time zone 'America/Chicago')::date as day,
           count(*) as leads,
           count(*) filter (
             where source in ('meta_lead_ad','facebook-lead-ad','facebook_lead_ad')
                or lower(coalesce(utm_medium,'')) in ('paid','cpc','ppc','paid_social','paidsocial')
           ) as paid_leads
    from public.leads
    where deleted_at is null
      and coalesce(is_test, false) = false
      and created_at >= ((select start_day from bounds)::timestamp at time zone 'America/Chicago')
    group by 1
  ),
  call_rows as (
    select (started_at at time zone 'America/Chicago')::date as day,
           count(*) as calls
    from public.lead_calls
    where started_at >= ((select start_day from bounds)::timestamp at time zone 'America/Chicago')
    group by 1
  ),
  sale_rows as (
    select day, sum(n) as sales from (
      select (created_at at time zone 'America/Chicago')::date as day, count(*) as n
      from public.purchases
      where status = 'paid'
        and created_at >= ((select start_day from bounds)::timestamp at time zone 'America/Chicago')
      group by 1
      union all
      select (received_at at time zone 'America/Chicago')::date as day, count(*) as n
      from public.operator_verified_cash_entries
      where received_at >= ((select start_day from bounds)::timestamp at time zone 'America/Chicago')
      group by 1
    ) s group by day
  )
  select d.day,
         coalesce(e.views, 0)::bigint as views,
         coalesce(e.visitors, 0)::bigint as visitors,
         coalesce(e.clicks, 0)::bigint as clicks,
         coalesce(l.leads, 0)::bigint as leads,
         coalesce(l.paid_leads, 0)::bigint as paid_leads,
         (coalesce(l.leads, 0) - coalesce(l.paid_leads, 0))::bigint as unpaid_leads,
         coalesce(cl.calls, 0)::bigint as calls,
         coalesce(e.forms, 0)::bigint as forms,
         coalesce(s.sales, 0)::bigint as sales
  from days d
  left join events e on e.day = d.day
  left join lead_rows l on l.day = d.day
  left join call_rows cl on cl.day = d.day
  left join sale_rows s on s.day = d.day
  order by d.day;
$$;

revoke all on function public.scoreboard_public_daily(integer) from public;
grant execute on function public.scoreboard_public_daily(integer) to anon, authenticated, service_role;
