# The Company Builder redesign

Repositioning and redesign of The LeadFlow Pro from "industry-specific business systems"
to **The Company Builder**. This document is the foundation record: what exists today, what
the new positioning is, how the visual system works, what proof we can actually stand
behind, and the order the work ships in.

Written during the Phase 1 audit and kept current as phases land.

---

## 0. Source of truth and constraints

**Notion is the brain.** The `The LeadFlow Pro` Notion project is the source of truth for
this business, and `0. START HERE — Standing Rules and SOP Index` is the page that governs
any work on it. This document is downstream of Notion, not a replacement for it. Anything
here that contradicts Notion is a bug in here.

The pages that bind this redesign:

| Notion page | What it governs |
| --- | --- |
| `0. START HERE` | Standing rules: spacing law, visual rules, copy rules, work rules, security rules |
| `1. Business Model, Offers and Money Path` | The offer ladder, the free build offer, legal identity |
| `10. Brand, Voice and Design System` | Color tokens, the six-gradient tile family, voice |
| `SOP: Shipping Any Change` | Pull first, fix the root, verify live, then record it in Notion |
| `SOP: Visual and Design Work` | Card and icon standard, color discipline, image rules |
| `SOP: Page Layout and Spacing` | The no-dead-space rule |

Two inputs named in the redesign brief were not reachable from the build environment:

| Input | Status | What was used instead |
| --- | --- | --- |
| `01-The-LeadFlow-Pro-Instructions.txt`, `02-The-LeadFlow-Pro-Website.txt` | Not on disk or in the repo | The Notion project above, plus the repo |
| `theleadflowpro.com`, `studiomeraki.agency` | Network egress blocked by the proxy (HTTP 403 on CONNECT) | The repo **is** the deployed app. Baseline captured by building production locally and screenshotting at 1440px and 390px |

Studio Meraki was treated as a described benchmark (visual polish, whitespace, large
imagery, scannable case studies) rather than a page to inspect. Nothing in the new system is
derived from its layouts, palette, or wording.

### Standing rules this work had to satisfy

- **No dead space between header and content, on every page.** Never patched with an inline
  style on one page. Every spacing value in `company-builder.css` is a class.
- **No fake numbers, ever.** Every figure on the rebuilt pages traces to the repo or a live
  property. See section 5.
- **No em dashes**, no banned phrases, plain operator English.
- **Never claim stack ownership for Faretta.legal. It runs on Wix.** Enforced in
  `app/portfolio/page.tsx`; the ownership line says so explicitly and the "real software
  products on the owned stack" count excludes it.
- **Never publish GLMTG.com or TheCoopLongview.com.** The two private builds are credited
  as private client builds with no link and no name.
- **Fix it everywhere, not where he pointed.** The card-soup fix was applied to the whole
  homepage, not one section, and the design tokens are shared rather than per-page.

---

## 1. Baseline: what the site is today

Next.js 15 App Router, React 19, Tailwind 3, Supabase (SSR auth + RLS), Resend, Quo, Vercel.
Production build passes at baseline. TypeScript is clean.

### The visual problem

The current public site is a **dark navy card grid**. The homepage alone renders 6 pathfinder
cards, 8 feature cards, 6 industry cards, 3 layer cards, 4 work cards, and 3 package cards:
**30 cards of near-identical visual weight** before the footer. Every one uses the same
rounded rectangle, the same hairline border, the same translucent white fill, and one of six
cycled gradient icon chips.

This is textbook card soup. Consequences:

- No hierarchy. The $15,000 Industry OS card looks exactly like a feature tile.
- No imagery. The homepage never shows a single screenshot of real work, despite eight
  real screenshots already sitting in `public/og/portfolio/`.
- Small type. Body copy runs 13–15px inside cards; proof numbers are set at 13px.
- The category is buried. "Industry-specific business systems" describes a delivery model,
  not a category, and it does not tell an owner that Ryan builds the whole company.

### Positioning problem

| Where | Current message |
| --- | --- |
| Hero eyebrow | "Industry-specific business systems" |
| Hero H1 | "Your website should run your business. Not just sit there." |
| Primary CTA | "Find My Starting Point" (jumps to an on-page card grid) |
| `<title>` | "The LeadFlow Pro \| Industry-Specific Business Systems" |

The H1 is good operator copy and is worth keeping somewhere. But it still argues about
*websites*. The whole thesis is that the website is the front door and the company behind it
is the product. The hero has to say that first.

### Route and content audit

Public routes and their status:

| Route | Status | Action |
| --- | --- | --- |
| `/` | Rebuilt | Phase 2 |
| `/portfolio` | Real screenshots, dense tag soup, client and founder work mixed together | Rebuilt, Phase 3 |
| `/pricing` | Correct current ladder (System Map / Launch / Industry OS / Custom) | Restyled, Phase 4 |
| `/packages/[slug]` | Full sales pages, current ladder, buyable | Keep. Business logic untouched |
| `/add-ons` | Working menu | Keep, moved out of primary nav into the footer |
| `/tools`, `/tools/[slug]` | 78 working tool pages | Keep, moved to footer |
| `/articles`, `/articles/[slug]` | 13 owned articles | Keep in primary nav |
| `/start` | The System Map intake router. Business-critical | **Untouched.** Writes to `leads.diagnostic` with attribution and consent |
| `/about` | Did not exist | Created, Phase 4 |
| `/contact`, `/privacy`, `/terms`, `/login` | Working | Keep |
| `/pricing/[tier]` | **Live ladder.** Learn It / Build It With You / Done For You, the three public paths from Notion `1. Business Model`. Learn It is LIVE in Stripe at $497 | Kept. Still needs a home in the new nav. See §8 |
| `/free-build` | **The lead engine.** "I'll build your whole website. You pay nothing until you love it." Ryan confirmed it stays: a funnel and ad campaign run to it, and a down payment moves the build forward | **Turned back on:** first in the primary nav, in the footer, and a dedicated homepage band |
| `/go` | Ad landing page, old "stop paying Shopify and Wix" angle | Live, ad traffic may hit it. Not yet on the `cb-` system. See §8 |
| `/demo`, `/showcase`, `/events`, `/book` | Not in nav | Left live. `/showcase` uses simulated data and labels itself as such |

Nothing was deleted and nothing was demoted. Every route above is still reachable at its
original path, so no inbound link or ad destination breaks.

### What is worth preserving

- `public/og/portfolio/*.jpg` — eight real 1200×630 screenshots. The single most valuable
  design asset in the repo and completely unused on the homepage.
- `public/images/ryan-*` — real operator photography (warehouse pallets, wholesale
  operation, live content work). Real receipts, no stock.
- The `.flow-line` animated-dash CSS idiom already in `globals.css` — the right primitive for
  showing data movement, reused in the new system diagram.
- The `body:has(...)` / `html:has(...)` scoping pattern already used for `.router-page`. The
  new light theme uses the same mechanism, so it is consistent with how this codebase
  already works.
- All business logic: Supabase auth and middleware, lead capture, CRM, admin, dashboards,
  forms, analytics, Resend, Quo, cron jobs.

---

## 2. The new position

**Category: The Company Builder.**

> A website builder gives you pages. The LeadFlow Pro builds the connected company those
> pages are supposed to power.

Hero, as shipped:

- **Eyebrow:** THE COMPANY BUILDER
- **H1:** We don't just build your website. We build the company behind it.
- **Support:** The LeadFlow Pro connects your website, CRM, calls, texts, email, payments,
  portals, dashboards, automation, AI, and internal workflows into one business system built
  in accounts you control.
- **Primary CTA:** MAP MY COMPANY → `/start`
- **Secondary CTA:** SEE THE LIVE SYSTEMS → `/portfolio`
- **Ownership line:** Built by an operator. Installed in your accounts. Your business stays
  yours.

Retained voice lines, relocated rather than dropped:

| Line | New home |
| --- | --- |
| "Your website should run your business. Not just sit there." | Website Builder vs Company Builder section |
| "Proof before promise." | Live proof section eyebrow |
| "No missed calls. No missed texts. No missed revenue." | Convert pillar |
| "I've already built what you're trying to build. Now let's build yours." | Operator section closing |

### Copy rules enforced

Plain English, short paragraphs, specific problems, real ownership language, proof over
hype. No em dashes. Banned: "elevate your brand", "unlock your potential", "in today's
digital landscape", "tailored solutions", "take your business to the next level", fake
urgency, guaranteed results.

---

## 3. Information architecture

### Navigation

Primary nav, ordered by buyer intent:

`What We Build` · `The Work` · `How It Works` · `Packages` · `About Ryan` · `Articles`
with a primary CTA of **MAP MY COMPANY**.

Add-Ons and Free Tools drop out of the primary nav into the footer. Their routes do not
change, so no redirects are needed and no inbound link breaks.

### Homepage, in buyer order

1. **Company Builder hero** with the connected-company system visual
2. **Proof strip** — verified counts only
3. **Website Builder vs Company Builder** — the distinction, visually, in one screen
4. **The four parts of a connected company** — ATTRACT / CONVERT / OPERATE / OWN
5. **Live proof** — real screenshots, three verified facts each
6. **How Ryan builds a company** — five steps
7. **Operator proof** — Ryan, grounded in receipts
8. **Engagement options** — the current approved ladder
9. **Final CTA** — "Show me the business. I'll show you what to build."

---

## 4. Visual system

An experienced American operator crossed with a modern systems company. Not a SaaS
template, not a creative agency, and deliberately nothing like Studio Meraki's
black-and-lavender look.

### Canvas inversion

The defining move: the public marketing site flips from dark navy to a **warm off-white
canvas** with **deep ink contrast sections**. Light canvas is where the screenshots, the
whitespace, and the editorial type live. Ink sections are where the system diagrams, the
proof, and the ownership argument live. The rhythm between them replaces the card grid as
the primary structure.

### Tokens

Declared once in `app/globals.css` as `--cb-*`, consumed by the `cb-` component classes.

| Token | Value | Role |
| --- | --- | --- |
| `--cb-canvas` | `#F7F5F2` | Warm off-white page ground |
| `--cb-surface` | `#FFFFFF` | Raised surfaces, screenshot frames |
| `--cb-surface-2` | `#EFECE6` | Warm tint band |
| `--cb-ink` | `#0A1220` | Deep navy-black. Contrast sections and headings |
| `--cb-ink-2` | `#111C30` | Ink section elevation |
| `--cb-body` | `#39435A` | Body copy on light |
| `--cb-muted` | `#5C6779` | Secondary copy on light |
| `--cb-on-ink` | `#F4F6FA` | Copy on ink |
| `--cb-muted-ink` | `#A8B4C8` | Secondary copy on ink |
| `--cb-blue` | `#1240E8` | Cobalt. Primary action, connector accent |
| `--cb-blue-deep` | `#0B2CA8` | Pressed state, deep accent |
| `--cb-blue-soft` | `#5B87FF` | Accent on ink |
| `--cb-cyan` | `#35C6F4` | Connector nodes and data movement, ink only |
| `--cb-hair` | `#DED8D0` | Hairlines on light |
| `--cb-hair-ink` | `#FFFFFF1F` | Hairlines on ink |

### Contrast, measured

Every pairing that carries text was computed, not eyeballed:

| Pair | Ratio | WCAG |
| --- | --- | --- |
| `--cb-ink` on `--cb-canvas` | 17.9:1 | AAA |
| `--cb-body` on `--cb-canvas` | 8.6:1 | AAA |
| `--cb-muted` on `--cb-canvas` | 5.2:1 | AA |
| `--cb-blue` on `--cb-canvas` | 6.7:1 | AA |
| white on `--cb-blue` | 7.2:1 | AAA large / AA normal |
| `--cb-on-ink` on `--cb-ink` | 17.1:1 | AAA |
| `--cb-muted-ink` on `--cb-ink` | 9.0:1 | AAA |
| `--cb-cyan` on `--cb-ink` | 9.4:1 | AAA |

### Typography

Self-hosted through `next/font/google`, which also removes the render-blocking
`@import` of Inter that `globals.css` shipped with.

- **Display: Archivo**, 700–900, tracking `-0.035em` to `-0.045em`. Wide, structural, and
  American in a way that reads as built rather than styled. Used for H1/H2 and proof
  figures.
- **Body: Inter**, 400–700. Already the site's voice, kept for continuity.
- **Micro-labels:** Inter 800, uppercase, `0.16em` tracking, 12px. Used for eyebrows and
  section indices.

Minimum body size on the redesigned pages is **17px**, up from 13–15px.

### Motion

Motion is only allowed to explain movement through the system: the pulse traveling the
company loop, connector dashes, and the leak markers in the comparison. No decorative
entrance animations. Everything sits behind `@media (prefers-reduced-motion: reduce)`,
which freezes the pulse and the dashes while leaving the diagram fully legible.

### Scoping, so nothing breaks

The light theme is opt-in per page via a `.cb-page` wrapper, picked up with
`body:has(.cb-page)`. The header and footer restyle themselves inside that context. Admin,
dashboard, training, tools, the `/start` router, and every other dark surface are untouched
and keep working exactly as they do today. This is the same `:has()` scoping the codebase
already uses for `.router-page`.

---

## 5. Verified proof inventory

Only facts traceable to the repository or to a live, inspectable property. **No invented
revenue, lead volume, conversion rates, ROI, testimonials, or client quotes.**

### Site-level, safe to state

| Fact | Source |
| --- | --- |
| 8 live properties | `app/portfolio/page.tsx`, 8 screenshots in `public/og/portfolio/` |
| 78 working free tools | `lib/tools/*` counted: 22 + 11 + 10 + 18 + 17. Production build emits 78 `/tools/[slug]` pages |
| 13 owned articles | `lib/articles.ts`, 13 slugs, 13 OG images |
| 6 industries represented | Media, dental education, public-information software, commerce, legal services, local service, nonprofit missions |
| Client-owned infrastructure | GitHub + Vercel + Supabase, per package pages and README |

### Property-level facts

| Property | Verified facts |
| --- | --- |
| RepWatchr | 16,783 official profiles · 59,054 sourced records · scorecards and packet builder |
| RealRyanNichols.com | 1,568+ case profiles · searchable archive · AI assistant · tip line · store |
| Don & Patti | 509-photo archive across 5 countries · Open Book public ledger · sponsorship checkout |
| Gideon Commerce | Flat 1% platform fee · auctions and offers · AI listing builder · QR verified pickup |
| Faretta.legal | Flat-fee ladder from $5 to $497 · free AI entry point · member dashboard |
| Premier Dental Academy | Enrollment with payment plans · tuition planner · training simulators · employer directory |
| Lone Star Total Wash | Free quote intake · public price list · completed-jobs gallery · click to call |
| TheLeadFlowPro.com | Guided intake · admin CRM · client dashboards · first-party analytics · ad tracking |

### Honest categorization

The old portfolio presented all eight properties as one undifferentiated grid. The rebuilt
portfolio separates them:

- **Client systems** — Premier Dental Academy of Longview, Lone Star Total Wash,
  Don & Patti Belize Medical Missions
- **Founder-built platforms** — RealRyanNichols.com, RepWatchr, Gideon Commerce,
  Faretta.legal, TheLeadFlowPro.com. Labeled as Ryan's own products, never implied to be
  outside clients
- **Private systems** — mortgage/real-estate and local-events builds referenced without a
  link, labeled as confidential

### Where measurable outcomes do not exist

No financial outcomes are claimed anywhere. Outcome lines describe what the system *does*
(records managed, workflows connected, subscriptions replaced, interfaces delivered), never
what it earned.

---

## 6. Phase plan

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Audit, baseline screenshots, this document | Done |
| 2 | Tokens, typography, header, mobile nav, homepage, company loop visual, proof strip, four-part model, live proof, process, operator, packages, final CTA, footer | Done |
| 3 | Portfolio index, case-study structure, galleries, categorization, verified facts, mobile layout | Done |
| 4 | `/about`, `/pricing` into the new system, QC: typecheck, lint, build, desktop and mobile review, nav and CTA verification, accessibility, performance | Done |
| Next | `/add-ons`, `/tools`, `/articles`, `/contact` into the system. `/start` router visual pass. Per-project case-study detail routes | Open |

---

## 7. Quality control results

Run against a local production build (`next build` + `next start`), inspected in
headless Chromium at 1440×900 and 390×844.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Clean |
| ESLint (`next/core-web-vitals`) | Clean. Fixed one pre-existing error: `components/charts/RentVsOwnChart.tsx` used a raw `<a>` for the internal `/tools/rent-receipt` link, which broke client-side navigation |
| `next build` | Passes. 220 static pages generated |
| Internal links on the four rebuilt pages | 22 unique destinations, all HTTP 200, including every `#` anchor and `?goal=` deep link |
| Primary CTAs | 17 tracked CTAs, all reaching `/start` with the correct `goal` |
| Heading structure | One `h1` per page, no skipped levels |
| Images | 15 across the four pages, all with descriptive alt text, all loading |
| Contrast | 55 rendered text samples measured with translucent layers composited. Zero failures against WCAG AA |
| Keyboard focus | 3px solid cobalt outline with 3px offset, verified on primary CTAs |
| `prefers-reduced-motion: reduce` | All three animations resolve to `animation-name: none` |

Four defects were found by these checks and fixed rather than reported:

1. The company loop's serpentine node placement contradicted its SVG sweep paths,
   so the circuit visually broke between stage 4 and stage 5. Both rails now read
   left to right and the sweeps carry the flow back to the left margin.
2. On mobile the two rails had no gap or connector between them, because the
   hidden sweep SVG sits between them in the DOM and defeated the adjacent
   sibling selector.
3. The footer email link inherited cobalt on the ink footer, measuring 2.6:1.
4. `.cb-rung > p` outranked `.cb-rung-price`, rendering every package price at
   15px body-copy size instead of the display size.

Known cosmetic note: `position: sticky` headers render at a scroll-adjusted
offset in headless full-page screenshots. That is a capture artifact, not a
layout bug; the header is correct in a real viewport.

## 8. Open items, in priority order

**Corrected after reading Notion.** An earlier draft of this document called `/free-build`
and `/pricing/[tier]` stale and recommended retiring them. That was wrong on both counts and
is retracted here:

- **`/free-build` is the current lead engine.** Notion `1. Business Model` lists it as the
  headline offer running to cold traffic, and the master page's one-sentence pitch is "I
  will build your whole website. You pay nothing until you love it. Fair, right?" It is
  live with the full automation chain proven. Nothing about it should be retired.

  **Ryan confirmed directly:** it stays, there is an entire funnel and ad campaign behind
  it, and the mechanic is that he starts the build for free and a **down payment** moves it
  forward if the owner likes it. It is a lead magnet, not a competing offer. It is now
  turned back on in three places: first in the primary nav with its own green accent, in
  the footer under Work together, and as a dedicated band on the homepage placed directly
  after the price ladder, so an owner who just read $7,500 sees the zero-risk door before
  they bounce.
- **`/pricing/[tier]` is a live ladder, not a dead one.** Learn It, Build It With You, and
  Done For You are the three public paths in Notion, and Learn It is LIVE in Stripe at $497.

### Settled

1. **The navy question: settled, light wins.** Ryan, Aug 12 2026: "ship the color you think
   is going to work best. If that's white, override, rewrite and do white. That includes all
   pages. I want the site to look the same so it doesn't look like different companies."
   The whole site is now the warm off-white canvas with ink contrast bands. `/admin` is the
   only dark surface left, scoped by `.is-dark-app`. This supersedes "navy stays the base"
   in Notion `0. START HERE` and `10. Brand`.
2. **The six-gradient tile family: kept where it earns its place.** The 78 tool cards and
   the Add-On menu still use it and it reads well on light, which satisfies the no-bland-boxes
   rule. It stays off the rebuilt marketing pages, where 30 near-identical gradient-chipped
   cards were the card soup in the first place.
3. **Every page is on one system.** `/free-build`, `/go`, `/tools`, `/add-ons`, `/articles`,
   `/contact`, `/packages/*`, `/pricing/[tier]`, `/start`, `/login`, `/book`, `/events`,
   `/demo`, `/showcase`, `/thank-you`, `/deposit`, `/privacy`, `/terms` and the dashboard
   and training surfaces all render on the light canvas.
4. **Down payments work for any build.** `/deposit` takes a customer-chosen amount clamped
   server-side, so the free build offer's "a down payment moves it forward" finally has a
   checkout behind it.

### Open, in priority order

1. **Notion standards pages still need the write.** The connector reconnected mid-session
   under a new identity requiring OAuth, which a non-interactive session cannot complete.
   The full change set is in `docs/notion-updates-pending.md`, ready to paste.
2. **The three public paths have no home in the new nav.** Learn It / Build It With You /
   Done For You are live and sellable. `app/training/[course]/page.tsx:40` is currently
   their only inbound link.
3. **`components/ShowcaseDashboard.tsx`** lists `/pricing/done-for-you` in its simulated page
   list. Harmless, but worth pointing at a page that is actually promoted.
4. Per-project case-study routes (`/portfolio/[slug]`) for the full eleven-part story.
5. Klarna, Afterpay and Affirm need enabling in the Stripe Dashboard. The checkout sets no
   `payment_method_types`, so they appear automatically once they are on. No code needed.

### Notion pages that need updating once item 1 is settled

Per `SOP: Shipping Any Change` step 7:

- `10. Brand, Voice and Design System` — the color system table, if the canvas changes
- `0. START HERE` — visual rules 3 and 4, if the canvas changes
- `SOP: Visual and Design Work` — the card and icon standard, if the chips change
- `3. The Website — Every Page and What It Does` — the homepage section list, the new
  `/about` page, and the new navigation
- Master page status table — free tools reads "3 tools" but the repo ships **78**, and
  articles reads "12 published" but the repo ships **13**
