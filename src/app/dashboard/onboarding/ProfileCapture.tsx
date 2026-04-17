"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, Building2, Phone, Briefcase, Globe, ArrowRight, AlertCircle, Sparkles
} from "lucide-react";

type InitialProfile = {
  name: string | null;
  businessName: string | null;
  industry: string | null;
  phone: string | null;
  website: string | null;
};

const INDUSTRY_SUGGESTIONS = [
  "Dental / medical", "Home services (HVAC, plumbing, roofing)",
  "Beauty / salon / spa", "Auto / mechanic", "Legal / accounting",
  "Fitness / coaching", "Real estate", "Restaurant / food", "Other local service"
];

export function ProfileCapture({ initial }: { initial: InitialProfile }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name || "");
  const [businessName, setBusinessName] = useState(initial.businessName || "");
  const [industry, setIndustry] = useState(initial.industry || "");
  const [phone, setPhone] = useState(initial.phone || "");
  const [website, setWebsite] = useState(initial.website || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, businessName, industry, phone, website })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't save. Try again.");
        setSaving(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network hiccup. Try again in a sec.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" /> Step 1 of 2
        </p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white">
          Let's get the basics.
        </h1>
        <p className="mt-2 text-sm text-ink-300">
          Takes 30 seconds. This is what we'll use to personalize your dashboard,
          auto-fill your ad copy, and pre-populate the scripts the chatbot sends.
          You can always edit in Settings.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-ink-100">{error}</p>
        </div>
      )}

      <form onSubmit={submit} className="glass rounded-2xl p-5 sm:p-6 space-y-4">
        <Field icon={User} label="Your name" required>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            required autoComplete="name" placeholder="Ryan Nichols"
            className={INPUT}
          />
        </Field>

        <Field icon={Building2} label="Business name" required>
          <input
            type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
            required autoComplete="organization" placeholder="Your business"
            className={INPUT}
          />
        </Field>

        <Field icon={Briefcase} label="What kind of business">
          <input
            type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
            list="industry-suggestions"
            placeholder="e.g. Plumbing, dental, salon…"
            className={INPUT}
          />
          <datalist id="industry-suggestions">
            {INDUSTRY_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </Field>

        <Field icon={Phone} label="Business phone" hint="This is the number we'll watch for missed calls.">
          <input
            type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel" placeholder="+1 (555) 123-4567"
            className={INPUT}
          />
        </Field>

        <Field icon={Globe} label="Website (if you have one)">
          <input
            type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
            autoComplete="url" placeholder="https://yourbusiness.com"
            className={INPUT}
          />
        </Field>

        <button
          type="submit"
          disabled={saving || !name.trim() || !businessName.trim()}
          className="btn-accent w-full text-sm py-2.5 disabled:opacity-60"
        >
          {saving ? "Saving…" : (<>Save & keep going <ArrowRight className="h-4 w-4" /></>)}
        </button>
        <p className="text-[11px] text-ink-400 text-center">
          Only <span className="text-white">name</span> and <span className="text-white">business name</span> are required. The rest you can fill in later.
        </p>
      </form>
    </div>
  );
}

const INPUT =
  "w-full bg-ink-950 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50";

function Field({
  icon: Icon, label, required, hint, children
}: {
  icon: any; label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-ink-300 font-semibold">
        {label}
        {required && <span className="text-accent-400 ml-1">*</span>}
      </span>
      <div className="mt-1 relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        {children}
      </div>
      {hint && <p className="mt-1 text-[11px] text-ink-400">{hint}</p>}
    </label>
  );
}
