// src/app/sitemap.ts: public crawl map for the clean core.
// Static front-door + legal routes, plus the dynamic offer and industry pages.

import type { MetadataRoute } from "next";
import { OFFERS } from "@/lib/offers";
import { leadFlowIndustrySlugs } from "@/lib/leadflow-industries";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com").replace(/\/$/, "");

export const revalidate = 3600;

const staticRoutes = [
  "",
  "/buy-leads",
  "/pricing",
  "/build-my-system",
  "/submit-source",
  "/problem-intake",
  "/industries",
  "/privacy-center",
  "/contact",
  "/legal",
  "/privacy-policy",
  "/terms",
  "/refunds",
  "/login",
  "/signup",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticSitemap: MetadataRoute.Sitemap = staticRoutes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const offerRoutes: MetadataRoute.Sitemap = (Object.keys(OFFERS) as (keyof typeof OFFERS)[]).map((slug) => ({
    url: `${BASE}/offers/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const industryRoutes: MetadataRoute.Sitemap = leadFlowIndustrySlugs.map((slug) => ({
    url: `${BASE}/industries/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticSitemap, ...offerRoutes, ...industryRoutes];
}
