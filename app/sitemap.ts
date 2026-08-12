import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { TOOLS } from "@/lib/tools";
import { TIERS } from "@/lib/tiers";

const BASE = "https://www.theleadflowpro.com";

// Package detail slugs. PACKS lives inside app/packages/[slug]/page.tsx and Next.js
// does not allow importing arbitrary exports out of a page module, so the list is
// mirrored here. Add a package there, add its slug here, or Google never sees it.
const PACKAGE_SLUGS = ["system-map", "launch", "industry-os"];

export default function sitemap(): MetadataRoute.Sitemap {
  // Public marketing pages. Anything gated, private, or thin stays out:
  // /admin, /dashboard, /login, /training, /thank-you, /go, /embed.
  const pages = [
    "",
    "/start",
    "/pricing",
    "/add-ons",
    "/tools",
    "/free-build",
    "/portfolio",
    "/showcase",
    "/demo",
    "/events",
    "/articles",
    "/book",
    "/contact",
    "/privacy",
    "/terms",
  ];

  return [
    ...pages.map((p) => ({
      url: `${BASE}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    // Free tools are the give-it-away strategy. They have to be crawlable.
    ...TOOLS.map((t) => ({
      url: `${BASE}/tools/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...Object.keys(TIERS).map((tier) => ({
      url: `${BASE}/pricing/${tier}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
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
