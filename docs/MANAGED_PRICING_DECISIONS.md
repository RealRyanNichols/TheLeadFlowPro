# Managed pricing decisions — October 3, 2026

## Controlling commercial facts

Known: the owner's latest direct instruction sets the current new-buyer expectations:

- $7,500 is the starting upfront commitment.
- Ongoing managed work has a $5,000 monthly minimum, a $7,500 Growth plan, and a $15,000 Structured plan. Higher-capacity work is scoped separately.
- Advertising spend is included within the written plan allocation. The proposal defines the allocation, responsibilities, work, capacity, and billing dates.
- Earlier signed agreements retain their agreed prices, payment schedule, scope, and advertising treatment. Public plan prices do not amend them.

The initial-month presentation is an implementation recommendation, not an owner-confirmed billing rule: bundle onboarding, the agreed build, and the agreed advertising allocation into the initial month, with no second setup payment. Focused starts at $7,500 initially and $5,000 ongoing; Growth starts at $7,500 and Structured at $15,000. The written proposal must ratify that treatment, allocation, scope, and billing dates before payment or work.

The amounts and recommended presentation are encoded in `lib/site/managedPlans.ts`. Historical quotes or negotiated exceptions do not override the owner's current public amounts. No private client identity, conversation detail, or private source URL is required in the repository.

## Buyer-path review

Observation: the old agency hub and service pages advertised separate small services, a $1,000 website, direct deposit links, and a separate ad-budget question. The general payment page supplied $750–$4,000 presets. Those paths contradicted the current managed-plan expectations and blurred new-buyer qualification with existing-client payments.

Decision: `/agency` compares the current monthly plans, then sends buyers to the scope intake. Each `/agency/[service]` page describes work within that plan and links to intake or the shared price comparison. Its public structured data no longer advertises a legacy website checkout. The intake asks about the total monthly plan, with advertising included, and records version 2 with `managed_plan_budget` and the first-month treatment. Valid plan links preselect their monthly tier. Core intake lists the six marketing services plus a custom-scope choice; specialty routes remain available without mixing their names into the general plan form. Requested-service and well-formed originating-lead attribution are carried in the private intake record. Historical saved lead answers remain unchanged.

Decision: `/agency/pay` is labeled for existing clients with an approved written scope. It has an empty exact-amount field and no small payment presets or website upsell. The existing charge resolver, checkout routes, signed-scope amount limits, monthly billing, receipts, and cancellation behavior remain functional. This release creates no new automatic managed-plan charge or enrollment promise.

Decision: the former `/deposit` new-buyer landing page redirects to `/pricing` while preserving repeated campaign query parameters. Custom signed-scope payment and paid-customer completion routes remain separate. `/deposit/custom` directs unscoped buyers to the current plans. The public system example keeps its proof and credits, while its commercial section, FAQ, CTA, and structured data use the current managed model. `/terms` describes the proposed first-month presentation subject to the written agreement, includes the owner's advertising treatment, and preserves earlier agreements.

## Value hypothesis and validation

Inferred: one consistent commercial model and one scope-first next action should reduce confusion and attract buyers prepared for the engagement. This is a conversion hypothesis, not measured revenue, ROI, or a guaranteed improvement.

Missing: a validated baseline and attribution for plan views, intake starts, completed inquiries, attended consultations, approved scopes, and paid engagements. Evaluate those outcomes together after release; do not interpret clicks or an intake request as a signed client or paid revenue. Any industry cost-per-conversion scenarios must identify the outcome being counted and remain separate from achieved client results.

Scope and ownership protections remain: written approval before work, accounts and data owned by the client, consent-based contact, no cross-client lead reuse, no guaranteed business outcomes, and a separate quote for work beyond the agreed capacity.

## Sales workflow used

The Sales index selected the focused business-case/pricing rationale workflow. Its shared instructions, dependencies, and value/evidence reference were read. The authoritative source for the amounts and included advertising is the owner's supplied instruction; the initial-month bundle is our implementation recommendation requiring a written proposal. There is no need for optional CRM enrichment to restate the supplied amounts. The rationale is structural because measured conversion impact is not available.
