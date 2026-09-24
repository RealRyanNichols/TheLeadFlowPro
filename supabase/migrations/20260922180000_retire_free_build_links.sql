-- The free website build offer was retired on 2026-09-22. /free-build is now a
-- permanent 301 to /services (next.config.ts), but eight lesson sentences and
-- one analytics setting still point at it. This rewrites only those strings.
--
-- Lessons: the live text is lessons.content, seeded from content/academy/*.md
-- by 20260903020000_operator_academy_real_lessons.sql. The markdown files carry
-- the same new sentences. Each update is scoped to one course and lesson slug
-- and only touches a row that still contains the old sentence, so running this
-- twice changes nothing the second time.
--
-- Settings: site_settings.inspect_urls (seeded in 20260813150000) is a
-- comma-separated path list read by the analytics cron. /free-build becomes
-- /services, duplicates are dropped, order is kept, and nothing else changes.

begin;

update public.lessons l
set content = replace(l.content, 'When you want the real thing live on your own domain, that is what /free-build is for.', 'When you want the real thing live on your own domain, that is what the Website Launch at /packages/launch is for.')
from public.courses c
where c.id = l.course_id and c.slug = 'chatgpt-operator' and l.slug = 'build-a-working-one-page-landing-page'
  and strpos(l.content, 'When you want the real thing live on your own domain, that is what /free-build is for.') > 0;

update public.lessons l
set content = replace(l.content, 'the Tool Studio at /go/tools, and the free website build at /free-build if you need the front door.', 'the Tool Studio at /go/tools, and the five-page Website Launch at /packages/launch if you need the front door.')
from public.courses c
where c.id = l.course_id and c.slug = 'company-os-blueprint' and l.slug = 'build-the-phased-roadmap'
  and strpos(l.content, 'the Tool Studio at /go/tools, and the free website build at /free-build if you need the front door.') > 0;

update public.lessons l
set content = replace(l.content, 'If you do not have a site that can hold a page like this, the free website build at /free-build is where I would start.', 'If you do not have a site that can hold a page like this, the five-page Website Launch at /packages/launch is where I would start.')
from public.courses c
where c.id = l.course_id and c.slug = 'lead-capture-system' and l.slug = 'build-the-thank-you-path'
  and strpos(l.content, 'If you do not have a site that can hold a page like this, the free website build at /free-build is where I would start.') > 0;

update public.lessons l
set content = replace(l.content, 'If you got a site through /free-build, this is already how it is wired.', 'If I built your site (see /services), this is already how it is wired.')
from public.courses c
where c.id = l.course_id and c.slug = 'lead-capture-system' and l.slug = 'create-one-lead-record'
  and strpos(l.content, 'If you got a site through /free-build, this is already how it is wired.') > 0;

update public.lessons l
set content = replace(l.content, 'If you need a page and do not have a site to put it on, /free-build is where I build the first working version.', 'If you need a page and do not have a site to put it on, the Website Launch at /packages/launch is where I build the first working version.')
from public.courses c
where c.id = l.course_id and c.slug = 'local-ads-operator' and l.slug = 'build-the-ad-landing-page'
  and strpos(l.content, 'If you need a page and do not have a site to put it on, /free-build is where I build the first working version.') > 0;

update public.lessons l
set content = replace(l.content, 'If you do not have a page you control yet, the free build at /free-build exists for exactly this: one page, on your domain, that you own.', 'If you do not have a page you control yet, the Website Launch at /packages/launch exists for exactly this: pages on your own domain that you own.')
from public.courses c
where c.id = l.course_id and c.slug = 'offer-engine' and l.slug = 'write-the-offer-page'
  and strpos(l.content, 'If you do not have a page you control yet, the free build at /free-build exists for exactly this: one page, on your domain, that you own.') > 0;

update public.lessons l
set content = replace(l.content, 'put it on a domain you own; use /free-build if you have nothing yet.', 'put it on a domain you own; see /services if you have nothing yet.')
from public.courses c
where c.id = l.course_id and c.slug = 'offer-engine' and l.slug = 'write-the-offer-page'
  and strpos(l.content, 'put it on a domain you own; use /free-build if you have nothing yet.') > 0;

update public.lessons l
set content = replace(l.content, 'If you would rather have the first version built with you, /free-build is the free website build, and this lesson still applies to checking what comes back.', 'If you would rather have the first version built for you, /services shows what we build, and this lesson still applies to checking what comes back.')
from public.courses c
where c.id = l.course_id and c.slug = 'website-conversion-system' and l.slug = 'build-the-interaction'
  and strpos(l.content, 'If you would rather have the first version built with you, /free-build is the free website build, and this lesson still applies to checking what comes back.') > 0;

update public.site_settings s
set value = (
  select string_agg(deduped.path, ', ' order by deduped.first_position)
  from (
    select mapped.path, min(mapped.position) as first_position
    from (
      select
        case
          when btrim(item.path) = '/free-build' or btrim(item.path) like '/free-build/%' then '/services'
          else btrim(item.path)
        end as path,
        item.position
      from regexp_split_to_table(s.value, ',') with ordinality as item(path, position)
    ) mapped
    where mapped.path <> ''
    group by mapped.path
  ) deduped
)
where s.key = 'inspect_urls'
  and s.value ~ '(^|,)[[:space:]]*/free-build(/[^,]*)?[[:space:]]*(,|$)';

commit;
