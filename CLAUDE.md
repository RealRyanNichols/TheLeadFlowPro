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
- **Decided Sep 28, 2026 (owner): the database and logins live in Postgres 17, in a Docker
  container on the droplet beside the site.** It is backed up every night, with a copy in The
  LeadFlow Pro's Google Drive. Setup, backups, the Drive copy and restores: `deploy/droplet/db.sh`.
  The plan and the phases off Supabase: `docs/infrastructure/database.md`.
  - Logins move into the same database (phase F). A client's login links to the lead it came
    from and is also matched by email. The details a client signed up with are what we use,
    unless the client says otherwise.
  - New work that needs a database targets this one. Each phase that moves data or logins off
    Supabase still needs the owner's approval for that phase.
- Every Supabase reference in this repo (`supabase/`, "Supabase is the agent memory and task
  bus" in `AGENTS.md`, the Supabase rows in the droplet runbook) describes the platform being
  retired. Read it as the map of what has to be ported.
- Approval rules still apply on the droplet. Production deploys, DNS changes, payment
  configuration, real sends, and any change to live data need the owner's explicit approval for
  that action. Never commit secrets: this repository is public.

## The droplet as it really is (read-only check, Sep 28, 2026)

This replaces the Sep 24 picture below wherever they differ.

- **Droplet:** `leadflow-web`, 8 GB memory, 80 GB disk, NYC3, Ubuntu 24.04. On Sep 28, memory was
  about 85% used with swap full, and the disk 89% used (about 9 GB free). DigitalOcean's weekly
  backups are on (Sundays).
- **The live site** is the systemd service `site@leadflow`: Next.js on 127.0.0.1:3109, run from
  `/var/lib/leadflow-releases/current` with settings in `/srv/site-env/leadflow.env`. Caddy sends
  www.theleadflowpro.com there. On Sep 28 it was serving `ddeb372` (Sep 26).
- **Deploys** use `/usr/local/bin/leadflow-release`: `leadflow-release` builds origin/main,
  `leadflow-release <sha>` builds one commit, `--status` shows the last result and `--rollback`
  goes back one release. It checks a new build on port 3129 before switching. Its guard
  (`/usr/local/lib/leadflow-build-guard.sh`) builds only with 5.5 GiB of memory free and 12 GiB
  of disk free, so on Sep 28 it could not build. `leadflow-autopull.timer` (automatic deploys) is
  off, and so are the site's `leadflow-cron-*` timers. Another session set this pipeline up and
  owns it: coordinate before changing it.
- **Not installed on this droplet:** `/opt/theleadflowpro`, `/etc/theleadflowpro`, and the Docker
  setup in `deploy/droplet/` (`install.sh`, `deploy.sh`, `cutover.sh`). **Do not run `deploy.sh`
  here:** it would build the site inside Docker with none of that memory guard.
- **Also on it:** a self-hosted Supabase stack for Real Ryan Nichols (`/opt/rrn-supabase`), the
  brain and its Postgres, the LeadFlow Hub, and the other `/srv/sites/*` sites.

### Sep 29, 2026 (evening): capacity check and a clean restart

- Before: memory 1.1 GiB available with swap full, disk 7.3 GiB free. The biggest memory users
  were `site@leadflow` (1.8 GB) and `site@repwatchr` (1.7 GB). Old LeadFlow builds in
  `/var/lib/leadflow-releases` take about 1.4 GB each; current is `ddeb372`, previous `c48b6b2`.
- With the owner's OK the droplet was shut down cleanly for a resize to 16 GB and turned back on
  about three minutes later. Every service and Docker container that had been running came back
  (checked against `/root/pre-resize-state.txt`). After the restart memory was about 4.7 GiB
  available, still under the release guard's 5.5 GiB.
- The resize did not happen: the account is on DigitalOcean's Tier 2 limits and the
  8 vCPU / 16 GB plan ($96/mo) is locked. A limit increase was requested through support on
  Sep 29 (1 to 2 business days). The instant alternative is a one-time $250 prepay, credited to
  future bills; not used.
- Waiting to launch (owner-approved Sep 29): branch `release/help-desk-on-live` (`3e33415`) is
  the live `ddeb372` plus four agency pages (community help desk, crypto tax intake, XRPL
  treasury alerts, crypto checkout) and the agency heading fix, with nothing else from main.
  `leadflow-release` only fetches `main`, so fetch the branch into `/srv/sites/leadflow` first,
  then run `leadflow-release 3e3341544d77279bbfefd7ca5cc2d9443dc3eb2f`. The owner chose to wait
  for DigitalOcean's limit increase rather than prepay.

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
