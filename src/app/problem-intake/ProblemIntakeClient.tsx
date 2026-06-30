"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck
} from "lucide-react";
import {
  BUDGET_RANGES,
  CONTACT_PREFERENCES,
  INTERESTS,
  PROBLEM_CATEGORIES,
  REQUEST_TYPES,
  URGENCIES,
  estimateAdultInterest,
  labelFor
} from "@/lib/adult-interest-intake";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  companyName: string;
  requestType: string;
  problemCategories: string[];
  interests: string[];
  urgency: string;
  budgetRange: string;
  preferredContact: string;
  problemStatement: string;
  desiredOutcome: string;
  activeSearches: string;
  sourceContext: string;
  adultConfirmed: boolean;
  consentAccepted: boolean;
  sensitiveDataAcknowledged: boolean;
};

const initialState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  companyName: "",
  requestType: "find_solution",
  problemCategories: ["find_customers", "ai_automation"],
  interests: ["software_ai", "marketing_sales"],
  urgency: "this_week",
  budgetRange: "unknown",
  preferredContact: "email",
  problemStatement: "",
  desiredOutcome: "",
  activeSearches: "",
  sourceContext: "",
  adultConfirmed: false,
  consentAccepted: false,
  sensitiveDataAcknowledged: false
};

export function ProblemIntakeClient() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<null | { id: string; leadScore: number }>(null);

  const score = useMemo(
    () =>
      estimateAdultInterest({
        ...form,
        consentAccepted: true,
        sensitiveDataAcknowledged: true
      }),
    [form]
  );

  function setValue<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleArray(key: "problemCategories" | "interests", value: string) {
    setForm((current) => {
      const active = current[key].includes(value);
      const next = active
        ? current[key].filter((item) => item !== value)
        : [...current[key], value];
      return { ...current, [key]: next };
    });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...form,
        consentAccepted: true,
        sensitiveDataAcknowledged: true
      };
      const res = await fetch("/api/problem-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the signal.");
      setSuccess({ id: data.intake.id, leadScore: data.intake.leadScore });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the signal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="signal-page py-10 md:py-16">
      <div className="container">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
          <div className="space-y-8">
            <div className="signal-hero-grid">
              <div>
                <div className="signal-eyebrow">
                  <UserCheck className="h-4 w-4" />
                  Signal, not noise
                </div>
                <h1 className="mt-5 max-w-4xl text-4xl font-extrabold leading-tight text-white md:text-6xl">
                  Stop asking safe questions. Find the buying signal.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-ink-100 md:text-lg">
                  The intake should feel like a private decision console: pressure,
                  search behavior, timing, budget, and what would make someone act.
                  That is the data worth scoring, matching, and selling.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <SignalMetric value={score.leadScore.toString()} label="live signal score" tone="lead" />
                  <SignalMetric value={form.problemCategories.length.toString()} label="pressure tags" tone="cyan" />
                  <SignalMetric value={form.interests.length.toString()} label="interest lanes" tone="accent" />
                </div>
              </div>
              <SignalMap score={score} />
            </div>

            <PressureRail />

            <form onSubmit={submit} className="space-y-8">
              <BuilderSection
                icon={Sparkles}
                eyebrow="Start here"
                title="Why are you really here?"
                body="Pick the closest truth. Not the perfect answer. The closest one."
              >
                <OptionGrid>
                  {REQUEST_TYPES.map((item) => (
                    <RadioCard
                      key={item.id}
                      title={item.label}
                      body={item.description}
                      active={form.requestType === item.id}
                      onClick={() => setValue("requestType", item.id)}
                    />
                  ))}
                </OptionGrid>
              </BuilderSection>

              <BuilderSection
                icon={Target}
                eyebrow="Pressure"
                title="What is costing you right now?"
                body="Choose what is actually creating pressure. If it is annoying, expensive, confusing, or overdue, it belongs here."
              >
                <OptionGrid>
                  {PROBLEM_CATEGORIES.map((item) => (
                    <OptionButton
                      key={item.id}
                      title={item.label}
                      body={item.description}
                      active={form.problemCategories.includes(item.id)}
                      onClick={() => toggleArray("problemCategories", item.id)}
                    />
                  ))}
                </OptionGrid>
              </BuilderSection>

              <BuilderSection
                icon={Radar}
                eyebrow="Pattern"
                title="What do you keep paying attention to?"
                body="Interest is not what someone says once. It is what they keep clicking, saving, watching, comparing, and coming back to."
              >
                <OptionGrid>
                  {INTERESTS.map((item) => (
                    <OptionButton
                      key={item.id}
                      title={item.label}
                      body={item.description}
                      active={form.interests.includes(item.id)}
                      onClick={() => toggleArray("interests", item.id)}
                    />
                  ))}
                </OptionGrid>
              </BuilderSection>

              <BuilderSection
                icon={ShieldCheck}
                eyebrow="Intent"
                title="How hot is this?"
                body="Timing and money tell the truth. Curiosity is one thing. Pain with budget is another."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <SelectField
                    label="Urgency"
                    value={form.urgency}
                    onChange={(value) => setValue("urgency", value)}
                    options={URGENCIES}
                  />
                  <SelectField
                    label="Budget comfort"
                    value={form.budgetRange}
                    onChange={(value) => setValue("budgetRange", value)}
                    options={BUDGET_RANGES}
                  />
                  <SelectField
                    label="Preferred contact"
                    value={form.preferredContact}
                    onChange={(value) => setValue("preferredContact", value)}
                    options={CONTACT_PREFERENCES}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Name"
                    value={form.fullName}
                    onChange={(value) => setValue("fullName", value)}
                    required
                    placeholder="Your name"
                  />
                  <TextField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) => setValue("email", value)}
                    required
                    placeholder="you@example.com"
                  />
                  <TextField
                    label="Phone"
                    value={form.phone}
                    onChange={(value) => setValue("phone", value)}
                    placeholder="Only if you want a text or call"
                  />
                  <TextField
                    label="Business, project, or situation"
                    value={form.companyName}
                    onChange={(value) => setValue("companyName", value)}
                    placeholder="Optional, but useful"
                  />
                </div>

                <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-ink-200">
                  <input
                    type="checkbox"
                    checked={form.adultConfirmed}
                    onChange={(e) => setValue("adultConfirmed", e.target.checked)}
                    required
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-ink-950 text-lead-400 focus:ring-lead-400"
                  />
                  <span>
                    I am 18 or older. Do not paste minors' information, private
                    addresses, medical details, bank data, passwords, or anything
                    you would not want reviewed for a relevant match.
                  </span>
                </label>
              </BuilderSection>

              <BuilderSection
                icon={LockKeyhole}
                eyebrow="Say it plain"
                title="Now say the quiet part"
                body="This is where the signal lives. The useful answer is usually specific, emotional, and a little uncomfortable."
              >
                <div className="grid gap-4">
                  <TextArea
                    label="What is the thing you actually want solved?"
                    value={form.problemStatement}
                    onChange={(value) => setValue("problemStatement", value)}
                    required
                    placeholder="Example: I keep losing customers because I do not know who is ready to buy, who is wasting my time, or who needs what I sell right now."
                  />
                  <TextArea
                    label="What would be worth paying for?"
                    value={form.desiredOutcome}
                    onChange={(value) => setValue("desiredOutcome", value)}
                    required
                    placeholder="Example: A short list of people or businesses with a clear reason they fit, what problem they likely have, and the best way to reach them."
                  />
                  <TextArea
                    label="What have you searched, clicked, saved, compared, asked about, or almost bought?"
                    value={form.activeSearches}
                    onChange={(value) => setValue("activeSearches", value)}
                    placeholder="Example: CRM tools, missed-call text-back, local roofing companies, AI appointment setters, ecommerce stores with weak follow-up."
                  />
                  <TextArea
                    label="What should we ignore because it is noise?"
                    value={form.sourceContext}
                    onChange={(value) => setValue("sourceContext", value)}
                    placeholder="Example: Do not send me generic lists, personal addresses, dead emails, students, tire-kickers, or people with no reason to care."
                  />
                </div>
              </BuilderSection>

              {error ? (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-ink-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="rounded-lg border border-lead-400/30 bg-lead-400/10 p-5">
                  <p className="flex items-center gap-2 text-base font-bold text-white">
                    <CheckCircle2 className="h-5 w-5 text-lead-400" />
                    Signal captured
                  </p>
                  <p className="mt-2 text-sm text-ink-200">
                    Intake ID: <span className="font-mono text-cyan-300">{success.id}</span>.
                    Lead score: {success.leadScore}/100. Next step: separate the real
                    buying signal from the noise and match it to the right list, source,
                    offer, or recommendation.
                  </p>
                </div>
              ) : null}

              <div className="space-y-3">
                <p className="max-w-2xl text-xs leading-5 text-ink-400">
                  By submitting, you are choosing to send these answers to The LeadFlow Pro
                  so they can be scored, reviewed, and routed toward relevant matches,
                  recommendations, lists, offers, or follow-up.
                </p>
                <button type="submit" disabled={submitting} className="btn-accent w-full text-base md:w-auto">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {submitting ? "Reading the signal..." : "Find the signal"}
                </button>
              </div>
            </form>
          </div>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <ScorePanel form={form} score={score} />
          </aside>
        </div>
      </div>
    </section>
  );
}

function SignalMetric({
  value,
  label,
  tone
}: {
  value: string;
  label: string;
  tone: "lead" | "cyan" | "accent";
}) {
  const toneClass =
    tone === "lead" ? "text-lead-400" : tone === "cyan" ? "text-cyan-300" : "text-accent-300";

  return (
    <div className="lead-panel min-h-24 p-4">
      <p className={["text-3xl font-extrabold", toneClass].join(" ")}>{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
    </div>
  );
}

function PressureRail() {
  const rows = [
    {
      n: "01",
      title: "What hurts?",
      body: "Time, money, customers, confidence, status, clarity, or momentum.",
      tone: "text-lead-400"
    },
    {
      n: "02",
      title: "What keeps getting searched?",
      body: "Tools, providers, comparisons, watched offers, saved posts, and almost-buys.",
      tone: "text-cyan-300"
    },
    {
      n: "03",
      title: "What would move money or action?",
      body: "A better list, clearer answer, trusted provider, useful price, or clean next step.",
      tone: "text-accent-300"
    }
  ];

  return (
    <div className="signal-pressure-rail">
      {rows.map((row) => (
        <div key={row.n} className="signal-pressure-row">
          <div className={["signal-index", row.tone].join(" ")}>{row.n}</div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-white">{row.title}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-300">{row.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SignalMap({
  score
}: {
  score: ReturnType<typeof estimateAdultInterest>;
}) {
  const nodes = [
    { label: "Pain", className: "left-[12%] top-[16%] h-20 w-20 border-cyan-400/70 bg-cyan-400/15" },
    { label: "Intent", className: "right-[12%] top-[14%] h-24 w-24 border-lead-400/70 bg-lead-400/15" },
    { label: "Budget", className: "left-[35%] top-[38%] h-28 w-28 border-accent-400/70 bg-accent-400/15" },
    { label: "Risk", className: "left-[12%] bottom-[20%] h-16 w-16 border-red-400/70 bg-red-400/15" },
    { label: "Route", className: "right-[14%] bottom-[19%] h-20 w-20 border-cyan-300/70 bg-cyan-300/15" }
  ];

  return (
    <div className="signal-map signal-map-grid">
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Profile fit engine</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">Live signal map</h2>
        </div>
        <div className="rounded-lg border border-lead-400/30 bg-lead-400/10 px-4 py-3 text-right">
          <p className="text-3xl font-extrabold text-lead-400">{score.leadScore}</p>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">score</p>
        </div>
      </div>

      <div className="absolute inset-x-4 top-24 h-64 rounded-lg border border-white/10 bg-black/20" />
      {nodes.map((node) => (
        <div key={node.label} className={["signal-node", node.className].join(" ")}>
          {node.label}
        </div>
      ))}

      <div className="absolute inset-x-4 bottom-4 space-y-2">
        {score.notes.slice(0, 3).map((note, index) => (
          <div key={note} className="grid min-h-12 grid-cols-[0.35rem_1fr_2.5rem] items-center gap-3 rounded-lg border border-white/10 bg-[#070a10]/90 p-3 text-sm">
            <span className={index === 0 ? "h-8 rounded-full bg-lead-400" : index === 1 ? "h-8 rounded-full bg-cyan-300" : "h-8 rounded-full bg-accent-300"} />
            <span className="min-w-0 text-ink-100">{note}</span>
            <span className="font-extrabold text-lead-400">{Math.max(72, score.leadScore - index * 6)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuilderSection({
  icon: Icon,
  eyebrow,
  title,
  body,
  children
}: {
  icon: typeof Radar;
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="lead-panel-strong overflow-hidden p-5 md:p-6">
      <div className="signal-section-head">
        <div className="signal-section-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-300">{eyebrow}</p>
          <h2 className="mt-1 text-2xl font-extrabold leading-tight text-white md:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-300">{body}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function OptionGrid({ children }: { children: React.ReactNode }) {
  return <div className="lead-option-grid">{children}</div>;
}

function OptionButton({
  title,
  body,
  active,
  onClick
}: {
  title: string;
  body: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "signal-choice",
        active ? "signal-choice-active" : "signal-choice-idle"
      ].join(" ")}
    >
      <span className="relative flex min-w-0 items-center gap-2 break-words text-base font-bold text-white">
        {active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-lead-400" /> : <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" />}
        {title}
      </span>
      <span className="relative mt-2 block text-sm leading-6 text-ink-300">{body}</span>
    </button>
  );
}

function RadioCard({
  title,
  body,
  active,
  onClick
}: {
  title: string;
  body: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "signal-choice",
        active ? "border-accent-400/60 bg-accent-400/10 shadow-lg shadow-black/20 before:bg-accent-400" : "signal-choice-idle"
      ].join(" ")}
    >
      <span className="relative flex min-w-0 items-center gap-2 break-words text-base font-bold text-white">
        {active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-300" /> : <span className="h-5 w-5 shrink-0 rounded-full border border-white/20" />}
        {title}
      </span>
      <span className="relative mt-2 block text-sm leading-6 text-ink-300">{body}</span>
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="lead-control mt-1 w-full"
      >
        {options.map((item) => (
          <option key={item.id} value={item.id} className="bg-ink-950">
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-300">
        <span>{label}</span>
        <span className={required ? "text-cyan-300" : "text-ink-500"}>
          {required ? "Required" : "Optional"}
        </span>
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="lead-control mt-1 w-full"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-300">
        <span>{label}</span>
        <span className={required ? "text-cyan-300" : "text-ink-500"}>
          {required ? "Required" : "Optional"}
        </span>
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        rows={4}
        className="lead-control mt-1 w-full resize-y leading-6"
      />
    </label>
  );
}

function ScorePanel({
  form,
  score
}: {
  form: FormState;
  score: ReturnType<typeof estimateAdultInterest>;
}) {
  return (
    <div className="space-y-4">
      <div className="signal-score-panel">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
          Signal strength
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-5xl font-extrabold text-white">{score.leadScore}</p>
            <p className="mt-1 text-sm text-ink-400">{score.segment}</p>
          </div>
          <div className="rounded-lg border border-lead-400/30 bg-lead-400/10 px-3 py-2 text-sm font-bold text-lead-400">
            {form.adultConfirmed ? "18+ confirmed" : "Confirm 18+"}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <ScoreBar label="Problem fit" value={score.problemFitScore} />
          <ScoreBar label="Intent" value={score.intentScore} />
          <ScoreBar label="Contact path" value={score.contactScore} />
          <ScoreBar label="Boundary" value={score.complianceScore} />
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-[#05080d]/70 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <LockKeyhole className="h-4 w-4 text-lead-400" />
            Keep it usable
          </p>
          <p className="mt-2 text-xs leading-5 text-ink-300">
            Give the problem, motive, timing, and search behavior. Leave out minors,
            protected traits, private addresses, medical details, and financial accounts.
          </p>
        </div>
      </div>

      <div className="lead-panel p-5">
        <h3 className="font-bold text-white">What we heard</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <SummaryRow label="Request" value={labelFor(REQUEST_TYPES, form.requestType)} />
          <SummaryRow label="Problems" value={form.problemCategories.map((id) => labelFor(PROBLEM_CATEGORIES, id)).join(", ")} />
          <SummaryRow label="Interests" value={form.interests.map((id) => labelFor(INTERESTS, id)).join(", ")} />
          <SummaryRow label="Urgency" value={labelFor(URGENCIES, form.urgency)} />
          <SummaryRow label="Budget" value={labelFor(BUDGET_RANGES, form.budgetRange)} />
          <SummaryRow label="Contact" value={labelFor(CONTACT_PREFERENCES, form.preferredContact)} />
        </dl>
      </div>

      <div className="lead-panel p-5">
        <h3 className="font-bold text-white">What matters</h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-200">
          {score.notes.map((note) => (
            <li key={note} className="flex gap-2">
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>

      <Link href="/data-marketplace" className="btn-ghost w-full text-sm">
        See marketplace options
      </Link>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold text-ink-200">{label}</span>
        <span className="text-ink-400">{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-accent-400"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-1 break-words text-ink-100">{value || "Not selected"}</dd>
    </div>
  );
}
