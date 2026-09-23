"use client";

import { useEffect, useState } from "react";
import { MessageSquareText, PhoneCall, RefreshCw } from "lucide-react";
import styles from "./chase-sheet.module.css";

// The free demo. The visitor describes one quote and the server writes the
// whole sequence for it. The engine never ships to the browser: the trade and
// tone lists arrive as plain props from the server page, and this component
// only draws what the API sends back.

export type Option = { value: string; label: string };

type DemoStep = {
  step: { step: number; role: string; channel: "text" | "call" | "email"; day: number; on: string; job: string };
  message: { subject?: string; body: string; fallbackText?: string };
};
type DemoResult = {
  trade: string;
  steps: DemoStep[];
  objections: { id: string; heard: string; note: string; reply: string }[];
};

const ROLE_LABEL: Record<string, string> = {
  landed: "Did it land",
  call: "The real conversation",
  question: "One question",
  proof: "The proof",
  reason: "The honest reason",
  schedule: "The schedule call",
  close: "Closing the file",
  revive: "The revival",
  last: "The last word",
};

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export default function DemoSequence({ trades, tones }: { trades: Option[]; tones: Option[] }) {
  const [tradeId, setTradeId] = useState("roofing");
  const [tone, setTone] = useState("friendly");
  const [first, setFirst] = useState("Dana");
  const [job, setJob] = useState("the roof");
  const [amountUsd, setAmountUsd] = useState("8400");
  const [owner, setOwner] = useState("");
  const [business, setBusiness] = useState("");
  const [windowText, setWindowText] = useState("the week after next");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requested, setRequested] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setBusy(true);
      setError(null);
      try {
        const r = await fetch("/api/chase-sheet/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tradeId, tone, first, job, amountUsd, owner, business, window: windowText }),
        });
        const body = (await r.json().catch(() => ({}))) as DemoResult & { error?: string };
        if (cancelled) return;
        if (!r.ok || !Array.isArray(body.steps)) {
          setError(body.error || "Could not write the sequence right now. Try again in a moment.");
          return;
        }
        setResult(body);
      } catch {
        if (!cancelled) setError("Could not reach the server. Try again in a moment.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
    // Re-run only when the visitor presses the button, or on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  return (
    <div className={styles.demo}>
      <div className={styles.demoGrid}>
        <form
          className={styles.fields}
          style={{ gridTemplateColumns: "1fr" }}
          onSubmit={(e) => {
            e.preventDefault();
            setRequested((n) => n + 1);
          }}
        >
          <label>
            Your trade
            <select value={tradeId} onChange={(e) => setTradeId(e.target.value)}>
              {trades.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            How you talk to customers
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              {tones.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Customer first name
            <input value={first} maxLength={40} onChange={(e) => setFirst(e.target.value)} />
          </label>
          <label>
            What you quoted
            <input value={job} maxLength={80} placeholder="the back fence, a 4 ton system" onChange={(e) => setJob(e.target.value)} />
          </label>
          <label>
            Quote amount (dollars)
            <input value={amountUsd} inputMode="numeric" maxLength={9} onChange={(e) => setAmountUsd(e.target.value)} />
            <small>The amount sets the pace. A small job gets five touches; a big one gets seven, more patiently.</small>
          </label>
          <label>
            Your first name
            <input value={owner} maxLength={40} placeholder="Signs every message" onChange={(e) => setOwner(e.target.value)} />
          </label>
          <label>
            Your business name
            <input value={business} maxLength={80} onChange={(e) => setBusiness(e.target.value)} />
          </label>
          <label>
            Your honest start window
            <input value={windowText} maxLength={80} onChange={(e) => setWindowText(e.target.value)} />
            <small>Used in the schedule call. Keep it true. The script refuses to fake scarcity.</small>
          </label>
          <button type="submit" className={styles.primary} disabled={busy}>
            <RefreshCw aria-hidden="true" size={16} />
            {busy ? "Writing" : "Write my follow-up"}
          </button>
        </form>

        <div className={styles.timeline} aria-live="polite">
          {error ? <p className={styles.error}>{error}</p> : null}
          {!result && !error ? <p className={styles.note}>Writing the first sequence.</p> : null}
          {result
            ? result.steps.map(({ step, message }) => (
                <article className={styles.touch} key={step.step}>
                  <div className={styles.touchHead}>
                    <span className={styles.chip}>Day {step.day}</span>
                    <strong>{ROLE_LABEL[step.role] ?? step.role}</strong>
                    <span className={`${styles.chip} ${styles.chipMuted}`}>
                      {step.channel === "call" ? <PhoneCall aria-hidden="true" size={12} /> : <MessageSquareText aria-hidden="true" size={12} />}{" "}
                      {step.channel === "call" ? "call" : "text"}
                    </span>
                    <span>{longDate(step.on)}</span>
                  </div>
                  <pre className={styles.messageBody}>{message.body}</pre>
                  {message.fallbackText ? (
                    <>
                      <p className={styles.touchJob}>If it goes to voicemail, send this instead:</p>
                      <pre className={styles.messageBody}>{message.fallbackText}</pre>
                    </>
                  ) : null}
                  <p className={styles.touchJob}>{step.job}</p>
                </article>
              ))
            : null}
          {result ? (
            <div className={styles.objections}>
              <p className={styles.note}>
                <strong>When they push back.</strong> The sheet carries a reply for every objection your trade hears. Four of them for {result.trade.toLowerCase()}:
              </p>
              {result.objections.map((o) => (
                <details key={o.id}>
                  <summary>&ldquo;{o.heard}&rdquo;</summary>
                  <p>
                    <em>{o.note}</em>
                  </p>
                  <pre className={styles.messageBody}>{o.reply}</pre>
                </details>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
