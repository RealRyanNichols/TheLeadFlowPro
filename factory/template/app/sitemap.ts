import type { MetadataRoute } from "next";
import { loadConfig, } from "../lib/load";
import { siteRoutes } from "../lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const c = loadConfig();
  if (c.launch.status !== "live") return [];
  return siteRoutes(c).map((r) => ({ url: `${c.seo.siteUrl}${r.href === "/" ? "" : r.href}`, changeFrequency: "monthly" as const, priority: r.key === "home" ? 1 : 0.7 }));
}
