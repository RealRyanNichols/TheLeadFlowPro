import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, DatabaseZap, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import {
  ConfidenceLabel,
  LeadScoreBadge,
  SourceProofChip,
  SuppressionStatusBadge,
} from "@/components/leadflow-system";
import { getSampleLandingPageData } from "@/lib/leadflow-samples";
import { SampleRequestPanel } from "./SampleRequestPanel";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { listingId: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getSampleLandingPageData(params.listingId);
  return {
    title: `${data.listing.title} Sample | The LeadFlow Pro`,
    description: `Review a redacted, source-backed sample for ${data.listing.title} before requesting full access.`,
    robots: {
      index: false,
      follow: true,
    },
  };
}

function dollars(value: number) {
  if (value <= 0) return "Free redacted sample";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default async function MarketplaceSamplePage({ params }: PageProps) {
  const data = await getSampleLandingPageData(params.listingId);
  const item = data.previewItems[0];

  return (
    <main className="min-h-screen overflow-hidden bg-ink-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 10% 8%, rgba(35,184,255,0.22), transparent 32%), radial-gradient(circle at 86% 10%, rgba(255,186,61,0.15), transparent 30%), linear-gradient(135deg,#030711 0%,#080d18 55%,#101008 100%)",
        }}
      />

      <div className="relative">
        <header className="border-b border-white/10 bg-ink-950/78 backdrop-blur-xl">
          <div className="container flex min-h-16 items-center justify-between gap-3 py-3">
            <Link href="/" className="font-black text-white hover:text-cyan-300">
              The LeadFlow Pro
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/marketplace" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-ink-200 hover:bg-white/[0.04] hover:text-white">
                Marketplace
              </Link>
              <Link href="/buyer/samples" className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15">
                My samples
              </Link>
            </div>
          </div>
        </header>

        <section className="container py-8 md:py-12">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="lead-shell overflow-hidden">
              <div className="border-b border-white/10 p-5 md:p-7">
                <div className="flex flex-wrap gap-2">
                  <SourceProofChip label="Source proof attached" />
                  <SuppressionStatusBadge status="sample_available" />
                  <span className="inline-flex min-h-8 items-center rounded-lg border border-white/10 bg-white/[0.045] px-2.5 text-xs font-extrabold text-ink-200">
                    {dollars(Number(data.sample.price || 0))}
                  </span>
                </div>
                <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
                  Review the sample before buying the signal pack.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
                  This is a limited, reviewed preview. It shows source context, score, confidence, allowed use, and buyer fit without dumping private records or admin-only fields.
                </p>
                {data.loadErrors.length ? (
                  <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
                    {data.loadErrors[0]}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-3 md:p-7">
                <Metric label="Listing" value={data.listing.title} />
                <Metric label="Sample records" value={String(data.sample.record_count || data.listing.sampleRecordCount)} />
                <Metric label="Review mode" value={data.sample.requires_admin_approval ? "Admin reviewed" : "Instant after payment"} />
              </div>

              {item ? (
                <div className="border-t border-white/10 p-5 md:p-7">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">Redacted sample row</p>
                      <h2 className="mt-2 text-3xl font-black text-white">{item.title}</h2>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">{item.summary}</p>
                    </div>
                    <LeadScoreBadge score={item.score} />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <ConfidenceLabel level={item.confidence === "high" || item.confidence === "medium" || item.confidence === "low" ? item.confidence : "needs_review"} />
                    <SourceProofChip label={item.sourceProofStatus.replace(/_/g, " ")} />
                    <span className="inline-flex min-h-8 items-center rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-xs font-bold text-ink-200">
                      {item.redacted ? "Contact fields hidden" : "Approved contact sample"}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <InfoPanel title="Buyer use case" body={item.buyerUseCase} />
                    <InfoPanel title="Next action" body={item.recommendedNextAction} />
                    <InfoPanel title="Allowed use" body={item.allowedUse} />
                    <InfoPanel title="Restricted use" body={item.restrictedUse} />
                  </div>

                  <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.035] p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">Source proof links</p>
                    <div className="mt-3 grid gap-3">
                      {item.sourceProofLinks.map((proof) => (
                        <a key={`${proof.label}-${proof.href}`} href={proof.href} className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-3 text-sm leading-6 text-cyan-100 hover:bg-cyan-300/15">
                          <span className="block font-black text-white">{proof.label}</span>
                          <span className="mt-1 block text-xs text-cyan-100/85">{proof.description}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <SampleRequestPanel data={data} />
              <div className="lead-shell p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-cyan-300" />
                  <div>
                    <h2 className="text-xl font-black text-white">Sample rules</h2>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink-200">
                      <li>No suppressed profiles.</li>
                      <li>No high-risk or prohibited records.</li>
                      <li>No admin-only fields.</li>
                      <li>No raw questionnaire answers.</li>
                      <li>Contact fields stay hidden unless approved.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="lead-shell p-5">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-1 h-5 w-5 text-accent-300" />
                  <div>
                    <h2 className="text-xl font-black text-white">Want the full pack?</h2>
                    <p className="mt-2 text-sm leading-6 text-ink-200">
                      The sample helps prove source quality before a buyer asks for full access, exclusive review, or a custom signal build.
                    </p>
                    <Link href="/marketplace" className="btn-ghost mt-4 justify-center text-sm">
                      Browse other signals
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function InfoPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#050913]/90 p-4">
      <div className="flex items-center gap-2 text-cyan-200">
        <FileCheck2 className="h-4 w-4" />
        <p className="text-xs font-extrabold uppercase tracking-wider">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-ink-200">{body}</p>
    </div>
  );
}
