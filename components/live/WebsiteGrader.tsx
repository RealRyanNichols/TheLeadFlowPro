"use client";

// "Grade my website" on /live: the visitor's site vs this site vs the real
// running average of every site graded here — three columns, same ruler.
// Scores come from Google's public Lighthouse API plus our own HTML checks;
// rows that could not be measured say so instead of showing a number.

import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics/client";

type Scores = {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  best_practices: number | null;
  lcp_s: number | null;
  search_readiness: number;
  lead_readiness: number;
  overall: number | null;
  letter: string | null;
};

type GradeResponse = {
  yours: { host: string; checked_at: string; scores: Scores; checks: Record<string, boolean> };
  reference: { host: string; checked_at: string; scores: Scores } | null;
  average: Record<string, number> | null;
  average_count: number;
  average_min: number;
  error?: string;
};

const ROWS: Array<{ key: keyof Scores; label: string; lowerBetter?: boolean; unit?: string; help: string }> = [
  { key: "performance", label: "Performance", help: "Google Lighthouse mobile performance score." },
  { key: "seo", label: "SEO basics", help: "Google Lighthouse SEO checks." },
  { key: "accessibility", label: "Accessibility", help: "Google Lighthouse accessibility checks." },
  { key: "best_practices", label: "Best practices", help: "Google Lighthouse best-practices checks." },
  { key: "lcp_s", label: "Load speed (LCP)", lowerBetter: true, unit: "s", help: "Largest Contentful Paint — how fast the main content shows. Lower is better; Google's bar for good is 2.5s." },
  { key: "search_readiness", label: "Search readiness", help: "Our checks: title, description, canonical, sitemap, robots, structured data, share tags." },
  { key: "lead_readiness", label: "Lead capture", help: "Our checks: a working form, click-to-call or text, a real call to action, and measurement installed." },
];

const CHECK_LABELS: Record<string, string> = {
  title: "page title",
  meta_description: "meta description",
  canonical: "canonical tag",
  viewport: "mobile viewport",
  og_tags: "social share tags",
  json_ld: "structured data",
  robots_txt: "robots.txt",
  sitemap: "sitemap",
  has_form: "a lead form",
  has_tel_or_sms: "click-to-call or text",
  has_analytics: "analytics tracking",
  has_cta: "a clear call to action",
  https: "https",
};

function scoreTone(value: number | null, lowerBetter = false): string {
  if (value == null) return "text-[#7f8ca3]";
  if (lowerBetter) {
    if (value <= 2.5) return "text-[#4ade80]";
    if (value <= 4) return "text-[#fbbf24]";
    return "text-[#f87171]";
  }
  if (value >= 80) return "text-[#4ade80]";
  if (value >= 50) return "text-[#fbbf24]";
  return "text-[#f87171]";
}

function ScoreCell({ value, lowerBetter, unit }: { value: number | null | undefined; lowerBetter?: boolean; unit?: string }) {
  if (value == null) {
    return <span className="text-[13px] text-[#7f8ca3]">not measured</span>;
  }
  return (
    <span className={`text-lg font-black tabular-nums ${scoreTone(value, lowerBetter)}`}>
      {value}
      {unit && <span className="ml-0.5 text-xs font-semibold">{unit}</span>}
    </span>
  );
}

export default function WebsiteGrader() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    track("tool_start", { toolSlug: "website-grader" });
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as GradeResponse;
      if (!res.ok || json.error) {
        setError(json.error ?? "Grading failed — try again in a minute.");
      } else {
        setResult(json);
        track("tool_complete", { toolSlug: "website-grader" });
      }
    } catch {
      setError("Grading failed — try again in a minute.");
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setBusy(false);
    }
  }

  const missing =
    result
      ? Object.entries(result.yours.checks)
          .filter(([, ok]) => !ok)
          .map(([key]) => CHECK_LABELS[key])
          .filter(Boolean)
      : [];

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row" aria-label="Grade my website">
        <label className="sr-only" htmlFor="grader-url">Your website address</label>
        <input
          id="grader-url"
          className="input flex-1 !border-white/20 !bg-white/[0.06] !text-white placeholder:text-[#7f8ca3]"
          placeholder="yourwebsite.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          inputMode="url"
          autoComplete="url"
          required
        />
        <button type="submit" disabled={busy} className="button-primary whitespace-nowrap disabled:opacity-60">
          {busy ? "Grading…" : "Grade My Website"}
          {!busy && <ArrowRight aria-hidden="true" className="h-4 w-4" />}
        </button>
      </form>

      {busy && (
        <p className="mt-4 flex items-center gap-2 text-sm text-[#a8b4c8]" role="status">
          <span className="live-pulse-dot" aria-hidden="true" />
          {elapsed < 6
            ? "Reaching your site and reading its HTML…"
            : "Running Google Lighthouse on your site — this takes about half a minute…"}
          <span className="tabular-nums text-[#7f8ca3]">{elapsed}s</span>
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm font-semibold text-[#f87171]" role="alert">{error}</p>
      )}

      {result && (
        <div className="mt-6">
          {/* letter row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { title: result.yours.host, letter: result.yours.scores.letter, sub: "your site" },
              { title: "TheLeadFlowPro", letter: result.reference?.scores.letter ?? null, sub: "this site" },
              {
                title: "Average",
                letter: result.average?.overall != null
                  ? ["A", "B", "C", "D", "F"][
                      result.average.overall >= 90 ? 0 : result.average.overall >= 80 ? 1 : result.average.overall >= 70 ? 2 : result.average.overall >= 60 ? 3 : 4
                    ]
                  : null,
                sub: `sites graded here`,
              },
            ].map((col) => (
              <div key={col.sub} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
                <div className="truncate text-[11px] font-bold uppercase tracking-wider text-[#a8b4c8]">{col.title}</div>
                <div className={`mt-1 text-4xl font-black ${col.letter ? scoreTone(col.letter === "A" ? 95 : col.letter === "B" ? 85 : col.letter === "C" ? 72 : col.letter === "D" ? 62 : 40) : "text-[#7f8ca3]"}`}>
                  {col.letter ?? "—"}
                </div>
                <div className="text-[11px] text-[#7f8ca3]">{col.sub}</div>
              </div>
            ))}
          </div>

          {/* score table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-[#a8b4c8]">
                  <th scope="col" className="py-2 pr-3 font-bold">Measure</th>
                  <th scope="col" className="py-2 pr-3 font-bold">You</th>
                  <th scope="col" className="py-2 pr-3 font-bold">This site</th>
                  <th scope="col" className="py-2 font-bold">Average</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.key} className="border-t border-white/10">
                    <th scope="row" className="py-2.5 pr-3 text-[13px] font-semibold text-[#e7ecf5]">
                      {row.label}
                      <span className="block text-[10px] font-normal leading-snug text-[#7f8ca3]">{row.help}</span>
                    </th>
                    <td className="py-2.5 pr-3">
                      <ScoreCell value={result.yours.scores[row.key] as number | null} lowerBetter={row.lowerBetter} unit={row.unit} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <ScoreCell value={(result.reference?.scores[row.key] ?? null) as number | null} lowerBetter={row.lowerBetter} unit={row.unit} />
                    </td>
                    <td className="py-2.5">
                      {result.average ? (
                        <ScoreCell value={result.average[row.key] ?? null} lowerBetter={row.lowerBetter} unit={row.unit} />
                      ) : (
                        <span className="text-[11px] text-[#7f8ca3]">
                          unlocks at {result.average_min} sites ({result.average_count} so far)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {missing.length > 0 && (
            <div className="mt-4 rounded-xl border border-[#fbbf2444] bg-[#fbbf2411] p-4">
              <p className="text-[13px] font-bold text-[#fbbf24]">
                Your site is missing: {missing.join(", ")}.
              </p>
              <p className="mt-1 text-[13px] text-[#c9d3e4]">
                Every one of those is a leak — attention arriving with nowhere to land. This is
                exactly what the system fixes.
              </p>
              <a href="#dashboard-request" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#5b87ff] hover:text-white">
                Fix my grades — build my system
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-[#7f8ca3]">
            Scores: Google&apos;s public Lighthouse API (mobile) plus our own reality checks. The
            average is the real average of sites graded on this page — not an invented industry
            number. Nobody can see your Google rankings without your Search Console, so we
            don&apos;t pretend to. We store only the domain and its scores, nothing about you.
          </p>
        </div>
      )}
    </div>
  );
}
