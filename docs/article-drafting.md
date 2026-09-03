# The article drafting pipeline

How new articles get drafted on a schedule and published only after Ryan
approves them. Built September 2026, after the blog went three weeks without a
post while everything else on the site kept moving.

## The play every article runs

One trade, one question that trade types into Google, one honest answer, one
free tool embedded in the article that turns the answer into the reader's own
number, a lead form directly under the tool, and a FAQ. The tool steps emit
HowTo schema and the FAQ emits FAQPage schema, which is what earns the rich
results. This is the same play Premier Dental Academy runs with its free
training tools, and the same play every existing article on this site runs.

## The pieces

1. **The queue: `content/article-queue.json`.** Ordered list of upcoming
   articles: slug, trade, tool, the search question to win, a working title.
   Statuses move queued -> drafted -> published. Anyone can add entries; the
   test suite checks every entry points at a real tool, a free slug, and
   art that exists at 1200x630.

2. **The brief generator: `npm run draft:article`.** Deterministic. Picks the
   next queued entry, pulls the real copy and input fields out of the tool's
   definition, and emits a complete brief: voice rules, a paste-ready Article
   skeleton, the three `lib/articles-og.tsx` entries, and the ship checklist.
   `-- --claim` writes the brief to `drafts/<slug>-brief.md` and marks the
   queue entry drafted. `-- --slug <slug>` targets a specific entry.

3. **The writer.** A person or a Claude session takes the brief and writes the
   draft: the article body in Ryan's voice, the tool steps against the tool's
   real inputs, the trade-specific FAQ. The brief is grounding; the writing is
   the craft.

4. **The approval gate: a draft pull request.** The writer pushes a branch
   named `claude/article-draft-<slug>` and opens a DRAFT pull request. CI runs
   the same tests as always (distinct 1200x630 scene, headline, alt, schema
   inputs). Ryan reads it, edits it or asks for changes, and merging to main
   is publishing. Nothing auto-publishes. Ever.

## Art

Each article needs one distinct 1200x630 scene and the test suite enforces it.
The queue defaults every article to its embedded tool's OG card
(`/og/tools/<tool>.jpg`), which already exists, is already 1200x630, and is
distinct as long as each tool appears in the queue once. Ryan can replace any
of them later with a richer ChatGPT scene dropped at
`/images/articles-v4/<slug>.jpg` plus a one-line change in
`lib/articles-og.tsx`. Nobody generates images in this pipeline.

## The schedule

A weekly Claude Code Routine fires a fresh session that runs the whole loop:
pull main, run the brief generator with `--claim`, write the draft, validate,
push the branch, open the draft PR, and stop. Ryan gets the PR to approve.

If the Routine is ever missing (it can be recreated from any Claude session),
the same job can be scheduled anywhere that can run a Claude session, using
this prompt verbatim:

> Work in the RealRyanNichols/TheLeadFlowPro repo. Read
> docs/article-drafting.md and follow it exactly. Pull the latest main, run
> `npm run draft:article -- --claim`, and write the article the brief
> describes: Ryan's voice, no em dashes, no hype words, no invented numbers,
> the tool steps written against the tool's real inputs, a trade-specific FAQ.
> Add the three lib/articles-og.tsx entries the brief lists. Install
> dependencies with `NODE_ENV=development npm install --include=dev --no-audit
> --no-fund` if needed. Run `npm test` and `npm run build:only`; both must
> pass. Commit the brief, the queue change, and the article together, push the
> branch claude/article-draft-<slug>, and open a DRAFT pull request titled
> "Article draft: <final title>" describing the search question and the tool.
> Do not push to main. Do not merge. Stop after the draft PR exists.

## Voice rules, condensed

No em dashes. No hype words. No guaranteed outcomes or invented statistics.
Short lines, direct questions, first person. The tool gives a floor or a leak
size, never a promise. Two or three honest internal links. The reader is an
owner on a phone at night; every section has to earn the next thumb-scroll.

## Adding to the queue

Append to `content/article-queue.json`. Pick a trade plus a question, then the
tool that answers it (each tool once across the queue, because its OG card
becomes the article's scene). Run `npm test` to confirm the entry is valid.
