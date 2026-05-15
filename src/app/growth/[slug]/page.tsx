import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  MapPinned,
  MessageSquareText,
  Search,
  Target,
  Wrench,
} from "lucide-react";
import { OrganicAuditForm } from "@/components/site/OrganicAuditForm";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import {
  getOrganicLandingPage,
  ORGANIC_LANDING_PAGES,
} from "@/lib/organic-growth";
import { createSeoMetadata } from "@/lib/seo-metadata";

type PageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return ORGANIC_LANDING_PAGES.map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const page = getOrganicLandingPage(params.slug);
  if (!page) return {};

  return createSeoMetadata({
    title: page.metaTitle,
    description: page.description,
    path: `/growth/${page.slug}`,
    imageTitle: page.title,
    imageSubtitle: page.promise,
  });
}

export default function OrganicLandingPage({ params }: PageProps) {
  const page = getOrganicLandingPage(params.slug);
  if (!page) notFound();

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.metaTitle.replace(" | The LeadFlow Pro", ""),
    provider: {
      "@type": "Organization",
      name: "The LeadFlow Pro",
      url: "https://www.theleadflowpro.com",
    },
    areaServed: page.location,
    audience: page.audience,
    description: page.description,
  };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }} />
      <LightHeader activePath="/organic-growth" />

      <main>
        <section className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#eef9ff_44%,#fff7ed_100%)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-16">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-800">
                <MapPinned className="h-3.5 w-3.5" />
                {page.eyebrow}
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {page.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-700 sm:text-lg">
                {page.promise}
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <Stat label="Audience" value={page.industry} />
                <Stat label="Area" value={page.location} />
                <Stat label="Goal" value="Tracked lead path" />
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#audit-form"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-accent-500/20 hover:bg-accent-400"
                >
                  {page.primaryCta} <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={page.secondaryHref}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:border-cyan-400"
                >
                  {page.secondaryCta}
                </Link>
              </div>
            </div>

            <div id="audit-form">
              <OrganicAuditForm
                source={`growth-${page.slug}`}
                landingPage={`/growth/${page.slug}`}
                industry={page.industry}
                pain={page.pain}
                ctaLabel={page.primaryCta}
                compact
              />
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-16">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                The problem
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {page.pain}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                The fix is not just more traffic. The fix is making the business path visible:
                source, lead, status, response, proof, booking, and next move.
              </p>
            </div>
            <div className="grid gap-3">
              {page.symptoms.map((symptom) => (
                <div key={symptom} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <Search className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                  <p className="text-sm font-semibold leading-6 text-slate-800">{symptom}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                What Ryan builds
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                The deliverable has to make the next sales move obvious.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {page.fixes.map((fix) => (
                <div key={fix} className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
                  <Wrench className="h-5 w-5 text-cyan-200" />
                  <p className="mt-4 text-sm font-semibold leading-6 text-slate-100">{fix}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-16">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Assets that can ship
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                This becomes a usable system, not just advice.
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {page.assets.map((asset) => (
                  <div key={asset} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                    <p className="text-sm font-bold leading-6 text-slate-800">{asset}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-700">
                <Target className="h-4 w-4" />
                Cold outreach hook
              </div>
              <p className="mt-4 text-lg font-semibold leading-8 text-slate-950">
                "{page.outboundHook}"
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                This is what makes the page useful outside of Google. Ryan can send a specific,
                practical observation and point the owner to a page that matches the problem.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8 lg:py-16">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Search intent
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                This page targets the words a serious buyer would actually search.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                No keyword stuffing. Each phrase has to match a real business problem and lead to
                a useful next click.
              </p>
            </div>
            <div className="grid gap-3">
              {page.searchIntent.map((term) => (
                <div key={term} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <MessageSquareText className="h-5 w-5 text-cyan-700" />
                  <span className="text-sm font-bold text-slate-900">{term}</span>
                </div>
              ))}
              <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-5">
                <div className="flex items-center gap-2 text-sm font-bold text-cyan-900">
                  <ClipboardCheck className="h-5 w-5" />
                  Proof angle
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{page.proofAngle}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-black leading-5 text-slate-950">{value}</div>
    </div>
  );
}
