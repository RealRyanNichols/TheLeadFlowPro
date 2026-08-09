"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "meta_pixel_id", label: "Meta (Facebook) Pixel ID", placeholder: "123456789012345" },
  { key: "google_ads_id", label: "Google Ads tag ID", placeholder: "AW-123456789" },
  {
    key: "google_ads_conversion_label",
    label: "Google Ads lead conversion label",
    placeholder: "AbCdEfGhIj0KLMnOPqR",
  },
  { key: "ga4_id", label: "Google Analytics 4 ID (optional)", placeholder: "G-XXXXXXXXXX" },
  {
    key: "calendar_url",
    label: "Booking calendar link",
    placeholder: "https://calendly.com/yourname/30min",
  },
];

export default function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const supabase = createClient();
    for (const f of FIELDS) {
      await supabase
        .from("site_settings")
        .upsert({ key: f.key, value: (values[f.key] ?? "").trim(), updated_at: new Date().toISOString() });
    }
    setBusy(false);
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="card space-y-4">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="label">{f.label}</label>
          <input
            className="input"
            value={values[f.key] ?? ""}
            placeholder={f.placeholder}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
          />
        </div>
      ))}
      {saved && <p className="text-sm font-medium text-mint">Saved. Tracking updates on the next page load.</p>}
      <button type="submit" disabled={busy} className="btn-primary disabled:opacity-50">
        {busy ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
