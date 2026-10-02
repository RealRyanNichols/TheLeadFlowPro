# Idea Lab interface and release record

## Location and current state

- Website route: `/admin/idea-lab`, linked as **Idea Lab** from Back Office.
- Working local preview: `http://127.0.0.1:3217/design-preview/idea-lab`.
- Canonical code: `/Users/ryannichols/LeadRepCodexSwarm/repos/TheLeadFlowPro`.
- Release preparation on October 1 uses the live DigitalOcean base
  `ddeb3727f7e8e1f3d9ee9d0fa1df62aec2f475f4`. Activation and the hosted
  migration are pending at source-commit time. Final acceptance is recorded
  separately in the DigitalOcean release receipt.
- The 23 reviewed sources and 11 specifications are included. The 11 client
  products are not represented as built, verified, sold, or deployed.

## Implemented behavior

Sources support search, sorting, review filters, original post links, caveats,
and source-to-brief navigation. Import accepts one HTTPS X/Twitter post URL per
line, deduplicates by post ID, rejects invalid URLs, and persists new sources
as awaiting review. Imported posts are not automatically fetched or reviewed.

Briefs support buyer, outcome, scope, and acceptance edits. Save and queue
actions retain these drafts. Editing a queued brief returns it to draft status;
queueing is planning only. Markdown exports carry edited fields, original
source links, caveats, and pending implementation/verification status.

Results deliberately show **Not measured** for actual payment and delivery
metrics. The adjustable scenario models churn, vendor costs, acquisition,
support effort, labor, and fixed cost. It does not change pricing or claim
collected revenue.

The browser preview stores drafts locally on this device. The admin route uses
authenticated APIs and private per-owner Supabase storage. Storage failures
remain visible; the app never silently falls back to browser storage in the
admin route. Other-tab revision conflicts reject overwrites.

## Changed files

New interface and routes:

- `components/idea-lab/IdeaLab.tsx`
- `components/idea-lab/idea-lab.module.css`
- `app/admin/idea-lab/page.tsx`
- `app/api/admin/idea-lab/route.ts`
- `app/api/admin/idea-lab/export/route.ts`
- `app/design-preview/idea-lab/page.tsx`
- `app/design-preview/idea-lab/export/route.ts`

Persistence, export, security, and verification:

- `lib/ideaLabWorkspace.ts`
- `lib/ideaLabExport.ts`
- `lib/ideaLabHttp.ts`
- `supabase/migrations/20260930210000_idea_lab.sql`
- `tests/idea-lab-workspace.test.ts`
- `tests/idea-lab-export.test.ts`
- `scripts/idea-lab-rls-fixture.sql`

Integration against the current deployed source adds the Idea Lab link and
workspace attributes to `app/admin/layout.tsx`, and excludes the development
preview from `lib/analytics/privacy.ts`. The existing deployed tracking guards
already exclude every admin route; no old tracker or Vercel metrics wrapper is
copied over them. Root layout, checkout, pricing, public copy, and schedulers
are preserved.

`package-lock.json` receives only two brace-expansion security patch updates:
1.1.18 to 1.1.21 and 5.0.9 to 5.0.12. The full dependency audit must pass again
on the destination. No new dependency is introduced.

The reviewed catalog and CLI are in `lib/ideaLab.ts`, `scripts/idea-lab.ts`, and
`tests/idea-lab.test.ts`. They use the deployed `lib/toolStudio.ts`; the old
local copy is not shipped. The owned Idea Lab logo is included. The original
canonical checkout's unrelated changes remain preserved.

## Validation

- Prettier 3.6.2 applied to new interface, route, library, and test files.
- Scoped ESLint clean, including touched integration files.
- `npm test`: 435 passed, zero failures. Six workspace tests and four export/
  origin tests were added, alongside the seven existing Idea Lab logic tests.
- `npm run build`: passed; 469 pages generated. Existing unrelated image and
  LoginForm lint warnings remain.
- Whole-repository `tsc --noEmit`: only three pre-existing errors in
  `tests/diagnostic-notifications.test.ts` lines 65, 66, and 68 (`url`/`init`
  on `never`). Do not describe the whole-repository standalone typecheck as
  passing.
- `git diff --check`: clean.
- Browser search, selection, empty search, import feedback, edit/save,
  reload persistence, queueing, numeric validation, and scenario recalculation
  tested. The zero-churn example gives $35,640 month-12 hypothetical gross.
- A real file was downloaded and read at
  `/Users/ryannichols/Downloads/leadflow-concierge-brief.md`; its edited buyer
  and source caveats were preserved. An initial Blob export stalled in the
  in-app browser. Direct authenticated HTTP attachments replaced it.
- Desktop visual and mobile layout review: project-root `design-qa.md`.
- No browser console errors in the final functional checks.

A production-mode local server independently returned:

| Request                                           | Result                              |
| ------------------------------------------------- | ----------------------------------- |
| GET `/admin/idea-lab` without sign-in             | 307 to login, preserving next route |
| GET/PUT `/api/admin/idea-lab` without sign-in     | 401                                 |
| POST `/api/admin/idea-lab/export` without sign-in | 401                                 |
| GET `/design-preview/idea-lab`                    | 404                                 |
| POST `/design-preview/idea-lab/export`            | 404                                 |

## Hosted release prerequisites

No new service, dependency, paid infrastructure, or secret environment variable
was introduced. Existing Supabase configuration and the current admin role
remain required.

1. Prepare a feature-only candidate against the currently accepted DigitalOcean
   release. Include catalog dependencies and current owned logo assets; do not
   assume the dirty local checkout equals production.
2. Validate the prepared migration in staging before applying it to the
   confirmed LeadFlow database. RLS and compare-and-swap SQL were reviewed,
   but were not executed against a database during this UI build.
3. Test authenticated save/reload, two-tab conflicts, ordinary-user denial,
   and isolation between two admin accounts. Confirm storage failure feedback.
4. Review the exact release and obtain production approval under `AGENTS.md`:
   “Production deploys stay approval-gated.”
5. Use the established DigitalOcean candidate/activation procedure. Verify
   the real domain, login, save, export, and neighboring admin routes after
   activation. Preserve the previous release for rollback.

Privacy boundaries: imported URLs and private drafts are authenticated; source
imports perform no network retrieval; draft contents are not put in URLs,
marketing analytics, or logs. Supabase admin/owner RLS must pass before hosted
storage is described as accepted. Exports are private no-store attachments.

## October 1 database validation

The exact migration passed on the droplet's PostgreSQL 17 in a disposable
validation database. All fixtures and temporary roles were rolled back and
the validation database was removed. Assertions cover own-account insert/read/
update, two-admin isolation, cross-owner RPC/insert/update denial, ordinary-
member denial, anonymous table/function denial, duplicate initial saves,
stale revisions, and oversized documents. Hosted Supabase acceptance remains
a separate post-migration check; no production account or profile was created.

The latest owner instruction to retain hosted Supabase in the DigitalOcean
migration ledger supersedes the older September 26 retirement note in
`CLAUDE.md`. The current website still uses that existing database and login
service. This release extends that integration without changing providers.

## October 1 isolated candidate checks

The feature-only candidate passed its complete production build against the
current deployed source and lockfile (Next 15.5.26), plus 2,126 existing and
Idea Lab tests. Five additional API-boundary tests pass, covering access denial,
owner-derived queries/writes, visible storage failure, malformed/cross-site
requests, and HTTP 409 revision conflicts. The destination runs the complete
suite again for the exact final SHA.

Compatibility updates replace a retired preview-workstream target with the
current services and Website Launch paths; preserve the existing mobile nav
assertions while accounting for workspace attributes; freeze the clock in an
existing follow-up test; and allow the catalog's existing, exact external
SellerProof subscription destination in its URL test. These test corrections
change no call-card behavior, public offer, or pricing.

Destination validation uses the established validator with only these added
resource controls: MemoryHigh 2G, MemoryMax 2500M, MemorySwapMax 256M, CPUQuota
150 percent. Install, full high-severity audit, complete tests, production build,
unchanged-source checks, and the reviewed client-secret scan remain mandatory.
The prior release remains retained. No scheduler, DNS, or provider-secret change
is part of this release.

Final candidate preparation: all 2,131 tests, scoped lint, standalone
TypeScript check, and the complete 488-page production build pass. Existing
unrelated image warnings remain. No new typecheck error or skipped test is
accepted in this candidate. The older local-preview typecheck limitation
above refers only to that old checkout, not this isolated release.
