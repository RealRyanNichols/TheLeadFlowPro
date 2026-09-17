# Article brief: pool-service-route-capacity

Generated 2026-09-17 by scripts/draft-article-brief.ts. Full pipeline and rules:
docs/article-drafting.md. This brief is grounding, not filler: everything under
"The tool's own copy" is the real text from lib/tools and should shape the
draft so the article and the tool tell one story.

## The assignment

- Working title: Your pool route has a ceiling. Find it before summer does.
- Search question it must win: How many pools can one service route actually handle?
- Trade: Pool service
- Slug: pool-service-route-capacity
- Intended publication date: 2026-09-18 (America/Chicago)
- Tool to embed: capacity-calculator (Job Capacity Calculator)
- Article scene (already exists, 1200x630): /og/tools/capacity-calculator.jpg
- Note: "capacity-calculator" is also embedded by /articles/electrician-job-capacity. Fine for a different trade, but do not copy that article's framing.

## The shape (same as every trade article)

Hook -> the honest answer -> {{TOOL}} -> what to do with the number -> FAQ.
Target 6 to 8 reading minutes. First person, Ryan's voice. The reader owns a
business in this trade (Pool service) and is reading on a phone at night.

## Voice rules (non-negotiable)

- No em dashes anywhere. Short lines. Punchy. Direct questions.
- No hype words (revolutionary, cutting-edge, seamless, game-changing).
- No guaranteed numbers, no invented statistics, no fake case studies.
  "Run your own numbers" is the whole point of the pattern.
- Do not oversell the tool. It gives a floor or a leak size, not a promise.
- Internal links where they are honest: the follow-up article, the missed
  calls article, /pricing, /free-build. Two or three, not ten.
- Welcome all ages and experience levels. Give the reader one useful task,
  a worked example, and a copyable prompt, checklist, or working tool.
- Verify changing product claims against current primary official sources.
  Link the sources near their claims and record when they were checked.

## The tool's own copy (ground the draft in this)

- Name: Job Capacity Calculator
- Tagline: How much work can you actually take?
- Description: Before you spend on marketing, find out whether you could even handle the calls. Then see what the ceiling on your revenue really is.
- Who it is for: Service businesses with crews, chairs, bays or trucks.
- The problem, as the tool states it: Marketing a business that is already at capacity just makes people mad at you. Marketing one with open slots prints money.
- The payoff, as the tool states it: Your true ceiling, your open slots, and what filling them is worth.

Inputs the reader will actually see (write the article's steps against these):
- Crews, chairs, bays or techs
- Productive hours per day
- Days per week
- Hours per job
- Jobs you actually do a week
- Average job value

FAQ text already shipped with the tool (do not contradict it; the article FAQ
should answer DIFFERENT questions, specific to pool service):
(none)

## Paste-ready skeleton for lib/articles-trades-3.ts (or a new trades module)

```ts
{
  slug: "pool-service-route-capacity",
  title: "TODO final title, the trade named in it",
  description: "TODO 140 to 160 characters, honest, includes the calculator",
  publishedAt: "2026-09-18",
  readingMinutes: 7,
  ogImage: "/og/tools/capacity-calculator.jpg",
  tool: {
    slug: "capacity-calculator",
    heading: "TODO imperative heading: work out / see / price your ...",
    intro: "TODO one or two sentences telling them to use real numbers",
    steps: [
      // 3 or 4 steps that walk the real inputs listed above, in order,
      // each one warning about the mistake this trade makes on that input.
      { name: "TODO", text: "TODO" },
    ],
    readIt: [
      // 2 or 3 bullets: what the output number is and is not, and the
      // decision it feeds. Never a promise.
      "TODO",
    ],
    formHeading: "TODO a question, not a command",
    formLead: "TODO: send me the number, I will tell you X straight, no call needed",
    interest: "blueprint",
    industry: "Pool cleaning and service",
  },
  faq: [
    // 3 or 4 questions this trade actually types into Google, answered
    // honestly. These emit FAQPage schema, so no fluff and no selling.
    { q: "TODO", a: "TODO" },
  ],
  body: `
TODO hook. Two or three short lines that name the trade's version of the pain.

## The honest answer

TODO.

{{TOOL}}

## What to do with the number

TODO three moves, bolded lead-ins, like every trade article.

## Where this normally leads

TODO close with the systems angle and one internal link.
`,
},
```

## Entries for lib/articles-og.tsx (all three required or the build throws)

```ts
// PREMIUM_ARTICLE_ART
"pool-service-route-capacity": "/og/tools/capacity-calculator.jpg",
// VISUAL_HEADLINES (3 to 6 words, not the title)
"pool-service-route-capacity": "TODO Short Verb Phrase",
// PREMIUM_ARTICLE_ALT (describe the actual OG card scene)
"pool-service-route-capacity": "TODO: A weekly schedule fills with job blocks up to a marked capacity line, leaving a small protected buffer.",
```

## Ship checklist

1. Finish the article and source checks. No TODOs, invented claims, or private
   notes may remain. Put {{TOOL}} on its own line and use its actual inputs.
2. Add the complete article and all three articles-og.tsx entries. Add
   "pool-service-route-capacity": "2026-09-18" to lib/articles-schedule.ts.
3. Mark the queue entry scheduled once the article is in the catalog with its
   date. This records intent, not successful deployment or live publication.
4. Run npm test and npm run build. Both must pass. Review the diff and check
   the article at 390px width, including the tool, form, and source links.
5. Publish the checked commit through the established production workflow
   under Ryan's authorization for daily articles. Preserve unrelated work.
   Verify the exact deployment is READY; a draft PR alone is not completion.
6. Record real evidence in content/article-publications/2026-09-18-pool-service-route-capacity.json,
   following docs/article-drafting.md. Leave unverified fields absent.
7. Before the intended date, verify 404 and noindex for the detail/OG URLs and
   no entry in the public index or sitemap. After the date arrives, verify
   the live article body, 200 response, canonical metadata, and public listing.
8. Mark published only after live verification and update the same receipt.
   Save receipt/status changes with the next content commit; do not claim a
   brief, build, commit, or READY deployment alone is a published article.
