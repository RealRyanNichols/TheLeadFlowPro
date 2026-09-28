# The LeadFlow Pro's own database on the droplet

**Decided September 28, 2026 (owner):** the site's data and logins live in a
Postgres database in a container on the droplet, next to the site. It is
backed up every night, with a copy of every nightly backup in The LeadFlow
Pro's Google Drive. `CLAUDE.md` records the decision.

## Decisions (September 28, 2026)

1. **Where it lives:** Postgres 17 in a container on the droplet, beside the
   site. Logins move into the same database later (phase F).
2. **Backups off the droplet:** a copy of every nightly backup goes to The
   LeadFlow Pro's Google Drive, in the folder "LeadFlow Pro database backups".
3. **Client logins:** a client's login links to the lead it came from, and is
   also matched by email. The details a client signed up with are what we use,
   unless the client says otherwise.

Moving data and logins off Supabase still happens one phase at a time (the plan
below), each phase with its own approval.

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

## What the setup creates (phase A)

- **The database:** Postgres 17 in a container named `db`, beside the site's
  containers. Its data lives in the Docker volume `theleadflowpro_db-data`.
- **Who can reach it:** no port is opened on the droplet, so nothing on the
  internet can reach it. The site's own containers reach it as `db:5432`.
  Programs on the droplet itself would also need the password.
- **Password:** `db.sh setup` makes one in `/etc/theleadflowpro-db/db-password`,
  readable by root only. It is never shown, logged or committed. That folder
  is separate from `/etc/theleadflowpro` on purpose: the site's scheduled-jobs
  container can read `/etc/theleadflowpro`, but no container can read
  `/etc/theleadflowpro-db`.
- **Nightly backup:** 3:15 AM Central. `db.sh backup` saves a compressed copy in
  `/var/backups/theleadflowpro/db/`, checks that the file reads back, and keeps
  the newest 14. A backup never overwrites another, and one that hangs stops
  after 15 minutes so it cannot block the next. With less than 1 GB of disk
  free it skips the backup and says so, rather than filling the disk the site
  needs.
- **Copy in Google Drive:** right after each nightly backup, `db.sh backup`
  copies it to The LeadFlow Pro's Google Drive, folder "LeadFlow Pro database
  backups", and removes copies there older than 30 days (they go to Drive's
  trash, which Google empties after 30 days). rclone does the copy
  and checks its size and checksum. The link is made once with
  `db.sh drive-link`: one Google sign-in as The LeadFlow Pro's account, in any
  browser. Its access covers only the files it creates, and the sign-in stays
  on the droplet, readable by root only. If a copy fails, the backup on the
  droplet still stands, and `check.sh` shows the failure.
- **Weekly restore test:** Sundays, 4:15 AM Central. `db.sh restore-check`
  restores the newest backup in full into a scratch copy, checks every table
  came back, and deletes the copy. The live database is not touched. This is
  the real proof a backup works; the nightly read-back is a quick check.
- **Status:** `check.sh` gains a Database section: running, stopped or off;
  size; the newest backup and its age; the last Google Drive copy; the last
  restore test. It flags a backup or Drive copy more than a day old and a
  restore test more than 8 days old.

It changes nothing else: no site code reads it yet, deploys never start or
restart it, and the brain, Caddy and DNS are untouched.

The backups hold the site's data, and later the client records and login
details, so the Drive folder stays private to The LeadFlow Pro's account: no
sharing links.

**The droplet is short on memory.** On September 28 at 12:52 PM CT, memory was
86% used with swap full, and the disk 88% used (about 9.3 GB free). In the
test below, the database used 30 to 45 MB of memory; it is capped at 512 MB.
`db.sh setup` stops without changing anything if less than 300 MB of memory or
2 GB of disk is free.

## Turning it on

1. In DigitalOcean, take a snapshot of the droplet (the undo button).
2. After the merge, in the droplet console:

   ```bash
   sudo /opt/theleadflowpro/deploy/droplet/deploy.sh
   sudo /opt/theleadflowpro/deploy/droplet/db.sh setup
   sudo /opt/theleadflowpro/deploy/droplet/db.sh drive-link
   sudo /opt/theleadflowpro/deploy/droplet/check.sh
   ```

   `deploy.sh` brings the new scripts onto the droplet (it is a normal deploy
   of main). `db.sh setup` asks you to type `CREATE THE DATABASE`.
   `db.sh drive-link` asks you to type `LINK GOOGLE DRIVE`, shows a Google
   link to open in any browser, and asks you to paste back the address the
   browser lands on after you sign in as The LeadFlow Pro's account and press
   Allow. What you paste is not shown on screen. Good looks like: Database
   `running healthy`, `port on the droplet none`, one backup, a Google Drive
   copy `ok`, restore check `ok`.

## Everyday commands (all as root, on the droplet)

| Command | What it does |
| --- | --- |
| `db.sh backup` | A backup now, copied to Google Drive (the nightly timer does this anyway). |
| `db.sh drive-link` | Links the backups to The LeadFlow Pro's Google Drive, or links them again (for example after a password change). A failed try leaves an existing link as it is. |
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
| F. Logins | The 4 accounts move to the site's own table, keeping their IDs so the 17 links still line up. Each client's login links to the lead it came from and is also matched by email; the details they signed up with stand unless they change them. Passwords carry over without resets (Supabase keeps them in a standard scrambled form the site can check). Google sign-in, emailed links (sent through Resend, already in use), password reset and portal invites come along. | The 4 people who sign in, once (one fresh sign-in) | Each sign-in method with a test account | Switch sign-in back to Supabase; the accounts are untouched there |
| G. Supabase off | After 14 to 30 quiet days: a final export kept encrypted and out of GitHub, then pause (not delete) the project | Nobody | Nothing has called the Supabase address for 14 days | Un-pause the project |

## Undoing it

- **Before phase B:** `db.sh off`. To remove every trace of the (still empty)
  database: `docker volume rm theleadflowpro_db-data`, delete
  `/etc/theleadflowpro-db/db-password` and `/var/backups/theleadflowpro/`, and
  remove the four `theleadflowpro-db-*` files from `/etc/systemd/system/`.
- **The Google Drive link:** delete `/etc/theleadflowpro-db/rclone.conf` on the
  droplet, and remove "rclone" under Third-party access in The LeadFlow Pro's
  Google account (Security settings). The copies already in Drive stay until
  someone deletes them.
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
- **Google Drive copy:** tested with a local folder standing in for Drive,
  since the real link needs The LeadFlow Pro's Google sign-in. A backup's copy
  arrived byte for byte and `check.sh` showed it; copies older than 30 days
  were removed while a 10-day-old copy, an unrelated file and a copy in a
  subfolder stayed; a failed copy kept the new backup on the droplet and
  showed `FAILED`; in setup, a failed copy no longer skips the restore check.
  The link: a wrong phrase, a wrong address and a sign-in Google refused each
  linked nothing and left nothing behind; a failed re-link kept the working
  link; a backup ran in a second while the sign-in prompt was open; a second
  link at the same time was turned away. The Google link asks only for access
  to its own files. The site's scheduled-jobs container cannot see the
  password or the Drive sign-in. A third independent review, of the Drive
  copy, found 9 problems (the worst: the sign-in would have sat where that
  container could read it); all were fixed and re-tested.
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
- The Google Drive copy uses rclone from Ubuntu's packages (1.60 on Ubuntu
  24.04) with the `drive.file` scope, so it can see and change only the files
  it creates. Its sign-in is in `/etc/theleadflowpro-db/rclone.conf` (mode
  600), in the folder no container mounts. The address pasted during
  `db.sh drive-link` carries a one-time code: it is read without being shown,
  handed to rclone through curl's standard input (so it never appears in the
  droplet's process list), and rclone's own output, which repeats the sign-in,
  is deleted as soon as rclone finishes. The link refuses to show a Google
  link that asks for more than `drive.file`.
- A sign-in left open at the prompt never holds up the nightly backup: the
  link takes the backup lock only for the moment it swaps the new sign-in in.
  The prompt gives up after 15 minutes, and rclone after 20, even if the
  script is killed.
- Installing rclone sets `NEEDRESTART_SUSPEND=1`, so Ubuntu's package tools do
  not restart the droplet's other services while it installs.
