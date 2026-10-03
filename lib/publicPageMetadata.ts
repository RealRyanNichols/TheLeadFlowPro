import type { Metadata } from "next";
import { uniqueOgImagePath } from "./uniqueOgImages";
import { PUBLIC_PAGE_CATALOG } from "./publicPageCatalog";

export const PUBLIC_SITE_URL = "https://www.theleadflowpro.com";
export const PUBLIC_OG_SIZE = { width: 1200, height: 630 } as const;
// A finite version segment refreshes crawler caches without putting query text,
// tokens, or user-provided values into a public share URL.
export const PUBLIC_OG_REVISION = "violet-20261003";

// Finished, page-specific creatives for the destinations receiving paid traffic.
// Dated URLs prompt social crawlers to fetch the new artwork instead of old cards.
export const AD_PAGE_SOCIAL_IMAGES: Readonly<Record<string, string>> = {
  "/premier-system": "/images/social/premier-system-20260907.jpg",
  "/portfolio": "/images/social/portfolio-20260907.jpg",
  "/results": "/images/social/results-20260907.jpg",
  "/commerce": "/images/social/commerce-20260907.jpg",
  "/scoreboard": "/images/social/scoreboard-20260907.jpg",
};

/** Only canonical paths enter metadata. Tokens and user-entered text never enter OG URLs. */
export function isCanonicalPublicPath(path: string): boolean {
  return (
    path === "/" ||
    /^\/[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\/[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)*$/.test(
      path,
    )
  );
}

export function publicPageImagePath(path: string): string {
  if (!isCanonicalPublicPath(path))
    throw new Error("A canonical page path is required");
  // The revised managed offer must not inherit the retired build-ladder card.
  if (path === "/pricing") return `/og/pages/pricing/${PUBLIC_OG_REVISION}`;
  return (
    uniqueOgImagePath(path) ??
    AD_PAGE_SOCIAL_IMAGES[path] ??
    `/og/pages${path === "/" ? "/home" : path}/${PUBLIC_OG_REVISION}`
  );
}

function textTitle(title: Metadata["title"], fallback: string): string {
  if (typeof title === "string") return title;
  if (title && "absolute" in title && typeof title.absolute === "string")
    return title.absolute;
  if (title && "default" in title && typeof title.default === "string")
    return title.default;
  return fallback;
}

/** Page metadata stays authoritative; only the canonical and social envelope are shared. */
export function withPublicPageMetadata(
  path: string,
  metadata: Metadata,
): Metadata {
  const imagePath = publicPageImagePath(path);
  const canonical = `${PUBLIC_SITE_URL}${path === "/" ? "" : path}`;
  const title = textTitle(metadata.title, "The LeadFlow Pro");
  const description =
    metadata.description ??
    PUBLIC_PAGE_CATALOG.find((page) => page.path === path)?.description ??
    "Practical tools, learning, and business systems from The LeadFlow Pro.";
  const socialTitle = textTitle(metadata.openGraph?.title, title);
  const socialDescription = metadata.openGraph?.description ?? description;
  const image = {
    url: `${PUBLIC_SITE_URL}${imagePath}`,
    ...PUBLIC_OG_SIZE,
    alt: `${socialTitle} — The LeadFlow Pro`,
  };
  return {
    ...metadata,
    description,
    alternates: { ...metadata.alternates, canonical },
    openGraph: {
      type: "website",
      ...metadata.openGraph,
      title: socialTitle,
      description: socialDescription,
      siteName: "The LeadFlow Pro",
      url: canonical,
      images: [image],
    },
    twitter: {
      ...metadata.twitter,
      card: "summary_large_image",
      title: socialTitle,
      description: socialDescription,
      images: [image],
    },
  };
}

export const PRIVATE_PAGE_METADATA: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
  referrer: "no-referrer",
};
