# Chase Sheet through The LeadFlow Pro

Ryan's request, September 23, 2026: build one tool The LeadFlow Pro can sell at $20 a month or $97 once, with the sales page, the copy, the button, the Stripe link, and everything around it; make it a product that is genuinely needed, hard to copy without a lot of work, and easy to sell.

The tool is **Chase Sheet**: the follow-up engine for open quotes. Every quote a business has sent, chased every day, with the exact words for each touch written for the owner's trade and tone, sent from the owner's own phone with one tap, and a ledger of what the chasing won.

The name was checked before it was used. "Quote Chaser" and "QuoteChase" are existing products; "Chase Sheet" was not in use. Those existing products are date-only reminder trackers, which is the gap this product is built into: they tell you *when*; this hands you *the words*.

## What makes it hard to copy

- `lib/chaseSheet/trades.ts`: 24 hand-written trade libraries (roofing, HVAC, plumbing, electrical, landscaping, fencing, pressure washing, remodeling, painting, tree service, pest control, cleaning, flooring, concrete, garage doors, pool, auto detailing, dental, med spa, real estate, insurance, photography, signs, IT, plus a general one). Each carries the job noun, three honest reasons a delay costs the customer, a proof angle the owner fills with a real job, four seasonal hooks that are true every year, the ticket bands that set the pace, the default urgency, and the objection order that trade hears.
- `lib/chaseSheet/messages.ts`: nine touch roles in three tones, with two variants for the text roles, plus nine objection replies with the rule behind each, plus the voicemail texts for the call steps. Seeded by quote id so two customers in the same week never get the same message and a message never changes under the owner.
- `lib/chaseSheet/cadence.ts`: three ticket bands times three urgencies, nine sequences, two revival touches after the close, nothing on a Sunday, never two touches on one day, and an overdue touch that is due today and spaces the next one from the day it was actually sent.
- `lib/chaseSheet/sheet.ts`: the morning order (behind first, then bigger money, then older), the one-tap `sms:`, `tel:`, and `mailto:` links with the message already in them, and the ledger.
- The engine never ships to the browser. The sales-page demo and the app both call server routes; the client components receive only plain option lists and rendered results.

## Offer and delivery

- `/chase-sheet`: sales page. Hero, the problem, how it works, why a reminder app is not this, the quote-leak calculator (the visitor's own numbers, no benchmark), the free demo (the real engine, server side; the first three touches in full, the rest dated, one objection reply in full), the bridge line that says what paying buys, pricing, FAQ (the first answer is that same question), final call to action.
- `/chase-sheet/app`: the sheet. Locked view (paste the key, restart a lapsed plan, or buy) and the app (Today, Quotes, Ledger, Settings).
- `/chase-sheet/terms`: purchase terms, refunds, what the owner sends themselves, data handling.
- `/chase-sheet/opengraph-image`: 1200 x 630 social card.
- The footer, the tools page, the offer registry, the public page catalog, and the sitemap link the offer. The app is out of indexing and analytics (`lib/analytics/privacy.ts`).

Nothing is sent by the server. The owner taps a text, call, or email link and sends it from their own phone or mail client. There is no SMS provider, no carrier registration, and no per-message cost.

## What the demo shows, and why

The demo on the sales page is the real engine, and the page says so. It also says what it holds back, because the library is the part a copy cannot fake and the first version printed all of it: nine touches with both call scripts and their voicemail texts, and a seed that let a visitor pull the other variant of every text step by cycling the trade list. Ryan, reading the page as a customer on September 24, could not tell what paying bought; the page never said.

`lib/chaseSheet/demo.ts` shapes the answer now. The first three touches (did it land, the call with its voicemail text, one question) are written in full; the rest come back dated, with the job of each touch, and no words. One objection reply comes back in full, the price one, which every trade lists, so changing the trade never reveals another; the rest are named with the rule behind them. The seed is the tone alone, the pace is the trade's usual urgency with no override from the request, and the route allows thirty requests an hour per address. The page carries a bridge line under the demo and a first FAQ that say plainly what paying buys: the demo is the writing; the sheet is the remembering, the ordering, and the sending. `tests/chase-sheet-demo.test.ts` pins all of it.

## Payment and access

Both plans go through the existing `POST /api/checkout` with `kind: chase_sheet_monthly` (subscription mode) or `kind: chase_sheet_lifetime` (payment mode). The amounts come from `PRICES.chaseSheetMonthly` and `PRICES.chaseSheetLifetime` through `lib/chaseSheet/product.ts`; the browser names the plan and nothing else. Metadata carries `kind` and `plan`, on the session and, for the monthly plan, on the subscription.

Success lands on `GET /api/chase-sheet/claim?session_id=...`, which verifies the session with Stripe (mode, currency, amount, paid), writes or updates the account row, signs the identity cookie (`lfp_chase_sheet`, HMAC, one year), and opens the sheet. The webhook does the durable work on its own clock:

- `checkout.session.completed` for either kind: `ensureChaseSheetPaid` records the account (idempotent; lifetime never downgrades), sends the receipt with the license key through the payment-email ledger, alerts hello@, and, when a lifetime purchase lands on a live monthly plan, sets that subscription to cancel at period end so nobody pays twice.
- `customer.subscription.*` with `metadata.kind = chase_sheet_monthly`: `handleChaseSheetSubscription` keeps the account status, period end, and cancel date in step with Stripe. Older events never win.
- `invoice.paid` on the subscription: recorded in `purchases` as `chase_sheet_monthly` (first invoice skipped, like the other subscriptions) and reopens a past-due account.
- Refunds and disputes: the existing money-back path flips the `purchases` row and now also locks the sheet (`applyChaseSheetMoneyBack`); a dispute won reopens it.

Entitlement is decided from the database on every request (`lib/chaseSheet/plan.ts`): lifetime while active; monthly while active, or past due inside a seven-day grace window, or canceled-at-period-end with the date still ahead. A monthly account whose paid period ended with no newer event is checked against Stripe directly before the answer, so an unregistered webhook never locks a paying customer out or keeps a lapsed one in.

The license key is `LFP-XXXX-XXXX-XXXX-XXXX`, derived the same way as the Pro Kits (`licenseKey(email, "chase_sheet", secret)`), never stored. `POST /api/chase-sheet/restore` turns email plus key into the cookie, or, with email alone, re-sends the key when an account exists (same answer either way, rate limited). A signed-in Supabase user whose email holds an account is also let in.

## Data

`supabase/migrations/20260923120000_chase_sheet.sql` creates `chase_sheet_accounts`, `chase_sheet_quotes`, and `chase_sheet_touches`. Service role only: RLS is on with no policies and every privilege is revoked from `anon` and `authenticated`. Every route filters by the account email the cookie proved. Rollback is at the top of the file. Apply it with `supabase db push --include-all` (or the Supabase MCP) before the first sale.

Quotes carry the customer's name, number, email, the job, the amount, the sent date, the urgency, status, touches done, the next touch date, and notes. `GET /api/chase-sheet/export` returns every quote as a CSV (formula characters neutralised), and works for a lapsed account too.

## Configuration

Reuses the production variables already set: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`. Optional `CHASE_SHEET_SECRET` signs the cookie and the key; without it the Pro Kit secrets are used (`PRO_TOOLS_SECRET`, then `UNSUBSCRIBE_SECRET`, then the service role key). No new service, no paid infrastructure.

The Stripe webhook endpoint already receives every event this needs (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.*`). Decision 62 in `docs/decisions-needed.md` still applies: confirm those events are registered on the live endpoint.

## The Stripe payment links

The sales page and the locked sheet sell through `/api/checkout`, which needs no Stripe dashboard work. For a link to paste into a text, a post, or an email, the live account also holds one Product with two Prices and two hosted Payment Links, created September 24, 2026 on Ryan's instruction to make the product live. Both links carry the same `kind` and `plan` metadata as the page checkout and redirect to the claim route, so a sale through a link is fulfilled exactly like a sale through the page. They are recorded in `EXTERNAL_LINKS` and on the two offers in `lib/site/offers.ts`.

| Plan | Price | Payment Link |
| --- | --- | --- |
| Monthly, $20/mo | `price_1UJ3OkBHH7tuNwAAXTuTLLg1` | https://buy.stripe.com/aFa3cu8eK9QUesMdUW5AQ0d |
| One payment, $97 | `price_1UJ3VOBHH7tuNwAAyRurjLcf` | https://buy.stripe.com/28EcN4bqWbZ2esM4km5AQ0e |

Product: `prod_VJgdpQoFYS70Re`. `npm run chasesheet:stripe` finds these by metadata and creates nothing new; it exists for a fresh account or a test-mode copy.

## Go-live record

- September 24, 2026: PR #73 squash-merged to `main` (commit `08d3611`); Vercel production deployment `dpl_DGJE9vDAGhwbUdqPPDJToPw1Cxhy` reached READY.
- September 24, 2026: migration `chase_sheet` applied to the live Supabase project (`hpzpwfymwfgwspaixrxi`) through the Supabase MCP; the three tables exist with RLS on and no browser grants.
- September 24, 2026: the Stripe product, prices, and payment links above created in the live account.
- September 24, 2026: the demo tightened to three written touches and one full objection reply, and the page told what paying buys (see "What the demo shows, and why").

## Validation

- `npx tsc --noEmit`: clean.
- ESLint on every new and changed file: clean.
- `npm run validate:facts`: every price reads from `lib/site/prices.ts`.
- Unit tests: `tests/chase-sheet-engine.test.ts` (dates, cadence for every trade, urgency, and band; every role in every tone for every trade renders, addresses the customer, names the job, has no em dash and no guarantee; variants; seasons; objections; links; the sheet order; the ledger) and `tests/chase-sheet-access.test.ts` (cookie, key, what a session may unlock, plan decisions, staleness, the subscription handler on a fake database, refunds, renewals, invoice classification). The existing dispatch, analytics-privacy, invoice, and site-config guards were extended.

## Launch copy (not posted)

**Version 1**

You sent the quote. Then it went quiet.

Not because somebody beat your price. Because nobody called.

Chase Sheet fixes that. Every open quote, chased every day, with the exact text written for your trade. One tap and it goes out from your own phone.

Try it free. It writes the whole follow-up for one of your quotes: https://www.theleadflowpro.com/chase-sheet

Twenty dollars a month, or ninety-seven once. Nothing is sent for you.

**Version 2**

Roofers, HVAC, plumbers, fence crews, remodelers.

How many quotes did you send last month?

How many did you follow up more than once?

That gap is the biggest pile of money in your business, and there has never been a system for it that speaks your trade.

There is now. https://www.theleadflowpro.com/chase-sheet

Add the quotes you have out tonight. Tomorrow morning it hands you the first one.
