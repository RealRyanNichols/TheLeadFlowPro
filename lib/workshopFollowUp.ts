// Post-workshop attendee follow-up, version 1. DRAFTS ONLY.
//
// Nothing in this file is wired to a cron, a webhook, or a send path. Ryan
// reads the sequence, picks the day-2 offer, supplies the worksheet link, and
// activates it as a separate approved change. Until then this is a versioned
// template that the tests keep honest (no dashes, no guarantees, no invented
// figures, unsubscribe on every marketing step).
//
// The sequence is built per event from its SITE_EVENTS entry and its kit
// (lib/site/workshopKit.ts), so the next workshop gets its own dates, recap,
// and dedupe keys from config. The featured event's sequence is exported
// under the original names.
//
// Every automation on this site documents the same ten things. Here they are
// for this one.
//
// TRIGGER        A registration on the event reaches status "attended" (set
//                from /admin/events after the room closes).
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
import { eventWhen, featuredEvent, type SiteEvent } from "@/lib/site/events";
import { DAY_TWO_OFFERS, workshopKitOrDefault, type DayTwoOffer, type WorkshopKit } from "@/lib/site/workshopKit";

export const WORKSHOP_FOLLOW_UP_VERSION = "workshop-follow-up-v1";

export type FollowUpKind = "transactional" | "marketing";
export type { DayTwoOffer };

export type FollowUpContext = {
  first: string;
  /** The worksheet the room was promised. Step 301 will not send without it. */
  worksheetUrl: string | null;
  /** Signed one-click unsubscribe link, appended by the sender. */
  unsubscribeUrl: string;
  /** Which day-2 offer Ryan picked. Defaults to the kit's choice. */
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

export type WorkshopFollowUp = {
  version: string;
  eventSlug: string;
  steps: readonly WorkshopFollowUpStep[];
  dedupeKey: (registrationId: string, step: number) => string;
  sequence: {
    version: string;
    eventSlug: string;
    trigger: string;
    eligibility: string;
    exclusions: string;
    stopConditions: string;
    quietHours: string;
    delivery: string;
    owner: string;
    analyticsEvent: string;
    activated: false;
    steps: readonly WorkshopFollowUpStep[];
  };
};

const SITE = BUSINESS.siteUrl;
const SIGNATURE = ["", "Talk soon,", BUSINESS.operator, BUSINESS.name, BUSINESS.phone.display].join("\n");

function firstName(name: string | null | undefined): string {
  return String(name ?? "").trim().split(" ")[0] || "there";
}

function offerUrl(offer: DayTwoOffer, content: string): string {
  const base = `${SITE}${DAY_TWO_OFFERS[offer].path}`;
  const q = `utm_source=email&utm_medium=workshop_followup&utm_campaign=${WORKSHOP_FOLLOW_UP_VERSION}&utm_content=${content}`;
  return `${base}?${q}`;
}

/** The three-step sequence for one event, from its config. */
export function buildWorkshopFollowUp(event: SiteEvent, kit: WorkshopKit = workshopKitOrDefault(event.slug)): WorkshopFollowUp {
  const when = eventWhen(event);
  const steps: readonly WorkshopFollowUpStep[] = [
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
        const pick = ctx.dayTwoOffer ?? kit.followUp.dayTwoOffer;
        const offer = DAY_TWO_OFFERS[pick];
        return [
          `${firstName(ctx.first)},`,
          "",
          `A quick recap of ${when.shortDate}, ${kit.followUp.recapLead}`,
          "",
          ...kit.followUp.recap.map((line, i) => `${i + 1}. ${line}`),
          "",
          `If you would rather have it done for you, this is the one thing I would point you at first:`,
          "",
          `${offer.name}, ${offer.price}.`,
          offer.pitch,
          offerUrl(pick, "day2"),
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
  const dedupeKey = (registrationId: string, step: number) => `${WORKSHOP_FOLLOW_UP_VERSION}:${event.slug}:${registrationId}:${step}`;
  return {
    version: WORKSHOP_FOLLOW_UP_VERSION,
    eventSlug: event.slug,
    steps,
    dedupeKey,
    sequence: {
      version: WORKSHOP_FOLLOW_UP_VERSION,
      eventSlug: event.slug,
      trigger: `event_registrations.status becomes 'attended' after ${event.slug} is past`,
      eligibility: "attended seat with an email; marketing steps also need marketing_consent",
      exclusions: "cancelled, refunded, transferred, no_show, overbooked, pending; unsubscribed; Do Not Contact; already bought the day-2 offer",
      stopConditions: "a reply, a purchase, STOP or unsubscribe, or Ryan marking the registration handled",
      quietHours: "301 no earlier than 21:00 Central the same night, else 08:00 next day; 302 and 303 at 09:00 Central",
      delivery: "Resend from ryan@, reply-to hello@, retries on the lead-email schedule, permanent failures to the admin failure queue",
      owner: `${BUSINESS.operator} approves and sends; Pat works replies`,
      analyticsEvent: "workshop_followup_sent",
      activated: false,
      steps,
    },
  };
}

// ---------------------------------------------------- the featured event ---

const FEATURED = buildWorkshopFollowUp(featuredEvent());

export const WORKSHOP_FOLLOW_UP_STEPS: readonly WorkshopFollowUpStep[] = FEATURED.steps;

/** Unique per attendee per step, so a retry can never send twice. */
export function workshopFollowUpDedupeKey(registrationId: string, step: number): string {
  return FEATURED.dedupeKey(registrationId, step);
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
export function eligibleWorkshopFollowUpSteps(input: FollowUpEligibilityInput, steps: readonly WorkshopFollowUpStep[] = WORKSHOP_FOLLOW_UP_STEPS): WorkshopFollowUpStep[] {
  if (!input.eventIsPast) return [];
  if (input.registrationStatus !== "attended") return [];
  if (!input.email) return [];
  if (input.doNotContact || input.replied || input.handledByRyan) return [];
  return steps.filter((step) => {
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

export const WORKSHOP_FOLLOW_UP_SEQUENCE = FEATURED.sequence;
