"use client";

import { useMemo, useState, type FormEvent } from "react";

type SignalForm = {
  name: string;
  email: string;
  company: string;
  profileUrl: string;
  useCase: string;
  consent: boolean;
};

const initialForm: SignalForm = {
  name: "",
  email: "",
  company: "",
  profileUrl: "",
  useCase: "",
  consent: false,
};

function scoreProfile(form: SignalForm) {
  let score = 38;
  if (form.profileUrl.startsWith("https://")) score += 12;
  if (/linkedin|resume|portfolio|profile/i.test(form.profileUrl)) score += 14;
  if (form.company.trim().length > 2) score += 8;
  if (form.useCase.trim().length > 40) score += 10;
  if (form.consent) score += 10;
  return Math.max(15, Math.min(94, score));
}

function proofNotes(form: SignalForm) {
  const notes = [];
  if (!form.profileUrl.startsWith("https://")) notes.push("Profile URL needs a secure public or consented source.");
  if (!/linkedin|resume|portfolio|profile/i.test(form.profileUrl)) notes.push("Submitted URL should point to a self-owned profile, resume, portfolio, or LinkedIn page.");
  if (/hire|hiring|employment|background|consumer report/i.test(form.useCase)) {
    notes.push("Employment decision use is blocked. This pilot is for opt-in sales profile organization only.");
  }
  if (!form.consent) notes.push("Consent is required before any pilot review can start.");
  return notes.length ? notes : ["Consent and source basics are present. Human review is still required before any package is used."];
}

export function SalesRepSignalWaitlist({ source = "leadflow" }: { source?: string }) {
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<SignalForm>(initialForm);
  const score = useMemo(() => scoreProfile(form), [form]);
  const notes = useMemo(() => proofNotes(form), [form]);

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
        urgency: /hire|hiring|employment|background|consumer report/i.test(form.useCase) ? "blocked_use_case" : "pilot",
        confidence_score: score,
        requested_report: false,
        recurring_interest: false,
        payload_json: {
          event_type: "sales_rep_signal_profile_preview",
          source,
          name: form.name,
          email: form.email,
          company: form.company,
          use_case: form.useCase,
          signal_score: score,
          proof_notes: notes,
          consent: form.consent,
          compliance_boundary: "opt_in_only_not_background_check_not_consumer_report_not_employment_decision_tool",
        },
      }),
    }).catch(() => undefined);

    setStatus("Pilot request captured. This is an opt-in signal preview only; no employment report is being sold.");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Opt-in signal profile</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Build a Sales Rep Signal preview.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Self-submitted profile review only. This is not a background check, not a consumer report,
          not an employment decision tool, and not a hiring eligibility score.
        </p>
        <div className="mt-5 grid gap-3">
          <input className="field" required placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className="field" required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <input className="field" placeholder="Company or team" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
          <input className="field" required type="url" placeholder="Self-submitted LinkedIn, resume, portfolio, or profile URL" value={form.profileUrl} onChange={(event) => setForm({ ...form, profileUrl: event.target.value })} />
          <textarea className="field min-h-24 resize-none" placeholder="What should the pilot help clarify? No hiring, screening, or background-check use." value={form.useCase} onChange={(event) => setForm({ ...form, useCase: event.target.value })} />
          <label className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-700">
            <input required type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} />
            I am submitting my own profile or have permission to submit it for opt-in pilot review.
          </label>
          <button className="min-h-12 rounded-lg bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-cyan-700">
            Join Pilot
          </button>
          {status ? <p className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm font-bold text-cyan-950">{status}</p> : null}
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Output preview</p>
        <h2 className="mt-2 text-2xl font-black">Sales Rep Signal score</h2>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-5">
          <div className="flex items-end justify-between gap-4">
            <strong className="text-6xl font-black">{score}</strong>
            <span className="pb-2 text-sm font-black uppercase tracking-wide text-cyan-100">pilot only</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-300" style={{ width: `${score}%` }} />
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <SignalBlock title="Consent/source check" items={notes} />
          <SignalBlock title="Proof package placeholder" items={["Self-submitted URL, stated use case, and consent are packaged for human review before any pilot action."]} />
          <SignalBlock title="Compliance boundary" items={["Not for hiring eligibility, employment screening, tenant screening, credit, insurance, background checks, or consumer-report use."]} />
          <SignalBlock title="Recommended next action" items={[score >= 74 ? "Join the pilot with a clean opt-in profile packet." : "Add a stronger public profile URL and a clearer consented use case before review."]} />
        </div>
      </section>
    </div>
  );
}

function SignalBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <ul className="mt-2 space-y-1 text-sm font-semibold leading-6 text-slate-300">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
