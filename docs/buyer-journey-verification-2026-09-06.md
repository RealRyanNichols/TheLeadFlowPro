# Buyer journey and payment measurement — September 6, 2026

## Release changes

- A saved workshop registration produces a **Lead** event. It no longer produces `CompleteRegistration` before payment. Workshop and kit `InitiateCheckout` fire only after the server opens checkout; a failing analytics SDK cannot block payment.
- Workshop Stripe return now goes through `/api/events/claim`. It retrieves the paid session from Stripe, checks the exact registration and ticket snapshot, runs the existing atomic seat claim, and re-reads the seat. Unpaid, mismatched, closed and overbooked registrations cannot create a Purchase receipt. Older Checkout Sessions returning to the private confirmation page also use this verification path.
- Verified, recent paid seats get a signed, ten-minute HttpOnly cookie and a clean `/events/{slug}/thanks` destination. That page contains no attendee name, token, private address, seat number or Stripe credential. The attendee button reaches the private registration through a server redirect. Private confirmation pages still have no ad analytics.
- The clean page's same-origin receipt endpoint rechecks current paid status, exact workshop, amount and opaque session-derived event ID, then atomically consumes the existing unique analytics-event row. Meta receives `Purchase`, actual USD amount, public workshop slug and opaque event ID. Repeated returns, reloads and concurrent requests cannot emit another receipt. Referrer policy explicitly allows only the same-origin receipt request, while private capability URLs remain excluded from vendor analytics.
- Receipt consumption remains at most once. Blocked scripts, a closed tab or a provider outage can prevent a browser event from arriving. This is not website Conversions API, and is not proof of Meta attribution.
- Pro Kit buyer and owner receipts now have separate durable acceptance records. Both delivery attempts run independently; an owner-alert failure does not prevent the buyer's receipt. Successful recipients are never sent again on ordinary webhook retry. Missing email configuration, provider rejection, a six-second delivery timeout, or failure to save acceptance remains retryable through Stripe.
- Stable Resend idempotency keys protect concurrent delivery and a crash after send but before saving the marker. Because [Resend documents a 24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys), an unresolved first attempt older than 23 hours, or a changed payload, requires operator review instead of risking a duplicate after that window. The database ledger stores only session ID, purpose, hashes, timestamps and provider message ID, with service-role access only.

## Database readiness

The release coordinator **applied `supabase/migrations/20260906233000_payment_email_delivery.sql` to production before release**. The private `payment_email_deliveries` acceptance ledger is available for the new webhook. The contact-notification outbox migration was also applied. No new environment variables or service subscriptions are required. Existing runtime Stripe, Resend, Supabase service-role and signing secrets remain in use.

To review unresolved deliveries, inspect service-only rows where `sent_at IS NULL`, then check the provider using the stored deterministic idempotency key/session purpose. Do not delete/reset an uncertain row simply to force a resend. Confirm provider acceptance first. New orders will have rows; old orders do not gain invented historical receipt markers.

## Real Stripe sandbox verification

An existing **test-mode** key for the Longview Training Center account was used only from a private temporary file. Three isolated Checkout Sessions were created with test labels for the $19 Missed Call Kit, $39 Every Pro Kit bundle and $97 workshop. No production purchase, lead, registration or seat row was written by this QA. No real card charge or actual receipt email was sent by this fixture.

The release coordinator completed hosted Stripe test card payment in the browser. Actual Stripe retrieval confirmed the kit and bundle `payment_status=paid`, `livemode=false`, and exact 1900/3900-cent totals. The fixture then ran the actual application claim, restore and render route handlers against those real provider sessions, with only database and email boundaries isolated:

- A locked visitor received no full documents.
- The kit claim issued signed access for one kit; the same access did not open an unrelated kit.
- The bundle claim opened all eight kits and 42 full documents.
- The actual buyer receipt body contained a working license key. The actual restore endpoint accepted that key with the matching email and restored access after clearing the original cookie.
- Repeating fulfillment did not duplicate accepted owner or buyer receipts.
- Chromium downloaded TXT, CSV, SVG, JSON and ICS files using the actual download helper. Their filenames and bytes matched the authorized documents.

The actual hosted workshop test payment was then confirmed paid at 9700 cents. The actual event claim handler verified that provider session, assigned isolated seat 1, accepted the isolated attendee/owner confirmations, preserved private arrival instructions, returned a clean $97 Purchase payload, and blocked repeat consumption. A created or unpaid checkout is not a paid seat. The current temporary result file is `/tmp/lfp-real-stripe-journey-result.json`; it contains no checkout credential or buyer contact details.

## Browser and regression evidence

An isolated Chromium fixture executed the actual workshop receipt handler, React Purchase tracker, conversion component and privacy guards. It confirmed exactly one $97 Purchase payload, no private capability/contact data, no repeat after reload, private-URL suppression, and compatibility with the thank-you page's no-referrer metadata. The actual Pro Kit purchase button still navigated to checkout when a mocked Meta SDK threw. This fixture mocks external vendor delivery and does not claim Meta Events Manager acceptance.

224 focused unit tests passed across paid kits, receipt delivery/consumption, event rules and seat fulfillment. Typecheck and changed-file lint passed. The release coordinator subsequently reported **930 full-suite tests passing across 88 suites**, with typecheck and the production build passing. Deployment and live-provider verification remain separate release checks.

The integrated production build at `http://localhost:3026` was then checked with actual Chromium page interactions at **320, 390, 768 and 1440 pixels**:

- Homepage and services pages returned 200 with no horizontal overflow or JavaScript page errors. Workshop artwork, all three homepage choice illustrations and the services hero's optimized Next Image assets loaded successfully.
- The September 17 workshop card showed Thursday, 6:30–8:00 PM Central and $97 per attendee. The three homepage choices linked to the free website offer, missed-call calculator and free ChatGPT lesson.
- At all three mobile/tablet widths, the navigation closed after selecting Build my business, same-page Home and Find my next step. Escape closed it and returned focus to its summary. Desktop navigation was visible at 1440 pixels.
- Each of the three services examples updated its selected button, explanation and destination link correctly at all four widths.
- The new close-rate article's **Save guide** link downloaded the actual 7,007-byte Markdown attachment, with the correct title, working-tool URL, source credit and no unresolved tool placeholder. Native share, clipboard fallback and Print invocation passed with local stubs; no actual external share or print job was sent.
- No real forms were submitted. Screenshot review found no release blocker. The discarded earlier attempt encountered a local build-directory collision and was rerun only after a clean production rebuild and restart; those initial 404s are not included as application failures.

Temporary evidence: `/tmp/lfp-preview-qa/report.json` and screenshots in `/tmp/lfp-preview-qa/` (`home-1440.png`, `workshop-320.png`, `choices-390.png`, `choices-768.png`, `services-390.png`, `services-example-320.png`, `article-actions-390.png`). Tall section screenshots hide the sticky header during capture to avoid a screenshot-only overlap; actual page navigation was tested with the header present.

## Paid-kit numerical corrections

28 added tests independently check paid-kit math and output documents. Fixed:

1. Rate-card prices now round **up** to the next $5 so they cannot land below the computed requirement. Negative or letter-contaminated service hours are rejected instead of having characters stripped into another number.
2. Estimate line prices use valid cents. Tax, deposit and remainder reconcile in cents, including a five-cent total split into three and two cents. Empty or fractional-cent prices are rejected.
3. Quote follow-up lift cannot imply closing more than 100% of available quotes.
4. Review targets use integer tenths for stable ceiling arithmetic and reject direct inputs outside the controls' one-decimal precision. Zero existing reviews requires the first review even if a placeholder current rating is high. Weekly CSV increments reconcile with cumulative projected counts at low fractional volumes.
5. A 90-minute response promise remains 90 minutes rather than rounding to two hours.

Two additional recovery safeguards reject malformed Pro metadata/amount/currency before a purchase row can become an entitlement, and return a recoverable error when purchase lookup fails instead of falsely reporting that recovery email was sent.

## External boundaries

Production checkout creation/merchant branding and sandbox paid application fulfillment are distinct from a real production paid order or inbox-delivered receipt. Google Ads/GA4 configuration and Meta dataset diagnostics are verified by the release coordinator. Do not infer live Google tracking, website CAPI, attributed ad revenue, or a delivered production attendee email from these isolated tests.
