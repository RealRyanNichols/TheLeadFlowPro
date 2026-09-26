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

## Hosting and Platforms (owner decision, Sept 26, 2026)

This applies to every project: The LeadFlow Pro and Premier Dental Academy of Longview.

- **DigitalOcean droplet:** everything runs on the LeadFlow DigitalOcean droplet (`leadflow-web`). A full switchover is in progress.
- **GitHub:** still used for source code, issues, and pull requests.
- **Vercel:** no longer used. Do not deploy to Vercel. Do not add Vercel projects, settings, integrations, or anything new that depends on Vercel.
- **Supabase:** no longer used. Do not add Supabase tables, auth, storage, functions, or anything new that depends on Supabase.
- **Code that still references Vercel or Supabase** is legacy that is being moved to the droplet. Don't build on it. Don't remove it without the owner's go-ahead, because the switchover is being done on purpose, in order.
- **Changes on the droplet** stay approval-gated: services, Caddy sites, DNS, and anything production.

## LeadRep Orchestration

- GitHub issues and comments are the handoff log between Codex, Grok/xAI, GitHub Actions, and the DigitalOcean droplet.
- The agent memory and task bus move from Supabase to the droplet. Until that exists, don't build new pieces on Supabase. Use privileged database access only from server-side scripts, CI, or trusted admin runtimes.
- The DigitalOcean droplet is the runtime and deploy layer (docs/infrastructure/droplet.md): `sudo /opt/theleadflowpro/deploy/droplet/deploy.sh` after a merge. Nothing builds or deploys on Vercel (`vercel.json` sets `git.deploymentEnabled` to false). Production deploys stay approval-gated.
- Default orchestration mode is dry-run. Grok/xAI API calls run only when `LEADREP_GROK_MODE=api`, `XAI_API_KEY` exists, and approval is cleared.
- Any result that would publish, contact leads, change pricing, create a paid campaign, or affect a buyer-facing offer must stop in `approval_queue`.
