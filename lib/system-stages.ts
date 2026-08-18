// The eight stages of the connected-company loop, each one a full page.
//
// Ryan, Aug 12 2026: make every stage on the homepage diagram clickable, with a
// real sales page behind it. What we can do at that stage, what it costs to
// keep renting it, proof we have built it, and something interactive.
//
// HONESTY RULES THIS FILE FOLLOWS (Notion 0. START HERE):
//   - No invented numbers. Every figure traces to a live property or the repo.
//   - No competitor pricing is quoted. We cannot verify HubSpot or GoHighLevel
//     pricing from here and a stale number is a fake number. The rent-versus-own
//     argument uses the owner's OWN monthly figure through a calculator, which
//     is both honest and more persuasive than a number they can argue with.
//   - Faretta.legal runs on Wix and is never claimed as our stack.
//
// The `tools` slugs are existing, live tool pages. Nothing here invents a tool.

import { ARTICLES } from "./articles";
import { TOOL_COUNT } from "./tools";

export type StageSlug =
  | "attention"
  | "website"
  | "lead-capture"
  | "crm"
  | "follow-up"
  | "sale"
  | "delivery"
  | "reporting";

export type Stage = {
  slug: StageSlug;
  num: string;
  name: string;
  short: string;
  /** SEO */
  title: string;
  description: string;
  keywords: string[];
  /** Hero */
  h1Quiet: string;
  h1Loud: string;
  lead: string;
  /** The leak */
  problemHeading: string;
  problemBody: string;
  leaks: string[];
  /** What we build */
  buildHeading: string;
  buildLead: string;
  offers: Array<{ name: string; body: string }>;
  /** Rent versus own, where it applies */
  rentOwn?: { heading: string; body: string; rented: string[]; owned: string[] };
  /** Proof, verified only */
  proof: Array<{ name: string; what: string; url?: string }>;
  /** Live tool slugs that belong to this stage */
  tools: string[];
  /** Deep link into the intake router */
  goal: string;
  /** Next stage in the loop */
  next: StageSlug;
};

export const STAGES: Stage[] = [
  {
    slug: "attention",
    num: "01",
    name: "Attention",
    short: "Ads, search, content, referrals",
    title: "Get Attention: Ads, SEO, Content and Referrals | The LeadFlow Pro",
    description:
      "Getting found is stage one of a connected company. Positioning, offers, local SEO, Google Business Profile, ads, content and referral systems, built so the attention lands somewhere that can work it.",
    keywords: [
      "small business marketing",
      "local SEO",
      "google business profile",
      "facebook ads for small business",
      "how to get more customers",
      "content marketing for contractors",
      "east texas marketing",
    ],
    h1Quiet: "Attention is the easy part to buy.",
    h1Loud: "It is the expensive part to waste.",
    lead: "Anyone can spend money to be seen. The question is whether the attention lands on something built to catch it. Stage one is getting found by people who are already looking, and giving them a reason to stop.",
    problemHeading: "Where attention leaks",
    problemBody:
      "Most owners are not short on attention. They are short on attention that goes anywhere. The post gets seen, the ad gets clicked, and then it hits a page that cannot answer a question or capture a name.",
    leaks: [
      "Ad spend pointed at a page that was never built to convert",
      "A Google Business Profile that is unclaimed, thin, or wrong",
      "Ranking for nothing, because nobody wrote the pages that would rank",
      "Referrals with nowhere to send people except a phone number",
      "No idea which channel produced last month's customers",
    ],
    buildHeading: "What we build at stage one",
    buildLead:
      "Positioning first, because the best ad for the wrong offer still loses. Then the channels, then the tracking that tells you which one is worth more money.",
    offers: [
      { name: "Positioning and offer design", body: "What you sell, who it is for, why it beats the alternative, and what it costs. Written before a dollar goes to ads." },
      { name: "Local SEO and Google Business Profile", body: "Claimed, filled out, categorised, and pointed at pages that actually exist. Reviews requested on a system, not on a whim." },
      { name: "Pages built to rank", body: "Service pages, location pages, and answer pages written for the questions your buyers actually type." },
      { name: "Ad campaigns and landing pages", body: "Meta and Google, each pointed at a page built for that specific promise rather than the homepage." },
      { name: "Content and video", body: "Articles, video articles, and posts published on your own domain so the work compounds instead of renting reach." },
      { name: "Referral and review engines", body: "Ask at the right moment, make it one tap, and route the result to the profile that needs it." },
      { name: "First-party attribution", body: "Every visit tagged and stored in your database, so the channel report is yours and not a platform's marketing." },
    ],
    proof: [
      { name: "TheLeadFlowPro.com", what: `${TOOL_COUNT} free tools and ${ARTICLES.length} articles published on owned infrastructure, each one a door in from search`, url: "https://www.theleadflowpro.com/tools" },
      { name: "RealRyanNichols.com", what: "A publishing engine with a searchable archive of 1,568+ case profiles, built when platforms throttled the reach", url: "https://realryannichols.com" },
      { name: "Lone Star Total Wash", what: "A local service business that can now be found, priced, and booked without a phone call", url: "https://www.lonestartotalwash.com" },
    ],
    tools: [
      "seo-traffic-value",
      "google-business-profile-scorecard",
      "ad-budget-planner",
      "roas-calculator",
      "cac-payback-calculator",
      "utm-link-builder",
    ],
    goal: "demand",
    next: "website",
  },
  {
    slug: "website",
    num: "02",
    name: "Website",
    short: "The offer, explained and priced",
    title: "Websites That Sell: The Offer, Explained and Priced | The LeadFlow Pro",
    description:
      "A website is the offer explained and priced, not a brochure. Custom sites built on Next.js and hosted on infrastructure you own, with lead capture, payments and analytics wired in from day one.",
    keywords: [
      "small business website design",
      "custom website vs wix",
      "website that converts",
      "next.js business website",
      "own your website",
      "website redesign for contractors",
      "east texas web design",
    ],
    h1Quiet: "A brochure site describes the business.",
    h1Loud: "This one runs the front of it.",
    lead: "Stage two is the front door: what you sell, who it is for, what it costs, and what to do next. Built so the answer is on the page and the next step is one tap away.",
    problemHeading: "Where the website leaks",
    problemBody:
      "Most sites make the visitor work. No price, no proof, no obvious next step, and a contact form that lands in an inbox nobody checks. The traffic was fine. The page was the problem.",
    leaks: [
      "No pricing anywhere, so the serious buyer leaves to find someone who will say",
      "Proof that is a list of logos instead of finished work you can look at",
      "Slow on a phone, which is where nearly all of the traffic actually is",
      "A form that emails you and does nothing else",
      "A template you rent, on a platform that can change the terms",
    ],
    buildHeading: "What we build at stage two",
    buildLead:
      "The public site and everything behind the buttons on it. Built once, in your accounts, on a stack that does not bill you monthly for the privilege of existing.",
    offers: [
      { name: "Custom website", body: "Your pages, your words, your photos. Designed for the way your buyers actually decide, not a theme someone else picked." },
      { name: "Offer and pricing pages", body: "What it costs, or an honest range and what moves it. The single fastest way to stop wasting calls." },
      { name: "Landing pages and funnels", body: "One promise, one action, built per campaign so the ad and the page say the same thing." },
      { name: "Proof and case studies", body: "Real screenshots and finished work, presented so somebody can check it themselves." },
      { name: "Speed and mobile", body: "Fast on a phone on a bad connection. Optimised images, no layout jumping, no render-blocking junk." },
      { name: "Interactive tools and calculators", body: "The kind on this site. They earn search traffic, they answer a real question, and they capture a name while doing it." },
      { name: "Accessibility and SEO foundations", body: "Semantic structure, real alt text, metadata, schema, canonical URLs, sitemap. The parts that decide whether any of it gets found." },
    ],
    rentOwn: {
      heading: "Rent the platform, or own the site",
      body: "Wix, Squarespace, Shopify and WordPress hosts all bill monthly, forever, and the bill goes up. A built site is paid once and then runs on hosting that is free to cheap. If you would rather stay on one of those platforms, that is a real option and Ryan will work on it. He would rather get you all the way to owning it.",
      rented: [
        "A monthly bill that never ends and rises on their schedule",
        "A template thousands of other businesses are also using",
        "Your data on their servers, exportable on their terms",
        "Features gated behind the next tier up",
        "A platform that can change the rules with an email",
      ],
      owned: [
        "Paid once, then hosting that is usually free to about $25 a month",
        "Built for your business, not adapted from a theme",
        "Code in your GitHub, data in your Supabase, domain in your registrar",
        "Every feature is just something we build",
        "Nobody can change the terms on you",
      ],
    },
    proof: [
      { name: "Premier Dental Academy", what: "A school that runs its own enrollment: applications, payment plans, tuition planner and training simulators", url: "https://www.premierdentalacademyoflongview.com" },
      { name: "Lone Star Total Wash", what: "Free quote intake, a public price list, and a finished-work gallery on a mobile-first build", url: "https://www.lonestartotalwash.com" },
      { name: "Don and Patti", what: "Sponsorship checkout, a 509-photo archive across five countries, and a public Open Book ledger", url: "https://www.donandpatti.com" },
    ],
    tools: [
      "website-grader",
      "website-speed-money",
      "mobile-traffic-loss",
      "conversion-lift-calculator",
      "form-friction-calculator",
      "rent-receipt",
    ],
    goal: "demand",
    next: "lead-capture",
  },
  {
    slug: "lead-capture",
    num: "03",
    name: "Lead capture",
    short: "Forms, calls, texts, chat, DMs",
    title: "Lead Capture: Forms, Calls, Texts, Chat and DMs | The LeadFlow Pro",
    description:
      "No missed calls, no missed texts, no missed revenue. Forms, call tracking, instant text-back, chat and DM capture, all landing in one database you own.",
    keywords: [
      "missed call text back",
      "lead capture for small business",
      "never miss a call",
      "business texting service",
      "openphone alternative",
      "contact form to crm",
      "speed to lead",
    ],
    h1Quiet: "Every missed call is a customer",
    h1Loud: "who just called somebody else.",
    lead: "Stage three catches everything that comes in, from every direction, and puts it in one place. Forms, phone calls, texts, chat, and the DMs you keep meaning to answer.",
    problemHeading: "Where the lead leaks",
    problemBody:
      "The hardest money you will ever spend is the money that got somebody to reach out. Stage three is where most of it disappears, quietly, in a voicemail box nobody checks and a DM folder nobody opens.",
    leaks: [
      "Calls that ring out while you are on a ladder, under a truck, or with a customer",
      "A voicemail box that fills up and stops taking messages",
      "Form submissions in an inbox, mixed with newsletters",
      "DMs on four platforms with four different logins",
      "No record of who called, when, or whether anybody called them back",
    ],
    buildHeading: "What we build at stage three",
    buildLead:
      "Every channel a customer might use, wired to the same database, with an instant response so nobody sits waiting.",
    offers: [
      { name: "Forms that write to your database", body: "Not an email notification. A real record with source, consent, and a timestamp, ready to be worked." },
      { name: "Business phone and texting", body: "A real business line with shared inbox, contacts, and history. We install and configure Quo (OpenPhone), which is what this site runs on, so calls and texts land with the rest of the system." },
      { name: "Other calling and texting options", body: "Quo is what Ryan uses and recommends, but it is not the only way. If you already run Twilio, RingCentral, Grasshopper, Dialpad, or a carrier line you are happy with, we connect to that instead. If you would rather not add a phone tool at all, forms and email still work." },
      { name: "Missed call text-back", body: "The call goes unanswered and they get a text within seconds. This is the single highest-return thing most local businesses can turn on." },
      { name: "After-hours capture", body: "Most people shop when you are closed. The system answers, captures, and queues them for the morning." },
      { name: "Chat and DM capture", body: "Website chat and social DMs routed into the same record instead of four separate apps." },
      { name: "Consent and compliance", body: "SMS and email consent captured at the point of collection, with the timestamp stored, because that is what makes the follow-up legal." },
    ],
    proof: [
      { name: "TheLeadFlowPro.com", what: "Every lead lands in our own CRM with the full guided diagnostic attached, plus an instant email and text", url: "https://www.theleadflowpro.com/start" },
      { name: "Lone Star Total Wash", what: "Free quote request that reaches the owner instantly, plus click to call", url: "https://www.lonestartotalwash.com" },
      { name: "Premier Dental Academy", what: "Every inquiry captured and every student record in a database the school owns", url: "https://www.premierdentalacademyoflongview.com" },
    ],
    tools: [
      "missed-call-calculator",
      "after-hours-lead-calculator",
      "lead-response-time",
      "form-friction-calculator",
      "missed-call-textback-script",
      "click-to-call-button",
    ],
    goal: "follow_up",
    next: "crm",
  },
  {
    slug: "crm",
    num: "04",
    name: "CRM",
    short: "One record per person, scored",
    title: "A CRM You Own: Built Once, Not Rented Monthly | The LeadFlow Pro",
    description:
      "One record per person, with source, stage, notes, tasks and the whole conversation. Built into your own admin portal and member dashboard instead of rented per seat, per month, forever.",
    keywords: [
      "crm for small business",
      "hubspot alternative",
      "gohighlevel alternative",
      "custom crm build",
      "own your customer data",
      "admin dashboard for small business",
      "client portal software",
    ],
    h1Quiet: "A rented CRM bills you every month, forever.",
    h1Loud: "A built one is yours after the first.",
    lead: "Stage four is the record. One row per human, with where they came from, what they asked for, what stage they are at, what was said, and what happens next. In a database with your name on it.",
    problemHeading: "Where the customer record leaks",
    problemBody:
      "Most businesses have their customers in four places: a phone's contacts, an inbox, a spreadsheet, and somebody's memory. The moment one person leaves or one laptop dies, part of the business goes with it.",
    leaks: [
      "Customers split across a phone, an inbox, and a spreadsheet",
      "No source on anyone, so no idea what marketing is working",
      "Per-seat pricing that punishes you for adding your own team",
      "Paying monthly for ninety features to use four",
      "Export restrictions that make leaving expensive on purpose",
    ],
    buildHeading: "What we build at stage four",
    buildLead:
      "The back office you saw in the screenshots, built for how your business actually works. The exact system running this site and the one running Premier Dental Academy.",
    offers: [
      { name: "Admin back office", body: "The pipeline, every lead, filters, search, CSV export, and a workspace per person. Yours, on your domain." },
      { name: "Per-lead workspace", body: "Intake, source and attribution, stage, owner, notes, tasks, activity timeline, and the full two-way conversation on one screen." },
      { name: "Member and client dashboard", body: "A login area for customers, students, members or partners. Projects, progress, documents, messages, whatever the relationship needs." },
      { name: "Lead scoring and routing", body: "Score on the signals that actually predict a sale for you, and route the serious ones to the front." },
      { name: "Roles and permissions", body: "Admins see everything, clients see only their own record, staff see what their job needs. Enforced in the database, not just the interface." },
      { name: "Import and migration", body: "Bring what you have out of the spreadsheet, the old CRM, or the phone, cleaned and de-duplicated." },
      { name: "AI-ready connectors", body: "Structured so you can point ChatGPT or Claude at your own business data and ask it real questions." },
    ],
    rentOwn: {
      heading: "Run the numbers on your own CRM bill",
      body: "We are not going to quote you a competitor's price, because those change and a stale number is a made-up number. Use your own: take what you pay per seat per month, multiply it by your seats, and by the number of months you plan to stay in business. Compare that to a build you pay for once and then own. The calculators below do the arithmetic on your real figures.",
      rented: [
        "Billed per seat, so growing the team raises the bill",
        "Billed every month for as long as the business exists",
        "Priced in tiers, so one feature you need can move you up a bracket",
        "Your customer list lives on their servers",
        "The workflow bends to their software",
      ],
      owned: [
        "Paid once for the build, then hosting measured in single-digit dollars",
        "Unlimited seats, because there is nobody to charge you for them",
        "Every feature is just something we build when you need it",
        "Your customer list is a table in a database you control",
        "The software bends to your workflow",
      ],
    },
    proof: [
      { name: "TheLeadFlowPro.com", what: "This site's own back office: pipeline, per-lead workspace, notes, tasks, activity, two-way messaging, CSV export", url: "https://www.theleadflowpro.com" },
      { name: "Premier Dental Academy", what: "Student records, applications and payment plans in a database the school owns", url: "https://www.premierdentalacademyoflongview.com" },
      { name: "RealRyanNichols.com", what: "A searchable archive of 1,568+ case profiles. Proof this stack handles a real database, not a contact list", url: "https://realryannichols.com" },
    ],
    tools: [
      "per-seat-cost-calculator",
      "rent-receipt",
      "admin-time-audit",
      "lead-value-calculator",
      "customer-lifetime-value",
      "task-automation-savings",
    ],
    goal: "replace_tools",
    next: "follow-up",
  },
  {
    slug: "follow-up",
    num: "05",
    name: "Follow-up",
    short: "Text, email, call, booking",
    title: "Follow-Up That Runs Itself: Text, Email, Call, Booking | The LeadFlow Pro",
    description:
      "The money is in the follow-up. Thirty day email sequences, instant text-back, call reminders and booking, running whether you are free or not, through Resend or whatever email platform you already pay for.",
    keywords: [
      "automated follow up",
      "email drip campaign small business",
      "lead nurture sequence",
      "appointment reminder system",
      "quote follow up",
      "resend email automation",
      "follow up sequence template",
    ],
    h1Quiet: "The post gets attention.",
    h1Loud: "The system makes money.",
    lead: "Stage five is what happens between the first hello and the sale. Most businesses do it once, by hand, when they remember. This does it every time, on schedule, without you.",
    problemHeading: "Where the follow-up leaks",
    problemBody:
      "Almost nobody buys on the first touch, and almost nobody follows up more than once. That gap is the cheapest money in the whole business, and it is sitting there untouched in most companies.",
    leaks: [
      "One follow-up, then nothing, on every quote you send",
      "Reminders that depend on somebody remembering",
      "No-shows because nothing confirmed the appointment",
      "Leads that go cold in the days it takes to reply",
      "A list you have been building for years that has never been emailed",
    ],
    buildHeading: "What we build at stage five",
    buildLead:
      "Sequences that run on their own, on every channel the customer agreed to, and stop the moment they reply or buy.",
    offers: [
      { name: "Thirty day email sequences", body: "A real sequence, not one thank-you email. Written for your offer, timed to how your buyers actually decide, and it stops when they respond." },
      { name: "Your email platform or ours", body: "We build on Resend by default because it is fast, cheap and owned. If you already pay for Mailchimp, Kajabi, Klaviyo, ConvertKit, ActiveCampaign, or the email built into Wix or Shopify, we will work with that instead. Ryan would rather get you to a list you own outright, but he is not going to force a migration to make a point." },
      { name: "Instant text-back and SMS sequences", body: "Seconds, not hours. Consent-gated, with opt-out handled properly." },
      { name: "Quote and proposal follow-up", body: "The sequence that runs after a number goes out, which is where most businesses simply stop." },
      { name: "Booking and reminders", body: "Calendar booking, confirmations, and reminders that cut no-shows." },
      { name: "Reactivation campaigns", body: "The list you already have, worked properly. Usually the fastest revenue in the building." },
      { name: "Review requests", body: "Asked at the right moment, one tap, routed to the profile that needs it most." },
    ],
    proof: [
      { name: "TheLeadFlowPro.com", what: "Instant owner alert, customer auto-reply and text on every lead, plus a scheduled follow-up sequence", url: "https://www.theleadflowpro.com" },
      { name: "Premier Dental Academy", what: "Enrollment follow-up wired to applications and payment plans", url: "https://www.premierdentalacademyoflongview.com" },
    ],
    tools: [
      "lead-response-time",
      "quote-follow-up-calculator",
      "no-show-calculator",
      "close-rate-calculator",
      "review-request-script",
      "voicemail-script-generator",
    ],
    goal: "follow_up",
    next: "sale",
  },
  {
    slug: "sale",
    num: "06",
    name: "Sale",
    short: "Quote, contract, payment",
    title: "Take the Sale: Quotes, Contracts, Payments and Plans | The LeadFlow Pro",
    description:
      "Quotes, contracts, deposits, payment plans and buy now pay later, taken on your own site. Card, ACH, Klarna, Afterpay and Affirm where Stripe offers them.",
    keywords: [
      "accept payments on my website",
      "payment plans for customers",
      "buy now pay later for small business",
      "online quote and contract",
      "stripe checkout small business",
      "take deposits online",
      "invoice and payment system",
    ],
    h1Quiet: "If they have to call you to buy,",
    h1Loud: "some of them just will not.",
    lead: "Stage six is the money. Quote, agreement, deposit, plan, paid. On your own site, at the moment they decided, instead of three days later after phone tag.",
    problemHeading: "Where the sale leaks",
    problemBody:
      "The buyer is ready and the business is not. No way to pay, no way to sign, no way to put money down. Every extra step between decided and paid is a place people fall out.",
    leaks: [
      "No way to pay on the site, so the sale waits on a phone call",
      "No deposit option, so work starts on a promise",
      "No payment plan, so the bigger job never gets sold",
      "Quotes and contracts living in email attachments",
      "Card fees nobody has actually worked out",
    ],
    buildHeading: "What we build at stage six",
    buildLead:
      "Everything between yes and paid, on your site, in your Stripe account, credited to your business.",
    offers: [
      { name: "Checkout on your own site", body: "One-click buying for fixed-price products and services, in your own Stripe account." },
      { name: "Deposits and down payments", body: "A customer-chosen amount with sensible floors and ceilings, credited in full toward the job. Exactly what runs on this site's own deposit page." },
      { name: "Payment plans", body: "Split the job into scheduled payments so the bigger scope becomes affordable and closes." },
      { name: "Buy now pay later", body: "Klarna, Afterpay and Affirm appear at checkout wherever Stripe supports them for your account and country." },
      { name: "Quotes and estimates", body: "Sent from the system, tracked, and followed up automatically if they go quiet." },
      { name: "Contracts and terms", body: "Agreement, scope and terms attached to the sale rather than to somebody's inbox." },
      { name: "Invoicing and recurring billing", body: "One-off invoices, retainers, memberships and subscriptions where the model calls for it." },
      { name: "Fee awareness", body: "We work out what card processing, platform fees and plans actually cost you before you price the offer, not after." },
    ],
    proof: [
      { name: "Premier Dental Academy", what: "Enrollment with payment plans and buy now pay later, plus an interactive tuition planner", url: "https://www.premierdentalacademyoflongview.com" },
      { name: "TheLeadFlowPro.com", what: "Package checkout, customer-chosen down payments clamped server-side, and a live deposit page", url: "https://www.theleadflowpro.com/deposit" },
      { name: "Don and Patti", what: "Sponsorship checkout with recurring giving and live funding progress", url: "https://www.donandpatti.com" },
    ],
    tools: [
      "payment-plan-calculator",
      "credit-card-fee-calculator",
      "job-price-calculator",
      "close-rate-calculator",
      "estimate-terms-generator",
      "late-payment-language",
    ],
    goal: "replace_tools",
    next: "delivery",
  },
  {
    slug: "delivery",
    num: "07",
    name: "Delivery",
    short: "Portal, onboarding, the work",
    title: "Delivery: Portals, Onboarding and Doing the Work | The LeadFlow Pro",
    description:
      "Where the work actually gets delivered. Customer and member portals, onboarding, courses, document handoff and team workflows, in person, on Zoom, or entirely online.",
    keywords: [
      "client portal for small business",
      "customer onboarding system",
      "membership site build",
      "online course platform alternative",
      "kajabi alternative",
      "student portal",
      "team workflow software",
    ],
    h1Quiet: "The sale is a promise.",
    h1Loud: "Delivery is whether you keep it.",
    lead: "Stage seven is the work itself and the place it happens. A login area, an onboarding path, the documents, the training, and the visibility that stops customers asking where things stand.",
    problemHeading: "Where delivery leaks",
    problemBody:
      "The sale closes and everything goes quiet. Files by email, updates by text, progress in somebody's head. Customers get anxious, and anxious customers cost more to serve and refer fewer people.",
    leaks: [
      "Onboarding that is different every time because it lives in memory",
      "Files scattered across email, Drive and text threads",
      "Customers with no way to see where their job stands",
      "Training and materials rented from a platform that bills monthly",
      "Team handoffs that depend on one person being reachable",
    ],
    buildHeading: "What we build at stage seven",
    buildLead:
      "The place the relationship lives after the money moves. However you actually deliver, in person, over Zoom, or entirely in the browser.",
    offers: [
      { name: "Customer and client portals", body: "A login area showing their project, their progress, their documents and their messages." },
      { name: "Member and student areas", body: "Gated content, progress tracking, certificates, and the training itself, on your domain rather than rented from a course platform." },
      { name: "Courses and archives", body: "Lessons, video, searchable libraries and public or private records. Built once instead of paying a platform every month." },
      { name: "Onboarding flows", body: "The same first week for every customer, automated, so nothing depends on who is on shift." },
      { name: "Document handoff", body: "Contracts, deliverables and files where the customer can always find them." },
      { name: "Team workflows and permissions", body: "Who does what, in what order, and who can see it. Enforced in the database." },
      { name: "In person, Zoom, or self-serve", body: "The system supports how you actually work: on site, on a call, or entirely asynchronous. Scheduling, reminders and notes land in the same record either way." },
      { name: "Practical automation and AI agents", body: "The repeated steps handled automatically, with a human in the loop wherever a human should be." },
    ],
    proof: [
      { name: "Premier Dental Academy", what: "Student intake, training simulators, career tools and an employer directory in one portal", url: "https://www.premierdentalacademyoflongview.com" },
      { name: "Don and Patti", what: "A Mission Partners hub, a 509-photo archive across five countries, and a public Open Book ledger", url: "https://www.donandpatti.com" },
      { name: "TheLeadFlowPro.com", what: "Client dashboards with projects, training progress and messaging", url: "https://www.theleadflowpro.com" },
    ],
    tools: [
      "task-automation-savings",
      "meeting-cost-calculator",
      "drive-time-cost",
      "admin-time-audit",
      "cancellation-policy-generator",
      "add-to-calendar-link",
    ],
    goal: "delivery",
    next: "reporting",
  },
  {
    slug: "reporting",
    num: "08",
    name: "Reporting",
    short: "What produced revenue",
    title: "Reporting: What Produced Revenue and What Did Not | The LeadFlow Pro",
    description:
      "First-party analytics and attribution in your own database. Which channel produced customers, which spend was wasted, and what the next decision should be.",
    keywords: [
      "marketing attribution small business",
      "first party analytics",
      "which ads are working",
      "cost per lead tracking",
      "roi reporting for small business",
      "google analytics alternative",
      "utm tracking",
    ],
    h1Quiet: "Most owners can tell you what they spent.",
    h1Loud: "Far fewer can tell you what it bought.",
    lead: "Stage eight closes the loop. Every visit, lead and sale tagged with where it came from, stored in your database, so the next round of attention is bought on evidence instead of a hunch.",
    problemHeading: "Where the truth leaks",
    problemBody:
      "Ad platforms grade their own homework. Each one claims the same customer, the totals do not reconcile, and the honest answer to which channel is working is usually a shrug and a gut feeling.",
    leaks: [
      "Every platform claiming credit for the same sale",
      "No first-party record, so the only numbers you have are theirs",
      "Spend that keeps running because nobody proved it does not work",
      "No cost per lead or cost per customer by channel",
      "Reports that show traffic instead of revenue",
    ],
    buildHeading: "What we build at stage eight",
    buildLead:
      "The measurement layer, first-party, stored with the customer record so the report is about revenue rather than pageviews.",
    offers: [
      { name: "First-party analytics", body: "Visits logged to your own database. Not a third party's dashboard, and not subject to their retention limits." },
      { name: "Source attribution on every lead", body: "UTM source, medium and campaign captured at the moment of the lead and carried through to the sale." },
      { name: "Owner dashboard", body: "The handful of numbers that actually change a decision, on one screen, in plain language." },
      { name: "Channel reporting", body: "What each channel cost, what it produced, and what it costs you to acquire a customer through it." },
      { name: "Pipeline and conversion reporting", body: "Where people stall between stages, which is where the next fix usually is." },
      { name: "Ad platform connections", body: "Meta and Google conversion events fired from real outcomes, so the platforms optimise on truth." },
      { name: "Scheduled digests", body: "A weekly summary that arrives without you logging in, because a report nobody opens is not a report." },
    ],
    proof: [
      { name: "TheLeadFlowPro.com", what: "Every visit logged to our own database with source, and every lead credited to the campaign that produced it", url: "https://www.theleadflowpro.com" },
      { name: "RealRyanNichols.com", what: "A searchable archive of 1,568+ case profiles on owned infrastructure. The same source discipline supports the publishing system", url: "https://realryannichols.com" },
    ],
    tools: [
      "utm-link-builder",
      "roas-calculator",
      "cost-per-lead-calculator",
      "cac-payback-calculator",
      "customer-lifetime-value",
      "lead-value-calculator",
    ],
    goal: "custom",
    next: "attention",
  },
];

export const STAGE_SLUGS = STAGES.map((s) => s.slug);

export function getStage(slug: string): Stage | undefined {
  return STAGES.find((s) => s.slug === slug);
}
