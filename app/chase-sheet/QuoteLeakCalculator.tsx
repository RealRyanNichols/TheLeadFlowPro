"use client";

import { useState } from "react";
import { CHASE_SHEET } from "@/lib/chaseSheet/product";
import styles from "./chase-sheet.module.css";

// The quote leak, in the visitor's own numbers. Four inputs, simple math, no
// benchmark and no promise: the "one more in ten" line is a planning number
// the visitor sets, not a statistic.

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export default function QuoteLeakCalculator() {
  const [quotes, setQuotes] = useState(20);
  const [value, setValue] = useState(2800);
  const [close, setClose] = useState(30);
  const [lift, setLift] = useState(10);

  const q = Math.max(0, quotes);
  const v = Math.max(0, value);
  const closeRate = Math.min(95, Math.max(0, close)) / 100;
  const liftRate = Math.min(50, Math.max(0, lift)) / 100;
  const openPerMonth = q * (1 - closeRate);
  const openDollars = openPerMonth * v;
  const extraJobs = q * liftRate;
  const extraDollars = extraJobs * v;
  const monthsToPay = extraDollars > 0 ? CHASE_SHEET.monthlyUsd / extraDollars : 0;

  return (
    <div className={styles.calc}>
      <div className={styles.fields}>
        <label>
          Quotes you send a month
          <input type="number" min={0} max={2000} value={quotes} onChange={(e) => setQuotes(Number(e.target.value))} />
        </label>
        <label>
          Average quote (dollars)
          <input type="number" min={0} max={5_000_000} value={value} onChange={(e) => setValue(Number(e.target.value))} />
        </label>
        <label>
          Percent you close today
          <input type="number" min={0} max={95} value={close} onChange={(e) => setClose(Number(e.target.value))} />
        </label>
        <label>
          If chasing won this many more in a hundred
          <input type="number" min={0} max={50} value={lift} onChange={(e) => setLift(Number(e.target.value))} />
          <small>Your planning number, not a promise. Ten means one more job in every ten quotes.</small>
        </label>
      </div>
      <div className={styles.result} aria-live="polite">
        <p>Quotes that go quiet every month, at your numbers</p>
        <div className={styles.big}>{usd(openDollars)}</div>
        <div className={styles.line}>
          <span>Quotes with no answer</span>
          <strong>{openPerMonth.toFixed(0)} a month</strong>
        </div>
        <div className={styles.line}>
          <span>One more in every {lift > 0 ? Math.round(100 / lift) : "..."} chased</span>
          <strong>{usd(extraDollars)} a month</strong>
        </div>
        <div className={styles.line}>
          <span>{CHASE_SHEET.name} pays for itself in</span>
          <strong>{extraDollars > 0 ? (monthsToPay < 1 ? "the first job" : `${monthsToPay.toFixed(1)} months`) : "..."}</strong>
        </div>
        <small>Your inputs, your math. Change any number and it recalculates. Nothing here is a claim about results.</small>
      </div>
    </div>
  );
}
