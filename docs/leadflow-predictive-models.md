# Lead Flow Pro Predictive Model Design

## Product Rule

Vercel Web Analytics remains an anonymous telemetry layer only. Vercel’s own docs state that URLs, query parameters, and custom events can contain sensitive or personal data and should be modified or dropped with `beforeSend` when needed. Lead Flow Pro treats that as a hard product rule:

- Vercel events can help measure anonymous funnel movement.
- Vercel events cannot feed identified lead scoring directly.
- Vercel events cannot contain names, emails, phone numbers, raw answers, ids, tokens, precise location, or partner identifiers.
- Identified model features must come from Supabase application records with consent, provenance, tenant boundaries, and ADMT/suppression checks.

Implementation references:

- `src/lib/analytics-taxonomy.ts`
- `src/components/site/LeadFlowVercelAnalytics.tsx`
- `src/app/api/analytics/vercel-drain/route.ts`
- `src/lib/predictive-models.ts`
- `src/lib/leadflow-routing.ts`
- `docs/leadflow-marketplace-routing.md`
- `leadflow.scoreable_profiles`
- `leadflow.score_runs`
- `leadflow.scores`
- `leadflow.derived_features`

## Allowed Inputs

Only these feature sources are allowed:

- Disclosed questionnaire responses.
- Onsite behavioral events stored as first-party application events.
- Historical conversion outcomes.
- Partner-specific eligibility rules.

The model registry encodes these source categories in `src/lib/predictive-models.ts`.

## Forbidden Inputs

Do not use:

- Race.
- Ethnicity.
- Religion.
- Health.
- Sexual orientation.
- Political opinions.
- Precise geolocation.
- Exact address.
- Biometrics.
- Government id.
- Financial account access data.
- Any proxy intended to infer one of the above.

Do not use Vercel `sessionId`, `deviceId`, IP-derived location, device cost, neighborhood, language, timing, source, or platform behavior as a hidden proxy for protected attributes.

## Model 1: Lead Quality Score

Purpose: estimate whether a consented profile is likely to become a valid, reachable, relevant opportunity.

Output: 0-100 score and score band.

Feature list:

- `response_completeness_ratio`: share of required non-sensitive quiz fields completed.
- `problem_specificity_bucket`: broad, category-specific, or requirements-specific.
- `timeline_bucket`: now, 0-30 days, 31-90 days, 90+ days.
- `budget_fit_bucket`: self-disclosed budget fit against selected category/offer.
- `proof_depth_count`: count of non-sensitive support/proof fields supplied.
- `high_intent_event_count_7d`: consent-safe onsite high-intent events.
- `historical_conversion_rate_bucket`: prior conversion performance by quiz, vertical, and source-family bucket.

Model logic options:

- MVP: transparent weighted rules.
- Phase 2: regularized logistic regression.
- Phase 3: interpretable gradient-boosted trees with monotonic constraints where useful.

Explainability fields:

- Top positive factors.
- Top negative factors.
- Score band.
- Feature freshness.
- Consent scope used.
- Eligibility filters applied.
- Human-review reason codes.

Human-review triggers:

- High score with low proof depth.
- Score changes by more than 25 points between model versions.
- Eligibility rule conflicts with model score.
- Lead is routed for exclusive sale.

## Model 2: Urgency Score

Purpose: estimate how soon a person or business is likely to act.

Output: 0-100 score and urgency band.

Feature list:

- `timeline_bucket`: self-disclosed action timeline.
- `pain_intensity_bucket`: self-disclosed problem severity.
- `repeat_visit_count_7d`: first-party return visits.
- `cta_depth_bucket`: farthest consent-safe step reached.
- `recent_conversion_window_bucket`: how quickly similar consented profiles historically converted.

Model logic options:

- MVP: rules anchored to disclosed timeline.
- Phase 2: regularized logistic regression.

Explainability fields:

- Disclosed timing factor.
- Behavioral recency factor.
- Completion-depth factor.
- Historical timing calibration.
- Conflict warning when behavior and disclosed timeline disagree.

Human-review triggers:

- Very high urgency with missing or limited consent.
- Urgency conflicts with disclosed timeline.
- Urgency would change outreach cadence.

## Model 3: Channel Preference Score

Purpose: rank permitted contact channels by explicit preference, consent scope, and historical response performance.

Output: ranked channels, blocked channels, and reason codes.

Feature list:

- `declared_preferred_channel`: email, SMS, phone, marketplace inbox, or no preference.
- `channel_consent_scope`: granted contact scopes.
- `channel_click_event_count`: clicks on channel-specific CTAs.
- `historical_channel_response_rate`: response by channel, vertical, and consent mode.
- `partner_allowed_channels`: partner configuration and compliance settings.

Model logic options:

- MVP: consent-first rules.
- Phase 2: regularized logistic model by channel.

Explainability fields:

- Ranked channels.
- Blocked channels.
- Blocking consent scopes.
- Declared preference.
- Historical channel response factor.

Human-review triggers:

- Preferred channel is not consented.
- Model ranks a channel partner cannot use.
- Consumer submitted do-not-contact or channel-specific revocation.

## Model 4: Likely Objection Classifier

Purpose: identify the most likely blocker so the partner can answer the real concern first.

Output: class probabilities.

Allowed classes:

- `price`
- `trust`
- `timing`
- `authority`
- `complexity`
- `privacy`
- `financing`
- `unclear_value`
- `not_sure`

Feature list:

- `declared_blocker_category`: explicitly selected blocker.
- `comparison_behavior_bucket`: bucketed comparison or repeated-pricing behavior.
- `proof_request_event_count`: clicks/views of proof, reviews, examples, or trust material.
- `abandoned_at_step_key`: workflow step where visitor stopped.
- `historical_objection_resolution_rate`: resolution rate for similar disclosed objection patterns.

Model logic options:

- MVP: multiclass rules.
- Phase 2: multiclass logistic regression.
- Phase 3: interpretable gradient-boosted trees if there are enough reviewed labels.

Explainability fields:

- Predicted objection.
- Class probabilities.
- Top supporting factors.
- Recommended response angle.
- Confidence level.

Human-review triggers:

- Confidence below 60%.
- Predicted objection is privacy, financing, or legal/compliance concern.
- Recommendation would affect price, eligibility, or routing.

## Model 5: Partner Fit Score

Purpose: estimate fit between a consented lead/profile and a named partner.

Output: 0-100 score, pass/fail rule reasons, and match gaps.

Feature list:

- `category_match`: disclosed need category compared with partner category eligibility.
- `requirement_match_count`: disclosed requirements the partner can satisfy.
- `broad_service_area_match`: self-selected or partner-defined broad market area. Never coordinates.
- `budget_offer_fit_bucket`: budget or price-range compatibility when disclosed.
- `partner_capacity_status`: partner availability, cap, pause, or product-line status.
- `historical_partner_conversion_bucket`: historical conversion rate bucket for similar consented fits.

Model logic options:

- MVP: eligibility rules plus weighted match score.
- Phase 2: logistic model layered after hard eligibility rules.
- Phase 3: interpretable gradient-boosted trees for mature partners with enough outcomes.

Explainability fields:

- Matched requirements.
- Missing requirements.
- Partner rules passed.
- Partner rules failed.
- Score band.
- Human-review reason.

Human-review triggers:

- Fit score determines exclusive routing.
- Fit score blocks all partner matches.
- Partner rule conflict or missing eligibility data.
- High-value export or paid data product generation.

## Shared Explainability Schema

Store these fields in `leadflow.scores.explanation`:

```json
{
  "model_id": "lead_quality_score",
  "model_version": "rules_v1_2026_07",
  "score_value": 87,
  "score_band": "high",
  "top_positive_factors": [
    { "feature": "timeline_bucket", "value": "0_30_days", "impact": "+18" },
    { "feature": "response_completeness_ratio", "value": "0.92", "impact": "+14" }
  ],
  "top_negative_factors": [
    { "feature": "proof_depth_count", "value": "1", "impact": "-7" }
  ],
  "eligibility_filters_applied": ["named_partner_consent", "do_not_contact_check"],
  "consent_scope_used": "admt_scoring",
  "feature_freshness_days": 2,
  "feature_snapshot_hash": "sha256:...",
  "human_review_required": false,
  "review_reason_codes": []
}
```

Store source feature values in `leadflow.scores.feature_snapshot` or `leadflow.derived_features`, not in Vercel Analytics.

## Retraining Cadence

MVP:

- Use rules only.
- Review score distributions weekly.
- Update thresholds manually with audit notes.

Phase 2:

- Retrain monthly after at least 500 labeled outcomes per vertical.
- Recalibrate weekly during campaign launches.
- Version every model in `leadflow.score_runs`.

Phase 3:

- Retrain monthly or quarterly depending on label volume.
- Run champion/challenger comparisons.
- Require human approval before promotion.

Never train from raw Vercel drain data. Use Supabase application events that have passed the analytics redaction, consent, suppression, and ADMT gates.

## Bias Checks

Before every training run:

- Scan feature names, payload keys, and derived features for forbidden inputs.
- Review whether any source, language, timing, device, or location-like field is acting as a proxy.
- Verify no precise geolocation, exact address, neighborhood, inferred income, religion, health, political, or demographic proxy is present.
- Compare score distributions by vertical, source family, and questionnaire version.
- Sample false positives and false negatives against human-reviewed outcomes.
- Verify partner eligibility rules do not encode protected-class exclusions.

After deployment:

- Monitor score drift weekly.
- Monitor lead approval/rejection reasons by partner and vertical.
- Compare model score with human review outcomes.
- Check opt-out exclusion counts.
- Check that no ADMT opted-out profile appears in `leadflow.scoreable_profiles`.

## Human Review Triggers

Require human review when:

- Any score triggers exclusive routing.
- Any score blocks all partner options.
- A high-value export is generated.
- A model output conflicts with a hard eligibility rule.
- Confidence is low or explanation fields are missing.
- The model changed materially since the last score.
- A consumer submitted deletion, suppression, do-not-contact, or ADMT opt-out.
- A partner disputes the reason code.

## Opt-Out Handling

Scoring jobs must read from `leadflow.scoreable_profiles`, not directly from `leadflow.profiles`.

When ADMT opt-out is submitted:

1. Write `dsar_requests.request_type = 'admt_opt_out'`.
2. Write or update suppression/consent state.
3. Exclude the profile from future score runs.
4. Expire, hide, or mark stale existing scores that affect routing, prioritization, export, eligibility, price, or outreach cadence.
5. Log `admt_opt_out_submitted` in `leadflow.behavioral_events`.
6. Keep a redacted audit entry in `leadflow.audit_log`.

When do-not-contact is submitted:

1. Stop channel preference scoring.
2. Stop outreach sequencing.
3. Keep suppression data long enough to enforce the request.

When deletion is submitted:

1. Stop routing and export immediately.
2. Soft-delete first.
3. Hard-delete after the retention workflow permits.

## Model Promotion Checklist

- Feature list reviewed against forbidden-input list.
- SQL uses `leadflow.scoreable_profiles`.
- Score run includes `model_name`, `model_version`, `scoring_purpose`, and parameters.
- Explanation JSON is populated.
- Feature snapshot is hashed and retained.
- Bias checks completed.
- Human review triggers configured.
- ADMT opt-out test passes.
- Partner-facing copy says the score is predictive support, not a guarantee.
