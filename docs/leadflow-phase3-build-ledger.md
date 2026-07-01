# LeadFlow Phase 3 Build Ledger

Last updated: 2026-07-01

## Current Active Checkpoint

Active prompt completed in this pass:

- Internal admin review dashboard at `/dashboard`.
- Admin-only access enforced in middleware and dashboard layout.
- Server-side admin review API added at `/api/leadflow/admin-review`.
- Dashboard loader added for lead profiles, marketplace listings, submitted sources, buyer requests, source proof, suppression requests, exports, audit log, and events.
- Dashboard UI added for overview metrics, filters, status badges, score badges, risk badges, tables, safe bulk actions, and confirmed sensitive actions.
- Admin actions write audit rows and server-side events when Supabase Data API env vars are configured.
- Safe fallback rows render when Supabase Data API env vars are missing.

## Implemented Files For This Checkpoint

- `src/app/dashboard/page.tsx`
- `src/app/dashboard/AdminReviewDashboardClient.tsx`
- `src/app/api/leadflow/admin-review/route.ts`
- `src/lib/admin-review-dashboard.ts`
- `src/components/dashboard/Sidebar.tsx`
- `src/app/dashboard/layout.tsx`
- `src/middleware.ts`
- `src/lib/leadflow-events.ts`
- `src/lib/leadflow-events-client.ts`

## Verification

- TypeScript: `./node_modules/.bin/tsc --noEmit` passed.
- Lint: `./node_modules/.bin/next lint` passed with existing image warnings outside this dashboard work.
- Link audit: `node scripts/audit-internal-links.mjs` passed.
- Prisma generate: `./node_modules/.bin/prisma generate` passed.
- Build: `./node_modules/.bin/next build` passed.
- Runtime probe: unauthenticated `/dashboard` redirects to `/login`.
- Runtime probe: unauthenticated `/api/leadflow/admin-review` returns `401`.
- Runtime probe: `/submit-source` returns `200` after clearing stale `.next`.
- Runtime probe: `/marketplace` returns `200`.

## Known Non-Blocking Issues

- Build prints existing Prisma warnings for pages that query Prisma without `DATABASE_URL` during static generation. The build exits successfully.
- `next lint` prints existing `<img>` warnings in `src/app/story/page.tsx` and `src/components/flowcard/FlowCardView.tsx`.
- Live Supabase writes require `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- NextAuth admin gates require `NEXTAUTH_SECRET` or `AUTH_SECRET`.
- Existing dashboard subroutes under `/dashboard/*` are now admin-only because the current prompt explicitly made `/dashboard` admin-only.

## Next Recommended Continuation

Continue with controlled export and buyer delivery or Segment Builder. The admin review console is now the control surface those features should plug into.

## Controlled Exports Checkpoint

Completed in this pass:

- Buyer export route added at `/buyer/exports`.
- Admin export route added at `/dashboard/exports`.
- Export creation API added at `/api/leadflow/exports`.
- Protected export download route added at `/api/leadflow/exports/[id]/download`.
- Export engine added with entitlement checks, allowed-use confirmation, field-group scoping, suppression blocking, high-risk blocking, audit logging, and event logging.
- Buyer exports are limited to approved entitlements and cannot request admin-only fields.
- Buyer exports are CSV-only. JSON export generation and download are admin-only.
- Buyer downloads recheck active entitlement at download time, not only at export creation time.
- Contact fields require stronger entitlement levels: `full_profile`, `raw_export`, or `exclusive`.
- Admin exports require a reason and confirmation that only needed fields are being exported.
- Download files are generated server-side through a protected route with expiration checks instead of public bucket URLs.
- Migration added for controlled export metadata and per-profile `export_items`.

Implemented files for this checkpoint:

- `src/lib/leadflow-export.ts`
- `src/app/api/leadflow/exports/route.ts`
- `src/app/api/leadflow/exports/[id]/download/route.ts`
- `src/app/buyer/exports/page.tsx`
- `src/app/buyer/exports/BuyerExportsClient.tsx`
- `src/app/dashboard/exports/page.tsx`
- `src/app/dashboard/exports/AdminExportsClient.tsx`
- `src/components/buyer/BuyerPortalShell.tsx`
- `src/components/dashboard/Sidebar.tsx`
- `supabase/migrations/20260701203000_leadflow_controlled_exports.sql`

Verification:

- TypeScript: `./node_modules/.bin/tsc --noEmit` passed.
- Lint: `./node_modules/.bin/next lint` passed with existing image warnings outside this export work.
- Link audit: `node scripts/audit-internal-links.mjs` passed.
- Build: `./node_modules/.bin/prisma generate && ./node_modules/.bin/next build` passed.
- Runtime probe: `/buyer/exports` returns `200`.
- Runtime probe: unauthenticated `/dashboard/exports` redirects to `/login?callbackUrl=%2Fdashboard%2Fexports`.
- Runtime probe: unauthenticated `POST /api/leadflow/exports` returns no export and rejects access.
- Runtime probe: unauthenticated `/api/leadflow/exports/fake/download` returns no file and rejects access.

Known non-blocking issues:

- CSV and admin JSON are implemented. XLSX and PDF are intentionally left out until a library and exact report format are selected.
- Supabase Storage private bucket delivery is not wired yet. Current protected server downloads are safer than public URLs and can later be moved to private storage signed URLs.
- The migration file is created locally, but it still needs to be applied to the live Supabase project before live export tables/columns exist.
