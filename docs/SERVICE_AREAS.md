# Service areas and industry protection

Prepared October 3, 2026. The public page is `/service-areas`; the private operator editor is `/admin/service-areas`. This release targets the existing DigitalOcean website runtime.

## Private source review

The operator's private research records establish the exclusivity promise, a requested local-radius reduction, and the travel/equipment reasoning behind that request. Exact client identities, private conversations, source URLs, coordinates, and agreement details stay in the external private handoff and droplet store. They are never committed to this public repository or bundled into website code.

A city reference is an illustration, not an operating base. Existing promises remain private review records until their exact geography and services are reconciled. Publication permission and a separate approved broad-market display are required before any genuine record appears on the public map.

## Pipeline stages

| Stage                   | Public meaning                                           | Restriction                                  |
| ----------------------- | -------------------------------------------------------- | -------------------------------------------- |
| Agreement review needed | Hidden; reconcile an existing promise                    | Competing holds/protection require review    |
| Interest registered     | A verified, consented inquiry is pursuing a broad market | Does not reserve the area                    |
| Temporarily held        | A reviewed hold has an explicit expiration               | Blocks competing agreements until expiration |
| Client protected        | An approved agreement defines services and geography     | Blocks competing agreements in that scope    |
| Released                | Hidden from public inventory                             | No current restriction                       |

No invented signup counts or automatic sold statuses are used. Anonymous interest requires separate optional consent, verification, operator approval, and an expiration. Interest expires after 30 days by default. Public data never determines availability; every private commitment matters even when its public display is disabled.

## Intake and operator workflow

1. The form durably saves a private area request on the droplet. It does not send email/text, create a legacy CRM lead, or reserve territory. The editor labels CRM handoff as pending/manual.
2. Identical retries keep the same request ID. Identical normalized requests within 24 hours reuse one record. Meaningful service, coverage, radius, business, or consent corrections save separate private snapshots with fresh IDs. Reusing an ID for changed details is rejected. The daily limit remains five distinct requests per email.
3. In Territories, review incoming requests. Verify the business, requested work, broad geography, and permission. Confirm the operating base privately before protecting a radius. Unknown markets remain unresolved.
4. Select whole-industry or named-service exclusivity. Shared services can compete across industry labels, including earthwork for farm/ag, oilfield, and concrete businesses.
5. Add agreement evidence and verify the agreed base/states. A genuine temporary hold needs a deadline. Protection requires an approved agreement; the server rejects competing overlaps and unresolved prior promises.
6. Approve a separate anonymous public region and geometry. Public scope/radius must match the agreement; an approved broad-market center may differ by at most five miles. Do not publish a private base pin or identifying market label.
7. Complete CRM handoff and contact manually through the existing approved workflow. This feature does not claim that handoff or contact happened.
8. Review amendments before releasing territory. Check live ad targeting independently; editing this register does not change campaigns, delivery, exclusions, or spend.

Two circular territories overlap when the distance between their bases is less than the sum of both radii. A business outside another base's radius can still have a competing territory that overlaps it. State/radius checks include border crossings and require review for generalized-border uncertainty. National protection includes all 50 states and D.C.

## Geography and design

Responsive SVG maps use generalized official [2025 U.S. Census boundaries](https://www.census.gov/geographies/mapping-files/2025/geo/carto-boundary-file.html), including 254 Texas counties and separate-scale Alaska/Hawaii insets. City references and the 35/50-mile comparison are illustrations. No map key, paid tile provider, or new production dependency is introduced.

35 miles covers approximately 3,848 square miles; 50 miles covers approximately 7,854. Reducing the radius by 30% reduces circle area by 51%. This is geographic math, not an estimate of road distance, reachable customers, ad delivery, profit, or revenue.

## Files and storage

- Public/admin pages and local-only previews under `app/service-areas`, `app/admin/service-areas`, and `app/design-preview/service-areas`.
- UI under `components/service-areas`; pure geography/policy/retry code under `lib/service-areas`.
- Private persistence in `lib/service-areas/store.ts`; the public reader projects approved anonymous fields only.
- Intake and authenticated operator APIs under `app/api/service-areas` and `app/api/admin/service-areas`.
- Both APIs bound incoming streams before retaining, decoding, or parsing them: 10,000 UTF-8 bytes for a public inquiry and 450,000 bytes for an operator registry save. Missing or false Content-Length headers cannot bypass the byte limits.
- `scripts/service-area-store.ts` initializes/status-checks the private store. Reviewed commitments enter through an external private JSON file, never source code.
- Four focused test files: `tests/service-areas.test.ts`, `tests/service-area-inquiry-retry.test.ts`, `tests/service-area-store.test.ts`, and `tests/service-area-http.test.ts`.

The shared store uses an atomic JSON snapshot, a cross-process write lock, compare-and-swap revisions, and durable private audit history. It lives outside application releases at `/var/lib/leadflow-service-areas`. Directory mode is 0700; files are 0600 and owned by the website service user. Missing, invalid, exposed, or busy storage fails closed. No Supabase schema, data, auth, or service is added. The current existing operator sign-in gate remains unchanged during the platform switchover.

Read [QA](SERVICE_AREAS_QA.md) and [release notes](SERVICE_AREAS_RELEASE.md) before activation.
