"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, Target, XCircle } from "lucide-react";
import type { LeadFlowWidgetPublicConfig } from "@/lib/leadflow-widget-definitions";
import type { QuestionnaireAnswerMap, QuestionnaireAnswerValue, QuestionnaireQuestion } from "@/lib/questionnaire-engine";
import { getVisibleQuestions, validateStep } from "@/lib/questionnaire-engine";
import { cn } from "@/lib/utils";

type SubmitResult = {
  score: number;
  confidence: "low" | "medium" | "high";
  tags: string[];
  recommendedNextAction: string;
  message: string;
};

function anonymousId() {
  try {
    const key = "leadflow.widgetAnonymousId";
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const generated = crypto.randomUUID ? crypto.randomUUID() : `lfw_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, generated);
    return generated;
  } catch {
    return `lfw_${Date.now()}`;
  }
}

function answerLabel(value: QuestionnaireAnswerValue) {
  if (Array.isArray(value)) return value.map((item) => (typeof item === "string" ? item : item.label || item.id)).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value === undefined || value === null || value === "" ? "Not answered" : String(value);
}

function confidenceText(value: SubmitResult["confidence"]) {
  if (value === "high") return "High confidence";
  if (value === "medium") return "Medium confidence";
  return "Early signal";
}

export function WidgetEmbedClient({
  widget,
  sourceDomain,
  pageUrl,
}: {
  widget: LeadFlowWidgetPublicConfig;
  sourceDomain: string;
  pageUrl: string;
}) {
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswerMap>({});
  const [missing, setMissing] = useState<string[]>([]);
  const [saveAnswers, setSaveAnswers] = useState(widget.consent_required);
  const [contactMe, setContactMe] = useState(false);
  const [routeOrShare, setRouteOrShare] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [anon, setAnon] = useState("");

  const currentStep = widget.definition.steps[stepIndex];
  const totalSteps = widget.definition.steps.length;
  const visibleQuestions = useMemo(() => getVisibleQuestions(currentStep, answers), [answers, currentStep]);

  useEffect(() => {
    setAnon(anonymousId());
  }, []);

  useEffect(() => {
    window.parent?.postMessage({ type: "leadflow-widget-resize", widgetId: widget.slug, height: document.body.scrollHeight }, "*");
  }, [answers, started, stepIndex, result, widget.slug]);

  async function track(eventName: string, properties: Record<string, unknown> = {}) {
    if (!anon) return;
    await fetch("/api/leadflow/widgets/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        widgetId: widget.id,
        eventName,
        anonymousUserId: anon,
        sourceDomain,
        pageUrl,
        properties,
      }),
      keepalive: true,
    }).catch(() => null);
  }

  function setAnswer(questionId: string, value: QuestionnaireAnswerValue) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setMissing((current) => current.filter((id) => id !== questionId));
  }

  async function start() {
    setStarted(true);
    await track("widget_started", { tool_slug: widget.definition.toolSlug, vertical: widget.definition.vertical });
  }

  async function next() {
    const validation = validateStep(currentStep, answers);
    if (!validation.ok) {
      setMissing(validation.missingQuestionIds);
      return;
    }
    await track("widget_step_completed", {
      tool_slug: widget.definition.toolSlug,
      vertical: widget.definition.vertical,
      step_number: stepIndex + 1,
      status: "completed",
    });
    setMissing([]);
    if (stepIndex < totalSteps - 1) {
      setStepIndex((index) => index + 1);
      return;
    }
    await submit();
  }

  async function submit() {
    if (widget.consent_required && !saveAnswers) {
      setError("Check the first consent box before saving this result.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/leadflow/widgets/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          widgetId: widget.id,
          anonymousUserId: anon || anonymousId(),
          answers,
          consent: { saveAnswers, contactMe, routeOrShare },
          sourceDomain,
          pageUrl,
          sourceUrl: pageUrl,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Widget submission failed.");
      setResult(payload.result);
      await track("widget_result_viewed", {
        tool_slug: widget.definition.toolSlug,
        score_range: payload.result?.score >= 80 ? "high" : payload.result?.score >= 60 ? "medium" : "low",
        confidence: payload.result?.confidence,
        status: "result_viewed",
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Widget submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-[560px] rounded-2xl border border-white/10 bg-[#05070d] p-5 text-white shadow-2xl shadow-black/30">
        <div className="rounded-xl border border-lead-300/30 bg-lead-300/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-lead-100">Result ready</p>
              <h1 className="mt-2 text-3xl font-black">{widget.name}</h1>
            </div>
            <div className="grid min-h-20 min-w-24 place-items-center rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-3 text-center">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-100">Signal score</span>
              <strong className="text-4xl font-black">{result.score}</strong>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink-100">{result.message}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ResultTile label="Confidence" value={confidenceText(result.confidence)} />
          <ResultTile label="Next action" value={result.recommendedNextAction.replace(/_/g, " ")} />
          <ResultTile label="Tags" value={result.tags.slice(0, 3).join(", ") || "Signal captured"} />
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-black uppercase tracking-wider text-ink-400">What was saved</p>
          <div className="mt-3 grid gap-2 text-sm text-ink-200">
            <p><CheckCircle2 className="mr-2 inline h-4 w-4 text-lead-200" /> Score, tags, confidence, source domain, page URL, timestamp, consent version.</p>
            <p><ShieldCheck className="mr-2 inline h-4 w-4 text-cyan-200" /> Raw answers stay private and review-gated. Analytics events do not include raw answers or contact details.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[560px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(35,184,255,0.16),transparent_30%),linear-gradient(135deg,#07101b,#05070d)] p-5 text-white shadow-2xl shadow-black/30">
      {!started ? (
        <div className="grid min-h-[520px] content-center">
          <p className="inline-flex w-fit items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-100">
            <Target className="h-4 w-4" />
            {widget.definition.valuePreview}
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight">{widget.definition.title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ink-200">{widget.definition.description}</p>
          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-sm font-bold text-white">Consent stays visible.</p>
            <p className="mt-2 text-sm leading-6 text-ink-300">
              Before this tool saves, contacts, shares, routes, or sells identified data, you will see clear permission choices. Do not submit minors, medical data, private financial data, protected-trait data, hacked data, or leaked data.
            </p>
          </div>
          <button type="button" onClick={start} className="mt-6 inline-flex min-h-12 w-fit items-center gap-2 rounded-lg bg-accent-300 px-5 text-sm font-black text-black shadow-[0_20px_50px_-28px_rgba(255,186,61,0.9)] transition hover:-translate-y-0.5">
            Start tool <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-cyan-200">{widget.name}</p>
              <h1 className="mt-1 text-2xl font-black">{currentStep.title}</h1>
            </div>
            <span className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-ink-200">
              Step {stepIndex + 1} of {totalSteps}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} />
          </div>

          <div className="mt-6 grid gap-4">
            {visibleQuestions.map((question) => (
              <QuestionControl
                key={question.id}
                question={question}
                value={answers[question.id]}
                missing={missing.includes(question.id)}
                onChange={(value) => setAnswer(question.id, value)}
              />
            ))}
          </div>

          {stepIndex === totalSteps - 1 ? (
            <ConsentBlock
              saveAnswers={saveAnswers}
              contactMe={contactMe}
              routeOrShare={routeOrShare}
              onSaveAnswers={setSaveAnswers}
              onContactMe={setContactMe}
              onRouteOrShare={setRouteOrShare}
            />
          ) : null}

          {error ? (
            <div className="mt-4 rounded-lg border border-red-300/35 bg-red-300/10 p-3 text-sm font-bold text-red-100">
              <XCircle className="mr-2 inline h-4 w-4" />
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              disabled={stepIndex === 0 || submitting}
              className="min-h-11 rounded-lg border border-white/10 bg-white/[0.035] px-4 text-sm font-black text-ink-100 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              disabled={submitting}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent-300 px-5 text-sm font-black text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {stepIndex === totalSteps - 1 ? "Show my result" : "Next"}
              {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-black uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-white">{value}</p>
    </div>
  );
}

function QuestionControl({
  question,
  value,
  missing,
  onChange,
}: {
  question: QuestionnaireQuestion;
  value: QuestionnaireAnswerValue;
  missing: boolean;
  onChange: (value: QuestionnaireAnswerValue) => void;
}) {
  const common = "w-full rounded-lg border bg-ink-950/80 px-3 py-3 text-sm font-bold text-white outline-none transition placeholder:text-ink-500 focus:border-cyan-300/60";
  if (question.type === "custom_hidden") return null;
  return (
    <fieldset className={cn("rounded-xl border p-4", missing ? "border-red-300/45 bg-red-300/10" : "border-white/10 bg-white/[0.035]")}>
      <legend className="px-1 text-sm font-black text-white">{question.label}{question.required ? " *" : ""}</legend>
      {question.helperText ? <p className="mt-1 text-sm leading-6 text-ink-300">{question.helperText}</p> : null}
      {question.type === "single_select" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(question.options || []).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                "min-h-12 rounded-lg border px-3 text-left text-sm font-black transition",
                value === option.id
                  ? "border-cyan-300/55 bg-cyan-300/15 text-cyan-50"
                  : "border-white/10 bg-white/[0.035] text-ink-100 hover:border-white/25",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : question.type === "multi_select" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {(question.options || []).map((option) => {
            const current = Array.isArray(value) ? value.map((item) => (typeof item === "string" ? item : item.id)) : [];
            const selected = current.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(selected ? current.filter((item) => item !== option.id) : [...current, option.id]);
                }}
                className={cn(
                  "min-h-12 rounded-lg border px-3 text-left text-sm font-black transition",
                  selected
                    ? "border-cyan-300/55 bg-cyan-300/15 text-cyan-50"
                    : "border-white/10 bg-white/[0.035] text-ink-100 hover:border-white/25",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : question.type === "yes_no" || question.type === "consent_checkbox" ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { id: "yes", label: "Yes", value: true },
            { id: "no", label: "No", value: false },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "min-h-12 rounded-lg border px-3 text-left text-sm font-black transition",
                value === option.value
                  ? "border-cyan-300/55 bg-cyan-300/15 text-cyan-50"
                  : "border-white/10 bg-white/[0.035] text-ink-100 hover:border-white/25",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : question.type === "rating_scale" || question.type === "number_range" || question.type === "range" ? (
        <label className="mt-3 grid gap-2 text-sm text-ink-200">
          <input
            type="range"
            min={question.min ?? 0}
            max={question.max ?? 100}
            step={question.step ?? 1}
            value={typeof value === "number" ? value : question.min ?? 0}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full accent-cyan-300"
          />
          <span className="font-black text-white">{answerLabel(value)}</span>
        </label>
      ) : question.type === "long_text" ? (
        <textarea
          value={typeof value === "string" || typeof value === "number" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={question.placeholder || "Type your answer"}
          rows={4}
          className={cn(common, missing ? "border-red-300/50" : "border-white/10")}
        />
      ) : question.type === "file_upload" ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm font-bold leading-6 text-ink-300">
          File upload is captured through the hosted full-page questionnaire flow. Use the share link for uploads.
        </div>
      ) : (
        <input
          type={question.type === "url" ? "url" : question.type === "email" ? "email" : question.type === "phone" ? "tel" : question.type === "number" ? "number" : "text"}
          value={typeof value === "string" || typeof value === "number" ? value : ""}
          onChange={(event) => onChange(question.type === "number" ? Number(event.target.value) : event.target.value)}
          placeholder={question.placeholder || "Type your answer"}
          className={cn(common, missing ? "border-red-300/50" : "border-white/10")}
        />
      )}
      {missing ? <p className="mt-2 text-xs font-bold text-red-100">Answer this before moving on.</p> : null}
    </fieldset>
  );
}

function ConsentBlock({
  saveAnswers,
  contactMe,
  routeOrShare,
  onSaveAnswers,
  onContactMe,
  onRouteOrShare,
}: {
  saveAnswers: boolean;
  contactMe: boolean;
  routeOrShare: boolean;
  onSaveAnswers: (value: boolean) => void;
  onContactMe: (value: boolean) => void;
  onRouteOrShare: (value: boolean) => void;
}) {
  return (
    <section className="mt-5 rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-4">
      <p className="text-sm font-black text-white">Permission choices</p>
      <p className="mt-2 text-sm leading-6 text-cyan-50/85">
        These choices are separate. Saving a result is not blanket permission to contact you, route you to a seller, send data to a CRM, or sell identified data.
      </p>
      <div className="mt-4 grid gap-3">
        <Checkbox checked={saveAnswers} onChange={onSaveAnswers} label="Save my answers and score for this private signal profile." />
        <Checkbox checked={contactMe} onChange={onContactMe} label="Contact me about this result or next step." />
        <Checkbox checked={routeOrShare} onChange={onRouteOrShare} label="I may want this routed or shared after review. Ask before using phone/text seller routing." />
      </div>
    </section>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm font-bold leading-6 text-ink-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-cyan-300"
      />
      {label}
    </label>
  );
}
