# The LeadFlow Pro

Industry-specific business systems. One connected system, installed in accounts you
control. Live at [theleadflowpro.com](https://www.theleadflowpro.com).

## Build

`main` is the real source tree and deploys straight to production through Vercel.
`npm run build` runs the tool-registry validation first (`npm run validate:tools`),
so a published tool that is missing metadata, imagery, a formula or a disclaimer
fails the build instead of shipping. Node 22.6 or later is required.

## Stack

- Next.js 15 (App Router) + React 19 + Tailwind 3
- Supabase (SSR auth, Postgres with RLS)
- Resend (email, fail-closed until `RESEND_API_KEY` is set)
- Quo (calls + SMS, automations on hold until cutover)
- Vercel (`the-lead-flow-pro`)

## Key areas

- `app/page.tsx` and `app/start/` — the guided "Map My System" front-of-site. Completed
  diagnostics are stored in `leads.diagnostic` with attribution and consent.
- `app/admin/` — back office: leads pipeline, per-lead workspace
  (`app/admin/leads/[id]`), CSV export (`app/api/admin/leads/export`).
- `app/dashboard/` — member dashboard with projects, training progress, and messages.
- `app/articles/` — owned article library (SEO + lead generation).
- `app/tools/` and `lib/tools/` — the free tool library: registry, taxonomy, search,
  artwork, collections and embeds. Start with `docs/TOOLS_ARCHITECTURE.md`.
- `supabase/migrations/` — schema history. Every migration documents its rollback.

## Local development

```bash
npm install
npm run dev
```

Supabase URL and publishable key have safe public fallbacks in `lib/config.ts`.
Secrets (Resend, Quo, cron, unsubscribe) are Vercel env vars and are never committed.
