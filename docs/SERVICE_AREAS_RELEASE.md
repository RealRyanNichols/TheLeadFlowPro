# Service-area release handoff — October 3, 2026

The release candidate targets the DigitalOcean runtime and private filesystem storage. No Supabase migration or new provider dependency is part of this feature. Existing operator authentication remains unchanged. Production activation and acceptance are recorded by the deploying operator.

## Installation and initialization

The website runs as `leadflowsite` on Node 22.23.2 under `site@leadflow`. Its existing systemd sandbox needs one narrowly scoped writable directory outside release output:

```bash
sudo install -d -m 700 -o leadflowsite -g leadflowsite /var/lib/leadflow-service-areas
```

Add `/etc/systemd/system/site@leadflow.service.d/zz-service-areas.conf` with:

```ini
[Service]
ReadWritePaths=/var/lib/leadflow-service-areas
```

Use the accepted release process to reload/restart the service and configure the candidate service with the same writable path. Preserve every existing sandbox setting and writable-path entry. The production path is the default; `SERVICE_AREAS_DATA_DIR` is an optional trusted-server override requiring an absolute private path. Local development defaults to ignored `.data/service-areas`. No new secret is needed.

Initialize once, from the candidate source directory, as the website service user:

```bash
sudo -u leadflowsite env NODE_ENV=production node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/service-area-store.ts init /private/operator-approved-registry.json
```

The input is an external JSON registry, mode 0600, owned by the service user. It must contain reviewed unresolved commitments before accepting competing campaigns. Client identities and source evidence must never be committed to the public repository. Omitting the input creates an empty registry only; that does not establish that existing promises have been reconciled. Initialization is idempotent and never overwrites an existing valid store.

Check private storage without printing record contents:

```bash
sudo -u leadflowsite env NODE_ENV=production node --experimental-strip-types --no-warnings --import ./scripts/register-ts.mjs scripts/service-area-store.ts status
```

## Acceptance

1. Build/test the exact candidate from accepted current source, with only reviewed feature/integration changes.
2. Initialize the operator-approved private commitments outside Git. Verify the source-backed unresolved records remain absent from public HTML/static assets.
3. Verify existing admin sign-in, ordinary-user denial, save/reload, simultaneous stale-revision rejection, linked publication consent, and audit preservation.
4. Submit a clearly synthetic consented area request through the candidate. Confirm it appears privately in Territories, with CRM handoff pending and no automatic communication/public scarcity signal. Remove synthetic records from the candidate's isolated store before activation; preserve audit if any production test is explicitly authorized.
5. Activate through the established DigitalOcean process under the user's publication approval. Verify the real domain, neighboring routes, public anonymous projection, and expiration.
6. Independently verify actual operating bases, agreement amendments, publication permission, and ad-platform targeting before accepting competing campaigns.

## Backups, interrupted writes, and rollback

`state.json` contains the private registry, incoming requests, and audit snapshots in one atomic file. Copy it into approved private backup storage before activation and before rollback. The existing Postgres backup does not automatically include this directory; establish a private filesystem backup through the accepted operations workflow. Keep backups mode 0600, avoid public download paths, and test restoration into an isolated 0700 directory with the CLI status command.

Writes sync a 0600 temporary file, rename it atomically, and sync the directory. A write lock serializes processes. A crashed writer can leave `.write-lock`; it is never automatically stolen. Stop all writers, inspect its private owner metadata, back up `state.json`, remove only the stale lock, then resume and verify status. Never remove a lock while an active writer holds it.

Storage has a 50 MiB capacity guard. Reaching it stops new writes without discarding records; inspect growth and prepare an approved storage upgrade/export. No silent pruning occurs.

Rollback switches the application to the retained prior release. Keep `/var/lib/leadflow-service-areas`, its audit, and inquiries intact. Do not delete customer requests to hide the feature. The directory survives release swaps. Restore a backup only with all writers stopped and preserve the replaced snapshot first.

This registry does not mutate advertising platforms or confirm CRM delivery, outbound contact, payment, or campaign activation.
