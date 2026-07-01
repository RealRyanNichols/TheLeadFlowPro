import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { LeadRepPackageCard } from "@/components/leadrep/LeadRepPackageCard";
import { LeadSourceClarityTool } from "@/components/leadrep/LeadSourceClarityTool";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "LeadSource Clarity Report | The LeadFlow Pro",
  description:
    "Check whether a paid lead source has enough tracking, source clarity, and risk signals before you scale spend or buy more leads.",
  path: "/tools/leadsource-clarity",
  imageTitle: "LeadSource Clarity Report",
  imageSubtitle: "Source clarity score, fraud-risk flags, and next action for paid lead sources.",
});

export default function LeadSourceClarityPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/tools/leadsource-clarity" />
      <main>
        <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#eef9ff_0%,#ffffff_48%,#fff8f1_100%)]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <Link href="/action-menu" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-800 hover:text-cyan-950">
              <ArrowLeft className="h-4 w-4" /> Back to tools
            </Link>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Package 1</p>
                <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
                  Find out if the lead source is clear enough to keep spending.
                </h1>
                <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-slate-700">
                  LeadSource Clarity turns a campaign URL, spend range, lead volume, and problem statement
                  into a preview score, source-risk flags, and the next action before more budget gets burned.
                </p>
              </div>
              <LeadRepPackageCard
                eyebrow="Sellable MVP"
                title="LeadSource Clarity"
                body="A fast source-trail readout for businesses buying leads or running paid campaigns."
                price="$79"
                recurring="Source Guardian $149/mo"
                href="#tool"
                cta="Run Preview"
                bullets={["Source clarity score", "Fraud-risk flags", "Geo and response placeholders", "Predictive analytics handoff"]}
              />
            </div>
          </div>
        </section>
        <section id="tool" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <LeadSourceClarityTool />
        </section>
      </main>
      <LightFooter />
    </div>
  );
}
