import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, CreditCard, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import { BuyerPortalShell } from "@/components/buyer/BuyerPortalShell";
import { getBuyerPortalData } from "@/lib/buyer-portal";
import { getBuyerSamplesPageData, type LeadFlowSampleRequest } from "@/lib/leadflow-samples";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buyer Samples | The LeadFlow Pro",
  description: "Paid and approved lead signal samples for buyer accounts.",
  robots: {
    index: false,
    follow: false,
  },
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function dollars(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value || 0);
  if (!amount) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

function statusTone(status: string) {
  if (/fulfilled|approved|paid/.test(status)) return "border-lead-300/35 bg-lead-300/12 text-lead-100";
  if (/denied|revoked|failed|expired/.test(status)) return "border-red-300/35 bg-red-300/12 text-red-100";
  return "border-accent-300/35 bg-accent-300/12 text-accent-100";
}

export default async function BuyerSamplesPage() {
  const [portalData, sampleData] = await Promise.all([getBuyerPortalData(), getBuyerSamplesPageData()]);

  return (
    <BuyerPortalShell
      data={portalData}
      active="/buyer/samples"
      title="Buyer samples"
      description="Review limited, source-backed samples before requesting full access. Sample access is scoped, audited, and never a raw data dump."
    >
      {sampleData.authenticated ? (
        <div className="grid gap-5">
          <section className="grid gap-4 md:grid-cols-3">
            <SampleStat icon={FileCheck2} label="Accessible samples" value={String(sampleData.accessibleSamples.length)} />
            <SampleStat icon={Clock3} label="Sample requests" value={String(sampleData.requests.length)} />
            <SampleStat icon={ShieldCheck} label="Restricted account" value={sampleData.restricted ? "Yes" : "No"} />
          </section>

          {sampleData.loadErrors.length ? (
            <div className="lead-shell border-accent-300/30 bg-accent-300/10 p-4 text-sm leading-6 text-accent-100">
              {sampleData.loadErrors[0]}
            </div>
          ) : null}

          <section className="lead-shell p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Approved samples</p>
                <h2 className="mt-2 text-2xl font-black text-white">Open sample access.</h2>
              </div>
              <Link href="/marketplace" className="btn-ghost justify-center text-sm">
                Browse marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {sampleData.accessibleSamples.length ? sampleData.accessibleSamples.map((sample) => (
                <article key={sample.id} className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{sample.listingTitle}</p>
                      <h3 className="mt-2 text-xl font-black text-white">{sample.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-300">{sample.description || "Approved sample access."}</p>
                    </div>
                    <span className={cn("rounded-md border px-2 py-1 text-xs font-extrabold uppercase tracking-wider", statusTone(sample.status))}>
                      {sample.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <Mini label="Price" value={dollars(sample.price)} />
                    <Mini label="Records" value={String(sample.record_count)} />
                    <Mini label="Expires" value={formatDate(sample.expires_at)} />
                  </div>
                  <Link href={`/buyer/samples/${sample.id}`} className="btn-accent mt-4 justify-center text-sm">
                    Open sample
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              )) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6 text-center lg:col-span-2">
                  <LockKeyhole className="mx-auto h-8 w-8 text-cyan-300" />
                  <h3 className="mt-4 text-2xl font-black text-white">No approved samples yet.</h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-300">
                    Request a free or paid sample from a marketplace listing. Access appears here after payment and review rules clear.
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="lead-shell p-5 md:p-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Sample request history</p>
              <h2 className="mt-2 text-2xl font-black text-white">Every sample request stays scoped.</h2>
            </div>
            <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead>
                  <tr>
                    {["Sample", "Listing", "Request", "Payment", "Amount", "Created", "Next"].map((header) => (
                      <th key={header} className="whitespace-nowrap bg-white/[0.035] px-3 py-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sampleData.requests.length ? sampleData.requests.map((request) => (
                    <RequestRow key={request.id} request={request} />
                  )) : (
                    <tr>
                      <td colSpan={7} className="border-t border-white/10 px-3 py-8 text-center text-sm text-ink-300">
                        No sample requests yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </BuyerPortalShell>
  );
}

function RequestRow({ request }: { request: LeadFlowSampleRequest & { sampleTitle: string; listingTitle: string } }) {
  const openable = request.sample_id && ["fulfilled", "approved"].includes(request.request_status) && ["paid", "not_required", "comped"].includes(request.payment_status);
  return (
    <tr>
      <td className="border-t border-white/10 px-3 py-3 font-bold text-white">{request.sampleTitle}</td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{request.listingTitle}</td>
      <td className="border-t border-white/10 px-3 py-3">
        <span className={cn("rounded-md border px-2 py-1 text-xs font-extrabold capitalize", statusTone(request.request_status))}>
          {request.request_status.replace(/_/g, " ")}
        </span>
      </td>
      <td className="border-t border-white/10 px-3 py-3">
        <span className={cn("rounded-md border px-2 py-1 text-xs font-extrabold capitalize", statusTone(request.payment_status))}>
          {request.payment_status.replace(/_/g, " ")}
        </span>
      </td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{dollars(request.amount)}</td>
      <td className="border-t border-white/10 px-3 py-3 text-ink-200">{formatDate(request.created_at)}</td>
      <td className="border-t border-white/10 px-3 py-3">
        {openable ? (
          <Link href={`/buyer/samples/${request.sample_id}`} className="inline-flex min-h-9 items-center justify-center rounded-md border border-cyan-300/30 px-2.5 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10">
            Open
          </Link>
        ) : (
          <span className="text-xs text-ink-500">Waiting</span>
        )}
      </td>
    </tr>
  );
}

function SampleStat({ icon: Icon, label, value }: { icon: typeof CreditCard; label: string; value: string }) {
  return (
    <div className="lead-shell p-4">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-ink-950 p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
