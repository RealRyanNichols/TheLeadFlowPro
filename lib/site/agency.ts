// The agency lane: Meta ads, Google Ads, websites, automation, video, and
// content, run for the client in accounts the client owns.
//
// Every page under /agency renders from this file. Prices come from
// lib/site/offers.ts, where every agency offer is `tbd_ryan` until Ryan sets
// a number; the pages print the neutral TBD line, never a guess. The
// ownership promise below is the same one the free-website program already
// makes: the client pays the platforms directly and keeps the ad account,
// pixel, audiences, leads, and reporting.

import { BUSINESS } from "./business";
import { offer, type Offer } from "./offers";
import { PRICES, usd } from "./prices";

export const OWNERSHIP_PROMISE = {
  headline: "You own the accounts. You pay the platforms. You keep the data.",
  points: [
    "The ad account, pixel, tag, and audiences are created in your name or moved into it before a dollar is spent.",
    "Ad spend goes from your card to Meta or Google. It never passes through The LeadFlow Pro.",
    "Leads land in your inbox, your CRM, or a record you can export. No hidden copy, no cross-client audience, no reuse of one client's leads for another.",
    "Reporting reads your own accounts and your own records. If we part ways, everything keeps working without us.",
  ],
} as const;

export const AGENCY_PROCESS = [
  { step: "01", name: "Map", body: "One call. What you sell, who buys it, where leads come from now, and the monthly budget you are genuinely prepared to spend." },
  { step: "02", name: "Scope", body: "A written scope: what gets built, what you own, what you pay vendors directly, the price, and the first ninety days. Nothing starts without your approval." },
  { step: "03", name: "Build", body: "Accounts, tracking, pages, forms, creative, and routing set up in your accounts, tested with the way you actually answer the phone." },
  { step: "04", name: "Launch", body: "Live on an agreed date with the first-party trace in place: source, action, outcome, against your own records." },
  { step: "05", name: "Measure", body: "A plain-English report on a fixed cadence with definitions printed on it, and one recommended next decision." },
] as const;

export type AgencyService = {
  slug: string;
  offerId: string;
  name: string;
  navLabel: string;
  /**
   * The search title and description for the page. Written the way an owner
   * types the query ("facebook ads", not "meta ads") and naming the place.
   * The on-page headline stays the promise sentence.
   */
  seoTitle: string;
  metaDescription: string;
  eyebrow: string;
  audience: string;
  problem: string;
  promise: string;
  included: string[];
  clientOwns: string[];
  clientPaysDirectly: string[];
  notIncluded: string[];
  faq: { q: string; a: string }[];
  /** Where the intake pre-selects this service. */
  intakeHref: string;
  /** Existing pages this service hands off to, when the work already exists. */
  related: { href: string; label: string }[];
};

const intake = (slug: string) => `/agency/start?service=${slug}`;

export const AGENCY_SERVICES: readonly AgencyService[] = [
  {
    slug: "meta-ads",
    offerId: "agency_meta_ads",
    name: "Meta ads management",
    navLabel: "Meta ads",
    seoTitle: "Facebook and Instagram Ads Management in Longview, TX | The LeadFlow Pro",
    metaDescription:
      "Facebook and Instagram lead ads for Longview and East Texas businesses, built in your own Meta Business Manager. You pay Meta directly and keep the pixel, audiences, leads, and reporting.",
    eyebrow: "Facebook and Instagram",
    audience: "Local service businesses, schools, and shops in East Texas that need more inquiries this month, not a brand campaign.",
    problem: "Boosted posts and a lead form nobody follows up on. Money goes out, a few names come in, and nobody can say which ad paid for which job.",
    promise: "Lead ads and landing pages built in your Meta Business account, wired to your inbox and CRM, with the trace from ad to lead to outcome kept in your records.",
    included: [
      "Meta Business Manager, ad account, and pixel set up or audited in your name",
      "Conversion events and the Conversions API connected to your website or form",
      "Ad copy and creative produced for one offer at a time, reviewed by you before it runs",
      "Instant-form or landing-page lead capture routed to your inbox and CRM with source labels",
      "First-party attribution: which ad, which form, which lead, and what happened next",
      "A weekly plain-English report: spend, leads by source, cost per lead record, and one recommended decision",
    ],
    clientOwns: ["Meta Business Manager and the ad account", "The pixel, events, and every audience", "Every lead, the CRM record, and the reporting"],
    clientPaysDirectly: ["Ad spend, paid to Meta from your card", "Any CRM or form software subscription"],
    notIncluded: ["A promise of a particular cost per lead, number of leads, or return on ad spend", "Running ads for two businesses from one account or audience", "Ad spend passing through The LeadFlow Pro"],
    faq: [
      { q: "Do I need a website first?", a: "No. Meta lead forms work without one. A landing page usually converts better, and the free five-page website program or Website Launch can build it, priced separately." },
      { q: "Who owns the ad account?", a: "You do. If it does not exist yet it is created in your Business Manager. If it exists somewhere else, moving it into your name is the first job." },
      { q: "What does it cost?", a: `Management pricing is confirmed on the scoping call and put in writing before anything starts. Ad spend is separate and goes to Meta directly.` },
      { q: "What happens if we stop?", a: "The account, pixel, audiences, and leads are already yours. Access is removed and everything keeps running." },
    ],
    intakeHref: intake("meta-ads"),
    related: [
      { href: "/free-build", label: "Free five-page website" },
      { href: "/scoreboard", label: "How lead records are counted" },
    ],
  },
  {
    slug: "google-ads",
    offerId: "agency_google_ads",
    name: "Google Ads management",
    navLabel: "Google Ads",
    seoTitle: "Google Ads Management in Longview, TX | The LeadFlow Pro",
    metaDescription:
      "Google Search and Local Services campaigns for Longview and East Texas businesses, run in your own Google Ads account with call and form tracking you keep.",
    eyebrow: "Search and local",
    audience: "Businesses people search for by name or need: plumbers, roofers, clinics, schools, repair shops.",
    problem: "Clicks on broad keywords, calls that go to voicemail, and no way to tell a call from an ad apart from a call from the sign on the truck.",
    promise: "Search and local campaigns in your Google Ads account with call and form tracking, negative keywords that stop the waste, and reporting against your own records.",
    included: [
      "Google Ads account and Google Tag set up or audited in your name",
      "Conversion tracking for calls, forms, and booked appointments",
      "Search campaigns built around the services you actually want more of",
      "Landing pages or call-focused pages that match the search",
      "Negative keyword and search-term reviews on a fixed cadence",
      "A weekly plain-English report: spend, leads by source, cost per lead record, and one recommended decision",
    ],
    clientOwns: ["The Google Ads account and billing profile", "The Google Tag, conversions, and audiences", "Every lead, call log, and the reporting"],
    clientPaysDirectly: ["Ad spend, paid to Google from your card", "Call tracking numbers or software, if used"],
    notIncluded: ["A promise of a ranking position, a number of calls, or a return on ad spend", "Search engine optimisation of the organic listing (a separate scope)", "Ad spend passing through The LeadFlow Pro"],
    faq: [
      { q: "Is this the same as SEO?", a: "No. Google Ads buys the top of the page today. Search optimisation earns the organic listing over months. Both can be scoped; this page is about the ads." },
      { q: "Can you track phone calls?", a: "Yes, with call conversion tracking in your account. If a tracking number is used, it is yours and forwards to your real line." },
      { q: "What does it cost?", a: "Management pricing is confirmed on the scoping call and put in writing before anything starts. Ad spend is separate and goes to Google directly." },
      { q: "How fast does it start?", a: "Account and tracking setup comes first because reporting without it is guessing. Campaigns launch once the tracking is proven with a test conversion." },
    ],
    intakeHref: intake("google-ads"),
    related: [
      { href: "/system/attention", label: "Get found: the plain-English guide" },
      { href: "/tools", label: "Free calculators for cost per lead" },
    ],
  },
  {
    slug: "websites",
    offerId: "website_launch",
    name: "Websites",
    navLabel: "Websites",
    seoTitle: "Website Design for Longview, TX Businesses | The LeadFlow Pro",
    metaDescription:
      "Five-page business websites for Longview and East Texas, built to capture the inquiry and hand it to follow-up. Apply for the free build or buy the Website Launch. You own the domain and the site.",
    eyebrow: "Five pages that give people a next step",
    audience: "Any business whose website cannot answer what you do, what it costs, and how to reach you from a phone.",
    problem: "A template someone else owns, a contact form that goes nowhere, and a monthly bill for a site that has never produced a lead you could trace.",
    promise: "A mobile-first five-page site with lead capture routed to your inbox or CRM, search foundation, analytics in your account, and clear ownership. Apply for the free program or buy it outright.",
    included: [
      "Up to five scoped pages: Home, Services, About, Contact, and one conversion page",
      "One lead-capture path with routing to the agreed inbox or CRM",
      "LocalBusiness structured data, titles, descriptions, sitemap, and indexing submission",
      "First-party analytics connected in your account",
      "Deployment to your own hosting project and domain",
      "Two revision rounds against the written scope",
    ],
    clientOwns: ["The code, the domain, and the hosting project", "The form, the leads, and the analytics", "Every account created for the build"],
    clientPaysDirectly: ["Domain registration", `Hosting after the included ${PRICES.hostingIncludedDays} days on a free build`, "Any paid software the site depends on"],
    notIncluded: ["A promise of a Google ranking, a number of leads, or sales", "Unlimited pages or revisions", "CRM, automation, or ad management (separate scopes on this site)"],
    faq: [
      { q: "Is the free program real?", a: `Yes. Approved businesses get the five-page build with a ${usd(PRICES.freeBuildFee)} build fee. Application and capacity apply. The buy-it-outright option is the Website Launch at ${usd(PRICES.websiteLaunchTotal)}.` },
      { q: "Do you host it?", a: `The first ${PRICES.hostingIncludedDays} days are included on a free build. After that you can self-host, export, or choose managed hosting at ${usd(PRICES.hostingManagedMonthly)} a month, or ${usd(PRICES.hostingWithEditsMonthly)} a month with two minor edits.` },
      { q: "Can it connect to my ads?", a: "Yes. The pixel, tag, and lead routing are set up so an ad click, a form, and a lead record connect. That is the trace-the-sale chain the rest of this site teaches." },
    ],
    intakeHref: "/free-build",
    related: [
      { href: "/free-build", label: `Free Website Program, ${usd(PRICES.freeBuildFee)} build fee` },
      { href: "/packages/launch", label: `Website Launch, ${usd(PRICES.websiteLaunchTotal)}` },
    ],
  },
  {
    slug: "automation",
    offerId: "agency_automation",
    name: "Automation",
    navLabel: "Automation",
    seoTitle: "Lead Follow-Up and Missed Call Text Back Automation in Longview, TX | The LeadFlow Pro",
    metaDescription:
      "Lead routing, first reply, missed call text back, and follow-up sequences installed in your own CRM, phone, and email accounts for Longview and East Texas businesses, with consent and STOP handled.",
    eyebrow: "Capture, record, follow up, sell, deliver, report",
    audience: "Owners doing follow-up from memory, re-typing the same reply, and losing the lead that came in on Saturday.",
    problem: "Inquiries arrive in five places, nobody owns the next step, and the one automation somebody set up two years ago texts people who never agreed to it.",
    promise: "The operating loop this site runs on, installed in your accounts: every inquiry becomes a record with an owner, the first reply goes out fast, follow-up runs on a ladder, and every automation is documented with its trigger, consent rule, and stop condition.",
    included: [
      "A map of the loop: capture, record, follow-up, sale, delivery, reporting, with the leaks marked",
      "Lead routing from forms, calls, texts, and ads into one record per person",
      "First-reply and follow-up sequences, written for your offer, with consent and STOP handling",
      "Missed call text back set up in your own phone or texting account, with the reply written for your business",
      "Owner alerts and a daily list of who to call",
      "Every automation documented: trigger, eligibility, consent, exclusions, delay, stop conditions, owner",
      "Built in your CRM, phone, and email accounts, or on the LeadFlow plugin if you prefer one inbox",
    ],
    clientOwns: ["Every account the automation runs in", "The sequences, templates, and the records they write to", "The right to pause any automation at any time"],
    clientPaysDirectly: ["CRM, phone, texting, and email software subscriptions", "Per-message carrier fees"],
    notIncluded: ["Marketing texts to anyone without recorded consent", "Automations that promise a seat, discount, refund, or result", "Sending from LeadFlow accounts on your behalf"],
    faq: [
      { q: "Is this the plugin?", a: `The plugin is the ${usd(PRICES.pluginMonthly)} a month product that runs the loop inside ChatGPT or Claude. Automation as an agency service is the same loop built into the tools you already use, or the plugin set up and tuned for you.` },
      { q: "What about texting?", a: "Texts go only to people who agreed, every text carries an opt-out, and STOP is honoured immediately and everywhere. If your list does not have consent recorded, the first job is fixing that." },
      { q: "Do you set up missed call text back?", a: "Yes, in your own phone or texting account, with the reply written for your business, consent recorded, and STOP honoured immediately. The free script writer on this site drafts the message; this service installs it and wires the reply into your lead records." },
      { q: "What does it cost?", a: "Automation scopes are priced on the scoping call and put in writing. The cheapest version of the follow-up piece is the written Follow-Up Campaign on this site." },
    ],
    intakeHref: intake("automation"),
    related: [
      { href: "/go/lead-follow-up", label: `Follow-Up Campaign, ${usd(PRICES.leadFollowUpCampaign)}` },
      { href: "/plugin", label: `The plugin, ${usd(PRICES.pluginMonthly)} a month` },
    ],
  },
  {
    slug: "video",
    offerId: "agency_video",
    name: "Video and media",
    navLabel: "Video",
    seoTitle: "Business Video Production in Longview, TX | The LeadFlow Pro",
    metaDescription:
      "Short vertical clips, an offer explainer, and customer stories shot on location for Longview and East Texas businesses, delivered as files you own for your pages and ads.",
    eyebrow: "Shot on location, cut for the phone",
    audience: "Businesses whose work looks better than their website says, and owners who explain the offer well in person.",
    problem: "Nothing on your pages or your ads shows the actual work, the actual room, or the actual person a customer will meet.",
    promise: "Short vertical clips, an offer explainer, and customer stories captured with written consent, delivered as files you own and ready for your pages and ads.",
    included: [
      "A shot list built from your offer and the questions customers ask",
      "On-location capture: the work, the space, the people",
      "Vertical shorts cut for Facebook, Instagram, and YouTube",
      "One offer explainer for the website and ads",
      "Customer story capture with a signed release before the camera rolls",
      "Files delivered to storage you own, with captions and thumbnails",
    ],
    clientOwns: ["Every file, raw and finished", "The channels they are posted to", "The releases and consent records"],
    clientPaysDirectly: ["Any paid stock music or licensed assets", "Ad spend if the video runs as an ad"],
    notIncluded: ["Testimonials without a signed release", "Scripted claims about results, rankings, or savings", "Filming customers, students, or patients who have not agreed in writing"],
    faq: [
      { q: "Can you film my customers?", a: "Only with a signed release that says how the footage may be used. Anyone who declines is seated or shot out of frame, and nothing they say is used." },
      { q: "What packages are there?", a: "Package tiers are being finalised by Ryan and priced on the scoping call. The usual shapes are a shorts package, an offer explainer, and a customer-story capture day." },
      { q: "Do I get the raw footage?", a: "Yes. Raw and finished files are delivered to storage in your name." },
    ],
    intakeHref: intake("video"),
    related: [
      { href: "/results", label: "See the businesses already on camera" },
    ],
  },
  {
    slug: "content",
    offerId: "agency_content",
    name: "Content",
    navLabel: "Content",
    seoTitle: "Content Marketing for Longview, TX Businesses | The LeadFlow Pro",
    metaDescription:
      "Posts, pages, and emails written for Longview and East Texas businesses, approved by you before anything publishes, in channels you own.",
    eyebrow: "Posts, pages, and emails that answer real questions",
    audience: "Owners who know what customers ask every week and never have time to write it down.",
    problem: "A page that has not changed since launch, a Facebook feed that stops every time the business gets busy, and emails that only go out when there is a sale.",
    promise: "A content engine built around one offer at a time: the questions, the answers, the posts, the pages, and the emails, drafted in your voice, published in your accounts on a calendar you approve.",
    included: [
      "A question bank from your calls, texts, and reviews",
      "Two weeks to thirty days of posts, drafted and scheduled for your approval",
      "Service pages and articles written to answer the search, not to fill space",
      "Email follow-up sequences for one offer with consent and unsubscribe handled",
      "Publishing set up in your accounts with first-party analytics on every page",
      "A monthly note on what people read, clicked, and asked next",
    ],
    clientOwns: ["Every post, page, article, and email", "The channels, the list, and the analytics", "The publishing calendar"],
    clientPaysDirectly: ["Email software or scheduling tools, if used", "Ad spend if a post is promoted"],
    notIncluded: ["Invented reviews, statistics, or claims", "Marketing email to anyone who did not opt in", "Posting from LeadFlow accounts on your behalf"],
    faq: [
      { q: "Is this the Content Engine on the free-website page?", a: `The ${usd(PRICES.freeBuildContentEngine)} Content Engine is the fixed two-week version that comes with the free website. The agency version runs on a monthly cadence and is scoped and priced on the call.` },
      { q: "Will it sound like me?", a: "It has to. The first job is a short voice interview; every draft is checked against it, and nothing publishes without your approval on the first batch." },
      { q: "Can I learn to do this myself?", a: "Yes. The Content Engine course in the Operator Academy teaches the same process." },
    ],
    intakeHref: intake("content"),
    related: [
      { href: "/free-build", label: `Free Website + Content Engine, ${usd(PRICES.freeBuildContentEngine)}` },
      { href: "/operator-academy/content-engine", label: "The Content Engine course" },
    ],
  },
];

export function agencyService(slug: string): AgencyService | null {
  return AGENCY_SERVICES.find((s) => s.slug === slug) ?? null;
}

export function agencyOffer(service: AgencyService): Offer {
  return offer(service.offerId);
}

export const AGENCY_HUB = {
  eyebrow: "Run it for me",
  title: "The agency lane.",
  lead: `Meta ads, Google Ads, websites, automation, video, and content, run by ${BUSINESS.operator} in accounts you own. The free five-page website stays the front door; this is the lane for owners who want the whole loop handled.`,
  budgetNote: "The intake asks for the monthly ad budget you are genuinely prepared to spend. A $0 answer does not disqualify you; it routes you to the right lane.",
  contact: {
    phone: BUSINESS.phone.display,
    tel: BUSINESS.phone.tel,
    email: BUSINESS.email.hello,
  },
} as const;
