// Page metadata and sitemap entries for the directory.
//
// Profiles, categories, "new", and "hiring" are not in the public page
// catalog (their paths come from data), so they share the one catalogued card
// for /longview/businesses as their social image. Every directory page is
// noindex until the owner turns on the directory's indexable switch; profiles
// also need their own isIndexable.

import type { Metadata, MetadataRoute } from "next";
import { PUBLIC_OG_SIZE, PUBLIC_SITE_URL, publicPageImagePath } from "../publicPageMetadata";
import { businessPath, categoryPath } from "./display";
import { isDirectoryIndexable, isIndexable } from "./query";
import { DIRECTORY_PATH, type Directory } from "./types";

export const NOINDEX: Metadata["robots"] = { index: false, follow: true };

export function directoryRobots(index: boolean): Metadata["robots"] {
  return index ? { index: true, follow: true } : NOINDEX;
}

/** Canonical, Open Graph, and Twitter for a directory page whose path comes from data. */
export function directoryPageMetadata(input: {
  path: string;
  title: string;
  description: string;
  index: boolean;
}): Metadata {
  const url = `${PUBLIC_SITE_URL}${input.path}`;
  const image = {
    url: `${PUBLIC_SITE_URL}${publicPageImagePath(DIRECTORY_PATH)}`,
    ...PUBLIC_OG_SIZE,
    alt: "Longview businesses — The LeadFlow Pro",
  };
  return {
    title: input.title,
    description: input.description,
    robots: directoryRobots(input.index),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: input.title,
      description: input.description,
      siteName: "The LeadFlow Pro",
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}

/** Nothing until the owner's switch is on; then the index, categories, and indexable profiles. */
export function directorySitemapEntries(directory: Directory, base = PUBLIC_SITE_URL): MetadataRoute.Sitemap {
  if (!isDirectoryIndexable(directory)) return [];
  return [
    { url: `${base}${DIRECTORY_PATH}`, changeFrequency: "weekly", priority: 0.6 },
    ...directory.categories.map((c) => ({
      url: `${base}${categoryPath(c.slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...directory.businesses
      .filter((b) => isIndexable(directory, b))
      .map((b) => ({
        url: `${base}${businessPath(b.slug)}`,
        lastModified: b.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
  ];
}
