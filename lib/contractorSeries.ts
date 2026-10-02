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
    next: "Next: what a landowner looks for before they pick an outfit.",
    ps: "Not ready yet? Stay on the list. The next emails are field notes you can use whether we ever work together or not.",
  },
];

/**
 * The days Ryan cleared to send. Launch (Oct 2, 2026): the instant welcome
 * plus days 1 to 3; days 4 to 7 cleared the same day ("yes to all"). Add a
 * day here only after he approves it.
 */
export const CONTRACTOR_LIVE_DAYS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5, 6, 7]);

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
