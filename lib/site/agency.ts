// The agency lane: Meta ads, Google Ads, websites, automation, video, and
// content, plus specialty builds (community help desks, crypto tax intake,
// XRPL treasury alerts, crypto checkout), run for the client in accounts the
// client owns.
//
// Public agency pages use managedPlans.ts. Legacy offerId mappings below stay
// available to existing signed-scope payment handlers; they are not public plans.

import { BUSINESS } from "./business";
import { offer, type Offer } from "./offers";
import { PRICES, usd } from "./prices";
import { MANAGED_COMMERCIAL_TERMS, managedAdvertisingExplanation, managedBillingExplanation, managedCampaignSummary } from "./managedPlans";
import { productProjectIntakeHref } from "./agencyIntake";
import { PROJECT_QUOTE_SUMMARY } from "./projectQuotes";

export const AGENCY_PLAN_SUMMARY = `${managedCampaignSummary()} Paid upfront. Advertising is included within your written campaign allocation.`;

export const OWNERSHIP_PROMISE = {
  headline: "You own the accounts and data. Your campaign includes advertising.",
  points: [
    "The ad account, pixel, tag, and audiences are created in your name or moved into it before a dollar is spent.",
    managedAdvertisingExplanation(),
    "Leads land in your inbox, your CRM, or a record you can export. No hidden copy, no cross-client audience, no reuse of one client's leads for another.",
    "Reporting reads your accounts and records. If we part ways, you keep your accounts, data, and the documented systems you own.",
  ],
} as const;

export const AGENCY_PROCESS = [
  { step: "01", name: "Map", body: "One call. What you sell, who buys it, where leads come from now, and the first 90-day campaign and the jobs your business can handle." },
  { step: "02", name: "Scope", body: `A written scope for the first ${MANAGED_COMMERCIAL_TERMS.initialCampaignDays} days: the agreed build, what you own, the included advertising allocation, the acquisition target, how outcomes count, and the ${usd(MANAGED_COMMERCIAL_TERMS.startingUpfrontUsd)} upfront minimum and any additional prepaid acquisition scope. Nothing starts without your approval.` },
  { step: "03", name: "Build", body: "Accounts, tracking, pages, forms, creative, and routing set up in your accounts, tested with the way you actually answer the phone." },
  { step: "04", name: "Launch", body: "Live on an agreed date with the first-party trace in place: source, action, outcome, against your own records." },
  { step: "05", name: "Measure", body: "Reports connect inquiries to the agreed counted outcomes using your closing records. At day 90 we review results and capacity. If the work supports scaling, a higher investment needs a new written scope and price; there is no automatic extension or charge." },
] as const;

export const PROJECT_BUILD_PROCESS = [
  { step: "01", name: "Map", body: "Review what you sell, who uses it, and the website, catalog, payment, and delivery accounts you already have." },
  { step: "02", name: "Scope", body: "Agree the build and launch deliverables, ownership, timing, operating costs, support, and project price in writing before work or payment." },
  { step: "03", name: "Build", body: "Build the agreed pages, checkout, delivery, or customer workflow in accounts you control. Review the work before launch." },
  { step: "04", name: "Launch", body: "Test the agreed customer path, access rules, and handoff. Launch only after the required content and account approvals are complete." },
  { step: "05", name: "Measure", body: "Review the product and operating records agreed in your scope. Any ongoing support or managed acquisition needs its own written responsibilities and price; the build has no automatic job target or renewal." },
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
  /** Build-only inquiries use a project quote, without a campaign acknowledgment. */
  inquiryKind?: "product-project";
  /** Existing pages this service hands off to, when the work already exists. */
  related: { href: string; label: string }[];
  /**
   * Who a specialty service is built for ("Online communities"). The six
   * core services every local business buys have none; a specialty service
   * sits in its own band on the hub and stays off the Longview grid.
   */
  specialty?: string;
  /** The line under the hero. Absent means the ads line every other page uses. */
  trustLine?: string;
};

const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"] as const;

/** "seven" or "Seven": copy that counts services reads the list, so it cannot drift. */
export function countWord(n: number, capitalized = false): string {
  const word = COUNT_WORDS[n] ?? String(n);
  return capitalized ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

const intake = (slug: string) => `/agency/start?service=${slug}`;

export const AGENCY_SERVICES: readonly AgencyService[] = [
  {
    slug: "meta-ads",
    offerId: "agency_meta_ads",
    name: "Meta ads management",
    navLabel: "Meta ads",
    seoTitle: "Facebook and Instagram Ads Management in Longview, TX | The LeadFlow Pro",
    metaDescription:
      "Facebook and Instagram lead ads for Longview and East Texas businesses, built in your own Meta Business Manager. Advertising is included in your written plan allocation. You keep the pixel, audiences, leads, and reporting.",
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
    clientPaysDirectly: ["Only vendor or software items identified outside the included campaign allocation in your written scope"],
    notIncluded: ["A promise of a particular cost per lead, number of leads, or return on ad spend", "Running ads for two businesses from one account or audience", "Spending beyond the advertising allocation without an approved scope change"],
    faq: [
      { q: "Do I need a website first?", a: "No. Meta lead forms can work without one. If a website or landing page is needed, we define the build within your 90-day campaign before work begins." },
      { q: "Who owns the ad account?", a: "You do. If it does not exist yet it is created in your Business Manager. If it exists somewhere else, moving it into your name is the first job." },
      { q: "What does it cost?", a: AGENCY_PLAN_SUMMARY },
      { q: "What happens if we stop?", a: "The account, pixel, audiences, and leads are already yours. Our access is removed. Your accounts and records stay yours; whether advertising continues depends on your instructions and funding." },
    ],
    intakeHref: intake("meta-ads"),
    related: [
      { href: "/agency/websites", label: "Websites" },
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
    clientPaysDirectly: ["Only vendor or tracking software identified outside the included campaign allocation in your written scope"],
    notIncluded: ["A promise of a ranking position, a number of calls, or a return on ad spend", "Search engine optimisation of the organic listing (a separate scope)", "Spending beyond the advertising allocation without an approved scope change"],
    faq: [
      { q: "Is this the same as SEO?", a: "No. Google Ads buys the top of the page today. Search optimisation earns the organic listing over months. Both can be scoped; this page is about the ads." },
      { q: "Can you track phone calls?", a: "Yes, with call conversion tracking in your account. If a tracking number is used, it is yours and forwards to your real line." },
      { q: "What does it cost?", a: AGENCY_PLAN_SUMMARY },
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
      "Website and storefront projects for Longview and East Texas, quoted around your build, launch, and support. You own your site and accounts.",
    eyebrow: "A website that gives people a next step",
    audience: "Any business whose website cannot answer what you do, what it costs, and how to reach you from a phone.",
    problem: "A template someone else owns, a contact form that goes nowhere, and a monthly bill for a site that has never produced a lead you could trace.",
    promise: "A website or storefront built around what you sell, with the pages, checkout, delivery, and support agreed in a separate project quote. You own the site and accounts; managed acquisition is optional.",
    included: [
      "The pages agreed in your quote: services or products, proof, contact, and the customer paths your business needs",
      "Storefront, checkout, download, or order handoff features when included in your project scope",
      "One lead-capture path with routing to the agreed inbox or CRM",
      "LocalBusiness structured data, titles, descriptions, sitemap, and indexing submission",
      "First-party analytics connected in your account",
      "Deployment to your own hosting project and domain",
      "Revision rounds and ongoing responsibilities defined in your written scope",
    ],
    clientOwns: ["The code, the domain, and the hosting project", "The form, the leads, and the analytics", "Every account created for the build"],
    clientPaysDirectly: ["Domain registration", "Third-party hosting fees, unless you choose managed hosting", "Any paid software the site depends on"],
    notIncluded: ["A promise of a Google ranking, a number of leads, or sales", "Unlimited pages or revisions", "Managed acquisition or ongoing support not agreed in the project scope"],
    faq: [
      { q: "What does it cost?", a: PROJECT_QUOTE_SUMMARY },
      { q: "Do you host it?", a: "Hosting, access, and responsibilities are written into your proposal. You own the domain and site. Any vendor item outside the approved plan is disclosed before you agree." },
      { q: "Do I have to buy an acquisition campaign?", a: "No. A storefront or product build can have its own project quote. A managed acquisition campaign is a separate decision, with its goal, advertising allocation, price, and responsibilities agreed in writing." },
      { q: "Does a product build carry a farm job target?", a: "No. Product build and launch deliverables are defined in your project quote. We do not apply farm job or property deal targets to ordinary product sales." },
      { q: "Can it connect to my ads?", a: "Yes. We can scope tracking and inquiry routing for your customer path. Running the acquisition campaign is optional and requires its own written scope." },
    ],
    intakeHref: productProjectIntakeHref({ service: "websites" }),
    inquiryKind: "product-project",
    related: [
      { href: "/commerce", label: "Storefront and product planning" },
      { href: "/pricing", label: "Optional managed acquisition campaign" },
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
      { q: "What does it cost?", a: AGENCY_PLAN_SUMMARY },
    ],
    intakeHref: intake("automation"),
    related: [
      { href: "/operatoros", label: "OperatorOS: map and review repetitive work" },
      { href: "/pricing", label: "90-day campaign and scope" },
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
    clientPaysDirectly: ["Only licensed assets or vendor items identified outside the included campaign allocation in your written scope"],
    notIncluded: ["Testimonials without a signed release", "Scripted claims about results, rankings, or savings", "Filming customers, students, or patients who have not agreed in writing"],
    faq: [
      { q: "Can you film my customers?", a: "Only with a signed release that says how the footage may be used. Anyone who declines is seated or shot out of frame, and nothing they say is used." },
      { q: "What packages are there?", a: "Video work is part of the scope we agree within your 90-day campaign. A shorts package, an offer explainer, or a capture day is selected around your business priorities and capacity." },
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
    clientPaysDirectly: ["Email software or scheduling tools identified outside the included campaign allocation in your written scope", "Additional promotion beyond the campaign's included advertising allocation, only with a separately approved scope and budget"],
    notIncluded: ["Invented reviews, statistics, or claims", "Marketing email to anyone who did not opt in", "Posting from LeadFlow accounts on your behalf"],
    faq: [
      { q: "What does a managed acquisition campaign cost?", a: AGENCY_PLAN_SUMMARY },
      { q: "Can I quote content for a product launch separately?", a: PROJECT_QUOTE_SUMMARY },
      { q: "Will it sound like me?", a: "It has to. The first job is a short voice interview; every draft is checked against it, and nothing publishes without your approval on the first batch." },
      { q: "Can I learn to do this myself?", a: "Yes. The Content Engine course in the Operator Academy teaches the same process." },
    ],
    intakeHref: intake("content"),
    related: [
      { href: productProjectIntakeHref({ service: "content" }), label: "Quote product launch content" },
      { href: "/operator-academy/content-engine", label: "The Content Engine course" },
    ],
  },
  {
    // Built for online communities, crypto and XRP Ledger projects among them.
    // The help desk never talks prices or investing, and nothing here promotes
    // a token: a bot that speaks for a team can make a claim nobody approved.
    slug: "community-help-desk",
    offerId: "agency_community_help_desk",
    name: "Community help desk",
    navLabel: "Help desk",
    specialty: "Online communities",
    seoTitle: "AI Help Desk for Discord and Telegram Communities | The LeadFlow Pro",
    metaDescription:
      "An AI help desk for your Discord server, Telegram group, or website chat, trained on your own answers, with scam warnings, a hand-off to a real moderator, and a safer server setup first. Built in accounts you own.",
    eyebrow: "Discord, Telegram, and website chat",
    audience: "Online communities that answer the same questions every day: crypto and XRP Ledger projects, creators, and course or membership groups.",
    problem: "Moderators answer the same ten questions all day, new members give up before anyone replies, and scammers message them pretending to be the team.",
    promise: "A help desk trained on your own answers that replies day and night, warns members about scams, and hands anything it should not answer to a real moderator. It never talks prices or investing.",
    trustLine: "No price talk, no investment advice, and a real moderator for anything the bot should not answer.",
    included: [
      "Safe server setup first: roles and permissions, member verification, link and name filters, two-factor sign-in for every admin, and one official-links page",
      "A written plan for raids and impersonators: who locks the server, what gets posted, and how members report a fake account",
      "An AI help desk on one platform, trained on your docs, FAQ, and rules",
      "Scam warnings in its answers: the team never messages first and never asks for a recovery phrase",
      "A hand-off to a real moderator, with the question logged so nothing gets lost",
      "Refusal rules in writing: no price talk, no investment advice, no promises about the project",
      "A test run on your 25 most-asked questions before it goes live",
      "Thirty days of weekly tuning from the questions it could not answer",
    ],
    clientOwns: [
      "The server or group, the bot account, and every setting",
      "The knowledge base the help desk answers from",
      "The chat logs and the list of questions it could not answer",
    ],
    clientPaysDirectly: ["The help desk software subscription, billed to you by its maker"],
    notIncluded: [
      "Price talk, investment advice, or promoting a token, sale, or listing",
      "Paid shilling, raids, or rewards for posting, liking, or reviewing",
      "Holding wallet keys, recovery phrases, or anyone's money",
      "Replacing your moderators' judgment on bans, refunds, or disputes",
    ],
    faq: [
      { q: "Which platforms does it work on?", a: "Discord, Telegram, or the chat on your website. The first build covers one platform. Adding another is a new line on the written scope." },
      { q: "Will it talk about our token price?", a: "No. It refuses price talk, predictions, and investment questions, and points members to your official links instead. A bot speaking for your team can make a claim nobody approved, so price talk stays out." },
      { q: "Does it replace our moderators?", a: "No. It takes the repeat questions so your moderators have time for the ones that need a person. Bans, refunds, and disputes stay with your team." },
      { q: "Can you just lock down our server?", a: "Yes. The safe server setup can be scoped on its own: roles, verification, filters, two-factor sign-in for admins, the official-links page, and the written raid plan." },
      { q: "Who owns the bot and the answers?", a: "You do. The bot account, the server settings, the knowledge base, and the logs are in your name. If we part ways, it keeps running without us." },
      { q: "What does it cost?", a: `${AGENCY_PLAN_SUMMARY} Specialty capacity and any outside software charges are identified in the proposal.` },
    ],
    intakeHref: intake("community-help-desk"),
    related: [
      { href: "/agency/automation", label: "Automation" },
      { href: "/agency/websites", label: "Websites" },
    ],
  },
  {
    // For CPA and tax prep firms. It gathers answers and files; the firm does
    // the tax work. It never asks for a password, key, or recovery phrase,
    // and client information is used for the firm's intake and nothing else.
    // The Form 1099-DA lines follow the IRS digital assets page as cited in
    // the Sept 2026 crypto research: gross proceeds for sales from 2025, cost
    // basis for crypto bought from 2026. Recheck it before each tax season.
    slug: "crypto-tax-intake",
    offerId: "agency_crypto_tax_intake",
    name: "Crypto tax intake",
    navLabel: "Crypto tax intake",
    specialty: "CPA and tax firms",
    seoTitle: "Crypto Tax Client Intake for CPA Firms in East Texas | The LeadFlow Pro",
    metaDescription:
      "A crypto client intake for Longview and East Texas CPA and tax prep firms: a plain-English questionnaire, a document checklist, uploads to your own storage, reminders, and a tracker. Paperwork, not tax advice.",
    eyebrow: "For CPA and tax prep firms",
    audience: "CPA and tax prep firms in East Texas whose clients bought, sold, swapped, or got paid in crypto, and whose staff spends tax season chasing the paperwork.",
    problem: "Clients send a screenshot and a shrug. Form 1099-DA shows what they sold for, often not what they paid, and trades from their own wallets are usually on no form at all.",
    promise: "A crypto intake your clients can finish from a phone: plain questions, a checklist built from their answers, uploads straight to your firm's storage, and reminders until every item is in.",
    trustLine: "Paperwork and reminders, never tax advice. No passwords, keys, or recovery phrases, ever.",
    included: [
      "A client questionnaire written for crypto: which exchanges, which wallets, and what happened during the year, in plain words",
      "A document checklist built from the answers: each Form 1099-DA, exchange exports, and public wallet addresses",
      "Uploads that go straight to storage your firm already uses, one folder per client",
      "Reminders by email, and by text only to clients who agreed to texts, until each item arrives, with STOP honored immediately",
      "A tracker for your staff: who is complete, what is missing, and who to call",
      "Exports gathered and labeled for the crypto tax software your firm already uses",
      "Setup that follows your firm's written information security plan, with access limited to the people you name",
    ],
    clientOwns: [
      "The intake, the client records, and every uploaded file",
      "The storage, the reminder accounts, and the tracker",
      "The questionnaire and checklist, to use again next season",
    ],
    clientPaysDirectly: ["Crypto tax software, if your firm uses one", "Storage, email, or texting subscriptions the reminders run on"],
    notIncluded: [
      "Tax advice, return preparation, or a review of anyone's return",
      "Asking clients for passwords, API keys, private keys, or recovery phrases",
      "Using your clients' information for anything but your intake, including our own marketing",
      "Keeping copies of your clients' files on our systems",
    ],
    faq: [
      { q: "Is this tax advice?", a: "No. It collects answers and documents so your firm can do the tax work. Your firm approves every question on the form before it goes to a client." },
      { q: "What is Form 1099-DA?", a: "The form crypto brokers send for sales from 2025 on. It shows what a client sold for. For crypto bought before 2026 it usually leaves out what they paid, so that number comes from the client's own records, which is what the checklist asks for." },
      { q: "Do clients share wallet passwords?", a: "Never. The intake asks for public wallet addresses and exported files only. It never asks for a password, an API key, a private key, or a recovery phrase." },
      { q: "Where do the files go?", a: "Straight to storage your firm already uses, in a folder per client. It is tested with made-up files, then handed over, and we keep no copies of your clients' files." },
      { q: "When should we set it up?", a: "Before engagement letters go out, so the intake link can go with them." },
      { q: "What does it cost?", a: "Pricing is confirmed on the scoping call and put in writing before anything starts. Crypto tax software, storage, and texting are billed to your firm by their makers." },
    ],
    intakeHref: intake("crypto-tax-intake"),
    related: [
      { href: "/agency/automation", label: "Automation" },
      { href: "/agency/websites", label: "Websites" },
    ],
  },
  {
    // Watch-only: it reads public ledger data for addresses the client owns
    // or may watch, so nobody here holds keys or moves funds. It reports what
    // moved, never prices or what to do about them: no price alerts, no buy
    // or sell calls, no "signals".
    slug: "xrpl-treasury-alerts",
    offerId: "agency_xrpl_treasury_alerts",
    name: "XRPL treasury alerts",
    navLabel: "Treasury alerts",
    specialty: "XRP Ledger projects and merchants",
    seoTitle: "XRP Ledger Wallet and Treasury Alerts for Projects and Merchants | The LeadFlow Pro",
    metaDescription:
      "Watch-only alerts for your own XRP Ledger wallets: a message in Discord, Telegram, email, or text when a payment lands or treasury funds move, plus a public treasury page. No keys, no price alerts, no trading signals.",
    eyebrow: "Watch-only, on the XRP Ledger",
    audience: "Crypto projects, communities, and merchants on the XRP Ledger that need to know when their own wallets receive or send funds, without refreshing an explorer all day.",
    problem: "Someone keeps checking an explorer to see whether a customer's payment landed or a treasury wallet moved, and holders keep asking the team to show where the funds are.",
    promise: "Watch-only alerts on the wallets you name: a message to your team when a payment lands or funds move, and a public treasury page anyone can check. It never holds keys and never sends price alerts or trading signals.",
    trustLine: "Watch-only public addresses. No keys, no price alerts, no trading signals.",
    included: [
      "A watch list of the public XRP Ledger addresses you name: treasury, operations, and payment wallets",
      "Alerts to your team in Discord, Telegram, or email when funds arrive or leave, with the amount, the other account, and a link to the ledger record",
      "Payment checks for merchants: an alert when a payment with the destination tag you expect lands",
      "Alerts for tokens issued on the XRP Ledger that your wallets hold, as well as XRP",
      "A public treasury page on your website that lists each wallet and its balance, read straight from the ledger",
      "Thresholds and quiet hours so small transactions do not flood the channel",
      "A monthly movement report your team can share with holders",
    ],
    clientOwns: [
      "The wallets, the keys, and the accounts they sit in",
      "The alert channels and the list of who gets alerts",
      "The treasury page and every report",
    ],
    clientPaysDirectly: ["Any texting or email software the alerts send through"],
    notIncluded: [
      "Holding, moving, or signing for any wallet or funds",
      "Price alerts, buy or sell calls, or trading of any kind",
      "Tracking wallets that belong to other people",
      "Texts to anyone who has not agreed to get them",
    ],
    faq: [
      { q: "Do you need our keys?", a: "No. Alerts read public ledger data for the addresses you name. Nobody at The LeadFlow Pro holds, sees, or asks for a key or a recovery phrase." },
      { q: "Will it tell us when to buy or sell?", a: "No. It reports what moved on the ledger. It never sends prices, predictions, or trading advice." },
      { q: "Where do the alerts go?", a: "Discord, Telegram, email, or text. Texts go only to people who agreed to get them, and STOP is honored immediately." },
      { q: "Can our holders see the treasury?", a: "Yes, if you want them to. A public treasury page on your website lists each wallet and its current balance, read from the ledger, so anyone can check it." },
      { q: "Can we watch any wallet?", a: "Only wallets your project or business owns, or has written permission to watch. It is not a tool for tracking other people." },
      { q: "What does it cost?", a: "Pricing is confirmed on the scoping call and put in writing before anything starts. Any texting or email software is billed to you by its maker." },
    ],
    intakeHref: intake("xrpl-treasury-alerts"),
    related: [
      { href: "/agency/community-help-desk", label: "Community help desk" },
      { href: "/agency/websites", label: "Websites" },
    ],
  },
  {
    // For local shops that want to take crypto. The shop opens the processor
    // account in its own name and the money goes customer, processor, shop:
    // it never passes through The LeadFlow Pro. No investing or tax advice,
    // and no promoting any coin. Processor fees and terms are checked at
    // scoping, never quoted here.
    slug: "crypto-checkout",
    offerId: "agency_crypto_checkout",
    name: "Crypto-ready checkout",
    navLabel: "Crypto checkout",
    specialty: "Shops that want to take crypto",
    seoTitle: "Accept Crypto Payments at Your Longview, TX Business | The LeadFlow Pro",
    metaDescription:
      "Crypto payments for East Texas shops, set up the careful way: a processor you sign up with directly, conversion to dollars if you want it, a checkout on your site or at the counter, a staff guide, and bookkeeping that matches. We never touch the money.",
    eyebrow: "For shops whose customers ask to pay in crypto",
    audience: "Longview and East Texas shops, restaurants, and service businesses whose customers have asked to pay in crypto, and owners who want to try it without the price swings.",
    problem: "A customer asks to pay in crypto and nobody knows what to say. Owners worry about the price changing overnight, getting the bookkeeping wrong, and staff accepting a payment that never arrives.",
    promise: "Crypto payments set up the careful way: a processor you sign up with directly, conversion to dollars if you want it, a checkout on your site or at the counter, a one-page staff guide, and bookkeeping that matches. We never touch the money.",
    trustLine: "The money goes from your customer to your processor to you. It never passes through The LeadFlow Pro.",
    included: [
      "A plain side-by-side of the payment processors that fit your business: fees, payout options, and what each one asks of you",
      "Setup help once you open the account in your business's name, including conversion to dollars if you want it",
      "A crypto option in your website checkout, or a payment link and QR code for the counter",
      "A one-page staff guide: how to take a payment, how to see that it arrived, and what never to do",
      "How refunds work with your processor, written down so staff are not guessing",
      "A bookkeeping map so crypto sales land in QuickBooks the same way card sales do, ready for your accountant",
      "A test payment from start to finish before anything goes live",
    ],
    clientOwns: [
      "The processor account, in your business's name",
      "Every payment, payout, and record",
      "The checkout, the QR code, and the staff guide",
    ],
    clientPaysDirectly: ["Processor fees, charged by the processor", "The bookkeeping software you already use"],
    notIncluded: [
      "Receiving, holding, or moving any payment or crypto for you",
      "Advice about buying, holding, or investing in crypto",
      "Tax advice: your accountant decides how crypto sales are reported",
      "Promoting any coin or token",
    ],
    faq: [
      { q: "Do we have to keep the crypto?", a: "No. Many processors can convert each payment to dollars and pay out to your bank, so the price does not move on you. Keeping any crypto is your choice." },
      { q: "Who holds the money?", a: "Your processor, then your bank. It never passes through The LeadFlow Pro, and we never hold wallet keys." },
      { q: "Which processor should we use?", a: "The one that fits your business. We lay out the options, fees, and requirements side by side, and you choose and sign up directly." },
      { q: "What about taxes?", a: "The bookkeeping map records each crypto sale in dollars, the way your processor reports it, so your accountant has what they need. We don't give tax advice." },
      { q: "Can it go on our website?", a: "Yes. It can sit beside card payments in your checkout, or work as a payment link and QR code at the counter." },
      { q: "What does it cost?", a: `${AGENCY_PLAN_SUMMARY} A payment processor can charge transaction fees; these are disclosed separately from the marketing allocation.` },
    ],
    intakeHref: intake("crypto-checkout"),
    related: [
      { href: "/agency/websites", label: "Websites" },
      { href: "/pricing", label: "90-day campaign and scope" },
    ],
  },
];

/** The six services every local business buys, for pages about the local lead system. */
export const CORE_AGENCY_SERVICES: readonly AgencyService[] = AGENCY_SERVICES.filter((s) => !s.specialty);

/** Services built for one kind of client, shown in their own band on the hub. */
export const SPECIALTY_AGENCY_SERVICES: readonly AgencyService[] = AGENCY_SERVICES.filter((s) => Boolean(s.specialty));

export function agencyService(slug: string): AgencyService | null {
  return AGENCY_SERVICES.find((s) => s.slug === slug) ?? null;
}

export function agencyOffer(service: AgencyService): Offer {
  return offer(service.offerId);
}

export const AGENCY_HUB = {
  eyebrow: "Run it for me",
  title: "The agency lane.",
  lead: `Meta ads, Google Ads, websites, automation, video, and content, run by ${BUSINESS.operator} in accounts you own, plus specialty builds for online communities, CPA firms, XRP Ledger projects, and shops that take crypto. This is the lane for owners who want the whole loop handled.`,
  budgetNote: `${AGENCY_PLAN_SUMMARY} ${managedBillingExplanation()}`,
  contact: {
    phone: BUSINESS.phone.display,
    tel: BUSINESS.phone.tel,
    email: BUSINESS.email.hello,
  },
} as const;
