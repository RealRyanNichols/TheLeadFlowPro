// src/lib/capacity.ts — bandwidth-tracker domain logic.
//
// Public meter reads via getCapacitySnapshot(). The "booked" number is the
// SUM of hoursPerWeek across all engagements where status='active'. Capacity
// cap is fixed at 60 hours/week (Ryan's stated limit).

import { prisma } from "./prisma";

export const WEEKLY_CAPACITY_HOURS = 60;

export type CapacitySnapshot = {
  capacity: number;        // 60
  booked: number;          // sum of active engagements' hoursPerWeek
  remaining: number;       // capacity - booked, floor 0
  utilizationPct: number;  // 0..100
  activeClientCount: number;
  recentlyCompletedCount: number;
  activeEngagements: PublicEngagement[];
  status: "open" | "limited" | "full"; // open <= 50%, limited <= 90%, full > 90%
  lastUpdated: string;     // ISO
};

export type PublicEngagement = {
  label: string;       // publicLabel || clientName
  hoursPerWeek: number;
  startedAt: string;   // ISO date
  offerSlug: string | null;
};

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

  const activeEngagements: PublicEngagement[] = active.map((e) => ({
    label: e.publicLabel || e.clientName,
    hoursPerWeek: e.hoursPerWeek,
    startedAt: e.startedAt.toISOString(),
    offerSlug: e.offerSlug,
  }));

  return {
    capacity: WEEKLY_CAPACITY_HOURS,
    booked,
    remaining,
    utilizationPct,
    activeClientCount: active.length,
    recentlyCompletedCount: recentlyCompleted,
    activeEngagements,
    status,
    lastUpdated: new Date().toISOString(),
  };
}
