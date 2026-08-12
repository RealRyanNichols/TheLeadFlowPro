// The tool registry.
//
// Tool files author formulas. lib/tools/meta.ts authors taxonomy. This module
// merges the two, attaches artwork and the prebuilt search blob, and hands the
// rest of the app one resolved list. Anything not marked "published" never
// reaches a route, the sitemap or the directory.

import type { Category, Tool, ToolDef, ToolMeta } from "./types";
import { MONEY_TOOLS } from "./money";
import { LEAD_TOOLS } from "./leads";
import { OPERATIONS_TOOLS } from "./operations";
import { GROWTH_TOOLS } from "./growth";
import { GENERATOR_TOOLS } from "./generators";
import { NEW_TOOLS } from "./new";
import { TOOL_META } from "./meta";
import { buildSearchText } from "./search";
import { toolArtAlt, ART_DIMS } from "./art";
import { DOMAINS, INDUSTRIES, type Domain, type Industry } from "./taxonomy";

export * from "./types";
export * from "./taxonomy";
export { searchTools, suggestFor, resolveQuery, normalize } from "./search";
export type { SearchHit, Suggestion, Facets } from "./search";

/* ------------------------------ raw definitions ---------------------------- */

const DEFS: ToolDef[] = [
  ...LEAD_TOOLS,
  ...MONEY_TOOLS,
  ...OPERATIONS_TOOLS,
  ...GROWTH_TOOLS,
  ...GENERATOR_TOOLS,
  ...NEW_TOOLS,
];

/* --------------------------------- resolve --------------------------------- */

/** Fields a published tool cannot go without. Enforced by lib/tools/validate.ts. */
const REQUIRED_META = [
  "domain",
  "toolType",
  "goals",
  "industries",
  "audiences",
  "keywords",
  "disclaimer",
  "dataSensitivity",
  "popularity",
] as const;

function resolveTool(def: ToolDef): Tool {
  // Inline metadata on the definition wins over the central map, so a new tool
  // can declare everything in one place while the original 78 stay in meta.ts.
  const central = TOOL_META[def.slug];
  const meta = { ...(central || {}), ...stripUndefined(def) } as ToolMeta;

  const domain = (meta.domain || "business-money") as Domain;
  const toolType = meta.toolType || "calculator";

  const image = {
    src: `/tools-art/card/${def.slug}.svg`,
    alt: toolArtAlt(def.name, toolType, domain),
    width: ART_DIMS.card.w,
    height: ART_DIMS.card.h,
  };
  const hero = {
    src: `/tools-art/hero/${def.slug}.svg`,
    alt: toolArtAlt(def.name, toolType, domain),
    width: ART_DIMS.hero.w,
    height: ART_DIMS.hero.h,
  };

  const resolved: Tool = {
    ...def,
    ...meta,
    domain,
    toolType,
    goals: meta.goals || [],
    industries: meta.industries || [],
    audiences: meta.audiences || [],
    keywords: meta.keywords || [],
    disclaimer: meta.disclaimer || "general-estimate",
    dataSensitivity: meta.dataSensitivity || "none",
    popularity: meta.popularity ?? 50,
    status: meta.status || "published",
    image,
    hero,
    searchText: "",
  };

  resolved.searchText = buildSearchText({
    name: resolved.name,
    short: resolved.short,
    tagline: resolved.tagline,
    description: resolved.description,
    who: resolved.who,
    problem: resolved.problem,
    payoff: resolved.payoff,
    keywords: resolved.keywords,
    synonyms: resolved.synonyms,
    industries: resolved.industries,
    audiences: resolved.audiences,
    goals: resolved.goals,
    toolType: resolved.toolType,
    domain: resolved.domain,
    category: resolved.category,
  });

  return resolved;
}

/** Only real values from the definition should shadow the central map. */
function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && REQUIRED_META_SET.has(k)) out[k] = v;
    else if (v !== undefined && OPTIONAL_META_SET.has(k)) out[k] = v;
  }
  return out as Partial<T>;
}

const REQUIRED_META_SET = new Set<string>(REQUIRED_META);
const OPTIONAL_META_SET = new Set<string>([
  "synonyms", "isNew", "seoTitle", "seoDescription", "relatedSlugs",
  "presets", "assumptions", "exportFormats", "status",
]);

/* ---------------------------------- exports -------------------------------- */

/** Every tool in the repository, published or not. Used by validation and the roadmap. */
export const ALL_TOOLS: Tool[] = DEFS.map(resolveTool);

/** What the public site sees. */
export const TOOLS: Tool[] = ALL_TOOLS.filter((t) => t.status === "published");

export const TOOL_COUNT = TOOLS.length;

const BY_SLUG = new Map(TOOLS.map((t) => [t.slug, t]));

export function getTool(slug: string): Tool | undefined {
  return BY_SLUG.get(slug);
}

export const FEATURED_TOOLS = TOOLS.filter((t) => t.featured);
export const NEWEST_TOOLS = TOOLS.filter((t) => t.isNew);

/* ------------------------------- client index ------------------------------ */

/**
 * What the browser gets. A Tool carries its run() function, so passing the
 * registry into a client component would ship every formula in the library just
 * to draw a grid of cards. This is the serializable subset the directory needs.
 */
export type ToolIndexEntry = {
  slug: string;
  name: string;
  short?: string;
  tagline: string;
  description: string;
  image: Tool["image"];
  domain: Domain;
  toolType: Tool["toolType"];
  category: Category;
  industries: Tool["industries"];
  audiences: Tool["audiences"];
  goals: Tool["goals"];
  keywords: string[];
  synonyms?: string[];
  popularity: number;
  isNew?: boolean;
  featured?: boolean;
  searchText: string;
};

export function toolIndex(list: Tool[] = TOOLS): ToolIndexEntry[] {
  return list.map((t) => ({
    slug: t.slug,
    name: t.name,
    short: t.short,
    tagline: t.tagline,
    description: t.description,
    image: t.image,
    domain: t.domain,
    toolType: t.toolType,
    category: t.category,
    industries: t.industries,
    audiences: t.audiences,
    goals: t.goals,
    keywords: t.keywords,
    synonyms: t.synonyms,
    popularity: t.popularity,
    isNew: t.isNew,
    featured: t.featured,
    searchText: t.searchText,
  }));
}

/* ------------------------------ legacy category ---------------------------- */

/**
 * The original eight categories. They stay because every tool still carries one
 * and the old chips are a familiar way in, but the domain is what the library is
 * actually organised by now.
 */
export const CATEGORY_META: Record<Category, { blurb: string; ink: string; tint: string; line: string }> = {
  Leads: { blurb: "Find the calls, quotes and customers you are already losing.", ink: "#1240E8", tint: "#1240e80f", line: "#1240e830" },
  Money: { blurb: "Price it right, know your margin, keep what you earn.", ink: "#0B5A33", tint: "#0b5a330f", line: "#0b5a3330" },
  Costs: { blurb: "Find the money leaving quietly every single month.", ink: "#B3261E", tint: "#b3261e0f", line: "#b3261e30" },
  Ads: { blurb: "Know whether the money you spend is coming back.", ink: "#5B3BC4", tint: "#5b3bc40f", line: "#5b3bc430" },
  Reputation: { blurb: "Reviews, ratings, and what people find when they look you up.", ink: "#8A5A00", tint: "#8a5a000f", line: "#8a5a0030" },
  Time: { blurb: "The hours going into work that does not pay you.", ink: "#9A4A12", tint: "#9a4a120f", line: "#9a4a1230" },
  Website: { blurb: "What your site is doing, and what it should be doing.", ink: "#0E6F96", tint: "#0e6f960f", line: "#0e6f9630" },
  Generators: { blurb: "Put your details in, get something you can use today.", ink: "#A02257", tint: "#a022570f", line: "#a0225730" },
};

export const CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export function toolsByCategory(cat: Category) {
  return TOOLS.filter((t) => t.category === cat);
}

/* ------------------------------- groupings --------------------------------- */

export function toolsByDomain(domain: Domain) {
  return TOOLS.filter((t) => t.domain === domain);
}

export function toolsByIndustry(industry: Industry) {
  return TOOLS.filter((t) => t.industries.includes(industry));
}

/** Domains that actually have tools, with counts, for the directory rail. */
export const DOMAIN_COUNTS = (Object.keys(DOMAINS) as Domain[])
  .map((id) => ({ id, label: DOMAINS[id].label, count: toolsByDomain(id).length }))
  .filter((d) => d.count > 0);

export const INDUSTRY_COUNTS = (Object.keys(INDUSTRIES) as Industry[])
  .map((id) => ({ id, label: INDUSTRIES[id].label, count: toolsByIndustry(id).length }))
  .filter((i) => i.count > 0)
  .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

/* ------------------------------ related tools ------------------------------ */

/**
 * Related means "useful in the same sitting", so shared industry counts for more
 * than shared category. An explicit relatedSlugs list always wins.
 */
export function relatedTools(tool: Tool, n = 4): Tool[] {
  if (tool.relatedSlugs?.length) {
    const picked = tool.relatedSlugs.map((s) => BY_SLUG.get(s)).filter((t): t is Tool => Boolean(t) && t!.slug !== tool.slug);
    if (picked.length >= n) return picked.slice(0, n);
    const fill = scoreRelated(tool).filter((t) => !picked.some((p) => p.slug === t.slug));
    return [...picked, ...fill].slice(0, n);
  }
  return scoreRelated(tool).slice(0, n);
}

function scoreRelated(tool: Tool): Tool[] {
  return TOOLS.filter((t) => t.slug !== tool.slug)
    .map((t) => {
      let s = 0;
      for (const i of t.industries) if (tool.industries.includes(i)) s += 6;
      for (const g of t.goals) if (tool.goals.includes(g)) s += 3;
      for (const a of t.audiences) if (tool.audiences.includes(a)) s += 2;
      if (t.domain === tool.domain) s += 4;
      if (t.category === tool.category) s += 2;
      if (t.toolType === tool.toolType) s += 1;
      return { t, s: s + t.popularity / 100 };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
}

/** Kept for the legacy hash-based art helpers still used by the OG route. */
export function toolHash(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 360;
  return h;
}

/* --------------------------------- sorting --------------------------------- */

export type SortKey = "useful" | "popular" | "newest" | "az";

export const SORTS: { id: SortKey; label: string }[] = [
  { id: "useful", label: "Most useful" },
  { id: "popular", label: "Most popular" },
  { id: "newest", label: "Newest" },
  { id: "az", label: "A to Z" },
];

/** Generic so the directory can sort its lightweight index, not only full tools. */
export function sortTools<T extends { name: string; popularity: number; featured?: boolean; isNew?: boolean }>(
  list: T[],
  key: SortKey,
): T[] {
  const out = [...list];
  switch (key) {
    case "popular":
      return out.sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name));
    case "newest":
      return out.sort(
        (a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) || b.popularity - a.popularity,
      );
    case "az":
      return out.sort((a, b) => a.name.localeCompare(b.name));
    default:
      // "Most useful" leads with the hand-picked featured set, then popularity.
      return out.sort(
        (a, b) =>
          Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          b.popularity - a.popularity ||
          a.name.localeCompare(b.name),
      );
  }
}
