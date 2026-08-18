# Homepage V2 Design QA

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
- Rendered implementation: `https://the-lead-flow-pro-git-agent-leadflow-con-704cfd-realryannichols.vercel.app/`
- Implementation screenshot path: Cloud Browser inline capture, Chrome tab 15. The browser runtime did not expose a filesystem export path.
- Implementation viewport: 1363 x 936 CSS px, device pixel ratio 1.
- State: deployed protected preview, homepage initial state.
- Density normalization: none. The mobile source and fixed desktop implementation viewport could not be normalized to the same CSS size.

## Full-view comparison evidence

The user-provided mobile source shows the previous homepage opening with a text-only hero, eight tall icon cards, a plain proof strip, and long comparison cards before the first premium visual appears. The deployed desktop capture now shows the connected-company artwork in the first viewport beside the primary claim and CTA. Browser measurements place the hero artwork at y=353 to y=723 inside a 936 px viewport. The page has no horizontal overflow.

The exact 390 px deployed comparison could not be captured. Cloud Browser rejected the requested fixed-width frame under its URL policy, and its selected browser viewport cannot be resized. Per browser policy, no alternate browser workaround was attempted.

## Focused region evidence

- Hero: premium connected-company asset is sharp, correctly cropped, and visible in the first desktop viewport.
- Connected lead system: source-order inspection confirms “One Customer. One Record.” and “Automate the Reminder” now precede the long website-builder comparison.
- Operations: the former eight-card chain is replaced by a single 16:9 operating-loop asset with eight accessible stage links.
- Proof: exact figures remain live HTML inside the new proof cockpit.
- A same-viewport mobile focused comparison was not available, which is the remaining QA blocker.

## Required fidelity surfaces

- Fonts and typography: desktop render uses the intended Archivo display hierarchy and Inter body/UI hierarchy. Heading weight, contrast, and wrapping are coherent at the inspected viewport.
- Spacing and layout rhythm: desktop hero is balanced as a two-column composition. Premium artwork enters immediately. No horizontal overflow was measured.
- Colors and visual tokens: midnight navy, cobalt, cyan, white, and warm paper match the approved premium visual direction and existing LeadFlow tokens.
- Image quality and asset fidelity: all three new images are real raster assets at 1920 x 1080 WebP, not CSS drawings, emoji, placeholder shapes, or synthetic logos. The approved LeadFlow Pro name remains live text.
- Copy and content: the company-builder claim, CTA, ownership statement, exact proof figures, and stage destinations are preserved. The hero support copy is intentionally shorter for faster mobile scanning.

## Findings

- [P2] Exact mobile runtime comparison is unavailable
  - Location: homepage at the 390 px breakpoint.
  - Evidence: the source visual truth is a 707 x 1536 iPhone capture, while Cloud Browser is fixed at 1363 x 936 and rejected the fixed-width frame used to normalize the comparison.
  - Impact: the mobile CSS is implemented, but the final first-screen crop and exact scroll depth cannot be certified from browser-rendered evidence in this environment.
  - Fix: open the protected preview on an iPhone and confirm that the connected-company hero image is visible before scrolling and that no horizontal overflow appears.

No P0, P1, or P2 visual mismatch was observed in the deployed desktop render.

## Interaction and console checks

- Primary interaction tested: the first “Map My Company” link opened `/start` and rendered the heading “What do you want fixed first?”
- Return navigation to the homepage succeeded.
- Application console errors: none observed. Logged errors came only from the Cloud Browser extension URL, not the deployed application.

## Comparison history

1. Initial evidence: premium visual language did not appear until approximately the eighth mobile screen. The top was dominated by plain icon cards, statistics, and long comparison copy.
2. Fix applied: added a cinematic hero asset, moved the two approved premium scenes before the comparison, rebuilt the eight-stage chain as one visual plus compact links, and rebuilt proof as an image-led cockpit.
3. Post-fix evidence: deployed desktop capture shows premium artwork in the first viewport, the primary route works, and horizontal overflow is absent. Exact mobile post-fix evidence remains unavailable.

## Implementation checklist

- [x] Premium artwork in the hero
- [x] Approved customer-record and reminder visuals moved ahead of comparison copy
- [x] Eight-stage icon chain replaced
- [x] Proof strip upgraded while preserving exact HTML values
- [x] Production build and automated tests passed
- [x] Deployed desktop browser check passed
- [ ] Final iPhone-width visual check by Ryan

## Follow-up polish

- After the iPhone check, adjust only the mobile hero crop or vertical spacing if Ryan sees more than one full screen before the second premium visual begins.

final result: blocked
