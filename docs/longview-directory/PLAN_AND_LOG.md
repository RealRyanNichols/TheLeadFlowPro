# Longview Business Directory: plan and log

The Longview business directory for The LeadFlow Pro. Every business in the
City of Longview gets a sourced profile on theleadflowpro.com at
`/longview/businesses`. The engine that builds and checks it runs 24/7 on the
LeadFlow DigitalOcean droplet.

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
| M3 | Private status dashboard on a noindex host; profile pages on the LeadFlow site; privacy filters checked on real rows | Droplet + Vercel preview |
| M4 | OSM discovery, NPI and TABC, website discovery, hiring signals, "New in Longview" | Droplet engine |
| M5 | Handoff and a weekly report-only digest | Drive + this folder |

## How a business reaches the website

1. The engine on the droplet ingests public records and reads business websites.
2. Every 45 minutes it writes a publish export: only publishable businesses and
   fields, each fact with its source and the date it was checked.
3. That export is committed to `content/longview-directory/directory.json` in a
   pull request. Merging the pull request is the approval; Vercel deploys it.
4. Profiles stay `noindex` until the owner turns on indexing (one switch).

## Log

- **Sept 24, 2026.** Started. The droplet has no shell access from this cloud
  session, and this session's network policy blocks `data.texas.gov`,
  `overpass-api.de`, and `npiregistry.cms.hhs.gov`, so M0 and M1 cannot run from
  here. The engine, the site pages, and the installer are built and tested with
  fictional fixtures instead; the droplet install is one command (see
  `deploy/longview-archive/README.md`).
