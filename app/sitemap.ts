import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/articles";
import { TOOLS } from "@/lib/tools";
import { PUBLISHED_COLLECTIONS } from "@/lib/tools/collections";
import { STAGE_SLUGS } from "@/lib/system-stages";
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
    "/about",
    "/pricing",
    "/add-ons",
    "/tools",
    "/packages",
    "/portfolio",
    "/live",
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
    // The eight stage pages: each one targets its own keyword set.
    ...STAGE_SLUGS.map((slug) => ({
      url: `${BASE}/system/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Free tools are the give-it-away strategy. They have to be crawlable.
    // Only published tools are in TOOLS at all, so nothing unfinished leaks out.
    ...TOOLS.map((t) => ({
      url: `${BASE}/tools/${t.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // Collections carry their own written content and only exist when enough
    // real tools sit behind them, so they are worth indexing.
    ...PUBLISHED_COLLECTIONS.map((c) => ({
      url: `${BASE}/tools/collections/${c.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
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
