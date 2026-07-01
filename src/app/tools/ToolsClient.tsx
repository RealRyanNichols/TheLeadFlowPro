"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  FileCheck2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { leadFlowTools, protectedDataWarning, type LeadFlowTool } from "@/lib/leadflow-tools";
import { sanitizeVercelEventProperties } from "@/lib/analytics-taxonomy";

const privacyRules = [
  "Your answers create a private signal profile.",
  "You control what you submit.",
  "No minors.",
  "No protected-trait targeting.",
  "No private financial account data.",
  "No medical data.",
];

const urgencyOptions = [
  { id: "now", label: "Now" },
  { id: "this_week", label: "This week" },
  { id: "this_month", label: "This month" },
  { id: "researching", label: "Researching" },
];

type SaveResult = {
  id: string;
  leadScore: number;
  leadCategory: string;
};

function getSessionId() {
  const key = "leadflow.toolSessionId";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `lfp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

function trackToolEvent(eventName: string, properties: Record<string, string | number>) {
  try {
    track(eventName, sanitizeVercelEventProperties({ page: "/tools", ...properties }));
  } catch {
    // Analytics must never block a tool answer.
  }
}

export function ToolsClient() {
  const [selectedTool, setSelectedTool] = useState<LeadFlowTool>(leadFlowTools[0]);
  const [sessionId, setSessionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SaveResult | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const categoryCount = useMemo(
    () => new Set(leadFlowTools.map((tool) => tool.leadCategory)).size,
    [],
  );

  function startTool(tool: LeadFlowTool) {
    setSelectedTool(tool);
    setError(null);
    setResult(null);
    trackToolEvent("tools_start_click", {
      tool_id: tool.id,
      tool_name: tool.name,
      lead_category: tool.leadCategory,
    });

    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  async function submitTool(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      toolId: selectedTool.id,
      sessionId: sessionId || getSessionId(),
      sourcePath: window.location.pathname,
      primaryAnswer: String(formData.get("primaryAnswer") || "").trim(),
      context: String(formData.get("context") || "").trim(),
      desiredOutcome: String(formData.get("desiredOutcome") || "").trim(),
      urgency: String(formData.get("urgency") || "researching"),
      consentAccepted: formData.get("consentAccepted") === "on",
      adultConfirmed: formData.get("adultConfirmed") === "on",
      sensitiveDataAcknowledged: formData.get("sensitiveDataAcknowledged") === "on",
      clientTimestamp: new Date().toISOString(),
    };

    trackToolEvent("tools_signal_submit", {
      tool_id: selectedTool.id,
      tool_name: selectedTool.name,
      lead_category: selectedTool.leadCategory,
      urgency: payload.urgency,
    });

    try {
      const res = await fetch("/api/tools/signal-intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save this tool answer.");

      setResult({
        id: data.intake.id,
        leadScore: data.intake.leadScore,
        leadCategory: data.intake.leadCategory,
      });

      trackToolEvent("tools_signal_save_success", {
        tool_id: selectedTool.id,
        tool_name: selectedTool.name,
        lead_category: selectedTool.leadCategory,
        lead_score: data.intake.leadScore,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save this tool answer.";
      setError(message);
      trackToolEvent("tools_signal_save_error", {
        tool_id: selectedTool.id,
        tool_name: selectedTool.name,
        lead_category: selectedTool.leadCategory,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="pb-24">
      <section className="relative isolate overflow-hidden border-b border-white/10 py-14 md:py-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_8%,rgba(35,184,255,0.17),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(166,227,107,0.12),transparent_34%),linear-gradient(135deg,#030711_0%,#070c18_54%,#101008_100%)]" />
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(340px,0.72fr)] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 rounded-lg border border-lead-300/25 bg-lead-300/10 px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-lead-200">
                <DatabaseZap className="h-4 w-4" />
                Public signal tools
              </p>
              <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[0.94] tracking-normal text-white md:text-7xl">
                Tools people use because the answer is useful.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-ink-100 md:text-xl">
                Quizzes, scorecards, calculators, and pulse tools that give a quick answer while creating consented first-party signal data.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <HeroMetric label="Tools" value={String(leadFlowTools.length)} />
                <HeroMetric label="Lead categories" value={String(categoryCount)} />
                <HeroMetric label="Save path" value="Supabase" />
              </div>
            </div>

            <SignalProfileModule />
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.4fr)] lg:items-start">
            <div>
              <div className="max-w-3xl">
                <p className="text-xs font-extrabold uppercase tracking-wider text-accent-300">Tool catalog</p>
                <h2 className="mt-3 text-3xl font-black text-white md:text-5xl">
                  Pick the answer you want. The signal comes from the work.
                </h2>
                <p className="mt-4 text-base leading-7 text-ink-200">
                  Each card starts a small intake that can save answers with consent, source path, timestamp, session ID, and lead category.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {leadFlowTools.map((tool) => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    active={selectedTool.id === tool.id}
                    onStart={() => startTool(tool)}
                  />
                ))}
              </div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <SignalProfileModule compact />
              <form
                ref={formRef}
                onSubmit={submitTool}
                className="lead-shell space-y-4 p-5"
              >
                <div className="border-b border-white/10 pb-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Selected tool</p>
                  <h2 className="mt-2 text-2xl font-black text-white">{selectedTool.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-ink-300">{selectedTool.outputPreview}</p>
                </div>

                <FieldBlock label={selectedTool.prompt} name="primaryAnswer" placeholder="Give the short, honest answer." />
                <FieldBlock label="What is happening right now?" name="context" placeholder="Current setup, issue, search, or decision you are trying to make." />
                <FieldBlock label="What answer would help you move forward?" name="desiredOutcome" placeholder="A score, shortlist, plan, route, product, seller, provider, or next step." />

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-400">Timing</span>
                  <select
                    name="urgency"
                    className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
                    defaultValue="researching"
                  >
                    {urgencyOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 text-xs leading-5 text-cyan-50">
                  <FileCheck2 className="mb-2 h-4 w-4" />
                  Saved rows include consent, source path, timestamp, anonymous session ID, and lead category:{" "}
                  <span className="font-bold text-white">{selectedTool.leadCategory}</span>.
                </div>

                <ConsentCheck name="adultConfirmed" label="I am 18 or older." />
                <ConsentCheck name="sensitiveDataAcknowledged" label={protectedDataWarning} />
                <ConsentCheck
                  name="consentAccepted"
                  label="I consent to save this tool answer as a private LeadFlow signal profile for review, scoring, suppression controls, and relevant next-step routing."
                />

                {error ? (
                  <div className="flex gap-3 rounded-lg border border-red-400/25 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
                    <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                ) : null}

                {result ? (
                  <div className="rounded-lg border border-lead-400/25 bg-lead-400/10 p-4 text-sm leading-6 text-lead-50">
                    <div className="flex gap-3">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-bold text-white">Saved. Signal score: {result.leadScore}</p>
                        <p className="mt-1 text-lead-100">Lead category: {result.leadCategory}. Review ID: {result.id}.</p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <button type="submit" disabled={submitting || !sessionId} className="btn-accent w-full justify-center text-sm">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save Tool Answer
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

function ToolCard({ tool, active, onStart }: { tool: LeadFlowTool; active: boolean; onStart: () => void }) {
  const Icon = tool.icon;

  return (
    <article
      className={`lead-panel flex min-h-[28rem] flex-col p-5 ${active ? "border-lead-300/45 bg-lead-300/10" : ""}`}
      data-tool-id={tool.id}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-xs font-bold text-ink-300">
          <Clock3 className="h-3.5 w-3.5 text-accent-300" />
          {tool.estimatedTime}
        </div>
      </div>

      <h3 className="mt-5 text-2xl font-black leading-tight text-white">{tool.name}</h3>

      <div className="mt-5 space-y-3">
        <ToolFact label="Who it is for" value={tool.whoFor} />
        <ToolFact label="Answer it gives" value={tool.answerGives} />
        <ToolFact label="Data category collected" value={tool.dataCategory} />
      </div>

      <button type="button" onClick={onStart} className="btn-ghost mt-auto w-full justify-center text-sm">
        Start Tool
        <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

function SignalProfileModule({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`lead-shell p-5 ${compact ? "" : "lg:min-h-[28rem]"}`}>
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-lead-300">Private signal profile</p>
          <h2 className="mt-1 text-2xl font-black text-white">Answer with control.</h2>
        </div>
        <LockKeyhole className="h-7 w-7 text-cyan-300" />
      </div>
      <div className="mt-5 space-y-3">
        {privacyRules.map((rule) => (
          <div key={rule} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-100">
            <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-lead-400" />
            <span>{rule}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function FieldBlock({ label, name, placeholder }: { label: string; name: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</span>
      <textarea
        name={name}
        rows={3}
        required
        minLength={8}
        maxLength={1400}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
      />
    </label>
  );
}

function ConsentCheck({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-100">
      <input type="checkbox" name={name} required className="mt-1 h-4 w-4 shrink-0" />
      <span>{label}</span>
    </label>
  );
}

function ToolFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-ink-100">{value}</p>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
