"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, KeyRound, Mail, PenLine } from "lucide-react";
import { closedMessage } from "@/app/post-creator/copy";
import BuyButtons from "@/components/postCreator/BuyButtons";
import { FIELD_CLASS, LABEL_CLASS } from "@/components/postCreator/SetupFields";
import { POST_CREATOR } from "@/lib/postCreator/product";
import type { EntitlementReason } from "@/lib/postCreator/types";
import { BillingButton } from "./AccountPanel";
import { forgetKeyInUrl, looksLikeEmail, looksLikeKey, restore } from "./api";
import { APP_COPY, CLAIM_NOTES, REASON_NOTES, type ClaimCode } from "./copy";

// Post Creator before it is open on this device.
//
// Four people land here: a buyer on a second device (the email and key from
// the receipt open it), a buyer back from checkout whose browser was not
// signed in automatically (the claim note says why), a buyer whose plan
// lapsed (update the card, or buy again), and someone who has not bought
// (the free idea machine and the pricing are one tap away). "Email me my
// key" answers the same way whether or not the email bought anything.
//
// A device that is still signed in to a lapsed plan (past due or ended) is
// not asked to sign in: the plan is the page's heading with its one action
// (update the card, or buy again), and the key form folds away under "Open a
// different Post Creator". After a key opens Post Creator the page moves to
// the plain app address, so a checkout note from ?claim= does not linger over
// the open app.

const COPY = APP_COPY.locked;

type Field = "email" | "key";

export default function LockedPostCreator({
  reason,
  claim,
  prefill,
  salesOpen,
  aiOn,
  canManageBilling,
}: {
  reason: EntitlementReason;
  claim: ClaimCode | null;
  prefill: { email: string; key: string };
  salesOpen: boolean;
  aiOn: boolean;
  canManageBilling: boolean;
}) {
  const router = useRouter();
  const baseId = useId();
  const id = (name: string) => `${baseId}-${name}`;
  const lapsed = reason === "past_due" || reason === "canceled" ? APP_COPY.lapsed[reason] : null;
  // Signed in already: the folded form is for another account, so it starts
  // empty unless a receipt link brought an email and key with it.
  const [email, setEmail] = useState(lapsed && !prefill.key ? "" : prefill.email);
  const [key, setKey] = useState(prefill.key);
  const [busy, setBusy] = useState<"open" | "send" | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const [fieldError, setFieldError] = useState<{ field: Field; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const inputs = useRef<Record<Field, HTMLInputElement | null>>({ email: null, key: null });

  // The form holds the email and key now; the address bar does not need to.
  useEffect(() => {
    forgetKeyInUrl();
  }, []);

  const claimNote = claim ? CLAIM_NOTES[claim] : null;
  const reasonNote = REASON_NOTES[reason];
  const opening = busy === "open" || refreshing;

  function fail(field: Field, message: string) {
    setFieldError({ field, message });
    inputs.current[field]?.focus();
  }

  function clearFor(field: Field) {
    setFieldError((fe) => (fe && fe.field === field ? null : fe));
    setError(null);
  }

  async function open(e: FormEvent) {
    e.preventDefault();
    if (busy || refreshing) return;
    setError(null);
    setSent(false);
    if (!looksLikeEmail(email)) return fail("email", COPY.badEmail);
    if (!looksLikeKey(key)) return fail("key", COPY.badKey);
    setFieldError(null);
    setBusy("open");
    const r = await restore(email.trim(), key.trim());
    setBusy(null);
    if (r.ok) {
      // The cookie is set; the server now renders the app (or says why not)
      // at the plain address, without the ?claim= note that brought them here.
      startRefresh(() => router.replace(POST_CREATOR.appPath));
      return;
    }
    if (r.field === "email" || r.field === "key") return fail(r.field, r.error);
    setError(r.error);
  }

  async function sendKey() {
    if (busy || refreshing) return;
    setError(null);
    setSent(false);
    if (!looksLikeEmail(email)) return fail("email", COPY.badEmail);
    setFieldError(null);
    setBusy("send");
    const r = await restore(email.trim());
    setBusy(null);
    if (r.ok) {
      setSent(true);
      return;
    }
    if (r.field === "email") return fail("email", r.error);
    setError(r.error);
  }

  const describedBy = (field: Field, extra?: string) =>
    [extra ?? "", fieldError?.field === field ? id(`${field}-error`) : ""].filter(Boolean).join(" ") || undefined;

  /** The email and key form: the page's main content, or folded away on a signed-in device whose plan lapsed. */
  function keyForm() {
    return (
      <form onSubmit={open} noValidate className="mt-5 space-y-4">
        <div>
          <label htmlFor={id("email")} className={LABEL_CLASS}>
            {COPY.emailLabel}
          </label>
          <input
            id={id("email")}
            ref={(el) => {
              inputs.current.email = el;
            }}
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={200}
            className={FIELD_CLASS}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFor("email");
            }}
            aria-invalid={fieldError?.field === "email" ? true : undefined}
            aria-describedby={describedBy("email")}
          />
          {fieldError?.field === "email" ? (
            <p id={id("email-error")} role="alert" className="tool-field-error mt-1.5">
              {fieldError.message}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={id("key")} className={LABEL_CLASS}>
            {COPY.keyLabel}
          </label>
          <input
            id={id("key")}
            ref={(el) => {
              inputs.current.key = el;
            }}
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={40}
            placeholder={COPY.keyPlaceholder}
            className={`${FIELD_CLASS} font-mono tracking-wide`}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              clearFor("key");
            }}
            aria-invalid={fieldError?.field === "key" ? true : undefined}
            aria-describedby={describedBy("key")}
          />
          {fieldError?.field === "key" ? (
            <p id={id("key-error")} role="alert" className="tool-field-error mt-1.5">
              {fieldError.message}
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="rounded-xl border border-[var(--danger-line)] bg-[var(--danger-tint)] px-4 py-3 text-[15px] font-bold leading-relaxed text-[var(--heading)]">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <button type="submit" className="button-primary w-full sm:w-auto" disabled={opening || busy === "send"} aria-busy={opening}>
            <KeyRound aria-hidden="true" className="h-4 w-4" />
            {opening ? COPY.opening : COPY.open}
            {!opening ? <ArrowRight aria-hidden="true" className="h-4 w-4" /> : null}
          </button>
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-2 text-[15px] font-extrabold text-[var(--blue)] underline underline-offset-4 disabled:opacity-60"
            onClick={() => void sendKey()}
            disabled={opening || busy === "send"}
            aria-busy={busy === "send"}
          >
            <Mail aria-hidden="true" className="h-4 w-4" />
            {busy === "send" ? COPY.sending : COPY.sendKey}
          </button>
        </div>

        <p role="status" className={sent ? "rounded-xl border border-[var(--green-line)] bg-[var(--green-tint)] px-4 py-3 text-[15px] leading-relaxed text-[var(--heading)]" : "sr-only"}>
          {sent ? COPY.sent : ""}
        </p>
      </form>
    );
  }

  return (
    <main className="cb-page pb-16">
      <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:pt-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={POST_CREATOR.path} className="inline-flex min-h-[44px] items-center gap-2 text-[18px] font-black text-[var(--heading)]">
            <PenLine aria-hidden="true" className="h-5 w-5 text-[var(--blue)]" />
            {POST_CREATOR.name}
          </Link>
          <span className="text-[14px] font-bold text-[var(--muted)]">{APP_COPY.byline}</span>
        </div>

        {claimNote ? (
          <p role="status" className="mt-4 rounded-xl border border-[var(--warn-line)] bg-[var(--warn-tint)] px-4 py-3 text-[15px] leading-relaxed text-[var(--heading)]">
            {claimNote}
          </p>
        ) : null}

        {lapsed ? (
          <section aria-labelledby={id("title")} className="mt-6 rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-4 shadow-[var(--cb-shadow)] sm:p-6">
            <h1 id={id("title")} className="text-[28px] font-black leading-tight tracking-[-0.02em] text-[var(--heading)] sm:text-[34px]">
              {lapsed.title}
            </h1>
            <p className="mt-2 text-[16px] leading-relaxed text-[var(--text)]">{lapsed.body}</p>
            <div className="mt-5">
              {reason === "past_due" && canManageBilling ? <BillingButton label={COPY.updateCard} className="button-primary" /> : null}
              {reason === "canceled" ? <BuyButtons salesOpen={salesOpen} closedMessage={closedMessage(aiOn, "locked")} /> : null}
            </div>
          </section>
        ) : reasonNote ? (
          <div className="mt-4 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-4 py-3">
            <p role="status" className="text-[15px] font-bold leading-relaxed text-[var(--heading)]">
              {reasonNote}
            </p>
          </div>
        ) : null}

        {lapsed ? (
          // Arriving from a checkout for a different account: the key form is what they came for, so it starts open.
          <details open={claim === "other_account"} className="group mt-6 rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-4 py-3 text-[15px] font-extrabold text-[var(--heading)] [&::-webkit-details-marker]:hidden">
              <KeyRound aria-hidden="true" className="h-4 w-4 flex-none text-[var(--blue)]" />
              <span className="flex-1">{COPY.otherAccount}</span>
              <ChevronDown aria-hidden="true" className="h-5 w-5 flex-none text-[var(--muted)] group-open:rotate-180 motion-safe:transition-transform" />
            </summary>
            <div className="border-t border-[var(--line)] px-4 pb-5 pt-1">{keyForm()}</div>
          </details>
        ) : (
          <section aria-labelledby={id("title")} className="mt-6 rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-4 shadow-[var(--cb-shadow)] sm:p-6">
            <h1 id={id("title")} className="text-[28px] font-black leading-tight tracking-[-0.02em] text-[var(--heading)] sm:text-[34px]">
              {COPY.title}
            </h1>
            <p className="mt-2 text-[16px] leading-relaxed text-[var(--muted)]">{COPY.body}</p>
            {keyForm()}
          </section>
        )}

        <div className="mt-6 space-y-1 text-[15px] leading-relaxed text-[var(--text)]">
          <p>
            {COPY.notBuyer}{" "}
            <Link href={`${POST_CREATOR.path}#pricing`} className="inline-flex min-h-[44px] items-center font-bold text-[var(--blue)] underline underline-offset-4">
              {COPY.seeAi}
            </Link>
          </p>
          <p>
            <Link href={POST_CREATOR.path} className="inline-flex min-h-[44px] items-center font-bold text-[var(--blue)] underline underline-offset-4">
              {COPY.useFree}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
