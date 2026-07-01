# LeadFlow Pro Figma Design System

This system is built to make LeadFlow feel like a clean lead intelligence dashboard and serious buyer marketplace. It should feel operator-led and useful for local businesses, but credible enough for larger buyers.

It should not look like a generic SaaS template, a cheap AI robot site, a spammy lead seller, or a fake futuristic dashboard.

Design language:

- Signal
- Proof
- Score
- Source
- Route
- Revenue

## Current Figma Status

Ryan supplied the LeadFlow Pro Figma project URL:

`https://www.figma.com/files/team/1651991097313284183/project/620302171`

That is a Figma project URL, not a design file URL. Code Connect needs published components and node-specific `/design/:fileKey/...?...node-id=` URLs. Until those are available, the repo contains Figma-ready tokens, a component manifest, a preview page, and Code Connect example templates with placeholder URLs.

## Token Files

- Code tokens: `src/design/leadflow-design-system.ts`
- Figma/Tokens Studio JSON: `src/design/leadflow-product-system.tokens.json`
- Figma component manifest: `figma/leadflow-product-system.manifest.json`
- Code Connect example: `figma/code-connect/LeadFlowProductSystem.figma.ts.example`

## Color Tokens

Use these as Figma Variables under `LeadFlow/Color`.

| Token | Value | Use |
| --- | --- | --- |
| `background` | `#050918` | Page canvas |
| `surface` | `#060A11` | Base panels |
| `surfaceElevated` | `#0B1017` | Raised cards, modals |
| `border` | `rgba(255,255,255,0.12)` | Normal borders |
| `mutedBorder` | `rgba(255,255,255,0.08)` | Quiet dividers |
| `textPrimary` | `#FFFFFF` | Main text |
| `textSecondary` | `#CBD5E1` | Body copy |
| `textMuted` | `#94A3B8` | Helper text |
| `primaryCta` | `#FFD66B` | Main purchase or action button |
| `secondaryCta` | `#23B8FF` | Secondary action |
| `success` | `#A6E36B` | Approved, good score |
| `warning` | `#FFD66B` | Review, caution |
| `danger` | `#F87171` | Blocked, rejected |
| `verified` | `#5CD0FF` | Source proof, confidence |
| `review` | `#FFBA3D` | Needs review |
| `suppressed` | `#FB7185` | Suppressed data |
| `premium` | `#D946EF` | Exclusive or premium |
| `neutral` | `#94A3B8` | Unknown, disabled, default |

## Typography

Create Figma text styles under `LeadFlow/Typography`.

| Style | Size | Line height | Weight |
| --- | ---: | ---: | ---: |
| `heroHeadline` | 64 | 100% | 900 |
| `sectionHeadline` | 40 | 105% | 900 |
| `cardTitle` | 24 | 115% | 900 |
| `metricNumber` | 40 | 100% | 900 |
| `body` | 16 | 165% | 500 |
| `small` | 14 | 155% | 600 |
| `badge` | 12 | 100% | 800 |
| `tableHeader` | 12 | 120% | 800 |
| `formLabel` | 12 | 120% | 800 |
| `helperText` | 12 | 145% | 600 |

## Spacing

Create Figma number variables under `LeadFlow/Spacing`.

`4`, `8`, `12`, `16`, `24`, `32`, `48`, `64`, `96`

## Radius

Create Figma number variables under `LeadFlow/Radius`.

| Token | Value |
| --- | ---: |
| `small` | 4 |
| `medium` | 6 |
| `large` | 8 |
| `card` | 8 |
| `pill` | 999 |
| `modal` | 12 |

## React Component Mapping

All production-facing components export from `src/components/leadflow-system`.

| Figma name | React component | Core props |
| --- | --- | --- |
| `Component/Button/Primary` | `Button` | `variant`, `href`, `disabled` |
| `Component/Badge` | `Badge` | `variant` |
| `Component/ScoreBadge` | `ScoreBadge` | `score`, `variant`, `label` |
| `Component/ConfidenceBadge` | `ConfidenceBadge` | `confidence`, `label` |
| `Component/StatusBadge` | `StatusBadge` | `status`, `label` |
| `Component/SourceProofChip` | `SourceProofChip` | `label`, `verified` |
| `Component/SuppressionBadge` | `SuppressionStatusBadge` | `status`, `label` |
| `Component/RiskBadge` | `RiskBadge` | `risk`, `label` |
| `Component/BuyerPathCard` | `BuyerPathCard` | `title`, `body`, `href`, `proof` |
| `Component/MarketplaceCard` | `MarketplaceCard` | `variant`, `score`, `confidence`, `title`, `category`, `href`, `locked`, `adminOnly` |
| `Component/ListingPreviewModal` | `ListingPreviewModal` | `title`, `body`, `open` |
| `Component/LeadProfileHeader` | `LeadProfileHeader` | `title`, `category`, `vertical`, `score`, `confidence`, `sourceStatus`, `suppressionStatus` |
| `Component/ScoreBreakdownCard` | `ScoreBreakdownCard` | `title`, `items` |
| `Component/SourceProofList` | `SourceProofList` | `items` |
| `Component/BuyerRequestForm` | `BuyerRequestForm` | `title`, `ctaLabel` |
| `Component/ToolCard` | `ToolCard` | `title`, `who`, `answer`, `time`, `dataCategory`, `href` |
| `Component/QuestionnaireStep` | `QuestionnaireStep` | `eyebrow`, `title`, `body`, `current`, `total` |
| `Component/ProgressIndicator` | `ProgressIndicator` | `current`, `total`, `label` |
| `Component/AdminDataTable` | `AdminDataTable` | `title`, `columns`, `rows` |
| `Component/AdminStatCard` | `AdminStatCard` | `title`, `value`, `trend`, `status` |
| `Component/FilterBar` | `FilterBar` | `filters` |
| `Component/SearchInput` | `SearchInput` | `label`, `placeholder` |
| `Component/EmptyState` | `EmptyState` | `title`, `body`, `ctaLabel`, `href` |
| `Component/LoadingState` | `LoadingState` | `label` |
| `Component/ErrorState` | `ErrorState` | `title`, `body` |
| `Component/ConsentModule` | `ConsentModule` | `title`, `body`, `bullets`, `status`, `ctaLabel` |
| `Component/ExportConfirmModal` | `ExportConfirmModal` | `title`, `body`, `fieldGroups` |

## Variants

Button:

- `primary`
- `secondary`
- `ghost`
- `outline`
- `danger`
- `premium`

ScoreBadge:

- `high`
- `medium`
- `low`
- `unknown`

ConfidenceBadge:

- `high`
- `medium`
- `low`
- `needs_review`

StatusBadge:

- `submitted`
- `review`
- `approved`
- `rejected`
- `suppressed`
- `sold`
- `sample_available`
- `pending_access`

MarketplaceCard:

- `compact`
- `full`
- `featured`
- `locked`
- `buyer_approved`
- `admin`

## Page Templates

Create these Figma templates and map them to production routes.

| Figma template | Route |
| --- | --- |
| `Template/Page/Homepage` | `/` |
| `Template/Page/Marketplace` | `/marketplace` |
| `Template/Page/BuyerDashboard` | `/buyer` |
| `Template/Page/LeadProfile` | `/lead-profile/[id]` |
| `Template/Page/ToolsHub` | `/tools` |
| `Template/Page/Questionnaire` | `/tools` and questionnaire routes |
| `Template/Page/SubmitSource` | `/submit-source` |
| `Template/Page/AdminDashboard` | `/dashboard` |
| `Template/Page/PrivacyCenter` | `/privacy-center` |
| `Template/Page/IndustrySeo` | `/industries/[slug]` |

## Preview Page

The live component preview is:

`/design-system`

It is marked `noindex` and exists to inspect component behavior across desktop and mobile.

## Accessibility Rules

- Every interactive component must preserve visible focus states.
- CTA tap targets stay at least 44px tall.
- Important table labels, form labels, and warning copy cannot use tiny text.
- Do not rely on color alone for status. Pair color with text and icons.
- Suppressed, rejected, danger, and export controls must use plain text labels.

## Components To Keep Updating

Built or updated now:

- `Button`
- `Badge`
- `ScoreBadge`
- `ConfidenceBadge`
- `StatusBadge`
- `SourceProofChip`
- `SuppressionStatusBadge`
- `RiskBadge`
- `BuyerPathCard`
- `MarketplaceCard`
- `ListingPreviewModal`
- `LeadProfileHeader`
- `ScoreBreakdownCard`
- `SourceProofList`
- `BuyerRequestForm`
- `ToolCard`
- `QuestionnaireStep`
- `ProgressIndicator`
- `AdminDataTable`
- `AdminStatCard`
- `FilterBar`
- `SearchInput`
- `EmptyState`
- `LoadingState`
- `ErrorState`
- `ConsentModule`
- `ExportConfirmModal`

Still needs deeper product wiring later:

- `BuyerRequestForm` should connect to buyer request APIs.
- `ListingPreviewModal` should use a real modal primitive when interactive previews are finalized.
- `FilterBar` should be moved into marketplace and admin pages as shared stateful client wrappers.
- Existing pages should be migrated away from one-off card markup into these shared components.
