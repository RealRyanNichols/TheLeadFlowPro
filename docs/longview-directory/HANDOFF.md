# Longview business directory: handoff

For Amanda and Ryan. Written Sept 24, 2026 (Central time).

## Where it stands

- **Built and tested, not yet running.** The engine that builds the directory
  and the profile pages on theleadflowpro.com are finished and pass their tests.
  Nothing is live yet, and nothing has been published.
- **The real Longview count is not in yet.** This Claude session could not
  reach the Texas open data portal or the droplet, so it has not pulled a single
  real business. The count arrives within minutes of the engine starting on the
  droplet.
- **One step turns it on:** paste one command into the DigitalOcean console
  (below). After that it runs around the clock on its own.

## Where to see it (once installed)

- **Status page, for you:** https://longview.165-227-248-110.sslip.io/status/
  shows businesses found, websites read this week, facts checked, what is ready
  to publish, what needs review, errors, and a heartbeat. It is private: search
  engines are told to stay away, and it shows only counts, never names.
- **The directory, for the public:** https://www.theleadflowpro.com/longview/businesses
  appears once the first batch is approved. Until then that address shows "not
  found" on purpose.

## Turn it on (the one step)

In DigitalOcean, open the droplet **leadflow-web**, then **Access**, then
**Launch Droplet Console**, and paste:

```bash
bash -c 'set -e; d=$(mktemp -d); trap "rm -rf $d" EXIT; git clone --depth 1 --branch claude/serene-edison-daodg6 https://github.com/RealRyanNichols/TheLeadFlowPro.git "$d/src"; bash "$d/src/deploy/longview-archive/install.sh"'
```

After the pull request merges, use `--branch main` instead. The installer:

- Checks the droplet first. It stops without changing anything if Caddy is too
  old, disk space is short, or it is not on leadflow-web.
- Adds one service (`longview-archive`) that runs as its own user
  (`lvarchive`), with its code in `/opt/longview-archive` and its data in
  `/var/lib/longview-archive`.
- Caps the service at half a CPU and 700 MB of memory, and blocks it at the
  system level from reaching the CRM, Postgres, or anything else private on the
  droplet.
- Adds one Caddy file for the private status page, and reloads Caddy only after
  Caddy approves the change.
- Touches nothing else: not DNS, not the Premier site, not the Call Desk, not
  any other site, and not any settings file.

## What happens next, in order

1. **Minutes after install:** it reads the Comptroller's list of active
   sales-tax permits for Longview. The status page shows the real count.
2. **The first days:** it reads business websites, two at a time with 20
   seconds between requests to any one site, collecting hours, phone, office
   email, Facebook and Instagram, careers pages, and services. A few thousand
   websites take days at this pace. That is expected.
3. **Every 45 minutes:** it writes a batch of the profiles that are ready.
4. **You approve a batch:** the batch goes into a pull request. Today someone
   with droplet access copies it in. If you turn on automatic pull requests
   (off until you add a GitHub token on the droplet; steps in the README), the
   engine opens and updates that one pull request itself, at most once a day.
   Either way you look at the preview, and merging the pull request puts those
   profiles on theleadflowpro.com. The engine never merges.

## The rules it follows

- Businesses only. It never shows a person's name. A sole proprietor listed
  only under their own name, with no website or storefront, is held back.
- A home address shows as "Longview, TX" only. A street address is shown only
  when there is proof it is a storefront.
- Phone and email come only from the business's own website. Email is shown
  only for office addresses like info@ on the business's own domain.
- Every fact shows where it came from and the date it was checked. Every
  profile says it is not affiliated and not ranked, and has a "Claim, correct,
  or remove this listing" button that emails hello@theleadflowpro.com.
- Nothing is guessed. Anything unclear waits in a review queue for a person:
  unclear hours, a phone outside 903/430, a social account that may not be the
  business's.
- It contacts no one. It sends no email, text, or DM, and puts nothing into the
  CRM or an ad audience.

## What was tested

- **The engine:** 576 automated tests pass. They cover the privacy rules, the
  hours reader, matching duplicate records, the crawl limits, the 24/7 loop
  (pause, low disk, restarts, backups), the installer, and the automatic
  batch pull requests (against a pretend GitHub: it never merges, never names
  a hidden business, and never leaks the token). The installer runs
  in a sandbox and is checked against real Caddy.
- **The whole pipeline:** it runs end to end on a set of made-up businesses and
  websites. It confirms that a sole proprietor listed under his own name is held
  back, that a home-based business shows "Longview, TX" only, that a chain gets
  one profile per location, that a removal request is honored, and that no
  owner name appears anywhere.
- **The website:** all 1,585 site tests pass and the full production build
  succeeds. Every directory page was checked on a phone-width screen:
  - one heading per page;
  - no accessibility errors;
  - no outside tracking added by these pages;
  - "not found" until a batch is approved.
- **An independent review:** six reviewers each looked for one kind of
  problem: privacy leaks, honesty, crawl politeness, reliability, installer
  safety, and the web pages. Two more checked each finding before it was
  fixed. They found and fixed about 45 real problems, such as:
  - hours like "08:00-05:00" being read as 8 AM to 5 AM;
  - a home address slipping through as a "storefront";
  - "Apply Now" finance links being counted as job pages;
  - a slow website being able to stall the engine.
- **Not tested yet:** real data. This session could not reach the state's
  open data portal. The first run on the droplet confirms the real column
  names and the real count. If the state has renamed a column, the status page
  says so and nothing is guessed.

## Needs your decision

See `docs/longview-directory/DECISIONS.md`. In short:

1. **Go-ahead to install** on the droplet (the paste above).
2. **Google indexing.** Profiles are live but hidden from Google until you say
   so. Recommended: allow indexing only for profiles with a fact from the
   business's own website, so thousands of thin pages don't count against the
   LeadFlow site.
3. **Automatic batch pull requests.** Built and off. With a GitHub token on
   the droplet, the engine opens the pull request for each batch; you still
   merge each one. Without it, someone copies each batch in by hand.
4. **Claim-your-listing emails.** One per business, or none. None are sent
   today.
5. **Call Desk.** Whether the directory feeds the Call Desk. That is Ryan's
   call.
6. **Scope.** The City of Longview only (the default), Gregg County, or about
   25 miles.

## Pause, undo, cost

- **Pause:** in the droplet console, `touch /var/lib/longview-archive/PAUSE`.
  **Resume:** `rm /var/lib/longview-archive/PAUSE`.
- **Undo:** `bash /opt/longview-archive/uninstall.sh`. This stops and removes
  the service and the Caddy file, then reloads Caddy. The collected data stays
  until someone deletes it on purpose.
- **Cost:** none new. It runs on the existing $48/month droplet.

## The safest next step

Paste the install command into the droplet console, then open the status page
and check that the heartbeat is current and a real business count appears.
