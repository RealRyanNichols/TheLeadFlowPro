# Longview Business Archive: operator runbook

This is the engine behind the LeadFlow Longview business directory. It runs
around the clock on the LeadFlow DigitalOcean droplet (`leadflow-web`). It
reads public business records and business websites politely, keeps a sourced
archive, and every 45 minutes writes one file with the businesses that are
ready to publish. It also builds the public directory pages itself, and Caddy
on the same droplet serves them. **Nothing reaches the public directory until
you approve a batch** with one command on the droplet (`lva approve`), or turn
on auto-approve.

Nothing here uses Vercel, GitHub, or any other deploy service: the engine makes
no calls to them, and the directory is built and served on the droplet only.

It never calls, texts, emails, or messages a business, and it never writes to
the CRM, an email list, or an ad audience.

Engineers: the contract is [SPEC.md](SPEC.md). The plan and log are in
`docs/longview-directory/`.

## Install (one paste)

In DigitalOcean, open the droplet and choose **Access → Launch Droplet
Console**. You are logged in as root. Paste one command.

**Until the pull request merges** (the one with this code; directory batches
never go through GitHub), use the working branch
`claude/serene-edison-daodg6`:

```bash
bash -c 'set -e; d=$(mktemp -d); trap "rm -rf $d" EXIT; git clone --depth 1 --branch claude/serene-edison-daodg6 https://github.com/RealRyanNichols/TheLeadFlowPro.git "$d/src"; bash "$d/src/deploy/longview-archive/install.sh"'
```

**After the pull request merges**, use `main`:

```bash
bash -c 'set -e; d=$(mktemp -d); trap "rm -rf $d" EXIT; git clone --depth 1 --branch main https://github.com/RealRyanNichols/TheLeadFlowPro.git "$d/src"; bash "$d/src/deploy/longview-archive/install.sh"'
```

To see every step first without changing anything, paste this instead (use
`main` in place of the branch name after the merge). It ends in
`install.sh" --dry-run'`: the flag goes after the double quote that closes
the path and before the final single quote.

```bash
bash -c 'set -e; d=$(mktemp -d); trap "rm -rf $d" EXIT; git clone --depth 1 --branch claude/serene-edison-daodg6 https://github.com/RealRyanNichols/TheLeadFlowPro.git "$d/src"; bash "$d/src/deploy/longview-archive/install.sh" --dry-run'
```

It takes a minute or two. The last lines show the status link and the
pause, resume, and rollback commands.

### What it changes

- Adds the system user `lvarchive`. It cannot log in and has no home folder.
- Puts the code in `/opt/longview-archive/app`. The copy it replaces stays as
  `app.previous`. It also makes an empty Python venv there; nothing is
  downloaded or installed into it.
- Keeps the data in `/var/lib/longview-archive`.
- Adds and starts one service, `longview-archive`, capped at half a CPU and
  700 MB of memory.
- Adds one Caddy file, `/etc/caddy/sites/longview-archive.caddy`, for the
  directory and the status page. It checks Caddy's whole config before reloading. If the check
  fails, it puts the file back and does not reload, so the live sites never
  change.
- Copies `uninstall.sh` and `preflight.sh` to `/opt/longview-archive/`.

### What it never touches

DNS, other Caddy sites, the Central Brain and Call Desk, the `brain`
database, pda-api and the Premier staging site, other users, SSH keys,
secrets, env files, timers it did not create, and system packages. It never
reboots.

It refuses to run unless it is root on Ubuntu, the machine is `leadflow-web`,
Python is 3.10 or newer, Caddy is 2.7 or newer, loads `sites/*.caddy`, and its
current config already validates, and at least 10 GB is free. All of these
are checked before the first change. It also stops if any folder in
`/var/lib/longview-archive` has been replaced by a symbolic link.

As root it changes only the top data folder, `/var/lib/longview-archive`.
Everything inside it is made by `lvarchive` itself, so nothing the service
could plant there can trick the installer into changing a file elsewhere.

### Check the droplet first (optional, read-only)

This prints versions, disk, service and timer names, and a PASS/WARN list. It
changes nothing and prints no secrets.

```bash
bash -c 'set -e; d=$(mktemp -d); trap "rm -rf $d" EXIT; git clone --depth 1 --branch claude/serene-edison-daodg6 https://github.com/RealRyanNichols/TheLeadFlowPro.git "$d/src"; bash "$d/src/deploy/longview-archive/preflight.sh"'
```

(Use `main` instead of the branch name after the merge.) After an install it
is also at `bash /opt/longview-archive/preflight.sh`.

## Where to see it

- **The directory:** **https://longview.165-227-248-110.sslip.io/longview/businesses/**
  (the address without a path goes there too). It shows the approved batch
  only. Until you approve the first one it says the first batch is being
  checked. Every page tells search engines to stay away while this is a
  staging address.
- **The status page:** **https://longview.165-227-248-110.sslip.io/status/**
  shows counts and job times only, never a name. It is not linked from
  anywhere, tells search engines not to index it, and loads nothing from other
  sites. The raw numbers are at `/status.json`. Its **Directory site** box says
  which batch is approved, when the pages were last built, whether
  auto-approve is on, and how many businesses a newer batch would add, remove,
  or change.

The very first visit can take a minute while Caddy gets its certificate.

## Everyday commands

Paste this shortcut once each time you open the console. It runs the engine's
command line as the service user, so files keep the right owner:

```bash
lva() { runuser -u lvarchive -- env -C /opt/longview-archive/app PYTHONPATH=/opt/longview-archive/app PYTHONDONTWRITEBYTECODE=1 /opt/longview-archive/venv/bin/python -m longview_archive "$@"; }
```

Every `lva ...` command below needs it.

### Pause and resume

Pause (the engine goes idle within about 30 seconds and stops reading
websites and open data; the status page keeps updating):

```bash
touch /var/lib/longview-archive/PAUSE
```

Resume:

```bash
rm -f /var/lib/longview-archive/PAUSE
```

### Rollback

```bash
bash /opt/longview-archive/uninstall.sh
```

This stops and disables the service, removes its unit file and the Caddy
file, checks Caddy's config, and reloads Caddy. **The data stays** in
`/var/lib/longview-archive` until someone deletes it on purpose. The code
stays too unless you add `--remove-code`. Add `--dry-run` to see the steps
first. Re-running the install one-liner brings everything back.

To delete the data on purpose (this cannot be undone):

```bash
rm -rf /var/lib/longview-archive
userdel lvarchive
```

To go back one code version without uninstalling:

```bash
systemctl stop longview-archive
mv /opt/longview-archive/app /opt/longview-archive/app.bad
mv /opt/longview-archive/app.previous /opt/longview-archive/app
systemctl start longview-archive
```

### Upgrade

Re-run the install one-liner. It stages the new code, runs the database
migration and self-check with the new code, and only then puts it in place
(keeping the old copy as `app.previous`). If the migration or self-check
fails, the new code is thrown away and the installed code and running service
are left as they were. After the restart it waits for the new engine to write
a fresh status page and stay up for 20 seconds with no restarts. If it does
not, it puts the previous code and unit file back, restarts the service on
them, and stops with a pointer to the log. It touches Caddy only if the site
file changed.

## Approving a batch

The engine writes a fresh publish file every 45 minutes. The public directory
changes only when a batch is approved.

1. Open the status page and look at **Directory site → Waiting for approval**.
   It says how many businesses the newest batch adds, removes, and changes.
   To look at the file itself (only public fields are in it):

   ```bash
   less /var/lib/longview-archive/exports/publish/directory.json
   ```

   (Or write a fresh one first with `lva publish`.)

2. Approve it:

   ```bash
   lva approve --actor Amanda
   ```

   This copies the newest publish file to
   `/var/lib/longview-archive/exports/publish/approved.json`, records who
   approved it (`--actor`; it defaults to "operator"), and rebuilds the pages
   at once. `--batch latest` is the default; you can instead give the exact
   batch id you looked at (for example `lva approve --batch 2026-09-24T18:00Z`)
   and it refuses if a newer batch has been written since.

The pages re-check every record before they are built and leave out any that
breaks a rule (the status page counts them). A batch marked as sample data is
never approved.

To rebuild the pages from the approved batch without approving anything new
(for example after an upgrade):

```bash
lva site
```

## Auto-approve (optional, off by default)

Turn it on and each new publish file is approved and the pages rebuilt by
themselves, every 45 minutes:

```bash
lva approve --auto on
```

One exception: a batch that would remove more than 25% of the businesses on
the directory is **not** approved by itself. It waits for a person, and the
status page says "Needs a person: auto-approve is holding batch ...". Check
it, and if the removals are right, run `lva approve`. Turn auto-approve off
again with:

```bash
lva approve --auto off
```

## Moving to theleadflowpro.com later

The pages already use the final path, `/longview/businesses/`, and their
canonical links point at `https://www.theleadflowpro.com/longview/businesses/`.
When the LeadFlow website itself runs on this droplet, one approved change to
the Caddy configuration routes `/longview/businesses/` on theleadflowpro.com to
`/var/lib/longview-archive/www/longview/businesses`. Until then the directory
lives only on the staging address above. Letting search engines in is a
separate decision: `LVA_INDEXABLE=1` in the service drops the pages' noindex
tag and writes `sitemap.xml`, and the Caddy file's noindex header and
robots.txt must be changed in the same approved change.

## Removing a business

Removal requests arrive through the "Claim, correct, or remove this listing"
link on every profile, which goes to hello@theleadflowpro.com. One step, on
the droplet (the id starts with `lv-`; it is in the email's subject line):

```bash
lva suppress --id lv-abcde12345 --reason "owner asked"
```

It takes effect at once, without waiting for an approval: the business is
taken out of the approved batch, the pages are rebuilt without it, and the
engine never exports it again. The engine can also suppress by website domain,
phone number, or name and ZIP (`lva suppress --help`).

## Review queue

Anything uncertain waits for a person instead of being published: a new value
that conflicts with a checked one, hours without clear am/pm, a phone outside
903/430, a social link that may not be the business's, a website that does
not clearly belong to the business, a name that may be a person's, and
records that might be the same place.

```bash
lva review list
lva review accept <id> --actor Amanda
lva review reject <id> --actor Amanda
```

The `<id>` is the number `review list` shows. `--actor` records who decided
(it defaults to "operator"). Accepting a "website moved" item points the
business at its new address; the engine clears what it read on the old site
and reads the new one on its next loop, checking first that it belongs to the
business. Accepting a "website identity" item tells the engine the site is the
business's, and it reads that site again on its next loop.

## Other commands

| Command | What it does |
| --- | --- |
| `lva check` | Self-test: settings, database, disk, pause, caps |
| `lva status` | Write the status page now |
| `lva sync all` | Pull open data now (or `sales-tax`, `tabc`, `osm`, `npi`) |
| `lva match` | Match new records to businesses |
| `lva crawl-once --limit 5` | Visit up to 5 due websites once (stop the service first: `systemctl stop longview-archive`) |
| `lva publish` | Write a fresh publish file now (the engine does this every 45 minutes); it is not public until approved |
| `lva approve` | Approve the newest publish file and rebuild the directory (see "Approving a batch") |
| `lva approve --auto on` | Approve each new publish file by itself, except one that removes more than 25% (`--auto off` to stop) |
| `lva site` | Rebuild the directory pages from the approved batch |
| `lva exports` | Write the two private lists (no website; hiring) to `exports/private/`. They are sent nowhere |
| `lva backup` | Take a database backup now |
| `lva migrate` | Create or update the database tables |

## Crawl rules

- Reads `robots.txt` first and obeys it.
- At most 2 websites at a time, and at least 20 seconds between requests to
  the same site.
- At most 6 pages per visit, 2.5 MB per page, 20 seconds per request.
- Slows down when a site asks (429 or 503): waits 1, then 3, 7, and 14 days.
- Stops at a firewall challenge and moves on; it never tries to get around one.
- No cookies, no JavaScript, no forms, no logins.
- Re-checks each site every 30 days.
- Identifies itself in every request with a link to the directory's about page
  and the LeadFlow email.
- Refuses private and internal addresses. The service is also blocked at the
  system level from reaching this droplet's own services, private networks,
  and the cloud metadata address.

## Privacy

- Businesses only. A person's name is never published, logged, or exported.
  The taxpayer name on a state record is used only for privacy checks.
- A business listed under an owner's own name stays hidden until it has its
  own public presence (its own website, or an OpenStreetMap, TABC, or NPI
  listing).
- An address is shown only with storefront evidence. Otherwise the page says
  "Longview, TX" only.
- Phone, email, hours, social links, careers, and services come only from the
  business's own website. Emails are only general office addresses (such as
  info@) on the business's own domain.
- No ratings, reviews, photos, or copied text.
- Every profile lists its sources and the date each fact was checked, says it
  is not affiliated and has no rankings or endorsements, and has the "Claim,
  correct, or remove this listing" link.
- Nothing here contacts a business.

## Cost

It runs on the existing $48/month droplet. No new servers, paid APIs, API
keys, hosting, or other new spend. Hard caps: half a CPU, 700 MB of memory, 64 tasks,
and the lowest disk priority. It stops crawling and pulling data if free disk
space drops under 5 GB. It backs up the database nightly at 3:30 am Central
and keeps the newest 14 backups.

## Troubleshooting

| Question | Command |
| --- | --- |
| Is it running? | `systemctl status longview-archive --no-pager` |
| What happened? | `journalctl -u longview-archive -n 100 --no-pager` |
| The numbers | `cat /var/lib/longview-archive/www/status.json` |
| Self-test | `lva check` |
| Disk space | `df -h /` |
| Is a batch waiting? | the status page's "Directory site" box |
| Rebuild the directory | `lva site` |

- **It keeps restarting.** The log says why; it retries every 30 seconds.
  Pause it or roll back while you look.
- **The directory still says the first batch is being checked.** Nothing is
  approved yet: run `lva approve` (see "Approving a batch").
- **The status page does not load.** Wait a minute on the first visit (the
  certificate). Then check `systemctl status caddy --no-pager` and
  `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile`.
- **"Operation not permitted" to 127.0.0.1, 10.x, 169.254.169.254, or
  165.227.248.110 in the log.** That is the network guard doing its job; the
  engine is not allowed to reach them. The guard filters by address only, so
  DNS at 127.0.0.53 stays open on every port; the crawler's own check (ports
  80 and 443 on public addresses only) is what keeps it off local services
  there.

## For engineers

| File | Installed to |
| --- | --- |
| `longview_archive/` | `/opt/longview-archive/app/longview_archive/` (root-owned, read-only to the service) |
| `systemd/longview-archive.service` | `/etc/systemd/system/longview-archive.service` |
| `caddy/longview-archive.caddy` | `/etc/caddy/sites/longview-archive.caddy` (serves `/longview/businesses/` and `/status`) |
| `uninstall.sh`, `preflight.sh` | `/opt/longview-archive/` |

Tests (standard library only, no network):

```bash
cd deploy/longview-archive && python3 -m unittest discover -s tests
```

The directory pages are generated by `longview_archive/site.py` (with the
contract re-check in `validate.py` and the approval gate in `approval.py`).
To look at them locally with fictional data:

```bash
cd deploy/longview-archive
python3 tests/make_sample_directory.py /tmp/sample.json
python3 -c "import json; from pathlib import Path; from longview_archive import config, site; site.build_site(config.Settings(data_dir=Path('/tmp/lva-sample')), json.load(open('/tmp/sample.json')))"
```

The pages land in `/tmp/lva-sample/www/longview/businesses/` with a "Sample
data" banner.

`tests/test_deploy.py` runs the whole installer and uninstaller in a temporary
directory using two **test-only** hooks. Never set them on the droplet; the
scripts refuse one without the other:

- `LVA_INSTALL_PREFIX=/tmp/x` puts `/tmp/x` in front of every absolute path.
- `LVA_INSTALL_FAKE_SYSTEM=1` replaces `systemctl`, `caddy`, `useradd`,
  `runuser`, `id`, `chown`, `df`, and the hostname check with shell functions
  that log what they would have done (the fake `runuser` really runs
  `install -d`, as the test user, so the data folders can be checked).
