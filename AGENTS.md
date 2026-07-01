# LeadRep Agent Instructions - The LeadFlow Pro

This repo is for The LeadFlow Pro and the LeadRep revenue engine only. Do not route this workspace into court, January 6, divorce, legal-service, or pro se workflows.

## Mission

LeadRep turns verified public and permissioned business signals into lead intelligence, data packages, predictive analytics, web conversion systems, and recurring revenue. The product should help Ryan find useful demand, verify the source trail, package the opportunity, and hand the next action to the right agent or human reviewer.

## Repo Rules

- Work on the `main` branch unless Ryan explicitly instructs otherwise.
- Pull latest before making changes when the task involves GitHub state.
- Keep buyer flows practical, direct, and conversion-oriented.
- Do not import RepWatchr copy, routes, data, or assumptions unless Ryan asks for a shared LeadRep orchestration change.
- Do not expose private lead data, service keys, webhook secrets, or buyer lists in client-side code.
- Do not auto-publish, auto-text, auto-email, auto-DM, or spend API credits without approval.
- Run `npm run build` before final handoff whenever code changes.

## LeadRep Orchestration

- GitHub issues and comments are the handoff log between Codex, Grok/xAI, GitHub Actions, Supabase, and Vercel.
- Supabase is the agent memory and task bus. Use service-role access only from server-side scripts, CI, or trusted admin runtimes.
- Vercel is the runtime and deploy layer. Production deploys stay approval-gated.
- Default orchestration mode is dry-run. Grok/xAI API calls run only when `LEADREP_GROK_MODE=api`, `XAI_API_KEY` exists, and approval is cleared.
- Any result that would publish, contact leads, change pricing, create a paid campaign, or affect a buyer-facing offer must stop in `approval_queue`.
