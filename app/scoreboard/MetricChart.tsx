import { formatCount } from "@/lib/scoreboard";
import type { MetricPoint } from "@/lib/scoreboardMetrics";
import styles from "./scoreboard.module.css";

export default function MetricChart({
  points,
  label,
  compact = false,
}: {
  points: MetricPoint[];
  label: string;
  compact?: boolean;
}) {
  const width = compact ? 360 : 900;
  const height = compact ? 100 : 250;
  const left = compact ? 0 : 50;
  const top = 18;
  const bottom = compact ? 10 : 35;
  const innerHeight = height - top - bottom;
  const step = (width - left - 8) / Math.max(1, points.length);
  const max = Math.max(1, ...points.map((point) => point.value ?? 0));
  const available = points.some((point) => point.value !== null);
  if (!available)
    return (
      <p className={styles.chartNote}>
        Trend unavailable until a complete feed is available.
      </p>
    );
  return (
    <div className={compact ? styles.miniChart : styles.metricChart}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}, daily counts. Each chart uses its own scale. Full daily values are on the metric detail page.`}
      >
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1={left}
              x2={width - 8}
              y1={top + innerHeight * (1 - fraction)}
              y2={top + innerHeight * (1 - fraction)}
              stroke="var(--chart-grid)"
            />
            {!compact && (
              <text
                x={left - 8}
                y={top + innerHeight * (1 - fraction) + 5}
                textAnchor="end"
                fontSize="14"
                fill="var(--muted)"
              >
                {formatCount(Math.round(max * fraction))}
              </text>
            )}
          </g>
        ))}
        {points.map((point, i) => {
          const barHeight =
            point.value === null ? 0 : (point.value / max) * innerHeight;
          return (
            <g key={point.day}>
              {point.value !== null && (
                <rect
                  x={left + step * i + step * 0.15}
                  y={top + innerHeight - barHeight}
                  width={Math.max(1, step * 0.7)}
                  height={barHeight}
                  rx="2"
                  fill="var(--chart-unpaid)"
                >
                  <title>{`${point.day}: ${formatCount(point.value)} ${label.toLowerCase()}`}</title>
                </rect>
              )}
              {!compact &&
                (i === 0 || i === points.length - 1 || i % 7 === 0) && (
                  <text
                    x={left + step * i + step / 2}
                    y={height - 10}
                    textAnchor="middle"
                    fontSize="14"
                    fill="var(--muted)"
                  >
                    {point.day.slice(5).replace("-", "/")}
                  </text>
                )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
