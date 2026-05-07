// src/lib/leaderboard.ts — East TX Top 10 leaderboard domain logic.
//
// Pay-to-rank: $1 = 1 point. Top 3 each week get featured + a badge.
// Resets every Sunday 00:00 CT.

import { prisma } from "./prisma";

/* ─── East Texas geography (the canonical "in" list) ──────────── */

export const EAST_TX_CITIES = [
  "Tyler",
  "Longview",
  "Marshall",
  "Henderson",
  "Carthage",
  "Texarkana",
  "Nacogdoches",
  "Lufkin",
  "Jacksonville",
  "Athens",
  "Mount Pleasant",
  "Palestine",
  "Kilgore",
  "Sulphur Springs",
  "Mineola",
  "Gilmer",
  "Pittsburg",
  "Atlanta",
  "Linden",
  "Daingerfield",
  "Gladewater",
  "Big Sandy",
  "Hawkins",
  "Hallsville",
  "Whitehouse",
  "Bullard",
  "Lindale",
  "Brownsboro",
  "Frankston",
  "Crockett",
  "Rusk",
  "Mount Vernon",
  "Pittsburg",
  "Quitman",
  "Winnsboro",
  "Clarksville",
  "Paris",
  "Mount Enterprise",
  "Tatum",
  "Other East TX town",
] as const;

export const CATEGORIES = [
  "Roofing & Construction",
  "Restaurant & Food",
  "Retail & Boutique",
  "Home Services",
  "Health & Wellness",
  "Real Estate",
  "Mortgage & Lending",
  "Legal",
  "Auto & Repair",
  "Beauty & Salon",
  "Dental & Medical",
  "Fitness & Gym",
  "Photography & Media",
  "Creator / Personal Brand",
  "Church & Non-profit",
  "Other",
] as const;

/* ─── Week math ─────────────────────────────────────────────────── */

/**
 * Returns the Monday 00:00 Central Time of the current week, in UTC.
 * "Week" runs Monday–Sunday. Reset happens Sunday midnight CT
 * (= Monday 06:00 UTC during DST, 06:00 UTC otherwise).
 *
 * For simplicity we treat the week as Monday 00:00 UTC since CT/UTC
 * differ only by 5–6 hours which is acceptable for the meter.
 */
export function currentWeekStart(now: Date = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday, 1 = Monday
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function nextWeekStart(now: Date = new Date()): Date {
  const cur = currentWeekStart(now);
  const next = new Date(cur);
  next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

/* ─── Snapshot for the public page ─────────────────────────────── */

export type LeaderboardEntryPublic = {
  rank: number;
  publicName: string;
  city: string | null;
  category: string | null;
  websiteUrl: string | null;
  socialUrl: string | null;
  points: number;
  pctOfTop: number; // 0..100, % of #1's points (for bar width)
};

export type LeaderboardTickerItem = {
  publicName: string;
  city: string | null;
  amountDollars: number;
  agoSeconds: number;
};

export type LeaderboardSnapshotPublic = {
  weekStart: string;       // ISO
  weekEnd: string;         // ISO
  resetsInSeconds: number; // until next week start
  totalEntries: number;
  totalDollars: number;
  entries: LeaderboardEntryPublic[];
  ticker: LeaderboardTickerItem[];
  lastUpdated: string;
};

export async function getLeaderboardSnapshot(): Promise<LeaderboardSnapshotPublic> {
  const weekStart = currentWeekStart();
  const weekEnd = nextWeekStart();

  const [entries, ticker, totalAgg] = await Promise.all([
    prisma.leaderboardEntry.findMany({
      where: { weekStart },
      orderBy: { points: "desc" },
      take: 50,
    }),
    prisma.leaderboardPurchase.findMany({
      where: { weekStart },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.leaderboardPurchase.aggregate({
      where: { weekStart },
      _sum: { amountDollars: true },
    }),
  ]);

  const topPoints = entries[0]?.points ?? 1;
  const entriesPublic: LeaderboardEntryPublic[] = entries.map((e, i) => ({
    rank: i + 1,
    publicName: e.publicName,
    city: e.city,
    category: e.category,
    websiteUrl: e.websiteUrl,
    socialUrl: e.socialUrl,
    points: e.points,
    pctOfTop: Math.max(2, Math.round((e.points / Math.max(1, topPoints)) * 100)),
  }));

  const now = Date.now();
  const tickerItems: LeaderboardTickerItem[] = ticker.map((p) => ({
    publicName: p.publicName,
    city: p.city,
    amountDollars: p.amountDollars,
    agoSeconds: Math.max(1, Math.floor((now - p.createdAt.getTime()) / 1000)),
  }));

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    resetsInSeconds: Math.max(0, Math.floor((weekEnd.getTime() - now) / 1000)),
    totalEntries: entries.length,
    totalDollars: totalAgg._sum.amountDollars ?? 0,
    entries: entriesPublic,
    ticker: tickerItems,
    lastUpdated: new Date().toISOString(),
  };
}

/* ─── Validation ────────────────────────────────────────────────── */

export function sanitizeName(name: string): string {
  return name.replace(/[^\w\s&'.\-,]/g, "").trim().slice(0, 80);
}

export function isValidEastTexasCity(city: string | null | undefined): boolean {
  if (!city) return false;
  return (EAST_TX_CITIES as readonly string[]).includes(city);
}

export function isValidCategory(cat: string | null | undefined): boolean {
  if (!cat) return false;
  return (CATEGORIES as readonly string[]).includes(cat);
}

export const MIN_DOLLARS = 1;
export const MAX_DOLLARS = 10_000;

export function clampDollars(n: number): number {
  if (!Number.isFinite(n)) return MIN_DOLLARS;
  return Math.max(MIN_DOLLARS, Math.min(MAX_DOLLARS, Math.round(n)));
}
