"use client";

// Two questions, then three to five tools.
//
// The filter drawer is for people who already know what they want. This is for
// everyone else. It stays collapsed until somebody opens it, so it costs nothing
// to have on the page.

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wand2, ArrowRight, RotateCcw } from "lucide-react";
import {
  GOALS, GOAL_IDS, INDUSTRIES, AUDIENCES,
  type Goal, type Industry, type Audience, type ToolIndexEntry,
} from "@/lib/tools";
import { trackTool } from "@/lib/tools/analytics";

/** The contexts worth offering. Anything narrower belongs in the filter drawer. */
const CONTEXTS: { id: string; label: string; industries?: Industry[]; audiences?: Audience[] }[] = [
  { id: "trades", label: "Trades and home services", industries: ["general-contracting", "roofing", "plumbing", "electrical", "hvac", "landscaping", "cleaning", "remodeling", "painting", "handyman"] },
  { id: "realestate", label: "Real estate or lending", industries: ["real-estate", "mortgage-lending", "insurance"] },
  { id: "health", label: "Medical or dental office", industries: ["medical-practice", "dental-practice", "veterinary"] },
  { id: "legal", label: "Law firm or professional practice", industries: ["legal", "accounting", "consulting"] },
  { id: "food", label: "Restaurant, bar or food", industries: ["restaurant", "food-truck", "catering", "bar", "coffee-shop"] },
  { id: "beauty", label: "Salon, barber or spa", industries: ["hair-salon", "nail-salon", "barbershop", "spa", "massage"] },
  { id: "retail", label: "Retail or ecommerce", industries: ["retail", "ecommerce"] },
  { id: "hospitality", label: "Rentals, hotels or tourism", industries: ["vacation-rental", "hotel", "tourism"] },
  { id: "auto", label: "Auto, towing or transport", industries: ["auto-repair", "auto-dealership", "towing", "trucking", "moving", "logistics"] },
  { id: "faith", label: "Church or nonprofit", industries: ["church", "nonprofit"] },
  { id: "public", label: "Government or public safety", industries: ["government", "public-safety", "law-enforcement", "fire-ems"] },
  { id: "tech", label: "Software or agency", industries: ["saas", "it-services", "app-development", "marketing-agency"] },
  { id: "home", label: "Home and family", industries: ["household", "personal-finance"], audiences: ["parents"] },
  { id: "any", label: "Something else" },
];

export default function ToolFinder({ tools }: { tools: ToolIndexEntry[] }) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [context, setContext] = useState<string | null>(null);

  const picks = useMemo(() => {
    if (!goal) return [];
    const ctx = CONTEXTS.find((c) => c.id === context);
    return tools
      .map((t) => {
        let score = 0;
        if (t.goals.includes(goal)) score += 10;
        if (ctx?.industries?.some((i) => t.industries.includes(i))) score += 8;
        if (ctx?.audiences?.some((a) => t.audiences.includes(a))) score += 4;
        // Popularity only breaks ties. It must not outrank actually fitting.
        return { t, score: score + t.popularity / 100 };
      })
      .filter((x) => x.score >= 8)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.t);
  }, [tools, goal, context]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); trackTool("tool_filter_applied", { filter: "finder" }); }}
        className="button-secondary"
        style={{ minHeight: 44 }}
      >
        <Wand2 aria-hidden="true" className="h-4 w-4" />
        Help me find the right tool
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-tint)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[var(--heading)]">Find the right tool</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Two questions. No email, no signup.</p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setGoal(null); setContext(null); }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-[var(--muted)] hover:bg-[var(--fill-2)]"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Close
        </button>
      </div>

      <fieldset className="mt-5">
        <legend className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
          1. What are you trying to do?
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {GOAL_IDS.map((g) => (
            <button key={g} type="button" className="tool-chip" aria-pressed={goal === g} onClick={() => setGoal(g)}>
              {GOALS[g].question}
            </button>
          ))}
        </div>
      </fieldset>

      {goal && (
        <fieldset className="mt-5">
          <legend className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
            2. What kind of work is it for?
          </legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {CONTEXTS.map((c) => (
              <button key={c.id} type="button" className="tool-chip" aria-pressed={context === c.id} onClick={() => setContext(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {goal && context && (
        <div className="mt-6" role="status" aria-live="polite">
          <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
            {picks.length ? `Start with ${picks.length === 1 ? "this" : `these ${picks.length}`}` : "Nothing fits that pair yet"}
          </h3>
          {picks.length ? (
            <ul className="mt-3 grid gap-2">
              {picks.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/tools/${t.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-3.5 transition hover:border-[var(--blue)]"
                  >
                    <img src={t.image.src} alt="" width={64} height={36} loading="lazy" className="h-9 w-16 shrink-0 rounded-md border border-[var(--line)] object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black text-[var(--heading)]">{t.name}</span>
                      <span className="block truncate text-xs text-[var(--muted)]">{t.tagline}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--blue)] transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted)]">
              That combination is on the build list rather than the shelf. Text me at (903) 500-8898 and
              tell me what you needed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
