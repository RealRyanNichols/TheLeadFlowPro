"use client";

// Dependency-free SVG charts for the analytics dashboards. Marks follow the
// dataviz spec: thin 2px lines, recessive grids, direct labels over legends
// where possible, a hover crosshair with a tooltip, and an sr-only summary so
// every chart reads aloud. Colors arrive as props (both dashboards validated
// their palettes against their surfaces); text always wears text tokens.

import { useId, useMemo, useRef, useState } from "react";
import { compactNumber } from "@/lib/analytics/shared";

type Point = { x: string; ys: number[] };

export function AreaChart({
  points,
  seriesNames,
  colors,
  height = 220,
  ink = false,
  formatX,
  summary,
}: {
  points: Point[];
  seriesNames: string[];
  colors: string[];
  height?: number;
  ink?: boolean;
  formatX?: (x: string) => string;
  summary?: string;
}) {
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const width = 720;
  const pad = { top: 14, right: 12, bottom: 24, left: 40 };

  const { max, coords } = useMemo(() => {
    const allValues = points.flatMap((p) => p.ys);
    const maxVal = Math.max(1, ...allValues);
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
    const coords = points.map((p, i) => ({
      x: pad.left + (points.length > 1 ? i * stepX : innerW / 2),
      ys: p.ys.map((v) => pad.top + innerH - (v / maxVal) * innerH),
    }));
    return { max: maxVal, coords };
  }, [points, height, pad.left, pad.right, pad.top, pad.bottom]);

  if (points.length === 0) {
    return <EmptyChart ink={ink} label="Collecting data" height={height} />;
  }

  const innerH = height - pad.top - pad.bottom;
  const gridColor = ink ? "rgba(244,246,250,0.08)" : "rgba(10,18,32,0.08)";
  const textColor = ink ? "var(--cb-muted-ink, #a8b4c8)" : "var(--muted, #4e5866)";
  const gridLines = [0, 0.5, 1];

  const linePath = (si: number) =>
    coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.ys[si].toFixed(1)}`).join("");
  const areaPath = (si: number) =>
    `${linePath(si)}L${coords[coords.length - 1].x.toFixed(1)},${pad.top + innerH}L${coords[0].x.toFixed(1)},${pad.top + innerH}Z`;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestDist = Infinity;
    coords.forEach((c, i) => {
      const d = Math.abs(c.x - px);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  }

  const defaultFormatX = (x: string) => x.slice(5, 10);
  const fx = formatX ?? defaultFormatX;
  const h = hover != null ? points[hover] : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <span className="sr-only">
        {summary ??
          `Chart of ${seriesNames.join(" and ")} across ${points.length} intervals. Peak ${compactNumber(max)}.`}
      </span>
      {seriesNames.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-4" aria-hidden="true">
          {seriesNames.map((name, i) => (
            <span key={name} className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: textColor }}>
              <span className="h-2 w-2 rounded-full" style={{ background: colors[i] }} />
              {name}
            </span>
          ))}
        </div>
      )}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full"
        role="img"
        aria-labelledby={`${id}-title`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <title id={`${id}-title`}>
          {summary ?? `${seriesNames.join(", ")} over time`}
        </title>
        {gridLines.map((g) => {
          const y = pad.top + innerH - g * innerH;
          return (
            <g key={g}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={gridColor} strokeWidth="1" />
              <text x={pad.left - 6} y={y + 3.5} textAnchor="end" fontSize="10" fill={textColor}>
                {compactNumber(max * g)}
              </text>
            </g>
          );
        })}
        {points.length > 1 &&
          [0, Math.floor((points.length - 1) / 2), points.length - 1].map((i) => (
            <text
              key={i}
              x={coords[i].x}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              fontSize="10"
              fill={textColor}
            >
              {fx(points[i].x)}
            </text>
          ))}
        {seriesNames.map((_, si) => (
          <g key={si}>
            <path d={areaPath(si)} fill={colors[si]} opacity={ink ? 0.14 : 0.09} />
            <path d={linePath(si)} fill="none" stroke={colors[si]} strokeWidth="2" strokeLinejoin="round" />
          </g>
        ))}
        {hover != null && (
          <g>
            <line
              x1={coords[hover].x}
              x2={coords[hover].x}
              y1={pad.top}
              y2={pad.top + innerH}
              stroke={ink ? "rgba(244,246,250,0.35)" : "rgba(10,18,32,0.3)"}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {seriesNames.map((_, si) => (
              <circle
                key={si}
                cx={coords[hover].x}
                cy={coords[hover].ys[si]}
                r="4"
                fill={colors[si]}
                stroke={ink ? "#0a1220" : "#ffffff"}
                strokeWidth="2"
              />
            ))}
          </g>
        )}
      </svg>
      {h != null && hover != null && (
        <div
          className={`pointer-events-none absolute z-10 rounded-lg border px-3 py-2 text-xs shadow-lg ${
            ink
              ? "border-white/15 bg-[#111c30] text-[#f4f6fa]"
              : "border-[var(--line-strong)] bg-white text-[var(--text)]"
          }`}
          style={{
            left: `${Math.min(86, Math.max(2, (coords[hover].x / width) * 100))}%`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-bold">{fx(h.x)}</div>
          {seriesNames.map((name, si) => (
            <div key={name} className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: colors[si] }} />
              {name}: <span className="font-bold">{compactNumber(h.ys[si])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function BarList({
  items,
  color,
  ink = false,
  formatValue = compactNumber,
  maxItems = 12,
  emptyLabel = "Collecting data",
}: {
  items: { label: string; value: number; hint?: string; href?: string }[];
  color: string;
  ink?: boolean;
  formatValue?: (v: number) => string;
  maxItems?: number;
  emptyLabel?: string;
}) {
  const shown = items.slice(0, maxItems);
  if (shown.length === 0) {
    return <EmptyChart ink={ink} label={emptyLabel} height={64} />;
  }
  const max = Math.max(1, ...shown.map((i) => i.value));
  const textMain = ink ? "text-[#f4f6fa]" : "text-[var(--text)]";
  const textDim = ink ? "text-[#a8b4c8]" : "text-[var(--muted)]";
  return (
    <ul className="space-y-2">
      {shown.map((item, i) => {
        const row = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className={`truncate font-medium ${textMain} ${item.href ? "underline-offset-2 group-hover/bar:underline" : ""}`}>
                {item.label}
              </span>
              <span className={`shrink-0 font-bold tabular-nums ${textMain}`}>
                {formatValue(item.value)}
                {item.hint && <span className={`ml-1.5 font-normal ${textDim}`}>{item.hint}</span>}
              </span>
            </div>
            <div
              className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: ink ? "rgba(244,246,250,0.08)" : "rgba(10,18,32,0.06)" }}
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: color }}
              />
            </div>
          </>
        );
        return (
          <li key={`${item.label}-${i}`} title={item.hint}>
            {item.href ? (
              <a href={item.href} className="group/bar block rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b87ff]">
                {row}
              </a>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function FunnelChart({
  stages,
  ink = false,
  colors,
}: {
  stages: { label: string; count: number; note?: string | null }[];
  ink?: boolean;
  /** Sequential steps of one hue, darkest first. */
  colors: string[];
}) {
  const real = stages.filter((s) => Number.isFinite(s.count));
  if (real.length === 0 || real[0].count === 0) {
    return <EmptyChart ink={ink} label="Not enough data to draw the funnel yet" height={120} />;
  }
  const max = Math.max(1, ...real.map((s) => s.count));
  const textMain = ink ? "text-[#f4f6fa]" : "text-[var(--text)]";
  const textDim = ink ? "text-[#a8b4c8]" : "text-[var(--muted)]";
  return (
    <div>
      <span className="sr-only">
        Funnel: {real.map((s) => `${s.label} ${s.count}`).join(", ")}.
      </span>
      <ol className="space-y-1.5">
        {real.map((stage, i) => {
          const prev = i > 0 ? real[i - 1].count : null;
          const conv = prev && prev > 0 ? stage.count / prev : null;
          return (
            <li key={stage.label}>
              {i > 0 && conv != null && (
                <div className={`mb-1 pl-1 text-[11px] ${textDim}`} aria-hidden="true">
                  ↓ {(conv * 100).toFixed(conv < 0.1 ? 1 : 0)}% continue
                  {" · "}
                  {((1 - conv) * 100).toFixed(0)}% drop off
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-40 shrink-0 sm:w-48">
                  <div className={`truncate text-[13px] font-semibold ${textMain}`}>{stage.label}</div>
                  {stage.note && <div className={`text-[10px] ${textDim}`}>{stage.note}</div>}
                </div>
                <div className="relative h-7 flex-1">
                  <div
                    className="absolute inset-y-0 left-0 rounded-r-md rounded-l-sm"
                    style={{
                      width: `${Math.max(1.5, (stage.count / max) * 100)}%`,
                      background: colors[Math.min(i, colors.length - 1)],
                    }}
                  />
                  <span
                    className={`absolute inset-y-0 flex items-center pl-2 text-[12px] font-bold tabular-nums ${
                      stage.count / max > 0.35 ? (ink ? "text-[#0a1220]" : "text-white") : textMain
                    }`}
                    style={
                      stage.count / max > 0.35
                        ? { left: 0 }
                        : { left: `${Math.max(1.5, (stage.count / max) * 100)}%`, paddingLeft: 8 }
                    }
                  >
                    {compactNumber(stage.count)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Sparkline({
  values,
  color,
  width = 120,
  height = 34,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const step = width / (values.length - 1);
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - 3 - ((v - min) / range) * (height - 6)).toFixed(1)}`)
    .join("");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block" width={width} height={height} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyChart({
  label,
  ink = false,
  height = 120,
}: {
  label: string;
  ink?: boolean;
  height?: number;
}) {
  return (
    <div
      className={`flex w-full items-center justify-center rounded-lg border border-dashed text-sm ${
        ink ? "border-white/15 text-[#a8b4c8]" : "border-[var(--line-strong)] text-[var(--muted)]"
      }`}
      style={{ minHeight: height }}
      role="status"
    >
      {label}
    </div>
  );
}
