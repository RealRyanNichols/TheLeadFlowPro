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
   intake still works.

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
