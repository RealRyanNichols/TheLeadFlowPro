import type { MetadataRoute } from "next";
import { loadConfig } from "../lib/load";

export default function robots(): MetadataRoute.Robots {
  const c = loadConfig();
  if (c.launch.status !== "live") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api"] }], sitemap: `${c.seo.siteUrl}/sitemap.xml` };
}
