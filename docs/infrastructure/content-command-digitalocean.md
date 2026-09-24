# Content Command Center on DigitalOcean

The Content Command Center is an admin-only live dashboard at `/admin/content-command`. The safest first deployment keeps the public Next.js site on Vercel and runs only the long-running queue worker on a DigitalOcean Ubuntu Droplet. This preserves previews, cache behavior, TLS, and the existing scheduled jobs while adding a durable connector process.

## What is live

- Ten-unit daily artifacts with five native platform versions per unit
- Per-version editing, approval, scheduling, and push selection
- A real-time comments and messages inbox
- Prepared reply templates
- Human confirmation before every publish, comment, or message reply
- Immutable activity events and exact blocked/error states
- Facebook publishing and replies through the official Meta Graph API
- A token-authenticated artifact import endpoint for the daily automation

X, Instagram, YouTube, and TikTok remain visibly blocked until their official OAuth connections and platform permissions are approved. No scraper or browser impersonation is used.

## 1. Database

Apply `supabase/migrations/20260923230752_content_command_center.sql`. The migration enables RLS and grants access only to authenticated administrators and the service role. Then run Supabase security and performance advisors.

## 2. Google Workspace login

Enable Google in Supabase Auth. In Google Cloud, create a Web OAuth client and use:

- Authorized JavaScript origin: the production dashboard origin
- Authorized redirect URI: `https://hpzpwfymwfgwspaixrxi.supabase.co/auth/v1/callback`

Add the dashboard origin and `/auth/callback` to the Supabase redirect allow list. The sign-in button requests the `theleadflowpro.com` hosted domain hint, but Supabase profile roles remain the authorization boundary. Make the intended operator an `admin` in `public.profiles` after first sign-in.

## 3. Worker Droplet

The worker now ships with the rest of the site on the droplet: it is the
`worker` service in `deploy/droplet/compose.yml`, pointed at the `web`
container, and set up by `deploy/droplet/install.sh` (see `droplet.md`).
Turn it on with:

```bash
echo worker | sudo tee /etc/theleadflowpro/compose-profiles
sudo /opt/theleadflowpro/deploy/droplet/deploy.sh
```

`CONTENT_COMMAND_WORKER_TOKEN` goes in `/etc/theleadflowpro/web.env`. The
worker holds no social credentials; it polls the app's authenticated worker
endpoint. The older `deploy/content-command/` kit is retired: its installer
turned the firewall on with only SSH open, which would block the brain's
HTTPS on this droplet.

## 4. Daily artifact handoff

After the daily automation creates and verifies its ten-unit package, it POSTs the structured `leadflow-content-artifact-v1` JSON to:

```text
POST /api/content-command/import
Authorization: Bearer CONTENT_COMMAND_WORKER_TOKEN
Content-Type: application/json
```

The import is idempotent by Central calendar date. Draft, blocked, and failed variants can be refreshed. Approved, queued, scheduled, published, and verified copy is not overwritten.

## 5. Meta webhook

Configure the Meta app callback as `/api/webhooks/meta/content-command` and subscribe the Page to `feed` and `messages`. Use a long random `META_WEBHOOK_VERIFY_TOKEN`. Incoming webhook signatures are verified with the Meta app secret before anything is stored. Replies still require confirmation in the dashboard.

## 6. Verification

1. Open `/admin/content-command` as an admin.
2. Import a verified artifact and confirm 10 units and 50 variants.
3. Edit and approve one Facebook variant.
4. Push it only after reviewing the confirmation dialog.
5. Confirm the job changes from queued to processing to published or failed.
6. Send a test Facebook comment and verify it appears in the inbox.
7. Use a prepared reply, confirm, and verify the external response.
8. Confirm unsupported channels stay blocked and nothing is falsely labeled published.

## Full-site migration

Done as its own cutover: `droplet.md` covers the cron replacement, Caddy and
TLS, health-checked deploys with rollback, and the build gate.
