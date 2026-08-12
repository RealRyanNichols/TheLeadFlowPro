"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { TOOLS, CATEGORIES, CATEGORY_META, toolArt, type Category } from "@/lib/tools";

export default function ToolGrid() {
  const [cat, setCat] = useState<Category | "All">("All");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (cat !== "All" && t.category !== cat) return false;
      if (!needle) return true;
      return (
        t.name.toLowerCase().includes(needle) ||
        t.tagline.toLowerCase().includes(needle) ||
        t.description.toLowerCase().includes(needle) ||
        t.who.toLowerCase().includes(needle) ||
        t.category.toLowerCase().includes(needle)
      );
    });
  }, [cat, q]);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of TOOLS) m.set(t.category, (m.get(t.category) || 0) + 1);
    return m;
  }, []);

  return (
    <div>
      {/* search */}
      <div className="relative mx-auto max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--quiet)]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search 70+ tools: pricing, reviews, QR, missed calls..."
          aria-label="Search the free tools"
          className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] py-3 pl-11 pr-10 text-sm text-[var(--heading)] placeholder:text-[var(--quiet)] focus:border-[var(--accent-line)] focus:outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--quiet)] hover:text-[var(--heading)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* category chips */}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => setCat("All")}
          className="tool-chip"
          style={
            cat === "All"
              ? { background: "var(--text)", color: "var(--on-accent)", border: "1px solid var(--text)" }
              : { background: "var(--panel)", color: "var(--text)", border: "1px solid var(--line-strong)" }
          }
        >
          All {TOOLS.length}
        </button>
        {CATEGORIES.map((c) => {
          const m = CATEGORY_META[c];
          const on = cat === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className="tool-chip"
              style={
                on
                  ? { background: `${m.from}26`, color: m.text, border: `1px solid ${m.ring}` }
                  : { background: "var(--panel)", color: "var(--text)", border: "1px solid var(--line-strong)" }
              }
            >
              <span aria-hidden="true">{m.emoji}</span>
              {c}
              <span className="opacity-60">{counts.get(c)}</span>
            </button>
          );
        })}
      </div>

      {cat !== "All" && (
        <p className="mt-4 text-center text-sm text-[var(--muted)]">{CATEGORY_META[cat].blurb}</p>
      )}

      {/* grid */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => {
          const art = toolArt(t);
          return (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className="tool-card group"
              style={{ background: "rgba(255,255,255,0.03)", border: art.border }}
            >
              <div className="tool-card-art" style={{ background: art.background }}>
                <span className="relative z-10" aria-hidden="true">
                  {t.emoji}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                    style={{ color: art.text, background: `${art.from}1f`, border: `1px solid ${art.ring}` }}
                  >
                    {t.category}
                  </span>
                  <span className="rounded-full border border-[var(--green-line)] bg-[var(--green-tint)] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--green)]">
                    Free
                  </span>
                </div>
                <h3 className="mt-3 text-[17px] font-black leading-tight text-[var(--heading)]">{t.name}</h3>
                <p className="mt-1 text-[13px] font-bold" style={{ color: art.text }}>
                  {t.tagline}
                </p>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[var(--muted)]">
                  {t.description.length > 130 ? `${t.description.slice(0, 128)}...` : t.description}
                </p>
                <span
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-black text-[var(--heading)] transition"
                  style={{ background: `linear-gradient(135deg, ${art.from}, ${art.to})` }}
                >
                  Use it now
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-10 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-10 text-center">
          <p className="text-lg font-black text-[var(--heading)]">No tool for that yet.</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Text me what you were looking for at (903) 500-8898 and I might build
            it next.
          </p>
        </div>
      )}
    </div>
  );
}
