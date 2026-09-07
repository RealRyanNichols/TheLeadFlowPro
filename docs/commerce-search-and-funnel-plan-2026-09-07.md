# Commerce: search and customer path

Reviewed September 7, 2026. This is a source-backed build plan, not evidence of rankings, search volume, paid orders, or delivered integrations. Application files were inspected without modification. The main agent is implementing `/commerce`, a public catalog backed by the existing Pro registry, a sale-to-delivery planner, and scoped lead intake in parallel.

## What the site already has

`/services` explains the business build; `/free-build` offers an application for an approved five-page website; `/packages/launch` is the separate $1,000 Website Launch ($500 start, $500 after approval before launch). Its authoritative exclusions in `lib/offers.ts` expressly exclude ecommerce/payment systems. Keep those boundaries visible when adding commerce links. A visitor asking to sell products should receive an appropriate scope, not discover an extra charge after applying for the website.

`/tools` has 86 free tools; `/tools/pro` has eight paid kits. These are working destinations to reuse, not reasons to create another generic tool directory. `/packages/industry-os` currently mentions GideonHQ as a platform example. Before this work, there was no dedicated commerce decision page connecting these pieces.

The earlier [next-build audit](next-build-priorities-2026-09-07.md) identified confusing package selection, payment-failure messaging, an overlong diagnostic, and a dense add-ons menu. Package payment messaging is being changed concurrently; recheck its final behavior rather than treating the audit as current code. Those fixes support this plan more directly than adding many new pages.

## Gideon claims: resolve before selling through them

The public [Gideon homepage](https://gideonhq.com/) currently identifies a demo build and marks example listings as demos. Its 1% headline conflicts with a Free 2% selector and a $2 deduction on a $100 example. Digital products are presented as inquiry-only; shipping mentions placeholders. These are public-page observations, not a checkout or fulfillment audit. Do not repeat an all-in 1% claim, imply live inventory, promise digital delivery, or present CSV export as automatic channel synchronization. The active commerce agent must establish the actual fee, eligible product type, merchant, checkout, and delivery behavior before LeadFlow promotes that path.

Until then, `/commerce` can honestly show a labeled conceptual integration, explain the planned handoff, collect a scoped request, and link to LeadFlow's existing kits. It should not imply a LeadFlow inquiry has opened a seller account or completed an order on Gideon.

## Useful page gaps, in build order

The intent descriptions below are customer-question hypotheses based on the offers and tools, not measured Google query volumes. Proposed guide URLs are unpublished until separately built and verified; check the live article catalog for equivalent coverage before adding them.

| Priority / exact route | Customer question | Useful content and next action |
| --- | --- | --- |
| 1. `/commerce` (active build) | “Can I sell a product, take payment, and deliver it from my website?” | Show three distinct paths: digital download, physical product, and a service/deposit. Let the reader choose one and see the actual steps, owner, and delivery output. Expose the existing kit catalog in crawlable HTML. CTA: plan my selling setup; secondary: try a real kit. State which integrations are working versus scoped. |
| 1. `/services` and `/free-build` (existing) | “Does a business website include an online store?” | Add a concise scope comparison with examples of an inquiry website and a paid order. Link “Need checkout or product delivery?” to `/commerce`. Preserve the free application and Website Launch terms. Use Longview/East Texas context where factual; do not make a duplicate town page for every keyword. |
| 1. `/packages/system-map`, `/packages/industry-os`, `/add-ons` (existing) | “What will you build and who handles the sale?” | Show a labeled sample order map: offer, checkout, payment status, delivery, owner, exception. Explain that the map is a paid planning deliverable, not an installed store. Present commerce as a scoped capability, without inventing a new fixed price or automatic return. Link to `/commerce` for the working example and intake. |
| 2. `/articles/website-or-marketplace-for-your-first-product` (proposed) | “Should I use my own website, a marketplace, or both?” | A decision worksheet using product type, fulfillment, audience, fees, and operational capacity. Include a fictional physical-product example and separately a digital kit. Show what stays in each system. Link to `/commerce` and the relevant fee tools. Publish once the Gideon comparison can cite verified capabilities. |
| 2. `/articles/what-happens-after-a-customer-pays-online` (proposed) | “How does the customer actually get what they bought?” | Demonstrate a real permitted LeadFlow kit purchase journey with redacted screenshots: payment confirmation, receipt, access, download, recovery, and support. Include an order handoff checklist. Distinguish payment failure, pending payment, and paid-but-delivery-failed. CTA: try the kit, or scope this flow for my business. |
| 2. `/articles/how-to-review-an-ai-product-listing-before-publishing` (proposed) | “Can AI help me list products without making things up?” | Use an owned sample product, its actual attributes, an AI draft, and corrections. Downloadable review sheet: condition, dimensions, compatibility, images, price, shipping, prohibited claims. Link to `/commerce`; link to Gideon's listing workflow only when that workflow is verified. |

## Internal links to implement

Use descriptive HTML links and preserve the existing canonical product/tool URLs. New sections and guides must not bury the free tool behind an intake.

| Existing source | Link destination and label |
| --- | --- |
| `/services`, `/system/sale` | `/commerce`: “Connect the sale to payment and delivery.” |
| `/free-build`, `/packages/launch` | `/commerce`: “Need an online store or checkout?” immediately beside the relevant scope explanation. |
| `/tools/pro`, `/tools/pro/[slug]` | `/commerce`: “Want this buying flow for your business?” after the kit's own primary action. |
| `/tools/platform-fee-calculator`, `/tools/credit-card-fee-calculator` | `/commerce`: “Plan the payment and delivery path.” Explain entered rates are assumptions, not current provider quotes. |
| `/tools/profit-margin-calculator`, `/tools/payment-plan-calculator` | `/commerce` where the result naturally raises a selling/setup question; retain related free-tool links. A payment worksheet does not create a live installment agreement. |
| `/articles/how-to-separate-sales-tax-from-a-tax-inclusive-total` | `/tools/sales-tax-calculator` first; optional `/commerce` link for checkout setup. Arithmetic does not establish tax obligations or configure collection. |
| `/articles/why-ad-revenue-and-ad-profit-need-separate-columns` | `/tools/roas-calculator` first; `/commerce` for connecting confirmed orders to delivery. |
| `/commerce` | `/tools/pro` and selected individual kits, the fee/margin tools above, the existing package pages, and each supporting guide once published. External Gideon links remain clearly labeled and capability-specific. |

Cross-domain links may carry a bounded campaign/source label after consent rules are satisfied. Never put customer names, email addresses, phone numbers, private order access tokens, or payment secrets into marketing URLs. A public catalog feed exposes published products only; it is not a license to expose buyer or order records.

## Google guidance translated into release work

- Build pages around a completed customer task, with original examples, useful outputs, accurate authorship, and real evidence. Avoid producing extra AI pages that simply rephrase the same answer. These choices follow Google's [helpful content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) and [AI-content guidance](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content).
- Link the hub to its products and guides with `<a href>` links visible without submitting a search. Keep the useful catalog available in HTML even if an API powers interactive controls. Google explains why category-to-product links matter in its [ecommerce site structure guidance](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure).
- Publish one stable canonical URL per useful page; add approved public pages to the sitemap and verify HTTP 200, mobile readability, distinct imagery, and intentional indexability. Keep private checkout/access/account pages out of the public catalog. Do not turn legitimate missing routes into misleading generic redirects.
- Product markup must describe the actual visible offer. Choose the appropriate product feature and validate it; merchant listings concern pages where customers can buy from the merchant. Never fabricate reviews, availability, shipping, or prices. A proposed integration hub is not automatically a product listing. See Google's [product structured data guidance](https://developers.google.com/search/docs/appearance/structured-data/product).
- Evaluate Merchant Center only for an eligible, operational catalog with consistent price/availability, policies, and ownership. Ordinary organic Search does not require a Merchant Center feed. Feed eligibility and policies need a separate review, particularly for digital tools. See [sharing product data with Google](https://developers.google.com/search/docs/specialty/ecommerce/share-your-product-data-with-google).
- Keep actual local business details and service areas accurate. Google describes relevance, distance, and prominence as local factors, and says better local ranking cannot be purchased. No invented review/photo thresholds or ranking deadlines. See [Google Business Profile local guidance](https://support.google.com/business/answer/7091).
- AI search does not justify a separate speculative “GEO” page factory. Google's [current AI-search optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) retains foundational SEO and emphasizes distinctive, useful experience.

## Evidence that decides the next work

Release the hub only after its links, product prices, checkout merchant, error states, intake owner alert, and mobile output are checked. Mark the first complete payment-to-delivery verification separately from a checkout merely opening. Guide publication means live body, working artifact, unique preview, canonical and internal links; it does not mean indexed.

After publication, compare Search Console page/query impressions and clicks with first-party tool use, qualified inquiries, checkout starts, provider-confirmed paid orders, and successful deliveries. Use consistent windows; separate internal/test activity and refunds. A form submit is a lead event, not a purchase. Prioritize actual high-intent pages with discovery problems or payment/delivery failures over creating more pages. No traffic, ranking, or profit guarantee follows from this plan.
