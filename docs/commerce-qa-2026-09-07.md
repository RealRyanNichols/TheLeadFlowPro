# Commerce page QA — September 7, 2026

## Result

**18 browser tests passed, 5 existing commerce unit tests passed, and focused ESLint passed.** No commerce application edits were needed during this QA task.

The actual `/commerce` page, `CommercePlanner`, current eight-product catalog, page artwork, and scoped styles were exercised. All intake APIs and third-party services were intercepted. No real leads, emails, account connections, or payments were created.

## Behavior verified

- All three selling choices change the customer example, three steps, and appropriate tool links. Keyboard radio navigation works, and existing-account choices persist when the selling type changes.
- The browser produces a real `my-commerce-build-list.txt` download. Its contents match the selected type and existing setup, include all three steps, credit The LeadFlow Pro, and state the planning limits. Contact fields and private notes do not enter the download. Downloading works without signup or an API call.
- Successful mocked intake sends the selected modules and setup, trimmed contact details, campaign attribution, and separate email consent. Optional blank phone and business fields become `null`; SMS consent remains `false`.
- The successful screen confirms a scope request and explicitly says no payment was taken and no accounts were connected.
- HTTP failure, network failure, invalid JSON, and an unconfirmed save retain the form and choices, show an error instead of success, and allow a successful retry.
- Concurrent submit events issue only one intake request. An optional analytics exception cannot turn a saved inquiry into an error.
- Browser validation prevents submission with a missing name or invalid email.
- Planner anchors resolve, eight distinct kit-preview links use the native LeadFlow product paths, and the Gideon link remains clearly labeled a marketplace preview.

## Responsive and accessibility checks

| Width   | Planner states checked | Loaded images | Horizontal overflow | Browser/load errors | Automated WCAG A/AA violations |
| ------- | ---------------------- | ------------- | ------------------- | ------------------- | ------------------------------ |
| 320 px  | All 3                  | 9 of 9        | None                | None                | 0                              |
| 390 px  | All 3                  | 9 of 9        | None                | None                | 0                              |
| 768 px  | All 3                  | 9 of 9        | None                | None                | 0                              |
| 1440 px | All 3                  | 9 of 9        | None                | None                | 0                              |

The download and submit buttons measured at least 48 px tall at every tested width. FAQ controls also worked with the keyboard. Screenshots of the 320 px planner, 320 px hero, 1440 px hero, and 390 px first product card were visually reviewed for readable text, visible artwork, and unclipped controls.

The accessibility scan used axe tags `wcag2a`, `wcag2aa`, and `wcag21aa`. These automated checks supplement the visual and keyboard review; they are not a complete manual accessibility certification.

## Reusable tests and commands

The durable suite is `tests/e2e/commerce.spec.ts`. It can run through the repository's existing Playwright configuration against its local app server:

```sh
npm run test:e2e -- tests/e2e/commerce.spec.ts
```

For this coordinated release, the parent agent was using the main Next build directory. The tests instead ran against an isolated temporary harness:

```sh
node node_modules/playwright/cli.js test --config=/tmp/leadflow-commerce-playwright.config.cjs
node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs --test tests/commerce.test.ts
node node_modules/eslint/bin/eslint.js tests/e2e/commerce.spec.ts
```

Focused Prettier also passed for the new test and this document.

## Evidence and limits

- Browser-test output: `/tmp/leadflow-commerce-e2e.log` — 18 passed.
- Per-width, per-state layout, image, accessibility, and error evidence: `/tmp/leadflow-commerce-visual-qa.json`.
- Visual-check summary: `/tmp/leadflow-commerce-visual-qa.log`.
- Screenshots: `/tmp/leadflow-commerce-top-{320,390,768,1440}.png`, `/tmp/leadflow-commerce-planner-{320,390,768,1440}.png`, and `/tmp/leadflow-commerce-kit-{320,390,768,1440}.png`.
- Temporary harness: `/tmp/leadflow-commerce-harness.cjs`; temporary visual runner: `/tmp/leadflow-commerce-visual-qa.cjs`.

The harness bundled the actual page and client planner, evaluated the actual catalog in Node, compiled the real global and module CSS, and served the real public image assets. It used ordinary anchor/image adapters for Next Link/Image and an Arial fallback for the Next-managed fonts. The checks cover the complete commerce page body. The shared site header/footer, production server rendering, Next image optimization, real intake delivery, payment settlement, and deployed URLs are separate integrated release checks owned by the parent task.

No main Next dev server or build was started for this QA, and no application source, pricing, payment logic, credentials, or account settings were changed.
