"use client";

// One engine, every tool. Tools are data (fields in, a pure run() out), so the
// 70th tool looks and behaves exactly like the first one and nothing drifts.

import { useMemo, useState } from "react";
import { Copy, Check, Download, Code2, RotateCcw, Lock } from "lucide-react";
import {
  type Tool,
  type Values,
  type Tone,
  type Result,
  CATEGORY_META,
  TOOL_COUNT,
  toolArt,
  getTool,
} from "@/lib/tools";
import { useUnlock, downloadFile } from "./useUnlock";
import UnlockModal from "./UnlockModal";
import ReviewLinkTool from "./ReviewLinkTool";

const TONE_BG: Record<Tone, string> = {
  good: "border-emerald-400/35 bg-emerald-400/10",
  bad: "border-red-400/35 bg-red-500/10",
  warn: "border-amber-400/35 bg-amber-400/10",
  neutral: "border-white/12 bg-white/[0.05]",
};
const TONE_TEXT: Record<Tone, string> = {
  good: "text-emerald-300",
  bad: "text-red-300",
  warn: "text-amber-300",
  neutral: "text-sky-200",
};
const TONE_BAR: Record<Tone, string> = {
  good: "#2ed6a3",
  bad: "#e15252",
  warn: "#f0b23a",
  neutral: "#3ba7f0",
};

function defaults(tool: Tool): Values {
  const v: Values = {};
  for (const f of tool.fields) v[f.id] = f.type === "checks" ? [...f.def] : f.def;
  return v;
}

// Only the slug crosses the server/client boundary. The tool objects hold
// functions, and functions cannot be serialized into a client component, so the
// engine looks its own tool up out of the catalog.
export default function ToolEngine({
  slug,
  embedded = false,
}: {
  slug: string;
  embedded?: boolean;
}) {
  const tool = getTool(slug) as Tool;
  const [values, setValues] = useState<Values>(() => defaults(tool));
  const [copied, setCopied] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "download" | "embed">(null);
  const [showEmbed, setShowEmbed] = useState(false);
  const { unlocked } = useUnlock();
  const art = toolArt(tool);
  const meta = CATEGORY_META[tool.category];

  const result: Result = useMemo(() => {
    try {
      if (!tool) return {};
      return tool.run(values);
    } catch {
      return { note: "Something in those numbers did not compute. Try adjusting them." };
    }
  }, [tool, values]);

  const set = (id: string, val: number | string | string[]) =>
    setValues((prev) => ({ ...prev, [id]: val }));

  const embedSnippet = `<iframe src="https://www.theleadflowpro.com/embed/${tool.slug}" width="100%" height="${tool.embedHeight || 820}" style="border:0;border-radius:16px;max-width:760px" title="${tool.name} — free tool from The LeadFlow Pro" loading="lazy"></iframe>`;

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked, they can still select it */
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  }

  function buildReport() {
    const lines: string[] = [];
    lines.push(tool.name.toUpperCase());
    lines.push(tool.tagline);
    lines.push("");
    lines.push("WHAT YOU PUT IN");
    for (const f of tool.fields) {
      const raw = values[f.id];
      const shown = Array.isArray(raw) ? raw.join(", ") : String(raw);
      if (shown) lines.push(`  ${f.label}: ${shown}`);
    }
    lines.push("");
    lines.push("WHAT IT SAYS");
    if (result.headline) lines.push(`  ${result.headline.label}: ${result.headline.value}${result.headline.sub ? ` (${result.headline.sub})` : ""}`);
    for (const s of result.stats || []) lines.push(`  ${s.label}: ${s.value}${s.sub ? ` — ${s.sub}` : ""}`);
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
    if (result.note) {
      lines.push("");
      lines.push(`NOTE: ${result.note}`);
    }
    lines.push("");
    lines.push("—");
    lines.push("Free tool from The LeadFlow Pro · theleadflowpro.com/tools");
    lines.push("Own your platform. Fire your monthly fees. Text (903) 500-8898");
    return lines.join("\n");
  }

  function handleDownload() {
    if (!unlocked) {
      setModal("download");
      return;
    }
    if (result.output) {
      downloadFile(result.output.filename, result.output.text);
    } else {
      downloadFile(`${tool.slug}-results.txt`, buildReport());
    }
  }

  function handleEmbed() {
    if (!unlocked) {
      setModal("embed");
      return;
    }
    setShowEmbed(true);
  }

  if (!tool) return null;

  if (tool.custom === "review-link") {
    return (
      <div className="space-y-5">
        <ReviewLinkTool />
        {!embedded && (
          <EmbedRow
            unlocked={unlocked}
            showEmbed={showEmbed}
            snippet={embedSnippet}
            onEmbed={handleEmbed}
            onCopy={() => copy(embedSnippet, "embed")}
            copied={copied === "embed"}
          />
        )}
        <UnlockModal
          open={modal !== null}
          onClose={() => {
            const was = modal;
            setModal(null);
            if (was === "embed") setShowEmbed(true);
          }}
          toolName={tool.name}
          toolSlug={tool.slug}
          reason={modal || "download"}
          toolCount={TOOL_COUNT}
        />
      </div>
    );
  }

  const hasInputs = tool.fields.length > 0;
  // Calculators ask for numbers. Generators ask for details. Say the right thing.
  const numeric = tool.fields.some((f) => f.type === "slider" || f.type === "money" || f.type === "number");
  const inputLabel = numeric ? "Your numbers" : "Your details";
  const outputLabel = result.headline || result.bars || result.ramp ? "What that means" : "What you get";
  const hasResult = Boolean(
    result.headline || result.output || result.qr || result.table || result.stats?.length,
  );

  return (
    <div className="tool-engine">
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: art.background, border: art.border }}
      >
        {/* header: the detail page already says all this above the fold, so it
            only shows inside an iframe where there is no page around it */}
        {embedded && (
        <div className="flex items-start gap-4 border-b border-white/10 p-5 sm:p-6">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
            style={{ background: `${meta.from}22`, border: `1px solid ${meta.ring}` }}
            aria-hidden="true"
          >
            {tool.emoji}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider"
                style={{ color: meta.text, background: `${meta.from}1f`, border: `1px solid ${meta.ring}` }}
              >
                {tool.category}
              </span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                Free
              </span>
            </div>
            <h2 className="mt-1.5 text-xl font-black leading-tight text-white sm:text-2xl">
              {tool.name}
            </h2>
            <p className="mt-0.5 text-sm font-bold" style={{ color: meta.text }}>
              {tool.tagline}
            </p>
          </div>
        </div>
        )}

        <div className={hasInputs ? "grid gap-0 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]" : ""}>
          {/* inputs */}
          {hasInputs && (
            <div className="space-y-5 border-b border-white/10 p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {inputLabel}
                </h3>
                <button
                  type="button"
                  onClick={() => setValues(defaults(tool))}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-white"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
              {tool.fields.map((f) => (
                <FieldInput key={f.id} field={f} value={values[f.id]} onChange={(val) => set(f.id, val)} accent={meta.from} />
              ))}
            </div>
          )}

          {/* results */}
          <div className="space-y-4 p-5 sm:p-6">
            <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              {outputLabel}
            </h3>

            {result.headline && (
              <div className={`rounded-xl border p-5 text-center ${TONE_BG[result.headline.tone || "neutral"]}`}>
                <div className={`text-[34px] font-black leading-none tracking-tight sm:text-[42px] ${TONE_TEXT[result.headline.tone || "neutral"]}`}>
                  {result.headline.value}
                </div>
                <div className="mt-2 text-sm font-bold text-white">{result.headline.label}</div>
                {result.headline.sub && (
                  <div className="mt-1 text-xs text-slate-400">{result.headline.sub}</div>
                )}
              </div>
            )}

            {result.stats && result.stats.length > 0 && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {result.stats.map((s, i) => (
                  <div key={i} className={`rounded-xl border p-3.5 ${TONE_BG[s.tone || "neutral"]}`}>
                    <div className={`text-lg font-black leading-tight ${TONE_TEXT[s.tone || "neutral"]}`}>
                      {s.value}
                    </div>
                    <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {s.label}
                    </div>
                    {s.sub && <div className="mt-0.5 text-[11px] text-slate-500">{s.sub}</div>}
                  </div>
                ))}
              </div>
            )}

            {result.bars && result.bars.items.length > 0 && <BarChart bars={result.bars} />}
            {result.ramp && <RampChart ramp={result.ramp} />}

            {result.qr && (
              <QrBlock data={result.qr.data} caption={result.qr.caption} size={result.qr.size} />
            )}

            {result.output && (
              <div className="rounded-xl border border-white/12 bg-black/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-white">{result.output.title}</h4>
                  <button
                    type="button"
                    onClick={() => copy(result.output!.text, "output")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1.5 text-xs font-bold text-white hover:border-sky-400/50"
                  >
                    {copied === "output" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "output" ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className={`mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-3 text-[12px] leading-relaxed text-slate-200 ${result.output.mono ? "font-mono text-sky-200" : ""}`}>
                  {result.output.text}
                </pre>
              </div>
            )}

            {result.table && result.table.rows.length > 0 && (
              <div className="rounded-xl border border-white/12 bg-white/[0.03] p-4">
                {result.table.title && (
                  <h4 className="text-sm font-black text-white">{result.table.title}</h4>
                )}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        {result.table.headers.map((h, i) => (
                          <th key={i} className="pb-2 pr-3 font-black uppercase tracking-wide text-slate-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.table.rows.map((row, i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0">
                          {row.map((cell, j) => (
                            <td key={j} className="py-2 pr-3 align-top text-slate-300">
                              <span className="break-words">{String(cell)}</span>
                            </td>
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
                <p className="text-sm font-semibold leading-relaxed text-white">
                  {result.verdict.text}
                </p>
              </div>
            )}

            {result.note && (
              <p className="text-xs leading-relaxed text-slate-500">{result.note}</p>
            )}

            <div className={`flex-wrap gap-2 pt-1 ${hasResult ? "flex" : "hidden"}`}>
              <button type="button" onClick={handleDownload} className="button-primary" style={{ minHeight: 44 }}>
                {unlocked ? <Download aria-hidden="true" className="h-4 w-4" /> : <Lock aria-hidden="true" className="h-4 w-4" />}
                {result.output ? "Download the file" : "Download my results"}
              </button>
              {!embedded && (
                <button type="button" onClick={handleEmbed} className="button-secondary" style={{ minHeight: 44 }}>
                  <Code2 aria-hidden="true" className="h-4 w-4" />
                  Put this on my site
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!embedded && showEmbed && (
        <EmbedRow
          unlocked={unlocked}
          showEmbed={showEmbed}
          snippet={embedSnippet}
          onEmbed={handleEmbed}
          onCopy={() => copy(embedSnippet, "embed")}
          copied={copied === "embed"}
        />
      )}

      <UnlockModal
        open={modal !== null}
        onClose={() => {
          const was = modal;
          setModal(null);
          if (was === "embed") setShowEmbed(true);
        }}
        toolName={tool.name}
        toolSlug={tool.slug}
        reason={modal || "download"}
        toolCount={TOOL_COUNT}
      />
    </div>
  );
}

/* -------------------------------- field input ------------------------------- */

function FieldInput({
  field,
  value,
  onChange,
  accent,
}: {
  field: Tool["fields"][number];
  value: number | string | string[] | undefined;
  onChange: (v: number | string | string[]) => void;
  accent: string;
}) {
  if (field.type === "slider") {
    const v = typeof value === "number" ? value : field.def;
    const pctPos = ((v - field.min) / Math.max(1e-9, field.max - field.min)) * 100;
    return (
      <label className="block">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-semibold text-slate-300">{field.label}</span>
          <span className="shrink-0 text-sm font-black text-white">
            {field.prefix}
            {v.toLocaleString("en-US")}
            {field.suffix}
          </span>
        </div>
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
          className="tool-range w-full"
          style={{
            background: `linear-gradient(90deg, ${accent} ${pctPos}%, rgba(255,255,255,0.12) ${pctPos}%)`,
          }}
          aria-label={field.label}
        />
        {field.help && <p className="mt-1 text-[11px] leading-snug text-slate-500">{field.help}</p>}
      </label>
    );
  }

  if (field.type === "money" || field.type === "number") {
    const v = typeof value === "number" ? value : field.def;
    return (
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-slate-300">{field.label}</span>
        <div className="flex items-center rounded-xl border border-white/15 bg-black/25 focus-within:border-sky-400/60">
          {field.type === "money" && <span className="pl-3.5 text-sm font-bold text-slate-400">$</span>}
          <input
            type="number"
            inputMode="decimal"
            value={Number.isFinite(v) ? v : ""}
            onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
            className="w-full bg-transparent px-3 py-2.5 text-sm font-bold text-white outline-none"
            aria-label={field.label}
          />
          {field.type === "number" && field.suffix && (
            <span className="pr-3.5 text-sm font-bold text-slate-400">{field.suffix}</span>
          )}
        </div>
        {field.help && <p className="mt-1 text-[11px] leading-snug text-slate-500">{field.help}</p>}
      </label>
    );
  }

  if (field.type === "text") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-slate-300">{field.label}</span>
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-black/25 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-400/60 focus:outline-none"
        />
        {field.help && <p className="mt-1 text-[11px] leading-snug text-slate-500">{field.help}</p>}
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-slate-300">{field.label}</span>
        <textarea
          rows={field.rows || 4}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-black/25 px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-slate-600 focus:border-sky-400/60 focus:outline-none"
        />
        {field.help && <p className="mt-1 text-[11px] leading-snug text-slate-500">{field.help}</p>}
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-slate-300">{field.label}</span>
        <select
          value={typeof value === "string" ? value : field.def}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-[#132238] px-3.5 py-2.5 text-sm font-semibold text-white focus:border-sky-400/60 focus:outline-none"
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {field.help && <p className="mt-1 text-[11px] leading-snug text-slate-500">{field.help}</p>}
      </label>
    );
  }

  // checks
  const picked = Array.isArray(value) ? value : [];
  return (
    <div>
      <span className="mb-2 block text-[13px] font-semibold text-slate-300">{field.label}</span>
      <div className="grid max-h-[340px] gap-1.5 overflow-y-auto pr-1">
        {field.options.map((o) => {
          const on = picked.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() =>
                onChange(on ? picked.filter((p) => p !== o.value) : [...picked, o.value])
              }
              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-[13px] leading-snug transition ${
                on
                  ? "border-sky-400/50 bg-sky-400/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25"
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                  on ? "border-sky-400 bg-sky-400 text-[#0e1a2e]" : "border-white/25"
                }`}
              >
                {on && <Check className="h-3 w-3" strokeWidth={3.5} />}
              </span>
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
      {field.help && <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{field.help}</p>}
    </div>
  );
}

/* ---------------------------------- charts --------------------------------- */

function BarChart({ bars }: { bars: NonNullable<Result["bars"]> }) {
  const max = Math.max(...bars.items.map((b) => Math.abs(b.value)), 1);
  return (
    <figure className="rounded-xl border border-white/12 bg-black/20 p-4">
      {bars.title && <figcaption className="text-sm font-black text-white">{bars.title}</figcaption>}
      {bars.caption && <p className="mt-0.5 text-[11px] text-slate-500">{bars.caption}</p>}
      <div className="mt-3 space-y-2">
        {bars.items.map((b, i) => (
          <div key={i}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-[11px]">
              <span className="font-bold text-slate-400">{b.label}</span>
              <span className="font-black text-white">{b.display}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(2, (Math.abs(b.value) / max) * 100)}%`,
                  background: TONE_BAR[b.tone || "neutral"],
                }}
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
  return (
    <figure className="rounded-xl border border-white/12 bg-black/20 p-4">
      <figcaption className="text-sm font-black text-white">{ramp.title}</figcaption>
      {ramp.caption && <p className="mt-0.5 text-[11px] text-slate-500">{ramp.caption}</p>}
      <div className="mt-3 flex h-28 items-end gap-1">
        {ramp.points.map((p, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all duration-300"
            style={{
              height: `${Math.max(3, (Math.abs(p.value) / max) * 100)}%`,
              background: color,
              opacity: 0.5 + (i / Math.max(1, ramp.points.length)) * 0.5,
            }}
            title={`${p.label}: ${p.display}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span>
          {ramp.points[0]?.label}: {ramp.points[0]?.display}
        </span>
        <span>
          {ramp.points[ramp.points.length - 1]?.label}: {ramp.points[ramp.points.length - 1]?.display}
        </span>
      </div>
    </figure>
  );
}

function QrBlock({ data, caption, size = 400 }: { data: string; caption?: string; size?: number }) {
  const px = Math.min(1000, Math.max(200, Math.round(size) || 400));
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${px}x${px}&margin=10&format=png&data=${encodeURIComponent(data)}`;
  const [failed, setFailed] = useState(false);

  // The QR renderer is an outside service. If it ever goes down, say so plainly
  // and still hand them the thing the code was going to encode.
  if (failed) {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
        <p className="text-sm font-bold text-amber-200">
          The QR image did not load. That is our code generator, not your
          browser. Try again in a minute.
        </p>
        <p className="mt-2 break-all font-mono text-[11px] text-slate-300">{data}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-white/12 bg-white p-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={caption || "QR code"}
        width={260}
        height={260}
        onError={() => setFailed(true)}
        className="h-auto w-[260px] max-w-full"
      />
      <span className="text-center text-xs font-bold text-slate-600">
        {caption || "Scan me"}
      </span>
      <span className="text-center text-[11px] text-slate-500">
        Right-click or long-press to save. Saves at {px} x {px} pixels.
      </span>
    </div>
  );
}

/* -------------------------------- embed block ------------------------------- */

function EmbedRow({
  unlocked,
  showEmbed,
  snippet,
  onEmbed,
  onCopy,
  copied,
}: {
  unlocked: boolean;
  showEmbed: boolean;
  snippet: string;
  onEmbed: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  if (!unlocked || !showEmbed) {
    return (
      <button type="button" onClick={onEmbed} className="button-secondary mt-4">
        <Code2 aria-hidden="true" className="h-4 w-4" />
        Put this on my site
      </button>
    );
  }
  return (
    <div className="mt-4 rounded-2xl border border-sky-400/30 bg-sky-500/[0.07] p-5">
      <h4 className="text-sm font-black text-white">
        Paste this one line anywhere in your website&apos;s HTML.
      </h4>
      <p className="mt-1 text-xs text-slate-400">
        We host it, we maintain it, it costs you nothing, and it never expires.
        Works on WordPress, Wix, Squarespace, Shopify, GoDaddy, anywhere that
        takes an embed.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg border border-white/10 bg-black/40 px-3 py-3 font-mono text-[11px] leading-relaxed text-sky-200">
          {snippet}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2.5 text-sm font-bold text-white hover:border-sky-400/50"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Need a hand getting it in? Text me: (903) 500-8898.
      </p>
    </div>
  );
}
