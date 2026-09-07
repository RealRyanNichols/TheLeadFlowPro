# Search and business proof verification

Observed September 6, 2026, Central time. These are dated observations, not hardcoded website statistics. The public board continues to request aggregate feeds with a 15-minute cache.

## Public crawl

The production crawl completed at 2026-09-07T02:02:54Z against https://www.theleadflowpro.com.

- 216 distinct sitemap pages returned HTTP 200.
- Every sitemap page had its expected canonical and no accidental `noindex` instruction.
- 224 public internal destinations were checked. No confirmed broken public destination was found.
- The article's linked MP4 returned HTTP 200 and `video/mp4` in a separate HEAD check after the HTML crawler could not interpret the media response.
- Private routes, query links, and download bodies were excluded. This proves crawlable page responses, not Search Console indexing or rankings.
- Full dated results: `docs/live-public-seo-check-2026-09-06.json`.
- New article publication is being handled separately; this is the deployed 216-page baseline before that release.

## Search Console verification

After this worker's browser initialization failed, the root task recovered authenticated Google Search Console access and verified the property on September 6, 2026:

- Page indexing report: 190 indexed URLs and 130 excluded URLs, with report data updated September 3.
- Submitted sitemap: Success, last read September 6.
- The excluded report includes 53 legacy URLs reported as not found. The root task is reviewing their exact paths before adding any justified redirects. Exclusion alone is not a reason to redirect an unrelated URL or remove a deliberate private-page `noindex`.

These observations are from Search Console's dated reports, not a claim that the new release is already indexed. GA4 stream discovery remains separate from Search Console verification; no measurement ID was invented.

## Current business proof

Only aggregate queries and relevant schema/SQL definitions were read. No individual names, emails, phone numbers, messages, medical, case, political, or evidence content were returned or published.

Window: August 8 through September 6, 2026, America/Chicago. Source observation: approximately 8:44 p.m. Central on September 6.

| Metric | Premier Dental Academy | RealRyanNichols.com |
|---|---:|---:|
| Page-view records | 4,821 | 8,504 |
| Daily visitors, summed | 2,239 | 5,757 |
| Recorded clicks/actions | 360 | 6,601 |
| Main-feed contact/lead records | 225 | 33 |
| Ad-attributed lead records | 34 | Not classified by feed |
| Call records | 127 | Not tracked by feed |
| Payment records | 7 | 48 |

PDA's seven current-window purchase records are marked completed, have positive amounts, and have Square/external payment references. RRN's 48 current-window records are paid positive-amount book orders with 48 live Stripe checkout references and no test checkout references. These are database payment records, not independently reconciled provider settlements, unique buyers, enrollments, or fulfilled orders. No dollar amounts were queried or displayed.

PDA payment-count display is now enabled under Ryan's explicit named-business authorization. Both business pages state their exact payment source/status definitions and creation-date basis. Their existing source RPCs remain unchanged.

## Coverage beyond the main lead feed

The main feeds did not include every capture table. Adding all table counts would overstate results because many records overlap.

- PDA: 78 subscriber records in the window; 76 have an email already present in lead intake. Two distinct valid subscriber emails are absent from the lead feed. One enrollment-form record adds no further distinct email after comparison with lead and subscriber history.
- RRN: primary sources contain 15 book email signups, 16 notification signups, two reader signup records, and zero contact-bearing chat requests. A separate contact table has six records in the window, four with email. Three emails overlap primary source history; one distinct valid email is additional. Anonymous records are not treated as additional email contacts.

Applied additive aggregate-only functions:

- `docs/sql/pda-scoreboard-capture-coverage-2026-09-06.sql`, target `lmbsuwslsycukynzpzik` only.
- `docs/sql/rrn-scoreboard-capture-coverage-2026-09-06.sql`, target `rpchhzncxigczfojfdtc` only.

Their SELECT bodies were first executed read-only against the respective databases and returned the exact counts above. On September 6, the root task then applied both functions to their corresponding projects and verified their aggregate output under the `anon` role. The deployed functions use an empty `search_path` and explicitly qualified objects. They do not alter existing daily feeds, contact rows, or table permissions. They expose only constant source labels, counts, and the observation window.

The new public source panel displays each stream separately. It never adds overlapping records into a claimed unique-person total. Additional emails are deduplicated case-insensitively within supplementary streams and compared with all primary source history; enrollment extras also exclude subscriber history. An email is not proof of a unique person. If the new function is absent or malformed, the panel says unavailable rather than showing zeros.

## Corrected Google Business Profile guidance

The GBP Scorecard previously treated arbitrary photo/review thresholds and posting frequency as if they were ranking requirements, promised a zero cost and predicted fix time, and required old messaging/Q&A features. It now measures the reader's confirmed checklist coverage, starts unverified, rejects invalid check IDs, describes optional feature availability, and gives practical actions without predicting rankings or calls.

Primary sources checked September 6, 2026:

- [Google local ranking guidance](https://support.google.com/business/answer/7091?hl=en): relevance, distance and prominence; no promised ranking position.
- [Google Business Profile chat options](https://support.google.com/business/answer/15013580?hl=en): WhatsApp/SMS availability varies by region and profile.
- [Google's chat and call-history retirement notice](https://support.google.com/business/answer/14919056?hl=en): legacy chat/call history ended July 31, 2024.
- [Google business representation guidance](https://support.google.com/business/answer/3038177?hl=en): accurate details and only relevant categories.
- [Google review guidance](https://support.google.com/business/answer/3474122?hl=en): genuine experience, no review incentives, helpful replies.

## Checks

18 focused GBP and scoreboard tests passed. Changed TypeScript lint and whitespace checks passed. The root task applied and verified the two coverage functions. It owns the combined production build, release and post-release live checks.
