// src/app/robots.ts — robots.txt
//
// Allows normal search and AI crawlers so East Texas business/profile pages
// can be discovered and cited. Keeps admin, API-admin, and client dashboards
// out of the crawl surface.

import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theleadflowpro.com").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/api/admin/", "/dashboard/", "/audit/"] },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "GoogleOther", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "Applebot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "Bytespider", allow: "/" },
      { userAgent: "FacebookBot", allow: "/" },
      { userAgent: "Amazonbot", allow: "/" },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
