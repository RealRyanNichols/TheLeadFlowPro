// The contractor owner series: everyone who applies through the Scott video
// ad (Meta form 1410074817946865) for dirt work, land clearing and pond
// businesses.
//
// CADENCE (Ryan, 2026-10-02). Day 0 goes out the second the form is
// submitted (lib/leadNotify.ts, funnel contractor_owner). After that:
//   days 1 to 30     one every day
//   days 30 to 60    one every 2 days
//   days 60 to 120   one every 3 days
//   days 120 to 180  one every 4 days
// contractorSendDays() is the only place that schedule lives.
//
// STEP NUMBERS start at 601 and follow the schedule in order. Never renumber
// a step that has shipped: lead_emails.step is the send history.
//
// WHO: everyone who submits the form. Submitting is the request to be emailed
// about this offer (inquiryOptIn in lib/metaCampaignGuard.ts). Every email
// carries a one click unsubscribe. No texts: the form promises a call.
//
// RULES FOR EVERY EMAIL IN HERE (Notion: SOP Contractor Owner Lead Engine):
//   - Ryan's voice. Short lines. No dashes of any kind. No contractions in
//     Ryan's own lines; quotes stay exactly as the person said them.
//   - No promise of leads, sales, revenue, ROAS, cost per lead or rankings.
//   - Scott's words and numbers only as he said them on the Oct 1 2026
//     recording, approximate, and always with the note that says so. The
//     inquiry counts in the ad are Ryan's words, not Scott's: keep them out of
//     anything attributed to Scott.
//   - Never claim Scott owns olguyfarms.com (it is Ryan's domain) and never
//     link to it: it is not on the public proof list.
//   - One main button per email: the next click toward a decision.
//   - Ryan approves the copy in batches. Only approved days live in
//     CONTRACTOR_EMAILS; the cron can only send what is in it.

import { BUSINESS } from "@/lib/site/business";
import { bookingPage } from "@/lib/site/external-links";

export const CONTRACTOR_CAMPAIGN = "contractor_owner";
export const CONTRACTOR_FUNNEL = "contractor_owner";
export const CONTRACTOR_META_FORM_ID = "1410074817946865";
export const CONTRACTOR_FIRST_STEP = 601;
/** The last send day is 180. A little room so a late cron still finishes. */
export const CONTRACTOR_LOOKBACK_DAYS = 185;
export const CONTRACTOR_LANDING_PATH = "/contractors";

/** Every day after day 0 that gets an email, in order. */
export function contractorSendDays(): number[] {
  const days: number[] = [];
  for (let d = 1; d <= 30; d += 1) days.push(d);
  for (let d = 32; d <= 60; d += 2) days.push(d);
  for (let d = 63; d <= 120; d += 3) days.push(d);
  for (let d = 124; d <= 180; d += 4) days.push(d);
  return days;
}

/** lead_emails.step for a send day. Fixed by the schedule, never by the copy. */
export function contractorStepForDay(day: number): number {
  const index = contractorSendDays().indexOf(day);
  if (index < 0) throw new Error(`Day ${day} is not on the contractor schedule`);
  return CONTRACTOR_FIRST_STEP + index;
}

export const CONTRACTOR_LAST_STEP = CONTRACTOR_FIRST_STEP + contractorSendDays().length - 1;

export type ContractorLeadCandidate = {
  source?: unknown;
  diagnostic?: unknown;
  marketing_email_consent?: unknown;
};

/** A lead from the Scott video form that asked to hear from us. */
export function isContractorSeriesLead(lead: ContractorLeadCandidate): boolean {
  if (lead.marketing_email_consent !== true) return false;
  if (lead.source !== "meta_lead_ad") return false;
  const diagnostic = lead.diagnostic;
  if (!diagnostic || typeof diagnostic !== "object" || Array.isArray(diagnostic)) return false;
  return (diagnostic as Record<string, unknown>).form_id === CONTRACTOR_META_FORM_ID;
}

// ---------------------------------------------------------------------------
// Links. Every one carries the campaign and the day, so a click in Resend and
// a visit in the site analytics both say which email moved the person.

function utm(day: number, extra = ""): string {
  return `utm_source=email&utm_medium=nurture&utm_campaign=${CONTRACTOR_CAMPAIGN}&utm_content=day${day}${extra}`;
}

export function contractorLink(day: number, path = CONTRACTOR_LANDING_PATH, anchor = ""): string {
  return `${BUSINESS.siteUrl}${path}?${utm(day)}${anchor ? `#${anchor}` : ""}`;
}

export function contractorToolLink(day: number, slug: string): string {
  return `${BUSINESS.siteUrl}/tools/${slug}?${utm(day, "_tool")}`;
}

/** The booking page when one is set, otherwise the landing page's booking section. */
export function contractorBookingLink(day: number): string {
  const booking = bookingPage();
  if (!booking) return contractorLink(day, CONTRACTOR_LANDING_PATH, "call");
  return `${booking}${booking.includes("?") ? "&" : "?"}${utm(day, "_book")}`;
}

// ---------------------------------------------------------------------------
// The emails.

export type ContractorBlock =
  | { kind: "p"; text: string }
  | { kind: "callout"; text: string }
  | { kind: "quote"; text: string; who: string }
  | { kind: "stats"; items: { value: string; label: string }[]; note: string }
  | { kind: "steps"; title?: string; items: { title: string; text?: string }[] }
  | { kind: "checks"; title: string; tone: "yes" | "no"; items: string[] };

export type ContractorTool = { slug: string; title: string; blurb: string; label: string };

export type ContractorEmail = {
  /** Days after the lead came in. 0 is the instant welcome. */
  day: number;
  /** Inbox line. Leads with one emoji (Ryan's subject line rule). {first} is optional. */
  subject: string;
  /** The grey line after the subject in most inboxes. */
  preheader: string;
  kicker: string;
  headline: string;
  /** href makes the whole picture a link, for heroes that show a play button. */
  hero: { src: string; alt: string; href?: string };
  blocks: (first: string) => ContractorBlock[];
  cta: { label: string; href: string; lead?: string };
  tool?: ContractorTool;
  /** The open loop at the bottom: what the next email is about. */
  next?: string;
  /** A short P.S. under the signature. Plain words, no new claims. */
  ps?: string;
};

const IMG = (file: string) => `/images/email/contractor/${file}`;

export const CONTRACTOR_SIGNATURE_PHOTO = IMG("ryan-signature.jpg");

// Names software makes up when nobody typed one (Meta's "Facebook lead" and
// friends). Same list as lib/leadNotify.ts, kept here so the cron does not
// have to import the whole notifier.
const PLACEHOLDER_FIRST_NAMES = new Set(["facebook", "unknown", "text-in", "unnamed", "lead", "test", "n/a", "na", "none"]);

/** The first name to greet with, or "" when there is no real one. */
export function contractorFirstName(fullName: string | null | undefined): string {
  const first = String(fullName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || PLACEHOLDER_FIRST_NAMES.has(first.toLowerCase())) return "";
  if (!/^\p{L}[\p{L}'.]{0,23}$/u.test(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** The greeting line. A lead with no first name gets a plain hello. */
function hi(first: string): string {
  const name = first.trim();
  return name ? `${name},` : "Hello,";
}

export const SCOTT_NUMBERS_NOTE =
  "Scott's numbers, the way he said them on camera on October 1, 2026: about $500 to us plus about $300 in ad spend for the month. The margin is his rough figure, give or take, before what he pays us. One business, one month. Not a promise of what yours will do.";

const SCOTT = "Scott, O-L Guy Farms";

/** Scott's three numbers, shown with SCOTT_NUMBERS_NOTE everywhere they appear. */
export const SCOTT_STATS = [
  { value: "$800", label: "All in for one month" },
  { value: "4 days", label: "One pond job" },
  { value: "$4,500", label: "Rough margin on that job" },
] as const;

const TOOLS = {
  customerValue: {
    slug: "lead-value-calculator",
    title: "Lead value calculator",
    blurb: "Your average job, your margin, your close rate, and how often a good customer hires you again or sends a neighbor. It shows what one inquiry is really worth.",
    label: "Run the customer math",
  },
  responseTime: {
    slug: "lead-response-time",
    title: "Lead response time calculator",
    blurb: "How many inquiries you get and how long they wait to hear back. It shows what the wait could be costing you.",
    label: "Score my response time",
  },
  quoteFollowUp: {
    slug: "quote-follow-up-calculator",
    title: "Quote follow up calculator",
    blurb: "How many estimates you give a month, what they are worth and how many you close now. It shows what steady follow up could add in a year.",
    label: "Run my quote math",
  },
  websiteGrader: {
    slug: "website-grader",
    title: "Website grader",
    blurb: "Twenty checks a landowner runs on your site without knowing it: phone, photos, services, area, the way to ask for an estimate. You get a fix list.",
    label: "Grade my website",
  },
  googleListing: {
    slug: "google-business-profile-scorecard",
    title: "Google Business Profile scorecard",
    blurb: "Your listing's details, photos, reviews and contact options, scored, with the next fixes in order. No Google login needed.",
    label: "Score my Google listing",
  },
  discountDamage: {
    slug: "discount-damage-calculator",
    title: "Discount damage calculator",
    blurb: "Put in the price, your cost and the discount. It shows what leaves your profit and how many extra jobs it takes just to get back to even.",
    label: "Run the discount math",
  },
  reviewGoal: {
    slug: "review-goal-calculator",
    title: "Review goal calculator",
    blurb: "Your rating, your review count and the rating you want. It shows how many new five star reviews that takes, and how long at your pace.",
    label: "Run my review goal",
  },
  driveTime: {
    slug: "drive-time-cost",
    title: "Windshield time calculator",
    blurb: "Hours behind the wheel a day, how many people are driving, and your hourly rate. It shows what the truck time costs you in a year.",
    label: "Run my drive time cost",
  },
  customerLifetime: {
    slug: "customer-lifetime-value",
    title: "Customer lifetime value calculator",
    blurb: "Your average job, how often a customer hires you, how many years they stay and your margin. It shows what one good customer is worth over the whole relationship.",
    label: "Run my customer value",
  },
  phoneSite: {
    slug: "mobile-traffic-loss",
    title: "Mobile visitor loss calculator",
    blurb: "Your visitors, how many come on a phone, and how often each kind reaches out. It shows what an awkward phone site could be costing you, and the three fixes that matter.",
    label: "Run my phone site math",
  },
  formLength: {
    slug: "form-friction-calculator",
    title: "Form length calculator",
    blurb: "Compare a short form and a long one with clear assumptions you set. Then check it against the inquiries you actually get.",
    label: "Compare form lengths",
  },
  capacity: {
    slug: "capacity-calculator",
    title: "Job capacity calculator",
    blurb: "Your crews, the hours in a day and the hours a job takes. It shows your real ceiling, your open slots and what filling them is worth.",
    label: "Run my capacity",
  },
  missedCalls: {
    slug: "missed-call-calculator",
    title: "Missed call calculator",
    blurb: "The calls you miss in a week and what a customer is worth to you. It shows the yearly number, and what a quick text back could save.",
    label: "Run my missed call math",
  },
  buyVsRent: {
    slug: "equipment-buy-vs-rent",
    title: "Buy vs rent equipment calculator",
    blurb: "Rental cost a day, purchase price, upkeep and resale. It finds how many days a year you need the machine before buying beats renting.",
    label: "Run buy vs rent",
  },
  slowPay: {
    slug: "late-invoice-calculator",
    title: "Unpaid invoice calculator",
    blurb: "What you invoice, how long it takes to get paid and what you never collect. It shows the cash tied up waiting, and what a deposit rule would change.",
    label: "Run my invoice math",
  },
  paymentPlan: {
    slug: "payment-plan-calculator",
    title: "Payment plan builder",
    blurb: "Total price, deposit and number of payments. It lays out what you collect and when, and prints a schedule you can hand the landowner.",
    label: "Build a payment schedule",
  },
  adBudget: {
    slug: "ad-budget-planner",
    title: "Ad budget planner",
    blurb: "The jobs you want this month, your close rate and what an inquiry costs you. It works backward to the budget that math needs, from your own numbers.",
    label: "Plan my ad budget",
  },
} satisfies Record<string, ContractorTool>;

/** Day 0. Sent by lib/leadNotify.ts the moment the form lands, not by the cron. */
export const CONTRACTOR_WELCOME: ContractorEmail = {
  day: 0,
  subject: "✅ {first}, your application is in",
  preheader: "What happens next, and how to skip the wait.",
  kicker: "Application received",
  headline: "You are on my list. Here is what happens next.",
  hero: { src: IMG("day0-welcome.jpg"), alt: "Ryan Nichols and Scott of O-L Guy Farms in the cab of Scott's tractor" },
  blocks: (first) => [
    { kind: "p", text: hi(first) },
    { kind: "p", text: "Your application just landed with me. Not a call center. Me." },
    {
      kind: "steps",
      title: "What happens next",
      items: [
        { title: "I read it.", text: "What you do, where you work, and the jobs you want more of." },
        { title: "I call you.", text: `From ${BUSINESS.phone.display}, within one business day. Save that number. It is my direct line.` },
        { title: "We map it.", text: "Twenty minutes on your business. You hang up knowing the next practical step, whether you hire me or not." },
      ],
    },
    { kind: "p", text: "Want it sooner? Pick a time that works for you, or call or text me right now." },
  ],
  cta: { label: "Pick a time, skip the wait", href: contractorBookingLink(0), lead: "Skip the wait" },
  next: "Tomorrow: what one month looked like for Scott at O-L Guy Farms. His numbers, in his own words.",
};

/**
 * Every written email after day 0, in day order. Writing one here does NOT
 * make it send: only the days in CONTRACTOR_LIVE_DAYS can go out.
 */
export const CONTRACTOR_WRITTEN: ContractorEmail[] = [
  {
    day: 1,
    subject: "🚜 Scott spent $800. Here is what came back.",
    preheader: "One month at O-L Guy Farms, in Scott's own words.",
    kicker: "Case file · O-L Guy Farms",
    headline: "One month. $800 all in. Here is what came back.",
    hero: {
      src: IMG("day1-casefile.jpg"),
      alt: "Play Scott's video: Scott of O-L Guy Farms in his tractor cab, a pond behind him",
      href: contractorLink(1, CONTRACTOR_LANDING_PATH, "scott"),
    },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Scott runs O-L Guy Farms out of Tyler. Custom ag service and dirt work. Ponds, clearing, hay. A family outfit." },
      { kind: "p", text: "For years, word of mouth kept him busy.\nThen he lost his two biggest customers. The equipment payments did not stop." },
      { kind: "p", text: "So my team and I built the system around the work he wanted. A website that shows his real work. Real job site video. Ads around Tyler, about 40 miles out. An inquiry form that screens the job before anyone drives out." },
      { kind: "p", text: "Then I asked him on camera how the month went." },
      { kind: "quote", text: "At the end of the day, the profit margin is roughly $4,500, give or take a little bit.", who: SCOTT },
      {
        kind: "stats",
        items: [...SCOTT_STATS],
        note: SCOTT_NUMBERS_NOTE,
      },
      { kind: "p", text: "Watch him tell it. The whole video is under two minutes." },
    ],
    cta: { label: "Watch Scott tell it", href: contractorLink(1, CONTRACTOR_LANDING_PATH, "scott"), lead: "Hear it from Scott" },
    next: "Tomorrow: four questions to ask before you load the truck for an estimate.",
  },
  {
    day: 2,
    subject: "📋 Four questions before you load the truck",
    preheader: "The estimate trip that costs you a day, and how to screen it first.",
    kicker: "Field notes",
    headline: "The estimate that costs you a day",
    hero: { src: IMG("day2-inquiry.jpg"), alt: "Two real project inquiries from Scott's form: a pond expansion and fifteen acres to clear" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "You drive out. You walk the property. You work up the numbers.\nThen the first thing they ask is whether you can do it any cheaper." },
      { kind: "p", text: "That trip cost you diesel, a morning and a crew day you could have sold." },
      {
        kind: "steps",
        title: "Ask these on the phone first",
        items: [
          { title: "What is the project?", text: "Pond, clearing, pad or drainage. And how many acres." },
          { title: "Where is the property?", text: "How far from your yard, and can your equipment get in." },
          { title: "What does done look like?", text: "What they want it to look like when you leave." },
          { title: "When, and is the money set aside?", text: "The timing, and whether they have budgeted for it." },
        ],
      },
      { kind: "callout", text: "If they cannot answer number four, it is a conversation. Not an estimate yet." },
      { kind: "p", text: "Scott's inquiry form asks the first two before he ever picks up the phone: what the project is, and how far the property is from Tyler. Acres, access and timing go in the notes." },
      { kind: "p", text: "When he called back the inquiry that turned into his pond job, here is how he put it:" },
      { kind: "quote", text: "They knew who I was, they knew what I was calling about, and I mean, it was simple, painless.", who: SCOTT },
    ],
    cta: { label: "See the form we built", href: contractorLink(2, CONTRACTOR_LANDING_PATH, "inquiry"), lead: "See it working" },
    tool: TOOLS.quoteFollowUp,
    next: "Tomorrow: why one pond is never just one pond.",
  },
  {
    day: 3,
    subject: "💧 One pond is never just one pond",
    preheader: "Price the customer, not the first ticket.",
    kicker: "The math that matters",
    headline: "Price the customer, not the first ticket",
    hero: { src: IMG("day3-pond.jpg"), alt: "Scott in his tractor cab with a finished pond behind him" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "A landowner calls about a pond. You dig it right. They watch how you work." },
      { kind: "p", text: "Now they trust you. And that same land usually has more on it.\nAnother pond. A fence line to clear. Drainage. An access road." },
      { kind: "p", text: "Scott's first job from the ads was a pond. Four days of work. Here is what came after:" },
      { kind: "quote", text: "We've talked since then about maybe coming back this fall and doing some more work for 'em.", who: SCOTT },
      { kind: "callout", text: "The first ticket is not the number that matters. The customer is." },
      { kind: "p", text: "Run your own number. Your average job, your close rate, and how often a good customer hires you again. It takes two minutes." },
    ],
    cta: { label: "Run the customer math", href: contractorToolLink(3, TOOLS.customerValue.slug), lead: "Two minutes, free" },
    next: "Tomorrow: a landowner called three outfits. Who walked the land?",
  },
  {
    day: 4,
    subject: "📞 They called three outfits",
    preheader: "Whoever calls back first usually walks the land.",
    kicker: "Speed wins the walk",
    headline: "They called three outfits. Who called back first?",
    hero: { src: IMG("day4-speed.jpg"), alt: "Three outfits got the same call. The one that called back first gets the walk." },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "When a landowner needs work done, they rarely call just you. They call two or three outfits." },
      { kind: "p", text: "Whoever calls back first usually gets the walk. Whoever walks the land usually gets the job." },
      { kind: "p", text: "You are on a machine when the phone rings. That is the job. But a missed call that waits until dark is a job going to somebody else." },
      {
        kind: "steps",
        title: "Three fixes that cost nothing",
        items: [
          { title: "A text back in a minute.", text: "So they know you saw it and you are coming back to them." },
          { title: "A voicemail with a time.", text: "Say exactly when you return calls." },
          { title: "One call back hour.", text: "Same time every day. Every call returned." },
        ],
      },
      { kind: "p", text: "We hold ourselves to the same rule. Here is Scott on calling us:" },
      { kind: "quote", text: "Every time I've called, if Ryan or Pat didn't answer the phone, I got a phone call back within 30 minutes from one of them or a text.", who: SCOTT },
      { kind: "p", text: "Score how fast you answer right now. It takes a minute." },
    ],
    cta: { label: "Score my response time", href: contractorToolLink(4, TOOLS.responseTime.slug), lead: "One minute, free" },
    next: "Tomorrow: your machines are your best ad. Three shots to take on your next job.",
  },
  {
    day: 5,
    subject: "📸 Your machines are your best ad",
    preheader: "Three shots to take on your next job. All from your phone.",
    kicker: "Proof you already own",
    headline: "Landowners hire who they can see",
    hero: { src: IMG("day5-machines.jpg"), alt: "Scott and Ryan in the cab of Scott's tractor" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Not a logo. Not a slogan." },
      { kind: "p", text: "Your equipment on real dirt. A pond holding water. A pasture you cleared that used to be brush." },
      { kind: "p", text: "You already have most of it. It is sitting in your phone." },
      {
        kind: "steps",
        title: "On your next job, shoot three things",
        items: [
          { title: "Before.", text: "Stand where the landowner stands." },
          { title: "During.", text: "Ten seconds of the machine working." },
          { title: "After.", text: "Same spot as the before shot." },
        ],
      },
      { kind: "callout", text: "That is a post, a page on your website and proof for the next estimate. From one job." },
      { kind: "p", text: "The video you saw in our ad was shot the same way. On a phone, in Scott's tractor, in his own words." },
    ],
    cta: { label: "Watch Scott's video", href: contractorLink(5, CONTRACTOR_LANDING_PATH, "scott"), lead: "See how it looks" },
    next: "Tomorrow: everything we built for Scott, piece by piece.",
  },
  {
    day: 6,
    subject: "🧰 What we built for Scott, piece by piece",
    preheader: "Website, video, ads, an inquiry form. And the fifth piece.",
    kicker: "The build",
    headline: "Everything we built, piece by piece",
    hero: { src: IMG("day6-build.jpg"), alt: "Five pieces: website, job site video, ads, inquiry form and follow up" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Here is all of it, plain." },
      {
        kind: "steps",
        items: [
          { title: "A website.", text: "His work, his services, his area and his phone number in one place." },
          { title: "Real job site video.", text: "Scott, in his own words, on his own ground." },
          { title: "Ads.", text: "That video in front of people around Tyler, about 40 miles out." },
          { title: "An inquiry form.", text: "The landowner tells him the project and how far out it is before anyone drives anywhere." },
        ],
      },
      { kind: "callout", text: "Piece five is follow up. You are reading it." },
      { kind: "p", text: "This series is the same kind of follow up we build for our clients. It keeps a new inquiry warm while you are on a machine." },
      { kind: "p", text: "One more thing. Scott's ads ran on his own card. If anyone asks you to read them your card number so they can run your ads, walk away." },
      { kind: "p", text: "We start with the projects you want, your service area and your capacity. Then we build the path for those people to find you. That is what I would map for you on a twenty minute call." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(6), lead: "Map yours" },
    next: "Tomorrow: is this for you? A straight answer.",
  },
  {
    day: 7,
    subject: "🤝 Is this for you? Straight answer.",
    preheader: "Who this is for, who it is not, and the next step.",
    kicker: "Straight answer",
    headline: "Who this is for. Who it is not.",
    hero: { src: IMG("day7-fit.jpg"), alt: "Ryan Nichols talking in the cab of Scott's tractor" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "A week ago you raised your hand. Here is the honest version." },
      {
        kind: "checks",
        title: "This is for you if",
        tone: "yes",
        items: [
          "You run an established dirt work, land clearing or pond business.",
          "You have the equipment, the crew and room on the schedule.",
          "You want more of the jobs worth moving your equipment for.",
          "You can put a real budget behind growth for at least 90 days.",
        ],
      },
      {
        kind: "checks",
        title: "It is not for you if",
        tone: "no",
        items: [
          "You are just getting started.",
          "Your schedule is already full for the year.",
          "You want someone to promise you a number of jobs.",
        ],
      },
      { kind: "callout", text: "I cannot promise you a job as fast as Scott got his. Nobody honest can. What I can do is build it around your real numbers and tell you the truth about them." },
      { kind: "quote", text: "So if you want to go with somebody that'll help you out and that'll listen to your concerns, give them a call.", who: SCOTT },
      { kind: "p", text: "If you are in the first group, the next step is twenty minutes on the phone. Your work, your area, the jobs you want. You leave with the next practical step." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(7), lead: "Twenty minutes" },
    next: "Tomorrow: what a landowner looks for before they pick an outfit.",
    ps: "Not ready yet? Stay on the list. The next emails are field notes you can use whether we ever work together or not.",
  },
  {
    day: 8,
    subject: "🔍 What a landowner checks before they call you",
    preheader: "Five things they look for before your phone ever rings.",
    kicker: "Through their eyes",
    headline: "Before they call, they check you out",
    hero: { src: IMG("day8-checks.jpg"), alt: "Five checks a landowner runs before calling: your work, your answers, your questions, your reviews, your next step" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Before a landowner calls about a pond or forty acres of brush, a lot of them look you up first. On their phone, in a couple of minutes." },
      {
        kind: "steps",
        title: "What they are checking",
        items: [
          { title: "Can I see your work?", text: "Real photos and video of jobs like theirs. Not stock pictures." },
          { title: "Will you answer?", text: "A number that gets picked up, or called back the same day." },
          { title: "Do you know land like mine?", text: "Your services in plain words, with your area named." },
          { title: "Do other people vouch for you?", text: "Reviews with names and details, not just stars." },
          { title: "What happens next?", text: "A clear way to ask for an estimate without chasing you." },
        ],
      },
      { kind: "callout", text: "If one of those is missing, they keep scrolling to the next outfit." },
      { kind: "p", text: "That is why Scott's page leads with his own video, his services and his number. The landowner gets the answers before they ever pick up the phone." },
      { kind: "p", text: "Want to know how your business looks through those five checks? Twenty minutes on the phone and I will tell you straight." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(8), lead: "Run the five checks" },
    tool: TOOLS.websiteGrader,
    next: "Tomorrow: what to say when they ask if you can do it any cheaper.",
  },
  {
    day: 9,
    subject: "💬 \"Can you do it any cheaper?\"",
    preheader: "What to say instead of dropping your number.",
    kicker: "Hold your margin",
    headline: "When they ask if you can do it cheaper",
    hero: { src: IMG("day9-cheaper.jpg"), alt: "Two answers side by side: drop the price, or change the scope" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "You know the question. Sometimes it comes before you even finish walking the property." },
      { kind: "p", text: "Dropping the number is the easy answer. It is also the expensive one. Same diesel, same hours, same wear on the machine. Less money for all of it." },
      {
        kind: "steps",
        title: "Three better answers",
        items: [
          { title: "Trade scope, not price.", text: "\"I can get to that number if we leave the fence row for later.\" They pick what matters to them." },
          { title: "Give them options.", text: "A basic, a standard and a full scope, each with its own price. Let them choose." },
          { title: "Show what is in the number.", text: "Mobilization, hauling, machine hours, cleanup. A number they can see inside of is easier to say yes to." },
        ],
      },
      { kind: "callout", text: "Do not compete on price. Compete on being the outfit they trust with their land." },
      { kind: "p", text: "Before you ever drop a number again, run what a discount really costs you. It takes a minute." },
    ],
    cta: { label: "Run the discount math", href: contractorToolLink(9, TOOLS.discountDamage.slug), lead: "What a discount really costs" },
    next: "Tomorrow: the listing that shows up before your website does.",
  },
  {
    day: 10,
    subject: "📍 The listing that shows up before your website",
    preheader: "Your Google Business Profile, fixed in an afternoon.",
    kicker: "Get found",
    headline: "Your Google listing is your second yard sign",
    hero: { src: IMG("day10-listing.jpg"), alt: "A business listing card with photos, services, reviews and a call button" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "When someone searches your business name, or \"pond builder near me\", Google often shows your Business Profile before your website. Photos, reviews, a call button." },
      { kind: "p", text: "If yours is half empty, it is one of the cheapest fixes you will ever make." },
      {
        kind: "steps",
        title: "Fix these five this week",
        items: [
          { title: "Photos.", text: "Ten real job photos. Machines working, ponds holding water, ground you cleared." },
          { title: "Services.", text: "Every service by name: pond construction, land clearing, dirt work, grading." },
          { title: "Service area.", text: "The towns and counties you actually work in." },
          { title: "Phone and hours.", text: "A number that gets answered, and hours that are true." },
          { title: "Reviews.", text: "Ask your last three customers this week. Tomorrow I will show you how." },
        ],
      },
      { kind: "p", text: "Score your listing first, so you know which of the five to fix first." },
    ],
    cta: { label: "Score my Google listing", href: contractorToolLink(10, TOOLS.googleListing.slug), lead: "Free, about three minutes" },
    next: "Tomorrow: how to ask for a review without it feeling like begging.",
  },
  {
    day: 11,
    subject: "⭐ Ask for the review before you load up",
    preheader: "One sentence, on site, while the dirt is still fresh.",
    kicker: "Proof that piles up",
    headline: "Ask for the review before you load up",
    hero: { src: IMG("day11-review.jpg"), alt: "A text message asking a happy landowner for a Google review, with the link" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "The best time to ask for a review is the moment the landowner is standing there looking at the finished work." },
      { kind: "p", text: "Not a week later, when the job is old news and the dirt has settled." },
      {
        kind: "steps",
        title: "The last day script",
        items: [
          { title: "Walk it with them.", text: "Let them see the finished job with you standing next to it." },
          { title: "Ask in person.", text: "\"If you are happy with it, would you leave us a Google review? It helps a small outfit more than you would think.\"" },
          { title: "Text the link before you pull out.", text: "Same day, one tap for them. The longer you wait, the less likely it happens." },
        ],
      },
      { kind: "callout", text: "Every customer, every job. Make it part of finishing, like loading the machine." },
      { kind: "p", text: "Run how many five star reviews it takes to reach the rating you want, and how long at your pace." },
    ],
    cta: { label: "Run my review goal", href: contractorToolLink(11, TOOLS.reviewGoal.slug), lead: "Free, one minute" },
    next: "Tomorrow: the cost hiding inside every bid.",
  },
  {
    day: 12,
    subject: "🚛 The cost hiding inside every bid",
    preheader: "Drive time, trucking and the smallest job that still pays.",
    kicker: "Know your numbers",
    headline: "Price the trip before you price the job",
    hero: { src: IMG("day12-radius.jpg"), alt: "Service radius rings around the yard: every mile out has a price" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Scott told me he works within about 35 miles of his base, unless the job is big enough to justify moving the equipment farther." },
      { kind: "p", text: "Every bid carries a trip. Fuel, the trailer, the hours behind the wheel instead of on the machine." },
      {
        kind: "steps",
        title: "Put the trip in writing",
        items: [
          { title: "Set your radius.", text: "The distance you work without a travel charge." },
          { title: "Set a mobilization fee.", text: "Past the radius, moving the equipment is its own line on the bid." },
          { title: "Set a minimum job.", text: "Below it, the trip does not pay. Say so on the first call." },
        ],
      },
      { kind: "callout", text: "Ask how far the property is on the very first call. It is the second question on Scott's form for a reason." },
      { kind: "p", text: "See what time in the truck costs you over a year." },
    ],
    cta: { label: "Run my drive time cost", href: contractorToolLink(12, TOOLS.driveTime.slug), lead: "Free, two minutes" },
    next: "Tomorrow: what to tell a landowner when it rains for a week.",
  },
  {
    day: 13,
    subject: "🌧️ What to tell them when it rains for a week",
    preheader: "The thirty second update that keeps the job.",
    kicker: "Keep their trust",
    headline: "The text that saves a job in a wet week",
    hero: { src: IMG("day13-rain.jpg"), alt: "A rainy work week and a short text to the landowner with the new plan" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Dirt work runs on the weather. Every landowner knows that. What they do not know is whether you forgot about them." },
      { kind: "p", text: "Silence is what loses the job. Not the rain." },
      {
        kind: "steps",
        title: "Send three things",
        items: [
          { title: "The reason.", text: "\"Ground is too wet to work without tearing it up.\"" },
          { title: "The new plan.", text: "\"Back Thursday if it dries out.\"" },
          { title: "The next update.", text: "\"I will text you Wednesday night either way.\"" },
        ],
      },
      { kind: "callout", text: "Thirty seconds of texting can keep a customer from calling another outfit." },
      { kind: "p", text: "Keeping every landowner posted, every inquiry answered and every estimate followed up is the part most owners do not have time for. It is the part we set up." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(13), lead: "Map your follow up" },
    next: "Tomorrow: two weeks in. Here is what I would build for you.",
  },
  {
    day: 14,
    subject: "🗺️ Two weeks in. Here is what I would build.",
    preheader: "Everything so far, short, and the next step.",
    kicker: "Your map",
    headline: "Two weeks of field notes, on one page",
    hero: { src: IMG("day14-map.jpg"), alt: "Six tiles: screen the job, call back first, show real work, trade scope not price, ask for reviews, keep them posted" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Two weeks ago you raised your hand. Here is everything so far, short." },
      {
        kind: "steps",
        items: [
          { title: "Screen the job before you drive.", text: "Project, place, timing and budget on the phone first." },
          { title: "Call back first.", text: "Whoever calls back first usually walks the land." },
          { title: "Show real work.", text: "Before, during and after, from your own phone." },
          { title: "Trade scope, not price.", text: "Options instead of discounts." },
          { title: "Ask for the review on site.", text: "Text the link before you pull out." },
          { title: "Keep them posted.", text: "Especially in a wet week." },
        ],
      },
      { kind: "p", text: "You can do every one of these yourself. Most owners do not, because they are running the machine." },
      { kind: "p", text: "That is the part we build. The website, the video, the ads, the inquiry form and the follow up, set up around the jobs you want." },
      { kind: "callout", text: "Twenty minutes. I map it for your business, and you leave with the next practical step whether you hire me or not." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(14), lead: "Map yours" },
    next: "Tomorrow: the best customer list you have is the one you already have.",
  },
  {
    day: 15,
    subject: "📇 The best customer list is already in your phone",
    preheader: "Your last twenty customers. One text each. This week.",
    kicker: "Work you already earned",
    headline: "Your next job may already be in your phone",
    hero: { src: IMG("day15-list.jpg"), alt: "An example list of past customers, each with the work still left on their land" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Everybody chases new landowners. Ads, signs, word of mouth." },
      { kind: "p", text: "The people most likely to hire you next already hired you once. They know your work. They have your number. And most of them have more land than the job you did." },
      {
        kind: "steps",
        title: "This week, do this",
        items: [
          { title: "Pull your last twenty jobs.", text: "Name, number, what you did and when." },
          { title: "Write down what is still left.", text: "The second pond. The fence row. The road that washes out every spring." },
          { title: "Send one short text.", text: "\"Tom, this is Mike. We dug your pond last spring. Is it holding water? I have room on the schedule next month if that fence row is still on your list.\"" },
          { title: "Call back the ones who answer.", text: "Same day. A reply is a warm conversation." },
        ],
      },
      { kind: "callout", text: "A past customer does not need to be sold on you. They need to be reminded you exist." },
      { kind: "p", text: "Then run the number. What one good customer is worth to you over years, not just the first ticket." },
    ],
    cta: { label: "Run my customer value", href: contractorToolLink(15, TOOLS.customerLifetime.slug), lead: "What one good customer is worth" },
    next: "Tomorrow: the neighbor watching your machine from the fence line.",
  },
  {
    day: 16,
    subject: "🏡 The neighbor watching from the fence line",
    preheader: "Every job site is a showroom. Most outfits waste it.",
    kicker: "Word of mouth, on purpose",
    headline: "Every job site is a showroom",
    hero: { src: IMG("day16-road.jpg"), alt: "A county road with your job in the middle and the neighbors on both sides watching the work" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "When your machine is working a property, the whole road sees it." },
      { kind: "p", text: "The neighbor with the same brush problem. The one whose pond is silting in. The one who has been meaning to clear the back forty for years." },
      { kind: "p", text: "Word of mouth is how most of you built your business. It works better when you stop leaving it to chance." },
      {
        kind: "steps",
        title: "Work the whole road",
        items: [
          { title: "Ask your customer.", text: "\"Anybody on this road been talking about a pond or some clearing?\" They usually know." },
          { title: "Put your name at the gate.", text: "With the landowner's OK, a sign while you work. Your number big enough to read from a truck." },
          { title: "Hand the watcher a card.", text: "When a neighbor walks over to see what you are doing, that is a lead walking to you." },
          { title: "Thank the customer who sends one.", text: "A call, a gift card, something off their next job. Whatever fits you." },
        ],
      },
      { kind: "callout", text: "A neighbor who watched you work is the easiest estimate you will ever give." },
      { kind: "p", text: "Then ask yourself one question. When that neighbor looks you up tonight, what do they find? That is the part we build." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(16), lead: "Turn one job into the next one" },
    next: "Tomorrow: thirty seconds of video you can shoot from the cab.",
  },
  {
    day: 17,
    subject: "🎥 Thirty seconds from the cab",
    preheader: "The video that sells while you run the machine.",
    kicker: "Show, do not tell",
    headline: "Shoot thirty seconds from the cab",
    hero: {
      src: IMG("day17-cab.jpg"),
      alt: "Play Scott's video: Ryan and Scott talking in the cab of Scott's tractor",
      href: contractorLink(17, CONTRACTOR_LANDING_PATH, "scott"),
    },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "The video in our ad was shot on a phone, in Scott's tractor cab. No studio." },
      { kind: "p", text: "A landowner does not need a commercial from you. They want to see who is coming onto their land, and hear how you talk." },
      {
        kind: "steps",
        title: "Your thirty seconds",
        items: [
          { title: "Who you are.", text: "Your name and your outfit. Five seconds." },
          { title: "What you do and where.", text: "Ponds, clearing, dirt work, and the towns you cover." },
          { title: "What you just finished.", text: "Turn the phone around and show the job behind you." },
          { title: "What to do next.", text: "Say your number out loud, and that you answer it." },
        ],
      },
      { kind: "callout", text: "Shut the engine off first. Hold the phone up and down, the way people watch." },
      { kind: "p", text: "One of these per job, and in a few months you have a library of real work most outfits never build." },
      { kind: "p", text: "Here is what it looks like when it is done." },
    ],
    cta: { label: "Watch Scott's video", href: contractorLink(17, CONTRACTOR_LANDING_PATH, "scott"), lead: "See one finished" },
    next: "Tomorrow: why your Facebook page is not your website.",
  },
  {
    day: 18,
    subject: "🔑 Your Facebook page is not your website",
    preheader: "Rent the reach. Own the place they land.",
    kicker: "Own your platform",
    headline: "Facebook is rented ground",
    hero: { src: IMG("day18-rented.jpg"), alt: "Rented ground versus owned ground: a Facebook page next to a website you own" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "A lot of outfits run everything through a Facebook page. It is free, it is where people are, and it works. Until it does not." },
      { kind: "p", text: "You do not own that page. Facebook decides who sees your posts, what your page looks like, and whether it stays up." },
      { kind: "p", text: "Use Facebook. Post your work there. Run ads there. But send people somewhere you own." },
      {
        kind: "checks",
        title: "What a website you own gives you",
        tone: "yes",
        items: [
          "Your own address on the internet. A rule change somewhere else cannot take it down.",
          "Your work, your services and your area, on a page a landowner can find on Google.",
          "Your inquiry form, so the details come to you instead of getting lost in a message thread.",
          "A page built for phones, because that is where a lot of landowners look you up.",
        ],
      },
      { kind: "callout", text: "Rent the reach. Own the place they land." },
      { kind: "p", text: "Already have a site? Grade it. Twenty checks, on your phone, in about two minutes." },
    ],
    cta: { label: "Grade my website", href: contractorToolLink(18, TOOLS.websiteGrader.slug), lead: "Two minutes, free" },
    tool: TOOLS.phoneSite,
    next: "Tomorrow: the questions your inquiry form should ask.",
  },
  {
    day: 19,
    subject: "📝 What your inquiry form should ask",
    preheader: "Six questions that screen the job before you drive.",
    kicker: "Screen it in writing",
    headline: "Let the form make the first call",
    hero: { src: IMG("day19-form.jpg"), alt: "An example inquiry form: project, size, location, timing, budget and photos" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "In my second email I gave you four questions to ask on the phone. A good inquiry form asks them before the phone ever rings." },
      {
        kind: "steps",
        title: "What to ask",
        items: [
          { title: "What is the project?", text: "Pond, clearing, pad, drainage or a road. Let them pick." },
          { title: "How big is it?", text: "Acres, or the size of the pond." },
          { title: "Where is it?", text: "The town or county, so you know the drive." },
          { title: "When do they want it done?", text: "This month, in a few months, or just getting prices." },
          { title: "Is the money set aside?", text: "A plain yes, no or not sure." },
          { title: "Can they send photos?", text: "Three phone pictures can save you a trip." },
        ],
      },
      { kind: "callout", text: "Every extra question can cost you a few people. Ask only what changes your answer." },
      { kind: "p", text: "Scott's form asks what the project is and how far the property is from Tyler, before he ever picks up the phone. See how it reads." },
    ],
    cta: { label: "See Scott's form", href: contractorLink(19, CONTRACTOR_LANDING_PATH, "inquiry"), lead: "See it working" },
    tool: TOOLS.formLength,
    next: "Tomorrow: why the time to get known is before they need you.",
  },
  {
    day: 20,
    subject: "⏳ Get known before they need you",
    preheader: "The name they remember is the name they call.",
    kicker: "Timing",
    headline: "Get known before they need you",
    hero: { src: IMG("day20-known.jpg"), alt: "Four steps: they notice you, they think about it, they look you up, they call the name they remember" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Most landowners do not wake up and call about a pond the same day." },
      { kind: "p", text: "They think about it for a while. They notice who is working around them. They look a couple of outfits up. Then they call the name they remember." },
      {
        kind: "steps",
        title: "Be the name they remember",
        items: [
          { title: "Post every job.", text: "Before, during and after. One post a week is plenty." },
          { title: "Keep a small ad running.", text: "Not just when you are slow. By the time you feel slow, you are already late." },
          { title: "Keep your Google listing fresh.", text: "New job photos every month." },
          { title: "Know your open slots.", text: "How many jobs you can take, so you go after them before the gap shows up." },
        ],
      },
      { kind: "callout", text: "When the schedule goes quiet, the time to market was two months ago." },
      { kind: "p", text: "Start with capacity. How many jobs your crew and your machines can really take in a month, and how many slots are open right now." },
    ],
    cta: { label: "Run my capacity", href: contractorToolLink(20, TOOLS.capacity.slug), lead: "Know your open slots" },
    next: "Tomorrow: one question. Reply with one number.",
  },
  {
    day: 21,
    subject: "🙋 One question. Reply with one number.",
    preheader: "It tells me what is worth sending you next.",
    kicker: "Quick question",
    headline: "Where does it break down for you?",
    hero: { src: IMG("day21-reply.jpg"), alt: "Ryan in the cab holding up one finger, next to three numbered answers" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Three weeks of field notes. Now I want to hear from you." },
      { kind: "p", text: "Hit reply and send me one number." },
      {
        kind: "steps",
        items: [
          { title: "Not enough calls.", text: "The phone is too quiet for the crew and the equipment you have." },
          { title: "Calls, but the wrong jobs.", text: "Tiny jobs, tire kickers, people shopping price." },
          { title: "Good jobs, no time.", text: "The work is there. Keeping up with every inquiry and bid is not." },
        ],
      },
      { kind: "p", text: "Add a line about your business if you want. I read the replies myself." },
      { kind: "callout", text: "Your answer shapes what I tell you on a call. It does not sign you up for anything." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(21), lead: "Rather talk than type?" },
    next: "Tomorrow: what was in Scott's ads.",
  },
  {
    day: 22,
    subject: "📣 What was in Scott's ads",
    preheader: "Real video, a tight area and a form that asks first.",
    kicker: "Inside the ads",
    headline: "What was in Scott's ads",
    hero: { src: IMG("day22-ads.jpg"), alt: "Three parts of Scott's ads: real job site video, an area around Tyler, and a form that screens" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "People ask what we put in Scott's ads. Here it is, plain." },
      {
        kind: "steps",
        items: [
          { title: "Real video.", text: "Scott's work and Scott's voice, on his own ground." },
          { title: "A tight area.", text: "Around Tyler, about 40 miles out." },
          { title: "A form that screens.", text: "What the project is and how far out it is, before anyone drives anywhere." },
          { title: "His own card.", text: "The ad spend ran on Scott's card, not ours." },
        ],
      },
      { kind: "callout", text: "The ad gets their attention. The form, the call back and the follow up turn it into a job." },
      { kind: "p", text: "Your area, your jobs and your capacity are different from Scott's. So your ads should be too. That is what I map on a twenty minute call: where to show up, who to show up for, and what to ask them first." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(22), lead: "Map your area and your ads" },
    next: "Tomorrow: the calls you never hear about.",
  },
  {
    day: 23,
    subject: "📵 The calls you never hear about",
    preheader: "Count them for one week. Then run the number.",
    kicker: "Count the misses",
    headline: "The calls you never hear about",
    hero: { src: IMG("day23-missed.jpg"), alt: "A phone lock screen with three missed calls from a workday on the machine" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "A few weeks ago I told you whoever calls back first usually walks the land. Today, count what you miss." },
      { kind: "p", text: "You are on the machine. The phone buzzes in your pocket. By the time you look, it has been an hour." },
      { kind: "p", text: "Some of those callers leave a voicemail. Some just call the next outfit on the list." },
      {
        kind: "steps",
        title: "Count them for one week",
        items: [
          { title: "Every missed call.", text: "Your phone keeps the list. Write down the number." },
          { title: "How many you called back the same day.", text: "Be honest. Nobody is grading this but you." },
          { title: "How many turned into a walk.", text: "That is the number that pays." },
        ],
      },
      { kind: "callout", text: "A missed call is not a lost job yet. A missed call nobody returns is." },
      { kind: "p", text: "Then put a number on it: the calls you miss in a week and what a customer is worth to you." },
    ],
    cta: { label: "Run my missed call math", href: contractorToolLink(23, TOOLS.missedCalls.slug), lead: "What the misses cost" },
    next: "Tomorrow: the bid you sent and never heard back on.",
  },
  {
    day: 24,
    subject: "📄 The bid you never heard back on",
    preheader: "Three check ins, on the calendar the day you send it.",
    kicker: "Follow up the bid",
    headline: "A bid with no follow up is a coin toss",
    hero: { src: IMG("day24-bid.jpg"), alt: "A follow up timeline: bid sent, a check in two days later, one a week later, a last one at two weeks" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "You walked the land. You worked up the numbers. You sent the bid. Then nothing." },
      { kind: "p", text: "Quiet after a bid does not always mean no. A lot of the time they are busy, comparing, or waiting on the money. The outfit that checks back politely stays in the running." },
      {
        kind: "steps",
        title: "A follow up that does not feel pushy",
        items: [
          { title: "Two days after.", text: "\"Any questions on the bid? Glad to walk through it.\"" },
          { title: "One week after.", text: "\"I am setting next month's schedule. Want me to hold a spot?\"" },
          { title: "Two weeks after.", text: "\"Last check from me. If the timing is not right, no problem. Call me when it is.\"" },
        ],
      },
      { kind: "callout", text: "Put all three on your calendar the day you send the bid. Do not trust your memory in a busy week." },
      { kind: "p", text: "Run what your open bids are worth: how many you send a month, the average size, and how many you close now." },
    ],
    cta: { label: "Run my quote math", href: contractorToolLink(24, TOOLS.quoteFollowUp.slug), lead: "What your open bids are worth" },
    next: "Tomorrow: your equipment list is a sales tool. Use it.",
  },
  {
    day: 25,
    subject: "🏗️ Your equipment list is a sales tool",
    preheader: "Landowners want to know you have the right machine.",
    kicker: "Show the iron",
    headline: "Your equipment list is a sales tool",
    hero: { src: IMG("day25-iron.jpg"), alt: "An example equipment list: each machine and the work it is for" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "A landowner with forty acres of brush wants to know one thing before they call. Do you have the machine for it?" },
      { kind: "p", text: "You know your equipment cold. They only know what they can see. So show them." },
      {
        kind: "steps",
        title: "On your website and your Google listing",
        items: [
          { title: "List the machines.", text: "Dozer, excavator, mulcher, skid steer, dump truck. Whatever you run." },
          { title: "Say what each one is for.", text: "\"Forestry mulcher: clears brush and small trees and leaves no burn piles.\"" },
          { title: "Show each one working.", text: "A photo or ten seconds of video on a real job." },
        ],
      },
      { kind: "callout", text: "The right machine, shown working, answers their first question before they ask it." },
      { kind: "p", text: "Want help putting your iron and your work in front of the right landowners? That is a twenty minute call." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(25), lead: "Show your work the right way" },
    tool: TOOLS.buyVsRent,
    next: "Tomorrow: how to ask for a deposit without losing the job.",
  },
  {
    day: 26,
    subject: "💵 Ask for the deposit without losing the job",
    preheader: "A deposit holds the date. Say it that way.",
    kicker: "Get paid right",
    headline: "A deposit holds their spot on your schedule",
    hero: { src: IMG("day26-deposit.jpg"), alt: "An example payment schedule: a deposit to hold the date, a payment at the start, the rest at the finish" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "You block out the week. You turn down other work. You haul the equipment out. Then the landowner pushes it back, or changes their mind." },
      { kind: "p", text: "A deposit fixes that. Not because you do not trust them. Because your schedule is worth something." },
      {
        kind: "steps",
        title: "How to say it",
        items: [
          { title: "Tie it to the date.", text: "\"A deposit holds your spot on the schedule.\"" },
          { title: "Put it in writing.", text: "On the bid, before they say yes. Not after." },
          { title: "Make it easy to pay.", text: "Card, transfer or a check at the walk. One step, however you take money." },
          { title: "Set the rest in stages.", text: "Some when you start. The balance when you finish and they have walked it." },
        ],
      },
      { kind: "callout", text: "A landowner who is serious about the job rarely minds a deposit. The ones who balk were not ready." },
      { kind: "p", text: "See what slow pay is costing you right now, and what a deposit rule would change." },
    ],
    cta: { label: "Run my invoice math", href: contractorToolLink(26, TOOLS.slowPay.slug), lead: "What slow pay costs you" },
    tool: TOOLS.paymentPlan,
    next: "Tomorrow: exactly how we work, start to finish.",
  },
  {
    day: 27,
    subject: "🛠️ How we work, start to finish",
    preheader: "What happens after you pick up the phone, plainly.",
    kicker: "The process",
    headline: "How we work, start to finish",
    hero: { src: IMG("day27-process.jpg"), alt: "Four steps: a twenty minute call, a straight answer, the build, and the follow up" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "You have been reading these for almost four weeks. Here is exactly what happens if you pick up the phone." },
      {
        kind: "steps",
        items: [
          { title: "A twenty minute call.", text: "Your work, your area, your equipment, and the jobs you want more of." },
          { title: "A straight answer.", text: "If it is a fit, I tell you what I would build and what it costs. If it is not, I tell you that too." },
          { title: "We build it.", text: "The website, the job site video, the ads and the inquiry form, around your jobs and your area." },
          { title: "We organize the follow up.", text: "So you keep running the business while inquiries move toward a quote and a decision." },
        ],
      },
      { kind: "callout", text: "We start with the projects you want, your service area and your capacity. Not with a package." },
      { kind: "p", text: "What it costs depends on what you already have and what you need built. You get a straight number on the call, not a guess in an email." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(27), lead: "Start with twenty minutes" },
    next: "Tomorrow: what one inquiry is worth to you, with round numbers first.",
  },
  {
    day: 28,
    subject: "🧮 What is one inquiry worth to you?",
    preheader: "Illustrative arithmetic only. Then run your real numbers.",
    kicker: "Know your numbers",
    headline: "What one inquiry is worth, before you spend a dollar",
    hero: { src: IMG("day28-math.jpg"), alt: "Illustrative arithmetic: a $6,000 average job and 1 in 3 serious inquiries closing is $2,000 per inquiry" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Illustrative arithmetic only. Round numbers, so you can see how the math works." },
      {
        kind: "stats",
        items: [
          { value: "$6,000", label: "Average job, example" },
          { value: "1 in 3", label: "Serious inquiries that become a job, example" },
          { value: "$2,000", label: "Revenue per serious inquiry" },
        ],
        note: "Illustrative arithmetic only. Round numbers to show the math. Not a client result and not Scott's numbers. Not a promise of what yours will do.",
      },
      { kind: "p", text: "That $2,000 is revenue, not profit. Take out your costs and you know the most you can pay for one serious inquiry and still come out ahead." },
      { kind: "callout", text: "Your numbers are the only ones that matter: your average job, your margin and your close rate." },
      { kind: "p", text: "The ad budget planner works backward from the jobs you want. The lead value calculator tells you what one inquiry is worth to you." },
    ],
    cta: { label: "Plan my ad budget", href: contractorToolLink(28, TOOLS.adBudget.slug), lead: "Work backward from the jobs you want" },
    tool: TOOLS.customerValue,
    next: "Tomorrow: Scott's case file, one more time, with everything you know now.",
  },
  {
    day: 29,
    subject: "🗂️ Scott's case file, one more time",
    preheader: "One real month, read with four weeks of field notes.",
    kicker: "Case file · O-L Guy Farms",
    headline: "Read it again with a month of field notes",
    hero: {
      src: IMG("day29-recap.jpg"),
      alt: "Play Scott's video: Scott and Ryan talking in the tractor cab",
      href: contractorLink(29, CONTRACTOR_LANDING_PATH, "scott"),
    },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "Four weeks ago I showed you Scott's month. Here it is again, with everything we have covered since." },
      {
        kind: "steps",
        title: "What you can see in it now",
        items: [
          { title: "The form screened the job.", text: "The landowner said what the project was and how far out, before Scott drove anywhere." },
          { title: "The call was easy.", text: "When Scott called back, they already knew who he was and what he was calling about." },
          { title: "One job opened a door.", text: "They have talked about maybe having him back for more work." },
          { title: "Real video did the introducing.", text: "Scott, on his own ground, in his own words." },
        ],
      },
      { kind: "quote", text: "At the end of the day, the profit margin is roughly $4,500, give or take a little bit.", who: SCOTT },
      { kind: "stats", items: [...SCOTT_STATS], note: SCOTT_NUMBERS_NOTE },
      { kind: "callout", text: "One business, one month. Yours will look different. The pieces are the same." },
    ],
    cta: { label: "Watch Scott tell it", href: contractorLink(29, CONTRACTOR_LANDING_PATH, "scott"), lead: "Hear it from Scott" },
    next: "Tomorrow: one month in, and what happens from here.",
  },
  {
    day: 30,
    subject: "📅 One month in. Here is what happens next.",
    preheader: "Field notes every two days from here, and one open door.",
    kicker: "One month",
    headline: "Thirty days of field notes. Your move.",
    hero: { src: IMG("day30-month.jpg"), alt: "A month of days checked off, and the notes coming every two days from here" },
    blocks: (first) => [
      { kind: "p", text: hi(first) },
      { kind: "p", text: "A month ago you raised your hand about growing your business. You have had thirty field notes from me since." },
      { kind: "p", text: "From here they come every two days. Same idea: one thing you can use on your next job." },
      {
        kind: "checks",
        title: "Pick up the phone if",
        tone: "yes",
        items: [
          "You run an established outfit and want more of the jobs worth moving your equipment for.",
          "You have room on the schedule, or you will soon.",
          "You want a straight answer on what it would take and what it costs.",
        ],
      },
      { kind: "callout", text: "Twenty minutes. Your jobs, your area, your numbers. You leave with the next practical step whether you hire me or not." },
      { kind: "p", text: "If now is not the time, stay on the list. And if you want these to stop, one click at the bottom does it." },
    ],
    cta: { label: "Pick a time, I call you", href: contractorBookingLink(30), lead: "Twenty minutes, straight answers" },
    // Day 32 (the next send) must pick this up: the jobs worth saying no to.
    next: "In two days: the jobs worth saying no to.",
  },
];

/**
 * The days cleared to send. Launch (Oct 2, 2026): the instant welcome plus
 * days 1 to 3; Ryan cleared the rest of the series the same day ("yes to
 * all, finish all tasks"), so each batch goes live as it is written.
 * Live now: days 1 to 30. Next batch: 32 to 60 (day 32 picks up day 30's
 * teaser, the jobs worth saying no to).
 */
export const CONTRACTOR_LIVE_DAYS: ReadonlySet<number> = new Set(
  Array.from({ length: 30 }, (_, i) => i + 1),
);

/** The emails that can send, in day order. */
export const CONTRACTOR_EMAILS: ContractorEmail[] = CONTRACTOR_WRITTEN.filter((email) =>
  CONTRACTOR_LIVE_DAYS.has(email.day),
);

export type ContractorStep = ContractorEmail & { step: number };

/** The approved emails with their step numbers. Only these can ever send. */
export const CONTRACTOR_STEPS: ContractorStep[] = CONTRACTOR_EMAILS.map((email) => ({
  ...email,
  step: contractorStepForDay(email.day),
}));

/** Every approved step at or before this age, oldest first. Used to catch a lead up. */
export function contractorStepsDueBy(ageInDays: number): ContractorStep[] {
  return CONTRACTOR_STEPS.filter((s) => s.day <= ageInDays);
}

/** The inbox line. With no first name, "{first}, your..." becomes "Your...". */
export function contractorSubject(email: ContractorEmail, first: string): string {
  const name = first.trim();
  if (name) return email.subject.replace("{first}", name);
  return email.subject.replace(/\{first\},?\s*(\S)/, (_m, c: string) => c.toUpperCase());
}

/** The plain text part: the same words, for clients that strip HTML. */
export function contractorPlainText(email: ContractorEmail, first: string, unsubUrl?: string | null): string {
  const lines: string[] = [];
  for (const block of email.blocks(first)) {
    switch (block.kind) {
      case "p":
      case "callout":
        lines.push(block.text, "");
        break;
      case "quote":
        lines.push(`"${block.text}"`, block.who, "");
        break;
      case "stats":
        for (const s of block.items) lines.push(`${s.value}: ${s.label}`);
        lines.push(block.note, "");
        break;
      case "steps":
        if (block.title) lines.push(`${block.title}:`);
        block.items.forEach((item, i) => lines.push(`${i + 1}. ${item.title}${item.text ? ` ${item.text}` : ""}`));
        lines.push("");
        break;
      case "checks":
        lines.push(`${block.title}:`);
        for (const item of block.items) lines.push(`${block.tone === "yes" ? "Yes" : "No"}: ${item}`);
        lines.push("");
        break;
    }
  }
  lines.push(`${email.cta.label}: ${email.cta.href}`, "");
  if (email.tool) lines.push(`${email.tool.title}: ${contractorToolLink(email.day, email.tool.slug)}`, "");
  lines.push(`Call or text me: ${BUSINESS.phone.display}`, "");
  if (email.next) lines.push(email.next, "");
  lines.push("Ryan Nichols", "The LeadFlow Pro", "Longview, Texas");
  if (email.ps) lines.push("", `P.S. ${email.ps}`);
  if (unsubUrl) lines.push("", `Stop these emails, one click, no login: ${unsubUrl}`);
  return lines.join("\n");
}
