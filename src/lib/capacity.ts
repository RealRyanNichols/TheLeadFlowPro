// src/lib/capacity.ts — bandwidth-tracker domain logic.
//
// Public meter reads via getCapacitySnapshot(). The "booked" number is the
// SUM of hoursPerWeek across all engagements where status='active'. Capacity
// cap is fixed at 60 hours/week (Ryan's stated limit).

import { prisma } from "./prisma";
import {
  FEATURED_WORKLOAD_SLUGS,
  capacityFit,
  deliveryDueDate,
  formatHours,
  getOfferWorkload,
  type OfferWorkload,
} from "./workload";

export const WEEKLY_CAPACITY_HOURS = 60;

export type CapacitySnapshot = {
  capacity: number;        // 60
  booked: number;          // sum of active engagements' hoursPerWeek
  remaining: number;       // capacity - booked, floor 0
  utilizationPct: number;  // 0..100
  decisionSprintReserveHours: number;
  decisionSprintsRemaining: number;
  activeClientCount: number;
  recentlyCompletedCount: number;
  activeEngagements: PublicEngagement[];
  offerCapacity: PublicOfferCapacity[];
  forecastWindows: CapacityForecastWindow[];
  status: "open" | "limited" | "full"; // open <= 50%, limited <= 90%, full > 90%
  lastUpdated: string;     // ISO
};

export type PublicEngagement = {
  label: string;       // publicLabel || clientName
  hoursPerWeek: number;
  startedAt: string;   // ISO date
  offerSlug: string | null;
  offerName: string | null;
  deliveryPromise: string | null;
};

export type PublicOfferCapacity = {
  slug: string;
  label: string;
  visibleTime: string;
  planningHours: number;
  reserveHours: number;
  deliveryPromise: string;
  workloadNote: string;
  dueDate: string | null;
  blocksRemaining: number;
  fitsThisWeek: boolean;
  reserveLabel: string;
};

export type CapacityForecastWindow = {
  key: string;
  label: string;
  days: number;
  weeks: number;
  capacityHours: number;
  bookedHours: number;
  remainingHours: number;
  utilizationPct: number;
  decisionSprintBlocks: number;
};

const FORECAST_WINDOWS = [
  { key: "7d", label: "Next 7 days", days: 7 },
  { key: "14d", label: "Next 2 weeks", days: 14 },
  { key: "30d", label: "Next 30 days", days: 30 },
  { key: "60d", label: "Next 60 days", days: 60 },
  { key: "90d", label: "Next 90 days", days: 90 },
  { key: "6mo", label: "Next 6 months", days: 182 },
  { key: "12mo", label: "Next 12 months", days: 365 },
  { key: "10yr", label: "120 months", days: 3650 },
] as const;

function roundHours(hours: number): number {
  return Math.round(hours * 10) / 10;
}

function buildForecastWindows(bookedPerWeek: number, reserveHours: number): CapacityForecastWindow[] {
  return FORECAST_WINDOWS.map((window) => {
    const weeks = window.days / 7;
    const capacityHours = roundHours(WEEKLY_CAPACITY_HOURS * weeks);
    const bookedHours = roundHours(bookedPerWeek * weeks);
    const remainingHours = Math.max(0, roundHours(capacityHours - bookedHours));
    const utilizationPct = Math.min(100, Math.round((bookedHours / capacityHours) * 100));

    return {
      ...window,
      weeks: roundHours(weeks),
      capacityHours,
      bookedHours,
      remainingHours,
      utilizationPct,
      decisionSprintBlocks: Math.floor(remainingHours / reserveHours),
    };
  });
}

export async function getCapacitySnapshot(): Promise<CapacitySnapshot> {
  const [active, recentlyCompleted] = await Promise.all([
    prisma.clientEngagement.findMany({
      where: { status: "active" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.clientEngagement.count({
      where: {
        status: "completed",
        completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const booked = active.reduce((sum, e) => sum + (e.hoursPerWeek ?? 0), 0);
  const remaining = Math.max(0, WEEKLY_CAPACITY_HOURS - booked);
  const utilizationPct = Math.min(100, Math.round((booked / WEEKLY_CAPACITY_HOURS) * 100));

  const status: CapacitySnapshot["status"] =
    utilizationPct >= 90 ? "full" : utilizationPct >= 50 ? "limited" : "open";

  const decisionSprint = getOfferWorkload("decision-sprint") as OfferWorkload;
  const decisionSprintsRemaining = Math.floor(remaining / decisionSprint.reserveHours);
  const forecastWindows = buildForecastWindows(booked, decisionSprint.reserveHours);

  const activeEngagements: PublicEngagement[] = active.map((e) => {
    const workload = getOfferWorkload(e.offerSlug);
    return {
      label: e.publicLabel || e.clientName,
      hoursPerWeek: e.hoursPerWeek,
      startedAt: e.startedAt.toISOString(),
      offerSlug: e.offerSlug,
      offerName: workload?.label ?? null,
      deliveryPromise: workload?.deliveryPromise ?? null,
    };
  });

  const offerCapacity: PublicOfferCapacity[] = FEATURED_WORKLOAD_SLUGS.map((slug) => {
    const workload = getOfferWorkload(slug) as OfferWorkload;
    const fit = capacityFit(remaining, workload);
    return {
      slug,
      label: workload.label,
      visibleTime: workload.visibleTime,
      planningHours: workload.planningHours,
      reserveHours: workload.reserveHours,
      deliveryPromise: workload.deliveryPromise,
      workloadNote: workload.workloadNote,
      dueDate: deliveryDueDate(new Date(), workload)?.toISOString() ?? null,
      blocksRemaining: fit.blocksRemaining,
      fitsThisWeek: fit.fitsThisWeek,
      reserveLabel: formatHours(workload.reserveHours),
    };
  });

  return {
    capacity: WEEKLY_CAPACITY_HOURS,
    booked,
    remaining,
    utilizationPct,
    decisionSprintReserveHours: decisionSprint.reserveHours,
    decisionSprintsRemaining,
    activeClientCount: active.length,
    recentlyCompletedCount: recentlyCompleted,
    activeEngagements,
    offerCapacity,
    forecastWindows,
    status,
    lastUpdated: new Date().toISOString(),
  };
}
