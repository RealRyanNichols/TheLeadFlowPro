# LeadRep Orchestration v0

The LeadFlow Pro uses LeadRep Orchestrator v0 to pass revenue work between Codex, GitHub, Supabase, Grok/xAI, and Vercel without auto-publishing or spending API credits by default.

## Connected Surfaces

- GitHub: `RealRyanNichols/TheLeadFlowPro`
- Vercel: `realryannichols/the-lead-flow-pro`
- Supabase: `https://hpzpwfymwfgwspaixrxi.supabase.co`
- Branch: `main`

## Loop

1. Codex opens or updates work on `main`.
2. GitHub Actions runs `npm install`, then `npm run build`.
3. The orchestrator script writes a handoff to Supabase `agent_handoffs` and `agent_runs`.
4. If approval is still required, the script stops and posts the exact Grok prompt to the GitHub handoff log.
5. If approval is cleared and `LEADREP_GROK_MODE=api`, Grok/xAI receives the prompt and returns structured lead-intelligence output.
6. Results are written to Supabase `agent_results`, with package concepts in `package_ideas` and signal findings in `predictive_signals` when present.
7. GitHub receives a handoff comment for Codex review.
8. Codex turns approved results into code, docs, dashboard changes, or issue updates.
9. Vercel builds and hosts the runtime. No production publish or outbound action is automatic.

## Agent Roles

- SignalScout: reads GitHub issues, lead-source URLs, campaign context, and source complaints.
- ProofRanker: ranks proof strength, public-source gaps, registry/license placeholders, and confidence.
- PredictivePulse: identifies urgency, repeatable demand, buyer type, and weekly recurring lead-drop categories.
- PackageCloser: turns approved signals into sellable package language, price anchors, and buyer next steps.
- Codex: reads GitHub issues, patches the repo, runs the build, pushes the PR/commit, and leaves the handoff note.
- GitHub Actions: repeatable runtime for install, build, handoff, comments, and dry-run prompts.
- Supabase: private agent bus, memory, run history, approval queue, predictive signals, and package ideas.
- Grok/xAI: optional reasoning layer for market patterns, package ideas, objections, and predictive signal review.
- Vercel: runtime and deployment surface after human-approved changes land on `main`.

Operating shorthand:

- Issues = tasks
- PR comments = handoff notes
- Actions = triggers
- Commits = proof of work

Routes:

- `/api/leadrep/handoff`
- `/api/leadrep/grok-result`
- `/dashboard/leadrep`

## Required Environment Variables

Server-side only:

```bash
XAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LEADREP_BUS_URL=https://hpzpwfymwfgwspaixrxi.supabase.co
LEADREP_BUS_SERVICE_KEY=
LEADREP_GROK_MODE=dry_run
LEADREP_APPROVAL_MODE=manual
GROK_MAX_DAILY_COST_USD=10
GITHUB_TOKEN=
```

Optional metadata:

```bash
LEADREP_GITHUB_REPOSITORY=RealRyanNichols/TheLeadFlowPro
LEADREP_VERCEL_PROJECT=realryannichols/the-lead-flow-pro
LEADREP_TARGET_AGENT=grok
```

Never prefix service keys or xAI keys with `NEXT_PUBLIC_`.

## Approval Gate

Default state is manual approval. The orchestrator must stop when `approval_required=true` or `LEADREP_APPROVAL_MODE=manual`.

Approval is required before:

- spending xAI credits
- publishing a page or package
- emailing, texting, posting, or contacting any lead
- changing pricing or checkout behavior
- pushing buyer-facing claims
- moving a package idea into a sellable offer

Dry-run mode is allowed to create GitHub comments with the exact Grok prompt to paste manually.

## 14-Day Grok Profitability Test

Run the first two weeks as a measured revenue test, not an open-ended AI spend.

Day 1 baseline:

- record current package inventory, traffic, conversion points, and recurring revenue
- set `GROK_MAX_DAILY_COST_USD=10`
- keep `LEADREP_GROK_MODE=dry_run` until the first approved API run

Daily checks:

- total xAI spend
- package ideas generated
- predictive signals accepted
- verified packages created
- conversion lifts or buyer replies tied to those packages
- rejected ideas and why they failed

Pass condition after 14 days:

- xAI spend is lower than attributable gross profit, or
- Grok-assisted packages create a repeatable conversion path Ryan wants to keep testing.

Fail condition:

- ideas are generic, unverifiable, not packaged into sellable assets, or cannot be tied to revenue.
- Grok only creates research notes and no sellable packages.

If the test fails, return to dry-run mode and keep Supabase/GitHub as the handoff bus without paid Grok calls.
