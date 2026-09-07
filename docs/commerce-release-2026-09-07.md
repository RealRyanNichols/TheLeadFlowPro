# Commerce, training, and guide library release

September 7, 2026. Continues the verified ad-page release without replacing its checkout, pricing, lead routing, or social artwork.

## Working additions

- `/commerce`: original bright commerce artwork, three customer-path examples, a free downloadable build list, and scoped inquiry intake. Name, phone, email, business and selected modules go through the existing reliable lead outbox. The commerce welcome confirms a request, not a payment or installed integration.
- `/api/commerce/catalog`: a public, cacheable first-party feed of the eight actual Pro Kits. Prices and included deliverables come from the same registry used by checkout. No customer data, keys, entitlements or generated files are exposed.
- Gideon consumes that feed on its separate `/leadflow` page. Purchasing and download access stay with the native LeadFlow product page. This is catalog integration, not shared authentication, carts, or merchant payment settlement.
- `/training`: ten individual illustrations, free-course entry, existing-member continuation and a separate custom-platform inquiry. Existing access and saved progress remain authoritative.
- `/articles`: search, task filters, nine initial cards and load more. All 94 current canonical guide links remain in the server HTML; without JavaScript every guide remains visible.
- Package checkout failures keep the saved inquiry and offer retry without duplicating unchanged lead data. Optional analytics cannot interrupt either package checkout or the shared BuyButton.

## Seller model directed by Ryan

Gideon is moving into The LeadFlow Pro's client and partner offering. Buyers can browse openly; selling requires a reviewed LeadFlow business relationship or partner agreement. An AI-company ownership claim still requires verification and an agreement. Signup or an arbitrary tool purchase is not automatic approval. A 1% platform-fee benefit is subject to the approved agreement, with processing and other costs separate. Existing billing contracts are not changed by this release.

Gideon's physical marketplace is not ready for live payments: its current stock is demo, and genuine payment settlement, merchant onboarding, tax and fulfillment are unfinished. Its old paid-order path and permissive browser order writes were unsafe. Those have been repaired separately, rather than claiming the demo is completed commerce.

## Verification

- Main suite: 963 passing tests, 89 suites, no failures or skips.
- Production build and TypeScript passed.
- Commerce: 18 actual-component browser checks and five unit checks; all nine images load at 320, 390, 768 and 1440 px, with no overflow or automated WCAG A/AA violations. APIs were mocked.
- Package/BuyButton: 12 browser checks and 26 existing payment regressions, with all checkout and lead calls mocked.
- Training: 15 focused tests; distinct imagery, free/member ordering and mobile accessibility checked.
- Articles: seven browser checks against the production preview and four unit tests. All 94 links in server HTML and all 94 visible without JavaScript.
- Live deployment, commerce form delivery, catalog consumer and public route verification are recorded after deployment. No new live charge is authorized or performed.

See `commerce-qa-2026-09-07.md`, `next-build-priorities-2026-09-07.md`, and `commerce-search-and-funnel-plan-2026-09-07.md` for evidence and follow-up gaps. No guarantee of traffic, ranking or sales is made.
