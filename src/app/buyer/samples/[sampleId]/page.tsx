import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  ConfidenceLabel,
  LeadScoreBadge,
  SourceProofChip,
  SuppressionStatusBadge,
} from "@/components/leadflow-system";
import { BuyerPortalShell } from "@/components/buyer/BuyerPortalShell";
import { getBuyerPortalData } from "@/lib/buyer-portal";
import { getBuyerSampleViewerData } from "@/lib/leadflow-samples";
import { SampleViewerActions } from "./SampleViewerActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { sampleId: string };
};

export const metadata: Metadata = {
  title: "Sample Viewer | The LeadFlow Pro",
  description: "Protected buyer sample viewer for approved lead signal samples.",
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

export default async function BuyerSampleViewerPage({ params }: PageProps) {
  const [portalData, viewer] = await Promise.all([
    getBuyerPortalData(),
    getBuyerSampleViewerData(params.sampleId),
  ]);

  return (
    <BuyerPortalShell
      data={portalData}
      active="/buyer/samples"
      title="Sample viewer"
      description="Approved sample access shows only reviewed, non-sensitive fields tied to your buyer account."
    >
      {viewer.authenticated ? (
        viewer.allowed && viewer.sample ? (
          <div className="grid gap-5">
            <section className="lead-shell p-5 md:p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <SuppressionStatusBadge status="sample_available" />
                    <SourceProofChip label="Reviewed sample" />
                    <span className="inline-flex min-h-8 items-center rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs font-extrabold text-ink-200">
                      Expires {formatDate(viewer.request?.expires_at)}
                    </span>
                  </div>
                  <h2 className="mt-5 text-4xl font-black leading-tight text-white md:text-6xl">{viewer.sample.title}</h2>
                  <p className="mt-4 max-w-4xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
                    {viewer.sample.description || "Limited proof-backed sample access."}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 p-4 text-sm leading-6 text-cyan-100">
                  <ShieldCheck className="mb-2 h-5 w-5" />
                  This sample is limited to your approved access. Do not use suppressed, outdated, or restricted data. Review allowed-use notes before outreach.
                </div>
              </div>
              <div className="mt-6">
                <SampleViewerActions sampleId={viewer.sample.id} listingId={viewer.listing?.slug || viewer.sample.listing_id} />
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="grid gap-4">
                {viewer.items.map((item) => (
                  <article key={item.id} className="lead-shell p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{item.category}</p>
                        <h3 className="mt-2 text-3xl font-black text-white">{item.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-ink-200">{item.summary}</p>
                      </div>
                      <LeadScoreBadge score={item.score} />
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <ConfidenceLabel level={item.confidence === "high" || item.confidence === "medium" || item.confidence === "low" ? item.confidence : "needs_review"} />
                      <SourceProofChip label={item.sourceProofStatus.replace(/_/g, " ")} />
                      <span className="inline-flex min-h-8 items-center rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs font-bold text-ink-200">
                        {item.redacted ? "Redacted sample" : "Approved contact fields"}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <Detail title="Buyer use case" body={item.buyerUseCase} />
                      <Detail title="Recommended next action" body={item.recommendedNextAction} />
                      <Detail title="Allowed use" body={item.allowedUse} />
                      <Detail title="Restricted use" body={item.restrictedUse} />
                    </div>

                    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Source proof</p>
                      <div className="mt-3 grid gap-3">
                        {item.sourceProofLinks.map((proof) => (
                          <a key={`${proof.label}-${proof.href}`} href={proof.href} className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-100 hover:bg-cyan-300/15">
                            <span className="block font-black text-white">{proof.label}</span>
                            <span className="mt-1 block text-xs text-cyan-100/85">{proof.description}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
                <div className="lead-shell p-5">
                  <BadgeCheck className="h-5 w-5 text-cyan-300" />
                  <h3 className="mt-3 text-xl font-black text-white">Fields included</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {viewer.sample.field_groups.map((group) => (
                      <span key={group} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-bold text-ink-200">
                        {group.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="lead-shell p-5">
                  <FileCheck2 className="h-5 w-5 text-cyan-300" />
                  <h3 className="mt-3 text-xl font-black text-white">Allowed use</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-200">{viewer.sample.allowed_use}</p>
                </div>
                <div className="lead-shell p-5">
                  <AlertTriangle className="h-5 w-5 text-accent-300" />
                  <h3 className="mt-3 text-xl font-black text-white">Restriction</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-200">{viewer.sample.restricted_use}</p>
                </div>
              </aside>
            </section>
          </div>
        ) : (
          <div className="lead-shell p-6 text-center">
            <LockKeyhole className="mx-auto h-8 w-8 text-cyan-300" />
            <h2 className="mt-4 text-3xl font-black text-white">Sample access is not approved.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink-300">
              {viewer.reason || "This sample is protected. Request access from the marketplace first."}
            </p>
            <Link href="/marketplace" className="btn-accent mx-auto mt-5 justify-center text-sm">
              Browse marketplace
            </Link>
          </div>
        )
      ) : null}
    </BuyerPortalShell>
  );
}

function Detail({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#050913]/90 p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-200">{body}</p>
    </div>
  );
}
