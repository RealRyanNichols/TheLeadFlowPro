"use client";

import { useEffect, useState } from "react";
import styles from "./five.module.css";

// The live counters. Reads /api/five/stats on load and every 30 seconds while
// the tab is visible. Renders nothing personal: three totals and a deadline.

type Stats = {
  ok: boolean;
  views: number;
  clicks: number;
  taken: number;
  spots: number;
  left: number;
  soldOut: boolean;
  expired: boolean;
  deadlineIso: string;
};

const REFRESH_MS = 30_000;

function remaining(deadlineIso: string, now: number) {
  const ms = new Date(deadlineIso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return { days, hours, minutes };
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export default function FiveCounters({
  spots,
  deadlineIso,
  deadlineLabel,
}: {
  spots: number;
  deadlineIso: string;
  deadlineLabel: string;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch("/api/five/stats", { cache: "no-store" });
        if (!r.ok) return;
        const body = (await r.json()) as Stats;
        if (!cancelled) setStats(body);
      } catch {
        /* the page works without the numbers */
      }
    }
    load();
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  const taken = stats ? Math.min(stats.taken, spots) : 0;
  const left = stats ? Math.max(0, spots - taken) : spots;
  const time = remaining(deadlineIso, now);
  const soldOut = stats?.soldOut ?? false;

  return (
    <div className={styles.counters} aria-live="polite">
      <div className={styles.countersHead}>
        <h2>The count, live</h2>
        <span className={styles.live}>Live</span>
      </div>

      <div className={styles.countGrid}>
        <div className={styles.count}>
          <strong>{stats ? fmt(stats.views) : "—"}</strong>
          <span>people have looked at this page</span>
        </div>
        <div className={styles.count}>
          <strong>{stats ? fmt(stats.clicks) : "—"}</strong>
          <span>clicked to take a spot</span>
        </div>
        <div className={`${styles.count} ${styles["count--spots"]}`}>
          <strong>
            {taken} of {spots}
          </strong>
          <span>{soldOut ? "spots gone" : "spots taken"}</span>
        </div>
      </div>

      <div className={styles.spotsBar} aria-label={`${taken} of ${spots} spots taken`}>
        {Array.from({ length: spots }, (_, i) => (
          <span
            key={i}
            className={`${styles.spot} ${i < taken ? styles["spot--taken"] : ""}`}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className={styles.deadline}>
        <span>
          {soldOut ? "All five are taken." : `${left} ${left === 1 ? "spot" : "spots"} left.`}
        </span>
        <span>
          {time ? (
            <>
              Closes in <strong>{time.days}d {time.hours}h {time.minutes}m</strong>
            </>
          ) : (
            <>Closed {deadlineLabel}</>
          )}
        </span>
      </div>
      <p className={styles.countersFoot}>
        Counted from the first day this page went up. My own visits are not in the numbers.
      </p>
    </div>
  );
}
