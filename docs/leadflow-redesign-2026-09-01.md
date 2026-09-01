# LeadFlow Pro production redesign — September 1, 2026

## Release state

- Implemented locally on the production repository's `main` checkout.
- Production deployment is awaiting the repository-required approval.
- No pricing, guarantee, payment, legal, tracking, CRM, authentication, or data-connection behavior was changed.

## `/free-build` conflict requiring an owner decision

`/free-build` remains an active campaign and checkout route. It is referenced by the Meta lead workflow and Stripe/free-build order handling, so it was not removed, redirected, or repriced during this redesign.

Its “free website when you buy the engine” positioning conflicts with the current public Website Launch offer of $1,000 with a $500 deposit. The primary navigation now presents the current Website Launch path and does not feature `/free-build`, while the existing campaign route remains functional for continuity.

Before changing `/free-build`, approve one of these business decisions:

1. Keep it as a campaign-specific offer and document its audience, eligibility, and traffic sources.
2. Align its pricing and terms with Website Launch.
3. Retire it only after active ads, checkout links, automation, and follow-up references are audited and updated.

## Data integrity

Mission Control and Execution Update render connected production data only. Missing or unavailable data is shown as unavailable, never replaced with sample metrics or assumed zeroes.

## Existing dependency risk

`npm audit --omit=dev` reports three high-severity findings in the existing Next.js dependency chain (`postcss` and `sharp`). The offered automated fix upgrades to Next.js 16, which is a major framework change. That upgrade was not mixed into this redesign and should be handled as a separate tested dependency update.
