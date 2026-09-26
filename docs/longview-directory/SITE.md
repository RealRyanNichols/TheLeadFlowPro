# Longview directory: how the site pages work

The public half of the Longview Business Archive. Since Sept 24, 2026 the
directory is **built and served on the LeadFlow droplet**; nothing goes to
Vercel. The engine writes the publish export, a person (or auto-approve)
approves a batch, and the engine turns the approved batch into static pages that
Caddy serves. The contract is in `deploy/longview-archive/SPEC.md` ("The publish
contract"). The earlier Next.js pages were removed from this branch in commit
`1952c71`; their behaviour and copy were ported to the engine.

## Where things are

| Path | What |
| --- | --- |
| `deploy/longview-archive/longview_archive/site.py` | Renders every page, `directory.css`, `search.js`, `search.json`, and (when indexable) `sitemap.xml`; swaps the site in atomically. |
| `deploy/longview-archive/longview_archive/validate.py` | Re-checks every contract rule; drops a broken record with a reason, never repairs it (port of the old `validate.ts`). |
| `deploy/longview-archive/longview_archive/approval.py` | The approval gate: `approved.json`, auto-approve, the 25% removal hold, removal requests. |
| `deploy/longview-archive/caddy/longview-archive.caddy` | Serves `/longview/businesses/*` and the private `/status` pages. |
| `/var/lib/longview-archive/exports/publish/approved.json` | The only file the public pages render. |
| `/var/lib/longview-archive/www/longview/businesses` | The live pages (a link to the current build in `.builds/`). |

## Routes (all under `/longview/businesses/`)

- `/`: A to Z, 50 per page (`page-2/`, `page-3/`, ...), the real count,
  category links, New in Longview, Longview is hiring, About, and a search box
  with "Open now". The search is one small local script over `search.json`; the
  section stays hidden without JavaScript, and the list and category pages are
  plain links. With no approved batch: "The first batch is being checked".
- `category/<slug>/`: "X in Longview", A to Z, paginated the same way.
- `<slug>/`: a profile.
- `new/`: sales-tax permits that started within 180 days before the batch, newest first.
- `hiring/`: businesses with a careers page on their own site.
- `about/`: always there, even before the first batch.

## Honesty and privacy rules the pages enforce

- Only facts in the approved batch, each listed under "Sources and checks" with
  its source, check date, and a link when the source has one. A missing fact
  shows an honest fallback ("No website found yet.", "Hours not listed.",
  "Longview, TX" without a public street). "Closed" appears only for a day the
  business itself states closed.
- A record is dropped if a contact fact is not sourced from the business's own
  website, if an email is not a generic office inbox on the site's own domain,
  if a street is shown without a ZIP (or the reverse), if its slug is reserved,
  or if any other contract rule fails. The log carries counts only.
- Every value is HTML-escaped, outbound links are http/https only with
  `nofollow noopener noreferrer`, there are no inline styles or scripts, and
  nothing loads from another host (Caddy's policy allows only this site).
- No ratings, reviews, rankings, photos, or copied text. Cover art is an SVG
  monogram (category colour and initials).
- Nothing contacts a business. "Claim, correct, or remove this listing" opens
  an email to hello@theleadflowpro.com. A removal (`lva suppress`) takes the
  listing off at once.

## Indexing (an owner decision)

Every page carries `noindex,nofollow` and there is no sitemap until the
service runs with `LVA_INDEXABLE=1`. Then the pages drop noindex (page 2+ and
profiles without a fact from the business's own website keep it) and
`sitemap.xml` is written. The staging host also sends an `X-Robots-Tag: noindex`
header and a robots.txt that disallows everything; going public means a
separate approved change to the Caddy file and DNS.

## Local look with the sample

See `deploy/longview-archive/README.md` ("For engineers"): build the sample
export, then `site.build_site(...)`. Every page shows "Sample data: fictional
businesses for layout testing", and a sample is never approved.

## Checks

`cd deploy/longview-archive && python3 -m unittest discover -s tests`.
`tests/test_site.py` covers one h1 per page, local assets only, no inline
styles, escaping of planted markup, noindex and the sitemap, empty and sample
batches, pagination, category and profile content, the contract drops, the
atomic swap, the approval gate, and that the engine names no code host.
`tests/test_deploy.py` runs the real Caddy file (when `caddy` is installed) and
checks the routes and both security policies.
