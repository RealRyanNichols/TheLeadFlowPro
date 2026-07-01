# The LeadFlow Pro

LeadFlow Pro is a source-backed lead signal system for buyer intent, review-gated marketplace products, public tools, buyer access, admin review, consent, suppression, and controlled exports.

Production: [www.theleadflowpro.com](https://www.theleadflowpro.com)

## Stack

- Next.js App Router under `src/app`
- TypeScript and React
- Tailwind CSS with LeadFlow tokens in `tailwind.config.ts`
- Shared LeadFlow components in `src/components`
- Prisma for existing app data
- Supabase migrations and helpers for buyer auth, lead signal data, consent, source review, and exports
- Vercel Analytics through `trackEvent()` only
- GitHub `main` to Vercel production

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Run local checks:

```bash
npm run typecheck
npm run lint
npm run audit:analytics
npm run audit:env
npm run build
```

Run the full gate:

```bash
npm run verify
```

## Frontend System

This repo should not accumulate random one-off AI components. Use the shared component entry points:

- `@/components/ui`
- `@/components/leadflow`
- `@/components/marketplace`
- `@/components/dashboard/*`
- `@/components/forms`
- `@/components/layout`

Registry and Figma mapping:

- `docs/leadflow-component-registry.md`
- `docs/leadflow-frontend-system.md`
- `docs/leadflow-figma-product-system.md`
- `src/design/leadflow-component-registry.ts`
- `figma/code-connect`

## Analytics Rule

All frontend tracking goes through:

```ts
import { trackEvent, trackLeadFlowEvent } from "@/lib/events";
```

Do not send raw emails, phone numbers, names, addresses, raw answers, notes, protected traits, private financial data, tokens, passwords, or sensitive fields to analytics.

The detailed funnel event policy is documented in `docs/leadflow-privacy-safe-analytics.md`. Internal funnel counts are available at `/dashboard/analytics` after the Supabase event migration is applied.

## Supabase Migrations

Migration files live in `supabase/migrations`.

Before deploying schema-backed work:

1. Review the SQL migration.
2. Apply it to the target Supabase project through the approved Supabase workflow.
3. Confirm RLS is enabled on exposed tables.
4. Confirm buyers only see entitled rows.
5. Confirm service-role keys stay server-side only.

## Deployment

`main` is the production integration branch. Vercel deploys the GitHub project `RealRyanNichols/TheLeadFlowPro` to the Vercel project `the-lead-flow-pro`.

Before pushing production work:

```bash
npm run verify
git diff --check
```

After deploy, smoke test:

- `/`
- `/marketplace`
- `/tools`
- `/submit-source`
- `/privacy-center`
- `/dashboard`

## Branching

Use short feature branches:

- `codex/frontend-system`
- `codex/marketplace-routing`
- `codex/buyer-access`
- `codex/admin-review`

Keep one product change per branch when possible. Large phase branches must include docs and a passing build before production deploy.
