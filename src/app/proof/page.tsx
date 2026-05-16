import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  LayoutDashboard,
  MousePointerClick,
} from "lucide-react";
import { OrganicAuditForm } from "@/components/site/OrganicAuditForm";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { BuiltProjectCard } from "@/components/site/BuiltProjectCard";
import { BUILT_PROJECTS } from "@/lib/built-projects";
import { PROOF_ASSETS } from "@/lib/organic-growth";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Proof and Receipts - The LeadFlow Pro",
  description:
    "Proof assets for The LeadFlow Pro: business page work, Pulse tracking, ad autopsy, intake routing, dashboards, and conversion systems.",
  path: "/proof",
  imageTitle: "LeadFlow Pro Proof",
  imageSubtitle: "What has been built, what it proves, and what Ryan can build next.",
});

const RECEIPTS = [
  {
    title: "The site tracks its own movement",
    body: "LeadFlow Pro has public Pulse pages and Ryan-only Pulse control for paths, clicks, sources, shares, engagement, and next experiments.",
    Icon: BarChart3,
  },
  {
    title: "The tools expose the problem",
    body: "The SEO grader and ad autopsy give cold visitors a reason to run their own numbers before a sales call.",
    Icon: ClipboardCheck,
  },
  {
    title: "The intake routes buyers",
    body: "The site does not have to dump everyone into a price maze. Audit and intake submissions carry source, page, and business context.",
    Icon: MousePointerClick,
  },
  {
    title: "The backend gives Ryan visibility",
    body: "Submitted requests land in the admin queue so follow-up can be worked like a sales pipeline instead of a scattered inbox.",
    Icon: LayoutDashboard,
  },
];

const CASE_FORMAT = [
  "What was leaking",
  "What changed",
  "What the buyer sees now",
  "What the owner can track now",
  "What still needs to be tested",
];

export default function ProofPage() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <LightHeader activePath="/proof" />

      <main>
        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-16">
            <div className="flex flex-col justify-center">
              <div className="inline-flex w-fit items-center gap-2 rounded-md border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-100">
                <Eye className="h-3.5 w-3.5" />
                Proof before pitch
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Cold buyers need receipts before they believe another growth promise.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                This page is built to hold the proof stack: visual work, tracking, tools, intake,
                dashboards, before/after examples, and the exact system Ryan installs for a business.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/lead-leak-audit"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-accent-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-accent-400"
                >
                  Run my audit <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pulse"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold text-white hover:bg-white/15"
                >
                  Open live Pulse
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/30">
              <div className="relative aspect-[16/10]">
                <Image
                  src="/images/premier-dental-academy-makeover-poster.jpg"
                  alt="Example business makeover work connected to The LeadFlow Pro"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="border-t border-white/10 p-5">
                <div className="text-xs font-semibold uppercase tracking-widest text-cyan-100">
                  Example proof asset
                </div>
                <h2 className="mt-2 text-xl font-bold text-white">Business page and offer presentation work</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Visual proof should not sit hidden behind a hero image. It should become a
                  shareable case-style asset with what changed and why it matters.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Built, coded, deployed
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Three live projects. Three different proof angles.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                This is the real advantage: Ryan is not selling theory. These are live builds that
                show funnel work, data organization, vertical positioning, and client-ready web
                systems.
              </p>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {BUILT_PROJECTS.map((project) => (
                <BuiltProjectCard
                  key={project.name}
                  project={project}
                  variant="light"
                  density="full"
                  showProof
                  showAngle
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Current proof stack
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                The site already has assets worth turning into organic content.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {PROOF_ASSETS.map((asset) => (
                <div key={asset.label} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <CheckCircle2 className="h-5 w-5 text-cyan-700" />
                  <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-cyan-700">
                    {asset.label}
                  </div>
                  <h3 className="mt-2 text-lg font-bold text-slate-950">{asset.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{asset.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-16">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Case-study format
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Every proof page should answer the same five questions.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                This keeps proof strong without making reckless claims. It also gives Google,
                social, referrals, and cold outreach a consistent story.
              </p>
            </div>
            <div className="grid gap-3">
              {CASE_FORMAT.map((item, index) => (
                <div key={item} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-cyan-200">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-950">{item}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Say it plainly, show the relevant screen or result, and avoid claiming more
                      than the evidence supports.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-16">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                Why this matters for conversion
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Proof is the bridge between cold traffic and a submitted lead.
              </h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {RECEIPTS.map((receipt) => (
                  <div key={receipt.title} className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <receipt.Icon className="h-5 w-5 text-cyan-700" />
                    <h3 className="mt-4 text-lg font-bold text-slate-950">{receipt.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{receipt.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <OrganicAuditForm
              source="proof-page"
              landingPage="/proof"
              industry="Local business"
              compact
              ctaLabel="Audit my lead path"
            />
          </div>
        </section>
      </main>

      <LightFooter />
    </div>
  );
}
