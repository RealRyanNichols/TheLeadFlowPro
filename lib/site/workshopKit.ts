// The workshop kit: everything a live event needs beyond the SITE_EVENTS
// entry and the database row, keyed by event slug.
//
// A new workshop is: one SITE_EVENTS entry (lib/site/events.ts), one kit
// entry here (copy KIT_TEMPLATE), one events row in the admin (date, price,
// capacity, address), and one catalog entry. Then `npm run workshop:check`.
// No page is rebuilt. The date, price, and seat count never appear in kit
// copy: pages read them from the event and the database row.
//
// Leaf module: imports only prices, so the follow-up drafts and the pages
// can both read it without a cycle.

import { PRICES, usd } from "./prices";

export type DayTwoOffer = "content_engine" | "website_launch";

export type WorkshopKit = {
  slug: string;
  /** Page <title> and description for the registration page. No date: the row carries it. */
  metadata: { title: string; description: string };
  registration: {
    eyebrow: string;
    intro: string;
    /** "What your ticket includes" */
    includes: string[];
    /** The bring line under the includes. */
    bringLine: string;
    /** Where the "Workshop details" link points. Null means the /events page. */
    detailsUrl: string | null;
  };
  /** Printed on the private paid-attendee page. */
  prep: { title: string; items: string[] };
  /** The worksheet the room works from, rendered at /events/<slug>/worksheet. */
  worksheet: {
    title: string;
    intro: string;
    sections: { heading: string; prompt: string; lines: number }[];
  };
  followUp: {
    /** Which offer the day-2 email points at. */
    dayTwoOffer: DayTwoOffer;
    /** The recap line the day-2 email opens with, after the date. */
    recapLead: string;
    /** The three things the day-2 email lists. Exactly three. */
    recap: [string, string, string];
  };
};

export const DAY_TWO_OFFERS: Record<DayTwoOffer, { name: string; price: string; path: string; pitch: string }> = {
  content_engine: {
    name: "Free Website + Content Engine",
    price: usd(PRICES.freeBuildContentEngine),
    path: "/free-build",
    pitch:
      "Two weeks of content for your business, written around one offer, plus the five-page website with no build fee if you qualify. It is the same process we ran in the room, done for you.",
  },
  website_launch: {
    name: "Website Launch",
    price: usd(PRICES.websiteLaunchTotal),
    path: "/packages/launch",
    pitch: `Five pages, one clear next step for the customer, and the follow-up wired behind it. ${usd(PRICES.websiteLaunchDeposit)} to start, the rest after you approve the working site.`,
  },
};

const CHATGPT_LONGVIEW: WorkshopKit = {
  slug: "chatgpt-for-business-owners-longview",
  metadata: {
    title: "ChatGPT for Business Owners: Live in Longview | The LeadFlow Pro",
    description: "Bring one real business task and practice a useful process. Review the workshop page for current event and registration details.",
  },
  registration: {
    eyebrow: "LIVE BUSINESS WORKSHOP",
    intro: "Bring one real task. Build a process you can use again. Beginners welcome.",
    includes: [
      "A live, guided working session with Ryan",
      "One repeatable process for your own task",
      "Preparation checklist and private arrival details",
      "A written next step to use after the workshop",
    ],
    bringLine: "Bring your laptop, charger, and access to your own ChatGPT account. Use fictional or anonymized customer details.",
    detailsUrl: "https://workshop.theleadflowpro.com/",
  },
  prep: {
    title: "Before you arrive",
    items: [
      "Charge your laptop and bring the charger.",
      "Sign in to your own ChatGPT account before class. The free tier is enough.",
      "Pick one real task from your business that you do every week and would like to do faster.",
      "Bring fictional or anonymized customer details. No real customer data on screen.",
      "Arrive ten minutes early. Arrival instructions are on this page.",
    ],
  },
  worksheet: {
    title: "Workshop worksheet",
    intro: "One task, one brief, two runs. Fill this in during class and keep it. The second run is where it sticks.",
    sections: [
      { heading: "The task", prompt: "The one thing you do every week that you brought tonight, in a sentence.", lines: 3 },
      { heading: "The brief", prompt: "Business name, who buys, the offer, and the one action you want the reader to take.", lines: 6 },
      { heading: "First run", prompt: "What came back with a vague request. What was generic about it.", lines: 4 },
      { heading: "Second run", prompt: "What came back with the brief. What changed.", lines: 4 },
      { heading: "Where AI belongs first", prompt: "One place in your business, not a list of tools.", lines: 3 },
      { heading: "Friday", prompt: "The version of this task you will run again before Friday is over.", lines: 3 },
    ],
  },
  followUp: {
    dayTwoOffer: "content_engine",
    recapLead: "because the same three things showed up at every table:",
    recap: [
      "The first draft was generic because the brief was generic. Business name, buyer, offer, and the one action you want. That fixed most of it.",
      "The second run was better than the first. Every time. Save the brief and run it again.",
      "The follow-up was the piece nobody had time for. That is the part worth handing off.",
    ],
  },
};

/** Copy this for the next event. Every string is a placeholder to replace, and the check script refuses it as is. */
export const KIT_TEMPLATE: WorkshopKit = {
  slug: "replace-with-event-slug",
  metadata: { title: "Workshop title | The LeadFlow Pro", description: "One sentence on what the room practices. No date, price, or seat count." },
  registration: {
    eyebrow: "LIVE BUSINESS WORKSHOP",
    intro: "Bring one real task. Build a process you can use again. Beginners welcome.",
    includes: ["A live, guided working session with Ryan", "One repeatable process for your own task", "Preparation checklist and private arrival details", "A written next step to use after the workshop"],
    bringLine: "Bring your laptop, charger, and the account the class uses. Use fictional or anonymized customer details.",
    detailsUrl: null,
  },
  prep: { title: "Before you arrive", items: ["Charge your laptop and bring the charger.", "Sign in to the account the class uses before you arrive.", "Pick one real task from your business."] },
  worksheet: {
    title: "Workshop worksheet",
    intro: "One task, one brief, two runs.",
    sections: [
      { heading: "The task", prompt: "In a sentence.", lines: 3 },
      { heading: "The brief", prompt: "Who, what, and the one action.", lines: 6 },
      { heading: "Second run", prompt: "What changed.", lines: 4 },
    ],
  },
  followUp: { dayTwoOffer: "content_engine", recapLead: "because the same three things showed up at every table:", recap: ["Replace with the first thing.", "Replace with the second thing.", "Replace with the third thing."] },
};

export const WORKSHOP_KITS: readonly WorkshopKit[] = [CHATGPT_LONGVIEW];

export function workshopKit(slug: string): WorkshopKit | null {
  return WORKSHOP_KITS.find((k) => k.slug === slug) ?? null;
}

/** A plain database event with no kit still renders: generic copy, no worksheet link. */
export function workshopKitOrDefault(slug: string): WorkshopKit {
  return workshopKit(slug) ?? { ...KIT_TEMPLATE, slug, worksheet: { ...KIT_TEMPLATE.worksheet, sections: [] } };
}

export function worksheetPath(slug: string): string {
  return `/events/${slug}/worksheet`;
}

/** Strings a kit must not contain: dates, prices, and seat counts live on the event row. */
export function kitCopyProblems(kit: WorkshopKit): string[] {
  const problems: string[] = [];
  const strings: string[] = [
    kit.metadata.title,
    kit.metadata.description,
    kit.registration.eyebrow,
    kit.registration.intro,
    ...kit.registration.includes,
    kit.registration.bringLine,
    kit.prep.title,
    ...kit.prep.items,
    kit.worksheet.title,
    kit.worksheet.intro,
    ...kit.worksheet.sections.flatMap((s) => [s.heading, s.prompt]),
    kit.followUp.recapLead,
    ...kit.followUp.recap,
  ];
  for (const s of strings) {
    if (/\$\d/.test(s)) problems.push(`price in kit copy: "${s}"`);
    if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\b/i.test(s)) problems.push(`date in kit copy: "${s}"`);
    if (/\b\d{1,2}:\d{2}\s?(am|pm)\b/i.test(s)) problems.push(`time in kit copy: "${s}"`);
    if (/\b(ten|\d+)\s+(paid\s+)?seats?\b/i.test(s)) problems.push(`seat count in kit copy: "${s}"`);
    if (/guarantee|#1|best in|ranked/i.test(s)) problems.push(`banned claim in kit copy: "${s}"`);
    if (/[—–]/.test(s)) problems.push(`dash in kit copy: "${s}"`);
    if (/replace with|replace-with/i.test(s)) problems.push(`placeholder left in kit copy: "${s}"`);
  }
  if (kit.worksheet.sections.length < 3) problems.push("worksheet needs at least three sections");
  if (kit.prep.items.length < 3) problems.push("prep checklist needs at least three items");
  return problems;
}
