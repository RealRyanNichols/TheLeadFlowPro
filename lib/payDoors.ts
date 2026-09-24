// Pay doors: for every offer Ryan can close on a call, the one published way
// the customer pays for it today, in words Ryan can say and a link he can send.
//
// When a lead says yes on the phone, the worst thing that can happen next is
// a link to a page that does not take the money, or a number the site does
// not print. The Call Closer's "Ready to pay now" step and the proposal's
// "To accept" lines both read from this file, so they can only ever point at
// a door that exists. Every amount is an offer's own priceLabel or a PRICES
// figure. Every link is the Stripe Payment Link in lib/site/external-links.ts,
// a public page from the offer registry, or the agency pay page from
// lib/agencyPayment.ts. Checked against the code on 2026-09-22:
//
//   website_launch          the hosted Stripe Payment Link for the deposit.
//   system_map              /packages/system-map, whose order form opens Stripe checkout.
//   lead_followup_campaign  /go/lead-follow-up, whose funnel opens Stripe checkout.
//   larger builds           start with the System Map, credited toward the build.
//   free_website_program    no payment for the build.
//   free_build_* add-ons    no public checkout. The /free-build form promises a
//                           separate secure checkout after the written scope is
//                           approved, so Ryan sends one from Sales invoices.
//   agency_*                /agency/pay?service=<slug>, the amount in the written scope.
//                           For a real lead the link also carries &lead=<id>, so the
//                           payment lands on that lead's record (lib/agencyPayment.ts).
//                           The sample card and sample proposals never pass one.
//
// An offer that is not live never shows an amount and is never payable now.
// Leaf module: registry reads only. Nothing here sends, charges, or stores anything.

import { agencyFixedPriceUsd, agencyPayHref } from "./agencyPayment";
import { AGENCY_SERVICES } from "./site/agency";
import { BUSINESS } from "./site/business";
import { EXTERNAL_LINKS } from "./site/external-links";
import { OFFERS, type Offer } from "./site/offers";
import { PRICES, usd } from "./site/prices";

export const CLOSER_OFFER_IDS = [
  "website_launch",
  "system_map",
  "free_website_program",
  "free_build_followup",
  "free_build_content",
  "free_build_launch",
  "lead_followup_campaign",
  "lead_engine",
  "training_platform",
  "company_os",
  "custom_platform",
  "agency_meta_ads",
  "agency_google_ads",
  "agency_automation",
  "agency_video",
  "agency_content",
] as const;

export type CloserOfferId = (typeof CLOSER_OFFER_IDS)[number];

const CLOSER_SET: ReadonlySet<string> = new Set<string>(CLOSER_OFFER_IDS);

export function isCloserOfferId(id: unknown): id is CloserOfferId {
  return typeof id === "string" && CLOSER_SET.has(id);
}

/** Larger builds that begin with the paid System Map (its terms credit it toward the build). */
export const MAP_FIRST_OFFER_IDS: readonly CloserOfferId[] = ["lead_engine", "training_platform", "company_os", "custom_platform"];

/** The paid add-ons on the free website. /free-build takes the request; checkout follows the approved scope. */
export const FREE_BUILD_ADD_ON_IDS: readonly CloserOfferId[] = ["free_build_followup", "free_build_content", "free_build_launch"];

export type PayDoorKind = "pay_online" | "starts_with" | "after_scope_checkout" | "no_payment" | "written_scope";

export type PayDoor = {
  offerId: CloserOfferId;
  offerName: string;
  priceLabel: string;
  terms: string;
  status: "live" | "tbd_ryan" | "retired";
  kind: PayDoorKind;
  /** Absolute https URL a customer can open, or null. */
  url: string | null;
  /** What they pay today, from the registry. Null when there is no online payment today. */
  dueNowLabel: string | null;
  /** Plain words for Ryan, never sent to the customer as is. */
  howTheyPay: string;
  /** Internal staff-only path. Never goes in customer text. */
  staffHref: string | null;
  /** May be chosen under "Ready to pay now". */
  payableNow: boolean;
};

/** Where Ryan sends a secure checkout for a scoped add-on. Middleware serves /admin/sales from app/sales. */
const SALES_INVOICES_HREF = "/admin/sales/invoices";

const absolute = (path: string) => `${BUSINESS.siteUrl}${path}`;

function findOffer(id: string): Offer | null {
  return OFFERS.find((o) => o.id === id) ?? null;
}

/** Who the door is for. Only a real lead's id is passed, never a sample's. */
export type PayDoorContext = { leadId?: string | null };

/**
 * The pay door for one offer. Null for an unknown id, an offer outside the
 * closer list, or a retired offer. With a lead id, a door that can tie the
 * payment to the lead (the agency pay page) carries it; agencyPayHref drops
 * anything that is not a UUID, so a sample id never reaches a link.
 */
export function payDoorFor(offerId: string, context: PayDoorContext = {}): PayDoor | null {
  if (!isCloserOfferId(offerId)) return null;
  const o = findOffer(offerId);
  if (!o || o.status === "retired") return null;
  const live = o.status === "live";
  const base = { offerId, offerName: o.name, priceLabel: o.priceLabel, terms: o.terms, status: o.status };

  if (offerId === "website_launch") {
    return {
      ...base,
      kind: "pay_online",
      url: EXTERNAL_LINKS.stripeWebsiteLaunchDeposit,
      dueNowLabel: live ? usd(PRICES.websiteLaunchDeposit) : null,
      howTheyPay: live
        ? `Pays the ${usd(PRICES.websiteLaunchDeposit)} deposit online today, the rest after approval and before launch`
        : "The deposit link is up, but the price is not set yet",
      staffHref: null,
      payableNow: live,
    };
  }

  if (offerId === "system_map" || offerId === "lead_followup_campaign") {
    return {
      ...base,
      kind: "pay_online",
      url: absolute(o.href),
      dueNowLabel: live ? o.priceLabel : null,
      howTheyPay: live ? `Pays ${o.priceLabel} online today on the ${o.name} page` : `The ${o.name} page is up, but the price is not set yet`,
      staffHref: null,
      payableNow: live,
    };
  }

  if (MAP_FIRST_OFFER_IDS.includes(offerId)) {
    // What they pay today is the System Map, so the door is the System Map's door.
    const map = payDoorFor("system_map");
    const payable = live && map !== null && map.payableNow && map.url !== null;
    return {
      ...base,
      kind: "starts_with",
      url: map?.url ?? null,
      dueNowLabel: live ? (map?.dueNowLabel ?? null) : null,
      // Name the amount due today so a "from" price never reads as payable online in full.
      howTheyPay:
        payable && map?.dueNowLabel
          ? `Starts with the System Map: pays ${map.dueNowLabel} online today, credited toward the build`
          : "Starts with the System Map, credited toward the build",
      staffHref: null,
      payableNow: payable,
    };
  }

  if (offerId === "free_website_program") {
    return {
      ...base,
      kind: "no_payment",
      url: null,
      dueNowLabel: null,
      howTheyPay: "No payment for the build. They apply, and you confirm fit and capacity",
      staffHref: null,
      payableNow: false,
    };
  }

  if (FREE_BUILD_ADD_ON_IDS.includes(offerId)) {
    return {
      ...base,
      kind: "after_scope_checkout",
      url: null,
      dueNowLabel: null,
      howTheyPay: "Secure checkout after they approve the written scope. Send it from Sales invoices",
      staffHref: SALES_INVOICES_HREF,
      payableNow: false,
    };
  }

  // The agency lane: the pay page takes the amount in the written scope. Once
  // Ryan publishes a price, lib/agencyPayment.ts charges that number instead.
  const service = AGENCY_SERVICES.find((s) => s.offerId === offerId) ?? null;
  const fixed = live && service !== null && agencyFixedPriceUsd(service) !== null;
  return {
    ...base,
    kind: "written_scope",
    url: absolute(agencyPayHref(service?.slug ?? null, context.leadId ?? null)),
    dueNowLabel: fixed ? o.priceLabel : null,
    howTheyPay: live
      ? "Pays the amount in the written scope on the agency pay page"
      : "Pays the amount in the written scope on the agency pay page, once you put the number in writing",
    staffHref: null,
    payableNow: live,
  };
}

/** Every closer offer that is not retired, in registry order. */
export function closerOffers(): PayDoor[] {
  const doors: PayDoor[] = [];
  for (const o of OFFERS) {
    const door = payDoorFor(o.id);
    if (door) doors.push(door);
  }
  return doors;
}

/** One "To accept" line for a proposal. Customer-facing: never carries staffHref. */
export function acceptanceLine(door: PayDoor): string {
  const name = door.offerName;
  switch (door.kind) {
    case "pay_online": {
      if (!door.url) return `Pay the amount in your written scope for the ${name}.`;
      if (!door.dueNowLabel) return `Pay for the ${name} at ${door.url} once the price is confirmed in writing.`;
      if (door.dueNowLabel !== door.priceLabel) {
        return `Pay the ${door.dueNowLabel} deposit for the ${name} at ${door.url} and intake begins when the deposit clears.`;
      }
      // The Follow-Up Campaign's checkout lands the buyer on a short intake,
      // and nothing is written until it comes back (lib/leadFollowUp.ts).
      if (door.offerId === "lead_followup_campaign") {
        return `Pay ${door.dueNowLabel} for the ${name} at ${door.url}. After payment you fill in a short intake, and the writing starts from it.`;
      }
      return `Pay ${door.dueNowLabel} for the ${name} at ${door.url} and work begins when the payment clears.`;
    }
    case "starts_with": {
      const price = door.dueNowLabel ? ` (${door.dueNowLabel})` : "";
      const start = `${name} starts with the System Map${price}, credited toward the approved build.`;
      return door.url ? `${start} Pay for the System Map at ${door.url} to begin.` : start;
    }
    case "after_scope_checkout":
      return `After you approve the written scope, a secure checkout for ${name} (${door.priceLabel}) is sent to you.`;
    // Both name the offer: a proposal can carry a free build beside a paid
    // one, or two agency services with one pay page each, and a bare "the
    // build" or "the amount in your written scope" could mean the whole page.
    case "no_payment":
      return `No payment is due for the ${name} build.`;
    case "written_scope":
      return door.url ? `Pay the amount in your written scope for ${name} at ${door.url}.` : `Pay the amount in your written scope for ${name}.`;
  }
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * One "To accept" line for every larger build on a proposal. They all start
 * with the same System Map, paid once, so they share one line, the way the
 * pay-link message groups them. The price is the first one a build carries
 * (a build whose own price is not set carries none). With one build this is
 * exactly acceptanceLine(door).
 */
export function startsWithAcceptanceLine(builds: PayDoor[]): string {
  if (builds.length === 1) return acceptanceLine(builds[0]);
  const dueNow = builds.find((b) => b.dueNowLabel)?.dueNowLabel ?? null;
  const url = builds.find((b) => b.url)?.url ?? null;
  const price = dueNow ? ` (${dueNow})` : "";
  const start = `${joinNames(builds.map((b) => b.offerName))} start with the System Map${price}, credited toward the approved build.`;
  return url ? `${start} Pay for the System Map at ${url} to begin.` : start;
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function doorMessage(door: PayDoor, url: string): string {
  if (door.kind === "written_scope" && !door.dueNowLabel) {
    return `Here is the link to pay the amount in your written scope for ${door.offerName}: ${url}`;
  }
  if (!door.dueNowLabel) return `Here is the link for ${door.offerName}: ${url}`;
  if (door.dueNowLabel !== door.priceLabel) {
    return `Here is the link for ${door.offerName} (${door.priceLabel}). It takes the ${door.dueNowLabel} deposit to start: ${url}`;
  }
  return `Here is the link for ${door.offerName} (${door.priceLabel}): ${url}`;
}

function startsWithMessage(builds: PayDoor[], url: string): string {
  const price = builds[0].dueNowLabel ? ` (${builds[0].dueNowLabel})` : "";
  const verb = builds.length > 1 ? "start" : "starts";
  return `${joinNames(builds.map((b) => b.offerName))} ${verb} with the System Map${price}, credited toward the build. Here is the link for the System Map: ${url}`;
}

/**
 * The one customer draft with the pay links in it, for Ryan to send himself.
 * Only doors with a url make it in; null when none has one. A larger build and
 * the System Map share a link, so they share a line.
 */
export function payLinkMessage(input: { firstName: string; senderFirstName: string; doors: PayDoor[] }): string | null {
  const groups = new Map<string, PayDoor[]>();
  for (const door of input.doors) {
    if (!door.url) continue;
    const group = groups.get(door.url) ?? [];
    if (!group.some((d) => d.offerId === door.offerId)) group.push(door);
    groups.set(door.url, group);
  }
  if (groups.size === 0) return null;

  const lines: string[] = [];
  for (const [url, group] of groups) {
    const builds = group.filter((d) => d.kind === "starts_with");
    if (builds.length) lines.push(startsWithMessage(builds, url));
    else for (const door of group) lines.push(doorMessage(door, url));
  }

  const first = oneLine(input.firstName) || "there";
  const sender = oneLine(input.senderFirstName) || BUSINESS.operator.split(" ")[0];
  const greeting = `Hi ${first}, it's ${sender} with ${BUSINESS.name}.`;
  const closing = "Reply here with any questions.";
  return lines.length === 1 ? [greeting, lines[0], closing].join(" ") : [greeting, ...lines, closing].join("\n");
}
