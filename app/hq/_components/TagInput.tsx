"use client";

import { useState } from "react";
import { X } from "lucide-react";

// The services list. Type one, press enter or comma, it becomes a chip. The
// drafts pick a different service each week, so this list is what the posts
// end up being about.

export default function TagInput({
  id,
  label,
  hint,
  values,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...values];
    for (const part of parts) {
      if (next.length >= 20) break;
      if (!next.some((v) => v.toLowerCase() === part.toLowerCase())) next.push(part.slice(0, 60));
    }
    onChange(next);
    setDraft("");
  }

  return (
    <div>
      <label className="hq-label" htmlFor={id}>
        {label}
      </label>
      {values.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value}>
              <button
                type="button"
                className="hq-btn hq-btn-sm"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={`Remove ${value}`}
              >
                {value} <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          id={id}
          className="hq-input min-w-0 flex-1"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
          }}
          onBlur={() => add(draft)}
        />
        <button type="button" className="hq-btn" onClick={() => add(draft)} disabled={!draft.trim()}>
          Add
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  );
}
