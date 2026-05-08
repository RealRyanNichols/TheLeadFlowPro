// src/app/sitemap.ts — public crawl map.
//
// Includes static buyer pages plus dynamic business profile and Voice pages
// when the database is reachable. Dynamic sections fail closed so build and
// deploy stay safe during env/schema setup.

import type { MetadataRoute } from "next";
import { OFFERS } from "@/lib/offers";
import { PLATFORMS } from "@/lib/platforms";
import { prisma } from "@/lib/prisma";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com").replace(/\/$/, "");

export const dynamic = "force-dynamic";
export const revalidate = 300;

const staticRoutes = [
  "",
  "/services",
  "/services/consulting",
  "/tiers",
  "/story",
  "/availability",
  "/leaderboard",
  "/voice",
  "/challenge",
  "/challenge/insights/monthly-exposure",
  "/challenge/insights/hours-per-month",
  "/challenge/insights/build-estimate",
  "/community",
  "/pulse",
  "/rewards",
  "/support",
  "/tools/seo-grader",
  "/tools/ad-account-autopsy",
  "/solutions/mortgage",
  "/contact",
  "/book",
  "/legal",
  "/login",
  "/demo",
  "/start",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticSitemap: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === "/leaderboard" || path === "/voice" || path === "/pulse" ? "hourly" : "weekly",
    priority: path === "" ? 1 : path === "/leaderboard" || path === "/challenge" ? 0.9 : 0.7,
  }));

  const offerRoutes: MetadataRoute.Sitemap = Object.keys(OFFERS).map((slug) => ({
    url: `${BASE}/offers/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const platformRoutes: MetadataRoute.Sitemap = Object.keys(PLATFORMS).map((handle) => ({
    url: `${BASE}/platforms/${handle}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  let businessRoutes: MetadataRoute.Sitemap = [];
  try {
    const businesses = await prisma.businessProfile.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { totalLifetimeDollars: "desc" },
      take: 1000,
    });
    businessRoutes = businesses.map((business) => ({
      url: `${BASE}/b/${business.slug}`,
      lastModified: business.updatedAt,
      changeFrequency: "daily",
      priority: 0.6,
    }));
  } catch {}

  let voiceRoutes: MetadataRoute.Sitemap = [];
  try {
    const topics = await prisma.voiceTopic.findMany({
      where: { status: "open" },
      select: { slug: true, updatedAt: true },
      take: 500,
    });
    voiceRoutes = topics.map((topic) => ({
      url: `${BASE}/voice/${topic.slug}`,
      lastModified: topic.updatedAt,
      changeFrequency: "hourly",
      priority: 0.7,
    }));
  } catch {}

  return [...staticSitemap, ...offerRoutes, ...platformRoutes, ...businessRoutes, ...voiceRoutes];
}
