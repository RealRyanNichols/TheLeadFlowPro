"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Public dashboard + analytics configuration. Same key/value store and the
// same upsert pattern as SettingsForm above it — one settings system.

const TOGGLES: { key: string; label: string; help: string }[] = [
  {
    key: "live_public_enabled",
    label: "Public live dashboard (/live)",
    help: "Master switch. Off replaces every public metric with a quiet 'dashboard is offline' state.",
  },
  {
    key: "live_feed_enabled",
    label: "Public activity feed",
    help: "The anonymized 'a visitor did X' stream on /live.",
  },
  {
    key: "live_show_leads",
    label: "Show lead counts publicly",
    help: "Off by default. Turn on only if you want aggregate lead counts (never identities) on /live.",
  },
];

const NUMBERS: { key: string; label: string; help: string; placeholder: string }[] = [
  {
    key: "live_min_threshold",
    label: "Minimum-volume threshold",
    help: "Public metrics like 'top page' stay hidden until they reach this count, and the feed stays empty below it.",
    placeholder: "3",
  },
  {
    key: "live_feed_delay_seconds",
    label: "Public feed delay (seconds)",
    help: "Events appear on /live only after this delay, so nobody can watch themselves in real time.",
    placeholder: "90",
  },
];

const TEXTS: { key: string; label: string; help: string; placeholder: string }[] = [
  {
    key: "seo_brand_terms",
    label: "Branded search terms",
    help: "Comma-separated. Splits branded vs non-branded Google queries in the SEO tab.",
    placeholder: "leadflow, lead flow pro, ryan nichols",
  },
  {
    key: "inspect_urls",
    label: "Index-monitored URLs",
    help: "Comma-separated paths checked daily against Google's index (max 25).",
    placeholder: "/, /free-build, /pricing, /tools",
  },
];

const PROOF: { value: string; label: string }[] = [
  { value: "proof_1_value", label: "proof_1_label" },
  { value: "proof_2_value", label: "proof_2_label" },
  { value: "proof_3_value", label: "proof_3_label" },
  { value: "proof_4_value", label: "proof_4_label" },
];

const ALL_KEYS = [
  ...TOGGLES.map((t) => t.key),
  ...NUMBERS.map((n) => n.key),
  ...TEXTS.map((t) => t.key),
  ...PROOF.flatMap((p) => [p.value, p.label]),
];

export default function AnalyticsSettingsForm({
  initial,
}: {
  initial: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const supabase = createClient();
    for (const key of ALL_KEYS) {
      await supabase.from("site_settings").upsert({
        key,
        value: (values[key] ?? "").trim(),
        updated_at: new Date().toISOString(),
      });
    }
    setBusy(false);
    setSaved(true);
  }

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <form onSubmit={save} className="card mt-8 space-y-5">
      <div>
        <h2 className="font-bold text-[var(--heading)]">Public live dashboard</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Controls what the world can see at /live. Everything is aggregated and
          anonymous regardless; these switches decide which aggregates appear.
        </p>
      </div>

      {TOGGLES.map((t) => (
        <div key={t.key} className="flex items-start justify-between gap-4">
          <div>
            <label className="label !mb-1" htmlFor={t.key}>{t.label}</label>
            <p className="text-xs text-[var(--quiet)]">{t.help}</p>
          </div>
          <select
            id={t.key}
            className="input !w-28"
            value={values[t.key] === "on" ? "on" : "off"}
            onChange={set(t.key)}
          >
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
        </div>
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        {NUMBERS.map((n) => (
          <div key={n.key}>
            <label className="label" htmlFor={n.key}>{n.label}</label>
            <input
              id={n.key}
              className="input"
              inputMode="numeric"
              value={values[n.key] ?? ""}
              placeholder={n.placeholder}
              onChange={set(n.key)}
            />
            <p className="mt-1 text-xs text-[var(--quiet)]">{n.help}</p>
          </div>
        ))}
      </div>

      {TEXTS.map((t) => (
        <div key={t.key}>
          <label className="label" htmlFor={t.key}>{t.label}</label>
          <input
            id={t.key}
            className="input"
            value={values[t.key] ?? ""}
            placeholder={t.placeholder}
            onChange={set(t.key)}
          />
          <p className="mt-1 text-xs text-[var(--quiet)]">{t.help}</p>
        </div>
      ))}

      <div>
        <h3 className="font-bold text-[var(--heading)]">Operator proof stats</h3>
        <p className="mt-1 text-xs text-[var(--quiet)]">
          Shown in the proof section of /live. Leave a pair blank to hide it —
          nothing is ever invented. Example: value “82K+”, label “combined
          audience across platforms”.
        </p>
        <div className="mt-3 space-y-3">
          {PROOF.map((p, i) => (
            <div key={p.value} className="grid grid-cols-[110px_1fr] gap-3">
              <input
                aria-label={`Proof stat ${i + 1} value`}
                className="input"
                value={values[p.value] ?? ""}
                placeholder="82K+"
                onChange={set(p.value)}
              />
              <input
                aria-label={`Proof stat ${i + 1} label`}
                className="input"
                value={values[p.label] ?? ""}
                placeholder="combined audience across platforms"
                onChange={set(p.label)}
              />
            </div>
          ))}
        </div>
      </div>

      {saved && (
        <p className="text-sm font-medium text-mint">
          Saved. /live picks the changes up within a minute.
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
        {busy ? "Saving..." : "Save Public Dashboard Settings"}
      </button>
    </form>
  );
}
