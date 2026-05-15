import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ConversionHiddenFields } from "@/components/site/ConversionEvents";
import { VisitorIdField } from "@/components/site/VisitorIdField";

type OrganicAuditFormProps = {
  source: string;
  landingPage?: string;
  industry?: string;
  pain?: string;
  ctaLabel?: string;
  compact?: boolean;
};

const REVENUE_OPTIONS = [
  { value: "unknown", label: "Not sure / rather not say" },
  { value: "under-10k", label: "Under $10K/mo" },
  { value: "10-50k", label: "$10K-$50K/mo" },
  { value: "50-250k", label: "$50K-$250K/mo" },
  { value: "250k-plus", label: "$250K+/mo" },
];

const LEAD_SOURCES = [
  "Google search / Maps",
  "Facebook or Instagram",
  "Website form",
  "Phone calls",
  "Referrals",
  "Paid ads",
  "DMs",
  "Not sure",
];

const RESPONSE_TIMES = [
  "Under 5 minutes",
  "5-30 minutes",
  "Same day",
  "Next day",
  "Depends who sees it",
  "Not sure",
];

export function OrganicAuditForm({
  source,
  landingPage,
  industry,
  pain,
  ctaLabel = "Run my lead leak audit",
  compact = false,
}: OrganicAuditFormProps) {
  return (
    <form
      action="/api/lead-leak-audit"
      method="post"
      data-conversion-event="audit_form_submit"
      data-conversion-cta={ctaLabel}
      data-conversion-source-page={landingPage ?? "/lead-leak-audit"}
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-6"
    >
      <VisitorIdField />
      <ConversionHiddenFields formType="free_lead_leak_audit" sourcePage={landingPage ?? "/lead-leak-audit"} />
      <input type="hidden" name="source" value={source} />
      {landingPage ? <input type="hidden" name="landingPage" value={landingPage} /> : null}
      {industry ? <input type="hidden" name="industry" value={industry} /> : null}
      {pain ? <input type="hidden" name="pain" value={pain} /> : null}

      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
        <CheckCircle2 className="h-4 w-4" />
        Free lead leak audit
      </div>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
        Send the business. Get the leak map.
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Ryan reviews the public-facing path and looks for the spots where calls, clicks, forms,
        DMs, and follow-up are turning into lost money.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="fullName" placeholder="Your name" required />
        <Field label="Phone" name="phone" placeholder="Best number" />
        <Field label="Email" name="email" type="email" placeholder="you@business.com" required />
        <Field label="Business" name="businessName" placeholder="Business name" required />
        <Field label="Website" name="businessUrl" placeholder="https://yourbusiness.com" />
        <label>
          <span className="text-sm font-bold text-slate-800">Monthly revenue</span>
          <select
            name="monthlyRevenueRange"
            defaultValue="unknown"
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          >
            {REVENUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-sm font-bold text-slate-800">Main lead source</span>
          <select
            name="currentLeadSource"
            defaultValue="Not sure"
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          >
            {LEAD_SOURCES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-bold text-slate-800">Average first response</span>
          <select
            name="responseTime"
            defaultValue="Not sure"
            className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          >
            {RESPONSE_TIMES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!compact ? (
        <label className="mt-4 block">
          <span className="text-sm font-bold text-slate-800">Where do you think the leak is?</span>
          <textarea
            name="leakConcern"
            rows={4}
            placeholder="Example: calls are missed, Facebook leads do not book, site traffic does not turn into forms, staff follow-up is inconsistent..."
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
        </label>
      ) : null}

      <button
        type="submit"
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
      >
        {ctaLabel} <ArrowRight className="h-4 w-4" />
      </button>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        No outcome guarantees. No ad spend required. The first job is to find the leak and make
        the next sales move obvious.
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
      />
    </label>
  );
}
