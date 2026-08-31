"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clipboard, LoaderCircle, RotateCcw, Save, Send, SkipForward } from "lucide-react";

type Action = {
  id: string;
  channel: string;
  action_type: string;
  due_at: string;
  sequence_day: number;
  message_draft: string;
  status: string;
  human_approved: boolean;
};

function toLocalInput(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ProspectActionControls({
  action,
  complianceRequired,
  approvalBlockers,
}: {
  action: Action;
  complianceRequired: boolean;
  approvalBlockers: string[];
}) {
  const router = useRouter();
  const [messageDraft, setMessageDraft] = useState(action.message_draft);
  const [dueAt, setDueAt] = useState(toLocalInput(action.due_at));
  const [channel, setChannel] = useState(action.channel);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const closed = useMemo(
    () => ["sent", "skipped", "responded", "cancelled"].includes(action.status),
    [action.status],
  );

  async function mutate(operation: "save" | "approve" | "mark_sent" | "skip" | "reopen") {
    setBusy(operation);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/operator/outreach/${action.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation,
          messageDraft,
          dueAt: new Date(dueAt).toISOString(),
          channel,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not update this outreach action");
      setNotice(
        operation === "mark_sent"
          ? "Recorded as sent. OperatorOS did not send it."
          : operation === "approve"
            ? "Approved for a human to send."
            : operation === "skip"
              ? "Skipped and the next action was advanced."
              : operation === "reopen"
                ? "Reopened for editing and review."
                : "Draft saved. Approval was reset because the content changed.",
      );
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update this outreach action");
    } finally {
      setBusy(null);
    }
  }

  async function copyDraft() {
    await navigator.clipboard.writeText(messageDraft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-4">
      {complianceRequired && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-900">
          Compliance review required before approval. Confirm the claim, advertising, and professional-practice rules for this business before contact.
        </div>
      )}

      {approvalBlockers.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-900">
          <p className="font-black">Approval blocked until readiness is complete.</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 font-semibold">
            {approvalBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">
          Channel
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            disabled={closed}
            className="mt-1 w-full rounded-lg border border-[var(--line-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)]"
          >
            <option value="email">Email</option>
            <option value="dm">DM</option>
            <option value="phone">Phone</option>
            <option value="text">Text</option>
            <option value="email_or_dm">Email or DM</option>
            <option value="internal">Internal</option>
          </select>
        </label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">
          Due on your device
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            disabled={closed}
            className="mt-1 w-full rounded-lg border border-[var(--line-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text)]"
          />
        </label>
      </div>

      <label className="block text-xs font-black uppercase tracking-wide text-[var(--muted)]">
        Human-reviewed draft
        <textarea
          rows={8}
          maxLength={12000}
          value={messageDraft}
          onChange={(event) => setMessageDraft(event.target.value)}
          disabled={closed}
          className="mt-1 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 py-3 text-sm leading-6 text-[var(--text)] outline-none focus:border-[var(--blue)] disabled:bg-[var(--fill-2)]"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyDraft}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-white px-3 text-xs font-black text-[var(--text)]"
        >
          <Clipboard className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy draft"}
        </button>

        {!closed ? (
          <>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => mutate("save")}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-white px-3 text-xs font-black text-[var(--text)] disabled:opacity-50"
            >
              {busy === "save" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save edits
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || approvalBlockers.length > 0}
              onClick={() => mutate("approve")}
              title={approvalBlockers[0] || "Approve for a human-controlled send"}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-emerald-700 px-3 text-xs font-black text-white disabled:opacity-50"
            >
              {busy === "approve" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || approvalBlockers.length > 0 || !action.human_approved || action.status !== "approved"}
              onClick={() => mutate("mark_sent")}
              title={!action.human_approved ? "Approve the draft first" : "Record the message after a human sends it"}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-[var(--blue)] px-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "mark_sent" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Mark sent
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => mutate("skip")}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-800 disabled:opacity-50"
            >
              {busy === "skip" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <SkipForward className="h-3.5 w-3.5" />}
              Skip
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => mutate("reopen")}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-white px-3 text-xs font-black text-[var(--text)] disabled:opacity-50"
          >
            {busy === "reopen" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Reopen draft
          </button>
        )}
      </div>

      <p className="text-xs leading-5 text-[var(--muted)]">
        Approval authorizes a human-controlled next step. OperatorOS never sends this message from this screen.
      </p>
      {notice && (
        <p className={`rounded-lg border px-3 py-2 text-xs font-bold ${notice.includes("Could not") || notice.includes("Approve the draft") ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {notice}
        </p>
      )}
    </div>
  );
}
