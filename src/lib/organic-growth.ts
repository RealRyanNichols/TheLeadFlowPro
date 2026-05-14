export type OrganicLandingPage = {
  slug: string;
  eyebrow: string;
  title: string;
  metaTitle: string;
  description: string;
  audience: string;
  location: string;
  pain: string;
  promise: string;
  primaryCta: string;
  secondaryCta: string;
  industry: string;
  searchIntent: string[];
  symptoms: string[];
  fixes: string[];
  assets: string[];
  proofAngle: string;
  outboundHook: string;
};

export const ORGANIC_LANDING_PAGES: OrganicLandingPage[] = [
  {
    slug: "missed-call-follow-up-system",
    eyebrow: "Missed-call recovery",
    title: "Stop losing buyers after the phone rings.",
    metaTitle: "Missed Call Follow-Up System | The LeadFlow Pro",
    description:
      "A practical missed-call and follow-up system for owner-led businesses that need calls, texts, forms, and appointments tracked in one place.",
    audience: "service businesses, appointment shops, clinics, studios, and local operators",
    location: "Texas and owner-led businesses nationwide",
    pain: "People call, nobody answers fast enough, and the buyer moves to the next option.",
    promise:
      "The LeadFlow Pro builds the reply path, status board, owner alerts, and next-step follow-up so every missed call becomes a visible sales task.",
    primaryCta: "Run my lead leak audit",
    secondaryCta: "See the ad autopsy",
    industry: "Local services",
    searchIntent: [
      "missed call text back system",
      "local business lead follow up",
      "missed call automation for small business",
    ],
    symptoms: [
      "Calls hit the phone but do not become tracked leads.",
      "Staff replies from personal phones and the owner cannot see what happened.",
      "Hot buyers get one callback, then disappear into memory.",
    ],
    fixes: [
      "Missed-call text-back wording that protects speed-to-lead.",
      "A lead status board for new, contacted, booked, won, and lost.",
      "Follow-up reminders so leads get more than one touch.",
      "Source notes that show whether the lead came from Google, Facebook, referral, or a page.",
    ],
    assets: [
      "Missed-call reply script",
      "Lead status dashboard",
      "Follow-up sequence",
      "Owner daily lead recap",
    ],
    proofAngle: "Every owner understands a phone call. Show the lost-call count and the system becomes obvious.",
    outboundHook:
      "I checked your phone path and website. You may be losing buyers after the first call. I can send a short lead leak readout.",
  },
  {
    slug: "local-business-lead-follow-up",
    eyebrow: "Local lead follow-up",
    title: "Local leads are expensive. The follow-up cannot be random.",
    metaTitle: "Local Business Lead Follow-Up | The LeadFlow Pro",
    description:
      "Lead follow-up systems for local businesses that need forms, calls, DMs, texts, calendar links, and sales status cleaned up fast.",
    audience: "local business owners who get leads from Google, Facebook, referrals, signs, and word of mouth",
    location: "Longview, East Texas, and practical local businesses anywhere",
    pain: "The business gets attention, but there is no single view of who came in, who replied, who booked, and who needs another touch.",
    promise:
      "Ryan turns scattered lead activity into a plain-English system: capture, source, status, follow-up, and next move.",
    primaryCta: "Check my lead follow-up",
    secondaryCta: "Open organic plan",
    industry: "Local business",
    searchIntent: [
      "local business lead follow up",
      "small business lead management",
      "lead follow up system for local business",
    ],
    symptoms: [
      "Leads come through different places and nobody knows which source worked.",
      "The owner asks for updates by text because there is no shared board.",
      "No one knows which leads are hot, cold, won, lost, or still waiting.",
    ],
    fixes: [
      "One intake path that collects name, phone, email, source, and problem.",
      "A simple lead board with next actions.",
      "Owner-visible follow-up deadlines.",
      "A weekly leak report showing what moved and what stalled.",
    ],
    assets: [
      "Lead capture form",
      "Owner lead board",
      "Follow-up tasks",
      "Weekly report format",
    ],
    proofAngle: "Make the mess visible. Once the owner sees the leak, the fix sells itself.",
    outboundHook:
      "I am building quick lead leak reports for local businesses. Your site has traffic paths, but the follow-up path looks unclear.",
  },
  {
    slug: "contractor-lead-follow-up",
    eyebrow: "Contractor funnel",
    title: "Contractor leads need speed, price context, and proof.",
    metaTitle: "Contractor Lead Follow-Up System | The LeadFlow Pro",
    description:
      "A contractor lead follow-up page and tracking system for quotes, callbacks, photos, job type, urgency, and booked estimates.",
    audience: "contractors, cleaners, repair shops, roofers, remodelers, HVAC, plumbing, and home-service operators",
    location: "Texas service areas and regional contractor markets",
    pain: "The buyer wants a fast quote, but the business makes them wait, repeat details, or chase the office.",
    promise:
      "Build a quote-intake path that captures the job, urgency, photos, location, budget signal, and next action before the lead cools off.",
    primaryCta: "Audit my quote path",
    secondaryCta: "Book 10 minutes",
    industry: "Contractors",
    searchIntent: [
      "contractor lead follow up",
      "contractor quote form",
      "home service lead tracking",
    ],
    symptoms: [
      "Quote requests arrive without enough detail to act.",
      "Photos and addresses are spread across texts, DMs, and calls.",
      "No one can tell which jobs are urgent or worth prioritizing.",
    ],
    fixes: [
      "Quote form that asks the right questions before the callback.",
      "Photo and link capture where appropriate.",
      "Lead quality labels for urgent, estimate-ready, needs info, and not fit.",
      "Follow-up scripts for no-answer and estimate reminders.",
    ],
    assets: [
      "Quote intake page",
      "Estimate status board",
      "No-answer text sequence",
      "Before/after proof page",
    ],
    proofAngle: "Contractors do not need more vague marketing. They need better quote flow.",
    outboundHook:
      "Your service looks real, but your quote path could be tighter. I can show where buyers may be dropping before estimate.",
  },
  {
    slug: "dental-school-lead-system",
    eyebrow: "Education and dental training",
    title: "Turn interested students into booked conversations.",
    metaTitle: "Dental School Lead System | The LeadFlow Pro",
    description:
      "Lead capture, follow-up, and proof pages for dental academies, trade schools, training programs, and education offers.",
    audience: "dental academies, trade schools, certification programs, training businesses, and education brands",
    location: "Texas and regional training markets",
    pain: "People ask about programs, price, start dates, and financing, but the follow-up path is not tight enough to protect enrollment intent.",
    promise:
      "Create a student-intake path that explains the offer, captures intent, answers common objections, and routes serious students to the next step.",
    primaryCta: "Audit my enrollment funnel",
    secondaryCta: "See proof page",
    industry: "Education",
    searchIntent: [
      "dental academy lead generation",
      "trade school enrollment funnel",
      "student lead follow up system",
    ],
    symptoms: [
      "Students ask the same questions in DMs and comments.",
      "The site does not make the next class, cost, and booking path obvious.",
      "Interest spikes after content but enrollment follow-up is manual.",
    ],
    fixes: [
      "Program page with proof, class details, FAQs, and one next step.",
      "Student inquiry form with phone, email, start timeline, and concern.",
      "Follow-up scripts for cost, schedule, and confidence objections.",
      "Owner dashboard for new, contacted, booked, enrolled, and no-show.",
    ],
    assets: [
      "Enrollment page",
      "Student inquiry form",
      "FAQ script bank",
      "Follow-up status board",
    ],
    proofAngle: "Education buyers need clarity, confidence, and fast answers before they choose another program.",
    outboundHook:
      "Your program can probably get more out of the interest it already creates. I can show where the student funnel leaks.",
  },
  {
    slug: "east-texas-business-growth",
    eyebrow: "East Texas growth system",
    title: "East Texas businesses need sharper lead systems, not louder noise.",
    metaTitle: "East Texas Business Growth | The LeadFlow Pro",
    description:
      "Organic lead capture and follow-up systems for Longview, Gregg County, Harrison County, and East Texas businesses.",
    audience: "East Texas business owners who need leads, calls, booking, and follow-up organized",
    location: "Longview, Gregg County, Harrison County, and East Texas",
    pain: "Local businesses compete on attention, but most of the money is lost after the click, call, DM, or referral.",
    promise:
      "Build the practical system behind the marketing: landing page, intake, missed-call recovery, follow-up, proof, and owner visibility.",
    primaryCta: "Run my East Texas audit",
    secondaryCta: "Open local playbook",
    industry: "East Texas business",
    searchIntent: [
      "Longview Texas marketing help",
      "East Texas lead generation",
      "Gregg County business growth",
    ],
    symptoms: [
      "The website says what the business does but does not capture serious buyers.",
      "Google, Facebook, and referrals are not tied to a single follow-up process.",
      "The owner cannot see which local traffic sources are actually producing conversations.",
    ],
    fixes: [
      "Local landing page tied to one service and one CTA.",
      "Google Business Profile and citation consistency checklist.",
      "Lead leak audit for forms, calls, DMs, and follow-up.",
      "Proof page with before/after work and local trust signals.",
    ],
    assets: [
      "Local service page",
      "Google Business checklist",
      "Lead leak report",
      "Proof and review prompt",
    ],
    proofAngle: "Local SEO works better when the page, business profile, proof, and follow-up all say the same thing.",
    outboundHook:
      "I am doing East Texas lead leak checks. Your business may already be getting attention, but the capture path can be stronger.",
  },
  {
    slug: "meta-ads-follow-up-tracking",
    eyebrow: "Meta ads and follow-up",
    title: "Do not scale Meta ads until the lead trail is visible.",
    metaTitle: "Meta Ads Follow-Up Tracking | The LeadFlow Pro",
    description:
      "A Meta ads follow-up and tracking system that connects spend, clicks, leads, booked calls, sales, and owner-visible reporting.",
    audience: "businesses spending money on Facebook or Instagram ads",
    location: "Owner-led businesses running Meta ads",
    pain: "The ad account shows clicks, but the business cannot clearly prove which clicks became leads, bookings, sales, or dead ends.",
    promise:
      "Connect the money trail from campaign to page, lead, follow-up, booked call, sale status, and next fix.",
    primaryCta: "Run the ad autopsy",
    secondaryCta: "Audit my funnel",
    industry: "Paid ads",
    searchIntent: [
      "facebook ad tracking for leads",
      "meta ads follow up system",
      "ad account audit for small business",
    ],
    symptoms: [
      "Ad spend rises but the owner cannot explain what happened after the click.",
      "Forms, calls, and DMs are not tied back to campaigns.",
      "Slow response makes good leads look like bad traffic.",
    ],
    fixes: [
      "Ad account autopsy using spend, clicks, leads, booked calls, and sales.",
      "Landing page and form review before scaling spend.",
      "Lead source trail inside the owner view.",
      "Follow-up sequence for new lead, no answer, booked, and not ready.",
    ],
    assets: [
      "Ad autopsy report",
      "Campaign-to-lead source trail",
      "Landing-page fixes",
      "Owner reporting board",
    ],
    proofAngle: "Ads are not the product. The system after the click is where most businesses leak money.",
    outboundHook:
      "If you are running Facebook ads, I can show whether the leak is traffic, landing page, follow-up, or sales handoff.",
  },
  {
    slug: "website-lead-capture-funnel",
    eyebrow: "Website conversion",
    title: "A pretty website does not matter if nobody leaves their information.",
    metaTitle: "Website Lead Capture Funnel | The LeadFlow Pro",
    description:
      "Website lead-capture funnel buildout for businesses that need one clear CTA, stronger proof, intake, booking, and follow-up.",
    audience: "businesses with a website that looks fine but does not produce enough leads",
    location: "Local and owner-led businesses",
    pain: "The site describes the business but does not push the visitor into a clear next action.",
    promise:
      "Rebuild the page around one offer, one buyer problem, one intake path, one booking path, and one follow-up system.",
    primaryCta: "Check my website leak",
    secondaryCta: "See organic plan",
    industry: "Website conversion",
    searchIntent: [
      "website not converting leads",
      "lead capture landing page",
      "small business website funnel",
    ],
    symptoms: [
      "The homepage has too many choices and no obvious money path.",
      "The CTA is generic: contact us, learn more, or get started.",
      "There is no proof section tied to the buyer's real objection.",
    ],
    fixes: [
      "One hero promise tied to the buyer's pain.",
      "Lead leak audit CTA above the fold.",
      "Proof blocks that show work, before/after, and next steps.",
      "Form submission routed to admin follow-up and visitor memory.",
    ],
    assets: [
      "Conversion homepage",
      "Lead capture form",
      "Proof page",
      "Follow-up route",
    ],
    proofAngle: "The first job of a business website is not to impress. It is to turn attention into a trackable next step.",
    outboundHook:
      "Your website has enough information to explain the business, but the lead-capture path can be made sharper.",
  },
];

export const LEAD_LEAK_CHECKS = [
  {
    title: "Traffic source",
    body: "Can the owner tell whether the lead came from Google, Facebook, referral, a landing page, or a DM?",
  },
  {
    title: "First response",
    body: "Does a new call, form, or DM get a fast first touch, or does it wait until someone remembers?",
  },
  {
    title: "Lead status",
    body: "Can the team see new, contacted, booked, won, lost, and no-answer without hunting through phones?",
  },
  {
    title: "Proof path",
    body: "Does the page show enough proof for a cold buyer to trust the next click?",
  },
  {
    title: "Follow-up",
    body: "Does every serious lead get more than one touch before being treated as dead?",
  },
  {
    title: "Owner view",
    body: "Can the owner see what is working this week without asking three people for updates?",
  },
];

export const ORGANIC_DISTRIBUTION_PLAYS = [
  {
    channel: "Cold lead leak checks",
    cadence: "20 businesses per day",
    action:
      "Find businesses with obvious lead leaks, run a quick review, and send a short custom note pointing to the audit page.",
  },
  {
    channel: "Local search pages",
    cadence: "2-3 pages per week",
    action:
      "Publish specific pages for Longview, East Texas, missed calls, contractor follow-up, dental academy enrollment, and ad tracking.",
  },
  {
    channel: "Proof posts",
    cadence: "3 posts per week",
    action:
      "Show before/after screenshots, audit findings, dashboard examples, and exact fixes without exposing private client data.",
  },
  {
    channel: "Tool-led sharing",
    cadence: "Every audit and autopsy",
    action:
      "Use the SEO grader, ad autopsy, and lead leak audit as shareable reasons for owners to forward the site.",
  },
  {
    channel: "Local authority",
    cadence: "One setup pass, then weekly maintenance",
    action:
      "Keep Google Business Profile, social bios, YouTube descriptions, directory citations, and client links pointed at the same core offer.",
  },
];

export const PROOF_ASSETS = [
  {
    label: "Premier Dental Academy style makeover",
    title: "Turn a service or school into a proof-forward business page.",
    body:
      "The site already has visual evidence of business page work. This needs to be presented as a before/after style proof asset, not hidden in the background.",
  },
  {
    label: "LeadFlow Pro Pulse",
    title: "Show the tracking system as its own proof.",
    body:
      "The public Pulse and admin Pulse prove Ryan is not just selling dashboards. The site itself is instrumented around visitors, clicks, sources, shares, and next moves.",
  },
  {
    label: "Ad Account Autopsy",
    title: "Make the money leak visible before asking for trust.",
    body:
      "The autopsy tool gives cold visitors a concrete read on spend, clicks, leads, booked calls, sales, reply speed, and source tracking.",
  },
  {
    label: "Offer router and intake",
    title: "Reduce the price maze and route buyers to one action.",
    body:
      "The /start router and new audit funnel collect enough context to avoid sending serious buyers through a wall of generic packages.",
  },
];

export function getOrganicLandingPage(slug: string) {
  return ORGANIC_LANDING_PAGES.find((page) => page.slug === slug) ?? null;
}
