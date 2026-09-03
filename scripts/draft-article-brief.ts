// The article draft generator.
//
// Run: npm run draft:article            (print the next brief, change nothing)
//      npm run draft:article -- --claim (also write drafts/<slug>-brief.md and
//                                        mark the queue entry "drafted")
//      npm run draft:article -- --slug junk-removal-cost-per-lead
//
// This is the deterministic half of the drafting pipeline described in
// docs/article-drafting.md. It picks the next queued entry from
// content/article-queue.json, pulls the real copy out of the tool's definition
// so the draft is grounded in what the tool actually asks and answers, and
// emits a complete brief: metadata, voice rules, a paste-ready Article
// skeleton, the articles-og.tsx entries, and the ship checklist.
//
// The prose itself is written by a person or a Claude session working from the
// brief. Nothing here publishes anything: publishing is a pull request Ryan
// approves, always.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ARTICLES } from "../lib/articles.ts";
import { getTool } from "../lib/tools/index.ts";
import { TOOL_VISUALS } from "../lib/tools/visuals.ts";

type QueueEntry = {
  slug: string;
  trade: string;
  industry: string;
  tool: string;
  searchQuestion: string;
  workingTitle: string;
  status: "queued" | "drafted" | "published";
  draftedAt?: string;
};

type Queue = { _readme: string[]; queue: QueueEntry[] };

const ROOT = process.cwd();
const QUEUE_PATH = join(ROOT, "content", "article-queue.json");

const args = process.argv.slice(2);
const claim = args.includes("--claim");
const slugFlag = args.indexOf("--slug");
const wantedSlug = slugFlag >= 0 ? args[slugFlag + 1] : null;

const queue: Queue = JSON.parse(readFileSync(QUEUE_PATH, "utf8"));

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
if (ARTICLES.some((article) => article.slug === entry.slug)) {
  problems.push(`article slug "${entry.slug}" already exists in lib/articles`);
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

const today = new Date().toISOString().slice(0, 10);
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
  publishedAt: "${today}",
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

1. Article added, {{TOOL}} on its own line, no em dashes anywhere in it.
2. All three articles-og.tsx entries added.
3. npm test passes (it checks the scene exists, is 1200x630, is distinct,
   and that the headline and alt entries are present).
4. npm run build:only passes.
5. Screenshot the article at 390px width and confirm the tool and form render.
6. Push a branch named claude/article-draft-${entry.slug}, open a DRAFT pull
   request, and stop. Ryan approves and merges. Never push this to main.
7. In the PR description: the working title vs final title, the search
   question, and a note that Ryan can swap the tool-card scene for a ChatGPT
   scene at /images/articles-v4/${entry.slug}.jpg later if he wants richer art.
8. Update content/article-queue.json: this entry's status becomes "drafted"
   (the --claim flag already did this if you used it).
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
