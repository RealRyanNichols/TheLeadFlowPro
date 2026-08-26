# Agent Instructions - The LeadFlow Pro

This file describes **this repository**. Read it before changing anything in it.

> Rewritten August 26, 2026. It previously described "LeadRep", a revenue
> engine that turns "verified public and permissioned business signals" into
> data packages, routed through Grok/xAI with an `approval_queue` and a
> `LEADREP_GROK_MODE` dry-run switch. None of that exists here. There is no
> orchestrator script, no `agent_handoffs` table, no xAI call, and no env var
> by any of those names. It also told agents to work on `main`, which is the
> branch that deploys straight to production.
>
> Instructions that describe a different application are not merely unhelpful.
> An agent that trusts them goes looking for code that was never written,
> invents it when it cannot find it, and pushes the result to production
> because the file said to.
>
> `docs/LEADREP_*` describe the same absent system and are kept only as
> historical planning notes. Do not build against them.

## What this actually is

A Next.js 15 App Router site, TypeScript, deployed on Vercel at
theleadflowpro.com. Node 22.6 or later.

- **Data:** Supabase, over its REST API. Row Level Security does the access
  control. There is no ORM. **Prisma is gone**: no `DATABASE_URL`, no schema,
  no migration step, and no build command that touches the production database.
- **Email:** Resend, for every message the app sends.
- **Payments:** Stripe Checkout, hand-rolled over the REST API. No Stripe SDK.
  The webhook lives at `/api/stripe-webhook`. It is not `/api/webhooks/stripe`,
  whatever any older doc says.
- **SMS:** Quo, inbound only. See the hard rule below.
- **Scheduled work:** Vercel Cron, defined in `vercel.json`, authenticated with
  `CRON_SECRET`.

`.env.example` lists every variable the code reads and names the ones it does
not. Trust it over any other list.

## Branches

- **Never commit to `main` and never push to it.** `main` deploys straight to
  production on merge.
- Work on a feature branch and open a pull request.
- Run the checks below before handing anything back.

## Hard product rules

These are not style preferences. Breaking one is a defect regardless of how
good the rest of the change is.

1. **No promise of a business outcome.** No lead volume, revenue, ROAS, cost
   per lead, conversion rate, or search ranking, in any copy you write or
   touch, softened or not. The only guarantee allowed anywhere on the site is
   the ten business day delivery one.
2. **No em dashes in customer-facing copy.**
3. **Application-originated outbound SMS is off.** The single text this app may
   ever send is the auto-reply to somebody who texted us first, in
   `/api/quo-inbound`, behind `QUO_INBOUND_AUTOREPLY_ENABLED`. Do not route
   anything else through it. Both Quo switches are deliberately inverted so
   that unset is the safe state.
4. **Never expose a service role key, webhook secret, private token, or lead
   data through a `NEXT_PUBLIC_` variable or any client component.**
5. **Do not publish, email, text, DM, or spend API credit without approval.**
6. **Paying is not consent.** A purchase never sets `sms_consent` or
   `marketing_email_consent`. Consent comes from a box the person ticked, and
   both boxes start unticked on every form.

## Conventions worth knowing before you touch a paid path

- **Alert first, marker second.** Every paid Stripe handler sends its
  notification and only then writes the row that says it was sent. Writing the
  marker first, or writing it when there was no key to send with, retires the
  message permanently: the next delivery of the same event sees the marker and
  returns. Three handlers had that bug and it cost real customers their
  confirmations.
- **A non-2xx from the webhook is a feature.** It keeps the event in Stripe's
  retry queue and visible in the dashboard. Prefer it to swallowing a failure.
- **Claim before you send.** The nurture cron inserts its `lead_emails` row
  before the send, because `UNIQUE (lead_id, step)` is what stops two
  overlapping runs mailing the same person twice. A missed email is
  recoverable; a duplicate is not.
- **Prices come from `lib/`.** `lib/offers.ts`, `lib/freeBuild.ts`,
  `lib/leadFollowUp.ts`, `lib/timeback.ts`. The browser sends selections, never
  amounts. Do not hardcode a price in a component: the header and footer once
  quoted $500 and $1,000 for the same button.
- **Every indexable page declares its own canonical.** The root layout
  deliberately declares none, so a new page self-canonicalizes instead of
  inheriting a claim to be the homepage. `tests/canonical.test.ts` enforces it.

## Checks

Run all three before handing work back. Any failure is a failure.

```
npx tsc --noEmit
npm test
npm run build
```

`npm run build` runs the tool and visual validators before `next build`, so a
published tool missing metadata, imagery, a formula, or a disclaimer fails the
build instead of shipping. `npm run build:only` is plain `next build`. Neither
opens a network or database connection.
