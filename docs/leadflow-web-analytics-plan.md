# LeadFlow Web Analytics: Implementation Plan

One shared first-party analytics data layer in the existing Supabase project, with
two permission-scoped projections: the private admin command center at
`/admin/analytics` and the public proof dashboard at `/live`.

## What already exists (audit, Aug 13 2026)

- Next.js 15 App Router, React 19, Tailwind 3, TypeScript, lucide-react. No chart
  library; charts are hand-rolled SVG (components/charts). Node `--test` for tests.
- Supabase (project `hpzpwfymwfgwspaixrxi`) with SSR auth. Admin = `profiles.role =
  'admin'`, enforced by middleware + `/admin` layout + `is_admin()` SQL helper.
- First-party page tracking: `TrackingScripts.tsx` → `POST /api/track` →
  `public.page_views` (anon insert, admin-only select; 1,345 real rows).
- `analytics_summary(days)` admin RPC feeding the old `/admin/analytics` page.
- Tool analytics: `lib/tools/analytics.ts` sends sanitized tool events to Vercel
  Analytics + gtag only (no first-party store).
- Lead CRM: `public.leads` with statuses `new, contacted, call_booked, proposal,
  won, lost`, UTM attribution, `is_test` flag.
- Settings: `public.site_settings` key/value (public read, admin write), edited at
  `/admin/settings`.
- Crons via vercel.json guarded by `CRON_SECRET`; service role key configured.
- Meta Pixel + optional gtag from settings; Vercel Analytics + Speed Insights.
- No Search Console, PostHog, or Clarity integration. No GSC credentials.
- Legacy `SitePulseEvent` table (stale, no code references) — left untouched.

## Build

1. **Migration `leadflow_web_analytics`**: `analytics_events` (validated, RLS:
   anon insert w/ PII-key blocklist, admin-only select), backfill from
   `page_views`, GSC snapshot tables (`gsc_site_daily`, `gsc_page_daily`,
   `gsc_query_daily`, `gsc_page_query_daily`), `url_inspections`,
   `analytics_integrations`, admin RPCs (overview, timeseries, acquisition,
   pages, page detail, behavior, tools, funnel, live, seo), public sanitized RPCs
   (`public_live_metrics`, `public_live_feed`) with delay + minimum-volume
   threshold + public-path allowlist, `analytics_purge` retention. Old
   `page_views` writes continue (nothing breaks); new reads come from
   `analytics_events`.
2. **Tracker**: `lib/analytics/` client module — visitor/session ids, UTM
   persistence, batching via sendBeacon, auto page_view / session_start /
   engaged_session / page_engagement / scroll_depth / cta_click /
   navigation_click / outbound_click / phone_click / sms_click / email_click /
   form_view / form_start / form_submit / booking events, tool events forwarded
   from `lib/tools/analytics.ts`. `/api/track` v2: batch endpoint, bot filter,
   internal-traffic flag (admin cookie), Vercel geo headers (country/region only
   — never IP), rate limiting, strict validation. Server-side `lead_created`
   events from the lead APIs (attribution only, no PII).
3. **Admin command center** `/admin/analytics`: filter bar (live/today/…/custom,
   page, source, campaign, device, new vs returning), ~24 metric cards with
   prior-period deltas, direction-aware coloring and tooltips, live feed, tabs
   for Acquisition / Behavior / Pages (sortable + drilldown) / Tools / Funnel /
   SEO & Indexing / Settings health. Charts stay dependency-free SVG.
4. **Public** `/live`: hero, live status, aggregated privacy-safe metrics,
   sanitized delayed activity feed, funnel, tools, organic growth (or honest
   "not connected" state), operator proof from editable settings (hidden until
   filled), CTAs, full SEO metadata. Reads only public RPC projections through a
   cached server route — raw events are never client-queryable.
5. **GSC layer**: service-account JWT (node:crypto, no new deps), env
   `GSC_CLIENT_EMAIL` / `GSC_PRIVATE_KEY` / `GSC_SITE_URL`, daily cron
   `/api/cron/analytics` (GSC sync + URL inspection for priority pages + event
   retention purge), integration health rows, exact setup instructions in the
   admin UI when disconnected.
6. **Config**: new keys in `site_settings` (public metric toggles incl. the
   leads metric — off by default, min-threshold, feed delay, proof stats,
   inspected URLs, brand terms). Edited from `/admin/settings`.
7. **Tests**: node --test for event validation, meta sanitization, source
   classification, trend/direction math (incl. Google position where lower is
   better), public feed sanitizer, funnel math. Then lint, build, screenshots.

## Non-goals

No session replay / heatmaps (integration plan documented instead), no new
analytics vendors, no fake data anywhere — empty states say "Collecting data" /
"Search Console not connected".
