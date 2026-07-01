"use client";

import { useState, type FormEvent } from "react";

export function SalesRepSignalWaitlist({ source = "leadflow" }: { source?: string }) {
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    profileUrl: "",
    useCase: "",
    consent: false,
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.consent) {
      setStatus("Consent is required before joining the pilot.");
      return;
    }

    await fetch("/api/leadrep/handoff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        package_type: "sales_rep_signal",
        industry: "sales_operations",
        buyer_type: "opt_in_sales_rep_or_sales_team",
        source_url: form.profileUrl,
        urgency: "pilot",
        confidence_score: 50,
        requested_report: false,
        recurring_interest: false,
        payload_json: {
          event_type: "sales_rep_signal_waitlist",
          source,
          name: form.name,
          email: form.email,
          company: form.company,
          use_case: form.useCase,
          consent: form.consent,
        },
      }),
    }).catch(() => undefined);

    setStatus("Pilot request captured. This is waitlist only; no report is being sold.");
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Opt-in pilot</p>
      <h2 className="mt-2 text-2xl font-black text-slate-950">Join the Sales Rep Signal pilot.</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
        Self-submitted profile review only. This is not a background check, not a consumer report,
        not an employment decision tool, and not a hiring eligibility score.
      </p>
      <div className="mt-5 grid gap-3">
        <input className="field" required placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input className="field" required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input className="field" placeholder="Company or team" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
        <input className="field" required type="url" placeholder="Self-submitted LinkedIn, resume, or profile URL" value={form.profileUrl} onChange={(event) => setForm({ ...form, profileUrl: event.target.value })} />
        <textarea className="field min-h-24 resize-none" placeholder="What should the pilot help clarify?" value={form.useCase} onChange={(event) => setForm({ ...form, useCase: event.target.value })} />
        <label className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-700">
          <input required type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} />
          I am submitting my own profile or have permission to submit it for pilot review.
        </label>
        <button className="min-h-12 rounded-lg bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-cyan-700">
          Join Pilot
        </button>
        {status ? <p className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm font-bold text-cyan-950">{status}</p> : null}
      </div>
    </form>
  );
}
