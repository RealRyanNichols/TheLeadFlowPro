# The Scoreboard (/scoreboard)

One public board per business The LeadFlow Pro runs or built. Views, clicks, leads, paid leads, unpaid leads, plus visitors, calls and form leads. Rolling windows: today, 7, 30, 90 days. Built 2026-09-03.

It exists to be shown off daily and to start the conversation that sells the owned side of the stack: articles and blog, free tools, indexing, forms, follow-up. The legend on every board answers "what is an unpaid lead" and links each metric to the service that moves it.

## Rules

- Real numbers or nothing. A feed that cannot be read renders "Feed unavailable". Never zeros, never samples.
- Aggregate counts only. No names, emails, phones, or dollar figures. `showSales` stays `false` until Ryan approves a business showing a sales count (still a count, never dollars).
- Paid lead: came from an ad the business paid for (`source` is a Meta lead ad, or `utm_medium` in paid/cpc/ppc/paid_social). Unpaid lead: everything else, including inbound calls and tool sign-ups.
- Days are bucketed in America/Chicago on the database side.

## How a business feeds the board

Every feed is the same Postgres function on that business's own Supabase project:

```
scoreboard_public_daily(days_back integer default 90)
  returns (day, views, visitors, clicks, leads, paid_leads, unpaid_leads, calls, forms, sales)
```

It is `security definer`, granted to `anon`, and returns aggregates only, so the board can call it with the project's publishable key (the same key the business's own website already ships to every browser). No shared secrets, no service keys leave their project, nothing to rotate.

- The LeadFlow Pro: `supabase/migrations/20260903021000_scoreboard_public_daily.sql`. Read through the service client.
- Premier Dental Academy of Longview: applied 2026-09-03 to project `lmbsuwslsycukynzpzik` (migration name `scoreboard_public_daily`). Sources: `page_visits` (`pv:` rows are views, `click:` rows are clicks), `leads` (`quo_call` rows are calls, Meta lead ad rows are paid), `purchases` (completed or active).

To add a business: write the same function against that project's tables, grant it to anon, then add an entry to `SCOREBOARD_BUSINESSES` in `lib/scoreboard.ts` with the project URL and publishable key. A site that is not on Supabase (Faretta on Wix, for example) has no feed yet; do not add it with made-up numbers.

## Where things live

- `lib/scoreboard.ts`: registry, metric definitions and legend copy, window math. Pure, tested in `tests/scoreboard.test.ts`.
- `lib/scoreboardFeeds.ts`: server-only fetch (service client for local, REST rpc for remote, 15 minute cache).
- `app/scoreboard/page.tsx` and `app/scoreboard/[business]/page.tsx`: ISR, revalidate 900 seconds.
- `components/scoreboard/ScoreboardBoard.tsx`: window toggle, tiles, 30 day chart (inline SVG, no library).
- Footer link under Proof; cross-link from /proof-floor; both routes in the sitemap.
