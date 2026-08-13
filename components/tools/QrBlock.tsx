"use client";

// The QR renderer. Encodes locally, so a code inside an embed on somebody else's
// website keeps working whatever happens to any third-party API, and nothing
// being encoded is sent anywhere.

import { useMemo, useState } from "react";
import { Download, FileCode2, AlertCircle, Check } from "lucide-react";
import {
  buildQr,
  qrToSvg,
  qrToCanvas,
  qrContrastVerdict,
  qrIsInverted,
  ERROR_CORRECTION_LEVELS,
  QR_MAX_BYTES,
  type ErrorCorrection,
  type QrModel,
} from "@/lib/tools/qr";
import { downloadSvg, downloadCanvasPng } from "./exports";
import { trackTool } from "@/lib/tools/analytics";

/**
 * qrToCanvas snaps modules to whole pixels, which lands short of the requested
 * size, and a "400 pixel" PNG that is really 388 gets rejected by print portals
 * with exact dimension checks. Draw the snapped code centered on a canvas of
 * exactly the requested size, padded in the light color, so the modules stay
 * crisp and the file is the size the note promises.
 */
function qrToExactCanvas(model: QrModel, size: number): HTMLCanvasElement {
  const inner = qrToCanvas(model, size);
  if (inner.width === size) return inner;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return inner;
  ctx.fillStyle = model.light;
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  if (inner.width > size) {
    // Requested size is below one pixel per module. Scale down rather than crop.
    ctx.drawImage(inner, 0, 0, size, size);
  } else {
    ctx.drawImage(inner, Math.floor((size - inner.width) / 2), Math.floor((size - inner.height) / 2));
  }
  return canvas;
}

const TONE_CLASS = {
  good: "border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]",
  warn: "border-[var(--warn-line)] bg-[var(--warn-tint)] text-[var(--warn)]",
  bad: "border-[var(--danger-line)] bg-[var(--danger-tint)] text-[var(--danger)]",
};

export default function QrBlock({
  data,
  caption,
  size = 1024,
  slug,
  filename = "qr-code",
}: {
  data: string;
  caption?: string;
  size?: number;
  slug: string;
  filename?: string;
}) {
  const [level, setLevel] = useState<ErrorCorrection>("M");
  const [quietZone, setQuietZone] = useState(4);
  const [dark, setDark] = useState("#0A1220");
  const [light, setLight] = useState("#FFFFFF");
  const [saved, setSaved] = useState<{ key: string; ok: boolean } | null>(null);
  const [announce, setAnnounce] = useState("");

  const tooLong = new TextEncoder().encode(data).length > QR_MAX_BYTES;

  const model = useMemo(() => {
    if (!data || tooLong) return null;
    try {
      return buildQr({ data, level, quietZone, dark, light });
    } catch {
      return null;
    }
  }, [data, level, quietZone, dark, light, tooLong]);

  const svg = useMemo(() => (model ? qrToSvg(model, size) : ""), [model, size]);
  const verdict = qrContrastVerdict(dark, light);
  const inverted = qrIsInverted(dark, light);

  function flash(key: string, ok: boolean, message: string) {
    setSaved({ key, ok });
    setAnnounce(message);
    setTimeout(() => setSaved(null), 1600);
  }

  if (tooLong) {
    return (
      <div className="rounded-xl border border-[var(--warn-line)] bg-[var(--warn-tint)] p-4">
        <p className="flex items-start gap-2 text-sm font-bold text-[var(--warn)]">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          That is too much information for one QR code. Shorten the text, or put it on a page and encode
          the page link instead.
        </p>
      </div>
    );
  }

  if (!model) {
    return (
      <p className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4 text-sm text-[var(--muted)]">
        Fill in the fields above and your QR code appears here.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-4">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-[240px] max-w-full rounded-lg border border-[var(--line)] p-2"
          style={{ background: light }}
          // The SVG is generated from our own encoder, not from user markup.
          dangerouslySetInnerHTML={{ __html: qrToSvg(model, 480) }}
        />
        <p className="text-center text-xs font-bold text-[var(--muted)]">{caption || "Scan me"}</p>
      </div>

      {verdict && (
        <p className={`mt-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-semibold leading-relaxed ${TONE_CLASS[verdict.tone]}`}>
          <AlertCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {verdict.text}
            {inverted && " This code is lighter than its background, which many scanners will not read."}
          </span>
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">Error correction</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as ErrorCorrection)}
            className="tool-select"
          >
            {ERROR_CORRECTION_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label} ({l.recovers})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">
            Quiet zone: {quietZone} modules
          </span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={quietZone}
            onChange={(e) => setQuietZone(Number(e.target.value))}
            className="tool-range w-full"
            style={{
              background: `linear-gradient(90deg, var(--blue) ${(quietZone / 10) * 100}%, var(--fill-3) ${(quietZone / 10) * 100}%)`,
            }}
          />
          <span className="mt-1 block text-[11px] leading-snug text-[var(--quiet)]">
            The blank margin around the code. Below four, scanners start failing.
          </span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">Code colour</span>
          <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-1" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-[var(--text)]">Background</span>
          <input type="color" value={light} onChange={(e) => setLight(e.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-1" />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <div aria-live="polite" className="sr-only">{announce}</div>
        <button
          type="button"
          className="button-secondary"
          style={{ minHeight: 44 }}
          onClick={async () => {
            let ok = false;
            try {
              ok = await downloadCanvasPng(`${filename}.png`, qrToExactCanvas(model, size));
            } catch {
              ok = false;
            }
            if (ok) trackTool("tool_result_downloaded", { slug, format: "png" });
            flash("png", ok, ok ? "PNG saved" : "Could not save the PNG");
          }}
        >
          {saved?.key === "png" && saved.ok ? <Check aria-hidden="true" className="h-4 w-4" /> : <Download aria-hidden="true" className="h-4 w-4" />}
          {saved?.key === "png" ? (saved.ok ? "Saved" : "Could not save") : "Download PNG"}
        </button>
        <button
          type="button"
          className="button-secondary"
          style={{ minHeight: 44 }}
          onClick={() => {
            let ok = false;
            try {
              ok = downloadSvg(`${filename}.svg`, svg);
            } catch {
              ok = false;
            }
            if (ok) trackTool("tool_result_downloaded", { slug, format: "svg" });
            flash("svg", ok, ok ? "SVG saved" : "Could not save the SVG");
          }}
        >
          {saved?.key === "svg" && saved.ok ? <Check aria-hidden="true" className="h-4 w-4" /> : <FileCode2 aria-hidden="true" className="h-4 w-4" />}
          {saved?.key === "svg" ? (saved.ok ? "Saved" : "Could not save") : "Download SVG"}
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--quiet)]">
        PNG saves at {size} x {size} pixels. SVG is vector, so a sign shop can print it at any size. Test
        the printed copy with two different phones before you order a run.
      </p>
    </div>
  );
}
