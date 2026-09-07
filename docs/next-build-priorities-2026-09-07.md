# Five next public-page improvements

Read-only review completed September 7, 2026 at 06:46 UTC against `https://www.theleadflowpro.com`, deployed source `b4a5f707b03d5c971d7f584e59e7c66c3f8f32a7`.

The next useful release should make the existing offers easier to choose and the existing work easier to try. It does not need another large tool library. The current catalog contains 86 free tools and eight paid kits; all five priorities below can reuse those assets and the published guides.

## Evidence and limits

Nine public routes were opened in a fresh, signed-out Chromium session at a 390 × 844 mobile viewport: `/start`, `/diagnostic`, `/pricing`, `/packages/system-map`, `/packages/industry-os`, `/training`, `/articles`, `/go/time-back`, and `/add-ons`. All returned HTTP 200. All measured 390px document width, so this pass found no horizontal overflow at that width.

This was a presentation and source-flow audit. No forms were submitted, checkout sessions created, payments attempted, private dashboards opened, or application files changed. Findings about lost confidence or difficult choices are usability judgments, not measured conversion losses. Payment error-path findings come from current source, not an induced production failure.

Live text, links, control inventory, and top-viewport screenshots are in `/tmp/leadflow-opportunity-audit/`; the consolidated record is `pages.json`. Document heights below are observed page heights, not performance measurements. Sources include the corresponding page components, `PackageOrderForm.tsx`, `lib/offers.ts`, `lib/tools/pro/index.ts`, `lib/toolArticleGuides.ts`, and the published article registry.

## 1. `/packages/system-map`: make the $497 deliverable and payment state unmistakable

**Observed:** The page sells a $497 blueprint but its heading says “before you spend a real dollar.” The first graphic is an abstract map, not a readable sample of what the buyer receives. The purchase form offers four paths, including both “purchase in full” and “Start me with the $497 System Map” on the System Map itself. The shared form also shows Website Launch payment terms beneath this different product.

In `app/packages/[slug]/PackageOrderForm.tsx`, a successful lead capture followed by a checkout error produces “Your order is locked in” and promises a secure payment link within one business day. That branch does not dispatch a payment link. It can truthfully confirm the saved request, but cannot establish a completed purchase or delivery of a later link.

**Next build:** Lead with “Your business plan, before the bigger build” and a clearly labeled fictional sample containing current setup, first improvement, owner, dependencies, and proposed phases. Show the $497 price and existing build-credit rule next to that sample. Offer one primary action to buy the $497 map and one secondary action to ask a question. Keep any authorized partial-payment option only if its distinct purpose and remaining balance are made clear; do not silently change the commercial terms.

For a checkout failure, show that the request was saved and payment was not completed, with a safe retry path. Do not show a paid state, claim a reserved place, or promise a payment email unless the actual system confirms that outcome. Use the terms for the selected product.

**Reuse:** Keep the current lead intake, `system_map` Stripe checkout, and payment verification. Let visitors prepare with [Admin Time Audit](/tools/admin-time-audit) and its [one-task improvement guide](/articles/how-to-find-one-admin-task-worth-simplifying-this-week), or [Subscription Audit](/tools/subscription-audit) and its [renewal review guide](/articles/how-to-find-the-renewals-you-stopped-noticing). There is no fitting required Pro Kit upsell here; the paid map is already the next service.

**New tool needed:** No. The missing asset is a useful sample deliverable and clearer product-specific state handling.

**Acceptance:** A mobile reader can identify the price, deliverable, credit rule, and next step before the long inclusion list. Test lead failure, checkout failure, retry, cancellation, and verified payment separately. A saved lead must never read as a paid order.

## 2. `/diagnostic`: deliver a small first result before requesting the full business history

**Observed:** The initial mobile page is 5,698px tall before any answers. The first viewport contains the large context-focused heading and privacy notice; the form follows the ten-section navigation. Although only three sections are core, visitors immediately see “Section 1 of 10.” The first section asks about identity, approval authority, industry, selling model, location, and other details. Existing save/resume and sensitive-information guidance are valuable and should stay.

The adjacent `/start` router is a separate six-stage journey through goal, industry, presence, channels, stage, and modules before its result. Its result source includes “Every lead captured, answered in seconds, and followed up,” which exceeds what a planning quiz alone can establish.

**Next build:** Present one concrete first question, such as “What work keeps getting stuck?” After a small set of essential answers, show a preliminary summary: the stated problem, one record to check, and one useful tool to try. Make the full diagnostic an explicit “Add detail for a written scope” continuation. A preliminary summary must remain labeled as a draft based on the visitor's answers, not a promised outcome or custom architecture already reviewed by Ryan.

Keep the existing full diagnostic available for serious applicants, preserve resume behavior and consent, and carry only agreed non-sensitive selections between steps. Avoid a third competing intake route. Change the unsupported instant-response claim to a scoped capability with owner, channel, timing, and provider requirements.

**Reuse:** For missed calls, use [Missed Call Text-Back Script Writer](/tools/missed-call-textback-script), the [reply and handoff guide](/articles/how-to-write-a-missed-call-reply-that-tells-people-what-happens-next), and the optional [Missed Call Text-Back Kit, $19](/tools/pro/missed-call-text-back-kit). For repetitive office work, use Admin Time Audit and its guide. For a measurable sales target, use [Reverse Revenue Goal Planner](/tools/lead-goal-planner) and the [weekly activity planning guide](/articles/how-to-turn-a-yearly-revenue-goal-into-a-weekly-activity-plan). No generic paid upsell is needed for those latter two paths.

**New tool needed:** No new calculator. A small result-summary component can compose existing tools and the existing diagnostic data model.

**Acceptance:** Someone can see a useful preliminary next step without completing ten sections. The full application remains resumable and validation still protects required information. Optional phone and marketing consent remain distinct. No private customer details belong in URL parameters or analytics.

## 3. `/pricing`: separate the immediate website decision from larger custom builds

**Observed:** The mobile page is 12,164px tall. Its first image remains the old dark, glowing website machinery, which clashes with the brighter recent service and workshop work. The hero explains the free website program and the $1,000 Website Launch, then its first button says “Start Website Launch | $500.” The total and milestone explanation are present, but the button alone can be mistaken for the whole price. Six package levels and multiple explanatory sections follow. There are no direct free-tool or guide links in the main content.

**Next build:** Put the immediate choices in two plainly comparable cards: apply for the approved $0 five-page build program, or buy the $1,000 five-page Website Launch with $500 now and $500 after approval, before launch. Show eligibility/capacity and outside costs beside the free program; show scope and the payment schedule beside the paid option. Use a bright, readable example of the five-page deliverable and approval stages. Place larger builds in a separate “Need more than a website?” group with the existing starting prices and scope-first entry points.

Keep the full offer details accessible. The objective is faster comparison, not hiding exclusions or refund terms. Replace self-defeating price commentary with specific inclusions, exclusions, and review points.

**Reuse:** Use the existing `/free-build`, `/packages/launch`, `/packages/system-map`, `WEBSITE_LAUNCH_CHECKOUT`, and `OFFER_LADDER` sources. A secondary “Check what your current website needs” action can open [Website Scorecard](/tools/website-grader) with its limitations visible, followed by [the existing website cost guide](/articles/small-business-website-cost). Do not use the scorecard as a fabricated audit of a URL it has not inspected. Pro Kits are not necessary in this purchase comparison.

**New tool needed:** No. Two offer cards and a scope comparison are sufficient; another ROI calculator would add assumptions rather than answer the price question.

**Acceptance:** The $1,000 total and two $500 milestones remain visible together on mobile. Free application, paid launch, and custom scope have distinct destinations. Catalog prices remain the source of truth. Checkout and policy links retain the currently approved terms.

## 4. `/add-ons`: turn 41 capability choices into a usable build list

**Observed:** The page is 13,030px tall with 41 selectable capabilities across seven categories. The lead form follows the entire catalog. The hero still uses the dark blue connected-machine illustration. The page correctly says this is a scope request, not a purchase, but there is no concrete preview of most selected capabilities. Several descriptions are absolute: “Nothing falls through,” “Missed calls stop being missed revenue,” and migration “without losing a thing.” Those outcomes depend on configuration, data quality, approval, and operation.

**Next build:** Begin with three or four everyday jobs: answer inquiries, send quotes, take payment, and serve existing customers. Choosing a job should reveal a small recommended set, an illustrative output, and why each selected item supports that job. Keep “Browse all 41 capabilities” available. Add a compact selected-items summary and a persistent mobile “Review my build list” action that reaches the existing form. Let visitors remove every recommendation. Keep estimates as scope requests, not invented instant quotes.

Use the brighter services presentation and actual examples of a reply, quote, or customer record. Rewrite the absolute claims as capabilities to configure and verify. Preserve sourced proof labels, but audit any claim of a live implementation before strengthening it.

**Reuse:** Reuse the interaction pattern in `ServicesPreview`, the existing AddOnsMenu selection data, and its lead endpoint. Match each job with an existing try-it path: the missed-call script and $19 Text-Back Kit; [Estimate Terms & Deposit Language](/tools/estimate-terms-generator) and [Job Estimate Kit, $29](/tools/pro/job-estimate-kit); [LocalBusiness Schema Generator](/tools/localbusiness-schema-generator), its [business-facts guide](/articles/how-to-check-your-business-details-before-adding-structured-data), and [Local SEO Schema Kit, $19](/tools/pro/local-seo-schema-kit). Paid kits create deliverables; do not imply purchasing a script kit installs a live phone or email automation.

**New tool needed:** No. The missing function is a selected-scope preview, not another capability engine or quoting service.

**Acceptance:** A visitor can select, review, remove, and submit three relevant items without traversing the whole catalog. Keyboard focus and mobile touch targets remain clear. The saved lead includes the exact selected items. Submission authorizes a scope discussion only.

## 5. `/training`: give new learners and existing members distinct next steps

**Observed:** The live page shows ten courses and is 8,501px tall. All ten cards and the hero reuse the same dark training blueprint graphic, despite the ten newer individual course illustrations already existing. The first screen mixes learning with buying a training platform. The library correctly preserves existing access and says new standalone enrollment for the legacy library is closed, but its prominent secondary action leads to platform-building intake. On the signed-out view, the first two cards are existing-member courses; the two free-registration courses come later.

**Next build:** Make the entry choices explicit: “Try a free lesson,” “Continue my courses,” and a quieter “Build training for my business.” Show the two available free courses first for new visitors, while signed-in members retain their actual progress and library order. Replace the repeated card art with each course's existing `/images/academy/cards/{slug}.svg`. Show one example of a lesson's output, such as a defined offer or a lead handoff, instead of explaining the platform infrastructure in the hero.

Keep the legacy-access notice and current entitlement rules. Any current enrollment action must resolve to the actual supported Academy offer; do not reopen closed enrollment or invent a new course price.

**Reuse:** Use the existing `/academy#free-access`, `/training/offer-engine`, `/training/lead-capture-system`, login, and course entitlement code. Link a relevant lesson to [FAQ Schema Generator](/tools/faq-schema-generator) and the [customer-question guide](/articles/how-to-turn-real-customer-questions-into-useful-website-answers), or to the existing missed-call reply workflow. A Pro Kit is optional only when its finished document is the learner's next need. No kit should be required to complete a course they already own.

**New tool needed:** No. Courses, illustrations, progress records, tools, and practical guides already exist.

**Acceptance:** Signed-out users can identify the free learning route immediately. Existing purchasers still open their purchased lessons and saved progress. Free registration, paid access, and custom platform inquiry remain separate. Ten course cards use ten appropriate illustrations without changing course content or access.

## Adjacent items to keep in the backlog

- `/articles` now presents 94 published guides in a 49,091px mobile page with no search or topic controls. A bounded follow-up is a searchable index grouped by the task people need to finish, reusing the article/tool mapping and existing share/download actions. The “Latest breakdowns” section is a fixed featured set rather than the newest dated articles; rename it or make its ordering match its label. Keep all canonical article links crawlable.
- `/packages/industry-os` includes “an operating system pays for itself.” Remove that unsupported universal return claim in the shared package-copy pass; show scoped capabilities and actual cited proof instead.
- `/go/time-back` intentionally has `noindex`; that is not an indexing defect. Its “Your next 7 days, already done,” 21-post display and “Scheduled” animation should be visibly identified as a sample until a real account and schedule exist. Reuse the actual content course and deliverables rather than inventing another content generator.

## Suggested implementation order and boundaries

First correct the System Map purchase-state language and product-specific choices. Then simplify diagnostic entry and the price comparison. Follow with the add-on selector and training library presentation. These are separate, reviewable changes; no global color rewrite, new paid infrastructure, new prices, new proof statistics, or fabricated customer outcomes are needed.

The only proposed new UI functions are a draft next-step summary and a selected-scope preview. Both should compose existing records and tools. Any later request for a live automation, custom quoting engine, or shared client workspace requires its own scope and provider verification; a visual demo or downloadable kit does not establish that those systems are connected.

## Bounded fix completed after the audit

The lead-to-checkout defect in priority 1 was separately authorized and fixed locally after this read-only review. `PackageOrderForm.tsx` now leaves the saved inquiry and editable form visible when checkout fails, states that payment has not been completed here, and provides a secure-checkout retry. The retry skips lead creation only when the complete submitted payload is unchanged; changed details are saved before checkout. A concurrent-submission guard prevents duplicate requests while one is pending, and optional analytics failures cannot interrupt the handoff. Saved contact details stay only in component memory. Question-only submissions confirm a saved request rather than an order.

Only the redundant `map_first` option on the System Map itself was removed. Both that option and full payment purchased `system_map` for $497. The Company OS map-first path, Website Launch's $500 milestone, and all other prices and terms were preserved.

Validation: 11 isolated actual-component browser tests passed at 390 × 844, covering HTTP/network/malformed-response checkout failure, repeated retry, changed contact details, failed lead capture, simultaneous submits, unavailable analytics, questions, and package-option preservation. All APIs and the checkout destination were mocked; no production leads or payments were created. The durable tests are `tests/e2e/package-order.spec.ts`. Another 26 existing payment and launch tests passed, plus focused ESLint, Prettier, and diff checks. This local component verification does not replace the integrated build or deployed payment verification, which remain with the release owner.
