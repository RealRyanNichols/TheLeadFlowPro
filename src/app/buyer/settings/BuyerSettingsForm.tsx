"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import type { BuyerAccount } from "@/lib/buyer-portal";
import { trackEvent } from "@/lib/events";

const buyerTypes = [
  "Business owner",
  "Agency",
  "Broker",
  "Loan officer",
  "Contractor",
  "Consultant",
  "Media buyer",
  "Sales manager",
  "Founder",
  "Operator",
  "Investor",
];

const budgetRanges = ["Under $500", "$500 to $1,500", "$1,500 to $5,000", "$5,000 to $15,000", "$15,000+"];
const communicationOptions = ["Email", "Phone", "Text", "Email then phone"];

type BuyerSettingsPayload = {
  name: string;
  phone: string;
  company_name: string;
  website: string;
  buyer_type: string;
  industry: string;
  location_served: string;
  budget_range: string;
  intended_use: string;
  communication_preference: string;
  consent_status: "accepted" | "not_requested";
};

export function BuyerSettingsForm({ account, email }: { account: BuyerAccount | null; email: string }) {
  const router = useRouter();
  const initial = useMemo<BuyerSettingsPayload>(
    () => ({
      name: account?.name || "",
      phone: account?.phone || "",
      company_name: account?.company_name || "",
      website: account?.website || "",
      buyer_type: account?.buyer_type || "",
      industry: account?.industry || "",
      location_served: account?.location_served || "",
      budget_range: account?.budget_range || "",
      intended_use: account?.intended_use || "",
      communication_preference: account?.communication_preference || "Email",
      consent_status: account?.consent_status === "accepted" ? "accepted" : "not_requested",
    }),
    [account],
  );
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "success" | "error"; message: string }>({ kind: "idle", message: "" });

  function update<K extends keyof BuyerSettingsPayload>(key: K, value: BuyerSettingsPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus({ kind: "idle", message: "" });

    const response = await fetch("/api/buyer/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);

    if (!response.ok) {
      setStatus({ kind: "error", message: data.error || "Buyer profile could not be saved." });
      return;
    }

    trackEvent("buyer_profile_updated", {
      route: "/buyer/settings",
      buyer_type: form.buyer_type,
      industry: form.industry,
      budget_range: form.budget_range,
      communication_preference: form.communication_preference,
    });

    setStatus({ kind: "success", message: "Buyer profile saved for review." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="lead-shell space-y-5 p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Buyer profile</p>
          <h2 className="mt-2 text-3xl font-black text-white">Complete the account review fields.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">
            These fields help decide whether a buyer can see samples, named listings, exclusive products, or only aggregate insight.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-cyan-100">
          <ShieldCheck className="h-4 w-4" />
          Review gated
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
        <BuyerInput label="Name" value={form.name} onChange={(value) => update("name", value)} placeholder="Your name" />
        <BuyerInput label="Email" value={email} onChange={() => null} placeholder="buyer@company.com" disabled />
        <BuyerInput label="Phone" value={form.phone} onChange={(value) => update("phone", value)} placeholder="Best business number" required={false} />
        <BuyerInput label="Company" value={form.company_name} onChange={(value) => update("company_name", value)} placeholder="Company name" />
        <BuyerInput label="Website" value={form.website} onChange={(value) => update("website", value)} placeholder="https://company.com" required={false} />
        <BuyerSelect label="Buyer type" value={form.buyer_type} onChange={(value) => update("buyer_type", value)} options={buyerTypes} placeholder="Choose buyer type" />
        <BuyerInput label="Industry" value={form.industry} onChange={(value) => update("industry", value)} placeholder="Ecommerce, mortgage, local services" />
        <BuyerInput label="Location served" value={form.location_served} onChange={(value) => update("location_served", value)} placeholder="United States, Texas, East Texas" />
        <BuyerSelect label="Budget range" value={form.budget_range} onChange={(value) => update("budget_range", value)} options={budgetRanges} placeholder="Choose budget range" />
        <BuyerSelect
          label="Communication preference"
          value={form.communication_preference}
          onChange={(value) => update("communication_preference", value)}
          options={communicationOptions}
          placeholder="Choose preference"
        />
      </div>

      <label className="block">
        <span className="text-xs font-extrabold uppercase tracking-wider text-ink-300">Intended use</span>
        <textarea
          value={form.intended_use}
          onChange={(event) => update("intended_use", event.target.value)}
          required
          rows={5}
          minLength={12}
          placeholder="Explain what lead signals you want, how you plan to use them, and what buyers or customers you serve."
          className="mt-2 w-full rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
        />
      </label>

      <label className="flex gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-ink-100">
        <input
          type="checkbox"
          checked={form.consent_status === "accepted"}
          onChange={(event) => update("consent_status", event.target.checked ? "accepted" : "not_requested")}
          required
          className="mt-1 h-4 w-4 rounded border-white/20 bg-ink-950 accent-amber-300"
        />
        <span>
          I understand buyer access is reviewed, suppression-aware, and limited to the approved use case. I will not use LeadFlow data for minors,
          protected-trait targeting, harassment, hidden resale, or unlawful contact.
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-ink-400">
          Saving this profile does not approve access. Approval still requires review and entitlement.
        </p>
        <button type="submit" disabled={saving} className="btn-accent justify-center text-sm disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Save buyer profile
        </button>
      </div>
    </form>
  );
}

function BuyerInput({
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

function BuyerSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
