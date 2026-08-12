import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Code2, Zap } from "lucide-react";
import { TOOLS, TOOL_COUNT, CATEGORIES, CATEGORY_META } from "@/lib/tools";
import ToolGrid from "@/components/tools/ToolGrid";

export const metadata: Metadata = {
  title: `${TOOL_COUNT} Free Business Tools & Calculators | The LeadFlow Pro`,
  description: `${TOOL_COUNT} free calculators, generators and checkers for business owners. Missed call money, pricing, margins, QR codes, review links, schema and more. Use them free, embed them on your site free.`,
  alternates: { canonical: "https://www.theleadflowpro.com/tools" },
  openGraph: {
    title: `${TOOL_COUNT} free tools for business owners. Use them. Embed them. Keep them.`,
    description:
      "Calculators and generators that show you where the money is leaking, and hand you something you can use today. Free, no signup to use.",
    url: "https://www.theleadflowpro.com/tools",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/free-build.jpg", width: 1200, height: 630 }],
    type: "website",
  },
};

export default function ToolsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${TOOL_COUNT} Free Business Tools`,
    description: `${TOOL_COUNT} free calculators and generators for business owners.`,
    url: "https://www.theleadflowpro.com/tools",
    hasPart: TOOLS.slice(0, 40).map((t) => ({
      "@type": "WebApplication",
      name: t.name,
      description: t.tagline,
      url: `https://www.theleadflowpro.com/tools/${t.slug}`,
      applicationCategory: "BusinessApplication",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    })),
  };

  return (
    <main className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="page-hero page-hero-centered">
        <span className="eyebrow">
          <Zap aria-hidden="true" className="h-3.5 w-3.5" />
          {TOOL_COUNT} free tools
        </span>
        <h1>Free tools that show you where the money went.</h1>
        <p>
          {TOOL_COUNT} calculators, generators and checkers built for real
          business owners. No signup to use them. Give me your name, phone and
          email once and you can download every result and put any of these on
          your own website, free, forever.
        </p>
      </section>

      <section className="mx-auto w-[min(1120px,100%-40px)]">
        {/* the three promises */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: <Zap className="h-5 w-5" />, title: "Free to use", body: "Every tool runs right here. No account, no trial, no credit card." },
            { icon: <Download className="h-5 w-5" />, title: "Free to download", body: "Save your numbers, scripts, code and QR codes to your own files." },
            { icon: <Code2 className="h-5 w-5" />, title: "Free to embed", body: "Put any tool on your own website with one line. I host it. It stays free." },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-300">
                {p.icon}
              </span>
              <h2 className="mt-3 text-base font-black text-white">{p.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <ToolGrid />
        </div>

        {/* categories explainer */}
        <div className="mt-14 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-white">
            What is in the toolbox
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((c) => {
              const m = CATEGORY_META[c];
              const n = TOOLS.filter((t) => t.category === c).length;
              return (
                <div key={c} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg" aria-hidden="true">
                      {m.emoji}
                    </span>
                    <span className="text-sm font-black text-white">{c}</span>
                    <span className="ml-auto text-xs font-bold text-slate-500">{n}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{m.blurb}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* the offer */}
        <div className="mt-8 rounded-2xl border border-sky-400/30 bg-sky-500/[0.06] p-7 text-center sm:p-9">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Why is all this free?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-slate-300">
            Because this is a fraction of what a website should be doing for you.
            If a free calculator can show you where five figures a year is
            leaking, imagine what your actual site could do if it was built to
            run your business instead of just sit there. Use every one of these
            and never talk to me. That is fine. But when you are ready to stop
            renting your platform, you will know who to call.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/start" className="button-primary">
              Map My System
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <a href="sms:+19035008898" className="button-secondary">
              Text Me a Tool Idea
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            New tools drop every month. If your business wishes one of these
            existed, tell me and I might build it.
          </p>
        </div>
      </section>
    </main>
  );
}
