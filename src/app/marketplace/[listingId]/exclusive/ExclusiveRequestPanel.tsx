"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Crown, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { ExclusiveLandingPageData, ExclusiveRequestAccessModel } from "@/lib/leadflow-exclusive";

type RequestState =
  | { status: "idle"; message: string }
  | { status: "saving"; message: string }
  | { status: "success"; message: string; requestId?: string }
  | { status: "error"; message: string };

const accessOptions: Array<{ value: ExclusiveRequestAccessModel; label: string }> = [
  { value: "exclusive_listing", label: "Exclusive profile batch" },
  { value: "exclusive_geo", label: "Exclusive territory" },
  { value: "exclusive_vertical", label: "Exclusive vertical" },
  { value: "exclusive_time_window", label: "Exclusive time window" },
];

const budgetOptions = ["Under $500", "$500 to $1,500", "$1,500 to $5,000", "$5,000 to $10,000", "$10,000+"];
const urgencyOptions = ["This week", "This month", "Next 90 days", "Researching first", "Need custom review"];

export function ExclusiveRequestPanel({ data }: { data: ExclusiveLandingPageData }) {
  const account = data.buyerData.authenticated ? data.buyerData.account : null;
  const [buyerName, setBuyerName] = useState(account?.name || "");
  const [company, setCompany] = useState(account?.company_name || "");
  const [email, setEmail] = useState(account?.email || "");
  const [phone, setPhone] = useState(account?.phone || "");
  const [website, setWebsite] = useState(account?.website || "");
  const [requestedAccessModel, setRequestedAccessModel] = useState<ExclusiveRequestAccessModel>(
    data.listing.accessModel === "exclusive_geo" ||
      data.listing.accessModel === "exclusive_vertical" ||
      data.listing.accessModel === "exclusive_time_window"
      ? data.listing.accessModel
      : "exclusive_listing",
  );
  const [requestedTerritory, setRequestedTerritory] = useState(data.listing.territory || "");
  const [requestedVertical, setRequestedVertical] = useState(data.listing.vertical || "");
  const [requestedStart, setRequestedStart] = useState("");
  const [requestedEnd, setRequestedEnd] = useState("");
  const [budgetRange, setBudgetRange] = useState(account?.budget_range || "");
  const [intendedUse, setIntendedUse] = useState(account?.intended_use || "");
  const [urgency, setUrgency] = useState("");
  const [notes, setNotes] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [state, setState] = useState<RequestState>({ status: "idle", message: "" });

  const disabled = useMemo(() => {
    return (
      state.status === "saving" ||
      !data.availability.canRequest ||
      buyerName.trim().length < 2 ||
      company.trim().length < 2 ||
      !email.includes("@") ||
      budgetRange.length < 2 ||
      intendedUse.trim().length < 12 ||
      urgency.length < 2 ||
      !consentAccepted
    );
  }, [budgetRange, buyerName, company, consentAccepted, data.availability.canRequest, email, intendedUse, state.status, urgency]);

  useEffect(() => {
    trackLeadFlowEvent("exclusive_request_started", {
      route: `/marketplace/${data.listing.slug}/exclusive`,
      listing_id: data.listing.id,
      access_model: data.listing.accessModel,
      status: data.listing.status,
      vertical: data.listing.vertical,
      category: data.listing.category,
    });
  }, [data.listing.accessModel, data.listing.category, data.listing.id, data.listing.slug, data.listing.status, data.listing.vertical]);

  async function submitRequest() {
    setState({ status: "saving", message: "Saving exclusive request for review." });
    try {
      const response = await fetch("/api/leadflow/exclusive/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId: data.listing.slug || data.listing.id,
          buyerName,
          company,
          email,
          phone,
          website,
          requestedAccessModel,
          requestedTerritory,
          requestedVertical,
          requestedStart,
          requestedEnd,
          budgetRange,
          intendedUse,
          urgency,
          notes,
          consentAccepted,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Exclusive request failed.");
      trackLeadFlowEvent("exclusive_request_submitted", {
        route: `/marketplace/${data.listing.slug}/exclusive`,
        listing_id: data.listing.id,
        exclusive_request_id: payload.request?.id || "",
        requested_access_model: requestedAccessModel,
        status: payload.request?.status || "submitted",
      });
      setState({
        status: "success",
        message: "Exclusive request saved. Admin review will check fit, source rights, suppression status, and whether the listing can be blocked for one buyer.",
        requestId: payload.request?.id,
      });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "Exclusive request failed." });
    }
  }

  return (
    <div className="lead-shell p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-100">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Manual exclusive review</p>
          <h2 className="mt-1 text-2xl font-black text-white">{data.availability.ctaLabel}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">{data.availability.reason}</p>
        </div>
      </div>

      {!data.buyerData.authenticated ? (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <LockKeyhole className="h-5 w-5 text-cyan-300" />
          <h3 className="mt-3 text-lg font-black text-white">Buyer login required.</h3>
          <p className="mt-2 text-sm leading-6 text-ink-300">
            Public users can preview the listing. Exclusive requests require a buyer account so access can be scoped and audited.
          </p>
          <Link href={`/login?mode=buyer&next=/marketplace/${data.listing.slug}/exclusive`} className="btn-accent mt-4 justify-center text-sm">
            Log in to request exclusive
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : !account ? (
        <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-4 text-sm leading-6 text-accent-100">
          Complete the buyer profile before requesting exclusive access.
          <Link href="/buyer/settings" className="mt-3 inline-flex font-black underline">
            Complete buyer profile
          </Link>
        </div>
      ) : !data.availability.canRequest ? (
        <div className="mt-5 rounded-lg border border-red-300/30 bg-red-300/10 p-4 text-sm leading-6 text-red-100">
          {data.availability.reason}
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Buyer name" value={buyerName} onChange={setBuyerName} autoComplete="name" required />
            <Field label="Company" value={company} onChange={setCompany} autoComplete="organization" required />
            <Field label="Email" value={email} onChange={setEmail} type="email" autoComplete="email" required />
            <Field label="Phone" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
            <Field label="Website" value={website} onChange={setWebsite} type="url" placeholder="https://example.com" />
            <Select label="Exclusive type" value={requestedAccessModel} onChange={(value) => setRequestedAccessModel(value as ExclusiveRequestAccessModel)} options={accessOptions} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Desired territory" value={requestedTerritory} onChange={setRequestedTerritory} placeholder="Texas, Dallas, United States" />
            <Field label="Desired vertical" value={requestedVertical} onChange={setRequestedVertical} placeholder="Ecommerce, contractors, mortgage" />
            <Field label="Start date" value={requestedStart} onChange={setRequestedStart} type="date" />
            <Field label="End date" value={requestedEnd} onChange={setRequestedEnd} type="date" />
            <Select label="Budget range" value={budgetRange} onChange={setBudgetRange} options={budgetOptions.map((option) => ({ value: option, label: option }))} />
            <Select label="Urgency" value={urgency} onChange={setUrgency} options={urgencyOptions.map((option) => ({ value: option, label: option }))} />
          </div>

          <TextArea label="Intended use" value={intendedUse} onChange={setIntendedUse} placeholder="How will you use this exclusive signal product if approved?" required />
          <TextArea label="Notes" value={notes} onChange={setNotes} placeholder="Territory limits, buyer fit, access window, or questions for admin review." />

          <label className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-100">
            <span className="flex items-start gap-3">
              <input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} className="mt-1" />
              <span>
                I understand exclusive access is reviewed manually and depends on category, geography, intended use, source rights, compliance status, and suppression status. I understand approval can block other buyers during the active window.
              </span>
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={submitRequest} disabled={disabled} className="btn-accent justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50">
              {state.status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Submit exclusive request
            </button>
            <Link
              href={`/checkout/exclusive_deposit/${data.listing.slug || data.listing.id}`}
              onClick={() => trackLeadFlowEvent("checkout_started", {
                route: `/marketplace/${data.listing.slug}/exclusive`,
                checkout_type: "exclusive_deposit",
                listing_id: data.listing.id,
                status: data.listing.status,
              })}
              className="btn-ghost justify-center text-sm"
            >
              Start exclusive deposit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {state.status === "error" ? (
            <div className="rounded-lg border border-red-300/35 bg-red-300/10 p-3 text-sm leading-6 text-red-100">{state.message}</div>
          ) : null}
          {state.status === "success" ? (
            <div className="rounded-lg border border-lead-300/35 bg-lead-300/10 p-3 text-sm leading-6 text-lead-100">
              <CheckCircle2 className="mb-2 h-5 w-5" />
              {state.message}
              <Link href="/buyer/requests" className="mt-3 inline-flex font-black underline">
                Open buyer requests
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="min-h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/50"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50"
      >
        <option value="" disabled>Choose one</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={4}
        placeholder={placeholder}
        className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-ink-500 focus:border-cyan-300/50"
      />
    </label>
  );
}
