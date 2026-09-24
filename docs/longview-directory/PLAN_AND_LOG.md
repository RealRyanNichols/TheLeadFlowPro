# Longview Business Directory: plan and log

The Longview business directory for The LeadFlow Pro. Every business in the
City of Longview gets a sourced profile at `/longview/businesses`. The engine
that builds and checks it, and the pages themselves, run 24/7 on the LeadFlow
DigitalOcean droplet (nothing is deployed to Vercel).

## Direction (Sept 24, 2026)

- The brief was written for Premier Dental Academy. The owner redirected it the
  same day: **this is for The LeadFlow Pro**, profiles live on the LeadFlow
  website, and the engine goes on the DigitalOcean droplet.
- Everything else in the brief stands: the sources, privacy and honesty rules,
  crawl limits, approval gates, and reporting format.

## Plan

| Step | What | Where it runs |
| --- | --- | --- |
| M0 | Read-only droplet inspection, then this plan | Droplet (`preflight.sh`) |
| M1 | Ingest Texas Comptroller sales-tax outlets for Longview, categorize, de-duplicate, report the real count | Droplet engine |
| M2 | Website worker built from the dental-directory design, tested, installed as `longview-archive` | Repo, then droplet |
| M3 | Private status dashboard on a noindex host; directory pages built and served on the droplet; privacy filters checked on real rows | Droplet |
| M4 | OSM discovery, NPI and TABC, website discovery, hiring signals, "New in Longview" | Droplet engine |
| M5 | Handoff and a weekly report-only digest | Drive + this folder |

## How a business reaches the website

1. The engine on the droplet ingests public records and reads business websites.
2. Every 45 minutes it writes a publish export: only publishable businesses and
   fields, each fact with its source and the date it was checked.
3. A person approves a batch on the droplet (`lva approve`), or auto-approve
   does (it holds a batch that removes more than 25%). The engine then builds
   the static pages from the approved batch and Caddy serves them at
   `/longview/businesses/`.
4. Pages stay `noindex` until the owner turns on indexing (one switch), which
   happens with the move to theleadflowpro.com.

## Log

- **Sept 24, 2026.** Started. The droplet has no shell access from this cloud
  session, and this session's network policy blocks `data.texas.gov`,
  `overpass-api.de`, and `npiregistry.cms.hhs.gov`, so M0 and M1 cannot run from
  here. The engine, the site pages, and the installer are built and tested with
  fictional fixtures instead; the droplet install is one command (see
  `deploy/longview-archive/README.md`).
- **Sept 24, 2026 (later).** Engine, installer, and directory pages built and
  integrated (545 engine tests, 1,585 site tests, full build passing). An
  adversarial review across privacy, honesty, crawl politeness, reliability,
  installer safety, and the site found about 45 real problems; all are fixed
  with regression tests. Awaiting the owner's go-ahead to install on the
  droplet (see HANDOFF.md).
- **Sept 24, 2026 (evening). Moved off Vercel on the owner's instruction.**
  Nothing is deployed to Vercel any more. The Next.js directory pages were
  removed from the branch, and the engine now generates the directory itself as
  static pages (`site.py`, with its own copy of the contract check in
  `validate.py`) that Caddy serves from the droplet at
  `https://longview.165-227-248-110.sslip.io/longview/businesses/`. Approval
  moved from merging a pull request to one command on the droplet
  (`lva approve`), with an optional auto-approve that still holds large
  removals for a person. The batch pull request feature and every GitHub call
  were removed from the engine. When the LeadFlow site itself runs on the
  droplet, one approved Caddy change routes `/longview/businesses/` there.
