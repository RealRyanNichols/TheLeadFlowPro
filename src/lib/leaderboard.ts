// src/lib/leaderboard.ts — East TX Top 10 leaderboard domain logic.
//
// Pay-to-rank: $1 = 1 point. Top 3 each week get featured + a badge.
// 70 cents of every $1 placed is reserved for East Texas organizations,
// charity events, or local causes, with public check/photo proof after
// distributions.
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

export const GIVEBACK_TARGETS = [
  {
    id: "ryan-routes",
    shortLabel: "Ryan routes it",
    label: "Let Ryan route it where it helps most",
    description:
      "Default option. Ryan reviews the live need, the vote data, and the available giveback pool before routing funds.",
  },
  {
    id: "don-patty-belize",
    shortLabel: "Belize mission trip",
    label: "Don & Patty Nichols — Belize mission trip",
    description:
      "Founding giveback target: help support Don and Patty Nichols' upcoming mission trip to Belize.",
  },
  {
    id: "patrick-johnson-j-star",
    shortLabel: "J-Star Ministries",
    label: "Patrick Johnson — J-Star Ministries",
    description:
      "Founding East Texas ministry giveback target for Patrick Johnson and J-Star Ministries.",
  },
  {
    id: "suggest-local-ministry",
    shortLabel: "Suggest a ministry",
    label: "Suggest an East Texas ministry",
    description:
      "Tell Ryan which local ministry should be considered next. Suggestions are reviewed before funds are routed.",
  },
] as const;

export type GivebackTargetId = (typeof GIVEBACK_TARGETS)[number]["id"];

export const DEFAULT_GIVEBACK_TARGET_ID: GivebackTargetId = "ryan-routes";

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
  imageUrl: string | null;
  points: number;
  pctOfTop: number; // 0..100, % of #1's points (for bar width)
};

export type LeaderboardBoostPublic = {
  publicName: string;
  city: string | null;
  message: string;
  imageUrl: string | null;
  websiteUrl: string | null;
  amountDollars: number;
  expiresInSeconds: number;
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
  totalGivebackCents: number;
  givebackRate: number;
  entries: LeaderboardEntryPublic[];
  ticker: LeaderboardTickerItem[];
  boosts: LeaderboardBoostPublic[];
  lastUpdated: string;
};

export const LEADERBOARD_GIVEBACK_RATE = 0.7;

export function leaderboardGivebackCents(amountDollars: number): number {
  if (!Number.isFinite(amountDollars) || amountDollars <= 0) return 0;
  return Math.round(amountDollars * 100 * LEADERBOARD_GIVEBACK_RATE);
}

export async function getLeaderboardSnapshot(): Promise<LeaderboardSnapshotPublic> {
  const weekStart = currentWeekStart();
  const weekEnd = nextWeekStart();
  const now = new Date();

  const [entries, ticker, totalAgg, activeBoosts] = await Promise.all([
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
    prisma.boostMessage.findMany({
      where: { expiresAt: { gt: now } },
      orderBy: [{ amountDollars: "desc" }, { expiresAt: "desc" }],
      take: 6,
    }),
  ]);

  // Pre-fetch business image URLs for entries that don't have one inlined
  const namesNeedingImage = entries.filter((e) => !e.imageUrl).map((e) => e.publicName);
  const profileImages: Record<string, string | null> = {};
  if (namesNeedingImage.length > 0) {
    const profiles = await prisma.businessProfile.findMany({
      where: { publicName: { in: namesNeedingImage } },
      select: { publicName: true, imageUrl: true },
    });
    for (const p of profiles) profileImages[p.publicName] = p.imageUrl;
  }

  const topPoints = entries[0]?.points ?? 1;
  const entriesPublic: LeaderboardEntryPublic[] = entries.map((e, i) => ({
    rank: i + 1,
    publicName: e.publicName,
    city: e.city,
    category: e.category,
    websiteUrl: e.websiteUrl,
    socialUrl: e.socialUrl,
    imageUrl: e.imageUrl || profileImages[e.publicName] || null,
    points: e.points,
    pctOfTop: Math.max(2, Math.round((e.points / Math.max(1, topPoints)) * 100)),
  }));

  const boosts: LeaderboardBoostPublic[] = activeBoosts.map((b) => ({
    publicName: b.publicName,
    city: b.city,
    message: b.message,
    imageUrl: b.imageUrl,
    websiteUrl: b.websiteUrl,
    amountDollars: b.amountDollars,
    expiresInSeconds: Math.max(0, Math.floor((b.expiresAt.getTime() - now.getTime()) / 1000)),
  }));

  const nowMs = Date.now();
  const tickerItems: LeaderboardTickerItem[] = ticker.map((p) => ({
    publicName: p.publicName,
    city: p.city,
    amountDollars: p.amountDollars,
    agoSeconds: Math.max(1, Math.floor((nowMs - p.createdAt.getTime()) / 1000)),
  }));

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    resetsInSeconds: Math.max(0, Math.floor((weekEnd.getTime() - nowMs) / 1000)),
    totalEntries: entries.length,
    totalDollars: totalAgg._sum.amountDollars ?? 0,
    totalGivebackCents: leaderboardGivebackCents(totalAgg._sum.amountDollars ?? 0),
    givebackRate: LEADERBOARD_GIVEBACK_RATE,
    entries: entriesPublic,
    ticker: tickerItems,
    boosts,
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

export function normalizePublicUrl(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value).trim().slice(0, 200);
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function sanitizeGivebackNote(value: unknown): string {
  if (!value) return "";
  return String(value)
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function resolveGivebackTarget(targetId: unknown, note?: unknown) {
  const requestedId = String(targetId || DEFAULT_GIVEBACK_TARGET_ID);
  const target =
    GIVEBACK_TARGETS.find((item) => item.id === requestedId) ||
    GIVEBACK_TARGETS.find((item) => item.id === DEFAULT_GIVEBACK_TARGET_ID)!;
  const cleanNote = target.id === "suggest-local-ministry" ? sanitizeGivebackNote(note) : "";
  const label = cleanNote ? `${target.shortLabel}: ${cleanNote}` : target.label;

  return {
    id: target.id,
    shortLabel: target.shortLabel,
    label,
    note: cleanNote,
    description: target.description,
  };
}

export const MIN_DOLLARS = 1;
export const MAX_DOLLARS = 10_000;

export function clampDollars(n: number): number {
  if (!Number.isFinite(n)) return MIN_DOLLARS;
  return Math.max(MIN_DOLLARS, Math.min(MAX_DOLLARS, Math.round(n)));
}
