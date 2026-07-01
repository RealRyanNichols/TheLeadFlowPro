"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  FileText,
  Loader2,
  LockKeyhole,
  ShieldAlert,
  UploadCloud,
} from "lucide-react";
import { trackEvent } from "@/lib/events";
import {
  SOURCE_SUBMISSION_VERSION,
  emptyPermissionAnswers,
  evaluateSourceRisk,
  labelForSourceOption,
  sourceCategories,
  sourceDataFieldOptions,
  sourceOriginOptions,
  sourceSubmissionTypes,
  sourceVerticals,
  type SourcePermissionAnswers,
} from "@/lib/source-submission";

type FormState = {
  sourceType: string;
  sourceName: string;
  sourceUrl: string;
  shortDescription: string;
  vertical: string;
  categories: string[];
  geography: string;
  buyerType: string;
  bestUseCase: string;
  dataFieldsPresent: string[];
  originType: string;
  originNotes: string;
  permission: SourcePermissionAnswers;
  restrictions: string;
  samplePaste: string;
  urlList: string;
  sampleNotes: string;
  contributorName: string;
  contributorEmail: string;
  contributorPhone: string;
  contributorCompany: string;
  contributorWebsite: string;
  payoutInterest: boolean;
  partnershipInterest: boolean;
  consentAccepted: boolean;
};

type SubmissionResult = {
  id: string;
  persisted: boolean;
  reviewStatus: string;
  riskLevel: string;
  flags: string[];
};

const steps = [
  "Source",
  "Fit",
  "Data",
  "Origin",
  "Rights",
  "Sample",
  "Contributor",
  "Review",
] as const;

const initialState: FormState = {
  sourceType: "website_directory",
  sourceName: "",
  sourceUrl: "",
  shortDescription: "",
  vertical: "Local business",
  categories: ["Public directory"],
  geography: "",
  buyerType: "",
  bestUseCase: "",
  dataFieldsPresent: ["business_names", "websites"],
  originType: "public_website",
  originNotes: "",
  permission: emptyPermissionAnswers(),
  restrictions: "",
  samplePaste: "",
  urlList: "",
  sampleNotes: "",
  contributorName: "",
  contributorEmail: "",
  contributorPhone: "",
  contributorCompany: "",
  contributorWebsite: "",
  payoutInterest: false,
  partnershipInterest: false,
  consentAccepted: false,
};

function cleanScalar(value: string, max = 1600) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function sendSourceEvent(eventName: string, properties: Record<string, unknown>) {
  trackEvent(eventName, { route: "/submit-source", ...properties });
}

export function SourceSubmissionForm() {
  const [state, setState] = useState<FormState>(initialState);
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const risk = useMemo(
    () =>
      evaluateSourceRisk({
        sourceType: state.sourceType,
        originType: state.originType,
        dataFieldsPresent: state.dataFieldsPresent,
        permission: state.permission,
        restrictions: state.restrictions,
        sourceUrl: state.sourceUrl,
      }),
    [state],
  );

  const completion = Math.round(((step + 1) / steps.length) * 100);

  useEffect(() => {
    sendSourceEvent("submit_source_viewed", {
      step_number: 1,
    });
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function updatePermission<K extends keyof SourcePermissionAnswers>(key: K, value: SourcePermissionAnswers[K]) {
    setState((current) => ({
      ...current,
      permission: { ...current.permission, [key]: value },
    }));
  }

  function toggleArray(key: "categories" | "dataFieldsPresent", value: string) {
    setState((current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];
      return { ...current, [key]: nextValues.length ? nextValues : currentValues };
    });
  }

  function validateCurrentStep() {
    if (step === 0) {
      if (cleanScalar(state.sourceName).length < 3) return "Give the source a clear name.";
      if (cleanScalar(state.shortDescription).length < 20) return "Add a short description with enough context to review.";
    }
    if (step === 1) {
      if (!state.vertical) return "Pick the main vertical.";
      if (!state.categories.length) return "Choose at least one category.";
      if (cleanScalar(state.bestUseCase).length < 12) return "Tell us the best buyer use case.";
    }
    if (step === 2 && !state.dataFieldsPresent.length) return "Select at least one data field.";
    if (step === 3 && !state.originType) return "Tell us where the source came from.";
    if (step === 5 && !file && !cleanScalar(state.samplePaste) && !cleanScalar(state.urlList) && !cleanScalar(state.sampleNotes)) {
      return "Upload a sample, paste sample text, add URLs, or write notes.";
    }
    if (step === 6) {
      if (cleanScalar(state.contributorName).length < 2) return "Add your name.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.contributorEmail)) return "Add a valid email.";
      if (!state.consentAccepted) return "Confirm the source submission consent.";
    }
    return null;
  }

  function goNext() {
    const validation = validateCurrentStep();
    if (validation) {
      setError(validation);
      return;
    }

    setError(null);
    sendSourceEvent(step === 0 ? "source_submission_started" : "source_submission_step_completed", {
      step_number: step + 1,
      step_name: steps[step],
      source_type: state.sourceType,
      risk_level: risk.riskLevel,
    });
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!state.consentAccepted) {
      setError("Final consent is required before review.");
      return;
    }

    const payload = new FormData();
    payload.set("source_type", state.sourceType);
    payload.set("source_name", cleanScalar(state.sourceName, 180));
    payload.set("source_url", cleanScalar(state.sourceUrl, 700));
    payload.set("short_description", cleanScalar(state.shortDescription, 2000));
    payload.set("vertical", state.vertical);
    payload.set("categories", JSON.stringify(state.categories));
    payload.set("geography", cleanScalar(state.geography, 240));
    payload.set("buyer_type", cleanScalar(state.buyerType, 220));
    payload.set("best_use_case", cleanScalar(state.bestUseCase, 2000));
    payload.set("data_fields_present", JSON.stringify(state.dataFieldsPresent));
    payload.set("origin_type", state.originType);
    payload.set("origin_notes", cleanScalar(state.originNotes, 2000));
    payload.set("permission_claim", JSON.stringify(state.permission));
    payload.set("restrictions", cleanScalar(state.restrictions, 2000));
    payload.set("sample_paste", state.samplePaste.slice(0, 20000));
    payload.set("url_list", state.urlList.slice(0, 12000));
    payload.set("sample_notes", cleanScalar(state.sampleNotes, 2000));
    payload.set("contributor_name", cleanScalar(state.contributorName, 180));
    payload.set("contributor_email", state.contributorEmail.trim().toLowerCase());
    payload.set("contributor_phone", cleanScalar(state.contributorPhone, 60));
    payload.set("contributor_company", cleanScalar(state.contributorCompany, 180));
    payload.set("contributor_website", cleanScalar(state.contributorWebsite, 700));
    payload.set("payout_interest", String(state.payoutInterest));
    payload.set("partnership_interest", String(state.partnershipInterest));
    payload.set("consent_accepted", String(state.consentAccepted));
    payload.set("source_path", `${window.location.pathname}${window.location.search}`);
    payload.set("client_timestamp", new Date().toISOString());
    payload.set("submission_version", SOURCE_SUBMISSION_VERSION);
    if (file) payload.set("sample_file", file);

    setSubmitting(true);
    try {
      if (file) {
        sendSourceEvent("source_file_uploaded", {
          source_type: state.sourceType,
          file_type: file.type || "unknown",
          file_size_bucket: file.size > 1_000_000 ? "large" : file.size > 100_000 ? "medium" : "small",
        });
      }

      const response = await fetch("/api/leadflow/source-submissions", {
        method: "POST",
        body: payload,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not submit this source.");

      const nextResult = {
        id: String(data.submission?.id || data.submissionId || "local-preview"),
        persisted: Boolean(data.persisted),
        reviewStatus: String(data.reviewStatus || risk.reviewStatus),
        riskLevel: String(data.riskLevel || risk.riskLevel),
        flags: Array.isArray(data.flags) ? data.flags : risk.flags,
      };
      setResult(nextResult);
      sendSourceEvent("source_submission_completed", {
        source_type: state.sourceType,
        vertical: state.vertical,
        risk_level: nextResult.riskLevel,
        review_status: nextResult.reviewStatus,
        persisted: nextResult.persisted,
      });
      if (nextResult.flags.length) {
        sendSourceEvent("source_submission_flagged", {
          source_type: state.sourceType,
          risk_level: nextResult.riskLevel,
          flag_count: nextResult.flags.length,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit this source.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="source-review-form"
      onSubmit={submit}
      className="lead-shell overflow-hidden"
      data-conversion-event="source_submission_completed"
      data-conversion-cta="Submit source for review"
      data-conversion-source-page="/submit-source"
      data-conversion-destination="/api/leadflow/source-submissions"
    >
      <div className="grid border-b border-white/10 lg:grid-cols-[18rem_1fr]">
        <aside className="border-b border-white/10 bg-white/[0.025] p-5 lg:border-b-0 lg:border-r lg:border-white/10">
          <p className="text-xs font-extrabold uppercase tracking-wider text-lead-300">Source submission</p>
          <h2 className="mt-2 text-2xl font-black text-white">Start Source Submission</h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">
            Give us the source, proof, rights, risks, and sample context. Nothing is released without review.
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink-400">
              <span>Progress</span>
              <span>{completion}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-lead-300 to-accent-300" style={{ width: `${completion}%` }} />
            </div>
          </div>

          <ol className="mt-5 space-y-2">
            {steps.map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                    index === step
                      ? "border-cyan-300/40 bg-cyan-300/10 text-white"
                      : index < step
                        ? "border-lead-300/25 bg-lead-300/10 text-lead-100"
                        : "border-white/10 bg-white/[0.025] text-ink-300"
                  }`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/25 text-xs font-black">
                    {index < step ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>

          <RiskPanel riskLevel={risk.riskLevel} warnings={risk.warnings} />
        </aside>

        <section className="p-5 md:p-7">
          {step === 0 ? (
            <StepPanel
              eyebrow="Step 1"
              title="What are you submitting?"
              body="Name the source like an operator would. Make it clear enough that a reviewer can understand what exists before opening a file."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField label="Source type" value={state.sourceType} onChange={(value) => update("sourceType", value)} options={sourceSubmissionTypes} />
                <TextField label="Source name" value={state.sourceName} onChange={(value) => update("sourceName", value)} required />
                <TextField label="Source URL" value={state.sourceUrl} onChange={(value) => update("sourceUrl", value)} placeholder="Optional, but recommended" />
                <TextareaField label="Short description" value={state.shortDescription} onChange={(value) => update("shortDescription", value)} className="md:col-span-2" required />
              </div>
            </StepPanel>
          ) : null}

          {step === 1 ? (
            <StepPanel
              eyebrow="Step 2"
              title="What industry does this fit?"
              body="This is where messy source knowledge turns into a reviewable market lane."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <LabelledSelect label="Vertical" value={state.vertical} onChange={(value) => update("vertical", value)} options={sourceVerticals} />
                <TextField label="Geography" value={state.geography} onChange={(value) => update("geography", value)} placeholder="United States, East Texas, Dallas, national, niche region" />
                <TextField label="Buyer type" value={state.buyerType} onChange={(value) => update("buyerType", value)} placeholder="Agency, contractor, SaaS builder, wholesaler, lender" />
                <TextareaField label="Best use case" value={state.bestUseCase} onChange={(value) => update("bestUseCase", value)} required />
              </div>
              <CheckboxGrid
                label="Categories"
                options={sourceCategories.map((item) => ({ id: item, label: item }))}
                values={state.categories}
                onToggle={(value) => toggleArray("categories", value)}
              />
            </StepPanel>
          ) : null}

          {step === 2 ? (
            <StepPanel
              eyebrow="Step 3"
              title="What kind of data exists?"
              body="Only mark what is actually present. Reviewers need field truth, not a sales pitch."
            >
              <CheckboxGrid
                label="Fields present"
                options={sourceDataFieldOptions}
                values={state.dataFieldsPresent}
                onToggle={(value) => toggleArray("dataFieldsPresent", value)}
              />
              <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-ink-200">
                <DatabaseZap className="mb-3 h-5 w-5 text-cyan-300" />
                Contact fields do not automatically make this usable for outreach. Rights, consent, suppression, source proof, and review status decide what can happen next.
              </div>
            </StepPanel>
          ) : null}

          {step === 3 ? (
            <StepPanel
              eyebrow="Step 4"
              title="Where did it come from?"
              body="Origin is the first serious review question. Unknown and purchased sources need more proof."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField label="Origin type" value={state.originType} onChange={(value) => update("originType", value)} options={sourceOriginOptions} />
                <TextareaField label="Origin notes" value={state.originNotes} onChange={(value) => update("originNotes", value)} />
              </div>
            </StepPanel>
          ) : null}

          {step === 4 ? (
            <StepPanel
              eyebrow="Step 5"
              title="Permission and rights"
              body="This is the gate. Hidden, hacked, leaked, private, login-only, minors, medical, financial, or protected-trait data does not move into automated processing."
            >
              <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                <ShieldAlert className="mb-3 h-5 w-5" />
                Do not submit hidden, hacked, leaked, login-only, private, or non-consented sensitive data. If a source is restricted, mark it honestly so review can decide whether it belongs in research only, suppression, rejection, or a permission request.
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Toggle label="Do you own this data?" checked={state.permission.ownsData} onChange={(value) => updatePermission("ownsData", value)} />
                <Toggle label="Is this publicly available?" checked={state.permission.publiclyAvailable} onChange={(value) => updatePermission("publiclyAvailable", value)} />
                <Toggle label="Do you have permission to share it?" checked={state.permission.permissionToShare} onChange={(value) => updatePermission("permissionToShare", value)} />
                <Toggle label="Are there any restrictions?" checked={state.permission.hasRestrictions} onChange={(value) => updatePermission("hasRestrictions", value)} />
                <Toggle label="Does it include minors?" checked={state.permission.includesMinors} danger onChange={(value) => updatePermission("includesMinors", value)} />
                <Toggle label="Does it include sensitive data?" checked={state.permission.includesSensitiveData} danger onChange={(value) => updatePermission("includesSensitiveData", value)} />
                <Toggle label="Medical or health data?" checked={state.permission.includesMedicalData} danger onChange={(value) => updatePermission("includesMedicalData", value)} />
                <Toggle label="Private financial account data?" checked={state.permission.includesPrivateFinancialData} danger onChange={(value) => updatePermission("includesPrivateFinancialData", value)} />
                <Toggle label="Protected-trait data?" checked={state.permission.includesProtectedTraitData} danger onChange={(value) => updatePermission("includesProtectedTraitData", value)} />
                <Toggle label="Private political identity?" checked={state.permission.includesSensitivePoliticalIdentity} danger onChange={(value) => updatePermission("includesSensitivePoliticalIdentity", value)} />
                <Toggle label="Login-only source?" checked={state.permission.includesLoginOnlySource} danger onChange={(value) => updatePermission("includesLoginOnlySource", value)} />
                <Toggle label="Leaked or hacked data?" checked={state.permission.includesLeakedOrHackedData} danger onChange={(value) => updatePermission("includesLeakedOrHackedData", value)} />
                <Toggle label="Can it be resold?" checked={state.permission.canBeResold} onChange={(value) => updatePermission("canBeResold", value)} />
                <Toggle label="Can it be used for outreach?" checked={state.permission.canBeUsedForOutreach} onChange={(value) => updatePermission("canBeUsedForOutreach", value)} />
                <Toggle label="Research only?" checked={state.permission.researchOnly} onChange={(value) => updatePermission("researchOnly", value)} />
              </div>
              <TextareaField label="Restrictions or use limits" value={state.restrictions} onChange={(value) => update("restrictions", value)} className="mt-5" />
            </StepPanel>
          ) : null}

          {step === 5 ? (
            <StepPanel
              eyebrow="Step 6"
              title="Upload or paste sample"
              body="A small sample helps review field quality and proof. Prohibited sources are metadata-only until an admin reviews them."
            >
              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-300/35 bg-cyan-300/5 p-5 text-center transition hover:bg-cyan-300/10">
                <UploadCloud className="h-8 w-8 text-cyan-200" />
                <span className="mt-3 text-sm font-bold text-white">
                  {file ? file.name : "Upload CSV or XLSX sample"}
                </span>
                <span className="mt-1 text-xs text-ink-400">Max 2.5 MB. Metadata is stored first. Review decides what can be processed.</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="sr-only"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] ?? null;
                    if (nextFile && nextFile.size > 2_500_000) {
                      setError("Keep the sample under 2.5 MB for the review intake.");
                      return;
                    }
                    setError(null);
                    setFile(nextFile);
                  }}
                />
              </label>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <TextareaField label="Paste sample text" value={state.samplePaste} onChange={(value) => update("samplePaste", value)} />
                <TextareaField label="Paste URL list" value={state.urlList} onChange={(value) => update("urlList", value)} />
              </div>
              <TextareaField label="Sample notes" value={state.sampleNotes} onChange={(value) => update("sampleNotes", value)} className="mt-4" />
            </StepPanel>
          ) : null}

          {step === 6 ? (
            <StepPanel
              eyebrow="Step 7"
              title="Contributor info"
              body="We need a real person tied to every source submission so the review desk can ask follow-up questions."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Name" value={state.contributorName} onChange={(value) => update("contributorName", value)} required />
                <TextField label="Email" value={state.contributorEmail} onChange={(value) => update("contributorEmail", value)} type="email" required />
                <TextField label="Phone" value={state.contributorPhone} onChange={(value) => update("contributorPhone", value)} />
                <TextField label="Company" value={state.contributorCompany} onChange={(value) => update("contributorCompany", value)} />
                <TextField label="Website" value={state.contributorWebsite} onChange={(value) => update("contributorWebsite", value)} />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <Toggle label="Interested in contributor payout" checked={state.payoutInterest} onChange={(value) => update("payoutInterest", value)} />
                <Toggle label="Interested in partnership" checked={state.partnershipInterest} onChange={(value) => update("partnershipInterest", value)} />
              </div>
              <label className="mt-5 flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-ink-100">
                <input
                  type="checkbox"
                  checked={state.consentAccepted}
                  onChange={(event) => update("consentAccepted", event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <span>
                  I am submitting this source for review. I understand LeadFlow Pro may contact me about it, may reject it, may request proof, and will not automatically publish, sell, text, email, export, or route it.
                </span>
              </label>
            </StepPanel>
          ) : null}

          {step === 7 ? (
            <StepPanel
              eyebrow="Step 8"
              title="Review and submit"
              body="Check the source summary and risk flags before it enters the review queue."
            >
              <ReviewSummary state={state} file={file} />
              <RiskPanel riskLevel={risk.riskLevel} warnings={risk.warnings} full />
              {result ? (
                <div className="mt-5 rounded-lg border border-lead-300/25 bg-lead-300/10 p-4 text-sm leading-6 text-lead-100">
                  <CheckCircle2 className="mb-2 h-5 w-5" />
                  Submitted. Review ID: <span className="font-mono">{result.id}</span>. Status: {result.reviewStatus.replace(/_/g, " ")}. Risk: {result.riskLevel}.
                  {!result.persisted ? " Supabase is not configured locally, so this ran as a safe preview submission." : null}
                </div>
              ) : null}
            </StepPanel>
          ) : null}

          {error ? (
            <div className="mt-5 flex gap-3 rounded-lg border border-red-400/25 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0 || submitting}
              className="btn-ghost min-h-12 justify-center text-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            {step < steps.length - 1 ? (
              <button type="button" onClick={goNext} disabled={submitting} className="btn-accent min-h-12 justify-center text-sm">
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="submit" disabled={submitting || Boolean(result)} className="btn-accent min-h-12 justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit for Review
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      </div>
    </form>
  );
}

function StepPanel({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{eyebrow}</p>
      <h3 className="mt-2 text-3xl font-black leading-tight text-white md:text-4xl">{title}</h3>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-300">{body}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-600 focus:border-cyan-300/60"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  className = "",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</span>
      <textarea
        value={value}
        required={required}
        rows={5}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-ink-600 focus:border-cyan-300/60"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { id: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
      >
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LabelledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxGrid({
  label,
  options,
  values,
  onToggle,
}: {
  label: string;
  options: readonly { id: string; label: string }[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((item) => {
          const checked = values.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`min-h-12 rounded-lg border px-3 text-left text-sm font-semibold transition ${
                checked
                  ? "border-cyan-300/40 bg-cyan-300/10 text-white shadow-[0_14px_34px_-28px_rgba(92,208,255,0.9)]"
                  : "border-white/10 bg-white/[0.025] text-ink-300 hover:border-white/20 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  danger,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border px-4 text-left text-sm font-semibold transition ${
        checked
          ? danger
            ? "border-red-300/35 bg-red-400/10 text-red-100"
            : "border-lead-300/35 bg-lead-300/10 text-white"
          : "border-white/10 bg-white/[0.025] text-ink-300 hover:border-white/20 hover:text-white"
      }`}
    >
      <span>{label}</span>
      <span className={`h-5 w-9 rounded-full border p-0.5 transition ${checked ? "border-white/25 bg-white/20" : "border-white/15 bg-black/20"}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}

function RiskPanel({
  riskLevel,
  warnings,
  full,
}: {
  riskLevel: string;
  warnings: string[];
  full?: boolean;
}) {
  const tone =
    riskLevel === "prohibited"
      ? "border-red-300/30 bg-red-400/10 text-red-100"
      : riskLevel === "high"
        ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
        : riskLevel === "medium"
          ? "border-accent-300/30 bg-accent-300/10 text-accent-100"
          : "border-lead-300/25 bg-lead-300/10 text-lead-100";
  return (
    <div className={`${full ? "mt-5" : "mt-5"} rounded-lg border p-4 text-sm leading-6 ${tone}`}>
      <div className="flex items-center gap-2 font-extrabold uppercase tracking-wider">
        {riskLevel === "low" ? <LockKeyhole className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
        Risk: {riskLevel}
      </div>
      {warnings.length ? (
        <ul className="mt-3 space-y-2">
          {warnings.slice(0, full ? 8 : 3).map((warning) => (
            <li key={warning} className="flex gap-2">
              <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2">No automatic red flags yet. Admin review still decides if the source can move forward.</p>
      )}
    </div>
  );
}

function ReviewSummary({ state, file }: { state: FormState; file: File | null }) {
  const items = [
    ["Source", state.sourceName || "Missing"],
    ["Type", labelForSourceOption(sourceSubmissionTypes, state.sourceType)],
    ["Vertical", state.vertical],
    ["Categories", state.categories.join(", ")],
    ["Geography", state.geography || "Not specified"],
    ["Buyer", state.buyerType || "Not specified"],
    ["Origin", labelForSourceOption(sourceOriginOptions, state.originType)],
    ["Fields", state.dataFieldsPresent.map((field) => labelForSourceOption(sourceDataFieldOptions, field)).join(", ")],
    ["Sample", file ? file.name : state.samplePaste || state.urlList ? "Pasted sample provided" : "Notes only"],
    ["Contributor", state.contributorEmail || "Missing"],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-500">
            <FileText className="h-3.5 w-3.5" />
            {label}
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}
