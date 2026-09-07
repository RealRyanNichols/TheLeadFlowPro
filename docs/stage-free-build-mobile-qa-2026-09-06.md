# Stage pages and Free Build mobile verification

Checked the clean production build at `http://127.0.0.1:3026` on September 6, 2026, after 11:16 p.m. America/Chicago. The root task owns deployment and final public verification.

- Eight stage routes returned 200: attention, website, lead-capture, crm, follow-up, sale, delivery, reporting.
- All eight original stage hero assets loaded and retained their existing paths.
- All eight stage choices remained present and within the viewport at 320, 390, 768, and 1440 pixels. Every route marked only its own stage as current. All 32 combinations had no horizontal page or stage-menu overflow.
- Free Build passed the same four widths. Its new hero loaded, every tier card and form control fit the viewport, and the form inputs remained at least 16 pixels to avoid mobile input zoom.
- Switching to the $997 optional request and back to the $0 application updated the selected state and form heading correctly.
- A fictional free application reached the success state. Playwright intercepted `/api/leads` locally, verified the selected $0 tier, required contact payload, and default unchecked optional consent. This test sent no real lead, email, or charge. It verifies client behavior; production delivery is handled in the separate buyer/lead verification work.
- No browser page errors occurred during the production-preview pass.
- Reporting displayed actual cached daily-source observations: PDA 4,838 page-view records and 225 lead records; RRN 8,535 and 33, observed at 11:16 p.m. CDT. The implementation fetches the sources; these dated counts are not hardcoded into the page. Charts and copy distinguish activity records from unique customers or revenue.

## Visual inspection

Inspected the phone stage grid, website example output, actual reporting panels, Free Build hero, and application controls. Cream backgrounds, branded purple/gold accents, and framed cards remain consistent. The new Free Build artwork is an actual generated image; the page also preserves functional HTML controls and states its illustrative status.

Screenshots and raw local QA results:

- `/tmp/lfp-stage-qa-screenshots/stage-navigation-mobile.png`
- `/tmp/lfp-stage-qa-screenshots/website-output-mobile.png`
- `/tmp/lfp-stage-qa-screenshots/reporting-mobile.png`
- `/tmp/lfp-stage-qa-screenshots/free-build-hero-mobile.png`
- `/tmp/lfp-stage-qa-screenshots/free-build-desktop.png`
- `/tmp/lfp-stage-qa-screenshots/free-build-fields-mobile-viewport.png`
- `/tmp/lfp-stage-qa-results.json`

Targeted ESLint and `git diff --check` passed. An earlier local dev/build collision was stopped and discarded; the results above are from the subsequent clean production build only.
