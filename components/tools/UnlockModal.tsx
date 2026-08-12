"use client";

// The trade: the tools are free to use with no signup. Saving your results and
// taking the embed code costs a name, a phone and an email. One time, all 70+
// tools, forever.

import { useState } from "react";
import { Lock, X, Check } from "lucide-react";
import { useUnlock } from "./useUnlock";

export default function UnlockModal({
  open,
  onClose,
  toolName,
  toolSlug,
  reason,
  toolCount,
}: {
  open: boolean;
  onClose: () => void;
  toolName: string;
  toolSlug: string;
  reason: "download" | "embed";
  toolCount: number;
}) {
  const { unlock } = useUnlock();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("full_name") || "");
    const phone = String(form.get("phone") || "");

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email: form.get("email"),
          phone,
          business_name: form.get("business_name") || null,
          interest: "unsure",
          goals: `FREE TOOLBOX UNLOCK via ${toolName} (${reason}).`,
          marketing_email_consent: form.get("marketing_email_consent") === "on",
          sms_consent: form.get("sms_consent") === "on",
          utm_source: "tools",
          utm_medium: "toolbox",
          utm_campaign: toolSlug,
          diagnostic: {
            version: 1,
            source: "free_toolbox",
            tool: toolSlug,
            tool_name: toolName,
            unlock_reason: reason,
            next_action: `Used the ${toolName}. Ask what number surprised them.`,
          },
        }),
      });
      if (!res.ok) throw new Error("bad response");
    } catch {
      // Their access does not depend on our server being up. Never trap someone
      // behind a failed request on a free tool.
      setError("Could not reach our server, but your access is unlocked anyway.");
      unlock(fullName);
      setSending(false);
      setTimeout(onClose, 1400);
      return;
    }

    unlock(fullName);
    setSending(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Unlock the free toolbox"
    >
      <div className="relative my-auto w-full max-w-lg rounded-2xl border border-sky-400/30 bg-[#12213a] p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/40 bg-sky-400/10 text-xl">
            <Lock className="h-5 w-5 text-sky-300" />
          </span>
          <div>
            <h2 className="text-xl font-black leading-tight text-white">
              {reason === "download" ? "Save your results" : "Get the embed code"}
            </h2>
            <p className="text-sm font-semibold text-sky-300">
              One form. All {toolCount} tools. Forever.
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          The tools stay free to use with no signup. Downloading your results and
          taking the embed code costs you one thing: tell me who you are. Do it
          once and every tool in the toolbox is unlocked on this browser from now
          on.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="form-field">
            <span>Your name *</span>
            <input name="full_name" required maxLength={200} autoComplete="name" />
          </label>
          <label className="form-field">
            <span>Phone *</span>
            <input name="phone" required maxLength={50} type="tel" autoComplete="tel" />
          </label>
          <label className="form-field sm:col-span-2">
            <span>Email *</span>
            <input name="email" required maxLength={200} type="email" autoComplete="email" />
          </label>
          <label className="form-field sm:col-span-2">
            <span>Business name</span>
            <input name="business_name" maxLength={200} autoComplete="organization" />
          </label>

          <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-400 sm:col-span-2">
            <input type="checkbox" name="marketing_email_consent" defaultChecked className="mt-0.5" />
            <span>Email me when new free tools drop. Unsubscribe any time.</span>
          </label>
          <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-400 sm:col-span-2">
            <input type="checkbox" name="sms_consent" className="mt-0.5" />
            <span>
              You can text me too. Message and data rates may apply, reply STOP to
              stop.
            </span>
          </label>

          {error && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200 sm:col-span-2">
              {error}
            </p>
          )}

          <button type="submit" className="button-primary sm:col-span-2" disabled={sending}>
            {sending ? "Unlocking..." : `Unlock All ${toolCount} Tools`}
            {!sending && <Check aria-hidden="true" className="h-4 w-4" />}
          </button>
          <p className="text-center text-[11px] text-slate-500 sm:col-span-2">
            No spam, no reselling your info, no 40 emails a week. You will hear
            from a person.
          </p>
        </form>
      </div>
    </div>
  );
}
