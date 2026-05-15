import Link from "next/link";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { LEGAL_DOCUMENTS, LEGAL_EMAIL, LEGAL_LAST_UPDATED } from "@/lib/legal-documents";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Legal Overview | The LeadFlow Pro",
  description:
    "Legal overview for The LeadFlow Pro, including privacy policy, terms of service, refunds, custom build ownership, handoff, and no outcome guarantees.",
  path: "/legal",
  imageTitle: "Legal Overview",
  imageSubtitle: "Privacy, terms, refunds, ownership, handoff, and responsible use.",
});

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/legal" />
      <main>
        <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef9ff_48%,#fff7ed_100%)]">
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Legal overview
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Plain rules for audits, builds, handoff, data, and refunds.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
              The short version: no fake outcome promises, no hidden hostage hosting,
              client-owned accounts by default, and practical policies written for real buyers.
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Last updated: {LEGAL_LAST_UPDATED}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-4 md:grid-cols-3">
            {LEGAL_DOCUMENTS.map((document) => (
              <Link
                key={document.path}
                href={document.path}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
              >
                <FileText className="h-6 w-6 text-cyan-700" />
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{document.h1}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{document.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 group-hover:text-cyan-950">
                  Open policy <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-cyan-200 bg-cyan-50 p-5">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Core operating terms</h2>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-700 md:grid-cols-2">
              <p>No guaranteed followers, leads, sales, ROAS, CPL, revenue, rankings, or ad approval.</p>
              <p>Custom builds are built in or transferred to client-owned accounts unless separately agreed.</p>
              <p>Optional managed hosting or maintenance can be chosen separately. It is not the default hostage model.</p>
              <p>Questions go to {LEGAL_EMAIL}.</p>
            </div>
          </div>
        </section>
      </main>
      <LightFooter />
    </div>
  );
}
