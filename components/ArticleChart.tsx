import type { ArticleChart as ArticleChartData, ArticleChartBar } from "@/lib/articles";

// Charts inside articles.
//
// Drawn on the server from the numbers in the article file. No chart library,
// no script, nothing to download: the bars are HTML, so the figure is in the
// page Google reads, it prints, and it works with images off. Every chart
// names its source under the bars. A worked example says "Illustrative" in the
// corner so nobody mistakes practice arithmetic for a client's result.

const TONE: Record<NonNullable<ArticleChartBar["tone"]>, string> = {
  blue: "linear-gradient(90deg, #0993dd, #3b82f6)",
  red: "linear-gradient(90deg, #dc4747, #ef6b6b)",
  green: "linear-gradient(90deg, #17804f, #2fae75)",
  gold: "linear-gradient(90deg, #b8720c, #e0a13a)",
  muted: "linear-gradient(90deg, #7c8696, #a3abb8)",
};

const COLUMN_TONE: Record<NonNullable<ArticleChartBar["tone"]>, string> = {
  blue: "linear-gradient(180deg, #3b82f6, #0993dd)",
  red: "linear-gradient(180deg, #ef6b6b, #dc4747)",
  green: "linear-gradient(180deg, #2fae75, #17804f)",
  gold: "linear-gradient(180deg, #e0a13a, #b8720c)",
  muted: "linear-gradient(180deg, #a3abb8, #7c8696)",
};

export function formatChartValue(value: number, unit: ArticleChartData["unit"]): string {
  switch (unit) {
    case "percent":
      return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
    case "money":
      return value % 1 === 0
        ? `$${value.toLocaleString("en-US")}`
        : `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "x":
      return `${value}x`;
    case "minutes":
      return `${value} min`;
    case "text":
      return "";
    default:
      return value.toLocaleString("en-US");
  }
}

export default function ArticleChart({ chart }: { chart: ArticleChartData }) {
  const max = Math.max(chart.max ?? 0, ...chart.bars.map((b) => b.value), 1);
  const unit = chart.unit ?? "count";
  const headingId = `chart-${chart.id}-title`;

  return (
    <figure
      aria-labelledby={headingId}
      className="not-prose my-10 rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <figcaption>
          <p id={headingId} className="text-[17px] font-black leading-snug text-[var(--heading)]">
            {chart.title}
          </p>
          {chart.subtitle ? (
            <p className="mt-1 text-[13px] text-[var(--muted)]">{chart.subtitle}</p>
          ) : null}
        </figcaption>
        {chart.illustrative ? (
          <span className="rounded-full border border-[var(--line-strong)] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--quiet)]">
            Illustrative
          </span>
        ) : null}
      </div>

      {chart.kind === "columns" ? (
        <div className="mt-5">
          <div className="flex h-44 items-end gap-2 sm:gap-3" role="presentation">
            {chart.bars.map((b) => (
              <div key={b.label} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-[12px] font-bold text-[var(--heading)]">
                  {formatChartValue(b.value, unit)}
                </span>
                <div
                  className="w-full max-w-[64px] rounded-t-md"
                  style={{
                    height: `${Math.max(3, (b.value / max) * 100)}%`,
                    background: COLUMN_TONE[b.tone ?? "blue"],
                  }}
                  title={b.note ?? b.label}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2 sm:gap-3">
            {chart.bars.map((b) => (
              <div key={b.label} className="min-w-0 flex-1 text-center text-[11.5px] leading-tight text-[var(--quiet)]">
                {b.label}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {chart.bars.map((b) => (
            <div key={b.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-[14px] font-bold text-[var(--heading)]">{b.label}</span>
                <span className="shrink-0 text-[14px] font-black text-[var(--heading)]">
                  {formatChartValue(b.value, unit)}
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded bg-[var(--fill-1)]">
                <div
                  className="h-full rounded-r"
                  style={{
                    width: `${Math.max(1.5, (b.value / max) * 100)}%`,
                    background: TONE[b.tone ?? "blue"],
                  }}
                  title={b.note ?? b.label}
                />
              </div>
              {b.note ? <p className="mt-1 text-[12.5px] text-[var(--quiet)]">{b.note}</p> : null}
            </div>
          ))}
        </div>
      )}

      {/* The same numbers as a table, for screen readers and for anyone who copies them. */}
      <table className="sr-only">
        <caption>{chart.title}</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {chart.bars.map((b) => (
            <tr key={b.label}>
              <th scope="row">{b.label}</th>
              <td>{formatChartValue(b.value, unit) || b.note || ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--quiet)]">
        {chart.illustrative ? "Illustrative arithmetic only. " : ""}
        Source: {chart.source}
      </p>
    </figure>
  );
}
