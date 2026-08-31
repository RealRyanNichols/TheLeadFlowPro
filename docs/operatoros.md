# The LeadFlow Pro OperatorOS v1

OperatorOS is the shared operating layer behind the LeadFlow Pro AI-worker product.

It is built around four rules:

1. Real business records drive the work.
2. ChatGPT and Claude are the only AI providers in the system.
3. Every run creates a durable event trail.
4. Consequential actions stop for a human decision.

## What ships in v1

- A private OperatorOS workspace for The LeadFlow Pro
- Missions with transparent controls and a live score
- Installable Skills with triggers, instructions, finish criteria, forbidden actions, provider, model, and risk lane
- AI Workers with working, waiting, blocked, and offline states
- Runs, context snapshots, provider decisions, failures, and completion records
- A human approval stopline
- Supabase Realtime updates with a 15-second fallback refresh
- A Teach My Job form that creates a Skill and assigns a new Worker
- A public `/operatoros` offer page
- Direct OpenAI Responses API and Anthropic Messages API adapters using native server-side fetch

## Safety boundary

OperatorOS v1 can:

- Read approved business records
- Build anonymized operating context
- Identify bottlenecks
- Prioritize work
- Produce internal recommendations
- Create approval requests
- Record evidence and results

OperatorOS v1 does not automatically:

- Send external messages
- Publish content
- Spend money
- Issue refunds
- Sign agreements
- Change pricing
- Delete production data
- Merge code or deploy production

Approving an item authorizes a human-controlled next step. Approval does not make the AI execute the external action.

## Data model

All OperatorOS records are scoped by `workspace_id` so the architecture can support client workspaces later.

Core tables:

- `operator_workspaces`
- `operator_workspace_members`
- `operator_missions`
- `operator_skills`
- `operator_workers`
- `operator_worker_skills`
- `operator_runs`
- `operator_run_events`
- `operator_approvals`

All tables have RLS enabled. Version one grants direct access only to authenticated LeadFlow admins. Service-role access is used only after the request has passed an authenticated admin check.

## Provider configuration

Server-only environment variables:

```bash
OPENAI_API_KEY=""
OPENAI_OPERATOR_MODEL="gpt-5.6-terra"
ANTHROPIC_API_KEY=""
ANTHROPIC_OPERATOR_MODEL="claude-sonnet-5"
OPERATOROS_EXECUTION_ENABLED="false"
```

The execution switch defaults to false. Keep it false until the database migration is applied, the preview is reviewed, provider keys are configured, and one controlled test Skill is selected.

## Activation sequence

1. Apply `20260831090000_operatoros_v1.sql` to the LeadFlow Pro Supabase project.
2. Confirm all nine OperatorOS tables exist and have RLS enabled.
3. Confirm the seeded workspace, mission, five Skills, and nine Workers exist.
4. Deploy the branch to a protected Vercel preview.
5. Open `/admin/operator` as an admin.
6. Confirm both provider readiness indicators.
7. Leave the execution switch off and inspect the UI, database records, and stopline.
8. Set `OPERATOROS_EXECUTION_ENABLED=true` in Preview only.
9. Run `Daily Operator Brief` once.
10. Review the context event, model decision, output record, and any approval request.
11. Run Supabase security and performance advisors.
12. Only then consider enabling production execution.

## First commercial workflow

The first customer implementation should begin with one repetitive, low-risk job that already has a human budget and a clear finish line.

Good first examples:

- Lead triage
- Follow-up recovery planning
- Customer onboarding preparation
- Missing-document detection
- Delivery-risk review
- Daily proof reporting

Do not start with banking, legal decisions, clinical decisions, unrestricted public communications, or destructive infrastructure access.

## Event contract

Each mission records these stages when applicable:

1. `queued`
2. `started`
3. `context_ready`
4. `model_request`
5. `model_response`
6. `approval_required`
7. `completed`, `blocked`, or `failed`

The visual dashboard is driven by these stored events. It does not animate fake work.
