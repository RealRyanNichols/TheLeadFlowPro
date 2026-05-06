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
  booked: number;          // recurring weekly commitments + due work-order hours
  remaining: number;       // capacity - booked, floor 0
  utilizationPct: number;  // 0..100
  recurringBooked: number;
  dueWorkOrderHours: number;
  openWorkOrderHours: number;
  decisionSprintReserveHours: number;
  decisionSprintsRemaining: number;
  activeClientCount: number;
  recentlyCompletedCount: number;
  activeEngagements: PublicEngagement[];
  activeWorkOrders: PublicWorkOrder[];
  workOrderSummary: PublicWorkOrderSummary;
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

export type PublicWorkOrder = {
  id: string;
  label: string;
  title: string;
  offerSlug: string | null;
  offerName: string | null;
  status: string;
  estimatedHours: number;
  completedHours: number;
  remainingHours: number;
  dueAt: string | null;
  deliveryGuaranteeDays: number | null;
};

export type PublicWorkOrderSummary = {
  openCount: number;
  dueThisWeekCount: number;
  pendingReviewCount: number;
  waitingOnClientCount: number;
  estimatedHours: number;
  completedHours: number;
  remainingHours: number;
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

type WorkOrderRow = {
  id: string;
  clientName: string;
  publicLabel: string | null;
  offerSlug: string | null;
  title: string;
  status: string;
  estimatedHours: number;
  completedHours: number;
  deliveryGuaranteeDays: number | null;
  dueAt: Date | null;
};

const CLOSED_WORK_ORDER_STATUSES = new Set(["delivered", "completed", "canceled"]);

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

function remainingWorkOrderHours(order: Pick<WorkOrderRow, "estimatedHours" | "completedHours">): number {
  return Math.max(0, roundHours(order.estimatedHours - order.completedHours));
}

function orderCountsInWindow(order: WorkOrderRow, horizon: Date): boolean {
  if (CLOSED_WORK_ORDER_STATUSES.has(order.status)) return false;
  if (!order.dueAt) return true;
  return order.dueAt <= horizon;
}

async function getWorkOrdersSafe(): Promise<WorkOrderRow[]> {
  try {
    const rows = await (prisma as any).workOrder.findMany({
      where: { status: { notIn: Array.from(CLOSED_WORK_ORDER_STATUSES) } },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((row: any) => ({
      id: row.id,
      clientName: row.clientName,
      publicLabel: row.publicLabel ?? null,
      offerSlug: row.offerSlug ?? null,
      title: row.title,
      status: row.status,
      estimatedHours: Number(row.estimatedHours ?? 0),
      completedHours: Number(row.completedHours ?? 0),
      deliveryGuaranteeDays: row.deliveryGuaranteeDays ?? null,
      dueAt: row.dueAt ? new Date(row.dueAt) : null,
    }));
  } catch {
    // Build/deploy remains safe before the WorkOrder table is pushed to Supabase.
    return [];
  }
}

function buildForecastWindows(
  bookedPerWeek: number,
  workOrders: WorkOrderRow[],
  reserveHours: number,
): CapacityForecastWindow[] {
  return FORECAST_WINDOWS.map((window) => {
    const weeks = window.days / 7;
    const horizon = new Date(Date.now() + window.days * 24 * 60 * 60 * 1000);
    const windowOrderHours = workOrders
      .filter((order) => orderCountsInWindow(order, horizon))
      .reduce((sum, order) => sum + remainingWorkOrderHours(order), 0);
    const capacityHours = roundHours(WEEKLY_CAPACITY_HOURS * weeks);
    const bookedHours = roundHours(bookedPerWeek * weeks + windowOrderHours);
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
  const [active, recentlyCompleted, workOrders] = await Promise.all([
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
    getWorkOrdersSafe(),
  ]);

  const recurringBooked = active.reduce((sum, e) => sum + (e.hoursPerWeek ?? 0), 0);
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const dueWorkOrderHours = workOrders
    .filter((order) => orderCountsInWindow(order, oneWeekFromNow))
    .reduce((sum, order) => sum + remainingWorkOrderHours(order), 0);
  const openWorkOrderHours = workOrders.reduce((sum, order) => sum + remainingWorkOrderHours(order), 0);
  const booked = roundHours(recurringBooked + dueWorkOrderHours);
  const remaining = Math.max(0, WEEKLY_CAPACITY_HOURS - booked);
  const utilizationPct = Math.min(100, Math.round((booked / WEEKLY_CAPACITY_HOURS) * 100));

  const status: CapacitySnapshot["status"] =
    utilizationPct >= 90 ? "full" : utilizationPct >= 50 ? "limited" : "open";

  const decisionSprint = getOfferWorkload("decision-sprint") as OfferWorkload;
  const decisionSprintsRemaining = Math.floor(remaining / decisionSprint.reserveHours);
  const forecastWindows = buildForecastWindows(recurringBooked, workOrders, decisionSprint.reserveHours);

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

  const activeWorkOrders: PublicWorkOrder[] = workOrders.map((order) => {
    const workload = getOfferWorkload(order.offerSlug);
    return {
      id: order.id,
      label: order.publicLabel || order.clientName,
      title: order.title,
      offerSlug: order.offerSlug,
      offerName: workload?.label ?? null,
      status: order.status,
      estimatedHours: roundHours(order.estimatedHours),
      completedHours: roundHours(order.completedHours),
      remainingHours: remainingWorkOrderHours(order),
      dueAt: order.dueAt?.toISOString() ?? null,
      deliveryGuaranteeDays: order.deliveryGuaranteeDays,
    };
  });

  const workOrderSummary: PublicWorkOrderSummary = {
    openCount: activeWorkOrders.length,
    dueThisWeekCount: workOrders.filter((order) => orderCountsInWindow(order, oneWeekFromNow)).length,
    pendingReviewCount: workOrders.filter((order) => order.status === "pending_review").length,
    waitingOnClientCount: workOrders.filter((order) => order.status === "waiting_on_client").length,
    estimatedHours: roundHours(workOrders.reduce((sum, order) => sum + order.estimatedHours, 0)),
    completedHours: roundHours(workOrders.reduce((sum, order) => sum + order.completedHours, 0)),
    remainingHours: roundHours(openWorkOrderHours),
  };

  return {
    capacity: WEEKLY_CAPACITY_HOURS,
    booked,
    remaining,
    utilizationPct,
    recurringBooked,
    dueWorkOrderHours: roundHours(dueWorkOrderHours),
    openWorkOrderHours: roundHours(openWorkOrderHours),
    decisionSprintReserveHours: decisionSprint.reserveHours,
    decisionSprintsRemaining,
    activeClientCount: active.length,
    recentlyCompletedCount: recentlyCompleted,
    activeEngagements,
    activeWorkOrders,
    workOrderSummary,
    offerCapacity,
    forecastWindows,
    status,
    lastUpdated: new Date().toISOString(),
  };
}
