# Agent Bridge: Claude Code ⇄ Claude Cowork

The coordination protocol for building and launching LeadFlow Pro with two Claude
agents working in parallel. Both agents read this file before acting.

## Why this exists

LeadFlow Pro is built by two Claude agents with different, complementary powers.
Neither can ship alone:

- **Claude Code** lives *inside the repo* in a non-interactive remote environment.
  It is the **builder / brains-in-repo**: it owns the codebase, but it is blind to
  the outside world — no dashboards, no browser, no OAuth, no rendered pages, no
  live payments.
- **Claude Cowork** is an interactive agent with internet, connectors, and eyes.
  It is the **arms / eyes / internet**: it drives Stripe/Vercel/Supabase/GoDaddy
  dashboards, does OAuth, browses live, screenshots, and runs real checkouts.
  Cowork **takes the lead** on everything external and grants Code clearance.

Neither is superior. Cowork can see where Code can't; Code can build what Cowork
won't. They work hand in hand.

The channel: **one GitHub Issue** titled
**`Agent Bridge: Claude Code <-> Claude Cowork`** in `RealRyanNichols/TheLeadFlowPro`.
Every handoff is a comment on that issue using the envelope below.

## Roles at a glance

| | Claude Code (builder) | Claude Cowork (arms/eyes) |
|---|---|---|
| Environment | Non-interactive remote exec | Interactive, internet + connectors |
| Owns | The codebase, PR #6, the build gate | The outside world: dashboards, OAuth, live tests |
| CAN | Edit any code; add/remove routes & components; add offers to `OFFERS` + `offerCheckoutShape`; add MCP tools; edit `connect.js` + `/api/connect/collect`; edit the Prisma schema + write migrations; run `npm run build` / `lint` / `typecheck` / `audit:links`; git commit/push; open/update PRs; comment on GitHub; run secret-scanning on repo code | Set/read Vercel env; activate Stripe + generate live keys; **register the Stripe webhook + capture the signing secret** (Stripe MCP write); create refunds; **confirm/apply prod Supabase schema** (Supabase MCP); visual QA + screenshots; submit the MCP connector to directories |
| CANNOT | Interactive OAuth; open a dashboard; *prove* a Vercel var is set at runtime; see rendered pages; place payments; write DNS records; push to prod Supabase interactively; submit to directories | (it is the unblocker — but DNS-record writes, live card entry, and identity verification may still be human-gated; see the wishlist) |
| Lead role | Executes autonomous code work **within granted clearance** | **Leads.** Runs external actions, reports status, grants clearance |

## How Code gets woken — the async wake problem

**Code does not poll.** It runs in a non-interactive environment and only acts
when something re-invokes its session. If Cowork posts to the bridge and nothing
wakes Code, the handoff stalls forever. So every Cowork → Code handoff MUST also
ring a doorbell. Three mechanisms, in order of preference:

1. **Doorbell = a comment on PR #6 (fast path).** Code is subscribed to PR #6
   activity; a comment there wakes the live Code session. So: put the full
   envelope on the **bridge issue**, then drop a one-line pointer comment on
   **PR #6** — e.g. `🔔 bridge: new message, re: stripe-money-path — Code needed`.
   Code reads the bridge issue, acts, and replies on the bridge (and pings back
   on PR #6 if it needs Cowork).
2. **Durable wake = a scheduled routine (survives session death).** The Code
   environment can run a Claude Code Remote routine that fires on a schedule (or
   is fired on demand) and tells a fresh Code session to read the bridge and act.
   If the live session has been reclaimed, this is what brings Code back. Ryan or
   Code arms it; Cowork can request it be fired.
3. **Manual = Ryan relaunches Code.** Always available. If the bridge shows Code
   is needed and neither mechanism above fired, Ryan opens the Code session.

Code, for its part, ends every handoff by stating in `next:` what will re-engage
it, and (when the tool is available) arms a self-check routine so it re-reads the
bridge without waiting on a human.

## The hard rule: no secrets on GitHub, ever

Secrets **never** touch the repo, the PR, the bridge issue, a comment, a
screenshot, or a pasted log. No `sk_live_…`, `whsec_…`, `pk_live_…`,
`DATABASE_URL`, `NEXTAUTH_SECRET`, tokens, or connection strings.

- Secrets live in **Vercel Production env only**, generated in the provider
  dashboard. The bridge carries **status flags, not values**:
  `STRIPE_WEBHOOK_SECRET set ✓`, never the secret.
- **The `found:` field is flags-only.** It is tempting to paste the value you
  just captured. Don't. If you can't express it as a boolean-ish flag, it doesn't
  belong on the bridge.
- **Never echo a generated secret.** `openssl rand -base64 32` prints
  `NEXTAUTH_SECRET` to your terminal — it goes straight into Vercel, never into a
  comment.
- **Crop every screenshot.** The Stripe activation / keys / webhook screens show
  `sk_live`/`pk_live`/`whsec` by default. Crop or describe in words before
  uploading. When in doubt, don't upload.
- **Don't relay raw runtime/build logs.** Vercel/Supabase logs can echo
  `process.env` values. Summarize outcomes; never paste raw log dumps.
- **Scanning is not a safety net for the channel.** Code's `run_secret_scanning`
  covers *repo code* only — it does **not** scan issue comments, screenshots, or
  logs, which is exactly where a leak would happen. The safeguard there is human
  discipline, not a tool.
- If a secret ever lands in GitHub: **rotate it immediately** in the provider
  dashboard, then delete the comment. Assume anything committed is burned.

If you're about to type a value starting with `sk_`, `pk_`, `whsec_`,
`postgres://`, or that looks like base64 — **stop** and write `<VAR> set ✓`.

## The message envelope

Every comment on the bridge is one fenced `yaml` block with exactly these fields.
Fill every field; use `—` for "nothing here." An empty field is a signal.

```yaml
from: cowork              # cowork | code
to: code                  # who must act next
re: stripe-money-path     # short, stable topic slug (greppable across a thread)
status: needs-decision    # working | blocked | done | needs-decision | fyi
did: >                    # what I just finished (past tense, concrete)
found: >                  # observed facts + FLAGS ONLY — never a secret value
needs: >                  # the one concrete thing I need from the other agent
clearance: >              # explicit, scoped go/no-go the other may act on (or —)
next: >                   # what I do the moment my `needs` is met
```

### Field rules

- **from / to** — `cowork` or `code`. There are only two of us; always name the
  other in `to`, even for `fyi`.
- **re** — a stable slug (`stripe-money-path`, `env-vars`, `dns-domain`,
  `deploy`, `connect-embed`, `mcp-directory`, `visual-qa`). Keep it identical
  across a back-and-forth.
- **status** — `working` (checkpoint, no action) · `blocked` (need `needs` met) ·
  `done` (complete **and verified**) · `needs-decision` (a human/other must
  choose) · `fyi`.
- **did** — specific and verifiable: "Registered the Live webhook on
  `…/api/webhooks/stripe` subscribed to the 7 handled events," not "worked on
  Stripe."
- **found** — flags/booleans: `STRIPE_SECRET_KEY set ✓`, `webhook delivered 200`,
  `WorkOrder row auto-created`, `build green`. **Never a secret value.**
- **needs** — the single concrete unblock, or `—`.
- **clearance** — the load-bearing field for autonomy. An explicit, scoped grant,
  or `—`. Never a blanket "do whatever."
- **next** — what the sender does once unblocked (lets the other pre-stage), and
  for Code, what will re-wake it.

## Handoff + clearance rules

1. **Cowork leads the outside world.** Env vars, webhooks, DNS, payments,
   directory submissions are Cowork's to make. Code never assumes an external
   step happened — it waits for a `found:` flag confirming it.
2. **Code is autonomous inside the repo — within granted clearance.** Code may
   refactor, add offers/MCP tools, keep the link audit green, and build without
   asking. Code must **not** merge to `main`, change the money path's external
   contract, or take an action whose correctness depends on external state until
   Cowork posts a matching `clearance:`.
3. **Clearance is explicit and scoped.** e.g. `clearance: Stripe env set in Vercel
   Production ✓ — cleared to merge PR #6 to main and deploy.` Code acts only
   within that scope.
4. **`main` = production.** Pushing `main` deploys to Vercel **and runs
   `prisma db push` against prod Supabase.** Code merges to `main` only after
   Cowork's clearance confirms (a) required env vars are set and (b) the prod DB
   schema matches the branch. Prisma schema changes require Cowork to confirm — or
   pre-apply — prod first.
5. **Verify before `done`.** `done` means verified, not attempted. Money-path
   `done` needs Cowork's `found:` to show the charge in Stripe, the webhook
   `200`, and (for `business-audit`) a `WorkOrder` row. Code's build `done` needs
   `npm run build` green + link audit passing.
6. **One open decision per `re`.** Don't stack `needs-decision` on a topic;
   resolve or supersede.
7. **Round-trip discipline.** Every `blocked` / `needs-decision` gets a reply
   before new work starts on that `re`.

## Go-live ordering + known gotchas

The external steps have a dependency order — doing them out of order wastes a
round trip:

1. **Env + domain first.** Attach `www.theleadflowpro.com` in Vercel and confirm
   DNS resolves; set `NEXTAUTH_URL`/`NEXT_PUBLIC_SITE_URL` to that exact host (a
   `www` vs apex mismatch breaks auth callbacks).
2. **Then merge + deploy.** The Stripe webhook and the live checkout can only be
   validated once prod is live at the domain.
3. **Then register + test the webhook.** Point it at the live
   `…/api/webhooks/stripe`, then run the test orders.

Gotchas both agents must respect:

- **Prisma pooled vs direct (decide before merge).** Deploy runs `prisma db push`.
  If `DATABASE_URL` is the Supabase **pooled/6543 (pgBouncer)** string, DDL/push
  can fail. Fix: either set `DATABASE_URL` to the **direct/session 5432** string,
  or set a separate `DIRECT_URL` and have Code add `directUrl = env("DIRECT_URL")`
  to `prisma/schema.prisma`. This is a `needs-decision` for Cowork before the
  first `main` merge.
- **Email login needs Resend.** `/dashboard` email-OTP login only actually sends
  when `RESEND_API_KEY` is set **and** the sending domain is verified (DKIM). Without
  it, login silently fails. Treat Resend as required if anyone logs in by email.
- **Google sign-in needs a redirect URI.** If `GOOGLE_CLIENT_ID`/`SECRET` are set,
  the Google Cloud consent screen must whitelist exactly
  `https://www.theleadflowpro.com/api/auth/callback/google`.
- **Embed delivery needs a target.** The `/connect.js` second money path only
  delivers leads when `LEADFLOW_CONNECT_FORWARD_URL` points at a CRM/Zapier
  webhook. Otherwise it validates and acknowledges.

## Kill switch / rollback

If a live test or a deploy misfires in prod:

- **Payments:** refund the test charge(s) immediately (Stripe MCP `create_refund`).
  If an offer is charging wrong, remove it from `offerCheckoutShape` (Code) so it
  becomes non-checkout-eligible, or disable the webhook endpoint in Stripe (Cowork)
  to stop fulfillment while diagnosing.
- **Deploy:** roll back to the previous good deployment in Vercel (Cowork), or
  Code reverts the offending commit on `main` and pushes. `main` is production —
  a bad merge is a prod incident; treat it as `status: blocked, re: deploy` and
  both agents drop other work until it's green.
- **Secrets exposed:** rotate first, delete second (see the hard rule).

## The money path — canonical worked handoff

Shared context (from `CLAUDE.md`): checkout builds a Stripe session **inline** in
`src/app/api/offers/checkout/route.ts` (no Price IDs); fulfillment is
`src/app/api/webhooks/stripe/route.ts`, which needs `STRIPE_SECRET_KEY` +
`STRIPE_WEBHOOK_SECRET`. Live test targets: `/offers/business-audit` ($497,
one-time → `WorkOrder`) and `/offers/connector-status` ($199/mo, recurring).

### Cowork side (grants clearance)

```yaml
from: cowork
to: code
re: stripe-money-path
status: done
did: >
  Activated Stripe (business + payout + tax), flipped to Live, generated live
  keys, registered the Live webhook at https://www.theleadflowpro.com/api/webhooks/stripe
  subscribed to all 7 handled events, and set the three Stripe vars in Vercel
  Production.
found: >
  STRIPE_SECRET_KEY set ✓  STRIPE_WEBHOOK_SECRET set ✓
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY set ✓  webhook test ping 200 ✓
  (no secret values here — all in Vercel env)
needs: —
clearance: >
  Stripe env fully set in Vercel Production. Cleared to merge PR #6 to main and
  deploy. After deploy I'll run the live $497 + $199/mo orders.
next: >
  Once prod is green, place the real orders, confirm charge + webhook 200 +
  WorkOrder row, then refund both. I'll drop a 🔔 pointer on PR #6 to wake you.
```

### Code side (executes within clearance, reports back)

```yaml
from: code
to: cowork
re: stripe-money-path
status: done
did: >
  Ran run_secret_scanning (clean), npm run build green, confirmed the webhook
  handler covers all 7 events, merged PR #6 to main — Vercel prod deploy triggered.
found: >
  build green ✓  audit:links passing ✓  secret scan clean ✓
  business-audit + connector-status present in OFFERS + offerCheckoutShape ✓
needs: >
  Your go/no-go after the live orders — charge in Stripe, webhook 200, WorkOrder
  row for business-audit.
clearance: —
next: >
  Standing by; a comment on PR #6 or a fired routine re-wakes me. If fulfillment
  misfires I'll trace webhooks/stripe/route.ts + createOfferWorkOrderFromCheckout
  and push a fix branch for your re-test.
```

## Quick reference — who unblocks whom

- **Code blocked on the outside world → `to: cowork`.** Env vars, webhook secret,
  DNS, live payment, rendered-page QA, directory submission, "is this var actually
  set in Vercel?"
- **Cowork blocked on the codebase → `to: code`.** A route/offer/MCP tool/schema
  change, a build failure to diagnose, a bug found in live testing.
- **Human decision (Ryan) → `status: needs-decision`,** options + recommendation;
  neither agent proceeds until resolved.
