# Homepage handoff, September 18, 2026

The September 17 workshop has run and Ryan is not holding more events for
now. The business sells done-for-you work: leads, follow-up automation,
websites, and funnels, built and run in accounts the client owns. It does
not teach other owners how to do that work. The homepage now says exactly
that, and asks for one thing: a free thirty-minute business consultation.

## What changed

| Surface | Before | Now |
| --- | --- | --- |
| Announcement bar | Workshop date, seats, sold-out, "next workshop" list | Removed |
| Hero card | Workshop artwork, date, price, reserve button | The consultation form (`components/site/ConsultationForm.tsx`) |
| Chooser | Three needs, four doors including "show me in person" and "learn at my pace" | Removed |
| "Three ways" grid | Build / Learn / Do (workshop) | Leads / Follow-up / Websites and funnels, each pointing at the agency service or the free build |
| New section | none | How the consultation works (send the form, pick the place, bring everything) with the "what to bring" list |
| Header CTA | "Find my next step" to `/#qualify` | "Free consultation" to `/#free-consultation` |
| Primary nav | included Learn and Events | Home, Build my business, Run it for me, Scoreboard, Tools, Articles |
| Footer | "Events & Workshops" | "Free 30-minute consultation" |

The offer copy, meeting options, and "what to bring" list live in one
place, `lib/site/consultation.ts`, and the header, footer, homepage, and
welcome email all read from it.

## How a consultation request flows

1. The form posts to the existing `/api/leads` route with
   `interest: "done_for_you"` and `diagnostic.source: "free_consultation"`,
   plus the meeting preference (`your_place`, `our_office`, or `call`) and
   the best contact method.
2. The owner alert and the SMS ping fire exactly as they do for the agency
   intake and the book form.
3. The welcome email is the new `free_consultation` case in
   `lib/leadNotify.ts`: thirty minutes, Ryan calls or texts within one
   business day, the three meeting options, the bring list.
4. SMS consent is a separate unchecked box, same wording as the agency
   intake with "application" changed to "consultation". A request without
   it still saves and still alerts Ryan; only the automated texting is
   gated.
5. The meeting choice and the contact preference are written into the top
   of the lead's goals field, so they show in the owner alert, the admin
   lead table, and the sales pipeline without a schema change.

## What still exists on purpose

- `/events`, `/events/<slug>`, the worksheet, the confirmation pages, the
  events API, and the workshop subdomain feed. People who registered hold
  those links. The featured event resolves to `past` on its own.
- The Operator Academy, the ChatGPT lessons, and the courses. They are out
  of the primary navigation and off the homepage; the footer still links
  "Courses & learning" and the free starter lesson for existing learners.
- `WorkshopListForm` (used by the events page). The homepage-only event
  components and the chooser were deleted.

## Decisions for Ryan

1. Retire the `/events` pages and the workshop subdomain entirely, or leave
   them reachable by direct link only (current state).
2. Take "Courses & learning" out of the footer too, or keep it for people
   who already bought.
3. A standalone `/free-consultation` page for ads and social posts, so the
   share link is not a homepage anchor. The form component is ready to drop
   onto one.
4. Whether a consultation request should also enroll in the nurture
   sequence. Today it does not.

## Verification

`npm test` (includes `tests/consultation.test.ts`), `npm run validate:facts`,
`npm run check:links`, `tsc --noEmit`, `npm run build`, and the homepage
case in `tests/e2e/site-lanes.spec.ts`.
