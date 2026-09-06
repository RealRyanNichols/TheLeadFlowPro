# Public previews and article discovery audit

Source implementation reviewed September 6, 2026. Deployment and search-engine indexing require separate verification.

## Coverage

- 217 canonical public pages, each with a distinct social-image URL.
- 64 page-specific previews use the approved warm palette, actual LF logo, a route-specific headline, purpose, and visible canonical path. Existing individual tool, pro-kit, collection, and article preview routes are preserved.
- 216 indexable canonical pages at this observation date. Redirects, the intentionally noindex Time Back funnel, authenticated pages, completion pages, and tokens are excluded from the sitemap.
- All eight public scoreboard metric guides are included.
- 41 of 86 free tools are explicitly embedded or linked by currently published articles. Only real article relationships appear in the new discovery helper. Future articles remain gated by their Central publication date.

## Search submission

The sitemap address is https://www.theleadflowpro.com/sitemap.xml and is already declared in robots.txt. The connector inventory exposed GSC analytics reads but no sitemap-write tool. No Search Console submission is claimed. After release, submit this sitemap in the verified site property and use URL Inspection on representative changed pages. Submission and structured data do not guarantee indexing or ranking.

Sources checked September 6, 2026:

- [Google: build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: robots meta rules](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google: structured data introduction](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Next.js: server output tracing](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)

## Remaining tool-guide gaps

These are gaps in published coverage, not newly published articles. The [tool coverage plan](tool-article-coverage-plan-2026-09-06.json) contains a distinct title, use case, worked-example plan, reader artifact, actual tool inputs, and source-review requirements for every gap. Forty-four topics were appended to the existing daily queue; the existing HVAC payment-plan entry is reused. Earlier queue entries and publication dates remain unchanged.

- Close Rate Impact Calculator: /tools/close-rate-calculator
- Reverse Revenue Goal Planner: /tools/lead-goal-planner
- Payment Plan Builder: /tools/payment-plan-calculator
- Equipment & Loan Payment Calculator: /tools/loan-payment-calculator
- Cash Runway Calculator: /tools/cash-runway-calculator
- Sales Tax Calculator: /tools/sales-tax-calculator
- Overtime Cost Calculator: /tools/overtime-cost-calculator
- Ad Spend & ROAS Calculator: /tools/roas-calculator
- Ad Budget Planner: /tools/ad-budget-planner
- Customer Payback Period Calculator: /tools/cac-payback-calculator
- Ad Test Budget Calculator: /tools/ad-test-budget-calculator
- Admin Time Audit: /tools/admin-time-audit
- Meeting Cost Calculator: /tools/meeting-cost-calculator
- What Your Hour Is Worth: /tools/owner-hourly-worth
- Star Rating Goal Calculator: /tools/review-goal-calculator
- Bad Review Impact Calculator: /tools/bad-review-impact
- Review Response Writer: /tools/review-response-writer
- Conversion Rate Lift Calculator: /tools/conversion-lift-calculator
- QR Code Maker: /tools/qr-code-maker
- Wi-Fi QR Code Generator: /tools/wifi-qr-code
- Digital Business Card Maker: /tools/digital-business-card
- Click-to-Call Button Builder: /tools/click-to-call-button
- Text Message Link Generator: /tools/sms-link-generator
- UTM Link Builder: /tools/utm-link-builder
- Email Signature Generator: /tools/email-signature-generator
- Missed Call Text-Back Script Writer: /tools/missed-call-textback-script
- Review Request Script Writer: /tools/review-request-script
- LocalBusiness Schema Generator: /tools/localbusiness-schema-generator
- FAQ Schema Generator: /tools/faq-schema-generator
- Page Title & Description Writer: /tools/meta-title-description-writer
- Ad Copy Character Counter: /tools/ad-character-counter
- Directions Link Generator: /tools/google-maps-link-generator
- Add-to-Calendar Link Maker: /tools/add-to-calendar-link
- Business Voicemail Script Writer: /tools/voicemail-script-generator
- Job Posting Writer: /tools/job-post-writer
- Google Business Post Writer: /tools/google-post-writer
- Robots.txt Generator: /tools/robots-txt-generator
- Household Budget Planner: /tools/household-budget-planner
- Grocery Unit Price Calculator: /tools/grocery-unit-price-calculator
- Childcare vs Work Calculator: /tools/childcare-vs-work-calculator
- Subscription Audit: /tools/subscription-audit
- Emergency Fund Calculator: /tools/emergency-fund-calculator
- Debt Payoff Planner: /tools/debt-payoff-planner
- Rent Affordability Estimator: /tools/rent-affordability-estimator
- Salary to Hourly Converter: /tools/salary-to-hourly-converter

## Release checks

The metadata tests cover unique routes and image URLs, canonical/OG/Twitter agreement, private and unknown path rejection, future-article gating, sitemap coverage, local art availability, incompatible metadata exports, and real 1200×630 PNG renders. The article helper tests validate exact existing links and publication gating. Production HTTP status, metadata, Vercel asset packaging, and Search Console state must be checked after the root agent releases the complete site.

## Local HTTP verification

Port 3018 returned 200 with the expected canonical, OG, and Twitter metadata for services, the forms metric guide, two tool pages, and a published article. The forms and Content Engine social-image endpoints returned 1200×630 PNGs. Private and query-bearing social-image requests returned 404 with noindex. A tool with published coverage displayed a real guide link; an uncovered tool had no empty guide section; the September 8 insurance guide stayed absent.

The local Content Engine course page returned 500 because Supabase service access is not configured in that dev process. Its social-image route returned 200. The configured deployment still needs course-body verification; no access control or service configuration was altered for this check.
