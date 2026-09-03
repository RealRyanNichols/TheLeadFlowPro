# Tools section handoff

The one document to read before touching the free-tools section. It points at
the deeper docs rather than repeating them: architecture in
[TOOLS_ARCHITECTURE.md](TOOLS_ARCHITECTURE.md), imagery and licensing in
[TOOL_IMAGE_SOURCES.md](TOOL_IMAGE_SOURCES.md), formulas in
[TOOL_FORMULA_SOURCES.md](TOOL_FORMULA_SOURCES.md), accessibility notes in
[TOOLS_ACCESSIBILITY.md](TOOLS_ACCESSIBILITY.md), embedding in
[TOOLS_EMBEDDING.md](TOOLS_EMBEDDING.md), SEO in [TOOLS_SEO.md](TOOLS_SEO.md),
analytics in [TOOLS_ANALYTICS.md](TOOLS_ANALYTICS.md), and what is planned in
[TOOLS_ROADMAP.md](TOOLS_ROADMAP.md).

## How a tool exists

A tool is one entry in the registry under `lib/tools/`: its definition (name,
slug, domain, toolType, formula or generator logic), its metadata in
`lib/tools/meta.ts` or inline on the definition, and its visual identity in
`lib/tools/visuals.ts` (scene concept, subject, composition, accent 1–6, OG
layout and hook). `toolIndex()` resolves everything a page needs, including
the card and hero image paths, which are derived from the slug — no path is
stored anywhere.

## The three image systems

1. **Card and hero art** — one hand-authored scene per tool in
   `art/scenes/<slug>.svg`, drawn to the contract in `art/STYLE.md` (light
   ground, six locked accent gradients, ink silhouettes, no text, no shared
   skeletons). `npm run art` publishes each scene to
   `public/tools-art/card` (1200×675) and `/hero` (1600×900) and writes the
   manifest; it fails if any published tool has no scene.
2. **OG share cards** — designed per tool in the Figma file "LeadFlow Tools —
   OG Cards" (https://www.figma.com/design/da2xDWeTFFd9HGfcplPAcI), rendered
   deterministically to `public/og/tools/<slug>.jpg` (1200×630) by
   `npm run og`. Layouts and accents come from `lib/tools/visuals.ts`.
3. **Review tooling** — `node scripts/render-art.mjs <slug…>` renders scenes
   to `.art-review/` for eyeballing, `--sheet` builds a contact sheet, and
   `node scripts/art-similarity.mjs` fails if two scenes read as clones
   (subject-pixel metric, calibrated threshold 12; see the script header
   before ever loosening it).

## The build gate

`npm run build` runs `validate:tools` then `validate:visuals` before
`next build`. Between them they fail the build on: a published tool missing
metadata, formula, instructions, disclaimer, art files, or alt text; art with
wrong dimensions, no explicit size, oversize files, remote URLs, or two tools
sharing byte-identical artwork; a visuals entry missing or orphaned; OG layout
family counts outside 5–13; accents used unevenly; any referenced asset
missing from disk.

## Test layers

- **Unit** — `npm test` (node:test, `tests/*.test.ts`): 448 tests over
  formulas, registry invariants, search, collections, shells, funnels.
- **End-to-end** — `npm run test:e2e` (Playwright, `tests/e2e/*.spec.ts`):
  directory search/filter/navigation, a calculator computing a dollar figure,
  the QR maker and review writer producing output, a collection page, asset
  serving (OG + card art over HTTP), and the mobile-fold rule. The config
  reuses a running dev server (`npm run dev`) or starts one; in managed
  environments it picks up the preinstalled Chromium automatically.

## Accessibility and responsive checks

The Aug 2026 pass ran axe (WCAG 2.x A/AA) across the directory and five
representative tool pages at 1280 and 390 wide — zero violations — plus a
width sweep (360→1440) for horizontal overflow, header wrap, tap-target size,
and console errors. Re-run pattern: a scratch Playwright script that blocks
external requests (`page.route` on non-localhost — analytics domains hang
`networkidle` behind egress proxies), uses `browser.newContext()` (axe
requires it), and asserts the invariants below. The known-benign console line
is the Meta Pixel guard refusing to boot without the exact pixel ID — that is
the guard doing its job in an environment without the env var.

## Rules that must not regress

- The site header is the one deliberately dark surface on the light site: ink
  bar, white lockup, single 68px row at every width.
- Header links carry padded hit areas (44px+); the visual layout stays put
  because margins cancel the padding.
- `/tools` on a phone: the search input sits within 900px of the top at
  390 wide. The hero stays, but its media panel is hidden on phones for this
  page (`.sv-tools-page` rules in `app/globals.css`). `tests/e2e/mobile.spec.ts`
  enforces both.

## Adding a new tool, end to end

1. Define it under `lib/tools/` with slug, domain, toolType, and logic; add
   meta (goals, industries, keywords, disclaimer).
2. Add its visuals entry in `lib/tools/visuals.ts` — concept, subject,
   composition, accent, OG layout and hook.
3. Author `art/scenes/<slug>.svg` per `art/STYLE.md`; run
   `npm run art`, then `node scripts/render-art.mjs <slug>` and look at it;
   run `node scripts/art-similarity.mjs`.
4. Add the OG frame to the Figma file (or extend the renderer's data) and run
   `npm run og`.
5. `npm test`, `npm run test:e2e`, `npm run build` — the gate tells you what
   you forgot.
6. Share-check: after deploy, run the tool URL through Facebook's sharing
   debugger so the new OG card replaces any cached preview.
