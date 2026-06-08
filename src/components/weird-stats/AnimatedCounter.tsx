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

  return (
    <span className={className} aria-label={`${formatStatValue(stat, value)} ${stat.unitLabel}`}>
      {formatStatValue(stat, value)}
    </span>
  );
}
