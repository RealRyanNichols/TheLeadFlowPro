import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Building2, Gauge, ShieldCheck, Sparkles } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { leadFlowIndustryPages } from "@/lib/leadflow-industries";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata: Metadata = createSeoMetadata({
  title: "LeadFlow Industry Lead Signals | The LeadFlow Pro",
  description:
    "Industry pages for source-backed leads, buyer intent, lead scoring, business automation, AI receptionist paths, and lead marketplace products.",
  path: "/industries",
  imageTitle: "LeadFlow Industry Signals",
  imageSubtitle: "Source-backed leads, tools, scoring, and build paths by vertical.",
});

export default function IndustriesPage() {
  return (
    <>
      <Header />
      <main className="pb-24">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_18%_10%,rgba(35,184,255,0.16),transparent_32%),linear-gradient(135deg,#030711,#090d18_55%,#111008)] py-14 md:py-20">
          <div className="container">
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-cyan-200">
              <Sparkles className="h-4 w-4" />
              SEO traffic expansion
            </p>
            <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[0.96] text-white md:text-7xl">
              Lead signals by industry.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-ink-100 md:text-xl">
              Each vertical page points buyers to source-backed leads, public tools,
              marketplace samples, compliance boundaries, and the build-my-system path
              for businesses that need the whole lead flow machine.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/marketplace" className="btn-accent text-base">
                Open marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/tools" className="btn-ghost text-base">
                Open tools
              </Link>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-20">
          <div className="container">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {leadFlowIndustryPages.map((page) => (
                <Link key={page.slug} href={`/industries/${page.slug}`} className="lead-shell group p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-ink-500 transition group-hover:translate-x-1 group-hover:text-accent-300" />
                  </div>
                  <p className="mt-5 text-xs font-extrabold uppercase tracking-wider text-accent-300">
                    {page.eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-white">{page.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-ink-200">{page.metaDescription}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-lead-300/25 bg-lead-300/10 px-2.5 py-1.5 text-xs font-extrabold text-lead-100">
                      <Gauge className="h-3.5 w-3.5" />
                      Score {page.sampleProfile.score}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1.5 text-xs font-extrabold text-cyan-100">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Review-gated
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
