# LeadFlow Pro Phase 3 Machine

This is the operating model for turning helpful public tools into consent-aware buyer signal products.

## Product Shape

LeadFlow Pro should solve a visible problem first:

1. A public user gets a quiz, score, map, checklist, calculator, or shortlist.
2. The system captures only permitted adult signal data.
3. The signal is scored with explainable fields.
4. Suppression, deletion, ADMT opt-out, and do-not-contact states are checked before routing.
5. A human or approved automation reviews source proof and release permissions.
6. The product becomes one of three routes: one seller, named sellers, or aggregated insight.

The product is not a hidden data brokerage system. It sells trusted intent, source proof, scoring context, and permitted routing.

## Site Map Additions

- `/machine`: Phase 3 operating-system page.
- `/buy-leads`: buyer lane for reviewed signal products.
- `/build-my-system`: operator lane for website, AI, forms, automation, dashboard, and routing builds.
- `/submit-source`: source-owner lane for lists, routes, directories, audiences, tools, and datasets.
- `/data-marketplace`: deeper buyer/source request desk.
- `/problem-intake`: adult problem and preference signal intake.
- `/privacy-center`: deletion, opt-out, do-not-contact, and privacy controls.
- `/dashboard`: private operator and review surface.

## Roles

- `public_user`: answers tools, receives useful output, may save or request follow-up.
- `source_submitter`: submits a source, route, dataset, audience, or problem pattern.
- `buyer_partner`: requests or buys a reviewed signal product.
- `named_seller`: receives a lead only when named consent or entitlement allows it.
- `review_operator`: reviews proof, suppression, score explanations, and release readiness.
- `platform_admin`: can manage all tenants, policies, exports, DSAR, and suppression workflows.

## Core Objects

- `identity`: anonymous or known subject with hashed contact fields and provenance.
- `profile`: normalized preference or lead profile.
- `consent_ledger`: append-first record of notice, scope, channel, named buyer, and revocation state.
- `questionnaire`: tool definition and versioned question set.
- `answer`: raw answer with provenance and retention category.
- `behavioral_event`: application event stream, separated from anonymous Vercel Web Analytics.
- `derived_feature`: explainable scoring input created from permitted fields.
- `score_run`: model run with version, excluded-sensitive-fields record, and opt-out handling.
- `score`: lead quality, urgency, channel preference, objection, and partner fit outputs.
- `partner_entitlement`: buyer access to a profile, product, or aggregate package.
- `suppression_request`: do-not-contact, delete, do-not-sell-share, and ADMT opt-out state.
- `routing_decision`: audited route result with reason codes and review state.
- `export`: review-gated release of buyer-visible fields.

## Revenue Lines

- Reviewed buyer signal packs.
- Exclusive lead route access.
- Named multi-seller lead routing.
- Aggregated demand insights.
- Weekly trend reports.
- Managed source packaging.
- Build-my-system implementation services.
- Dashboard, automation, and AI follow-up builds.

No revenue line depends on hidden resale, covert sensitive inference, minors, hacked data, leaked data, protected-trait targeting, or individual political persuasion targeting.

## Lead-Routing Modes

### One Seller

Use when the person selected one named seller or reasonably expected one provider to follow up.

Requirements:
- Active consent ledger scope.
- No suppression or deletion state.
- Buyer entitlement.
- Field-level access tier.
- Route decision audit row.

### Named Sellers

Use when the person selected multiple named sellers or accepted a named seller list.

Requirements:
- Named buyers recorded.
- Raw answers hidden unless scope permits.
- Duplicate handling and decay window.
- Refund and stale-lead rules.
- Route decision audit row.

### Aggregated Insight

Use when the product is group-level trend data and not a routed personal lead.

Requirements:
- No names, email, phone, profile ID, exact address, or raw free-text answer.
- Minimum aggregation threshold.
- Review-gated export.
- Suppression-aware source filtering.

## Risk Register

| Risk | Control |
| --- | --- |
| Hidden resale perception | Plain-language notice, named consent, no surprise buyer route |
| Sensitive data capture | Blocklist categories, UI warnings, review rejection |
| Minors | Age gate and deletion/suppression handling |
| Suppressed record routed | Suppression check before scoring, routing, export |
| ADMT opt-out ignored | Exclude opted-out identities from scoring jobs |
| Buyer over-access | Field-level access tiers and entitlement checks |
| Anonymous analytics contamination | No personal data in Vercel events |
| Source rights unclear | Source proof, terms review, release status |
| Opaque scoring | Explainability fields and human-review triggers |
| Export drift | Export ledger with purpose, reviewer, fields, and expiration |

## MVP, Phase 2, Phase 3

### MVP

- Public buyer/build/source lanes.
- Problem intake and data marketplace request desk.
- Safe scoring estimates.
- Manual review queue.
- Suppression-aware copy and privacy center.

### Phase 2

- Partner accounts and entitlements.
- Named seller consent.
- Stripe access requests.
- Export ledger.
- Operator dashboard for review, approve, suppress, and route.

### Phase 3

- Explainable score runs.
- Anonymous insights products.
- Vertical tool stack.
- Source proof vault.
- Automated but review-gated routing.
- DSAR, deletion, ADMT opt-out, and do-not-contact workflows.

## Implementation Notes

- Public UI components should be Figma-ready: stable component names, reusable cards, clear variants, and token-aligned styling.
- Backend writes that affect buyers, routing, pricing, outreach, exports, or paid work must stop in approval or review state.
- Supabase tables in exposed schemas require explicit grants plus RLS and policies. New public tables must not rely on automatic Data API exposure.
