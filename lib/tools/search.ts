// Search that understands what people actually type.
//
// The old search matched substrings against the name and description, so
// "mortgage" returned nothing even though a dozen tools are useful to a loan
// officer. This one resolves a query into taxonomy first: "mortgage" resolves to
// the mortgage-lending industry, and every tool tagged with that industry
// scores, whatever it happens to be called. Typos, plurals and synonyms are
// handled before scoring, not after.

import {
  AUDIENCES,
  AUDIENCE_IDS,
  DOMAINS,
  DOMAIN_IDS,
  GOALS,
  GOAL_IDS,
  INDUSTRIES,
  INDUSTRY_IDS,
  TOOL_TYPES,
  TOOL_TYPE_IDS,
  type Audience,
  type Domain,
  type Goal,
  type Industry,
  type ToolType,
} from "./taxonomy";
/**
 * What search needs to know about a tool. The directory passes a plain
 * serializable index rather than the registry itself, because a Tool holds its
 * run() function and shipping 250 formulas to the browser to render a grid of
 * cards would be absurd.
 */
export type Searchable = {
  slug: string;
  name: string;
  short?: string;
  tagline: string;
  keywords: string[];
  synonyms?: string[];
  industries: Industry[];
  audiences: Audience[];
  goals: Goal[];
  toolType: ToolType;
  domain: Domain;
  popularity: number;
  searchText: string;
};

/* ------------------------------ normalising ------------------------------- */

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Cheap English stemming. Enough to tie roofer/roofers and price/pricing. */
function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (w.endsWith("sses") || w.endsWith("shes") || w.endsWith("ches")) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us")) return w.slice(0, -1);
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  return w;
}

const STOP = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from", "how", "i",
  "in", "is", "it", "me", "my", "of", "on", "or", "our", "that", "the", "to", "we",
  "what", "with", "you", "your", "tool", "tools", "calculator", "free", "best",
]);

const tokens = (s: string) => normalize(s).split(" ").filter(Boolean);

/** Optimal string alignment distance, bailing out once it passes the budget. */
function editDistance(a: string, b: string, budget: number): number {
  if (Math.abs(a.length - b.length) > budget) return budget + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      row.push(v);
      if (v < best) best = v;
    }
    if (best > budget) return budget + 1;
    prev = row;
  }
  return prev[b.length];
}

/** How much slack a word of this length gets. Short words get none. */
const budgetFor = (w: string) => (w.length >= 8 ? 2 : w.length >= 5 ? 1 : 0);

/* ------------------------------- alias index ------------------------------- */

export type Facets = {
  industries: Industry[];
  audiences: Audience[];
  goals: Goal[];
  toolTypes: ToolType[];
  domains: Domain[];
};

const emptyFacets = (): Facets => ({ industries: [], audiences: [], goals: [], toolTypes: [], domains: [] });

type AliasHit = Partial<Facets>;

/**
 * Phrases that do not belong to any one taxonomy label but that people type
 * constantly. These are the bridge between how somebody talks about their work
 * and how the library is organised.
 */
const EXTRA_ALIASES: Record<string, AliasHit> = {
  // the reported failure: mortgage has to reach the money tools too
  mortgage: { industries: ["mortgage-lending", "real-estate"] },
  "loan officer": { industries: ["mortgage-lending"], audiences: ["salespeople"] },
  "home loan": { industries: ["mortgage-lending"] },
  closing: { industries: ["mortgage-lending", "real-estate"] },
  // clinical words map to operations only, never to care
  doctor: { industries: ["medical-practice"], domains: ["medical-ops"] },
  physician: { industries: ["medical-practice"], domains: ["medical-ops"] },
  patient: { industries: ["medical-practice", "dental-practice"], domains: ["medical-ops"] },
  clinic: { industries: ["medical-practice"], domains: ["medical-ops"] },
  // public safety
  police: { industries: ["law-enforcement", "public-safety"], domains: ["public-service"], audiences: ["public-servants"] },
  cop: { industries: ["law-enforcement"], domains: ["public-service"] },
  fire: { industries: ["fire-ems"], domains: ["public-service"] },
  ems: { industries: ["fire-ems"], domains: ["public-service"] },
  "first responder": { industries: ["public-safety", "fire-ems", "law-enforcement"], audiences: ["public-servants"] },
  // household language
  mom: { industries: ["household", "personal-finance"], audiences: ["parents"], domains: ["home-family"] },
  mum: { industries: ["household"], audiences: ["parents"], domains: ["home-family"] },
  dad: { industries: ["household", "personal-finance"], audiences: ["parents"], domains: ["home-family"] },
  "stay at home": { industries: ["household"], audiences: ["parents"], domains: ["home-family"] },
  "stay at home mom": { industries: ["household"], audiences: ["parents"], domains: ["home-family"] },
  family: { industries: ["household"], audiences: ["parents"], domains: ["home-family"] },
  kids: { industries: ["household", "childcare"], audiences: ["parents"] },
  // codes and links
  qr: { toolTypes: ["qr"] },
  "qr code": { toolTypes: ["qr"] },
  barcode: { toolTypes: ["qr"] },
  scan: { toolTypes: ["qr"] },
  link: { toolTypes: ["link"] },
  url: { toolTypes: ["link"] },
  // common goal phrasing
  price: { goals: ["price-a-service"] },
  pricing: { goals: ["price-a-service"] },
  quote: { goals: ["quote-a-job"] },
  bid: { goals: ["quote-a-job"] },
  estimate: { goals: ["quote-a-job"], toolTypes: ["estimator"] },
  profit: { goals: ["make-money"] },
  margin: { goals: ["make-money", "price-a-service"] },
  leads: { goals: ["capture-leads"] },
  "follow up": { goals: ["improve-follow-up"] },
  followup: { goals: ["improve-follow-up"] },
  seo: { goals: ["check-a-website"], domains: ["websites-digital"] },
  website: { goals: ["check-a-website"], domains: ["websites-digital"] },
  schedule: { goals: ["plan-a-project"], toolTypes: ["planner"] },
  scheduling: { goals: ["plan-a-project"], toolTypes: ["planner"] },
  staffing: { goals: ["plan-a-project"] },
  payroll: { industries: ["accounting"], goals: ["save-money"] },
  hiring: { audiences: ["job-seekers"], goals: ["make-a-decision"] },
  resume: { audiences: ["job-seekers", "students"], goals: ["generate-a-document"] },
  budget: { goals: ["save-money"], industries: ["personal-finance"] },
  checklist: { toolTypes: ["checklist"] },
  template: { toolTypes: ["template"] },
  script: { toolTypes: ["generator"], goals: ["improve-follow-up"] },
  safety: { goals: ["safety-readiness"] },
  emergency: { goals: ["safety-readiness"] },
  volunteer: { audiences: ["volunteers"], industries: ["nonprofit", "church"] },
  donation: { industries: ["church", "nonprofit"] },
  tithe: { industries: ["church"] },
  student: { audiences: ["students"], domains: ["education-career"] },
  teacher: { audiences: ["teachers"], industries: ["k12-school"] },
  retirement: { audiences: ["older-adults"], industries: ["personal-finance"] },
  airbnb: { industries: ["vacation-rental"] },
  hunting: { industries: ["hunting-fishing"], audiences: ["outdoorspeople"] },
  travel: { audiences: ["travelers"], domains: ["outdoors-travel"] },
};

type AliasEntry = { phrase: string; words: string[]; hit: AliasHit };

function buildAliasIndex(): AliasEntry[] {
  const out: AliasEntry[] = [];
  const add = (phrase: string, hit: AliasHit) => {
    const n = normalize(phrase);
    if (!n) return;
    out.push({ phrase: n, words: n.split(" "), hit });
  };

  for (const id of INDUSTRY_IDS) {
    const m = INDUSTRIES[id];
    add(m.label, { industries: [id] });
    add(id.replace(/-/g, " "), { industries: [id] });
    for (const a of m.aliases) add(a, { industries: [id] });
  }
  for (const id of AUDIENCE_IDS) {
    const m = AUDIENCES[id];
    add(m.label, { audiences: [id] });
    add(id.replace(/-/g, " "), { audiences: [id] });
    for (const a of m.aliases) add(a, { audiences: [id] });
  }
  for (const id of GOAL_IDS) add(GOALS[id].label, { goals: [id] });
  for (const id of TOOL_TYPE_IDS) add(TOOL_TYPES[id].label, { toolTypes: [id] });
  for (const id of DOMAIN_IDS) add(DOMAINS[id].label, { domains: [id] });
  for (const [phrase, hit] of Object.entries(EXTRA_ALIASES)) add(phrase, hit);

  // longest phrase first so "loan officer" wins over "loan"
  return out.sort((a, b) => b.words.length - a.words.length);
}

const ALIAS_INDEX = buildAliasIndex();

/** Single-word aliases, stemmed, for fast per-token lookup and typo repair. */
const SINGLE_ALIASES = (() => {
  const m = new Map<string, AliasHit[]>();
  for (const e of ALIAS_INDEX) {
    if (e.words.length !== 1) continue;
    const k = stem(e.words[0]);
    const list = m.get(k);
    if (list) list.push(e.hit);
    else m.set(k, [e.hit]);
  }
  return m;
})();

const SINGLE_ALIAS_KEYS = [...SINGLE_ALIASES.keys()];

function mergeHit(into: Facets, hit: AliasHit) {
  for (const k of ["industries", "audiences", "goals", "toolTypes", "domains"] as const) {
    for (const v of hit[k] || []) {
      const arr = into[k] as string[];
      if (!arr.includes(v)) arr.push(v);
    }
  }
}

/**
 * Turn a raw query into taxonomy plus the literal words that were left over.
 *
 * `wordFacets` records what each surviving word resolved to on its own. Scoring
 * needs that: "mortage" is a typo that resolves to the mortgage industry, so it
 * has to count as a matched term even though those letters appear nowhere.
 */
export function resolveQuery(q: string): {
  facets: Facets;
  words: string[];
  stems: string[];
  wordFacets: Facets[];
} {
  const facets = emptyFacets();
  const n = normalize(q);
  if (!n) return { facets, words: [], stems: [], wordFacets: [] };

  const all = n.split(" ");
  // Multi-word aliases first, so "law firm" is consumed before "firm".
  const consumed = new Array<boolean>(all.length).fill(false);
  for (const e of ALIAS_INDEX) {
    if (e.words.length < 2) continue;
    for (let i = 0; i + e.words.length <= all.length; i++) {
      if (consumed.slice(i, i + e.words.length).some(Boolean)) continue;
      let ok = true;
      for (let j = 0; j < e.words.length; j++) {
        if (all[i + j] !== e.words[j]) { ok = false; break; }
      }
      if (ok) {
        mergeHit(facets, e.hit);
        for (let j = 0; j < e.words.length; j++) consumed[i + j] = true;
      }
    }
  }

  const words: string[] = [];
  const wordFacets: Facets[] = [];
  for (let i = 0; i < all.length; i++) {
    const w = all[i];
    const own = emptyFacets();
    if (!consumed[i]) {
      words.push(w);
      wordFacets.push(own);
    }
    // A word already eaten by a longer phrase must not also contribute its own
    // meaning. Without this, "loan officer" also resolved "officer" to law
    // enforcement and returned police staffing tools to a mortgage broker.
    if (consumed[i]) continue;

    const s = stem(w);
    const exact = SINGLE_ALIASES.get(s);
    if (exact) {
      for (const h of exact) { mergeHit(facets, h); mergeHit(own, h); }
    } else if (w.length >= 5) {
      // one typo away from an industry or audience word still counts
      const budget = budgetFor(w);
      let bestKey: string | null = null;
      let bestD = budget + 1;
      for (const key of SINGLE_ALIAS_KEYS) {
        const d = editDistance(s, key, budget);
        if (d < bestD) { bestD = d; bestKey = key; }
      }
      if (bestKey && bestD <= budget) {
        for (const h of SINGLE_ALIASES.get(bestKey)!) { mergeHit(facets, h); mergeHit(own, h); }
      }
    }
  }

  const keepIdx = words.map((w, i) => (STOP.has(w) ? -1 : i)).filter((i) => i >= 0);
  const keep = keepIdx.map((i) => words[i]);
  return { facets, words: keep, stems: keep.map(stem), wordFacets: keepIdx.map((i) => wordFacets[i]) };
}

/* --------------------------------- indexing -------------------------------- */

/** The blob a tool is matched against. Built once at registry build time. */
export function buildSearchText(t: {
  name: string;
  short?: string;
  tagline: string;
  description: string;
  who: string;
  problem: string;
  payoff: string;
  keywords: string[];
  synonyms?: string[];
  industries: Industry[];
  audiences: Audience[];
  goals: Goal[];
  toolType: ToolType;
  domain: Domain;
  category: string;
}): string {
  return normalize(
    [
      t.name,
      t.short || "",
      t.tagline,
      t.description,
      t.who,
      t.problem,
      t.payoff,
      t.category,
      ...t.keywords,
      ...(t.synonyms || []),
      ...t.industries.flatMap((i) => [INDUSTRIES[i].label, ...INDUSTRIES[i].aliases]),
      ...t.audiences.flatMap((a) => [AUDIENCES[a].label, ...AUDIENCES[a].aliases]),
      ...t.goals.map((g) => GOALS[g].label),
      TOOL_TYPES[t.toolType].label,
      DOMAINS[t.domain].label,
    ].join(" "),
  );
}

/* --------------------------------- scoring --------------------------------- */

export type SearchHit<T extends Searchable = Searchable> = { tool: T; score: number };

const W = {
  nameExact: 260,
  namePrefix: 150,
  nameWord: 95,
  shortWord: 70,
  keyword: 80,
  tagline: 55,
  industry: 70,
  audience: 46,
  goal: 34,
  toolType: 40,
  domain: 26,
  body: 22,
  fuzzy: 30,
  // Popularity breaks ties. It must never outrank actually being about the
  // thing that was typed, which is what a heavier weight here does.
  popularity: 0.08,
};

/** Does this tool carry any of the taxonomy a single word resolved to? */
function satisfies(tool: Searchable, f: Facets | undefined): boolean {
  if (!f) return false;
  if (f.industries.some((i) => tool.industries.includes(i))) return true;
  if (f.audiences.some((a) => tool.audiences.includes(a))) return true;
  if (f.goals.some((g) => tool.goals.includes(g))) return true;
  if (f.toolTypes.some((t) => tool.toolType === t)) return true;
  if (f.domains.some((d) => tool.domain === d)) return true;
  return false;
}

export function searchTools<T extends Searchable>(tools: T[], query: string): SearchHit<T>[] {
  const q = normalize(query);
  if (!q) return tools.map((tool) => ({ tool, score: tool.popularity * W.popularity }));

  const { facets, words, stems, wordFacets } = resolveQuery(query);
  const hasFacets =
    facets.industries.length + facets.audiences.length + facets.goals.length +
    facets.toolTypes.length + facets.domains.length > 0;

  const hits: SearchHit<T>[] = [];

  for (const tool of tools) {
    let score = 0;
    let matchedTerms = 0;

    const name = normalize(tool.name);
    const short = normalize(tool.short || "");
    const tagline = normalize(tool.tagline);
    const keywordSet = new Set(
      [...tool.keywords, ...(tool.synonyms || [])].flatMap((k) => tokens(k).map(stem)),
    );
    const nameWords = name.split(" ").map(stem);

    if (name === q) score += W.nameExact;
    else if (name.startsWith(q)) score += W.namePrefix;
    else if (name.includes(q) && q.length > 3) score += W.nameWord;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const s = stems[i];
      let termHit = false;

      if (nameWords.includes(s) || name.includes(w)) { score += W.nameWord; termHit = true; }
      else if (short.includes(w)) { score += W.shortWord; termHit = true; }

      if (keywordSet.has(s)) { score += W.keyword; termHit = true; }
      if (tagline.includes(w)) { score += W.tagline; termHit = true; }
      if (!termHit && tool.searchText.includes(w)) { score += W.body; termHit = true; }

      if (!termHit && w.length >= 5) {
        const budget = budgetFor(w);
        for (const nw of nameWords) {
          if (editDistance(s, nw, budget) <= budget) { score += W.fuzzy; termHit = true; break; }
        }
        if (!termHit) {
          for (const kw of keywordSet) {
            if (editDistance(s, kw, budget) <= budget) { score += W.fuzzy; termHit = true; break; }
          }
        }
      }

      // A word that resolved to an industry, audience, goal or type counts as
      // matched for any tool carrying it, even when those letters never appear.
      if (!termHit && satisfies(tool, wordFacets[i])) termHit = true;

      if (termHit) matchedTerms++;
    }

    let facetHits = 0;
    for (const i of facets.industries) if (tool.industries.includes(i)) { score += W.industry; facetHits++; }
    for (const a of facets.audiences) if (tool.audiences.includes(a)) { score += W.audience; facetHits++; }
    for (const g of facets.goals) if (tool.goals.includes(g)) { score += W.goal; facetHits++; }
    for (const t of facets.toolTypes) if (tool.toolType === t) { score += W.toolType; facetHits++; }
    for (const d of facets.domains) if (tool.domain === d) { score += W.domain; facetHits++; }

    // Every literal word has to land somewhere. Without this, "mortgage
    // giraffe" would return the entire mortgage collection, because one word
    // hit and the nonsense word was quietly ignored. Industry and audience
    // words still count, because buildSearchText folds their aliases in.
    if (words.length > 0 && matchedTerms < words.length) continue;
    // A query made entirely of taxonomy phrases, like "stay at home mom", leaves
    // no literal words behind. Without this, every tool would pass because none
    // of them failed a word test.
    if (words.length === 0 && hasFacets && facetHits === 0) continue;
    if (score <= 0) continue;

    score += tool.popularity * W.popularity;
    hits.push({ tool, score });
  }

  return hits.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name));
}

/* ------------------------------- suggestions ------------------------------- */

export type Suggestion = {
  label: string;
  kind: "tool" | "industry" | "audience" | "goal" | "type";
  /** Where picking it should take the directory. */
  href: string;
};

/** What the search box offers while they type. Tools first, then a way to browse. */
export function suggestFor<T extends Searchable>(tools: T[], query: string, limit = 8): Suggestion[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const out: Suggestion[] = [];

  for (const { tool } of searchTools(tools, query).slice(0, limit - 3)) {
    out.push({ label: tool.name, kind: "tool", href: `/tools/${tool.slug}` });
  }

  const { facets } = resolveQuery(query);
  for (const i of facets.industries.slice(0, 2)) {
    out.push({ label: `${INDUSTRIES[i].label} tools`, kind: "industry", href: `/tools?industry=${i}` });
  }
  for (const a of facets.audiences.slice(0, 1)) {
    out.push({ label: `Tools for ${AUDIENCES[a].label.toLowerCase()}`, kind: "audience", href: `/tools?audience=${a}` });
  }
  for (const t of facets.toolTypes.slice(0, 1)) {
    out.push({ label: `All ${TOOL_TYPES[t].label.toLowerCase()}s`, kind: "type", href: `/tools?type=${t}` });
  }

  return out.slice(0, limit);
}
