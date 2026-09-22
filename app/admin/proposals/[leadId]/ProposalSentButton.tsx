"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { planCallOutcome, type PlannerLead } from "@/lib/callCloser";
import type { CloserOfferId } from "@/lib/payDoors";

// "I sent it." Ryan sends the proposal himself (this page never does), then
// taps here so the lead moves to Proposal, the open "write the proposal"
// tasks close, and the lead comes back to the call sheet two business days
// later to follow up.
//
// Before the tap it shows exactly what will be recorded, drawn by the same
// planner the save route runs. It posts one JSON body to the Call Closer's
// save route. The idempotency key is minted on mount and reused only when a
// failed save is retried, so a save that landed before the connection dropped
// is not recorded twice. Sample proposals only show the list.

type Done = { summary: string; nextFollowUpLabel: string | null; warnings: string[]; duplicate: boolean };

const PREVIEW_KEY = "preview-only-key-not-saved";
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";

function mintKey(): string {
  const c: Crypto | undefined = typeof globalThis.crypto === "object" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export default function ProposalSentButton({
  lead,
  offers,
  sample = false,
  fixedNow = null,
  callCardHref = null,
}: {
  /** Plain lead fields for the preview. Pass diagnostic as null. */
  lead: PlannerLead;
  /** The closer offers in this proposal, at most three. */
  offers: CloserOfferId[];
  sample?: boolean;
  /** A fixed clock (ISO) for sample proposals. Otherwise the browser clock, read after mount. */
  fixedNow?: string | null;
  callCardHref?: string | null;
}) {
  const uid = useId();
  const fixedMs = fixedNow && Number.isFinite(Date.parse(fixedNow)) ? Date.parse(fixedNow) : null;
  const [nowMs, setNowMs] = useState<number | null>(fixedMs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const keyRef = useRef("");
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    keyRef.current = mintKey();
    setNowMs(fixedMs ?? Date.now());
  }, [fixedMs]);

  useEffect(() => {
    if (done) statusRef.current?.focus();
  }, [done]);

  const plan = useMemo(() => {
    if (nowMs === null) return null;
    return planCallOutcome({
      lead,
      request: { outcome: "proposal_sent", idempotencyKey: PREVIEW_KEY, note: null, offers, meeting: null, callback: null, lostReason: null },
      actorName: "",
      now: new Date(nowMs),
      priorAttempts: 0,
    });
  }, [lead, offers, nowMs]);

  async function record() {
    if (sample || busy || done) return;
    if (plan && !plan.ok) {
      setError(plan.error);
      return;
    }
    if (!keyRef.current) keyRef.current = mintKey();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome: "proposal_sent", offers, idempotency_key: keyRef.current }),
      });
      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!response.ok || !isRecord(data) || data.ok !== true || typeof data.summary !== "string") {
        const said = isRecord(data) && typeof data.error === "string" ? data.error : "";
        setError(
          response.status === 401
            ? "You are signed out, so nothing was recorded. Sign in again in another tab, then tap the button again."
            : `${said || "It was not recorded."} Tap the button again to retry. It will not be recorded twice.`,
        );
        return;
      }
      keyRef.current = mintKey();
      setDone({
        summary: data.summary,
        nextFollowUpLabel: typeof data.nextFollowUpLabel === "string" ? data.nextFollowUpLabel : null,
        warnings: Array.isArray(data.warnings) ? data.warnings.filter((w): w is string => typeof w === "string") : [],
        duplicate: data.duplicate === true,
      });
    } catch {
      setError("Could not reach the server, so nothing was recorded yet. Check the connection and tap the button again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card mb-4 !p-4" aria-labelledby={`${uid}-heading`}>
      <h2 id={`${uid}-heading`} className="text-base font-black text-[var(--heading)]">
        Sent it yourself? Log it.
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        This page never sends the proposal. After you send it, tap below so the lead comes back to you on time.
      </p>

      {done ? (
        <div
          ref={statusRef}
          role="status"
          tabIndex={-1}
          className="mt-3 rounded-xl border border-[var(--green-line)] bg-[var(--green-tint)] p-4 text-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--blue)]"
        >
          <p className="font-black text-[var(--heading)]">{done.duplicate ? "Already recorded." : "Recorded."}</p>
          <p className="mt-1">{done.summary}</p>
          {done.nextFollowUpLabel ? (
            <p className="mt-1">
              <span className="font-bold">Next follow-up:</span> {done.nextFollowUpLabel} Central.
            </p>
          ) : null}
          {done.warnings.length ? (
            <ul className="mt-2 list-disc pl-5">
              {done.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          {callCardHref ? (
            <a href={callCardHref} className={`mt-2 inline-flex min-h-[44px] items-center font-bold text-[var(--blue)] ${FOCUS}`}>
              Back to the call card
            </a>
          ) : null}
        </div>
      ) : (
        <>
          {plan && plan.ok ? (
            <>
              <p className="mt-3 text-sm font-bold text-[var(--heading)]">When you tap it</p>
              <ul className="mt-1 grid list-disc gap-1 pl-5 text-sm text-[var(--text)]">
                {plan.preview.map((lineText, i) => (
                  <li key={`${i}-${lineText}`}>{lineText}</li>
                ))}
              </ul>
            </>
          ) : plan ? (
            <p id={`${uid}-blocked`} className="mt-3 rounded-lg border border-[var(--warn-line)] bg-[var(--warn-tint)] p-3 text-sm">
              {plan.error}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 rounded-lg border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={record}
            disabled={sample || busy || Boolean(plan && !plan.ok)}
            aria-describedby={plan && !plan.ok ? `${uid}-blocked` : undefined}
            className={`btn-primary mt-3 min-h-[44px] w-full !px-5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${FOCUS}`}
          >
            {sample ? "Sample only, nothing is saved" : busy ? "Saving..." : "Mark the proposal sent"}
          </button>
        </>
      )}
    </section>
  );
}
