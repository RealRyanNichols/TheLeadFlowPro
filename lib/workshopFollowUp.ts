// Post-workshop attendee follow-up, version 1. DRAFTS ONLY.
//
// Nothing in this file is wired to a cron, a webhook, or a send path. Ryan
// reads the sequence, picks the day-2 offer, supplies the worksheet link, and
// activates it as a separate approved change. Until then this is a versioned
// template that the tests keep honest (no dashes, no guarantees, no invented
// figures, unsubscribe on every marketing step).
//
// Every automation on this site documents the same ten things. Here they are
// for this one.
//
// TRIGGER        A registration on the featured event reaches status
//                "attended" (set from /admin/events after the room closes).
// ELIGIBILITY    status = attended; email present; the event has run
//                (lib/site/events.ts status = past).
// CONSENT        Step 301 is transactional: it is the worksheet the attendee
//                was promised in the room. Steps 302 and 303 are marketing
//                and require event_registrations.marketing_consent = true.
// EXCLUSIONS     cancelled, refunded, transferred, no_show, overbooked, or
//                pending seats; leads.email_unsubscribed_at set for the same
//                address; Do Not Contact; anyone who already bought the
//                day-2 offer.
// TEMPLATE       WORKSHOP_FOLLOW_UP_VERSION below. Bump it when copy changes.
// FALLBACK       first name -> "there". Business name is never required.
// DELAY / HOURS  301 sends after the room closes, no earlier than 9:00 PM
//                Central the same night, otherwise 8:00 AM the next morning.
//                302 and 303 send at 9:00 AM Central on their day.
// STOP           a reply from the attendee, a purchase, STOP / unsubscribe,
//                or Ryan marking the registration "handled".
// IDEMPOTENCY    one row per (registration id, step) in an outbox with a
//                unique constraint; Resend idempotency key = dedupeKey().
// DELIVERY       Resend, from ryan@ with hello@ as reply-to. A failed send
//                retries on the existing lead-email schedule; permanent
//                failures land in the admin failure queue.
// OWNER          Ryan sends and approves. Pat works replies.
// ANALYTICS      server event "workshop_followup_sent" with the step label
//                (add to EVENT_NAMES in lib/analytics/shared.ts on activation).

import { BUSINESS } from "@/lib/site/business";
import { eventWhen, featuredEvent } from "@/lib/site/events";
import { PRICES, usd } from "@/lib/site/prices";

export const WORKSHOP_FOLLOW_UP_VERSION = "workshop-follow-up-v1";

export type FollowUpKind = "transactional" | "marketing";
export type DayTwoOffer = "content_engine" | "website_launch";

export type FollowUpContext = {
  first: string;
  /** The worksheet the room was promised. Step 301 will not send without it. */
  worksheetUrl: string | null;
  /** Signed one-click unsubscribe link, appended by the sender. */
  unsubscribeUrl: string;
  /** Which day-2 offer Ryan picked. Defaults to the Content Engine. */
  dayTwoOffer?: DayTwoOffer;
};

export type WorkshopFollowUpStep = {
  step: number;
  key: "same_night" | "day_2" | "day_7";
  /** Days after the event, 0 = the same night. */
  day: number;
  /** Earliest local send time on that day, 24h America/Chicago. */
  sendAtLocal: string;
  kind: FollowUpKind;
  /** Context fields that must be present before this step may send. */
  requires: Array<keyof FollowUpContext>;
  subject: string;
  body: (ctx: FollowUpContext) => string;
};

const EVENT = featuredEvent();
const WHEN = eventWhen(EVENT);
const SITE = BUSINESS.siteUrl;

const SIGNATURE = ["", "Talk soon,", BUSINESS.operator, BUSINESS.name, BUSINESS.phone.display].join("\n");

function firstName(name: string | null | undefined): string {
  return String(name ?? "").trim().split(" ")[0] || "there";
}

const DAY_TWO_OFFERS: Record<DayTwoOffer, { name: string; price: string; url: string; pitch: string }> = {
  content_engine: {
    name: "Free Website + Content Engine",
    price: usd(PRICES.freeBuildContentEngine),
    url: `${SITE}/free-build?utm_source=email&utm_medium=workshop_followup&utm_campaign=${WORKSHOP_FOLLOW_UP_VERSION}&utm_content=day2#pick`,
    pitch:
      "Two weeks of content for your business, written around one offer, plus the five-page website with no build fee if you qualify. It is the same process we ran in the room, done for you.",
  },
  website_launch: {
    name: "Website Launch",
    price: usd(PRICES.websiteLaunchTotal),
    url: `${SITE}/packages/launch?utm_source=email&utm_medium=workshop_followup&utm_campaign=${WORKSHOP_FOLLOW_UP_VERSION}&utm_content=day2`,
    pitch: `Five pages, one clear next step for the customer, and the follow-up wired behind it. ${usd(PRICES.websiteLaunchDeposit)} to start, the rest after you approve the working site.`,
  },
};

export const WORKSHOP_FOLLOW_UP_STEPS: readonly WorkshopFollowUpStep[] = [
  {
    step: 301,
    key: "same_night",
    day: 0,
    sendAtLocal: "21:00",
    kind: "transactional",
    requires: ["worksheetUrl"],
    subject: "Tonight's worksheet, and what to do Friday",
    body: (ctx) =>
      [
        `${firstName(ctx.first)},`,
        "",
        `Thank you for bringing a real task to the room tonight. Here is the worksheet we worked from, with the brief you wrote and the steps to run it again:`,
        ctx.worksheetUrl ?? "",
        "",
        "One thing to do before Friday is over: open ChatGPT, paste your brief, and run the task once more on tomorrow's version of the problem. That second run is where it sticks.",
        "",
        "If something breaks or the answer comes back generic, reply to this email with the prompt you used and I will look at it.",
        SIGNATURE,
      ].join("\n"),
  },
  {
    step: 302,
    key: "day_2",
    day: 2,
    sendAtLocal: "09:00",
    kind: "marketing",
    requires: ["unsubscribeUrl"],
    subject: "The three things every table had in common",
    body: (ctx) => {
      const offer = DAY_TWO_OFFERS[ctx.dayTwoOffer ?? "content_engine"];
      return [
        `${firstName(ctx.first)},`,
        "",
        `A quick recap of ${WHEN.shortDate}, because the same three things showed up at every table:`,
        "",
        "1. The first draft was generic because the brief was generic. Business name, buyer, offer, and the one action you want. That fixed most of it.",
        "2. The second run was better than the first. Every time. Save the brief and run it again.",
        "3. The follow-up was the piece nobody had time for. That is the part worth handing off.",
        "",
        `If you would rather have it done for you, this is the one thing I would point you at first:`,
        "",
        `${offer.name}, ${offer.price}.`,
        offer.pitch,
        offer.url,
        "",
        "If the timing is wrong, no problem. Reply and tell me what you are building and I will point you at the next best step either way.",
        SIGNATURE,
        "",
        `Unsubscribe: ${ctx.unsubscribeUrl}`,
      ].join("\n");
    },
  },
  {
    step: 303,
    key: "day_7",
    day: 7,
    sendAtLocal: "09:00",
    kind: "marketing",
    requires: ["unsubscribeUrl"],
    subject: "Did you run it a second time?",
    body: (ctx) =>
      [
        `${firstName(ctx.first)},`,
        "",
        "A week on from the workshop. One question, and I read every reply myself:",
        "",
        "Did you run the task again?",
        "",
        "If yes, tell me what came back and I will tell you what I would change.",
        "",
        "If no, tell me what got in the way. Usually it is the brief, the time, or the tool being open in the wrong place. All three are fixable in one reply.",
        "",
        `The free starter lesson is here if you want a clean second run: ${SITE}/chatgpt/free`,
        SIGNATURE,
        "",
        `Unsubscribe: ${ctx.unsubscribeUrl}`,
      ].join("\n"),
  },
];

/** Unique per attendee per step, so a retry can never send twice. */
export function workshopFollowUpDedupeKey(registrationId: string, step: number): string {
  return `${WORKSHOP_FOLLOW_UP_VERSION}:${EVENT.slug}:${registrationId}:${step}`;
}

export type FollowUpEligibilityInput = {
  registrationStatus: string;
  email: string | null;
  marketingConsent: boolean;
  unsubscribed: boolean;
  doNotContact: boolean;
  replied: boolean;
  purchasedDayTwoOffer: boolean;
  handledByRyan: boolean;
  eventIsPast: boolean;
};

/** Which steps a registration may still receive, given everything we know. */
export function eligibleWorkshopFollowUpSteps(input: FollowUpEligibilityInput): WorkshopFollowUpStep[] {
  if (!input.eventIsPast) return [];
  if (input.registrationStatus !== "attended") return [];
  if (!input.email) return [];
  if (input.doNotContact || input.replied || input.handledByRyan) return [];
  return WORKSHOP_FOLLOW_UP_STEPS.filter((step) => {
    if (step.kind === "transactional") return true;
    if (!input.marketingConsent || input.unsubscribed) return false;
    if (input.purchasedDayTwoOffer && step.key === "day_2") return false;
    return true;
  });
}

/** A step may only render when every field it depends on is present. */
export function canSendWorkshopFollowUp(step: WorkshopFollowUpStep, ctx: FollowUpContext): boolean {
  return step.requires.every((field) => {
    const value = ctx[field];
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  });
}

export const WORKSHOP_FOLLOW_UP_SEQUENCE = {
  version: WORKSHOP_FOLLOW_UP_VERSION,
  eventSlug: EVENT.slug,
  trigger: "event_registrations.status becomes 'attended' after the featured event is past",
  eligibility: "attended seat with an email; marketing steps also need marketing_consent",
  exclusions: "cancelled, refunded, transferred, no_show, overbooked, pending; unsubscribed; Do Not Contact; already bought the day-2 offer",
  stopConditions: "a reply, a purchase, STOP or unsubscribe, or Ryan marking the registration handled",
  quietHours: "301 no earlier than 21:00 Central the same night, else 08:00 next day; 302 and 303 at 09:00 Central",
  delivery: "Resend from ryan@, reply-to hello@, retries on the lead-email schedule, permanent failures to the admin failure queue",
  owner: `${BUSINESS.operator} approves and sends; Pat works replies`,
  analyticsEvent: "workshop_followup_sent",
  activated: false,
  steps: WORKSHOP_FOLLOW_UP_STEPS,
} as const;
