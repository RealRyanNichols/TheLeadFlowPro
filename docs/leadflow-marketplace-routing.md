# Lead Flow Pro Marketplace Routing Logic

## Product Rule

Lead Flow Pro routes data according to the consumer-facing expectation, consent scope, and partner eligibility. It does not route identified people by highest bidder alone.

Commercial value can be used only after the system has already passed these gates:

1. The consumer-facing flow allowed the route type.
2. Consent is active for the exact buyer, scope, and channel.
3. Suppression, deletion, do-not-contact, do-not-sell/share, and ADMT checks pass.
4. The buyer is eligible, available, and inside SLA/capacity limits.
5. Duplicate and decay rules do not block delivery.

For identified leads, bid or price can only be a tie-breaker in the multi-seller mode after fairness and transparency gates pass. For exclusive leads and aggregate-only products, highest-bid routing is blocked.

Consumer-facing consent, suppression, ADMT, email, mortgage/refi, and age-gating copy lives in `docs/leadflow-compliance-copy.md` and `src/lib/leadflow-compliance-copy.ts`. Routing UI should render from that registry so the copy shown to a consumer matches the consent scope stored in the ledger.

## Modes

### 1. Exclusive Lead

Use when the consumer-facing experience clearly says one named seller/provider will receive the lead.

Required state:

- `consent_ledger.scope = 'single_seller_routing'`
- `consent_ledger.buyer_partner_account_id` is the named buyer
- `consent_ledger.exclusivity_level = 'exclusive_single_seller'`
- `partner_entitlements.exclusivity_level = 'exclusive_single_seller'`
- No active suppression, deletion, or conflicting privacy request
- If scores are used, the profile must appear in `leadflow.scoreable_profiles`

Business fairness:

- The buyer must be named or category-obvious in the flow.
- The buyer cannot receive the lead only because it paid the most.
- Capacity, lead-fit, SLA history, and conflict checks must be visible in the audit trail.
- The platform must not sell the same exclusive lead to another buyer inside the decay window.

Consumer transparency:

- Show the named buyer or the exact buyer category before submission.
- State that one seller/provider will receive the lead.
- State the contact channels being shared.
- State the route expiration or refresh window.

Default SLA:

- Acknowledge: 15 minutes.
- First action: 4 business hours.
- Entitlement/export expiration: 72 business hours unless vertical policy says otherwise.
- Missed SLA: refund/credit buyer if the platform sold a stale or invalid lead; reroute only if the consumer-facing flow disclosed backup routing.

Default decay:

- Same buyer: 60 days.
- Cross-buyer exclusive conflict: 60 days.

Refund/credit triggers:

- Duplicate delivered to same buyer inside decay window.
- Same profile sold as exclusive to another buyer inside the exclusive window.
- Required consent was missing, expired, revoked, or mismatched at export time.
- Active suppression existed before export.
- The delivered profile materially failed the purchased filter due to platform error.

No refund:

- Consumer does not buy after a valid delivery.
- Buyer misses its own follow-up SLA.
- Buyer asks to use the lead outside the consented scope.

### 2. Consumer-Selected Multi-Seller Lead

Use when the consumer selects or clearly accepts multiple named sellers.

Required state:

- `consent_ledger.scope = 'named_partner_routing'`
- One active consent row per selected `buyer_partner_account_id`
- `partner_entitlements.exclusivity_level = 'named_multi_partner'`
- `exports.export_type = 'named_partner_leads'`
- No active suppression, deletion, or conflicting privacy request
- If scores are used, the profile must appear in `leadflow.scoreable_profiles`

Business fairness:

- Only named, selected, or clearly accepted sellers can receive the lead.
- Sellers are filtered by eligibility, consented channel, capacity, SLA status, and duplicate window.
- Sort order is based on consumer selection, partner fit, urgency, SLA capacity, and fair rotation.
- Commercial tie-breaker is allowed only after all non-commercial gates pass.
- Per-partner caps prevent one buyer from taking every high-quality lead.

Consumer transparency:

- Show selected sellers before submission.
- Show whether the request goes to all selected sellers or the best eligible subset.
- Show contact channels and the purpose of sharing.
- Make do-not-contact and delete-my-data paths available after submission.

Default SLA:

- Acknowledge: 30 minutes.
- First action: 8 business hours.
- Entitlement/export expiration: 120 business hours.
- Missed SLA: skip/reroute to a named backup only if backup routing was disclosed and consented.

Default decay:

- Same buyer: 30 days.
- Cross-buyer: none, because the consumer chose multiple sellers. The system still logs every named buyer.

Refund/credit triggers:

- Buyer was not named or selected.
- Same buyer received the same lead inside decay.
- Required consent was missing, expired, revoked, or mismatched.
- Active suppression existed before export.
- Platform included a seller outside the purchased filters.

### 3. Aggregated Insight Only

Use when the product is trend/demand intelligence and no person, profile, contact, raw answer, or raw event is routed.

Required state:

- `consent_ledger.scope = 'aggregated_insights'` or anonymous analytics with no identified output
- `exclusivity_level = 'aggregated_only'`
- `exports.export_type = 'aggregated_insights'`
- `exports.entitlement_ids = '{}'`
- Output meets the configured privacy threshold

Business fairness:

- Buyers purchase a market signal, not a person.
- Everyone buying the same aggregate product gets the same non-personal report rules.
- Pricing can vary by freshness, vertical, volume, and reporting depth, but not by access to hidden identities.

Consumer transparency:

- State that answers may be used in anonymous or aggregated trend products.
- Do not imply a seller will contact the consumer from aggregate-only consent.
- Do not expose profile ids, contact data, exact answer text, or raw event paths.

Default SLA:

- No contact SLA.
- Report freshness SLA depends on the purchased product window.
- If the report is stale or below privacy threshold after filtering, refund or credit.

Default threshold:

- Existing schema view uses a minimum `profile_count >= 5`.
- Production marketplace products should set a higher product threshold when the category, market, or time bucket is narrow. Use 25+ for normal paid reports and 100+ for sensitive or narrow buckets.

## Shared Pseudocode

```ts
function routeLead(input) {
  const profile = loadProfile(input.profileId)
  assertActive(profile)

  const identity = loadIdentity(profile.identityId)
  assertActive(identity)

  const requestedMode = resolveRoutingMode(input)
  const policy = getLeadFlowRoutingPolicy(requestedMode)

  if (isHighestBidOnlyRoutingAllowed(requestedMode)) {
    throw new Error("LeadFlow policy should never allow highest-bid-only routing")
  }

  const privacyState = loadPrivacyState(identity, profile)
  if (privacyState.deleted || privacyState.suppressed) {
    audit("route.blocked", { reason: "privacy_state_blocked" })
    return block()
  }

  if (privacyState.doNotSellShare && requestedMode !== "aggregated_insight_only") {
    audit("route.blocked", { reason: "do_not_sell_share" })
    return block()
  }

  if (privacyState.doNotContact && requestedMode !== "aggregated_insight_only") {
    audit("route.blocked", { reason: "do_not_contact" })
    return block()
  }

  if (input.useScores) {
    assertProfileAppearsInScoreableProfiles(profile.id)
  }

  if (requestedMode === "exclusive_lead") {
    return routeExclusiveLead(input, policy)
  }

  if (requestedMode === "consumer_selected_multi_seller") {
    return routeConsumerSelectedMultiSeller(input, policy)
  }

  return exportAggregatedInsight(input, policy)
}

function routeExclusiveLead(input, policy) {
  const consent = findActiveConsent({
    scope: "single_seller_routing",
    profileId: input.profileId,
    buyerPartnerAccountId: input.namedBuyerId,
  })

  if (!consent) return block("missing_single_seller_consent")

  const duplicate = findDuplicateRoute({
    profileId: input.profileId,
    vertical: input.vertical,
    decayDays: policy.duplicatePolicy.sameBuyerDecayDays,
  })

  if (duplicate) return refundOrBlock("duplicate_inside_exclusive_decay")

  const buyer = evaluateBuyer(input.namedBuyerId, input)
  if (!buyer.eligible || !buyer.hasCapacity) return hold("buyer_not_eligible_or_available")

  const entitlement = createPartnerEntitlement({
    buyerPartnerAccountId: buyer.id,
    exclusivityLevel: "exclusive_single_seller",
    consentLedgerId: consent.id,
    allowedScopes: ["single_seller_routing", "sale_or_share"],
    expiresAt: businessHoursFromNow(policy.sla.expiryBusinessHours),
  })

  const exportRecord = createExport({
    exportType: "exclusive_leads",
    entitlementIds: [entitlement.id],
  })

  audit("route.exclusive.entitlement_created", auditPayload(input, policy, entitlement, exportRecord))
  return deliver(exportRecord)
}

function routeConsumerSelectedMultiSeller(input, policy) {
  const selectedBuyers = input.consumerSelectedBuyerIds
  if (!selectedBuyers.length) return block("no_named_sellers")

  const eligible = selectedBuyers
    .map((buyerId) => evaluateBuyer(buyerId, input))
    .filter((buyer) => buyer.hasActiveNamedConsent)
    .filter((buyer) => buyer.eligible)
    .filter((buyer) => buyer.hasCapacity)
    .filter((buyer) => !insideDuplicateWindow(buyer, input.profileId, policy))

  const sorted = sortBy([
    "consumer_selected_partner",
    "partner_fit_score",
    "sla_capacity",
    "fair_rotation",
    "freshness_decay",
    "commercial_tie_breaker",
  ], eligible)

  if (!sorted.length) return hold("no_eligible_selected_seller")

  const entitlements = sorted.map((buyer) => createPartnerEntitlement({
    buyerPartnerAccountId: buyer.id,
    exclusivityLevel: "named_multi_partner",
    consentLedgerId: buyer.consentLedgerId,
    allowedScopes: ["named_partner_routing", "sale_or_share"],
    expiresAt: businessHoursFromNow(policy.sla.expiryBusinessHours),
  }))

  const exportRecord = createExport({
    exportType: "named_partner_leads",
    entitlementIds: entitlements.map((row) => row.id),
  })

  audit("route.multi_seller.export_created", auditPayload(input, policy, entitlements, exportRecord))
  return deliver(exportRecord)
}

function exportAggregatedInsight(input, policy) {
  const report = buildAggregateReport(input.filters)
  if (report.profileCount < input.productThreshold) return block("aggregate_threshold_not_met")
  if (containsPersonalFields(report)) return block("aggregate_contains_personal_fields")

  const exportRecord = createExport({
    exportType: "aggregated_insights",
    entitlementIds: [],
    rowCount: report.rowCount,
    filterSummary: report.filterSummary,
  })

  audit("route.aggregate.export_created", auditPayload(input, policy, null, exportRecord))
  return deliver(exportRecord)
}
```

## Database Conditions

### Exclusive Lead Eligibility

```sql
select
  pe.id as entitlement_id,
  pe.buyer_partner_account_id,
  pe.profile_id,
  pe.identity_id,
  pe.expires_at
from leadflow.partner_entitlements pe
join leadflow.consent_ledger cl
  on cl.id = pe.consent_ledger_id
join leadflow.profiles p
  on p.id = pe.profile_id
join leadflow.identities i
  on i.id = pe.identity_id
where pe.exclusivity_level = 'exclusive_single_seller'
  and pe.lifecycle_stage in ('qualified', 'routed', 'sold')
  and pe.revoked_at is null
  and pe.deleted_at is null
  and (pe.expires_at is null or pe.expires_at > now())
  and cl.scope = 'single_seller_routing'
  and cl.granted = true
  and cl.revoked_at is null
  and cl.deleted_at is null
  and (cl.expires_at is null or cl.expires_at > now())
  and cl.buyer_partner_account_id = pe.buyer_partner_account_id
  and p.deleted_at is null
  and p.hard_deleted_at is null
  and i.deleted_at is null
  and i.hard_deleted_at is null;
```

### Consumer-Selected Multi-Seller Eligibility

```sql
select
  cl.buyer_partner_account_id,
  cl.id as consent_ledger_id,
  p.id as profile_id,
  i.id as identity_id
from leadflow.consent_ledger cl
join leadflow.profiles p
  on p.id = cl.profile_id
join leadflow.identities i
  on i.id = cl.identity_id
where cl.scope = 'named_partner_routing'
  and cl.exclusivity_level = 'named_multi_partner'
  and cl.buyer_partner_account_id = any(:consumer_selected_buyer_ids)
  and cl.granted = true
  and cl.revoked_at is null
  and cl.deleted_at is null
  and (cl.expires_at is null or cl.expires_at > now())
  and p.id = :profile_id
  and p.deleted_at is null
  and p.hard_deleted_at is null
  and i.deleted_at is null
  and i.hard_deleted_at is null;
```

### Suppression Block

```sql
select exists (
  select 1
  from leadflow.suppression_requests sr
  where sr.deleted_at is null
    and sr.effective_at <= now()
    and (sr.expires_at is null or sr.expires_at > now())
    and sr.scope in ('do_not_contact', 'do_not_sell_share')
    and (
      sr.global_to_platform = true
      or sr.partner_account_id = :partner_account_id
      or sr.identity_id = :identity_id
      or sr.email_sha256 = :email_sha256
      or sr.phone_sha256 = :phone_sha256
    )
) as route_blocked;
```

### ADMT Scoring Gate

```sql
select exists (
  select 1
  from leadflow.scoreable_profiles sp
  where sp.profile_id = :profile_id
) as scoring_allowed;
```

If this returns false, routing can still proceed only if no predictive score affects ranking, prioritization, eligibility, price, or outreach cadence.

### Duplicate Window

The current schema can store duplicate facts in `exports.filter_summary` and `audit_log.after_redacted` until a dedicated `lead_routes` table is added.

Recommended condition:

```sql
select exists (
  select 1
  from leadflow.exports e
  where e.buyer_partner_account_id = :buyer_partner_account_id
    and e.export_type in ('exclusive_leads', 'named_partner_leads')
    and e.deleted_at is null
    and e.created_at >= now() - (:decay_days || ' days')::interval
    and e.filter_summary->>'duplicate_fingerprint_hash' = :duplicate_fingerprint_hash
) as duplicate_inside_decay;
```

### Aggregated Insight Eligibility

```sql
select *
from leadflow.aggregated_insights
where partner_account_id = :source_partner_account_id
  and vertical = :vertical
  and profile_count >= greatest(5, :product_threshold)
  and bucket_start >= :window_start
  and bucket_end <= :window_end;
```

The view must not expose identity ids, profile ids, raw answer ids, contact fields, raw answer text, raw event payloads, or precise location.

## Routing Sort Rules

Exclusive lead sort:

1. Consumer expectation match.
2. Named buyer eligibility.
3. Partner fit score if ADMT scoring is allowed.
4. SLA capacity.
5. Freshness/decay.
6. Manual review for conflicts.

Multi-seller sort:

1. Consumer selected seller set.
2. Consent scope per named seller.
3. Partner eligibility and category match.
4. Partner fit score if ADMT scoring is allowed.
5. SLA capacity and seller cap.
6. Fair rotation inside comparable tiers.
7. Commercial tie-breaker only after the above gates pass.

Aggregate sort:

1. Report window freshness.
2. Category/vertical match.
3. Product threshold.
4. No personal fields.

## Conflict Rules

Block:

- Highest-bid-only routing for identified leads.
- Buyer not named in a multi-seller consent flow.
- Seller conflicts with do-not-contact or do-not-sell/share.
- Aggregate report contains personal or raw record fields.
- Aggregate threshold is not met.

Hold for review:

- Multiple active exclusive buyers.
- Source partner is also the buyer.
- Exclusive route depends on a predictive score change of more than 25 points.
- Eligibility data is stale or missing.
- Consumer text suggests legal, medical, financial-account, or protected-category material.

Downgrade to aggregate:

- Buyer wants demand trend data but consent does not allow named routing.
- Identified route is blocked but an anonymous aggregate product meets threshold.

Allow with audit:

- A selected seller is skipped because capacity is full.
- A commercial tie-breaker changes order after all fairness gates pass.
- A lead is re-exported after a material consumer update and outside the decay window.

## Audit Fields

Store these in `leadflow.audit_log.after_redacted`, `leadflow.exports.filter_summary`, and later in a dedicated `lead_routes` table:

- `route_id`
- `routing_mode`
- `routing_policy_version`
- `partner_account_id`
- `buyer_partner_account_ids`
- `profile_id`
- `identity_id`
- `consent_ledger_ids`
- `entitlement_ids`
- `export_id`
- `score_ids`
- `eligibility_rule_version`
- `sort_factors_used`
- `commercial_tie_breaker_used`
- `suppression_checked_at`
- `duplicate_fingerprint_hash`
- `duplicate_window_days`
- `decay_expires_at`
- `sla_ack_due_at`
- `sla_first_action_due_at`
- `decision`
- `decision_reasons`
- `review_required`
- `refund_window_expires_at`
- `request_id`

Do not store raw answers, emails, phone numbers, names, exact addresses, IP addresses, user agents, or raw payloads in audit fields. Use ids, hashes, reason codes, and redacted summaries.

## Phase 2 Table Recommendation

The current schema can represent routing through `partner_entitlements`, `exports`, and `audit_log`. Before high-volume production routing, add a dedicated table:

```sql
create table leadflow.lead_routes (
  id uuid primary key default gen_random_uuid(),
  partner_account_id uuid not null references leadflow.partner_accounts(id) on delete restrict,
  buyer_partner_account_id uuid references leadflow.partner_accounts(id) on delete restrict,
  profile_id uuid references leadflow.profiles(id) on delete restrict,
  identity_id uuid references leadflow.identities(id) on delete restrict,
  consent_ledger_ids uuid[] not null default '{}',
  entitlement_ids uuid[] not null default '{}',
  export_id uuid references leadflow.exports(id) on delete set null,
  routing_mode text not null check (routing_mode in ('exclusive_lead', 'consumer_selected_multi_seller', 'aggregated_insight_only')),
  routing_policy_version text not null,
  decision text not null check (decision in ('delivered', 'blocked', 'held_for_review', 'refunded', 'credited', 'expired')),
  decision_reasons text[] not null default '{}',
  duplicate_fingerprint_hash text,
  duplicate_window_days integer,
  sort_factors_used text[] not null default '{}',
  commercial_tie_breaker_used boolean not null default false,
  sla_ack_due_at timestamptz,
  sla_ack_at timestamptz,
  sla_first_action_due_at timestamptz,
  sla_first_action_at timestamptz,
  decay_expires_at timestamptz,
  refund_window_expires_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

If this table is created in an exposed schema, enable RLS and use deny-by-default policies. Supabase's RLS docs treat RLS as the granular authorization layer for browser/API access, and the current Lead Flow schema already follows the safer security-invoker view pattern for buyer-facing views.
