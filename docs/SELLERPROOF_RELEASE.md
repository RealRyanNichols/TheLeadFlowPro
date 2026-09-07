# SellerProof through The LeadFlow Pro

User request: build out SellerProof and put it for sale through The LeadFlow Pro. This release retains SellerProof's existing $49 single-packet price and neutral commercial brand. No founder win-rate, customer testimonial, revenue promise, or personal dispute details are published.

## Offer and delivery

- `/sellerproof`: sales page, price, scope, FAQs, and sample.
- `/sellerproof/build`: free three-step preview; paid printable export for one dispute.
- `/sellerproof/sample`: fictional sample with no real customer records.
- `/sellerproof/terms` and `/sellerproof/privacy`: purchase scope and evidence handling.
- `/sellerproof/opengraph-image`: 1200 × 630 social card.
- Tools page, footer, and public-page catalog link the offer. The builder stays out of indexing and analytics.

The seller enters references, deadline, product type, timeline, source notes, and an explanation. The tool flags missing information without inventing facts. Export is a self-contained HTML document, printable to PDF. It includes the response, timeline, index, notes, and review checklist. Original files are not uploaded, merged, or submitted. No processor account integration, AI call, subscription, outcome prediction, or automatic dispute submission is included.

## Payment and access

`POST /api/sellerproof/checkout` resolves $49 on the server and creates a card-only Checkout Session on LeadFlow Pro's existing Stripe account. Metadata contains only a product identifier, random packet ID, version, and a digest of the dispute identity. It never contains evidence, business name, or raw order/dispute references. Duplicate requests have a bounded idempotency key.

`POST /api/sellerproof/access` retrieves Stripe's current session and expanded charge. It requires completed, paid, USD, $49, the exact product metadata, the correct mode, and a charge with no refund or dispute. It issues a signed, HttpOnly access cookie scoped to the SellerProof API and a recovery key. A success URL or client flag does not grant access.

`POST /api/sellerproof/export` checks the signed access, exact dispute identity, four review confirmations, and current Stripe payment again before rendering. Changed order/dispute references, amount, currency, or provider require a separate purchase. Refunds revoke future hosted exports; downloaded files remain with the buyer.

The existing Stripe webhook records the purchase in the existing `purchases` table and dispatches SellerProof-specific buyer and owner receipts. Receipt sends use provider idempotency keys. The recovery token uses a stable purchase timestamp, so retry payloads stay identical. No customer evidence enters email.

## Privacy and persistence

Drafts use browser session storage. Private downloadable JSON backups contain entered data and, after purchase, the recovery key. The server handles checkout/export entries transiently without saving evidence to the database. Users must keep backups and exports private and attach originals themselves. Clear draft does not delete downloaded files.

Input is bounded and validated; dates and amounts are checked; plausible card-number and security-code patterns are rejected. This is not a complete redaction system. HTML export escapes entered text. APIs reject cross-origin requests and emit no-store responses. The existing analytics privacy guard excludes `/sellerproof/build`, including client-side transitions. Original evidence files never leave the device through this tool.

## Configuration

Reuse existing production variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `UNSUBSCRIBE_SECRET`. Optional `SELLERPROOF_SECRET` or existing `PRO_TOOLS_SECRET` can replace the signing fallback. No new service, database migration, or paid infrastructure is required. Production secrets are marked sensitive in Vercel and cannot be downloaded locally; do not replace them with downloaded `[SENSITIVE]` placeholders.

## Validation

- Prettier on new implementation files.
- ESLint on changed code and new tests.
- TypeScript `tsc --noEmit`.
- Full unit suite: 707 tests passed, including 14 SellerProof engine, access, route, and receipt tests.
- `npm run build` validates the tool registry, public visuals, social assets, and production application.
- Browser checks at desktop and 390px: landing page, builder navigation, source notes, date persistence, missing evidence, no horizontal overflow, backup download, and draft recovery.
- Paid success, unpaid rejection, altered case/price, forged access, refunds, and receipt retries use isolated mocked Stripe/Resend responses. No real customer email or charge is used for these tests.

The original SellerProof app and the unrelated modified LeadFlow Pro checkout are preserved. The implementation lives in a separate `main` checkout based on production commit `529f05a`.

## Launch verification

Do not equate a successful build or loaded Stripe checkout with a completed sale. Verify the unpromoted deployment, exact $49 checkout, production alias, and public routes separately. No real payment should be made solely for verification without authorization. Record final deployment details in the project release note.

## Ready-to-use launch copy (not posted)

**Version 1**

A chargeback notice gives you a deadline. It does not organize your records for you.

SellerProof helps turn your receipts, messages, timeline, and supporting records into a clear response packet. Review the preview free. Export one dispute packet for $49, with no subscription.

Start at https://www.theleadflowpro.com/sellerproof. You review and submit it yourself. Not legal advice. No outcome guarantees.

**Version 2**

Before you respond to a chargeback, get the record in order: what was purchased, what happened, and which source supports each point.

SellerProof walks you through the draft, timeline, evidence index, and missing information. Free preview. $49 for a printable packet you can save as PDF.

https://www.theleadflowpro.com/sellerproof. You attach your original evidence and submit through your provider. No outcome guarantees.
