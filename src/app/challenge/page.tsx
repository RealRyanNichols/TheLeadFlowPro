import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  Brain,
  CheckCircle2,
  ClipboardList,
  Code2,
  KeyRound,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { VisitorIdField } from "@/components/site/VisitorIdField";

export const metadata: Metadata = {
  title: "Stump Ryan With a Business Tool — The LeadFlow Pro",
  description:
    "Challenge Ryan Nichols to build the tool your business needs. If he builds it and you like it, you buy it and own it.",
  openGraph: {
    title: "Stump Ryan With a Business Tool",
    description:
      "Tell Ryan the tool that would change the way your business runs. If he builds it and you like it, you buy it and own it.",
    images: ["/images/stump-me-tool-challenge-poster.jpg"],
  },
};

const BUILD_TARGETS = [
  "Lead follow-up systems",
  "Client portals",
  "Internal dashboards",
  "Quote calculators",
  "Content workflows",
  "CRM automations",
  "Booking flows",
  "Document generators",
  "Ops trackers",
  "Sales scripts and tools",
];

const OWNERSHIP_POINTS = [
  {
    Icon: KeyRound,
    title: "Your accounts",
    body: "The tool is built around your business, your logins, your data, and your process.",
  },
  {
    Icon: LockKeyhole,
    title: "Your control",
    body: "The goal is to put the system in your hands so you are not trapped by an agency.",
  },
  {
    Icon: BadgeDollarSign,
    title: "No percentage grab",
    body: "You pay for the build and setup. Your leads, ads, automations, and sales process stay yours.",
  },
];

const BUDGET_OPTIONS = [
  { value: "2000-5000", label: "$2K-$5K", body: "Prototype, workflow, or focused internal tool." },
  { value: "5000-10000", label: "$5K-$10K", body: "Serious build with setup, handoff, and training." },
  { value: "10000-plus", label: "$10K+", body: "Larger operating system or multi-part business tool." },
];

export default function ChallengePage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/challenge" />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 36%, #eef9ff 70%, #f3eaff 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute -right-36 -top-40 h-[540px] w-[540px] rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(35,184,255,0.58) 0%, transparent 64%)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-44 -left-24 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(255,154,31,0.46) 0%, transparent 62%)" }}
          />

          <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-8">
            <div className="lg:sticky lg:top-24">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" /> Business tool challenge
              </div>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Stump me with the tool your business needs.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg">
                If you are a business owner and there is a tool that would change how you operate,
                challenge me to build it. If I build it and you like it, you buy it. Plain and simple.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 sm:flex">
                <Link
                  href="#tool-challenge-form"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
                >
                  Submit my tool <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/book?source=tool-challenge"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 hover:bg-accent-600"
                >
                  Book the call
                </Link>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                This is for serious owners. No specific revenue, lead, follower, or software outcome is
                guaranteed. The point is to build a practical system you can own and operate.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {OWNERSHIP_POINTS.map(({ Icon, title, body }) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.35)] backdrop-blur"
                  >
                    <Icon className="h-5 w-5 text-cyan-700" />
                    <h2 className="mt-3 text-sm font-semibold text-slate-950">{title}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(360px,1fr)]">
              <div className="rounded-3xl border border-slate-200 bg-slate-950 p-3 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.7)]">
                <div className="mb-3 flex items-center justify-between px-2 pt-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                  <span className="inline-flex items-center gap-2">
                    <PlayCircle className="h-4 w-4" /> Watch the challenge
                  </span>
                  <span>Under 1 minute</span>
                </div>
                <video
                  className="aspect-[9/16] w-full rounded-2xl bg-black object-cover"
                  controls
                  playsInline
                  preload="metadata"
                  poster="/images/stump-me-tool-challenge-poster.jpg"
                >
                  <source src="/videos/stump-me-tool-challenge.mp4" type="video/mp4" />
                </video>
              </div>

              <ToolChallengeForm />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                  What this is
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Not another agency leash. A tool in your hands.
                </h2>
                <p className="mt-3 text-slate-700">
                  Agencies keep too much power by keeping the system, the process, and the data in
                  their world. I want to come into your business, build the thing that makes the work
                  easier, and hand you a system you can run with or without me.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <BuildCard Icon={Brain} title="Figure out the real bottleneck" body="The tool starts with the business problem, not random software features." />
                <BuildCard Icon={Code2} title="Build the useful version first" body="Prototype the piece that saves time, creates leads, organizes work, or closes the gap." />
                <BuildCard Icon={ClipboardList} title="Document the setup" body="You need to know what it does, where it lives, and how to use it." />
                <BuildCard Icon={ShieldCheck} title="Keep ownership clear" body="Your accounts. Your customer data. Your process. Your operating power." />
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
              backgroundSize: "36px 36px",
            }}
          />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-200">
                Tools worth challenging me with
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                If it would change how your business runs, submit it.
              </h2>
              <p className="mt-3 text-slate-300">
                The best ideas are usually not fancy. They remove friction, answer the same question
                200 times, follow up faster, organize chaos, or make it easier for a customer to pay.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {BUILD_TARGETS.map((target) => (
                <div
                  key={target}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100"
                >
                  <CheckCircle2 className="h-4 w-4 text-cyan-200" />
                  {target}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function ToolChallengeForm() {
  return (
    <form
      id="tool-challenge-form"
      action="/api/tool-challenge"
      method="POST"
      className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-[0_28px_70px_-28px_rgba(15,23,42,0.38)] backdrop-blur sm:p-5"
    >
      <VisitorIdField />
      <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
        <Wrench className="h-3.5 w-3.5" /> Submit the challenge
      </div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        What tool would make your business better?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Give me the problem, the current mess, and what changes if this exists.
      </p>

      <div className="mt-5 grid gap-3">
        <TextField name="toolName" label="Name the tool" placeholder="Example: missed-call follow-up dashboard" required />
        <TextArea
          name="toolProblem"
          label="What problem does it solve?"
          placeholder="What is wasting time, costing money, losing leads, or making your team repeat the same work?"
          required
        />
        <TextArea
          name="businessImpact"
          label="What changes if it works?"
          placeholder="More booked calls, faster estimates, fewer missed leads, better handoff, cleaner follow-up, faster content, fewer mistakes."
        />
        <TextArea
          name="currentProcess"
          label="How do you do it now?"
          placeholder="Spreadsheets, texts, sticky notes, missed calls, manual follow-up, too many apps, one employee's memory."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField name="fullName" label="Your name" placeholder="First and last" required />
          <TextField name="email" label="Email" placeholder="you@business.com" type="email" required />
          <TextField name="phone" label="Phone" placeholder="+1 555 123 4567" />
          <TextField name="businessName" label="Business name" placeholder="Company name" />
          <TextField name="businessUrl" label="Website" placeholder="https://" />
          <TextField name="industry" label="Industry" placeholder="Dealership, doctor, attorney, real estate..." />
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-800">Build budget if it makes sense</div>
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
                  defaultChecked={option.value === "2000-5000"}
                  className="sr-only"
                />
                <span className="block font-semibold text-slate-950">{option.label}</span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">{option.body}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            name="monthlyRevenueRange"
            label="Business size"
            options={[
              ["under-10k", "Under $10K/mo"],
              ["10-50k", "$10K-$50K/mo"],
              ["50-250k", "$50K-$250K/mo"],
              ["250k-plus", "$250K+/mo"],
            ]}
          />
          <SelectField
            name="timeline"
            label="How soon do you need it?"
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
            required
            className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span>
            I understand this is a business tool inquiry, not a guarantee. Ryan will review the
            idea and may propose a paid build, working session, or phased prototype.
          </span>
        </label>

        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
        >
          Challenge Ryan to build it <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

function TextField({
  name,
  label,
  placeholder,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <textarea
        name={name}
        rows={3}
        maxLength={1800}
        required={required}
        placeholder={placeholder}
        className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <select
        name={name}
        className="block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
      >
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function BuildCard({
  Icon,
  title,
  body,
}: {
  Icon: typeof Brain;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-cyan-50/50 p-5 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.35)]">
      <Icon className="h-6 w-6 text-cyan-700" />
      <h3 className="mt-4 text-lg font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
