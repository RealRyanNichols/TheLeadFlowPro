"use client";

// The library.
//
// Everything the user picks lives in the URL, so a filtered view can be shared,
// bookmarked and reopened, and the back button does what it should. The tool
// data arrives as a plain serializable index from the server, so no formula code
// is shipped to the browser just to draw this page.

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal, Sparkles, ArrowRight, Clock } from "lucide-react";
import {
  AUDIENCES, DOMAINS, GOALS, INDUSTRIES, TOOL_TYPES, SORTS,
  searchTools, suggestFor, sortTools as sortRegistry,
  type Audience, type Domain, type Goal, type Industry, type ToolType,
  type SortKey, type ToolIndexEntry,
} from "@/lib/tools";
import type { RelevanceTier } from "@/lib/tools/search";
import { relevanceTier } from "@/lib/tools/relevance";
import ToolCard from "./ToolCard";
import { readRecentTools } from "./useToolProfile";
import { trackTool, trackSearch } from "@/lib/tools/analytics";

type Facet = "domain" | "industry" | "audience" | "goal" | "type";

const PARAM: Record<Facet, string> = {
  domain: "domain",
  industry: "industry",
  audience: "audience",
  goal: "goal",
  type: "type",
};

const LABELS: Record<Facet, (id: string) => string> = {
  domain: (id) => DOMAINS[id as Domain]?.label ?? id,
  industry: (id) => INDUSTRIES[id as Industry]?.label ?? id,
  audience: (id) => AUDIENCES[id as Audience]?.label ?? id,
  goal: (id) => GOALS[id as Goal]?.label ?? id,
  type: (id) => TOOL_TYPES[id as ToolType]?.label ?? id,
};

/**
 * The best strict tier a tool earns across the industry filters in play, read
 * from the same relevance map search uses. This is what lets an industry
 * filter without a typed query still separate built-for tools from the
 * generically useful ones.
 */
function filterTier(slug: string, industries: Industry[]): RelevanceTier {
  let best: RelevanceTier = "incidental";
  for (const i of industries) {
    const r = relevanceTier(slug, i);
    if (r === "core") return "core";
    if (r === "secondary") best = "strong";
    else if (r === "broad" && best !== "strong") best = "broad";
  }
  return best;
}

/** What the grid actually shows, grouped honestly. */
type Sections = {
  /** Core and strong hits, or whatever the best available tier was. */
  primary: ToolIndexEntry[];
  /** Broad hits, shown under their own heading when primary has real matches. */
  alsoUseful: ToolIndexEntry[];
  /** True when both groups render, each under its own heading. */
  split: boolean;
};

export default function ToolDirectory({
  tools,
  collections,
}: {
  tools: ToolIndexEntry[];
  collections: { slug: string; short: string; hook: string; count: number }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [query, setQuery] = useState(() => params.get("q") || "");
  const deferredQuery = useDeferredValue(query);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recent, setRecent] = useState<ToolIndexEntry[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  // The pending debounce timer, held so clearing the search can cancel it
  // instead of racing it. Before this, clicking the clear button while a
  // debounce was pending left ?q= in the URL: the button only reset local
  // state and trusted the effect to notice, and the effect compared against a
  // searchParams snapshot that had not caught up with the last replace() yet.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Queries this component wrote to the URL that have not echoed back through
  // useSearchParams yet. When ?q= changes, anything found here is our own
  // write and must not be pulled into local state, or a stale echo would
  // overwrite what the user is typing. Anything else is the browser's back or
  // forward button, and local state follows it.
  const pendingQ = useRef<string[]>([]);
  // The last ?q= value this component observed. An unrelated params change,
  // like toggling a filter mid-keystroke, re-fires the sync effect with the
  // old query still in the URL; this ref is how that run knows nothing about
  // q actually changed.
  const lastQ = useRef(params.get("q") || "");

  const selected = useMemo(() => {
    const read = (f: Facet) => params.getAll(PARAM[f]).filter(Boolean);
    return {
      domain: read("domain"),
      industry: read("industry"),
      audience: read("audience"),
      goal: read("goal"),
      type: read("type"),
    } as Record<Facet, string[]>;
  }, [params]);

  const sort = (params.get("sort") as SortKey) || "useful";

  /* -------------------------------- URL sync -------------------------------- */

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // The typed query is debounced into the URL so every keystroke does not become
  // a history entry or an analytics event.
  useEffect(() => {
    debounce.current = setTimeout(() => {
      debounce.current = null;
      const next = query.trim();
      if ((params.get("q") || "") === next) return;
      pendingQ.current.push(next);
      pushParams((p) => {
        if (next) p.set("q", next);
        else p.delete("q");
      });
    }, 250);
    return () => {
      if (debounce.current) { clearTimeout(debounce.current); debounce.current = null; }
    };
  }, [query, params, pushParams]);

  // Back and forward change ?q= underneath us; local state has to follow or
  // the input and the grid keep showing a page the URL no longer describes.
  // Our own writes are recognized via pendingQ and never pulled back in.
  useEffect(() => {
    const urlQ = params.get("q") || "";
    const i = pendingQ.current.indexOf(urlQ);
    if (i >= 0) {
      // Our own write echoing back. Anything queued before it was superseded.
      pendingQ.current.splice(0, i + 1);
      lastQ.current = urlQ;
      return;
    }
    if (urlQ === lastQ.current) return;
    lastQ.current = urlQ;
    setQuery(urlQ);
  }, [params]);

  /** Clears the query everywhere at once: timer, local state and the URL. */
  const clearQuery = useCallback(() => {
    if (debounce.current) { clearTimeout(debounce.current); debounce.current = null; }
    setQuery("");
    pendingQ.current.push("");
    pushParams((p) => p.delete("q"));
  }, [pushParams]);

  useEffect(() => {
    setRecent(
      readRecentTools()
        .map((slug) => tools.find((t) => t.slug === slug))
        .filter((t): t is ToolIndexEntry => Boolean(t))
        .slice(0, 4),
    );
  }, [tools]);

  useEffect(() => {
    trackTool("tools_directory_view");
  }, []);

  function toggleFacet(facet: Facet, id: string) {
    pushParams((p) => {
      const key = PARAM[facet];
      const current = p.getAll(key);
      p.delete(key);
      const next = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
      for (const v of next) p.append(key, v);
    });
    trackTool("tool_filter_applied", { filter: facet, [facet]: id } as Record<string, string>);
  }

  function clearAll() {
    // Cancel any pending debounce first, or its replace() lands after this one
    // and writes the just-cleared query straight back into the URL.
    if (debounce.current) { clearTimeout(debounce.current); debounce.current = null; }
    setQuery("");
    pendingQ.current.push("");
    router.replace(pathname, { scroll: false });
  }

  /* --------------------------------- results -------------------------------- */

  const sections = useMemo<Sections>(() => {
    const base = tools.filter((t) => {
      if (selected.domain.length && !selected.domain.includes(t.domain)) return false;
      if (selected.type.length && !selected.type.includes(t.toolType)) return false;
      if (selected.industry.length && !selected.industry.some((i) => t.industries.includes(i as Industry))) return false;
      if (selected.audience.length && !selected.audience.some((a) => t.audiences.includes(a as Audience))) return false;
      if (selected.goal.length && !selected.goal.some((g) => t.goals.includes(g as Goal))) return false;
      return true;
    });

    const q = deferredQuery.trim();

    // Tier every candidate. A typed query gets its tiers from search; an
    // industry filter without a query reads the relevance map directly.
    let tiered: { tool: ToolIndexEntry; tier: RelevanceTier }[];
    if (q) {
      tiered = searchTools(base, q);
    } else if (selected.industry.length) {
      tiered = sortRegistry(base, sort).map((tool) => ({
        tool,
        tier: filterTier(tool.slug, selected.industry as Industry[]),
      }));
    } else {
      return { primary: sortRegistry(base, sort), alsoUseful: [], split: false };
    }

    const pick = (...tiers: RelevanceTier[]) =>
      tiered.filter((x) => tiers.includes(x.tier)).map((x) => x.tool);

    let close = pick("core", "strong");
    let broad = pick("broad");
    // A relevance ranking is the point of a search, so only an explicit sort
    // choice is allowed to override the order. The tier grouping stays either
    // way; the sort reorders inside each group.
    if (q && sort !== "useful") {
      close = sortRegistry(close, sort);
      broad = sortRegistry(broad, sort);
    }

    // Both real groups present: show them under separate headings. Incidental
    // hits are dropped outright rather than padding the bottom of the grid.
    if (close.length && broad.length) return { primary: close, alsoUseful: broad, split: true };
    if (close.length) return { primary: close, alsoUseful: [], split: false };
    if (broad.length) return { primary: broad, alsoUseful: [], split: false };
    // Nothing but incidental hits. Showing them beats an empty page.
    return { primary: pick("incidental"), alsoUseful: [], split: false };
  }, [tools, selected, deferredQuery, sort]);

  const shownCount = sections.primary.length + sections.alsoUseful.length;

  useEffect(() => {
    if (!deferredQuery.trim()) return;
    const t = setTimeout(() => trackSearch(deferredQuery, shownCount), 600);
    return () => clearTimeout(t);
  }, [deferredQuery, shownCount]);

  const suggestions = useMemo(
    () => (suggestOpen && query.trim().length >= 2 ? suggestFor(tools, query, 7) : []),
    [suggestOpen, query, tools],
  );

  const activeChips = (Object.keys(PARAM) as Facet[]).flatMap((f) =>
    selected[f].map((id) => ({ facet: f, id, label: LABELS[f](id) })),
  );
  const hasFilters = activeChips.length > 0 || Boolean(query.trim());

  /* --------------------------------- render --------------------------------- */

  return (
    <div>
      {/* search */}
      <div className="mx-auto max-w-2xl">
        <div className="tool-search-wrap">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--quiet)]" />
          <input
            ref={searchRef}
            type="search"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="tool-suggestions"
            aria-autocomplete="list"
            aria-label="Search the free tools by name, industry, job or goal"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSuggestOpen(true); setActiveSuggestion(-1); }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => setTimeout(() => setSuggestOpen(false), 140)}
            onKeyDown={(e) => {
              if (!suggestions.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setActiveSuggestion((i) => (i + 1) % suggestions.length); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActiveSuggestion((i) => (i <= 0 ? suggestions.length - 1 : i - 1)); }
              else if (e.key === "Enter" && activeSuggestion >= 0) { e.preventDefault(); router.push(suggestions[activeSuggestion].href); }
              else if (e.key === "Escape") { setSuggestOpen(false); setActiveSuggestion(-1); }
            }}
            placeholder="Try mortgage, roofer, QR code, no shows, doctor, budget"
            className="tool-search-input"
          />
          {query && (
            <button
              type="button"
              onClick={() => { clearQuery(); searchRef.current?.focus(); }}
              aria-label="Clear the search box"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--quiet)] hover:bg-[var(--fill-2)] hover:text-[var(--heading)]"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          )}

          {suggestions.length > 0 && (
            <ul id="tool-suggestions" role="listbox" className="tool-suggestions">
              {suggestions.map((s, i) => (
                <li key={`${s.kind}-${s.href}`} role="option" aria-selected={i === activeSuggestion}>
                  <Link href={s.href} className="tool-suggestion" onMouseDown={(e) => e.preventDefault()}>
                    <span className="truncate">{s.label}</span>
                    <span className="tool-suggestion-kind">{s.kind}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Hidden on phones: the cards must clear the fold, and this line cost
            two rows of it. The placeholder examples carry the same idea. */}
        <p className="mt-2.5 hidden text-center text-[13px] text-[var(--muted)] sm:block">
          Search knows industries and job titles, not just tool names. A roofer, a loan officer and a
          practice manager all get different answers.
        </p>
      </div>

      {/* domain rail: one swipeable row on phones, centered wrap on wide */}
      <div className="tool-domain-rail mt-4 flex gap-2 sm:mt-7 sm:flex-wrap sm:justify-center">
        {(Object.keys(DOMAINS) as Domain[])
          .map((id) => ({ id, count: tools.filter((t) => t.domain === id).length }))
          .filter((d) => d.count > 0)
          .map(({ id, count }) => (
            <button
              key={id}
              type="button"
              className="tool-chip"
              aria-pressed={selected.domain.includes(id)}
              onClick={() => toggleFacet("domain", id)}
            >
              {DOMAINS[id].label}
              <span className="tool-chip-count">{count}</span>
            </button>
          ))}
      </div>

      {/* toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-3">
        <p className="text-sm font-bold text-[var(--heading)]" role="status" aria-live="polite">
          {sections.split ? (
            <>
              {sections.primary.length} close {sections.primary.length === 1 ? "match" : "matches"} and{" "}
              {sections.alsoUseful.length} broadly useful {sections.alsoUseful.length === 1 ? "tool" : "tools"}
            </>
          ) : (
            <>
              {shownCount} {shownCount === 1 ? "tool" : "tools"}
              {hasFilters ? " match" : " in the library"}
            </>
          )}
        </p>
        <div className="tool-filter-bar">
          <button type="button" className="tool-chip" onClick={() => setDrawerOpen(true)} aria-haspopup="dialog">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            Industry, audience, goal, type
          </button>
          <label className="flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
            <span className="sr-only sm:not-sr-only">Sort</span>
            <select
              value={sort}
              onChange={(e) => pushParams((p) => p.set("sort", e.target.value))}
              className="tool-select w-auto"
              aria-label="Sort the tools"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-4 tool-active-filters">
          {activeChips.map((c) => (
            <span key={`${c.facet}-${c.id}`} className="tool-active-chip">
              {c.label}
              <button type="button" onClick={() => toggleFacet(c.facet, c.id)} aria-label={`Remove the ${c.label} filter`}>
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <button type="button" onClick={clearAll} className="text-sm font-bold text-[var(--blue)] underline">
            Clear all
          </button>
        </div>
      )}

      {/* recently used */}
      {recent.length > 0 && !hasFilters && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-[var(--muted)]">
            <Clock aria-hidden="true" className="h-4 w-4" />
            Where you left off
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {recent.map((t) => (
              <Link key={t.slug} href={`/tools/${t.slug}`} className="tool-chip">
                {t.short || t.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* collections */}
      {!hasFilters && collections.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-black uppercase tracking-wider text-[var(--muted)]">Collections</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <Link
                key={c.slug}
                href={`/tools/collections/${c.slug}`}
                className="group rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--blue)]"
                onClick={() => trackTool("industry_collection_viewed", { collection: c.slug })}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-black text-[var(--heading)]">{c.short}</span>
                  <span className="text-xs font-bold text-[var(--quiet)]">{c.count}</span>
                </span>
                <span className="mt-1.5 block text-[13px] leading-relaxed text-[var(--muted)]">{c.hook}</span>
                <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-black text-[var(--blue)]">
                  Open the collection
                  <ArrowRight aria-hidden="true" className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* grid */}
      <div ref={resultsRef} className="mt-8">
        {shownCount > 0 ? (
          <>
            {sections.split && (
              <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-[var(--muted)]">
                Best matches
              </h2>
            )}
            <div className="tool-grid">
              {sections.primary.map((t, i) => (
                <ToolCard key={t.slug} tool={t} priority={i < 3} />
              ))}
            </div>
            {sections.split && (
              <section className="mt-10 border-t border-[var(--line)] pt-7">
                <h2 className="text-sm font-black uppercase tracking-wider text-[var(--muted)]">
                  Also useful for any business
                </h2>
                <div className="tool-grid mt-3">
                  {sections.alsoUseful.map((t) => (
                    <ToolCard key={t.slug} tool={t} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <EmptyState query={query} tools={tools} onPick={(q) => { setQuery(q); searchRef.current?.focus(); }} onClear={clearAll} />
        )}
      </div>

      {drawerOpen && (
        <FilterDrawer
          tools={tools}
          selected={selected}
          onToggle={toggleFacet}
          onClose={() => setDrawerOpen(false)}
          onClear={clearAll}
          count={shownCount}
        />
      )}
    </div>
  );
}

/* ------------------------------- empty state ------------------------------- */

function EmptyState({
  query,
  tools,
  onPick,
  onClear,
}: {
  query: string;
  tools: ToolIndexEntry[];
  onPick: (q: string) => void;
  onClear: () => void;
}) {
  // Never a dead end. Offer the closest real matches, then the most useful tools.
  const closest = query.trim() ? searchTools(tools, query.trim().split(" ")[0]).slice(0, 4).map((h) => h.tool) : [];
  const fallback = sortRegistry(tools, "useful").slice(0, 4);
  const show = closest.length ? closest : fallback;

  return (
    <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-7 text-center sm:p-10">
      <h2 className="text-xl font-black text-[var(--heading)]">
        {query.trim() ? `No tool matches "${query.trim()}" yet.` : "Nothing matches those filters."}
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-[var(--muted)]">
        {query.trim()
          ? "That might be a tool worth building. Text me what you were looking for and I will tell you honestly whether it is on the list."
          : "Those filters do not overlap. Clear one and try again."}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onClear} className="button-secondary" style={{ minHeight: 44 }}>
          Clear everything
        </button>
        <a
          href={`sms:+19035008898?&body=${encodeURIComponent(`Tool idea: ${query.trim() || "I was looking for "}`)}`}
          className="button-primary"
          style={{ minHeight: 44 }}
          onClick={() => trackTool("tool_request_submitted", { terms: query.trim().slice(0, 60) })}
        >
          Text me this tool idea
        </a>
      </div>

      <div className="mt-7">
        <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">
          {closest.length ? "Closest matches" : "Most useful tools"}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {show.map((t) => (
            <Link key={t.slug} href={`/tools/${t.slug}`} className="tool-chip">
              {t.short || t.name}
            </Link>
          ))}
        </div>
      </div>

      {query.trim() && (
        <div className="mt-5">
          <p className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Or try</p>
          <div className="mt-2.5 flex flex-wrap justify-center gap-2">
            {["missed calls", "pricing", "QR code", "reviews", "mortgage", "restaurant"].map((s) => (
              <button key={s} type="button" onClick={() => onPick(s)} className="tool-chip">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ filter drawer ------------------------------ */

function FilterDrawer({
  tools,
  selected,
  onToggle,
  onClose,
  onClear,
  count,
}: {
  tools: ToolIndexEntry[];
  selected: Record<Facet, string[]>;
  onToggle: (f: Facet, id: string) => void;
  onClose: () => void;
  onClear: () => void;
  count: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = ref.current?.querySelector<HTMLElement>("button, select, a");
    first?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !ref.current) return;
      const f = ref.current.querySelectorAll<HTMLElement>('button, a[href], select, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const firstEl = f[0];
      const lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prev;
      returnTo.current?.focus();
    };
  }, [onClose]);

  // Only offer a value that would actually return something.
  const counts = (facet: Facet, id: string) => {
    if (facet === "industry") return tools.filter((t) => t.industries.includes(id as Industry)).length;
    if (facet === "audience") return tools.filter((t) => t.audiences.includes(id as Audience)).length;
    if (facet === "goal") return tools.filter((t) => t.goals.includes(id as Goal)).length;
    if (facet === "type") return tools.filter((t) => t.toolType === id).length;
    return tools.filter((t) => t.domain === id).length;
  };

  const groups: { facet: Facet; title: string; ids: string[] }[] = [
    { facet: "industry", title: "Industry", ids: Object.keys(INDUSTRIES) },
    { facet: "audience", title: "Who it is for", ids: Object.keys(AUDIENCES) },
    { facet: "goal", title: "What you are trying to do", ids: Object.keys(GOALS) },
    { facet: "type", title: "Kind of tool", ids: Object.keys(TOOL_TYPES) },
  ];

  return (
    <>
      <div className="tool-drawer-backdrop" onClick={onClose} />
      <div ref={ref} className="tool-drawer" role="dialog" aria-modal="true" aria-label="Filter the tools">
        <div className="sticky top-0 -mx-5 -mt-5 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--panel)] px-5 py-3">
          <h2 className="text-base font-black text-[var(--heading)]">Filter the library</h2>
          <button type="button" onClick={onClose} aria-label="Close the filters" className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--fill-2)]">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {groups.map((g) => {
            const available = g.ids.map((id) => ({ id, n: counts(g.facet, id) })).filter((x) => x.n > 0);
            if (!available.length) return null;
            return (
              <section key={g.facet}>
                <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">{g.title}</h3>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {available.map(({ id, n }) => (
                    <button
                      key={id}
                      type="button"
                      className="tool-chip"
                      aria-pressed={selected[g.facet].includes(id)}
                      onClick={() => onToggle(g.facet, id)}
                    >
                      {LABELS[g.facet](id)}
                      <span className="tool-chip-count">{n}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 mt-6 flex gap-2 border-t border-[var(--line)] bg-[var(--panel)] px-5 py-3">
          <button type="button" onClick={onClear} className="button-secondary flex-1" style={{ minHeight: 44 }}>
            Clear all
          </button>
          <button type="button" onClick={onClose} className="button-primary flex-1" style={{ minHeight: 44 }}>
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Show {count} {count === 1 ? "tool" : "tools"}
          </button>
        </div>
      </div>
    </>
  );
}
