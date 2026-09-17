# RealRyanNichols.com → The LeadFlow Pro: cross-link spec

Status: ready to implement in the RealRyanNichols repository once Ryan confirms
scope and access. Nothing in this document edits that repository.

## Why

The shared scoreboard (September 16, 2026, live reads) showed the traffic
imbalance: RealRyanNichols.com carries far more page views than
TheLeadFlowPro.com. The audience there already knows Ryan. The LeadFlow site
is where the offers live. These blocks route the first to the second without
mixing data, audiences, or accounts.

Rules that apply to every block:

- Plain links only. No pixel, no shared analytics, no cross-site cookie.
  Attribution comes from UTM parameters and LeadFlow's first-party analytics.
- No claims about results. The copy names what LeadFlow does and what the
  reader gets next.
- Every link carries `utm_source=realryannichols&utm_medium=crosslink&utm_campaign=<block>`.
- The free five-page website stays the front door. The agency lane is offered
  as "run it for me", never in front of the free program.

## Block 1: site-wide footer line

Placement: the footer of every RealRyanNichols.com page, one line under the
existing links.

```
Ryan also runs The LeadFlow Pro: websites, follow-up, and the business system behind them, built in accounts you own.
→ https://www.theleadflowpro.com/?utm_source=realryannichols&utm_medium=crosslink&utm_campaign=footer
```

## Block 2: "About the author" card

Placement: the author box that already sits at the end of long-form posts.

Heading: **Ryan Nichols**
Body: Ryan builds the websites and operating systems behind small businesses
in East Texas through The LeadFlow Pro. If you run a business and your
website, follow-up, or ads are not doing their job, start with the free
five-page website program or the free ChatGPT lesson.

Links (two, no more):

- Apply for the free website → `https://www.theleadflowpro.com/free-build?utm_source=realryannichols&utm_medium=crosslink&utm_campaign=author_card`
- Start the free ChatGPT lesson → `https://www.theleadflowpro.com/chatgpt/free?utm_source=realryannichols&utm_medium=crosslink&utm_campaign=author_card`

## Block 3: business-owner interstitial on business-adjacent posts

Placement: after the first section of any post tagged business, money,
work, or local. One block per post, never inline in the body.

Eyebrow: FOR BUSINESS OWNERS
Headline: Your website should give people a next step.
Body: The LeadFlow Pro builds five-page business websites with a $0 build
fee for approved businesses, and runs ads, content, and follow-up for the
owners who want it handled. You own the accounts, the pixel, the leads, and
the reporting.
Primary: Check the free website program → `/free-build?utm_source=realryannichols&utm_medium=crosslink&utm_campaign=post_interstitial`
Secondary: See the agency lane → `/agency?utm_source=realryannichols&utm_medium=crosslink&utm_campaign=post_interstitial`

## Block 4: SMS alert list mention (existing owned list)

Placement: one message in the existing RealRyanNichols SMS alert sequence,
only to subscribers who opted in to that list. This is not a new list and
not a LeadFlow marketing text; it is Ryan telling his own subscribers about
his other business once. Consent stays with the RealRyanNichols list.

```
Ryan here. Quick one: if you run a business and your website or follow-up is not pulling its weight, The LeadFlow Pro builds it and can run it for you, in accounts you own. Start here: https://www.theleadflowpro.com/?utm_source=realryannichols&utm_medium=sms&utm_campaign=owned_list  Reply STOP to opt out.
```

Send once. Do not repeat without a new reason.

## Block 5: workshop and events

Placement: the RealRyanNichols events or news area, updated from the
LeadFlow featured-event feed rather than typed by hand.

Read `https://www.theleadflowpro.com/api/events/featured` (public, no auth)
and render:

- `status: upcoming` → "Live in Longview, {date_label}: {title}. {time_label}. {price_usd} per attendee." linking to `registration_url`.
- `status: sold_out` → same line with "Sold out" and a link to `past.list_url`.
- `status: past` → `past.headline`, `past.body`, and a link to `past.list_url` with the text `past.list_cta`.

## What to measure

In LeadFlow's first-party analytics (`/admin/analytics`), filter by
`utm_source=realryannichols`. Report page views, qualifier answers, form
submits, and lead records by `utm_campaign`, weekly, for the first month.
No revenue attribution beyond lead records that carry the UTM.

## Approval needed

- Ryan confirms the RealRyanNichols repository and access.
- Ryan approves the copy above or edits it.
- Block 4 is sent by Ryan, once, from the RealRyanNichols list tooling.
