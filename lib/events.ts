// Shared event/workshop logic: the database row shape, the date formatting the
// funnel and the confirmation page both use, the calendar file, and the
// long-form workshop content that is authored in code rather than in the
// database. Dates, price, capacity, venue and publish state all come from the
// database so the date can move without a deploy.

export type EventRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  internal_title: string | null;
  description: string | null;
  venue: string | null;
  city: string | null;
  address_line: string | null;
  address_visibility: "public" | "after_payment";
  starts_at: string | null;
  duration_minutes: number | null;
  timezone: string;
  price_usd: number | string;
  price_note: string | null;
  capacity: number | null;
  instructor_name: string;
  clinic_enabled: boolean;
  is_published: boolean;
  registration_closed: boolean;
  date_confirmed: boolean;
  cancellation_policy: string | null;
  recording_notice: string | null;
};

export type EventAvailability = {
  event_id: string;
  capacity: number | null;
  seats_taken: number;
  seats_remaining: number | null;
  sold_out: boolean;
  registration_open: boolean;
};

/** Every column the public funnel needs. Keeps the select lists honest. */
export const EVENT_PUBLIC_FIELDS =
  "id, slug, title, subtitle, internal_title, description, venue, city, address_line, " +
  "address_visibility, starts_at, duration_minutes, timezone, price_usd, price_note, " +
  "capacity, instructor_name, clinic_enabled, is_published, registration_closed, " +
  "date_confirmed, cancellation_policy, recording_notice";

export const REGISTRATION_STATUSES = [
  "pending",
  "paid",
  "attended",
  "no_show",
  "cancelled",
  "transferred",
  "refunded",
  "overbooked",
] as const;

export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** A seat is consumed only once it is paid for. */
export const SEAT_HOLDING_STATUSES: RegistrationStatus[] = ["paid", "attended", "no_show"];

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "Started, not paid",
  paid: "Paid seat",
  attended: "Attended",
  no_show: "No-show",
  cancelled: "Cancelled",
  transferred: "Transferred",
  refunded: "Refunded",
  overbooked: "Paid after sell-out — refund decision",
};

export function priceUsd(event: Pick<EventRow, "price_usd">): number {
  const value = Number(event.price_usd);
  return Number.isFinite(value) ? value : 0;
}

export function eventTimezone(event: Pick<EventRow, "timezone">): string {
  return event.timezone || "America/Chicago";
}

function partsIn(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const out: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) out[part.type] = part.value;
  return out;
}

export type EventWhen = {
  dateLabel: string;
  timeLabel: string;
  full: string;
  iso: string | null;
  endIso: string | null;
};

/**
 * Human date and time in the event's own timezone. Returns "Date to be
 * announced" rather than inventing one when the database has no date yet.
 */
export function formatEventWhen(
  event: Pick<EventRow, "starts_at" | "duration_minutes" | "timezone">,
): EventWhen {
  if (!event.starts_at) {
    return {
      dateLabel: "Date to be announced",
      timeLabel: "",
      full: "Date to be announced",
      iso: null,
      endIso: null,
    };
  }
  const tz = eventTimezone(event);
  const start = new Date(event.starts_at);
  const minutes = event.duration_minutes ?? 90;
  const end = new Date(start.getTime() + minutes * 60_000);

  const s = partsIn(start, tz);
  const e = partsIn(end, tz);
  const dateLabel = `${s.weekday}, ${s.month} ${s.day}, ${s.year}`;
  const timeLabel = `${s.hour}:${s.minute} ${s.dayPeriod} – ${e.hour}:${e.minute} ${e.dayPeriod} ${s.timeZoneName}`;

  return {
    dateLabel,
    timeLabel,
    full: `${dateLabel} · ${timeLabel}`,
    iso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function eventLocationLine(
  event: Pick<EventRow, "venue" | "city" | "address_line" | "address_visibility">,
  { includeAddress = false } = {},
): string {
  const parts = [event.venue, includeAddress ? event.address_line : null, event.city];
  return parts.filter(Boolean).join(" · ");
}

/** Whether the street address may appear on the public funnel. */
export function addressIsPublic(event: Pick<EventRow, "address_visibility">): boolean {
  return event.address_visibility === "public";
}

function icsEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function icsStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Calendar file for a confirmed seat. Location only carries the street address
 * when the event is set to show it publicly, or when the caller is a paid
 * attendee (the confirmation page passes includeAddress).
 */
export function buildEventIcs(
  event: EventRow,
  { includeAddress = false, url }: { includeAddress?: boolean; url: string },
): string | null {
  const when = formatEventWhen(event);
  if (!when.iso || !when.endIso) return null;

  const description = [
    event.subtitle ?? event.description ?? "",
    "",
    `Instructor: ${event.instructor_name}`,
    `Bring a laptop.`,
    url,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The LeadFlow Pro//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@theleadflowpro.com`,
    `DTSTAMP:${icsStamp(new Date().toISOString())}`,
    `DTSTART:${icsStamp(when.iso)}`,
    `DTEND:${icsStamp(when.endIso)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `LOCATION:${icsEscape(eventLocationLine(event, { includeAddress }))}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `URL:${icsEscape(url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// ------------------------------------------------------------ disclosures ---

/** Ryan's wording, used verbatim wherever the offer is mentioned. */
export const STANDS_ALONE_DISCLOSURE =
  "The workshop stands on its own. There is no obligation to buy anything else. " +
  "Optional implementation help is available after class for businesses that want it.";

export const DEFAULT_RECORDING_NOTICE =
  "This workshop is recorded for training and marketing. Cameras face the instructor and the screen. " +
  "If you would rather not appear on camera, tell us when you arrive and we will seat you out of frame. " +
  "Nothing you say is used in marketing without your written permission.";

export const DEFAULT_CANCELLATION_POLICY =
  "Seats are limited to the room. If you cannot make it, email us before the workshop and we will move " +
  "your seat to the next date or transfer it to someone else from your business.";

export const CHECKOUT_DISCLOSURES = [
  "Payment is processed by Stripe. The LeadFlow Pro never sees or stores your card number.",
  "Your seat is confirmed only after payment clears. Registering without paying does not hold a seat.",
  "One ticket admits one person. Bring your own laptop.",
] as const;

// -------------------------------------------------------- workshop content ---

export type AgendaBlock = {
  window: string;
  title: string;
  detail: string;
};

export type WorkshopContent = {
  /** Public hero headline. Falls back to the database title when absent. */
  kicker: string;
  promise: string;
  learn: { title: string; detail: string }[];
  agenda: AgendaBlock[];
  bring: string[];
  forYou: string[];
  notForYou: string[];
  clinic: { intro: string; points: string[] };
  instructor: string[];
  faq: { q: string; a: string }[];
};

const CHATGPT_WORKSHOP: WorkshopContent = {
  kicker: "Hands-on ChatGPT workshop",
  promise:
    "Ninety minutes, ten seats, and your own laptop open. You will leave knowing how to brief ChatGPT " +
    "like an operator, and you will watch a real business asset get built in front of you.",
  learn: [
    {
      title: "What Chat, Work, and Codex actually are",
      detail:
        "Plain English, no jargon. Which one you open for which job, and why most owners are using the " +
        "wrong one for the task in front of them.",
    },
    {
      title: "The difference a real brief makes",
      detail:
        "We run the same business task twice — once with a vague request, once with a proper operator " +
        "brief — and put the two results side by side on screen.",
    },
    {
      title: "How to build a business asset live",
      detail:
        "One idea turned into an offer, a landing page, a form, and a follow-up process while you watch, " +
        "with every prompt visible on the screen.",
    },
    {
      title: "Where AI belongs in your business first",
      detail:
        "Not everywhere. One place. You leave with a written first use case for your own company instead " +
        "of a list of tools you will never open again.",
    },
  ],
  agenda: [
    {
      window: "0–10 min",
      title: "Chat, Work, and Codex in plain English",
      detail: "What each one is for, in language a business owner uses, with no setup required to follow along.",
    },
    {
      window: "10–25 min",
      title: "The same task, two ways",
      detail:
        "One vague request. One operator brief. Same job, same tool, two very different results, compared on screen.",
    },
    {
      window: "25–45 min",
      title: "Build a real business asset, live",
      detail: "An idea becomes an offer, a landing page, a form, and a follow-up process, start to finish.",
    },
    {
      window: "45–65 min",
      title: "Your turn, laptops open",
      detail:
        "You apply the same framework to your own business while Ryan works the room and coaches over your shoulder.",
    },
    {
      window: "65–78 min",
      title: "One business mapped live",
      detail:
        "We map one attendee's business on screen and find where AI could save time, tighten follow-up, or " +
        "recover work that is being missed.",
    },
    {
      window: "78–88 min",
      title: "Questions and specific recommendations",
      detail: "Your questions, answered against your actual business, plus the next step for each person in the room.",
    },
    {
      window: "88–90 min",
      title: "Three ways to go from here",
      detail:
        "Use what you learned and build it yourself, come back for another workshop, or get implementation " +
        "help. All three are real answers.",
    },
  ],
  bring: [
    "A laptop, charged, with a charger",
    "A ChatGPT account — the free tier is enough to follow along",
    "One real business problem you actually want solved",
    "Your business name and what you sell",
  ],
  forYou: [
    "Owners and operators who run a real business in East Texas",
    "Beginners who have opened ChatGPT, felt underwhelmed, and quit",
    "People who already use it a little and want to use it properly",
    "Anyone who would rather build one working thing than watch ten more videos",
  ],
  notForYou: [
    "People looking for a get-rich-with-AI scheme",
    "Anyone hoping to watch instead of work — this is hands-on",
    "Developers looking for a deep technical course",
    "Anyone who wants Claude, Claude Code, or agent tooling — that is a separate advanced workshop",
  ],
  clinic: {
    intro:
      "An optional 30-minute AI Business Clinic runs right after the 90 minutes. Stay if you want it, leave if you don't.",
    points: [
      "Every attendee submits one business bottleneck before class",
      "Every attendee leaves with a Next Move card: one use case, one tool, one next action",
      "Two businesses get a 12-minute live hot seat in front of the room",
      "The last six minutes pull out the lessons that apply to everyone",
    ],
  },
  instructor: [
    "Ryan Nichols runs The LeadFlow Pro out of East Texas, building the systems behind small businesses — " +
      "websites, CRMs, forms, follow-up, payments, and the automation that connects them.",
    "He is not teaching AI theory. He is teaching the way he actually works: brief the tool like an operator, " +
      "build the asset, wire the follow-up, and move on to the next thing.",
    "You will watch him do it live, on a real business, with every prompt on the screen.",
  ],
  faq: [
    {
      q: "Do I need to know anything about AI?",
      a: "No. We start at what the tools are and why they exist. If you can use email, you can keep up.",
    },
    {
      q: "Is the free version of ChatGPT enough?",
      a: "Yes for the workshop. We will point out where the paid tier does more, but nothing in class requires it.",
    },
    {
      q: "Is this a sales presentation?",
      a:
        "No. " + STANDS_ALONE_DISCLOSURE,
    },
    {
      q: "What if I can't make it?",
      a: "Email us before the workshop and we will move your seat to the next date or transfer it to someone else from your business.",
    },
    {
      q: "Why only ten seats?",
      a: "Because you get coached individually while you work. Past ten, that stops being possible in 90 minutes.",
    },
    {
      q: "What about Claude or other AI tools?",
      a: "This workshop is ChatGPT only, on purpose. Claude and the agent tooling get their own advanced workshop later.",
    },
    {
      q: "Will it be recorded?",
      a: "Yes, for training and marketing. Cameras face the instructor and the screen, and you can ask to be seated out of frame.",
    },
  ],
};

const WORKSHOP_CONTENT: Record<string, WorkshopContent> = {
  "chatgpt-for-business-owners-longview": CHATGPT_WORKSHOP,
};

/** Long-form funnel content for a slug, or null for a plain database event. */
export function workshopContent(slug: string): WorkshopContent | null {
  return WORKSHOP_CONTENT[slug] ?? null;
}
