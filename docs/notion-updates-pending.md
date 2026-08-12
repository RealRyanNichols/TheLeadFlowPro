# Notion updates, ready to apply

Written Aug 12 2026, after Ryan's call to ship light site-wide.

**Why this file exists:** the Notion connector reconnected mid-session under a new
server identity that requires an OAuth approval, and this session is
non-interactive, so the writes could not be completed. Everything below is the
exact change set. Applying it is a copy-paste job.

One Notion page **was** written successfully before the reconnect:
[Company Builder Redesign — August 12, 2026](https://app.notion.com/p/3ba4082c341d812f8a8bd75ec0dbac30),
which carries the decisions log and the full record of the work.

---

## 1. `10. Brand, Voice and Design System` — replace the Color system table

Light is the base. The navy palette moves to a reference section and stays live
in `/admin` only.

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
text node before a design change ships. Currently **zero failures across 23
routes and 2,300+ samples**.

Keep the old navy hexes as a reference block, noting they are declared under
`.is-dark-app` in `globals.css` and live only in the back office.

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

> 3. **Add color, never rainbow.** The warm off-white canvas is the base and
>    deep ink is the contrast band. Color points at things; it does not carpet
>    the page. No powder blue, no pewter blue.

Replace rule 4:

> 4. **Never all dark.** Settled Aug 12 2026: the public site is light on a warm
>    off-white canvas with ink contrast bands. `/admin` is the only dark surface
>    left, scoped by `.is-dark-app`.

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
- Navigation is now: Free Build, What We Build, The Work, How It Works,
  Packages, About Ryan, Articles, with MAP MY COMPANY as the CTA.

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
