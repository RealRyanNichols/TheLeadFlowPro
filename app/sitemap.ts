import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";

const BASE = "https://www.theleadflowpro.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/start", "/pricing", "/portfolio", "/articles", "/contact", "/privacy", "/terms"];
  return [
    ...pages.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    ...ARTICLES.map((a) => ({
      url: `${BASE}/articles/${a.slug}`,
      lastModified: a.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
