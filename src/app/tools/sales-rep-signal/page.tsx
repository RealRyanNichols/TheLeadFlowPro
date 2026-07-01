import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { LeadRepPackageCard } from "@/components/leadrep/LeadRepPackageCard";
import { SalesRepSignalWaitlist } from "@/components/leadrep/SalesRepSignalWaitlist";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Sales Rep Signal Profile Pilot | The LeadFlow Pro",
  description:
    "Join the opt-in Sales Rep Signal Profile pilot. Self-submitted profile review only; not a background check or employment decision tool.",
  path: "/tools/sales-rep-signal",
  imageTitle: "Sales Rep Signal Profile",
  imageSubtitle: "Opt-in pilot for self-submitted sales profiles. Not an employment decision tool.",
});

export default function SalesRepSignalPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/tools/sales-rep-signal" />
      <main>
        <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#fff8f1_0%,#ffffff_48%,#eef9ff_100%)]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <Link href="/action-menu" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-800 hover:text-cyan-950">
              <ArrowLeft className="h-4 w-4" /> Back to tools
            </Link>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Package 3 waitlist</p>
                <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
                  Sales Rep Signal Profile is opt-in only.
                </h1>
                <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-slate-700">
                  This pilot collects self-submitted profile links for sales-signal review. It does not score
                  employment eligibility, does not check backgrounds, and does not produce consumer reports.
                </p>
              </div>
              <LeadRepPackageCard
                eyebrow="Waitlist only"
                title="Sales Rep Signal Profile"
                body="Opt-in pilot for sales profile signal, positioning, proof, and readiness notes."
                price="Pilot waitlist"
                href="#pilot"
                cta="Join Pilot"
                bullets={["Self-submitted profile URL", "Consent required", "No report sale yet", "No employment decision use"]}
              />
            </div>
          </div>
        </section>
        <section id="pilot" className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Compliance line</p>
            <h2 className="mt-2 text-2xl font-black text-amber-950">Not for employment decisions.</h2>
            <p className="mt-3 text-sm font-bold leading-6 text-amber-950">
              Do not use this for hiring eligibility, background checks, employment screening, residential-history checks,
              employment-gap scoring, tenant screening, credit, insurance, or any consumer-report purpose.
            </p>
          </div>
          <SalesRepSignalWaitlist source="theleadflowpro" />
        </section>
      </main>
      <LightFooter />
    </div>
  );
}
