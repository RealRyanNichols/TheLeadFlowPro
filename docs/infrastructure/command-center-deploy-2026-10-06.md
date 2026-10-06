# Deploy runbook: branch `claude/dazzling-fermi-svd28t` onto the live droplet with `leadflow-release`

Written Oct 6, 2026 from the repo (`CLAUDE.md`, `docs/infrastructure/*`, `deploy/*`), Pat's Sep 26 handoff doc, and the facts handed to this task. This session has no SSH key and has not touched the droplet; every command below is for Ryan (DigitalOcean web console) or Pat (root SSH) to run **as root** on the droplet `leadflow-web` (165.227.248.110). Paste the output of any step that looks different from "expected" to Claude before going on.

**What this deploy is:** the live site is the systemd service `site@leadflow` (Next.js, `127.0.0.1:3109`, running as `leadflowsite` on Node 22.23.2 from `/var/lib/leadflow-releases/current`, settings in `/srv/site-env/leadflow.env`). Caddy sends `www.theleadflowpro.com` to it. Live today is `9c701b2` (origin/main, Oct 3). The branch is main plus the rebuilt `/admin/command-center` board, a new `/sales/board` page for the sales login, `lib/commandCenter*.ts`, `lib/metaInsights.ts`, `lib/operatorLinks.ts`, a read-only change to `app/api/ads-brain/pull/route.ts`, four optional env names in `web.env.example`, and tests. **No database migration, no new timer, no Caddy or DNS change, no sends.** The branch is on GitHub as draft PR RealRyanNichols/TheLeadFlowPro#121; its tip may still gain commits, so step 2 reads the tip from GitHub instead of hard-coding it.

**Rules that apply:** this is a production deploy, so it needs the owner's explicit OK for this action. `leadflow-release` and its guard belong to another session's pipeline: do not edit `/usr/local/bin/leadflow-release` or `/usr/local/lib/leadflow-build-guard.sh`, do not bypass the guard, and **do not run `deploy/droplet/deploy.sh`** on this droplet (it builds in Docker with no memory guard; the Docker setup is not installed here anyway). Never paste a value from `leadflow.env` into chat, GitHub, or a doc; the repo is public.

## 0. Before touching the droplet

1. The branch is on GitHub (`claude/dazzling-fermi-svd28t`, draft PR #121). The runbook fetches by branch name, so nothing else needs to change.
2. The build session has run `npm run build` (the same gate `leadflow-release` runs: `validate:calculations`, `validate:facts`, `validate:tools`, `validate:visuals`, `validate:social`, then `next build`) and the tests on the branch, and says so in the PR.
3. The owner has said "deploy it" for this branch. Pat deploying on Ryan's say-so is fine; nobody deploys without it.

## 1. Read-only check (changes nothing)

Open DigitalOcean, Droplets, **leadflow-web**, Access, **Launch Droplet Console** (or `ssh root@165.227.248.110` for Pat). Paste:

```bash
leadflow-release --status
readlink -f /var/lib/leadflow-releases/current
ls -1 /var/lib/leadflow-releases
systemctl is-active site@leadflow caddy
curl -fsS --max-time 5 http://127.0.0.1:3109/api/health; echo
free -g
df -h /
git -C /srv/sites/leadflow log -1 --format='%h %ad %s' --date=short
systemctl list-timers --all --no-pager | grep -E 'leadflow|brain-fieldy|ads-brain' || true
```

Expected: `--status` shows the last release result and that nothing is building; `current` points at the `9c701b2` release; `site@leadflow` and `caddy` `active`; health `{"ok":true,"commit":...}` (`commit` may be `null`: the route prints `GIT_SHA`, and whether `leadflow-release` sets it is not recorded; the `readlink` line is the truth); `/srv/sites/leadflow` is a git checkout (the one `leadflow-release` builds from).

**The guard, and why it may refuse.** `/usr/local/lib/leadflow-build-guard.sh` lets a build start only with **5.5 GiB of memory free and 12 GiB of disk free**. The droplet is 8 GB / 80 GB. Sep 28: memory about 85% used with swap full, disk 89% used (about 9 GB free); the guard refused. Sep 29 evening, after a clean shutdown and restart: 4.7 GiB available (still under 5.5), 7.3 GiB disk free; biggest memory users `site@leadflow` (1.8 GB) and `site@repwatchr` (1.7 GB); each release directory is about 1.4 GB. A resize to 16 GB is waiting on a DigitalOcean Tier 2 limit increase requested Sep 29 (the owner chose to wait rather than prepay $250). So **read `free -g` and `df -h /` here and compare with 5.5 GiB / 12 GiB before starting a build.** If either is short, the build will be refused and nothing changes; that is the guard working. The ways to get room are each an owner decision, not something to do on the spot:
- wait for the resize (then re-run this step);
- free disk by deleting old release directories under `/var/lib/leadflow-releases` **other than `current` and the one `--rollback` would use** (`ls -1` above lists them; `previous` was `c48b6b2` on Sep 29). Ask before deleting any;
- free memory by stopping a service for the length of the build (for example `site@repwatchr`, a live client site, so that is a visible outage). Ask first; put it back with `systemctl start` right after;
- the $250 prepay to resize now.
Do **not** edit the guard's numbers.

## 2. Fetch the branch into the pipeline's checkout

`leadflow-release` fetches only `main`, so the branch has to be in `/srv/sites/leadflow` first (same trick as the Sep 29 `release/help-desk-on-live` plan):

```bash
git -C /srv/sites/leadflow fetch origin claude/dazzling-fermi-svd28t
SHA=$(git -C /srv/sites/leadflow rev-parse FETCH_HEAD); echo "$SHA"
git -C /srv/sites/leadflow log -1 --format='%H %ad %an %s' --date=short "$SHA"
git -C /srv/sites/leadflow log --oneline "origin/main..$SHA" 2>/dev/null || git -C /srv/sites/leadflow log --oneline -5 "$SHA"
```

Expected: the SHA matches the tip of PR #121 on GitHub, the subject is a command-center commit, and the commits listed are only the branch's own. If the checkout is shallow and the fetch complains about history, add `--depth 50` to the fetch and run it again. If the SHA does not match the PR, stop.

## 3. Build and switch

```bash
leadflow-release "$SHA"
```

What it does: runs the guard; builds that commit in a new directory under `/var/lib/leadflow-releases` (about 1.4 GB, several minutes, the full validate-then-`next build` gate); starts the build on **port 3129** and checks it; only then points `current` at it and restarts `site@leadflow`. A failed guard, build, or check leaves the live site on `9c701b2`. Leave the console open until it prints its result; do not start a second `leadflow-release` meanwhile. If the console session drops mid-build, `leadflow-release --status` says where it got to.

## 4. Verify (read-only)

```bash
leadflow-release --status
readlink -f /var/lib/leadflow-releases/current
systemctl is-active site@leadflow
curl -fsS --max-time 5 http://127.0.0.1:3109/api/health; echo
for p in / /tools /login /admin/command-center /sales/board /admin/call-sheet /api/ads-brain/pull; do
  printf '%-24s ' "$p"
  curl -s -o /dev/null -w '%{http_code}\n' --max-time 20 -H 'Host: www.theleadflowpro.com' -H 'X-Forwarded-Proto: https' "http://127.0.0.1:3109$p"
done
curl -s -o /dev/null -w 'public health %{http_code}\n' --max-time 10 https://www.theleadflowpro.com/api/health
journalctl -u site@leadflow -n 40 --no-pager
free -g; df -h /
```

Expected: `current` is the new release; `site@leadflow` `active`; health `ok:true`; `/`, `/tools`, `/login` **200**; `/admin/command-center`, `/sales/board`, `/admin/call-sheet` **3xx** (redirect to login when not signed in; a 500 means stop and roll back); `/api/ads-brain/pull` **401 or 403** (it needs a signed request from the brain; 500 means roll back); public health **200**; no repeating error in the journal. Then, on a phone on cellular: sign in, open `https://www.theleadflowpro.com/admin/command-center`, confirm the board loads with real counts, the "switches" rows show the real on/off state, and the brain and Hub links open; with Pat's sales login open `/sales/board` and confirm it shows only what that role may see. Within 15 minutes, on the brain at `https://165-227-248-110.sslip.io/ads`, confirm the Ads Brain's next run still reports healthy (its timer pulls `/api/ads-brain/pull` from this site).

## 5. Optional settings (a separate approval; skip for the first deploy)

The branch reads four **optional** names from `/srv/site-env/leadflow.env`; unset, the board still works: `COMMAND_CENTER_MONTHLY_COSTS_USD` (owner-typed monthly costs for the counter; blank turns it off), `LEADFLOW_BRAIN_ORIGIN` and `LEADFLOW_HUB_URL` (default to the sslip.io addresses), `META_ADS_READ_TOKEN` (`ads_read` only; turns on the ad panel; the board also accepts an existing `META_PAGE_ACCESS_TOKEN`). The board's other switch rows read names already in the file: `SPEED_TO_LEAD_ENABLED`, `QUO_OUTBOUND_SMS_DISABLED`, `CALL_SHEET_EMAIL_ENABLED`, `BUSINESS_DASHBOARD_ORIGIN`, `BUSINESS_DASHBOARD_SSO_SECRET`. Editing that file is a change to live settings (and for the Meta token, a secret the Sep ads-brain contract said to keep off the shared droplet), so it needs its own OK. If approved:

```bash
cp -p /srv/site-env/leadflow.env "/root/leadflow.env.bak-$(date -u +%Y%m%d-%H%M%S)"
nano /srv/site-env/leadflow.env      # add or change only the agreed lines; save
systemctl restart site@leadflow
sleep 5; curl -fsS --max-time 5 http://127.0.0.1:3109/api/health; echo
```

Then repeat the step 4 checks. Undo: copy the backup back and restart.

## 6. Rollback

If anything in step 4 is wrong, or the owner says so:

```bash
leadflow-release --rollback
leadflow-release --status
readlink -f /var/lib/leadflow-releases/current
systemctl is-active site@leadflow
curl -fsS --max-time 5 http://127.0.0.1:3109/api/health; echo
curl -s -o /dev/null -w '%{http_code}\n' --max-time 20 -H 'Host: www.theleadflowpro.com' -H 'X-Forwarded-Proto: https' http://127.0.0.1:3109/
```

`--rollback` goes back exactly one release (to `9c701b2` if that was live before step 3); run it once. Expected: `current` is the previous release again, service `active`, health `ok:true`, home `200`. If the service is not active after a rollback: `systemctl restart site@leadflow`, then `journalctl -u site@leadflow -n 60 --no-pager` and paste it. If step 5 was done, put the env backup back and restart too. The new release directory stays on disk (about 1.4 GB); deleting it is a separate, asked-for step.

## What this runbook does not do

- It does not turn on `leadflow-autopull.timer` or any `leadflow-cron-*` timer (all off on Sep 28). Those timers are the site's scheduled jobs from `vercel.json` (Meta lead poll every 5 minutes, follow-up sends, hq-pulse); turning them on means real emails and texts and is an owner decision on its own.
- It does not touch Caddy, DNS (GoDaddy live; Cloudflare zone pending), `/opt/brain`, the Hub, the RRN Supabase stack, the hosted Supabase project the site still uses, Stripe, Resend, Quo, or any `/srv/sites/*` site.
- It does not merge the branch. After the owner is happy with it live, merge the PR to `main` so the next plain `leadflow-release` (which builds `origin/main`) does not drop it.

