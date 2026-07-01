"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  GitBranch,
  Loader2,
  Plus,
  Rocket,
  Save,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type {
  BuilderConsentModule,
  BuilderDashboardData,
  BuilderQuestionnaireDraft,
  BuilderResultPage,
  BuilderTemplate,
} from "@/lib/questionnaire-builder";
import type { QuestionnaireQuestion, QuestionnaireQuestionType, QuestionnaireStep } from "@/lib/questionnaire-engine";
import { cn } from "@/lib/utils";

const QUESTION_TYPES: QuestionnaireQuestionType[] = [
  "single_select",
  "multi_select",
  "short_text",
  "long_text",
  "number",
  "range",
  "number_range",
  "budget_range",
  "industry",
  "location",
  "url",
  "phone",
  "email",
  "rating_scale",
  "ranking",
  "yes_no",
  "file_upload",
  "consent_checkbox",
  "seller_selection",
  "calendar_intent",
  "custom_hidden",
];

const TABS = ["Steps", "Questions", "Logic", "Scoring", "Results", "Consent", "Theme", "Publish"] as const;
type BuilderTab = (typeof TABS)[number];

const SENSITIVE_RE =
  /\b(minor|under 18|medical diagnosis|protected trait|religion|race|ethnicity|sexual orientation|private political identity|political persuasion|ssn|social security|bank account|credit card|password|hacked|leaked)\b/i;

function cloneDraft<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function slugify(value: string) {
  return (value || "questionnaire")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 88) || "questionnaire";
}

function newKey(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function countQuestions(draft: BuilderQuestionnaireDraft) {
  return draft.definition.steps.reduce((sum, step) => sum + step.questions.length, 0);
}

function fieldLabel(value: string) {
  return value.replace(/_/g, " ");
}

function defaultQuestion(type: QuestionnaireQuestionType = "single_select"): QuestionnaireQuestion {
  const id = newKey("question");
  if (["single_select", "multi_select", "industry", "seller_selection", "yes_no"].includes(type)) {
    return {
      id,
      type,
      label: "What is the strongest signal?",
      helperText: "Use plain language. Ask for the thing that changes the next move.",
      required: true,
      options: [
        { id: "urgent", label: "Urgent and ready", score: 16, tags: ["urgent"] },
        { id: "active", label: "Active but comparing", score: 10, tags: ["active"] },
        { id: "researching", label: "Researching first", score: 4, tags: ["education"] },
      ],
      tags: ["intent"],
      scoreWeight: 3,
    };
  }
  return {
    id,
    type,
    label: "What should we know before recommending the next move?",
    helperText: "Do not ask for protected traits, minors, private financial account data, medical data, passwords, hacked data, or hidden sensitive data.",
    required: type !== "custom_hidden",
    tags: ["context"],
    scoreWeight: type === "long_text" ? 2 : 4,
  };
}

function validateDraftClient(draft: BuilderQuestionnaireDraft) {
  const warnings: string[] = [];
  const errors: string[] = [];
  const text = [
    draft.title,
    draft.description,
    draft.definition.title,
    draft.definition.description,
    ...draft.definition.steps.flatMap((step) => [
      step.title,
      step.description || "",
      ...step.questions.flatMap((question) => [question.label, question.helperText || "", question.placeholder || ""]),
    ]),
  ].join(" ");

  if (SENSITIVE_RE.test(text)) errors.push("Sensitive or prohibited collection language is present.");
  if (!draft.definition.steps.length || !countQuestions(draft)) errors.push("Add at least one step with one question.");
  if (!draft.consentModules.some((module) => module.required && module.moduleType === "tool_answers_only")) {
    errors.push("A required tool-answers consent module is required before publish.");
  }
  if (!draft.resultPages.length) errors.push("Add at least one result page.");
  if (draft.definition.steps.some((step) => step.questions.some((question) => question.type === "file_upload"))) {
    warnings.push("File uploads require extra storage, abuse, and review controls before broad public use.");
  }
  return { errors, warnings, ok: errors.length === 0 };
}

function templateToDraft(template: BuilderTemplate): BuilderQuestionnaireDraft {
  return cloneDraft({
    ...template,
    id: undefined,
    status: "draft",
    visibility: "private",
    publishedRoute: null,
    shareUrl: null,
    embedWidgetId: null,
  });
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" | "bad" | "premium" }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-lg border px-2.5 text-xs font-black capitalize",
        tone === "good" && "border-lead-300/35 bg-lead-300/12 text-lead-100",
        tone === "warn" && "border-accent-300/35 bg-accent-300/12 text-accent-100",
        tone === "bad" && "border-red-300/35 bg-red-300/12 text-red-100",
        tone === "premium" && "border-fuchsia-300/35 bg-fuchsia-300/12 text-fuchsia-100",
        tone === "neutral" && "border-white/10 bg-white/[0.045] text-ink-200",
      )}
    >
      {fieldLabel(label)}
    </span>
  );
}

export function QuestionnaireBuilderClient({
  data,
  mode = "builder",
}: {
  data: BuilderDashboardData;
  mode?: "builder" | "admin";
}) {
  const router = useRouter();
  const initial = data.current || data.questionnaires[0] || data.templates[0];
  const [draft, setDraft] = useState<BuilderQuestionnaireDraft>(() => cloneDraft(initial));
  const [tab, setTab] = useState<BuilderTab>("Steps");
  const [stepIndex, setStepIndex] = useState(0);
  const [questionId, setQuestionId] = useState(() => draft.definition.steps[0]?.questions[0]?.id || "");
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    trackLeadFlowEvent("questionnaire_builder_opened", {
      route: mode === "admin" ? "/dashboard/questionnaires" : "/builder",
      user_role: data.access.role,
      status: draft.status,
      vertical: draft.vertical,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const firstQuestion = draft.definition.steps[stepIndex]?.questions[0]?.id || "";
    if (!draft.definition.steps[stepIndex]?.questions.some((question) => question.id === questionId)) {
      setQuestionId(firstQuestion);
    }
  }, [draft.definition.steps, questionId, stepIndex]);

  const validation = useMemo(() => validateDraftClient(draft), [draft]);
  const selectedStep = draft.definition.steps[stepIndex] || draft.definition.steps[0];
  const selectedQuestion = selectedStep?.questions.find((question) => question.id === questionId) || selectedStep?.questions[0] || null;

  if (!data.access.allowed) {
    return (
      <main className="min-h-screen bg-[#050711] px-4 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-accent-300/25 bg-accent-300/10 p-6 shadow-2xl shadow-black/30">
          <ShieldCheck className="h-9 w-9 text-accent-200" />
          <h1 className="mt-4 text-3xl font-black">Builder access is review-gated.</h1>
          <p className="mt-3 text-sm leading-6 text-accent-50">{data.access.reason}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/login?next=/builder" className="btn-accent text-sm">Log in</Link>
            <Link href="/build-my-system" className="btn-ghost text-sm">Ask LeadFlow to build it</Link>
          </div>
        </div>
      </main>
    );
  }

  function updateDraft(patch: Partial<BuilderQuestionnaireDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      if (patch.title && (!patch.slug || current.slug === slugify(current.title))) next.slug = slugify(patch.title);
      next.definition = {
        ...next.definition,
        toolSlug: next.slug,
        title: next.title,
        vertical: next.vertical,
        description: next.description,
      };
      return next;
    });
  }

  function updateDefinition(patch: Partial<BuilderQuestionnaireDraft["definition"]>) {
    setDraft((current) => ({ ...current, definition: { ...current.definition, ...patch } }));
  }

  function updateStep(index: number, patch: Partial<QuestionnaireStep>) {
    setDraft((current) => {
      const steps = [...current.definition.steps];
      steps[index] = { ...steps[index], ...patch };
      return { ...current, definition: { ...current.definition, steps } };
    });
  }

  function addStep() {
    setDraft((current) => {
      const step: QuestionnaireStep = {
        id: newKey("step"),
        title: `Step ${current.definition.steps.length + 1}`,
        description: "Ask one tight set of questions that creates a useful result.",
        questions: [defaultQuestion("single_select")],
      };
      return { ...current, definition: { ...current.definition, steps: [...current.definition.steps, step] } };
    });
    setStepIndex(draft.definition.steps.length);
  }

  function addQuestion(type: QuestionnaireQuestionType = "single_select") {
    setDraft((current) => {
      const steps = [...current.definition.steps];
      const safeIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
      const question = defaultQuestion(type);
      steps[safeIndex] = { ...steps[safeIndex], questions: [...steps[safeIndex].questions, question] };
      setQuestionId(question.id);
      return { ...current, definition: { ...current.definition, steps } };
    });
    trackLeadFlowEvent("question_added", { route: "/builder", vertical: draft.vertical, tool_slug: draft.slug, status: draft.status });
  }

  function updateQuestion(patch: Partial<QuestionnaireQuestion>) {
    if (!selectedQuestion) return;
    setDraft((current) => {
      const steps = current.definition.steps.map((step) => ({
        ...step,
        questions: step.questions.map((question) => (question.id === selectedQuestion.id ? { ...question, ...patch } : question)),
      }));
      return { ...current, definition: { ...current.definition, steps } };
    });
  }

  function deleteQuestion(id: string) {
    setDraft((current) => {
      const steps = current.definition.steps.map((step) => ({ ...step, questions: step.questions.filter((question) => question.id !== id) }));
      return { ...current, definition: { ...current.definition, steps } };
    });
  }

  function addOption() {
    if (!selectedQuestion) return;
    const option = { id: newKey("option"), label: "New answer", score: 5, tags: ["signal"] };
    updateQuestion({ options: [...(selectedQuestion.options || []), option] });
  }

  function updateOption(index: number, patch: Partial<NonNullable<QuestionnaireQuestion["options"]>[number]>) {
    if (!selectedQuestion) return;
    const options = [...(selectedQuestion.options || [])];
    options[index] = { ...options[index], ...patch };
    updateQuestion({ options });
  }

  function updateResult(index: number, patch: Partial<BuilderResultPage>) {
    setDraft((current) => {
      const resultPages = [...current.resultPages];
      resultPages[index] = { ...resultPages[index], ...patch };
      return { ...current, resultPages };
    });
  }

  function addConsentModule() {
    setDraft((current) => ({
      ...current,
      consentModules: [
        ...current.consentModules,
        {
          moduleType: "contact_me",
          label: "Contact me about this result.",
          body: "Optional. This does not approve seller routing, public display, or resale.",
          required: false,
          consentScope: "contact_about_result",
        },
      ],
    }));
    trackLeadFlowEvent("consent_module_added", { route: "/builder", vertical: draft.vertical, tool_slug: draft.slug });
  }

  function updateConsent(index: number, patch: Partial<BuilderConsentModule>) {
    setDraft((current) => {
      const consentModules = [...current.consentModules];
      consentModules[index] = { ...consentModules[index], ...patch };
      return { ...current, consentModules };
    });
  }

  async function save(action: "save" | "publish" | "clone" | "archive") {
    if (action === "publish" && !validation.ok) {
      setError(validation.errors[0] || "Fix validation issues before publishing.");
      return;
    }
    if (action === "archive" && !draft.id) return;
    if (action === "archive" && !window.confirm("Archive this questionnaire? This is audited and removes it from active builder lists.")) return;

    setPending(action);
    setMessage("");
    setError("");
    try {
      const payloadAction =
        action === "publish" ? "publish" : action === "clone" ? "clone" : action === "archive" ? "archive" : draft.id ? "save_draft" : "create";
      const response = await fetch("/api/leadflow/questionnaires/builder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: payloadAction,
          questionnaireId: draft.id || null,
          templateSlug: draft.templateSlug || null,
          draft,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Questionnaire save failed.");

      const eventName =
        payloadAction === "publish"
          ? "questionnaire_published"
          : payloadAction === "clone"
            ? "questionnaire_cloned"
            : payloadAction === "archive"
              ? "questionnaire_archived"
              : draft.id
                ? "questionnaire_created"
                : "questionnaire_created";
      trackLeadFlowEvent(eventName, {
        route: "/builder",
        vertical: draft.vertical,
        status: payloadAction,
        tool_slug: draft.slug,
        user_role: data.access.role,
      });
      const nextDraft = {
        ...draft,
        id: result.questionnaireId || draft.id,
        status: payloadAction === "publish" ? "published" as const : payloadAction === "archive" ? "archived" as const : draft.status,
        publishedRoute: result.routePath || draft.publishedRoute,
        shareUrl: result.shareUrl || draft.shareUrl,
        embedWidgetId: result.embedWidgetId || draft.embedWidgetId,
      };
      setDraft(nextDraft);
      setMessage(payloadAction === "publish" ? "Published with share URL and embed widget." : "Questionnaire saved and audited.");
      if (!draft.id && result.questionnaireId) router.push(`/builder/${result.questionnaireId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Questionnaire save failed.");
    } finally {
      setPending("");
    }
  }

  function loadTemplate(template: BuilderTemplate) {
    const next = templateToDraft(template);
    setDraft(next);
    setStepIndex(0);
    setQuestionId(next.definition.steps[0]?.questions[0]?.id || "");
    setMessage(`Loaded ${template.title}. Save it to create your own copy.`);
  }

  const shareUrl = draft.shareUrl || (draft.publishedRoute ? `https://www.theleadflowpro.com${draft.publishedRoute}` : "");
  const embedCode = `<script src="https://www.theleadflowpro.com/api/widget-script/${draft.slug}.js"></script>\n<div id="leadflow-widget-${draft.slug}"></div>`;

  return (
    <div className={mode === "admin" ? "mx-auto max-w-[1540px] space-y-6" : "min-h-screen bg-[#050711] text-white"}>
      <div className={mode === "admin" ? "" : "mx-auto max-w-[1600px] px-4 py-6 md:px-6"}>
        {mode !== "admin" ? <BuilderHeader draft={draft} data={data} /> : null}

        {data.loadErrors.length ? (
          <div className="mb-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)_380px]">
          <aside className="space-y-4 rounded-2xl border border-white/10 bg-[#060a11]/90 p-4 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-ink-300">Builder rail</h2>
              <StatusPill label={data.mode} tone={data.mode === "live" ? "good" : "warn"} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TABS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={cn(
                    "min-h-10 rounded-lg border px-2 text-left text-xs font-black",
                    tab === item ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-50" : "border-white/10 bg-white/[0.035] text-ink-300 hover:text-white",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-black uppercase tracking-wider text-ink-400">Templates</p>
              <div className="mt-3 space-y-2">
                {data.templates.map((template) => (
                  <button
                    key={template.templateSlug}
                    type="button"
                    onClick={() => loadTemplate(template)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition hover:border-cyan-300/30",
                      draft.templateSlug === template.templateSlug ? "border-cyan-300/35 bg-cyan-300/10" : "border-white/10 bg-[#050711]",
                    )}
                  >
                    <span className="block text-sm font-black text-white">{template.title}</span>
                    <span className="mt-1 block text-xs leading-5 text-ink-400">{template.audience}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <p className="text-xs font-black uppercase tracking-wider text-ink-400">Saved questionnaires</p>
              <div className="mt-3 space-y-2">
                {data.questionnaires.length ? data.questionnaires.slice(0, 10).map((item) => (
                  <Link
                    key={item.id || item.slug}
                    href={item.id ? `/builder/${item.id}` : `/builder/new?template=${item.slug}`}
                    className="block rounded-lg border border-white/10 bg-[#050711] p-3 hover:border-cyan-300/30"
                  >
                    <span className="block text-sm font-black text-white">{item.title}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-ink-400">
                      {item.vertical} <StatusPill label={item.status} />
                    </span>
                  </Link>
                )) : <p className="text-sm leading-6 text-ink-400">No saved questionnaires yet.</p>}
              </div>
            </div>
          </aside>

          <section className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/30">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-200">
                    <Sparkles className="h-4 w-4" />
                    White-label questionnaire builder
                  </p>
                  <h1 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">{draft.title}</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">{draft.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill label={draft.status} tone={draft.status === "published" ? "good" : draft.status === "archived" ? "bad" : "warn"} />
                  <StatusPill label={`${countQuestions(draft)} questions`} tone="premium" />
                  <StatusPill label={validation.ok ? "safe to publish" : "blocked"} tone={validation.ok ? "good" : "bad"} />
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Title" value={draft.title} onChange={(value) => updateDraft({ title: value })} />
                <Field label="Slug" value={draft.slug} onChange={(value) => updateDraft({ slug: slugify(value) })} mono />
                <Field label="Vertical" value={draft.vertical} onChange={(value) => updateDraft({ vertical: slugify(value).replace(/-/g, "_") })} />
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wider text-ink-400">Visibility</span>
                  <select
                    value={draft.visibility}
                    onChange={(event) => updateDraft({ visibility: event.target.value as BuilderQuestionnaireDraft["visibility"] })}
                    className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50"
                  >
                    <option value="private">Private</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="public">Public</option>
                    <option value="internal">Internal</option>
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wider text-ink-400">Description</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraft({ description: event.target.value })}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/50"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-wider text-ink-400">Result value preview</span>
                  <textarea
                    value={draft.definition.valuePreview}
                    onChange={(event) => updateDefinition({ valuePreview: event.target.value })}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/50"
                  />
                </label>
              </div>
            </div>

            <BuilderCanvas
              draft={draft}
              stepIndex={stepIndex}
              selectedQuestionId={questionId}
              onStepSelect={setStepIndex}
              onQuestionSelect={setQuestionId}
              onStepUpdate={updateStep}
              onStepAdd={addStep}
              onQuestionAdd={addQuestion}
              onQuestionDelete={deleteQuestion}
            />
          </section>

          <aside className="space-y-5 rounded-2xl border border-white/10 bg-[#060a11]/92 p-4 shadow-2xl shadow-black/30 xl:sticky xl:top-5 xl:max-h-[calc(100vh-40px)] xl:overflow-y-auto">
            <RightPanel
              tab={tab}
              draft={draft}
              selectedQuestion={selectedQuestion}
              validation={validation}
              onQuestionUpdate={updateQuestion}
              onOptionAdd={addOption}
              onOptionUpdate={updateOption}
              onResultUpdate={updateResult}
              onConsentAdd={addConsentModule}
              onConsentUpdate={updateConsent}
              onDraftUpdate={setDraft}
              shareUrl={shareUrl}
              embedCode={embedCode}
            />

            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-ink-300">Actions</h3>
              <div className="mt-4 grid gap-2">
                <ActionButton pending={pending === "save"} icon={Save} label={draft.id ? "Save draft" : "Create draft"} onClick={() => save("save")} />
                <ActionButton pending={pending === "publish"} icon={Rocket} label="Publish" onClick={() => save("publish")} disabled={!validation.ok} variant="primary" />
                <Link href={draft.id ? `/builder/${draft.id}/preview` : "/builder/new"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-4 text-sm font-black text-ink-100 hover:border-cyan-300/30">
                  <Eye className="h-4 w-4" />
                  Preview
                </Link>
                <Link href={draft.id ? `/builder/${draft.id}/share` : "/builder/new"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-4 text-sm font-black text-ink-100 hover:border-cyan-300/30">
                  <Share2 className="h-4 w-4" />
                  Share
                </Link>
                <ActionButton pending={pending === "clone"} icon={Copy} label="Clone" onClick={() => save("clone")} />
                {draft.id ? <ActionButton pending={pending === "archive"} icon={Archive} label="Archive" onClick={() => save("archive")} variant="danger" /> : null}
              </div>
              {message ? <p className="mt-4 rounded-lg border border-lead-300/25 bg-lead-300/10 p-3 text-sm font-bold text-lead-100">{message}</p> : null}
              {error ? <p className="mt-4 rounded-lg border border-red-300/25 bg-red-300/10 p-3 text-sm font-bold text-red-100">{error}</p> : null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function BuilderHeader({ draft, data }: { draft: BuilderQuestionnaireDraft; data: BuilderDashboardData }) {
  return (
    <header className="mb-6 rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_16%_12%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_78%_10%,rgba(255,186,61,0.13),transparent_30%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-lg border border-lead-300/25 bg-lead-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-lead-200">
            <GitBranch className="h-4 w-4" />
            Builder product
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
            Build branded tools that collect better first-party signals.
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
            Create quizzes, calculators, routing tools, scoring rules, consent modules, result pages, share links, and embed widgets without turning the site into blind-list selling.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[360px]">
          <Metric label="Role" value={data.access.role} />
          <Metric label="Current" value={draft.status} />
          <Metric label="Mode" value={data.mode} />
        </div>
      </div>
    </header>
  );
}

function BuilderCanvas({
  draft,
  stepIndex,
  selectedQuestionId,
  onStepSelect,
  onQuestionSelect,
  onStepUpdate,
  onStepAdd,
  onQuestionAdd,
  onQuestionDelete,
}: {
  draft: BuilderQuestionnaireDraft;
  stepIndex: number;
  selectedQuestionId: string;
  onStepSelect: (index: number) => void;
  onQuestionSelect: (id: string) => void;
  onStepUpdate: (index: number, patch: Partial<QuestionnaireStep>) => void;
  onStepAdd: () => void;
  onQuestionAdd: (type?: QuestionnaireQuestionType) => void;
  onQuestionDelete: (id: string) => void;
}) {
  const step = draft.definition.steps[stepIndex] || draft.definition.steps[0];
  return (
    <div className="rounded-2xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Editable questionnaire canvas</h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">Keep each step focused. Ask for signal, not noise.</p>
        </div>
        <button type="button" onClick={onStepAdd} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50">
          <Plus className="h-4 w-4" />
          Add step
        </button>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {draft.definition.steps.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onStepSelect(index)}
            className={cn(
              "min-w-[160px] rounded-lg border px-3 py-2 text-left text-sm font-black",
              stepIndex === index ? "border-lead-300/35 bg-lead-300/12 text-white" : "border-white/10 bg-white/[0.035] text-ink-300",
            )}
          >
            <span className="block text-xs uppercase tracking-wider text-ink-400">Step {index + 1}</span>
            {item.title}
          </button>
        ))}
      </div>

      {step ? (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Step title" value={step.title} onChange={(value) => onStepUpdate(stepIndex, { title: value })} />
            <Field label="Step id" value={step.id} onChange={(value) => onStepUpdate(stepIndex, { id: slugify(value) })} mono />
            <label className="block md:col-span-2">
              <span className="text-xs font-black uppercase tracking-wider text-ink-400">Step description</span>
              <textarea
                value={step.description || ""}
                onChange={(event) => onStepUpdate(stepIndex, { description: event.target.value })}
                rows={2}
                className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/50"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {step.questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                onClick={() => onQuestionSelect(question.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  selectedQuestionId === question.id ? "border-cyan-300/40 bg-cyan-300/10" : "border-white/10 bg-[#050711] hover:border-cyan-300/25",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-ink-500">Question {index + 1} · {fieldLabel(question.type)}</span>
                    <h3 className="mt-1 text-lg font-black text-white">{question.label}</h3>
                    {question.helperText ? <p className="mt-1 text-sm leading-6 text-ink-300">{question.helperText}</p> : null}
                  </div>
                  <span className="rounded-lg border border-white/10 bg-white/[0.045] px-2 py-1 text-xs font-black text-ink-300">{question.required ? "Required" : "Optional"}</span>
                </div>
                {question.options?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {question.options.slice(0, 6).map((option) => (
                      <span key={option.id} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-ink-200">{option.label}</span>
                    ))}
                  </div>
                ) : null}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onQuestionAdd("single_select")} className="btn-ghost text-sm"><Plus className="h-4 w-4" /> Add select</button>
            <button type="button" onClick={() => onQuestionAdd("short_text")} className="btn-ghost text-sm"><Plus className="h-4 w-4" /> Add text</button>
            <button type="button" onClick={() => onQuestionAdd("rating_scale")} className="btn-ghost text-sm"><Plus className="h-4 w-4" /> Add rating</button>
            {selectedQuestionId ? (
              <button type="button" onClick={() => onQuestionDelete(selectedQuestionId)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-300/30 bg-red-300/10 px-4 text-sm font-black text-red-100">
                <Trash2 className="h-4 w-4" />
                Delete selected
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RightPanel({
  tab,
  draft,
  selectedQuestion,
  validation,
  onQuestionUpdate,
  onOptionAdd,
  onOptionUpdate,
  onResultUpdate,
  onConsentAdd,
  onConsentUpdate,
  onDraftUpdate,
  shareUrl,
  embedCode,
}: {
  tab: BuilderTab;
  draft: BuilderQuestionnaireDraft;
  selectedQuestion: QuestionnaireQuestion | null;
  validation: { ok: boolean; errors: string[]; warnings: string[] };
  onQuestionUpdate: (patch: Partial<QuestionnaireQuestion>) => void;
  onOptionAdd: () => void;
  onOptionUpdate: (index: number, patch: Partial<NonNullable<QuestionnaireQuestion["options"]>[number]>) => void;
  onResultUpdate: (index: number, patch: Partial<BuilderResultPage>) => void;
  onConsentAdd: () => void;
  onConsentUpdate: (index: number, patch: Partial<BuilderConsentModule>) => void;
  onDraftUpdate: (draft: BuilderQuestionnaireDraft) => void;
  shareUrl: string;
  embedCode: string;
}) {
  return (
    <>
      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-cyan-200" />
          <h3 className="text-sm font-black uppercase tracking-wider text-ink-300">{tab}</h3>
        </div>

        {tab === "Questions" || tab === "Steps" || tab === "Logic" || tab === "Scoring" ? (
          selectedQuestion ? (
            <div className="mt-4 space-y-4">
              <Field label="Question label" value={selectedQuestion.label} onChange={(value) => onQuestionUpdate({ label: value })} />
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-ink-400">Question type</span>
                <select
                  value={selectedQuestion.type}
                  onChange={(event) => onQuestionUpdate({ type: event.target.value as QuestionnaireQuestionType })}
                  className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50"
                >
                  {QUESTION_TYPES.map((type) => <option key={type} value={type}>{fieldLabel(type)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wider text-ink-400">Helper text</span>
                <textarea
                  value={selectedQuestion.helperText || ""}
                  onChange={(event) => onQuestionUpdate({ helperText: event.target.value })}
                  rows={3}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/50"
                />
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#050711] p-3 text-sm font-bold text-ink-100">
                <input type="checkbox" checked={Boolean(selectedQuestion.required)} onChange={(event) => onQuestionUpdate({ required: event.target.checked })} />
                Required question
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Score weight" type="number" value={String(selectedQuestion.scoreWeight || 0)} onChange={(value) => {
                  onQuestionUpdate({ scoreWeight: Number(value) || 0 });
                  trackLeadFlowEvent("scoring_rule_added", { route: "/builder", tool_slug: draft.slug, vertical: draft.vertical });
                }} />
                <Field label="Tags" value={(selectedQuestion.tags || []).join(", ")} onChange={(value) => onQuestionUpdate({ tags: value.split(",").map((item) => slugify(item).replace(/-/g, "_")).filter(Boolean) })} />
              </div>
              {["single_select", "multi_select", "industry", "seller_selection", "yes_no", "budget_range", "ranking", "priority_ranking"].includes(selectedQuestion.type) ? (
                <div className="rounded-lg border border-white/10 bg-[#050711] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wider text-ink-400">Options</p>
                    <button type="button" onClick={onOptionAdd} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-50">Add</button>
                  </div>
                  <div className="mt-3 space-y-3">
                    {(selectedQuestion.options || []).map((option, index) => (
                      <div key={option.id} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                        <Field label="Label" value={option.label} onChange={(value) => onOptionUpdate(index, { label: value, id: slugify(value).replace(/-/g, "_") || option.id })} />
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <Field label="Score" type="number" value={String(option.score || 0)} onChange={(value) => onOptionUpdate(index, { score: Number(value) || 0 })} />
                          <Field label="Tags" value={(option.tags || []).join(", ")} onChange={(value) => onOptionUpdate(index, { tags: value.split(",").map((item) => slugify(item).replace(/-/g, "_")).filter(Boolean) })} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : <p className="mt-4 text-sm leading-6 text-ink-300">Select a question from the canvas.</p>
        ) : null}

        {tab === "Results" ? (
          <div className="mt-4 space-y-4">
            {draft.resultPages.map((page, index) => (
              <div key={page.resultKey} className="rounded-lg border border-white/10 bg-[#050711] p-3">
                <Field label="Title" value={page.title} onChange={(value) => onResultUpdate(index, { title: value })} />
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="Min" type="number" value={String(page.minScore)} onChange={(value) => onResultUpdate(index, { minScore: Number(value) || 0 })} />
                  <Field label="Max" type="number" value={String(page.maxScore)} onChange={(value) => onResultUpdate(index, { maxScore: Number(value) || 100 })} />
                </div>
                <label className="mt-3 block">
                  <span className="text-xs font-black uppercase tracking-wider text-ink-400">Summary</span>
                  <textarea value={page.summary} onChange={(event) => onResultUpdate(index, { summary: event.target.value })} rows={3} className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/50" />
                </label>
              </div>
            ))}
          </div>
        ) : null}

        {tab === "Consent" ? (
          <div className="mt-4 space-y-3">
            {draft.consentModules.map((module, index) => (
              <div key={`${module.moduleType}-${index}`} className="rounded-lg border border-white/10 bg-[#050711] p-3">
                <Field label="Label" value={module.label} onChange={(value) => onConsentUpdate(index, { label: value })} />
                <label className="mt-3 block">
                  <span className="text-xs font-black uppercase tracking-wider text-ink-400">Body</span>
                  <textarea value={module.body} onChange={(event) => onConsentUpdate(index, { body: event.target.value })} rows={3} className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none focus:border-cyan-300/50" />
                </label>
                <label className="mt-3 flex items-center gap-3 text-sm font-bold text-ink-100">
                  <input type="checkbox" checked={module.required} onChange={(event) => onConsentUpdate(index, { required: event.target.checked })} />
                  Required
                </label>
              </div>
            ))}
            <button type="button" onClick={onConsentAdd} className="btn-ghost w-full text-sm"><Plus className="h-4 w-4" /> Add consent module</button>
          </div>
        ) : null}

        {tab === "Theme" ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["accent", "background", "surface", "button"] as const).map((key) => (
              <Field
                key={key}
                label={fieldLabel(key)}
                value={draft.theme[key]}
                onChange={(value) => onDraftUpdate({ ...draft, theme: { ...draft.theme, [key]: value } })}
              />
            ))}
          </div>
        ) : null}

        {tab === "Publish" ? (
          <div className="mt-4 space-y-4">
            <ValidationPanel validation={validation} />
            <CopyBlock label="Share URL" value={shareUrl || "Publish to generate a share URL."} disabled={!shareUrl} />
            <CopyBlock label="Embed code" value={embedCode} />
          </div>
        ) : null}
      </div>
    </>
  );
}

function ValidationPanel({ validation }: { validation: { ok: boolean; errors: string[]; warnings: string[] } }) {
  return (
    <div className={cn("rounded-lg border p-3", validation.ok ? "border-lead-300/25 bg-lead-300/10" : "border-red-300/25 bg-red-300/10")}>
      <div className="flex items-center gap-2 text-sm font-black text-white">
        {validation.ok ? <CheckCircle2 className="h-4 w-4 text-lead-200" /> : <AlertTriangle className="h-4 w-4 text-red-200" />}
        {validation.ok ? "Builder checks passed" : "Fix before publish"}
      </div>
      <div className="mt-2 space-y-1 text-xs leading-5 text-ink-200">
        {validation.errors.map((item) => <p key={item}>{item}</p>)}
        {validation.warnings.map((item) => <p key={item}>{item}</p>)}
        {!validation.errors.length && !validation.warnings.length ? <p>No client-side warnings. Server validation still runs on publish.</p> : null}
      </div>
    </div>
  );
}

function CopyBlock({ label, value, disabled }: { label: string; value: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-white/10 bg-[#050711] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wider text-ink-400">{label}</p>
        <button
          type="button"
          disabled={disabled}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          }}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-ink-100 disabled:opacity-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-white/10 bg-ink-950 p-3 text-xs leading-5 text-ink-200">{value}</pre>
    </div>
  );
}

function ActionButton({
  pending,
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "neutral",
}: {
  pending: boolean;
  icon: typeof Save;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "neutral" | "primary" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "border-lead-300/35 bg-lead-300/15 text-lead-50",
        variant === "danger" && "border-red-300/35 bg-red-300/12 text-red-100",
        variant === "neutral" && "border-white/10 bg-white/[0.045] text-ink-100 hover:border-cyan-300/30",
      )}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wider text-ink-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50",
          mono && "font-mono",
        )}
      />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-black capitalize text-white">{fieldLabel(value)}</p>
    </div>
  );
}
