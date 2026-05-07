"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Send } from "lucide-react";

export function ClientUpdateForm({ orderId }: { orderId: string }) {
  const [message, setMessage] = useState("");
  const [links, setLinks] = useState("");
  const [category, setCategory] = useState("intake");
  const [urgency, setUrgency] = useState("normal");
  const [contactPreference, setContactPreference] = useState("office");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");

    try {
      const res = await fetch(`/api/dashboard/work-orders/${orderId}/client-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, links, category, urgency, contactPreference }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Ryan did not receive that update. Try again.");
      }
      setMessage("");
      setLinks("");
      setCategory("intake");
      setUrgency("normal");
      setContactPreference("office");
      setStatus("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ryan did not receive that update. Try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-cyan-300" />
        <h2 className="text-base font-bold text-white">Send an update to Ryan</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">
        Use this for account links, files, Drive folders, screenshots, call notes, or decisions.
        It goes into the work order and moves intake/waiting items back to Ryan review.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <SelectField
          label="Update type"
          value={category}
          onChange={setCategory}
          options={[
            ["intake", "Intake / context"],
            ["files", "Files / links"],
            ["decision", "Decision needed"],
            ["approval", "Approval / feedback"],
            ["proof", "Proof / analytics"],
          ]}
        />
        <SelectField
          label="Urgency"
          value={urgency}
          onChange={setUrgency}
          options={[
            ["normal", "Normal"],
            ["today", "Needs eyes today"],
            ["blocked", "Blocking the work"],
          ]}
        />
        <SelectField
          label="Best response"
          value={contactPreference}
          onChange={setContactPreference}
          options={[
            ["office", "Reply here"],
            ["email", "Email me"],
            ["text", "Text me"],
            ["call", "Call me"],
          ]}
        />
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          Message
        </span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          placeholder="Ryan, here are the handles, files, and the decision I need..."
          className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-3 text-sm text-white outline-none ring-0 placeholder:text-ink-500 focus:border-cyan-400"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
          Links or file locations
        </span>
        <textarea
          value={links}
          onChange={(event) => setLinks(event.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Google Drive folder, social links, Loom, Dropbox, website, etc."
          className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-3 text-sm text-white outline-none ring-0 placeholder:text-ink-500 focus:border-cyan-400"
        />
      </label>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={status === "saving"}
          className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "saving" ? "Sending..." : "Send to Ryan for review"}
          <Send className="h-4 w-4" />
        </button>
        {status === "saved" && (
          <p className="text-sm font-semibold text-cyan-200">Sent. The order is back in Ryan's review queue.</p>
        )}
        {status === "error" && (
          <p className="text-sm font-semibold text-rose-200">{error}</p>
        )}
      </div>
    </form>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/70 px-3 py-3 text-sm text-white outline-none focus:border-cyan-400"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
