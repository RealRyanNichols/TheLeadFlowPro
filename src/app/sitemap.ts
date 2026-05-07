// src/app/sitemap.ts — auto-generated XML sitemap.

import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://theleadflowpro.com";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "", "/services", "/services/consulting", "/tiers", "/story",
    "/availability", "/leaderboard", "/voice", "/contact", "/book",
    "/legal", "/login", "/demo", "/start",
  ].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1.0 : 0.7,
  }));

  // Offer pages
  const offerRoutes: MetadataRoute.Sitemap = [
    "quick-look", "decision-sprint", "business-audit", "working-session",
    "sprint-4-week", "light-retainer", "power-bundle", "fb-ads",
    "monthly-operator", "annual-advisor",
  ].map((slug) => ({
    url: `${BASE}/offers/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Platform pages
  const platformRoutes: MetadataRoute.Sitemap = ["tiktok", "facebook", "x", "youtube"].map((h) => ({
    url: `${BASE}/platforms/${h}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Business profile pages (dynamic)
  let businessRoutes: MetadataRoute.Sitemap = [];
  try {
    const businesses = await prisma.businessProfile.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { totalLifetimeDollars: "desc" },
      take: 1000,
    });
    businessRoutes = businesses.map((b) => ({
      url: `${BASE}/b/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch {}

  // Voice topics (dynamic)
  let voiceRoutes: MetadataRoute.Sitemap = [];
  try {
    const topics = await prisma.voiceTopic.findMany({
      where: { status: "open" },
      select: { slug: true, updatedAt: true },
      take: 500,
    });
    voiceRoutes = topics.map((t) => ({
      url: `${BASE}/voice/${t.slug}`,
      lastModified: t.updatedAt,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    }));
  } catch {}

  return [...staticRoutes, ...offerRoutes, ...platformRoutes, ...businessRoutes, ...voiceRoutes];
}
