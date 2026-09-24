# The LeadFlow Pro on the DigitalOcean droplet

Decided September 24, 2026: the site moves off Vercel onto the DigitalOcean
droplet that already runs the central brain, so the business runs on one
server Ryan pays for, next to Google Workspace. This replaces the
"do not move" advice in `digitalocean.md` (September 20).

Everything below is run by Ryan in the droplet's web console
(DigitalOcean, Droplets, the droplet, Console). No SSH key is needed, and no
secret ever goes into the repository, which is public.

## What runs where after the move

| Piece | Before | After |
| --- | --- | --- |
| Website and API | Vercel | Droplet, Docker container `web` on 127.0.0.1:3100 |
| HTTPS certificates | Vercel | Droplet's Caddy (Let's Encrypt, automatic) |
| The 12 scheduled jobs in `vercel.json` | Vercel Cron | Droplet, container `cron` (same schedules, UTC) |
| Content Command worker | not running | Droplet, container `worker` (opt in) |
| Central brain | Droplet, :3000 | Unchanged |
| Database, auth | Supabase | Unchanged |
| Email sending | Resend | Unchanged |
| Email inboxes | GoDaddy Microsoft 365 | Google Workspace (`google-workspace-migration.md`) |

`vercel.json` stays the one list of scheduled jobs. The droplet reads it every
minute, so a job added there runs on the droplet after the next deploy.

## Files

- `deploy/droplet/install.sh`: one-time setup. Looks first, then installs
  Docker and Caddy only if missing, adds swap on a small droplet, clones the
  repo to `/opt/theleadflowpro`, creates `/etc/theleadflowpro/web.env`, and
  stages the site's Caddy block switched off. It stops without changing
  anything if something other than Caddy owns ports 80/443, and it never
  turns a firewall on.
- `deploy/droplet/deploy.sh`: builds and starts a commit. The build runs the
  same gate as Vercel. A failed build changes nothing; a new version that does
  not answer `/api/health` within two minutes is swapped back automatically.
- `deploy/droplet/check.sh`: read-only status, safe to run any time, prints
  no secret. Paste its output to Claude when something looks off.
- `deploy/droplet/cutover.sh`: the switches, one at a time (`site-on`,
  `crons-on`, `crons-off`, `site-off`, `rollback`).
- `deploy/droplet/compose.yml`, `Dockerfile`, `cron-runner.mjs`,
  `theleadflowpro.caddy`, `web.env.example`: what the scripts run.

## 1. Set up (about 30 minutes, site keeps running on Vercel)

1. In DigitalOcean, take a snapshot of the droplet first (Snapshots, Take
   snapshot). It is the undo button for anything below.
2. Open the droplet console and run:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/RealRyanNichols/TheLeadFlowPro/main/deploy/droplet/install.sh -o /tmp/lfp-install.sh
   sudo bash /tmp/lfp-install.sh
   ```

   If it stops with "Ports 80/443 belong to ...", nothing was changed. Paste
   the output to Claude.
3. Fill in the values. On the Mac, in the project folder, run
   `vercel env pull --environment=production web.env`, open that file, and
   paste its lines into the droplet with `sudo nano /etc/theleadflowpro/web.env`.
   Delete the Mac copy afterwards. Values containing a `$` go in single quotes.
4. Build and start it:

   ```bash
   sudo /opt/theleadflowpro/deploy/droplet/deploy.sh
   sudo /opt/theleadflowpro/deploy/droplet/check.sh
   ```

   Good looks like: `health {"ok":true,"commit":"..."}`, every page `200`,
   cron `idle`, the brain still answering on :3000.

At this point the site runs on the droplet but nobody is sent there yet.

## 2. Cut over (a quiet hour, about 20 minutes plus DNS time)

Do not combine this with the email move; do them on different days.

1. The day before, at GoDaddy (My Products, Domains, theleadflowpro.com,
   DNS), set the TTL of the `@` A record and the `www` CNAME to 600 seconds so
   the change and any rollback travel fast.
2. At GoDaddy, change exactly two records:
   - A `@`: `76.76.21.21` becomes the droplet's IPv4 (shown by `check.sh`).
   - `www`: delete the CNAME `cname.vercel-dns.com`, add an A record `www`
     pointing to the droplet's IPv4.

   Touch nothing else. MX, the TXT records, `send`, `resend._domainkey` and
   `workshop` all stay as they are.
3. Run `sudo /opt/theleadflowpro/deploy/droplet/check.sh` until both names
   show `<- this droplet`. Usually minutes, sometimes an hour.
4. `sudo /opt/theleadflowpro/deploy/droplet/cutover.sh site-on`. Caddy gets
   the certificate; the script waits until https answers.
5. In Vercel, the-lead-flow-pro, Settings, Cron Jobs, Disable Cron Jobs.
   Then at once:
   `sudo /opt/theleadflowpro/deploy/droplet/cutover.sh crons-on`
   (it asks you to type `VERCEL CRONS ARE OFF`). Both sides must never run
   the jobs together: leads would get two emails and two texts.
6. Check, in this order:
   - `check.sh`: https `200`, cron `ON`, and after five minutes
     `/api/meta-leads`, `/api/cron/hq-pulse`, and the notification jobs show `200`.
   - On a phone on cellular: the home page, `/tools`, `/chase-sheet`, sign in
     to `/admin`.
   - One consultation form with a name containing "test": the owner alert
     arrives and the lead shows in `/admin`.
   - Stripe dashboard, Developers, Webhooks, the endpoint: the next deliveries
     show `200`. Quo and Meta webhooks use the same domain, so they follow DNS.
7. Keep the Vercel project for 14 days as the rollback. Then cancel the paid
   plan or delete the project.

## 3. Shipping changes after the move

Merging to `main` no longer changes the live site on its own. After a merge:

```bash
sudo /opt/theleadflowpro/deploy/droplet/deploy.sh
```

To go back to an earlier commit: `sudo .../deploy.sh <commit>`.

To run the Content Command worker too:
`echo worker | sudo tee /etc/theleadflowpro/compose-profiles`, then deploy.

## Rolling back the move

`sudo /opt/theleadflowpro/deploy/droplet/cutover.sh rollback` turns off the
droplet's jobs and site and prints the two GoDaddy records to restore
(A `@` `76.76.21.21`, CNAME `www` `cname.vercel-dns.com`). Then turn Vercel's
cron jobs back on. Nothing else needs undoing.

## What is different off Vercel

- Browser-facing links (sign-in, checkout returns, same-origin checks) come
  from `lib/requestOrigin.ts`, which only accepts the site's own hosts, so
  they stay on `https://www.theleadflowpro.com` behind Caddy.
- `/api/track` no longer gets a country and region: those came from Vercel's
  `x-vercel-ip-country` headers. Everything else in the event is the same.
- Branch previews end when the Vercel project is removed. Check a branch with
  the unit tests and `npm run build` before merging, then deploy.
- Function time limits (`maxDuration`) no longer apply; nothing times out
  early.
- Logs: `docker compose -f /opt/theleadflowpro/deploy/droplet/compose.yml logs -f web`
  (or `cron`).
- The build needs about 3 GB of memory. On a smaller droplet, install.sh adds
  a 4 GB swap file so it fits; builds are slower but work.
