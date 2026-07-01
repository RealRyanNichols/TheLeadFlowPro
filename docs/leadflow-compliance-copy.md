# Lead Flow Pro Compliance Copy

This is product copy for the consent-based intake, routing, email, privacy center, mortgage/refi, and age-gating surfaces. It is written in plain English for production UI, but it should still be reviewed by privacy counsel before launch in any regulated vertical.

Code registry:

- `src/lib/leadflow-compliance-copy.ts`
- Copy version: `leadflow-compliance-copy-2026-07-01`

## Source Posture

- CFPB Circular 2024-01 warns that financial comparison tools and lead generators can create abusive risk when consumers reasonably rely on the tool and leads are steered by compensation rather than consumer interest. Lead Flow Pro copy must say payment cannot override consumer purpose, named-seller consent, eligibility, suppression, fairness, or routing rules.
- FTC CAN-SPAM guidance requires truthful headers and subject lines, ad identification for commercial messages, a valid physical postal address, clear opt-out mechanics, and honoring marketing opt-outs within 10 business days.
- CPPA CCPA/ADMT updates effective January 1, 2026 include consumer rights to access and opt out of certain ADMT use. Lead Flow Pro must expose ADMT access and opt-out language wherever automated scores affect routing, prioritization, eligibility, price, or outreach cadence.
- FTC COPPA guidance applies to child-directed services and general services with actual knowledge of collecting personal information from children under 13. Lead Flow Pro is stricter by default: adult-only, 18+ only, and no child information through general intake.

Official references:

- CFPB: https://www.consumerfinance.gov/compliance/circulars/consumer-financial-protection-circular-2024-01-preferencing-and-steering-practices-by-digital-intermediaries-for-consumer-financial-products-or-services/
- FTC CAN-SPAM: https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- CPPA CCPA/ADMT updates: https://cppa.ca.gov/regulations/ccpa_updates.html
- FTC COPPA: https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa

## Notice At Collection

Headline: What we collect and why

We collect the answers, preferences, contact details, seller choices, and site actions you choose to give us.

We use that information to build your preference map, score fit and urgency, route your request to the seller or sellers you select, prevent duplicates, honor privacy choices, and create anonymous or aggregated market insights.

We do not ask for Social Security numbers, driver's license numbers, financial-account logins, biometrics, health information, race or ethnicity, religion, sexual orientation, political opinions, or information about children.

If you choose a seller-routing option, we may share your identified request with the named seller or sellers shown to you. If you choose aggregate-only mode, we use your answers only in group-level insights that do not identify you.

You can ask us to stop contact, opt out of sale or sharing, opt out of automated decisionmaking used for routing, or delete your data through the privacy controls.

CTA: Continue

## Consent Copy For One Seller

Headline: Send this request to one seller

You are asking LeadFlow Pro to send your request to the seller named on this screen.

That seller may contact you about this request using the contact methods you select.

LeadFlow Pro may be paid for routing this request. We do not route identified leads by highest bidder alone. Routing must match the purpose you selected, the seller shown, your consent, and our eligibility rules.

This is not a purchase, approval, quote, loan offer, or guarantee that the seller can help.

You can revoke contact permission or ask us to delete your data later.

Checkbox: I agree to send my request to the seller named here and allow that seller to contact me about this request.

CTA: Send to this seller

## Consent Copy For Multiple Named Sellers

Headline: Send this request to the sellers I selected

You are asking LeadFlow Pro to send your request to the sellers selected on this screen.

Only the named sellers you select or clearly approve may receive your identified request.

Those sellers may contact you about this request using the contact methods you select.

LeadFlow Pro may be paid for routing requests. Payment can never override your seller choices, consent, eligibility rules, suppression settings, or our fairness rules.

You can revoke contact permission, remove a seller, opt out of sale or sharing, or ask us to delete your data later.

Checkbox: I agree to send my request to the named sellers I selected and allow those sellers to contact me about this request.

CTA: Send to selected sellers

## No-Sale / No-Sharing Footer

No hidden sale. No hidden sharing.

We do not sell or share your identified request unless you choose a seller-routing option and give permission for the named seller or sellers shown to you.

Aggregate insight products are group-level reports. They must not include your name, contact details, raw answers, profile id, exact address, or any field designed to identify you.

Short footer: No hidden sale or sharing. Identified routing requires your seller choice and permission.

## Do-Not-Contact Language

Headline: Stop contact

Use this if you do not want LeadFlow Pro or routed sellers to contact you about your request.

After you submit this, we will stop marketing and lead follow-up contact tied to the information we can match.

We may still send required transactional, security, privacy, or legal messages.

We keep a limited suppression record so we can honor your request and avoid adding you back by mistake.

CTA: Stop contact

## Delete-My-Data Flow Copy

Headline: Delete my data

Tell us what email, phone number, or request you want us to find.

We will verify the request, stop new routing while we review it, and delete or de-identify personal data we are not required to keep.

Some records may be kept for a limited time when needed for security, fraud prevention, audit logs, legal obligations, refunds, or proof that we honored your privacy choices.

Deleting your data does not automatically remove records already sent to a seller before your request, but we will record your suppression choice and, where available, notify routed sellers of the change.

CTA: Request deletion

## ADMT Access Copy

Headline: How automated scoring may be used

LeadFlow Pro may use automated scoring to estimate lead quality, urgency, channel preference, likely objection, and partner fit.

These scores are built from disclosed questionnaire answers, onsite first-party events, historical conversion outcomes, and partner eligibility rules.

We do not use race, ethnicity, religion, health information, sexual orientation, political opinions, precise location, biometrics, government id numbers, financial-account access data, or proxies designed to infer those traits.

You can ask for information about the score types used for your profile, the general factors that affected them, and whether a score affected routing, prioritization, eligibility, price, or outreach cadence.

CTA: Request score access

## ADMT Opt-Out Copy

Headline: Opt out of automated decisionmaking

Use this if you do not want automated scores to be used for decisions that affect routing, prioritization, eligibility, price, or outreach cadence.

After you opt out, we will exclude matched profiles from scoring jobs used for those decisions and mark existing decision scores as stale or unavailable for routing.

We may still use non-personal analytics, fraud prevention checks, manual review, and rules needed to honor your request.

If a seller route still needs a decision, we will use consent, eligibility rules, your seller choice, and human review instead of predictive scoring.

CTA: Opt out of automated scoring decisions

## Email Footer For Marketing Messages

You are receiving this because you asked for LeadFlow Pro updates, submitted a LeadFlow Pro request, or interacted with a LeadFlow Pro page.

LeadFlow Pro may send commercial emails about tools, data products, seller routes, and related services.

Unsubscribe from marketing: `{{unsubscribe_url}}`

Manage preferences: `{{preferences_url}}`

REAL RYAN NICHOLS LLC / The LeadFlow Pro, `{{physical_postal_address}}`

We honor marketing opt-out requests within 10 business days. You may still receive transactional, security, privacy, or legal messages.

Short footer: Unsubscribe: `{{unsubscribe_url}}` | Preferences: `{{preferences_url}}` | REAL RYAN NICHOLS LLC / The LeadFlow Pro, `{{physical_postal_address}}`

## Email Footer For Transactional Messages

This message is about a LeadFlow Pro request, account, privacy action, transaction, or security event.

If this message also includes marketing content, you can opt out of marketing here: `{{unsubscribe_url}}`

REAL RYAN NICHOLS LLC / The LeadFlow Pro, `{{physical_postal_address}}`

Short footer: Transactional notice from The LeadFlow Pro. Marketing opt-out: `{{unsubscribe_url}}`. Address: `{{physical_postal_address}}`

## Mortgage / Refi Vertical Disclaimer

Headline: Mortgage and refinance requests

LeadFlow Pro is not making a loan offer, credit decision, preapproval, rate quote, or refinance recommendation.

Unless a page clearly says otherwise, LeadFlow Pro is not acting as your lender, mortgage broker, loan originator, financial adviser, or credit counselor.

If you choose a mortgage or refinance seller route, your request may be sent only to the named provider or providers you select or clearly approve.

Rates, payments, APR, fees, terms, approval, and eligibility must be confirmed directly with a properly licensed mortgage professional.

LeadFlow Pro may be paid for routing a permissioned request, but compensation cannot override your selected purpose, named-seller consent, eligibility rules, or fairness rules.

Do not submit Social Security numbers, bank logins, full account numbers, driver's license numbers, or sensitive documents through a general LeadFlow intake unless a secure, lender-approved upload flow specifically asks for them.

## Child-Safety / Age Gating Copy

Headline: Adults only

LeadFlow Pro is for adults 18 and older.

Do not use this site if you are under 18.

Do not submit information about a child, including a child's name, contact details, school, precise location, photos, account handles, or preferences.

If we learn that child information was submitted through a general intake, we will stop routing it and delete or suppress it according to our child-safety workflow.

A parent or guardian can contact us to request deletion of child information.

Checkbox: I confirm I am 18 or older and will not submit information about a child.

CTA: I am 18 or older

## Implementation Rules

- Do not pre-check consent boxes.
- Show the named seller or named sellers before identified routing.
- Keep aggregate-only mode visually separate from identified lead routing.
- Store the copy version in `consent_ledger.notice_version` or the relevant question-version snapshot.
- Bind each consent event to the exact seller, channel, vertical, purpose, timestamp, source page, and copy version shown to the user.
- Do-not-contact must create a suppression record and block marketing or lead follow-up, while allowing transactional, security, privacy, or legal messages.
- ADMT opt-out must exclude matched profiles from `leadflow.scoreable_profiles` and any score job that changes routing, prioritization, eligibility, price, or outreach cadence.
- Email systems must replace `{{physical_postal_address}}`, `{{unsubscribe_url}}`, and `{{preferences_url}}` before sending.
- Mortgage/refi pages must keep compensation disclosure close to the routing action, not buried in a footer.
- Child-safety gates should appear before any free-text intake field.
- Any copy that changes consent scope must receive a new copy version.
