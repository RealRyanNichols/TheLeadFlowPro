"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";

interface Props {
  initial: {
    inboundPhone: string;
    forwardToPhone: string;
    missedCallReply: string;
    missedCallEnabled: boolean;
    missedCallFollowup: boolean;
  };
  origin: string;          // e.g. https://theleadflowpro.com — for webhook URL preview
  userId: string;
  formKey: string | null;
}

export function MissedCallForm({ initial, origin, userId, formKey }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState(initial);

  const webhookBase = `${origin}/api/inbound/twilio/${userId}`;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        const res = await fetch("/api/missed-call/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setError(data?.reason ?? "Couldn't save. Try again?");
          return;
        }
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError("Network hiccup — your settings didn't save. Try again?");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="glass rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white">LeadFlow phone number</h2>
        <p className="text-sm text-ink-300 mt-1">
          Paste the Twilio/LeadFlow number you publish. Calls here forward to your cell
          — and if you miss it, we fire the auto-text.
        </p>
        <input
          type="tel"
          value={state.inboundPhone}
          onChange={(e) => setState({ ...state, inboundPhone: e.target.value })}
          placeholder="+1 555 555 5555"
          className="mt-3 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
        />
        <p className="text-[11px] text-ink-400 mt-2">
          In Twilio, set Voice webhook to:
          <br />
          <code className="text-cyan-300 break-all">{webhookBase}/voice</code>
          <br />
          and Messaging webhook to:
          <br />
          <code className="text-cyan-300 break-all">{webhookBase}/sms</code>
        </p>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">Forward calls to</h2>
        <p className="text-sm text-ink-300 mt-1">
          Your real cell number. We ring it first — if you don't answer in ~20 seconds, the
          text fires automatically.
        </p>
        <input
          type="tel"
          value={state.forwardToPhone}
          onChange={(e) => setState({ ...state, forwardToPhone: e.target.value })}
          placeholder="+1 555 555 5555"
          className="mt-3 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none"
        />
      </div>

      <div>
        <h2 className="text-lg font-bold text-white">Auto-reply message</h2>
        <p className="text-sm text-ink-300 mt-1">
          Use <code className="text-cyan-300">{`{{first_name}}`}</code> and{" "}
          <code className="text-cyan-300">{`{{business}}`}</code> to personalize.
        </p>
        <textarea
          rows={4}
          value={state.missedCallReply}
          onChange={(e) => setState({ ...state, missedCallReply: e.target.value })}
          className="mt-3 w-full bg-ink-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none resize-none"
        />
        <button
          type="button"
          disabled
          className="mt-2 btn-ghost text-xs py-2 px-3 inline-flex opacity-60 cursor-not-allowed"
          title="Coming soon — Flo will rewrite your template"
        >
          <Wand2 className="h-3.5 w-3.5" /> Rewrite with Flo (soon)
        </button>
      </div>

      <div>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={state.missedCallEnabled}
            onChange={(e) => setState({ ...state, missedCallEnabled: e.target.checked })}
          />
          Fire the auto-text on missed calls
        </label>
      </div>

      <div>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={state.missedCallFollowup}
            onChange={(e) => setState({ ...state, missedCallFollowup: e.target.checked })}
          />
          Follow up 4 hours later if they don't reply
        </label>
      </div>

      {formKey && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4">
          <p className="text-xs font-semibold text-white">Your public lead form endpoint</p>
          <p className="text-[11px] text-ink-400 mt-1">
            POST JSON or form data to this URL — every submit creates a lead in your inbox.
          </p>
          <code className="block mt-2 text-cyan-300 break-all text-xs">
            {origin}/api/inbound/form/{formKey}
          </code>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg bg-lead-500/10 border border-lead-500/30 p-3 text-xs text-lead-300">
          Saved. New calls will use these settings.
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
        <button type="button" className="btn-ghost text-sm py-2 px-4" onClick={() => setState(initial)} disabled={pending}>
          Reset
        </button>
        <button type="submit" className="btn-primary text-sm py-2 px-4" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
