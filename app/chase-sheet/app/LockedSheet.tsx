"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, KeyRound, ListChecks, Mail } from "lucide-react";
import { CHASE_SHEET } from "@/lib/chaseSheet/product";
import { BUSINESS } from "@/lib/site/business";
import BuyButtons from "../BuyButtons";
import styles from "../chase-sheet.module.css";

// The sheet, before it is open on this device.
//
// Three people land here: a buyer opening the sheet on a second device (they
// paste the key from the receipt), a buyer whose plan ended (they restart it),
// and somebody who has not bought yet (they go and buy). The email path of
// the restore form answers the same way whether or not anything was found.

export default function LockedSheet({
  reason,
  email,
  claim,
  prefill,
}: {
  reason: "visitor" | "no_account" | "ok" | "past_due" | "canceled" | "unconfigured";
  email: string | null;
  claim: string | null;
  prefill: { email: string; key: string };
}) {
  const router = useRouter();
  const [form, setForm] = useState({ email: prefill.email || email || "", key: prefill.key });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setForm({ email: prefill.email || email || "", key: prefill.key });
  }, [prefill.email, prefill.key, email]);

  const claimNote =
    claim === "unpaid"
      ? "That checkout was not completed, so nothing was charged and nothing was opened."
      : claim === "notfound"
        ? "We could not match that checkout to a Chase Sheet purchase. If you were charged, paste your key below or ask for it again."
        : claim === "unavailable"
          ? `Card payment is not fully configured yet. If you were charged, email ${BUSINESS.email.hello} and it will be sorted by hand.`
          : claim === "missing"
            ? "That link was missing its checkout reference. Paste your key below instead."
            : null;

  const lapsed = reason === "canceled" || reason === "past_due";

  async function submit(mode: "key" | "resend") {
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      const r = await fetch("/api/chase-sheet/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "key" ? { email: form.email, key: form.key } : { email: form.email }),
      });
      const body = (await r.json().catch(() => ({}))) as { ok?: boolean; next?: string; sent?: boolean; error?: string };
      if (!r.ok) {
        setError(body.error || "That did not work. Check the email and the key.");
        return;
      }
      if (body.sent) {
        setSent(true);
        return;
      }
      setDone(true);
      setTimeout(() => router.refresh(), 900);
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={`${styles.panel} ${styles.done}`} role="status">
            <Check aria-hidden="true" size={34} />
            <h2>Open on this device.</h2>
            <p>Loading your sheet.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topline}>
          <Link href={CHASE_SHEET.path} className={styles.wordmark}>
            <ListChecks aria-hidden="true" size={26} />
            Chase<span>Sheet</span>
          </Link>
          <span>By The LeadFlow Pro</span>
        </div>

        {claimNote ? (
          <p className={styles.notice} role="status">
            {claimNote}
          </p>
        ) : null}
        {reason === "unconfigured" ? (
          <p className={styles.error} role="status">
            The sheet is not switched on in this environment yet. Email {BUSINESS.email.hello} if you were charged.
          </p>
        ) : null}

        <div className={styles.locked}>
          <section className={styles.panel}>
            {lapsed ? (
              <>
                <h2>Your plan ended.</h2>
                <p>
                  {reason === "past_due"
                    ? "The card on file could not be charged and the grace window has passed, so the sheet is locked. Restart the plan and every quote is right where you left it."
                    : "The monthly plan has ended, so the sheet is locked. Restart it and every quote is right where you left it, or pay once and never think about it again."}
                </p>
                <BuyButtons compact />
                <p className={styles.fine}>
                  Want your quotes out first?{" "}
                  <a className={styles.textlink} href="/api/chase-sheet/export">
                    Download the spreadsheet
                  </a>
                  .
                </p>
              </>
            ) : reason === "no_account" ? (
              <>
                <h2>No sheet under {email}.</h2>
                <p>You are signed in, but nothing has been bought with this email yet. Start a plan below, or paste the key from a receipt if you bought with a different email.</p>
                <BuyButtons compact />
              </>
            ) : (
              <>
                <h2>Open your sheet on this device.</h2>
                <p>Paste the key from your receipt with the email you paid with. It opens the same sheet on your phone, your desk, and the office computer.</p>
              </>
            )}

            <form
              className={styles.lockedForm}
              style={{ marginTop: 20 }}
              onSubmit={(e) => {
                e.preventDefault();
                void submit("key");
              }}
            >
              <label>
                The email you paid with
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  maxLength={200}
                  placeholder="you@yourbusiness.com"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                Your key
                <input
                  type="text"
                  value={form.key}
                  maxLength={40}
                  placeholder="LFP-XXXX-XXXX-XXXX-XXXX"
                  spellCheck={false}
                  autoCapitalize="characters"
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                />
                <small>It is in the receipt email, on the line that says Your key.</small>
              </label>
              {error ? (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              ) : null}
              {sent ? (
                <p role="status" className={styles.notice}>
                  If a sheet has been bought with that address, the key is on its way to it now. Check the inbox you paid with, including spam.
                </p>
              ) : null}
              <div className={styles.actions} style={{ marginTop: 4 }}>
                <button type="submit" className={styles.primary} disabled={busy || !form.email || !form.key}>
                  <KeyRound aria-hidden="true" size={16} />
                  {busy ? "Checking" : "Open on this device"}
                  {!busy ? <ArrowRight aria-hidden="true" size={16} /> : null}
                </button>
                <button type="button" className={styles.secondary} disabled={busy || !form.email} onClick={() => void submit("resend")}>
                  <Mail aria-hidden="true" size={16} />
                  Lost the key. Email it again
                </button>
              </div>
            </form>
          </section>

          {!lapsed && reason !== "no_account" ? (
            <section className={styles.panel}>
              <h2>Not bought it yet?</h2>
              <p>
                Every quote you have out, remembered and chased every day from your own phone, with the words written for each touch. {CHASE_SHEET.monthlyLabel}, or {CHASE_SHEET.lifetimeLabel}. See it write a follow-up first on the{" "}
                <Link href={CHASE_SHEET.path} className={styles.textlink}>
                  Chase Sheet page
                </Link>
                .
              </p>
              <BuyButtons compact />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
