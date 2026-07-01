"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Save, ShieldCheck } from "lucide-react";
import {
  getVisibleQuestions,
  scoreQuestionnaire,
  validateStep,
  type QuestionnaireAnswerMap,
  type QuestionnaireAnswerValue,
  type QuestionnaireConsent,
  type QuestionnaireDefinition,
  type QuestionnaireExportProfile,
  type QuestionnaireOption,
  type QuestionnaireQuestion,
} from "@/lib/questionnaire-engine";

type EnginePhase = "questions" | "value" | "identity" | "consent" | "done";

export type QuestionnaireEngineProps = {
  definition: QuestionnaireDefinition;
  saveEndpoint?: string;
  sourcePage?: string;
  onComplete?: (profile: QuestionnaireExportProfile) => void;
};

const budgetOptions: QuestionnaireOption[] = [
  { id: "unknown", label: "Need to see fit first", tags: ["budget_unknown"], score: 1 },
  { id: "under_100", label: "Under $100", tags: ["budget_under_100"], score: 3 },
  { id: "100_500", label: "$100 to $500", tags: ["budget_100_500"], score: 7 },
  { id: "500_2500", label: "$500 to $2,500", tags: ["budget_500_2500"], score: 11 },
  { id: "2500_plus", label: "$2,500+", tags: ["budget_2500_plus"], score: 15 },
];

function getAnonymousUserId() {
  const key = "leadflow.anonymousUserId";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const value =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `anon_${crypto.randomUUID()}`
      : `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, value);
  return value;
}

function getAttribution(sourcePage?: string) {
  const url = new URL(window.location.href);
  return {
    sourceUrl: `${url.origin}${url.pathname}${url.search}`,
    sourcePath: sourcePage || url.pathname,
    utmSource: url.searchParams.get("utm_source") || undefined,
    utmMedium: url.searchParams.get("utm_medium") || undefined,
    utmCampaign: url.searchParams.get("utm_campaign") || undefined,
    utmContent: url.searchParams.get("utm_content") || undefined,
    utmTerm: url.searchParams.get("utm_term") || undefined,
  };
}

export function QuestionnaireEngine({
  definition,
  saveEndpoint = "/api/questionnaires/responses",
  sourcePage,
  onComplete,
}: QuestionnaireEngineProps) {
  const [anonymousUserId, setAnonymousUserId] = useState("");
  const [responseId, setResponseId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<EnginePhase>("questions");
  const [answers, setAnswers] = useState<QuestionnaireAnswerMap>({});
  const [identity, setIdentity] = useState({ name: "", email: "", company: "" });
  const [consent, setConsent] = useState<QuestionnaireConsent>({
    status: "not_requested",
    routeData: false,
    selectedSellers: [],
    noticeVersion: "questionnaire-engine-v1",
  });
  const [missingQuestionIds, setMissingQuestionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [exportProfile, setExportProfile] = useState<QuestionnaireExportProfile | null>(null);

  useEffect(() => {
    setAnonymousUserId(getAnonymousUserId());
  }, []);

  const currentStep = definition.steps[stepIndex];
  const visibleQuestions = useMemo(
    () => (currentStep ? getVisibleQuestions(currentStep, answers) : []),
    [currentStep, answers],
  );
  const score = useMemo(() => scoreQuestionnaire(definition, answers), [definition, answers]);
  const progress = Math.round(((stepIndex + (phase === "questions" ? 0 : 1)) / (definition.steps.length + 3)) * 100);

  function setAnswer(questionId: string, value: QuestionnaireAnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setMissingQuestionIds((prev) => prev.filter((id) => id !== questionId));
  }

  async function saveResponse(status: "partial" | "completed", nextStep = stepIndex) {
    if (!anonymousUserId) return null;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(saveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId,
          anonymousUserId,
          identity: identity.email || identity.name || identity.company ? identity : undefined,
          definition,
          answers,
          currentStep: nextStep,
          status,
          consent,
          attribution: getAttribution(sourcePage),
          metadata: {
            phase,
            valueShown: phase !== "questions",
            toolType: definition.toolType,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save questionnaire response.");

      setResponseId(data.response.id);
      setSavedAt(new Date().toLocaleTimeString());
      if (status === "completed") {
        setExportProfile(data.response.exportProfile);
        onComplete?.(data.response.exportProfile);
      }
      return data.response;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save questionnaire response.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function goNext() {
    if (!currentStep) return;
    const validation = validateStep(currentStep, answers);
    if (!validation.ok) {
      setMissingQuestionIds(validation.missingQuestionIds);
      setError("Answer the highlighted questions before moving forward.");
      return;
    }

    const next = stepIndex + 1;
    await saveResponse("partial", next);
    if (next >= definition.steps.length) {
      setPhase("value");
      return;
    }
    setStepIndex(next);
  }

  function goBack() {
    setError(null);
    if (phase !== "questions") {
      setPhase("questions");
      return;
    }
    setStepIndex((current) => Math.max(0, current - 1));
  }

  async function complete(event: FormEvent) {
    event.preventDefault();
    if (consent.status === "not_requested") {
      setError("Choose a consent path before completing the questionnaire.");
      return;
    }
    const response = await saveResponse("completed", definition.steps.length);
    if (response) setPhase("done");
  }

  return (
    <section className="lead-shell p-4 md:p-6" data-component="QuestionnaireEngine">
      <div className="border-b border-white/10 pb-5">
        <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{definition.toolType}</p>
        <h2 className="mt-2 text-3xl font-black text-white">{definition.title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">{definition.description}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-lead-400 via-cyan-400 to-accent-400" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink-400">
          <span>{phase === "questions" ? `Step ${stepIndex + 1} of ${definition.steps.length}` : phase}</span>
          <span>{progress}%</span>
        </div>
      </div>

      {phase === "questions" && currentStep ? (
        <div className="mt-6">
          <div>
            <h3 className="text-2xl font-black text-white">{currentStep.title}</h3>
            {currentStep.description ? <p className="mt-2 text-sm leading-6 text-ink-300">{currentStep.description}</p> : null}
          </div>
          <div className="mt-5 space-y-5">
            {visibleQuestions.map((question) => (
              <QuestionRenderer
                key={question.id}
                question={question}
                value={answers[question.id]}
                onChange={(value) => setAnswer(question.id, value)}
                invalid={missingQuestionIds.includes(question.id)}
              />
            ))}
          </div>
          <EngineActions
            saving={saving}
            savedAt={savedAt}
            canBack={stepIndex > 0}
            onBack={goBack}
            onSave={() => saveResponse("partial")}
            onNext={goNext}
            nextLabel={stepIndex + 1 >= definition.steps.length ? "Show my result" : "Next"}
          />
        </div>
      ) : null}

      {phase === "value" ? (
        <div className="mt-6 rounded-lg border border-lead-400/25 bg-lead-400/10 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-lead-200">Your answer first</p>
          <h3 className="mt-2 text-3xl font-black text-white">{score.score}/100 signal score</h3>
          <p className="mt-3 text-sm leading-6 text-lead-50">{definition.valuePreview}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ResultMetric label="Confidence" value={score.confidence} />
            <ResultMetric label="Suppression" value={score.suppressionStatus} />
            <ResultMetric label="Next action" value={score.recommendedNextAction.replaceAll("_", " ")} />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-accent text-sm" onClick={() => setPhase("identity")}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" className="btn-ghost text-sm" onClick={() => setPhase("consent")}>
              Stay anonymous
            </button>
          </div>
        </div>
      ) : null}

      {phase === "identity" ? (
        <div className="mt-6">
          <h3 className="text-2xl font-black text-white">Save an identity only after seeing the value.</h3>
          <p className="mt-2 text-sm leading-6 text-ink-300">This step is optional. It creates an identity ID for follow-up or named seller routing.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <IdentityField label="Name" value={identity.name} onChange={(value) => setIdentity((prev) => ({ ...prev, name: value }))} />
            <IdentityField label="Email" type="email" value={identity.email} onChange={(value) => setIdentity((prev) => ({ ...prev, email: value }))} />
            <IdentityField label="Company" value={identity.company} onChange={(value) => setIdentity((prev) => ({ ...prev, company: value }))} />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-accent text-sm" onClick={() => setPhase("consent")}>
              Continue to consent
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" className="btn-ghost text-sm" onClick={() => setPhase("consent")}>
              Skip identity
            </button>
          </div>
        </div>
      ) : null}

      {phase === "consent" ? (
        <form onSubmit={complete} className="mt-6 space-y-5">
          <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-5">
            <ShieldCheck className="h-6 w-6 text-cyan-200" />
            <h3 className="mt-3 text-2xl font-black text-white">Consent before selling or routing data.</h3>
            <p className="mt-2 text-sm leading-6 text-cyan-50">
              Choose how this response can be used. Declining routing still allows anonymous tool improvement and suppression-safe review.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ["anonymous_only", "Anonymous insights only"],
              ["aggregate_only", "Aggregate insight product only"],
              ["single_seller", "Route to one reviewed seller"],
              ["named_sellers", "Route to selected named sellers"],
              ["declined", "Do not sell or route this response"],
            ].map(([status, label]) => (
              <label key={status} className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm font-bold text-ink-100">
                <input
                  type="radio"
                  name="consentStatus"
                  checked={consent.status === status}
                  onChange={() =>
                    setConsent((prev) => ({
                      ...prev,
                      status: status as QuestionnaireConsent["status"],
                      routeData: status !== "declined" && status !== "anonymous_only",
                    }))
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-400">Named sellers, if any</span>
            <input
              value={consent.selectedSellers?.join(", ") ?? ""}
              onChange={(event) =>
                setConsent((prev) => ({
                  ...prev,
                  selectedSellers: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                }))
              }
              placeholder="Example: Seller A, Seller B"
              className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
            />
          </label>
          <EngineActions saving={saving} savedAt={savedAt} canBack onBack={goBack} onSave={() => saveResponse("partial")} nextLabel="Complete response" submit />
        </form>
      ) : null}

      {phase === "done" && exportProfile ? (
        <div className="mt-6 rounded-lg border border-lead-400/25 bg-lead-400/10 p-5">
          <CheckCircle2 className="h-7 w-7 text-lead-200" />
          <h3 className="mt-3 text-2xl font-black text-white">Export-ready profile created.</h3>
          <pre className="mt-5 max-h-96 overflow-auto rounded-lg border border-white/10 bg-ink-950 p-4 text-xs leading-5 text-ink-100">
            {JSON.stringify(exportProfile, null, 2)}
          </pre>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 flex gap-3 rounded-lg border border-red-400/25 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
          <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
    </section>
  );
}

function QuestionRenderer({
  question,
  value,
  onChange,
  invalid,
}: {
  question: QuestionnaireQuestion;
  value: QuestionnaireAnswerValue;
  onChange: (value: QuestionnaireAnswerValue) => void;
  invalid?: boolean;
}) {
  if (question.type === "custom_hidden") return null;
  const options = question.type === "budget_range" ? question.options ?? budgetOptions : question.options ?? [];

  return (
    <fieldset className={`rounded-lg border p-4 ${invalid ? "border-red-300/60 bg-red-300/10" : "border-white/10 bg-white/[0.035]"}`}>
      <legend className="px-1 text-sm font-black text-white">{question.label}{question.required ? " *" : ""}</legend>
      {question.helperText ? <p className="mt-2 text-sm leading-6 text-ink-300">{question.helperText}</p> : null}
      <div className="mt-4">
        {question.type === "single_select" || question.type === "budget_range" || question.type === "industry" ? (
          <OptionGrid options={options} value={typeof value === "string" ? value : ""} onChange={onChange} />
        ) : null}

        {question.type === "multi_select" || question.type === "seller_selection_checkbox" || question.type === "seller_selection" ? (
          <OptionGrid options={options} value={Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []} onChange={onChange} multiple />
        ) : null}

        {question.type === "short_text" || question.type === "location" || question.type === "url" || question.type === "phone" || question.type === "email" || question.type === "calendar_intent" ? (
          <input
            type={question.type === "url" ? "url" : question.type === "email" ? "email" : question.type === "phone" ? "tel" : question.type === "calendar_intent" ? "date" : "text"}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder}
            className="h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
          />
        ) : null}

        {question.type === "number" ? (
          <input
            type="number"
            min={question.min}
            max={question.max}
            step={question.step ?? 1}
            value={typeof value === "number" || typeof value === "string" ? value : ""}
            onChange={(event) => onChange(Number(event.target.value))}
            placeholder={question.placeholder}
            className="h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
          />
        ) : null}

        {question.type === "yes_no" ? (
          <OptionGrid
            options={question.options?.length ? options : [
              { id: "yes", label: "Yes", score: 5, tags: ["yes"] },
              { id: "no", label: "No", score: 0, tags: ["no"] },
            ]}
            value={typeof value === "string" ? value : ""}
            onChange={onChange}
          />
        ) : null}

        {question.type === "long_text" ? (
          <textarea
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder}
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
          />
        ) : null}

        {question.type === "number_range" || question.type === "range" || question.type === "rating_scale" ? (
          <RangeInput question={question} value={typeof value === "number" ? value : question.min ?? 0} onChange={onChange} />
        ) : null}

        {question.type === "priority_ranking" || question.type === "ranking" ? (
          <PriorityRanking options={options} value={Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []} onChange={onChange} />
        ) : null}

        {question.type === "file_upload" ? <FileMetadataInput onChange={onChange} /> : null}

        {question.type === "consent_checkbox" ? (
          <label className="flex gap-3 rounded-lg border border-white/10 bg-ink-950/55 p-3 text-sm leading-6 text-ink-100">
            <input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
            <span>{question.helperText || "I consent."}</span>
          </label>
        ) : null}

      </div>
    </fieldset>
  );
}

function OptionGrid({
  options,
  value,
  onChange,
  multiple,
}: {
  options: QuestionnaireOption[];
  value: string | string[];
  onChange: (value: QuestionnaireAnswerValue) => void;
  multiple?: boolean;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = Array.isArray(value) ? value.includes(option.id) : value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              if (!multiple) {
                onChange(option.id);
                return;
              }
              const current = Array.isArray(value) ? value : [];
              onChange(active ? current.filter((item) => item !== option.id) : [...current, option.id]);
            }}
            className={`min-h-12 rounded-lg border px-3 py-2 text-left text-sm font-bold transition ${
              active ? "border-lead-300/50 bg-lead-300/15 text-white" : "border-white/10 bg-ink-950/55 text-ink-200 hover:border-cyan-300/35"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function RangeInput({
  question,
  value,
  onChange,
}: {
  question: QuestionnaireQuestion;
  value: number;
  onChange: (value: QuestionnaireAnswerValue) => void;
}) {
  return (
    <div>
      <input
        type="range"
        min={question.min ?? 0}
        max={question.max ?? 10}
        step={question.step ?? 1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[#ffd66b]"
      />
      <div className="mt-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink-400">
        <span>{question.min ?? 0}</span>
        <span className="rounded-lg border border-accent-300/25 bg-accent-300/10 px-3 py-1 text-accent-100">{value}</span>
        <span>{question.max ?? 10}</span>
      </div>
    </div>
  );
}

function PriorityRanking({
  options,
  value,
  onChange,
}: {
  options: QuestionnaireOption[];
  value: string[];
  onChange: (value: QuestionnaireAnswerValue) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => {
        const index = value.indexOf(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(index >= 0 ? value.filter((item) => item !== option.id) : [...value, option.id])}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-ink-950/55 px-3 py-2 text-left text-sm font-bold text-ink-100"
          >
            <span>{option.label}</span>
            <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-xs text-cyan-100">
              {index >= 0 ? `#${index + 1}` : "Pick"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FileMetadataInput({ onChange }: { onChange: (value: QuestionnaireAnswerValue) => void }) {
  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    onChange(
      files.map((file) => ({
        id: file.name,
        label: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })),
    );
  }

  return (
    <input
      type="file"
      multiple
      onChange={handleFile}
      className="block w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-ink-100 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-300/15 file:px-3 file:py-2 file:text-sm file:font-bold file:text-cyan-100"
    />
  );
}

function EngineActions({
  saving,
  savedAt,
  canBack,
  onBack,
  onSave,
  onNext,
  nextLabel = "Next",
  submit,
}: {
  saving: boolean;
  savedAt: string | null;
  canBack?: boolean;
  onBack?: () => void;
  onSave: () => void;
  onNext?: () => void;
  nextLabel?: string;
  submit?: boolean;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
      {canBack ? (
        <button type="button" className="btn-ghost text-sm" onClick={onBack}>
          Back
        </button>
      ) : null}
      <button type="button" className="btn-ghost text-sm" onClick={onSave} disabled={saving}>
        <Save className="h-4 w-4" />
        Save partial
      </button>
      <button type={submit ? "submit" : "button"} className="btn-accent text-sm sm:ml-auto" onClick={submit ? undefined : onNext} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {nextLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
      {savedAt ? <span className="text-xs font-bold text-ink-400">Saved {savedAt}</span> : null}
    </div>
  );
}

function IdentityField({
  label,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60"
      />
    </label>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950/55 p-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-lead-200">{label}</p>
      <p className="mt-1 text-sm font-black capitalize text-white">{value}</p>
    </div>
  );
}
