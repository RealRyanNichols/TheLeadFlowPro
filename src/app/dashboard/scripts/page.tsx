"use client";
import { useMemo, useState } from "react";
import {
  BookOpen, Copy, Check, MessageSquare, Instagram, Mail, Phone,
  Sparkles, Filter, Search
} from "lucide-react";
import {
  SCRIPTS, PHASE_META, KIND_LABEL, CHANNEL_LABEL,
  type Script, type ScriptPhase, type ScriptChannel
} from "@/lib/scripts";
import { cn } from "@/lib/utils";

const CHANNEL_ICON: Record<ScriptChannel, any> = {
  sms:       MessageSquare,
  dm:        Instagram,
  email:     Mail,
  voicemail: Phone
};

const PHASES: (ScriptPhase | "all")[] = ["all", "know", "like", "trust"];

export default function ScriptsPage() {
  const [phase, setPhase] = useState<ScriptPhase | "all">("all");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SCRIPTS.filter((s) => {
      if (phase !== "all" && s.phase !== phase) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q) ||
        s.tags.some((t) => t.includes(q))
      );
    });
  }, [phase, query]);

  async function copy(s: Script) {
    try {
      await navigator.clipboard.writeText(s.body);
      setCopiedId(s.id);
      setTimeout(() => setCopiedId((x) => (x === s.id ? null : x)), 1600);
    } catch {
      /* clipboard blocked — fail silent */
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-cyan-400" /> Scripts library
        </h1>
        <p className="text-sm text-ink-300 mt-1 max-w-2xl">
          Every customer conversation moves through three phases —
          <span className="text-cyan-400"> Know</span>,
          <span className="text-accent-400"> Like</span>, and
          <span className="text-lead-400"> Trust</span>. Pick the moment, copy the script, send it.
        </p>
      </div>

      {/* Phase overview */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(["know", "like", "trust"] as ScriptPhase[]).map((p) => {
          const meta = PHASE_META[p];
          return (
            <div key={p} className={cn("glass rounded-2xl p-4 border", meta.tone)}>
              <p className={cn("stat-pill border text-[10px]", meta.tone)}>Phase · {meta.label}</p>
              <p className="text-sm text-ink-100 mt-2">{meta.blurb}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-ink-400 mr-1">
          <Filter className="h-3.5 w-3.5" /> Phase
        </div>
        {PHASES.map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={cn(
              "text-xs py-1.5 px-3 rounded-full border transition capitalize",
              phase === p
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                : "bg-white/5 text-ink-300 border-white/10 hover:text-white"
            )}
          >
            {p === "all" ? "All" : PHASE_META[p].label}
          </button>
        ))}
        <div className="ml-auto relative min-w-0 sm:min-w-[14rem]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scripts…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Scripts */}
      <div className="space-y-3">
        {visible.length === 0 && (
          <p className="text-sm text-ink-400 text-center py-10">
            No scripts match. Try a different phase or search.
          </p>
        )}
        {visible.map((s) => {
          const phaseMeta = PHASE_META[s.phase];
          const Channel = CHANNEL_ICON[s.channel];
          const copied = copiedId === s.id;
          return (
            <div key={s.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={cn("stat-pill border text-[10px]", phaseMeta.tone)}>
                      {phaseMeta.label}
                    </span>
                    <span className="stat-pill bg-white/5 text-ink-200 border border-white/10 text-[10px] flex items-center gap-1">
                      <Channel className="h-3 w-3" /> {CHANNEL_LABEL[s.channel]}
                    </span>
                    <span className="stat-pill bg-white/5 text-ink-300 border border-white/10 text-[10px]">
                      {KIND_LABEL[s.kind]}
                    </span>
                  </div>
                  <p className="text-base font-semibold text-white">{s.title}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{s.when}</p>
                </div>
                <button
                  onClick={() => copy(s)}
                  className={cn(
                    "text-xs py-2 px-3 rounded-lg border transition shrink-0 flex items-center gap-1.5",
                    copied
                      ? "bg-lead-500/15 text-lead-400 border-lead-500/30"
                      : "bg-white/5 text-ink-200 border-white/10 hover:bg-white/10"
                  )}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <pre className="mt-3 bg-ink-950/60 border border-white/5 rounded-xl p-4 text-xs text-ink-100 whitespace-pre-wrap font-mono leading-relaxed">
{s.body}
              </pre>

              <div className="mt-3 flex items-start gap-2 text-xs text-ink-300">
                <Sparkles className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <p><span className="text-white font-semibold">Why it works:</span> {s.why}</p>
              </div>

              {s.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.tags.map((t) => (
                    <span key={t} className="text-[10px] text-ink-400 bg-white/5 border border-white/5 rounded-full px-2 py-0.5">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
