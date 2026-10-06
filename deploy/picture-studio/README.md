# Picture Studio on the existing DigitalOcean droplet

This adds a private order workflow and a single image worker beside the existing
LeadFlow site. It does not provision a droplet, use Supabase, deploy to Vercel, or
post to social accounts. The worker is disabled by default. Installation requires
access to the existing droplet, its local Postgres, and a separately billed OpenAI
API key. A ChatGPT subscription does not configure the site's API credentials.
The source and mocked-provider tests do not make paid provider calls. No paid
provider calls were made while building this feature. Installation and a real
production generation still require the documented droplet setup and credential
handoff.

## What the workflow does

An authenticated customer starts a brief for a business, creator, family or
personal story, adds permissioned reference photos, and pays through Stripe.
A verified, successful payment queues a no-spend story plan. Each scene connects
the supplied current moment, emotion, theme, image, caption and music placement
note. The customer approves that plan before any image call. The worker renders
one scene at a time, saves private square and portrait review exports, and moves
the complete collection to team review. The team checks identity, real product
details and image quality before releasing customer previews. Final downloads
become available after the customer approves the collection. One consolidated
minor revision request can be reviewed by the team; new concepts remain outside
the purchased scope.
The 12-picture story format is an opening, ten connected scene beats and a finale.

The system does not assert that a customer-supplied event is verified news. It
does not invent song lyrics or precise timestamps. Customer-selected song/start
time is preserved and marked as customer supplied. Otherwise it offers a mood
and musical change to preview, marks the cue unverified, and asks the customer to
choose the actual platform recording. It does not embed a song or claim music
rights, organic reach, leads or sales. Scenes are original creative
interpretations, not official movie stills or documented events.

## Inspect first

Read `AGENTS.md`, the current `CLAUDE.md` section **The droplet as it really is**,
and the live release script before changing production. The recorded runtime is
`site@leadflow`, `/var/lib/leadflow-releases/current`, local port 3109, with
`/usr/local/bin/leadflow-release` and a canary on 3129. Confirm those live facts;
other sessions can update them.

Read-only inspection:

```sh
sudo /usr/local/bin/leadflow-release --status
sudo systemctl show site@leadflow -p User -p Group -p WorkingDirectory -p MainPID
readlink -f /var/lib/leadflow-releases/current
git -C /srv/sites/leadflow rev-parse HEAD
free -h
df -h /var/lib/leadflow-releases /var/lib
sudo systemctl status picture-studio --no-pager
```

Do not print environment values or customer rows. Do not run
`deploy/droplet/deploy.sh`: that older Docker runbook was not installed and does
not use the live memory guard. Do not alter or bypass the release guard, resize
the droplet, prepay an account balance, or remove current/previous releases to
force a launch. Coordinate with any deployment already holding the release lock.

## Install after the release and database are ready

1. Deploy the reviewed source through the observed existing
   `leadflow-release <reviewed-commit-sha>` pipeline. It requires at least 5.5 GiB
   available memory and 12 GiB free disk in the recorded guard. If that check
   fails, pause installation and address capacity with the owner. Keep the live
   and previous releases.
2. Locate the actual local Postgres 17 connection and current backup mechanism.
   Use a dedicated local database role and the migration supplied by this
   feature; apply it once through that existing database. Do not apply it to the
   retired Supabase database. Keep database access bound to loopback or the
   private local container network; this worker requires a loopback connection.
3. Provision `/var/lib/leadflow-picture-studio` as a private folder writable by
   the observed web and worker user, with no world permissions (0700 for the same
   user, or a carefully configured common group). Never serve that directory
   through Caddy, Next `public/`, a static file mount, or a public bucket. Add it
   to the existing private backup process along with the local database, and
   verify an owner-only restore. Monitor its growth. Picture bytes are retained
   for order delivery and reconciliation; this feature does not silently delete
   customer originals.
4. Populate protected environment values from `env.example`. The website needs
   the picture database, storage, Stripe keys/webhook secret, admin token and
   readiness flags; the worker needs only picture database/storage, provider
   key, flags and spend ceilings. Store worker settings at
   `/srv/site-env/picture-studio.env`, mode 0600 (or tightly scoped 0640 for the
   observed service account). Keep secrets out of shell history, source,
   screenshots and logs. Use a secure credential handoff, not a chat message.
5. Register the signed picture-order Stripe webhook on the same live connected
   account at `https://www.theleadflowpro.com/api/picture-studio/webhook`. Select
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `charge.refunded`, and
   `charge.dispute.created`. Save its separate signing secret securely. Verify
   the account and configured live price IDs first.
   Duplicate webhook deliveries must not duplicate orders/jobs. Old hosted
   payment links are manual fulfillment; the automated flow requires an order
   created by this service and checkout metadata tying it to that order.
   The existing legacy webhook acknowledges explicitly tagged Picture Studio
   sessions and charges without creating a duplicate manual purchase or email.
   It resolves dispute ownership from the associated Stripe Charge; lookup
   failure remains retryable. Original hosted payment links keep their manual
   fulfillment path.
6. Change `User` and `Group` in `picture-studio.service` to the user/group observed
   above (the template uses the recorded `leadflowsite` account), and confirm `/usr/bin/node` is Node 22.6 or later. Adjust
   `ReadWritePaths` if the chosen private directory differs. Install the unit at
   `/etc/systemd/system/picture-studio.service`. Run `systemd-analyze verify`
   before enabling it. Install only this one worker instance; do not run a
   competing cron or a second background process.
7. Set both flags true only after the above checks. Run the preflight as the
   configured service account, with the protected environment supplied by
   systemd or a secure administrator runtime:

   ```sh
   node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/picture-studio-worker.ts --check
   ```

   `--check` checks local configuration, schema and private storage; it makes no
   provider call and does not prove that the API key has model access. Test that
   separately with an explicitly authorized, budgeted order after deployment.
   Then reload systemd and start `picture-studio`. Restart `site@leadflow` only
   through the observed deployment procedure if its environment changed.
8. Verify signed webhooks in Stripe test mode with test prices/account settings
   in a separate local test environment. Verify a browser can submit a brief,
   attach images, approve a plan and read only its own previews/files. A failed
   or refunded payment must not render. A ready live system may then accept an
   owner-approved paid production test, without fabricating a sale or charging a
   real card without authorization.

## Spend and failure rules

Current image snapshots are pinned: `gpt-image-2.5-flare-2026-09-08` for prompt
generation and `gpt-image-2.5-sunburst-2026-09-08` for reference-image edits.
Each request is one 1024×1280 PNG at medium quality. There are at most eight
normalized references; input images are decoded, metadata removed, and resized
before the call. The output is contained inside 1080×1080 and 1080×1350 canvases
to preserve the image and faces. Two exports remain one distinct picture.

Every paid image call first reserves **$1** atomically, revalidates paid/active
order and approved plan immediately before provider start, and has a three
minute timeout with a renewed job lease. Measured usage settles the reservation
using current snapshot rates ($5 per million text input tokens, $8 per million
image input tokens, $30 per million output tokens). Missing usage retains the
entire estimate. The order ceiling is **$1 per purchased picture**; the shared
UTC daily ceiling is **$25**. These may be lowered, never increased in this
implementation. Lowering the per-call cap below the conservative $1 reservation
pauses rendering rather than making an inadequately reserved call.
These are application reservation budgets, not provider-side guaranteed billing
caps. Measured usage can exceed an estimate; that cost is recorded and subsequent
calls stop if the remaining order or daily budget is exhausted. Configure the
provider account's own limits separately. An already-started request cannot be
made free or unbilled by a worker timeout.

An uncertain timeout, transport failure, process restart after provider start,
invalid response or failed image write goes to team review. Its reservation is
not released, and there is no blind retry. The per-scene allowance is at most
two attempts including its minor revision. Refunds, disputes and pauses stop
future claims and invalidate active leases. They cannot undo a provider request
that already started. Reconcile an uncertain charge/result before resuming.

## Operations and rollback

The systemd unit limits the worker to one CPU and 512 MiB. It heartbeats the
database every 30 seconds; checkout readiness requires a recent heartbeat.
Monitor paused orders in the protected team portal, remaining private disk,
provider spending and Stripe failures. Avoid printing prompts, portraits,
emails, tokens or provider response bodies in logs.

Customers save a private project link before checkout. It contains an access
token in its fragment and must be kept private. The initial version has no
automatic access email or social posting; the project page polls status and
offers authenticated downloads. Recover a lost link through the team after
verifying the buyer's identity and payment. Do not send a link based solely on
an email address supplied by someone asking for access.

The owner desk can review a consolidated minor revision, queue a selected scene
within its remaining order budget and two total image attempts, or upload a
manually adjusted picture. Manual replacement invalidates that scene's active
lease; unresolved work prevents release. Reconcile a possibly billed provider
result in the provider dashboard before choosing manual completion. Conservative
reservations remain on ambiguous or manually completed attempts.

If anything fails, set the automation flags false and stop `picture-studio`.
Existing paid orders and image files stay in the database/private folder for
manual completion. Use `leadflow-release --rollback` only for the approved web
release rollback; do not drop the order tables or delete customer files.
Restarting a worker reconciles expired leases through the database state
machine. A possibly billed provider attempt stays paused for human review.

During every future website release or rollback, stop this worker before changing
`/var/lib/leadflow-releases/current`, preflight the new target, and restart the
single worker. Confirm that the release includes the worker TypeScript source,
`scripts/register-ts.mjs`, `scripts/ts-hook.mjs`, and its installed dependencies.
The unit cannot run from a standalone artifact that omits those files.

Official provider references checked October 6, 2026:

- https://developers.openai.com/api/reference/resources/images/methods/generate
- https://developers.openai.com/api/reference/resources/images/methods/edit
- https://developers.openai.com/api/docs/guides/image-generation
