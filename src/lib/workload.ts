// src/lib/workload.ts
//
// Public capacity math for Ryan's real fulfillment load. This is not price
// math. It is the operational estimate used to keep the 60-hour meter honest.

import type { OfferSlug } from "./offers";

export type WorkloadLine = {
  label: string;
  minutes: number;
  note?: string;
};

export type DeliveryKind = "business-days" | "calendar-days" | "same-day" | "ongoing";

export type OfferWorkload = {
  slug: OfferSlug;
  label: string;
  visibleTime: string;
  planningHours: number;
  reserveHours: number;
  deliveryKind: DeliveryKind;
  deliveryMinDays: number;
  deliveryMaxDays: number;
  deliveryPromise: string;
  workloadNote: string;
  breakdown?: WorkloadLine[];
};

export const DECISION_SPRINT_BREAKDOWN: WorkloadLine[] = [
  { label: "Live call", minutes: 90 },
  { label: "Pre-call prep", minutes: 10 },
  { label: "Immediate post-call filing", minutes: 10 },
  { label: "Create case file and load transcript, notes, recordings, docs", minutes: 5 },
  { label: "Machine research, evidence parsing, worksheet/PDF assembly", minutes: 120, note: "Usually 1.5-2 hours" },
  { label: "Text follow-up and extra small requests", minutes: 15, note: "Only when needed" },
  { label: "Final folder organization, type-up, and send", minutes: 10 },
];

export const OFFER_WORKLOADS: Record<OfferSlug, OfferWorkload> = {
  "quick-look": {
    slug: "quick-look",
    label: "Quick-Look Video",
    visibleTime: "5-minute personalized video",
    planningHours: 1,
    reserveHours: 1,
    deliveryKind: "business-days",
    deliveryMinDays: 1,
    deliveryMaxDays: 1,
    deliveryPromise: "1 business day after intake. Friday orders ship Monday.",
    workloadNote: "30-minute review, short recording, written next-post direction, packaging, and send.",
  },
  "decision-sprint": {
    slug: "decision-sprint",
    label: "Decision Sprint",
    visibleTime: "90-minute call",
    planningHours: 4.5,
    reserveHours: 5,
    deliveryKind: "business-days",
    deliveryMinDays: 1,
    deliveryMaxDays: 1,
    deliveryPromise: "Action worksheet within 1 business day after the call. Scheduling target: within 5 business days.",
    workloadNote: "A 90-minute call creates a 4.5-hour fulfillment block, rounded to 5 hours in the public meter.",
    breakdown: DECISION_SPRINT_BREAKDOWN,
  },
  "business-audit": {
    slug: "business-audit",
    label: "Business Audit",
    visibleTime: "Written audit",
    planningHours: 8,
    reserveHours: 8,
    deliveryKind: "business-days",
    deliveryMinDays: 7,
    deliveryMaxDays: 7,
    deliveryPromise: "Final written audit within 7 business days after complete intake.",
    workloadNote: "Review, findings, 12-18 page write-up, proof check, and final delivery.",
  },
  "working-session": {
    slug: "working-session",
    label: "Working Session",
    visibleTime: "4-hour intensive",
    planningHours: 6,
    reserveHours: 6,
    deliveryKind: "same-day",
    deliveryMinDays: 0,
    deliveryMaxDays: 1,
    deliveryPromise: "Core asset ships same day. Recording, transcript, and cleanup within 1 business day.",
    workloadNote: "Four live hours plus prep, deployment/checking, transcript, cleanup, and final folder delivery.",
  },
  "sprint-4-week": {
    slug: "sprint-4-week",
    label: "4-Week Build Sprint",
    visibleTime: "4-week sprint",
    planningHours: 15,
    reserveHours: 15,
    deliveryKind: "business-days",
    deliveryMinDays: 20,
    deliveryMaxDays: 20,
    deliveryPromise: "Four working weeks, with a shipped checkpoint each week.",
    workloadNote: "Reserved weekly build capacity for strategy, production, implementation, QA, and handoff.",
  },
  "light-retainer": {
    slug: "light-retainer",
    label: "Light Retainer",
    visibleTime: "2 calls/month + async advice",
    planningHours: 4,
    reserveHours: 4,
    deliveryKind: "ongoing",
    deliveryMinDays: 1,
    deliveryMaxDays: 1,
    deliveryPromise: "Ongoing monthly support. Async response target: 1 business day.",
    workloadNote: "Call time, context loading, async voice/text review, briefings, and follow-up.",
  },
  "power-bundle": {
    slug: "power-bundle",
    label: "Power Bundle",
    visibleTime: "4 social platforms managed",
    planningHours: 8,
    reserveHours: 8,
    deliveryKind: "ongoing",
    deliveryMinDays: 5,
    deliveryMaxDays: 5,
    deliveryPromise: "Monthly content engine with weekly production and reporting rhythm.",
    workloadNote: "Content planning, production queue, posting, engagement review, and performance reporting.",
  },
  "fb-ads": {
    slug: "fb-ads",
    label: "Facebook Ads Management",
    visibleTime: "Meta ads management",
    planningHours: 5,
    reserveHours: 5,
    deliveryKind: "ongoing",
    deliveryMinDays: 5,
    deliveryMaxDays: 5,
    deliveryPromise: "Weekly optimization/reporting once access, pixel, creative, and budget are ready.",
    workloadNote: "Setup, creative iteration, daily checks, budget review, optimization, and reporting.",
  },
  "monthly-operator": {
    slug: "monthly-operator",
    label: "Monthly Operator",
    visibleTime: "Fractional operator",
    planningHours: 10,
    reserveHours: 10,
    deliveryKind: "ongoing",
    deliveryMinDays: 5,
    deliveryMaxDays: 5,
    deliveryPromise: "Weekly working rhythm with written ops scoreboard every Friday.",
    workloadNote: "Weekly sessions, execution work, dashboard/ops updates, async decisions, and Friday reporting.",
  },
  "annual-advisor": {
    slug: "annual-advisor",
    label: "Annual Advisor",
    visibleTime: "Reserved advisor relationship",
    planningHours: 5,
    reserveHours: 5,
    deliveryKind: "ongoing",
    deliveryMinDays: 5,
    deliveryMaxDays: 5,
    deliveryPromise: "Reserved advisor access with quarterly board-level cadence.",
    workloadNote: "Reserved availability, deep context, decision review, quarterly prep, and owner-level follow-up.",
  },
};

export const FEATURED_WORKLOAD_SLUGS = [
  "quick-look",
  "decision-sprint",
  "business-audit",
  "working-session",
  "sprint-4-week",
] as const satisfies readonly OfferSlug[];

export function getOfferWorkload(slug: string | null | undefined): OfferWorkload | null {
  if (!slug) return null;
  return OFFER_WORKLOADS[slug as OfferSlug] ?? null;
}

export function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return d;
}

export function deliveryDueDate(start: Date, workload: OfferWorkload): Date | null {
  if (workload.deliveryKind === "ongoing") return null;
  if (workload.deliveryKind === "business-days") return addBusinessDays(start, workload.deliveryMaxDays);
  const d = new Date(start);
  d.setDate(d.getDate() + workload.deliveryMaxDays);
  return d;
}

export function capacityFit(remainingHours: number, workload: OfferWorkload) {
  const blocksRemaining = Math.floor(remainingHours / workload.reserveHours);
  return {
    blocksRemaining,
    fitsThisWeek: blocksRemaining > 0,
  };
}
