"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save, ShieldCheck } from "lucide-react";

type Settings = {
  sender_name: string | null;
  sender_email: string | null;
  sender_phone: string | null;
  booking_url: string | null;
  outbound_owner: string;
  closer_owner: string;
  default_market: string;
  daily_new_contact_limit: number;
  daily_followup_limit: number;
  reply_target_minutes: number;
  business_timezone: string;
  allowed_channels: string[];
  operator_notes: string | null;
};

const CHANNELS = [
  ["email", "Email"],
  ["dm", "Direct message"],
  ["phone", "Phone"],
  ["text", "Text"],
] as const;

export default function OperatorSetupForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    senderName: settings.sender_name || "",
    senderEmail: settings.sender_email || "",
    senderPhone: settings.sender_phone || "",
    bookingUrl: settings.booking_url || "",
    outboundOwner: settings.outbound_owner || "Pat",
    closerOwner: settings.closer_owner || "Ryan",
    defaultMarket: settings.default_market || "Longview, TX",
    dailyNewContactLimit: settings.daily_new_contact_limit || 50,
    dailyFollowupLimit: settings.daily_followup_limit || 20,
    replyTargetMinutes: settings.reply_target_minutes || 15,
    businessTimezone: settings.business_timezone || "America/Chicago",
    allowedChannels: settings.allowed_channels || ["email", "dm", "phone", "text"],
    operatorNotes: settings.operator_notes || "",
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleChannel(channel: string) {
    setForm((current) => ({
      ...current,
      allowedChannels: current.allowedChannels.includes(channel)
        ? current.allowedChannels.filter((value) => value !== channel)
        : [...current.allowedChannels, channel],
    }));
  }

  async function save() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/operator/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Could not save OperatorOS setup");
      setNotice("OperatorOS setup saved.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save OperatorOS setup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_12px_32px_rgba(10,18,32,0.04)] sm:p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-[var(--blue)]" />
        <div>
          <h2 className="text-xl font-black text-[var(--heading)]">Non-secret operating inputs</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">These values control ownership, limits, timing, and approved channels. API keys and tokens belong in Vercel environment variables, not in this form or in chat.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Sender name<input value={form.senderName} onChange={(event) => set("senderName", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Sender email<input type="email" value={form.senderEmail} onChange={(event) => set("senderEmail", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Sender phone<input value={form.senderPhone} onChange={(event) => set("senderPhone", event.target.value)} placeholder="Optional until text/call workflows are active" className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Booking URL<input type="url" value={form.bookingUrl} onChange={(event) => set("bookingUrl", event.target.value)} placeholder="https://..." className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Outbound owner<input value={form.outboundOwner} onChange={(event) => set("outboundOwner", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Closer / decision owner<input value={form.closerOwner} onChange={(event) => set("closerOwner", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Default market<input value={form.defaultMarket} onChange={(event) => set("defaultMarket", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Business timezone<input value={form.businessTimezone} onChange={(event) => set("businessTimezone", event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">New contacts per day<input type="number" min={0} max={500} value={form.dailyNewContactLimit} onChange={(event) => set("dailyNewContactLimit", Number(event.target.value))} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Follow-ups per day<input type="number" min={0} max={500} value={form.dailyFollowupLimit} onChange={(event) => set("dailyFollowupLimit", Number(event.target.value))} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
        <label className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">Reply target in minutes<input type="number" min={1} max={10080} value={form.replyTargetMinutes} onChange={(event) => set("replyTargetMinutes", Number(event.target.value))} className="mt-1 w-full rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-semibold text-[var(--text)]" /></label>
      </div>

      <fieldset className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--fill-2)] p-4">
        <legend className="px-1 text-xs font-black uppercase tracking-wide text-[var(--muted)]">Permitted outreach channels</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {CHANNELS.map(([value, label]) => (
            <label key={value} className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm font-bold text-[var(--text)]">
              <input type="checkbox" checked={form.allowedChannels.includes(value)} onChange={() => toggleChannel(value)} /> {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-5 block text-xs font-black uppercase tracking-wide text-[var(--muted)]">Operating notes<textarea rows={5} maxLength={5000} value={form.operatorNotes} onChange={(event) => set("operatorNotes", event.target.value)} placeholder="Buyer filters, industries to avoid, delivery constraints, approval rules, or anything Pat and Ryan should follow." className="mt-1 w-full rounded-xl border border-[var(--line-strong)] px-3 py-3 text-sm leading-6 text-[var(--text)]" /></label>

      <button type="button" disabled={busy} onClick={save} className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[var(--blue)] px-5 text-sm font-black text-white disabled:opacity-50">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save operating inputs
      </button>
      {notice && <p className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${notice.startsWith("OperatorOS") ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{notice}</p>}
    </section>
  );
}
