"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkspaceSettings } from "@/lib/hq/types";
import { hqPost } from "./api";
import { hourLabel, WEEKDAYS } from "./options";

// What Autopilot is allowed to do without asking. Every switch here is off
// until you turn it on, and the one that sends a text to a customer stays
// locked until there is a line to send it from.

function Toggle({
  id,
  label,
  blurb,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  blurb: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex min-h-[44px] items-start gap-3 rounded-xl border p-3 text-sm ${
        disabled ? "border-[var(--line)] bg-[var(--fill-2)] opacity-80" : "cursor-pointer border-[var(--line-strong)] bg-[var(--panel)]"
      }`}
    >
      <input id={id} type="checkbox" className="mt-0.5 h-5 w-5 flex-none" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="min-w-0">
        <span className="block font-black text-[var(--heading)]">{label}</span>
        <span className="text-xs leading-relaxed text-[var(--muted)]">{blurb}</span>
      </span>
    </label>
  );
}

export default function AutomationForm({ settings, smsConnected }: { settings: WorkspaceSettings; smsConnected: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...settings });
  const [followUpDays, setFollowUpDays] = useState(settings.followUpDays.join(", "));
  const [alertPhones, setAlertPhones] = useState(settings.alertPhones.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function set<K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const days = followUpDays
      .split(",")
      .map((d) => Number(d.trim()))
      .filter((d) => Number.isFinite(d) && d > 0);
    const phones = alertPhones
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const result = await hqPost("update_profile", {
      settings: { ...form, followUpDays: days.length ? days : settings.followUpDays, alertPhones: phones },
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} id="automation" className="hq-card scroll-mt-24">
      <h2 className="text-xl font-black text-[var(--heading)]">What runs on its own</h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">Autopilot checks every five minutes. These switches decide what it does when it finds something.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Toggle
          id="auto-text"
          label="Text a new lead back right away"
          blurb={
            smsConnected
              ? "Goes out in seconds, in your voice, only to people who agreed to texts."
              : "Locked until you connect a text line below. Nothing to send from yet."
          }
          checked={form.autoTextBack && smsConnected}
          disabled={!smsConnected}
          onChange={(v) => set("autoTextBack", v)}
        />
        <Toggle
          id="auto-email"
          label="Email a new lead back right away"
          blurb="When they left an email address. This works without any channel to connect."
          checked={form.autoEmailReply}
          onChange={(v) => set("autoEmailReply", v)}
        />
        <Toggle
          id="alert-email"
          label="Email me when a lead lands"
          blurb="And again if nobody has answered them by your response target."
          checked={form.alertEmail}
          onChange={(v) => set("alertEmail", v)}
        />
        <Toggle
          id="alert-sms"
          label="Text me when a lead lands"
          blurb={smsConnected ? "Sent from your connected line to you, not to the customer." : "Needs a connected text line below."}
          checked={form.alertSms && smsConnected}
          disabled={!smsConnected}
          onChange={(v) => set("alertSms", v)}
        />
        <Toggle
          id="brief-email"
          label="Email me the morning brief"
          blurb="Numbers, who to call, what is waiting on approval. Every day at your brief hour."
          checked={form.briefEmail}
          onChange={(v) => set("briefEmail", v)}
        />
        <Toggle
          id="weekly-content"
          label="Write the week's content for me"
          blurb="Three posts, one lead ad and one video script land in Content on your weekly day."
          checked={form.weeklyContent}
          onChange={(v) => set("weeklyContent", v)}
        />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="hq-label" htmlFor="auto-target">
            A lead is slipping after
          </label>
          <div className="flex items-center gap-2">
            <input
              id="auto-target"
              className="hq-input"
              type="number"
              min={5}
              max={240}
              value={form.responseTargetMinutes}
              onChange={(e) => set("responseTargetMinutes", Number(e.target.value))}
            />
            <span className="text-sm text-[var(--muted)]">minutes</span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">Between 5 and 240. Past this with no first reply, you get told again.</p>
        </div>
        <div>
          <label className="hq-label" htmlFor="auto-hour">
            Brief lands at
          </label>
          <select id="auto-hour" className="hq-select" value={form.briefHour} onChange={(e) => set("briefHour", Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {hourLabel(h)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="hq-label" htmlFor="auto-weekly">
            Weekly report and content on
          </label>
          <select id="auto-weekly" className="hq-select" value={form.weeklyDay} onChange={(e) => set("weeklyDay", Number(e.target.value))}>
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="hq-label" htmlFor="auto-ladder">
            Follow up on days
          </label>
          <input id="auto-ladder" className="hq-input" value={followUpDays} onChange={(e) => { setFollowUpDays(e.target.value); setSaved(false); }} placeholder="1, 3, 7, 14, 30" />
          <p className="mt-1 text-xs text-[var(--muted)]">Days after you first make contact. Separate them with commas. Up to eight, each between 1 and 90.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="hq-label" htmlFor="auto-phones">
            Also text these numbers with alerts
          </label>
          <input id="auto-phones" className="hq-input" value={alertPhones} onChange={(e) => { setAlertPhones(e.target.value); setSaved(false); }} placeholder="(903) 555-0142, (903) 555-0198" />
          <p className="mt-1 text-xs text-[var(--muted)]">Your dispatcher, your partner, whoever else needs to know. Up to five.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="hq-label" htmlFor="auto-notes">
            Anything the drafts should know
          </label>
          <textarea
            id="auto-notes"
            className="hq-textarea"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="We do not do mobile homes. Never promise same day in July. Always mention the 2 year warranty."
          />
          <p className="mt-1 text-xs text-[var(--muted)]">Promises you will not make, things you never say, anything running this month.</p>
        </div>
      </div>

      {error && <p className="hq-error mt-4">{error}</p>}
      {saved && !error && <p className="hq-ok mt-4">Saved.</p>}

      <div className="mt-5">
        <button type="submit" className="pro-buy-button" disabled={busy}>
          {busy ? "Saving..." : "Save these settings"}
        </button>
      </div>
    </form>
  );
}
