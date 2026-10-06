# Managed pricing and service-area data review

Reviewed October 3, 2026, using the Data validate-data skill's normal scoped workflow. Result: **ready within the reviewed scope**. This validates the labels, independent arithmetic, and rendered controls below; it does not establish historical acquisition performance or customer contract terms.

## Evidence and definitions

The owner's current instructions supply the public planning inputs:

| Input                      | Current meaning                                             | Evidence class                                             |
| -------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| $7,500 upfront             | Starting initial commitment                                 | Owner direction                                            |
| $5,000/month               | Minimum ongoing managed service                             | Owner direction                                            |
| $7,500/month               | Recommended, most-chosen positioning                        | Owner direction; not a measured customer distribution      |
| $15,000/month              | Structured plan, with larger work scoped individually       | Owner direction                                            |
| About $500                 | Planning target per **acquired farm/agricultural job**      | Owner estimate; not an audited result or lead price        |
| About $1,250               | Planning target per **completed real-estate/mortgage deal** | Owner estimate; not an audited result or lead price        |
| Advertising spend included | Agreed advertising allocation belongs inside the plan       | Owner direction; allocation still requires a written scope |

A lead, appointment, acquired job, and completed deal are different events. A prospect submitting an area request is not an acquired job or completed deal. The benchmark cards identify the outcome and present approximate planning targets, not extra fees, historical averages, or promised results.

Relevant full conversation records were reviewed privately. Earlier discussions contain conflicting billing models and outcome terminology; they do not establish one current sitewide billing rule. Current owner instructions control the public amounts and outcome definitions. Private record identifiers, client identities, and transcript links are intentionally excluded from this public repository.

The initial-month presentation is an **implementation recommendation**, not a confirmed historical or owner-dictated billing rule: bundle onboarding, the agreed build, and the agreed advertising allocation into the initial month, with no second setup payment. Focused starts at $7,500 for that initial month and $5,000 ongoing; Growth starts at $7,500 and Structured at $15,000. The written proposal must ratify that treatment, the ongoing scope, allocation, and billing dates. Existing customer payments retain their own terms.

## Independent arithmetic

Using the planar circle formula `area = π × radius²`, independently of application helpers:

| Radius   |                  Calculated area | Rounded public value |
| -------- | -------------------------------: | -------------------: |
| 35 miles | 3,848.4510006474966 square miles |    About 3,848 sq mi |
| 50 miles |  7,853.981633974483 square miles |    About 7,854 sq mi |

`35² / 50² = 0.49`, so the smaller circle retains 49% of the geographic area and removes **51%**. The radius itself decreases 30%; that is not the area reduction. The difference is approximately 4,006 square miles.

These are approximate circle areas. They do not measure road travel, population, demand, profitability, or the actual protected agreement. The map uses an explicitly labelled city illustration; operating bases and agreed competition checks remain private.

Dividing a complete plan price by either acquisition target would not establish an outcome forecast. Plans also include work and build costs; the agreed media allocation, attribution window, conversion rate, and verified completed outcomes are not provided by this page. The rendered page correctly avoids package-price division and guaranteed job/deal counts.

## Verification

- Source labels and defaults checked in `lib/site/managedPlans.ts`, `lib/site/prices.ts`, `app/pricing/page.tsx`, and the service-area UI/map.
- Local rendered `/pricing` inspected at desktop and 390 × 844: correct amounts, outcome units, planning caveat, included advertising allocation, and upfront/ongoing distinction; no package-to-volume forecast.
- Local rendered `/service-areas` inspected: default 35-mile illustration, opt-in 35/50 comparison, accurate rounded areas and 51% label, and readable narrow-screen math card. Empty public records do not claim availability or a reservation.
- A comparison-control mismatch was corrected: custom radius edits in either control, a new illustrated market, or a changed coverage scope end the fixed 35/50 comparison. Each transition was exercised in the browser; the button returns to “Compare” and the custom geometry remains labelled as an illustration.
- Focused pricing, inquiry-retry, and territory-policy tests: 21 passed. Changed UI file passed ESLint and Prettier checks. Browser log inspection showed the existing ClickUp-extension body-class hydration mismatch; the reviewed controls continued to work.

## Limits

No measured acquisition cohort, attribution dataset, or historical CPA distribution was available in this scoped review. The owner's approximate targets therefore remain assumptions for planning. This note does not verify live deployment, billing collection, CRM delivery, or production form submission. Build, production checks, and publication are handled by the release owner.
