# The LeadFlow Pro: project memory for Claude (read me first)

Claude Code loads this file at the start of every session. The repo rules are in `AGENTS.md`;
read and follow them too. This file adds the platform facts every session must know.

## PLATFORM SWITCHOVER: no more Vercel or Supabase (owner decision, Sep 26, 2026)

The LeadFlow Pro and Premier Dental Academy of Longview **no longer use Vercel or Supabase**.
Everything both businesses run is being switched over (in progress as of Sep 26, 2026) to the
**DigitalOcean droplet** described below. **GitHub stays** as source control. Take this as settled;
there is no need to verify it against Vercel or Supabase.

- Do not plan, build, deploy or migrate anything on Vercel or Supabase: no new Supabase
  migrations or functions, no Vercel config or env work. New work targets the droplet.
- This site's move off Vercel was decided on Sep 24 (`docs/infrastructure/droplet.md`). The
  Sep 26 decision adds Supabase: the database, logins, and anything else on Supabase are moving
  to the droplet too.
- **Not decided yet: where the database and logins will run on the droplet.** Do not invent it.
  Get it from the owner, then record it here.
  - A proposal is waiting for his answer (Sep 28, 2026): Postgres 17 in a Docker container on
    the droplet, backed up nightly, with logins moving into the same database later
    (`docs/infrastructure/database.md`). It is not the decision until he says yes; then replace
    this bullet with the decision and its date.
- Every Supabase reference in this repo (`supabase/`, "Supabase is the agent memory and task
  bus" in `AGENTS.md`, the Supabase rows in the droplet runbook) describes the platform being
  retired. Read it as the map of what has to be ported.
- Approval rules still apply on the droplet. Production deploys, DNS changes, payment
  configuration, real sends, and any change to live data need the owner's explicit approval for
  that action. Never commit secrets: this repository is public.

## The droplet (facts from `docs/infrastructure/droplet.md` and `deploy/droplet/`, Sep 24, 2026)

- **What it is:** Ryan's DigitalOcean droplet. Run commands in DigitalOcean's web console
  (Droplets, the droplet, Console); no SSH key is needed.
- **What runs on it:**
  - The central brain on port 3000.
  - The LeadFlow Pro in Docker (`deploy/droplet/compose.yml`):
    - `web`, the Next.js server on 127.0.0.1:3100;
    - `cron`, the scheduled jobs listed in `vercel.json`, in UTC;
    - `worker`, the optional Content Command worker.
  - Caddy, which serves HTTPS with automatic Let's Encrypt certificates.
  - The installers also mention Dashboard, Ads Brain, Call desk and Call Closer beside them.
- **Files on the droplet:** the app checkout is at `/opt/theleadflowpro`. Secrets are in
  `/etc/theleadflowpro/web.env`, never in the repo.
- **Commands (run as root):**
  - `sudo /opt/theleadflowpro/deploy/droplet/deploy.sh [commit]` builds and starts a version. It
    checks `/api/health` and puts the previous version back if the new one doesn't come up.
  - `sudo /opt/theleadflowpro/deploy/droplet/check.sh` shows read-only status, including the
    droplet's public IP. It prints no secrets.
  - `sudo /opt/theleadflowpro/deploy/droplet/cutover.sh site-on|crons-on|crons-off|site-off|rollback`
    moves traffic and scheduled jobs between Vercel and the droplet, one switch at a time.
- **DNS:** theleadflowpro.com is at GoDaddy.
- **Not recorded in the repo:** the droplet's IP address (run `check.sh`), its size and region,
  and whether the DNS cutover in the runbook has been done.

## Premier Dental Academy of Longview on the droplet

- Repo: `RealRyanNichols/PremierDentalAcademyofLongview` (also public).
- **Not set up on the droplet yet.** There is no deploy setup for it.
- Its Supabase server functions (all 45, verified against live, secrets redacted) and a porting
  checklist are in that repo under `migration/supabase-export/` (`README.md`, `INVENTORY.md`).
  The README lists what else must move before its Supabase project is switched off: database,
  stored secrets, scheduled jobs, webhooks, and its Vercel site and API.
