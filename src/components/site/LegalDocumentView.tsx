import Link from "next/link";
import { FileText, Mail, ShieldCheck } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { LEGAL_DOCUMENTS, LEGAL_EMAIL, LEGAL_LAST_UPDATED, type LegalDocument } from "@/lib/legal-documents";

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/legal" />
      <main>
        <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef9ff_48%,#fff7ed_100%)]">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="inline-flex items-center gap-2 rounded-md border border-cyan-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Plain-English legal
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              {document.h1}
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">{document.description}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Last updated: {LEGAL_LAST_UPDATED}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {LEGAL_DOCUMENTS.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    item.path === document.path
                      ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300"
                  }`}
                >
                  {item.h1}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="space-y-5">
            {document.sections.map((section) => (
              <article key={section.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-950">{section.title}</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-slate-700">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-cyan-200 bg-cyan-50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
              <Mail className="h-4 w-4" />
              Questions about this policy?
            </div>
            <a href={`mailto:${LEGAL_EMAIL}`} className="mt-2 inline-flex font-semibold text-cyan-800 hover:text-cyan-950">
              {LEGAL_EMAIL}
            </a>
          </div>
        </section>
      </main>
      <LightFooter />
    </div>
  );
}
