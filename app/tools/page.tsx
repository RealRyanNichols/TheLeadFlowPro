import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Free Tools for Business Owners | The LeadFlow Pro",
  description:
    "Free calculators and tools built for real business owners. Use them here, or embed any of them on your own website free. No catch.",
  alternates: { canonical: "https://www.theleadflowpro.com/tools" },
  openGraph: {
    title: "Free tools for business owners. Use them. Embed them. Keep them.",
    description:
      "Calculators and tools your business can use today, free — on our site or embedded on yours.",
    url: "https://www.theleadflowpro.com/tools",
    siteName: "The LeadFlow Pro",
    images: [{ url: "/og/free-build.jpg", width: 1200, height: 630 }],
    type: "website",
  },
};

export default function ToolsPage() {
  return (
    <main className="pb-24">
      <section className="page-hero page-hero-centered" style={{ padding: "44px 0 20px" }}>
        <span className="eyebrow">Free tools</span>
        <h1>Free tools your business can use today.</h1>
        <p>
          Use them right here, no signup. Like one? Put it on your own website free —
          we host it, you keep it. This is what your website could be doing for you
          every day.
        </p>
      </section>

      <section className="mx-auto mt-8 w-[min(1060px,100%-40px)]">
        <div className="grid gap-4 md:grid-cols-3">
          {TOOLS.map((t) => (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-sky-400/50"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                  Free
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {t.category}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-black text-white">{t.name}</h2>
              <p className="mt-1 text-sm font-bold text-sky-300">{t.tagline}</p>
              <p className="mt-2 flex-1 text-sm text-slate-400">{t.description}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-white">
                Use it now
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-sky-400/30 bg-sky-500/[0.06] p-7 text-center">
          <Gift className="mx-auto h-7 w-7 text-sky-300" />
          <h2 className="mt-3 text-2xl font-black text-white">
            More free tools drop every month.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">
            Every tool here can live on your website free. If there is a tool your
            business wishes existed, tell me and I might just build it.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href="sms:+19035008898" className="button-secondary">
              Text Me a Tool Idea
            </a>
            <Link href="/free-build" className="button-primary">
              I Also Build Whole Websites Free First
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
