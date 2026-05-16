// src/app/tools/page.tsx - The tools hub.
//
// Card grid in the warm-glass aesthetic matching /services. Each card has a
// thumb, name, outcome, and two CTAs ("Try the demo" + "Get it for my
// business"). No login required. Same data as the homepage tiles so the two
// surfaces never drift apart.

import Link from "next/link";
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";
import { LightFooter, LightHeader } from "@/components/site/LightHeader";
import { TOOL_LIST, formatToolPrice, toolHubHref, type Tool } from "@/lib/tools";
import { createSeoMetadata } from "@/lib/seo-metadata";

export const metadata = createSeoMetadata({
  title: "Tools | Interactive Demos · The LeadFlow Pro",
  description:
    "Play with the actual tools before you buy. Instant-quote calculator, missed-call rescue text-back, lead-magnet quiz, owner dashboard, SEO grader, leaderboard, voice engine, and live pulse.",
  path: "/tools",
  imageTitle: "Tools",
  imageSubtitle: "Touch the tool before you buy it.",
});

const DEMO_LABEL: Record<Tool["demoType"], string> = {
  sandbox: "Sandbox demo",
  preview: "Preview only",
  "try-it": "Try it now",
};

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <LightHeader activePath="/tools" />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #fff8f1 0%, #f6f9ff 38%, #eef9ff 70%, #f3eaff 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(35,184,255,0.55) 0%, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-32 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,154,31,0.45) 0%, transparent 65%)" }}
        />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-700 shadow-sm backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5" /> 8 tools · no login · play before you buy
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight leading-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Tools you can{" "}
              <span className="bg-gradient-to-r from-brand-700 via-cyan-500 to-accent-500 bg-clip-text text-transparent">
                touch first.
              </span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-700">
              Every card below has a working demo. Play with the tool. If it fits, the
              "Get it for my business" button wires the real version to your stack.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {TOOL_LIST.map((tool) => (
              <ToolCard key={tool.slug} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-slate-200 bg-white">
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-accent-300 bg-accent-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-950">
                <Sparkles className="h-3.5 w-3.5" /> Why we built it this way
              </div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Demos are sandboxed. The version you buy hits your stack, your data, your buyers.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Anti title="Demo data is fake or one-cycle scoped." body="No demo touches your real CRM, your real Stripe, or your real Google Business Profile." />
              <Anti title="SMS demos use a sample script." body="One send per phone per 24 hours. Never your actual after-hours number or template." />
              <Anti title="Owner dashboard demo is hard-walled." body="It can't show your real Quo / Stripe / GBP data even if a session cookie is present." />
              <Anti title="Every tool has one clear next move." body="Below the fold on each tool page: 'Get this for my business →' to the Stripe payment link." />
            </div>
          </div>
        </div>
      </section>

      <LightFooter />
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const href = toolHubHref(tool);
  const setupLabel = formatToolPrice(tool.setupPriceCents, "setup");
  const monthlyLabel = formatToolPrice(tool.monthlyPriceCents, "monthly");

  return (
    <div className="group flex flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_30px_70px_-30px_rgba(15,23,42,0.45)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={tool.proofImageUrl}
          alt={`${tool.name} proof image`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-slate-950/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-200 backdrop-blur">
          {DEMO_LABEL[tool.demoType]}
        </div>
        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-700 shadow-sm">
          {setupLabel} · {monthlyLabel}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold leading-snug text-slate-950">{tool.name}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{tool.oneLineOutcome}</p>

        <div className="mt-auto pt-5 grid gap-2">
          <Link
            href={href}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
          >
            Try the demo <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={tool.setupStripeLink}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 hover:border-cyan-400 hover:bg-cyan-50"
          >
            Get it for my business <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Anti({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-bold text-slate-950">{title}</div>
      <p className="mt-1 text-xs leading-5 text-slate-600">{body}</p>
    </div>
  );
}
