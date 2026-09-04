# The daily article publishing workflow

Ryan has authorized one complete, useful LeadFlow article each day. Finish the
writing, validate it, deploy it through the existing production workflow, and
verify its release. An extra draft approval is not required for this authorized
workflow. A brief, draft PR, commit, or successful build is not a live article.
This authorization does not extend to email, social posting, or paid services.

## What a finished article gives the reader

Solve one real business problem in plain English. Give the reader a worked
example and something they can use: a copyable prompt, checklist, template, or
an existing working tool. Welcome all ages and experience levels. Lead with the
result, keep the next step simple, and use short paragraphs.

The trade queue follows one practical question, an honest answer, a working
tool, steps using the tool's real inputs, and relevant questions and answers.
Other articles can teach a task without a calculator. Use existing article
components. Structured data must match visible content; it does not guarantee
search placement or rich results.

Verify changing product claims against current primary official sources. Link
the source beside its claim and record when it was checked. Use no invented
statistics, revenue, customer results, capabilities, case studies, private
notes, or guarantees. No hype or em dashes. Keep public copy in LeadFlow's voice.

## Queue and brief

`content/article-queue.json` is the ordered trade queue. Its shared types and
catalog checks live in `lib/article-queue.ts`.

| Status | Meaning |
| --- | --- |
| `queued` | A topic is available; no article with this slug is in the authored catalog. |
| `drafted` | A brief or draft is in progress outside the authored catalog. |
| `scheduled` | The complete article is in the authored catalog with a valid publication date. Deployment and live verification are recorded separately. |
| `published` | The Central date has arrived and the production article has been independently verified live. |

A scheduled entry may stay scheduled after its date until the live check is
complete. Never infer publication from a clock, queue label, merge, or READY
deployment alone. Existing historical articles need not be added to this queue.

`npm run draft:article` prints a brief without changing files. It chooses the
next queued topic and the first uncovered calendar date on or after today in
America/Chicago. `npm run draft:article -- --claim` saves
`drafts/<slug>-brief.md` and marks the entry drafted. Use `--slug <slug>` to
resume a queued or drafted entry, and `--date YYYY-MM-DD` to choose an uncovered
date. Invalid dates, backdating, occupied dates, authored slugs, and attempts to
reset scheduled or published entries are rejected.

The brief pulls real tool labels and copy. It still contains TODOs and is not
publishable. Finish the prose and replace every placeholder before adding the
article to the catalog. Check existing branches and drafts before claiming a
topic; the brief command is not a distributed lock for concurrent writers.

## The daily run

The automation must be created through the app's supported automation tool.
This document does not create a schedule or prove a job is running. No Vercel
article-generation cron is currently configured.

1. Determine today in America/Chicago. Verify today's expected production
   article and update its existing receipt. If it is missing or broken, fix
   that gap first. Reconcile the authored catalog, date manifest, queue, and
   existing work to prevent duplicate topics, slugs, and dates.
2. Keep the next two days covered by checked, deployed articles. Complete at
   most one new article per run for the first uncovered date. Prefer finishing
   an existing draft over starting another. Report a gap if one run cannot
   restore the buffer; do not publish filler or silently backdate content.
3. Work from the latest production source in the task's authorized checkout.
   Preserve other active changes. Complete the article, source review, image
   mappings, date manifest, and queue state in one coherent content change.
4. Run the checks below, review the diff, and deploy through the established
   production path under the daily publishing authorization. Verify the exact
   commit and deployment, then verify either its future-date protection or
   its live public article. Save the real evidence in its receipt.
5. Reconcile the next release on the next daily run. A failed source check,
   broken build, or ambiguous deployment is a failed run, not a published
   article. Report the exact issue and recovery step. Do not weaken the checks
   to meet a publishing count.

The local automation needs its host to run. An already deployed article is
released by the site's request-time date checks, so the host does not need to
be awake at midnight for that article to appear.

## Dates and public routes

`ARTICLES` is the complete authored catalog, including future articles. Public
code must use `getPublishedArticles`, `getArticle`, or `getRelatedArticles`.
The helpers compute today in America/Chicago on each call. Do not capture
"today" once at module load or replace this with UTC date comparison.

Every new article's `publishedAt` must also appear in
`lib/articles-schedule.ts`. Its parity test protects the lightweight middleware
manifest. Before the intended date, the article detail and OG routes must return
404 with noindex and the article must be absent from the public index, related
articles, and sitemap. On or after that date, verify its body, canonical URL,
metadata, public listing, and sitemap. Keep the existing runtime date gates.

A scheduled page intentionally cannot be previewed through its public route
before its date. Use the existing local components and deterministic date tests
for pre-release review; never remove or weaken production gates to take a
screenshot. Complete the live mobile review once the article is available.

## Art and checks

Use a relevant existing 1200 by 630 image with an accurate headline and alt
text. The trade queue normally uses the embedded tool's OG card. Check the
actual image so an old event date or unrelated offer is not reused. The visual
tests require distinct scenes except for explicitly reviewed, relevant reuse
already listed in the tests. Do not add broad exceptions or generate paid art
just to meet the schedule.

Add the article body to an appropriate article module and import it into
`lib/articles.ts`. Add the three mappings in `lib/articles-og.tsx` and the date
in `lib/articles-schedule.ts`. Set its queue entry to scheduled when the full
article is in the catalog. That status permits pre-deployment checks; the
receipt distinguishes intended release, deployed release, and verified live
publication.

Run `npm test` and `npm run build`. The full build includes the tool and visual
validators. Run the repository's configured lint/type checks and review any new
failure. Inspect the diff for unintended code, credentials, and private data.
Check the article at mobile width, working tool/form behavior, source links,
readable prompts, and its call to action. Do not promote a build that failed.

Use the canonical workshop link only while the current event is relevant and
available: https://workshop.theleadflowpro.com/. Verify its actual details before
including dates, price, or availability. Do not leave an expired event as the
default call to action.

## Durable publication receipts

Use `content/article-publications/YYYY-MM-DD-<slug>.json`, with the article's
Central publication date in the filename. Follow
`content/article-publications/README.md`. Create a receipt only when real source
or release evidence exists. Never create a fake successful deployment or live
check to make a test pass.

Record the source checks and the exact content commit. After deployment, add the
actual deployment ID, URL, READY status, and verification time. For a future
date, add the observed 404/noindex and exclusion checks. After the date arrives,
add the actual live URL, response, body, metadata, index, and sitemap checks.
Only then move the queue entry to published.

Preserve earlier source/deployment evidence when updating a receipt. If a check
fails, record the observed result and issue instead of success. Keep unknown or
unverified fields absent. Do not store access tokens, private notes, recipients,
or personal data. Save receipt and status updates with the next ordinary content
commit; the receipt's content commit remains the commit that was actually
verified, not the later receipt-only change.
