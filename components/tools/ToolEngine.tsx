"use client";

// One engine, every tool. Tools are data (fields in, a pure run() out), so the
// 250th tool looks and behaves exactly like the first one and nothing drifts.
//
// Only the slug crosses the server/client boundary. Tool objects hold functions,
// and functions cannot be serialized into a client component, so the engine
// looks its own tool up out of the registry.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy, Check, Download, Code2, RotateCcw, Printer, Mail, Table2, CalendarPlus,
} from "lucide-react";
import {
  type Tool, type Values, type Tone, type Result, type Field,
  DISCLAIMERS, DOMAINS, SENSITIVITY_NOTE, getTool,
} from "@/lib/tools";
import { SHELLS } from "./shell";
import { copyText, downloadText, downloadCsv, downloadIcs, printResult } from "./exports";
import { rememberTool } from "./useToolProfile";
import SendResultModal, { type SendReason } from "./SendResultModal";
import QrBlock from "./QrBlock";
import ReviewLinkTool from "./ReviewLinkTool";
import { trackTool } from "@/lib/tools/analytics";

const TONE_BG: Record<Tone, string> = {
  good: "border-[var(--green-line)] bg-[var(--green-tint)]",
  bad: "border-[var(--danger-line)] bg-[var(--danger-tint)]",
  warn: "border-[var(--warn-line)] bg-[var(--warn-tint)]",
  neutral: "border-[var(--line-strong)] bg-[var(--fill-2)]",
};
const TONE_TEXT: Record<Tone, string> = {
  good: "text-[var(--green)]",
  bad: "text-[var(--danger)]",
  warn: "text-[var(--warn)]",
  neutral: "text-[var(--blue)]",
};
const TONE_BAR: Record<Tone, string> = {
  good: "#146C34",
  bad: "#B91C1C",
  warn: "#92400E",
  neutral: "#1240E8",
};

function defaults(tool: Tool): Values {
  const v: Values = {};
  for (const f of tool.fields) v[f.id] = f.type === "checks" ? [...f.def] : f.def;
  return v;
}

/**
 * How a raw input reads in the plain-text report. On screen the field shows its
 * unit next to the control; a copied "20" with the percent sign stripped is a
 * different number, so the report has to carry the same units the screen does.
 */
function formatFieldValue(f: Field, raw: number | string | string[] | undefined): string {
  if (f.type === "checks") {
    const picked = Array.isArray(raw) ? raw : [];
    return picked.map((v) => f.options.find((o) => o.value === v)?.label ?? v).join(", ");
  }
  if (f.type === "select") {
    const v = typeof raw === "string" ? raw : f.def;
    return f.options.find((o) => o.value === v)?.label ?? v;
  }
  if (f.type === "money") {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return "";
    const decimals = Number.isInteger(n) ? 0 : 2;
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
  if (f.type === "slider" || f.type === "number") {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return "";
    const prefix = f.type === "slider" ? f.prefix || "" : "";
    return `${prefix}${n.toLocaleString("en-US")}${f.suffix || ""}`;
  }
  return typeof raw === "string" ? raw : "";
}

export default function ToolEngine({ slug, embedded = false }: { slug: string; embedded?: boolean }) {
  const tool = getTool(slug) as Tool;
  const [values, setValues] = useState<Values>(() => defaults(tool));
  const [preset, setPreset] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ key: string; ok: boolean } | null>(null);
  const [announce, setAnnounce] = useState("");
  const [modal, setModal] = useState<null | SendReason>(null);
  const [showEmbed, setShowEmbed] = useState(false);
  const started = useRef(false);

  const domain = DOMAINS[tool.domain];
  const disclaimer = DISCLAIMERS[tool.disclaimer];
  const shell = SHELLS[tool.toolType];
  // "This is an estimate" belongs on math. A QR maker or a draft generator with
  // the generic disclaimer shows only the data-privacy note instead. Tools that
  // carry a real disclaimer (legal, financial, ...) keep it whatever their type.
  const suppressEstimate = !shell.showEstimateBadge && tool.disclaimer === "general-estimate";

  const result: Result = useMemo(() => {
    try {
      return tool.run(values);
    } catch {
      return { note: "Something in those numbers did not compute. Try adjusting them." };
    }
  }, [tool, values]);

  useEffect(() => {
    if (!embedded) rememberTool(tool.slug);
  }, [tool.slug, embedded]);

  const set = useCallback(
    (id: string, val: number | string | string[]) => {
      setValues((prev) => ({ ...prev, [id]: val }));
      setPreset(null);
      if (!started.current) {
        started.current = true;
        trackTool("tool_started", { slug: tool.slug });
      }
    },
    [tool.slug],
  );

  function applyPreset(id: string) {
    const p = tool.presets?.find((x) => x.id === id);
    if (!p) return;
    setValues({ ...defaults(tool), ...p.values });
    setPreset(id);
    trackTool("tool_preset_applied", { slug: tool.slug, preset: id });
  }

  function reset() {
    setValues(defaults(tool));
    setPreset(null);
  }

  // The height attribute is only the fallback while the page loads. The script
  // listens for the height the embed reports and resizes the matching iframe,
  // accepting messages from our origin only. The window guard keeps it working
  // when somebody pastes two tools on one page.
  const embedSnippet = [
    `<iframe src="https://www.theleadflowpro.com/embed/${tool.slug}" data-leadflow-tool="${tool.slug}" width="100%" height="${tool.embedHeight || 820}" style="border:0;border-radius:16px;max-width:760px" title="${tool.name}, a free tool from The LeadFlow Pro" loading="lazy"></iframe>`,
    `<script>if(!window.__leadflowEmbedResize){window.__leadflowEmbedResize=true;window.addEventListener("message",function(e){if(e.origin!=="https://www.theleadflowpro.com"||!e.data||e.data.type!=="leadflowpro:embed-height")return;var f=document.querySelector('iframe[data-leadflow-tool="'+e.data.slug+'"]');var h=Number(e.data.height);if(f&&h>0)f.style.height=h+"px";});}</script>`,
  ].join("\n");

  async function copy(text: string, key: string) {
    const ok = await copyText(text);
    setCopied(ok ? key : null);
    if (ok) {
      trackTool(key === "embed" ? "embed_code_copied" : "tool_result_copied", { slug: tool.slug });
      setTimeout(() => setCopied(null), 1600);
    }
  }

  /** Runs a download and flips its button to Saved or Could not save for a beat. */
  function download(key: string, format: string, okMessage: string, fn: () => boolean) {
    let ok = false;
    try {
      ok = fn();
    } catch {
      ok = false;
    }
    setSaved({ key, ok });
    setAnnounce(ok ? okMessage : "Could not save the file");
    setTimeout(() => setSaved(null), 1600);
    if (ok) trackTool("tool_result_downloaded", { slug: tool.slug, format });
    return ok;
  }

  const activePreset = tool.presets?.find((p) => p.id === preset);

  /** The plain-text version of everything on screen. Used by copy, download and email. */
  const report = useMemo(() => {
    const lines: string[] = [];
    lines.push(tool.name.toUpperCase());
    lines.push(tool.tagline);
    if (activePreset) lines.push(`Preset: ${activePreset.label}`);
    lines.push("");
    lines.push("WHAT YOU PUT IN");
    for (const f of tool.fields) {
      const shown = formatFieldValue(f, values[f.id]);
      if (shown) lines.push(`  ${f.label}: ${shown}`);
    }
    lines.push("");
    lines.push("WHAT IT SAYS");
    if (result.headline) {
      lines.push(`  ${result.headline.label}: ${result.headline.value}${result.headline.sub ? ` (${result.headline.sub})` : ""}`);
    }
    for (const s of result.stats || []) lines.push(`  ${s.label}: ${s.value}${s.sub ? `, ${s.sub}` : ""}`);
    if (result.bars?.items?.length) {
      lines.push("");
      lines.push(`  ${result.bars.title || "Breakdown"}`);
      for (const b of result.bars.items) lines.push(`    ${b.label}: ${b.display}`);
    }
    if (result.table) {
      lines.push("");
      lines.push(`  ${result.table.title || "Details"}`);
      lines.push(`    ${result.table.headers.join(" | ")}`);
      for (const r of result.table.rows) lines.push(`    ${r.join(" | ")}`);
    }
    if (result.explain) {
      lines.push("");
      lines.push("WHAT THAT MEANS");
      lines.push(`  ${result.explain}`);
    }
    if (result.verdict) {
      lines.push("");
      lines.push("THE TAKEAWAY");
      lines.push(`  ${result.verdict.text}`);
    }
    if (result.output) {
      lines.push("");
      lines.push(result.output.title.toUpperCase());
      lines.push("");
      lines.push(result.output.text);
    }
    const assumptions = [...(tool.assumptions || []), ...(result.assumptions || [])];
    if (assumptions.length) {
      lines.push("");
      lines.push("WHAT THIS ASSUMED");
      for (const a of assumptions) lines.push(`  - ${a}`);
    }
    if (result.note) {
      lines.push("");
      lines.push(`NOTE: ${result.note}`);
    }
    lines.push("");
    if (suppressEstimate) {
      lines.push(`  ${SENSITIVITY_NOTE[tool.dataSensitivity]}`);
    } else {
      lines.push(disclaimer.label.toUpperCase());
      lines.push(`  ${disclaimer.body}`);
      if (disclaimer.dateStamp) lines.push(`  Run on ${new Date().toLocaleDateString("en-US", { dateStyle: "long" })}.`);
    }
    lines.push("");
    lines.push("Free tool from The LeadFlow Pro, theleadflowpro.com/tools");
    return lines.join("\n");
  }, [tool, values, result, activePreset, disclaimer, suppressEstimate]);

  if (!tool) return null;

  if (tool.custom === "review-link") {
    return (
      <div className="space-y-5">
        <ReviewLinkTool />
        {!embedded && (
          <EmbedBlock
            open={showEmbed}
            snippet={embedSnippet}
            onOpen={() => { setShowEmbed(true); trackTool("embed_requested", { slug: tool.slug }); }}
            onCopy={() => copy(embedSnippet, "embed")}
            onEmail={() => setModal("embed")}
            copied={copied === "embed"}
          />
        )}
        <SendResultModal
          open={modal !== null}
          onClose={() => setModal(null)}
          onSuccess={() => setShowEmbed(true)}
          toolName={tool.name}
          toolSlug={tool.slug}
          reason={modal || "email"}
          resultText={`${tool.name}: review link builder`}
        />
      </div>
    );
  }

  const hasInputs = tool.fields.length > 0;
  const hasResult = Boolean(result.headline || result.output || result.qr || result.table || result.stats?.length);
  const assumptions = [...(tool.assumptions || []), ...(result.assumptions || [])];

  return (
    <div className="tool-engine">
      <div className="tool-engine-shell">
        {embedded && (
          <div className="border-b border-[var(--line)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider"
                style={{ color: domain.ink, background: domain.tint, border: `1px solid ${domain.line}` }}
              >
                {domain.label}
              </span>
              <span className="tool-badge tool-badge-free">Free</span>
            </div>
            <h2 className="mt-2 text-xl font-black leading-tight text-[var(--heading)] sm:text-2xl">{tool.name}</h2>
            <p className="mt-0.5 text-sm font-bold" style={{ color: domain.ink }}>{tool.tagline}</p>
          </div>
        )}

        {tool.presets && tool.presets.length > 0 && (
          <div className="border-b border-[var(--line)] p-5 sm:p-6">
            <h3 className="tool-engine-label">Start from your industry</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">
              Editable starting examples for your industry. They change the starting numbers, not the
              math, and they are not industry statistics.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tool.presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="tool-preset"
                  aria-pressed={preset === p.id}
                  onClick={() => applyPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
              {preset && (
                <button type="button" className="tool-preset" onClick={reset}>
                  Clear
                </button>
              )}
            </div>
            {activePreset && (
              <p className="mt-3 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--text)]">
                <strong className="font-black text-[var(--heading)]">{activePreset.label}. </strong>
                {activePreset.blurb}
                {activePreset.example ? ` ${activePreset.example}` : ""}
              </p>
            )}
          </div>
        )}

        <div className={hasInputs ? "grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : ""}>
          {hasInputs && (
            <div className="tool-engine-inputs space-y-5 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="tool-engine-label">{shell.inputsLabel}</h3>
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold text-[var(--muted)] hover:bg-[var(--fill-2)] hover:text-[var(--heading)]"
                >
                  <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
              {tool.fields.map((f) => (
                <FieldInput key={f.id} field={f} value={values[f.id]} onChange={(val) => set(f.id, val)} />
              ))}
            </div>
          )}

          <div className="space-y-4 p-5 sm:p-6">
            <h3 className="tool-engine-label">{shell.resultLabel}</h3>

            {/* Screen readers get told the headline changed, without the whole panel being re-read. */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
              {result.headline ? `${result.headline.label}: ${result.headline.value}` : ""}
            </div>

            {result.headline && (
              <div className={`rounded-xl border p-5 text-center ${TONE_BG[result.headline.tone || "neutral"]}`}>
                <div className={`text-[34px] font-black leading-none tracking-tight sm:text-[42px] ${TONE_TEXT[result.headline.tone || "neutral"]}`}>
                  {result.headline.value}
                </div>
                <div className="mt-2 text-sm font-bold text-[var(--heading)]">{result.headline.label}</div>
                {result.headline.sub && <div className="mt-1 text-xs text-[var(--muted)]">{result.headline.sub}</div>}
              </div>
            )}

            {result.explain && (
              <p className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4 text-[14px] leading-relaxed text-[var(--text)]">
                {result.explain}
              </p>
            )}

            {result.stats && result.stats.length > 0 && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {result.stats.map((s, i) => (
                  <div key={i} className={`rounded-xl border p-3.5 ${TONE_BG[s.tone || "neutral"]}`}>
                    <div className={`text-lg font-black leading-tight ${TONE_TEXT[s.tone || "neutral"]}`}>{s.value}</div>
                    <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{s.label}</div>
                    {s.sub && <div className="mt-0.5 text-[11px] text-[var(--quiet)]">{s.sub}</div>}
                  </div>
                ))}
              </div>
            )}

            {result.bars && result.bars.items.length > 0 && <BarChart bars={result.bars} />}
            {result.ramp && <RampChart ramp={result.ramp} />}

            {result.qr && (
              <QrBlock
                data={result.qr.data}
                caption={result.qr.caption}
                size={result.qr.size ? Math.max(512, result.qr.size * 2) : 1024}
                slug={tool.slug}
                filename={tool.slug}
              />
            )}

            {result.output && (
              <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-[var(--heading)]">{result.output.title}</h4>
                  <button
                    type="button"
                    onClick={() => copy(result.output!.text, "output")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2 text-xs font-bold text-[var(--heading)] hover:border-[var(--blue)]"
                    style={{ minHeight: 44 }}
                  >
                    {copied === "output" ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-[var(--green)]" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
                    {copied === "output" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className={`mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 text-[12px] leading-relaxed text-[var(--text)] ${result.output.mono ? "font-mono" : ""}`}>
                  {result.output.text}
                </pre>
              </div>
            )}

            {result.table && result.table.rows.length > 0 && (
              <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4">
                {result.table.title && <h4 className="text-sm font-black text-[var(--heading)]">{result.table.title}</h4>}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[var(--line-strong)]">
                        {result.table.headers.map((h, i) => (
                          <th key={i} scope="col" className="pb-2 pr-3 font-black uppercase tracking-wide text-[var(--muted)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.table.rows.map((row, i) => (
                        <tr key={i} className="border-b border-[var(--line)] last:border-0">
                          {row.map((cell, j) => (
                            <td key={j} className="py-2 pr-3 align-top text-[var(--text)]"><span className="break-words">{String(cell)}</span></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.verdict && (
              <div className={`rounded-xl border p-4 ${TONE_BG[result.verdict.tone]}`}>
                <p className="text-sm font-semibold leading-relaxed text-[var(--heading)]">{result.verdict.text}</p>
              </div>
            )}

            {result.note && <p className="text-xs leading-relaxed text-[var(--quiet)]">{result.note}</p>}

            {assumptions.length > 0 && (
              <div className="rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4">
                <h4 className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">What this assumed</h4>
                <ul className="mt-2 space-y-1.5">
                  {assumptions.map((a, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--muted)]">
                      <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--quiet)]" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {hasResult && (
              <div className="tool-no-print flex flex-wrap gap-2 pt-1">
                {/* Downloads announce here so a screen reader hears the save land. */}
                <div aria-live="polite" className="sr-only">{announce}</div>

                {/* The QR block has its own PNG and SVG buttons, so a generic
                    text download next to them only invites the wrong click. */}
                {!result.qr && (
                  <button
                    type="button"
                    className="button-primary"
                    style={{ minHeight: 44 }}
                    onClick={() => {
                      const ok = download("main", "txt", "Result downloaded", () =>
                        result.output
                          ? downloadText(result.output.filename, result.output.text)
                          : downloadText(`${tool.slug}-result.txt`, report),
                      );
                      if (ok) trackTool("tool_completed", { slug: tool.slug, preset: preset || undefined });
                    }}
                  >
                    {saved?.key === "main" && saved.ok ? <Check aria-hidden="true" className="h-4 w-4" /> : <Download aria-hidden="true" className="h-4 w-4" />}
                    {saved?.key === "main" ? (saved.ok ? "Saved" : "Could not save") : shell.downloadLabel}
                  </button>
                )}

                <button type="button" className="button-secondary" style={{ minHeight: 44 }} onClick={() => copy(report, "report")}>
                  {copied === "report" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                  {copied === "report" ? "Copied" : "Copy result"}
                </button>

                {result.csv && (
                  <button
                    type="button"
                    className="button-secondary"
                    style={{ minHeight: 44 }}
                    onClick={() => {
                      download("csv", "csv", "Spreadsheet downloaded", () =>
                        downloadCsv(result.csv!.filename, result.csv!.headers, result.csv!.rows),
                      );
                    }}
                  >
                    {saved?.key === "csv" && saved.ok ? <Check aria-hidden="true" className="h-4 w-4" /> : <Table2 aria-hidden="true" className="h-4 w-4" />}
                    {saved?.key === "csv" ? (saved.ok ? "Saved" : "Could not save") : "Download CSV"}
                  </button>
                )}

                {result.ics && (
                  <button
                    type="button"
                    className="button-secondary"
                    style={{ minHeight: 44 }}
                    onClick={() => {
                      download("ics", "ics", "Calendar file downloaded", () =>
                        downloadIcs(result.ics!.filename, result.ics!.text),
                      );
                    }}
                  >
                    {saved?.key === "ics" && saved.ok ? <Check aria-hidden="true" className="h-4 w-4" /> : <CalendarPlus aria-hidden="true" className="h-4 w-4" />}
                    {saved?.key === "ics" ? (saved.ok ? "Saved" : "Could not save") : "Add to calendar"}
                  </button>
                )}

                <button
                  type="button"
                  className="button-secondary"
                  style={{ minHeight: 44 }}
                  onClick={() => { printResult(); trackTool("tool_result_printed", { slug: tool.slug }); }}
                >
                  <Printer aria-hidden="true" className="h-4 w-4" />
                  Print or save as PDF
                </button>

                <button type="button" className="button-secondary" style={{ minHeight: 44 }} onClick={() => setModal("email")}>
                  <Mail aria-hidden="true" className="h-4 w-4" />
                  Email it to me
                </button>
              </div>
            )}

            <p className="text-[11px] leading-relaxed text-[var(--quiet)]">
              {SENSITIVITY_NOTE[tool.dataSensitivity]}
            </p>
          </div>
        </div>
      </div>

      {!suppressEstimate && (
        <div className="tool-disclaimer mt-4">
          <h3>{disclaimer.label}</h3>
          <p>{disclaimer.body}</p>
          {disclaimer.official && disclaimer.official.length > 0 && (
            <p>
              Official source:{" "}
              {disclaimer.official.map((o, i) => (
                <span key={o.url}>
                  {i > 0 ? ", " : ""}
                  <a href={o.url} target="_blank" rel="noopener noreferrer">{o.label}</a>
                </span>
              ))}
            </p>
          )}
          {disclaimer.dateStamp && (
            <p className="text-[12px]">
              You ran this on {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}. Rates and rules
              change, so check the date before you rely on a saved copy.
            </p>
          )}
        </div>
      )}

      {!embedded && (
        <EmbedBlock
          open={showEmbed}
          snippet={embedSnippet}
          onOpen={() => { setShowEmbed(true); trackTool("embed_requested", { slug: tool.slug }); }}
          onCopy={() => copy(embedSnippet, "embed")}
          onEmail={() => setModal("embed")}
          copied={copied === "embed"}
        />
      )}

      <SendResultModal
        open={modal !== null}
        onClose={() => setModal(null)}
        onSuccess={() => { if (modal === "embed") setShowEmbed(true); }}
        toolName={tool.name}
        toolSlug={tool.slug}
        reason={modal || "email"}
        resultText={report}
      />
    </div>
  );
}

/* -------------------------------- field input ------------------------------ */

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: Tool["fields"][number];
  value: number | string | string[] | undefined;
  onChange: (v: number | string | string[]) => void;
}) {
  const helpId = `${field.id}-help`;
  const describedBy = field.help ? helpId : undefined;

  if (field.type === "slider") {
    const v = typeof value === "number" ? value : field.def;
    const pctPos = ((v - field.min) / Math.max(1e-9, field.max - field.min)) * 100;
    return (
      <div>
        <label htmlFor={field.id} className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-semibold text-[var(--text)]">{field.label}</span>
          <span className="shrink-0 text-sm font-black tabular-nums text-[var(--heading)]">
            {field.prefix}{v.toLocaleString("en-US")}{field.suffix}
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
          style={{ background: `linear-gradient(90deg, var(--blue) ${pctPos}%, var(--fill-3) ${pctPos}%)` }}
        />
        {field.help && <p id={helpId} className="mt-1 text-[11px] leading-snug text-[var(--quiet)]">{field.help}</p>}
      </div>
    );
  }

  if (field.type === "money" || field.type === "number") {
    const v = typeof value === "number" ? value : field.def;
    return (
      <div>
        <label htmlFor={field.id} className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">{field.label}</label>
        <div className="flex items-center rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] focus-within:border-[var(--blue)] focus-within:shadow-[0_0_0_3px_#1240e826]">
          {field.type === "money" && <span aria-hidden="true" className="pl-3.5 text-sm font-bold text-[var(--muted)]">$</span>}
          <input
            id={field.id}
            type="number"
            inputMode="decimal"
            // Negative money and negative counts are almost always a typo, and a
            // negative here turns a loss into a fake profit further down.
            min={0}
            value={Number.isFinite(v) ? v : ""}
            onChange={(e) => {
              const n = e.target.value === "" ? 0 : Number(e.target.value);
              onChange(Number.isFinite(n) ? Math.max(0, n) : 0);
            }}
            className="w-full min-h-[46px] bg-transparent px-3 py-2.5 text-sm font-bold text-[var(--heading)] outline-none"
            aria-describedby={describedBy}
          />
          {field.type === "number" && field.suffix && (
            <span aria-hidden="true" className="pr-3.5 text-sm font-bold text-[var(--muted)]">{field.suffix}</span>
          )}
        </div>
        {field.help && <p id={helpId} className="mt-1 text-[11px] leading-snug text-[var(--quiet)]">{field.help}</p>}
      </div>
    );
  }

  if (field.type === "text") {
    return (
      <div>
        <label htmlFor={field.id} className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">{field.label}</label>
        <input
          id={field.id}
          type="text"
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="tool-input"
          aria-describedby={describedBy}
        />
        {field.help && <p id={helpId} className="mt-1 text-[11px] leading-snug text-[var(--quiet)]">{field.help}</p>}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <label htmlFor={field.id} className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">{field.label}</label>
        <textarea
          id={field.id}
          rows={field.rows || 4}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--heading)] placeholder:text-[var(--quiet)] focus:border-[var(--blue)] focus:outline-none focus:shadow-[0_0_0_3px_#1240e826]"
          aria-describedby={describedBy}
        />
        {field.help && <p id={helpId} className="mt-1 text-[11px] leading-snug text-[var(--quiet)]">{field.help}</p>}
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label htmlFor={field.id} className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">{field.label}</label>
        <select
          id={field.id}
          value={typeof value === "string" ? value : field.def}
          onChange={(e) => onChange(e.target.value)}
          className="tool-select"
          aria-describedby={describedBy}
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {field.help && <p id={helpId} className="mt-1 text-[11px] leading-snug text-[var(--quiet)]">{field.help}</p>}
      </div>
    );
  }

  const picked = Array.isArray(value) ? value : [];
  return (
    <fieldset>
      <legend className="mb-2 block text-[13px] font-semibold text-[var(--text)]">{field.label}</legend>
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
                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border ${on ? "border-[var(--blue)] bg-[var(--blue)] text-white" : "border-[var(--line-strong)] bg-[var(--panel)]"}`}
              >
                {on && <Check className="h-3 w-3" strokeWidth={3.5} />}
              </span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
      {field.help && <p className="mt-1.5 text-[11px] leading-snug text-[var(--quiet)]">{field.help}</p>}
    </fieldset>
  );
}

/* ---------------------------------- charts --------------------------------- */

function BarChart({ bars }: { bars: NonNullable<Result["bars"]> }) {
  const max = Math.max(...bars.items.map((b) => Math.abs(b.value)), 1);
  return (
    <figure className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4">
      {bars.title && <figcaption className="text-sm font-black text-[var(--heading)]">{bars.title}</figcaption>}
      {bars.caption && <p className="mt-0.5 text-[11px] text-[var(--quiet)]">{bars.caption}</p>}
      {/* The bars are decoration. The numbers next to them are the content, so
          this reads correctly with images off or in a screen reader. */}
      <div className="mt-3 space-y-2">
        {bars.items.map((b, i) => (
          <div key={i}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[11px]">
              <span className="font-bold text-[var(--muted)]">{b.label}</span>
              <span className="font-black tabular-nums text-[var(--heading)]">{b.display}</span>
            </div>
            <div aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-[var(--fill-3)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (Math.abs(b.value) / max) * 100)}%`, background: TONE_BAR[b.tone || "neutral"] }}
              />
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}

function RampChart({ ramp }: { ramp: NonNullable<Result["ramp"]> }) {
  const max = Math.max(...ramp.points.map((p) => Math.abs(p.value)), 1);
  const color = TONE_BAR[ramp.tone || "bad"];
  const first = ramp.points[0];
  const last = ramp.points[ramp.points.length - 1];
  return (
    <figure className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4">
      <figcaption className="text-sm font-black text-[var(--heading)]">{ramp.title}</figcaption>
      {ramp.caption && <p className="mt-0.5 text-[11px] text-[var(--quiet)]">{ramp.caption}</p>}
      <div aria-hidden="true" className="mt-3 flex h-28 items-end gap-1">
        {ramp.points.map((p, i) => (
          <div
            key={i}
            className="flex-1 rounded-t"
            style={{
              height: `${Math.max(3, (Math.abs(p.value) / max) * 100)}%`,
              background: color,
              opacity: 0.45 + (i / Math.max(1, ramp.points.length)) * 0.55,
            }}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] font-bold text-[var(--muted)]">
        {first?.label}: {first?.display}. By {last?.label}: {last?.display}.
      </p>
    </figure>
  );
}

/* -------------------------------- embed block ------------------------------ */

function EmbedBlock({
  open,
  snippet,
  onOpen,
  onCopy,
  onEmail,
  copied,
}: {
  open: boolean;
  snippet: string;
  onOpen: () => void;
  onCopy: () => void;
  onEmail: () => void;
  copied: boolean;
}) {
  if (!open) {
    return (
      <button type="button" onClick={onOpen} className="button-secondary tool-no-print mt-4" style={{ minHeight: 44 }}>
        <Code2 aria-hidden="true" className="h-4 w-4" />
        Put this tool on my website
      </button>
    );
  }
  return (
    <div className="tool-no-print mt-4 rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-tint)] p-5">
      <h3 className="text-sm font-black text-[var(--heading)]">Paste this into your website.</h3>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
        I host it and keep it working. It costs nothing and it does not expire. The second line lets the
        frame size itself to the tool. Works on WordPress, Wix, Squarespace, Shopify, GoDaddy, Webflow,
        HubSpot, or a plain HTML page.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-3 font-mono text-[11px] leading-relaxed text-[var(--text)]">
          {snippet}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-2.5 text-sm font-bold text-[var(--heading)] hover:border-[var(--blue)]"
          style={{ minHeight: 44 }}
        >
          {copied ? <Check aria-hidden="true" className="h-4 w-4 text-[var(--green)]" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={onEmail} className="text-xs font-bold text-[var(--blue)] underline">
          Email me this code and the instructions
        </button>
        <span className="text-xs text-[var(--muted)]">Stuck? Text (903) 500-8898.</span>
      </div>
    </div>
  );
}
