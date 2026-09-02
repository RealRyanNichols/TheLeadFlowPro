# Notion updates, ready to apply

Last revised Aug 12 2026, after the light conversion, the back office work, the
eight stage pages, and the pricing band shipped to `main`.

**Why this file exists:** the Notion connector is readable from this session but
every write tool (`notion-update-page`, `notion-create-pages`) returns
"requires approval", and the session is non-interactive so the approval prompt
cannot be shown. Reads work, writes do not. Everything below is the exact change
set. Applying it is a copy-paste job.

One Notion page **was** written successfully earlier:
[Company Builder Redesign — August 12, 2026](https://app.notion.com/p/3ba4082c341d812f8a8bd75ec0dbac30).
**That page is now out of date** and needs the correction in section 0 below
before anything else, because it still presents two settled questions as open.

Page IDs, so nobody has to search again:

| Page | ID |
| --- | --- |
| `0. START HERE` | `3ba4082c-341d-81a8-ab19-e017f7e0b085` |
| `1. Business Model, Offers and Money Path` | `3b94082c-341d-81d9-ad62-d8efbbf1b717` |
| `3. The Website — Every Page and What It Does` | `3b94082c-341d-81f8-ad24-e322f7354990` |
| `10. Brand, Voice and Design System` | `3b94082c-341d-81a1-990a-cf7e62dfa895` |
| `SOP: Visual and Design Work` | `3ba4082c-341d-81fc-b3aa-eb426efc97eb` |
| `Company Builder Redesign — August 12, 2026` | `3ba4082c-341d-812f-8a8b-d75ec0dbac30` |

---

## 0. The redesign page — close both open decisions

That page says "THE TWO OPEN DECISIONS" and that the work is "on a branch, not on
main". Both are stale. Replace that framing with:

> **Both decisions are settled and the work is on main.** Ryan, Aug 12 2026:
> "I want you to ship the color you think is going to work best. If that's white,
> override, rewrite and do white. That includes all pages. I want the site to
> look the same so it doesn't look like different companies."
>
> 1. **Canvas:** off-white wins. Navy is retired as the base, site-wide.
> 2. **Six-gradient tiles:** kept for the 78 tool cards and dense grids where
>    items need telling apart. Not used on marketing pages, where they produced
>    card soup.
>
> Shipped in PRs #11, #12 and #13, all merged to `main` and live on
> theleadflowpro.com.

## 1. `10. Brand, Voice and Design System` — replace the Color system table

Light is the base. There is no second theme.

| Token | Value | Use |
| --- | --- | --- |
| `--page` | `#f7f5f2` | Warm off-white page ground |
| `--page-soft` | `#efece6` | Warm tint band, separates sections |
| `--panel` | `#ffffff` | Raised surfaces, cards, screenshot frames |
| `--text` | `#0a1220` | Deep ink. Body copy and the contrast-band background |
| `--muted` | `#4e5866` | Secondary copy. 6.0:1 on the tint band |
| `--quiet` | `#586274` | Small print. 4.8:1 on the tint band |
| `--blue` | `#1240e8` | Cobalt. Primary action and connector. 6.6:1 on canvas |
| `--blue-strong` | `#0b2ca8` | Pressed and hover |
| `--green` | `#146c34` | Positive. Also marks the free build offer |
| `--warn` | `#92400e` | Caution |
| `--danger` | `#b91c1c` | Errors |
| `--line` | `#0a12201f` | Hairline on light |

On ink contrast bands the copy tokens flip: `#f4f6fa` headings, `#a8b4c8`
secondary, restrained cyan `#35c6f4` for connectors and data movement.

**No gradient page backgrounds and no corner glows.** They only read on a dark
ground; on light they look like smudges.

Add: contrast is computed with translucent layers composited, never eyeballed.
The bar is WCAG AA. A full-page sweep runs across every route and every rendered
text node before a design change ships. Currently **zero failures across 34
routes**, including all eight `/system/[stage]` pages, `/deposit` and
`/free-build`.

**Do not keep a navy reference block.** An earlier draft of this file said to
park the navy hexes under `.is-dark-app`. That class no longer exists; see
section 3.

## 2. `10. Brand` — amend the six-gradient rule

Replace "Navy stays the base. Color does the pointing." with:

> Color does the pointing. **Amended Aug 12 2026:** "Navy stays the base" is
> retired. The base is the warm off-white canvas; ink is now the contrast band
> and the type colour.

The six-gradient family stays correct for **tool cards and any dense grid that
needs its items told apart** (the 78 tool cards use it and it works). It is
deliberately not used on the rebuilt marketing pages, where 30 near-identical
gradient-chipped cards read as card soup. Those pages use flat cobalt icons,
band rhythm, and real screenshots.

## 3. `0. START HERE` — visual rules 3 and 4

Replace rule 3:

> 3. **Add color, never rainbow.** **Settled Aug 12 2026:** the warm off-white
>    canvas `#f7f5f2` is the base and deep ink `#0a1220` is the contrast band.
>    "Navy stays the base" is retired. Color points at things; it does not
>    carpet the page. No powder blue, no pewter blue.

Replace rule 4:

> 4. **Never all dark.** A wall of near-black drives people away. **Settled
>    Aug 12 2026:** the whole site is light, public pages and back office alike,
>    because "I want the site to look the same so it doesn't look like different
>    companies." There is no dark app surface and no `.is-dark-app` class; that
>    block was added during the conversion and then deleted. Ink is a contrast
>    band inside a light page, never the page ground.

**Correction to an earlier draft of this file:** it said `/admin` was the only
dark surface left and was scoped by `.is-dark-app`. That was true for a few
hours and is not true now. `/admin` is light and `.is-dark-app` is gone. Three
component grounds are still intentionally dark and should stay that way: the
login toggle over `bg-flow-500`, the `bg-[#0c1220]` cards, and the text over the
mall-walk video.

## 4. `0. START HERE` — add to the security rules

The Faretta rule was violated once during this work and caught by an audit. Make
it harder to miss:

> 3. **Never claim stack ownership for Faretta.legal** — it runs on Wix. The
>    portfolio ownership line must say so, and Faretta must be excluded from any
>    "real software products on the owned stack" count.

## 5. `SOP: Visual and Design Work` — color discipline

Replace "Base stays navy `#0e1a2e`" with "Base stays the warm off-white canvas
`#f7f5f2`. Ink `#0a1220` is the contrast band and the type colour."

Add to the chart guidance: the approved pair (`#0993dd` owning, `#dc4747`
renting) still clears 3:1 for graphical objects on the light canvas, so it
stands. Chart **text and gridlines** were re-tuned for light.

## 6. `3. The Website — Every Page and What It Does`

- Homepage section list is new: Company Builder hero and connected-company loop,
  proof strip, website builder vs company builder, the four parts, live proof,
  five-step process, operator receipts, price ladder, **the free build band**,
  final CTA.
- New page `/about` — operator proof.
- New page `/deposit` — down payment on any build, noindex.
- **New: eight `/system/[stage]` pages** — `attention`, `website`,
  `lead-capture`, `crm`, `follow-up`, `sale`, `delivery`, `reporting`. Every
  node on the homepage loop diagram links to one. Each page runs the same five
  moves: the leak, what we build, rent or own, run your own numbers (live tools
  from the existing 78), and proof. Data lives in `lib/system-stages.ts`.
- Navigation is now: Free Build, What We Build, The Work, How It Works,
  Packages, About Ryan, Articles, with MAP MY COMPANY as the CTA.
- **Still unplaced:** `/pricing/[tier]` (Learn It, Build It With You, Done For
  You) has no home in the new nav. Learn It is LIVE in Stripe at $497, so this
  is a live revenue path with no navigation entry. Worth a decision.

## 7. Master page status table — stale counts

- Free tools reads "Live, 3 tools". The repo ships **78**.
- Articles reads "12 published". The repo ships **13**.

## 8. `1. Business Model, Offers and Money Path` — the down payment step

Step 3 of the free build offer reads "Love it? We agree on a fair price by real
hours." Ryan's own wording adds the missing step:

> Love it? **A down payment moves it forward** and we agree on a fair price by
> real hours.

Also add: down payments are no longer package-only. `/deposit` takes a
customer-chosen amount for any build, clamped $250 to $25,000 server-side, and
is what Ryan sends when a free build lands.

## 9. New — the back office, for whichever page owns `/admin`

Shipped in PR #12.

- **Lead email and phone links were unreadable.** They were `text-flow-400`,
  which became cobalt the moment the Tailwind palette went light while `/admin`
  was still navy. Fixed at the root by converting admin to light rather than
  patching the link colour.
- **Soft delete on leads.** `leads.deleted_at`. Bulk select on the pipeline, a
  two-step delete on the workspace. Deleted leads also drop out of the CSV
  export, the follow-up sequence and the weekly digest.
- **Two-way conversation per lead.** New `lead_messages` table, phone-style
  thread on the lead page. Outbound picks its channel **server-side**: Quo SMS
  when there is a phone with `sms_consent` and no unsubscribe, otherwise Resend
  email. Consent cannot be bypassed from the browser. A rejected send is stored
  and marked undelivered rather than silently lost.
- **`/api/quo-inbound`** files replies onto the matching lead, matched on the
  trailing 10 digits and idempotent on `provider_id`. It is gated by the
  webhook secret, the exact LeadFlow `PN...` resource id, the exact destination
  number, and the exact LeadFlow Supabase origin. It stays disabled if the
  verified Quo resource id is missing.

**Action for Ryan, still outstanding:** point Quo's `message.received` webhook at
`https://www.theleadflowpro.com/api/quo-inbound`, select only the LeadFlow line,
and set `QUO_WEBHOOK_SECRET` plus `QUO_LEADFLOW_INBOUND_PHONE_NUMBER_ID` to that
line's verified `PN...` id. Until then, the message remains visible in Quo but
inbound CRM ingestion is intentionally off. Application-originated outbound SMS
and the one-time inbound auto-reply both remain off by default.

**Also outstanding:** `/admin` sits behind auth, so this session could never see
it rendered. It needs Ryan's eyes once before it is called done.

## 10. New — why every quote is different (`/pricing`)

Shipped in PR #13, from Ryan's own words: "Every quote was different. Every
business was different. Not everybody's paying the same amount, but not
everybody's getting the same exact thing."

An ink band between the ladder and the clarity section, three points: same door
different building / you are quoted for what you actually need / priced by the
real work. It closes with "this is not the cheapest way to get a website. It is
the way that leaves you owning the thing when it is done."

**Open question, Ryan's call.** The site says *"Priced by real hours. Never
agency math."* in six user-visible places across `/`, `/free-build` and
`/deposit`. That is a different philosophy from value-based pricing. The new
band was written to sit alongside the existing line, not to contradict it. If
the model should move to pricing on outcome rather than hours, that is a rewrite
of all six spots plus the `/free-build` core promise, and it changes what is
committed to in writing before a build starts.

**A boundary that was deliberately held.** The story behind this section
involved a named third party, his NDA and noncompete history, his day rate, and
what he paid his own editors. None of that is on the site. The `/about` receipt
is first person and unnamed: Ryan flew a specialist in first class, covered room,
board and food, and paid five figures for a two day shoot because the output paid
for itself. No name, no rates, no third party's margins. Keep it that way.

## 11. New — the last of the navy

`app/layout.tsx` still exported `themeColor: "#0e1a2e"` and
`colorScheme: "dark"` after the whole site went light, so every page shipped
`<meta name="theme-color" content="#0e1a2e">` and
`<meta name="color-scheme" content="dark">`. That painted the mobile browser
chrome navy above a light page and told the browser to render scrollbars and
form controls dark. Now `#f7f5f2` and `light`.

Four other `#0e1a2e` references were checked and **deliberately left alone**,
because each is a component colour on a light ground rather than a page ground:
the white slider thumb's ring in `.tool-range`, dark text on the sky-400 toggle
in `ToolEngine`, the tool OG share-card background, and the `/embed` surface.
