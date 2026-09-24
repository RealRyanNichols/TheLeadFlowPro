# Longview directory: how the site pages work

The public half of the Longview Business Archive. The engine on the droplet
writes the publish export; the website renders it. The contract between them is
in `deploy/longview-archive/SPEC.md` ("The publish contract") and
`lib/longviewDirectory/types.ts`.

## Where things are

| Path | What |
| --- | --- |
| `content/longview-directory/directory.json` | The committed batch. Changes only through a merged pull request. |
| `content/longview-directory/suppressions.json` | Removal requests (`{ "ids": [...] }`). Hidden on the next deploy. |
| `lib/longviewDirectory/validate.ts` | Re-checks every contract rule; drops a broken record with a reason, never repairs it. |
| `lib/longviewDirectory/data.ts` | Reads both files once per server process, validates, applies suppressions. |
| `lib/longviewDirectory/query.ts` | Search, filters, pages, "new", "hiring", the indexing rules. |
| `lib/longviewDirectory/hours.ts` | "Open now" and hours text, in America/Chicago. |
| `lib/longviewDirectory/display.ts` | Labels, dates, Maps and mailto links, monogram colours, the crawler identity. |
| `lib/longviewDirectory/metadata.ts` | Page metadata and sitemap entries. |
| `app/longview/businesses/` | The routes. `components/longview/` holds the shared frame, cards, and CSS. |
| `scripts/validate-directory.ts` | The build gate (`npm run validate:directory`). |

## Routes

- `/longview/businesses`: search (a GET form, works without JavaScript),
  category and ZIP filters, "Open now", A to Z, 30 per page. 404 until a batch
  has at least one business.
- `/longview/businesses/category/<slug>`: one category, A to Z. 404 when unknown or empty.
- `/longview/businesses/<slug>`: a profile. 404 for an unknown slug.
- `/longview/businesses/new`: permits that started within 180 days before the batch.
- `/longview/businesses/hiring`: businesses with a careers page on their own site.
- `/longview/businesses/about`: always available, even with no data.

## Rendering choice

Thousands of profiles are expected, and the data changes only when a batch is
merged and deployed. Profiles are therefore rendered on their first request and
cached until the next deploy (`generateStaticParams` returns `[]`,
`dynamicParams` is true), which keeps every deploy of the whole site fast. The
list pages read the query string (filters, `?page=`), so they render per
request; that is cheap because the JSON is parsed once per server process.
`next.config.ts` ships the two JSON files with these routes and the sitemap.

## Honesty and privacy rules the pages enforce

- Only facts in the export, each listed under "Sources and checks" with its
  source, check date, and a link when the source has one. A missing fact
  shows an honest fallback.
- A record is dropped if a contact fact (website, phone, email, hours, social,
  careers, services) is not sourced from the business's own website, if an
  email is not a generic office inbox on the site's own domain, if a street is
  shown without a ZIP (or the reverse), if its slug is reserved, or if any other
  contract rule fails.
- No ratings, reviews, rankings, photos, or copied text. Cover art is an SVG
  monogram (category colour and initials).
- Nothing contacts a business. "Claim, correct, or remove" opens an email to
  the LeadFlow inbox (`BUSINESS.email.hello`).
- JSON-LD on a profile is a BreadcrumbList only; no LocalBusiness markup about
  other businesses.

## Indexing (an owner decision)

Every directory page is `noindex` and nothing is in the sitemap until the export
carries `"indexable": true` (engine setting `LVA_INDEXABLE=1`). Then the index,
category pages, and profiles that pass `isIndexable` (global switch on, not a
sample, business flagged indexable, at least one fact from its own website) go
into the sitemap. Filtered and paged list URLs stay `noindex`. The two catalog
entries in `lib/publicPageCatalog.ts` stay `index: false` until the owner flips
them as well.

## Local screenshots with the sample

```
LONGVIEW_DIRECTORY_FILE=tests/fixtures/longview-directory.sample.json npx next dev -p 3100
```

The override is read only outside production. Every page shows "Sample data:
fictional businesses for layout testing" while a sample file is loaded, and
`npm run validate:directory` refuses to pass a committed sample.

## Checks

- `npm test` includes `tests/longview-directory.test.ts` (contract drops,
  suppressions, search, Central-time hours across DST, "new", "hiring",
  indexing, sitemap, and that `CRAWLER_USER_AGENT` and the crawl limits on the
  about page match `deploy/longview-archive/longview_archive/config.py`).
- `npm run validate:directory` runs in `build` and `build:only`, right after
  `validate:facts`. It fails on any dropped record, a sample file, an unknown
  schema version, a slug collision, or an unreadable suppression list.
