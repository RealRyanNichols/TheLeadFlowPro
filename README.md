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

Current LeadFlow checkout/data-product migrations include:

- `20260701241500_leadflow_paid_sample_system.sql`
- `20260701243000_leadflow_exclusive_listing_logic.sql`
- `20260701244500_leadflow_checkout_orders.sql`
- `20260701250000_leadflow_integrations_framework.sql`

## LeadFlow Checkout

Checkout supports reviewed samples, listing access, exclusive deposits, custom signal deposits, and a subscription placeholder. Payment creates an audited `leadflow.orders` row. Access is granted only through `buyer_entitlements` after webhook confirmation and review rules.

Stripe setup:

1. Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and `NEXT_PUBLIC_SITE_URL`.
2. Add a Stripe webhook endpoint for either `/api/webhooks/stripe` or `/api/stripe/webhook`.
3. Subscribe to `checkout.session.completed`, `payment_intent.succeeded`, and `payment_intent.payment_failed`.
4. Use Stripe test mode first. A paid order should land in `/buyer/orders` and `/dashboard/orders`.
5. Confirm no entitlement is granted for suppressed listings, sold-exclusive listings, saturated limited-seat listings, high-risk records, or manual-review orders.

## LeadFlow Integrations

Buyer integrations live at `/buyer/integrations`. Admin review and safety controls live at `/dashboard/integrations`.

Supported framework providers:

- Webhook
- CSV export
- Zapier webhook
- Make.com webhook
- Email notification placeholder
- Google Sheets, HubSpot, GoHighLevel, Salesforce, and Airtable placeholders

Security rules:

1. Every integration run checks active buyer entitlement before delivery.
2. Payloads exclude suppressed records, raw questionnaire answers, hidden source proof, admin notes, and prohibited fields.
3. Contact fields are only eligible when the buyer entitlement allows them.
4. Webhook secrets are not returned to the browser.
5. Set `LEADFLOW_INTEGRATION_SECRET_KEY` before collecting webhook secret header values. Without it, the app saves only a secret preview and does not retain the raw secret.

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
