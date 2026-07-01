# LeadFlow Pro Scoring Model V1

Implementation:

- `src/lib/leadflow-scoring.ts`
- `src/app/api/questionnaires/responses/route.ts`
- `src/app/api/tools/signal-intake/route.ts`

The model creates 0 to 100 scores for:

- Intent score
- Urgency score
- Source proof score
- Freshness score
- Buyer fit score
- Contactability score
- Compliance readiness score
- Revenue potential score

Each score includes:

- `scoreValue`
- `scoreLabel`
- `explanation`
- `fieldsUsed`
- `fieldsMissing`
- `confidenceLevel`
- `nextRecommendedAction`

## Inputs Allowed

- Disclosed questionnaire responses
- Onsite behavioral events
- Source page and UTM context
- Consent status and notice version
- Suppression status
- Source proof metadata
- Partner eligibility rules
- Historical conversion outcomes when available

## Inputs Not Allowed

The model does not score or infer:

- minors
- race or ethnicity
- religion
- health or medical data
- sexual orientation
- private political identity or persuasion
- private financial account data
- SSNs or driver license numbers
- hacked, leaked, or hidden sensitive data

If prohibited data is detected, the scorecard returns `scoreable: false`,
sets category values to `0`, records `safetyFlags`, and recommends manual review
instead of buyer routing or export.

## Buyer Explanation Rules

High value means the record has strong disclosed intent, usable source proof,
current context, buyer fit, and review-ready consent controls.

Medium value means the record has real demand but still needs missing details
such as proof, timing, buyer type, location, contact path, or consent scope.

Low value means the record should stay in anonymous insight or continued intake
until the person gives clearer problem, value, timing, proof, or route data.

## Storage

Questionnaire responses store the full scorecard inside:

`QuestionnaireResponse.exportProfile.lead_scores`

Tool signal intake stores the full scorecard inside:

`ToolSignalIntake.answers.scoring`

The first release keeps score data in JSON so the scoring contract can stabilize
before every category is normalized into `leadflow.lead_scores`.
