# The LeadFlow Pro's own database on the droplet (proposal)

**Status, September 28, 2026: waiting on Ryan's yes. Nothing here has been
created.** `CLAUDE.md` still lists where the database and logins will run as
not decided. When Ryan says yes, that line becomes the decision, with its date.

## The question for Ryan

Supabase is being switched off (owner decision, September 26, 2026). Where
should the site's data and logins live instead?

**Recommended: in a Postgres database in a container on the droplet, next to
the site, backed up every night. Logins move into the same database later.**

- **Yes** starts phase A only: `db.sh setup` creates an empty database on the
  droplet, turns on the nightly backup and a weekly restore test, and takes the
  first backup. The site does not use it yet. Moving data and logins comes
  later, one phase at a time, each with its own approval (the plan below).
- **Not yet** changes nothing. The site keeps running on Supabase, and steps 3
  to 5 of the Back Office build (which need somewhere to save new data) wait.

## Needs Ryan

1. **Yes or not yet** to the recommendation above.
2. **A copy of the backups off the droplet: which one, if any.** The nightly
   backups sit on the same droplet, so they protect against mistakes and bad
   data, not against losing the droplet itself. Two ways to cover that, both
   paid (check DigitalOcean's current prices):
   - DigitalOcean's own droplet backups: a setting on the droplet that copies
     the whole droplet on a schedule. No code.
   - A nightly copy of these backup files to DigitalOcean Spaces (storage off
     the droplet): a small addition to `db.sh`, with its own approval.

   Phase A can start without this; the gap stays open until it is chosen.

## Why this option

- It is what the September 26 decision asks for: everything on the one
  droplet, nothing new on Supabase.
- It is the same database Supabase runs today (Postgres 17), so the data moves
  with Postgres's own export and import tools; none of it is retyped. It also
  sorts names the same way Supabase does.
- It is small. The whole Supabase database is 46 MB today, so backups are
  small and quick.
- The brain's own database on the droplet is left alone. The site's data and
  the brain's stay apart, so a mistake in one cannot take down the other.

Other options considered:

| Option | Why not, for now |
| --- | --- |
| A new database inside the brain's Postgres, already on the droplet | It means changing that shared server's network and access settings, which the brain depends on. One mistake would take both down. |
| DigitalOcean's managed database | It lives off the droplet and is a separate monthly bill, and the September 26 decision puts everything on the droplet. It is the natural upgrade later, if the business outgrows one server. |
| Running Supabase's own open-source stack on the droplet | Fewer code changes, but it is more than ten services to run and patch on a droplet already short on memory and disk, and it keeps the site tied to Supabase, which the decision retires. |

## What yes creates (phase A)

- **The database:** Postgres 17 in a container named `db`, beside the site's
  containers. Its data lives in the Docker volume `theleadflowpro_db-data`.
- **Who can reach it:** no port is opened on the droplet, so nothing on the
  internet can reach it. The site's own containers reach it as `db:5432`.
  Programs on the droplet itself would also need the password.
- **Password:** `db.sh setup` makes one in `/etc/theleadflowpro/db-password`,
  readable by root only. It is never shown, logged or committed.
- **Nightly backup:** 3:15 AM Central. `db.sh backup` saves a compressed copy in
  `/var/backups/theleadflowpro/db/`, checks that the file reads back, and keeps
  the newest 14. A backup never overwrites another, and one that hangs stops
  after 15 minutes so it cannot block the next. With less than 1 GB of disk
  free it skips the backup and says so, rather than filling the disk the site
  needs.
- **Weekly restore test:** Sundays, 4:15 AM Central. `db.sh restore-check`
  restores the newest backup in full into a scratch copy, checks every table
  came back, and deletes the copy. The live database is not touched. This is
  the real proof a backup works; the nightly read-back is a quick check.
- **Status:** `check.sh` gains a Database section: running, stopped or off;
  size; the newest backup and its age; the last restore test. It flags a
  backup more than a day old and a restore test more than 8 days old.

It changes nothing else: no site code reads it, deploys never start or restart
it, and the brain, Caddy and DNS are untouched.

**The droplet is short on memory.** On September 28 at 12:52 PM CT, memory was
86% used with swap full, and the disk 88% used (about 9.3 GB free). In the
test below, the database used 30 to 45 MB of memory; it is capped at 512 MB.
`db.sh setup` stops without changing anything if less than 300 MB of memory or
2 GB of disk is free.

## Turning it on (after Ryan's yes)

1. In DigitalOcean, take a snapshot of the droplet (the undo button).
2. Merge the pull request. Then, in the droplet console:

   ```bash
   sudo /opt/theleadflowpro/deploy/droplet/deploy.sh
   sudo /opt/theleadflowpro/deploy/droplet/db.sh setup
   sudo /opt/theleadflowpro/deploy/droplet/check.sh
   ```

   `deploy.sh` brings the new scripts onto the droplet (it is a normal deploy
   of main). `db.sh setup` asks you to type `CREATE THE DATABASE`. Good looks
   like: Database `running healthy`, `port on the droplet none`, one backup,
   restore check `ok`.

## Everyday commands (all as root, on the droplet)

| Command | What it does |
| --- | --- |
| `db.sh backup` | A backup now (the nightly timer does this anyway). |
| `db.sh restore-check` | Proves the newest backup restores, without touching the live database. |
| `db.sh restore <file>` | Replaces the live database with a backup. Asks you to type `REPLACE THE DATABASE`, saves a fresh backup first (the undo), restores into a copy beside the live one, then swaps the two in one step. The site stops only for the swap, and is started again even if the swap fails. The replaced database is kept as `leadflow_before_restore` until the next restore. |
| `db.sh off` | Asks you to type `TURN THE DATABASE OFF`, takes a last backup if the database answers within two minutes, then stops it and its timers. Keeps the data and the backups. `db.sh setup` turns it back on. |
| `db.sh status` | Same as `check.sh`. |

The full path is `/opt/theleadflowpro/deploy/droplet/db.sh`. A backup and a
restore never run at the same time; the second one waits for the first.

## Moving off Supabase, phase by phase

### What has to move

From a read-only check of the live Supabase project ("The LeadFlow Pro",
Postgres 17.6) on September 28, 2026, the September 27 export in
`migration/supabase-export/`, and a count of the code on main the same day:

- **Data:** 136 tables (119 in `public`, 8 in `leadflow`, 8 in `archive`, 1 in
  `private`), 46 MB in all. This includes the agent memory and task bus that
  `AGENTS.md` says move off Supabase.
- **Database logic, in the main `public` schema:** 100 functions, 53
  triggers, 2 views and 140 row-level rules. 19 of those rules read the
  signed-in user from Supabase's login system, so they get re-pointed to the
  site's own logins.
- **Logins:** 4 accounts, with 17 links from other tables pointing at them.
  Sign-in today: password (with sign-up and password reset), emailed link,
  Google (set up for theleadflowpro.com accounts), and client portal invites.
- **Live updates:** 21 tables send live changes; 3 admin screens use them
  (command center, operator, Content Command).
- **Files:** 5 storage buckets holding 3 files. The code uses two:
  `deliverables` (sales deliverables) and `intake` (files customers upload
  during Time Back onboarding). The Time Back upload goes straight from the
  browser to Supabase and skips a failed upload without saying so, so it has
  to move before Supabase is switched off, or customers' files would quietly
  go missing.
- **Server code:** the `quo-webhook` function (still needed; the other one is
  not), 1 secret in Supabase's Vault, and the Supabase keys in `web.env`.
- **In the site's code:** 178 files import a Supabase client, with about 740
  queries and 40 database functions called by name.
- **Outside readers:** the Ads Brain on the droplet reads LeadFlow's data
  through a read-only account (`tlfp_reader`); it needs the same on the new
  database. The site also reads Premier Dental's scoreboard from Premier's
  Supabase, which moves with Premier's own switchover.
- **Extensions:** pgcrypto, uuid-ossp and pg_stat_statements, all included in
  the standard Postgres image. Supabase's Vault is its own; its one secret
  moves to the droplet's secret files.

The repo's `supabase/migrations/` cannot rebuild this database (only 5 of 122
live changes match; see the export README), so the move copies the live
structure and data with `pg_dump`, not the repo's migration files.

### The phases

Each phase is its own pull request and its own approval. Supabase keeps
running, unchanged, until the last phase, so every phase before it can be
undone by pointing back.

| Phase | What happens | Who notices | How it is tested | How to undo |
| --- | --- | --- | --- | --- |
| A. The database, empty | `db.sh setup`: container, backups, restore test | Nobody | First backup and restore test; `check.sh` | `db.sh off` |
| B. New Back Office data starts here | Steps 3 to 5 (replies, imported calls and emails, the usage log) save here from day one. The site gets its own limited account, so row-level rules apply to it. | Ryan, in the Back Office | Fictional data on a copy; one user cannot see another's rows | Turn the new feature off; nothing else depends on it yet |
| C. Nightly practice copy of Supabase | A read-only copy of Supabase's data lands here each night, to rehearse the move and compare counts | Nobody | Row counts, table by table, against Supabase | Stop the copy and drop the copied tables |
| D. The site moves, one area at a time | Each area (leads, sales, content, Time Back uploads, and so on) switches its reads and writes from Supabase to here, in its own pull request. Live updates and the Ads Brain's read-only account move with their areas. | That area's admin screens | The area's tests, plus cross-user checks, on a copy | Switch that area back; anything written meanwhile is copied back first |
| E. Cutover night | A quiet hour: writes paused, a final copy, the remaining areas switched, the Quo webhook re-pointed, the 3 files moved | A pause of minutes | Counts match; sign in; one test lead end to end | Point back to Supabase, still running and untouched |
| F. Logins | The 4 accounts move to the site's own table, keeping their IDs so the 17 links still line up. Passwords carry over without resets (Supabase keeps them in a standard scrambled form the site can check). Google sign-in, emailed links (sent through Resend, already in use), password reset and portal invites come along. | The 4 people who sign in, once (one fresh sign-in) | Each sign-in method with a test account | Switch sign-in back to Supabase; the accounts are untouched there |
| G. Supabase off | After 14 to 30 quiet days: a final export kept encrypted and out of GitHub, then pause (not delete) the project | Nobody | Nothing has called the Supabase address for 14 days | Un-pause the project |

## Undoing it

- **Before phase B:** `db.sh off`. To remove every trace of the (still empty)
  database: `docker volume rm theleadflowpro_db-data`, delete
  `/etc/theleadflowpro/db-password` and `/var/backups/theleadflowpro/`, and
  remove the four `theleadflowpro-db-*` files from `/etc/systemd/system/`.
- **Phases B to F:** Supabase stays the working copy for everything not yet
  moved, and keeps running untouched until phase G, so going back means
  pointing back.
- **Phase G:** pausing is reversible. Deleting the Supabase project is not, and
  is a separate decision.

## Tested (September 28, 2026, on a throwaway copy with made-up data)

Run in a scratch environment with Docker, a stand-in site and fictional rows
(made-up names, 555 phone numbers, example.test emails). Nothing touched the
droplet, Supabase or any real data. An independent review of the first draft
found 14 problems, two of which could lose a backup. All were fixed; a second
review of the fixes found 5 smaller ones, which were fixed too. The checks
below were re-run on the final version.

- **Setup:** a wrong phrase changes nothing; the memory and disk checks stop it
  cleanly; with the real phrase the whole setup took 9 seconds: database
  healthy, no port on the droplet, first backup taken and checked. A missing
  password file stops the start with a clear error instead of creating an
  empty folder. Run again after `db.sh off`, it said it was turning the
  existing database back on, reused the password, and the data was still there.
- **Sorting:** the new database sorts names the way Supabase does (apple,
  Apple, banana, Banana).
- **Deploys:** the deploy steps, run with the database up, with and without
  `db` in the profiles, never restarted the database and never started the
  worker. On main, the old worker line would have started the worker whenever
  anything was in the profiles file.
- **Backups:** 20 files became the newest 14. Two backups in the same minute
  kept separate names. A second run waits for the first, and a restore prompt
  left open does not hold up a backup. A nearly full disk skips the backup and
  leaves the older ones alone. Against a frozen database, a backup gave up at
  its time limit and freed the lock. If the image cannot be downloaded, setup
  says so plainly.
- **Restore test:** it caught a cut-off backup and one that listed fine but
  would not restore, left no scratch copy behind, and recorded `FAILED` for
  `check.sh`, including when the database was stopped.
- **Restore:** after a simulated mistake (rows deleted, a table dropped, a stray
  table added), a restore brought everything back, kept the mistaken version as
  `leadflow_before_restore`, and saved an undo backup first. Restoring the
  oldest of 14 backups, or one taken seconds earlier, worked and kept the file,
  and so did a restore whose file a backup rotated out while its prompt waited.
  A session left open on the old copy did not block it. When the swap was made
  to fail after the site stopped, the site was started again by itself and the
  live database was unchanged. The stand-in site stopped for about a second
  during a swap; a whole restore took 23 seconds.
- **Off:** `db.sh off` took a last backup and kept the data and backups. With
  the database paused, or frozen, it said there was no last backup and still
  turned it off. `check.sh` then showed `off; its data is kept`.
- **Timers:** valid systemd units. 3:15 AM Central stays 3:15 AM Central after
  daylight saving time ends (08:15 UTC in summer, 09:15 UTC in winter).
- `tests/droplet-db.test.ts` pins these rules so a later change cannot quietly
  undo them; each test was checked to fail when its rule is broken.

## Technical notes

- Image `postgres:17.11-alpine3.24`, the tested build, pinned. It is the same
  major version as Supabase (17.6 on September 28, 2026), so a `pg_dump` from
  Supabase restores without a version change. The database is created with
  ICU `en-US` sorting, as Supabase's is. Small settings for a busy droplet:
  `shared_buffers=64MB`, `max_connections=20`, memory capped at 512 MB.
- Updating the image is a deliberate step: a new tag in a pull request, then
  `db.sh setup` to start the new container on the same data. If the new image
  brings a different ICU version, Postgres warns about a collation version
  mismatch; then run `REINDEX DATABASE leadflow;` and
  `ALTER DATABASE leadflow REFRESH COLLATION VERSION;`.
- The admin account (`postgres`) is used only by `db.sh`, from inside the
  container. The site gets its own account in phase B, without admin rights,
  because the admin account skips row-level rules.
- Backups are `pg_dump -Fc` files named by Central time to the second
  (`leadflow-YYYY-MM-DD-HHMMSS.dump`), mode 600 in a mode 700 folder.
- Settings made on the database itself (`ALTER DATABASE … SET`, who may
  connect) are not in the backups. From phase B, keep such settings on the
  accounts (`ALTER ROLE … SET`) so a restore keeps them.
- Deploying a commit from before this change takes `db.sh`, and `check.sh`'s
  Database section, out of the checkout. The database keeps running, but the
  nightly backup fails until a newer commit is deployed, and nothing on the
  droplet points it out. After such a rollback, deploy main again soon.
- `deploy.sh` now starts the Content Command worker only when `worker` is one
  of the comma-separated names in `/etc/theleadflowpro/compose-profiles`.
