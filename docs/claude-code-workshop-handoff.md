# Claude Code Workshop Handoff

This branch contains an in-progress, unpublished ChatGPT workshop funnel. Preserve every current change. Do not reset, stash, discard, or checkout over the worktree.

Read `AGENTS.md`, `docs/east-texas-chatgpt-workshop-plan.md`, `docs/ai-workshop-operating-system.md`, and `../project_sources/01-The-LeadFlow-Pro-Instructions.txt` before changing copy or behavior.

## Current direction

- Branch: `codex/chatgpt-workshop-funnel`
- Route: `/events/east-texas-ai-operator-workshop`
- Target date: September 10, 2026 at 6:30 PM Central
- Date status: target only, not final
- Price: $97
- Capacity: 10 paid seats
- Instructor: Ryan Nichols
- Sales and implementation follow-up: Pat Grabbs
- Venue-side stakeholder: Amanda
- Workshop: ChatGPT only
- Exact address: private until verified payment
- Event: unpublished
- Sales: draft and closed

## Safety boundaries

Do not merge main, publish the event, open sales, activate live Stripe, launch ads, spend money, or create a production deployment without Ryan's explicit approval.

## Commerce design

- The server owns the event price.
- Supabase creates short atomic seat holds.
- Stripe session metadata binds the event, registration, email, and hold token.
- The webhook confirms paid seats idempotently.
- Expired Stripe sessions release holds.
- Private confirmation requires a paid Stripe session and a confirmed Supabase registration.
- No automatic sales SMS is sent.
- Pat receives an implementation follow-up task only through the operating rules.

## Supabase migration warning

Workshop migrations recovered into this repository with versions dated `20260825` were already applied remotely. Do not rerun them blindly.

New local migrations dated `20260901` must be checked against remote migration history before they are applied. They harden the admin RPC boundary, add an email marker, and add service-managed attendee progress check-ins.

## Required validation

Run `npm test`, `./node_modules/.bin/tsc --noEmit`, `npm run build`, and `git diff --check`. Review the page at 320, 360, 390, 768, and 1440 pixels. Verify the exact address does not appear in public HTML, metadata, images, or client bundles.

## Unresolved Ryan decisions

The final date, public name, cancellation policy, refund policy, seat-transfer policy, recording consent, clinic inclusion, address treatment, Stripe test approval, publish approval, sales approval, production deployment, and ad launch remain approval-gated.
