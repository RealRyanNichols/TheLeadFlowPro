# CLAUDE.md — The LeadFlow Pro

Working rules for this repo. Read before adding routes, components, or features.
The repo was deliberately stripped to a **clean core** (front door + money path).
Keep it that way. Do not re-bloat it.

## What this is

LeadFlow Pro turns verified public and permissioned sources into **scored,
source-backed buyer signals** and sells them, plus a consulting/build track.
Positioning: *"Stop buying blind lists. Buy buyer signals."*

The site does four jobs, and the front door reflects exactly those:

- **Buy Leads** (`/buy-leads`) — source-backed signal products.
- **Pricing** (`/pricing`) — the hub that links to the real offers.
- **Submit Source** (`/submit-source`) — send a source/list/audience for review.
- **Contact** (`/contact`) — talk to Ryan.

Secondary but kept: `/build-my-system`, `/problem-intake`, `/industries`,
`/privacy-center`, `/offers/[slug]`, `/audit/[publicId]`, `/dashboard` (internal
review console, admin-only), auth, and legal pages.

## The money path — do not break it

Checkout is already wired end-to-end. Preserve this chain:

- `src/lib/offers.ts` — single source of truth for every sellable offer
  (`quick-look` = $47 sample, `business-audit` = $497 Lead Leak Audit, plus
  sprints/retainers/builds).
- `src/lib/offer-checkout.ts` — amount/recurring shape per slug.
- `src/app/offers/[slug]/page.tsx` — renders each offer; the in-page
  `#offer-checkout` form POSTs to `/api/offers/checkout`.
- `src/app/api/offers/checkout/route.ts` — builds the Stripe Checkout session
  **inline** (no Price IDs needed).
- `src/app/api/webhooks/stripe/route.ts` — fulfillment. This is what turns the
  money path on; it needs `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`.

To add an offer: add it to `OFFERS` and `offerCheckoutShape`, then it renders and
sells automatically at `/offers/<slug>`. Surface it on `/pricing` via
`FEATURED_OFFERS` if it should be prominent.

## Navigation is a single source of truth

`src/lib/site-navigation.ts` drives Header, Footer, MobileMenu, and LightHeader.
Change nav there — do not hardcode nav links in components. Every href in that
file must resolve to a real route.

## The link-audit gate — every static link must resolve

`npm run build` runs `scripts/audit-internal-links.mjs` first. It scans every
`href="/..."` and `router.push("/...")` in `src/` and **fails the build** if any
points to a route that does not exist. So:

- If you delete a route, remove or repoint every static link to it.
- If you add a static link, make sure the target route exists.
- Run `npm run audit:links` locally before pushing.
- Note it only catches lowercase `href=`/`router.push` string literals — dynamic
  hrefs and `secondaryHref=`/`primaryHref=` props are **not** checked, so keep
  those correct by hand.

## Don't re-bloat

This repo previously had 175 pages / 118 API routes of speculative features
(civic, voice, leaderboard, challenge, pulse, machine, demo, design-system,
mortgage, community, rewards, tiers, partner/buyer portals, 40+ dashboard
subpages, a tools suite, etc.). They were cut. **Do not re-add speculative
routes.** Before adding a page or API route, ask: does it serve the front door,
the money path, auth, legal, intake, or the review console? If not, it probably
doesn't belong yet.

When you do add a real route, also: update `site-navigation.ts` if it's
user-facing, add it to `src/app/sitemap.ts`, and keep the link audit green.

Many `src/lib` and `src/components` files are retained but currently unused
(kept to avoid breaking imports during the strip). Pruning them is safe cleanup,
not required to ship — verify zero importers first.

## Guardrails (from AGENTS.md — still in force)

- This repo is LeadFlow Pro / the LeadRep revenue engine only. Do not route it
  into court, legal-service, or pro se workflows.
- Never expose private lead data, service keys, webhook secrets, or buyer lists
  in client-side code.
- Do not auto-publish, auto-text, auto-email, auto-DM, or spend API credits
  without approval.
- Run `npm run build` before final handoff whenever code changes.

## Environment (see `.env.example` for the full list)

Minimum for v1 (front door + money path):

- `DATABASE_URL` (Supabase Postgres)
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `LEADFLOW_ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Optional: `RESEND_API_KEY` (email), `ANTHROPIC_API_KEY` (chatbot), Google OAuth

## Commands

- `npm run dev` — local dev server
- `npm run build` — link audit → `prisma generate` → `next build`
- `npm run lint` / `npm run typecheck`
- `npm run audit:links` — internal link audit only
- `npm run db:push` — push Prisma schema to the database

## Deploy

Pushing `main` deploys to Vercel and runs `prisma db push` against production
Supabase. The clean-core strip did not change the Prisma schema. Confirm the
schema matches prod (or open a PR for a preview deploy) before pushing.
