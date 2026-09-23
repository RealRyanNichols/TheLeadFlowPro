// The Five. Five East Texas businesses get thirty days of the whole
// done-for-you service for a one time price, then the door closes.
//
// Everything the /five page, the checkout, the webhook, and the stats route
// need lives here so the offer cannot drift between them. Copy rules in force
// for every string in this file: plain English, no dashes of any kind, no
// banned words, and no promise of leads, sales, revenue, cost per lead, or a
// position in Google. Real numbers from real projects, with the date and the
// source attached, or nothing.

import { BUSINESS } from "@/lib/site/business";
import { PRICES, usd } from "@/lib/site/prices";

export const FIVE_OFFER = {
  /** Stripe metadata.kind, purchases.kind, and the analytics label. */
  kind: "five_30day",
  path: "/five",
  name: "The Five",
  longName: "Thirty days of everything, for five businesses",
  priceUsd: PRICES.fiveSpotOffer,
  priceCents: PRICES.fiveSpotOffer * 100,
  priceLabel: usd(PRICES.fiveSpotOffer),
  /** What this same thirty days costs on the regular monthly retainer. */
  compareUsd: PRICES.companyOsFrom,
  compareLabel: `${usd(PRICES.companyOsFrom)} a month`,
  spots: 5,
  /** Central time. The counter on the page reads this. */
  deadlineIso: "2026-09-30T23:59:59-05:00",
  deadlineLabel: "September 30",
  /** Page views and clicks count from this moment, not from the dawn of time. */
  launchIso: "2026-09-22T00:00:00-05:00",
  days: 30,
  posts: 100,
  postsPerDay: 3,
  shootHours: 2,
  radiusMiles: 50,
  emailDays: 30,
  utmCampaign: "five_30day",
} as const;

export type FiveIncluded = {
  id: string;
  title: string;
  body: string;
  /** Icon key rendered by the page. Every card gets a different one. */
  icon: "camera" | "megaphone" | "calendar" | "layout" | "eye" | "mail" | "key";
  /** Accent index, 1 to 6, rotated so no two neighbors match. */
  accent: 1 | 2 | 3 | 4 | 5 | 6;
  /** What this line item runs on its own at the regular rate. Only where Ryan has a number. */
  worth?: string;
};

export const FIVE_INCLUDED: FiveIncluded[] = [
  {
    id: "shoot",
    icon: "camera",
    accent: 1,
    title: "I come to you and film it",
    body: `One on-site shoot at your business or job site, up to ${FIVE_OFFER.shootHours} hours, anywhere within ${FIVE_OFFER.radiusMiles} miles of Longview. Mic on you. I ask the questions. Then I cut it into your ad.`,
  },
  {
    id: "ad",
    icon: "megaphone",
    accent: 2,
    title: "Your ad built, launched, and run for 30 days",
    body: "Built on your own Meta ad account, connected through Leadsie so you keep ownership. I write it, target it, launch it, and watch it every day. Ad spend is paid by you straight to Meta.",
  },
  {
    id: "posts",
    icon: "calendar",
    accent: 3,
    title: `${FIVE_OFFER.posts} Facebook posts in 30 days`,
    body: `${FIVE_OFFER.postsPerDay} a day, written for your business in your voice, scheduled and published for you. Your page stops looking abandoned the first week.`,
  },
  {
    id: "funnel",
    icon: "layout",
    accent: 4,
    title: "A funnel page that catches the lead",
    body: "No website? I build one. Have one you do not like? I fix it. Have one you like? I build the offer page on it. Every lead lands in your inbox and on your phone.",
  },
  {
    id: "watch",
    icon: "eye",
    accent: 5,
    title: "Ad and comment monitoring, every day",
    body: "I watch the ad numbers and your page comments for the full 30 days, so a question in the comments turns into a call instead of sitting there.",
  },
  {
    id: "email",
    icon: "mail",
    accent: 6,
    title: `A ${FIVE_OFFER.emailDays} day email follow-up series`,
    body: "Written in your voice and wired into your email tool: Resend, AWeber, Mailchimp, or ours. Every lead that does not buy on day one keeps hearing from you.",
  },
  {
    id: "own",
    icon: "key",
    accent: 1,
    title: "You own all of it",
    body: "The footage, the ad account, the page, the posts, the list, the emails. Fire me on day 31 and every bit of it stays with you.",
  },
];

export const FIVE_NOT_INCLUDED: string[] = [
  "Ad spend. You pay Meta directly on your own card. Most owners run between $25 and $50 a day. I will tell you the number I would run before we start.",
  "Domain registration and paid hosting after the included window, if I build the site. Every outside cost is named before you approve it.",
  "Anything after day 30. Nothing renews. If you want me to keep going, that is a written quote at the regular rate and a yes from you.",
];

export type FiveStep = { day: string; title: string; body: string };

export const FIVE_TIMELINE: FiveStep[] = [
  { day: "Day 1", title: "The call", body: `I call you from ${BUSINESS.phone.display}. Thirty minutes. Your offer, your area, your best customer, and the shoot date.` },
  { day: "Days 2 to 5", title: "The shoot", body: "I show up with the mic and the camera. You talk about the work. I get the footage and the photos the posts need." },
  { day: "Days 3 to 7", title: "The build", body: "Funnel page live, Facebook page connected through Leadsie, email series wired in, first week of posts scheduled." },
  { day: "Day 7", title: "The ad goes live", body: "Your video ad launches on your account. I send you the first read within 48 hours." },
  { day: "Days 8 to 30", title: "Run and watch", body: "Three posts a day. Ad checked every day. Comments answered. Leads landing in your inbox and on your phone." },
  { day: "Day 30", title: "The handoff", body: "You get every login, every file, and a written read of what happened. Nothing renews unless you say so in writing." },
];

export type FiveProof = {
  id: string;
  name: string;
  who: string;
  image: string;
  imageAlt: string;
  facts: { value: string; label: string }[];
  note: string;
};

/**
 * Real numbers only. Each block names its date and where the number came from.
 * Ryan restates these in his own words on the page, so keep the attribution
 * lines exact when editing.
 */
export const FIVE_PROOF: FiveProof[] = [
  {
    id: "olguy",
    name: "O-L Guy Farms",
    who: "Scott, dirt work and hay, Tyler",
    image: "/images/proof/olguyfarms-og.jpg",
    imageAlt: "O-L Guy Farms website card: East Texas land, one family behind the work",
    facts: [
      { value: "5", label: "leads from the ad" },
      { value: "$150 to $200", label: "ad spend so far" },
      { value: "$7,000 to $9,000", label: "first job booked" },
    ],
    note: "Scott's numbers as of September 22, 2026, as he reported them to Ryan. One video shot on site the week of September 11. Ad launched the week of September 15 on Scott's own account and card. The first pond job started this week.",
  },
  {
    id: "pda",
    name: "Premier Dental Academy of Longview",
    who: "Amanda, dental assistant school",
    image: "/images/premier/premier-students.jpg",
    imageAlt: "Premier Dental Academy of Longview students in blue scrubs outside the school",
    facts: [
      { value: "59", label: "students this year" },
      { value: "21", label: "enrolled right now" },
      { value: "Full", label: "classes, at regular tuition" },
    ],
    note: "Ryan's own count on September 21, 2026. The school and The LeadFlow Pro share common ownership, which is why it is the proof he can show you from the inside.",
  },
  {
    id: "mall",
    name: "Our own ad, on our own money",
    who: "The LeadFlow Pro, Longview Mall video",
    image: "/proof/mall-walk-poster.jpg",
    imageAlt: "Still from the Longview Mall walk video ad",
    facts: [
      { value: "21", label: "leads in two days" },
      { value: "$217", label: "spent in those two days" },
      { value: "1 video", label: "shot on a phone" },
    ],
    note: "September 16 and 17, 2026, read straight off Ads Manager. Thirteen leads the first day, eight the second. Same method you are buying here.",
  },
];

export type FiveFaq = { q: string; a: string };

export const FIVE_FAQ: FiveFaq[] = [
  {
    q: "What is the catch?",
    a: `There are five of these and then the price goes back to ${FIVE_OFFER.compareLabel}. I am doing it because I want five more East Texas businesses I can point to by name, the way I can point to Scott and Amanda. You get the full month. I get the receipt.`,
  },
  {
    q: "Do you promise me leads?",
    a: "No. Nobody honest can. I do not know your market, your prices, or how fast you answer your phone. What I promise is the work: the shoot, the ad, the posts, the page, the emails, the daily watch, all delivered inside 30 days. Scott's and Amanda's numbers are theirs, not a guarantee of yours.",
  },
  {
    q: "What does the ad spend cost?",
    a: "You pay Meta directly on your own card, so it never touches me. Most owners I work with run between $25 and $50 a day. I will tell you exactly what I would run for your business on the day 1 call, and you decide.",
  },
  {
    q: "I already have a website. Do I need a new one?",
    a: "No. If you like it, I build the offer page on it. If you do not, I fix it or replace it. The funnel page is part of the package either way.",
  },
  {
    q: "I am more than 50 miles from Longview.",
    a: `The on-site shoot is the only piece tied to the map. Outside ${FIVE_OFFER.radiusMiles} miles, you shoot it on your phone with my shot list on a call, and everything else in the package stays the same. Text me and we will sort it.`,
  },
  {
    q: "What happens on day 31?",
    a: "Nothing renews. You keep the ad account, the page, the posts, the footage, and the email list. If you want me to keep running it, I quote the regular monthly rate in writing and you say yes or no.",
  },
  {
    q: "Can I pay in two parts?",
    a: `The five spots are ${FIVE_OFFER.priceLabel} paid once, which is what makes the price work. If you need a split, text me before you buy and I will tell you straight whether I can do it.`,
  },
  {
    q: "Why should I believe you?",
    a: "Do not take my word. Call Scott. Look at the school. Watch my own ad on my own page. Every number on this page has a date and a name on it, and I will show you the screen behind any of them.",
  },
];

export const FIVE_TRACKING = {
  /** analytics_events.label on the checkout_start event for this offer. */
  checkoutLabel: "five_30day",
  /** analytics_events.label on cta_click for the "text me" and "call me" buttons. */
  contactLabel: "five_contact",
} as const;

export function fiveLink(utmContent: string, path: string = FIVE_OFFER.path): string {
  return `${BUSINESS.siteUrl}${path}?utm_source=email&utm_medium=offer&utm_campaign=${FIVE_OFFER.utmCampaign}&utm_content=${utmContent}`;
}

/** True once the calendar has passed the deadline, in the ad account's own time zone. */
export function fiveOfferExpired(now = new Date()): boolean {
  return now.getTime() > new Date(FIVE_OFFER.deadlineIso).getTime();
}
