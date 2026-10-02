# LeadFlow Idea Lab

Ryan's September 30, 2026 request supplies 23 X posts as inspiration for things
LeadFlow can make, design, build, and sell. The first local implementation turns
those sources into 11 evidence-linked workstreams and reusable operating logic.

The working interface is now coded at `/admin/idea-lab`, linked from Back
Office. A development-only preview is at `/design-preview/idea-lab` on localhost.
See [IDEA_LAB_RELEASE.md](./IDEA_LAB_RELEASE.md) for validation and release steps.
It does not represent 11 completed client products, an active agent fleet,
a deployed application, or collected revenue.

## What is implemented

- A reviewed, paraphrased source ledger for every supplied post, with dates,
  author links, practical applications, and material caveats.
- Canonical X/Twitter URL parsing and import deduplication by post ID. Imports
  require review; no content is invented from a URL or automatically fetched.
- One build packet per workstream: buyer, outcome, owner, existing implementation
  target, inputs, deliverables, acceptance, and next three moves.
- A deterministic workflow state machine with evidence requirements, bounded
  retries, a spending limit, and a final `approval_queue` state.
- A release-readiness evaluator and a 12-month scenario calculator that includes
  churn, operating costs, acquisition costs, and support effort.
- KPI definitions that distinguish collected payment, accepted delivery,
  contribution, and paid retention. Actual measured values remain unavailable.

## Run locally

From the canonical repository:

```sh
node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/idea-lab.ts summary
node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/idea-lab.ts export /absolute/path/to/a-new-review-directory
node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/idea-lab.ts import /absolute/path/to/bookmarks.txt
node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs --test tests/idea-lab.test.ts
```

The import command prints a reviewed-safe canonical import result; it does not
persist it automatically. It accepts one HTTPS X/Twitter post URL per line.
Duplicates, invalid URLs, and new sources are counted. Invalid raw values are
not included in output. New source records are `awaiting_review`.

The export command requires a new directory and generates a reviewed JSON
bundle, all 11 work packets, a source-by-source Markdown review, and explicitly
illustrative economics scenarios. No secrets or environment variables are
needed. No dependencies or provider SDKs were added.

## Design and creative production

The internal interface lets Ryan search and filter the reviewed sources,
import more links, edit source-linked briefs, save them, queue them for build
planning, download Markdown, and test economic assumptions. It uses the
Source Desk visual direction with connected queue and brief views, current
LeadFlow assets, and responsive layouts. Imported sources remain awaiting
review. Queuing never executes a provider, deployment, or external message.

## DigitalOcean integration

The DigitalOcean connector currently reports `leadflow-web` (ID `601212440`)
active in `nyc3`, with 4 vCPUs and 8 GiB RAM. This establishes infrastructure
inventory, not spare capacity, code parity, successful application routing, or
readiness for hundreds of concurrent agents.

The local canonical checkout has substantial pre-existing changes. This work
adds independent files and does not bundle those changes into a deployment.
The reviewed release procedure is in the Digital Ocean workspace under
`leadflow/RELEASE_PROCESS.md`; its validation stage and production activation
are separate. Current live service ownership, capacity, secret destinations,
and exact accepted release need fresh verification before hosted execution.

For a hosted implementation, use the existing authenticated Hub or admin
surface, Supabase RLS or the confirmed successor, and the existing OperatorOS
job/approval tables. Keep source content in private server storage. Pass only
reviewed public summaries into browser code. Preserve the existing scheduler
owner and avoid duplicate ingestion or message jobs.

Authenticated persistence is implemented through a per-admin Supabase table,
RLS policies, and optimistic revision checks. Its SQL migration is prepared,
not applied. The development preview saves in browser storage instead. The
remaining hosted phase is to validate the migration and authenticated saves,
review the exact release, deploy a private candidate, and verify it. Native journaling,
voice calling, provider execution, licensed data sales, and x402 settlement
each need their own real implementation and acceptance evidence.

## Source scope and commercial limits

Post text and visible quoted-post previews were read through signed-in X after
direct web requests returned 403. Full linked articles, videos, transcripts,
course material, app binaries, and trading systems were not audited. Primary
repositories and selected official program/payment documentation were checked.
Third-party income, performance, agent-count, and cost claims stay unverified.

Prioritize existing Tool Studio and FlowWorker scopes before inventing new
prices. The source's $99 website example is a scenario, not an approved LeadFlow
offer. Stripe payment collection and buyer acceptance must be verified
independently. No new prices, external messages, payments, accounts, secrets,
background tasks, or production services were changed.
