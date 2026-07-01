"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import type { PartnerAccount, PartnerType } from "@/lib/partner-portal";
import { trackEvent } from "@/lib/events";

const partnerTypes: Array<{ value: PartnerType; label: string }> = [
  { value: "source_contributor", label: "Source contributor" },
  { value: "agency_partner", label: "Agency partner" },
  { value: "creator_partner", label: "Creator partner" },
  { value: "local_operator", label: "Local operator" },
  { value: "research_partner", label: "Research partner" },
  { value: "referral_partner", label: "Referral partner" },
  { value: "data_partner", label: "Data partner" },
  { value: "client_partner", label: "Client partner" },
];

const payoutOptions = ["Manual review", "Source credit", "Revenue share review", "Referral commission review", "No payout requested"];

type PartnerSettingsPayload = {
  name: string;
  phone: string;
  company: string;
  website: string;
  partner_type: PartnerType;
  payout_preference: string;
  rights_to_submit: boolean;
  no_prohibited_data: boolean;
  review_gated: boolean;
  no_guaranteed_payment: boolean;
};

export function PartnerSettingsForm({ account, email }: { account: PartnerAccount | null; email: string }) {
  const router = useRouter();
  const initial = useMemo<PartnerSettingsPayload>(
    () => ({
      name: account?.name || "",
      phone: account?.phone || "",
      company: account?.company || "",
      website: account?.website || "",
      partner_type: account?.partner_type || "source_contributor",
      payout_preference: account?.payout_preference || "Manual review",
      rights_to_submit: Boolean(account?.compliance_confirmations?.rights_to_submit),
      no_prohibited_data: Boolean(account?.compliance_confirmations?.no_prohibited_data),
      review_gated: Boolean(account?.compliance_confirmations?.review_gated),
      no_guaranteed_payment: Boolean(account?.compliance_confirmations?.no_guaranteed_payment),
    }),
    [account],
  );
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message: string }>({ kind: "idle", message: "" });

  function update<K extends keyof PartnerSettingsPayload>(key: K, value: PartnerSettingsPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus({ kind: "idle", message: "" });

    const response = await fetch("/api/partner/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setStatus({ kind: "error", message: data.error || "Partner profile could not be saved." });
      return;
    }

    trackEvent("partner_signup_completed", {
      route: "/partner/settings",
      partner_type: form.partner_type,
      payout_preference: form.payout_preference,
      status: "profile_saved",
    });

    setStatus({ kind: "success", message: "Partner profile saved for review." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="lead-shell space-y-5 p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Partner profile</p>
          <h2 className="mt-2 text-3xl font-black text-white">Complete the review fields.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
            Partners can contribute sources, audiences, niche knowledge, and referral demand, but release and payouts stay review-gated.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-cyan-100">
          <ShieldCheck className="h-4 w-4" />
          Proof first
        </div>
      </div>

      {status.message ? (
        <div
          className={
            status.kind === "error"
              ? "rounded-lg border border-red-300/35 bg-red-300/10 p-3 text-sm leading-6 text-red-100"
              : "rounded-lg border border-lead-300/35 bg-lead-300/10 p-3 text-sm leading-6 text-lead-100"
          }
        >
          {status.message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <PartnerInput label="Name" value={form.name} onChange={(value) => update("name", value)} placeholder="Your name" />
        <PartnerInput label="Email" value={email} onChange={() => null} placeholder="partner@company.com" disabled />
        <PartnerInput label="Phone" value={form.phone} onChange={(value) => update("phone", value)} placeholder="Best business number" required={false} />
        <PartnerInput label="Company" value={form.company} onChange={(value) => update("company", value)} placeholder="Company or operating name" />
        <PartnerInput label="Website" value={form.website} onChange={(value) => update("website", value)} placeholder="https://company.com" required={false} />
        <label className="block">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-300">Partner type</span>
          <select
            value={form.partner_type}
            onChange={(event) => update("partner_type", event.target.value as PartnerType)}
            required
            className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
          >
            {partnerTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-300">Payout preference</span>
          <select
            value={form.payout_preference}
            onChange={(event) => update("payout_preference", event.target.value)}
            required
            className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
          >
            {payoutOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4">
        <p className="text-sm font-black text-amber-100">Partner source rules</p>
        <p className="mt-2 text-sm leading-6 text-amber-50">
          Do not submit hacked data, leaked data, login-only data, minors data, protected-trait targeting data, private medical data, private financial account data, sensitive individual political persuasion data, or unclear-permission data.
        </p>
      </div>

      <div className="grid gap-3">
        <PartnerCheckbox checked={form.rights_to_submit} onChange={(value) => update("rights_to_submit", value)}>
          I own or have rights to submit the source.
        </PartnerCheckbox>
        <PartnerCheckbox checked={form.no_prohibited_data} onChange={(value) => update("no_prohibited_data", value)}>
          I am not submitting private, hidden, hacked, leaked, minors, protected-trait, medical, financial-account, or sensitive political persuasion data.
        </PartnerCheckbox>
        <PartnerCheckbox checked={form.review_gated} onChange={(value) => update("review_gated", value)}>
          I understand every submission is reviewed for proof, permission, risk, suppression, and buyer use case.
        </PartnerCheckbox>
        <PartnerCheckbox checked={form.no_guaranteed_payment} onChange={(value) => update("no_guaranteed_payment", value)}>
          I understand not all submissions become paid products and revenue share is not guaranteed.
        </PartnerCheckbox>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-ink-400">
          Saving this profile does not approve partner status, marketplace release, or payout.
        </p>
        <button type="submit" disabled={saving} className="btn-accent justify-center text-sm disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Save partner profile
        </button>
      </div>
    </form>
  );
}

function PartnerInput({
  label,
  value,
  onChange,
  placeholder,
  required = true,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-300">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </label>
  );
}

function PartnerCheckbox({ checked, onChange, children }: { checked: boolean; onChange: (value: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-ink-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        required
        className="mt-1 h-4 w-4 rounded border-white/20 bg-ink-950 accent-amber-300"
      />
      <span>{children}</span>
    </label>
  );
}
