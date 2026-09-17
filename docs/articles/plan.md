# Article plan: local search targets for the agency lane

Status: plan and three first drafts for Ryan's review. Nothing here is
published. Drafts live in `docs/articles/drafts/` and move into the article
library (`lib/articles*.ts` and `content/article-publications/`) only after
Ryan approves the copy and a publication date.

Rules every article follows (same as the existing library):

- Practical, plain English, written to answer the search, not to fill space.
- No invented statistics, testimonials, rankings, or guarantees. Every number
  is either a published vendor price with a link, or an approved claim from
  `lib/site/claims.ts` with its as-of date.
- Prices for LeadFlow offers come from `lib/site/prices.ts` at publish time.
  The drafts write them as tokens (`{{price.websiteLaunchTotal}}`) so a price
  change never strands an article.
- One CTA per article, into the free-build application, the agency intake,
  or the free ChatGPT lesson. Never a wall of links.
- Local: Longview, Tyler, Marshall, Kilgore, and East Texas named where it is
  true, never stuffed.
- Every article carries the LocalBusiness organization schema through the
  existing article layout and links to at least one free tool.

## Targets

| # | Search intent | Working title | Primary CTA | Draft |
| - | --- | --- | --- | --- |
| 1 | web design Longview TX | What a business website in Longview should actually do (and what it should cost) | Free five-page website | `drafts/01-web-design-longview-tx.md` |
| 2 | Meta ads East Texas | Facebook and Instagram ads for East Texas businesses: what to set up before you spend a dollar | Agency intake (Meta ads) | `drafts/02-meta-ads-east-texas.md` |
| 3 | Google Ads management Longview | Google Ads for a Longview service business: tracking first, then spend | Agency intake (Google Ads) | `drafts/03-google-ads-management-longview.md` |
| 4 | business automation East Texas | The follow-up loop: how a small East Texas business automates without annoying anyone | Agency intake (Automation) | not drafted yet |
| 5 | ChatGPT for small business | ChatGPT for a small business: the first useful job to give it | Free ChatGPT lesson, then the workshop list | not drafted yet |

## Cadence

One article every two weeks after approval, in the order above, so each one
has time to be indexed before the next. Re-check each article's vendor prices
and any claim's `reviewBy` date before publishing.

## Measurement

First-party analytics: page views, scroll depth, tool clicks, and CTA clicks
per article (`/admin/analytics`). Google Search Console impressions and
clicks per target query after 60 days. No ranking promises internally either.
