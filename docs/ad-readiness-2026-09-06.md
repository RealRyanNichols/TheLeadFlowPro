# Payment and ad readiness audit — September 6, 2026

## Scope and evidence boundary

Audited the existing Pro Kits, paid workshop checkout, purchase access/delivery code and conversion privacy controls. Live checks used `https://www.theleadflowpro.com` after production commit `a344f276a9e2b66e033b0d9ebb35b849c2381914` reached Vercel READY. The confirmation corrections below are local release changes until the coordinated deployment is verified.

Eight **uncharged live Stripe Checkout Sessions** were created without supplying customer contact information, entering a card or completing payment. No charged order, refund, subscription, ad campaign, paid API operation or customer outreach was performed. Checkout creation is not evidence of a completed sale, delivered receipt or fulfilled paid order. Account-specific Stripe processing fees were not independently verified; this audit does not quote a fee schedule or promise a payout amount.

## Pro Kits

Every published kit returned HTTP 200 from production `/api/checkout` with a live Stripe Checkout URL. The request included an intentionally incorrect client amount; the server ignores it and derives pricing from its own catalog. Browser QA confirmed the first saved session displays the Missed Call Text-Back Kit at $19 with The LeadFlow Pro branding, and the public checkout key ties it to the intended merchant account. The other seven amounts in the table are server-catalog values; their checkout prices were not individually inspected in the browser during this audit.

| Kit | Server price, USD, one time | Locked preview | Full output documents defined |
| --- | ---: | --- | ---: |
| Missed Call Text Back Kit | $19 | 200; no full documents | 6 |
| Google Review Kit | $19 | 200; no full documents | 7 |
| Quote Follow-Up Kit | $19 | 200; no full documents | 5 |
| Job Estimate Kit | $29 | 200; no full documents | 6 |
| QR Sign Kit | $10 | 200; no full documents | 3 |
| Rate Card Kit | $19 | 200; no full documents | 5 |
| Local SEO Schema Kit | $19 | 200; no full documents | 5 |
| White Label Tool Embeds | $29 | 200; no full documents | 5 |

The catalog also defines the Every Pro Kit bundle at $39; a separate live bundle session was not created in this audit.

An actual unpaid session sent through `/api/pro/claim` returned 303 to `/tools/pro/unlock?claim=unpaid` and issued no access cookie. All eight live render previews returned `unlocked: false` and `documents: null`. Their advertised outputs include printable HTML, text, CSV, SVG, JSON and calendar files as applicable.

Code and tests verify that paid access requires a server-retrieved paid Stripe session with a recognized kit and matching catalog subtotal/total. Access cookies and restore keys are signed; individual kit access does not unlock another kit. The render endpoint keeps complete documents server-side until entitlement is verified. Input and exported HTML/CSV/links are sanitized. Browser download and print handlers exist.

The webhook stores paid purchases by unique Stripe session ID and sends the receipt/license restore link. Receipt provider errors request a Stripe retry. Purchase-row upsert is idempotent; receipt emails have no separate sent marker, so webhook redelivery can duplicate a receipt. A real charged purchase, buyer inbox receipt, cross-device restore and paid browser download were not performed.

Private diagnostic session URLs were stored in `/tmp/leadflow-pro-live-checkouts.json` with mode 600 for browser QA. Do not copy checkout credentials into public documents or analytics.

## Merchant and workshop

**Merchant confirmed for the live kit checkout on September 6:** the release coordinator's browser QA showed the Stripe account **Longview Training Center**, account ID `acct_1TTna3BHH7tuNwAA`, and masked live publishable key `pk_live_...8xTM`. The first saved checkout displayed **Pay The LeadFlow Pro**, **Missed Call Text-Back Kit**, **$19**.

An independent local decode of that existing checkout URL's public fragment found a live publishable key containing the exact account identifier `1TTna3BHH7tuNwAA` and ending in `8xTM`. This ties the inspected production checkout to the same account shown in the dashboard. Only the public fragment was decoded; no secret API key, complete publishable key or checkout-session credential is included in this audit. No new transaction or API request was made for this check.

The Stripe connector still requires reauthentication, but that connector failure is separate from the verified live checkout. Source inspection confirms Pro Kits and event checkout use the same runtime `STRIPE_SECRET_KEY`; this audit did not complete an event payment.

The live availability endpoint returned the following on September 6:

- Workshop: ChatGPT for Business Owners: Live in Longview.
- September 17, 2026, 6:30 p.m. America/Chicago (`2026-09-17T23:30:00Z`).
- $97; capacity 10; 10 seats remaining at the check.
- `registration_open: true`, `payment_ready: true`, clinic enabled.
- Registration: https://www.theleadflowpro.com/events/chatgpt-for-business-owners-longview.

The readiness flag checks Stripe, webhook, Supabase service-role and Resend configuration. Event checkout validates an existing registration token, reserves/persists the Checkout Session and uses idempotency; paid seat fulfillment has separate tests. No new event registration or paid seat was created during this audit. Availability is a snapshot, not a guaranteed remaining-seat count.

## Confirmation corrections for this release

`/thank-you` previously trusted `purchase` query hints for deposit, event and legacy training confirmations. `/free-build/welcome` previously trusted the `tier` query and reported its catalog price as paid. Both could show a paid order without a verified transaction.

The correction requires Stripe to return the exact requested session ID, paid status, USD and a valid nonnegative integer total. It uses verified product metadata and the actual paid total, including discounts. Failed verification shows a help state with no paid claim or conversion. Ordinary free lead confirmation and the Free Website Program application remain unchanged. Historical paid Free Build IDs retain a generic receipt-based confirmation without substituting today's tier or price; unrelated paid products do not become Free Build orders.

The shared conversion component no longer invents a $497 amount. Purchase events require a valid amount and stable opaque event ID derived from the verified session. Meta receives that ID as `eventID`; Google receives it as `transaction_id`. Raw checkout session credentials and customer identity are not included in these event payloads. Existing privacy guards remain in force.

## Ad measurement and consent limits

- Browser InitiateCheckout exists for Pro Kit buttons. This is not proof of a Purchase conversion or attributed ad revenue.
- Private routes and access-bearing URLs, including `session_id`, email and license-key queries, are excluded from third-party analytics. Public first-party payloads strip queries and avoid raw form answers, names, emails and phone numbers. These safeguards have regression tests.
- Those runtime privacy controls are not an affirmative cookie-consent system. Lead forms keep email/SMS marketing permissions separate; a purchase does not imply either permission.
- **The Pro Kit browser Purchase handoff is implemented for this release.** After server verification, the private claim endpoint redirects to the clean purchased kit or bundle URL with a signed, HttpOnly receipt that expires after ten minutes. It contains only an opaque event ID, actual paid amount, currency, SKU and timestamps. No checkout session credential or contact identity reaches the browser analytics payload. Unpaid, unknown, mismatched and zero-dollar sessions cannot create a purchase receipt; a free or historical claim also clears an older pending receipt without removing kit access.
- The existing privacy guards and SDK initialization remain authoritative. The public kit waits for them, then requests the receipt through a same-origin POST. The endpoint requires the matching signed kit entitlement and exact clean public referrer, atomically consumes the event once, and clears only the receipt cookie. The existing production `analytics_events.client_id` UNIQUE constraint was confirmed read-only; no migration or new infrastructure is needed. Receipts are issued only for recent Stripe sessions within the minimum 30-day analytics retention window, accounting for receipt lifetime and clock skew. Historical purchases continue to unlock without creating a new conversion.
- Meta receives the verified amount, SKU and opaque `eventID`; Google receives the same amount and opaque `transaction_id`. Concurrent requests, repeated paid claims, page reloads and component remounts cannot produce a second receipt delivery. This is an at-most-once handoff: closing the page after consumption, blocked vendor scripts or vendor failures can still prevent delivery. Browser simulation is not evidence of provider acceptance or attributed revenue.
- Source references `META_ACCESS_TOKEN` and `META_PAGE_ACCESS_TOKEN` for existing platform uses, but no CAPI-authorized production credential was independently established. The accessible Vercel project tool did not expose environment names. No new CAPI integration, consent bypass or alternate private-data transport was added.
- **Meta Conversions API remains unconnected.** The receipt handoff does not override private-URL suppression or create an affirmative consent system. Real paid checkout, provider Events Manager/Google diagnostics, attribution and any separately authorized server integration remain outside this audit. Do not call the ads fully purchase-optimized from this release alone.

## Validation and release handoff

The initial money audit passed 181 tests across Pro access/rendering, Stripe classification, event payments/fulfillment and analytics privacy. The confirmation run passed 192 tests in 31 suites; the expanded receipt, money-flow and privacy run passed **236 tests in 42 suites**, with no failures or skips. Added tests cover forged purchase hints, unpaid/malformed/mismatched provider responses, actual discounted totals, opaque event IDs, historical Free Build tiers, forged/expired receipts, source-session age, exact entitlement/referrer validation, atomic repeat consumption and recoverable storage failures. Actual thank-you and Free Build welcome components were also rendered with mocked provider responses: six forged purchase hints and four forged tier links do not show payment received or conversion markup; the ordinary Lead state remains; verified product metadata wins over a changed URL hint; discounted and historical paid orders retain their actual amounts; an unrelated paid product does not become a Free Build order.

An isolated Chromium check exercised the actual claim/receipt route handlers, React tracker, conversion component and existing privacy guards with mocked Stripe, database and vendor SDKs. The real claim handler's 303, clean Location, no-store and no-referrer headers were asserted; the fixture followed that Location with a scripted navigation so redirected requests also remained mocked. A verified $14.25 discounted kit produced exactly one Meta Purchase and one Google conversion with the matching opaque ID and SKU, no raw session or customer data. Remount with browser storage blocked, reload and repeated paid claim did not duplicate it. A private query URL never consumed or tracked; unpaid issued no access; zero-dollar paid access remained usable and cleared an older pending receipt without a Purchase. This validates the application handoff, not a real charged sale or external vendor receipt.

Focused lint passed with no warnings or errors, `tsc --noEmit --incremental false` passed, and `git diff --check` passed. A full build and production browser checks are owned by the release coordinator. No deployment or Git operation was performed by this audit subtask.

## Comparable first-party product references

These are observed product patterns, not evidence of LeadFlow ranking above another company. The recommendations use the existing tool engine and exports; they were not implemented as part of this narrow payment correction.

| Official reference | Observed pattern | Specific LeadFlow opportunity |
| --- | --- | --- |
| [HubSpot Email Signature Generator](https://www.hubspot.com/email-signature-generator) | Templates, brand customization, no-account use and HTML copying are explicit. | Explain preview, purchase and download in equally direct terms; show a finished output. |
| [Shopify Invoice Generator](https://www.shopify.com/tools/invoice-generator) | Numbered business/customer/item steps lead to a completed invoice. | Label the existing engine's progression: Brand it, Review it, Download it. |
| [Canva QR Code Generator](https://www.canva.com/qr-code-generator/) | Export formats and static/dynamic QR differences are explained. | Name our static destination behavior and formats; include a scan-before-print check. |
| [Jotform Order Form Templates](https://www.jotform.com/form-templates/category/order-form) | Finished previews and concrete order use cases make templates understandable. | Show sample kit deliverables and distinguish submitted requests from paid confirmation. |
| [Bonsai Quote Templates](https://www.hellobonsai.com/templates/quotes) | Quote templates are organized by recognizable jobs and industries. | Use contractor/service examples for the existing estimate and rate-card kits. |
