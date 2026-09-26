# Longview business directory: decisions for the owner

Everything below stays off until the owner says yes. The directory is built so
that each of these is one switch or one step, not a rebuild.

Already decided (Sept 24, 2026): the directory will live on theleadflowpro.com
at `/longview/businesses`, and the engine runs on the LeadFlow DigitalOcean
droplet. Later the same day the owner moved off Vercel: nothing is deployed to
Vercel any more, and the directory is built and served from the droplet
(`https://longview.165-227-248-110.sslip.io/longview/businesses/` until the
LeadFlow site itself runs there).

## 1. Go-ahead to install the engine on the droplet

**What it changes:** one new service (`longview-archive`, running as its own
user `lvarchive`), code in `/opt/longview-archive`, data in
`/var/lib/longview-archive`, and one new Caddy site file for the directory and a private
status page. Nothing else on the droplet is touched: not the CRM, not Premier, not
DNS, not any other site.

**How:** paste the one command in `deploy/longview-archive/README.md` into the
DigitalOcean web console, or ask the session that has droplet access to run it.
Undo with `uninstall.sh`; the data stays until someone deletes it on purpose.

**Why it needs you:** this cloud session has no shell on the droplet, and the
brief says not to look for another way in.

## 2. Let Google index the profiles

**Default:** pages are live on the droplet but marked `noindex`, and there is
no sitemap.

| Option | Upside | Risk |
| --- | --- | --- |
| Keep noindex | No search risk while the first batches are checked | No search traffic to the profiles |
| Index profiles with a fact from the business's own website (recommended) | Search traffic to the useful profiles; thin ones stay out | Takes a few weeks of crawling before most profiles qualify |
| Index everything | The most pages in search | Thousands of thin pages (name, category, "Longview, TX") can drag down how Google rates the whole LeadFlow site |

**How:** turn on the engine's `LVA_INDEXABLE=1` setting; the pages drop noindex
and a sitemap is written at the next build. The per-profile rule is already
built. The staging address also tells search engines to stay away in its Caddy
file, so real indexing happens together with the move to theleadflowpro.com
(one approved Caddy change and DNS).

## 3. How batches reach the website

**Default:** a person approves each batch on the droplet with one command,
`lva approve` (it records who). The engine writes a new batch every 45 minutes;
the public pages change only when one is approved. The status page shows how
many businesses a waiting batch would add, remove, or change. Nothing goes
through GitHub or Vercel.

**Option (built, off):** auto-approve, `lva approve --auto on`. Each new batch
is approved by itself, except one that would remove more than a quarter of the
listed businesses: that one waits for a person and the status page says so.
Turn it off with `lva approve --auto off`.

| Option | Upside | Trade-off |
| --- | --- | --- |
| Approve by hand (default) | A person looks at every change before it is public | Someone runs one command on the droplet per batch |
| Auto-approve (built, off) | The directory keeps itself current | New listings appear without a person looking first (large removals still wait) |

Removal requests never wait: `lva suppress` takes a listing off at once.

## 4. Claim invites

Whether each listed business gets one "claim your free listing" email
(business to business, one message at most, no texts), and from whom. Not
built. Nothing contacts any business today.

## 5. The Call Desk

Whether the archive may feed the LeadFlow Call Desk. That is Ryan's call.
Do Not Contact is honored everywhere. Not built. The engine keeps two private
lists (businesses without a website, businesses that are hiring) that are not
sent or imported anywhere.

## 6. Scope

**Default:** the City of Longview only. Businesses outside the city limits go
into a hidden "nearby" bucket. The options are Gregg County, or about 25
miles around Longview.

## 7. Network access for Claude sessions (optional)

This cloud environment blocks `data.texas.gov`, `overpass-api.de`,
`npiregistry.cms.hhs.gov`, `www.theleadflowpro.com`, and the droplet's status
host. Allowing them lets a Claude session pull the public records directly and
read the status page for the weekly digest. The droplet does not need this.
Change it in the session's environment settings under Network access.
