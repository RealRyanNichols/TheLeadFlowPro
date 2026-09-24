# Decisions needed from Ryan

Dated September 17, 2026. Each item has a default recommendation and what
happens if it is left as is. Nothing below has been deployed, sent, charged,
or activated by the engineering work; every item is a switch Ryan flips.

## A. Time critical (tonight)

1. **Force the workshop past-state or let the clock do it.**
   Default: leave `status: "auto"` in `lib/site/events.ts`. The homepage,
   events page, next-step chooser, nurture cutoff, and welcome emails swap to
   the "next workshop" list on their own at 8:30 PM Central (class end plus
   the 30-minute clinic), within the homepage's 15-minute revalidation.
   To force it earlier or later: set `status: "past"` (or `"upcoming"`) on
   the featured event and deploy. Consequence of doing nothing: the swap
   still happens tonight, provided this branch is live before 8:30 PM.

2. **The workshop subdomain.** `workshop.theleadflowpro.com` is a separate
   deployment, not this repository. It can read
   `https://www.theleadflowpro.com/api/events/featured` (CORS allowed for
   that origin) and swap its own view on `status: "past"`. Until it does,
   `/events` on the main site stops forwarding to the subdomain once the
   event is past, so the main site never sends people to a stale seat page.
   Decision: who updates the subdomain, and when.

3. **Attendee follow-up sequence (drafted, not wired).**
   `lib/workshopFollowUp.ts` holds three emails: same night (worksheet),
   day 2 (recap plus one offer), day 7 (check-in). Decisions: (a) the
   worksheet link, without which the same-night email cannot send; (b) the
   day-2 offer, Content Engine at the published price (default) or Website
   Launch; (c) approval to wire it to the outbox after attendance is marked
   in `/admin/events`. Consequence of doing nothing: no follow-up goes out.

## B. Prices and offers

4. **Agency service prices.** Five offers are `tbd_ryan` in
   `lib/site/offers.ts`: Meta ads management, Google Ads management,
   automation, video and media, content. Pages print "Pricing confirmed on
   the scoping call" until a number is set. Proposed structures to choose
   from (pick one per service; all are proposals, none is published):
   - Flat monthly management fee tiers (for ads): a starter tier for budgets
     under a threshold, a standard tier above it, no percentage of spend.
   - Setup fee plus monthly (for ads and automation): a one-time setup that
     covers accounts, tracking, and pages, then a lower monthly fee.
   - Project-based launch sprints (for video and content): a fixed price
     per package, scoped in writing, no retainer.
   Default recommendation: setup plus monthly for Meta and Google Ads,
   project-based for video and content, scoped-per-build for automation.
   Consequence of doing nothing: pages stay live with the TBD line, and the
   intake still works. Since September 18 a TBD service can still be paid:
   `/agency/pay` takes the number from the written scope (one-time or
   monthly, $250 to $25,000, the custom-deposit window) and
   `/api/checkout` charges it as `agency_payment`. The moment an agency
   offer is set `live` with a `priceUsd` in `lib/site/offers.ts`, the pay
   page charges that number and ignores what the browser sends, and the
   cadence follows the label: a `usdPerMonth` label ("$X/mo") bills
   monthly, anything else one time (`lib/agencyPayment.ts`). No Stripe
   product is needed; the line item is created per session like every
   other checkout here.

5. **"Course platform" versus "Training Platform".** `/packages` prints
   "Course platform", `/pricing` prints "Training Platform", both at the
   same "from" price. Default: keep the registry name "Course platform"
   and rename the `/pricing` rung to match. Consequence of doing nothing:
   two names for one offer.

6. **Lead Engine ($3,500+) is on `/pricing` but not in the published offers
   table** in the engagement brief. Default: keep it (it is live and linked)
   and confirm the price. Consequence of doing nothing: it stays.

7. **Legacy tier pages (`/pricing/[tier]`, `lib/tiers.ts`).** The "Learn It"
   tier is priced at the same number as the System Map and describes a
   lifetime training offer that is not in the current table. Default:
   retire the three tier pages with redirects to `/pricing`. Consequence of
   doing nothing: an unpublished-in-brief offer remains reachable.

8. **Plugin checkout go-live.** Checkout is wired in HQ and refuses until
   `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set in Vercel and the
   subscription events are registered in Stripe (docs/PLUGIN.md). The public
   page says "14 days free, $49 a month" today. Decision: set the env vars
   (an env change, Ryan only) and confirm the Stripe products are in live
   mode. Consequence of doing nothing: sign-ups reach HQ and see "Billing is
   not switched on yet."

## C. Public claims and proof

9. **"8 live systems" versus "7 live systems".** The homepage proof strip
   said 8 and the receipts block said 7. Both now read the approved claim
   `lfp_live_systems` (8). Decision: confirm the count. Consequence of doing
   nothing: 8 shows everywhere.

10. **Premier September 1 snapshot.** The six KPI figures on `/free-build`
    and in the capability explorer are now approved claims with
    `asOf: 2026-09-01` and `reviewBy: 2026-10-01`. Two of them (leads and
    pageviews, last 30 days) can be refreshed by
    `scripts/refresh-claims.ts` from the public scoreboard feed; the other
    four are manual. Decision: refresh monthly, or retire the snapshot in
    favour of the live scoreboard link. Consequence of doing nothing: the
    figures show with their September 1 date and a "due for a refresh"
    note after October 1.

11. **Street address in structured data.** The homepage organization schema
    has carried "2800 Gilmer Rd Suite 106" since the September 6 redesign,
    while the workshop funnel releases the venue address only to paid seats.
    Both are in config now (`BUSINESS.address.policy`). Decision: keep it
    in structured data, or set the policy to hidden. Consequence of doing
    nothing: unchanged from today.

12. **Vendor reference prices.** "Reference prices checked September 1,
    2026" now reads the `vendor_reference_prices` claim. Decision: re-check
    monthly or drop the comparison block.

## D. Accounts and access (none touched)

13. **Vercel.** This session's Vercel connection sees only the Premier
    Dental Academy team, which has no projects. The LeadFlow project under
    the personal account was not reachable, so Vercel Web Analytics could
    not be verified as enabled and no Vercel resource was inspected or
    changed. Decision: confirm Web Analytics is on in the project settings,
    or connect the personal account to the session.

14. **RealRyanNichols cross-links.** `docs/realryannichols-crosslink-spec.md`
    is ready to implement in that repository. Decision: confirm scope and
    access, and approve the copy. The one SMS block is sent by Ryan, once.

15. **Lead owner.** New leads insert with `owner` empty; the sales desk
    assigns. Decision: default owner for agency-intake leads (Pat or Ryan).
    Consequence of doing nothing: the NEW LEAD alert still reaches both.

## E. Go-live

16. **Deploy.** Ryan asked for the work to be pushed and made live at safe
    checkpoints. The branch is pushed and PR #54 is open. Merging to `main`
    deploys to production through Vercel. Each checkpoint merge happens
    only with the facts gate, type check, unit tests, and `next build`
    green. Rollback: revert the merge commit on `main`.

## F. Found during discovery (September 17)

17. **SMS acknowledgment on /free-build is not live.** The application form
    collects text consent and the code path exists, but every outbound text
    is blocked unless `QUO_OUTBOUND_SMS_DISABLED` is exactly `false` in
    Vercel (the emergency stop from August 21). Email acknowledgment and the
    NEW LEAD alert to hello@ and pat@ are real and instant, with retries.
    Decision: keep texting off and reword the consent box on /free-build and
    /agency/start to "call", or turn it on (an env change, Ryan only) after
    the text-back copy is tailored per funnel and a STOP lookup is added
    before sending. Default: keep it off until the STOP lookup exists.

18. **Duplicate website submissions** create a second lead and a second
    alert; Meta leads dedupe on an external id, website leads do not.
    Default: add a lookup by email within a short window before insert.

19. **Plugin FAQ export claim.** The old page promised "export your leads at
    any time"; no export exists. The rebuilt page and docs now say Ryan sends
    a file on request and a self-serve export is on the roadmap. Decision:
    build the export (it belongs in engine 7.3 or the plugin backlog).

20. **/proof-floor** runs a service-role query over up to 20,000 analytics
    rows on every public request with no cache. Default: cache it for 15
    minutes or move it behind revalidation. Not changed in this PR.

21. **Revenue figures.** Two public dollar figures exist (the Premier
    "$2,642 revenue logged" snapshot and the "verified cash" tile on
    /proof-floor) while the written rule says no revenue claims. Decision:
    retire both, or write the two exceptions into the rule with definitions.

22. **Stale analytics docs.** `docs/leadflow-analytics-event-taxonomy.md`
    and `docs/leadflow-privacy-safe-analytics.md` describe a tree that does
    not exist. `docs/leadflow-web-analytics-plan.md`, `docs/TOOLS_ANALYTICS.md`,
    and `lib/analytics/shared.ts` are accurate. Default: delete the two.

## G. Phase 7 engines

23. **7.1 Client site factory: price.** The factory turns one config file
    into a five-page client site deployed to the client's own Vercel
    account (`docs/engines/7.1-client-site-factory.md`). The published
    Website Launch offer ($1,000 as $500 + $500) and the hosting offers
    ($49/mo, or $99/mo with two edits) already cover what the factory
    produces. Decision: sell factory builds under Website Launch as is, or
    create a separate factory tier. Default: Website Launch, no new price.

24. **7.1 Client site factory: go-live.** The admin-only preview at
    `/factory/preview/<slug>` and the two scripts ship with the next merge.
    They touch no account. A real client site needs, per client: the
    client's Vercel account, the client's Resend account with their domain
    verified, and the client's DNS. Ryan performs the first real launch on
    a screen share with the client. No LeadFlow Pro env variable changes.

25. **7.1 Client site factory: where real configs live.** Client configs
    are JSON files under `factory/clients/`. Only the fictional fixture is
    committed. Decision: keep real configs in this repo (simple, versioned,
    but the repo is shared with anyone who can read it) or in a private
    folder synced by hand. Default: a private `factory/clients/` folder
    outside git until a client asks for versioned edits.

26. **7.2 Ads reporting: price.** The weekly ads report is the retention
    product for the ads lanes (`docs/engines/7.2-ads-reporting.md`).
    Decision: include it in the Meta and Google ads management fee (both
    TBD-Ryan on /agency), or price it on its own for clients who run their
    own ads. Default: included in the management fee; no standalone price
    until asked for.

27. **7.2 Ads reporting: go-live.** Nothing is live. To turn it on for a
    client: apply migration `20260917100000_hq_ads_reporting.sql`, set
    `ADS_LIVE_PROVIDERS=true` in Vercel, store that client's token under
    their workspace (Ryan, server side), and add a weekly cron for the pull
    and build. Sending the email draft is a separate switch, not built.
    Each client connection is its own approval.

28. **7.2 Google Ads developer token.** Google reporting needs a developer
    token issued to The LeadFlow Pro (a Google Ads manager account and an
    application). Decision: apply now so it is ready, or wait for the first
    Google client. Default: wait.

29. **7.3 Company OS stack: price.** The published Company OS offer is
    "from $7,500" (`PRICES.companyOsFrom`). The stack makes delivery
    configuration rather than a rebuild (`docs/engines/7.3-company-os-stack.md`).
    Decision: keep "from $7,500" for a stack deployment, or publish a fixed
    price for the standard five-module stack and keep "from" for custom
    work. Default: keep "from $7,500"; no price change.

30. **7.3 Company OS stack: go-live.** Nothing is deployed. The first
    client deployment follows the printed provisioning plan in the
    client's own Supabase, Vercel, and Stripe accounts, each created by
    the client. The deployable app around the library (routes, portal
    pages, cron) is not on the branch yet; building it is the next step
    after Ryan confirms the module set.

31. **7.3 Sequence copy.** Sequence steps reference template ids; the copy
    itself is written per client and goes through the copy rules. Decision:
    ship a default template set (trial follow-up, new customer, new member)
    that clients start from, or write each from scratch. Default: ship a
    default set in a later PR.

32. **7.4 Proposal generator: agency prices.** Every agency proposal prints
    the neutral TBD line and a "fix before sending" flag until the five
    agency offers have prices in `lib/site/offers.ts` (decision 3). The
    generator needs no separate price. Decision: set the agency prices.

33. **7.4 Proposal generator: go-live.** The review page ships with the
    next merge behind the admin gate; it sends nothing and stores nothing.
    Ryan sends proposals by hand from hello@. A stored-versions table and
    e-signature are later builds if wanted.

34. **7.5 Workshop kit: go-live and the follow-up.** The kit ships with the
    next merge and changes nothing visible for September 17. The next
    event is a config entry (`docs/engines/7.5-workshop-kit.md`) plus a
    database row Ryan creates in /admin/events. The three follow-up
    drafts now build per event; activating them as an automation is still
    its own approval (they are unsent drafts today).

35. **7.5 Worksheet delivery.** The worksheet is a printable page at
    `/events/<slug>/worksheet`, unlisted and noindex. Decision: hand it out
    on paper in the room, link it from the attendee page (built), or both.
    Default: both.

36. **7.6 Client scoreboards: price.** A client's public board and owner
    view cost nothing to run once the feed function is on their project.
    Decision: include the board in every hosting and Company OS deal as a
    retention hook (default), or price the owner view on its own.

37. **7.6 Client scoreboards: go-live.** The opt-in records for the three
    existing boards are written from the September 3 and 6 approvals in
    `docs/scoreboard.md`. Nothing changes in public. The owner links need
    `HQ_SECRET` exported in a local shell to generate; Ryan sends each to
    its owner. A new client board needs the client's written opt-in, the
    feed function on their project, and a registry entry.

38. **7.7 Tool factory: the backlog.** Eight ideas aimed at East Texas
    pains are in `content/tools/backlog.json`, all at `idea`. Nothing is
    scaffolded or published until Ryan sets `approved` with his name and a
    date on an item. Decision: approve, decline, or add.

39. **7.7 Tool factory: the final call to action.** Every tool page used
    to end on the `/start` mapper. It now ends on the free-build door by
    default, or the agency intake when the tool's metadata says so, per
    the Phase 7 instruction that every tool page carries one CTA into the
    free build or the agency intake. Decision: confirm the default lane
    (free build) or make the agency intake the default for lead and ads
    tools.

40. **7.8 Vertical packs: what to build first.** Three packs exist as
    drafts (`docs/engines/7.8-plugin-vertical-packs.md`). Each is one to
    two workflows short of real: storm surge mode (contractor),
    appointment reminders and an intake link (dental and medical), open
    house capture (realtor). Decision: which pack to finish first. Default:
    contractor, because most HQ workspaces are trades.

41. **7.8 Vertical packs: price and billing.** The three pack offers are
    `tbd_ryan`. A pack price needs a Stripe product, a purchase kind, and
    a check in the plugin session, none of which exist. Decision: price
    per pack per month, or fold the first real pack into the plugin price
    as an included edition. Default: included until a second pack is real.

42. **7.9 SellerProof: price.** The Phase 7 brief says pricing is TBD in
    the offers config, but SellerProof already sells at the published
    price in `lib/site/offers.ts` (`sellerproof_packet`, live), set in the
    September release. Nothing was changed. Decision: keep the published
    price, or move the offer to TBD and take it off sale while repricing.
    Default: keep it.

43. **7.9 SellerProof: uploads.** The brief says evidence is uploaded by
    the seller. This branch records a browser-computed fingerprint (name,
    size, SHA-256) of each original instead of taking the file, which keeps
    customer records off this server. Decision: keep fingerprints only, or
    build real uploads with storage, retention, and deletion rules as a
    separate approved change. Default: fingerprints only.

## H. The September 20 plan (call the leads, then get found)

Added September 20, 2026 with `docs/ceo-plan-2026-09-20.md`. Ground truth
that day: zero purchases ever, 47 Meta lead-ad leads in thirty days, 45 of
the last 56 leads still "new", one call logged. Everything below is a
switch or an account action; the code side of each is already merged.

44. **Move email to Google Workspace.** Runbook:
    `docs/infrastructure/google-workspace-migration.md`. The MX cutover,
    SPF edit, DKIM record, and DMARC address are Ryan's to change at
    GoDaddy, in that order, after the old mail is imported. Nothing in the
    repository changes; Resend records stay exactly as they are. Default:
    do it in week 4. Consequence of waiting: replies Ryan types from
    Outlook may keep failing SPF and DMARC.

45. **Create the booking page and paste it in.** A Google Calendar
    appointment schedule (30 minutes, the hours Ryan keeps) gives a
    `https://calendar.app.google/...` address. Paste it into `bookingPage`
    in `lib/site/external-links.ts`. The consultation confirmation, the
    welcome email, and the text-back then offer it; until then they do not
    mention it. Default: do it the day the calendar exists.

46. **ChatGPT app directory.** Verify the OpenAI organisation, take the
    Apps management role, request the domain token, and set it as
    `OPENAI_APPS_VERIFICATION_TOKEN` in Vercel (production). Both
    `/.well-known/openai-apps-challenge` and `/.well-known/openai-apps`
    serve it. Packet: `docs/plugin-directory-submission.md`. Ryan-only.

47. **Claude connector directory needs a Team or Enterprise organisation.**
    A Pro or Max plan can add the connector by address but cannot submit
    a listing. Decision: upgrade to Team for the listing, or stay on the
    add-by-address path. Default: stay, revisit after the first ten plugin
    subscribers.

48. **Turn on the morning call sheet email.** Set
    `CALL_SHEET_EMAIL_ENABLED=true` in Vercel (production). It sends only
    to `LEADFLOW_NOTIFY_EMAIL`, only when there is someone to call, once a
    day at 7:30 am Central during daylight time (12:30 UTC; it drifts to
    6:30 am after the November clock change unless the cron is moved to
    13:30 UTC). The page at `/admin/call-sheet` works regardless. Default:
    on, today.

49. **Turn the text-back on.** `QUO_OUTBOUND_SMS_DISABLED=false` in Vercel.
    Since September 20 the sender checks the STOP list for every door and
    holds automated texts outside 8 am to 9 pm Central; a text a person
    sends from the CRM is not held. Texts still go only to people who
    ticked the consent box. Default: on, after Ryan reads
    `lib/smsPolicy.ts` and agrees with the window.

50. **The "within one business day" promise.** It is on five surfaces and
    the data says it was not being kept. Options: keep it and staff it with
    the call sheet (default), or soften it to "as soon as I can" on every
    surface at once (`lib/site/consultation.ts` and `lib/leadNotify.ts`).
    Decision: keep or soften.

51. **One front door.** The site asks four first questions: the
    consultation (home), the free website application (services, agency
    copy, free-build), the ten-question agency intake, and the legacy
    eleven-field `/book` form. Recommendation: the consultation is the
    front door everywhere; `/book` redirects to `/#free-consultation`; the
    free website stays as the offer, not the ask. Also from the audit: the
    consultation form's meeting-place picker could move to the call (seven
    controls instead of nine). Decision: approve the redirect and the form
    trim, or keep the current set.

52. **Claim the Google Business Profile.** Name exactly "The LeadFlow Pro",
    primary category Marketing agency, the Longview address, the business
    phone, website `https://www.theleadflowpro.com/longview`. Verification
    (postcard, video, or phone) is owner-only. Then paste the profile's
    share address into `googleBusinessProfile` in
    `lib/site/external-links.ts` so structured data links it. Default: do
    it in week 3; nothing else in local search works without it.

53. **Hours and the visible address.** Item 11 (street address) is still
    open. Google's guidance is: mark up what is visible on the page. To
    add `openingHoursSpecification` and `geo` to the ProfessionalService
    node, Ryan supplies the hours he keeps and confirms the address may be
    printed on `/contact` and `/longview`. Default: leave hidden until the
    profile in item 52 is verified, then make both visible together.

54. **Publish the three local-intent articles.** Drafts 01 to 03 under
    `docs/articles/drafts/` target web design, Meta ads, and Google Ads in
    Longview. They need approved copy and publication dates before they
    enter `lib/articles.ts`. Default: one every two weeks starting week 3.

55. **Search Console.** Submit `https://www.theleadflowpro.com/sitemap.xml`,
    export the three-month query table as the baseline before the retitled
    pages are indexed, then request indexing for `/`, `/services`,
    `/longview`, and the six `/agency/*` pages. Ryan-only.

56. **Privacy policy section for the plugin.** Added September 20 to
    `/privacy` (section "The LeadFlow HQ plugin and workspaces"), because
    both directories require it. It describes what the code does today.
    Decision: read it and confirm the wording, or edit it. It is live.

57. **Destroy the DigitalOcean droplet.** It has no job and bills while
    powered off. Snapshot first if you like. Runbook:
    `docs/infrastructure/digitalocean.md`. Default: destroy this week.

58. **Google Business Profile as a service line.** The audit suggests
    adding "profile claimed, categories, hours, photos set up in your
    account" to the Google Ads service, which today excludes organic
    search. That is a scope change to a published offer. Decision: add it
    (price stays "on the scoping call") or keep the exclusion. Default:
    add it after item 52 proves the process on our own listing.

59. **Marketing email consent on the consultation form.** The form has no
    marketing-consent box, so consultation leads are never eligible for
    any nurture sequence. Adding the box adds a line to the form and makes
    them eligible. Decision: add it or leave the form shorter. Default:
    leave it; the call sheet is the follow-up.

60. **The public GitHub repository outranks the site for the brand.** A
    search for the domain shows the repository and its pull requests above
    most site pages, with the README as the description. Options: make the
    repository private (nothing in the deploy pipeline needs it public),
    or keep it public and rewrite the README as a plain description that
    points at the site. Default: private.

## I. Money paths (September 21)

Added September 21, 2026 from the revenue-paths audit. Ground truth: zero
rows in `purchases`; the only trace of the one plugin trial was in
`hq_workspaces`. The code side of every item below is merged; each item
is a decision, an account action, or a check only Ryan can do.

61. **Apply the purchases migration.** `supabase/migrations/20260831220000_purchases_baseline.sql`
    creates `public.purchases` on a fresh database and, on the live
    project, only drops the unused `kind` default and adds a nullable
    `lead_id` column. Apply it with `supabase db push --include-all` (or
    the Supabase MCP) after reading it. The webhook does not write
    `lead_id` yet; the purchases page matches leads through the checkout
    id, and writing the column is a follow-up once the migration is on
    the live project. Default: apply this week.

62. **Register the new Stripe events on the webhook.** In the Stripe
    dashboard, add `charge.refunded`, `charge.dispute.created`,
    `checkout.session.async_payment_failed`, `customer.subscription.updated`,
    `customer.subscription.deleted`, and `charge.dispute.closed` to
    `https://www.theleadflowpro.com/api/stripe-webhook`. Without them a
    refund or dispute leaves a purchase marked paid, so the totals stay
    wrong and course access and account-based kit access stay open. A kit
    access cookie or license key already issued keeps working until it
    expires either way. Ryan-only.

63. **Production checks, not builds.** Confirm in Vercel that
    `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
    and `RESEND_API_KEY` are set for production; confirm in Stripe that the
    Website Launch Payment Link id matches
    `STRIPE_WEBSITE_LAUNCH_PAYMENT_LINK_ID` (or the compiled fallback) and
    its after-payment redirect is the site's thank-you page; then run one
    small real payment through `/agency/pay` and look for the row at
    `/admin/purchases`. Also: is the one workspace on a plugin trial
    (started September 13, set to end at the trial) yours, or a real
    business that already cancelled?

64. **Free Build add-on tiers cannot be paid.** The $197, $497, and $997
    tiers are promised on `/free-build` ("a separate secure checkout") but
    no page or button calls the checkout for them, by design: the
    application is $0 and a charge before approval breaks the offer.
    Decision: after approving an application, should the lead page get an
    admin-only "Generate checkout link" button (nothing sent automatically,
    Ryan pastes the link), or do the tiers go out as Sales Desk invoices?
    Default: the button.

65. **Managed hosting has no way to start.** $49/mo and $99/mo are live
    offers on `/free-build` with no subscription checkout and no invoice
    path. Decision: a buyer-started Stripe subscription (a `hosting`
    checkout kind, modelled on the agency monthly branch) or a monthly
    Sales Desk invoice. Until decided, should the copy keep promising a
    renewal path that cannot be started? Default: invoice for now.

66. **Retainer door.** `/agency/pay` monthly creates a Stripe subscription
    that renews until cancelled. Since September 21 renewals, failed
    renewals, and cancellations are recorded and alerted, but nothing
    manages them (no admin cancel, pause, or amount change). Decision:
    keep monthly on `/agency/pay` and build the admin cancel button, or
    take monthly off the page and send retainers as recurring Stripe
    invoices. Default: keep it, build the cancel button next.

67. **Sending proposals.** Decision 33 says proposals go out by hand from
    hello@. The lead page now has "Draft proposal", "Create invoice", and
    "Copy agency pay link" (the pay link carries the lead id so the
    payment lands on that record). Decision: add an in-app "Send proposal"
    (human-clicked, confirm box, off-by-default switch, records "Proposal
    sent" and moves the stage) or keep sending by hand. Default: keep by
    hand until the first three proposals have gone out.

68. **Agency prices.** Still `tbd_ryan` for all five agency services, so
    a proposal for one prints "TBD". The larger systems (Lead Engine,
    Training Platform, Company OS, Custom Platform) are live "from" prices
    and a proposal prints them as such ($3,500+ and up). Decisions: set the
    five agency numbers in `lib/site/offers.ts`, and confirm a "from" price
    is acceptable on a written proposal or should be replaced by the quoted
    number before it goes out.

69. **Two prices registered under their own names.** The validator's new
    $297 guard surfaced Time Back (from $297) and the ChatGPT Operator
    founding price ($297), both already charged by code; they are now
    `PRICES.timeBackFrom` and `PRICES.chatgptOperatorFounding` and printed
    from there. Decision: confirm both numbers are current. Default: yes.

## J. Chase Sheet (September 23)

Added September 23, 2026 with `docs/CHASE_SHEET_RELEASE.md`. The product is
built and tested; each item below is a switch, an account action, or a check
only Ryan can do. Nothing has been deployed, charged, or created in Stripe.

70. **Apply the Chase Sheet migration.**
    `supabase/migrations/20260923120000_chase_sheet.sql` creates three new
    tables (accounts, quotes, touches), service role only. Apply it with
    `supabase db push --include-all` or the Supabase MCP before the first
    sale. Without it, a paid checkout still charges the card, the claim route
    sends the buyer to the locked view with "claim=unavailable", and the
    webhook returns 500 until the tables exist (Stripe retries). Default:
    apply before merging.
    Done September 24: applied through the Supabase MCP before #73 went
    live. Three tables, row level security on, no anon or authenticated
    access. The repo file is the same SQL and is idempotent, so a later
    `supabase db push` is harmless.

71. **The Stripe payment links.** Done September 24, 2026: product, both
    prices, and both hosted Payment Links created in the live account and
    recorded in `EXTERNAL_LINKS` and `docs/CHASE_SHEET_RELEASE.md`. The page
    buttons still sell through `/api/checkout`; the links are for texts,
    posts, and emails.

72. **Refund window.** `/chase-sheet/terms` promises a full refund within
    seven days of a first purchase, and no refund on renewal months. Decision:
    keep, lengthen, or drop. Default: keep.

73. **The price pair.** $20 a month and $97 once, as requested. The lifetime
    price pays for itself against five months of monthly. Decision: confirm
    both numbers are what Ryan wants printed. Default: yes.

74. **`CHASE_SHEET_SECRET`.** Optional. Without it the Pro Kit secrets sign
    the cookie and the key. Setting a dedicated one (`openssl rand -hex 32`)
    means a Pro Kit key rotation never touches Chase Sheet buyers. Default:
    set it before the first sale.

75. **Adding a trade.** A buyer whose trade is missing is told to reply to the
    receipt. A new library is one entry in `lib/chaseSheet/trades.ts`; the
    engine tests cover every entry automatically. Decision: which trades to
    add first after launch. Default: whatever the first ten buyers ask for.

## K. The Call Closer (September 24)

Added with `docs/handoff-2026-09-24-call-closer.md`. Nothing below has been
deployed, sent, or switched on; the branch is a draft pull request.

76. **Approve the merge.** Open `/admin/call-sheet/sample` and
    `/admin/proposals/sample-build?offers=website_launch` on the preview, on
    a phone. Both run on fictional data and save nothing. Merging to `main`
    deploys to production. Rollback: revert the merge commit; there is no
    migration or environment change. Default: merge after one look.
    Done September 24: Ryan approved the merge.

77. **The first morning's sheet will be longer.** Failed CRM texts and calls
    marked noise no longer count as a person reaching the lead, and promises
    older than the 90-day window now come back when due. Leads those rules
    were hiding will reappear once. Nothing to decide; this is expected.

78. **Proposal wording changed.** The "To accept" lines now print the real
    pay link for each offer, a free build says no payment is due and names
    the hosting it includes, and larger builds say they start with the
    System Map. Decision: read `/admin/proposals/sample-build` once and
    confirm, or edit the wording in `lib/payDoors.ts`.

79. **Holidays.** Callbacks skip weekends but not holidays, so a retry can
    land on Thanksgiving or Christmas. Default: pick a date by hand around
    them. A holiday list is a small follow-up if wanted.

80. **What counts on the speed-to-lead line.** Any logged try by a person
    within 24 hours counts, including a call nobody answered, so the line
    says "a person reached out to", never "heard from". It is admin-only and
    is not a public claim. Decision: keep, or count only calls where
    someone talked.

81. **Two saves at the exact same instant.** A double tap is blocked and a
    retry is recognised, but two identical saves arriving at the same
    moment (two tabs, a flaky network) can both write their task and
    timeline entry. The complete fix is a unique save key in the database,
    which is a migration. Default: accept for now; approve the migration if
    it is ever seen.

82. **"Mark the proposal sent" and item 67.** The proposal page now records
    that Ryan sent a proposal himself (stage Proposal, follow-up in two
    business days, the proposal task closed). It still sends nothing. Item
    67, an in-app send, stays a separate decision.

83. **Follow-ups found in passing, not changed here:**
    - Callback chips always offer 9:00 AM, even when the lead wrote "after
      3 PM". Reading the lead's stated time is a small follow-up.
    - The live-refresh clock and the lead page's dates render in UTC on the
      server and Central on the phone, which logs a hydration warning.
      Visible only as a brief flicker; it predates this change.
    - The Today queue labels a number that replied STOP as "No consent",
      while the call sheet says "Replied STOP. Call instead."
    - Tapping Text on the card opens Ryan's own phone, so a STOP sent back to
      that phone does not reach the suppression list. This matches the call
      sheet today; texting from the CRM route is the way to keep STOP exact.

## L. Post Creator (September 24)

Added September 24, 2026 with `docs/POST_CREATOR_RELEASE.md`. Nothing below
has been deployed, charged, switched on, or created in Stripe. AI writing and
checkout both ship switched off.

84. **Approve the offer, the name, and the positioning.** Post Creator
    (page title "Social Media Post Creator") at /post-creator: a free idea
    machine plus paid AI writing at $20 a month or $97 once, as requested.
    It is do it yourself; nothing is posted for anyone, and it does not link
    to Time Back. The two offer rows ship `live` because `tbd_ryan` fails the
    offers test for a product, so like Chase Sheet they appear in the
    homepage and /longview JSON-LD as soon as this merges, even while
    checkout is closed. Default: approve, or hold the merge.

85. **Apply the migration (your action).**
    `supabase/migrations/20260924150000_post_creator.sql` adds five
    service-role tables, five functions, and the triggers and sequence they
    rely on. Apply it with
    `supabase db push --include-all` or the Supabase MCP, then log it here.
    Until then the paid routes say accounts are not switched on; the free
    idea machine works. Default: apply before item 91.

86. **A dedicated Anthropic key.** `POST_CREATOR_ANTHROPIC_API_KEY`, in its
    own Anthropic Console workspace with a monthly spend limit as a second
    wall. It never falls back to `ANTHROPIC_API_KEY`. Default: yes, with a
    Console limit of $310 a month to match item 88.

87. **Model and effort.** `POST_CREATOR_MODEL` defaults to claude-opus-5 at
    `low` effort. A typical write is about $0.038 on Opus 5, $0.015 on
    Sonnet 5, and $0.007 on Haiku 4.5 (plainer writing). Refusal fallbacks
    are sent only on Opus 5. If the key's Console workspace runs writes in
    the US only, Opus 5 and Sonnet 5 cost 1.1 times these figures; every
    reservation already assumes that, and the ledger settles each write at
    the rate it actually ran at. Default: Opus 5, low; review settled cost
    after two weeks with the queries in the release doc.

88. **Daily spend cap.** `POST_CREATOR_DAILY_SPEND_CAP_USD` is required for
    AI to run. Default: 10, so at most $310 in a month across all buyers.
    When it runs out, AI writing pauses for everyone until midnight Central
    and nothing is counted.

89. **Allowances and ceilings.** Monthly plan: 100 AI writes a month and 20
    a day. One payment: 50 a month and 10 a day. Five extra tries a day and
    twenty a month cover failures, which never count against the allowance.
    Each account also has a monthly AI cost ceiling: $15 on monthly, $9 on
    one payment. Default: approve these numbers.

90. **Worst-case cost per buyer.** On Opus 5, a monthly buyer who maxes
    every try at the largest size costs about $13.80 a month. A pattern of
    refused-then-rerouted requests would reach about $27.60, more than the
    $19.12 net, but the $15 ceiling stops it at about $15.50. A one payment
    buyer can cost up to about $9.50 a month for as long as the plan runs,
    so $93.89 net covers about 10 months of maximum use or about 50 months
    of typical use. Decision: accept, lower the ceilings, or pick Sonnet 5.
    Default: accept for launch and review in two weeks.

91. **Switch on AI writing (spend approval).** Set
    `POST_CREATOR_AI_ENABLED="true"` only after items 85 to 89, a test in
    Preview with a comp account (SQL in the release doc), and your OK.
    Default: off.

92. **Open sales.** Set `POST_CREATOR_SALES_OPEN="true"`. Checkout also
    requires AI writing on and the Stripe, service, and Resend keys, so
    nothing is ever sold while AI writing is off. Default: after 91 and 93.

93. **Terms and privacy wording.** /post-creator/terms reuses only
    commitments already live for Chase Sheet: a full refund within seven
    days of a first purchase, and the one payment plan lasting as long as
    Post Creator is offered, with at least 90 days' notice by email if it is
    discontinued. It adds no refund for AI downtime, no promise that future
    features are included, and no notice period before allowances change;
    each of those needs your yes before it is added. The privacy page gains
    a Post Creator paragraph (profile and idea go to Anthropic when AI
    writing is used; no draft text stored; nothing typed into the free idea
    machine is sent, though its page records visits and button taps like the
    rest of the site). Default: approve as written.
    - Added after review, for your yes: the terms now say AI writing can
      pause for the shared daily budget, an account's cost limit, or while a
      problem is being fixed, and that switching it off for good counts as
      discontinuing Post Creator (so one payment buyers get the 90 days'
      notice). Before, "AI writing runs only while it is switched on" let an
      open-ended switch-off skip that notice. Default: approve.
    - Still open: monthly buyers keep being charged while AI writing is off.
      For a pause longer than a short fix, pick one: pause collection on
      their subscriptions in Stripe, credit the month, or email them the
      option to cancel. Default: pause collection for any pause over a week.
    - The terms and the pricing now give each plan's own tries ceiling
      (monthly 25 a day and 120 a month; one payment 15 and 70). Before,
      every page gave only the monthly numbers.
    - Added after review, for your yes: a write counts when a draft comes
      back for at least one of the platforms asked for, and any platform
      without one is named on screen so the buyer can write it again. The
      pricing fine print, the FAQ, and the terms now say so. Default:
      approve.
    - Added after review, for your yes: a monthly buyer who pays once keeps
      the monthly allowance through the month their last paid monthly
      period ends (the current month only if the plan was past due), and a
      past-due monthly plan is cancelled right away when the one payment
      plan is bought. The terms and the receipt say so. Default: approve.

94. **AI writing on the one payment plan.** Included, at 50 writes a month
    and the $9 ceiling, for as long as Post Creator is offered (cost in
    item 90). The alternative is twelve months of AI writing, then the idea
    machine only. Default: keep as built.

95. **Monthly refunds and disputes.** The terms say a refund or a dispute
    closes the plan and that the monthly subscription is cancelled so it
    does not renew. The money-back path now does that in code, first month
    or renewal: it closes the plan (no later Stripe event reopens it), cancels
    the subscription in Stripe right away, and emails you "POST CREATOR
    MONTHLY CLOSED". A first-month payment has no `purchases` row of its
    own, so it is matched through its invoice to the checkout that started
    the subscription (Post Creator only; Chase Sheet keeps its old
    handling). Money back on an older subscription the account moved on
    from cancels that one only. Until this is checked in Preview, the
    runbook step stands: whenever you refund a monthly payment or a dispute
    opens on one, make sure the subscription is cancelled in Stripe.
    Default: follow the runbook; test a refund on the comp flow before
    item 92.

96. **Promo codes.** Post Creator checkouts no longer offer promotion
    codes (`allow_promotion_codes` stays on for the other kinds), and a
    paid session unlocks a plan only when it paid the full price, so a
    discounted session unlocks nothing and waits for review. Default:
    create no Post Creator promo codes; comp people by hand (SQL in the
    release doc).

97. **`POST_CREATOR_SECRET`.** Optional signer for the cookie and the key;
    without it the Pro Kit secrets are reused. Default: set one
    (`openssl rand -hex 32`) before item 92.

98. **Sign-in rules.** The browser that completes checkout is signed in
    once, within a day, and only if the email had no Post Creator before.
    Any later checkout on an existing email signs every device out; the
    emailed key opens it again. Someone who pays first with a stranger's
    email gets that empty account until the real owner buys. To sign every
    device out by hand, use the SQL in the release doc. Default: accept.
    - A leaked key can now be revoked for one account. The key comes from
      the email, the signing secret, and the account's `key_version`.
      Raising the version (SQL in the release doc) stops the old key and
      signs every device out; "Email me my key" then sends the new one.
      Nobody else's key changes, and every key already emailed is version
      0, so nothing changes for existing buyers. Default: accept.
    - Epochs come from one sequence, so an account deleted on request and
      bought again never opens for an old cookie. A claim link never swaps
      a browser already signed in to another live account; that browser
      gets a note saying how to open the new one. Default: accept.

99. **Housekeeping.**
    - Stripe Payment Links: not needed; the page sells through /api/checkout.
      Default: none.
    - The `lfp_software_products` claim (value 4) now undercounts by two
      products. Default: refresh it by hand.
    - An AI sample on the sales page: none until AI writing is on, then one
      real output, labelled. Default: as described.
    - The idea library (12 trades, 26 shared topics, 20 angles) was written
      by a builder. After review, each topic carries tags so an angle lands
      only where it reads right (no "Tool talk: how we train new people", no
      summer heads-up about frozen pipes), and "Something else" drops the
      shared topics that assume a service trade. A named trade now has 225 to
      238 ideas before services, "Something else" 72, and each service adds
      38. Default: read /post-creator with three trades before 92.
    - A write that finished but whose answer never reached the screen (a
      dropped connection) counts once and its drafts cannot be shown again,
      because no draft text is kept on the server. The app says so. Keeping
      drafts for a few minutes to show them again would change the privacy
      wording. Default: keep as built.
    - AGENTS.md says work on `main`; this was built on a harness branch.
      Default: you choose the merge target.
