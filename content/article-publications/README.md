# Article publication receipts

This directory holds real evidence for the daily article workflow described in
`docs/article-drafting.md`. This README is not a publication receipt. Do not add
empty or invented receipts.

Use one JSON file per article named `YYYY-MM-DD-<slug>.json`. The date is its
intended America/Chicago publication date. Use these fields as evidence becomes
available; omit unverified sections.

| Field | Actual evidence to record |
| --- | --- |
| `schemaVersion` | `1` for this receipt shape. |
| `slug` | Exact authored article slug. |
| `publicationDate` | Valid date matching the article and middleware manifest. |
| `sourceChecks` | List of source URL, `checkedAt` ISO timestamp, and the claim it supports. |
| `contentCommit` | Full Git SHA containing the article that was actually checked. |
| `deployment` | Actual `id`, `url`, `status`, and `verifiedAt` ISO timestamp for that content commit. |
| `scheduledCheck` | Observed `checkedAt`, `detailStatus`, `ogStatus`, `noindex`, `indexAbsent`, `relatedAbsent`, and `sitemapAbsent` before the date. |
| `liveCheck` | Observed `checkedAt`, `url`, `httpStatus`, `bodyVerified`, `canonicalVerified`, `indexPresent`, and `sitemapPresent` after the date. |
| `issues` | Any failed or unresolved check, including observation time and the needed recovery. |

A receipt may first contain only source checks and the content commit. Add
verified deployment details later. A deployment marked READY is not a live
article receipt. `scheduledCheck` is only relevant before the date; do not
invent it for a same-day publication. `liveCheck` must describe an observed
production article, not a preview or a locally rendered page.

Record failed HTTP responses or checks as observed and leave the queue entry
scheduled until the production article is verified. Use actual booleans; do
not default omitted or failed checks to true. Preserve prior evidence, and
record significant corrections with a new timestamp in `issues` or an explicit
follow-up check rather than silently rewriting history.

These are repository records, not a public route. Keep them free of tokens,
private source notes, email lists, customer information, and payment data. Save
updates with the next content commit. Do not change `contentCommit` to the
receipt-only commit unless that commit was separately deployed and verified.
