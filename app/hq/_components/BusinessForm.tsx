"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Voice, Workspace } from "@/lib/hq/types";
import { hqPost } from "./api";
import TagInput from "./TagInput";
import { INDUSTRIES, TIMEZONES } from "./options";

// Who you are. Every draft Autopilot writes reads from this: your name is in
// the sign-off, your city is in the post, your services are what the posts
// are about. Filling it in is the difference between a message that sounds
// like you and one that sounds like nobody.

const VOICES: { value: Voice; label: string; blurb: string }[] = [
  { value: "plain", label: "Plain", blurb: "Short sentences, no fuss. Most trades pick this." },
  { value: "friendly", label: "Friendly", blurb: "Warmer, a little more personal." },
  { value: "formal", label: "Formal", blurb: "Buttoned up. Clinics, law offices, finance." },
];

export default function BusinessForm({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: workspace.name,
    owner_name: workspace.owner_name ?? "",
    phone: workspace.phone ?? "",
    email: workspace.email ?? "",
    website: workspace.website ?? "",
    city: workspace.city ?? "",
    state: workspace.state ?? "",
    timezone: workspace.timezone,
    industry: workspace.industry ?? "",
    offer: workspace.offer ?? "",
    review_link: workspace.review_link ?? "",
    voice: workspace.voice,
    brand_color: workspace.brand_color,
  });
  const [services, setServices] = useState<string[]>(workspace.services);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const result = await hqPost("update_profile", { ...form, services });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} id="business" className="hq-card scroll-mt-24">
      <h2 className="text-xl font-black text-[var(--heading)]">Your business</h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
        This is what every draft is built from. If a message ever sounds wrong, the fix is almost always on this card.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="hq-label" htmlFor="biz-name">
            Business name
          </label>
          <input id="biz-name" className="hq-input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div>
          <label className="hq-label" htmlFor="biz-owner">
            Your name
          </label>
          <input id="biz-owner" className="hq-input" value={form.owner_name} onChange={(e) => set("owner_name", e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label className="hq-label" htmlFor="biz-phone">
            Business phone
          </label>
          <input id="biz-phone" className="hq-input" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(903) 555-0142" />
        </div>
        <div>
          <label className="hq-label" htmlFor="biz-email">
            Business email
          </label>
          <input id="biz-email" className="hq-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className="hq-label" htmlFor="biz-website">
            Website
          </label>
          <input id="biz-website" className="hq-input" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="yourshop.com" />
        </div>
        <div>
          <label className="hq-label" htmlFor="biz-industry">
            Trade
          </label>
          <select id="biz-industry" className="hq-select" value={form.industry} onChange={(e) => set("industry", e.target.value)}>
            <option value="">Pick one</option>
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="hq-label" htmlFor="biz-city">
            City
          </label>
          <input id="biz-city" className="hq-input" value={form.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div>
          <label className="hq-label" htmlFor="biz-state">
            State
          </label>
          <input id="biz-state" className="hq-input" value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="TX" />
        </div>
        <div className="sm:col-span-2">
          <label className="hq-label" htmlFor="biz-tz">
            Time zone
          </label>
          <select id="biz-tz" className="hq-select" value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {TIMEZONES.some((t) => t.value === form.timezone) ? null : <option value={form.timezone}>{form.timezone}</option>}
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">Your brief hour, your weekly day and business hours all run on this.</p>
        </div>
        <div className="sm:col-span-2">
          <TagInput
            id="biz-services"
            label="What you do"
            hint="One per chip. The weekly posts rotate through this list, so a short accurate list beats a long vague one."
            values={services}
            onChange={(next) => {
              setServices(next);
              setSaved(false);
            }}
            placeholder="Water heaters"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="hq-label" htmlFor="biz-offer">
            Your current offer
          </label>
          <input
            id="biz-offer"
            className="hq-input"
            value={form.offer}
            onChange={(e) => set("offer", e.target.value)}
            placeholder="Free camera inspection with any drain clearing this month"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">Leave it empty if you do not run one. Posts and ads carry it when it is here.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="hq-label" htmlFor="biz-review">
            Your review link
          </label>
          <input id="biz-review" className="hq-input" value={form.review_link} onChange={(e) => set("review_link", e.target.value)} placeholder="https://g.page/r/..." />
          <p className="mt-1 text-xs text-[var(--muted)]">The link a happy customer taps. Review requests use it. It has to start with http.</p>
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="hq-label">How your messages should sound</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {VOICES.map((voice) => (
              <label
                key={voice.value}
                className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
                  form.voice === voice.value ? "border-[var(--blue)] bg-[var(--accent-tint)]" : "border-[var(--line-strong)] bg-[var(--panel)]"
                }`}
              >
                <input
                  type="radio"
                  name="voice"
                  className="mt-0.5 h-4 w-4 flex-none"
                  checked={form.voice === voice.value}
                  onChange={() => set("voice", voice.value)}
                />
                <span>
                  <span className="block font-black text-[var(--heading)]">{voice.label}</span>
                  <span className="text-xs text-[var(--muted)]">{voice.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="hq-label" htmlFor="biz-color">
            Your color
          </label>
          <div className="flex items-center gap-3">
            <input
              id="biz-color"
              type="color"
              className="h-11 w-16 rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] p-1"
              value={/^#[0-9a-fA-F]{6}$/.test(form.brand_color) ? form.brand_color : "#1240E8"}
              onChange={(e) => set("brand_color", e.target.value.toUpperCase())}
            />
            <span className="text-sm text-[var(--muted)]">{form.brand_color}</span>
          </div>
        </div>
      </div>

      {error && <p className="hq-error mt-4">{error}</p>}
      {saved && !error && <p className="hq-ok mt-4">Saved.</p>}

      <div className="mt-5">
        <button type="submit" className="pro-buy-button" disabled={busy}>
          {busy ? "Saving..." : "Save your business"}
        </button>
      </div>
    </form>
  );
}
