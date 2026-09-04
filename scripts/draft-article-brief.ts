// The article draft generator.
//
// Run: npm run draft:article            (print the next brief, change nothing)
//      npm run draft:article -- --claim (also write drafts/<slug>-brief.md and
//                                        mark the queue entry "drafted")
//      npm run draft:article -- --slug junk-removal-cost-per-lead
//      npm run draft:article -- --date 2026-09-07
//
// This is the deterministic half of the drafting pipeline described in
// docs/article-drafting.md. It picks the next queued entry from
// content/article-queue.json, pulls the real copy out of the tool's definition
// so the draft is grounded in what the tool actually asks and answers, and
// emits a complete brief: metadata, voice rules, a paste-ready Article
// skeleton, the articles-og.tsx entries, and the ship checklist.
//
// This command does not publish. The authorized daily workflow completes the
// article, checks and deploys it, then verifies its dated release separately.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ARTICLES } from "../lib/articles.ts";
import { centralPublicationDate, isPublicationDate } from "../lib/article-publication.ts";
import { nextArticlePublicationDate, type ArticleQueue } from "../lib/article-queue.ts";
import { getTool } from "../lib/tools/index.ts";
import { TOOL_VISUALS } from "../lib/tools/visuals.ts";

const ROOT = process.cwd();
const QUEUE_PATH = join(ROOT, "content", "article-queue.json");

const args = process.argv.slice(2);
const claim = args.includes("--claim");
const slugFlag = args.indexOf("--slug");
const wantedSlug = slugFlag >= 0 ? args[slugFlag + 1] : null;
const dateFlag = args.indexOf("--date");
const wantedDate = dateFlag >= 0 ? args[dateFlag + 1] : null;
if ((slugFlag >= 0 && (!wantedSlug || wantedSlug.startsWith("--")))
  || (dateFlag >= 0 && (!wantedDate || wantedDate.startsWith("--")))) {
  console.error("Pass a value after --slug and a YYYY-MM-DD value after --date.");
  process.exit(1);
}

const queue: ArticleQueue = JSON.parse(readFileSync(QUEUE_PATH, "utf8"));
const now = new Date();
const today = centralPublicationDate(now);
const publicationDate = wantedDate ?? nextArticlePublicationDate(ARTICLES, now);

const entry = wantedSlug
  ? queue.queue.find((item) => item.slug === wantedSlug)
  : queue.queue.find((item) => item.status === "queued");

if (!entry) {
  console.error(
    wantedSlug
      ? `No queue entry with slug "${wantedSlug}".`
      : "The queue has no entries with status \"queued\". Add more to content/article-queue.json.",
  );
  process.exit(1);
}

// ---------------------------------------------------------------- validate --

const problems: string[] = [];
if (entry.status !== "queued" && entry.status !== "drafted") {
  problems.push(`entry is already ${entry.status}; do not reset an authored article to drafted`);
}
if (ARTICLES.some((article) => article.slug === entry.slug)) {
  problems.push(`article slug "${entry.slug}" already exists in lib/articles`);
}
if (!isPublicationDate(publicationDate)) {
  problems.push("publication date must be a real YYYY-MM-DD calendar date");
} else if (publicationDate < today) {
  problems.push("do not backdate a new article before today in America/Chicago");
} else if (ARTICLES.some((article) => article.publishedAt === publicationDate)) {
  problems.push(`an article is already authored for ${publicationDate}; verify it instead of duplicating the day`);
}
const tool = getTool(entry.tool);
if (!tool) problems.push(`tool "${entry.tool}" is not a published tool slug`);
const visuals = TOOL_VISUALS[entry.tool];
if (!visuals) problems.push(`tool "${entry.tool}" has no visuals entry, so no OG card exists`);
const toolReused = ARTICLES.find((article) => article.tool?.slug === entry.tool);

if (problems.length || !tool || !visuals) {
  console.error(`Cannot brief "${entry.slug}":`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const artPath = visuals.ogImage; // /og/tools/<tool>.jpg, always 1200x630

const fieldLines = tool.fields
  .map((field) => `- ${field.label}${"help" in field && field.help ? ` (help text: ${field.help})` : ""}`)
  .join("\n");

const toolFaqs = (tool.faqs ?? [])
  .map((faq) => `- Q: ${faq.q}\n  A: ${faq.a}`)
  .join("\n");

// ------------------------------------------------------------------ brief --

const brief = `# Article brief: ${entry.slug}

Generated ${today} by scripts/draft-article-brief.ts. Full pipeline and rules:
docs/article-drafting.md. This brief is grounding, not filler: everything under
"The tool's own copy" is the real text from lib/tools and should shape the
draft so the article and the tool tell one story.

## The assignment

- Working title: ${entry.workingTitle}
- Search question it must win: ${entry.searchQuestion}
- Trade: ${entry.trade}
- Slug: ${entry.slug}
- Intended publication date: ${publicationDate} (America/Chicago)
- Tool to embed: ${entry.tool} (${tool.name})
- Article scene (already exists, 1200x630): ${artPath}
${toolReused ? `- Note: "${entry.tool}" is also embedded by /articles/${toolReused.slug}. Fine for a different trade, but do not copy that article's framing.` : "- This tool is not embedded by any existing article."}

## The shape (same as every trade article)

Hook -> the honest answer -> {{TOOL}} -> what to do with the number -> FAQ.
Target 6 to 8 reading minutes. First person, Ryan's voice. The reader owns a
business in this trade (${entry.trade}) and is reading on a phone at night.

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

- Name: ${tool.name}
- Tagline: ${tool.tagline}
- Description: ${tool.description}
- Who it is for: ${tool.who ?? "(not stated)"}
- The problem, as the tool states it: ${tool.problem ?? "(not stated)"}
- The payoff, as the tool states it: ${tool.payoff ?? "(not stated)"}

Inputs the reader will actually see (write the article's steps against these):
${fieldLines}

FAQ text already shipped with the tool (do not contradict it; the article FAQ
should answer DIFFERENT questions, specific to ${entry.trade.toLowerCase()}):
${toolFaqs || "(none)"}

## Paste-ready skeleton for lib/articles-trades-3.ts (or a new trades module)

\`\`\`ts
{
  slug: "${entry.slug}",
  title: "TODO final title, the trade named in it",
  description: "TODO 140 to 160 characters, honest, includes the calculator",
  publishedAt: "${publicationDate}",
  readingMinutes: 7,
  ogImage: "${artPath}",
  tool: {
    slug: "${entry.tool}",
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
    industry: "${entry.industry}",
  },
  faq: [
    // 3 or 4 questions this trade actually types into Google, answered
    // honestly. These emit FAQPage schema, so no fluff and no selling.
    { q: "TODO", a: "TODO" },
  ],
  body: \`
TODO hook. Two or three short lines that name the trade's version of the pain.

## The honest answer

TODO.

{{TOOL}}

## What to do with the number

TODO three moves, bolded lead-ins, like every trade article.

## Where this normally leads

TODO close with the systems angle and one internal link.
\`,
},
\`\`\`

## Entries for lib/articles-og.tsx (all three required or the build throws)

\`\`\`ts
// PREMIUM_ARTICLE_ART
"${entry.slug}": "${artPath}",
// VISUAL_HEADLINES (3 to 6 words, not the title)
"${entry.slug}": "TODO Short Verb Phrase",
// PREMIUM_ARTICLE_ALT (describe the actual OG card scene)
"${entry.slug}": "TODO: ${visuals.heroImageAlt ?? visuals.visualConcept ?? "describe the tool scene"}",
\`\`\`

## Ship checklist

1. Finish the article and source checks. No TODOs, invented claims, or private
   notes may remain. Put {{TOOL}} on its own line and use its actual inputs.
2. Add the complete article and all three articles-og.tsx entries. Add
   "${entry.slug}": "${publicationDate}" to lib/articles-schedule.ts.
3. Mark the queue entry scheduled once the article is in the catalog with its
   date. This records intent, not successful deployment or live publication.
4. Run npm test and npm run build. Both must pass. Review the diff and check
   the article at 390px width, including the tool, form, and source links.
5. Publish the checked commit through the established production workflow
   under Ryan's authorization for daily articles. Preserve unrelated work.
   Verify the exact deployment is READY; a draft PR alone is not completion.
6. Record real evidence in content/article-publications/${publicationDate}-${entry.slug}.json,
   following docs/article-drafting.md. Leave unverified fields absent.
7. Before the intended date, verify 404 and noindex for the detail/OG URLs and
   no entry in the public index or sitemap. After the date arrives, verify
   the live article body, 200 response, canonical metadata, and public listing.
8. Mark published only after live verification and update the same receipt.
   Save receipt/status changes with the next content commit; do not claim a
   brief, build, commit, or READY deployment alone is a published article.
`;

// ----------------------------------------------------------------- output --

if (claim) {
  mkdirSync(join(ROOT, "drafts"), { recursive: true });
  const briefPath = join(ROOT, "drafts", `${entry.slug}-brief.md`);
  writeFileSync(briefPath, brief);
  entry.status = "drafted";
  entry.draftedAt = today;
  writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`);
  console.log(`Brief written to drafts/${entry.slug}-brief.md`);
  console.log(`Queue entry "${entry.slug}" marked drafted.`);
} else {
  console.log(brief);
  console.log("\n(dry run: pass --claim to write the brief file and mark the queue)");
}
