// Curated collections.
//
// A collection is a real page with real editorial content, not a filter with a
// URL. Thin programmatic pages built from a taxonomy value are exactly what
// search engines are supposed to ignore, and they would be useless to a human
// too, so a collection only exists here when somebody has written who it serves,
// what usually goes wrong for them, and why these specific tools help.
//
// The rule enforced in tests: a published collection must resolve to at least
// MIN_TOOLS published tools and must carry its own intro, problems and FAQs.

import { TOOLS } from "./index";
import { TOOL_RELEVANCE, relevanceTier } from "./relevance";
import type { Tool } from "./types";
import type { Audience, Domain, Goal, Industry, ToolType } from "./taxonomy";

export const MIN_TOOLS = 6;

/**
 * An industry collection must also have at least this many tools that are core
 * or secondary for the work. A page held up entirely by the broadly useful
 * pile is a filter pretending to be a collection.
 */
export const MIN_PROPER_TOOLS = 3;

/** The broadly useful section shows this many; the rest live at /tools. */
export const BROAD_SECTION_CAP = 12;

export type CollectionFilter = {
  industries?: Industry[];
  audiences?: Audience[];
  goals?: Goal[];
  domains?: Domain[];
  toolTypes?: ToolType[];
  /** Tools pinned to the front, in this order. */
  lead?: string[];
};

export type Collection = {
  slug: string;
  /** The page H1. */
  title: string;
  /** Short label for chips and cards. */
  short: string;
  /** One line, used on the directory and in the meta description. */
  hook: string;
  /** Two or three sentences of real intro copy. */
  intro: string;
  /** Who this collection is for. */
  serves: string;
  /** The problems this group actually has. */
  problems: string[];
  faqs: { q: string; a: string }[];
  filter: CollectionFilter;
  /** Which LeadFlow service this group needs, in one honest sentence. */
  cta: string;
  kind: "industry" | "audience" | "goal" | "type";
};

export const COLLECTIONS: Collection[] = [
  {
    slug: "home-services",
    title: "Free tools for home services and trades",
    short: "Home services and trades",
    hook: "Quote it right, answer the phone, and stop bleeding margin on drive time.",
    intro:
      "Trades businesses lose money in three places: the calls nobody answered, the jobs that were quoted from memory, and the hours spent driving instead of working. These tools put a number on all three. Every one of them runs here, free, and you can put any of them on your own site.",
    serves:
      "Roofers, plumbers, electricians, HVAC companies, landscapers, painters, remodelers, cleaners, pest control and general contractors.",
    problems: [
      "The phone rings while you are on a ladder and the caller hires whoever picks up.",
      "Jobs get quoted off a gut feeling, then the margin disappears in materials and waste.",
      "Nobody knows what an hour of shop time actually has to be worth to cover overhead.",
      "Estimates go out and never get followed up, so the work sits on a desk.",
    ],
    faqs: [
      { q: "Do I need to sign up to use these?", a: "No. Every tool runs in your browser and gives you the answer on the spot. You can download or print the result without giving up an email address." },
      { q: "Can I put one of these on my own website?", a: "Yes, all of them. Each tool page has a one line embed snippet. I host it and keep it working, and it stays free." },
      { q: "Are the numbers accurate?", a: "The math is accurate. The answer is only as good as what you type in, so use your own costs rather than the starting values, and read the assumptions shown under every result." },
    ],
    filter: {
      industries: ["general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping", "pest-control", "cleaning", "remodeling", "painting", "flooring", "concrete", "handyman", "pool-service"],
      lead: ["missed-call-calculator", "job-price-calculator", "hourly-rate-calculator", "quote-follow-up-calculator"],
    },
    cta: "If the missed call number surprised you, that is the first thing worth fixing, and it is not a website problem, it is a system problem.",
    kind: "industry",
  },

  {
    slug: "real-estate",
    title: "Free tools for realtors and real estate teams",
    short: "Realtors and real estate",
    hook: "Speed to lead, commission math, and the follow-up that decides who gets the listing.",
    intro:
      "Portal leads go to several agents at the same moment, so the calculators that matter most here are the ones about answering first. The rest are about knowing what a lead is actually worth before you pay for it.",
    serves: "Agents, brokers, team leads and transaction coordinators.",
    problems: [
      "Leads arrive while you are showing a property and go cold before the end of the day.",
      "Portal lead costs keep rising with no clear view of what a lead is worth.",
      "Commission splits and expenses eat more of the cheque than expected.",
      "Follow-up stops after two attempts, which is where most of the business is.",
    ],
    faqs: [
      { q: "Do these work for a team or just a single agent?", a: "Both. The lead and commission tools take your own volume and split, so a solo agent and a team lead get useful answers from the same calculator." },
      { q: "Can I share a result with a client?", a: "Yes. Print or save the result as a PDF, or copy it as text. Nothing you type is uploaded, so a client's numbers stay on your machine." },
    ],
    filter: {
      industries: ["real-estate"],
      lead: ["lead-response-time", "commission-calculator", "lead-value-calculator", "missed-call-calculator"],
    },
    cta: "If your leads are going cold before you see them, the fix is instant follow-up that runs whether or not you are holding your phone.",
    kind: "industry",
  },

  {
    slug: "mortgage-lending",
    title: "Free tools for mortgage lenders and loan officers",
    short: "Mortgage and lending",
    hook: "Rate shoppers call four lenders. These are the numbers that decide whether you are the one who funds it.",
    intro:
      "A mortgage enquiry is shopped harder and goes cold faster than almost any other lead. These tools cover what an application is worth, what a missed call costs, what your marketing can afford to pay, and the loan math you run all day.",
    serves: "Loan officers, branch managers, mortgage brokers and lending teams.",
    problems: [
      "Rate enquiries come in and get returned hours later, by which point the borrower has applied elsewhere.",
      "Lead costs are high and the funded rate is low, so the economics are easy to get wrong.",
      "Commission and pull-through get talked about in feel rather than in numbers.",
    ],
    faqs: [
      { q: "Are these loan calculators regulated advice?", a: "No. They are estimates for planning and none of them is a quote, a pre-approval or a commitment to lend. Every one carries that disclaimer on the page, and real terms come from underwriting." },
      { q: "Do you store what I type?", a: "No. The calculators run in your browser. Nothing is transmitted, stored or put into a shareable link." },
    ],
    filter: {
      industries: ["mortgage-lending"],
      lead: ["loan-payment-calculator", "lead-response-time", "lead-value-calculator", "missed-call-calculator"],
    },
    cta: "If rate calls are going to voicemail, the answer is an instant text back and a follow-up sequence that does not depend on anyone remembering.",
    kind: "industry",
  },

  {
    slug: "restaurants-and-food",
    title: "Free tools for restaurants, bars and food businesses",
    short: "Restaurants and food",
    hook: "Plate cost, delivery fees, no-shows and the break-even number nobody wants to look at.",
    intro:
      "Food businesses run on percentages, and the percentages move every week. These tools cover the ones that decide whether a busy night was actually profitable, plus the delivery platform take rate that quietly removes a third of the ticket.",
    serves: "Restaurant owners, bar and taproom operators, food trucks, caterers and coffee shops.",
    problems: [
      "Delivery platform commission takes a share of every order that never shows up on the menu.",
      "Plate costs drift as supplier prices move and nobody reprices the menu.",
      "The phone rings through the dinner rush and reservations get lost.",
      "Break-even gets estimated rather than calculated, so a slow month is a surprise.",
    ],
    faqs: [
      { q: "Which one should I run first?", a: "The platform fee calculator, if you take orders through a delivery app. It is usually the largest single number on this page." },
      { q: "Can I print a result for a manager meeting?", a: "Yes. Print or save as PDF from any tool. The sheet includes what you entered and the assumptions behind the answer." },
    ],
    filter: {
      industries: ["restaurant", "food-truck", "catering", "bar", "coffee-shop"],
      lead: ["platform-fee-calculator", "profit-margin-calculator", "break-even-calculator", "credit-card-fee-calculator"],
    },
    cta: "If most of your orders arrive through somebody else's app, the work worth doing is building a direct ordering path you own.",
    kind: "industry",
  },

  {
    slug: "salons-and-barbers",
    title: "Free tools for salons, barbers and beauty businesses",
    short: "Salons and barbers",
    hook: "Chair time is the whole product, so a no-show is not a small problem.",
    intro:
      "In a salon the inventory is hours in a chair, and an hour that goes empty cannot be sold later. These tools cover no-shows, client lifetime value, service pricing and the review flow that keeps new clients coming.",
    serves: "Salon owners, barbers, nail technicians, estheticians, massage therapists and booth renters.",
    problems: [
      "A cancelled colour appointment is three hours nobody can rebook at short notice.",
      "Service prices go years without moving while product and rent go up.",
      "Booking calls come in during services and go to voicemail.",
      "Reviews decide who walks in, and nobody has a routine for asking.",
    ],
    faqs: [
      { q: "Does the no-show tool account for the time as well as the money?", a: "Yes. It counts the lost service revenue and the wasted hours separately, because those are two different costs and owners usually only think about the first." },
      { q: "Can I use the cancellation policy text as is?", a: "Use it as a starting draft. It has to be somewhere clients agree to it before booking, and a policy nobody was told about in advance is very hard to enforce." },
    ],
    filter: {
      industries: ["hair-salon", "nail-salon", "barbershop", "spa", "massage"],
      lead: ["no-show-calculator", "customer-lifetime-value", "cancellation-policy-generator", "google-review-link"],
    },
    cta: "If the chair sits empty because a text never went out, that is an automation problem, and it is a cheap one to fix.",
    kind: "industry",
  },

  {
    slug: "medical-and-dental-operations",
    title: "Free operations tools for medical and dental practices",
    short: "Medical and dental front office",
    hook: "Front office and scheduling maths. No clinical tools, and no patient information ever.",
    intro:
      "These are practice operations tools: schedule fill, no-show impact, patient lifetime value, phone coverage and review flow. None of them diagnose, treat, or advise on care, and none of them ask for anything about a patient. Everything you type stays in your browser.",
    serves: "Practice managers, office administrators, dentists, physicians and front desk teams.",
    problems: [
      "Empty hygiene and follow-up slots still cost the full staffed hour.",
      "The phone rings during clinic and new patient calls go to voicemail.",
      "A new patient is worth years of visits, but acquisition gets judged on one appointment.",
      "Reviews decide which practice a new patient calls first.",
    ],
    faqs: [
      { q: "Is any of this clinical?", a: "No. Every tool here is scheduling, staffing or front office maths. Nothing here diagnoses or treats anything, and it must never be used for a clinical decision." },
      { q: "Can I enter patient details?", a: "No, and there is nowhere to. Do not type names, dates of birth or record numbers into any tool on this site. These calculators take counts and dollar amounts only." },
      { q: "Is this HIPAA compliant?", a: "That question does not apply, because these tools do not collect, transmit or store health information of any kind. They run in your browser. We make no compliance claim, because no system here has been formally assessed for one." },
    ],
    filter: {
      industries: ["medical-practice", "dental-practice", "veterinary", "behavioral-health"],
      lead: ["no-show-calculator", "missed-call-calculator", "customer-lifetime-value", "capacity-calculator"],
    },
    cta: "If new patient calls are hitting voicemail during clinic, the fix is coverage that works without adding a person at the desk.",
    kind: "industry",
  },

  {
    slug: "legal-practices",
    title: "Free operations tools for law firms",
    short: "Law firms",
    hook: "Intake speed, consultation no-shows and what a matter is actually worth.",
    intro:
      "An injured or arrested caller retains whoever answers. These are intake and practice operations tools, not legal research and not advice. Anything they generate is a working draft for a licensed attorney to review.",
    serves: "Solo attorneys, firm partners, office managers and intake coordinators.",
    problems: [
      "Intake calls arrive while everyone is in court and the caller retains the next firm on the list.",
      "Consultations get booked and then not attended, which is an hour of an attorney's day.",
      "Marketing spend gets judged without knowing what a signed matter is worth.",
    ],
    faqs: [
      { q: "Is anything here legal advice?", a: "No. Nothing on this site is legal advice, nothing creates an attorney-client relationship, and no tool here calculates a filing deadline. Jurisdiction rules vary and change, and only a licensed attorney in the relevant jurisdiction can apply them." },
      { q: "Can I use the generated wording in a client document?", a: "Treat it as a first draft to be reviewed and rewritten. It has not been checked against your jurisdiction, your practice area, or your professional conduct rules." },
    ],
    filter: {
      industries: ["legal"],
      lead: ["lead-response-time", "no-show-calculator", "lead-value-calculator", "missed-call-calculator"],
    },
    cta: "If intake is the leak, the fix is a front end that captures and routes the call whether or not anyone is at the desk.",
    kind: "industry",
  },

  {
    slug: "qr-codes-and-links",
    title: "Free QR code, link and social preview tools",
    short: "QR codes and links",
    hook: "Scannable codes, tap-to-call links and tracked URLs. PNG and SVG, print ready.",
    intro:
      "Every code here is generated in your browser, not by somebody else's server, so nothing you encode leaves your machine and a code inside an embed keeps working no matter what. You get the error correction level, the quiet zone, a contrast check, and both PNG and vector SVG download.",
    serves: "Anybody printing a sign, a menu, a flyer, a business card, a job site notice or a table tent.",
    problems: [
      "Codes get printed too small, too low contrast, or with no quiet zone, and then will not scan.",
      "Links go out with no tracking, so nobody knows which flyer or ad actually worked.",
      "The Wi-Fi password gets read out loud to every guest.",
      "A phone number on a website is typed by hand instead of tapped.",
    ],
    faqs: [
      { q: "Do these codes expire or need an account?", a: "No. These are static codes. The information is encoded directly into the pattern, so the code works forever and does not depend on this site staying up." },
      { q: "Why does the quiet zone matter?", a: "The blank margin around a code is what lets a scanner find its edges. Below about four modules, phones start failing to lock on, and a designer trimming that margin is the single most common reason a printed code does not work." },
      { q: "PNG or SVG?", a: "PNG for screens and office printing. SVG for anything a sign shop or printer produces, because it is vector and stays sharp at any size." },
    ],
    filter: {
      toolTypes: ["qr", "link"],
      lead: ["qr-code-maker", "google-review-link", "wifi-qr-code", "utm-link-builder"],
    },
    cta: "A code is only useful if the page behind it converts. That page is the part worth building properly.",
    kind: "type",
  },

  {
    slug: "getting-more-leads",
    title: "Free tools for getting and keeping more leads",
    short: "Getting more leads",
    hook: "Find the enquiries you are already losing before you spend another dollar on new ones.",
    intro:
      "Most businesses do not have a lead problem, they have a follow-up problem. Before buying more traffic, it is worth putting a number on the calls that went unanswered, the forms that went unreplied, and the quotes still sitting open.",
    serves: "Owners, sales people and anyone responsible for where the next job comes from.",
    problems: [
      "Calls go unanswered and nobody leaves a voicemail any more.",
      "Web form enquiries sit for hours while a competitor replies in five minutes.",
      "Quotes go out and follow-up stops after one attempt.",
      "Ad spend gets increased before the leaking bucket gets fixed.",
    ],
    faqs: [
      { q: "Where should I start?", a: "The missed call calculator. It is usually the largest and the cheapest to fix, and it costs nothing to find out." },
      { q: "Do I need my real numbers?", a: "Use your real ones. Pull your call log for the last seven days rather than guessing, because almost everyone guesses low." },
    ],
    filter: {
      goals: ["capture-leads", "improve-follow-up"],
      lead: ["missed-call-calculator", "lead-response-time", "quote-follow-up-calculator", "after-hours-lead-calculator"],
    },
    cta: "Every one of these leaks is closable with a system that answers, texts back and follows up without anybody remembering to.",
    kind: "goal",
  },

  {
    slug: "pricing-and-margin",
    title: "Free pricing and margin tools",
    short: "Pricing and margin",
    hook: "Set a price you can defend, and find out what discounting is really doing.",
    intro:
      "Underpricing rarely feels like a crisis, which is why it lasts for years. These tools work out what an hour has to be worth, what a job should cost, and what a routine ten percent discount does to the volume you need.",
    serves: "Owners, estimators and anyone who has to put a number in front of a customer.",
    problems: [
      "Rates were set years ago and never revisited while costs kept moving.",
      "Markup and margin get used interchangeably, which is an expensive mistake.",
      "Discounts get given without knowing how much extra volume they require.",
      "Overhead never makes it into the quoted price.",
    ],
    faqs: [
      { q: "What is the difference between markup and margin?", a: "Markup is measured on your cost. Margin is measured on the selling price. A 50 percent markup is a 33 percent margin, and treating them as the same number is how businesses price themselves out of profit." },
      { q: "Should overhead go into the hourly rate or the job price?", a: "Either, as long as it goes in once. The hourly rate tool builds it into the rate. The job price tool adds it as a percentage. Using both on the same job counts it twice." },
    ],
    filter: {
      goals: ["price-a-service", "quote-a-job"],
      lead: ["hourly-rate-calculator", "job-price-calculator", "markup-vs-margin", "discount-damage-calculator"],
    },
    cta: "Pricing is the fastest lever in any business, and it is the one that needs no extra traffic to work.",
    kind: "goal",
  },

  {
    slug: "website-and-online-presence",
    title: "Free website and online presence tools",
    short: "Website and online presence",
    hook: "Score the site, find the friction, and put a number on what slow costs.",
    intro:
      "A business website is either catching enquiries or losing them, and most owners have never been told which. These tools score what you have, price the gap, and generate the code and copy that fix the common problems.",
    serves: "Owners and managers responsible for a business website or a Google listing.",
    problems: [
      "The site loads slowly on a phone, which is where most visitors are.",
      "The contact form asks for more than it needs, so people abandon it.",
      "The Google Business Profile is half filled in and outranks the website anyway.",
      "Nobody knows what the organic traffic is actually worth.",
    ],
    faqs: [
      { q: "Do I need a developer to use the generated code?", a: "No. The schema, robots and button snippets are copy and paste into an HTML or custom code block. If you get stuck, text me and I will help you place it." },
      { q: "Is the website scorecard an audit?", a: "It is a structured self check, not a crawl of your site. It is fast and it will find the obvious gaps, but it does not replace someone actually looking at your site." },
    ],
    filter: {
      domains: ["websites-digital"],
      lead: ["website-grader", "google-business-profile-scorecard", "website-speed-money", "form-friction-calculator"],
    },
    cta: "A brochure site sits there. The alternative is a site that catches the enquiry, texts back and books the job, and you own it rather than rent it.",
    kind: "goal",
  },
];

/* --------------------------------- resolve --------------------------------- */

function matches(tool: Tool, f: CollectionFilter): boolean {
  if (f.industries?.length && !f.industries.some((i) => tool.industries.includes(i))) return false;
  if (f.audiences?.length && !f.audiences.some((a) => tool.audiences.includes(a))) return false;
  if (f.goals?.length && !f.goals.some((g) => tool.goals.includes(g))) return false;
  if (f.domains?.length && !f.domains.includes(tool.domain)) return false;
  if (f.toolTypes?.length && !f.toolTypes.includes(tool.toolType)) return false;
  return true;
}

/** The tools in a collection, with the pinned ones first. */
export function collectionTools(collection: Collection): Tool[] {
  const { lead = [] } = collection.filter;
  const all = TOOLS.filter((t) => matches(t, collection.filter));
  const pinned = lead
    .map((slug) => all.find((t) => t.slug === slug))
    .filter((t): t is Tool => Boolean(t));
  const rest = all
    .filter((t) => !pinned.some((p) => p.slug === t.slug))
    .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name));
  return [...pinned, ...rest];
}

/* --------------------------------- sections -------------------------------- */

// The generous `industries` list on a tool answers "could this ever help", and
// counting it is how an industry page ends up claiming seventy tools. The
// sections below are the honest reading: only core and secondary tools count
// as the collection proper, and the broadly useful pile is shown as exactly
// that, clearly labeled and never in the headline number.

export type CollectionSection = {
  id: "start-here" | "built-for-this" | "sales-follow-up" | "money-operations" | "web-presence" | "broadly-useful";
  title: string;
  tools: Tool[];
};

const SECTION_TITLES: Record<CollectionSection["id"], string> = {
  "start-here": "Start here",
  "built-for-this": "Built specifically for this work",
  "sales-follow-up": "Sales and follow-up",
  "money-operations": "Money and operations",
  "web-presence": "Website and local presence",
  "broadly-useful": "Broadly useful tools",
};

const SALES_GOALS: Goal[] = ["capture-leads", "improve-follow-up"];
const MONEY_GOALS: Goal[] = ["make-money", "save-money", "price-a-service", "quote-a-job", "save-time"];
const WEB_GOALS: Goal[] = ["check-a-website", "create-marketing", "share-information"];

type Tier = ReturnType<typeof relevanceTier>;

/** The strongest tier a tool earns across a collection's industries. */
function bestTier(slug: string, industries: Industry[]): Tier {
  let best: Tier = "none";
  for (const industry of industries) {
    const tier = relevanceTier(slug, industry);
    if (tier === "core") return "core";
    if (tier === "secondary") best = "secondary";
    else if (tier === "broad" && best === "none") best = "broad";
  }
  return best;
}

/**
 * The collection's tools split into the tools it may claim and the broadly
 * useful rest. Goal, type and domain collections already match honestly, so
 * everything they resolve is theirs to claim.
 */
function tierSplit(collection: Collection): { proper: Tool[]; broad: Tool[] } {
  const all = collectionTools(collection);
  const industries = collection.filter.industries || [];
  if (collection.kind !== "industry" || industries.length === 0) {
    return { proper: all, broad: [] };
  }
  const proper: Tool[] = [];
  const broad: Tool[] = [];
  for (const t of all) {
    const tier = bestTier(t.slug, industries);
    if (tier === "core" || tier === "secondary") proper.push(t);
    else if (tier === "broad") broad.push(t);
    // "none" tools are not shown at all. If nothing about a tool speaks to
    // this work, listing it anywhere on the page is the old inflation back.
  }
  return { proper, broad };
}

/** Which of the three goal sections a non-core tool reads most at home in. */
function goalSection(tool: Tool): "sales-follow-up" | "money-operations" | "web-presence" {
  if (tool.goals.some((g) => SALES_GOALS.includes(g))) return "sales-follow-up";
  if (tool.goals.some((g) => MONEY_GOALS.includes(g))) return "money-operations";
  if (tool.goals.some((g) => WEB_GOALS.includes(g))) return "web-presence";
  // None of the listed goals matched, so the domain decides.
  if (tool.domain === "sales-marketing") return "sales-follow-up";
  if (tool.domain === "websites-digital") return "web-presence";
  return "money-operations";
}

const relevancePriority = (t: Tool) => TOOL_RELEVANCE[t.slug]?.collectionPriority ?? 0;

/**
 * The collection page, sectioned. Pinned openers first, then what was built
 * for the work, then the strongly related tools grouped by what they do, then
 * the broadly useful pile under its own honest label. Empty sections are
 * omitted, so pages never render a heading over nothing.
 */
export function collectionSections(collection: Collection): CollectionSection[] {
  const { proper, broad } = tierSplit(collection);
  const industries = collection.filter.industries || [];
  const isIndustry = collection.kind === "industry" && industries.length > 0;

  // The pinned openers, but only the ones that earned a place in the count.
  const startHere = (collection.filter.lead || [])
    .map((slug) => proper.find((t) => t.slug === slug))
    .filter((t): t is Tool => Boolean(t))
    .slice(0, 4);

  const rest = proper.filter((t) => !startHere.some((s) => s.slug === t.slug));
  if (isIndustry) {
    rest.sort(
      (a, b) =>
        relevancePriority(b) - relevancePriority(a) ||
        b.popularity - a.popularity ||
        a.name.localeCompare(b.name),
    );
  }

  const grouped: Record<"built-for-this" | "sales-follow-up" | "money-operations" | "web-presence", Tool[]> = {
    "built-for-this": [],
    "sales-follow-up": [],
    "money-operations": [],
    "web-presence": [],
  };
  for (const t of rest) {
    if (isIndustry && bestTier(t.slug, industries) === "core") grouped["built-for-this"].push(t);
    else grouped[goalSection(t)].push(t);
  }

  const broadTools = [...broad]
    .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))
    .slice(0, BROAD_SECTION_CAP);

  const sections: CollectionSection[] = [
    { id: "start-here", title: SECTION_TITLES["start-here"], tools: startHere },
    { id: "built-for-this", title: SECTION_TITLES["built-for-this"], tools: grouped["built-for-this"] },
    { id: "sales-follow-up", title: SECTION_TITLES["sales-follow-up"], tools: grouped["sales-follow-up"] },
    { id: "money-operations", title: SECTION_TITLES["money-operations"], tools: grouped["money-operations"] },
    { id: "web-presence", title: SECTION_TITLES["web-presence"], tools: grouped["web-presence"] },
    { id: "broadly-useful", title: SECTION_TITLES["broadly-useful"], tools: broadTools },
  ];
  return sections.filter((s) => s.tools.length > 0);
}

/**
 * The number a page is allowed to claim. For an industry collection that is
 * core and secondary tools only; the broadly useful pile helps every industry
 * equally, so it counts for none of them. Other collection kinds keep their
 * full count, which was honest already.
 */
export function collectionCount(collection: Collection): number {
  return tierSplit(collection).proper.length;
}

/** Only collections with enough real tools behind them are routable or indexable. */
export const PUBLISHED_COLLECTIONS = COLLECTIONS.filter(
  (c) =>
    collectionTools(c).length >= MIN_TOOLS &&
    (c.kind !== "industry" || collectionCount(c) >= MIN_PROPER_TOOLS),
);

export function getCollection(slug: string): Collection | undefined {
  return PUBLISHED_COLLECTIONS.find((c) => c.slug === slug);
}

/** Collections a given tool belongs to, for the "see the whole collection" link. */
export function collectionsForTool(tool: Tool): Collection[] {
  return PUBLISHED_COLLECTIONS.filter((c) => collectionTools(c).some((t) => t.slug === tool.slug));
}
