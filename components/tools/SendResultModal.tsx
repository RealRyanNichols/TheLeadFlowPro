"use client";

// The one form in the toolbox.
//
// What changed and why:
//   - It used to be dark navy panel with the site's near-black type on it, which
//     the light rebuild left unreadable. It uses the same surfaces as every other
//     panel on the site now, so it cannot drift again.
//   - It used to demand a name, a phone number and an email to download a text
//     file. Downloading is free now. This only opens for the two actions that
//     genuinely need somewhere to send something.
//   - It used to say "Unlock All 78 Tools", which was not true, because the tools
//     were never locked. The button now says what the button does.
//   - Marketing consent used to be ticked on arrival. Both consents start
//     unticked and neither is bundled into the submit.

import { useEffect, useId, useRef, useState } from "react";
import { Mail, Code2, X, Check, AlertCircle } from "lucide-react";
import { useToolProfile } from "./useToolProfile";
import { trackTool } from "@/lib/tools/analytics";

export type SendReason = "email" | "embed";

const COPY: Record<SendReason, { title: string; lead: string; submit: string; done: string }> = {
  email: {
    title: "Email my result",
    lead: "Tell me where to send it and your result is in your inbox in a minute. You can still download it right now without giving me anything.",
    submit: "Email my result",
    done: "Sent. Check your inbox.",
  },
  embed: {
    title: "Get the embed code",
    lead: "I will send you the one line of code plus how to paste it into your site. The tool stays free, I host it, and it does not expire.",
    submit: "Send me the embed code",
    done: "Sent. The code is below as well.",
  },
};

export default function SendResultModal({
  open,
  onClose,
  onSuccess,
  toolName,
  toolSlug,
  reason,
  resultText,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  toolName: string;
  toolSlug: string;
  reason: SendReason;
  resultText: string;
}) {
  const { profile, save } = useToolProfile();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const emailErrId = useId();

  const copy = COPY[reason];

  // Remember what had focus so it can go back there on close. Losing your place
  // in the page after a dialog closes is one of the worst keyboard experiences.
  useEffect(() => {
    if (open) returnFocusTo.current = document.activeElement as HTMLElement | null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setError(null);
    setEmailError(null);
    const t = setTimeout(() => emailRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open, reason]);

  function handleClose() {
    onClose();
    // Put the caret back on the button that opened this. Escape has to go
    // through here too, or closing with the keyboard drops focus onto the body
    // and the next Tab starts again from the top of the page.
    setTimeout(() => returnFocusTo.current?.focus(), 0);
  }

  // Escape closes, Tab stays inside.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        setTimeout(() => returnFocusTo.current?.focus(), 0);
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  // The page behind a dialog must not scroll, on desktop or on a phone.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setEmailError("That does not look like an email address. Check it and try again.");
      emailRef.current?.focus();
      return;
    }
    setEmailError(null);
    setSending(true);
    setError(null);

    const fullName = String(form.get("full_name") || "").trim();
    const business = String(form.get("business_name") || "").trim();
    const phone = String(form.get("phone") || "").trim();

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The leads API requires a name. When somebody chose not to give one,
          // send the honest placeholder rather than inventing a person.
          full_name: fullName || "Free tool user",
          email,
          phone: phone || null,
          business_name: business || null,
          interest: "unsure",
          goals: `Free tool: ${toolName}. Asked for the ${reason === "email" ? "result by email" : "embed code"}.`,
          marketing_email_consent: form.get("marketing_email_consent") === "on",
          sms_consent: form.get("sms_consent") === "on",
          utm_source: "tools",
          utm_medium: "toolbox",
          utm_campaign: toolSlug,
          diagnostic: {
            version: 2,
            source: "free_tools",
            tool: toolSlug,
            tool_name: toolName,
            action: reason,
            // The result they asked for, so the follow-up can reference it.
            result_preview: resultText.slice(0, 4000),
            next_action: `Used the ${toolName}. Ask what number surprised them.`,
          },
        }),
      });
      if (!res.ok) throw new Error("bad response");
    } catch {
      setError(
        "Could not reach the server. Nothing is lost, your result is still on screen and the download button works.",
      );
      setSending(false);
      return;
    }

    save({ email, name: fullName || undefined, business: business || undefined });
    trackTool(reason === "email" ? "tool_result_emailed" : "embed_requested", { slug: toolSlug, reason });
    setSending(false);
    setDone(true);
    onSuccess();
    setTimeout(handleClose, 1200);
  }

  if (!open) return null;

  return (
    <div className="tool-modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div
        ref={dialogRef}
        className="tool-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <button type="button" onClick={handleClose} aria-label="Close this dialog" className="tool-modal-close">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3">
          <span className="tool-modal-icon" aria-hidden="true">
            {reason === "email" ? <Mail className="h-5 w-5" /> : <Code2 className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-xl font-black leading-tight text-[var(--heading)]">
              {copy.title}
            </h2>
            <p className="text-sm font-bold text-[var(--blue)]">{toolName}</p>
          </div>
        </div>

        <p id={descId} className="mt-4 text-sm leading-relaxed text-[var(--text)]">
          {copy.lead}
        </p>

        {done ? (
          <p className="mt-6 flex items-center gap-2 rounded-xl border border-[var(--green-line)] bg-[var(--green-tint)] px-4 py-3 text-sm font-bold text-[var(--green)]">
            <Check aria-hidden="true" className="h-4 w-4" />
            {copy.done}
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="form-field sm:col-span-2">
              <span>
                Email address <span className="text-[var(--danger)]">(required)</span>
              </span>
              <input
                ref={emailRef}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={200}
                defaultValue={profile?.email || ""}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? emailErrId : undefined}
                onChange={() => emailError && setEmailError(null)}
              />
              {emailError && (
                <span id={emailErrId} role="alert" className="tool-field-error">
                  <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
                  {emailError}
                </span>
              )}
            </label>

            <label className="form-field">
              <span>Your name (optional)</span>
              <input name="full_name" maxLength={200} autoComplete="name" defaultValue={profile?.name || ""} />
            </label>
            <label className="form-field">
              <span>Business name (optional)</span>
              <input
                name="business_name"
                maxLength={200}
                autoComplete="organization"
                defaultValue={profile?.business || ""}
              />
            </label>
            <label className="form-field sm:col-span-2">
              <span>Phone (optional, only if you want a call)</span>
              <input name="phone" type="tel" inputMode="tel" maxLength={50} autoComplete="tel" />
            </label>

            <fieldset className="tool-consent sm:col-span-2">
              <legend>Two separate choices. Both are off unless you turn them on.</legend>
              <label>
                <input type="checkbox" name="marketing_email_consent" />
                <span>Email me when new free tools go up. Unsubscribe any time.</span>
              </label>
              <label>
                <input type="checkbox" name="sms_consent" />
                <span>
                  You can text me at the number above. Message and data rates may apply, reply STOP to stop.
                </span>
              </label>
            </fieldset>

            {error && (
              <p role="alert" className="tool-modal-error sm:col-span-2">
                <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <button type="submit" className="button-primary sm:col-span-2" disabled={sending}>
              {sending ? "Sending..." : copy.submit}
            </button>
            <p className="sm:col-span-2 text-center text-[11px] leading-relaxed text-[var(--quiet)]">
              Your email is used to send what you asked for. It is not sold or passed on. You will hear
              from a person, not a sequence.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
