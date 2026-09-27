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

**Decided (Sept 27, 2026):** the owner asked for "all the businesses in
Longview". The directory now lists every business with a Longview address: the
sales-tax locations inside the city limits (`city`) and the ones just outside
them whose address is a Longview, Texas postal ZIP, 75601-75608 (`nearby`), plus the companies on the Texas
Comptroller's "Active Franchise Taxpayers" list (LLCs, corporations,
partnerships in good standing) with a Longview address and no sales-tax
location. A franchise-tax listing shows the company name, "Longview, TX" (its
address on that list is a mailing address and is never shown), and the year its
franchise-tax registration began; exempt organizations (most nonprofits) are
not listed from it, and a name that may be a person's is held exactly like a
sole proprietor's. On that list the shown name is the company's own registered
name, so a person's name with a legal form ('Nguyen Hoa LLC', 'John Smith CPA
PC', 'Wei Zhang CPA PLLC', 'Law Office of Dalix Quillfeather PLLC') is held
too, and so is any name with two or more adjacent plain words that are not a
trade, legal form, or credential ('Dalix Quillfeather Construction LLC', but
also 'Piney Woods Supply LLC'), and a family's holding vehicle or numbered
trust ('Smith Family LP', 'Smith Family Holdings LLC', 'Smith Family TR',
'Sample Trust No 2'; not 'Nguyen Family Dentistry'): many real companies wait
until they have a website or a person checks them. That is the safe failure.
Only Texas rows with a Longview postal ZIP (75601-75608) are listed, from every
source: a sales-tax outlet, TABC licence, or NPI record whose ZIP is missing or
not a Longview ZIP (Longview, Washington's 98632, a neighbouring town's ZIP) gets
scope `out` and is never published, and a row that names another state is
skipped. The sync counts those ZIPs under `other_zips` for a person to check.
The taxpayer number is the only link between the sales-tax and franchise-tax
lists, so companies with the same name under different taxpayer numbers are
never merged, and a franchise company named like a TABC or NPI practice waits
for a person instead of being joined by name. The About page says what is
covered: "businesses with a Longview, Texas address", and that some are held
back or waiting for review.

**How to go back to the city limits only:** run the service with
`LVA_PUBLISH_SCOPES=city` (`nearby` alone is refused). A franchise-tax company
counts as `city` by its Longview postal ZIP, which cannot say which side of the
city limits it is on; one that a sales-tax, TABC, or NPI location places takes
that location's scope. The next batch then holds the `nearby` listings as
`out_of_scope` (auto-approve holds a batch that removes more than a quarter of
the listings for a person). Gregg County, or about 25 miles around Longview,
would need new sources and is not built.

## 7. Network access for Claude sessions (optional)

This cloud environment blocks `data.texas.gov`, `overpass-api.de`,
`npiregistry.cms.hhs.gov`, `www.theleadflowpro.com`, and the droplet's status
host. Allowing them lets a Claude session pull the public records directly and
read the status page for the weekly digest. The droplet does not need this.
Change it in the session's environment settings under Network access.
