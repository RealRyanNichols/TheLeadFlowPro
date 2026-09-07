# September 6 release verification

## Release scope

Forty-five remaining tool guides; independently checked calculator and paid-kit arithmetic; buyer recovery and payment-confirmed tracking; durable contact alerts; actual business capture coverage; five relevant legacy redirects; and the requested mobile, workshop, services, and Free Build improvements.

The homepage now offers three direct choices. The workshop has a dedicated creative and prominent September 17 date. Services shows bright customer-record and follow-up artwork and working examples. All eight stages stay visible without horizontal scrolling. The mobile menu closes on navigation, hash links, and Escape.

## Contact delivery

Applied production migration `20260906230000_contact_notification_outbox.sql` before release. Service-only message inserts atomically create a private alert job. The owner is Ryan; the configured owner inbox defaults to hello@theleadflowpro.com. Failed or ambiguous delivery remains queued for the existing protected five-minute cron. Seven bounded attempts, a five-minute sender lease, stable payload and provider idempotency key, and a 23-hour automatic window prevent blind repeat sends. A final-attempt concurrency regression is covered.

Production transactional SQL verified queue creation, anonymous access restrictions, and cascade cleanup, then rolled back the synthetic record. A provider acceptance ID is distinguished from inbox delivery. A fresh live form and Outlook check is a post-deployment gate.

The payment delivery ledger and both business coverage RPCs were also applied. They do not backfill invented historical delivery or combine overlapping lead sources into unique people.

## Pre-deployment checks

- Full suite: 930 passing tests in 88 suites, no failures or skips.
- TypeScript: `npx tsc --noEmit --incremental false` passed.
- Production: `npm run build` passed, including calculation, tool, visual, and social gates.
- Responsive integration at 320, 390, 768, and 1440 pixels: homepage, workshop, menu, service interactions, article download/share/print, all eight stages, and Free Build. No horizontal overflow, missing images, or browser page errors.
- Real Markdown download matched the authorized article. Submission and share boundaries in local UI checks were intercepted to avoid customer or provider side effects.
- Three actual Stripe sandbox checkouts completed; application fulfillment, fresh-browser access recovery, bundle entitlement and downloaded file bytes were checked with isolated storage/email boundaries. This is not a live charge or delivered production buyer receipt.

## Provider observations

Search Console reported 190 indexed and 130 excluded pages on its September 3 report. The sitemap was successful and last read September 6, with 216 discovered URLs before these new guides. Fifty-three reported 404 examples were examined; five have relevant replacements and receive direct redirects. Unrelated retired pages remain 404.

The website Meta pixel is 1012793881211964. Its observed report contained PageView and Lead activity, with no Purchase observed. Test fixtures verify the new payment-only event payload, privacy and deduplication; they do not establish Meta receipt or ad attribution. Website CAPI was not configured. A separate CRM dataset is not treated as the website purchase pixel.

The production GA4 ID and Google Ads ID were empty. Neither inspected Google account exposed an existing Analytics property. GA4 is not claimed active.

## Production status

Deployment, live guide coverage, current sitemap resubmission, and fresh contact inbox delivery are pending. Record their exact results after the authorized push; passing local checks alone do not satisfy these gates.
