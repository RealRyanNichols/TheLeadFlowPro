# Idea Lab design QA — September 30, 2026

Scope: the working private Idea Lab interface and its development preview.
This result does not establish production deployment or database acceptance.

## Evidence and state

- Source visual truth: `/Users/ryannichols/Library/CloudStorage/GoogleDrive-theflashflash24@gmail.com/My Drive/The LeadFlow Pro/Idea Lab/2026-09-30/designs/1-source-desk.png`.
- Additional inspiration: `designs/2-build-queue.png` and `designs/3-brief-workbench.png` in the same review directory. Their queue and brief concepts were connected inside the Source Desk shell rather than reproduced as separate apps.
- Rendered route: `http://127.0.0.1:3217/design-preview/idea-lab`.
- Implementation screenshot: `/Users/ryannichols/Library/CloudStorage/GoogleDrive-theflashflash24@gmail.com/My Drive/The LeadFlow Pro/Idea Lab/2026-09-30/implementation/sources-desktop.jpg`.
- Primary state: Sources view, Corey Ganim selected, no search filter, 23 reviewed posts, one saved demonstration planning brief. No execution or actual revenue is implied.
- Source pixels: 1486 × 1059. Final implementation pixels: 1486 × 1059.
- Desktop CSS content width: 1486. The browser override was 1501 × 1070 to account for the provider's 15-pixel scrollbar gutter; a 1486 × 1059 content clip matched the reference. Density: 1; no image scaling in the comparison artifact.
- Full-view side-by-side comparison: `/Users/ryannichols/Library/CloudStorage/GoogleDrive-theflashflash24@gmail.com/My Drive/The LeadFlow Pro/Idea Lab/2026-09-30/implementation/comparison-full.jpg`. Source left, implementation right. Both images were opened together in one combined image.
- Focused comparisons: `implementation/comparison-header.jpg` and `implementation/comparison-source-detail.jpg`, opened after the full comparison. These check the owned logo, hierarchy, source headings, caveat text, and linked workstreams at readable scale.
- Additional rendered evidence: `queue-desktop.jpg`, `brief-desktop.jpg`, `results-desktop.jpg`, `sources-tablet.jpg`, `sources-mobile.jpg`, `queue-mobile.jpg`, `brief-mobile.jpg`, and `results-mobile.jpg` under `implementation/`.
- Phone override: 390 × 844; actual CSS content width 375 after the scrollbar gutter. Provider viewport captures are 375 × 812 pixels. No mobile reference was supplied, so mobile was tested for use and overflow, not claimed as a pixel match to the desktop image.
- Tablet override: 1024 × 900; actual content width 1009. Document scrollWidth equals clientWidth at tablet and phone sizes.

## Findings and comparison history

1. [P2, resolved] Desktop source-detail heading was too small and the source list showed a fourth partial card, changing the mock's hierarchy and density.
   Earlier evidence: `implementation/sources-before.jpg` (1471 × 1048, provisional capture; not used for a pixel-perfect final verdict).
   Fix: increase desktop detail heading from 38 to 44 pixels and reduce the source list window from 660 to 490 pixels. Use the current owned LF image with the white rounded image backing.
   Post-fix evidence: matching-size `sources-desktop.jpg` and the three combined comparison images listed above. The desktop headline and three-card source window now preserve the intended composition.
2. [P2, resolved] The phone navigation clipped the Results control in a horizontal strip.
   Earlier evidence: `implementation/mobile-before.jpg`; Results extended to x=406 beyond the 375-pixel content viewport.
   Fix: a four-column navigation grid, icon above label, and a positioned queue count.
   Post-fix evidence: `sources-mobile.jpg`, `queue-mobile.jpg`, `brief-mobile.jpg`, `results-mobile.jpg`. All four controls fit between x=12 and x=363. No document-level horizontal overflow remains.
3. No remaining actionable P0/P1/P2 visual or core-use findings in the reviewed local interface.

## Required fidelity surfaces

- **Fonts/typography:** self-hosted Inter, matching the interface direction. Display headings remain heavy, tightly tracked, and clearly separated from body text. The 44-pixel source headline stays on one line at the matching desktop width. Long names and descriptions wrap normally on mobile. Browser inspection confirmed Inter with the supplied fallback. Small labels remain subordinate, not substitutes for primary copy.
- **Spacing/layout rhythm:** the 78-pixel header, 258-pixel desktop sidebar, source pane, and detail pane preserve the source hierarchy. Dividers, white image backing, selected lavender source card, restrained radii, and gold actions follow the target. The additional filter row and Build Brief navigation item are intentional functional additions. Tablet uses compact columns; phone stacks source/details and keeps all view controls accessible.
- **Colors/tokens:** warm paper, near-black headings, muted body text, purple links/selection, and gold primary actions retain the target palette. Error states are readable warm red; success/unsaved notices use restrained purple. Focus outlines are 3-pixel purple and were browser verified.
- **Image quality/assets:** current owned `public/images/brand/leadflow-pro-mark.png`, rendered with Next Image. No generated decorative image, custom SVG illustration, CSS drawing, or fabricated portrait replaces the logo. Standard navigation, generic person, and action icons use lucide-react consistently.
- **Copy/content:** source summaries and caveats come from the reviewed catalog, not invented quotations from the mock. The shorter callout and fuller caveat deliberately alter some section heights. The preview label replaces the mock's date/account identity; no signed-in person is invented. Sources distinguish reviewed post text from unreviewed attachments. Queue items describe planning status. Metrics say Not measured; scenario output says illustrative. The preview footer explicitly says publication is pending.

## Functional and accessibility verification

- Source search returns the requested author; source selection changes the detail pane.
- Empty search has a clear recovery action.
- Import reports duplicate tracking/host variants and invalid links without fabricating new content.
- Brief edits save and remain after reload. A saved brief queues for planning without starting execution.
- A downloaded Markdown file was opened and its edited buyer and source caveats checked. Direct HTTP attachments fixed the initial Blob-export failure; this functional fix is separate from the visual iteration history.
- Scenario edits recalculate; invalid months display an error instead of a misleading value. Zero churn reproduces the $35,640 month-12 hypothetical example.
- All views open on phone; no horizontal document overflow at 375- or 1009-pixel content widths.
- Labeled native inputs, buttons, selects, and dialog are used. Tab reached Sort sources with a visible 3-pixel outline. Escape dismissed the native import dialog and returned to the workspace.
- Final browser console error/warning check returned no entries. The page had no Facebook, Google tag, Vercel analytics, or Speed Insights scripts in its rendered script list.
- No exhaustive screen-reader or 200% browser-zoom audit was run. No motion is needed to perform the main tasks.

## Accepted adaptations and remaining release checks

The Source Desk is the principal visual target. Queue and Brief concepts use the same persistent navigation rather than switching shell layouts between views. Priority columns represent the actual catalog instead of fabricated build progress. These are intentional integrations for a single usable app.

Supabase migration execution, authenticated hosted persistence, two-admin RLS isolation, two-tab revision conflicts, and DigitalOcean candidate acceptance remain release prerequisites. This local UI QA does not upgrade them to passed.

## Implementation checklist

- [x] Match the primary source hierarchy and owned asset.
- [x] Resolve the two visual findings and compare revised evidence.
- [x] Verify source/brief/queue/scenario interactions and an actual file export.
- [x] Verify phone/tablet controls, keyboard focus, and empty/error states.
- [ ] Validate hosted database migration and admin isolation.
- [ ] Review and activate the isolated DigitalOcean release under repository approval rules.

## Follow-up polish

[P3] The Next.js developer badge is present only in development captures. It is framework preview chrome and is absent in production. Minor body-size and vertical-spacing differences reflect the real reviewed copy and extra controls; no further change is needed for this handoff.

final result: passed
