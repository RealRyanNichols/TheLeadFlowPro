"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { FIELD_CLASS, LABEL_CLASS } from "@/components/postCreator/SetupFields";
import { CTAS, TRADES, VOICES, isCtaId, isTradeId, isVoiceId } from "@/lib/postCreator/options";
import { PROFILE_LIMITS } from "@/lib/postCreator/profile";
import type { BrandProfile } from "@/lib/postCreator/types";
import { saveProfile } from "./api";
import { APP_COPY, PROFILE_FIELD_COPY, counterLine } from "./copy";

// The business profile the AI writer works from, under Settings. The limits
// and counters are the server's own (PROFILE_LIMITS), so a field that fits
// here fits there. The whole profile is saved in one go; when the server
// turns a field down, that field says why and takes focus.
//
// Nothing here is shared with anyone: the profile is saved to the buyer's
// account and read by the writer only when they tap Write it.

type ProfileKey = keyof BrandProfile;
type TextKey = "businessName" | "town" | "tradeLabel" | "difference" | "facts" | "wordsToUse" | "wordsToAvoid" | "audience" | "ctaDetail" | "samplePost";

/** The form edits services as one line each. */
type FormState = Omit<BrandProfile, "services"> & { services: string };

const COPY = APP_COPY.profile;

const PROFILE_KEYS: readonly ProfileKey[] = [
  "businessName",
  "town",
  "trade",
  "tradeLabel",
  "services",
  "difference",
  "facts",
  "voice",
  "wordsToUse",
  "wordsToAvoid",
  "audience",
  "cta",
  "ctaDetail",
  "samplePost",
];

function isProfileKey(x: unknown): x is ProfileKey {
  return typeof x === "string" && (PROFILE_KEYS as readonly string[]).includes(x);
}

function toForm(p: BrandProfile): FormState {
  return { ...p, services: p.services.join("\n") };
}

function serviceLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ProfileForm({ profile, onSaved }: { profile: BrandProfile; onSaved(profile: BrandProfile, ready: boolean): void }) {
  const baseId = useId();
  const [form, setForm] = useState<FormState>(() => toForm(profile));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [fieldError, setFieldError] = useState<{ field: ProfileKey; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fields = useRef<Partial<Record<ProfileKey, HTMLElement | null>>>({});
  const id = (name: string) => `${baseId}-${name}`;
  const services = serviceLines(form.services);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus((s) => (s === "saved" ? "idle" : s));
    setFieldError((fe) => (fe && fe.field === key ? null : fe));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "saving") return;
    setStatus("saving");
    setError(null);
    setFieldError(null);
    const r = await saveProfile({ ...form, services });
    if (r.ok) {
      setForm(toForm(r.data.profile));
      setStatus("saved");
      onSaved(r.data.profile, r.data.ready);
      return;
    }
    setStatus("idle");
    if (r.field && isProfileKey(r.field)) {
      const field = r.field;
      setFieldError({ field, message: r.error });
      fields.current[field]?.focus();
      return;
    }
    // Signed out, a lapsed plan, or a blocked origin: the server's words say
    // what to do. Anything else gets the plain retry line.
    setError([401, 402, 403, 413].includes(r.status) ? r.error : COPY.error);
  }

  const describedBy = (key: ProfileKey, parts: { help?: boolean; count?: boolean }) =>
    [parts.help ? id(`${key}-help`) : "", parts.count ? id(`${key}-count`) : "", fieldError?.field === key ? id(`${key}-error`) : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  const errorFor = (key: ProfileKey) =>
    fieldError?.field === key ? (
      <p id={id(`${key}-error`)} role="alert" className="tool-field-error mt-1.5">
        {fieldError.message}
      </p>
    ) : null;

  const labelFor = (key: ProfileKey, required = false) => (
    <label htmlFor={id(key)} className={LABEL_CLASS}>
      {PROFILE_FIELD_COPY[key].label}
      {required ? <span className="font-semibold text-[var(--muted)]"> {COPY.required}</span> : null}
    </label>
  );

  const helpFor = (key: ProfileKey) =>
    PROFILE_FIELD_COPY[key].help ? (
      <p id={id(`${key}-help`)} className="-mt-0.5 mb-2 text-[14px] leading-relaxed text-[var(--muted)]">
        {PROFILE_FIELD_COPY[key].help}
      </p>
    ) : null;

  function textField(key: TextKey, o: { rows?: number; required?: boolean; autoComplete?: string } = {}) {
    const max = PROFILE_LIMITS[key];
    const invalid = fieldError?.field === key ? true : undefined;
    const aria = describedBy(key, { help: Boolean(PROFILE_FIELD_COPY[key].help), count: true });
    return (
      <div>
        {labelFor(key, o.required)}
        {helpFor(key)}
        {o.rows ? (
          <textarea
            id={id(key)}
            ref={(el) => {
              fields.current[key] = el;
            }}
            rows={o.rows}
            className={`${FIELD_CLASS} py-2.5 leading-relaxed`}
            value={form[key]}
            maxLength={max}
            onChange={(e) => update(key, e.target.value)}
            aria-invalid={invalid}
            aria-describedby={aria}
          />
        ) : (
          <input
            id={id(key)}
            ref={(el) => {
              fields.current[key] = el;
            }}
            type="text"
            className={FIELD_CLASS}
            value={form[key]}
            maxLength={max}
            required={o.required}
            aria-required={o.required ? true : undefined}
            autoComplete={o.autoComplete ?? "off"}
            onChange={(e) => update(key, e.target.value)}
            aria-invalid={invalid}
            aria-describedby={aria}
          />
        )}
        <p id={id(`${key}-count`)} className="mt-1 text-right text-[13px] tabular-nums text-[var(--muted)]">
          {counterLine(form[key].length, max)}
        </p>
        {errorFor(key)}
      </div>
    );
  }

  return (
    <section aria-labelledby={id("title")} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-6">
      <h3 id={id("title")} className="text-[20px] font-extrabold text-[var(--heading)]">
        {COPY.title}
      </h3>
      <p className="mt-1 text-[15px] leading-relaxed text-[var(--muted)]">{COPY.sub}</p>

      <form onSubmit={submit} className="mt-5 space-y-5">
        {textField("businessName", { required: true, autoComplete: "organization" })}
        {textField("town", { autoComplete: "address-level2" })}

        <div>
          {labelFor("trade", true)}
          <select
            id={id("trade")}
            ref={(el) => {
              fields.current.trade = el;
            }}
            className={FIELD_CLASS}
            value={form.trade}
            required
            aria-required
            onChange={(e) => {
              if (isTradeId(e.target.value)) update("trade", e.target.value);
            }}
            aria-invalid={fieldError?.field === "trade" ? true : undefined}
            aria-describedby={describedBy("trade", {})}
          >
            {TRADES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          {errorFor("trade")}
        </div>

        {form.trade === "other" ? textField("tradeLabel", { required: true }) : null}

        <div>
          {labelFor("services")}
          {helpFor("services")}
          <textarea
            id={id("services")}
            ref={(el) => {
              fields.current.services = el;
            }}
            rows={5}
            className={`${FIELD_CLASS} py-2.5 leading-relaxed`}
            value={form.services}
            onChange={(e) => update("services", e.target.value)}
            aria-invalid={fieldError?.field === "services" ? true : undefined}
            aria-describedby={describedBy("services", { help: true, count: true })}
          />
          <p id={id("services-count")} className="mt-1 text-right text-[13px] tabular-nums text-[var(--muted)]">
            {counterLine(services.length, PROFILE_LIMITS.services)}
          </p>
          {errorFor("services")}
        </div>

        {textField("difference", { rows: 3 })}
        {textField("facts", { rows: 3 })}

        <fieldset aria-describedby={fieldError?.field === "voice" ? id("voice-error") : undefined}>
          <legend className={LABEL_CLASS}>{PROFILE_FIELD_COPY.voice.label}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {VOICES.map((v, i) => (
              <label key={v.id} className="tool-check">
                <input
                  type="radio"
                  name={id("voice")}
                  value={v.id}
                  ref={
                    i === 0
                      ? (el) => {
                          fields.current.voice = el;
                        }
                      : undefined
                  }
                  checked={form.voice === v.id}
                  onChange={(e) => {
                    if (isVoiceId(e.target.value)) update("voice", e.target.value);
                  }}
                  className="mt-1 h-4 w-4 flex-none accent-[var(--blue)]"
                />
                <span>
                  <span className="block font-bold text-[var(--heading)]">{v.label}</span>
                  <span className="block text-[14px]">{v.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {errorFor("voice")}
        </fieldset>

        {textField("wordsToUse")}
        {textField("wordsToAvoid")}
        {textField("audience")}

        <div>
          {labelFor("cta")}
          <select
            id={id("cta")}
            ref={(el) => {
              fields.current.cta = el;
            }}
            className={FIELD_CLASS}
            value={form.cta}
            onChange={(e) => {
              if (isCtaId(e.target.value)) update("cta", e.target.value);
            }}
            aria-invalid={fieldError?.field === "cta" ? true : undefined}
            aria-describedby={describedBy("cta", {})}
          >
            {CTAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {errorFor("cta")}
        </div>

        {textField("ctaDetail")}
        {textField("samplePost", { rows: 6 })}

        {error ? (
          <p role="alert" className="tool-field-error">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="button-primary w-full sm:w-auto" disabled={status === "saving"} aria-busy={status === "saving"}>
            <Check aria-hidden="true" className="h-4 w-4" />
            {status === "saving" ? COPY.saving : COPY.save}
          </button>
          <p role="status" className="text-[15px] font-bold text-[var(--green)]">
            {status === "saved" ? COPY.saved : ""}
          </p>
        </div>
      </form>
    </section>
  );
}
