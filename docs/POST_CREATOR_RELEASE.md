# Post Creator through The LeadFlow Pro

Built September 24, 2026. **Post Creator** (page title "Social Media Post Creator") is a free post idea machine for local businesses, plus paid AI writing that drafts the post in the owner's voice from a saved business profile. It is do it yourself: nothing is ever posted, sent, or scheduled for anyone. The owner reads every draft, fills in anything in brackets, and posts it from their own accounts.

Nothing in this release has been deployed, charged, switched on, or created in Stripe. AI writing and checkout both ship switched off. The decisions are items 84 to 99 in `docs/decisions-needed.md` (section L).

## What shipped

**Free (no sign up, runs in the browser, sends nothing to us)**

- `/post-creator`: the public page. Hero, the idea machine, how it works, the month planner (`#plan`), the free versus AI writing table, what "no meter" means for the idea machine and why AI writing has a set number, pricing (`#pricing`), FAQ, and the disclaimer.
- The idea machine (`lib/postCreator/ideas/*`, pure, no network): 12 trades plus "Something else", up to 5 of the owner's own services, 20 post angles, 26 everyday business topics. A named trade with no services has 280 different ideas; each service adds 50. Every idea has four first lines and two photo ideas, times eight calls to action on "Mix it up". A shuffle with no repeats keeps its place on the device.
- Drafts for Facebook, Instagram, Google Business Profile, Nextdoor, and short video, from templates with `[blanks]` for the owner's know-how. A 30 day plan with a spreadsheet download and copy all. Saved ideas stay in the browser.
- `/post-creator/terms`: the purchase terms.

**Paid (monthly or one payment)**

- `/post-creator/app` (noindex, out of analytics): the buyer app. Ideas, Plan, Saved, Settings. The business profile is saved to the account and follows the buyer to every device. "Write it in my voice" sends one idea to the AI writer for up to 3 platforms at once and returns the drafts, two other first lines, and a photo idea.
- AI writing allowance (`POST_CREATOR.ai` in `lib/postCreator/product.ts`): monthly plan 100 writes a month and 20 a day; one payment plan 50 a month and 10 a day. Five extra tries a day and twenty a month cover failures, which never count. Each account has a monthly AI cost ceiling: $15 monthly, $9 one payment. Days and months are Central time.
- Every AI draft passes the copy rules in `lib/postCreator/copyRules.ts` (used by `lib/postCreator/ai/filter.ts`): a sentence with a claim, price, number, phone, email, or link the owner did not give is removed, and the buyer is told how many were removed.
- No draft text is stored on the server. The ledger keeps the time, size, cost, model, and outcome of each AI request.

**Money and access**

- Checkout: the existing `POST /api/checkout` with `kind: post_creator_monthly` (subscription) or `kind: post_creator_lifetime` (payment). The amounts come from `PRICES.postCreatorMonthly` and `PRICES.postCreatorLifetime`. Checkout answers 503 `not_open` unless sales are open (see Environment).
- Claim: `GET /api/post-creator/claim?session_id=...` verifies the session with Stripe and signs the buying browser in once, within a day, and only when the email had no Post Creator account before. Anything else lands on the locked screen with a note and the emailed key.
- Key: `LFP-XXXX-XXXX-XXXX-XXXX`, derived per email, never stored. `POST /api/post-creator/restore` turns email plus key into the cookie (`lfp_post_creator`, one year), or with email alone re-sends the key (same answer either way, rate limited).
- Webhook: `checkout.session.completed` records the account and sends the receipt with the key through the payment-email ledger; `customer.subscription.*` with `metadata.kind = post_creator_monthly` keeps the monthly plan in step with Stripe; renewals are recorded in `purchases`; refunds and disputes close the plan through the existing money-back path, and a dispute won reopens it.
- Other routes: `GET` and `DELETE /api/post-creator/session`, `PUT /api/post-creator/profile`, `POST /api/post-creator/billing` (Stripe billing portal, monthly only), `POST /api/post-creator/write` (the AI writer, `maxDuration = 120`).

**Discovery and privacy**

- Footer link (What we build), a card on `/tools`, three entries in the public page catalog (the app is `index: false`), `/post-creator` at 0.9 in the sitemap, and two offer rows in `lib/site/offers.ts`.
- `/post-creator/app` is private to analytics (`lib/analytics/privacy.ts`).
- `/privacy` has a Post Creator paragraph: the free idea machine sends nothing; for buyers the profile, the idea, and the note go to Anthropic to write the draft; no draft text is kept.

**Data**

`supabase/migrations/20260924150000_post_creator.sql` adds four tables (`post_creator_accounts`, `post_creator_generations`, `post_creator_spend_daily`, `post_creator_rate_limits`) and five functions (`post_creator_record_purchase`, `post_creator_reserve`, `post_creator_settle`, `post_creator_usage`, `post_creator_hit`), plus the write-once guard trigger on accounts. Service role only: RLS on with no policies, every privilege revoked from `anon` and `authenticated`. Applying it is Ryan's action (item 85).

## Environment

Already set in production and reused: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.

New (see `.env.example`):

| Variable | Rule | Default |
| --- | --- | --- |
| `POST_CREATOR_AI_ENABLED` | AI writing runs only when this is exactly `true` and the key and the cap below are set. | `false` |
| `POST_CREATOR_SALES_OPEN` | Checkout opens only when this is exactly `true`, AI writing is on, and the Stripe, service role, and Resend keys are set. | `false` |
| `POST_CREATOR_ANTHROPIC_API_KEY` | A dedicated key. It never falls back to `ANTHROPIC_API_KEY`. | empty |
| `POST_CREATOR_MODEL` | `claude-opus-5` (default when empty), `claude-sonnet-5`, or `claude-haiku-4-5`. Anything else switches AI writing off. | `claude-opus-5` |
| `POST_CREATOR_EFFORT` | `low` (default when empty) or `medium`. Anything else switches AI writing off. Haiku runs without an effort setting. | `low` |
| `POST_CREATOR_DAILY_SPEND_CAP_USD` | Required for AI writing. Above 0 and at most 500, up to two decimals. Shared by every buyer; resets at midnight Central. | empty |
| `POST_CREATOR_SECRET` | Optional signer for the cookie and the key. Without it: `PRO_TOOLS_SECRET`, then `UNSUBSCRIBE_SECRET`, then the service role key. Set it before sales open. Changing it later signs every buyer out and makes every emailed key stop working, so treat a change like a reset. | empty |

The Stripe webhook needs the same events as Chase Sheet: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.*`. Decision 62 still applies.

## Launch order

Each step waits for the one before it. From step 4 on, every switch is an environment variable, undone by setting it back and redeploying.

1. **Item 84.** Approve the offer and merge. The two offer rows are `live` in JSON-LD from the merge, even while checkout is closed.
2. **Item 85.** Apply the migration (`supabase db push --include-all` or the Supabase MCP) and log it in the decisions doc. Until then the paid routes answer that accounts are not switched on; the free idea machine works.
3. **Items 86 to 89.** Create the dedicated Anthropic key in its own Console workspace with a monthly spend limit (default $310), pick the model and effort, set the daily spend cap (default 10), and approve the allowances. Put the values in Vercel, but leave both switches off.
4. **Deploy with AI and sales off.** Check on a phone: `/post-creator` works with no account; `/post-creator/app` shows the locked screen; `POST /api/checkout` with a Post Creator kind answers 503 `not_open`; the footer and `/tools` link to the page.
5. **Comp test account.** Run the comp SQL below with an email you read, then press "Email me my key" on `/post-creator/app` and open it with the emailed key.
6. **AI on in Preview (item 91).** Set `POST_CREATOR_AI_ENABLED="true"` in the Preview environment only; Preview also needs the key, the cap, and the same signing secret as Production. The emailed link opens production, so type the comp email and key on the Preview app's locked screen, fill in the profile, and write a few drafts on two or three trades. Run the spend queries below and compare the settled cost with the cost table in decision 90. Test with the comp account, not with checkout: `/api/checkout` sends buyers to production URLs.
7. **AI on in production.** Same variable in Production, after your OK on step 6.
8. **Sales open (item 92).** Only after items 91, 93, and 97. Set `POST_CREATOR_SALES_OPEN="true"` in Production. Optional: one real monthly purchase on your own card to watch the receipt and the claim, then refund it and cancel the subscription with the runbook below.

## Runbook

**Comp an account (no Stripe, no promo code).** Item 96: create no Post Creator promo codes; comp people by hand.

```sql
insert into public.post_creator_accounts (email, plan, status, first_session_id) values ('<email>', 'lifetime', 'active', 'manual:comp');
```

Then open `/post-creator/app`, type that email, and press "Email me my key". The key opens it on any device. A comp row never signs a browser in through the claim route, because its first session is not a checkout.

**Sign every device out for one email.** Every cookie carries the account's `access_epoch`; bumping it signs out every device. The emailed key opens it again.

```sql
update public.post_creator_accounts set access_epoch = access_epoch + 1 where email = '<email>';
```

**Refunds and disputes (item 95).** When you refund a first monthly payment, or a dispute opens on one, cancel that subscription in Stripe immediately (cancel now, not at period end). The first monthly invoice is not in `purchases`, so the money-back path does not close the account on its own; the cancellation does, through `customer.subscription.deleted`. A full refund or a dispute on the one payment plan or on a renewal month closes the plan automatically, and a dispute won reopens it; a partial refund changes nothing. The terms promise a full refund within seven days of a first purchase and no refund on renewal months.

**Delete an account on request.** The privacy page and the terms say a buyer can email to have their account and profile deleted. Cancel any live subscription in Stripe first, then:

```sql
delete from public.post_creator_accounts where email = '<email>';
```

The AI request ledger rows for that email go with it (`on delete cascade`). The `purchases` row stays as the business record of the sale.

**Pause AI writing now.** Set `POST_CREATOR_AI_ENABLED="false"` and redeploy. Buyers see "AI writing is not switched on right now" and the idea machine keeps working. To stop new sales without touching AI writing, set `POST_CREATOR_SALES_OPEN="false"`.

## Spend queries

Run in the Supabase SQL editor. Amounts are stored in millionths of a dollar.

Daily spend:

```sql
select day, spent_micro_usd/1e6 as spent, reserved_micro_usd/1e6 as reserved, calls, cap_hits from post_creator_spend_daily order by day desc limit 14;
```

Cost by model:

```sql
select requested_model, served_model, count(*), avg(cost_micro_usd)/1e6, sum(cost_micro_usd)/1e6 from post_creator_generations where created_at > now() - interval '14 days' group by 1, 2;
```

Outcomes:

```sql
select outcome, count(*) from post_creator_generations where created_at > now() - interval '14 days' group by 1;
```

Top accounts:

```sql
select account_email, month, sum(cost_micro_usd)/1e6 from post_creator_generations group by 1, 2 order by 3 desc limit 20;
```

A `cap_hits` above 0 means buyers were paused that day; a `served_model` that differs from `requested_model` is a fallback hop; `timeout`, `connection`, `unknown`, and `expired` outcomes are charged at the full reservation, because the real cost is not known.

## Rollback

1. Set `POST_CREATOR_SALES_OPEN="false"` and `POST_CREATOR_AI_ENABLED="false"` and redeploy. Nothing is sold and no AI credits are spent from that moment.
2. Revert the merge commit to remove the pages, routes, and links.
3. Only if the tables must go (this deletes every Post Creator account and profile), run the drop list from the top of the migration:

```sql
drop function if exists public.post_creator_hit(text, integer, integer);
drop function if exists public.post_creator_usage(text);
drop function if exists public.post_creator_settle(uuid, text, boolean, text, bigint, text, integer, integer, integer, integer, text, boolean);
drop function if exists public.post_creator_reserve(text, uuid, integer, integer, integer, integer, integer, bigint, bigint, bigint, text);
drop function if exists public.post_creator_record_purchase(text, text, text, text, text, bigint);
drop table if exists public.post_creator_rate_limits;
drop table if exists public.post_creator_spend_daily;
drop table if exists public.post_creator_generations;
drop table if exists public.post_creator_accounts;
drop function if exists public.post_creator_accounts_guard();
```

Cancel any live Post Creator subscriptions in Stripe before dropping the tables, or their renewals will charge with no account behind them.

## Validation

- `npx tsc --noEmit -p .`, `npm test`, `npm run validate:facts`, `npm run check:links`, and `npm run build` are the gates.
- `tests/post-creator-guards.test.ts` scans every Post Creator source file: no long dashes, no promise words outside the AI prompt, "no meter" wording only in the honesty block of `lib/postCreator/product.ts`, no typed prices in pages, the Anthropic SDK loaded only by `lib/postCreator/ai/anthropic.ts`, no server module in a client component, no network call in the free idea machine, and no plain `<a href="/">` for internal links.
- `tests/post-creator-discovery.test.ts` checks the footer, the catalog, the sitemap, the tools card, the privacy paragraph, the analytics privacy rule, and this release's decisions.
