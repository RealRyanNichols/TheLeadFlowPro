"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Search, Loader2, CheckCircle2, AlertTriangle, XCircle, Trophy,
  Sparkles, ArrowRight, Copy, RotateCcw
} from "lucide-react";
import type { GradeReport, Finding } from "@/lib/seo-grader";
import { categoryLabel } from "@/lib/seo-grader";

const CATEGORIES: Array<Finding["category"]> = ["basics", "social", "technical", "content"];

export function SeoGraderForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<GradeReport | null>(null);

  async function grade(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReport(null);
    setLoading(true);
    try {
      const res = await fetch("/api/seo-grader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Something went wrong. Try again.");
      else setReport(data as GradeReport);
    } catch {
      setError("Network hiccup. Try again in a sec.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setReport(null);
    setError(null);
  }

  return (
    <div className="space-y-8">
      <form onSubmit={grade} className="glass rounded-2xl p-4 sm:p-5">
        <label className="block text-xs uppercase tracking-wider text-ink-300 font-semibold">
          Your website
        </label>
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourbusiness.com"
              autoComplete="url"
              autoCapitalize="off"
              spellCheck={false}
              required
              disabled={loading}
              className="w-full bg-ink-950 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url}
            className="btn-accent text-sm py-2.5 px-5 disabled:opacity-60"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Grading…</>
            ) : (
              <>Grade my site <ArrowRight className="h-4 w-4" /></>
            )}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-400">
          We pull the page you enter, check 14 on-page SEO signals, and score you
          against local-business best practices. No signup required.
        </p>
      </form>

      {error && (
        <div className="glass rounded-2xl p-4 flex items-start gap-2 border border-red-500/30 bg-red-500/5">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-ink-100">{error}</p>
        </div>
      )}

      {report && <Report report={report} onReset={reset} />}
    </div>
  );
}

function Report({ report, onReset }: { report: GradeReport; onReset: () => void }) {
  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(report.url);
    } catch { /* noop */ }
  }

  return (
    <div className="space-y-6">
      {/* Grade header */}
      <div className="glass-strong rounded-2xl p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute inset-0 bg-promo-glow opacity-30 -z-10" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold">
              SEO Grade
            </p>
            <div className="mt-1 flex items-baseline gap-3">
              <span className={"text-6xl sm:text-7xl font-extrabold " + gradeColor(report.grade)}>
                {report.grade}
              </span>
              <span className="text-2xl font-bold text-white">{report.score}/100</span>
            </div>
            <button
              onClick={copyUrl}
              title="Copy URL"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-ink-300 hover:text-cyan-400 max-w-full"
            >
              <Copy className="h-3 w-3 shrink-0" />
              <span className="truncate">{report.url}</span>
            </button>
          </div>
          <button onClick={onReset} className="btn-ghost text-xs py-2 px-3">
            <RotateCcw className="h-3.5 w-3.5" /> Grade another
          </button>
        </div>

        {/* Category scores */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES.map((c) => {
            const cat = report.categories[c];
            return (
              <div key={c} className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">
                  {categoryLabel(c)}
                </p>
                <p className={"mt-1 text-2xl font-extrabold " + gradeColor(letterFor(cat.score))}>
                  {cat.score}
                </p>
                <p className="text-[11px] text-ink-400">{cat.pass}/{cat.total} checks pass</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top wins + issues */}
      <div className="grid md:grid-cols-2 gap-4">
        {report.topWins.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-lead-400" /> What you're doing right
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-100">
              {report.topWins.map((w) => (
                <li key={w.id} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-lead-400 shrink-0 mt-0.5" />
                  <span>{w.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {report.topIssues.length > 0 && (
          <div className="glass rounded-2xl p-5 border border-accent-500/20">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-400" /> Top 3 fixes for the biggest jump
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-100">
              {report.topIssues.map((w) => (
                <li key={w.id} className="flex items-start gap-2">
                  {w.verdict === "fail"
                    ? <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    : <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />}
                  <span>{w.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Full breakdown */}
      <div className="space-y-4">
        {CATEGORIES.map((c) => {
          const items = report.findings.filter((f) => f.category === c);
          if (items.length === 0) return null;
          return (
            <div key={c} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {categoryLabel(c)}
                </h3>
                <span className="text-[11px] text-ink-400">
                  {report.categories[c].pass}/{report.categories[c].total} passing
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {items.map((f) => <Row key={f.id} f={f} />)}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="glass-strong rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-promo-glow opacity-40 -z-10" />
        <h3 className="text-xl sm:text-2xl font-extrabold text-white">
          Want to fix all of this on autopilot?
        </h3>
        <p className="mt-2 text-sm text-ink-200 max-w-xl mx-auto">
          LeadFlow Pro's SEO Growth tier re-scans you weekly, compares you to
          your top 3 local competitors, and hands you a prioritized fix list
          with copy-paste meta tags, schema, and content ideas.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn-accent text-sm py-2.5 px-5">
            Start free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/#pricing" className="btn-ghost text-sm py-2.5 px-5">
            See pricing
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ f }: { f: Finding }) {
  const Icon =
    f.verdict === "pass" ? CheckCircle2 :
    f.verdict === "warn" ? AlertTriangle :
    XCircle;
  const color =
    f.verdict === "pass" ? "text-lead-400" :
    f.verdict === "warn" ? "text-amber-400" :
    "text-red-400";
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start gap-2">
        <Icon className={"h-4 w-4 shrink-0 mt-0.5 " + color} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">{f.title}</p>
          <p className="mt-0.5 text-xs text-ink-300">{f.detail}</p>
          <p className="mt-1.5 text-xs text-ink-200">
            <span className="text-cyan-400 font-semibold">Fix: </span>
            {f.fix}
          </p>
        </div>
      </div>
    </div>
  );
}

function gradeColor(g: string) {
  switch (g) {
    case "A": return "text-lead-400";
    case "B": return "text-cyan-400";
    case "C": return "text-amber-400";
    case "D": return "text-orange-400";
    default:  return "text-red-400";
  }
}

function letterFor(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
