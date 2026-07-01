"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import {
  scoreQuestionnaire,
  type QuestionnaireAnswerMap,
  type QuestionnaireAnswerValue,
  type QuestionnaireDefinition,
  type QuestionnaireQuestion,
} from "@/lib/questionnaire-engine";
import type { BuilderConsentModule, BuilderResultPage } from "@/lib/questionnaire-builder";
import { cn } from "@/lib/utils";

export function QuestionnairePreviewClient({
  definition,
  resultPages,
  consentModules,
  route,
}: {
  definition: QuestionnaireDefinition;
  resultPages: BuilderResultPage[];
  consentModules: BuilderConsentModule[];
  route: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswerMap>({});
  const [done, setDone] = useState(false);
  const score = useMemo(() => scoreQuestionnaire(definition, answers), [answers, definition]);
  const currentStep = definition.steps[stepIndex];
  const result = resultPages.find((page) => score.score >= page.minScore && score.score <= page.maxScore) || resultPages[0];

  useEffect(() => {
    trackLeadFlowEvent("questionnaire_previewed", {
      route,
      tool_slug: definition.toolSlug,
      vertical: definition.vertical,
      status: "preview",
    });
  }, [definition.toolSlug, definition.vertical, route]);

  function setAnswer(questionId: string, value: QuestionnaireAnswerValue) {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  }

  function next() {
    if (stepIndex + 1 >= definition.steps.length) {
      setDone(true);
      trackLeadFlowEvent("questionnaire_completed", {
        route,
        tool_slug: definition.toolSlug,
        vertical: definition.vertical,
        score_range: score.score >= 80 ? "high" : score.score >= 55 ? "medium" : "low",
      });
      return;
    }
    setStepIndex((current) => current + 1);
    trackLeadFlowEvent("questionnaire_step_completed", {
      route,
      tool_slug: definition.toolSlug,
      vertical: definition.vertical,
      step_number: stepIndex + 1,
    });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#060a11]/94 p-5 shadow-2xl shadow-black/30 md:p-7">
      <div className="border-b border-white/10 pb-5">
        <p className="text-xs font-black uppercase tracking-wider text-cyan-200">{definition.toolType}</p>
        <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">{definition.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">{definition.description}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-lead-300 via-cyan-300 to-accent-300" style={{ width: `${done ? 100 : Math.round(((stepIndex + 1) / definition.steps.length) * 100)}%` }} />
        </div>
      </div>

      {!done && currentStep ? (
        <div className="mt-6">
          <h2 className="text-2xl font-black text-white">{currentStep.title}</h2>
          {currentStep.description ? <p className="mt-2 text-sm leading-6 text-ink-300">{currentStep.description}</p> : null}
          <div className="mt-5 grid gap-4">
            {currentStep.questions.filter((question) => question.type !== "custom_hidden").map((question) => (
              <PreviewQuestion key={question.id} question={question} value={answers[question.id]} onChange={(value) => setAnswer(question.id, value)} />
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
            <button type="button" disabled={stepIndex === 0} onClick={() => setStepIndex((current) => Math.max(0, current - 1))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-4 text-sm font-black text-ink-100 disabled:opacity-50">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button type="button" onClick={next} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-lead-300/35 bg-lead-300/15 px-4 text-sm font-black text-lead-50 sm:ml-auto">
              {stepIndex + 1 >= definition.steps.length ? "Show result" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {done ? (
        <div className="mt-6 rounded-xl border border-lead-300/25 bg-lead-300/10 p-5">
          <CheckCircle2 className="h-7 w-7 text-lead-200" />
          <p className="mt-4 text-sm font-black uppercase tracking-wider text-lead-200">Preview result</p>
          <h2 className="mt-2 text-4xl font-black text-white">{score.score}/100</h2>
          <h3 className="mt-4 text-2xl font-black text-white">{result?.title || "Result page"}</h3>
          <p className="mt-3 text-sm leading-6 text-lead-50">{result?.summary || definition.valuePreview}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Metric label="Confidence" value={score.confidence} />
            <Metric label="Tags" value={score.tags.slice(0, 4).join(", ") || "none"} />
            <Metric label="Next action" value={(result?.recommendedNextAction || score.recommendedNextAction).replace(/_/g, " ")} />
          </div>
          <div className="mt-5 rounded-lg border border-white/10 bg-[#050711] p-4">
            <p className="text-xs font-black uppercase tracking-wider text-ink-400">Consent modules shown before real routing</p>
            <div className="mt-3 grid gap-2">
              {consentModules.map((module) => (
                <div key={`${module.moduleType}-${module.consentScope}`} className="rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm text-ink-100">
                  <strong>{module.label}</strong>
                  <p className="mt-1 text-xs leading-5 text-ink-400">{module.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PreviewQuestion({
  question,
  value,
  onChange,
}: {
  question: QuestionnaireQuestion;
  value: QuestionnaireAnswerValue;
  onChange: (value: QuestionnaireAnswerValue) => void;
}) {
  const options = question.options || [];
  const isSelect = ["single_select", "multi_select", "industry", "budget_range", "seller_selection", "yes_no", "ranking", "priority_ranking"].includes(question.type);
  return (
    <fieldset className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <legend className="px-1 text-sm font-black text-white">{question.label}{question.required ? " *" : ""}</legend>
      {question.helperText ? <p className="mt-2 text-sm leading-6 text-ink-300">{question.helperText}</p> : null}
      {isSelect ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(options.length ? options : [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }]).map((option) => {
            const values = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
            const active = Array.isArray(value) ? values.includes(option.id) : value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (question.type === "multi_select" || question.type === "seller_selection" || question.type === "ranking" || question.type === "priority_ranking") {
                    onChange(active ? values.filter((item) => item !== option.id) : [...values, option.id]);
                    return;
                  }
                  onChange(option.id);
                }}
                className={cn("min-h-11 rounded-lg border px-3 py-2 text-left text-sm font-black", active ? "border-lead-300/40 bg-lead-300/15 text-white" : "border-white/10 bg-ink-950 text-ink-200")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {["short_text", "location", "url", "phone", "email", "calendar_intent"].includes(question.type) ? (
        <input
          type={question.type === "email" ? "email" : question.type === "phone" ? "tel" : question.type === "url" ? "url" : question.type === "calendar_intent" ? "date" : "text"}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          className="mt-4 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50"
        />
      ) : null}
      {question.type === "long_text" ? (
        <textarea value={typeof value === "string" ? value : ""} onChange={(event) => onChange(event.target.value)} rows={4} className="mt-4 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/50" />
      ) : null}
      {["number", "range", "number_range", "rating_scale"].includes(question.type) ? (
        <input
          type={question.type === "number" ? "number" : "range"}
          min={question.min ?? 0}
          max={question.max ?? 100}
          step={question.step ?? 1}
          value={typeof value === "number" ? value : question.min ?? 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mt-4 w-full accent-[#ffd66b]"
        />
      ) : null}
      {question.type === "consent_checkbox" ? (
        <label className="mt-4 flex items-center gap-3 text-sm font-bold text-ink-100">
          <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />
          I agree
        </label>
      ) : null}
    </fieldset>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#050711] p-3">
      <p className="text-xs font-black uppercase tracking-wider text-lead-200">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
