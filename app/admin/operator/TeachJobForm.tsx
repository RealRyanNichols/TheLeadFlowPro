"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, LoaderCircle, WandSparkles } from "lucide-react";

const inputClass =
  "mt-1 w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 py-2.5 text-sm text-[var(--heading)] outline-none transition focus:border-[var(--blue)] focus:ring-2 focus:ring-[var(--accent-tint)]";

export default function TeachJobForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());

    try {
      const response = await fetch("/api/admin/operator/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not install the skill");
      event.currentTarget.reset();
      setMessage("Skill installed. Its worker is waiting for a controlled first run.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not install the skill");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.05)]">
      <div className="flex items-center gap-2">
        <WandSparkles className="h-5 w-5 text-[var(--blue)]" aria-hidden="true" />
        <h3 className="font-black text-[var(--heading)]">Teach My Job</h3>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Describe a repetitive job once. OperatorOS stores the trigger, procedure, finish line, provider, and stopline.
      </p>

      <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-bold text-[var(--heading)]">
          Job name
          <input className={inputClass} name="name" required maxLength={120} placeholder="New customer intake" />
        </label>
        <label className="text-sm font-bold text-[var(--heading)]">
          AI worker
          <select className={inputClass} name="provider" defaultValue="openai">
            <option value="openai">ChatGPT</option>
            <option value="anthropic">Claude</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[var(--heading)] md:col-span-2">
          What starts this job?
          <textarea className={inputClass} name="trigger" required rows={2} placeholder="A new diagnostic or lead enters the CRM." />
        </label>
        <label className="text-sm font-bold text-[var(--heading)] md:col-span-2">
          Exact steps
          <textarea className={inputClass} name="steps" required rows={7} placeholder={"1. Check for a duplicate.\n2. Review the request.\n3. Classify the next action.\n4. Route any external action to approval."} />
        </label>
        <label className="text-sm font-bold text-[var(--heading)] md:col-span-2">
          The job is finished when
          <textarea className={inputClass} name="finishWhen" required rows={3} placeholder="The CRM record has a priority, owner, and documented next action." />
        </label>
        <label className="text-sm font-bold text-[var(--heading)]">
          Default risk lane
          <select className={inputClass} name="riskLevel" defaultValue="yellow">
            <option value="green">Green: internal analysis only</option>
            <option value="yellow">Yellow: review before an external action</option>
            <option value="red">Red: consequential action</option>
          </select>
        </label>
        <label className="text-sm font-bold text-[var(--heading)]">
          Short description
          <input className={inputClass} name="description" maxLength={1000} placeholder="Qualifies and routes new inquiries." />
        </label>
        <label className="text-sm font-bold text-[var(--heading)] md:col-span-2">
          Forbidden actions
          <textarea className={inputClass} name="forbidden" rows={3} placeholder="Send messages, change pricing, issue refunds, delete records" />
        </label>
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <p className="inline-flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
            <Bot className="h-4 w-4 text-[var(--blue)]" aria-hidden="true" />
            Installed skills do nothing until an admin explicitly runs them.
          </p>
          <button type="submit" disabled={busy} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <WandSparkles className="h-4 w-4" aria-hidden="true" />}
            Install skill and worker
          </button>
        </div>
      </form>
      {message && (
        <p className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${message.startsWith("Skill installed") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {message}
        </p>
      )}
    </section>
  );
}
