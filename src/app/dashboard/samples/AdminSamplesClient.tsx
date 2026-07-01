"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, CreditCard, FileCheck2, Loader2, Plus, ShieldCheck, XCircle } from "lucide-react";
import { trackLeadFlowEvent } from "@/lib/leadflow-events-client";
import type { AdminSamplesPageData, SampleAccessType, SampleFieldGroup } from "@/lib/leadflow-samples";
import { cn } from "@/lib/utils";

const fieldGroups: Array<{ key: SampleFieldGroup; label: string }> = [
  { key: "public_profile", label: "Public profile" },
  { key: "source_proof", label: "Source proof" },
  { key: "compliance", label: "Compliance" },
  { key: "contact", label: "Contact fields" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function dollars(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function statusTone(status: string) {
  if (/active|fulfilled|approved|paid/.test(status)) return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (/denied|revoked|failed|expired|archived/.test(status)) return "border-red-300/35 bg-red-300/12 text-red-100";
  return "border-accent-300/35 bg-accent-300/12 text-accent-100";
}

function readable(value: string) {
  return value.replace(/_/g, " ");
}

export function AdminSamplesClient({ data }: { data: AdminSamplesPageData }) {
  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_12%_10%,rgba(35,184,255,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(255,186,61,0.12),transparent_28%),linear-gradient(135deg,#07101b,#050711)] p-5 shadow-2xl shadow-black/30 md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <CreditCard className="h-4 w-4" />
              Paid samples
            </p>
            <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight text-white md:text-6xl">
              Sell small proof-backed samples before full access.
            </h1>
            <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
              Samples are scoped, reviewed, and audited. They should prove source quality without dumping contact fields, raw answers, hidden notes, or suppressed data.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-extrabold uppercase tracking-wider text-ink-200">
            {data.mode === "live" ? "Live data" : "Safe test data"}
          </div>
        </div>
        {data.loadErrors.length ? (
          <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
            {data.loadErrors[0]}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Stat icon={FileCheck2} label="Samples" value={String(data.stats.samples)} />
        <Stat icon={Clock3} label="Requests" value={String(data.stats.requests)} />
        <Stat icon={Clock3} label="Pending" value={String(data.stats.pending)} />
        <Stat icon={CreditCard} label="Paid" value={String(data.stats.paid)} />
        <Stat icon={CheckCircle2} label="Approved" value={String(data.stats.approved)} />
        <Stat icon={CreditCard} label="Revenue" value={dollars(data.stats.revenue)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
        <SampleEditor data={data} />
        <SamplesTable data={data} />
      </section>

      <RequestsTable data={data} />
      <PaymentsTable data={data} />
    </div>
  );
}

function SampleEditor({ data }: { data: AdminSamplesPageData }) {
  const listingOptions = useMemo(() => data.listings, [data.listings]);
  const firstListing = listingOptions[0];
  const [listingId, setListingId] = useState(firstListing?.slug || firstListing?.id || "");
  const [sampleId, setSampleId] = useState("");
  const [sampleType, setSampleType] = useState<SampleAccessType>("paid_sample");
  const [title, setTitle] = useState(firstListing ? `${firstListing.title} Sample` : "Proof-backed sample");
  const [description, setDescription] = useState("Small source-backed sample for review before full access.");
  const [price, setPrice] = useState(49);
  const [recordCount, setRecordCount] = useState(5);
  const [groups, setGroups] = useState<SampleFieldGroup[]>(["public_profile", "source_proof", "compliance"]);
  const [status, setStatus] = useState("active");
  const [contactFieldsAllowed, setContactFieldsAllowed] = useState(false);
  const [requiresAdminApproval, setRequiresAdminApproval] = useState(true);
  const [allowedUse, setAllowedUse] = useState("Review source proof, scoring context, and buyer-use fit before requesting full access.");
  const [restrictedUse, setRestrictedUse] = useState("Do not use as a blind list, suppressed outreach list, raw identity dossier, or guaranteed sales source.");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ error?: string; message?: string } | null>(null);

  function loadSample(id: string) {
    const sample = data.samples.find((item) => item.id === id);
    if (!sample) return;
    setSampleId(sample.id);
    setListingId(sample.listing_id || "");
    setSampleType(sample.sample_type);
    setTitle(sample.title);
    setDescription(sample.description || "");
    setPrice(Number(sample.price || 0));
    setRecordCount(sample.record_count);
    setGroups(sample.field_groups);
    setStatus(sample.status);
    setContactFieldsAllowed(sample.contact_fields_allowed);
    setRequiresAdminApproval(sample.requires_admin_approval);
    setAllowedUse(sample.allowed_use);
    setRestrictedUse(sample.restricted_use);
  }

  function toggleGroup(group: SampleFieldGroup) {
    setGroups((current) => current.includes(group) ? current.filter((item) => item !== group) : [...current, group]);
  }

  async function saveSample() {
    setPending(true);
    setResult(null);
    const action = sampleId ? "update_sample" : "create_sample";
    trackLeadFlowEvent("admin_sample_reviewed", {
      route: "/dashboard/samples",
      action,
      listing_id: listingId,
      sample_id: sampleId,
      status,
    });
    try {
      const response = await fetch("/api/leadflow/samples/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          sampleId,
          listingId,
          sampleType,
          title,
          description,
          price,
          recordCount,
          fieldGroups: groups,
          status,
          contactFieldsAllowed,
          requiresAdminApproval,
          allowedUse,
          restrictedUse,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Sample save failed.");
      setSampleId(payload.sample?.id || sampleId);
      setResult({ message: "Sample settings saved and audited." });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "Sample save failed." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <div className="flex items-start gap-3">
        <Plus className="mt-1 h-5 w-5 text-cyan-300" />
        <div>
          <h2 className="text-2xl font-black text-white">Create or edit sample</h2>
          <p className="mt-2 text-sm leading-6 text-ink-300">
            Sample products should be small, proof-backed, and restricted to approved field groups.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Load existing sample</span>
          <select value={sampleId} onChange={(event) => loadSample(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
            <option value="">New sample</option>
            {data.samples.map((sample) => <option key={sample.id} value={sample.id}>{sample.title}</option>)}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Listing</span>
          <select value={listingId} onChange={(event) => setListingId(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
            {listingOptions.length ? listingOptions.map((listing) => <option key={listing.id} value={listing.slug || listing.id}>{listing.title}</option>) : <option value="">No listings loaded</option>}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Sample type</span>
            <select value={sampleType} onChange={(event) => setSampleType(event.target.value as SampleAccessType)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
              <option value="free_redacted">Free redacted</option>
              <option value="paid_sample">Paid sample</option>
              <option value="buyer_approved">Buyer approved</option>
              <option value="admin_created">Admin created</option>
              <option value="report_only">Report only</option>
            </select>
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm font-bold text-white outline-none focus:border-cyan-300/50">
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
              <option value="revoked">Revoked</option>
            </select>
          </label>
        </div>

        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Description</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50" />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Price</span>
            <input type="number" min="0" value={price} onChange={(event) => setPrice(Number(event.target.value))} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50" />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Record count</span>
            <input type="number" min="1" value={recordCount} onChange={(event) => setRecordCount(Number(event.target.value))} className="h-11 rounded-lg border border-white/10 bg-ink-950 px-3 text-sm text-white outline-none focus:border-cyan-300/50" />
          </label>
        </div>

        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Field groups</p>
          <div className="mt-3 grid gap-2">
            {fieldGroups.map((group) => (
              <label key={group.key} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm font-bold text-white">
                <input type="checkbox" checked={groups.includes(group.key)} onChange={() => toggleGroup(group.key)} />
                {group.label}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 text-sm leading-6 text-ink-200">
          <input type="checkbox" checked={requiresAdminApproval} onChange={(event) => setRequiresAdminApproval(event.target.checked)} className="mt-1" />
          <span>Require admin approval before sample access is granted.</span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-red-300/25 bg-red-300/10 p-3 text-sm leading-6 text-red-100">
          <input type="checkbox" checked={contactFieldsAllowed} onChange={(event) => setContactFieldsAllowed(event.target.checked)} className="mt-1" />
          <span>Allow approved public contact fields. Only use when listing rights and sample settings allow it.</span>
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Allowed use</span>
          <textarea value={allowedUse} onChange={(event) => setAllowedUse(event.target.value)} rows={3} className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50" />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Restricted use</span>
          <textarea value={restrictedUse} onChange={(event) => setRestrictedUse(event.target.value)} rows={3} className="rounded-lg border border-white/10 bg-ink-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-300/50" />
        </label>

        <button type="button" onClick={saveSample} disabled={pending || !listingId || !title || !groups.length} className="btn-accent justify-center text-sm disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Save sample
        </button>
        {result?.error ? <div className="rounded-lg border border-red-300/35 bg-red-300/10 p-3 text-sm leading-6 text-red-100">{result.error}</div> : null}
        {result?.message ? <div className="rounded-lg border border-lead-300/35 bg-lead-300/10 p-3 text-sm leading-6 text-lead-100">{result.message}</div> : null}
      </div>
    </div>
  );
}

function SamplesTable({ data }: { data: AdminSamplesPageData }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <h2 className="text-2xl font-black text-white">Sample products</h2>
      <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead>
            <tr>
              {["Sample", "Listing", "Type", "Price", "Records", "Fields", "Status", "Preview"].map((header) => (
                <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.samples.length ? data.samples.map((sample) => (
              <tr key={sample.id}>
                <td className="border-t border-white/10 px-3 py-3 font-bold text-white">{sample.title}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{sample.listingTitle}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{readable(sample.sample_type)}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{dollars(sample.price)}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{sample.record_count}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{sample.field_groups.map(readable).join(", ")}</td>
                <td className="border-t border-white/10 px-3 py-3">
                  <Badge label={readable(sample.status)} tone={statusTone(sample.status)} />
                </td>
                <td className="border-t border-white/10 px-3 py-3">
                  <Link href={`/buyer/samples/${sample.id}`} className="inline-flex min-h-9 items-center justify-center rounded-md border border-cyan-300/30 px-2.5 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10">
                    Open
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No sample products loaded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestsTable({ data }: { data: AdminSamplesPageData }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <h2 className="text-2xl font-black text-white">Sample requests</h2>
      <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead>
            <tr>
              {["Buyer", "Sample", "Request", "Payment", "Amount", "Created", "Actions"].map((header) => (
                <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.requests.length ? data.requests.map((request) => <RequestRow key={request.id} request={request} />) : (
              <tr>
                <td colSpan={7} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No sample requests loaded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RequestRow({ request }: { request: AdminSamplesPageData["requests"][number] }) {
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(action: "approve" | "deny" | "revoke" | "extend") {
    setPendingAction(action);
    setResult(null);
    trackLeadFlowEvent("admin_sample_reviewed", {
      route: "/dashboard/samples",
      action,
      sample_request_id: request.id,
      status: request.request_status,
    });
    try {
      const response = await fetch("/api/leadflow/samples/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          requestId: request.id,
          adminNotes: `${action} from samples dashboard`,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Action failed.");
      setResult(`${action} saved`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <tr>
      <td className="border-t border-white/10 px-3 py-3">
        <p className="font-bold text-white">{request.buyerName}</p>
        <p className="mt-1 text-xs text-ink-400">{request.buyerCompany}</p>
      </td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{request.sampleTitle}</td>
      <td className="border-t border-white/10 px-3 py-3"><Badge label={readable(request.request_status)} tone={statusTone(request.request_status)} /></td>
      <td className="border-t border-white/10 px-3 py-3"><Badge label={readable(request.payment_status)} tone={statusTone(request.payment_status)} /></td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{dollars(request.amount)}</td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{formatDate(request.created_at)}</td>
      <td className="border-t border-white/10 px-3 py-3">
        <div className="flex flex-wrap gap-2">
          {(["approve", "deny", "extend", "revoke"] as const).map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => submit(action)}
              disabled={Boolean(pendingAction)}
              className={cn(
                "inline-flex min-h-9 items-center justify-center gap-1 rounded-md border px-2.5 text-xs font-bold disabled:opacity-50",
                action === "approve" || action === "extend"
                  ? "border-cyan-300/30 text-cyan-100 hover:bg-cyan-300/10"
                  : "border-red-300/30 text-red-100 hover:bg-red-300/10",
              )}
            >
              {pendingAction === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action === "approve" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {action}
            </button>
          ))}
        </div>
        {result ? <p className="mt-2 text-xs text-ink-300">{result}</p> : null}
      </td>
    </tr>
  );
}

function PaymentsTable({ data }: { data: AdminSamplesPageData }) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#060a11]/92 p-5 shadow-2xl shadow-black/25">
      <h2 className="text-2xl font-black text-white">Payments</h2>
      <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead>
            <tr>
              {["Payment", "Provider", "Amount", "Status", "Session", "Paid", "Created"].map((header) => (
                <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.payments.length ? data.payments.map((payment) => (
              <tr key={payment.id}>
                <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-200">{payment.id.slice(0, 8)}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{payment.payment_provider}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{dollars(payment.amount)}</td>
                <td className="border-t border-white/10 px-3 py-3"><Badge label={readable(payment.status)} tone={statusTone(payment.status)} /></td>
                <td className="border-t border-white/10 px-3 py-3 font-mono text-xs text-ink-400">{payment.payment_session_id?.slice(0, 16) || "manual"}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{formatDate(payment.paid_at)}</td>
                <td className="border-t border-white/10 px-3 py-3 text-ink-200">{formatDate(payment.created_at)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">No sample payments loaded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof CreditCard; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#060a11]/92 p-4 shadow-2xl shadow-black/25">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: string }) {
  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-extrabold capitalize", tone)}>{label}</span>;
}
