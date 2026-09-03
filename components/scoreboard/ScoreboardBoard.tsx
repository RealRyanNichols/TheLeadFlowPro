"use client";

import { useMemo, useState } from "react";
import {
  SCOREBOARD_METRICS,
  SCOREBOARD_WINDOWS,
  formatCount,
  type ScoreboardDay,
  type ScoreboardWindow,
  type ScoreboardWindowKey,
} from "@/lib/scoreboard";
import styles from "@/app/scoreboard/scoreboard.module.css";

type Props = {
  windows: ScoreboardWindow[];
  series: ScoreboardDay[];
  showSales: boolean;
  updatedLabel: string;
};

function dayLabel(day: string) {
  const [, m, d] = day.split("-").map(Number);
  return `${m}/${d}`;
}

function LeadsChart({ series }: { series: ScoreboardDay[] }) {
  const width = 1000;
  const height = 220;
  const pad = { top: 14, right: 8, bottom: 26, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxViews = Math.max(1, ...series.map((row) => row.views));
  const maxLeads = Math.max(1, ...series.map((row) => row.leads));
  const step = innerW / series.length;
  const barW = Math.max(4, step * 0.62);
  const viewsPath = series
    .map((row, index) => {
      const x = pad.left + step * index + step / 2;
      const y = pad.top + innerH - (row.views / maxViews) * innerH;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily views as a line and daily leads as bars, paid and unpaid stacked">
      {[0.25, 0.5, 0.75, 1].map((tick) => {
        const y = pad.top + innerH - tick * innerH;
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgba(255,255,255,.08)" />
            <text x={pad.left - 6} y={y + 4} fontSize="11" textAnchor="end" fill="#8fb3d9">
              {Math.round(maxLeads * tick)}
            </text>
          </g>
        );
      })}
      {series.map((row, index) => {
        const x = pad.left + step * index + (step - barW) / 2;
        const unpaidH = (row.unpaid_leads / maxLeads) * innerH;
        const paidH = (row.paid_leads / maxLeads) * innerH;
        const base = pad.top + innerH;
        return (
          <g key={row.day}>
            {row.unpaid_leads > 0 ? (
              <rect x={x} y={base - unpaidH} width={barW} height={unpaidH} fill="#20d5c7" rx="2">
                <title>{`${row.day}: ${row.unpaid_leads} unpaid`}</title>
              </rect>
            ) : null}
            {row.paid_leads > 0 ? (
              <rect x={x} y={base - unpaidH - paidH} width={barW} height={paidH} fill="#ffb454" rx="2">
                <title>{`${row.day}: ${row.paid_leads} paid`}</title>
              </rect>
            ) : null}
            {index % Math.ceil(series.length / 10) === 0 ? (
              <text x={x + barW / 2} y={height - 8} fontSize="11" textAnchor="middle" fill="#8fb3d9">
                {dayLabel(row.day)}
              </text>
            ) : null}
          </g>
        );
      })}
      <path d={viewsPath} fill="none" stroke="#7fc4ff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export default function ScoreboardBoard({ windows, series, showSales, updatedLabel }: Props) {
  const [windowKey, setWindowKey] = useState<ScoreboardWindowKey>("30d");
  const selected = useMemo(
    () => windows.find((item) => item.key === windowKey) ?? windows[0],
    [windowKey, windows],
  );
  if (!selected) return null;
  const headline = SCOREBOARD_METRICS.filter((metric) => metric.headline);
  const secondary = SCOREBOARD_METRICS.filter(
    (metric) => !metric.headline && (metric.key !== "sales" || showSales),
  );
  const totalViews = series.reduce((sum, row) => sum + row.views, 0);
  const totalLeads = series.reduce((sum, row) => sum + row.leads, 0);

  return (
    <div className={styles.boardPanel}>
      <div className={styles.windowRow}>
        <div role="group" aria-label="Time window">
          {SCOREBOARD_WINDOWS.map((window) => (
            <button
              key={window.key}
              type="button"
              className={window.key === selected.key ? styles.active : undefined}
              onClick={() => setWindowKey(window.key)}
              aria-pressed={window.key === selected.key}
            >
              {window.label}
            </button>
          ))}
        </div>
        <p className={styles.windowNote}>Central time. {updatedLabel}</p>
      </div>

      <div className={styles.tiles}>
        {headline.map((metric) => (
          <div
            key={metric.key}
            className={`${styles.tile} ${metric.key === "paid_leads" ? styles.paid : metric.key === "unpaid_leads" ? styles.unpaid : ""}`}
          >
            <span>{metric.label}</span>
            <strong>{formatCount(selected.totals[metric.key])}</strong>
            <small>{selected.label === "Today" ? "so far today" : `last ${selected.days} days`}</small>
          </div>
        ))}
      </div>

      <div className={styles.tilesSecondary}>
        {secondary.map((metric) => (
          <div key={metric.key} className={styles.tile}>
            <span>{metric.label}</span>
            <strong>{formatCount(selected.totals[metric.key])}</strong>
            <small>{selected.label === "Today" ? "so far today" : `last ${selected.days} days`}</small>
          </div>
        ))}
      </div>

      <div className={styles.chart}>
        <div className={styles.chartHead}>
          <div>
            <p>Last {series.length} days</p>
            <strong>
              {formatCount(totalViews)} views, {formatCount(totalLeads)} leads
            </strong>
          </div>
          <div className={styles.chartLegend}>
            <span><i style={{ background: "#7fc4ff" }} />Views (own scale)</span>
            <span><i style={{ background: "#ffb454" }} />Paid leads</span>
            <span><i style={{ background: "#20d5c7" }} />Unpaid leads</span>
          </div>
        </div>
        <LeadsChart series={series} />
      </div>
    </div>
  );
}
