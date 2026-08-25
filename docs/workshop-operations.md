# Workshop Operations — East Texas ChatGPT Operator Workshop

Working public title: **ChatGPT for Business Owners: Live in Longview**
Venue: The Lead Flow Pro at Longview Training Center, Longview, Texas
Instructor: Ryan Nichols. Sales and implementation partner: Patrick (Pat) Grabbs.
Amanda owns the venue business; she is not the instructor and not the salesperson.

Working date: Thursday, September 10, 2026, 6:30–8:00 PM Central. **Not final.**
The funnel reads the date from the database (`events.starts_at`), so moving the
date is an admin edit, not a deploy. `date_confirmed` stays false until Ryan
locks it; the funnel labels the date "being finalized" until then.

## The offer

- $97 founding ticket, 10 paid seats, 90 minutes, laptops required
- First come first served; **a seat exists only after payment**
- Founding price is limited and will increase (`events.price_note`)
- Optional 30-minute AI Business Clinic after the main 90 minutes
- Every attendee gets a Next Move card; two businesses get 12-minute hot seats
- Disclosure, verbatim, everywhere the offer is described:
  > The workshop stands on its own. There is no obligation to buy anything
  > else. Optional implementation help is available after class for businesses
  > that want it.

The first workshop teaches **ChatGPT only**. Claude, Claude Code, and Claude
CoWork become a separate advanced workshop at a higher price.

## Private offer ladder (final two minutes + follow-up only)

1. Live workshop — $97
2. Replay — $47
3. System Map — $497 (attendees may apply their $97 ticket within 7 days → $400 balance)
4. Implementation Sprint — $1,997
5. Company OS full build — $7,500+

Never on the acquisition page. The funnel sells the $97 seat and carries only
the subtle line that implementation help exists.

## Run of show (90 minutes)

| Window | Segment |
| --- | --- |
| 0–10 | Chat, Work, and Codex in plain English |
| 10–25 | Same task two ways: vague ask vs. operator brief, compared on screen |
| 25–45 | Live build: idea → offer → landing page → form → follow-up |
| 45–65 | Attendees apply the framework; Ryan coaches the room |
| 65–78 | Map one attendee's business live: time saved, follow-up, missed work |
| 78–88 | Questions and business-specific recommendations |
| 88–90 | Three choices: build it yourself · come back · get implementation help |

## Founding AI Business Clinic (optional 30 minutes after)

- Every attendee submits one bottleneck (collected at registration and again on
  the confirmation page; stored on `event_registrations.bottleneck`)
- Every attendee receives a Next Move card — one use case, one tool, one next
  action (fields on the registration row; filled from /admin/events)
- Two businesses get 12-minute live hot seats (`hot_seat` flag in admin)
- Final six minutes: pull the lessons that apply to the whole room
- Guardrail: it is a clinic, not ten free consulting sessions

## Metrics to track per event

Paid seats · cost per paid seat · show rate · reviews requested · reviews
completed · System Maps sold within 7 days · Implementation Sprints sold ·
Company OS opportunities · cash collected · CAC.

Sources: `event_registrations` (seat statuses, `amount_paid_cents`,
`review_requested_at`, `review_completed_at`), `analytics_events`
(`registration_start`, `registration_complete`, `checkout_start`,
`payment_complete`), `purchases` (backend sales), Meta Ads Manager (spend).

Ticket revenue is front-end trust; System Map → Sprint → Company OS is the
backend path.

## Reviews and testimonials

After the value is delivered (end of clinic), show one QR code that lets each
attendee choose Google review or Facebook review. Ask for an honest review.
Never incentivize a positive review, never pressure. The
`/tools` review-link tool already generates the QR code.

Written testimonials: one-page form (name, business, quote, permission
checkbox for name/footage use). Stamp `review_requested_at` when the QR goes
up; `review_completed_at` when a review lands.

## Content capture plan

- GoPro 1: wide shot of Ryan and the screen
- GoPro 2: attendee reactions and side angle
- Phone on tripod: vertical social angle
- Meta glasses: optional first-person footage
- Direct screen recording of the demonstration machine
- External audio as primary instructor audio
- Timestamp sheet: reactions · breakthroughs · hot seats · testimonials

Recording consent is collected at registration (checkbox) and printed on the
funnel; attendees can be seated out of frame on request. Nothing an attendee
says is used in marketing without written permission.

## Ad creative

Three evergreen 4:5 stills live in `public/images/workshops/` (no dates baked
in): stop-watching-ai, build-something-real, first-use-case. The 1200×630
share card is `public/og/events/chatgpt-for-business-owners-longview.jpg`,
regenerated with `node scripts/generate-workshop-og.mjs`. Ads point at
TheLeadFlowPro.com/events. **Do not launch ads without Ryan's approval.**

## Cadence

After the founding class proves the format, plan recurring Tuesday and
Thursday sessions. Do not publish a recurring schedule yet — one event at a
time, each its own row in `events`.

## Safeguards (already enforced in code/database)

- Unpublished events: invisible to the public, refuse registration and payment
- Price and capacity verified in the database at registration AND at checkout;
  the browser never supplies a price
- Stripe webhook (`claim_event_seat`) confirms the seat atomically; a payment
  that lands after sell-out parks as `overbooked` for a refund decision
- Exact street address lives in `private.workshop_event_details`, released
  only to paid seats (confirmation page, email, calendar file)
- Publishing is a manual admin action with a readiness checklist
