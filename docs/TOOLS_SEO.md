# Tools SEO

## URLs

- `/tools` the library
- `/tools/[slug]` one tool
- `/tools/collections/[slug]` a curated collection
- `/embed/[slug]` the iframe view, `noindex`
- `/tools/og-gallery` the preview gallery, development only, `noindex`

Slugs are permanent. `tests/fixtures/original-78-slugs.json` pins the original 78
and `tests/registry.test.ts` fails if any of them stops resolving. No redirects
were needed for this work because no live URL changed.

## Metadata

Every tool page emits a unique title, description, canonical, Open Graph block and
`twitter:card` of `summary_large_image`. Titles and descriptions come from
`seoTitle` and `seoDescription` when set, otherwise from the tool's own name,
type and description. There is no shared boilerplate title.

## Structured data

| Page | Emitted |
| --- | --- |
| `/tools` | `CollectionPage`, `BreadcrumbList`, `ItemList` of every published tool |
| `/tools/[slug]` | `WebApplication` with a zero-price `Offer`, `BreadcrumbList`, `HowTo` when steps render, `FAQPage` when FAQs render |
| `/tools/collections/[slug]` | `CollectionPage`, `BreadcrumbList`, `ItemList`, `FAQPage` |

`HowTo` and `FAQPage` are emitted only when that content is actually visible on
the page. Marking up hidden questions is how sites collect manual actions, so the
markup is generated from the same arrays the page renders.

## Social previews

`/tools` used to borrow `/og/free-build.jpg`, the "I will build your website
free" advert, which had nothing to do with a tool library. It now has its own
generated card, and so does every tool and every collection.

All cards are composed by `lib/tools/og.tsx` at exactly 1200 × 630. They use the
rendering system's own sans stack rather than a fetched webfont, so an OG route
cannot fail on a network call and leave a blank card in a feed. Titles are capped
by length so they can never push the footer off the canvas, and safe margins are
64px on all sides.

Review them all at once in development at `/tools/og-gallery`.

## Collections and thin pages

A collection is only routable when at least six published tools resolve into it
and it carries its own written intro, audience description, problem list and
FAQs. `PUBLISHED_COLLECTIONS` does that filtering, `generateStaticParams` reads
from it, and the sitemap reads from it. There is no way to publish a thin
programmatic collection page.

## Sitemap and robots

`app/sitemap.ts` includes every published tool and every published collection.
Unpublished tools are not in `TOOLS` at all, so nothing unfinished can leak into
the sitemap. `/embed` and `/admin` stay disallowed in `robots.ts`.

## Internal linking

Every published tool is reachable by normal navigation: from the directory grid,
from its collections, from the related-tools row on four other tool pages, and
from the search suggestions. Related tools are chosen by shared industry first,
then goal, then audience, then domain, which keeps a roofer's related row full of
things a roofer would use.

## Checks

`npm run validate:tools` and `npm test` cover slug stability, metadata
completeness, image presence and dimensions, related-link integrity, sitemap
inclusion and collection thresholds.
