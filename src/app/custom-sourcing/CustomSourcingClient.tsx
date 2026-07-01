"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import { cn } from "@/lib/utils";

type FormState = {
  industry: string;
  vertical: string;
  leadType: string;
  buyerType: string;
  geography: string;
  sourcePreference: string;
  offer: string;
  targetCustomer: string;
  problemSolved: string;
  idealLead: string;
  badFitLead: string;
  urgency: string;
  desiredFields: string[];
  intendedUse: string[];
  budgetRange: string;
  desiredVolume: string;
  accessPreference: string;
  timeline: string;
  sampleFirst: boolean;
  notes: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  consentToContact: boolean;
  reviewGatedAccepted: boolean;
};

const initialForm: FormState = {
  industry: "",
  vertical: "",
  leadType: "",
  buyerType: "",
  geography: "",
  sourcePreference: "",
  offer: "",
  targetCustomer: "",
  problemSolved: "",
  idealLead: "",
  badFitLead: "",
  urgency: "",
  desiredFields: ["business_name", "website", "category", "location", "public_source_proof"],
  intendedUse: ["outreach"],
  budgetRange: "$1,500 to $5,000",
  desiredVolume: "",
  accessPreference: "shared",
  timeline: "this month",
  sampleFirst: true,
  notes: "",
  name: "",
  email: "",
  phone: "",
  company: "",
  website: "",
  consentToContact: false,
  reviewGatedAccepted: false,
};

const steps = [
  "Demand",
  "Offer",
  "Data",
  "Use",
  "Budget",
  "Contact",
] as const;

const desiredFieldOptions = [
  ["name", "Name"],
  ["business_name", "Business name"],
  ["website", "Website"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["category", "Category"],
  ["location", "Location"],
  ["buyer_intent", "Buyer intent"],
  ["public_source_proof", "Public source proof"],
  ["budget_range", "Budget range"],
  ["contact_route", "Contact route"],
  ["other", "Other"],
] as const;

const intendedUseOptions = [
  ["outreach", "Outreach"],
  ["ads", "Ads"],
  ["crm_enrichment", "CRM enrichment"],
  ["research", "Research"],
  ["sales_team", "Sales team"],
  ["market_analysis", "Market analysis"],
  ["internal_planning", "Internal planning"],
  ["other", "Other"],
] as const;

function fieldLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function CustomSourcingClient() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<null | {
    requestId: string;
    persisted: boolean;
    feasibility?: { score: number; label: string; reasons: string[]; warnings: string[]; nextAction: string };
    message: string;
  }>(null);
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);

  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);

  useEffect(() => {
    trackLeadFlowEvent("custom_sourcing_page_viewed", {
      route: "/custom-sourcing",
      user_role: "anonymous",
      status: "viewed",
    });
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleArray(key: "desiredFields" | "intendedUse", value: string) {
    setForm((current) => {
      const existing = current[key];
      return {
        ...current,
        [key]: existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value],
      };
    });
  }

  function next() {
    if (!started) {
      setStarted(true);
      trackLeadFlowEvent("custom_sourcing_started", {
        route: "/custom-sourcing",
        step_number: step + 1,
        status: "started",
      });
    }
    setError("");
    setStep((current) => Math.min(steps.length - 1, current + 1));
  }

  async function submit() {
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/leadflow/custom-sourcing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          sourcePath: `${window.location.pathname}${window.location.search}`,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Custom sourcing request failed.");
      trackLeadFlowEvent("custom_sourcing_submitted", {
        route: "/custom-sourcing",
        vertical: form.vertical,
        category: form.leadType,
        status: payload.persisted ? "stored" : "placeholder",
        score_range: payload.feasibility?.score >= 80 ? "high" : payload.feasibility?.score >= 60 ? "medium" : "low",
      });
      setResult(payload);
      setStep(steps.length - 1);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Custom sourcing request failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="custom-sourcing-form" className="container grid gap-6 py-12 md:py-16 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="lead-shell overflow-hidden">
        <div className="border-b border-white/10 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Start Custom Sourcing Request</p>
              <h2 className="mt-2 text-2xl font-black text-white md:text-4xl">Tell us what signal pack should exist.</h2>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink-200">
              {progress}% complete
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-accent-300 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {steps.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  "min-h-9 rounded-lg border px-2 text-xs font-extrabold uppercase tracking-wider transition",
                  index === step ? "border-cyan-300/50 bg-cyan-300/12 text-white" : "border-white/10 bg-white/[0.035] text-ink-300 hover:text-white",
                )}
              >
                {index + 1}. {item}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 md:p-6">
          {result ? (
            <SuccessState result={result} />
          ) : (
            <>
              {step === 0 ? <StepDemand form={form} update={update} /> : null}
              {step === 1 ? <StepOffer form={form} update={update} /> : null}
              {step === 2 ? <StepData form={form} toggleArray={toggleArray} /> : null}
              {step === 3 ? <StepUse form={form} toggleArray={toggleArray} /> : null}
              {step === 4 ? <StepBudget form={form} update={update} /> : null}
              {step === 5 ? <StepContact form={form} update={update} /> : null}
            </>
          )}

          {error ? (
            <div className="mt-5 rounded-lg border border-red-300/35 bg-red-300/10 p-3 text-sm leading-6 text-red-100">
              {error}
            </div>
          ) : null}

          {!result ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || pending} className="btn-ghost justify-center text-sm disabled:cursor-not-allowed disabled:opacity-45">
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              {step < steps.length - 1 ? (
                <button type="button" onClick={next} className="btn-accent justify-center text-sm">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={pending || !form.consentToContact || !form.reviewGatedAccepted} className="btn-accent justify-center text-sm disabled:cursor-not-allowed disabled:opacity-45">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Submit for review
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <aside className="grid gap-5 self-start xl:sticky xl:top-24">
        <div className="lead-shell p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Review-gated</p>
          <h2 className="mt-2 text-xl font-black text-white">A request is not a promise of availability.</h2>
          <p className="mt-3 text-sm leading-6 text-ink-300">
            We review source proof, permission, suppression, allowed use, buyer fit, budget, and compliance risk before quoting or building a product.
          </p>
        </div>
        <div className="lead-shell p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Blocked data</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-300">
            <li>No hacked or leaked data.</li>
            <li>No minors.</li>
            <li>No private financial or medical data.</li>
            <li>No protected-trait targeting.</li>
            <li>No individual political persuasion profiles.</li>
          </ul>
        </div>
        <div className="lead-shell p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-lead-300">What can happen next</p>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-ink-300">
            <span>1. Feasibility review</span>
            <span>2. Quote or more-info request</span>
            <span>3. Product Factory draft</span>
            <span>4. Sample or marketplace listing</span>
          </div>
        </div>
      </aside>
    </section>
  );
}

function StepDemand({ form, update }: { form: FormState; update: <K extends keyof FormState>(key: K, value: FormState[K]) => void }) {
  return (
    <StepShell kicker="Step 1" title="What kind of leads or signals do you want?">
      <Grid>
        <Input label="Industry" value={form.industry} onChange={(value) => update("industry", value)} placeholder="Home services, ecommerce, mortgage, SaaS" />
        <Input label="Vertical" value={form.vertical} onChange={(value) => update("vertical", value)} placeholder="Contractor leads, vendor signals, refi education" />
        <Input label="Lead type" value={form.leadType} onChange={(value) => update("leadType", value)} placeholder="Weak websites, vendor lists, buyer intent" />
        <Input label="Buyer type" value={form.buyerType} onChange={(value) => update("buyerType", value)} placeholder="Agency, operator, lender, SaaS team" />
        <Input label="Geography" value={form.geography} onChange={(value) => update("geography", value)} placeholder="East Texas, national, Dallas, county" />
        <Input label="Source preference" value={form.sourcePreference} onChange={(value) => update("sourcePreference", value)} placeholder="Public directories, submitted lists, partner-owned audience" />
      </Grid>
    </StepShell>
  );
}

function StepOffer({ form, update }: { form: FormState; update: <K extends keyof FormState>(key: K, value: FormState[K]) => void }) {
  return (
    <StepShell kicker="Step 2" title="What are you trying to sell or solve?">
      <Grid>
        <Textarea label="Offer" value={form.offer} onChange={(value) => update("offer", value)} placeholder="What do you sell into this demand?" />
        <Textarea label="Target customer" value={form.targetCustomer} onChange={(value) => update("targetCustomer", value)} placeholder="Who should be in this signal pack?" />
        <Textarea label="Problem solved" value={form.problemSolved} onChange={(value) => update("problemSolved", value)} placeholder="What pain or missed revenue does this solve?" />
        <Textarea label="Ideal lead" value={form.idealLead} onChange={(value) => update("idealLead", value)} placeholder="What makes someone a strong fit?" />
        <Textarea label="Bad fit lead" value={form.badFitLead} onChange={(value) => update("badFitLead", value)} placeholder="Who should be excluded?" />
        <Input label="Urgency" value={form.urgency} onChange={(value) => update("urgency", value)} placeholder="ASAP, this week, this month, planning" />
      </Grid>
    </StepShell>
  );
}

function StepData({ form, toggleArray }: { form: FormState; toggleArray: (key: "desiredFields" | "intendedUse", value: string) => void }) {
  return (
    <StepShell kicker="Step 3" title="What data matters?">
      <CheckboxGrid options={desiredFieldOptions} selected={form.desiredFields} onToggle={(value) => toggleArray("desiredFields", value)} />
    </StepShell>
  );
}

function StepUse({ form, toggleArray }: { form: FormState; toggleArray: (key: "desiredFields" | "intendedUse", value: string) => void }) {
  return (
    <StepShell kicker="Step 4" title="How will you use it?">
      <CheckboxGrid options={intendedUseOptions} selected={form.intendedUse} onToggle={(value) => toggleArray("intendedUse", value)} />
    </StepShell>
  );
}

function StepBudget({ form, update }: { form: FormState; update: <K extends keyof FormState>(key: K, value: FormState[K]) => void }) {
  return (
    <StepShell kicker="Step 5" title="Budget, volume, and access shape.">
      <Grid>
        <Input label="Budget range" value={form.budgetRange} onChange={(value) => update("budgetRange", value)} placeholder="$1,500 to $5,000" />
        <Input label="Desired volume" value={form.desiredVolume} onChange={(value) => update("desiredVolume", value)} placeholder="100, 500, 5,000, sample first" />
        <Select label="Exclusive or shared" value={form.accessPreference} onChange={(value) => update("accessPreference", value)} options={[["shared", "Shared"], ["limited_seats", "Limited seats"], ["exclusive", "Exclusive"], ["exclusive_geo", "Exclusive territory"]]} />
        <Select label="Timeline" value={form.timeline} onChange={(value) => update("timeline", value)} options={[["this week", "This week"], ["this month", "This month"], ["30 to 60 days", "30 to 60 days"], ["planning", "Planning"]] } />
        <Select label="Sample first" value={form.sampleFirst ? "yes" : "no"} onChange={(value) => update("sampleFirst", value === "yes")} options={[["yes", "Yes"], ["no", "No"]]} />
        <Textarea label="Notes" value={form.notes} onChange={(value) => update("notes", value)} placeholder="Add constraints, industries to exclude, known sources, or territory details." />
      </Grid>
    </StepShell>
  );
}

function StepContact({ form, update }: { form: FormState; update: <K extends keyof FormState>(key: K, value: FormState[K]) => void }) {
  return (
    <StepShell kicker="Step 6" title="Contact and consent.">
      <Grid>
        <Input label="Name" value={form.name} onChange={(value) => update("name", value)} placeholder="Your name" />
        <Input label="Email" value={form.email} onChange={(value) => update("email", value)} placeholder="you@company.com" type="email" />
        <Input label="Phone" value={form.phone} onChange={(value) => update("phone", value)} placeholder="Optional" />
        <Input label="Company" value={form.company} onChange={(value) => update("company", value)} placeholder="Company name" />
        <Input label="Website" value={form.website} onChange={(value) => update("website", value)} placeholder="https://example.com" />
      </Grid>
      <div className="mt-5 grid gap-3">
        <ConsentCheck checked={form.consentToContact} onChange={(value) => update("consentToContact", value)} label="I agree that LeadFlow Pro may contact me about this custom sourcing request." />
        <ConsentCheck checked={form.reviewGatedAccepted} onChange={(value) => update("reviewGatedAccepted", value)} label="I understand custom sourcing is review-gated and not all requests become paid or available products." />
      </div>
    </StepShell>
  );
}

function SuccessState({ result }: { result: NonNullable<ReturnType<typeof useState<null | { requestId: string; persisted: boolean; feasibility?: { score: number; label: string; reasons: string[]; warnings: string[]; nextAction: string }; message: string }>>[0]> }) {
  return (
    <div className="rounded-xl border border-lead-300/30 bg-lead-300/10 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-lead-300/35 bg-lead-300/10 text-lead-100">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-lead-200">Submitted</p>
          <h3 className="mt-2 text-2xl font-black text-white">Your custom sourcing request is in review.</h3>
          <p className="mt-3 text-sm leading-6 text-lead-50">{result.message}</p>
          {result.feasibility ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Signal label="Feasibility" value={`${result.feasibility.score}/100`} />
              <Signal label="Label" value={result.feasibility.label} />
            </div>
          ) : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/buyer/custom-requests" className="btn-accent justify-center text-sm">View buyer history</Link>
            <Link href="/marketplace" className="btn-ghost justify-center text-sm">Back to marketplace</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepShell({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">{kicker}</p>
      <h3 className="mt-2 text-2xl font-black text-white">{title}</h3>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-300">{label}</span>
      <input value={value} type={type} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-600 focus:border-cyan-300/60" />
    </label>
  );
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-300">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-ink-600 focus:border-cyan-300/60" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<readonly [string, string]> }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-300">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60">
        {options.map(([optionValue, labelText]) => <option key={optionValue} value={optionValue}>{labelText}</option>)}
      </select>
    </label>
  );
}

function CheckboxGrid({ options, selected, onToggle }: { options: readonly (readonly [string, string])[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {options.map(([value, label]) => {
        const active = selected.includes(value);
        return (
          <button key={value} type="button" onClick={() => onToggle(value)} className={cn("min-h-12 rounded-lg border px-3 text-left text-sm font-bold transition", active ? "border-cyan-300/45 bg-cyan-300/12 text-white" : "border-white/10 bg-white/[0.035] text-ink-300 hover:text-white")}>
            <span className="inline-flex items-center gap-2">
              {active ? <CheckCircle2 className="h-4 w-4 text-cyan-300" /> : <span className="h-4 w-4 rounded border border-white/20" />}
              {label || fieldLabel(value)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ConsentCheck({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-200">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/65 p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
