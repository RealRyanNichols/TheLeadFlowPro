# Facts inventory

> September 18, 2026: the homepage rows below (the workshop card, the chooser in `components/site/NextStepGuide.tsx`, the `/#qualify` header CTA, the Learn and Events nav links) describe surfaces that no longer exist. See `docs/handoff-2026-09-18-homepage.md` for the current homepage, header CTA, and navigation.

Snapshot taken September 17, 2026 (before the consumer refactor landed in PR #54). Every row maps one public fact to the files that rendered it and the place it now lives. After PR #54 the `validate:facts` build gate keeps app/, components/, and the marketing modules free of hand-typed copies; `npm run check:links` keeps every configured internal link pointing at a real route.

## Where each kind of fact lives now

| Kind | Home | Consumers read it through |
| --- | --- | --- |
| Prices | `lib/site/prices.ts` (`PRICES`) | `lib/site/offers.ts` labels; checkout modules `lib/offers.ts`, `lib/freeBuild.ts`, `lib/leadFollowUp.ts`, `lib/hq/types.ts`, `lib/toolStudio.ts`, `lib/sellerproof/packet.ts`, `lib/stripeCheckout.ts` |
| Business identity, phone, emails, legal entity, address policy | `lib/site/business.ts` | `lib/contactInfo.ts`, `lib/config.ts`, every page and email |
| Featured event, past-state copy | `lib/site/events.ts` (+ database `events` row for live date, price, seats) | homepage, `/events`, middleware, `lib/nurture.ts`, `lib/leadNotify.ts`, `/api/events/featured` |
| Offers (name, price label, status, URL, Stripe link) | `lib/site/offers.ts` | agency pages, structured data, tests |
| Approved claims (value, source, definition, window, as-of, review-by) | `lib/site/claims.ts` | `lib/siteContent.ts`, `/about`, case studies |
| Navigation and footer | `lib/site/navigation.ts` | `SiteHeader`, `SiteFooter` |
| External links (workshop site, RealRyanNichols, Premier, Lone Star, Stripe link, MCP endpoint) | `lib/site/external-links.ts` | `lib/offers.ts`, `lib/siteContent.ts`, `lib/pluginDocs.ts` |
| Agency services | `lib/site/agency.ts` | `/agency/*` |
| Case studies | `lib/site/caseStudies.ts` | `components/site/CaseStudy.tsx` |

## Every fact and where it was found

Occurrence counts are from the pre-refactor snapshot. File and line references point at the code as it was on that snapshot; most of these lines now read from the config.

### $497 System Map price

- Category: price  ·  Occurrences at snapshot: 36
- Authoritative source: lib/site/prices.ts:21 -> lib/offers.ts OFFER_LADDER (working tree); charge amount app/api/checkout/route.ts:16,97 (49700, still literal)
- Authoritative value now: $497 (PRICES.systemMap)
- Notes: $497 is also the price of Free Website + Content Engine (lib/freeBuild.ts:130), Tool Studio Quick Tool (lib/toolStudio.ts:43 via PRICES.toolStudioProduction), ChatGPT Operator regular price (lib/chatgptOperatorCourse.ts:11 = 49700) and the orphaned Learn It tier. A build check keyed on the string "$497" alone cannot distinguish them.

| File | Line | Context |
| --- | --- | --- |
| `lib/offers.ts` | 77 | OFFER_LADDER system-map price: usd(PRICES.systemMap) (working tree; HEAD line 71 was literal "$497") |
| `lib/site/prices.ts` | 21 | systemMap: 497 (untracked) |
| `lib/site/offers.ts` | 130 | system_map priceUsd: PRICES.systemMap (untracked) |
| `lib/siteContent.ts` | 173 | LADDER System Map price: "$497" (hand-typed; used by app/page.tsx and app/services/page.tsx) |
| `app/packages/[slug]/page.tsx` | 48 | PACKS system-map price: "$497" |
| `app/packages/[slug]/page.tsx` | 51 | "the $497 comes off the price" |
| `app/packages/[slug]/page.tsx` | 134 | "The $497 System Map confirms the vertical pack" |
| `app/packages/[slug]/page.tsx` | 214 | CTA "Get the System Map \| $497" |
| `app/packages/[slug]/PackageOrderForm.tsx` | 33 | "Start me with the $497 System Map" |
| `app/packages/[slug]/PackageOrderForm.tsx` | 295 | "Company OS begins with a $497 System Map" |
| `app/packages/[slug]/PackageOrderForm.tsx` | 429 | "$497, credited in full toward" |
| `app/packages/[slug]/PackageOrderForm.tsx` | 434 | label "Buy the Map \| $497" |
| `app/pricing/page.tsx` | 14 | metadata: "use a $497 System Map for deeper dependencies" |
| `app/api/checkout/route.ts` | 16 | PRODUCTS.system_map amount: 49700 |
| `app/api/checkout/route.ts` | 97 | PACKAGES["system-map"] base: 49700 |
| `app/api/stripe-webhook/route.ts` | 206 | comment: pay $497 for a System Map |
| `app/thank-you/page.tsx` | 187 | comment: told a $497 buyer |
| `app/start/StartRouter.tsx` | 1098 | "confirm scope on the $497 System Map" |
| `app/start/StartRouter.tsx` | 1179 | <option value="497_map">$497 system map only |
| `app/start/StartRouter.tsx` | 1965 | "Start with the $497 System Map." |
| `app/go/time-back/page.tsx` | 323 | "The $497 System Map" |
| `app/go/tools/page.tsx` | 97 | "Finished production starts at $497" (Tool Studio Quick Tool, not System Map) |
| `app/training/[course]/page.tsx` | 106 | link /packages/system-map |
| `app/training/[course]/page.tsx` | 146 | link /packages/system-map |
| `components/BuyButton.tsx` | 8 | label = "Start with a System Map \| $497" |
| `components/tools/ReviewLinkTool.tsx` | 95 | "Start with the $497 System Map." |
| `components/ShowcaseDashboard.tsx` | 74 | "System Map purchased \| $497" |
| `components/content-engine/ContentEngine.tsx` | 157 | "Position the $497 System Map" (admin-only page) |
| `components/content-engine/ContentEngine.tsx` | 176 | "The deeper System Map is $497" |
| `components/content-engine/ContentEngine.tsx` | 199 | "the $497 System Map is the deeper paid diagnostic" |
| `content/academy/company-os-blueprint/08-build-the-phased-roadmap.md` | 63 | "the System Map at /packages/system-map is $497" (course content) |
| `lib/tiers.ts` | 34 | Learn It price "$497" (ORPHAN: lib/tiers.ts has zero importers) |
| `lib/tiers.ts` | 42 | "$497 once. Not per month." (orphan) |
| `lib/tiers.ts` | 75 | "the $497 applies toward it" (orphan) |
| `lib/tiers.ts` | 77 | cta "Start Learning — $497" (orphan) |
| `components/site/CapabilityExplorer.tsx` | 164 | HighLevel "$97, $297, or $497 per month" (vendor comparison, not LeadFlow price) |

### $1,000 Website Launch total

- Category: price  ·  Occurrences at snapshot: 43
- Authoritative source: lib/site/prices.ts:16 -> lib/offers.ts WEBSITE_LAUNCH.total / OFFER_LADDER; charge app/api/checkout/route.ts:98 (100000 literal)
- Authoritative value now: $1,000 (PRICES.websiteLaunchTotal)
- Notes: JSON-LD offers in app/packages/page.tsx:140 and app/premier-system/page.tsx:244 carry price as the string "1000".

| File | Line | Context |
| --- | --- | --- |
| `lib/offers.ts` | 12 | WEBSITE_LAUNCH.total = PRICES.websiteLaunchTotal (working tree; HEAD literal 1000 / "$1,000") |
| `lib/offers.ts` | 85 | OFFER_LADDER website-launch price usd(PRICES.websiteLaunchTotal) |
| `lib/site/prices.ts` | 16 | websiteLaunchTotal: 1000 |
| `lib/siteContent.ts` | 188 | LADDER Website Launch price "$1,000" (hand-typed) |
| `lib/freeBuild.ts` | 34 | anchorUsd: 1000 (HEAD) |
| `lib/freeBuild.ts` | 36 | "purchased outright for $1,000" |
| `app/pricing/page.tsx` | 14 | metadata "Website Launch for $1,000" |
| `app/pricing/page.tsx` | 176 | "buy Website Launch outright for $1,000" |
| `app/deposit/DepositForm.tsx` | 42 | "of the $1,000 Website Launch price" |
| `app/deposit/custom/page.tsx` | 35 | "Need the fixed $1,000 Website Launch instead?" |
| `app/deposit/page.tsx` | 9 | metadata "five-page $1,000 Website Launch" |
| `app/deposit/page.tsx` | 17 | title "One clear $1,000 price" |
| `app/deposit/page.tsx` | 18 | "is $1,000 for the agreed scope" |
| `app/services/page.tsx` | 83 | "Website Launch is $1,000, with $500 to start." |
| `app/terms/page.tsx` | 31 | "offered at a fixed $1,000" |
| `app/packages/page.tsx` | 18 | metadata "Website Launch for $1,000" |
| `app/packages/page.tsx` | 23 | "Website Launch is $1,000 total" |
| `app/packages/page.tsx` | 39 | "A $1,000 Website Launch" |
| `app/packages/page.tsx` | 140 | JSON-LD Offer price: "1000" |
| `app/packages/page.tsx` | 200 | "$1,000 total · written scope" |
| `app/packages/page.tsx` | 212 | <strong>$1,000</strong> |
| `app/packages/page.tsx` | 303 | <strong>$1,000</strong> |
| `app/packages/page.tsx` | 320 | "applied to the $1,000 project total" |
| `app/packages/page.tsx` | 350 | "a $1,000 website promise" |
| `app/packages/[slug]/page.tsx` | 109 | FAQ "is $1,000: $500 to start and $500 after approval" |
| `app/packages/[slug]/PackageOrderForm.tsx` | 4 | comment fixed $1,000 schedule |
| `app/packages/[slug]/PackageOrderForm.tsx` | 293 | "is $1,000: $500 to start" |
| `app/premier-system/page.tsx` | 194 | FAQ "Is the $1,000 Website Launch" |
| `app/premier-system/page.tsx` | 196 | "The $1,000 Website Launch is a focused" |
| `app/premier-system/page.tsx` | 212 | "not hidden inside the $1,000 Website Launch" |
| `app/premier-system/page.tsx` | 244 | JSON-LD Offer price: "1000" |
| `app/premier-system/page.tsx` | 638 | <strong>$1,000</strong> |
| `app/start/StartRouter.tsx` | 765 | PACKAGES.launch price "$1,000" |
| `app/start/StartRouter.tsx` | 1180 | budget option "$1,000 to $5,000" |
| `app/start/StartRouter.tsx` | 1969 | "applied to the $1,000 total" |
| `app/api/stripe-webhook/route.ts` | 456 | "approved $1,000 five-page base scope" |
| `app/api/stripe-webhook/route.ts` | 457 | budget_range "$1,000 base scope \| $500 deposit paid" |
| `app/api/stripe-webhook/route.ts` | 575 | "approved $1,000 five-page base scope" |
| `app/api/checkout/route.ts` | 98 | PACKAGES.launch base: 100000 |
| `components/ShowcaseDashboard.tsx` | 266 | "The $1,000 Website Launch" |
| … | | 3 more occurrences |

### $500 Website Launch deposit / final payment

- Category: price  ·  Occurrences at snapshot: 56
- Authoritative source: lib/site/prices.ts:17-18 via lib/offers.ts; enforcement app/api/checkout/route.ts:116 (literal 500) and app/api/stripe-webhook/route.ts:1234
- Authoritative value now: $500 deposit + $500 final (PRICES.websiteLaunchDeposit / websiteLaunchFinal)
- Notes: 87 hand-typed occurrences in scope; the Stripe hosted link is the deposit checkout on /pricing, /packages, /packages/launch, /premier-system, /start, /system/[stage], /deposit.

| File | Line | Context |
| --- | --- | --- |
| `lib/offers.ts` | 13 | deposit: PRICES.websiteLaunchDeposit; finalPayment: PRICES.websiteLaunchFinal (working tree) |
| `lib/offers.ts` | 18 | paymentLabel "${usd(deposit)} to start … after approval, before launch" |
| `lib/site/prices.ts` | 17 | websiteLaunchDeposit: 500, websiteLaunchFinal: 500 |
| `lib/site/external-links.ts` | 26 | stripeWebsiteLaunchDeposit: https://book.stripe.com/cNi6oG52y1kockE5oq5AQ0a ($500 Payment Link) |
| `app/api/checkout/route.ts` | 116 | if packageId === "launch" && requested !== 500 -> error "Website Launch deposit must be $500" |
| `app/api/stripe-webhook/route.ts` | 203 | comment exact $500 Website Launch |
| `app/api/stripe-webhook/route.ts` | 456 | "Paid the $500 Website Launch deposit" |
| `app/api/stripe-webhook/route.ts` | 549 | "Website Launch $500 deposit paid through Stripe" |
| `app/api/stripe-webhook/route.ts` | 575 | "The $500 Website Launch deposit is paid" |
| `app/api/stripe-webhook/route.ts` | 586 | "Your $500 Website Launch deposit is paid" |
| `app/api/stripe-webhook/route.ts` | 591 | "The remaining $500 is due only after you approve" |
| `app/api/stripe-webhook/route.ts` | 1234 | throw "Unmapped paid $500 Stripe Payment Link" |
| `app/pricing/page.tsx` | 180 | kicker "$500 starts the build" |
| `app/pricing/page.tsx` | 181 | caption "$500 after approval, before launch." |
| `app/pricing/page.tsx` | 183 | primary label "Start Website Launch \| $500" href WEBSITE_LAUNCH_CHECKOUT |
| `app/pricing/page.tsx` | 185 | "the $500 deposit is non-refundable" |
| `app/deposit/DepositForm.tsx` | 21 | "$500 due now" |
| `app/deposit/DepositForm.tsx` | 22 | "$500 after approval" |
| `app/deposit/DepositForm.tsx` | 25 | "The second $500 is due after you approve" |
| `app/deposit/DepositForm.tsx` | 35 | "Pay $500 deposit on Stripe" |
| `app/deposit/page.tsx` | 9 | "with a $500 deposit. The remaining $500" |
| `app/deposit/page.tsx` | 23 | "The first $500 reserves the build" |
| `app/deposit/page.tsx` | 39 | "Reserve the build with $500." |
| `app/deposit/page.tsx` | 40 | "Pay the final $500 after approval." |
| `app/deposit/page.tsx` | 43 | "Your $500 deposit opens intake" |
| `app/services/page.tsx` | 83 | "with $500 to start" |
| `app/terms/page.tsx` | 32 | "$500 to begin and $500 after approval" |
| `app/terms/page.tsx` | 33 | "initial $500 deposit is non-refundable" |
| `app/packages/page.tsx` | 96 | "The $500 deposit reserves the Website Launch" |
| `app/packages/page.tsx` | 100 | "The remaining $500 is due after approval" |
| `app/packages/page.tsx` | 143 | JSON-LD "$500 deposit and $500 after approval" |
| `app/packages/page.tsx` | 183 | "Start with $500" |
| `app/packages/page.tsx` | 218 | <strong>$500</strong> |
| `app/packages/page.tsx` | 224 | <strong>$500</strong> |
| `app/packages/page.tsx` | 304 | "$500 down / $500 before launch" |
| `app/packages/page.tsx` | 316 | "Reserve Website Launch \| $500" |
| `app/packages/page.tsx` | 449 | "Start Website Launch \| $500" |
| `app/packages/[slug]/page.tsx` | 85 | "A $500 deposit starts the work" |
| `app/packages/[slug]/page.tsx` | 98 | "Pay the $500 deposit" |
| `app/packages/[slug]/page.tsx` | 101 | "pay the remaining $500" |
| … | | 16 more occurrences |

### $0 build fee (Free Website Program)

- Category: price  ·  Occurrences at snapshot: 46
- Authoritative source: lib/site/prices.ts:24; lib/freeBuild.ts (modified in working tree, HEAD version read)
- Authoritative value now: $0 build fee (PRICES.freeBuildFee)
- Notes: lib/site/prices.ts guardedPriceStrings() deliberately excludes $0.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 24 | freeBuildFee: 0 |
| `lib/freeBuild.ts` | 26 | subhead "Your first five-page build is $0." (HEAD) |
| `lib/freeBuild.ts` | 117 | tier pages "Up to five scoped pages, $0 build fee" |
| `lib/freeBuild.ts` | 133 | same |
| `lib/freeBuild.ts` | 149 | same |
| `lib/freeBuild.ts` | 164 | freeOnly priceUsd: 0 |
| `lib/freeBuild.ts` | 165 | pages "$0 build fee" |
| `lib/freeBuild.ts` | 202 | "A $0 answer does not cancel the free offer" |
| `lib/siteContent.ts` | 157 | LADDER Free Website Program price "$0 build fee" |
| `lib/siteContent.ts` | 159 | "The build fee is genuinely $0" |
| `lib/publicPageCatalog.ts` | 89 | /free-build description "$0 build fee" |
| `lib/leadNotify.ts` | 382 | "The build fee is $0. … paid hosting after the included 90 days" |
| `lib/nurture.ts` | 59 | comment the $0 build |
| `lib/nurture.ts` | 157 | "first five-page website with a $0 build fee" |
| `lib/nurture.ts` | 172 | "Free means the five-page build fee is $0" |
| `lib/nurture.ts` | 246 | "Free, at $0: up to five scoped pages" |
| `lib/nurture.ts` | 436 | "website application starts at $0" |
| `lib/nurture.ts` | 458 | "stays available at $0 without it" |
| `lib/nurture.ts` | 666 | "first five-page website at a $0 build fee" |
| `components/SiteFooter.tsx` | 44 | footer link "Free Website \| $0 Build Fee" (hand-typed) |
| `app/page.tsx` | 272 | "five-page website with a $0 build fee" |
| `app/pricing/page.tsx` | 176 | "Apply for the $0 five-page website" |
| `app/pricing/page.tsx` | 184 | secondary "Apply for the $0 website" -> /free-build |
| `app/free-build/page.tsx` | 26 | metadata "$0 build fee" |
| `app/free-build/page.tsx` | 29 | title "Your first five-page build is $0." |
| `app/free-build/page.tsx` | 46 | OG title same |
| `app/free-build/page.tsx` | 70 | "Up to five scoped pages with a $0 build fee" |
| `app/free-build/page.tsx` | 99 | "See What $0 Includes" |
| `app/free-build/page.tsx` | 133 | "$0 build fee" |
| `app/free-build/page.tsx` | 294 | "The $0 application is the first option" |
| `app/free-build/page.tsx` | 305 | "The genuine $0 lane" |
| `app/free-build/page.tsx` | 358 | "What the $0 build fee covers." |
| `app/free-build/page.tsx` | 447 | "Apply for the five-page website at $0" |
| `app/free-build/FreeBuildOrder.tsx` | 167 | t.priceUsd === 0 ? "$0" |
| `app/free-build/FreeBuildOrder.tsx` | 322 | "Apply for My Free Website \| $0" |
| `app/services/page.tsx` | 71 | "Apply for the $0 website" |
| `app/services/page.tsx` | 333 | "The build fee is $0." |
| `app/services/page.tsx` | 349 | "Apply for the $0 website" |
| `app/commerce/page.tsx` | 228 | "the $0 build fee includes" |
| `app/add-ons/AddOnsMenu.tsx` | 603 | "have a $0 build fee" |
| … | | 6 more occurrences |

### $197 Lead Follow-Up Campaign / Free Website + Follow-Up Pack

- Category: price  ·  Occurrences at snapshot: 26
- Authoritative source: lib/site/prices.ts:25,35 -> lib/leadFollowUp.ts, lib/freeBuild.ts -> app/api/checkout/route.ts PRODUCTS
- Authoritative value now: $197 (PRICES.leadFollowUpCampaign / freeBuildFollowUpPack)
- Notes: Two distinct $197 offers (standalone /go/lead-follow-up campaign and the free-build tier 'Free Website + Follow-Up Pack'); lib/nurture.ts calls it 'the follow-up pack'. lib/site/offers.ts names the standalone one 'Follow-Up Campaign' (id lead_followup_campaign) and the tier 'Free Website + Follow-Up Pack'.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 25 | freeBuildFollowUpPack: 197 |
| `lib/site/prices.ts` | 35 | leadFollowUpCampaign: 197 |
| `lib/leadFollowUp.ts` | 19 | priceUsd: PRICES.leadFollowUpCampaign, priceCents *100 (working tree; HEAD 17-19 literal 197/19700) |
| `lib/leadFollowUp.ts` | 1 | comment The $197 Lead Follow-Up Campaign |
| `lib/leadFollowUp.ts` | 68 | "$197 one time. No subscription" |
| `lib/leadFollowUp.ts` | 99 | "not a $197 campaign" |
| `lib/freeBuild.ts` | 114 | tier free_build_followup priceUsd: 197, priceCents: 19700 (HEAD) |
| `lib/nurture.ts` | 216 | "that is the $197" |
| `lib/nurture.ts` | 264 | "plug it for $197" |
| `lib/nurture.ts` | 458 | "$197 for the follow-up pack" |
| `lib/nurture.ts` | 515 | subject "Why the first optional service is $197" |
| `lib/nurture.ts` | 522 | "$197 is a fixed follow-up work product" |
| `components/SiteFooter.tsx` | 43 | footer "Follow-Up Campaign \| $197" (hand-typed) |
| `app/go/lead-follow-up/LeadFollowUpFunnel.tsx` | 3 | comment $197 order form |
| `app/go/lead-follow-up/LeadFollowUpFunnel.tsx` | 52 | "LEAD FOLLOW-UP CAMPAIGN ORDER ($197)." |
| `app/go/lead-follow-up/page.tsx` | 16 | comment |
| `app/go/lead-follow-up/page.tsx` | 24 | metadata description "$197" |
| `app/go/lead-follow-up/page.tsx` | 29 | OG "$197 one time." |
| `app/go/lead-follow-up/lead-follow-up.module.css` | 1 | css comment $197 |
| `app/api/stripe-webhook/route.ts` | 789 | comment Paid $197 |
| `lib/toolStudio.ts` | 99 | Follow-Up Tune-Up monthly priceUsd: 197 (Tool Studio menu, different product) |
| `lib/toolStudio.ts` | 105 | Content Refresh priceUsd: 197 |
| `lib/timeback.ts` | 50 | Review request automation price: 197 (Time Back extra) |
| `lib/timeback.ts` | 56 | Lead form + alert wiring price: 197 |
| `lib/contentEngineCourse.ts` | 11 | regularPriceCents: 19700 (Content Engine course regular) |
| `components/RentCalculator.tsx` | 378 | ClickFunnels "Scale $197" (vendor; orphan component) |

### $497 Free Website + Content Engine tier

- Category: price  ·  Occurrences at snapshot: 6
- Authoritative source: lib/site/prices.ts:26 -> lib/freeBuild.ts tiers -> app/api/checkout/route.ts
- Authoritative value now: $497 (PRICES.freeBuildContentEngine)
- Notes: Collides on the string $497 with System Map; 'Content Engine' is also the name of the $127 Operator Academy course (lib/contentEngineCourse.ts) and the admin Daily Content Engine (components/content-engine/ContentEngine.tsx).

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 26 | freeBuildContentEngine: 497 |
| `lib/freeBuild.ts` | 130 | free_build_content priceUsd: 497, priceCents: 49700 (HEAD) |
| `lib/site/offers.ts` | 87 | id free_build_content name "Free Website + Content Engine" |
| `lib/nurture.ts` | 241 | subject "The optional $497 engine, itemized" |
| `lib/nurture.ts` | 248 | "Optional, $497 one time: fourteen days of business-specific content" |
| `lib/nurture.ts` | 580 | "the optional $497 content engine" |

### $997 Free Website + 30-Day Growth Engine tier (and other $997 uses)

- Category: price  ·  Occurrences at snapshot: 7
- Authoritative source: lib/site/prices.ts for the tier (freeBuildGrowthEngine) and Tool Funnel (toolStudioFunnel); lib/operatoros/catalog.ts literal; lib/operatorAcademyCatalog.ts literal cents
- Authoritative value now: $997 (PRICES.freeBuildGrowthEngine) for the tier; Tool Funnel $997 (PRICES.toolStudioFunnel, offer tool_studio_funnel) and Quick Tool $497 (PRICES.toolStudioProduction, offer tool_studio_quick_tool) since 2026-09-21
- Notes: '30-Day Growth Engine' appears only in lib/freeBuild.ts:145 and lib/site/offers.ts:101; no page copy names it.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 27 | freeBuildGrowthEngine: 997 |
| `lib/freeBuild.ts` | 146 | free_build_launch "Free Website + 30-Day Growth Engine" priceUsd: 997, priceCents: 99700 (HEAD) |
| `lib/site/offers.ts` | 100 | id free_build_launch name "Free Website + 30-Day Growth Engine" |
| `lib/toolStudio.ts` | 59 | Tool Funnel priceUsd: PRICES.toolStudioFunnel (resolved 2026-09-21) |
| `lib/operatoros/catalog.ts` | 52 | FlowWorker monthly "$997 per month" |
| `lib/operatorAcademyCatalog.ts` | 8 | foundingPriceCents: 99700 (Operator Academy founding) |
| `lib/access.ts` | 30 | comment $997 buyer |

### $49/mo Plugin for ChatGPT and Claude (14-day trial)

- Category: price  ·  Occurrences at snapshot: 9
- Authoritative source: lib/site/prices.ts:44-45 -> lib/hq/types.ts HQ_PLAN -> lib/hq/stripe.ts
- Authoritative value now: $49/mo, 14-day trial (PRICES.pluginMonthly / pluginTrialDays)
- Notes: $49 is shared by three products: Plugin ($49/mo), managed hosting ($49/mo), SellerProof packet ($49 once).

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 44 | pluginMonthly: 49, pluginTrialDays: 14 |
| `lib/hq/types.ts` | 12 | HQ_PLAN.priceUsd = PRICES.pluginMonthly; trialDays = PRICES.pluginTrialDays (working tree; HEAD literal 49/14) |
| `lib/hq/stripe.ts` | 17 | unit_amount HQ_PLAN.priceUsd * 100 |
| `components/SiteFooter.tsx` | 20 | footer "Plugin for ChatGPT and Claude \| $49/mo" (hand-typed) |
| `app/plugin/page.tsx` | 31 | const PRICE = HQ_PLAN.priceUsd (derived) |
| `app/plugin/page.tsx` | 35 | title `$${PRICE} a month` |
| `app/plugin/page.tsx` | 605 | `${TRIAL} days free, then $${PRICE} a month` |
| `app/plugin/page.tsx` | 154 | "All Pro Kits, normally $10 to $29 each, included while you subscribe" (hand-typed range) |
| `lib/hq/pulse.ts` | 87 | "The 14 day trial" (hand-typed 14) |

### $49 SellerProof single evidence packet

- Category: price  ·  Occurrences at snapshot: 20
- Authoritative source: lib/site/prices.ts:52 -> lib/sellerproof/packet.ts -> app/api/sellerproof/checkout/route.ts
- Authoritative value now: $49 (PRICES.sellerProofPacket)

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 52 | sellerProofPacket: 49 |
| `lib/sellerproof/packet.ts` | 7 | priceCents: PRICES.sellerProofPacket * 100 (working tree; HEAD literal 4900) |
| `app/api/sellerproof/checkout/route.ts` | 41 | unit_amount SELLERPROOF.priceCents |
| `app/api/sellerproof/checkout/route.ts` | 51 | "One payment of $49 for this dispute" |
| `lib/sellerproof/receipt.ts` | 19 | "Your $49 Single Evidence Packet purchase is confirmed." |
| `lib/sellerproof/receipt.ts` | 43 | subject "SellerProof: $49 packet purchased" |
| `lib/sellerproof/receipt.ts` | 44 | "Amount: $49 USD" |
| `lib/publicPageCatalog.ts` | 31 | "$49 to export one dispute packet" |
| `app/tools/page.tsx` | 157 | "Export one dispute packet for $49" |
| `app/sellerproof/opengraph-image.tsx` | 3 | "$49 per packet" |
| `app/sellerproof/opengraph-image.tsx` | 84 | "Free preview · $49 per packet · No subscription" |
| `app/sellerproof/terms/page.tsx` | 18 | "What your $49 buys" |
| `app/sellerproof/page.tsx` | 17 | description "$49" |
| `app/sellerproof/page.tsx` | 49 | FAQ "What does the $49 purchase cover?" |
| `app/sellerproof/page.tsx` | 113 | "$49 to export one dispute packet." |
| `app/sellerproof/page.tsx` | 189 | "unlock one packet for $49" |
| `app/sellerproof/page.tsx` | 210 | "Your $49 purchase covers" |
| `app/sellerproof/build/Builder.tsx` | 312 | "Free preview · $49 to export" |
| `app/sellerproof/build/Builder.tsx` | 414 | "SellerProof costs $49 once." |
| `app/sellerproof/build/Builder.tsx` | 902 | "Unlock this packet for $49" |

### $49/mo managed hosting and $99/mo hosting with two edits (after 90 included days)

- Category: price  ·  Occurrences at snapshot: 8
- Authoritative source: lib/site/prices.ts:30-32; copy in lib/freeBuild.ts (modified in working tree)
- Authoritative value now: $49/mo managed; $99/mo with two edits; 90 days included
- Notes: 'Hosting' has no dedicated page; only lives in /free-build copy and lead emails.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 30 | hostingIncludedDays: 90, hostingManagedMonthly: 49, hostingWithEditsMonthly: 99 |
| `lib/freeBuild.ts` | 98 | "first 90 days of managed hosting are included … $49/month managed hosting, or choose $99/month hosting with two minor edits" (HEAD) |
| `lib/freeBuild.ts` | 244 | FAQ same wording |
| `lib/leadNotify.ts` | 382 | "paid hosting after the included 90 days" |
| `lib/site/offers.ts` | 263 | hosting_managed "Managed hosting" usdPerMonth(49) |
| `lib/site/offers.ts` | 276 | hosting_with_edits "Managed hosting with two edits" usdPerMonth(99) |
| `lib/system-stages.ts` | 174 | "hosting that is usually free to about $25 a month" (infra cost, not LeadFlow hosting product) |
| `components/charts/RentVsOwnChart.tsx` | 44 | `${HOST_MO}/mo hosting` (chart) |

### Pro Kits $10 to $29 (individual kit prices; $39 bundle)

- Category: price  ·  Occurrences at snapshot: 23
- Authoritative source: lib/site/prices.ts for the range (proKitMin/proKitMid/proKitMax, mirrored by PRO_PRICES) and the bundle (proBundle); lib/tools/pro/kits/*.ts priceUsd; lib/tools/pro/index.ts PRO_BUNDLE reads PRICES.proBundle
- Authoritative value now: $10 to $29 per kit (PRICES.proKitMin/proKitMax); each kit's priceUsd on the kit; bundle $39 (PRICES.proBundle, offer pro_bundle)
- Notes: The $39 'Every Pro Kit' bundle is outside the published '$10 to $29' range. Resolved 2026-09-21: registered as PRICES.proBundle with an offer row (pro_bundle, href /tools/pro).

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 48 | proKitMin: 10, proKitMax: 29 |
| `components/SiteFooter.tsx` | 19 | footer "Pro Kits \| $10 to $29" (hand-typed) |
| `app/tools/pro/page.tsx` | 18 | title "Pro Kits: finished systems for $10 to $29" |
| `app/tools/pro/page.tsx` | 80 | eyebrow "$10 to $29 · one payment" |
| `app/plugin/page.tsx` | 154 | "normally $10 to $29 each" |
| `lib/tools/pro/kits/qr-sign-kit.ts` | 388 | priceUsd: 10 |
| `lib/tools/pro/kits/quote-follow-up-kit.ts` | 427 | priceUsd: 19 |
| `lib/tools/pro/kits/google-review-kit.ts` | 546 | priceUsd: 19 |
| `lib/tools/pro/kits/missed-call-text-back-kit.ts` | 711 | priceUsd: 19 |
| `lib/tools/pro/kits/local-seo-schema-kit.ts` | 471 | priceUsd: 19 |
| `lib/tools/pro/kits/rate-card-kit.ts` | 357 | priceUsd: 19 |
| `lib/tools/pro/kits/white-label-tool-embeds.ts` | 271 | priceUsd: 29 |
| `lib/tools/pro/kits/job-estimate-kit.ts` | 492 | priceUsd: 29 |
| `lib/tools/pro/index.ts` | 28 | PRO_BUNDLE "Every Pro Kit" priceUsd: PRICES.proBundle (resolved 2026-09-21) |
| `lib/commerce.ts` | 17 | priceCents: Math.round(tool.pro.priceUsd * 100) (catalog feed) |
| `lib/proAccess.ts` | 16 | comment $10 kit / $29 kit |
| `lib/proAccess.ts` | 193 | comment $10 / $29 |
| `lib/proAccess.ts` | 3 | comment somebody pays $19 |
| `app/api/checkout/route.ts` | 176 | comment $29 / $10 kit |
| `app/api/stripe-webhook/route.ts` | 1249 | comment $10 / $29 kit |
| `app/api/pro/restore/route.ts` | 37 | comment $19 product |
| `app/api/pro/render/route.ts` | 12 | comment kit worth $19 |
| `lib/brandKit.ts` | 6 | comment a $19 document |

### $97 workshop seat (ChatGPT for Business Owners, Longview)

- Category: price  ·  Occurrences at snapshot: 20
- Authoritative source: Supabase events table via lib/events.ts; lib/site/eventState.server.ts merges DB over lib/site/events.ts config
- Authoritative value now: $97 (DB events.price_usd, fallback PRICES.workshopSeat)
- Notes: $97 also = Tool Studio blueprint and Time Back downsell. Home page (app/page.tsx:193,311) hard-types $97 and '10 paid seats' instead of reading the DB/config.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 58 | workshopSeat: 97 (marketing fallback; DB events.price_usd is authority) |
| `lib/site/events.ts` | 71 | priceUsd: PRICES.workshopSeat |
| `lib/events.ts` | 4 | comment: dates, price, capacity, venue come from the database |
| `lib/events.ts` | 76 | priceUsd(event) reads event.price_usd |
| `app/page.tsx` | 193 | "6:30–8:00 PM Central / $97 per attendee" (hand-typed) |
| `app/page.tsx` | 311 | "6:30–8:00 PM Central · $97 · 10 paid seats" (hand-typed) |
| `lib/leadNotify.ts` | 336 | "$97. No subscription. No upsell in the room." |
| `lib/nurture.ts` | 765 | "$97, one evening, Longview:" |
| `lib/metaCampaignGuard.ts` | 100 | comment "LFP Workshop Sep 17 Volumev1 — the $97 Longview workshop" |
| `lib/eventPayments.ts` | 239 | "Paid workshop amount differs from the ticket snapshot" (DB-driven check) |
| `content/article-publications/2026-09-06-bring-one-real-task-to-your-business-workshop.json` | 22 | claim "$97 per attendee" |
| `content/article-publications/2026-09-06-bring-one-real-task-to-your-business-workshop.json` | 34 | price_usd=97, capacity=10 |
| `content/article-publications/2026-09-05-give-every-inquiry-an-owner-and-next-step.json` | 22 | claim "$97 per attendee" |
| `lib/toolStudio.ts` | 26 | Tool Blueprint priceUsd: PRICES.toolStudioBlueprint (=97; different product) |
| `lib/timeback.ts` | 70 | DOWNSELL price: 97 (Time Back; different product) |
| `app/go/tools/page.tsx` | 18 | "Start with a $97 blueprint" (Tool Studio) |
| `app/go/tools/page.tsx` | 96 | "The $97 entry is a real blueprint" (Tool Studio) |
| `lib/toolStudio.ts` | 3 | comment The $97 offer (Tool Studio) |
| `lib/toolStudio.ts` | 35 | "keeps a $97 test from becoming an open-ended build" |
| `app/go/time-back/TimeBackFunnel.tsx` | 4 | comment one-time $97 downsell |

### $3,500+ Lead Engine

- Category: price  ·  Occurrences at snapshot: 11
- Authoritative source: lib/site/prices.ts:38 -> lib/offers.ts OFFER_LADDER -> app/pricing/page.tsx
- Authoritative value now: $3,500+ (PRICES.leadEngineFrom)
- Notes: Published ONLY on /pricing. Absent from lib/siteContent.ts LADDER (home + /services), app/packages/page.tsx module list, app/start/StartRouter.tsx PACKAGES, and every other public page. Zero literal '$3,500' strings in app/ or components/.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 38 | leadEngineFrom: 3500 |
| `lib/offers.ts` | 93 | OFFER_LADDER lead-engine price usdFrom(PRICES.leadEngineFrom) (HEAD line 87 literal "$3,500+") |
| `lib/site/offers.ts` | 140 | id lead_engine status live href /start?goal=follow_up |
| `app/pricing/page.tsx` | 55 | canonicalOffer("lead-engine") rendered on /pricing with cta "Map the Lead Engine" |
| `app/pricing/page.tsx` | 19 | metadata lists Lead Engine |
| `app/pricing/[tier]/page.tsx` | 13 | metadata lists Lead Engine |
| `app/book/BookForm.tsx` | 121 | interest option lead_engine |
| `lib/leadNotify.ts` | 19 | label map lead_engine: "Lead Engine" |
| `components/ShowcaseDashboard.tsx` | 75 | "Call booked \| Lead Engine scope" |
| `app/admin/leads/[id]/LeadWorkspace.tsx` | 55 | admin label |
| `app/admin/LeadsTable.tsx` | 35 | admin label |

### $5,000+ Training Platform / Course platform

- Category: price  ·  Occurrences at snapshot: 15
- Authoritative source: lib/site/prices.ts:39; name conflict between lib/offers.ts:100 and lib/site/offers.ts:154 / app/packages/page.tsx:71
- Authoritative value now: $5,000+ (PRICES.trainingPlatformFrom); name TBD: 'Training Platform' vs 'Course platform'
- Notes: tests/site-config.test.ts matches OFFER_LADDER rungs to lib/site/offers.ts by href+price only, so the name mismatch passes the test.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 39 | trainingPlatformFrom: 5000 |
| `lib/offers.ts` | 101 | OFFER_LADDER training-platform name "Training Platform" price usdFrom(5000) (HEAD :95 literal) |
| `lib/site/offers.ts` | 153 | id training_platform name "Course platform" priceUsd 5000 href /start?goal=delivery |
| `app/packages/page.tsx` | 71 | module name "Course platform" price "$5,000+" |
| `app/pricing/page.tsx` | 68 | canonicalOffer("training-platform") cta "Map the Training Platform" |
| `app/book/BookForm.tsx` | 122 | option training_platform "Training Platform: owned courses and delivery" |
| `lib/leadNotify.ts` | 20 | label training_platform: "Training Platform" |
| `app/training/[course]/page.tsx` | 113 | "A new Training Platform engagement is separate" |
| `app/training/[course]/page.tsx` | 144 | "Plan a Training Platform" |
| `app/training/TrainingLibrary.tsx` | 81 | "Plan a training platform" |
| `app/events/page.tsx` | 205 | /book?interest=training_platform |
| `app/start/StartRouter.tsx` | 1180 | budget "$1,000 to $5,000" |
| `app/start/StartRouter.tsx` | 1181 | budget "$5,000 to $15,000" |
| `lib/tiers.ts` | 136 | Done For You price "$5,000+" (ORPHAN) |
| `lib/businessDiagnostic.ts` | 443 | survey range "Under $5,000" |

### $7,500+ Company OS

- Category: price  ·  Occurrences at snapshot: 8
- Authoritative source: lib/site/prices.ts:40; four hand-typed copies remain (siteContent, packages page, packages/[slug], StartRouter)
- Authoritative value now: $7,500+ (PRICES.companyOsFrom)
- Notes: OFFER_LADDER href is /start?goal=replace_tools while siteContent/lib/site/offers.ts href is /packages/industry-os.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 40 | companyOsFrom: 7500 |
| `lib/offers.ts` | 109 | OFFER_LADDER company-os usdFrom(7500) href /start?goal=replace_tools (HEAD :103 literal) |
| `lib/site/offers.ts` | 166 | id company_os href /packages/industry-os |
| `lib/siteContent.ts` | 204 | LADDER Company OS price "$7,500+" href /packages/industry-os (hand-typed) |
| `app/packages/page.tsx` | 85 | module "Company operating system" price "$7,500+" |
| `app/packages/[slug]/page.tsx` | 118 | PACKS industry-os name "Company OS" price "$7,500+" |
| `app/start/StartRouter.tsx` | 771 | PACKAGES.industry_os name "Company OS" price "$7,500+" |
| `app/pricing/page.tsx` | 90 | cta "Map the Company OS" |

### $15,000+ Custom Platform

- Category: price  ·  Occurrences at snapshot: 9
- Authoritative source: lib/site/prices.ts:41
- Authoritative value now: $15,000+ (PRICES.customPlatformFrom)

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 41 | customPlatformFrom: 15000 |
| `lib/offers.ts` | 117 | OFFER_LADDER custom-platform usdFrom(15000) (HEAD :111 literal) |
| `lib/site/offers.ts` | 179 | id custom_platform |
| `app/packages/page.tsx` | 91 | module "Custom platform" price "$15,000+" |
| `app/start/StartRouter.tsx` | 777 | PACKAGES.custom_platform price "$15,000+" |
| `app/start/StartRouter.tsx` | 1181 | budget "$5,000 to $15,000" |
| `app/start/StartRouter.tsx` | 1182 | budget "$15,000 to $30,000" |
| `app/services/page.tsx` | 314 | "software products are scoped from $15,000+" |
| `app/pricing/page.tsx` | 103 | cta "Map the Custom Platform" |

### $1,997 legacy price

- Category: price  ·  Occurrences at snapshot: 3
- Authoritative source: none (lib/operatoros/catalog.ts and lib/operatorAcademyCatalog.ts are literal)
- Authoritative value now: Not a current LeadFlow offer price; retire or move OperatorOS/Academy pricing into lib/site/prices.ts
- Notes: No '$1,997' appears in app/ or components/. lib/site/prices.ts has no OperatorOS or Operator Academy keys.

| File | Line | Context |
| --- | --- | --- |
| `lib/operatoros/catalog.ts` | 59 | FlowDesk monthly: "$1,997 per month" (only literal '$1,997' in scope) |
| `lib/operatorAcademyCatalog.ts` | 9 | regularPriceCents: 199700 (Operator Academy regular price = $1,997; founding 99700) |
| `lib/tiers.ts` | 84 | Build It With You "$2,500" (orphan; the old middle tier, not $1,997) |

### Orphaned tier prices: Learn It $497, Build It With You $2,500, Done For You $5,000+ (and $0–25/mo, $9,000+, ≈20 mo, $99 template)

- Category: price  ·  Occurrences at snapshot: 12
- Authoritative source: none (orphan)
- Authoritative value now: Retire: lib/tiers.ts has zero importers
- Notes: components/RentCalculator.tsx (also zero importers) carries vendor prices 'checked July 2026' (lines 9,13) and Shopify/Wix/Squarespace/GoDaddy/ClickFunnels/Supabase/Vercel figures.

| File | Line | Context |
| --- | --- | --- |
| `lib/tiers.ts` | 34 | learn-it price "$497" |
| `lib/tiers.ts` | 84 | build-it-with-you price "$2,500" |
| `lib/tiers.ts` | 124 | FAQ "Why 'starting at' $2,500?" |
| `lib/tiers.ts` | 136 | done-for-you price "$5,000+" |
| `lib/tiers.ts` | 41 | "$0–25/mo" |
| `lib/tiers.ts` | 90 | "$9,000+ 3 years of a typical rented stack" |
| `lib/tiers.ts` | 143 | "≈ 20 mo typical break-even" |
| `lib/tiers.ts` | 173 | "You want a $99 template site" |
| `lib/tiers.ts` | 2 | comment "(checked July 2026)" |
| `app/pricing/[tier]/page.tsx` | 4 | LEGACY_TIERS learn-it/build-it-with-you/done-for-you -> permanentRedirect("/pricing"), robots index:false |
| `components/BuyButton.tsx` | 39 | /book?interest=learn (legacy interest key) |
| `components/BuyButton.tsx` | 54 | /book?interest=learn |

### Course founding/regular prices: ChatGPT Operator $297/$497, Content Engine course $127/$197, Operator Academy $997/$1,997; per-course $297/$397/$497/$127

- Category: price  ·  Occurrences at snapshot: 16
- Authoritative source: lib/chatgptOperatorCourse.ts, lib/contentEngineCourse.ts, lib/operatorAcademyCatalog.ts (literal cents + Stripe price ids); not in lib/site/prices.ts
- Authoritative value now: Stripe Price IDs are authoritative for charges; display cents in the three catalog modules
- Notes: Displayed '$297' and '$127' are hand-typed in app/ and can drift from the cents constants and the Stripe Price objects.

| File | Line | Context |
| --- | --- | --- |
| `lib/chatgptOperatorCourse.ts` | 8 | foundingPriceId price_1UAMbTBHH7tuNwAAjZZY7wNu; regularPriceId price_1UAMbYBHH7tuNwAACnnJIE4a |
| `lib/chatgptOperatorCourse.ts` | 10 | foundingPriceCents: 29700, regularPriceCents: 49700 |
| `app/chatgpt/CourseActions.tsx` | 127 | "Get founding access for $297" (hand-typed) |
| `app/chatgpt/page.tsx` | 175 | badge "FOUNDING PRICE" |
| `lib/contentEngineCourse.ts` | 8 | foundingPriceId price_1U9yRrBHH7tuNwAAX4P9pRl8; regularPriceId price_1U9yS8BHH7tuNwAAE0YjnotO |
| `lib/contentEngineCourse.ts` | 10 | foundingPriceCents: 12700, regularPriceCents: 19700 |
| `app/operator-academy/content-engine/page.tsx` | 129 | <strong>$127</strong> (hand-typed) |
| `app/operator-academy/content-engine/page.tsx` | 334 | "Get founding access $127" |
| `app/operator-academy/content-engine/CheckoutForm.tsx` | 52 | <strong>$127</strong> |
| `app/operator-academy/content-engine/MobilePurchaseBar.tsx` | 24 | "Get founding access $127" |
| `lib/operatorAcademyCatalog.ts` | 5 | foundingPriceId price_1UAMq5BHH7tuNwAAzBtvzJ37; regularPriceId price_1UAMq9BHH7tuNwAAeZ4aErji |
| `lib/operatorAcademyCatalog.ts` | 8 | foundingPriceCents: 99700, regularPriceCents: 199700 |
| `lib/operatorAcademyCatalog.ts` | 124 | individualPriceCents: 29700 (also 146:39700, 168:49700, 190:39700, 212:39700, 234:49700, 258:29700, 270:12700; 80,102: null) |
| `app/api/academy/checkout/route.ts` | 28 | line_items price: OPERATOR_ACADEMY.foundingPriceId |
| `app/api/chatgpt-course/checkout/route.ts` | 24 | price: CHATGPT_OPERATOR.foundingPriceId |
| `app/api/operator-academy/content-engine/checkout/route.ts` | 24 | price: CONTENT_ENGINE.foundingPriceId |

### Tool Studio prices: Blueprint $97, Quick Tool $497, Tool Funnel $997; monthly menu $97/$197/$197/$297/$297

- Category: price  ·  Occurrences at snapshot: 8
- Authoritative source: lib/site/prices.ts (toolStudioBlueprint, toolStudioProduction, toolStudioFunnel, toolCareMonthly, followUpTuneUpMonthly, contentRefreshMonthly, seoArchiveBatchMonthly, funnelTestMonthly); lib/toolStudio.ts reads every one of them
- Authoritative value now: $97 / $497 / $997 builds and $97 / $197 / $197 / $297 / $297 monthly, all from PRICES since 2026-09-21, each with an offer row (tool_studio_blueprint, tool_studio_quick_tool, tool_studio_funnel, tool_studio_tool_care, tool_studio_follow_up_tuneup, tool_studio_content_refresh, tool_studio_seo_archive_batch, tool_studio_funnel_test)

| File | Line | Context |
| --- | --- | --- |
| `lib/site/prices.ts` | 61 | toolStudioBlueprint: 97, toolStudioProduction: 497 |
| `lib/toolStudio.ts` | 26 | Tool Blueprint priceUsd: PRICES.toolStudioBlueprint |
| `lib/toolStudio.ts` | 43 | Quick Tool priceUsd: PRICES.toolStudioProduction |
| `lib/toolStudio.ts` | 59 | Tool Funnel priceUsd: PRICES.toolStudioFunnel |
| `lib/toolStudio.ts` | 93 | Tool Care PRICES.toolCareMonthly; 99: Follow-Up Tune-Up PRICES.followUpTuneUpMonthly; 105: Content Refresh PRICES.contentRefreshMonthly; 111: Search + Archive Batch PRICES.seoArchiveBatchMonthly; 117: Funnel Test PRICES.funnelTestMonthly |
| `app/go/tools/page.tsx` | 18 | "Start with a $97 blueprint." |
| `app/go/tools/page.tsx` | 96 | "The $97 entry is a real blueprint" |
| `app/go/tools/page.tsx` | 97 | "Finished production starts at $497" |

### Time Back prices: from $297; email series $297/$497/$797/$1,197/$1,497; extras $297/$197/$197; downsell $97

- Category: price  ·  Occurrences at snapshot: 6
- Authoritative source: lib/timeback.ts literals
- Authoritative value now: Not in lib/site/prices.ts
- Notes: /commerce (Time Back) is index:false in lib/publicPageCatalog.ts:17.

| File | Line | Context |
| --- | --- | --- |
| `lib/timeback.ts` | 6 | comment "Pricing approved by Ryan 2026-08-20" |
| `lib/timeback.ts` | 34 | EMAIL_SERIES 297/497/797/1197/1497 |
| `lib/timeback.ts` | 44 | textback 297; 50: reviews 197; 56: leadform 197 |
| `lib/timeback.ts` | 70 | DOWNSELL price: 97 |
| `app/go/time-back/page.tsx` | 23 | metadata "From $297 one-time." |
| `app/go/time-back/page.tsx` | 229 | "From $297, one-time." |

### OperatorOS offers: FlowWorker $1,497 setup/$997 mo; FlowDesk $2,997/$1,997 mo; FlowOps $4,997/$4,997 mo; OperatorOS $9,997+/$4,997–$9,997+ mo

- Category: price  ·  Occurrences at snapshot: 4
- Authoritative source: lib/operatoros/catalog.ts literals (rendered by app/operatoros/page.tsx)
- Authoritative value now: Not in lib/site/prices.ts; 111 'OperatorOS' string hits across app/components/lib

| File | Line | Context |
| --- | --- | --- |
| `lib/operatoros/catalog.ts` | 51 | setup "$1,497 setup", monthly "$997 per month" |
| `lib/operatoros/catalog.ts` | 58 | "$2,997 setup" / "$1,997 per month" |
| `lib/operatoros/catalog.ts` | 65 | "$4,997 setup" / "$4,997 per month" |
| `lib/operatoros/catalog.ts` | 73 | "$9,997+ setup" / "$4,997 to $9,997+ per month" |

### Vendor comparison prices ('Reference prices checked September 1, 2026' / 'checked July 2026')

- Category: price  ·  Occurrences at snapshot: 10
- Authoritative source: components/site/CapabilityExplorer.tsx:718 (live); RentCalculator/tiers are orphans
- Authoritative value now: Single 'as of' date for third-party prices; currently September 1, 2026 on the live page
- Notes: Two different 'checked' dates exist in the tree (July 2026 in orphans, September 1, 2026 live).

| File | Line | Context |
| --- | --- | --- |
| `components/site/CapabilityExplorer.tsx` | 718 | "Reference prices checked September 1, 2026." |
| `components/site/CapabilityExplorer.tsx` | 81 | Webflow $15/mo; 93,102,145,164,175,184,244,276: HighLevel $97/$297/$497; 210: Calendly $10; 219: Stripe 2.9%+30¢; 293-294: Zapier $0 / $19.99 |
| `components/RentCalculator.tsx` | 9 | comment "checked July 2026" (ORPHAN component) |
| `components/RentCalculator.tsx` | 13 | CHECKED = "Prices checked July 2026 from vendor pricing pages." |
| `components/RentCalculator.tsx` | 64 | Shopify $39; 66 $105; 68 Wix $36; 70 Squarespace $33; 72 GoDaddy $24.99; 76-77 WP Engine $30/$55; 93 ClickFunnels $97; 100 Vercel Pro $20; 105 Supabase Pro $25; |
| `lib/tiers.ts` | 2 | comment "(checked July 2026)" (ORPHAN) |
| `lib/system-stages.ts` | 174 | "hosting that is usually free to about $25 a month" |
| `app/demo/page.tsx` | 177 | "roughly $0–25 per month of infrastructure" |
| `app/start/StartRouter.tsx` | 438 | marketplace fees "8% commission plus 2.9% and $0.30" |
| `app/start/StartRouter.tsx` | 444 | Etsy "$0.20 listing fee, 6.5%" |

### September 17, 2026 workshop date (Thursday, 6:30–8:00 PM Central)

- Category: date  ·  Occurrences at snapshot: 23
- Authoritative source: Supabase events row via lib/events.ts / lib/site/eventState.server.ts; hand-typed copies in app/page.tsx, NextStepGuide, leadNotify, nurture
- Authoritative value now: DB events.starts_at (fallback lib/site/events.ts SITE_EVENTS[0].startsAt 2026-09-17T18:30:00-05:00)
- Notes: Today is 2026-09-17; after 8:30 PM CDT the featured event becomes 'past' per lib/site/events.ts and hand-typed copy goes stale.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/events.ts` | 67 | startsAt: "2026-09-17T18:30:00-05:00", durationMinutes 90, seats 10, slug chatgpt-for-business-owners-longview (untracked config) |
| `lib/events.ts` | 4 | DB is authority for dates |
| `middleware.ts` | 56 | HEAD comment 'standalone September 17 workshop funnel' + unconditional /events redirect (57-59); working tree uses eventsRedirectTarget() |
| `app/page.tsx` | 136 | "LIVE IN LONGVIEW · SEPTEMBER 17" (hand-typed) |
| `app/page.tsx` | 173 | aria-label "Explore the September 17 ChatGPT workshop in Longview" |
| `app/page.tsx` | 176 | alt "Stop guessing. Start building with ChatGPT. September 17 hands-on workshop in Longview" |
| `app/page.tsx` | 185 | <time dateTime="2026-09-17T18:30:00-05:00" aria-label="Thursday, September 17, 2026"> |
| `app/page.tsx` | 304 | "task to the September 17" |
| `components/site/NextStepGuide.tsx` | 44 | "Bring one real task to the September 17 Longview workshop." |
| `lib/leadNotify.ts` | 327 | "You put your name in for the September 17 workshop in Longview." |
| `lib/nurture.ts` | 72 | comment LFP Workshop Sep 17 Volumev1 |
| `lib/nurture.ts` | 694 | comment The Sep 17 workshop sequence |
| `lib/nurture.ts` | 702 | comment HARD STOP Thursday Sep 17 at 6:30 PM Central |
| `lib/nurture.ts` | 707 | WORKSHOP_CUTOFF_MS = Date.parse("2026-09-17T23:30:00Z") (hand-typed; tests/site-events.test.ts expects featuredEventStartMs()) |
| `lib/nurture.ts` | 748 | "That is what September 17 is for." |
| `lib/nurture.ts` | 776 | "Thursday September 17, 6:30 PM, Longview." |
| `lib/metaCampaignGuard.ts` | 100 | comment LFP Workshop Sep 17 Volumev1 |
| `content/article-publications/2026-09-06-bring-one-real-task-to-your-business-workshop.json` | 22 | claim "September 17, 2026, 6:30–8:00 PM Central" (also 28,46,52,152,202,252 starts_at 2026-09-17T23:30:00+00:00) |
| `content/article-publications/2026-09-05-give-every-inquiry-an-owner-and-next-step.json` | 22 | same claim (also 28,34) |
| `content/social-image-plan.json` | 953 | date "2026-09-17" (social image batch key, not the event) |
| `public/social/2026-09-17/manifest.json` | 2 | date "2026-09-17" (image batch) |
| `public/social/index.json` | 15 | "2026-09-17" in dates list |
| `app/admin/events/EventsManager.tsx` | 75 | comment example "2026-09-10T18:30" |

### September 1, 2026 Premier Dental Academy snapshot pin

- Category: date  ·  Occurrences at snapshot: 13
- Authoritative source: lib/site/claims.ts (untracked, not yet consumed); page copy hand-typed
- Authoritative value now: 2026-09-01 (lib/site/claims.ts asOf) with reviewBy 2026-10-01

| File | Line | Context |
| --- | --- | --- |
| `app/free-build/page.tsx` | 188 | "Operating proof · September 1, 2026 snapshot" |
| `app/free-build/page.tsx` | 202 | src /images/proof/pda-kpi-proof-2026-09-01.png |
| `app/free-build/page.tsx` | 211 | src /images/proof/pda-lead-source-proof-2026-09-01.png |
| `app/free-build/page.tsx` | 282 | "Supabase-backed snapshot captured September 1, 2026 at 6:00 PM CT" |
| `components/site/CapabilityExplorer.tsx` | 414 | "It is a September 1, 2026 snapshot, not a promise" |
| `components/site/CapabilityExplorer.tsx` | 658 | "See a real operating snapshot · September 1, 2026" |
| `components/site/CapabilityExplorer.tsx` | 661 | pda-lead-source-proof-2026-09-01.png / 662 pda-kpi-proof-2026-09-01.png |
| `components/site/CapabilityExplorer.tsx` | 664 | alt "… September 1, 2026" (also 665) |
| `components/site/CapabilityExplorer.tsx` | 670 | "captured September 1, 2026" |
| `lib/site/claims.ts` | 60 | pda_* claims asOf "2026-09-01", reviewBy "2026-10-01" (six premier claims; lfp_* claims asOf 2026-09-06) |
| `lib/site/offers.ts` | 55 | EFFECTIVE = "2026-09-01"; REVIEW = "2026-12-01" |
| `app/api/cron/operator-episode/route.ts` | 12 | start = new Date("2026-09-01T12:00:00Z") |
| `app/admin/operator/growth/page.tsx` | 91 | default startDate "2026-09-01" / targetDate "2026-09-30" (admin) |

### Other pinned public dates: Privacy 'Last updated August 28, 2026', Terms 'Last updated August 17, 2026', admin 'Monday, August 17, 2026'

- Category: date  ·  Occurrences at snapshot: 11
- Authoritative source: hand-typed in each page
- Authoritative value now: n/a (per-page)
- Notes: Two different Stripe API version strings in the tree.

| File | Line | Context |
| --- | --- | --- |
| `app/privacy/page.tsx` | 13 | "Last updated August 28, 2026" |
| `app/terms/page.tsx` | 13 | "Last updated August 17, 2026" |
| `components/content-engine/ContentEngine.tsx` | 351 | "Monday, August 17, 2026 · Central Time" (admin-only /admin/content-engine) |
| `lib/stripe.ts` | 10 | apiVersion "2026-07-29.dahlia" |
| `app/api/sales/invoices/route.ts` | 7 | STRIPE_VERSION "2026-06-24.dahlia" (differs from lib/stripe.ts) |
| `app/sellerproof/sample/route.ts` | 9 | sample deadline "2026-10-20" (sample data, lines 15,20,31,38) |
| `lib/timeback.ts` | 6 | comment approved 2026-08-20 |
| `lib/metaCampaignGuard.ts` | 56 | comment 2026-09-07 decision |
| `app/api/meta-leads/route.ts` | 293 | comment Verified on 2026-09-03 |
| `app/api/quo-inbound/route.ts` | 19 | comments 2026-09-16 / 2026-08-26 |
| `app/api/cron/followups/route.ts` | 13 | comment 2026-08-12 |

### (903) 500-8898 business phone (+19035008898)

- Category: phone  ·  Occurrences at snapshot: 41
- Authoritative source: lib/site/business.ts:20-27 via lib/contactInfo.ts; only components/site/LeadQualifier.tsx and app/services/page.tsx consume the constant
- Authoritative value now: (903) 500-8898 / +19035008898 (BUSINESS.phone)
- Notes: 27 hand-typed in app/, 8 in components/, plus lib emails/tools placeholders. components/live/DashboardRequestForm.tsx:54 uses the unformatted '903-500-8898'.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/business.ts` | 21 | phone.display "(903) 500-8898", e164 +19035008898, tel:, sms:, schema "+1-903-500-8898" |
| `lib/contactInfo.ts` | 6 | PHONE_DISPLAY/TEL/SMS = BUSINESS.phone.* (working tree; HEAD literals) |
| `lib/siteContent.ts` | 8 | re-exports PHONE_DISPLAY/TEL/SMS |
| `components/site/LeadQualifier.tsx` | 12 | imports PHONE_DISPLAY, PHONE_TEL (only component using the constant) |
| `app/services/page.tsx` | 9 | imports PHONE_DISPLAY, PHONE_TEL from siteContent |
| `lib/quo.ts` | 27 | LEADFLOW_FROM = "+19035008898" |
| `lib/quo.ts` | 7 | comment (903) 500-8898 (also 11) |
| `lib/quo.ts` | 237 | "(903) 500-8898 is my direct line, save it. Reply STOP to opt out." |
| `app/page.tsx` | 42 | JSON-LD telephone "+1-903-500-8898" (also 67) |
| `lib/leadNotify.ts` | 169 | SIGNATURE "(903) 500-8898" (also 255,314,338,379,392,410) |
| `lib/leadMessageAuthor.ts` | 45 | email html signature "The LeadFlow Pro · (903) 500-8898" (also 46 text) |
| `lib/businessDiagnosticEmails.ts` | 356 | "(903) 500-8898" (also 383, 494) |
| `lib/nurture.ts` | 664 | "Keep my number: (903) 500-8898" |
| `lib/proKitFulfillment.ts` | 59 | "(903) 500-8898" |
| `lib/articles-september-launch.ts` | 23 | article body "Call or text The LeadFlow Pro at (903) 500-8898" (also 43, 63) |
| `lib/tools/generators.ts` | 138 | placeholder "(903) 500-8898" (also 210,275,393,684,859,986,1230,1303,1383) |
| `lib/tools/growth.ts` | 202 | placeholder "(903) 500-8898" |
| `app/api/stripe-webhook/route.ts` | 240 | "(903) 500-8898" (also 312,388,590,776,1103) |
| `app/api/cron/nurture/route.ts` | 91 | "(903) 500-8898" |
| `app/api/quo-inbound/route.ts` | 50 | comment (+1 903-500-8898) |
| `app/free-build/welcome/page.tsx` | 79 | sms:+19035008898 (also 83 tel:, 84 display, 135 display, 139 sms) |
| `app/free-build/page.tsx` | 107 | sms:+19035008898 (also 108, 459, 460 "Text Me: (903) 500-8898") |
| `app/contact/ContactForm.tsx` | 146 | tel:+19035008898 / 147 display |
| `app/contact/page.tsx` | 27 | secondary tel:+19035008898 "Call or text (903) 500-8898" (also 49, 51) |
| `app/articles/page.tsx` | 100 | secondary tel: "Call or text (903) 500-8898" |
| `app/articles/[slug]/page.tsx` | 290 | same |
| `app/connect/page.tsx` | 102 | tel:+19035008898 / 103 display |
| `app/thank-you/page.tsx` | 199 | "from (903) 500-8898" |
| `app/go/time-back/welcome/WelcomeFlow.tsx` | 308 | "call or text (903) 500-8898" |
| `app/go/time-back/TimeBackFunnel.tsx` | 653 | consent "from (903) 500-8898" |
| `app/embed/[slug]/page.tsx` | 50 | "Text (903) 500-8898" |
| `app/embed/[slug]/b/page.tsx` | 97 | "Text (903) 500-8898" |
| `app/tools/pro/unlock/page.tsx` | 45 | "text (903) 500-8898" |
| `app/tools/[slug]/page.tsx` | 394 | "at (903) 500-8898" |
| `components/live/DashboardRequestForm.tsx` | 54 | "text 903-500-8898" (unformatted variant) |
| `components/tools/ToolFinder.tsx` | 161 | "Text me at (903) 500-8898" |
| `components/tools/ToolEngine.tsx` | 871 | "Stuck? Text (903) 500-8898." |
| `components/tools/ToolDirectory.tsx` | 576 | sms:+19035008898 |
| `components/site/MallWalkVideo.tsx` | 108 | tel:+19035008898 / 109 display |
| `components/tools/pro/ProBuyButton.tsx` | 54 | "Text (903) 500-8898" (also 55, 58) |
| … | | 1 more occurrences |

### (903) 913-6444 Premier Dental Academy phone (shared Quo workspace)

- Category: phone  ·  Occurrences at snapshot: 1
- Authoritative source: comment only
- Authoritative value now: Not a LeadFlow number; keep out of LeadFlow copy
- Notes: '903 230-6444' was NOT found anywhere in scope. Fictional numbers 903-555-0163 / 903-555-0127 appear in content/academy/chatgpt-operator/05-…md:75,81 and 02-…md:78 (example data).

| File | Line | Context |
| --- | --- | --- |
| `lib/quo.ts` | 11 | comment: "Premier Dental Academy (903) 913-6444" — explains Quo from-number attribution bug |

### hello@theleadflowpro.com public inbox

- Category: email  ·  Occurrences at snapshot: 35
- Authoritative source: lib/site/business.ts:31 via lib/config.ts CONTACT_EMAIL; 63 hand-typed in app/, 2 in components/
- Authoritative value now: hello@theleadflowpro.com (BUSINESS.email.hello, lowercase)
- Notes: HEAD lib/config.ts:12 had mixed-case 'Hello@TheLeadFlowPro.com'; now derived lowercase.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/business.ts` | 31 | email.hello "hello@theleadflowpro.com" |
| `lib/config.ts` | 14 | CONTACT_EMAIL = BUSINESS.email.hello (working tree; HEAD :12 literal "Hello@TheLeadFlowPro.com" mixed-case) |
| `components/SiteFooter.tsx` | 74 | mailto:hello@theleadflowpro.com (hand-typed; 77 display) |
| `components/Footer.tsx` | 34 | mailto:${CONTACT_EMAIL} (HEAD only; file staged for deletion) |
| `app/page.tsx` | 41 | JSON-LD email (also 68) |
| `app/privacy/page.tsx` | 121 | mailto |
| `app/terms/page.tsx` | 83 | mailto |
| `app/connect/page.tsx` | 106 | mailto / 107 |
| `app/unsubscribe/page.tsx` | 35 | "Email hello@theleadflowpro.com" (also 45 mailto) |
| `app/unsubscribed/page.tsx` | 26 | (also 39 mailto) |
| `app/tools/pro/unlock/page.tsx` | 44 | mailto |
| `app/tools/pro/unlock/UnlockForm.tsx` | 38 | error copy |
| `app/diagnostic/BusinessDiagnosticForm.tsx` | 662 | mailto |
| `app/commerce/CommercePlanner.tsx` | 80 | error copy (also 96) |
| `app/events/[slug]/page.tsx` | 175 | mailto / 176 |
| `app/events/[slug]/confirmed/ConfirmedClient.tsx` | 330 | (also 353) |
| `app/go/tools/welcome/BillingPortalButton.tsx` | 31 | error copy |
| `app/go/tools/manage/MonthlyMenuChange.tsx` | 56 | error copy |
| `app/go/time-back/welcome/WelcomeFlow.tsx` | 45 | (also 68, 306) |
| `app/api/pro/restore/route.ts` | 78 | (also 121, 153 from, 155 reply_to) |
| `app/api/timeback/onboarding/route.ts` | 91 | (also 176 from, 177 to) |
| `app/api/lead-follow-up/intake/route.ts` | 155 | to: [hello@] |
| `app/api/stripe-webhook/route.ts` | 86 | from/to/reply_to hello@ at 86,87,92,94,129,130,135,137,170,171,176,178,231,275,276,294,296,348,349,368,370,748,749,914,1079 |
| `app/api/cron/digest/route.ts` | 68 | from/to hello@ (also 5 comment, 69) |
| `app/api/cron/nurture/route.ts` | 350 | reply_to |
| `app/api/sales/invoices/route.ts` | 131 | invoice footer "Questions: hello@theleadflowpro.com" |
| `app/admin/operator/setup/page.tsx` | 27 | sender_email default |
| `lib/leadNotify.ts` | 134 | OWNER list (also 142,182,369,400 reply_to) |
| `lib/proKitFulfillment.ts` | 24 | from/to/reply_to (also 25,34,36) |
| `lib/contactNotifications.ts` | 99 | LEADFLOW_NOTIFY_EMAIL fallback |
| `lib/hq/channels.ts` | 180 | reply_to |
| `lib/eventSeatFulfillment.ts` | 125 | from/to/reply_to (also 126,149,151) |
| `lib/businessDiagnosticEmails.ts` | 13 | REPLY_TO |
| `lib/diagnosticNotifications.ts` | 109 | fallback |
| `lib/sellerproof/receipt.ts` | 42 | to (also 56 from, 57 reply_to) |

### ryan@theleadflowpro.com transactional sender

- Category: email  ·  Occurrences at snapshot: 7
- Authoritative source: lib/site/business.ts:33; all uses literal
- Authoritative value now: ryan@theleadflowpro.com (BUSINESS.email.ryan)
- Notes: ryan@realryannichols.com not found anywhere in scope.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/business.ts` | 33 | email.ryan |
| `lib/leadNotify.ts` | 163 | FROM_RYAN "Ryan Nichols <ryan@theleadflowpro.com>" (also 367, 398) |
| `lib/leadMessageAuthor.ts` | 3 | VERIFIED_MAILBOX |
| `lib/businessDiagnosticEmails.ts` | 11 | FROM |
| `app/api/stripe-webhook/route.ts` | 230 | from |
| `app/api/cron/nurture/route.ts` | 349 | from |
| `lib/leadNotify.ts` | 70 | comment: used to send from realryannichols.com, not verified |

### hq@theleadflowpro.com, leadflow@theleadflowpro.com, pat@theleadflowpro.com

- Category: email  ·  Occurrences at snapshot: 9
- Authoritative source: lib/site/business.ts:35,37; pat@ literal only
- Authoritative value now: BUSINESS.email.hq / alerts; pat@ not in registry

| File | Line | Context |
| --- | --- | --- |
| `lib/hq/channels.ts` | 16 | HQ_FROM_EMAIL hq@ (also 17 HQ_ALERT_FROM) |
| `lib/site/business.ts` | 37 | email.hq; 35 email.alerts leadflow@ |
| `lib/leadNotify.ts` | 141 | from leadflow@ |
| `lib/contactNotifications.ts` | 97 | from leadflow@ |
| `lib/businessDiagnosticEmails.ts` | 12 | INTERNAL_FROM leadflow@ |
| `app/api/lead-follow-up/intake/route.ts` | 154 | from leadflow@ |
| `app/api/stripe-webhook/route.ts` | 913 | from leadflow@ (also 1078) |
| `lib/leadNotify.ts` | 135 | pat@theleadflowpro.com owner copy |
| `app/login/LoginForm.tsx` | 17 | pat@theleadflowpro.com -> "Patrick Grabbs" (also 13 comment) |

### Free Website Program (offer name)

- Category: offer_name  ·  Occurrences at snapshot: 8
- Authoritative source: lib/freeBuild.ts FREE_BUILD.name; 18 hits in scope
- Authoritative value now: Free Website Program

| File | Line | Context |
| --- | --- | --- |
| `lib/freeBuild.ts` | 24 | name "The Free Website Program" |
| `lib/freeBuild.ts` | 162 | freeOnly name "Free Website Program" |
| `lib/siteContent.ts` | 156 | LADDER name "Free Website Program" |
| `lib/site/offers.ts` | 62 | id free_website_program |
| `lib/leadNotify.ts` | 18 | label free_website_program |
| `app/packages/page.tsx` | 193 | "Apply for the Free Website Program" |
| `app/add-ons/AddOnsMenu.tsx` | 804 | "through the Free Website" |
| `components/SiteFooter.tsx` | 44 | "Free Website \| $0 Build Fee" |

### Website Launch (offer name)

- Category: offer_name  ·  Occurrences at snapshot: 8
- Authoritative source: lib/offers.ts WEBSITE_LAUNCH
- Authoritative value now: Website Launch
- Notes: Route /packages/launch.

| File | Line | Context |
| --- | --- | --- |
| `lib/offers.ts` | 11 | WEBSITE_LAUNCH.name |
| `lib/offers.ts` | 84 | OFFER_LADDER name |
| `lib/site/offers.ts` | 114 | id website_launch |
| `lib/siteContent.ts` | 187 | LADDER |
| `app/packages/[slug]/page.tsx` | 81 | PACKS launch name |
| `app/start/StartRouter.tsx` | 764 | PACKAGES.launch |
| `lib/leadNotify.ts` | 16 | labels launch_system and website_launch both -> "Website Launch" |
| `app/packages/page.tsx` | 132 | JSON-LD name "The LeadFlow Pro Website Launch" |

### System Map (offer name)

- Category: offer_name  ·  Occurrences at snapshot: 6
- Authoritative source: lib/offers.ts
- Authoritative value now: System Map
- Notes: Route /packages/system-map.

| File | Line | Context |
| --- | --- | --- |
| `lib/offers.ts` | 76 | OFFER_LADDER |
| `lib/site/offers.ts` | 128 | id system_map |
| `lib/siteContent.ts` | 172 | LADDER |
| `app/packages/[slug]/page.tsx` | 47 | PACKS system-map |
| `app/api/checkout/route.ts` | 45 | "Company OS requires a System Map before checkout" |
| `app/packages/[slug]/PackageOrderForm.tsx` | 126 | "Company OS requires a System Map before any build payment." |

### Company OS / Industry OS / Company operating system (offer name + slug)

- Category: offer_name  ·  Occurrences at snapshot: 13
- Authoritative source: lib/site/offers.ts:166-175
- Authoritative value now: Company OS at /packages/industry-os (slug retained; no 'Industry OS' label anywhere)
- Notes: The literal string 'Industry OS' appears nowhere; only the slug/key 'industry-os'/'industry_os' survives. /company-os and /industry-os routes do not exist.

| File | Line | Context |
| --- | --- | --- |
| `lib/offers.ts` | 108 | OFFER_LADDER company-os name "Company OS" href /start?goal=replace_tools |
| `lib/site/offers.ts` | 167 | id company_os name "Company OS" href /packages/industry-os |
| `lib/siteContent.ts` | 203 | LADDER "Company OS" href /packages/industry-os |
| `app/packages/[slug]/page.tsx` | 115 | PACKS slug "industry-os" name "Company OS" |
| `app/packages/page.tsx` | 83 | module "Company operating system" |
| `app/start/StartRouter.tsx` | 769 | PACKAGES.industry_os name "Company OS" |
| `lib/leadNotify.ts` | 21 | company_os and industry_os both -> "Company OS" |
| `app/admin/LeadsTable.tsx` | 37 | industry_os/company_os -> "Company OS" (also LeadWorkspace.tsx:57-58) |
| `app/book/BookForm.tsx` | 123 | option company_os |
| `lib/publicPageCatalog.ts` | 121 | path /packages/industry-os title "Build around the way you work" |
| `lib/uniqueOgImages.ts` | 35 | /packages/industry-os OG image |
| `app/company-builder.css` | 3949 | selector for /packages/industry-os |
| `lib/operatorAcademyCatalog.ts` | 227 | course "Operator Academy 10: The Company OS Blueprint" |

### Lead Engine / Training Platform / Custom Platform / Course platform (ladder names)

- Category: offer_name  ·  Occurrences at snapshot: 7
- Authoritative source: lib/offers.ts OFFER_LADDER (rendered on /pricing)
- Authoritative value now: Decide 'Training Platform' vs 'Course platform' once in lib/site/offers.ts

| File | Line | Context |
| --- | --- | --- |
| `lib/offers.ts` | 92 | "Lead Engine"; 100 "Training Platform"; 116 "Custom Platform" |
| `lib/site/offers.ts` | 141 | "Lead Engine"; 154 "Course platform" (id training_platform); 180 "Custom Platform" |
| `app/packages/page.tsx` | 71 | "Course platform" $5,000+; 89 "Custom platform" $15,000+ (no Lead Engine) |
| `app/pricing/page.tsx` | 19 | metadata lists all six |
| `app/book/BookForm.tsx` | 121 | options lead_engine, training_platform, company_os, custom_platform |
| `lib/system-stages.ts` | 459 | "online course platform alternative" (SEO phrase) |
| `app/training/[course]/page.tsx` | 131 | "a course platform built for your org" |

### Follow-Up Campaign / Follow-Up Pack / Content Engine / 30-Day Growth Engine / Pro Kits / Plugin / SellerProof / Tool Studio / Time Back / OperatorOS / Operator Academy (product names)

- Category: offer_name  ·  Occurrences at snapshot: 12
- Authoritative source: per-module name constants
- Authoritative value now: lib/site/offers.ts OFFERS ids
- Notes: 'Operations Partner' (lib/leadNotify.ts:24) is an interest label with no offer definition.

| File | Line | Context |
| --- | --- | --- |
| `lib/leadFollowUp.ts` | 16 | name "Lead Follow-Up Campaign" (27 'Follow-Up Campaign' hits in scope) |
| `lib/freeBuild.ts` | 113 | "Free Website + Follow-Up Pack" (2 hits: also lib/nurture.ts:458 'follow-up pack') |
| `lib/freeBuild.ts` | 129 | "Free Website + Content Engine" (20 'Content Engine' hits incl. course + admin tool) |
| `lib/freeBuild.ts` | 145 | "Free Website + 30-Day Growth Engine" (1 hit) |
| `lib/tools/pro/index.ts` | 26 | PRO_BUNDLE "Every Pro Kit" (13 'Pro Kits' hits) |
| `lib/hq/types.ts` | 10 | HQ_PLAN.name "The LeadFlow Pro Plugin", shortName "LeadFlow Plugin", connectorName "The LeadFlow Pro" |
| `lib/sellerproof/packet.ts` | 5 | SELLERPROOF.name "SellerProof" (123 hits) |
| `lib/toolStudio.ts` | 9 | Tool Blueprint / Quick Tool / Tool Funnel (17 'Tool Studio' hits) |
| `lib/timeback.ts` | 1 | Time Back (42 hits) |
| `lib/operatoros/catalog.ts` | 48 | FlowWorker / FlowDesk / FlowOps / OperatorOS (111 'OperatorOS' hits) |
| `lib/operatorAcademyCatalog.ts` | 1 | Operator Academy (44 hits) |
| `lib/leadNotify.ts` | 24 | label operations: "Operations Partner" (name not in any offers registry) |

### Workshop titles

- Category: offer_name  ·  Occurrences at snapshot: 12
- Authoritative source: Supabase events.title; lib/site/events.ts fallback
- Authoritative value now: ChatGPT for Business Owners: Live in Longview (DB events.title; config lib/site/events.ts:65)
- Notes: Home hero uses a different creative headline ('Stop guessing…').

| File | Line | Context |
| --- | --- | --- |
| `lib/site/events.ts` | 65 | title "ChatGPT for Business Owners: Live in Longview" |
| `app/events/[slug]/page.tsx` | 41 | metadata title "ChatGPT for Business Owners: Live in Longview \| The LeadFlow Pro" |
| `app/events/WorkshopShowcase.tsx` | 81 | h2 "ChatGPT for Business Owners: Live in Longview." |
| `lib/publicPageCatalog.ts` | 13 | title "ChatGPT for Business Owners: Live in Longview" (index:false) |
| `app/admin/events/EventsManager.tsx` | 229 | placeholder same |
| `app/page.tsx` | 191 | "CHATGPT FOR BUSINESS OWNERS" / 63 "Live in Longview, Texas" |
| `app/page.tsx` | 176 | alt "Stop guessing. Start building with ChatGPT." (creative headline) |
| `lib/events.ts` | 252 | kicker "Hands-on ChatGPT workshop" |
| `app/events/page.tsx` | 97 | alt "Hands-on ChatGPT workshop in Longview" |
| `lib/articles-september-launch.ts` | 47 | article "Bring one real task to your business workshop" |
| `lib/nurture.ts` | 72 | campaign "LFP Workshop Sep 17 Volumev1" (also lib/metaCampaignGuard.ts:100) |
| `app/events/page.tsx` | 19 | "Hands-on AI workshops for East Texas business owners" |

### Longview Training Center, LLC (legal entity; DBA line)

- Category: legal_name  ·  Occurrences at snapshot: 16
- Authoritative source: lib/site/business.ts:9-11; 11 hand-typed in app/, 1 in components/
- Authoritative value now: Longview Training Center, LLC (BUSINESS.legalName / dbaLine)
- Notes: Four credential disclaimers omit the comma ('Longview Training Center LLC').

| File | Line | Context |
| --- | --- | --- |
| `lib/site/business.ts` | 9 | legalName "Longview Training Center, LLC"; 11 dbaLine "The LeadFlow Pro, a DBA of Longview Training Center, LLC" |
| `components/SiteFooter.tsx` | 95 | "© {year} The LeadFlow Pro. A DBA of Longview Training Center, LLC." (hand-typed) |
| `app/start/StartRouter.tsx` | 2073 | router footer "The LeadFlow Pro, a DBA of Longview Training Center, LLC" |
| `app/privacy/page.tsx` | 16 | "The LeadFlow Pro is a DBA of Longview Training Center, LLC." |
| `app/terms/page.tsx` | 16 | "a DBA of Longview Training Center, LLC" (also 59, 69) |
| `app/page.tsx` | 30 | JSON-LD legalName |
| `app/packages/page.tsx` | 135 | JSON-LD legalName (also 453 "Secure checkout through Longview Training Center, LLC") |
| `app/premier-system/page.tsx` | 239 | JSON-LD legalName (also 650) |
| `lib/commerce.ts` | 11 | merchant.operator |
| `lib/academyCredential.ts` | 6 | "issued by Longview Training Center LLC" (NO comma) |
| `lib/chatgptOperatorCourse.ts` | 21 | same, no comma |
| `lib/contentEngineCourse.ts` | 21 | same, no comma |
| `lib/contentEngineAssessments.ts` | 349 | same, no comma |
| `app/events/WorkshopShowcase.tsx` | 105 | venue "Longview Training Center · Longview, TX" |
| `lib/site/events.ts` | 74 | venueLine "Longview Training Center · Longview, TX" |
| `app/admin/events/EventsManager.tsx` | 238 | venue placeholder |

### Real Ryan Nichols LLC (legacy legal name)

- Category: legal_name  ·  Occurrences at snapshot: 1
- Authoritative source: none
- Authoritative value now: Remove; superseded by Longview Training Center, LLC
- Notes: Only occurrence in scope.

| File | Line | Context |
| --- | --- | --- |
| `components/Footer.tsx` | 9 | "The LeadFlow Pro · Real Ryan Nichols LLC" (HEAD 50978db only; file deleted from disk and staged for deletion; zero importers even in HEAD) |

### 2800 Gilmer Rd Suite 106, Longview, TX 75604

- Category: address  ·  Occurrences at snapshot: 7
- Authoritative source: lib/site/business.ts:46-53; app/page.tsx JSON-LD hand-typed
- Authoritative value now: BUSINESS.address (structured data only)
- Notes: Not printed in any visible page copy; workshop venue address released only to paid seats.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/business.ts` | 47 | address street/city/region/postalCode/country; policy "structured_data_only"; comment says which address wins is a pending Ryan decision (docs/decisions-needed. |
| `app/page.tsx` | 45 | JSON-LD Organization PostalAddress (45-48) |
| `app/page.tsx` | 71 | JSON-LD ProfessionalService PostalAddress (71-74) |
| `lib/tools/generators.ts` | 860 | placeholder "2800 Gilmer Rd Suite 106" (863 zip 75604; 1098 full address) |
| `lib/tools/pro/kits/qr-sign-kit.ts` | 123 | placeholder full address |
| `lib/tools/pro/kits/local-seo-schema-kit.ts` | 94 | placeholder street (96 zip 75604) |
| `lib/events.ts` | 166 | comment: calendar file carries street address only for confirmed seats |

### https://workshop.theleadflowpro.com/ (standalone workshop funnel)

- Category: url  ·  Occurrences at snapshot: 11
- Authoritative source: lib/site/external-links.ts:10; all consumers still literal
- Authoritative value now: EXTERNAL_LINKS.workshopSite

| File | Line | Context |
| --- | --- | --- |
| `lib/site/external-links.ts` | 10 | workshopSite |
| `lib/site/events.ts` | 76 | externalSiteUrl: EXTERNAL_LINKS.workshopSite |
| `middleware.ts` | 10 | HEAD WORKSHOP_SITE_URL literal; working tree uses eventsRedirectTarget() |
| `components/SiteHeader.tsx` | 16 | NAV "Events" -> external URL (hand-typed) |
| `components/SiteFooter.tsx` | 42 | "Events & Workshops" -> external URL (hand-typed) |
| `components/site/NextStepGuide.tsx` | 77 | literal |
| `app/page.tsx` | 134 | literal (also 173, 307) |
| `app/events/[slug]/page.tsx` | 79 | workshopUrl literal |
| `lib/leadNotify.ts` | 332 | literal |
| `lib/nurture.ts` | 715 | workshopLink base literal |
| `app/api/events/availability/route.ts` | 14 | CORS Access-Control-Allow-Origin https://workshop.theleadflowpro.com |

### realryannichols.com / premierdentalacademyoflongview.com / lonestartotalwash.com / donandpatti.com / gideonhq.com (proof links)

- Category: url  ·  Occurrences at snapshot: 14
- Authoritative source: lib/site/external-links.ts (partial); consumers literal
- Authoritative value now: EXTERNAL_LINKS keys (donandpatti/gideonhq/faretta not yet in registry)
- Notes: Hostname variants: realryannichols.com with and without www; premierdentalacademyoflongview.com with and without www.

| File | Line | Context |
| --- | --- | --- |
| `lib/site/external-links.ts` | 15 | realRyanNichols https://realryannichols.com; 17 premierDentalAcademy https://www.premierdentalacademyoflongview.com; 19 loneStarTotalWash; 20 loneStarJobs /jobs |
| `lib/siteContent.ts` | 58 | premier href; 79 realryannichols; 100 lonestartotalwash |
| `lib/system-stages.ts` | 107 | realryannichols (also 318, 550); 108,183,241 lonestartotalwash; 182,242,317,375,432,491 premier; 184,434,492 donandpatti |
| `lib/scoreboard.ts` | 68 | https://premierdentalacademyoflongview.com (no www); 86 https://www.realryannichols.com (with www) |
| `app/results/page.tsx` | 56 | lonestartotalwash /jobs; 70 realryannichols |
| `app/portfolio/page.tsx` | 68 | premier; 107,109 lonestartotalwash; 148,150 donandpatti; 164 realryannichols |
| `app/packages/page.tsx` | 108 | premier; 115 realryannichols; 122 lonestartotalwash |
| `app/packages/[slug]/page.tsx` | 69 | premier (also 140); 70,106 donandpatti; 105,141 realryannichols; 142 https://gideonhq.com |
| `app/premier-system/page.tsx` | 25 | PREMIER const |
| `app/commerce/page.tsx` | 183 | https://gideonhq.com/marketplace |
| `components/site/CapabilityExplorer.tsx` | 401 | lonestartotalwash; 495 realryannichols |
| `app/about/page.tsx` | 71 | "RealRyanNichols.com" text |
| `app/add-ons/AddOnsMenu.tsx` | 130 | "Live on DonAndPatti.com" (also 193,240,303,318 incl. Faretta.legal) |
| `app/start/StartRouter.tsx` | 649 | proof "DonAndPatti.com" (also 689) |

### https://book.stripe.com/cNi6oG52y1kockE5oq5AQ0a (Website Launch $500 deposit Payment Link)

- Category: url  ·  Occurrences at snapshot: 10
- Authoritative source: lib/site/external-links.ts:26 via lib/offers.ts (all consumers use the constant)
- Authoritative value now: EXTERNAL_LINKS.stripeWebsiteLaunchDeposit
- Notes: checkout.stripe.com only appears as hostname validation (lib/eventPayments.ts:113, app/api/sellerproof/checkout/route.ts:68).

| File | Line | Context |
| --- | --- | --- |
| `lib/site/external-links.ts` | 26 | stripeWebsiteLaunchDeposit |
| `lib/offers.ts` | 7 | WEBSITE_LAUNCH_CHECKOUT = EXTERNAL_LINKS.stripeWebsiteLaunchDeposit (HEAD :2 literal) |
| `app/pricing/page.tsx` | 183 | primary href WEBSITE_LAUNCH_CHECKOUT |
| `app/packages/[slug]/page.tsx` | 213 | href WEBSITE_LAUNCH_CHECKOUT |
| `app/packages/page.tsx` | 13 | import as CHECKOUT_URL |
| `app/deposit/DepositForm.tsx` | 4 | import |
| `app/premier-system/page.tsx` | 20 | import |
| `app/start/StartRouter.tsx` | 11 | import |
| `app/system/[stage]/page.tsx` | 36 | import |
| `app/packages/[slug]/PackageOrderForm.tsx` | 12 | import |

### YouTube @TheLeadFlowProVids and Facebook profile 61586176300453 (sameAs)

- Category: url  ·  Occurrences at snapshot: 5
- Authoritative source: lib/site/business.ts:55-58 (duplicated in external-links.ts:22-23)
- Authoritative value now: BUSINESS.socials

| File | Line | Context |
| --- | --- | --- |
| `lib/site/business.ts` | 56 | socials.youtube / facebook |
| `lib/site/external-links.ts` | 22 | youtube / 23 facebook |
| `app/page.tsx` | 57 | JSON-LD sameAs (57-58) |
| `lib/courseSeo.ts` | 22 | sameAs (22-23) |
| `components/site/MallWalkVideo.tsx` | 22 | FB_REEL_URL / 23 FB_WATCH_URL / 24 EMBED_SRC facebook.com/plugins/video.php |

### go.theleadflowpro.com Build Workspace host and /api/mcp endpoint

- Category: url  ·  Occurrences at snapshot: 4
- Authoritative source: lib/workspaceHost.ts:13 (used); external-links.ts not consumed
- Authoritative value now: EXTERNAL_LINKS.workspaceHost

| File | Line | Context |
| --- | --- | --- |
| `lib/site/external-links.ts` | 12 | workspaceHost https://go.theleadflowpro.com; 29 mcpEndpoint https://www.theleadflowpro.com/api/mcp |
| `lib/workspaceHost.ts` | 13 | WORKSPACE_HOST = "go.theleadflowpro.com" |
| `app/admin/connections/page.tsx` | 216 | href https://go.theleadflowpro.com (218 display) |
| `middleware.ts` | 23 | comment |

### Internal route drift: /packages/industry-os, /pricing, /book, /demo, /showcase, /academy, /events, /agency/*

- Category: url  ·  Occurrences at snapshot: 20
- Authoritative source: app/ filesystem; lib/publicPageCatalog.ts drives sitemap
- Authoritative value now: lib/site/navigation.ts chromeInternalHrefs() checked against app/ routes at build time
- Notes: HEAD components/Footer.tsx and components/Nav.tsx (staged deletions) linked /pricing,/portfolio,/showcase,/demo,/events,/contact,/book,/academy,/training. /operator-academy exists but is absent from lib/publicPageCatalog.ts (only /operator-academy/content-engine at :252).

| File | Line | Context |
| --- | --- | --- |
| `app/packages/[slug]/page.tsx` | 152 | generateStaticParams for slugs system-map, launch, industry-os (all exist) |
| `app/pricing/page.tsx` | 15 | canonical /pricing (exists, live, six-offer ladder) |
| `app/pricing/[tier]/page.tsx` | 25 | permanentRedirect("/pricing") for learn-it/build-it-with-you/done-for-you; robots index:false |
| `app/book/page.tsx` | 7 | exists (linked by BuyButton:39-55, RentCalculator:328, events/page.tsx:139,205, WorkshopShowcase:68, free-build:456, live:379, operatoros:482, go/lead-follow-up |
| `app/demo/page.tsx` | 15 | exists (publicPageCatalog:216) |
| `app/showcase/page.tsx` | 8 | exists (publicPageCatalog:209; demo:279) |
| `app/academy/page.tsx` | 17 | exists, canonical /academy (publicPageCatalog:231; training-library.ts:37-38; training/page.tsx:51; training/[course]/page.tsx:70; operator-academy/page.tsx:4) |
| `middleware.ts` | 57 | /events redirected to workshop site (HEAD unconditional; working tree while event is on) |
| `app/services/page.tsx` | 371 | <Link href="/events"> (hits redirect) |
| `app/thank-you/page.tsx` | 173 | <Link href="/events"> (hits redirect) |
| `lib/articles-september-launch.ts` | 23 | [See the upcoming workshop](/events) (also 43, 63) |
| `app/api/events/claim/route.ts` | 14 | redirect("/events") fallback |
| `app/page.tsx` | 195 | link /events/chatgpt-for-business-owners-longview (slug page exists; publicPageCatalog:12 index:false) |
| `lib/site/navigation.ts` | 16 | NAV "/agency" "Run it for me" — app/agency DOES NOT EXIST |
| `lib/site/navigation.ts` | 34 | footer "/agency"; 65 "/agency/start" — missing routes |
| `lib/site/offers.ts` | 316 | hrefs /agency/meta-ads, /agency/google-ads, /agency/automation, /agency/video, /agency/content (316,329,342,355,368) — missing routes |
| `lib/site/navigation.ts` | 18 | NAV "/events" (internal; relies on middleware redirect) |
| `lib/site/offers.ts` | 300 | workshop offer href "/events" |
| `lib/publicPageCatalog.ts` | 107 | /packages/system-map; 114 /packages/launch; 121 /packages/industry-os (sitemap entries) |
| `lib/uniqueOgImages.ts` | 11 | /academy; 27 /packages/launch; 28 /showcase; 33 /book; 35 /packages/industry-os; 36 /packages/system-map; 37 /pricing |

### Footer link set (components/SiteFooter.tsx)

- Category: footer  ·  Occurrences at snapshot: 10
- Authoritative source: components/SiteFooter.tsx literals
- Authoritative value now: FOOTER_COLUMNS / FOOTER_PITCH / LEGAL_LINKS from lib/site/navigation.ts
- Notes: lib/site/navigation.ts FOOTER_COLUMNS adds /agency and /agency/start links and uses '/events' internal instead of the external URL; tests/site-config.test.ts asserts that shape.

| File | Line | Context |
| --- | --- | --- |
| `components/SiteFooter.tsx` | 10 | COLUMNS hand-typed (does not import lib/site/navigation.ts) |
| `components/SiteFooter.tsx` | 19 | "Pro Kits \| $10 to $29" |
| `components/SiteFooter.tsx` | 20 | "Plugin for ChatGPT and Claude \| $49/mo" |
| `components/SiteFooter.tsx` | 42 | external "Events & Workshops" -> workshop.theleadflowpro.com |
| `components/SiteFooter.tsx` | 43 | "Follow-Up Campaign \| $197" |
| `components/SiteFooter.tsx` | 44 | "Free Website \| $0 Build Fee" |
| `components/SiteFooter.tsx` | 58 | hidden on /start and /admin,/sales,/dashboard |
| `components/SiteFooter.tsx` | 74 | mailto:hello@theleadflowpro.com |
| `components/SiteFooter.tsx` | 95 | legal line DBA Longview Training Center, LLC; 99-100 /privacy /terms |
| `app/layout.tsx` | 9 | import SiteFooter (only importer); rendered at 101 |

### Header nav set + Portal link (components/SiteHeader.tsx)

- Category: nav  ·  Occurrences at snapshot: 9
- Authoritative source: components/SiteHeader.tsx literals
- Authoritative value now: NAV_LINKS / HEADER_PORTAL / HEADER_CTA from lib/site/navigation.ts
- Notes: Portal is present in SiteHeader; HEAD Nav.tsx used 'Log in'/'Dashboard' instead.

| File | Line | Context |
| --- | --- | --- |
| `components/SiteHeader.tsx` | 12 | NAV_LINKS hand-typed: /, /services, /operator-academy, external workshop URL (Events), /scoreboard, /tools, /articles |
| `components/SiteHeader.tsx` | 51 | Portal link href=/login aria-label "Member and staff portal" label "Portal" (desktop) |
| `components/SiteHeader.tsx` | 107 | mobile "Member & staff portal" -> /login |
| `components/SiteHeader.tsx` | 58 | CTA /#qualify "Find my next step" (also 111) |
| `components/SiteHeader.tsx` | 31 | hidden on /start and workspace paths |
| `app/layout.tsx` | 8 | import SiteHeader (only importer); rendered at 97 |
| `lib/site/navigation.ts` | 13 | proposed NAV_LINKS adds /agency "Run it for me" and internal /events; 24 HEADER_PORTAL /login "Portal"; 25 HEADER_CTA |
| `app/admin/layout.tsx` | 139 | "Member portal" link (workspace chrome) |
| `app/sales/layout.tsx` | 102 | "Member portal" link (workspace chrome) |

### Per-page footer blocks

- Category: footer  ·  Occurrences at snapshot: 5
- Authoritative source: hand-typed per page
- Authoritative value now: BUSINESS.dbaLine
- Notes: No footer/legal text found in app/hq/layout.tsx, app/dashboard/layout.tsx, app/admin/layout.tsx, app/sales/layout.tsx, app/sellerproof/terms|privacy.

| File | Line | Context |
| --- | --- | --- |
| `app/start/StartRouter.tsx` | 2072 | <footer class=router-footer> "The LeadFlow Pro, a DBA of Longview Training Center, LLC" + privacy note (page hides SiteFooter) |
| `app/training/chatgpt-operator/credential/page.tsx` | 40 | <footer>{credential.disclaimer}</footer> ("issued by Longview Training Center LLC") |
| `app/training/content-engine/credential/page.tsx` | 40 | same |
| `app/training/[course]/credential/page.tsx` | 33 | credential article with disclaimer |
| `components/Footer.tsx` | 6 | HEAD-only legacy footer (staged deletion, zero importers) |

### Proof claims: '7 live systems', '1,568+ case profiles', '509-photo archive'

- Category: claim  ·  Occurrences at snapshot: 7
- Authoritative source: hand-typed copy; claims.ts untracked and unconsumed
- Authoritative value now: lib/site/claims.ts CLAIMS with asOf/reviewBy

| File | Line | Context |
| --- | --- | --- |
| `lib/siteContent.ts` | 140 | "Shipped 7 live systems across multiple industries." |
| `lib/siteContent.ts` | 145 | "1,568+ case profiles" |
| `lib/system-stages.ts` | 107 | "1,568+ case profiles" (also 318, 550) |
| `app/packages/[slug]/page.tsx` | 141 | "1,568+ case profiles" |
| `lib/system-stages.ts` | 184 | "509-photo archive across five countries" (also 492) |
| `lib/site/claims.ts` | 135 | lfp_live_systems asOf 2026-09-06 reviewBy 2026-10-06; 147 lfp_industries; 53-130 six pda_* claims asOf 2026-09-01 with PREMIER_COMMON_OWNERSHIP disclosure |
| `components/site/CapabilityExplorer.tsx` | 414 | Premier snapshot claim text |

## Footer and header variants found

- **components/SiteFooter.tsx** used by: app/layout.tsx:9 (root layout, all routes; self-hides on /start and /admin|/sales|/dashboard); links: /services, /commerce, /operator-academy, /add-ons, /tools, /tools/pro (Pro Kits | $10 to $29), /plugin (Plugin for ChatGPT and Claude | $49/mo), /sellerproof, /chatgpt/free, /results, /premier-system, /scoreboard, /proof-floor, /live, /portfolio, /articles, /about, /packages, https://workshop.theleadflowpro.com/ (Events & Workshops), /go/lead-follow-up (Follow-Up Campaign | $197), /free-build (Fre
- **components/SiteHeader.tsx (header)** used by: app/layout.tsx:8 (root layout; self-hides on /start and workspace paths); links: / (Home), /services (Build my business), /operator-academy (Learn), https://workshop.theleadflowpro.com/ (Events), /scoreboard, /tools, /articles, /login (Portal / Member & staff portal), /#qualify (Find my next step)
- **components/Footer.tsx (legacy; HEAD 50978db; deleted on disk, staged deletion)** used by: none (zero importers in HEAD and working tree); links: /pricing, /portfolio (The Work), /showcase, /demo (Demo Build), /events, /contact, /book (Book a Call), mailto:${CONTACT_EMAIL} (Hello@TheLeadFlowPro.com in HEAD lib/config.ts), legal: The LeadFlow Pro · Real Ryan Nichols LLC
- **components/Nav.tsx (legacy header; HEAD 50978db; deleted on disk, staged deletion)** used by: none (zero importers; no 'Portal' label); links: /pricing, /portfolio (The Work), /showcase, /events, /academy (Academy / Operator Academy), /training, /dashboard (signed in), /admin (admin), /login (Log in), /book (Book a Call), /demo (Demo Build, mobile), /contact (mobile)
- **app/start/StartRouter.tsx:2072 router-footer (per-page)** used by: app/start/page.tsx (/start, which hides SiteHeader/SiteFooter); links: text only: The LeadFlow Pro, a DBA of Longview Training Center, LLC; 'Your answers stay in this browser until you choose to send the map.'
- **credential <footer> disclaimer** used by: app/training/chatgpt-operator/credential/page.tsx:40, app/training/content-engine/credential/page.tsx:40, app/training/[course]/credential/page.tsx:33; links: text only: 'This is a private LeadFlow Pro course completion credential issued by Longview Training Center LLC…' (lib/academyCredential.ts:6, lib/chatgptOperatorCourse.ts:21, lib/contentEngineCourse.ts:21, lib/contentEngineAssessments.ts:349)
- **lib/site/navigation.ts (proposed registry; untracked; not yet rendered)** used by: none yet (tests/site-config.test.ts imports it; SiteHeader/SiteFooter still hand-code their lists); links: NAV: /, /services, /agency (MISSING route), /operator-academy, /events, /scoreboard, /tools, /articles; HEADER_PORTAL /login 'Portal'; HEADER_CTA /#qualify, FOOTER col1: /services, /agency (MISSING), /commerce, /operator-academy, /add-ons, /tools, /tools/pro (price from PRICES), /plugin (price from PRICES), /sellerproof, /chatgpt/free, FOOTER col2: /results, /premier-system, /scoreboard, /proof-fl

Resolved: one header and one footer, both rendered from `lib/site/navigation.ts`. The legacy `components/Nav.tsx` and `components/Footer.tsx` (zero importers, wrong legal name) are deleted.

## Conflicts found

- LEGAL NAME: 'Real Ryan Nichols LLC' (components/Footer.tsx:9-10, HEAD only, zero importers, staged for deletion) vs 'Longview Training Center, LLC' everywhere else (SiteFooter.tsx:95-96, privacy:16, terms:16/59/69, StartRouter:2073, page.tsx:30, packages/page.tsx:135/453, premier-system:239/650, lib/commerce.ts:11, lib/site/business.ts:9).
- LEGAL NAME PUNCTUATION: 'Longview Training Center LLC' (no comma) in lib/academyCredential.ts:6, lib/chatgptOperatorCourse.ts:21, lib/contentEngineCourse.ts:21, lib/contentEngineAssessments.ts:349 vs 'Longview Training Center, LLC' in lib/site/business.ts:9 and all page copy.
- OFFERS TABLE: /pricing (app/pricing/page.tsx via lib/offers.ts OFFER_LADDER) publishes six rungs incl. 'Lead Engine $3,500+' and 'Training Platform $5,000+'; home + /services (lib/siteContent.ts LADDER:153-217) publish only Free Website Program $0 / System Map $497 / Website Launch $1,000 / Company OS $7,500+; /packages (app/packages/page.tsx:55-95) publishes 'Course platform $5,000+', 'Company operating system $7,500+', 'Custom platform $15,000+' with no Lead Engine; /start (StartRouter.tsx:762-780) publishes Website Launch / Company OS / Custom Platform only. Lead Engine $3,500+ exists in exactly one public table.
- NAME: 'Training Platform' (lib/offers.ts:100, app/pricing/page.tsx:77, app/book/BookForm.tsx:122, lib/leadNotify.ts:20, app/training/[course]/page.tsx:113/144) vs 'Course platform' (app/packages/page.tsx:71 and the proposed registry lib/site/offers.ts:154 under id training_platform). tests/site-config.test.ts matches rungs by href+price only, so the name mismatch is not caught.
- NAME/SLUG: 'Company OS' label vs '/packages/industry-os' slug and 'industry_os' keys (lib/siteContent.ts:213, lib/publicPageCatalog.ts:121, lib/uniqueOgImages.ts:35, app/start/StartRouter.tsx:769, lib/leadNotify.ts:22, admin tables, lib/site/offers.ts:175); also 'Company operating system' (app/packages/page.tsx:83). No 'Industry OS' label exists anywhere; /company-os and /industry-os routes do not exist.
- HREF: OFFER_LADDER company-os href '/start?goal=replace_tools' (lib/offers.ts:112) vs '/packages/industry-os' (lib/siteContent.ts:213, lib/site/offers.ts:175).
- $1,997 LEGACY: only literal is lib/operatoros/catalog.ts:59 (FlowDesk monthly); lib/operatorAcademyCatalog.ts:9 regularPriceCents 199700 = $1,997 Operator Academy regular. Neither is in lib/site/prices.ts. The orphaned middle tier in lib/tiers.ts:84 is $2,500, not $1,997.
- ORPHANED TIERS: lib/tiers.ts (Learn It $497, Build It With You $2,500, Done For You $5,000+, 'checked July 2026') and components/RentCalculator.tsx ('Prices checked July 2026') have zero importers; /pricing/[tier] permanently redirects to /pricing. Learn It '$497' collides with System Map $497.
- $497 AMBIGUITY: System Map (lib/offers.ts:77), Free Website + Content Engine tier (lib/freeBuild.ts:130), Tool Studio Quick Tool (lib/toolStudio.ts:43), ChatGPT Operator regular price 49700 (lib/chatgptOperatorCourse.ts:11), orphan Learn It (lib/tiers.ts:34) — a string-based guard on '$497' cannot attribute the hit.
- $997 AMBIGUITY: Free Website + 30-Day Growth Engine (lib/freeBuild.ts:146), Tool Funnel (lib/toolStudio.ts:59, now PRICES.toolStudioFunnel), Operator Academy founding 99700 (lib/operatorAcademyCatalog.ts:8), FlowWorker $997/mo (lib/operatoros/catalog.ts:52).
- $49 AMBIGUITY: Plugin $49/mo (lib/hq/types.ts), managed hosting $49/mo (lib/freeBuild.ts:98,244), SellerProof $49 packet (lib/sellerproof/packet.ts) — three products, one number.
- $97 AMBIGUITY: workshop seat (DB / PRICES.workshopSeat), Tool Studio Blueprint (PRICES.toolStudioBlueprint), Time Back downsell (lib/timeback.ts:70), Tool Care monthly (PRICES.toolCareMonthly).
- $297 AMBIGUITY (new guard 2026-09-21): Tool Studio Search + Archive Batch and Funnel Test monthly (PRICES.seoArchiveBatchMonthly / funnelTestMonthly), Time Back entry 3/day x 7 days (PRICES.timeBackFrom; lib/timeback.ts PRICE_GRID still holds the literal), ChatGPT Operator founding (PRICES.chatgptOperatorFounding; lib/chatgptOperatorCourse.ts foundingPriceCents still holds 29700). app/go/time-back/page.tsx and app/chatgpt/CourseActions.tsx now read the PRICES keys.
- PRO KITS RANGE: published '$10 to $29' (SiteFooter:19, app/tools/pro/page.tsx:18/80, app/plugin/page.tsx:154, PRICES.proKitMin/Max) vs PRO_BUNDLE 'Every Pro Kit' $39 (lib/tools/pro/index.ts:28), which is outside the range. Resolved 2026-09-21: PRICES.proBundle plus offer row pro_bundle; PRO_PRICES reads proKitMin/proKitMid/proKitMax.
- EMAIL CASE: HEAD lib/config.ts:12 CONTACT_EMAIL = 'Hello@TheLeadFlowPro.com' (mixed case, consumed only by the deleted components/Footer.tsx) vs lowercase 'hello@theleadflowpro.com' in 60+ places; working tree now derives CONTACT_EMAIL from BUSINESS.email.hello.
- WORKSHOP DATE/PRICE HARD-CODING: app/page.tsx:136/173/176/185/193/311 ('SEPTEMBER 17', '$97 per attendee', '10 paid seats'), components/site/NextStepGuide.tsx:44, lib/leadNotify.ts:327/336, lib/nurture.ts:707 (WORKSHOP_CUTOFF_MS literal)/748/765/776 vs DB authority (lib/events.ts:4, events.price_usd/starts_at) and lib/site/events.ts config; tests/site-events.test.ts expects the cutoff to come from featuredEventStartMs(). Event is today (2026-09-17) and becomes 'past' at 8:30 PM CDT per lib/site/events.ts.
- /events ROUTE: middleware.ts redirects '/events' to workshop.theleadflowpro.com (HEAD unconditional :57-59; working tree conditional via eventsRedirectTarget()) while internal links still point at /events (app/services/page.tsx:371, app/thank-you/page.tsx:173, lib/articles-september-launch.ts:23/43/63, app/api/events/claim/route.ts:14-15, lib/site/navigation.ts:18/62, lib/site/offers.ts:300, HEAD Footer.tsx:25, HEAD Nav.tsx:36/75) and app/events/page.tsx:20 declares canonical /events. SiteHeader/SiteFooter link the external URL directly instead.
- MISSING /agency ROUTES: lib/site/navigation.ts:16/34/65 and lib/site/offers.ts:316/329/342/355/368 link /agency, /agency/start, /agency/meta-ads, /agency/google-ads, /agency/automation, /agency/video, /agency/content; app/agency does not exist. tests/site-config.test.ts asserts NAV_LINKS contains /agency and that offersAwaitingRyan() has >=5 agency entries.
- UNTRACKED SCAFFOLD vs GATE: lib/site/prices.ts:7-9 says 'npm run validate:facts fails the build' but package.json has no validate:facts script (only validate:calculations/tools/visuals/social); lib/site/business.ts:44 references docs/decisions-needed.md which does not exist; docs/inventory.md does not exist yet. lib/site/* and tests/site-*.test.ts are untracked; components/SiteHeader.tsx and components/SiteFooter.tsx do not consume lib/site/navigation.ts yet, so tests/site-config.test.ts's header/footer assertions describe a registry no component renders.
- HEADER/FOOTER DUPLICATION: link sets are defined in components/SiteHeader.tsx:12-20, components/SiteFooter.tsx:10-54, lib/site/navigation.ts (proposed), and HEAD components/Footer.tsx + components/Nav.tsx (legacy, zero importers). Price labels '$10 to $29', '$49/mo', '$197', '$0' are hand-typed in SiteFooter.
- VENDOR PRICE DATES: 'Reference prices checked September 1, 2026' (components/site/CapabilityExplorer.tsx:718, live) vs 'Prices checked July 2026' (components/RentCalculator.tsx:9/13 and lib/tiers.ts:2, orphans).
- ADDRESS POLICY: app/page.tsx:45-48/71-74 publish '2800 Gilmer Rd Suite 106, Longview, TX 75604' in JSON-LD; lib/site/business.ts:40-52 marks policy 'structured_data_only' and flags the public-address decision as pending; lib/events.ts:166 releases the workshop street address only to paid seats; the same address is a placeholder in lib/tools/generators.ts:860/1098, qr-sign-kit.ts:123, local-seo-schema-kit.ts:94.
- VENUE = LEGAL NAME: workshop venue line 'Longview Training Center · Longview, TX' (app/events/WorkshopShowcase.tsx:105, lib/site/events.ts:74) reuses the legal entity name as a physical venue; DB events.venue is the stated authority (lib/events.ts:4).
- HOSTNAME VARIANTS: https://premierdentalacademyoflongview.com (lib/scoreboard.ts:68) vs https://www.premierdentalacademyoflongview.com (everywhere else); https://www.realryannichols.com (lib/scoreboard.ts:86) vs https://realryannichols.com (lib/site/external-links.ts:15 and most pages).
- STRIPE API VERSION: lib/stripe.ts:10 '2026-07-29.dahlia' vs app/api/sales/invoices/route.ts:7 '2026-06-24.dahlia'.
- COURSE PRICE DISPLAY: '$297' (app/chatgpt/CourseActions.tsx:127) and '$127' (app/operator-academy/content-engine/page.tsx:129/334, CheckoutForm.tsx:52, MobilePurchaseBar.tsx:24) are hand-typed while charges use Stripe Price IDs + cents constants in lib/chatgptOperatorCourse.ts / lib/contentEngineCourse.ts; none are in lib/site/prices.ts.
- CONTENT LEAK: content/academy/company-os-blueprint/08-build-the-phased-roadmap.md:63 hard-codes 'the System Map at /packages/system-map is $497', '/free-build', '/go/tools' inside course text (course content is otherwise fictional-example only).
- 'Operations Partner' interest label (lib/leadNotify.ts:24) has no corresponding offer in lib/offers.ts or lib/site/offers.ts.
- /operator-academy exists in app/ but is absent from lib/publicPageCatalog.ts (sitemap), while HEAD Nav.tsx labelled /academy as 'Operator Academy'.

Each conflict is either resolved in PR #54 (legal name, email case, workshop date and price, Company OS href, header and footer duplication, missing /agency routes, the validate:facts gate) or listed in `docs/decisions-needed.md` for Ryan (Training Platform naming, Lead Engine, legacy tiers, address policy, live-systems count, revenue exceptions, Pro bundle price, course display prices).
