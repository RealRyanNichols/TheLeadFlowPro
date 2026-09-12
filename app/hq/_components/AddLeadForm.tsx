"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { hqPost } from "./api";

// Adding a lead by hand: the call that came in while you were under a sink,
// the neighbor who stopped you in the driveway. Name, phone or email is
// enough. The texting consent box is unticked and stays unticked unless the
// person actually said yes, because that is the only thing that makes a
// text legal to send.

export default function AddLeadForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    message: "",
    source_detail: "",
    value_usd: "",
    consent_sms: false,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const amount = Number(form.value_usd);
    const result = await hqPost("add_lead", {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      service: form.service.trim(),
      message: form.message.trim(),
      source_detail: form.source_detail.trim(),
      consent_sms: form.consent_sms,
      ...(form.value_usd.trim() && Number.isFinite(amount) && amount > 0 ? { value_usd: amount } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm({ name: "", phone: "", email: "", service: "", message: "", source_detail: "", value_usd: "", consent_sms: false });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="pro-buy-button" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" className="h-4 w-4" /> Add a lead
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="hq-card w-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[var(--heading)]">Add a lead</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">A name, a phone number or an email. Anything else you know helps the drafts sound right.</p>
        </div>
        <button type="button" className="hq-btn hq-btn-sm" onClick={() => setOpen(false)}>
          <X aria-hidden="true" className="h-4 w-4" /> Close
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="hq-label" htmlFor="lead-name">
            Name
          </label>
          <input id="lead-name" className="hq-input" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
        </div>
        <div>
          <label className="hq-label" htmlFor="lead-phone">
            Phone
          </label>
          <input id="lead-phone" className="hq-input" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(903) 555-0142" />
        </div>
        <div>
          <label className="hq-label" htmlFor="lead-email">
            Email
          </label>
          <input id="lead-email" className="hq-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className="hq-label" htmlFor="lead-service">
            What they need
          </label>
          <input id="lead-service" className="hq-input" value={form.service} onChange={(e) => set("service", e.target.value)} placeholder="Water heater" />
        </div>
        <div>
          <label className="hq-label" htmlFor="lead-source">
            Where they came from
          </label>
          <input id="lead-source" className="hq-input" value={form.source_detail} onChange={(e) => set("source_detail", e.target.value)} placeholder="Called the shop" />
        </div>
        <div>
          <label className="hq-label" htmlFor="lead-value">
            Job value if you know it
          </label>
          <input id="lead-value" className="hq-input" inputMode="decimal" value={form.value_usd} onChange={(e) => set("value_usd", e.target.value)} placeholder="1850" />
        </div>
        <div className="sm:col-span-2">
          <label className="hq-label" htmlFor="lead-message">
            What they said
          </label>
          <textarea id="lead-message" className="hq-textarea" value={form.message} onChange={(e) => set("message", e.target.value)} />
        </div>
      </div>

      <label className="mt-4 flex min-h-[44px] items-start gap-3 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-3 text-sm text-[var(--text)]">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 flex-none"
          checked={form.consent_sms}
          onChange={(e) => set("consent_sms", e.target.checked)}
        />
        <span>They said it is fine to text them. Leave this unticked unless they actually said so. Without it, Autopilot will email or tell you to call instead.</span>
      </label>

      {error && <p className="hq-error mt-4">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" className="pro-buy-button" disabled={busy}>
          {busy ? "Saving..." : "Save the lead"}
        </button>
        <button type="button" className="hq-btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
