# Verify and record the 45 tool guides

This check is for the September 6, 2026 authorized batch only. It never changes the September 7 locksmith or September 8 insurance article dates. A scheduled queue entry means authored, not verified live.

## Source of the exact 45

The script imports `TOOL_BUSINESS_ARTICLES` (18), `TOOL_GENERATOR_ARTICLES` (18), and `TOOL_HOUSEHOLD_ARTICLES` (9) from their actual `lib/articles-tool-*.ts` files. These are the same exports included in `lib/articles.ts`. It checks each slug, title, embedded tool and date against `docs/tool-article-coverage-plan-2026-09-06.json`; no second handwritten slug list is used.

Print the exact current list without network calls or writes:

```sh
node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/verify-tool-guide-batch.mjs list
```

## After production deployment is independently verified

First verify the actual Vercel deployment is READY, matches the current full Git commit, and serves `www.theleadflowpro.com`. The script does not log into Vercel or claim to validate a provider deployment record. Its deployment arguments record the operator's separately observed evidence.

Replace all four uppercase placeholders below with that observed evidence. The READY timestamp must be ISO 8601. The deployment URL is its actual `https://…vercel.app` URL, with no token/query string.

```sh
node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/verify-tool-guide-batch.mjs verify \
  --content-commit=FULL_DEPLOYED_GIT_SHA \
  --deployment-id=ACTUAL_VERCEL_DEPLOYMENT_ID \
  --deployment-url=ACTUAL_VERCEL_DEPLOYMENT_URL \
  --deployment-ready-at=ACTUAL_READY_ISO_TIMESTAMP \
  --report=/tmp/leadflow-45-guides-live.json
```

Verification is read-only against the fixed production domain. It fetches the article index and sitemap, then each guide, full Markdown download, and social PNG. It checks:

- Exactly 45 expected guides; no redirect or 404 accepted as publication.
- Full download text identical to the authored guide, steps, FAQ and attribution.
- Correct canonical URL, Open Graph title/image, structured article title/date, and no `noindex` on the public article.
- Actual links from the article index and to the embedded tool; presence in the sitemap.
- Distinct PNG hashes, all 1200 × 630 pixels.

The report saves observed results and a fingerprint of the authored batch. Failures produce exit code 1 and `allPassed: false`. Optional read-only verification can omit deployment arguments, but that report cannot mark publication without independently verified deployment evidence.

## Only after the release owner confirms verified live

Preview the publication record update:

```sh
node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/verify-tool-guide-batch.mjs mark --report=/tmp/leadflow-45-guides-live.json
```

The dry run writes nothing. The report must pass all 45 checks, match this checkout and authored content, and be less than 24 hours old. An explicit application step is required:

```sh
node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/verify-tool-guide-batch.mjs mark --report=/tmp/leadflow-45-guides-live.json --apply
```

This writes 45 individual publication receipts, sets only those queue entries to `published`, and records verified status in the tool-coverage plan. Existing source evidence and previous live checks are preserved. It does not alter article bodies/dates, change unrelated queue entries, post to social media, commit, or deploy anything.

Review the resulting diff. Preserve the checked content commit in receipts rather than changing it to a later receipt-only commit. The Git/deployment handoff remains with the release owner.

## Preparation checks

Before this script was handed off, the exact 45-source list loaded successfully, a valid in-memory fixture passed the report gate, 11 invalid or altered reports were rejected, and a dry-run fixture left the queue, coverage plan and receipt directory unchanged. Those were offline script tests, not live publication evidence. ESLint and formatting passed.

The historical GSC audit is preserved separately in `docs/gsc-404-triage-2026-09-06.json` and `.md`. Its recorded statuses describe the pre-release observation and must not be silently rewritten as post-release evidence.
