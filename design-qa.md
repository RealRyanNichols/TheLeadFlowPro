# LeadFlow V2 Sitewide Design QA

## Evidence

- Source visual truth:
  - `/workspace/scratch/0d9cbec27319/upload/015A2183-7B51-44A5-878C-3586A044A383.jpeg`
  - `/workspace/scratch/0d9cbec27319/upload/ED0134D5-B719-4CEF-88CA-7458584692DB.jpeg`
  - `/workspace/scratch/0d9cbec27319/upload/6461EB4F-BC7F-49F3-923C-357D60B5668B.jpeg`
  - `/workspace/scratch/0d9cbec27319/upload/A61257B7-3EA8-4A76-A464-A20E8E327C57.jpeg`
  - `/workspace/scratch/0d9cbec27319/upload/6234A5BC-306D-42F9-86C5-0E6B3524400D.jpeg`
  - `/workspace/scratch/0d9cbec27319/upload/713EA2F5-D013-491F-A5E7-4892B3E1D66A.jpeg`
  - `/workspace/scratch/0d9cbec27319/upload/F65BC921-2762-4236-BFB5-F459A52025CE.jpeg`
  - `/workspace/scratch/0d9cbec27319/upload/54DC8827-1E3C-48FC-B0CD-D0EAD91A11DC.jpeg`
- Source dimensions: 707 x 1536 px iPhone captures including browser chrome.
- Final preview branch commit: `ceacb9a856143a05e20d648f2a81217d5a34259c`.
- Rendered implementation: protected Vercel preview on the `agent/leadflow-control-suite` branch.
- Browser: Cloud Browser Chrome at 1363 x 936 CSS px, device pixel ratio 1.
- Final inspected state: `/premier-system` above the fold with the offer, two CTAs, and the premium operating-system visual in one viewport.
- Screenshot evidence: Cloud Browser inline captures. The documented shared screenshot directory was read-only in this session, so a durable screenshot file could not be attached.
- Density normalization: none. The mobile source and fixed desktop browser viewport could not be normalized to the same CSS size.

## Full-view comparison evidence

The user-provided mobile source shows the previous homepage opening with a text-heavy hero, eight tall icon cards, a plain proof strip, and long comparison cards before the first premium visual appears. The final deployed homepage now places the connected-company artwork inside the first viewport beside the primary claim and CTA. The new Premier proof funnel also opens with the offer and a full connected-system scene inside the first viewport.

The exact 390 px deployed comparison could not be captured. Cloud Browser exposes a fixed desktop viewport and its supported API does not provide viewport emulation. No unsupported browser or local Playwright workaround was used.

## Focused region evidence

- Homepage hero: premium connected-company asset is sharp, correctly cropped, and visible before scrolling.
- Premier funnel hero: system-proof headline, exact $500 CTA, scope anchor, and the 4K operating-system image all appear above the fold.
- Connected lead system: “One Customer. One Record.” and “Automate the Reminder” precede the long website-builder comparison.
- Operations: the former eight-card chain is replaced by one 16:9 operating-loop asset with accessible stage links.
- Proof: exact figures remain live HTML inside the new proof cockpit.
- Shared V2 system: articles, tools, forms, pricing, packages, system stages, add-ons, training, proof, demo, live, events, and thank-you surfaces use the same navy, cobalt, cyan, warm-paper, Archivo, and Inter hierarchy.

## Required fidelity surfaces

- Fonts and typography: the render uses the intended Archivo display hierarchy and Inter body/UI hierarchy. Heading weight, contrast, and wrapping are coherent at the inspected viewport.
- Spacing and layout rhythm: the homepage and Premier heroes balance large copy with a real visual. Premium artwork enters immediately. No horizontal overflow was measured.
- Colors and visual tokens: midnight navy, cobalt, cyan, white, green approval accents, and warm paper match the approved visual direction and existing LeadFlow tokens.
- Image quality and asset fidelity: the offer scenes are real 3840 x 2160 WebP assets, not CSS drawings, emoji, placeholder shapes, or synthetic logos. The approved LeadFlow Pro name remains live text.
- Copy and content: the company-builder claim, exact $1,000 scope, two-payment schedule, ownership language, approval point, and deeper-system exclusions remain visible as live HTML.

## Findings

- [P2] Exact mobile runtime comparison remains unavailable
  - Location: shared hero system at the 390 px breakpoint.
  - Evidence: source truth is a 707 x 1536 iPhone capture; Cloud Browser is fixed at 1363 x 936 and exposes no supported viewport emulation.
  - Impact: responsive CSS and overflow rules are implemented, but the exact first-screen iPhone crop cannot be certified in this environment.
  - Required review: open the protected preview on an iPhone and confirm that the hero visual appears before scrolling and no horizontal overflow is visible.

No P0, P1, or desktop P2 visual mismatch was observed.

## Route, interaction, and console checks

- Seventeen public page families were opened on the final preview: homepage proof funnel, pricing, Website Launch, articles index/detail, tools index/detail, contact, add-ons, training access gate, guided start, CRM stage, live proof, demo, showcase, events, and thank-you.
- Every inspected route had a real H1, no broken loaded images, and zero horizontal overflow at the desktop viewport.
- The Premier “See Exactly What $1,000 Includes” control moved to the live `#website-launch` scope section.
- `/go` preserved Facebook campaign, content, and source parameters while routing to `/premier-system`.
- An initial `/live` pass exposed a React text hydration mismatch in relative timestamps. `LiveDashboard` now renders deterministic pre-hydration labels and switches to relative time only after mount.
- The final fresh `/live` pass had no application console errors. Cloud Browser extension messages were excluded as environment noise.
- Training correctly redirected an unauthenticated visitor to the login gate without exposing protected course content.

## Build verification

- Next.js production build: 395 of 395 pages generated.
- TypeScript: passed.
- Automated tests: 304 passed.
- Tool registry: 86 published and valid.
- Visual registry: 86 entries valid with all assets present.
- Git whitespace validation: passed.

## Comparison history

1. Initial evidence: premium visual language did not appear until approximately the eighth mobile screen.
2. Homepage fix: cinematic hero art, early customer-record and reminder scenes, a compact operating loop, and an image-led proof cockpit moved the visual story forward.
3. Sitewide rollout: shared V2 patterns reached articles, tools, forms, pricing, packages, funnels, system stages, add-ons, training, and proof surfaces.
4. Offer build: `/premier-system` now connects the real Premier system proof to a clearly bounded five-page Website Launch.
5. Final browser fix: the only application console defect found, a `/live` hydration mismatch, was corrected and rechecked.

## Implementation checklist

- [x] Premium artwork in the homepage and proof-funnel heroes
- [x] Approved customer-record and reminder visuals moved ahead of comparison copy
- [x] Eight-stage icon chain replaced
- [x] Proof strip upgraded while preserving exact HTML values
- [x] V2 system applied across major public page families
- [x] Exact $1,000 scope and deposit disclosure placed beside checkout paths
- [x] Production build, tests, tool registry, and visual registry passed
- [x] Final desktop cloud-browser route and console check passed
- [ ] Final iPhone-width visual check by Ryan

final result: review-ready preview; production approval remains blocked on the iPhone visual check and explicit offer approval
