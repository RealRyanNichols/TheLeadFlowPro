// Reading the directory: search, filters, lists, and the indexing switch.
//
// Everything takes the validated directory as an argument, so the same
// functions serve the pages, the sitemap, and the tests. Lists are A to Z by
// name. Nothing here ranks, scores, or reorders businesses by any judgement.

import { directoryClock, openNowAt } from "./hours";
import { localParts } from "../hq/time";
import type { Directory, DirectoryBusiness, DirectoryCategory } from "./types";

export const DEFAULT_PAGE_SIZE = 30;
export const NEW_WINDOW_DAYS = 180;

export type SearchInput = {
  q?: string | null;
  category?: string | null;
  zip?: string | null;
  openNow?: boolean;
  now?: Date;
  page?: number | string | null;
  pageSize?: number;
};

export type Paged<T> = { results: T[]; total: number; page: number; pages: number };

/** Lowercase, accents off, "&" read as "and", punctuation to spaces. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function byName(a: DirectoryBusiness, b: DirectoryBusiness): number {
  return a.name.localeCompare(b.name, "en", { sensitivity: "base", numeric: true }) || a.slug.localeCompare(b.slug);
}

const sortedCache = new WeakMap<Directory, DirectoryBusiness[]>();
const slugCache = new WeakMap<Directory, Map<string, DirectoryBusiness>>();

/** Every business, A to Z. Memoized per directory object. */
export function alphabetical(directory: Directory): DirectoryBusiness[] {
  let sorted = sortedCache.get(directory);
  if (!sorted) {
    sorted = [...directory.businesses].sort(byName);
    sortedCache.set(directory, sorted);
  }
  return sorted;
}

export function findBusiness(directory: Directory, slug: string): DirectoryBusiness | undefined {
  let bySlug = slugCache.get(directory);
  if (!bySlug) {
    bySlug = new Map(directory.businesses.map((b) => [b.slug, b]));
    slugCache.set(directory, bySlug);
  }
  return bySlug.get(slug);
}

export function findCategory(directory: Directory, slug: string): DirectoryCategory | undefined {
  return directory.categories.find((c) => c.slug === slug);
}

export function inCategory(directory: Directory, slug: string): DirectoryBusiness[] {
  return alphabetical(directory).filter((b) => b.category === slug);
}

/** ZIPs that appear on at least one public address, ascending. Hidden addresses contribute nothing. */
export function publicZips(directory: Directory): string[] {
  const zips = new Set<string>();
  for (const b of directory.businesses) if (b.address.street && b.address.zip) zips.add(b.address.zip);
  return [...zips].sort();
}

export function pageNumber(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function paginate<T>(items: readonly T[], page: number | string | null | undefined, pageSize = DEFAULT_PAGE_SIZE): Paged<T> {
  const size = Math.max(1, Math.floor(pageSize));
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(pageNumber(page), pages);
  return { results: items.slice((current - 1) * size, current * size), total: items.length, page: current, pages };
}

const haystackCache = new WeakMap<DirectoryBusiness, string>();

/** The normalized search text for a business. Memoized per business object. */
function haystack(b: DirectoryBusiness): string {
  let text = haystackCache.get(b);
  if (text === undefined) {
    text = ` ${normalizeText([b.name, b.categoryLabel ?? "", ...b.services].join(" "))} `;
    haystackCache.set(b, text);
  }
  return text;
}

/**
 * Search and filter, A to Z. Every query token must appear in the name, the
 * category label, or a service tag. A ZIP filter matches only public
 * addresses. "Open now" keeps only businesses whose own stated hours say open.
 */
export function searchDirectory(directory: Directory, input: SearchInput = {}): Paged<DirectoryBusiness> {
  const tokens = normalizeText(String(input.q ?? "").slice(0, 100)).split(" ").filter(Boolean).slice(0, 8);
  const category = input.category && findCategory(directory, input.category) ? input.category : null;
  const zip = input.zip && /^\d{5}$/.test(input.zip) ? input.zip : null;
  // Longview's weekday and minute are resolved once for the whole request,
  // not once per business: building the Intl formatters is the costly part.
  const clock = input.openNow ? directoryClock(input.now ?? new Date()) : null;

  const matches = alphabetical(directory).filter((b) => {
    if (category && b.category !== category) return false;
    if (zip && !(b.address.street && b.address.zip === zip)) return false;
    if (clock && openNowAt(b.hours, clock) !== true) return false;
    if (tokens.length) {
      const text = haystack(b);
      if (!tokens.every((t) => text.includes(t))) return false;
    }
    return true;
  });
  return paginate(matches, input.page, input.pageSize ?? DEFAULT_PAGE_SIZE);
}

function shiftDate(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const at = new Date(Date.UTC(2000, 0, 1));
  at.setUTCFullYear(y, m - 1, d + days);
  return `${String(at.getUTCFullYear()).padStart(4, "0")}-${String(at.getUTCMonth() + 1).padStart(2, "0")}-${String(at.getUTCDate()).padStart(2, "0")}`;
}

/** The batch date in Longview, the day the export was written. */
export function batchDate(directory: Directory): string | null {
  return directory.generatedAt ? localParts(new Date(directory.generatedAt), "America/Chicago").date : null;
}

/**
 * Businesses whose sales-tax permit started within `days` before the batch
 * was generated, newest first. No batch date, no list.
 */
export function newInLongview(directory: Directory, days = NEW_WINDOW_DAYS): DirectoryBusiness[] {
  const end = batchDate(directory);
  if (!end) return [];
  const start = shiftDate(end, -days);
  return alphabetical(directory)
    .filter((b) => b.permitSince !== null && b.permitSince >= start && b.permitSince <= end)
    .sort((a, b) => (b.permitSince as string).localeCompare(a.permitSince as string) || byName(a, b));
}

/** Businesses with a careers page found on their own website, A to Z. */
export function hiringList(directory: Directory): DirectoryBusiness[] {
  return alphabetical(directory).filter((b) => b.careersUrl !== null);
}

/** The owner's switch, never on for sample data or an empty batch. */
export function isDirectoryIndexable(directory: Directory): boolean {
  return directory.indexable && !directory.sample && directory.businesses.length > 0;
}

/**
 * A profile may be indexed only when the global switch is on, the engine
 * marked it indexable, and it carries at least one fact from the business's
 * own website (the contract rule, re-derived rather than trusted).
 */
export function isIndexable(directory: Directory, business: DirectoryBusiness): boolean {
  return (
    isDirectoryIndexable(directory) &&
    business.indexable &&
    business.facts.some((f) => f.source === "website")
  );
}
