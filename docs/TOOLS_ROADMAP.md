# Tools roadmap

What is live, what is next, and what is deliberately not published yet.

Statuses: `proposed`, `formula-review`, `implementation`, `image-needed`, `qa`,
`ready`, `published`. Only `published` tools are routable, in the sitemap, in
search or in the directory. There are no placeholder pages at any status.

`npm run validate:tools` prints the live count and the status breakdown.

## Published: 86 tools

### The original 78, upgraded in place

Every original slug is unchanged and every original URL still resolves. The
upgrade added: domain, tool type, goals, industries, audiences, keywords and
synonyms; a disclaimer type and a data-sensitivity level; original card and hero
artwork; a unique OG image; industry presets on the tools where different trades
genuinely start from different numbers; assumptions shown under the result; and
better related-tool selection driven by shared industry rather than category.

`tests/fixtures/original-78-slugs.json` pins the list, and
`tests/registry.test.ts` fails if any of those URLs stops resolving.

| Group | Tools |
| --- | --- |
| Leads and follow-up | 10 |
| Money and pricing | 18 |
| Costs, ads and time | 17 |
| Reputation and website | 11 |
| Generators, QR and links | 22 |

### Batch 1: Home and family (8 new, published)

The first expansion batch. Household tools, financial disclaimer, sensitive data
handling, everything client side.

| Tool | Type | Notes |
| --- | --- | --- |
| Household Budget Planner | planner | 50/30/20 comparison, CSV export |
| Grocery Unit Price Calculator | converter | unit price across five unit types |
| Childcare vs Work Calculator | calculator | net of childcare, commute and work costs |
| Subscription Audit | checklist | five year total with compounding price rises |
| Emergency Fund Calculator | calculator | target, gap and a real timeline |
| Debt Payoff Planner | planner | month by month amortization, extra payment comparison |
| Rent Affordability Estimator | estimator | against take-home, not gross |
| Salary to Hourly Converter | converter | real rate including unpaid hours |

This batch is what makes a search for "mom", "family", "budget" or "childcare"
return something useful, which it did not before.

## Collections

Eleven published collections, each with its own written intro, audience, problem
list and FAQs. A collection only becomes routable when at least six published
tools resolve into it, which is what stops thin programmatic pages existing.

`home-services`, `real-estate`, `mortgage-lending`, `restaurants-and-food`,
`salons-and-barbers`, `medical-and-dental-operations`, `legal-practices`,
`qr-codes-and-links`, `getting-more-leads`, `pricing-and-margin`,
`website-and-online-presence`.

## Not yet published

These are scoped, not built. Nothing below is visible on the public site, and
nothing below has a route, a card or a sitemap entry. Each batch ships complete
or not at all.

### Next up, highest value first

| Batch | Tools | Status | Why this order |
| --- | --- | --- | --- |
| Realtors and real estate | 15 | proposed | Collection page is live and thin. Commission net, seller proceeds, cap rate, cash-on-cash, rent vs buy, open house QR sign-in, listing checklists. |
| Mortgage lenders | 14 | proposed | Highest search demand of any group here. PITI, DTI, LTV, refinance break-even, points and buydown, closing costs, extra payment, pull-through. |
| QR, link and social preview | 27 | proposed | The QR encoder is already local and supports PNG and SVG, so this batch is mostly new tool definitions over an engine that exists. Wi-Fi, vCard, call, text, email, calendar, menu, review and donation codes, plus UTM, link-in-bio and the OG preview simulators. |
| Construction and trades | 17 | proposed | Concrete, drywall, paint, flooring and roofing material estimators need the construction disclaimer and verified formulas per material. |
| Restaurants and food | 16 | proposed | Food cost, recipe yield, menu engineering, labor percentage, tip pool, table turn, delivery fees. |
| Medical and dental operations | 14 | proposed | Operations only. No diagnosis, no treatment, no protected health information, no compliance claim. |
| Legal practices | 13 | proposed | Intake and practice operations. No authoritative deadline calculation without verified jurisdiction rules. |
| Salons, barbers and beauty | 13 | proposed | Chair rent vs commission, capacity, rebooking, retail margin. |
| Airbnb and hospitality | 14 | proposed | Occupancy break-even, nightly rate, cleaning fee, platform fee, turnover. |
| Churches and nonprofits | 15 | proposed | Giving goals, volunteer staffing, event budgets, donation QR. |

### Later batches

Public safety and search and rescue (14), government and public administration
(14), private security (12), administration and HR (15), education and students
(16), young, midlife and older adult life stages (18), hunting and outdoors (14),
tourism and attractions (13), applications and SaaS (15), mobile and storefront
services (12), plus the remaining commercial collections: insurance, auto
dealerships, auto repair, ecommerce, retail, creators, photographers, weddings,
hotels, pet services, agriculture, manufacturing, warehousing, logistics, gyms,
coaching, accounting, cleaning, home services and chambers of commerce.

Target for the full programme is at least 250 genuinely functional tools. That is
a target for finished tools, not for pages.

## Rules that do not bend

- No placeholder pages, no "coming soon", no empty cards, no fabricated formulas.
- No duplicate tool created purely for a keyword. If an existing tool covers it,
  it gets an industry preset instead.
- Every calculator ships with a known-value test before it is published.
- Regulated subjects carry the matching disclaimer, link to the official source
  and stamp the date when the answer depends on rules that change.
- Public safety tools are administrative and planning only, never tactical or
  dispatch.
- Medical tools are operations only, never clinical, and never collect protected
  health information.

## How to move a batch to published

1. Author the batch in `lib/tools/batches/<name>.ts` and import it in `lib/tools/new.ts`.
2. Leave `status` off published until the rest of this list is done.
3. `npm run validate:tools` clean.
4. Known-value tests in `tests/formulas.test.ts` for every calculator in the batch.
5. `npm run art` to draw card and hero artwork.
6. Check the batch's OG cards in the dev gallery at `/tools/og-gallery`.
7. Add or extend the collection that these tools belong to.
8. `npm test` and `npm run build` clean.
9. Flip to `published` and update this file.
