# The LeadFlow Pro Plugin

The plugin is The LeadFlow Pro inside ChatGPT and Claude, plus the Autopilot
engine that runs a customer's lead flow every five minutes. It is the first
subscription product in the repo and the first multi-business one. Read this
before touching anything under `lib/hq`, `app/hq`, `app/api/hq`, `app/api/mcp`,
or `app/api/oauth`.

## What a customer gets

- **The connector.** "The LeadFlow Pro" as an MCP server at
  `https://www.theleadflowpro.com/api/mcp`. Installs into ChatGPT (Apps and
  Connectors), Claude (custom connector), Claude Code, Cursor, and anything
  else that speaks MCP over Streamable HTTP. Seventeen tools, four resources,
  three prompts. See `lib/hq/mcp.ts`.
- **Autopilot.** `app/api/cron/hq-pulse` every five minutes: instant reply to
  a brand-new lead (text-back through their own line if they turned it on and
  the lead consented, email reply otherwise), owner alert on arrival and again
  at the response target, one hour, four hours, and a day; follow-up drafts on
  the ladder (days 1, 3, 7, 14, 30 by default); the daily brief at the owner's
  hour; the weekly report and the weekly content bundle (three posts, one lead
  ad, one 30 second video script with a shot list) on the owner's day.
  See `lib/hq/pulse.ts`.
- **HQ.** `/hq`: Today, Leads, Content, Plugin (install and keys), Settings,
  Billing. Setup wizard at `/hq/start`. OAuth consent at `/hq/authorize`.
- **Inbound doors.** `POST /api/hq/in/{token}/lead` (website forms, Zapier,
  curl) and `/meta` (Meta leadgen webhook, verified with the token, signed
  with `META_APP_SECRET`) use the lead endpoint token, which is an address
  (it sits in the business's website source) and is shown in Settings.
  `POST /api/hq/in/{sms_token}/sms` uses a separate token minted when a
  text line is connected and shown once; Twilio posts are always signature
  checked, OpenPhone posts are when the owner pasted the webhook signing key.
- **Included:** all 86 free calculators callable from the assistant, and every
  Pro Kit unlocked while the plan is live (`lib/proAccessServer.ts`).

Price: `HQ_PLAN` in `lib/hq/types.ts`. $49 a month, 14 day trial, cancel any
time. Never hardcode it anywhere else.

## Architecture

```
lib/hq/
  types.ts        rows, settings, HQ_PLAN, planIsLive
  settings.ts     parseSettings, parseWorkspace, profileGaps
  crypto.ts       secret chain, AES-GCM for connection secrets, HMAC
  keys.ts         credential shapes: lfp_live_ (API key), lfpat_/lfprt_ (OAuth), lfpc_ (code), lfpin_ (inbound)
  time.ts         business-local time, send windows
  phone.ts        E.164, formatting, first names
  score.ts        who to call first
  followups.ts    the ladder
  watchdog.ts     speed-to-lead alert stages
  drafts.ts       text-back, email reply, follow-ups, quote, review ask, reschedule
  brief.ts        daily brief, weekly report
  content.ts      weekly bundle: posts, ad, video script; review replies
  copy.ts         the copy rules every draft passes in tests
  oauth.ts        RFC 8414 / 9728 metadata, DCR parsing, PKCE, authorize params
  mcp.ts          JSON-RPC handler, tool specs, resources, prompts (pure; HqActions interface)
  server.ts       every database read and write (takes the Supabase client)
  actions.ts      HqActions over server.ts and channels.ts
  channels.ts     OpenPhone, Twilio, Resend on behalf, Facebook publish
  inbound.ts      form, SMS, and Meta ingestion; abuse controls
  manage.ts       the HQ management dispatcher (POST /api/hq {action})
  session.ts      who is signed in and which workspace is theirs
  stripe.ts       subscription checkout, portal, plan mapping
  subscription.ts the webhook branch (called first from app/api/stripe-webhook)
  pulse.ts        the Autopilot engine
```

Everything in the top half is pure and tested without a database
(`tests/hq-engine.test.ts`, `tests/hq-mcp.test.ts`, `tests/hq-inbound.test.ts`).
`mcp.ts` runs the whole protocol against an in-memory `HqActions`, which is
how the plugin is tested end to end.

## Data

Migration `supabase/migrations/20260912180000_hq_plugin_workspaces.sql`.
Tables: `hq_workspaces`, `hq_members`, `hq_leads`, `hq_events`, `hq_messages`,
`hq_content`, `hq_briefs`, `hq_connections`, `hq_api_keys`,
`hq_oauth_clients`, `hq_oauth_codes`, `hq_oauth_tokens`.

- RLS by membership (`hq_member_of`, `hq_owner_of`, both security definer),
  read-only for the browser and column-scoped where a row carries billing
  ids or ciphertext. Every write goes through `/api/hq` (service role,
  explicit patches), so a session can never edit its own `plan`. Cron,
  webhooks, and the MCP server use the service role and always filter by
  `workspace_id` in code.
- `hq_events.dedupe_key` (unique per workspace) is how "once" is enforced:
  watchdog stages, follow-up drafts, weekly content, trial reminders. Briefs
  are unique per `(workspace, kind, date)`.
- Secrets in `hq_connections.secret_ciphertext` are AES-256-GCM under
  `HQ_SECRET` (fallback `PRO_TOOLS_SECRET`, `UNSUBSCRIBE_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY`). Never selected by browser code.
- Only hashes of API keys, OAuth codes, and tokens are stored. The plaintext
  is shown once.
- The existing single-tenant pipeline (`public.leads` and friends) is not
  touched. This is a separate product with separate rows.

## Auth for the connector

1. Client hits `/api/mcp` without a token, gets 401 with
   `WWW-Authenticate: Bearer resource_metadata=".../.well-known/oauth-protected-resource"`.
2. Reads `/.well-known/oauth-authorization-server`, registers at
   `/api/oauth/register` (open DCR, https redirect URIs only), sends the owner
   to `/hq/authorize` with PKCE S256.
3. Owner signs in (middleware protects `/hq`), sees the client name, scopes,
   and the host it will return to, approves. `/api/hq/oauth/approve` mints a
   single-use code (10 minutes).
4. `/api/oauth/token` exchanges the code (PKCE verified) for an access token
   (8 hours) and a refresh token (90 days, rotated on every use).
5. API keys (`lfp_live_...`) from HQ work as plain bearer tokens for tools
   that do not do OAuth. Scopes: `leads:read leads:write messages:send
   content:write calculators:run`. API keys carry all scopes.

The MCP transport is stateless JSON over POST. GET returns 405, DELETE 200.
Batches are accepted. 240 calls a minute per workspace.

## Billing

`manage.ts` action `checkout` builds a Stripe Checkout Session in subscription
mode with an ad-hoc monthly price, `trial_period_days`, and
`metadata.kind = hq_subscription` + `metadata.workspace_id`. The webhook
(`lib/hq/subscription.ts`, called before the paid-only path in
`app/api/stripe-webhook/route.ts`, because a trial completes with
`no_payment_required`) ties the customer and subscription to the workspace,
then keeps `plan` in step with every `customer.subscription.*` event. Register
those events in the Stripe dashboard: `customer.subscription.created`,
`customer.subscription.updated`, `customer.subscription.deleted` in addition to
the existing checkout and invoice events.

The webhooks are the fast path, not the only one. `syncWorkspaceFromStripe`
(same file) reads the subscription straight from Stripe and applies it. The
pulse calls it when a trial clock runs out (so a card charged on schedule is
active, not lapsed; if Stripe cannot be reached the trial waits for the next
pulse instead of being canceled) and once a day for every live workspace
whose `stripe_event_at` is more than a day old. A plan change from either
path lands in the timeline as a system event; an unchanged plan writes
nothing. So a missing subscription webhook costs at most a day of lag.

Plan values: `none`, `trial`, `active`, `past_due` (engine keeps running,
owner is emailed, checkout is refused in favor of the portal), `canceled`.
`planIsLive()` is the single gate; read-only MCP tools still answer when the
plan is off so the owner can see their data. One trial per business:
`trial_used_at` is set by the webhook and a restart pays from day one.
Subscription events carry `event.created`; an event older than
`stripe_event_at` is ignored, and late events for a subscription that is no
longer the one on file are ignored too.

## Environment

- `HQ_SECRET` (new, `openssl rand -hex 32`). Optional but recommended; the
  fallback chain keeps things working without it.
- `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` as already used by the site.
- `META_APP_SECRET` for the per-workspace Meta webhook signature.
- Vercel cron: `/api/cron/hq-pulse` every five minutes (already in
  `vercel.json`).

Email from the plugin uses `hq@theleadflowpro.com` (on the verified
`theleadflowpro.com` domain) with the business's name in the from line and
their address as reply-to.

## Rules that are tests

- No em or en dashes, no guarantees, no filler phrases, in anything the engine
  writes (`lib/hq/copy.ts`; every draft path is checked).
- Every text ends with "Reply STOP to opt out." and fits in 300 characters.
- Nothing sends a text without `consent_sms` and a connected line. Texting
  the business first counts as consent; STOP turns it off; START turns it on.
- The engine never sends a follow-up on its own. It drafts; the owner sends.
  The only automatic outbound is the instant reply to a brand-new lead, and
  only when the owner turned it on. That reply stamps `auto_replied_at`, not
  `first_contact_at`: the watchdog keeps asking for the owner until a person
  answers.
- A repeat submission can fill in blanks on a lead but can never turn
  consent on; a Meta form only grants text consent with an explicit yes.
- Sending a message claims the row first (`draft` to `sending`), so a double
  tap or a retried request sends once.
- The MCP endpoint takes batches of at most 20 messages and charges the
  per-workspace limiter per message.
- Real rows only in briefs and reports. No estimates.

## Meta and calls, honestly

- Facebook Page publishing works with a Page access token pasted in Settings.
  The OAuth connect flow for arbitrary customers needs Meta App Review for
  `pages_manage_posts` and `leads_retrieval` on the LeadFlow app. Until then,
  the paste path is the real path and posts can always be copied by hand.
- Call events from OpenPhone are not ingested yet; texts are. A call into
  the business's line only becomes a lead when the caller also texts, or the
  owner adds it from the assistant ("add a lead, Sam Tate, 903...").
