-- LeadFlow web analytics: reporting functions.
--
-- Two permission tiers over one data layer:
--   * admin_analytics_* — SECURITY DEFINER, hard is_admin() gate, full detail.
--   * public_live_*     — SECURITY DEFINER, anon-executable, returns only
--     aggregated, thresholded, allowlisted data. Never row-level events with
--     identifiers, never private paths, never lead fields.

-- ---------------------------------------------------------------------------
-- Internal: one reporting window, shared by overview + comparisons.
-- Not exposed to any client role.
-- ---------------------------------------------------------------------------

create or replace function public.analytics_window_stats(
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb
) returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
with ev as (
  select * from analytics_events e
  where e.created_at >= p_from and e.created_at < p_to
    and (coalesce((p_filters->>'include_internal')::boolean, false) or not e.is_internal)
    and (p_filters->>'path' is null or e.path = p_filters->>'path')
    and (p_filters->>'source' is null or e.source_family = p_filters->>'source')
    and (p_filters->>'campaign' is null or e.utm_campaign = p_filters->>'campaign')
    and (p_filters->>'device' is null or e.device = p_filters->>'device')
    and (p_filters->>'visitor_type' is null or e.visitor_type = p_filters->>'visitor_type')
),
sess as (
  select session_id,
    count(*) filter (where event_name = 'page_view') as pageviews,
    bool_or(event_name = 'engaged_session') as engaged,
    sum(case when event_name = 'page_engagement'
      then least(coalesce(nullif(meta->>'seconds', '')::numeric, 0), 1800) else 0 end) as seconds
  from ev
  where session_id is not null
  group by session_id
),
lead_counts as (
  select
    count(*) as leads,
    count(*) filter (where l.status in ('call_booked', 'proposal', 'won')) as booked,
    count(*) filter (where l.status = 'won') as won
  from leads l
  where l.created_at >= p_from and l.created_at < p_to
    and l.is_test = false and l.deleted_at is null
    and (p_filters->>'source' is null
      or public.analytics_source_family(l.utm_source, l.utm_medium, null) = p_filters->>'source')
    and (p_filters->>'campaign' is null or l.utm_campaign = p_filters->>'campaign')
)
select jsonb_build_object(
  'visitors', (select count(distinct visitor_id) from ev where visitor_id is not null),
  'new_visitors', (select count(distinct visitor_id) from ev where visitor_type = 'new' and visitor_id is not null),
  'returning_visitors', (select count(distinct visitor_id) from ev where visitor_type = 'returning' and visitor_id is not null),
  'sessions', (select count(*) from sess),
  'pageviews', (select count(*) from ev where event_name = 'page_view'),
  'engaged_sessions', (select count(*) from sess where engaged),
  'not_engaged_sessions', (select count(*) from sess where not engaged and pageviews <= 1),
  'avg_engagement_seconds', (select coalesce(round(avg(seconds) filter (where seconds > 0)), 0) from sess),
  'actions', (select count(*) from ev where event_name not in
    ('page_view', 'page_engagement', 'session_start', 'engaged_session', 'scroll_depth', 'form_view', 'tool_view')),
  'cta_clicks', (select count(*) from ev where event_name = 'cta_click'),
  'nav_clicks', (select count(*) from ev where event_name = 'navigation_click'),
  'outbound_clicks', (select count(*) from ev where event_name = 'outbound_click'),
  'phone_clicks', (select count(*) from ev where event_name = 'phone_click'),
  'sms_clicks', (select count(*) from ev where event_name = 'sms_click'),
  'email_clicks', (select count(*) from ev where event_name = 'email_click'),
  'form_views', (select count(*) from ev where event_name = 'form_view'),
  'form_starts', (select count(*) from ev where event_name = 'form_start'),
  'form_submits', (select count(*) from ev where event_name = 'form_submit'),
  'booking_starts', (select count(*) from ev where event_name = 'booking_start'),
  'booking_completes', (select count(*) from ev where event_name = 'booking_complete'),
  'tool_views', (select count(*) from ev where event_name = 'tool_view'),
  'tool_starts', (select count(*) from ev where event_name = 'tool_start'),
  'tool_completes', (select count(*) from ev where event_name = 'tool_complete'),
  'leads', (select leads from lead_counts),
  'booked_calls', (select booked from lead_counts),
  'won_clients', (select won from lead_counts)
);
$$;

revoke execute on function public.analytics_window_stats(timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_window_stats(timestamptz, timestamptz, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Admin: overview with prior-period comparison.
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_overview(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz,
  p_filters jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  return jsonb_build_object(
    'current', public.analytics_window_stats(p_from, p_to, p_filters),
    'previous', public.analytics_window_stats(p_prev_from, p_prev_to, p_filters),
    'active_now', (
      select count(distinct visitor_id) from analytics_events
      where created_at > now() - interval '5 minutes'
        and not is_internal and visitor_id is not null
    ),
    'generated_at', now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: time series for the main chart.
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_timeseries(
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text default 'day',
  p_tz text default 'America/Chicago',
  p_filters jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  if p_bucket not in ('hour', 'day', 'week') then raise exception 'bad bucket'; end if;

  with buckets as (
    select generate_series(
      date_trunc(p_bucket, p_from at time zone p_tz),
      date_trunc(p_bucket, (p_to - interval '1 second') at time zone p_tz),
      ('1 ' || p_bucket)::interval
    ) as b
  ),
  ev as (
    select date_trunc(p_bucket, e.created_at at time zone p_tz) as b,
      e.visitor_id, e.session_id, e.event_name
    from analytics_events e
    where e.created_at >= p_from and e.created_at < p_to
      and (coalesce((p_filters->>'include_internal')::boolean, false) or not e.is_internal)
      and (p_filters->>'path' is null or e.path = p_filters->>'path')
      and (p_filters->>'source' is null or e.source_family = p_filters->>'source')
      and (p_filters->>'campaign' is null or e.utm_campaign = p_filters->>'campaign')
      and (p_filters->>'device' is null or e.device = p_filters->>'device')
      and (p_filters->>'visitor_type' is null or e.visitor_type = p_filters->>'visitor_type')
  ),
  ld as (
    select date_trunc(p_bucket, l.created_at at time zone p_tz) as b, count(*) as leads
    from leads l
    where l.created_at >= p_from and l.created_at < p_to
      and l.is_test = false and l.deleted_at is null
      and (p_filters->>'campaign' is null or l.utm_campaign = p_filters->>'campaign')
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'bucket', to_char(buckets.b, 'YYYY-MM-DD"T"HH24:MI:SS'),
    'visitors', coalesce(agg.visitors, 0),
    'sessions', coalesce(agg.sessions, 0),
    'pageviews', coalesce(agg.pageviews, 0),
    'actions', coalesce(agg.actions, 0),
    'leads', coalesce(ld.leads, 0)
  ) order by buckets.b), '[]'::jsonb)
  into result
  from buckets
  left join (
    select b,
      count(distinct visitor_id) as visitors,
      count(distinct session_id) as sessions,
      count(*) filter (where event_name = 'page_view') as pageviews,
      count(*) filter (where event_name not in
        ('page_view', 'page_engagement', 'session_start', 'engaged_session', 'scroll_depth', 'form_view', 'tool_view')) as actions
    from ev group by b
  ) agg on agg.b = buckets.b
  left join ld on ld.b = buckets.b;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: acquisition breakdowns.
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_acquisition(
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  with ev as (
    select * from analytics_events e
    where e.created_at >= p_from and e.created_at < p_to
      and (coalesce((p_filters->>'include_internal')::boolean, false) or not e.is_internal)
      and (p_filters->>'path' is null or e.path = p_filters->>'path')
      and (p_filters->>'device' is null or e.device = p_filters->>'device')
      and (p_filters->>'visitor_type' is null or e.visitor_type = p_filters->>'visitor_type')
  ),
  ld as (
    select public.analytics_source_family(l.utm_source, l.utm_medium, null) as fam,
      l.utm_source, l.utm_medium, l.utm_campaign,
      l.status
    from leads l
    where l.created_at >= p_from and l.created_at < p_to
      and l.is_test = false and l.deleted_at is null
  )
  select jsonb_build_object(
    'sources', (
      select coalesce(jsonb_agg(row order by (row->>'visitors')::int desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'source', s.fam,
          'visitors', s.visitors,
          'sessions', s.sessions,
          'pageviews', s.pageviews,
          'engaged_sessions', s.engaged,
          'leads', coalesce(lc.leads, 0),
          'booked', coalesce(lc.booked, 0)
        ) as row
        from (
          select coalesce(source_family, 'direct') as fam,
            count(distinct visitor_id) as visitors,
            count(distinct session_id) as sessions,
            count(*) filter (where event_name = 'page_view') as pageviews,
            count(distinct session_id) filter (where event_name = 'engaged_session') as engaged
          from ev group by 1
        ) s
        left join (
          select fam, count(*) as leads,
            count(*) filter (where status in ('call_booked', 'proposal', 'won')) as booked
          from ld group by 1
        ) lc on lc.fam = s.fam
      ) t
    ),
    'utm', (
      select coalesce(jsonb_agg(row order by (row->>'visitors')::int desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'source', utm_source, 'medium', utm_medium, 'campaign', utm_campaign,
          'content', utm_content,
          'visitors', count(distinct visitor_id),
          'pageviews', count(*) filter (where event_name = 'page_view')
        ) as row
        from ev where utm_source is not null
        group by utm_source, utm_medium, utm_campaign, utm_content
        order by count(distinct visitor_id) desc limit 25
      ) t
    ),
    'campaign_leads', (
      select coalesce(jsonb_agg(row order by (row->>'leads')::int desc), '[]'::jsonb) from (
        select jsonb_build_object(
          'source', utm_source, 'campaign', utm_campaign,
          'leads', count(*),
          'booked', count(*) filter (where status in ('call_booked', 'proposal', 'won'))
        ) as row
        from ld where utm_source is not null or utm_campaign is not null
        group by utm_source, utm_campaign
        order by count(*) desc limit 25
      ) t
    ),
    'referrers', (
      select coalesce(jsonb_agg(row order by (row->>'visitors')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('host', referrer_host,
          'visitors', count(distinct visitor_id),
          'pageviews', count(*) filter (where event_name = 'page_view')) as row
        from ev
        where referrer_host is not null
          and referrer_host not ilike '%theleadflowpro.com'
        group by referrer_host
        order by count(distinct visitor_id) desc limit 20
      ) t
    ),
    'landing_pages', (
      select coalesce(jsonb_agg(row order by (row->>'sessions')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('path', path, 'sessions', count(*)) as row
        from (
          select distinct on (session_id) session_id, path
          from ev where event_name = 'page_view' and session_id is not null
          order by session_id, created_at
        ) firsts
        group by path order by count(*) desc limit 20
      ) t
    ),
    'devices', (
      select coalesce(jsonb_agg(row order by (row->>'visitors')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('device', coalesce(device, 'unknown'),
          'visitors', count(distinct visitor_id),
          'sessions', count(distinct session_id)) as row
        from ev group by device
      ) t
    ),
    'browsers', (
      select coalesce(jsonb_agg(row order by (row->>'visitors')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('browser', coalesce(browser, 'unknown'),
          'visitors', count(distinct visitor_id)) as row
        from ev where browser is not null group by browser
        order by count(distinct visitor_id) desc limit 10
      ) t
    ),
    'countries', (
      select coalesce(jsonb_agg(row order by (row->>'visitors')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('country', country,
          'visitors', count(distinct visitor_id)) as row
        from ev where country is not null group by country
        order by count(distinct visitor_id) desc limit 20
      ) t
    ),
    'regions', (
      select coalesce(jsonb_agg(row order by (row->>'visitors')::int desc), '[]'::jsonb) from (
        select jsonb_build_object('region', region, 'country', country,
          'visitors', count(distinct visitor_id)) as row
        from ev where region is not null group by region, country
        order by count(distinct visitor_id) desc limit 20
      ) t
    )
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: per-page performance table (with GSC + index join when available).
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_pages(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz,
  p_filters jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  result jsonb;
  base constant text := 'https://www.theleadflowpro.com';
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  with ev as (
    select * from analytics_events e
    where e.created_at >= p_from and e.created_at < p_to
      and (coalesce((p_filters->>'include_internal')::boolean, false) or not e.is_internal)
      and (p_filters->>'source' is null or e.source_family = p_filters->>'source')
      and (p_filters->>'campaign' is null or e.utm_campaign = p_filters->>'campaign')
      and (p_filters->>'device' is null or e.device = p_filters->>'device')
      and (p_filters->>'visitor_type' is null or e.visitor_type = p_filters->>'visitor_type')
  ),
  ordered_views as (
    select session_id, path, created_at,
      row_number() over (partition by session_id order by created_at) as rn_first,
      row_number() over (partition by session_id order by created_at desc) as rn_last
    from ev where event_name = 'page_view' and session_id is not null
  ),
  page_stats as (
    select path,
      count(*) filter (where event_name = 'page_view') as views,
      count(distinct visitor_id) filter (where event_name = 'page_view') as visitors,
      max(page_title) filter (where event_name = 'page_view' and page_title is not null) as title,
      coalesce(round(avg(least(coalesce(nullif(meta->>'seconds', '')::numeric, 0), 1800))
        filter (where event_name = 'page_engagement')), 0) as avg_engagement,
      count(*) filter (where event_name in ('cta_click', 'phone_click', 'sms_click', 'email_click')) as cta_clicks,
      count(*) filter (where event_name = 'form_start') as form_starts,
      count(*) filter (where event_name = 'form_submit') as form_submits,
      count(distinct visitor_id) filter (where event_name in ('form_submit', 'booking_complete')) as converters,
      max(created_at) as last_activity
    from ev group by path
  ),
  scrolls as (
    select path, round(avg(max_depth)) as avg_scroll from (
      select path, session_id, max(coalesce(nullif(meta->>'depth', '')::int, 0)) as max_depth
      from ev where event_name = 'scroll_depth' group by path, session_id
    ) s group by path
  ),
  prev as (
    select path, count(*) as views
    from analytics_events e
    where e.created_at >= p_prev_from and e.created_at < p_prev_to
      and e.event_name = 'page_view' and not e.is_internal
    group by path
  ),
  gsc as (
    select page,
      sum(clicks) as clicks, sum(impressions) as impressions,
      case when sum(impressions) > 0
        then sum(coalesce(position, 0) * impressions) / sum(impressions) end as position
    from gsc_page_daily
    where date >= p_from::date and date < p_to::date + 1
    group by page
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'path', ps.path,
    'title', ps.title,
    'views', ps.views,
    'visitors', ps.visitors,
    'avg_engagement_seconds', ps.avg_engagement,
    'avg_scroll_depth', sc.avg_scroll,
    'cta_clicks', ps.cta_clicks,
    'form_starts', ps.form_starts,
    'form_submits', ps.form_submits,
    'conversion_rate', case when ps.visitors > 0
      then round(ps.converters::numeric / ps.visitors, 4) end,
    'landings', coalesce(l.landings, 0),
    'exits', coalesce(x.exits, 0),
    'exit_rate', case when ps.views > 0
      then round(coalesce(x.exits, 0)::numeric / ps.views, 4) end,
    'prev_views', coalesce(prev.views, 0),
    'gsc_clicks', g.clicks,
    'gsc_impressions', g.impressions,
    'gsc_position', case when g.position is not null then round(g.position::numeric, 1) end,
    'index_verdict', ui.verdict,
    'last_activity', ps.last_activity
  ) order by ps.views desc), '[]'::jsonb)
  into result
  from page_stats ps
  left join scrolls sc on sc.path = ps.path
  left join (select path, count(*) as landings from ordered_views where rn_first = 1 group by path) l on l.path = ps.path
  left join (select path, count(*) as exits from ordered_views where rn_last = 1 group by path) x on x.path = ps.path
  left join prev on prev.path = ps.path
  left join gsc g on g.page = base || ps.path or (ps.path = '/' and g.page in (base, base || '/'))
  left join url_inspections ui on ui.url = base || ps.path or (ps.path = '/' and ui.url in (base, base || '/'))
  where ps.views > 0;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: single-page drilldown.
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_page_detail(
  p_path text,
  p_from timestamptz,
  p_to timestamptz,
  p_tz text default 'America/Chicago'
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  result jsonb;
  base constant text := 'https://www.theleadflowpro.com';
  page_url text;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;
  page_url := case when p_path = '/' then base else base || p_path end;

  with ev as (
    select * from analytics_events e
    where e.created_at >= p_from and e.created_at < p_to
      and e.path = p_path and not e.is_internal
  )
  select jsonb_build_object(
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d, 'views', v, 'visitors', u) order by d), '[]'::jsonb)
      from (
        select (created_at at time zone p_tz)::date as d,
          count(*) filter (where event_name = 'page_view') as v,
          count(distinct visitor_id) as u
        from ev group by 1
      ) t
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', s, 'views', v) order by v desc), '[]'::jsonb)
      from (
        select coalesce(source_family, 'direct') as s, count(*) as v
        from ev where event_name = 'page_view' group by 1
      ) t
    ),
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object('event', event_name, 'count', c) order by c desc), '[]'::jsonb)
      from (select event_name, count(*) as c from ev group by 1) t
    ),
    'ctas', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', c) order by c desc), '[]'::jsonb)
      from (
        select coalesce(label, '(unlabeled)') as label, count(*) as c
        from ev where event_name in ('cta_click', 'phone_click', 'sms_click', 'email_click')
        group by 1 order by count(*) desc limit 15
      ) t
    ),
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('device', d, 'visitors', v) order by v desc), '[]'::jsonb)
      from (
        select coalesce(device, 'unknown') as d, count(distinct visitor_id) as v
        from ev group by 1
      ) t
    ),
    'referrers', (
      select coalesce(jsonb_agg(jsonb_build_object('host', h, 'views', v) order by v desc), '[]'::jsonb)
      from (
        select referrer_host as h, count(*) as v from ev
        where referrer_host is not null and referrer_host not ilike '%theleadflowpro.com'
        group by 1 order by count(*) desc limit 15
      ) t
    ),
    'gsc_series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', date, 'clicks', clicks, 'impressions', impressions, 'position', position) order by date), '[]'::jsonb)
      from gsc_page_daily
      where page = page_url and date >= p_from::date and date < p_to::date + 1
    ),
    'gsc_queries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'query', query, 'clicks', clicks, 'impressions', impressions, 'position', position)
        order by clicks desc, impressions desc), '[]'::jsonb)
      from (
        select query, sum(clicks) as clicks, sum(impressions) as impressions,
          case when sum(impressions) > 0
            then round((sum(coalesce(position, 0) * impressions) / sum(impressions))::numeric, 1) end as position
        from gsc_page_query_daily
        where page = page_url and date >= p_from::date and date < p_to::date + 1
        group by query order by sum(clicks) desc, sum(impressions) desc limit 20
      ) t
    ),
    'inspection', (
      select to_jsonb(ui) - 'url' from url_inspections ui where ui.url = page_url
    )
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: click + behavior analytics.
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_behavior(
  p_from timestamptz,
  p_to timestamptz,
  p_filters jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  with ev as (
    select * from analytics_events e
    where e.created_at >= p_from and e.created_at < p_to
      and (coalesce((p_filters->>'include_internal')::boolean, false) or not e.is_internal)
      and (p_filters->>'path' is null or e.path = p_filters->>'path')
      and (p_filters->>'source' is null or e.source_family = p_filters->>'source')
      and (p_filters->>'campaign' is null or e.utm_campaign = p_filters->>'campaign')
      and (p_filters->>'device' is null or e.device = p_filters->>'device')
      and (p_filters->>'visitor_type' is null or e.visitor_type = p_filters->>'visitor_type')
  ),
  ordered_views as (
    select session_id, path, created_at,
      row_number() over (partition by session_id order by created_at) as rn_first,
      row_number() over (partition by session_id order by created_at desc) as rn_last
    from ev where event_name = 'page_view' and session_id is not null
  ),
  converting_sessions as (
    select distinct session_id from ev
    where event_name in ('form_submit', 'booking_complete') and session_id is not null
  ),
  page_conv as (
    select path,
      count(distinct visitor_id) as visitors,
      count(distinct visitor_id) filter (where event_name in ('form_submit', 'booking_complete')) as converters,
      count(*) filter (where event_name = 'page_view') as views
    from ev group by path
  )
  select jsonb_build_object(
    'top_ctas', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'path', path, 'clicks', c) order by c desc), '[]'::jsonb)
      from (
        select coalesce(label, '(unlabeled)') as label, path, count(*) as c
        from ev where event_name = 'cta_click' group by 1, 2
        order by count(*) desc limit 20
      ) t
    ),
    'nav_clicks', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'clicks', c) order by c desc), '[]'::jsonb)
      from (
        select coalesce(label, '(unlabeled)') as label, count(*) as c
        from ev where event_name = 'navigation_click' group by 1
        order by count(*) desc limit 15
      ) t
    ),
    'outbound', (
      select coalesce(jsonb_agg(jsonb_build_object('host', h, 'clicks', c) order by c desc), '[]'::jsonb)
      from (
        select coalesce(target_host, '(unknown)') as h, count(*) as c
        from ev where event_name = 'outbound_click' group by 1
        order by count(*) desc limit 15
      ) t
    ),
    'contact_clicks', (
      select jsonb_build_object(
        'phone', count(*) filter (where event_name = 'phone_click'),
        'sms', count(*) filter (where event_name = 'sms_click'),
        'email', count(*) filter (where event_name = 'email_click'))
      from ev
    ),
    'scroll_reach', (
      select jsonb_build_object(
        'sessions', count(*),
        'p25', count(*) filter (where d >= 25),
        'p50', count(*) filter (where d >= 50),
        'p75', count(*) filter (where d >= 75),
        'p100', count(*) filter (where d >= 100))
      from (
        select session_id, max(coalesce(nullif(meta->>'depth', '')::int, 0)) as d
        from ev where event_name = 'scroll_depth' and session_id is not null
        group by session_id
      ) s
    ),
    'forms', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'form', form, 'views', views, 'starts', starts, 'submits', submits,
        'abandonment_rate', case when starts > 0
          then round(greatest(starts - submits, 0)::numeric / starts, 4) end
      ) order by starts desc), '[]'::jsonb)
      from (
        select coalesce(label, '(unlabeled)') as form,
          count(*) filter (where event_name = 'form_view') as views,
          count(*) filter (where event_name = 'form_start') as starts,
          count(*) filter (where event_name = 'form_submit') as submits
        from ev where event_name in ('form_view', 'form_start', 'form_submit')
        group by 1 order by 3 desc limit 15
      ) t
    ),
    'exit_pages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'exits', exits) order by exits desc), '[]'::jsonb)
      from (
        select path, count(*) as exits from ordered_views where rn_last = 1
        group by path order by count(*) desc limit 15
      ) t
    ),
    'landing_pages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'sessions', sessions) order by sessions desc), '[]'::jsonb)
      from (
        select path, count(*) as sessions from ordered_views where rn_first = 1
        group by path order by count(*) desc limit 15
      ) t
    ),
    'pre_conversion_pages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'sessions', c) order by c desc), '[]'::jsonb)
      from (
        select ov.path, count(distinct ov.session_id) as c
        from ordered_views ov
        join converting_sessions cs on cs.session_id = ov.session_id
        group by ov.path order by count(distinct ov.session_id) desc limit 15
      ) t
    ),
    'page_conversion', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'path', path, 'visitors', visitors, 'views', views, 'converters', converters,
        'rate', case when visitors > 0 then round(converters::numeric / visitors, 4) end
      ) order by views desc), '[]'::jsonb)
      from page_conv where views > 0
    )
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: tools analytics. Lead attribution is real: SendResultModal tags tool
-- leads with utm_medium='toolbox' and utm_campaign=<slug>.
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_tools(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  with cur as (
    select tool_slug,
      count(*) filter (where event_name = 'tool_view') as views,
      count(distinct visitor_id) filter (where event_name = 'tool_view') as visitors,
      count(*) filter (where event_name = 'tool_start') as starts,
      count(*) filter (where event_name = 'tool_complete') as completes,
      count(*) filter (where event_name = 'cta_click') as post_ctas
    from analytics_events
    where created_at >= p_from and created_at < p_to
      and not is_internal and tool_slug is not null
    group by tool_slug
  ),
  prev as (
    select tool_slug,
      count(*) filter (where event_name = 'tool_view') as views,
      count(*) filter (where event_name = 'tool_complete') as completes
    from analytics_events
    where created_at >= p_prev_from and created_at < p_prev_to
      and not is_internal and tool_slug is not null
    group by tool_slug
  ),
  tool_leads as (
    select l.utm_campaign as tool_slug, count(*) as leads
    from leads l
    where l.created_at >= p_from and l.created_at < p_to
      and l.is_test = false and l.deleted_at is null
      and l.utm_medium = 'toolbox' and l.utm_campaign is not null
    group by 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'tool', cur.tool_slug,
    'views', cur.views,
    'visitors', cur.visitors,
    'starts', cur.starts,
    'completes', cur.completes,
    'completion_rate', case when cur.starts > 0
      then round(cur.completes::numeric / cur.starts, 4) end,
    'post_completion_ctas', cur.post_ctas,
    'leads', coalesce(tl.leads, 0),
    'prev_views', coalesce(prev.views, 0),
    'prev_completes', coalesce(prev.completes, 0)
  ) order by cur.views desc), '[]'::jsonb)
  into result
  from cur
  left join prev on prev.tool_slug = cur.tool_slug
  left join tool_leads tl on tl.tool_slug = cur.tool_slug;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: funnel with per-stage source + landing attribution.
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_funnel(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz,
  p_filters jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  with ev as (
    select * from analytics_events e
    where e.created_at >= p_from and e.created_at < p_to
      and (coalesce((p_filters->>'include_internal')::boolean, false) or not e.is_internal)
      and (p_filters->>'source' is null or e.source_family = p_filters->>'source')
      and (p_filters->>'campaign' is null or e.utm_campaign = p_filters->>'campaign')
      and (p_filters->>'device' is null or e.device = p_filters->>'device')
      and (p_filters->>'visitor_type' is null or e.visitor_type = p_filters->>'visitor_type')
  ),
  prev_ev as (
    select * from analytics_events e
    where e.created_at >= p_prev_from and e.created_at < p_prev_to
      and (coalesce((p_filters->>'include_internal')::boolean, false) or not e.is_internal)
      and (p_filters->>'source' is null or e.source_family = p_filters->>'source')
      and (p_filters->>'campaign' is null or e.utm_campaign = p_filters->>'campaign')
      and (p_filters->>'device' is null or e.device = p_filters->>'device')
      and (p_filters->>'visitor_type' is null or e.visitor_type = p_filters->>'visitor_type')
  ),
  visitor_landing as (
    select distinct on (visitor_id) visitor_id, path, source_family
    from ev where event_name = 'page_view' and visitor_id is not null
    order by visitor_id, created_at
  ),
  stage_visitors as (
    select
      (select array_agg(distinct visitor_id) from ev where visitor_id is not null) as visitors,
      (select array_agg(distinct visitor_id) from ev where event_name = 'engaged_session' and visitor_id is not null) as engaged,
      (select array_agg(distinct visitor_id) from ev where event_name in
        ('cta_click', 'phone_click', 'sms_click', 'email_click', 'booking_start') and visitor_id is not null) as cta,
      (select array_agg(distinct visitor_id) from ev where event_name in
        ('form_start', 'booking_start') and visitor_id is not null) as starts
  ),
  ld as (
    select count(*) as leads,
      count(*) filter (where status in ('call_booked', 'proposal', 'won')) as booked,
      count(*) filter (where status = 'won') as won,
      mode() within group (order by coalesce(nullif(utm_source, ''), 'direct')) as top_source
    from leads l
    where l.created_at >= p_from and l.created_at < p_to
      and l.is_test = false and l.deleted_at is null
      and (p_filters->>'source' is null
        or public.analytics_source_family(l.utm_source, l.utm_medium, null) = p_filters->>'source')
      and (p_filters->>'campaign' is null or l.utm_campaign = p_filters->>'campaign')
  ),
  prev_ld as (
    select count(*) as leads,
      count(*) filter (where status in ('call_booked', 'proposal', 'won')) as booked,
      count(*) filter (where status = 'won') as won
    from leads l
    where l.created_at >= p_prev_from and l.created_at < p_prev_to
      and l.is_test = false and l.deleted_at is null
      and (p_filters->>'source' is null
        or public.analytics_source_family(l.utm_source, l.utm_medium, null) = p_filters->>'source')
      and (p_filters->>'campaign' is null or l.utm_campaign = p_filters->>'campaign')
  )
  select jsonb_build_object(
    'stages', jsonb_build_array(
      jsonb_build_object('key', 'visitors', 'label', 'Visitors',
        'count', coalesce(array_length(sv.visitors, 1), 0),
        'prev', (select count(distinct visitor_id) from prev_ev where visitor_id is not null),
        'top_source', (select source_family from visitor_landing group by source_family order by count(*) desc limit 1),
        'top_landing', (select path from visitor_landing group by path order by count(*) desc limit 1)),
      jsonb_build_object('key', 'engaged', 'label', 'Engaged visitors',
        'count', coalesce(array_length(sv.engaged, 1), 0),
        'prev', (select count(distinct visitor_id) from prev_ev where event_name = 'engaged_session' and visitor_id is not null),
        'top_source', (select vl.source_family from visitor_landing vl where vl.visitor_id = any(sv.engaged) group by 1 order by count(*) desc limit 1),
        'top_landing', (select vl.path from visitor_landing vl where vl.visitor_id = any(sv.engaged) group by 1 order by count(*) desc limit 1)),
      jsonb_build_object('key', 'cta', 'label', 'CTA actions',
        'count', coalesce(array_length(sv.cta, 1), 0),
        'prev', (select count(distinct visitor_id) from prev_ev where event_name in
          ('cta_click', 'phone_click', 'sms_click', 'email_click', 'booking_start') and visitor_id is not null),
        'top_source', (select vl.source_family from visitor_landing vl where vl.visitor_id = any(sv.cta) group by 1 order by count(*) desc limit 1),
        'top_landing', (select vl.path from visitor_landing vl where vl.visitor_id = any(sv.cta) group by 1 order by count(*) desc limit 1)),
      jsonb_build_object('key', 'starts', 'label', 'Form + booking starts',
        'count', coalesce(array_length(sv.starts, 1), 0),
        'prev', (select count(distinct visitor_id) from prev_ev where event_name in
          ('form_start', 'booking_start') and visitor_id is not null),
        'top_source', (select vl.source_family from visitor_landing vl where vl.visitor_id = any(sv.starts) group by 1 order by count(*) desc limit 1),
        'top_landing', (select vl.path from visitor_landing vl where vl.visitor_id = any(sv.starts) group by 1 order by count(*) desc limit 1)),
      jsonb_build_object('key', 'leads', 'label', 'Leads',
        'count', ld.leads, 'prev', prev_ld.leads, 'top_source', ld.top_source),
      jsonb_build_object('key', 'booked', 'label', 'Booked calls',
        'count', ld.booked, 'prev', prev_ld.booked, 'top_source', ld.top_source,
        'note', 'Leads created in this period currently at call_booked, proposal, or won.'),
      jsonb_build_object('key', 'won', 'label', 'Won clients',
        'count', ld.won, 'prev', prev_ld.won)
    ),
    'generated_at', now()
  ) into result
  from stage_visitors sv, ld, prev_ld;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: live feed + active-now. Event rows are already PII-free; ids are
-- still stripped so the feed can be shown on a screen without leaking
-- correlation handles.
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_live(p_limit integer default 40)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'at', created_at,
    'event', event_name,
    'path', path,
    'label', label,
    'tool', tool_slug,
    'device', device,
    'source', source_family,
    'country', country,
    'region', region
  ) order by created_at desc), '[]'::jsonb)
  into result
  from (
    select * from analytics_events
    where not is_internal
    order by created_at desc
    limit least(greatest(p_limit, 1), 100)
  ) recent;

  return result;
end;
$$;

create or replace function public.admin_analytics_active()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  select jsonb_build_object(
    'active_visitors', (
      select count(distinct visitor_id) from analytics_events
      where created_at > now() - interval '5 minutes' and not is_internal and visitor_id is not null
    ),
    'pages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'visitors', v) order by v desc), '[]'::jsonb)
      from (
        select path, count(distinct visitor_id) as v from analytics_events
        where created_at > now() - interval '5 minutes' and not is_internal and visitor_id is not null
        group by path order by count(distinct visitor_id) desc limit 10
      ) t
    ),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: SEO / Search Console rollup. Everything here reads snapshots synced
-- by the cron; when nothing is synced the function reports connected=false
-- rather than inventing numbers.
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_seo(p_days integer default 28)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  result jsonb;
  last_date date;
  cur_from date;
  prev_from date;
  brand_pattern text;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  select max(date) into last_date from gsc_site_daily;
  if last_date is null then
    return jsonb_build_object(
      'connected', false,
      'integration', (select to_jsonb(ai) from analytics_integrations ai where ai.key = 'search_console'),
      'index_summary', (
        select coalesce(jsonb_agg(jsonb_build_object('verdict', verdict, 'count', c)), '[]'::jsonb)
        from (select coalesce(verdict, 'awaiting_data') as verdict, count(*) as c from url_inspections group by 1) t
      ),
      'inspections', (
        select coalesce(jsonb_agg(to_jsonb(ui) order by ui.url), '[]'::jsonb) from url_inspections ui
      )
    );
  end if;

  cur_from := last_date - (p_days - 1);
  prev_from := cur_from - p_days;

  select '(' || string_agg(regexp_replace(trim(term), '([.*+?^${}()|\[\]\\])', '\\\1', 'g'), '|') || ')'
  into brand_pattern
  from unnest(string_to_array(coalesce(
    (select value from site_settings where key = 'seo_brand_terms'),
    'leadflow'), ',')) as term
  where trim(term) <> '';

  with cur as (
    select sum(clicks) as clicks, sum(impressions) as impressions,
      case when sum(impressions) > 0
        then sum(coalesce(position, 0) * impressions) / sum(impressions) end as position
    from gsc_site_daily where date >= cur_from and date <= last_date
  ),
  prev as (
    select sum(clicks) as clicks, sum(impressions) as impressions,
      case when sum(impressions) > 0
        then sum(coalesce(position, 0) * impressions) / sum(impressions) end as position
    from gsc_site_daily where date >= prev_from and date < cur_from
  ),
  qcur as (
    select query, sum(clicks) as clicks, sum(impressions) as impressions,
      case when sum(impressions) > 0
        then sum(coalesce(position, 0) * impressions) / sum(impressions) end as position
    from gsc_query_daily where date >= cur_from and date <= last_date group by query
  ),
  qprev as (
    select query, sum(clicks) as clicks, sum(impressions) as impressions,
      case when sum(impressions) > 0
        then sum(coalesce(position, 0) * impressions) / sum(impressions) end as position
    from gsc_query_daily where date >= prev_from and date < cur_from group by query
  ),
  pcur as (
    select page, sum(clicks) as clicks, sum(impressions) as impressions,
      case when sum(impressions) > 0
        then sum(coalesce(position, 0) * impressions) / sum(impressions) end as position
    from gsc_page_daily where date >= cur_from and date <= last_date group by page
  ),
  pprev as (
    select page, sum(clicks) as clicks, sum(impressions) as impressions,
      case when sum(impressions) > 0
        then sum(coalesce(position, 0) * impressions) / sum(impressions) end as position
    from gsc_page_daily where date >= prev_from and date < cur_from group by page
  )
  select jsonb_build_object(
    'connected', true,
    'last_data_date', last_date,
    'window_days', p_days,
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', date, 'clicks', clicks, 'impressions', impressions,
        'position', case when position is not null then round(position::numeric, 1) end) order by date), '[]'::jsonb)
      from gsc_site_daily where date >= prev_from and date <= last_date
    ),
    'totals', (select jsonb_build_object(
      'clicks', coalesce(clicks, 0), 'impressions', coalesce(impressions, 0),
      'ctr', case when coalesce(impressions, 0) > 0 then round(clicks::numeric / impressions, 4) end,
      'position', case when position is not null then round(position::numeric, 1) end) from cur),
    'prev_totals', (select jsonb_build_object(
      'clicks', coalesce(clicks, 0), 'impressions', coalesce(impressions, 0),
      'ctr', case when coalesce(impressions, 0) > 0 then round(clicks::numeric / impressions, 4) end,
      'position', case when position is not null then round(position::numeric, 1) end) from prev),
    'query_count', (select count(*) from qcur where impressions > 0),
    'page_count', (select count(*) from pcur where impressions > 0),
    'branded', (select jsonb_build_object('clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0))
      from qcur where brand_pattern is not null and query ~* brand_pattern),
    'nonbranded', (select jsonb_build_object('clicks', coalesce(sum(clicks), 0), 'impressions', coalesce(sum(impressions), 0))
      from qcur where brand_pattern is null or query !~* brand_pattern),
    'top_queries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'query', q.query, 'clicks', q.clicks, 'impressions', q.impressions,
        'position', case when q.position is not null then round(q.position::numeric, 1) end,
        'prev_position', case when qp.position is not null then round(qp.position::numeric, 1) end)
        order by q.clicks desc, q.impressions desc), '[]'::jsonb)
      from (select * from qcur order by clicks desc, impressions desc limit 25) q
      left join qprev qp on qp.query = q.query
    ),
    'rising_queries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'query', q.query, 'position', round(q.position::numeric, 1),
        'prev_position', round(qp.position::numeric, 1),
        'impressions', q.impressions) order by (qp.position - q.position) desc), '[]'::jsonb)
      from qcur q join qprev qp on qp.query = q.query
      where q.position is not null and qp.position is not null and qp.position - q.position >= 1
        and q.impressions >= 5
      limit 15
    ),
    'falling_queries', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'query', q.query, 'position', round(q.position::numeric, 1),
        'prev_position', round(qp.position::numeric, 1),
        'impressions', q.impressions) order by (q.position - qp.position) desc), '[]'::jsonb)
      from qcur q join qprev qp on qp.query = q.query
      where q.position is not null and qp.position is not null and q.position - qp.position >= 1
        and q.impressions >= 5
      limit 15
    ),
    'rising_pages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'page', p.page, 'clicks', p.clicks, 'prev_clicks', coalesce(pp.clicks, 0),
        'impressions', p.impressions) order by (p.clicks - coalesce(pp.clicks, 0)) desc), '[]'::jsonb)
      from pcur p left join pprev pp on pp.page = p.page
      where p.clicks > coalesce(pp.clicks, 0)
      limit 15
    ),
    'falling_pages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'page', pp.page, 'clicks', coalesce(p.clicks, 0), 'prev_clicks', pp.clicks,
        'impressions', coalesce(p.impressions, 0)) order by (pp.clicks - coalesce(p.clicks, 0)) desc), '[]'::jsonb)
      from pprev pp left join pcur p on p.page = pp.page
      where pp.clicks > coalesce(p.clicks, 0)
      limit 15
    ),
    'pages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'page', p.page, 'clicks', p.clicks, 'impressions', p.impressions,
        'ctr', case when p.impressions > 0 then round(p.clicks::numeric / p.impressions, 4) end,
        'position', case when p.position is not null then round(p.position::numeric, 1) end,
        'prev_position', case when pp.position is not null then round(pp.position::numeric, 1) end,
        'prev_clicks', coalesce(pp.clicks, 0),
        'prev_impressions', coalesce(pp.impressions, 0))
        order by p.clicks desc, p.impressions desc), '[]'::jsonb)
      from pcur p left join pprev pp on pp.page = p.page
    ),
    'index_summary', (
      select coalesce(jsonb_agg(jsonb_build_object('verdict', verdict, 'count', c)), '[]'::jsonb)
      from (select coalesce(verdict, 'awaiting_data') as verdict, count(*) as c from url_inspections group by 1) t
    ),
    'inspections', (
      select coalesce(jsonb_agg(to_jsonb(ui) order by ui.url), '[]'::jsonb) from url_inspections ui
    ),
    'integration', (select to_jsonb(ai) from analytics_integrations ai where ai.key = 'search_console')
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: filter dropdown options + integration health.
-- ---------------------------------------------------------------------------

create or replace function public.admin_analytics_filters(
  p_from timestamptz,
  p_to timestamptz
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'admin only'; end if;

  select jsonb_build_object(
    'paths', (
      select coalesce(jsonb_agg(p order by p), '[]'::jsonb) from (
        select distinct path as p from analytics_events
        where created_at >= p_from and created_at < p_to and event_name = 'page_view'
        limit 200
      ) t
    ),
    'sources', (
      select coalesce(jsonb_agg(s order by s), '[]'::jsonb) from (
        select distinct source_family as s from analytics_events
        where created_at >= p_from and created_at < p_to and source_family is not null
        limit 40
      ) t
    ),
    'campaigns', (
      select coalesce(jsonb_agg(c order by c), '[]'::jsonb) from (
        select distinct utm_campaign as c from analytics_events
        where created_at >= p_from and created_at < p_to and utm_campaign is not null
        limit 100
      ) t
    ),
    'integrations', (
      select coalesce(jsonb_agg(to_jsonb(ai) order by ai.key), '[]'::jsonb) from analytics_integrations ai
    )
  ) into result;

  return result;
end;
$$;

-- Lock the admin surface down: only signed-in users may even attempt these,
-- and the is_admin() check inside decides.
do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_analytics_overview(timestamptz, timestamptz, timestamptz, timestamptz, jsonb)',
    'admin_analytics_timeseries(timestamptz, timestamptz, text, text, jsonb)',
    'admin_analytics_acquisition(timestamptz, timestamptz, jsonb)',
    'admin_analytics_pages(timestamptz, timestamptz, timestamptz, timestamptz, jsonb)',
    'admin_analytics_page_detail(text, timestamptz, timestamptz, text)',
    'admin_analytics_behavior(timestamptz, timestamptz, jsonb)',
    'admin_analytics_tools(timestamptz, timestamptz, timestamptz, timestamptz)',
    'admin_analytics_funnel(timestamptz, timestamptz, timestamptz, timestamptz, jsonb)',
    'admin_analytics_live(integer)',
    'admin_analytics_active()',
    'admin_analytics_seo(integer)',
    'admin_analytics_filters(timestamptz, timestamptz)'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated, service_role', fn);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- PUBLIC: sanitized aggregate metrics for /live. anon-executable by design.
-- Returns nulls (never fabrications) when a metric is disabled, below the
-- privacy threshold, or its source is not connected.
-- ---------------------------------------------------------------------------

create or replace function public.public_live_metrics()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  tz constant text := 'America/Chicago';
  enabled boolean;
  show_leads boolean;
  thresh integer;
  today_start timestamptz;
  last_gsc date;
  result jsonb;
begin
  enabled := coalesce((select value from site_settings where key = 'live_public_enabled'), 'on') <> 'off';
  if not enabled then
    return jsonb_build_object('enabled', false);
  end if;

  show_leads := coalesce((select value from site_settings where key = 'live_show_leads'), 'off') = 'on';
  thresh := coalesce(nullif((select value from site_settings where key = 'live_min_threshold'), '')::integer, 3);
  today_start := date_trunc('day', now() at time zone tz) at time zone tz;
  select max(date) into last_gsc from gsc_site_daily;

  with ev as (
    select * from analytics_events
    where created_at > now() - interval '30 days' and not is_internal
  ),
  ev_today as (select * from ev where created_at >= today_start),
  ev_yesterday as (
    select * from ev
    where created_at >= today_start - interval '1 day' and created_at < today_start
  ),
  prev30 as (
    select count(distinct visitor_id) as visitors
    from analytics_events
    where created_at > now() - interval '60 days'
      and created_at <= now() - interval '30 days'
      and not is_internal and visitor_id is not null
  )
  select jsonb_build_object(
    'enabled', true,
    'visitors_today', (select count(distinct visitor_id) from ev_today where visitor_id is not null),
    'visitors_yesterday', (select count(distinct visitor_id) from ev_yesterday where visitor_id is not null),
    'visitors_30d', (select count(distinct visitor_id) from ev where visitor_id is not null),
    'visitors_prev_30d', (select visitors from prev30),
    'pageviews_today', (select count(*) from ev_today where event_name = 'page_view'),
    'pageviews_30d', (select count(*) from ev where event_name = 'page_view'),
    'actions_today', (select count(*) from ev_today where event_name not in
      ('page_view', 'page_engagement', 'session_start', 'engaged_session', 'scroll_depth', 'form_view', 'tool_view')),
    'actions_30d', (select count(*) from ev where event_name not in
      ('page_view', 'page_engagement', 'session_start', 'engaged_session', 'scroll_depth', 'form_view', 'tool_view')),
    'active_now', (select count(distinct visitor_id) from analytics_events
      where created_at > now() - interval '5 minutes' and not is_internal and visitor_id is not null),
    'cta_clicks_30d', (select count(*) from ev where event_name in
      ('cta_click', 'phone_click', 'sms_click', 'email_click')),
    'tool_sessions_today', (select count(distinct session_id) from ev_today
      where tool_slug is not null and session_id is not null),
    'tool_completions_30d', (select count(*) from ev where event_name = 'tool_complete'),
    'tool_views_30d', (select count(*) from ev where event_name = 'tool_view'),
    'leads_today', case when show_leads then
      (select count(*) from leads where created_at >= today_start and is_test = false and deleted_at is null) end,
    'leads_30d', case when show_leads then
      (select count(*) from leads where created_at > now() - interval '30 days' and is_test = false and deleted_at is null) end,
    'consultations_requested_30d', case when show_leads then
      (select count(*) from leads where created_at > now() - interval '30 days'
        and is_test = false and deleted_at is null
        and status in ('call_booked', 'proposal', 'won')) end,
    'top_page_7d', (
      select jsonb_build_object('path', path, 'views', views) from (
        select path, count(*) as views from ev
        where event_name = 'page_view'
          and created_at > now() - interval '7 days'
          and public.analytics_is_public_path(path)
        group by path order by count(*) desc limit 1
      ) t where views >= thresh
    ),
    'top_tool_30d', (
      select jsonb_build_object('tool', tool_slug, 'uses', uses) from (
        select tool_slug, count(*) as uses from ev
        where tool_slug is not null and event_name in ('tool_start', 'tool_complete')
        group by tool_slug order by count(*) desc limit 1
      ) t where uses >= thresh
    ),
    'funnel_30d', jsonb_build_object(
      'visitors', (select count(distinct visitor_id) from ev where visitor_id is not null),
      'engaged', (select count(distinct visitor_id) from ev where event_name = 'engaged_session' and visitor_id is not null),
      'cta_actions', (select count(distinct visitor_id) from ev where event_name in
        ('cta_click', 'phone_click', 'sms_click', 'email_click', 'booking_start') and visitor_id is not null),
      'conversations_started', (select count(distinct visitor_id) from ev where event_name in
        ('form_start', 'booking_start') and visitor_id is not null),
      'leads', case when show_leads then
        (select count(*) from leads where created_at > now() - interval '30 days' and is_test = false and deleted_at is null) end
    ),
    'gsc', case when last_gsc is null then null else (
      select jsonb_build_object(
        'clicks_28d', cur.clicks, 'prev_clicks_28d', prev.clicks,
        'impressions_28d', cur.impressions, 'prev_impressions_28d', prev.impressions,
        'position_28d', case when cur.position is not null then round(cur.position::numeric, 1) end,
        'prev_position_28d', case when prev.position is not null then round(prev.position::numeric, 1) end,
        'last_data_date', last_gsc)
      from (
        select sum(clicks) as clicks, sum(impressions) as impressions,
          case when sum(impressions) > 0 then sum(coalesce(position, 0) * impressions) / sum(impressions) end as position
        from gsc_site_daily where date > last_gsc - 28 and date <= last_gsc
      ) cur, (
        select sum(clicks) as clicks, sum(impressions) as impressions,
          case when sum(impressions) > 0 then sum(coalesce(position, 0) * impressions) / sum(impressions) end as position
        from gsc_site_daily where date > last_gsc - 56 and date <= last_gsc - 28
      ) prev
    ) end,
    'index_coverage', (
      select case when count(*) = 0 then null else jsonb_build_object(
        'monitored', count(*),
        'indexed', count(*) filter (where verdict = 'indexed')) end
      from url_inspections
    ),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- PUBLIC: sanitized, delayed activity feed. No identifiers, no private paths,
-- coarse timestamps, allowlisted event kinds only, and silence below the
-- minimum-volume threshold.
-- ---------------------------------------------------------------------------

create or replace function public.public_live_feed(p_limit integer default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  enabled boolean;
  thresh integer;
  delay_s integer;
  qualifying integer;
  result jsonb;
begin
  enabled := coalesce((select value from site_settings where key = 'live_public_enabled'), 'on') <> 'off'
    and coalesce((select value from site_settings where key = 'live_feed_enabled'), 'on') <> 'off';
  if not enabled then
    return '[]'::jsonb;
  end if;

  thresh := coalesce(nullif((select value from site_settings where key = 'live_min_threshold'), '')::integer, 3);
  delay_s := coalesce(nullif((select value from site_settings where key = 'live_feed_delay_seconds'), '')::integer, 90);

  select count(*) into qualifying
  from analytics_events
  where created_at > now() - interval '24 hours'
    and created_at < now() - make_interval(secs => delay_s)
    and not is_internal
    and (
      event_name in ('tool_view', 'tool_start', 'tool_complete', 'cta_click',
        'form_start', 'form_submit', 'booking_start', 'booking_complete',
        'phone_click', 'sms_click', 'email_click')
      or (event_name = 'session_start' and source_family in
        ('google', 'search_other', 'facebook', 'instagram', 'x', 'linkedin', 'youtube', 'tiktok'))
    );

  if qualifying < thresh then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'at', to_char(date_trunc('minute', created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:00"Z"'),
    'kind', event_name,
    'path', case when public.analytics_is_public_path(path) then path end,
    'tool', tool_slug,
    'device', device,
    'source', source_family
  ) order by created_at desc), '[]'::jsonb)
  into result
  from (
    select * from analytics_events
    where created_at > now() - interval '24 hours'
      and created_at < now() - make_interval(secs => delay_s)
      and not is_internal
      and (
        event_name in ('tool_view', 'tool_start', 'tool_complete', 'cta_click',
          'form_start', 'form_submit', 'booking_start', 'booking_complete',
          'phone_click', 'sms_click', 'email_click')
        or (event_name = 'session_start' and source_family in
          ('google', 'search_other', 'facebook', 'instagram', 'x', 'linkedin', 'youtube', 'tiktok'))
      )
    order by created_at desc
    limit least(greatest(p_limit, 1), 20)
  ) recent;

  return result;
end;
$$;

grant execute on function public.public_live_metrics() to anon, authenticated, service_role;
grant execute on function public.public_live_feed(integer) to anon, authenticated, service_role;
