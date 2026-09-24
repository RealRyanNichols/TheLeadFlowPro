// The Longview business directory's data layer (server only).
//
// Reads the committed publish export, content/longview-directory/directory.json,
// and the removal list, suppressions.json, then re-checks the contract
// (validate.ts) and hides suppressed ids. The files only change through a
// merged pull request and a deploy, so the parsed result is memoized for the
// life of the server process.
//
// Local screenshots can point LONGVIEW_DIRECTORY_FILE at the sample fixture.
// That override is read only outside production; a production build never
// looks at it.
//
// Fails closed: an unreadable directory or suppression file renders as an
// empty directory, and scripts/validate-directory.ts stops the build first.

import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { alphabetical, findBusiness, findCategory, hiringList, inCategory } from "./query";
import type { Directory, DirectoryBusiness, DirectoryCategory } from "./types";
import { applySuppressions, emptyDirectory, parseSuppressions, validateDirectory, type DroppedRecord } from "./validate";

export type DirectoryReport = {
  file: string;
  directory: Directory;
  /** Records in the file before any check. */
  rawCount: number;
  dropped: DroppedRecord[];
  suppressed: string[];
  issues: string[];
};

export function committedDirectoryFile(): string {
  return path.join(process.cwd(), "content", "longview-directory", "directory.json");
}

export function suppressionsFile(): string {
  return path.join(process.cwd(), "content", "longview-directory", "suppressions.json");
}

/** The file this server renders from. The override exists only in development and tests. */
export function directoryFile(): string {
  if (process.env.NODE_ENV !== "production") {
    const override = process.env.LONGVIEW_DIRECTORY_FILE;
    if (override) return path.resolve(override);
  }
  return committedDirectoryFile();
}

function readJson(file: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(readFileSync(file, "utf8")) };
  } catch (error) {
    return { ok: false, error: `${path.basename(file)}: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/** Read, check, and apply suppressions. Never throws. */
export function readDirectory(file = directoryFile(), suppressions = suppressionsFile()): DirectoryReport {
  const raw = readJson(file);
  if (!raw.ok) {
    return { file, directory: emptyDirectory(), rawCount: 0, dropped: [], suppressed: [], issues: [raw.error] };
  }
  const rawCount = Array.isArray((raw.value as { businesses?: unknown })?.businesses)
    ? (raw.value as { businesses: unknown[] }).businesses.length
    : 0;
  const checked = validateDirectory(raw.value);
  const removal = readJson(suppressions);
  const ids = removal.ok ? parseSuppressions(removal.value) : null;
  if (ids === null) {
    // A removal request that cannot be read must not let the business back on the page.
    const problem = removal.ok ? `${path.basename(suppressions)}: expected { "ids": [ ... ] }` : removal.error;
    return {
      file,
      directory: { ...emptyDirectory(), sample: checked.directory.sample },
      rawCount,
      dropped: checked.dropped,
      suppressed: [],
      issues: [...checked.issues, problem],
    };
  }
  const { directory, suppressed } = applySuppressions(checked.directory, ids);
  return { file, directory, rawCount, dropped: checked.dropped, suppressed, issues: checked.issues };
}

let cache: { key: string; report: DirectoryReport } | null = null;

function cacheKey(file: string): string {
  if (process.env.NODE_ENV === "production") return file;
  // In development an edited fixture shows up on the next request.
  const stamp = (p: string) => {
    try {
      return statSync(p).mtimeMs;
    } catch {
      return 0;
    }
  };
  return `${file}:${stamp(file)}:${stamp(suppressionsFile())}`;
}

export function loadDirectoryReport(): DirectoryReport {
  const file = directoryFile();
  const key = cacheKey(file);
  if (!cache || cache.key !== key) cache = { key, report: readDirectory(file) };
  return cache.report;
}

export function loadDirectory(): Directory {
  return loadDirectoryReport().directory;
}

/** True when at least one business is published. */
export function hasDirectory(directory = loadDirectory()): boolean {
  return directory.businesses.length > 0;
}

export function getBusiness(slug: string, directory = loadDirectory()): DirectoryBusiness | undefined {
  return findBusiness(directory, slug);
}

export function categoryBySlug(slug: string, directory = loadDirectory()): DirectoryCategory | undefined {
  return findCategory(directory, slug);
}

export function businessesByCategory(slug: string, directory = loadDirectory()): DirectoryBusiness[] {
  return inCategory(directory, slug);
}

export function hiringBusinesses(directory = loadDirectory()): DirectoryBusiness[] {
  return hiringList(directory);
}

export function allBusinesses(directory = loadDirectory()): DirectoryBusiness[] {
  return alphabetical(directory);
}

export { openNow, formatHours, formatTime, hoursRows } from "./hours";
export {
  DEFAULT_PAGE_SIZE,
  NEW_WINDOW_DAYS,
  batchDate,
  isDirectoryIndexable,
  isIndexable,
  newInLongview,
  paginate,
  publicZips,
  searchDirectory,
} from "./query";
export {
  ABOUT_PATH,
  CRAWLER_LIMITS,
  CRAWLER_TOKEN,
  CRAWLER_USER_AGENT,
  DIRECTORY_DISCLAIMER,
  addressLine,
  businessPath,
  categoryPath,
  claimMailto,
  mapsSearchUrl,
} from "./display";
export { validateDirectory } from "./validate";
