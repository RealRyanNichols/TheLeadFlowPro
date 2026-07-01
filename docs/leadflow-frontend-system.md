# LeadFlow Frontend System

## Current Project Structure

Framework:

- Next.js 14 App Router under `src/app`.
- Route Handlers live under `src/app/api`.
- React 18, TypeScript, Tailwind CSS, Radix primitives, Lucide icons.

Styling:

- Tailwind theme tokens live in `tailwind.config.ts`.
- Global LeadFlow classes live in `src/app/globals.css`, including `lead-shell`, `lead-panel`, `btn-accent`, `btn-primary`, and navigation styling.
- Design tokens live in `src/design/leadflow-design-system.ts` and `src/design/leadflow-product-system.tokens.json`.

Components:

- Shared canonical entry points now exist under `src/components/ui`, `src/components/leadflow`, `src/components/marketplace`, `src/components/forms`, `src/components/dashboard`, and `src/components/layout`.
- The deeper implementation still lives mostly in `src/components/leadflow-system`, with stable re-export paths for future migration.

Data and auth:

- Prisma remains in the repo for existing app data.
- Supabase migrations and helpers support buyer auth, source review, lead profiles, consent events, exports, and marketplace access controls.
- Supabase service-role keys must stay server-side only.

Analytics:

- All frontend Vercel Analytics calls now go through `trackEvent(eventName, properties)` from `@/lib/events`.
- The sanitizer blocks raw email, phone, names, addresses, raw answers, sensitive fields, tokens, passwords, financial-account data, health, race, religion, and sexual-orientation fields.

Deployment:

- Production deploys through GitHub `main` into the Vercel project `the-lead-flow-pro`.
- Current production domains include `www.theleadflowpro.com` and `theleadflowpro.com`.

## Directory Standard

Use these directories for new LeadFlow work:

```txt
src/components/ui
src/components/leadflow
src/components/marketplace
src/components/dashboard
src/components/forms
src/components/layout
src/lib/supabase
src/lib/auth
src/lib/events
src/lib/scoring
src/lib/export
src/lib/access
src/lib/compliance
src/app/marketplace
src/app/buyer
src/app/dashboard
src/app/tools
src/app/submit-source
src/app/privacy-center
```

## Page Ownership

Public routes:

- `/`
- `/buy-leads`
- `/build-my-system`
- `/marketplace`
- `/tools`
- `/submit-source`
- `/profile-model`
- `/privacy-center`
- `/industries`
- `/industries/[slug]`
- `/design-system`

Buyer protected routes:

- `/buyer`
- `/buyer/requests`
- `/buyer/watchlist`
- `/buyer/access`
- `/buyer/settings`
- `/buyer/exports`
- `/lead-profile/[id]` for entitled buyers

Admin protected routes:

- `/dashboard`
- `/dashboard/source-submissions`
- `/dashboard/exports`
- existing dashboard subroutes under `/dashboard/*`

API-only routes:

- `/api/buyer/*`
- `/api/leadflow/*`
- `/api/lead-profile/[id]/*`
- `/api/questionnaires/responses`
- `/api/tools/signal-intake`

Internal or preview routes:

- `/design-system`
- legacy or experiment routes such as `/demo`, `/backend`, `/machine`, `/pulse`, and older dashboard experiments.

## Event Discipline

All new frontend events must use:

```ts
import { trackEvent } from "@/lib/events";

trackEvent("event_name", {
  route: "/marketplace",
  listing_id: "listing_123",
  category: "Ecommerce",
  vertical: "Ecommerce",
  score_range: "high",
  status: "sample_available",
  cta: "Request sample",
});
```

Never send:

- raw email
- raw phone
- raw name
- raw address
- raw questionnaire answers
- raw notes
- tokens
- passwords
- medical, health, race, religion, sexual orientation, private political identity, exact income, bank account, or credit-card data

Allowed examples:

- `profile_id`
- `listing_id`
- `category`
- `vertical`
- `score_range`
- `status`
- `route`
- `cta`
- `tool_slug`
- `request_type`
- `user_role`
- `access_level`

## Figma Alignment

- Component names and prop names are registered in `src/design/leadflow-component-registry.ts`.
- Figma Code Connect examples live in `figma/code-connect`.
- The Figma project URL is not enough for Code Connect. Published component URLs with `node-id` values are required before real Code Connect templates can be published.

## Migration Checklist

1. Add or update the shared component in the canonical directory.
2. Register it in `src/design/leadflow-component-registry.ts`.
3. Add the Figma component name and variants to `docs/leadflow-component-registry.md`.
4. Use the shared component from page files.
5. Route all analytics through `trackEvent`.
6. Run `npm run lint`.
7. Run `npx tsc --noEmit`.
8. Run `npm run build`.
9. Check for direct `@vercel/analytics` imports outside `src/lib/events/track-event.ts`.
10. Check that no `NEXT_PUBLIC_` env var contains secrets.

## Vercel Deployment Checklist

- Build passes locally.
- Lint passes locally.
- Typecheck passes locally.
- `SUPABASE_SERVICE_ROLE_KEY`, `LEADREP_BUS_SERVICE_KEY`, `STRIPE_SECRET_KEY`, webhook secrets, and API keys are server-side only.
- `NEXT_PUBLIC_` variables are limited to public site URLs, analytics IDs, and publishable browser keys.
- Supabase migrations are committed before deployment.
- Buyer and admin protected routes re-check access on the server or route handler.
- Exports and integration payloads exclude suppressed records and hidden/admin-only fields.
- Production deploy is verified on `https://www.theleadflowpro.com`.
