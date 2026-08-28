"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  LockKeyhole,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BUSINESS_DIAGNOSTIC_FIELDS,
  BUSINESS_DIAGNOSTIC_SECTIONS,
  BUSINESS_DIAGNOSTIC_VERSION,
  cleanDiagnosticAnswers,
  diagnosticReadinessLabel,
  fieldVisible,
  isAnswered,
  missingRequiredFields,
  scoreDiagnosticCompleteness,
  type DiagnosticAnswer,
  type DiagnosticAnswers,
  type DiagnosticField,
} from "@/lib/businessDiagnostic";
import styles from "./diagnostic.module.css";

type UtmValues = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
};

type BusinessDiagnosticFormProps = {
  initialAnswers: DiagnosticAnswers;
  resumeToken: string;
  sourceChannel: string;
  sourceDetail: string;
  utm: UtmValues;
};

type RequestState = "idle" | "loading" | "saving" | "submitting" | "saved" | "error";

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  status?: string;
  request_id?: string;
  resume_url?: string;
  answers?: unknown;
  diagnostic?: {
    answers?: unknown;
    status?: string;
    request_id?: string;
  };
};

type StoredDraft = {
  version: number;
  answers?: unknown;
  requestId?: string;
  resumeToken?: string;
  startedAt?: string;
  savedAt?: string;
};

const LOCAL_STORAGE_KEY = `leadflow:business-diagnostic:v${BUSINESS_DIAGNOSTIC_VERSION}`;
const CORE_SECTION_COUNT = 3;
const FINAL_SECTION_INDEX = BUSINESS_DIAGNOSTIC_SECTIONS.length - 1;
const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function makeResumeToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function visibleAnswers(answers: DiagnosticAnswers): DiagnosticAnswers {
  const clean = cleanDiagnosticAnswers(answers);
  const result: DiagnosticAnswers = {};
  for (const field of BUSINESS_DIAGNOSTIC_FIELDS) {
    if (fieldVisible(field, clean) && clean[field.id] !== undefined) {
      result[field.id] = clean[field.id];
    }
  }
  return result;
}

function fieldAutoComplete(id: string): string | undefined {
  const values: Record<string, string> = {
    full_name: "name",
    email: "email",
    phone: "tel",
    business_name: "organization",
    job_title: "organization-title",
    city_state: "address-level2",
    website_url: "url",
  };
  return values[id];
}

function fieldErrorId(id: string): string {
  return `diagnostic-${id}-error`;
}

function fieldHelpId(id: string): string {
  return `diagnostic-${id}-help`;
}

export default function BusinessDiagnosticForm({
  initialAnswers,
  resumeToken,
  sourceChannel,
  sourceDetail,
  utm,
}: BusinessDiagnosticFormProps) {
  const [answers, setAnswers] = useState<DiagnosticAnswers>(initialAnswers);
  const [currentSection, setCurrentSection] = useState(0);
  const [requestState, setRequestState] = useState<RequestState>(
    resumeToken ? "loading" : "idle",
  );
  const [notice, setNotice] = useState("");
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resumeUrl, setResumeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [referrer, setReferrer] = useState("");
  const requestIdRef = useRef("");
  const resumeTokenRef = useRef(resumeToken);
  const startedAtRef = useRef(new Date().toISOString());
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);

  const section = BUSINESS_DIAGNOSTIC_SECTIONS[currentSection];
  const visibleFields = useMemo(
    () => section.fields.filter((field) => fieldVisible(field, answers)),
    [answers, section],
  );
  const completeness = scoreDiagnosticCompleteness(answers);
  const readiness = diagnosticReadinessLabel(completeness);
  const requiredMissing = missingRequiredFields(answers);
  const coreMissing = requiredMissing.filter((field) =>
    BUSINESS_DIAGNOSTIC_SECTIONS.slice(0, CORE_SECTION_COUNT).some((item) =>
      item.fields.some((candidate) => candidate.id === field.id),
    ),
  );

  useEffect(() => {
    setReferrer(document.referrer.slice(0, 1000));
    let cancelled = false;

    async function hydrate() {
      if (resumeToken) {
        try {
          const response = await fetch(
            `/api/business-diagnostic?resume=${encodeURIComponent(resumeToken)}`,
            { cache: "no-store" },
          );
          const data = (await response.json()) as ApiResponse;
          if (!response.ok) throw new Error(data.error || "That resume link could not be loaded.");
          if (cancelled) return;
          const record = data.diagnostic ?? data;
          setAnswers(cleanDiagnosticAnswers(record.answers));
          requestIdRef.current = record.request_id ?? data.request_id ?? "";
          setSubmitted(record.status === "submitted" || data.status === "submitted");
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("resume");
          window.history.replaceState(
            window.history.state,
            "",
            `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`,
          );
          setRequestState("idle");
          setNotice("Your saved answers are ready.");
        } catch (error) {
          if (cancelled) return;
          setRequestState("error");
          setNotice(error instanceof Error ? error.message : "That resume link could not be loaded.");
        } finally {
          if (!cancelled) setHydrated(true);
        }
        return;
      }

      try {
        const storedValue = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedValue) {
          const stored = JSON.parse(storedValue) as StoredDraft;
          if (stored.version === BUSINESS_DIAGNOSTIC_VERSION) {
            setAnswers({ ...initialAnswers, ...cleanDiagnosticAnswers(stored.answers) });
            requestIdRef.current = stored.requestId ?? "";
            resumeTokenRef.current = stored.resumeToken ?? "";
            startedAtRef.current = stored.startedAt ?? startedAtRef.current;
            setNotice("Your progress from this browser was restored.");
          }
        }
      } catch {
        // A corrupt or blocked local draft should never stop a fresh form.
      }
      if (!cancelled) setHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [initialAnswers, resumeToken]);

  useEffect(() => {
    if (!hydrated) return;
    const snapshot: StoredDraft = {
      version: BUSINESS_DIAGNOSTIC_VERSION,
      answers,
      requestId: requestIdRef.current,
      resumeToken: resumeTokenRef.current,
      startedAt: startedAtRef.current,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // Private mode and strict browser settings can disable localStorage.
    }
  }, [answers, hydrated]);

  function setAnswer(id: string, value: DiagnosticAnswer) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setInvalidFields((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (requestState === "error" || requestState === "saved") {
      setRequestState("idle");
      setNotice("");
    }
  }

  function toggleMulti(field: DiagnosticField, value: string, checked: boolean) {
    const current = Array.isArray(answers[field.id]) ? (answers[field.id] as string[]) : [];
    let next = checked ? [...current, value] : current.filter((item) => item !== value);

    if (checked && value === "none") next = ["none"];
    if (checked && value !== "none") next = next.filter((item) => item !== "none");
    if (field.id === "goal_types" && next.length > 3) {
      setRequestState("error");
      setNotice("Choose up to three outcomes that matter most.");
      return;
    }

    setAnswer(field.id, [...new Set(next)]);
  }

  function ensureDraftIdentity() {
    if (!requestIdRef.current) requestIdRef.current = crypto.randomUUID();
    if (!resumeTokenRef.current) resumeTokenRef.current = makeResumeToken();
    return {
      requestId: requestIdRef.current,
      resumeToken: resumeTokenRef.current,
    };
  }

  function moveToSection(index: number, preserveNotice = false) {
    setCurrentSection(Math.max(0, Math.min(FINAL_SECTION_INDEX, index)));
    if (!preserveNotice) {
      setNotice("");
      setRequestState("idle");
    }
    requestAnimationFrame(() => {
      sectionHeadingRef.current?.focus();
      window.scrollTo({ top: 240, behavior: "smooth" });
    });
  }

  function validateSaveBasics(): string[] {
    const missing: string[] = [];
    if (!isAnswered(answers.full_name)) missing.push("full_name");
    if (!isAnswered(answers.email) || !SIMPLE_EMAIL.test(String(answers.email))) {
      missing.push("email");
    }
    if (!isAnswered(answers.business_name)) missing.push("business_name");
    return missing;
  }

  async function sendDiagnostic(action: "save" | "submit") {
    if (action === "save") {
      const missing = validateSaveBasics();
      if (missing.length) {
        setInvalidFields(new Set(missing));
        setRequestState("error");
        setNotice("Add your name, a valid email, and the business name before saving.");
        moveToSection(0, true);
        return;
      }
    } else {
      const missing = missingRequiredFields(answers);
      const emailValue = typeof answers.email === "string" ? answers.email.trim() : "";
      const invalidEmail = !SIMPLE_EMAIL.test(emailValue);
      if (missing.length || invalidEmail) {
        const ids = new Set(missing.map((field) => field.id));
        if (invalidEmail) ids.add("email");
        setInvalidFields(ids);
        const firstMissingSection = BUSINESS_DIAGNOSTIC_SECTIONS.findIndex((item) =>
          item.fields.some((field) => ids.has(field.id)),
        );
        setRequestState("error");
        setNotice(
          `Complete the ${ids.size} required ${ids.size === 1 ? "answer" : "answers"} before submitting.`,
        );
        moveToSection(firstMissingSection < 0 ? 0 : firstMissingSection, true);
        return;
      }
    }

    const identity = ensureDraftIdentity();
    setRequestState(action === "save" ? "saving" : "submitting");
    setNotice("");

    try {
      const response = await fetch("/api/business-diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          answers: visibleAnswers(answers),
          request_id: identity.requestId,
          resume_token: identity.resumeToken,
          source_channel: sourceChannel,
          source_detail: sourceDetail,
          referrer,
          utm,
          started_at: startedAtRef.current,
          company_website: honeypot,
        }),
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "We could not save the diagnostic. Please try again.");
      }

      requestIdRef.current = data.request_id ?? identity.requestId;
      const secureUrl =
        data.resume_url ||
        `${window.location.origin}/diagnostic?resume=${encodeURIComponent(identity.resumeToken)}`;
      setResumeUrl(secureUrl);
      try {
        const snapshot: StoredDraft = {
          version: BUSINESS_DIAGNOSTIC_VERSION,
          answers,
          requestId: requestIdRef.current,
          resumeToken: identity.resumeToken,
          startedAt: startedAtRef.current,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        // Saving to the CRM still succeeds when browser storage is unavailable.
      }

      if (action === "save") {
        setRequestState("saved");
        setNotice(
          data.message ||
            "Saved. We sent your secure return link to the email address you provided.",
        );
      } else {
        setRequestState("idle");
        setSubmitted(true);
        setNotice("");
        window.scrollTo({ top: 0, behavior: "smooth" });
        const trackedWindow = window as Window & { fbq?: (...args: unknown[]) => void };
        trackedWindow.fbq?.("track", "Lead", {
          content_name: "Business Growth Diagnostic",
          content_category: "Diagnostic",
        });
      }
    } catch (error) {
      setRequestState("error");
      setNotice(error instanceof Error ? error.message : "We could not save this yet.");
    }
  }

  async function copyResumeLink() {
    if (!resumeUrl) return;
    try {
      await navigator.clipboard.writeText(resumeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setNotice("Your return link is in the email we sent you.");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentSection < FINAL_SECTION_INDEX) {
      moveToSection(currentSection + 1);
      return;
    }
    void sendDiagnostic("submit");
  }

  function sectionStatus(index: number) {
    const item = BUSINESS_DIAGNOSTIC_SECTIONS[index];
    const visible = item.fields.filter((field) => fieldVisible(field, answers));
    const answered = visible.filter((field) => isAnswered(answers[field.id])).length;
    const requiredIncomplete = visible.some(
      (field) => field.required && !isAnswered(answers[field.id]),
    );
    return {
      answered,
      complete: answered > 0 && !requiredIncomplete,
    };
  }

  function renderQuestionLabel(field: DiagnosticField) {
    return (
      <>
        {field.label}
        {field.required ? <span className={styles.required}> Required</span> : null}
        {!field.required ? <span className={styles.optional}> Optional</span> : null}
      </>
    );
  }

  function renderField(field: DiagnosticField) {
    const value = answers[field.id];
    const hasError = invalidFields.has(field.id);
    const describedBy = [field.help ? fieldHelpId(field.id) : "", hasError ? fieldErrorId(field.id) : ""]
      .filter(Boolean)
      .join(" ");

    if (field.type === "multi") {
      return (
        <fieldset
          key={field.id}
          className={`${styles.field} ${hasError ? styles.fieldError : ""}`}
          aria-describedby={describedBy || undefined}
          aria-required={field.required || undefined}
        >
          <legend>{renderQuestionLabel(field)}</legend>
          {field.help ? (
            <p id={fieldHelpId(field.id)} className={styles.help}>
              {field.help}
            </p>
          ) : null}
          <div className={styles.choiceGrid}>
            {field.options?.map((option) => {
              const selected = Array.isArray(value) && value.includes(option.value);
              return (
                <label key={option.value} className={`${styles.choice} ${selected ? styles.choiceSelected : ""}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => toggleMulti(field, option.value, event.target.checked)}
                  />
                  <span className={styles.choiceMark} aria-hidden="true">
                    {selected ? <Check /> : null}
                  </span>
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
          {hasError ? (
            <p id={fieldErrorId(field.id)} className={styles.errorText}>
              Please answer this question.
            </p>
          ) : null}
        </fieldset>
      );
    }

    if (field.type === "checkbox") {
      return (
        <div key={field.id} className={`${styles.field} ${hasError ? styles.fieldError : ""}`}>
          <label className={`${styles.confirmation} ${value === true ? styles.confirmationSelected : ""}`}>
            <input
              type="checkbox"
              checked={value === true}
              onChange={(event) => setAnswer(field.id, event.target.checked)}
              aria-describedby={describedBy || undefined}
              aria-invalid={hasError || undefined}
            />
            <span className={styles.confirmationMark} aria-hidden="true">
              {value === true ? <Check /> : null}
            </span>
            <span>
              {field.id === "privacy_terms_acceptance" ? (
                <>
                  I agree to the{" "}
                  <Link href="/privacy" target="_blank" rel="noreferrer">
                    Privacy Policy
                  </Link>{" "}
                  and{" "}
                  <Link href="/terms" target="_blank" rel="noreferrer">
                    Terms
                  </Link>
                  <span className={styles.srOnly}> (links open in new tabs)</span>
                </>
              ) : (
                field.label
              )}
              {field.required ? <span className={styles.required}> Required</span> : null}
            </span>
          </label>
          {field.help ? (
            <p id={fieldHelpId(field.id)} className={styles.help}>
              {field.help}
            </p>
          ) : null}
          {hasError ? (
            <p id={fieldErrorId(field.id)} className={styles.errorText}>
              Please confirm this item.
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div key={field.id} className={`${styles.field} ${hasError ? styles.fieldError : ""}`}>
        <label htmlFor={`diagnostic-${field.id}`}>{renderQuestionLabel(field)}</label>
        {field.help ? (
          <p id={fieldHelpId(field.id)} className={styles.help}>
            {field.help}
          </p>
        ) : null}
        {field.type === "textarea" ? (
          <textarea
            id={`diagnostic-${field.id}`}
            value={typeof value === "string" ? value : ""}
            rows={field.rows ?? 4}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            onChange={(event) => setAnswer(field.id, event.target.value)}
            aria-describedby={describedBy || undefined}
            aria-invalid={hasError || undefined}
            aria-required={field.required || undefined}
          />
        ) : field.type === "select" ? (
          <select
            id={`diagnostic-${field.id}`}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => setAnswer(field.id, event.target.value)}
            aria-describedby={describedBy || undefined}
            aria-invalid={hasError || undefined}
            aria-required={field.required || undefined}
          >
            <option value="">Select one</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={`diagnostic-${field.id}`}
            type={field.type}
            value={typeof value === "string" ? value : ""}
            maxLength={field.maxLength}
            placeholder={field.placeholder}
            autoComplete={fieldAutoComplete(field.id)}
            inputMode={field.type === "email" ? "email" : field.type === "tel" ? "tel" : undefined}
            onChange={(event) => setAnswer(field.id, event.target.value)}
            aria-describedby={describedBy || undefined}
            aria-invalid={hasError || undefined}
            aria-required={field.required || undefined}
          />
        )}
        {hasError ? (
          <p id={fieldErrorId(field.id)} className={styles.errorText}>
            {field.id === "email" ? "Enter a valid email address." : "Please answer this question."}
          </p>
        ) : null}
      </div>
    );
  }

  if (!hydrated && resumeToken) {
    return (
      <main className={styles.page}>
        <section className={styles.loadingCard} aria-live="polite">
          <span className={styles.loadingMark} aria-hidden="true" />
          <p>Loading your saved diagnostic…</p>
        </section>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className={styles.page}>
        <section className={styles.success} aria-labelledby="diagnostic-success-title">
          <div className={styles.successIcon} aria-hidden="true">
            <CheckCircle2 />
          </div>
          <p className={styles.eyebrow}>Received and routed for review</p>
          <h1 id="diagnostic-success-title">Your diagnostic is in.</h1>
          <p className={styles.successLead}>
            The LeadFlow Pro now has a clearer picture of the business, the leak, and the outcome
            you want. We will review the details and use them to prepare the right questions and
            next move.
          </p>
          <div className={styles.successScore}>
            <div>
              <span>{completeness}%</span>
              <strong>{readiness}</strong>
            </div>
            <div className={styles.scoreTrack} aria-hidden="true">
              <span style={{ width: `${completeness}%` }} />
            </div>
          </div>
          {answers.seven_day_email_consent === true ? (
            <p className={styles.successNote}>
              Your 7-Day Business Visibility Jumpstart will arrive by email. Each message includes
              one practical move you can use while we follow up.
            </p>
          ) : (
            <p className={styles.successNote}>
              We will use your contact details only to follow up about this request unless you chose
              additional email updates.
            </p>
          )}
          <div className={styles.successActions}>
            <Link href="/book" className={styles.primaryButton}>
              Book a strategy call
              <ArrowRight aria-hidden="true" />
            </Link>
            {completeness < 80 ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setSubmitted(false);
                  moveToSection(CORE_SECTION_COUNT);
                }}
              >
                Add more detail
              </button>
            ) : (
              <Link href="/" className={styles.secondaryButton}>
                Return home
              </Link>
            )}
          </div>
          <p className={styles.successContact}>
            Need to add an attachment? Reply to our email or write to{" "}
            <a href="mailto:hello@theleadflowpro.com">hello@theleadflowpro.com</a>.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="diagnostic-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Business Growth Diagnostic</p>
          <h1 id="diagnostic-title">
            The more context you share, <em>the sharper the plan.</em>
          </h1>
          <p>
            Start with three core sections so we understand the business, the problem, and the
            customer. Then add as much detail as you want about the website, visibility, leads,
            operations, and scope.
          </p>
          <div className={styles.heroTrust}>
            <span>
              <ClipboardCheck aria-hidden="true" /> 3 core sections
            </span>
            <span>
              <Save aria-hidden="true" /> Save and return
            </span>
            <span>
              <ShieldCheck aria-hidden="true" /> No purchase required
            </span>
          </div>
        </div>
        <aside className={styles.safetyCard}>
          <LockKeyhole aria-hidden="true" />
          <div>
            <strong>Keep sensitive information out.</strong>
            <p>
              Never enter passwords, access codes, payment data, Social Security numbers, private
              customer or patient information, or confidential case details. We will arrange secure
              access later if a project moves forward.
            </p>
          </div>
        </aside>
      </section>

      <section className={styles.formShell} aria-label="Business diagnostic questionnaire">
        <aside className={styles.progressPanel}>
          <div className={styles.progressSummary}>
            <div>
              <span>Detail captured</span>
              <strong>{completeness}%</strong>
            </div>
            <div
              className={styles.scoreTrack}
              role="progressbar"
              aria-label="Diagnostic completeness"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completeness}
            >
              <span style={{ width: `${completeness}%` }} />
            </div>
            <p>{completeness > 0 ? readiness : "Start with what you know"}</p>
          </div>

          <nav className={styles.sectionNav} aria-label="Questionnaire sections">
            {BUSINESS_DIAGNOSTIC_SECTIONS.map((item, index) => {
              const status = sectionStatus(index);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => moveToSection(index)}
                  className={index === currentSection ? styles.activeSection : ""}
                  aria-current={index === currentSection ? "step" : undefined}
                >
                  <span className={styles.stepNumber} aria-hidden="true">
                    {status.complete ? <Check /> : index + 1}
                  </span>
                  <span>
                    <strong>{item.shortTitle}</strong>
                    <small>{index < CORE_SECTION_COUNT ? "Core" : "More detail"}</small>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className={styles.progressPrivacy}>
            <ShieldCheck aria-hidden="true" />
            <span>
              Your progress stays on this browser automatically. Use <strong>Save and finish later</strong>
              to receive a secure link by email.
            </span>
          </div>
        </aside>

        <div className={styles.formCard}>
          <div className={styles.sectionHeading}>
            <div className={styles.sectionMeta}>
              <span>
                Section {currentSection + 1} of {BUSINESS_DIAGNOSTIC_SECTIONS.length}
              </span>
              <span className={currentSection < CORE_SECTION_COUNT ? styles.coreTag : styles.detailTag}>
                {currentSection < CORE_SECTION_COUNT ? "Core" : "Optional depth"}
              </span>
            </div>
            <h2 ref={sectionHeadingRef} tabIndex={-1}>
              {section.title}
            </h2>
            <p>{section.description}</p>
            {currentSection === CORE_SECTION_COUNT ? (
              <div className={styles.coreCompleteCallout}>
                <Sparkles aria-hidden="true" />
                <div>
                  <strong>{coreMissing.length ? "Core questions are still available to finish." : "The core is complete."}</strong>
                  <p>
                    Everything from here adds proposal detail. Answer what you know and skip what
                    does not apply.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={onSubmit} noValidate>
            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="company-website-diagnostic">Leave this field empty</label>
              <input
                id="company-website-diagnostic"
                name="company_website"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className={styles.fields}>{visibleFields.map(renderField)}</div>

            <div className={styles.formNotice} aria-live="polite">
              {notice ? (
                <div className={requestState === "error" ? styles.noticeError : styles.noticeSuccess}>
                  {requestState === "error" ? <AlertCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                  <span>{notice}</span>
                </div>
              ) : null}
              {resumeUrl && requestState === "saved" ? (
                <button type="button" className={styles.copyButton} onClick={() => void copyResumeLink()}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                  {copied ? "Link copied" : "Copy secure return link"}
                </button>
              ) : null}
            </div>

            <div className={styles.formActions}>
              <div>
                {currentSection > 0 ? (
                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={() => moveToSection(currentSection - 1)}
                  >
                    <ArrowLeft aria-hidden="true" />
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.saveButton}
                  disabled={requestState === "saving" || requestState === "submitting"}
                  onClick={() => void sendDiagnostic("save")}
                >
                  <Save aria-hidden="true" />
                  {requestState === "saving" ? "Saving…" : "Save and finish later"}
                </button>
              </div>
              <div>
                {currentSection === CORE_SECTION_COUNT - 1 ? (
                  <button
                    type="button"
                    className={styles.reviewButton}
                    onClick={() => moveToSection(FINAL_SECTION_INDEX)}
                  >
                    Review and submit now
                  </button>
                ) : null}
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={requestState === "saving" || requestState === "submitting"}
                >
                  {currentSection === FINAL_SECTION_INDEX ? (
                    requestState === "submitting" ? (
                      "Submitting…"
                    ) : (
                      <>
                        Submit my diagnostic
                        <CheckCircle2 aria-hidden="true" />
                      </>
                    )
                  ) : (
                    <>
                      Continue
                      <ArrowRight aria-hidden="true" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
