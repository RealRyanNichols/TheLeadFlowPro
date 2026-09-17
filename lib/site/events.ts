// The featured event, as the public site markets it.
//
// The database `events` table is the authority for a published event's date,
// price, capacity, and publish state (see lib/events.ts and
// docs/workshop-operations.md). This module is the marketing layer on top:
// the one place the homepage banner, hero card, "03 / DO" card, the next-step
// chooser, the nurture cutoff, and the workshop subdomain feed read from.
//
// Status is a small state machine:
//
//   upcoming  -> the event is in the future and has seats
//   sold_out  -> in the future, no seats (live seat count from the database)
//   past      -> the room has closed; every surface swaps to recap framing,
//                a "get notified about the next workshop" list, and the free
//                starter lesson
//
// `status: "auto"` derives the state from the clock (and the live seat count
// when a server component passes it). Ryan can force the swap with ONE value
// change: set `status: "past"` on the featured event. Setting `nextEventRef`
// to another slug in SITE_EVENTS makes the past state advertise that date
// instead of the evergreen list.
//
// Leaf-ish module: only lib/site/prices.ts and lib/site/external-links.ts.
// Safe in middleware and client components.

import { EXTERNAL_LINKS } from "./external-links";
import { PRICES } from "./prices";

export type EventStatus = "upcoming" | "sold_out" | "past";
export type EventStatusOverride = "auto" | EventStatus;

export type SiteEvent = {
  /** Matches `events.slug` in the database. */
  slug: string;
  title: string;
  /** Uppercase kicker on the hero card. */
  kicker: string;
  /** Local start, ISO 8601 with the Central offset. */
  startsAt: string;
  /** The class itself. */
  durationMinutes: number;
  /** Optional time after the class (the AI Business Clinic). Counts toward "past". */
  afterMinutes: number;
  timezone: "America/Chicago";
  priceUsd: number;
  seats: number;
  city: string;
  venueLine: string;
  /** Registration page on this site. */
  registrationPath: string;
  /** The standalone funnel, when one exists for this event. */
  externalSiteUrl: string | null;
  status: EventStatusOverride;
  /** Slug of the next SITE_EVENTS entry to advertise once this one is past. */
  nextEventRef: string | null;
  artwork: { src: string; alt: string; width: number; height: number };
  bringLine: string;
};

export const FEATURED_EVENT_SLUG = "chatgpt-for-business-owners-longview";

export const SITE_EVENTS: readonly SiteEvent[] = [
  {
    slug: FEATURED_EVENT_SLUG,
    title: "ChatGPT for Business Owners: Live in Longview",
    kicker: "ChatGPT for Business Owners",
    startsAt: "2026-09-17T18:30:00-05:00",
    durationMinutes: 90,
    afterMinutes: 30,
    timezone: "America/Chicago",
    priceUsd: PRICES.workshopSeat,
    seats: 10,
    city: "Longview, Texas",
    venueLine: "Longview Training Center · Longview, TX",
    registrationPath: `/events/${FEATURED_EVENT_SLUG}`,
    externalSiteUrl: EXTERNAL_LINKS.workshopSite,
    // ONE VALUE. Change "auto" to "past" to force the post-event state now,
    // or leave "auto" and the site swaps on its own once the room closes.
    status: "auto",
    nextEventRef: null,
    artwork: {
      src: "/images/workshops/chatgpt-build-september-17-warm-square.webp",
      alt: "Stop guessing. Start building with ChatGPT. September 17 hands-on workshop in Longview. A blue laptop connects an offer document, contact form, and follow-up message on a warm cream background.",
      width: 1254,
      height: 1254,
    },
    bringLine: "Beginners welcome. Bring your laptop.",
  },
];

/** Copy for the post-event state. Evergreen on purpose: no attendance figures, no outcomes. */
export const PAST_EVENT_COPY = {
  announcement: "NEXT WORKSHOP · DATE TO BE ANNOUNCED",
  announcementDetail: "Get on the list and hear first.",
  kicker: "The Longview workshop",
  headline: "The first workshop has run.",
  body: "Ten laptops, one evening, real business tasks. The next date is not set yet. Leave your email and you will hear about it before it is announced anywhere else.",
  listCta: "Get notified about the next workshop",
  lessonCta: "Start the free ChatGPT lesson now",
  lessonPath: "/chatgpt/free",
  pathCardTitle: "One evening. Your laptop. Real help.",
  pathCardBody: "The next hands-on workshop in Longview is being scheduled. Join the list to hear first, or start with the free lesson today.",
} as const;

export function siteEvent(slug: string): SiteEvent | null {
  return SITE_EVENTS.find((event) => event.slug === slug) ?? null;
}

export function featuredEvent(): SiteEvent {
  return SITE_EVENTS[0];
}

/** Live facts a server component can pass in from the database. */
export type LiveEventFacts = {
  startsAt?: string | null;
  durationMinutes?: number | null;
  priceUsd?: number | null;
  capacity?: number | null;
  seatsRemaining?: number | null;
  soldOut?: boolean | null;
  registrationOpen?: boolean | null;
  registrationClosed?: boolean | null;
  published?: boolean | null;
};

/** The instant the room closes: start + class + anything scheduled after. */
export function eventEndsAt(event: SiteEvent, live?: LiveEventFacts | null): Date {
  const start = new Date(live?.startsAt ?? event.startsAt);
  const minutes = (live?.durationMinutes ?? event.durationMinutes) + event.afterMinutes;
  return new Date(start.getTime() + minutes * 60_000);
}

export function resolveEventStatus(
  event: SiteEvent,
  { now = new Date(), live = null }: { now?: Date; live?: LiveEventFacts | null } = {},
): EventStatus {
  if (event.status !== "auto") return event.status;
  if (now.getTime() >= eventEndsAt(event, live).getTime()) return "past";
  if (live?.soldOut) return "sold_out";
  if (live?.registrationClosed) return "sold_out";
  if (typeof live?.seatsRemaining === "number" && live.seatsRemaining <= 0) return "sold_out";
  return "upcoming";
}

export type EventWhen = {
  /** "SEPTEMBER" */
  monthUpper: string;
  /** "17" */
  day: string;
  /** "THURSDAY" */
  weekdayUpper: string;
  /** "Thursday, September 17, 2026" */
  dateLabel: string;
  /** "September 17" */
  shortDate: string;
  /** "6:30–8:00 PM Central" */
  timeRange: string;
  /** "6:30 PM" */
  startTime: string;
  isoStart: string;
  isoEnd: string;
};

function parts(date: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const out: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) out[part.type] = part.value;
  return out;
}

/** The event's own wall-clock, always in America/Chicago. */
export function eventWhen(event: SiteEvent, live?: LiveEventFacts | null): EventWhen {
  const start = new Date(live?.startsAt ?? event.startsAt);
  const classMinutes = live?.durationMinutes ?? event.durationMinutes;
  const classEnd = new Date(start.getTime() + classMinutes * 60_000);
  const s = parts(start, event.timezone);
  const e = parts(classEnd, event.timezone);
  return {
    monthUpper: s.month.toUpperCase(),
    day: s.day,
    weekdayUpper: s.weekday.toUpperCase(),
    dateLabel: `${s.weekday}, ${s.month} ${s.day}, ${s.year}`,
    shortDate: `${s.month} ${s.day}`,
    timeRange: `${s.hour}:${s.minute}–${e.hour}:${e.minute} ${e.dayPeriod} Central`,
    startTime: `${s.hour}:${s.minute} ${s.dayPeriod}`,
    isoStart: start.toISOString(),
    isoEnd: eventEndsAt(event, live).toISOString(),
  };
}

export type FeaturedEventState = {
  event: SiteEvent;
  status: EventStatus;
  when: EventWhen;
  priceUsd: number;
  seats: number;
  seatsRemaining: number | null;
  /** The next scheduled event to advertise in the past state, if any. */
  next: SiteEvent | null;
  /** Where "reserve a seat" should send people while the event is on. */
  reserveHref: string;
  /** Where "see the workshop" should send people while the event is on. */
  detailsHref: string;
  /** True when the live facts came from the database on this render. */
  live: boolean;
};

export function resolveFeaturedEvent(
  { now = new Date(), live = null }: { now?: Date; live?: LiveEventFacts | null } = {},
): FeaturedEventState {
  const event = featuredEvent();
  const status = resolveEventStatus(event, { now, live });
  const next = event.nextEventRef ? siteEvent(event.nextEventRef) : null;
  return {
    event,
    status,
    when: eventWhen(event, live),
    priceUsd: typeof live?.priceUsd === "number" && Number.isFinite(live.priceUsd) ? live.priceUsd : event.priceUsd,
    seats: typeof live?.capacity === "number" ? live.capacity : event.seats,
    seatsRemaining: typeof live?.seatsRemaining === "number" ? live.seatsRemaining : null,
    next,
    reserveHref: event.registrationPath,
    detailsHref: event.externalSiteUrl ?? event.registrationPath,
    live: Boolean(live),
  };
}

/**
 * While the featured event is on, /events hands off to the standalone
 * funnel. Once it is past, /events serves its own page again (the recap and
 * the upcoming list). Middleware calls this on every /events request.
 */
export function eventsRedirectTarget(now = new Date()): string | null {
  const event = featuredEvent();
  if (!event.externalSiteUrl) return null;
  return resolveEventStatus(event, { now }) === "past" ? null : event.externalSiteUrl;
}

/** The last instant a pre-event nurture email may go out: the class start. */
export function featuredEventStartMs(): number {
  return Date.parse(featuredEvent().startsAt);
}
