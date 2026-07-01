import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Clock3, LockKeyhole, MapPin, ShieldCheck, UsersRound } from "lucide-react";
import { ConfidenceLabel, LeadScoreBadge, SourceProofChip } from "@/components/leadflow-system";
import { accessModelLabel, getExclusiveLandingPageData } from "@/lib/leadflow-exclusive";
import { ExclusiveRequestPanel } from "./ExclusiveRequestPanel";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { listingId: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getExclusiveLandingPageData(params.listingId);
  return {
    title: `${data.listing.title} Exclusive Access | The LeadFlow Pro`,
    description: `Request reviewed exclusive access for ${data.listing.title}. Exclusive signal products are manually approved by use case, territory, source rights, and compliance status.`,
    robots: {
      index: false,
      follow: true,
    },
  };
}

function formatWindow(start: string | null, end: string | null) {
  if (!start && !end) return "Admin reviewed";
  const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
  const startLabel = start ? formatter.format(new Date(start)) : "Now";
  const endLabel = end ? formatter.format(new Date(end)) : "Open";
  return `${startLabel} to ${endLabel}`;
}

export default async function MarketplaceExclusivePage({ params }: PageProps) {
  const data = await getExclusiveLandingPageData(params.listingId);

  return (
    <main className="min-h-screen overflow-hidden bg-ink-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at 10% 8%, rgba(35,184,255,0.20), transparent 31%), radial-gradient(circle at 88% 10%, rgba(255,186,61,0.16), transparent 29%), linear-gradient(135deg,#030711 0%,#080d18 55%,#101008 100%)",
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
              <Link href="/buyer/requests" className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15">
                My requests
              </Link>
            </div>
          </div>
        </header>

        <section className="container py-8 md:py-12">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="lead-shell overflow-hidden">
              <div className="border-b border-white/10 p-5 md:p-7">
                <div className="flex flex-wrap gap-2">
                  <SourceProofChip label="Review gated" />
                  <span className="inline-flex min-h-8 items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2.5 text-xs font-extrabold text-cyan-100">
                    {data.availability.label}
                  </span>
                  <span className="inline-flex min-h-8 items-center rounded-lg border border-white/10 bg-white/[0.045] px-2.5 text-xs font-extrabold capitalize text-ink-200">
                    {data.listing.status.replace(/_/g, " ")}
                  </span>
                </div>
                <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
                  Request exclusive access to this signal product.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-ink-200 md:text-base md:leading-7">
                  This listing may be available as an exclusive signal product. Exclusive access is reviewed manually and depends on category, geography, intended use, source rights, and compliance status.
                </p>
                {data.loadErrors.length ? (
                  <div className="mt-5 rounded-lg border border-accent-300/30 bg-accent-300/10 p-3 text-sm leading-6 text-accent-100">
                    {data.loadErrors[0]}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:p-7">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{data.listing.category}</p>
                  <h2 className="mt-2 text-3xl font-black text-white">{data.listing.title}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-200">{data.listing.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <ConfidenceLabel level={data.listing.confidence === "high" || data.listing.confidence === "medium" || data.listing.confidence === "low" ? data.listing.confidence : "needs_review"} />
                    <SourceProofChip label={data.listing.complianceStatus.replace(/_/g, " ")} />
                  </div>
                </div>
                <LeadScoreBadge score={data.listing.score} />
              </div>

              <div className="grid gap-4 border-t border-white/10 p-5 md:grid-cols-2 md:p-7 xl:grid-cols-4">
                <Metric icon={BadgeCheck} label="Access model" value={accessModelLabel(data.listing.accessModel)} />
                <Metric icon={UsersRound} label="Current buyers" value={`${data.listing.currentBuyerCount}${data.listing.maxBuyers ? ` / ${data.listing.maxBuyers}` : ""}`} />
                <Metric icon={MapPin} label="Territory" value={data.listing.territory || "Requested by buyer"} />
                <Metric icon={Clock3} label="Window" value={formatWindow(data.listing.exclusiveStartsAt, data.listing.exclusiveEndsAt)} />
              </div>

              <div className="border-t border-white/10 p-5 md:p-7">
                <div className="grid gap-4 lg:grid-cols-2">
                  <InfoPanel title="Buyer use case" body={data.listing.buyerUseCase} />
                  <InfoPanel title="Availability rule" body={data.availability.reason} />
                  <InfoPanel title="Exclusive review note" body={data.listing.exclusivityNotes || "Admin review checks category, geography, intended use, source rights, suppression status, and whether the listing can be blocked for one buyer."} />
                  <InfoPanel title="Admin impact" body="Granting exclusive access will block other buyers from this listing during the active exclusivity window." />
                </div>
              </div>
            </div>

            <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
              <ExclusiveRequestPanel data={data} />
              <div className="lead-shell p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-cyan-300" />
                  <div>
                    <h2 className="text-xl font-black text-white">Exclusive rules</h2>
                    <ul className="mt-3 grid gap-2 text-sm leading-6 text-ink-200">
                      <li>Suppressed profiles are never included.</li>
                      <li>High-risk records require admin confirmation.</li>
                      <li>Limited seats cannot oversell once full.</li>
                      <li>Sold exclusive listings block new access while active.</li>
                      <li>Expired windows can return to available only after admin review.</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="lead-shell p-5">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-1 h-5 w-5 text-accent-300" />
                  <div>
                    <h2 className="text-xl font-black text-white">Need proof first?</h2>
                    <p className="mt-2 text-sm leading-6 text-ink-200">
                      Start with the redacted paid sample if you need to verify source quality before exclusive review.
                    </p>
                    <Link href={`/marketplace/${data.listing.slug}/sample`} className="btn-ghost mt-4 justify-center text-sm">
                      Get sample
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

function Metric({ icon: Icon, label, value }: { icon: typeof BadgeCheck; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <Icon className="h-4 w-4 text-cyan-300" />
      <p className="mt-3 text-xs font-extrabold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-2 text-sm font-black leading-5 text-white">{value}</p>
    </div>
  );
}

function InfoPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#050913]/90 p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-cyan-300">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink-200">{body}</p>
    </div>
  );
}
