"use client";

import { useEffect, useMemo, useState } from "react";
import type { WeirdStat } from "@/lib/weird-stats";
import { calculateStatValue, formatStatValue } from "@/lib/weird-stats";

export function AnimatedCounter({
  stat,
  className,
}: {
  stat: WeirdStat;
  className?: string;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1200);
    return () => window.clearInterval(timer);
  }, []);

  const value = useMemo(() => calculateStatValue(stat, now), [stat, now]);
  const formatted = formatStatValue(stat, value);

  return (
    <span
      className={`${className ?? ""} inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono [font-variant-numeric:tabular-nums]`}
      aria-label={`${formatted} ${stat.unitLabel}`}
      style={{ fontVariantNumeric: "tabular-nums" }}
      title={formatted}
    >
      {formatted}
    </span>
  );
}
