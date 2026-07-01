"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import { cn } from "@/lib/utils";

type IssueOption = {
  id: string;
  label: string;
};

type SubmitState =
  | { status: "idle"; message: "" }
  | { status: "success"; message: string; persisted: boolean }
  | { status: "error"; message: string };

const URGENCY_OPTIONS = [
  { value: 1, label: "Low" },
  { value: 2, label: "Watch" },
  { value: 3, label: "Real concern" },
  { value: 4, label: "Needs action" },
  { value: 5, label: "Urgent" },
];

function getAnonymousUserId() {
  const key = "leadflow_civic_anonymous_user";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? `civic_${crypto.randomUUID()}`
      : `civic_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, next);
  return next;
}

export function CivicSurveyClient({ issueCategories }: { issueCategories: IssueOption[] }) {
  const [location, setLocation] = useState("");
  const [district, setDistrict] = useState("");
  const [issuePriority, setIssuePriority] = useState("");
  const [concernCategory, setConcernCategory] = useState(issueCategories[0]?.id || "other");
  const [urgency, setUrgency] = useState(3);
  const [personalStory, setPersonalStory] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saveResponse, setSaveResponse] = useState(true);
  const [contactMe, setContactMe] = useState(false);
  const [publicDisplay, setPublicDisplay] = useState(false);
  const [shareWithCivicOrg, setShareWithCivicOrg] = useState(false);
  const [keepAnonymous, setKeepAnonymous] = useState(true);
  const [started, setStarted] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle", message: "" });

  const canSubmit = useMemo(() => {
    return location.trim().length >= 2 && issuePriority.trim().length >= 4 && saveResponse && !pending;
  }, [issuePriority, location, pending, saveResponse]);

  function markStarted() {
    if (started) return;
    setStarted(true);
    trackLeadFlowEvent("civic_survey_started", {
      route: "/civic/surveys",
      tool_slug: "civic_issue_pulse",
      category: concernCategory,
      status: "started",
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    markStarted();
    setPending(true);
    setSubmitState({ status: "idle", message: "" });

    try {
      const payload = {
        location,
        district,
        issuePriority,
        concernCategory,
        urgency,
        personalStory,
        contactEmail: contactMe ? contactEmail : "",
        consents: {
          saveResponse,
          contactMe,
          publicDisplay,
          shareWithCivicOrg,
          keepAnonymous,
        },
        anonymousUserId: getAnonymousUserId(),
        sourceUrl: window.location.href,
        sourcePath: `${window.location.pathname}${window.location.search}`,
      };

      const response = await fetch("/api/leadflow/civic/survey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        trackLeadFlowEvent("civic_submission_flagged", {
          route: "/civic/surveys",
          category: concernCategory,
          status: "blocked_or_failed",
        });
        throw new Error(result.error || "This civic issue signal could not be submitted.");
      }

      trackLeadFlowEvent("civic_survey_completed", {
        route: "/civic/surveys",
        tool_slug: "civic_issue_pulse",
        category: concernCategory,
        status: result.persisted ? "persisted" : "safe_local_mode",
        urgency,
      });

      setSubmitState({
        status: "success",
        message: result.message || "Your civic issue signal was submitted for review.",
        persisted: Boolean(result.persisted),
      });
      setIssuePriority("");
      setPersonalStory("");
    } catch (error) {
      setSubmitState({
        status: "error",
        message: error instanceof Error ? error.message : "This civic issue signal could not be submitted.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
      <form onSubmit={submit} onFocus={markStarted} className="lead-shell p-5 md:p-7">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-ink-400">Location</span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Longview, Texas"
              className="h-12 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/60"
              required
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-ink-400">District optional</span>
            <input
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              placeholder="City council, county, school board"
              className="h-12 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/60"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-[1fr_220px]">
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-ink-400">What issue should leaders fix first?</span>
            <input
              value={issuePriority}
              onChange={(event) => setIssuePriority(event.target.value)}
              placeholder="Road drainage, public records delays, school safety, court access"
              className="h-12 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/60"
              required
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-ink-400">Category</span>
            <select
              value={concernCategory}
              onChange={(event) => setConcernCategory(event.target.value)}
              className="h-12 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/60"
            >
              {issueCategories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="mt-5">
          <legend className="text-xs font-black uppercase tracking-wider text-ink-400">Urgency</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-5">
            {URGENCY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setUrgency(option.value)}
                className={cn(
                  "min-h-14 rounded-lg border px-3 text-sm font-black transition",
                  urgency === option.value
                    ? "border-accent-300/60 bg-accent-300 text-black"
                    : "border-white/10 bg-white/[0.035] text-ink-100 hover:border-cyan-300/35"
                )}
              >
                <span className="block text-lg">{option.value}</span>
                <span className="block text-[11px] uppercase tracking-wider">{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-5 grid gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-ink-400">Personal story optional</span>
          <textarea
            value={personalStory}
            onChange={(event) => setPersonalStory(event.target.value)}
            rows={6}
            placeholder="Explain what happened, what changed, or what leaders should see. Do not include minors, medical records, private messages, private financial data, hacked or leaked lists, or protected-trait targeting."
            className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm font-bold leading-6 text-white outline-none focus:border-cyan-300/60"
          />
        </label>

        <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-sm font-black text-white">Choose exactly what permission you are giving.</p>
          <p className="mt-2 text-sm leading-6 text-ink-300">
            These are separate controls. Saving a survey is not the same as contact permission, public display, or sharing with a civic group.
          </p>
          <div className="mt-4 grid gap-3">
            <ConsentCheckbox checked={saveResponse} onChange={setSaveResponse} required label="Save my survey response." body="Required to submit. Used for aggregate civic issue pulse analysis." />
            <ConsentCheckbox checked={contactMe} onChange={setContactMe} label="Contact me about this issue." body="Optional. This does not approve public display or sharing." />
            {contactMe ? (
              <label className="ml-8 grid gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-ink-400">Email for issue updates optional</span>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/60"
                />
              </label>
            ) : null}
            <ConsentCheckbox checked={publicDisplay} onChange={setPublicDisplay} label="Display my comment publicly." body="Optional. Public display still requires review and removes private contact info." />
            <ConsentCheckbox checked={shareWithCivicOrg} onChange={setShareWithCivicOrg} label="Share my concern with a civic organization or campaign." body="Optional. This is reviewed manually and must match the stated issue purpose." />
            <ConsentCheckbox checked={keepAnonymous} onChange={setKeepAnonymous} label="Keep my response anonymous." body="Optional. Public displays will not show private contact information." />
          </div>
        </div>

        {submitState.status !== "idle" ? (
          <div
            className={cn(
              "mt-5 rounded-lg border p-4 text-sm font-bold leading-6",
              submitState.status === "success"
                ? "border-lead-300/35 bg-lead-300/10 text-lead-100"
                : "border-red-300/35 bg-red-300/10 text-red-100"
            )}
          >
            {submitState.status === "success" ? <CheckCircle2 className="mb-2 h-5 w-5" /> : <AlertTriangle className="mb-2 h-5 w-5" />}
            {submitState.message}
            {submitState.status === "success" && !submitState.persisted ? (
              <p className="mt-2 text-xs text-ink-300">Supabase is not configured locally, so this is a safe preview submission.</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-300 px-5 text-sm font-black text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit issue signal
            {!pending ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
          <Link href="/civic/issue-pulse" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] px-5 text-sm font-black text-ink-100">
            View aggregate pulse
          </Link>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="lead-shell p-5">
          <ShieldCheck className="h-7 w-7 text-cyan-300" />
          <h2 className="mt-4 text-2xl font-black text-white">Safety rules.</h2>
          <div className="mt-4 grid gap-3 text-sm font-bold leading-6 text-ink-200">
            <p>No minors.</p>
            <p>No private messages, hacked lists, leaked lists, or login-only data.</p>
            <p>No protected-trait targeting.</p>
            <p>No private political identity labels.</p>
            <p>No medical records or private financial account data.</p>
          </div>
        </div>
        <div className="lead-panel p-5">
          <p className="text-xs font-black uppercase tracking-wider text-accent-300">What happens next</p>
          <h3 className="mt-3 text-xl font-black text-white">Aggregate first. Review before display.</h3>
          <p className="mt-3 text-sm leading-6 text-ink-300">
            Your answers can update aggregate issue counts. Personal stories only become public if you selected public display and the submission passes admin review.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
  body,
  required,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  body: string;
  required?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-ink-950/70 p-3">
      <input
        type="checkbox"
        checked={checked}
        required={required}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 rounded border-white/20 bg-ink-950 accent-cyan-300"
      />
      <span>
        <span className="block text-sm font-black text-white">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-ink-300">{body}</span>
      </span>
    </label>
  );
}
