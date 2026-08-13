-- Public daily series + top-lists for /live. Same sanitization contract as
-- public_live_metrics: aggregates only, public paths only, thresholded,
-- internal traffic excluded, disabled entirely by the live_public_enabled switch.

create or replace function public.public_live_series()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  tz constant text := 'America/Chicago';
  enabled boolean;
  thresh integer;
  result jsonb;
begin
  enabled := coalesce((select value from site_settings where key = 'live_public_enabled'), 'on') <> 'off';
  if not enabled then
    return jsonb_build_object('enabled', false);
  end if;
  thresh := coalesce(nullif((select value from site_settings where key = 'live_min_threshold'), '')::integer, 3);

  select jsonb_build_object(
    'enabled', true,
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day, 'visitors', coalesce(e.visitors, 0), 'actions', coalesce(e.actions, 0)) order by d.day), '[]'::jsonb)
      from (
        select generate_series(
          (now() at time zone tz)::date - 29,
          (now() at time zone tz)::date,
          interval '1 day'
        )::date as day
      ) d
      left join (
        select (created_at at time zone tz)::date as day,
          count(distinct visitor_id) filter (where visitor_id is not null) as visitors,
          count(*) filter (where event_name not in
            ('page_view', 'page_engagement', 'session_start', 'engaged_session', 'scroll_depth', 'form_view', 'tool_view')) as actions
        from analytics_events
        where created_at > now() - interval '31 days' and not is_internal
        group by 1
      ) e on e.day = d.day
    ),
    'top_pages', (
      select coalesce(jsonb_agg(jsonb_build_object('path', path, 'views', views) order by views desc), '[]'::jsonb)
      from (
        select path, count(*) as views from analytics_events
        where created_at > now() - interval '7 days' and not is_internal
          and event_name = 'page_view' and public.analytics_is_public_path(path)
        group by path having count(*) >= greatest(thresh, 1)
        order by count(*) desc limit 6
      ) t
    ),
    'top_tools', (
      select coalesce(jsonb_agg(jsonb_build_object('tool', tool_slug, 'uses', uses) order by uses desc), '[]'::jsonb)
      from (
        select tool_slug, count(*) as uses from analytics_events
        where created_at > now() - interval '30 days' and not is_internal
          and tool_slug is not null
          and event_name in ('tool_view', 'tool_start', 'tool_complete')
        group by tool_slug having count(*) >= greatest(thresh, 1)
        order by count(*) desc limit 6
      ) t
    ),
    'generated_at', now()
  ) into result;

  return result;
end;
$$;

grant execute on function public.public_live_series() to anon, authenticated, service_role;
