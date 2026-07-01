# LeadFlow Component Registry

This registry is the contract between Figma, React, and deployed Vercel pages.
New LeadFlow UI should import from the shared directories below instead of creating one-off page components.

## Canonical Import Paths

| Area | Import path | Use |
| --- | --- | --- |
| UI primitives | `@/components/ui` | Buttons, badges, cards, loading, empty, error, progress |
| LeadFlow product | `@/components/leadflow` | Buyer paths, profile headers, score breakdowns, proof lists, tool cards |
| Marketplace | `@/components/marketplace` | Listing cards and preview modal surfaces |
| Dashboard | `@/components/dashboard/*` | Admin data tables, stat cards, export confirmations |
| Forms | `@/components/forms` | Buyer request, consent, questionnaire, submit source forms |
| Layout | `@/components/layout` | Header, footer, section page shells |

## Registered Components

The source registry lives in `src/design/leadflow-component-registry.ts`.

| Component | Path | Figma name | Required variants or states |
| --- | --- | --- | --- |
| `Button` | `src/components/ui/button.tsx` | `Component/Button` | `primary`, `secondary`, `ghost`, `outline`, `danger`, `premium`, disabled, focus |
| `MarketplaceCard` | `src/components/marketplace/index.ts` | `Component/MarketplaceCard` | `compact`, `full`, `featured`, `locked`, `buyer_approved`, `admin` |
| `ScoreBadge` | `src/components/ui/badge.tsx` | `Component/ScoreBadge` | `high`, `medium`, `low`, `unknown` |
| `ConfidenceBadge` | `src/components/ui/badge.tsx` | `Component/ConfidenceBadge` | `high`, `medium`, `low`, `needs_review` |
| `StatusBadge` | `src/components/ui/badge.tsx` | `Component/StatusBadge` | `submitted`, `review`, `approved`, `rejected`, `suppressed`, `sold`, `sample_available`, `pending_access` |
| `SourceProofChip` | `src/components/ui/badge.tsx` | `Component/SourceProofChip` | `verified`, `unverified` |
| `SuppressionStatusBadge` | `src/components/ui/badge.tsx` | `Component/SuppressionBadge` | `review`, `approved`, `suppressed`, `pending_access` |
| `BuyerPathCard` | `src/components/leadflow/index.ts` | `Component/BuyerPathCard` | default, hover, focus |
| `ToolCard` | `src/components/leadflow/index.ts` | `Component/ToolCard` | default, hover, focus |
| `ConsentModule` | `src/components/forms/index.ts` | `Component/ConsentModule` | unchecked, checked, saving, saved, error |
| `AdminDataTable` | `src/components/dashboard/admin-data-table.tsx` | `Component/AdminDataTable` | default, empty, loading, filtered |
| `LeadProfileHeader` | `src/components/leadflow/index.ts` | `Component/LeadProfileHeader` | buyer, admin, locked, suppressed |
| `ExportConfirmModal` | `src/components/dashboard/export-confirm-modal.tsx` | `Component/ExportConfirmModal` | buyer, admin, blocked, complete |

## Shared Component Policy

- Buttons, badges, cards, forms, tables, modals, status labels, score displays, and consent modules must come from the shared component directories.
- Page files may compose components, but should not define new card or badge systems inline.
- If a page needs a new visual pattern, add it to the registry first, document its Figma name, then use it from the page.
- Admin-only and buyer-protected UI must keep private data out of props unless the route already performed an entitlement or admin check.

## Figma Code Connect Notes

- Figma names should match the registry exactly: `Component/Button/Primary`, `Component/MarketplaceCard/Featured`, `Template/Page/Marketplace`.
- The existing Code Connect examples are placeholders until published Figma component URLs with `node-id` values are available.
- Code Connect templates must use real prop names from the registry. Do not invent props to match a Figma layer.
- Instance swaps, icons, badges, and nested children should remain dynamic in Figma templates.
