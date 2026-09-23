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

Create a basic Ubuntu LTS Droplet in the region closest to the primary operator. A small shared CPU instance is enough for the queue worker. Add an SSH key, enable backups, and do not open database ports.

```bash
sudo sh deploy/content-command/install.sh
git clone <private-repository-url> /opt/theleadflowpro
cd /opt/theleadflowpro/deploy/content-command
cp .env.example .env
openssl rand -hex 32
```

Put that random value in `CONTENT_COMMAND_WORKER_TOKEN` both on the Droplet and in the web app environment. Set file permissions to `600`, then start the worker:

```bash
chmod 600 .env
docker compose up -d
docker compose logs -f worker
```

The worker contains no social credentials. It polls the app's authenticated worker endpoint, and credentials remain in Supabase Vault or trusted server environment variables.

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

## Full-site migration later

Moving the entire Next.js application to the Droplet is a separate cutover. Before that change, replace the twelve Vercel Cron jobs, verify ISR/cache behavior, add a reverse proxy and managed TLS, configure deploy rollbacks, and run the production build gate. Do not combine that infrastructure migration with the initial connector launch.
