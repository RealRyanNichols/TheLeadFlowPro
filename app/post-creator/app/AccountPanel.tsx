"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CreditCard, LogOut } from "lucide-react";
import { POST_CREATOR } from "@/lib/postCreator/product";
import type { AccountView } from "@/lib/postCreator/types";
import { BUSINESS } from "@/lib/site/business";
import { openBilling, signOut } from "./api";
import { APP_COPY, planLine } from "./copy";

// The plan, billing, and signing out, under Settings. Billing is Stripe's own
// portal (card, cancel, invoices); the server looks up the customer from the
// account, so the browser never names one. Signing out clears this device
// only; the key from the receipt opens it again anywhere.

const COPY = APP_COPY.account;

/**
 * Opens the Stripe billing portal for a monthly plan. Used here, in the
 * past-due banner, and on the locked screen ("Update your card"). The route
 * lets a lapsed plan through, since a failed card needs this door most.
 */
export function BillingButton({ label = COPY.manageBilling, className = "button-secondary" }: { label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    const r = await openBilling();
    if (r.ok) {
      // Stays busy while the browser leaves for Stripe.
      window.location.href = r.data.url;
      return;
    }
    setError(r.error);
    setBusy(false);
  }

  return (
    <span className="inline-flex max-w-full flex-col items-start gap-1.5">
      <button type="button" className={className} onClick={open} disabled={busy} aria-busy={busy}>
        <CreditCard aria-hidden="true" className="h-4 w-4" />
        {busy ? COPY.openingBilling : label}
      </button>
      {error ? (
        <span role="alert" className="tool-field-error">
          {error}
        </span>
      ) : null}
    </span>
  );
}

export default function AccountPanel({ account }: { account: AccountView }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const questionId = useId();

  // The question takes focus on the safe answer, so Enter never signs out by accident.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus();
  }, [confirming]);

  async function confirmSignOut() {
    setBusy(true);
    setError(null);
    const r = await signOut();
    if (r.ok) {
      // A full load, so nothing from the signed-in screen stays in memory.
      window.location.assign(POST_CREATOR.appPath);
      return;
    }
    setError(r.error);
    setBusy(false);
  }

  return (
    <section aria-labelledby={`${questionId}-title`} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-6">
      <h3 id={`${questionId}-title`} className="text-[20px] font-extrabold text-[var(--heading)]">
        {COPY.title}
      </h3>
      <p className="mt-2 text-[16px] font-bold leading-relaxed text-[var(--heading)]">{planLine(account)}</p>
      <p className="mt-1 text-[14px] text-[var(--muted)] [overflow-wrap:anywhere]">{account.email}</p>

      <div className="mt-4 flex flex-wrap items-start gap-2">
        {account.canManageBilling ? <BillingButton /> : null}
        {!confirming ? (
          <button type="button" className="button-secondary" onClick={() => setConfirming(true)}>
            <LogOut aria-hidden="true" className="h-4 w-4" />
            {COPY.signOut}
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div role="group" aria-labelledby={questionId} className="tool-disclaimer mt-3">
          <p id={questionId} className="text-[15px] font-bold text-[var(--heading)]">
            {COPY.signOutConfirm}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="button-primary" onClick={confirmSignOut} disabled={busy} aria-busy={busy}>
              {COPY.signOutYes}
            </button>
            <button ref={cancelRef} type="button" className="button-secondary" onClick={() => setConfirming(false)} disabled={busy}>
              {COPY.signOutNo}
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="tool-field-error mt-3">
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-[14px] leading-relaxed text-[var(--muted)]">
        {COPY.deleteLead}{" "}
        <a href={`mailto:${BUSINESS.email.hello}`} className="inline-flex min-h-[44px] items-center font-bold text-[var(--blue)] underline underline-offset-4">
          {BUSINESS.email.hello}
        </a>
        .
      </p>
    </section>
  );
}
