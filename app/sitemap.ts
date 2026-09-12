import type { MetadataRoute } from "next";
import { getPublishedArticles } from "@/lib/articles";
import { TOOLS } from "@/lib/tools";
import { PRO_TOOLS } from "@/lib/tools/pro";
import { PUBLISHED_COLLECTIONS } from "@/lib/tools/collections";
import { STAGE_SLUGS } from "@/lib/system-stages";
import { OPERATOR_ACADEMY_COURSES } from "@/lib/operatorAcademyCatalog";
import { SCOREBOARD_BUSINESSES } from "@/lib/scoreboard";
import { PUBLIC_PAGE_CATALOG } from "@/lib/publicPageCatalog";
import { METRIC_GUIDES } from "@/lib/scoreboardMetrics";

export const dynamic = "force-dynamic";

const BASE = "https://www.theleadflowpro.com";

// Catalogued pages sit at 0.7 unless they carry a product of their own.
const PAGE_PRIORITY: Record<string, number> = {
  "": 1,
  "/plugin": 0.9,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = PUBLIC_PAGE_CATALOG.filter(
    (page) => !("index" in page && page.index === false),
  ).map((page) => (page.path === "/" ? "" : page.path));

  return [
    ...pages.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: PAGE_PRIORITY[p] ?? 0.7,
    })),
    ...OPERATOR_ACADEMY_COURSES.map((course) => ({
      url: `${BASE}/training/${course.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...SCOREBOARD_BUSINESSES.map((business) => ({
      url: `${BASE}/scoreboard/${business.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
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
    ...PRO_TOOLS.map((t) => ({
      url: `${BASE}/tools/pro/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...PUBLISHED_COLLECTIONS.map((c) => ({
      url: `${BASE}/tools/collections/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...METRIC_GUIDES.map((metric) => ({
      url: `${BASE}/scoreboard/metrics/${metric.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...getPublishedArticles().map((a) => ({
      url: `${BASE}/articles/${a.slug}`,
      lastModified: a.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
