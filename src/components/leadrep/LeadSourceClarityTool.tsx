"use client";

import { useMemo, useState, type FormEvent } from "react";

const spendRanges = ["Under $1k/mo", "$1k-$5k/mo", "$5k-$15k/mo", "$15k-$50k/mo", "$50k+/mo"];
const volumeRanges = ["Under 100 leads/mo", "100-500 leads/mo", "500-2,000 leads/mo", "2,000+ leads/mo"];
const campaignTypes = ["Meta ads", "Google search", "TikTok ads", "Lead vendor", "Affiliate", "SEO/content", "Mixed source"];

type FormState = {
  name: string;
  email: string;
  company: string;
  sourceUrl: string;
  campaignType: string;
  monthlySpend: string;
  leadVolume: string;
  problem: string;
  consent: boolean;
  recurringInterest: boolean;
};

const initialForm: FormState = {
  name: "",
  email: "",
  company: "",
  sourceUrl: "",
  campaignType: campaignTypes[0],
  monthlySpend: spendRanges[1],
  leadVolume: volumeRanges[1],
  problem: "",
  consent: false,
  recurringInterest: true,
};

function hasTracking(url: string) {
  return /utm_|fbclid|gclid|msclkid|ref=|source=/i.test(url);
}

function calculateScore(form: FormState) {
  let score = 46;
  if (form.sourceUrl.startsWith("https://")) score += 12;
  if (hasTracking(form.sourceUrl)) score += 12;
  if (form.campaignType && form.campaignType !== "Mixed source") score += 8;
  if (form.problem.length > 80) score += 10;
  if (form.monthlySpend.includes("$5k") || form.monthlySpend.includes("$15k") || form.monthlySpend.includes("$50k")) score += 6;
  if (form.leadVolume.includes("500") || form.leadVolume.includes("2,000")) score += 6;
  return Math.max(12, Math.min(96, score));
}

function riskFlags(form: FormState) {
  const flags = [];
  if (!form.sourceUrl.startsWith("https://")) flags.push("Source URL is missing HTTPS or has not been normalized.");
  if (!hasTracking(form.sourceUrl)) flags.push("No obvious campaign tracking parameter in the submitted URL.");
  if (form.campaignType === "Lead vendor" || form.campaignType === "Affiliate") {
    flags.push("Third-party source needs proof of origin, exclusivity, and consent path.");
  }
  if (form.problem.toLowerCase().includes("fake") || form.problem.toLowerCase().includes("fraud")) {
    flags.push("Buyer reported possible fraud indicator; source trail needs priority review.");
  }
  return flags.length ? flags : ["No hard fraud flag from the preview fields. Full audit still required."];
}

async function postHandoff(form: FormState, score: number, eventType: string) {
  await fetch("/api/leadrep/handoff", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      package_type: "leadsource_clarity",
      industry: "paid_lead_generation",
      buyer_type: "business_owner_or_marketer",
      source_url: form.sourceUrl,
      urgency: form.problem.toLowerCase().includes("fraud") ? "high" : "standard",
      budget_range: form.monthlySpend,
      confidence_score: score,
      requested_report: eventType === "request_full_audit",
      recurring_interest: form.recurringInterest,
      payload_json: {
        event_type: eventType,
        name: form.name,
        email: form.email,
        company: form.company,
        campaign_type: form.campaignType,
        lead_volume_range: form.leadVolume,
        problem_statement: form.problem,
        consent: form.consent,
      },
    }),
  });
}

export function LeadSourceClarityTool() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState("");
  const score = useMemo(() => calculateScore(form), [form]);
  const flags = useMemo(() => riskFlags(form), [form]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setStatus("Preview generated. Full audit request is approval-gated.");
    await postHandoff(form, score, "leadsource_preview_generated").catch(() => undefined);
  }

  async function requestAudit() {
    if (!form.consent) {
      setStatus("Check consent before requesting the full source audit.");
      return;
    }
    setStatus("Full Source Audit request captured. Ryan can review before any paid follow-up.");
    await postHandoff(form, score, "request_full_audit").catch(() => undefined);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">LeadSource Clarity Report</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Check whether the lead source makes sense.</h2>
        <div className="mt-5 grid gap-3">
          <input className="field" required placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className="field" required type="email" placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <input className="field" required placeholder="Company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
          <input className="field" required type="url" placeholder="Lead source URL" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="field font-bold" value={form.campaignType} onChange={(event) => setForm({ ...form, campaignType: event.target.value })}>
              {campaignTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="field font-bold" value={form.monthlySpend} onChange={(event) => setForm({ ...form, monthlySpend: event.target.value })}>
              {spendRanges.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <select className="field font-bold" value={form.leadVolume} onChange={(event) => setForm({ ...form, leadVolume: event.target.value })}>
            {volumeRanges.map((item) => <option key={item}>{item}</option>)}
          </select>
          <textarea className="field min-h-28 resize-none" required placeholder="Problem statement: what feels wrong or unclear about this lead source?" value={form.problem} onChange={(event) => setForm({ ...form, problem: event.target.value })} />
          <label className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-bold text-slate-600">
            Optional CSV upload placeholder
            <input className="mt-2 block w-full text-xs" type="file" accept=".csv" disabled />
          </label>
          <label className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-700">
            <input type="checkbox" checked={form.recurringInterest} onChange={(event) => setForm({ ...form, recurringInterest: event.target.checked })} />
            I want recurring Source Guardian monitoring if the source is worth watching.
          </label>
          <label className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-6 text-slate-700">
            <input required type="checkbox" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} />
            I consent to a lead-source review using the information I submit. No outbound action is authorized.
          </label>
          <button className="min-h-12 rounded-lg bg-slate-950 px-4 text-sm font-black uppercase tracking-wide text-white hover:bg-cyan-700">
            Generate Preview
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Output preview</p>
        <h2 className="mt-2 text-2xl font-black">Source clarity score</h2>
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-5">
          <div className="flex items-end justify-between gap-4">
            <strong className="text-6xl font-black">{score}</strong>
            <span className="pb-2 text-sm font-black uppercase tracking-wide text-cyan-100">preview only</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-300" style={{ width: `${score}%` }} />
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <PreviewBlock title="Fraud-risk flags" items={flags} />
          <PreviewBlock title="Geo-consistency check" items={["Placeholder: compare lead geography, ad targeting, landing page, and CRM origin once data is supplied."]} />
          <PreviewBlock title="Response-time benchmark" items={["Placeholder: compare reply speed against source, campaign type, and buyer follow-up window."]} />
          <PreviewBlock title="Recommended next action" items={[score >= 74 ? "Request the full source audit and package the source trail." : "Fix tracking gaps before scaling spend or buying more leads."]} />
        </div>
        <div className="mt-5 rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4">
          <p className="text-2xl font-black">$79</p>
          <p className="text-sm font-bold text-cyan-100">Request Full Source Audit</p>
          <p className="mt-1 text-xs font-semibold text-slate-300">Recurring upsell: Source Guardian $149/mo</p>
          <button type="button" onClick={requestAudit} className="mt-4 min-h-11 w-full rounded-lg bg-cyan-300 px-4 text-sm font-black uppercase tracking-wide text-slate-950 hover:bg-white">
            Request Full Source Audit
          </button>
        </div>
        {submitted || status ? <p className="mt-4 rounded-lg bg-white/10 p-3 text-sm font-bold text-cyan-50">{status}</p> : null}
      </section>
    </div>
  );
}

function PreviewBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <ul className="mt-2 space-y-1 text-sm font-semibold leading-6 text-slate-300">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}
