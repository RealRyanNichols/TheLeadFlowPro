"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { FIVE_OFFER, FIVE_TRACKING } from "@/lib/fiveOffer";

// The buy button. Records the click (that is the second counter on the page),
// opens Stripe Checkout, and says something useful when it cannot.

type State = "idle" | "loading" | "sold_out" | "expired" | "unavailable" | "error";

export default function FiveBuyButton({
  label,
  className,
  phoneDisplay,
  smsHref,
}: {
  label: string;
  className?: string;
  phoneDisplay: string;
  smsHref: string;
}) {
  const [state, setState] = useState<State>("idle");

  async function buy() {
    if (state === "loading") return;
    setState("loading");
    track("checkout_start", { label: FIVE_TRACKING.checkoutLabel, path: FIVE_OFFER.path });
    try {
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: FIVE_OFFER.kind }),
      });
      const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
      if (r.ok && j.url) {
        window.location.assign(j.url);
        return;
      }
      if (r.status === 409) setState("sold_out");
      else if (r.status === 410) setState("expired");
      else if (r.status === 501) setState("unavailable");
      else setState("error");
    } catch {
      setState("error");
    }
  }

  if (state === "sold_out") {
    return (
      <p className="cb-btn cb-btn--ghost" role="status">
        All five spots are taken
      </p>
    );
  }
  if (state === "expired") {
    return (
      <p className="cb-btn cb-btn--ghost" role="status">
        This special has closed
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={buy}
        className={className ?? "cb-btn cb-btn--primary"}
        disabled={state === "loading"}
        aria-busy={state === "loading"}
      >
        {state === "loading" ? <Loader2 aria-hidden="true" /> : null}
        {state === "loading" ? "Opening secure checkout" : label}
        {state !== "loading" ? <ArrowRight aria-hidden="true" /> : null}
      </button>
      {state === "unavailable" || state === "error" ? (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5 }}>
          Checkout did not open. Text <a href={smsHref}>{phoneDisplay}</a> and I will send you a
          payment link by hand.
        </p>
      ) : null}
    </>
  );
}
