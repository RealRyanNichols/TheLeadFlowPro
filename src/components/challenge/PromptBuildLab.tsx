"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Globe2,
  Lightbulb,
  Send,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { VisitorIdField } from "@/components/site/VisitorIdField";
import { ChallengeInsightBuilder } from "@/components/challenge/ChallengeInsightBuilder";

const BUDGET_OPTIONS = [
  { value: "2000-5000", label: "$2K-$5K", body: "Prototype, workflow, or focused internal tool." },
  { value: "5000-10000", label: "$5K-$10K", body: "Serious build with setup, handoff, and training." },
  { value: "10000-plus", label: "$10K+", body: "Larger operating system or multi-part business tool." },
];

const STEPS = [
  {
    label: "Benchmark",
    title: "Start with what exists now.",
    body: "Give me the current business, website, and accounts. This becomes the benchmark we have to beat.",
    Icon: Globe2,
  },
  {
    label: "Leak",
    title: "Show me what keeps breaking.",
    body: "Name the repeated problem, missed lead, slow process, or owner headache that should not keep happening.",
    Icon: Lightbulb,
  },
  {
    label: "Tool",
    title: "Build the dream tool in plain English.",
    body: "Tell me what should happen automatically if this tool existed and the business finally worked right.",
    Icon: Wrench,
  },
  {
    label: "Send",
    title: "Send the buildout request to Ryan.",
    body: "Add your contact info, timeline, and budget range so Ryan can act on it instead of guessing.",
    Icon: Send,
  },
];

type LabValues = {
  businessName: string;
  businessUrl: string;
  industry: string;
  currentWebsiteNotes: string;
  toolProblem: string;
  currentProcess: string;
  toolName: string;
  businessImpact: string;
  fullName: string;
  email: string;
  phone: string;
  budgetTier: string;
  monthlyRevenueRange: string;
  timeline: string;
  bestContactMethod: string;
  acknowledgment: boolean;
};

const INITIAL_VALUES: LabValues = {
  businessName: "",
  businessUrl: "",
  industry: "",
  currentWebsiteNotes: "",
  toolProblem: "",
  currentProcess: "",
  toolName: "",
  businessImpact: "",
  fullName: "",
  email: "",
  phone: "",
  budgetTier: "2000-5000",
  monthlyRevenueRange: "10-50k",
  timeline: "now",
  bestContactMethod: "text",
  acknowledgment: false,
};

function emailLooksValid(email: string) {
  return /.+@.+\..+/.test(email.trim());
}

function preview(value: string, fallback: string, max = 118) {
  const clean = value.trim();
  if (!clean) return fallback;
  return clean.length > max ? `${clean.slice(0, max - 3)}...` : clean;
}

export function PromptBuildLab() {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<LabValues>(INITIAL_VALUES);
  const [error, setError] = useState<string | null>(null);

  const promptStack = useMemo(() => {
    return [
      "Prompt Build Lab request.",
      `Benchmark business: ${values.businessName || "not provided"}.`,
      `Current website/account: ${values.businessUrl || "not provided"}.`,
      `Industry: ${values.industry || "not provided"}.`,
      values.currentWebsiteNotes ? `Current site notes: ${values.currentWebsiteNotes}` : null,
      `Business leak: ${values.toolProblem || "not provided"}.`,
      values.currentProcess ? `Current process: ${values.currentProcess}` : null,
      `Dream tool: ${values.toolName || "not provided"}.`,
      values.businessImpact ? `Desired outcome: ${values.businessImpact}` : null,
      `Budget tier: ${values.budgetTier}.`,
      `Timeline: ${values.timeline}.`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [values]);

  function setValue<K extends keyof LabValues>(key: K, value: LabValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function validationFor(targetStep = step) {
    if (targetStep === 0 && !values.businessName.trim() && !values.businessUrl.trim()) {
      return "Start with either the business name or current website. Ryan needs a benchmark to beat.";
    }
    if (targetStep === 1 && !values.toolProblem.trim()) {
      return "Name the leak first. What is costing time, leads, sales, or control?";
    }
    if (targetStep === 2 && !values.toolName.trim()) {
      return "Give the tool a working name. It can be rough.";
    }
    if (targetStep === 3) {
      if (!values.fullName.trim()) return "Add your name so Ryan knows who sent it.";
      if (!emailLooksValid(values.email)) return "Add a real email so Ryan can follow up.";
      if (!values.acknowledgment) return "Check the final acknowledgment so the request is clear.";
    }
    return null;
  }

  function firstInvalidStep() {
    for (let index = 0; index < STEPS.length; index += 1) {
      const message = validationFor(index);
      if (message) return { index, message };
    }
    return null;
  }

  function nextStep() {
    const message = validationFor(step);
    if (message) {
      setError(message);
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function previousStep() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const invalid = firstInvalidStep();
    if (invalid) {
      event.preventDefault();
      setStep(invalid.index);
      setError(invalid.message);
    }
  }

  const active = STEPS[step];
  const ActiveIcon = active.Icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <form
      id="tool-challenge-form"
      action="/api/tool-challenge"
      method="POST"
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_28px_70px_-28px_rgba(15,23,42,0.38)] backdrop-blur"
    >
      <VisitorIdField />
      <input type="hidden" name="promptStack" value={promptStack} />

      <div className="border-b border-cyan-200/80 bg-gradient-to-r from-slate-950 via-brand-950 to-cyan-950 p-4 text-white sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" /> Prompt-to-build lab
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              One step at a time. Build the request as you go.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
              Start with the current website or business. Then the lab walks you into the leak,
              the dream tool, and the reason it is worth building.
            </p>
          </div>
          <div className="rounded-2xl border border-accent-300/25 bg-accent-300/10 px-4 py-3">
            <div className="text-2xl font-bold tabular-nums">Step {step + 1}</div>
            <div className="text-[10px] uppercase tracking-widest text-accent-100">
              of {STEPS.length}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-widest text-slate-300">
            <span>{active.label}</span>
            <span>{Math.round(progress)}% built</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-accent-300 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="p-4 sm:p-5">
          <div className="mb-4 rounded-3xl border border-cyan-200 bg-cyan-50/80 p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-cyan-200">
                <ActiveIcon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-slate-950">{active.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{active.body}</p>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-2xl border border-accent-300 bg-accent-50 p-3 text-sm font-semibold text-slate-900">
              {error}
            </div>
          ) : null}

          <div className={step === 0 ? "grid gap-3" : "hidden"}>
            <div className="grid gap-3 sm:grid-cols-2">
              <LabField
                name="businessName"
                label="Business name"
                placeholder="Company, brand, practice, dealership, ministry..."
                value={values.businessName}
                onChange={(value) => setValue("businessName", value)}
              />
              <LabField
                name="businessUrl"
                label="Current website or main profile"
                placeholder="https://yourwebsite.com or social profile"
                value={values.businessUrl}
                onChange={(value) => setValue("businessUrl", value)}
              />
            </div>
            <LabField
              name="industry"
              label="What kind of business is this?"
              placeholder="Attorney, doctor, dealership, real estate, music artist, local service..."
              value={values.industry}
              onChange={(value) => setValue("industry", value)}
            />
            <LabArea
              name="currentWebsiteNotes"
              label="What should Ryan notice first?"
              placeholder="Example: The site looks decent but does not capture leads. The Facebook page gets attention, but nobody follows up. We have traffic, but no dashboard showing what turns into money."
              value={values.currentWebsiteNotes}
              onChange={(value) => setValue("currentWebsiteNotes", value)}
              rows={4}
            />
          </div>

          <div className={step === 1 ? "grid gap-3" : "hidden"}>
            <LabArea
              name="toolProblem"
              label="What problem should this tool solve?"
              placeholder="Example: We miss calls, lose DMs, forget follow-up, manually build quotes, cannot tell which ads create buyers, or answer the same question all day."
              value={values.toolProblem}
              onChange={(value) => setValue("toolProblem", value)}
              rows={5}
            />
            <LabArea
              name="currentProcess"
              label="How are you stuck doing it now?"
              placeholder="Example: Spreadsheets, screenshots, sticky notes, texts, too many apps, one employee's memory, no owner view, no reminders, no source tracking."
              value={values.currentProcess}
              onChange={(value) => setValue("currentProcess", value)}
              rows={4}
            />
          </div>

          <div className={step === 2 ? "grid gap-4" : "hidden"}>
            <LabField
              name="toolName"
              label="Give the tool a rough name"
              placeholder="Missed-call machine, owner dashboard, quote builder, client portal, content engine..."
              value={values.toolName}
              onChange={(value) => setValue("toolName", value)}
            />
            <LabArea
              name="businessImpact"
              label="If this existed, what would your business look like?"
              placeholder="Example: Every lead gets tagged, texted, followed up with, routed to the right offer, shown on my dashboard, and reminded until someone buys, books, or says no."
              value={values.businessImpact}
              onChange={(value) => setValue("businessImpact", value)}
              rows={5}
            />
            <ChallengeInsightBuilder compact />
          </div>

          <div className={step === 3 ? "grid gap-4" : "hidden"}>
            <div className="rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
                <ClipboardList className="h-4 w-4" />
                Ryan gets this stack
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-cyan-200 bg-white p-3 text-xs leading-relaxed text-slate-700">
                {promptStack}
              </pre>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <LabField
                name="fullName"
                label="Your name"
                placeholder="First and last"
                value={values.fullName}
                onChange={(value) => setValue("fullName", value)}
              />
              <LabField
                name="email"
                type="email"
                label="Email"
                placeholder="you@business.com"
                value={values.email}
                onChange={(value) => setValue("email", value)}
              />
              <LabField
                name="phone"
                label="Phone"
                placeholder="+1 903 000 0000"
                value={values.phone}
                onChange={(value) => setValue("phone", value)}
              />
              <LabSelect
                name="bestContactMethod"
                label="Best follow-up"
                value={values.bestContactMethod}
                onChange={(value) => setValue("bestContactMethod", value)}
                options={[
                  ["text", "Text me"],
                  ["email", "Email me"],
                  ["call", "Call me"],
                ]}
              />
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-slate-800">
                If you like the direction, what budget range makes sense?
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {BUDGET_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm has-[:checked]:border-cyan-500 has-[:checked]:bg-cyan-50"
                  >
                    <input
                      type="radio"
                      name="budgetTier"
                      value={option.value}
                      checked={values.budgetTier === option.value}
                      onChange={() => setValue("budgetTier", option.value)}
                      className="sr-only"
                    />
                    <span className="block font-semibold text-slate-950">{option.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">{option.body}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <LabSelect
                name="monthlyRevenueRange"
                label="Business size"
                value={values.monthlyRevenueRange}
                onChange={(value) => setValue("monthlyRevenueRange", value)}
                options={[
                  ["under-10k", "Under $10K/mo"],
                  ["10-50k", "$10K-$50K/mo"],
                  ["50-250k", "$50K-$250K/mo"],
                  ["250k-plus", "$250K+/mo"],
                ]}
              />
              <LabSelect
                name="timeline"
                label="How soon do you need it?"
                value={values.timeline}
                onChange={(value) => setValue("timeline", value)}
                options={[
                  ["now", "Now"],
                  ["30-days", "Next 30 days"],
                  ["60-90-days", "60-90 days"],
                  ["planning", "Planning"],
                ]}
              />
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <input
                type="checkbox"
                name="acknowledgment"
                value="yes"
                checked={values.acknowledgment}
                onChange={(event) => setValue("acknowledgment", event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span>
                I understand this is a free business tool submission, not a guarantee. Ryan may
                propose a paid build, working session, phased prototype, or the optional $250
                build-slot deposit.
              </span>
            </label>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={previousStep}
              disabled={step === 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
              >
                Continue to {STEPS[step + 1].label} <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600"
              >
                Submit the challenge <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <aside className="border-t border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-white to-accent-50 p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="sticky top-24">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700">
              <Bot className="h-3.5 w-3.5" /> Watch it stack
            </div>
            <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
              The clearer the prompt, the stronger the build.
            </h3>
            <div className="mt-4 grid gap-3">
              <StackCard
                Icon={Building2}
                label="Benchmark"
                value={preview(
                  [values.businessName, values.businessUrl].filter(Boolean).join(" / "),
                  "Add the current site or business we have to beat.",
                )}
                complete={Boolean(values.businessName.trim() || values.businessUrl.trim())}
              />
              <StackCard
                Icon={Lightbulb}
                label="Leak"
                value={preview(values.toolProblem, "Name the repeated problem or missed money.")}
                complete={Boolean(values.toolProblem.trim())}
              />
              <StackCard
                Icon={Wrench}
                label="Dream tool"
                value={preview(values.toolName, "Give the tool a working name.")}
                complete={Boolean(values.toolName.trim())}
              />
              <StackCard
                Icon={UserRound}
                label="Handoff"
                value={preview(values.fullName || values.email, "Add contact info so Ryan can move.")}
                complete={Boolean(values.fullName.trim() && emailLooksValid(values.email))}
              />
            </div>

            <div className="mt-4 rounded-3xl border border-accent-200 bg-white/80 p-4 text-sm leading-relaxed text-slate-700">
              <strong className="text-slate-950">Step 1 matters.</strong> Your website and current
              setup give Ryan the starting line. The build has to outperform that baseline, not just
              look impressive.
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}

function LabField({
  name,
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  name: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function LabArea({
  name,
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
}: {
  name: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <textarea
        name={name}
        rows={rows}
        maxLength={1800}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function LabSelect({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="block min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function StackCard({
  Icon,
  label,
  value,
  complete,
}: {
  Icon: typeof Building2;
  label: string;
  value: string;
  complete: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            complete ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {complete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">{label}</div>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{value}</p>
        </div>
      </div>
    </div>
  );
}
