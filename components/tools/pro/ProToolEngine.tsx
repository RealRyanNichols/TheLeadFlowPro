"use client";

// The pro kit engine.
//
// A free tool is one screen: numbers in, a number out. A kit is a short walk:
// brand it, answer a few questions, watch the result build, then take the
// documents. So this renders the fields grouped into numbered steps, keeps the
// answer live while somebody moves through them, and shows exactly what is in
// the box before they pay for it.
//
// The formulas are not in this file and are not in the bundle. Every keystroke
// posts to /api/pro/render, which runs the kit on the server and returns the
// documents only when the visitor owns the kit. That is the lock, and it is
// also why a competitor cannot read the generator out of our JavaScript.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Check, Download, FileText, Loader2, Lock, Printer, RotateCcw, Sparkles,
} from "lucide-react";
import type { Field, Result, Values } from "@/lib/tools/types";
import type { BrandKit } from "@/lib/tools/types";
import { BRAND_EVENT, brandIsSet, readBrandKit } from "@/lib/brandKit";
import { downloadBlob, downloadCsv, downloadText } from "@/components/tools/exports";
import { trackTool } from "@/lib/tools/analytics";
import BrandKitPanel from "./BrandKitPanel";
import ProBuyButton from "./ProBuyButton";

type Listing = {
  id: string;
  title: string;
  blurb?: string;
  filename: string;
  format: "print-html" | "txt" | "md" | "csv" | "svg" | "json" | "ics";
  size: string;
  peek: string;
};

type RenderResponse = {
  unlocked: boolean;
  preview: Result;
  listing: Listing[];
  documents: { id: string; title: string; filename: string; format: Listing["format"]; body: string }[] | null;
};

const TONE_BG: Record<string, string> = {
  good: "border-[var(--green-line)] bg-[var(--green-tint)]",
  bad: "border-[var(--danger-line)] bg-[var(--danger-tint)]",
  warn: "border-[var(--warn-line)] bg-[var(--warn-tint)]",
  neutral: "border-[var(--line-strong)] bg-[var(--fill-2)]",
};
const TONE_TEXT: Record<string, string> = {
  good: "text-[var(--green)]",
  bad: "text-[var(--danger)]",
  warn: "text-[var(--warn)]",
  neutral: "text-[var(--blue)]",
};
const TONE_BAR: Record<string, string> = {
  good: "#146C34",
  bad: "#B91C1C",
  warn: "#92400E",
  neutral: "#1240E8",
};

const FORMAT_LABEL: Record<Listing["format"], string> = {
  "print-html": "Print or save as PDF",
  txt: "Text file",
  md: "Markdown",
  csv: "Spreadsheet",
  svg: "Vector file",
  json: "JSON",
  ics: "Calendar file",
};

const MIME: Record<Listing["format"], string> = {
  "print-html": "text/html",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  svg: "image/svg+xml",
  json: "application/json",
  ics: "text/calendar",
};

function defaults(fields: Field[]): Values {
  const v: Values = {};
  for (const f of fields) v[f.id] = f.type === "checks" ? [...f.def] : f.def;
  return v;
}

/** Fields in author order, grouped into the steps they declared. */
function sectionsOf(fields: Field[]): { name: string; fields: Field[] }[] {
  const out: { name: string; fields: Field[] }[] = [];
  for (const f of fields) {
    const name = f.section || "Your details";
    const last = out[out.length - 1];
    if (last && last.name === name) last.fields.push(f);
    else out.push({ name, fields: [f] });
  }
  return out;
}

export default function ProToolEngine({
  slug,
  name,
  priceUsd,
  fields,
  kit,
  promise,
  initiallyUnlocked,
}: {
  slug: string;
  name: string;
  priceUsd: number;
  fields: Field[];
  kit: string[];
  promise: string;
  initiallyUnlocked: boolean;
}) {
  const [values, setValues] = useState<Values>(() => defaults(fields));
  const [brand, setBrand] = useState<BrandKit>(() => readBrandKit());
  const [data, setData] = useState<RenderResponse | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState(0);
  const [busyDoc, setBusyDoc] = useState<string | null>(null);
  const started = useRef(false);
  const requestId = useRef(0);

  const sections = useMemo(() => sectionsOf(fields), [fields]);
  const steps = useMemo(() => ["Brand it", ...sections.map((s) => s.name)], [sections]);
  const unlocked = data?.unlocked ?? initiallyUnlocked;

  useEffect(() => {
    const sync = () => setBrand(readBrandKit());
    window.addEventListener(BRAND_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(BRAND_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // One render request per settled change. The previous answer stays on screen
  // while the next is in flight, so moving a slider never blanks the panel.
  useEffect(() => {
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      setPending(true);
      fetch("/api/pro/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, values, brand }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((json: RenderResponse) => {
          if (id !== requestId.current) return;
          setData(json);
          setFailed(false);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setFailed(true);
        })
        .finally(() => {
          if (id === requestId.current) setPending(false);
        });
    }, 260);
    return () => clearTimeout(timer);
  }, [slug, values, brand]);

  const set = useCallback(
    (id: string, val: number | string | string[]) => {
      setValues((prev) => ({ ...prev, [id]: val }));
      if (!started.current) {
        started.current = true;
        trackTool("tool_started", { slug });
      }
    },
    [slug],
  );

  function openDocument(doc: { title: string; body: string }) {
    const win = window.open("", "_blank", "noopener");
    if (!win) {
      // Popup blocked. Fall back to a download so the buyer still gets it.
      downloadBlob(`${doc.title}.html`, new Blob([doc.body], { type: "text/html;charset=utf-8" }));
      return;
    }
    win.document.open();
    win.document.write(doc.body);
    win.document.close();
  }

  function takeDocument(listing: Listing) {
    const doc = data?.documents?.find((d) => d.id === listing.id);
    if (!doc) return;
    setBusyDoc(listing.id);
    try {
      if (doc.format === "print-html") openDocument(doc);
      else if (doc.format === "csv") downloadBlob(doc.filename, new Blob([`﻿${doc.body}`], { type: "text/csv;charset=utf-8" }));
      else if (doc.format === "ics") downloadBlob(doc.filename, new Blob([doc.body.replace(/\r?\n/g, "\r\n")], { type: "text/calendar;charset=utf-8" }));
      else downloadText(doc.filename, doc.body, MIME[doc.format]);
      trackTool("tool_result_downloaded", { slug, format: doc.format });
    } finally {
      setTimeout(() => setBusyDoc(null), 900);
    }
  }

  function takeEverything() {
    for (const doc of data?.documents ?? []) {
      if (doc.format === "print-html") continue;
      const blob =
        doc.format === "csv"
          ? new Blob([`﻿${doc.body}`], { type: "text/csv;charset=utf-8" })
          : new Blob([doc.format === "ics" ? doc.body.replace(/\r?\n/g, "\r\n") : doc.body], {
              type: `${MIME[doc.format]};charset=utf-8`,
            });
      downloadBlob(doc.filename, blob);
    }
    trackTool("tool_completed", { slug });
  }

  const result = data?.preview;
  const listing = data?.listing ?? [];
  const brandReady = brandIsSet(brand);
  const printable = (data?.documents ?? []).filter((d) => d.format === "print-html");

  return (
    <div className="pro-engine">
      {/* The step rail. Ryan's note: on a phone people do not know the panels
          are clickable, so the current step glows and every step is a button. */}
      <nav className="pro-steps" aria-label="Kit steps">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            className="pro-step"
            aria-current={i === step ? "step" : undefined}
            data-done={i < step ? "true" : undefined}
            onClick={() => setStep(i)}
          >
            <span className="pro-step-num">{i < step ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className="pro-step-label">{label}</span>
          </button>
        ))}
      </nav>

      <div className="pro-engine-body">
        <div className="pro-inputs">
          {step === 0 ? (
            <>
              <BrandKitPanel kit={brand} onChange={setBrand} />
              <p className="pro-hint">
                {brandReady
                  ? "Your details are on every document in this kit. Next step."
                  : "Skip it if you want. The kit still works, it just says Your business where your name would go."}
              </p>
            </>
          ) : (
            <div className="pro-section">
              <h3 className="pro-section-title">{sections[step - 1]?.name}</h3>
              <div className="pro-section-fields">
                {sections[step - 1]?.fields.map((f) => (
                  <ProField key={f.id} field={f} value={values[f.id]} onChange={(v) => set(f.id, v)} />
                ))}
              </div>
            </div>
          )}

          <div className="pro-step-nav">
            {step > 0 ? (
              <button type="button" className="button-secondary" onClick={() => setStep(step - 1)}>
                Back
              </button>
            ) : (
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setValues(defaults(fields));
                  setStep(0);
                }}
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Start over
              </button>
            )}
            {step < steps.length - 1 ? (
              <button type="button" className="button-primary pro-next" onClick={() => setStep(step + 1)}>
                {step === 0 ? "Next: your answers" : "Next step"}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : (
              <a href="#pro-box" className="button-primary pro-next">
                See what is in the box
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div className="pro-result" aria-busy={pending}>
          <div className="pro-result-head">
            <h3 className="tool-engine-label">What it says so far</h3>
            {pending ? (
              <span className="pro-working">
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                working
              </span>
            ) : null}
          </div>

          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {result?.headline ? `${result.headline.label}: ${result.headline.value}` : ""}
          </div>

          {failed && !result ? (
            <p className="pro-failed">
              The kit could not be reached just now. Check your connection and change any answer to try again.
            </p>
          ) : null}

          {result?.headline ? (
            <div className={`rounded-xl border p-5 text-center ${TONE_BG[result.headline.tone || "neutral"]}`}>
              <div
                className={`text-[34px] font-black leading-none tracking-tight sm:text-[42px] ${
                  TONE_TEXT[result.headline.tone || "neutral"]
                }`}
              >
                {result.headline.value}
              </div>
              <div className="mt-2 text-sm font-bold text-[var(--heading)]">{result.headline.label}</div>
              {result.headline.sub ? (
                <div className="mt-1 text-xs text-[var(--muted)]">{result.headline.sub}</div>
              ) : null}
            </div>
          ) : null}

          {result?.explain ? (
            <p className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4 text-[14px] leading-relaxed text-[var(--text)]">
              {result.explain}
            </p>
          ) : null}

          {result?.stats?.length ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {result.stats.map((s, i) => (
                <div key={i} className={`rounded-xl border p-3.5 ${TONE_BG[s.tone || "neutral"]}`}>
                  <div className={`text-lg font-black leading-tight ${TONE_TEXT[s.tone || "neutral"]}`}>{s.value}</div>
                  <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{s.label}</div>
                  {s.sub ? <div className="mt-0.5 text-[11px] text-[var(--quiet)]">{s.sub}</div> : null}
                </div>
              ))}
            </div>
          ) : null}

          {result?.bars?.items?.length ? (
            <figure className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4">
              {result.bars.title ? (
                <figcaption className="text-sm font-black text-[var(--heading)]">{result.bars.title}</figcaption>
              ) : null}
              {result.bars.caption ? (
                <p className="mt-0.5 text-[11px] text-[var(--quiet)]">{result.bars.caption}</p>
              ) : null}
              <div className="mt-3 space-y-2">
                {result.bars.items.map((b, i) => {
                  const max = Math.max(...result.bars!.items.map((x) => Math.abs(x.value)), 1);
                  return (
                    <div key={i}>
                      <div className="mb-1 flex items-baseline justify-between gap-3 text-[11px]">
                        <span className="font-bold text-[var(--muted)]">{b.label}</span>
                        <span className="font-black tabular-nums text-[var(--heading)]">{b.display}</span>
                      </div>
                      <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-[var(--fill-3)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(2, (Math.abs(b.value) / max) * 100)}%`,
                            background: TONE_BAR[b.tone || "neutral"],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </figure>
          ) : null}

          {result?.table?.rows?.length ? (
            <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4">
              {result.table.title ? (
                <h4 className="text-sm font-black text-[var(--heading)]">{result.table.title}</h4>
              ) : null}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--line-strong)]">
                      {result.table.headers.map((h, i) => (
                        <th key={i} scope="col" className="pb-2 pr-3 font-black uppercase tracking-wide text-[var(--muted)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.table.rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className="border-b border-[var(--line)] last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="py-2 pr-3 align-top text-[var(--text)]">
                            {String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.table.rows.length > 8 ? (
                <p className="mt-2 text-[11px] text-[var(--quiet)]">
                  Showing 8 of {result.table.rows.length} rows. The full table is in the kit.
                </p>
              ) : null}
            </div>
          ) : null}

          {result?.verdict ? (
            <div className={`rounded-xl border p-4 ${TONE_BG[result.verdict.tone]}`}>
              <p className="text-sm font-semibold leading-relaxed text-[var(--heading)]">{result.verdict.text}</p>
            </div>
          ) : null}

          {result?.note ? <p className="text-xs leading-relaxed text-[var(--quiet)]">{result.note}</p> : null}

          {result?.assumptions?.length ? (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4">
              <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">What this assumed</h4>
              <ul className="mt-2 space-y-1.5">
                {result.assumptions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
                    <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--quiet)]" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* ------------------------------- the box ------------------------------ */}
      <section id="pro-box" className={`pro-box${unlocked ? " is-unlocked" : ""}`}>
        <header className="pro-box-head">
          <div>
            <p className="pro-box-eyebrow">
              {unlocked ? (
                <>
                  <Check aria-hidden="true" className="h-4 w-4" />
                  Unlocked. These are yours.
                </>
              ) : (
                <>
                  <Lock aria-hidden="true" className="h-4 w-4" />
                  In the box, built from your answers
                </>
              )}
            </p>
            <h3>
              {listing.length || kit.length} {(listing.length || kit.length) === 1 ? "document" : "documents"}, made
              for {brandReady ? brand.brand_name : "your business"}
            </h3>
          </div>
          {unlocked && (data?.documents?.length ?? 0) > 0 ? (
            <div className="pro-box-actions">
              {printable.length ? (
                <button type="button" className="button-primary" onClick={() => openDocument(printable[0])}>
                  <Printer aria-hidden="true" className="h-4 w-4" />
                  Open {printable[0].title}
                </button>
              ) : null}
              <button type="button" className="button-secondary" onClick={takeEverything}>
                <Download aria-hidden="true" className="h-4 w-4" />
                Download the files
              </button>
            </div>
          ) : null}
        </header>

        <ul className="pro-doc-list">
          {(listing.length ? listing : kit.map((k, i) => ({ id: `k${i}`, title: k, blurb: undefined, filename: "", format: "print-html" as const, size: "", peek: "" }))).map((doc) => (
            <li key={doc.id} className={`pro-doc${unlocked ? " is-open" : ""}`}>
              <span className="pro-doc-icon" aria-hidden="true">
                {unlocked ? <FileText className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </span>
              <div className="pro-doc-copy">
                <strong>{doc.title}</strong>
                {doc.blurb ? <span className="pro-doc-blurb">{doc.blurb}</span> : null}
                {doc.size ? (
                  <span className="pro-doc-meta">
                    {FORMAT_LABEL[doc.format]} · {doc.size}
                  </span>
                ) : null}
                {!unlocked && doc.peek ? <span className="pro-doc-peek">{doc.peek}</span> : null}
              </div>
              {unlocked && doc.filename ? (
                <button type="button" className="pro-doc-take" onClick={() => takeDocument(doc as Listing)}>
                  {busyDoc === doc.id ? (
                    <Check aria-hidden="true" className="h-4 w-4" />
                  ) : doc.format === "print-html" ? (
                    <Printer aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <Download aria-hidden="true" className="h-4 w-4" />
                  )}
                  {busyDoc === doc.id ? "Opened" : doc.format === "print-html" ? "Open" : "Save"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {!unlocked ? (
          <div className="pro-buy">
            <p className="pro-buy-promise">{promise}</p>
            <p className="pro-buy-price">
              <span>${priceUsd}</span>
              <small>one time, no subscription</small>
            </p>
            <ProBuyButton slug={slug} priceUsd={priceUsd} name={name} />
            <p className="pro-buy-fine">
              Instant unlock the second the card clears. A key comes by email so you can open it on any
              device. Nothing recurring, nothing to cancel.
            </p>
            <p className="pro-buy-alt">
              Want them all?{" "}
              <Link href="/tools/pro#bundle">Every kit is $49 together</Link>. Already bought this one?{" "}
              <Link href="/tools/pro/unlock">Restore your access</Link>.
            </p>
          </div>
        ) : (
          <p className="pro-owned">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Change any answer above and every document rebuilds. Come back and regenerate them whenever the
            numbers change, at no extra cost.
          </p>
        )}
      </section>
    </div>
  );
}

/* --------------------------------- fields --------------------------------- */

function ProField({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: number | string | string[] | undefined;
  onChange: (v: number | string | string[]) => void;
}) {
  const helpId = `${field.id}-help`;
  const describedBy = field.help ? helpId : undefined;
  const help = field.help ? (
    <p id={helpId} className="mt-1 text-[11px] leading-snug text-[var(--quiet)]">
      {field.help}
    </p>
  ) : null;

  if (field.type === "slider") {
    const v = typeof value === "number" ? value : field.def;
    const pos = ((v - field.min) / Math.max(1e-9, field.max - field.min)) * 100;
    return (
      <div className="pro-field">
        <label htmlFor={field.id} className="mb-1.5 flex items-baseline justify-between gap-3">
          <span>{field.label}</span>
          <span className="shrink-0 text-sm font-black tabular-nums text-[var(--heading)]">
            {field.prefix}
            {v.toLocaleString("en-US")}
            {field.suffix}
          </span>
        </label>
        <input
          id={field.id}
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tool-range w-full"
          aria-describedby={describedBy}
          style={{ background: `linear-gradient(90deg, var(--blue) ${pos}%, var(--fill-3) ${pos}%)` }}
        />
        {help}
      </div>
    );
  }

  if (field.type === "money" || field.type === "number") {
    const v = typeof value === "number" ? value : field.def;
    return (
      <div className="pro-field">
        <label htmlFor={field.id}>
          <span>{field.label}</span>
        </label>
        <div className="flex items-center rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] focus-within:border-[var(--blue)]">
          {field.type === "money" ? (
            <span aria-hidden="true" className="pl-3.5 text-sm font-bold text-[var(--muted)]">
              $
            </span>
          ) : null}
          <input
            id={field.id}
            type="number"
            inputMode="decimal"
            min={0}
            value={Number.isFinite(v) ? v : ""}
            onChange={(e) => {
              const n = e.target.value === "" ? 0 : Number(e.target.value);
              onChange(Number.isFinite(n) ? Math.max(0, n) : 0);
            }}
            className="w-full min-h-[46px] bg-transparent px-3 py-2.5 text-sm font-bold text-[var(--heading)] outline-none"
            aria-describedby={describedBy}
          />
          {field.type === "number" && field.suffix ? (
            <span aria-hidden="true" className="pr-3.5 text-sm font-bold text-[var(--muted)]">
              {field.suffix}
            </span>
          ) : null}
        </div>
        {help}
      </div>
    );
  }

  if (field.type === "text") {
    return (
      <div className="pro-field">
        <label htmlFor={field.id}>
          <span>{field.label}</span>
        </label>
        <input
          id={field.id}
          type="text"
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="tool-input"
          aria-describedby={describedBy}
        />
        {help}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="pro-field">
        <label htmlFor={field.id}>
          <span>{field.label}</span>
        </label>
        <textarea
          id={field.id}
          rows={field.rows || 4}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--heading)] placeholder:text-[var(--quiet)] focus:border-[var(--blue)] focus:outline-none"
          aria-describedby={describedBy}
        />
        {help}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="pro-field">
        <label htmlFor={field.id}>
          <span>{field.label}</span>
        </label>
        <select
          id={field.id}
          value={typeof value === "string" ? value : field.def}
          onChange={(e) => onChange(e.target.value)}
          className="tool-select"
          aria-describedby={describedBy}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {help}
      </div>
    );
  }

  const picked = Array.isArray(value) ? value : [];
  return (
    <fieldset className="pro-field">
      <legend>
        <span>{field.label}</span>
      </legend>
      <div className="grid max-h-[340px] gap-1.5 overflow-y-auto pr-1">
        {field.options.map((o) => {
          const on = picked.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              className="tool-check"
              onClick={() => onChange(on ? picked.filter((p) => p !== o.value) : [...picked, o.value])}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${
                  on ? "border-[var(--blue)] bg-[var(--blue)] text-white" : "border-[var(--line-strong)] bg-[var(--panel)]"
                }`}
              >
                {on ? <Check className="h-3 w-3" strokeWidth={3.5} /> : null}
              </span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
      {help}
    </fieldset>
  );
}
