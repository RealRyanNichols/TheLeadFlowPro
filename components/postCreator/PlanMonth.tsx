"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Download } from "lucide-react";
import { draftCopyText, renderDraft } from "@/lib/postCreator/ideas/drafts";
import { inputSignature } from "@/lib/postCreator/ideas/engine";
import { parsePlanDay, planDayLabel, planDayOf, planToCsv, planToText } from "@/lib/postCreator/ideas/plan";
import type { PlanCadence, PlanDay } from "@/lib/postCreator/ideas/types";
import { PLATFORMS, isPlatformId, type PlatformId } from "@/lib/postCreator/options";
import BlankText from "./BlankText";
import CopyButton from "./CopyButton";
import { FIELD_CLASS, LABEL_CLASS } from "./SetupFields";
import { usePostCreator } from "./ShuffleProvider";

// A month of post ideas in one tap. Each posting day gets the next idea from
// the same shuffle as the idea machine, so nothing in the month repeats and
// the machine carries on after it. The plan is a list for the owner: it can
// be downloaded as a spreadsheet or copied, and nothing is scheduled or
// posted. Runs in the browser only.

const CADENCES: readonly { id: PlanCadence; label: string }[] = [
  { id: "daily", label: "Every day" },
  { id: "weekdays", label: "Weekdays" },
  { id: "three", label: "Three days a week" },
];

function isCadence(x: string): x is PlanCadence {
  return CADENCES.some((c) => c.id === x);
}

/** "2026-09-25" as "September 25". */
function monthDay(isoDay: string): string {
  const date = parsePlanDay(isoDay);
  return date ? date.toLocaleDateString("en-US", { month: "long", day: "numeric" }) : isoDay;
}

function tomorrow(): string {
  const now = new Date();
  return planDayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12));
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Spreadsheet rows as CSV text: every cell quoted, rows ended the way spreadsheets expect. */
export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export default function PlanMonth() {
  const { input, plan, ready, picked } = usePostCreator();
  const baseId = useId();
  const [cadence, setCadence] = useState<PlanCadence>("three");
  const [start, setStart] = useState("");
  const [platform, setPlatform] = useState<PlatformId>("facebook");
  const [days, setDays] = useState<PlanDay[] | null>(null);
  const [open, setOpen] = useState<string[]>([]);
  const [startError, setStartError] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const signature = inputSignature(input);
  const id = (name: string) => `${baseId}-${name}`;

  // The date is the visitor's own tomorrow, so it is filled in by the browser.
  useEffect(() => {
    setStart((s) => s || tomorrow());
  }, []);

  // A plan belongs to the settings it was made for.
  useEffect(() => {
    setDays(null);
    setOpen([]);
  }, [signature]);

  if (ready && !picked) {
    return <p className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-[15px] text-[var(--muted)]">Pick your trade first, then plan your month.</p>;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setDownloadError(false);
    if (!parsePlanDay(start)) {
      setStartError(true);
      return;
    }
    setStartError(false);
    const planned = plan(start, cadence);
    if (planned) {
      setDays(planned);
      setOpen([]);
    }
  }

  function toggle(date: string) {
    setOpen((o) => (o.includes(date) ? o.filter((d) => d !== date) : [...o, date]));
  }

  function download() {
    if (!days) return;
    setDownloadError(false);
    try {
      const { headers, rows } = planToCsv(days, input, platform);
      // A byte order mark first, so a spreadsheet opens the file as UTF-8.
      const blob = new Blob([String.fromCharCode(0xfeff) + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `post-plan-${days[0]?.date ?? start}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError(true);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-[17px] leading-relaxed text-[var(--muted)]">Pick how often you post. You get a different idea for every day, ready to copy.</p>
      <form onSubmit={submit} noValidate className="grid gap-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:grid-cols-3 sm:p-6">
        <div>
          <label htmlFor={id("cadence")} className={LABEL_CLASS}>
            How often?
          </label>
          <select
            id={id("cadence")}
            className={FIELD_CLASS}
            value={cadence}
            onChange={(e) => {
              if (isCadence(e.target.value)) setCadence(e.target.value);
            }}
          >
            {CADENCES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id("start")} className={LABEL_CLASS}>
            Start on
          </label>
          <input
            id={id("start")}
            type="date"
            className={FIELD_CLASS}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-invalid={startError ? true : undefined}
            aria-describedby={startError ? id("start-error") : undefined}
          />
          {startError ? (
            <p id={id("start-error")} role="alert" className="tool-field-error mt-1.5">
              Pick the day to start on.
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor={id("platform")} className={LABEL_CLASS}>
            Drafts for
          </label>
          <select
            id={id("platform")}
            className={FIELD_CLASS}
            value={platform}
            onChange={(e) => {
              if (isPlatformId(e.target.value)) setPlatform(e.target.value);
            }}
          >
            {PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <button type="submit" className="button-primary w-full sm:w-auto" disabled={!ready}>
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            Plan my month
          </button>
        </div>
      </form>

      <div aria-live="polite">
        {days && days.length ? (
          <p className="text-[18px] font-extrabold text-[var(--heading)]">
            {days.length} posts from {monthDay(days[0].date)} to {monthDay(days[days.length - 1].date)}
          </p>
        ) : null}
      </div>

      {days && days.length ? (
        <>
          <ol className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
            {days.map((day) => {
              const shown = open.includes(day.date);
              const draft = shown ? renderDraft(day.card, input, platform, parsePlanDay(day.date) ?? new Date()) : null;
              const panelId = id(`draft-${day.date}`);
              return (
                <li key={day.date} className="p-4">
                  <p className="text-[13px] font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">{planDayLabel(day.date)}</p>
                  <span className="mt-1.5 inline-block rounded-full border border-[var(--accent-line)] bg-[var(--accent-tint)] px-2.5 py-0.5 text-[12px] font-extrabold text-[var(--blue)]">
                    {day.card.angleLabel}
                  </span>
                  <p className="mt-1.5 text-[16px] font-bold leading-snug text-[var(--heading)] [overflow-wrap:anywhere]">{day.card.title}</p>
                  <button
                    type="button"
                    className="mt-1 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-extrabold text-[var(--blue)]"
                    aria-expanded={shown}
                    aria-controls={shown ? panelId : undefined}
                    onClick={() => toggle(day.date)}
                  >
                    {shown ? <ChevronUp aria-hidden="true" className="h-4 w-4" /> : <ChevronDown aria-hidden="true" className="h-4 w-4" />}
                    {shown ? "Hide draft" : "Show draft"}
                  </button>
                  {draft ? (
                    <div id={panelId} className="mt-2 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-3">
                      <p className="text-[15px] leading-relaxed text-[var(--heading)]">
                        <BlankText text={draftCopyText(draft)} />
                      </p>
                      <CopyButton text={draftCopyText(draft)} label="Copy post" />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-start gap-2">
            <button type="button" className="button-primary" onClick={download}>
              <Download aria-hidden="true" className="h-4 w-4" />
              Download spreadsheet (.csv)
            </button>
            <CopyButton text={planToText(days, input, platform)} label="Copy the whole month" />
          </div>
          {downloadError ? (
            <p role="alert" className="tool-field-error">
              Could not start the download. Try Copy the whole month instead.
            </p>
          ) : null}
        </>
      ) : null}

      <p className="text-[14px] leading-relaxed text-[var(--muted)]">This plan is a list for you. Nothing is scheduled or posted.</p>
    </div>
  );
}
