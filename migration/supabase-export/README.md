# Supabase export: The LeadFlow Pro's live server functions (Sep 27, 2026)

The LeadFlow Pro and Premier Dental Academy of Longview are moving off Supabase and Vercel to the
DigitalOcean droplet (owner decision, Sep 26, 2026; see `CLAUDE.md`). This folder holds the code
that was actually running in this project's Supabase (`hpzpwfymwfgwspaixrxi`, "The LeadFlow
Pro"). It was captured before Supabase is switched off, so nothing is lost and the port starts
from what really runs.

- `functions/<name>/index.ts` is the deployed code, exactly as it ran, except the one redaction
  below.
- `MANIFEST.json` records, for each file, the live version, the sha256 of the live code, the
  sha256 of the committed copy, and the redacted lines.

## How the copies were checked

- Everything was read-only against Supabase. Nothing there was changed.
- Each function was copied twice, independently. The two copies were compared byte for byte and
  were identical. The versions match live on Sep 27, 2026.

## The two functions

| Function | Live version | What it does | Still needed? |
|---|---|---|---|
| `quo-webhook` | v3 | Logs every call and text on The LeadFlow Pro's Quo line onto the matching lead in the CRM (`lead_calls`, and the `log_quo_activity` database function). It ignores Premier Dental's line. | **Yes.** Port it to the droplet and re-point the Quo webhook to the new address. |
| `books-release-assets` | v1 | A one-time helper that uploaded one downloadable zip file into Supabase Storage. It expired in early September 2026, and the storage bucket it wrote to no longer exists. | **No.** Kept for reference only. |

### `quo-webhook`: use this copy, not `supabase/functions/quo-webhook/`

The copy under `supabase/functions/quo-webhook/` is **not** what runs. It is the live code plus a
deliberate hardening: if no token is configured, it refuses every request instead of falling back
to a built-in one. That hardening is the right version to port, but it has never been deployed.
This folder has what actually ran.

When porting, keep the hardening and replace the Supabase parts:

- the `supabase-js` service client;
- the `lead_calls` table and the `log_quo_activity` function, which must exist on the droplet's
  database;
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Redacted: 1 line

`quo-webhook` line 19 held a hardcoded fallback token (`BUILTIN_TOKEN`). It is replaced with
`REDACTED-see-migration/supabase-export/README`.

Treat that token as exposed: with the function's JWT check off, anyone holding it can create
leads. On the droplet, generate a new one, set it as `QUO_WEBHOOK_TOKEN`, and update it in the
Quo webhook URL. Better still, set `QUO_WEBHOOK_SECRET` so Quo's signature is checked.

`books-release-assets` contains two SHA-256 fingerprints (of an upload token and of the zip). A
fingerprint cannot be turned back into the token, and the function has expired, so nothing was
redacted there.

No personal data is in these files. The only phone number is The LeadFlow Pro's own business
line.

## Still to move before this Supabase project is switched off (owner steps; never into GitHub)

This folder is code only. The following also live in this Supabase project (read-only check,
Sep 27, 2026):

1. **The database: 119 tables, and 4 login accounts.**
   - The repo's `supabase/migrations/` (92 files) and the live history (122 changes, the latest
     applied Sep 27, 2026) do **not** line up; only 5 IDs match. The repo cannot rebuild this
     database.
   - Take a full `pg_dump` (structure and data) with the connection string from the Supabase
     dashboard, and move it to the droplet's database. It holds lead and client data and password
     hashes: keep it encrypted, move it over an encrypted connection, and never commit it.
2. **Stored files:** 5 Storage buckets with 3 files in total.
   - `intake`: 2 files.
   - `jv-estimate-uploads`: 1 file.
   - `deploys`, `deliverables` and `tlfp-brain-recordings`: empty.
3. **Secrets:**
   - the function environment variables;
   - one Supabase Vault entry (`leadflow_social_meta_app_id`);
   - anything in `/etc/theleadflowpro/web.env` that points at Supabase.

   They go into the droplet's secret store, never into GitHub.
4. **Logins:** the site's sign-in uses Supabase Auth. The 4 accounts need a new home on the
   droplet before Supabase is switched off.
5. **Outside services that call Supabase:** the Quo webhook (above), plus any page, script or
   worker that calls `hpzpwfymwfgwspaixrxi.supabase.co`.
6. **Premier Dental's scoreboard feed:** The LeadFlow Pro reads a live scoreboard from Premier
   Dental's Supabase (`scoreboard_public_daily`). It stops working when that project is switched
   off unless it moves too. Premier Dental's export is in its repo under
   `migration/supabase-export/`.

Do not switch this project off until the droplet's database and logins are running and tested.
