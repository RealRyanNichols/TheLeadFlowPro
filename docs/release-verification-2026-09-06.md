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

Production release confirmed September 7, 2026. Vercel deployment `dpl_2EriusyrXSSJx5mkwqFnmDbzFR4D`, commit `b4a5f707b03d5c971d7f584e59e7c66c3f8f32a7`, reached READY at 06:24:26.721 UTC with the main public domains attached. Integrated release has 949 passing tests and a passing production build. SellerProof and the concurrently shipped Meta form/nurture changes were preserved.

The first production publish hit Vercel's 250 MB function limit because a dynamic image read traced unrelated public videos and downloads. The social-image function now excludes those directories while those files remain publicly served. The rebuilt trace contains about 60.2 MB of files and includes all three new ad creatives. The corrected deployment succeeded.

All 45 new guides passed live page, full-download byte equality, metadata, canonical, relevant tool-link, article-index, sitemap and unique 1200 x 630 PNG checks. Their publication queue entries and individual receipts were marked published only after verification completed. See `docs/tool-guide-publication-verification-2026-09-07.json`.

All four paid-traffic destinations now have distinct finished social images: Scoreboard, Services, Free Build, and the workshop. The workshop's separate Sites publication is version 12, source `516ebcee3cd980e3a84e5cfb4e78e18374083b43`. Both Open Graph and Twitter reference the new JPEG. Main-site legacy social-image paths also serve the complete new artwork. The 3840 x 2016 delivery files are enlarged exports of the preserved native generation, not native 4K. See `docs/production-ad-pages-verification-2026-09-07.json` for live checks.

The live contact test saved name, phone, email and body, queued its owner alert atomically, and received provider acceptance on attempt 1 at 06:31:55 UTC. Outlook independently received `CONTACT: LeadFlow Release QA Test 20260907` at 06:32:01 UTC. The synthetic contact row was then removed without touching customer messages.

The live $0 Free Build application saved all requested contact fields and its specific next action, showed the correct no-payment confirmation, and accepted both owner-alert and applicant-welcome emails on attempt 1. Outlook independently received the owner alert at 06:40:20 UTC and application confirmation at 06:40:21 UTC. The synthetic lead was marked `is_test=true` so it does not count as customer proof. Both SMS and marketing-email consent remained false.

Search Console displayed **Sitemap submitted successfully** on September 7 after the new guides were live. Its existing discovered-page/indexing totals are delayed; submission is not a claim that the new guides are indexed or ranked. No GA4 property or live Meta Purchase attribution is claimed.
