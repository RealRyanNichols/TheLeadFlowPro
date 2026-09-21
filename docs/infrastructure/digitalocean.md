# DigitalOcean: what to do with the droplet

Written September 20, 2026. Ryan created a DigitalOcean droplet with the
idea of moving The LeadFlow Pro onto it. This is the straight answer.

## Do not move the site to the droplet

The application should stay on Vercel for at least the next ninety days.
Every reason is something in this repository, not a preference:

- `vercel.json` runs twelve scheduled jobs. Four run every five minutes and
  one of them, the Meta lead poll, brought in 47 of the last thirty days'
  leads. On a droplet each one becomes a timer to build, secure, and watch.
- Seventy-one files use incremental regeneration or dynamic rendering. On
  Vercel that is free. Self-hosted it needs a persistent cache and one
  instance, or a shared cache service.
- Every branch gets a preview deployment, which is how every change in the
  last two weeks was checked before it went live. A droplet has none unless
  someone builds a second server.
- The build gate (`validate:calculations`, `validate:facts`,
  `validate:tools`, `validate:visuals`, `validate:social`, then `next build`)
  runs on Vercel on every push. There is no Dockerfile and no CI workflow
  for anywhere else.
- Vercel's edge handles TLS, the CDN, image optimisation, and the firewall.
  On a droplet those are nginx, certbot, and a person on call.

Moving would trade a working deploy pipeline for a server Ryan would have to
learn to operate, and it would not add a single lead or dollar.

## What the droplet costs while it sits there

A powered-off droplet bills at the full monthly rate; only destroying it
stops the charge. The smallest plans start at a few dollars a month, so this
is not a large sum, but it is money for nothing.

## Recommendation: snapshot and destroy

1. Sign in at cloud.digitalocean.com, open Droplets, click the droplet.
2. Optional: Snapshots, Take snapshot. A snapshot of a fresh droplet costs
   cents per month and can be restored later.
3. Left menu, Destroy, Destroy this Droplet, type its name, confirm.
4. Confirm the Droplets list is empty and Billing shows no running
   resources.

## When a droplet would make sense

Only for a job that Vercel cannot do and that the business actually needs.
Candidates, none of which exist today:

- A long-running worker (minutes, not seconds) such as a bulk video render
  or a large scrape. Nothing in the repo does this.
- A self-hosted database or search index. Supabase covers the database.
- A staging copy of a client's Company OS (`stack/`) that must live outside
  Vercel for a client's compliance reasons.

If one of those appears, the right shape is a container with a Dockerfile in
this repository, a GitHub Actions workflow that builds it, and the droplet
running only that container. That is a separate, approved change with its
own runbook, not a migration of the site.
