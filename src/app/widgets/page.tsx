import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Code2, Route, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { LEADFLOW_WIDGET_CATALOG } from "@/lib/leadflow-widget-definitions";

export const metadata: Metadata = {
  title: "LeadFlow Widgets | The LeadFlow Pro",
  description: "Add LeadFlow tools to your website. Collect better questions, score better leads, and route serious people faster.",
};

const benefits = [
  { icon: SlidersHorizontal, label: "Capture first-party data", copy: "Ask useful questions tied to real buyer intent, not generic contact forms." },
  { icon: BarChart3, label: "Score better leads", copy: "Turn answers into scores, tags, confidence, and a recommended next action." },
  { icon: Route, label: "Route serious people faster", copy: "Send qualified visitors into review, sales, CRM, or a clear next step." },
  { icon: ShieldCheck, label: "Keep consent visible", copy: "Contact, sharing, routing, and selling permissions are separate and auditable." },
];

export default function WidgetsPage() {
  const featured = LEADFLOW_WIDGET_CATALOG.slice(0, 10);
  return (
    <main className="min-h-screen bg-[#05070d] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(35,184,255,0.18),transparent_28%),radial-gradient(circle_at_84%_10%,rgba(255,186,61,0.16),transparent_24%),linear-gradient(135deg,#07101b,#05070d_62%,#0a1115)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-100">
              <Code2 className="h-4 w-4" />
              Embeddable signal tools
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.94] tracking-tight md:text-7xl">
              Add LeadFlow tools to your website.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-ink-200">
              Collect better questions. Score better leads. Route serious people faster. Widgets turn a plain visit into a reviewed, consent-aware signal profile.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard/widgets" className="btn-accent">
                Build a widget <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/widgets/lead-leak-audit/embed" className="btn-ghost">
                Preview Lead Leak Audit
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-xs font-extrabold uppercase tracking-wider text-ink-200">
              {["No hidden consent", "No minors", "No protected-trait targeting", "No raw data in analytics"].map((item) => (
                <span key={item} className="rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2">{item}</span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#060a11]/90 p-4 shadow-2xl shadow-cyan-950/20">
            <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-cyan-100">Embed example</p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-black/45 p-4 text-xs leading-6 text-cyan-50">
{`<script src="https://www.theleadflowpro.com/api/widget-script/lead-leak-audit.js"></script>
<div id="leadflow-widget-lead-leak-audit"></div>`}
              </pre>
            </div>
            <div className="mt-4 grid gap-3">
              {["Loads inside an iframe", "Checks allowed domains", "Saves consent version", "Writes responses, answers, events, and review profile"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-3 text-sm font-bold text-ink-100">
                  <span className="h-2.5 w-2.5 rounded-full bg-lead-300 shadow-[0_0_18px_rgba(166,227,107,0.85)]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {benefits.map((benefit) => (
            <article key={benefit.label} className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
              <benefit.icon className="h-5 w-5 text-cyan-200" />
              <h2 className="mt-4 text-lg font-black text-white">{benefit.label}</h2>
              <p className="mt-2 text-sm leading-6 text-ink-300">{benefit.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-accent-200">Widget catalog</p>
            <h2 className="mt-2 text-3xl font-black text-white md:text-5xl">Tools people actually use.</h2>
          </div>
          <Link href="/tools" className="text-sm font-black text-cyan-200 hover:text-cyan-100">
            See public tools <ArrowRight className="ml-1 inline h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((tool) => (
            <article key={tool.slug} className="group rounded-xl border border-white/10 bg-[#060a11]/95 p-5 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-cyan-300/35">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-cyan-200">{tool.label}</p>
                  <h3 className="mt-2 text-xl font-black text-white">{tool.name}</h3>
                </div>
                <span className="rounded-lg border border-white/10 bg-white/[0.045] px-2 py-1 text-xs font-bold text-ink-300">{tool.estimatedTime}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-300">{tool.shortDescription}</p>
              <dl className="mt-4 grid gap-3 text-sm">
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <dt className="text-xs font-black uppercase tracking-wider text-ink-500">For</dt>
                  <dd className="mt-1 text-ink-100">{tool.targetUser}</dd>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <dt className="text-xs font-black uppercase tracking-wider text-ink-500">Answer</dt>
                  <dd className="mt-1 text-ink-100">{tool.resultPromise}</dd>
                </div>
              </dl>
              <Link href={`/widgets/${tool.slug}/embed`} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50 transition group-hover:bg-cyan-300/15">
                Preview widget <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
