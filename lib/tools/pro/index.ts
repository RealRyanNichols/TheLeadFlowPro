// The pro kit registry.
//
// A pro kit is a tool from the same engine as the 86 free tools, with two
// differences: it produces documents (a printable kit, files, scripts, artwork)
// from the buyer's own numbers, and those documents stay locked until the kit
// is bought. The math and the preview are free to play with, always.
//
// Kits live in their own registry on purpose. They never appear in TOOLS, the
// free directory, the free sitemap entries, search, or the embed route. The
// free library stays free; this is the shelf next to it.

import { getTool, resolveTool, type Tool } from "../index";
import type { ToolDocument, ToolVisual } from "../types";
import { PRO_KIT_DEFS, PRO_KIT_VISUALS } from "./kits";
import type { ProTool, ProToolDef } from "./types";

export type { ProTool, ProToolDef } from "./types";
export { PRO_PRICES } from "./types";

/* --------------------------------- bundle --------------------------------- */

/** Every kit, one price. The kind is what lands in purchases.kind. */
export const PRO_BUNDLE = {
  id: "pro_bundle",
  kind: "pro_bundle",
  name: "Every Pro Kit",
  priceUsd: 39,
  promise: "Every kit on this shelf, and every kit added after, unlocked on one key.",
  pitch:
    "Any three kits bought alone cost more than the whole shelf. One key, every kit, including the ones added later.",
} as const;

/* -------------------------------- registry -------------------------------- */

export const ALL_PRO_TOOLS: ProTool[] = PRO_KIT_DEFS.map((def) => resolveTool(def) as ProTool);

/** What the public site sees. */
export const PRO_TOOLS: ProTool[] = ALL_PRO_TOOLS.filter((t) => t.status === "published");

export const PRO_TOOL_COUNT = PRO_TOOLS.length;

export const PRO_TOOL_VISUALS: Record<string, ToolVisual> = PRO_KIT_VISUALS;

const BY_SLUG = new Map(PRO_TOOLS.map((t) => [t.slug, t]));

export function getProTool(slug: string): ProTool | undefined {
  return BY_SLUG.get(slug);
}

export function isProSlug(slug: string): boolean {
  return BY_SLUG.has(slug);
}

/* ---------------------------------- kinds --------------------------------- */

export const PRO_TOOL_KIND_PREFIX = "pro_tool:";

/** The purchases.kind value for one kit. */
export function proKindFor(slug: string): string {
  return `${PRO_TOOL_KIND_PREFIX}${slug}`;
}

/** Every kind a key or a cookie could carry. */
export function allProKinds(): string[] {
  return [PRO_BUNDLE.kind, ...PRO_TOOLS.map((t) => proKindFor(t.slug))];
}

/** The catalog the checkout and the webhook price against. Never the browser. */
export function proCatalog(): { slug: string; name: string; priceUsd: number }[] {
  return PRO_TOOLS.map((t) => ({ slug: t.slug, name: t.name, priceUsd: t.pro.priceUsd }));
}

/* -------------------------------- upgrades -------------------------------- */

/** The kits that name this free tool as the thing they upgrade. */
export function proUpgradesFor(freeSlug: string): ProTool[] {
  return PRO_TOOLS.filter((t) => t.pro.upgradeFrom.includes(freeSlug));
}

/* ------------------------------ client index ------------------------------ */

/**
 * The serializable subset the browser needs to draw a kit card. Never ship the
 * run() function or the documents just to draw a grid.
 */
export type ProToolIndexEntry = {
  slug: string;
  name: string;
  short?: string;
  tagline: string;
  description: string;
  image: Tool["image"];
  domain: Tool["domain"];
  toolType: Tool["toolType"];
  industries: Tool["industries"];
  priceUsd: number;
  promise: string;
  kit: string[];
  popularity: number;
  isNew?: boolean;
};

export function proToolIndex(list: ProTool[] = PRO_TOOLS): ProToolIndexEntry[] {
  return list.map((t) => ({
    slug: t.slug,
    name: t.name,
    short: t.short,
    tagline: t.tagline,
    description: t.description,
    image: t.image,
    domain: t.domain,
    toolType: t.toolType,
    industries: t.industries,
    priceUsd: t.pro.priceUsd,
    promise: t.pro.promise,
    kit: t.pro.kit,
    popularity: t.popularity,
    isNew: t.isNew,
  }));
}

/* -------------------------------- documents -------------------------------- */

/**
 * What a locked visitor sees of a document: the title, the blurb, and a short
 * opening slice under a blur. Enough to know it is real, not enough to use.
 */
export function documentPreview(doc: ToolDocument, chars = 220): string {
  const text =
    doc.format === "print-html"
      ? doc.body.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")
      : doc.body;
  return text.replace(/\s+/g, " ").trim().slice(0, chars);
}

/** Sort kits the way the shelf shows them: hand-ranked usefulness, then name. */
export function sortProTools(list: ProTool[] = PRO_TOOLS): ProTool[] {
  return [...list].sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name));
}
