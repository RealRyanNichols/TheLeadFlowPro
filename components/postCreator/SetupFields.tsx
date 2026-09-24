"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Settings2 } from "lucide-react";
import { DEFAULT_INPUT, normalizeInput, type InputProblem } from "@/lib/postCreator/ideas/engine";
import type { EngineInput } from "@/lib/postCreator/ideas/types";
import { CTAS, VOICES, isCtaChoice, isVoiceId, type CtaChoice, type VoiceId } from "@/lib/postCreator/options";
import { POST_CREATOR } from "@/lib/postCreator/product";
import { usePostCreator } from "./ShuffleProvider";

// "Make it fit my business" on the public page: the owner's name, town,
// services, voice, and call to action, kept in this browser only. The fields
// edit a copy; Done checks it and hands it to the idea machine in one go, so
// the machine does not reshuffle on every keystroke.

/** Shared field look: 48px tall, 16px text so phones do not zoom in on focus. */
export const FIELD_CLASS =
  "min-h-[48px] w-full rounded-[11px] border border-[var(--line-strong)] bg-[var(--panel)] px-3.5 text-base text-[var(--heading)] placeholder:text-[var(--quiet)] focus:border-[var(--blue)] focus:outline-none focus:shadow-[0_0_0_3px_#1240e826]";
export const LABEL_CLASS = "mb-1.5 block text-[15px] font-bold text-[var(--heading)]";

type Draft = { businessName: string; town: string; services: string; voice: VoiceId; cta: CtaChoice };

function draftFrom(input: EngineInput): Draft {
  return {
    businessName: input.businessName,
    town: input.town,
    services: input.services.join("\n"),
    voice: input.voice,
    cta: input.cta,
  };
}

function problemFor(problems: InputProblem[], field: InputProblem["field"]): string | null {
  return problems.find((p) => p.field === field)?.message ?? null;
}

export default function SetupFields() {
  const { input, setInput } = usePostCreator();
  const baseId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(input));
  const fields = useRef<Record<InputProblem["field"], HTMLElement | null>>({ businessName: null, town: null, services: null });

  // Checked as the owner types, so a field that runs long says so right away.
  const checked = normalizeInput({ ...draft, trade: input.trade });
  const problems = checked.problems;
  const id = (name: string) => `${baseId}-${name}`;

  function toggle(next: boolean) {
    // Opening starts from what the machine is using now.
    if (next && !open) setDraft(draftFrom(input));
    setOpen(next);
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function done(e: FormEvent) {
    e.preventDefault();
    if (problems.length) {
      fields.current[problems[0].field]?.focus();
      return;
    }
    setInput({ ...checked.input, trade: input.trade });
    setOpen(false);
  }

  function clear() {
    const cleared: EngineInput = { ...DEFAULT_INPUT, services: [], trade: input.trade };
    setDraft(draftFrom(cleared));
    setInput(cleared);
  }

  const errorFor = (field: InputProblem["field"]) => {
    const message = problemFor(problems, field);
    return message ? (
      <p id={id(`${field}-error`)} role="alert" className="tool-field-error mt-1.5">
        {message}
      </p>
    ) : null;
  };
  const describedBy = (field: InputProblem["field"]) => (problemFor(problems, field) ? id(`${field}-error`) : undefined);

  return (
    <details
      open={open}
      onToggle={(e) => toggle((e.currentTarget as HTMLDetailsElement).open)}
      className="group rounded-2xl border border-[var(--line)] bg-[var(--panel)]"
    >
      <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 px-4 py-3 text-[15px] font-extrabold text-[var(--heading)] [&::-webkit-details-marker]:hidden">
        <Settings2 aria-hidden="true" className="h-4 w-4 flex-none text-[var(--blue)]" />
        <span className="flex-1">Make it fit my business</span>
        <ChevronDown aria-hidden="true" className="h-5 w-5 flex-none text-[var(--muted)] group-open:rotate-180 motion-safe:transition-transform" />
      </summary>

      <form onSubmit={done} noValidate className="space-y-5 border-t border-[var(--line)] px-4 pb-5 pt-4">
        <h3 className="text-[18px] font-extrabold text-[var(--heading)]">Make the ideas fit your business</h3>

        <div>
          <label htmlFor={id("name")} className={LABEL_CLASS}>
            Business name (optional)
          </label>
          <input
            id={id("name")}
            ref={(el) => {
              fields.current.businessName = el;
            }}
            className={FIELD_CLASS}
            autoComplete="organization"
            value={draft.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            aria-invalid={problemFor(problems, "businessName") ? true : undefined}
            aria-describedby={describedBy("businessName")}
          />
          {errorFor("businessName")}
        </div>

        <div>
          <label htmlFor={id("town")} className={LABEL_CLASS}>
            Town (optional)
          </label>
          <input
            id={id("town")}
            ref={(el) => {
              fields.current.town = el;
            }}
            className={FIELD_CLASS}
            autoComplete="address-level2"
            value={draft.town}
            onChange={(e) => update("town", e.target.value)}
            aria-invalid={problemFor(problems, "town") ? true : undefined}
            aria-describedby={describedBy("town")}
          />
          {errorFor("town")}
        </div>

        <div>
          <label htmlFor={id("services")} className={LABEL_CLASS}>
            Services (optional, up to {POST_CREATOR.maxServices}, one per line)
          </label>
          <textarea
            id={id("services")}
            ref={(el) => {
              fields.current.services = el;
            }}
            rows={4}
            className={`${FIELD_CLASS} py-2.5 leading-relaxed`}
            value={draft.services}
            onChange={(e) => update("services", e.target.value)}
            aria-invalid={problemFor(problems, "services") ? true : undefined}
            aria-describedby={describedBy("services")}
          />
          {errorFor("services")}
        </div>

        <fieldset>
          <legend className={LABEL_CLASS}>How you talk</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {VOICES.map((v) => (
              <label key={v.id} className="tool-check">
                <input
                  type="radio"
                  name={id("voice")}
                  value={v.id}
                  checked={draft.voice === v.id}
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
        </fieldset>

        <div>
          <label htmlFor={id("cta")} className={LABEL_CLASS}>
            Call to action
          </label>
          <select
            id={id("cta")}
            className={FIELD_CLASS}
            value={draft.cta}
            onChange={(e) => {
              if (isCtaChoice(e.target.value)) update("cta", e.target.value);
            }}
          >
            <option value="mix">Mix it up</option>
            {CTAS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[14px] leading-relaxed text-[var(--muted)]">This stays in your browser. Nothing you type here is sent anywhere.</p>

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="button-primary">
            Done
          </button>
          <button type="button" className="button-secondary" onClick={clear}>
            Clear
          </button>
        </div>
      </form>
    </details>
  );
}
