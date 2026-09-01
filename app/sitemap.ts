import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { TOOLS } from "@/lib/tools";
import { PUBLISHED_COLLECTIONS } from "@/lib/tools/collections";
import { STAGE_SLUGS } from "@/lib/system-stages";

const BASE = "https://www.theleadflowpro.com";
const PACKAGE_SLUGS = ["system-map", "launch", "industry-os"];

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    "",
    "/free-build",
    "/start",
    "/diagnostic",
    "/operatoros",
    "/proof-floor",
    "/about",
    "/pricing",
    "/add-ons",
    "/tools",
    "/packages",
    "/portfolio",
    "/premier-system",
    "/live",
    "/showcase",
    "/demo",
    "/events",
    "/articles",
    "/book",
    "/operator-academy/content-engine",
    "/contact",
    "/go/lead-follow-up",
    "/go/tools",
    "/privacy",
    "/terms",
  ];

  return [
    ...pages.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    ...STAGE_SLUGS.map((slug) => ({
      url: `${BASE}/system/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...TOOLS.map((t) => ({
      url: `${BASE}/tools/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...PUBLISHED_COLLECTIONS.map((c) => ({
      url: `${BASE}/tools/collections/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...PACKAGE_SLUGS.map((slug) => ({
      url: `${BASE}/packages/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...ARTICLES.map((a) => ({
      url: `${BASE}/articles/${a.slug}`,
      lastModified: a.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
