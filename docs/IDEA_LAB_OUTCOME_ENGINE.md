# LeadFlow Outcome Engine

October 2, 2026. Private Idea Lab capability; this update is a local preview until a separately approved DigitalOcean release is accepted.

## What exists now

The Idea Lab opens with an original mobile-first graphic and one action: start a lead-follow-up test. The three steps are choose the outcome, enter comparable before/after records, and review the result. The existing 23 source records, 11 workstream specifications, queue, briefs, and scenarios remain available.

The engine prepares a manual source → draft → approval → recorded-result checklist. It calculates unique leads that booked work divided by leads received, percentage-point change, follow-up time per lead, and workflow cost per lead. Each lead counts once even if it books several jobs. The optional contribution estimate is a scenario per converted lead, not collected revenue or measured profit.

Time and cost start unrecorded. A missing process note, source reference, or comparison reference requires evidence. Missing operating measurements, small cohorts, or worsening time/cost require review. A positive booking-rate change must meet the user's target before the engine labels it promising. That label means repeat and review the pilot; it does not establish causation or justify an automatic rollout. Twenty leads per cohort is a review floor, not statistical significance.

The example uses invented numbers and cannot be saved as a customer test. It visibly identifies itself as an illustrative example and retains invented-source labels in its downloadable report. A zero-result QA draft is saved only in the local browser for save/reload acceptance; it is named "QA draft — no results recorded."

Private admin saves use the existing account-owned Idea Lab document and revision checks. Older documents remain compatible. Up to 20 bounded tests can be saved within the existing document limit. Markdown reports use the existing authenticated, same-origin export route. No new schema, service, secret, paid provider, messaging action, or environment variable is needed.

## Platform hypothesis

The commercial opportunity to test is tenant-owned operating intelligence for small businesses: customer process knowledge becomes an explicit workflow, the workflow gets tested, and approved actions produce verifiable business outcomes. Repeated successful delivery could create a useful company-specific workflow library.

This is a product hypothesis, not verified novelty, customer demand, revenue, or a billion/trillion-dollar valuation. The present build does not extract conversations with AI, run autonomous workflows, learn from customer data, or connect payment attribution. Its real capability is preparing a bounded manual plan and reviewing recorded comparisons.

The next delivery milestones are:

1. Recruit a permissioned pilot for one recurring lead-follow-up task. Agree on comparable cohorts, a booking definition, review ownership, time/cost measurement, and record access before the pilot.
2. Capture exact source excerpts from an approved process walkthrough; attach requirements and acceptance cases to those excerpts. Keep customer information private and review disputed requirements.
3. Dry-run representative records with an explicit workflow contract, failures, recovery, and approval gates. Measure setup time and review effort before enabling an integration.
4. Connect one approved existing provider; distinguish prepared work, provider acceptance, actual delivery, bookings, completed work, collected payment, and attributed revenue.
5. Validate repeat use, retention, contribution after delivery/support costs, and reproducible customer value before broadening the product or making market-size/valuation claims.

Cross-customer benchmarking or model learning would require a separate consent and privacy design. No shared customer-data flywheel is enabled.

## Measurement definitions

| Measure | Definition | Limitation / decision |
| --- | --- | --- |
| Primary: booking conversion | Unique leads that booked work / received leads for each comparable cohort | Manually entered and source-referenced; before/after is observational |
| Primary comparison | Test booking conversion minus baseline conversion, in percentage points | User's provisional target defaults to 5 points; it is not a forecast or benchmark |
| Driver / time guardrail | Total follow-up minutes / received leads | Increased work requires review even when booking conversion improves |
| Cost guardrail | Total workflow cost / received leads | Higher cost requires review; zero must be entered explicitly |

Evidence references are recorded, not independently authenticated. Period matching, lead mix, sample uncertainty, and costs outside the entered workflow still require human review. Payment/retention KPIs remain unmeasured until verified records are connected.

## Design and artwork

The mobile preview uses a single-column three-step flow, 48px minimum controls, 16px form text, readable result definitions, and a measured 0–100% booking-rate bar scale. Existing Idea Lab typography, purple/cream palette, and owned logo are retained. The custom dark artwork is a symbolic illustration; it conveys no claimed customer result.

The image was generated with the built-in ImageGen tool. The full generated original remains at the tool-provided path, and the project consumes `public/images/idea-lab/outcome-core.webp` (1024 × 1536, 90,720 bytes). Compression changes encoding/size only. Reduced-motion preferences are respected and no animation is needed to complete the flow.

Prompt: Create one original premium portrait 1024 × 1536 3D raster artwork for LeadFlow's mobile Outcome Engine. Show three refined luminous optical-glass signal nodes converging through delicate crystal ribbon conduits into one warm white prismatic core. Use electric violet, pale lavender, subtle cyan refraction, restrained amber filaments, and a deep near-black indigo background. Keep the lower third calm for real HTML text. Use physically based glass, caustic light, precise industrial detail, and a strong phone-size silhouette. No words, logos, UI, watermark, robot brain, globe, coins, dashboards, or stock imagery. This is symbolic brand illustration, not a measured-results diagram.

## Primary engineering references

- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents): reproducible acceptance and outcome checks.
- [Temporal: durable AI workflows](https://docs.temporal.io/ai): established execution/recovery capabilities; these alone are not a unique LeadFlow advantage.
- [Celonis Process Intelligence Graph announcement](https://www.celonis.com/news/press/celonis-pioneers-the-next-generation-of-process-intelligence-with-the-introduction-of-the-process-intelligence-graph): process intelligence already exists; LeadFlow must prove a specific buyer advantage.
- [OpenAI AgentKit announcement and update](https://openai.com/index/introducing-agentkit/): older inspiration must be checked against current product availability; Agent Builder/Evals are being wound down according to the updated announcement. This build adds no dependency on them.

## Release boundary

The source is integrated into an independent `main` checkout based on verified GitHub main, preserving the user's dirty canonical checkout. GitHub source delivery and DigitalOcean activation are separate outcomes. The live site was independently checked and still serves `0148dd1f16e7afe4e4b792902696c95e4674dbdf`; that release has the prior Idea Lab, not this new Outcome Engine.

The live admin browser remains at normal sign-in. No session was fabricated and no login email was sent. Authenticated live UI save/reload acceptance remains pending. Production activation stays approval-gated under repository instructions, and a future release must contain only reviewed private changes rather than all unrelated main additions.
