import { Activity, AlertTriangle, Calculator, Camera, CheckCircle2 } from "lucide-react";
import { agoLabel, type PulseRow } from "@/lib/commandCenterPulse";
import { PLAN_DISCLAIMER, type JobsMath, type PlanRow } from "@/lib/commandCenterPlan";
import { formatCentral } from "@/lib/businessTime";

// The pulse (when each lane last moved, with a warning when it has been too
// long), the plan-and-call sheet (industry planning rates and the jobs
// arithmetic for the second call), and the snapshot door. Pure views: the
// pages pass in what lib/commandCenterPulse.ts and lib/commandCenterPlan.ts
// computed. Nothing here reads or writes.

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
const PANEL = "rounded-[22px] border border-[var(--line)] bg-[var(--panel)] p-5";

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function PulsePanel({ rows, metaRead }: { rows: PulseRow[]; metaRead: boolean }) {
  const warned = rows.filter((r) => r.warn);
  return (
    <section className={PANEL} aria-labelledby="pulse">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
          <h3 id="pulse" className="font-black text-[var(--heading)]">Pulse</h3>
        </div>
        <p className={`text-xs font-bold ${warned.length ? "text-[var(--warn)]" : "text-[var(--green)]"}`}>
          {warned.length ? `${warned.length} lane${warned.length === 1 ? "" : "s"} need${warned.length === 1 ? "s" : ""} a look` : "Every lane has a heartbeat"}
        </p>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        When each lane last moved. A quiet lane is the failure nobody reports: an ad with no form behind it, a poll that stopped, a text nobody answered.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <li
            key={row.key}
            className={`rounded-2xl border p-3 ${row.warn ? "border-[var(--warn-line)] bg-[var(--warn-tint)]" : "border-[var(--line)] bg-[var(--panel)]"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{row.label}</p>
              {row.warn ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warn)]" aria-label="needs a look" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--green)]" aria-hidden="true" />
              )}
            </div>
            <p className="mt-1 text-lg font-black tabular-nums text-[var(--heading)]">{agoLabel(row.hoursAgo)}</p>
            <p className="text-[11px] text-[var(--quiet)]">{row.at ? formatCentral(new Date(row.at)) : "No row in the window read"}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text)]">{row.note}</p>
          </li>
        ))}
      </ul>
      {!metaRead ? (
        <p className="mt-3 text-[11px] text-[var(--quiet)]">Meta was not read this time, so the Meta lane is judged on our own records alone.</p>
      ) : null}
    </section>
  );
}

export function PlanPanel({
  rows,
  math,
  basePath,
  days,
  profitTyped,
}: {
  rows: PlanRow[];
  math: JobsMath;
  basePath: string;
  days: number;
  /** What the person typed for profit per job, echoed back into the field. */
  profitTyped: string;
}) {
  const contribution = math.contributionUsd;
  return (
    <section id="plan" className={PANEL} aria-labelledby="plan-and-call">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
        <h3 id="plan-and-call" className="font-black text-[var(--heading)]">Plan and call</h3>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">The sheet for the second call: what an outcome costs to plan for, by industry, and what a client&apos;s number of jobs comes to.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
              <th scope="col" className="py-2 pr-3">Industry</th>
              <th scope="col" className="py-2 pr-3">Counted outcome</th>
              <th scope="col" className="py-2 pr-3">Planning rate</th>
              <th scope="col" className="py-2 pr-3">Base covers</th>
              <th scope="col" className="py-2">Five more</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {rows.map((row) => (
              <tr key={row.industry}>
                <td className="py-2 pr-3 font-bold text-[var(--heading)]">{row.industry}</td>
                <td className="py-2 pr-3 text-[var(--text)]">{row.outcome}</td>
                <td className="py-2 pr-3 tabular-nums text-[var(--text)]">{usd(row.rateUsd)} each</td>
                <td className="py-2 pr-3 tabular-nums text-[var(--text)]">{row.outcomesAtBase}</td>
                <td className="py-2 tabular-nums text-[var(--text)]">+{usd(row.fiveMoreUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form method="get" action={`${basePath}#plan`} className="mt-4 grid gap-3 sm:grid-cols-4 sm:items-end">
        {days !== 7 ? <input type="hidden" name="window" value={String(days)} /> : null}
        <label className="block text-xs font-bold text-[var(--muted)]">
          Jobs they want
          <input name="jobs" type="number" inputMode="numeric" min={1} max={500} step={1} defaultValue={math.jobs} className={`mt-1 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2 text-base font-bold text-[var(--heading)] ${FOCUS}`} />
        </label>
        <label className="block text-xs font-bold text-[var(--muted)]">
          Planning rate per job
          <input name="rate" type="number" inputMode="numeric" min={1} step={1} defaultValue={math.rateUsd} className={`mt-1 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2 text-base font-bold text-[var(--heading)] ${FOCUS}`} />
        </label>
        <label className="block text-xs font-bold text-[var(--muted)]">
          Their profit per job (optional)
          <input name="profit" type="text" inputMode="numeric" defaultValue={profitTyped} placeholder="what a job is worth to them" className={`mt-1 w-full rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2 text-base font-bold text-[var(--heading)] ${FOCUS}`} />
        </label>
        <button type="submit" className={`inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--blue)] px-4 text-sm font-black text-white ${FOCUS}`}>
          Run the numbers
        </button>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--line)] p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Investment to plan for</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-[var(--heading)]">{usd(math.investmentUsd)}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {math.jobs} job{math.jobs === 1 ? "" : "s"} at {usd(math.rateUsd)}. The base campaign is {usd(math.baseUsd)} and covers {math.jobsAtBase} at this rate
            {math.investmentUsd > math.baseUsd ? `; ${usd(math.investmentUsd - math.baseUsd)} on top for the rest.` : "."}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 ${contribution === null ? "border-[var(--line)]" : contribution >= 0 ? "border-[var(--green-line)] bg-[var(--green-tint)]" : "border-[var(--warn-line)] bg-[var(--warn-tint)]"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">If every target lands</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-[var(--heading)]">{contribution === null ? "–" : `${contribution < 0 ? "-" : "+"}${usd(Math.abs(contribution))}`}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {contribution === null
              ? "Type what a job is worth to them and this shows the campaign's contribution at target."
              : `${math.jobs} × ${usd(math.profitPerJobUsd ?? 0)} minus ${usd(math.investmentUsd)}. Their number, their math.`}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">What to say</p>
          <p className="mt-1 text-sm font-bold leading-6 text-[var(--heading)]">
            &ldquo;Plan on {usd(math.rateUsd)} a job. You want {math.jobs}. That is {usd(math.investmentUsd)}, up to ninety days, ad spend inside it, written scope before you pay.&rdquo;
          </p>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-[var(--quiet)]">{PLAN_DISCLAIMER}</p>
    </section>
  );
}

export function SnapshotLink({ days }: { days: number }) {
  return (
    <a
      href={`/admin/command-center/snapshot?window=${days}`}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 text-sm font-black text-[var(--text)] hover:border-[var(--accent-line)] ${FOCUS}`}
      title="A 1200 by 630 card of this board's counts, nothing private on it"
    >
      <Camera className="h-4 w-4" aria-hidden="true" /> Snapshot
    </a>
  );
}
