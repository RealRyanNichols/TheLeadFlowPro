import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  Download,
  Users,
  AlertTriangle,
  Target,
  Zap,
} from "lucide-react";
import { TOOLS, TOOL_COUNT, getTool, toolArt, relatedTools, CATEGORY_META } from "@/lib/tools";
import ToolEngine from "@/components/tools/ToolEngine";

export const revalidate = 3600;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  const url = `https://www.theleadflowpro.com/tools/${tool.slug}`;
  return {
    title: `${tool.name} — Free Tool | The LeadFlow Pro`,
    description: `${tool.description} Free to use, free to download, free to put on your own website.`,
    alternates: { canonical: url },
    openGraph: {
      title: `${tool.emoji} ${tool.name} — free for your business`,
      description: tool.tagline,
      url,
      siteName: "The LeadFlow Pro",
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const art = toolArt(tool);
  const meta = CATEGORY_META[tool.category];
  const related = relatedTools(tool, 4);
  const url = `https://www.theleadflowpro.com/tools/${tool.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: tool.name,
        description: tool.description,
        url,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: "The LeadFlow Pro", url: "https://www.theleadflowpro.com" },
      },
      {
        "@type": "HowTo",
        name: `How to use the ${tool.name}`,
        description: tool.payoff,
        step: tool.steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          text: s,
        })),
      },
      ...(tool.faqs?.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: tool.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <main className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* hero */}
      <section className="mx-auto w-[min(1000px,100%-40px)] pt-8">
        <Link
          href="/tools"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)] hover:text-[var(--heading)]"
        >
          <ArrowLeft className="h-4 w-4" />
          All {TOOL_COUNT} free tools
        </Link>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className="tool-hero-art"
            style={{ background: art.background, border: art.border }}
            aria-hidden="true"
          >
            {tool.emoji}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider"
                style={{ color: meta.text, background: `${meta.from}1f`, border: `1px solid ${meta.ring}` }}
              >
                {tool.category}
              </span>
              <span className="rounded-full border border-[var(--green-line)] bg-[var(--green-tint)] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[var(--green)]">
                100% Free
              </span>
              <span className="rounded-full border border-[var(--line-strong)] bg-[var(--fill-2)] px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-[var(--muted)]">
                No signup to use
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-tight text-[var(--heading)] sm:text-[42px]">
              {tool.name}
            </h1>
            <p className="mt-2 text-lg font-bold" style={{ color: meta.text }}>
              {tool.tagline}
            </p>
          </div>
        </div>

        <p className="mt-5 max-w-3xl text-[17px] leading-relaxed text-[var(--text)]">
          {tool.description}
        </p>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 text-[var(--green)]" />
            Runs in your browser
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 text-[var(--green)]" />
            Nothing to install
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 text-[var(--green)]" />
            Download your results
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-4 w-4 text-[var(--green)]" />
            Free to embed on your site
          </span>
        </div>
      </section>

      {/* the tool itself */}
      <section id="tool" className="mx-auto mt-9 w-[min(1000px,100%-40px)] scroll-mt-24">
        <ToolEngine slug={tool.slug} />
      </section>

      {/* what it is */}
      <section className="mx-auto mt-14 w-[min(1000px,100%-40px)]">
        <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
          What this tool actually does for your business
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] text-[var(--blue)]">
              <Users className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base font-black text-[var(--heading)]">Who it is for</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{tool.who}</p>
          </article>
          <article className="rounded-2xl border border-red-400/25 bg-red-500/[0.05] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/30 bg-[var(--danger-tint)] text-[var(--danger)]">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base font-black text-[var(--heading)]">The problem it points at</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{tool.problem}</p>
          </article>
          <article className="rounded-2xl border border-[var(--green-line)] bg-emerald-500/[0.05] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--green-line)] bg-[var(--green-tint)] text-[var(--green)]">
              <Target className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base font-black text-[var(--heading)]">What you walk away with</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{tool.payoff}</p>
          </article>
        </div>
      </section>

      {/* how to use it */}
      <section className="mx-auto mt-12 w-[min(1000px,100%-40px)]">
        <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            How to use it
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Takes about two minutes. Be honest with the numbers, the tool is not
            going to tell anybody.
          </p>
          <ol className="mt-6 space-y-4">
            {tool.steps.map((s, i) => (
              <li key={i} className="tool-step">
                <span className="tool-step-num">{i + 1}</span>
                <span className="pt-1 text-[15px] leading-relaxed text-[var(--text)]">{s}</span>
              </li>
            ))}
          </ol>
          <a href="#tool" className="button-primary mt-7">
            <Zap aria-hidden="true" className="h-4 w-4" />
            Run it now
          </a>
        </div>
      </section>

      {/* embed instructions */}
      <section className="mx-auto mt-12 w-[min(1000px,100%-40px)]">
        <div className="rounded-2xl border border-[var(--accent-line)] bg-sky-500/[0.06] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] text-[var(--blue)]">
              <Code2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[var(--heading)]">
                Put this tool on your own website
              </h2>
              <p className="text-sm font-bold text-[var(--blue)]">
                Free forever. I host it. You keep it.
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--text)]">
            This is a real lead magnet you can run on your own site tonight.
            Somebody lands on your page, plays with the numbers, sees what their
            problem costs, and now they are on your website instead of your
            competitor&apos;s. Costs you nothing, and I keep it working.
          </p>

          <ol className="mt-6 space-y-4">
            {[
              "Click Put this on my site above and tell me who you are. One time unlocks all " + TOOL_COUNT + " tools.",
              "Copy the one line of code you get.",
              "In your website editor, add an Embed, HTML, or Custom Code block on whatever page you want it.",
              "Paste the line in, save, and publish. That is it.",
              "Check it on your phone. Then send people to that page.",
            ].map((s, i) => (
              <li key={i} className="tool-step">
                <span className="tool-step-num">{i + 1}</span>
                <span className="pt-1 text-[15px] leading-relaxed text-[var(--text)]">{s}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-4">
              <h3 className="text-sm font-black text-[var(--heading)]">Works on</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                WordPress, Wix, Squarespace, Shopify, GoDaddy, Webflow, Duda,
                HubSpot, ClickFunnels, or plain HTML. Anywhere that takes an
                embed code.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-4">
              <h3 className="text-sm font-black text-[var(--heading)]">What it costs you</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                Nothing. No monthly fee, no expiring trial, no watermark you have
                to pay to remove. If you get stuck putting it in, text me at (903)
                500-8898 and I will help you do it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      {tool.faqs && tool.faqs.length > 0 && (
        <section className="mx-auto mt-12 w-[min(1000px,100%-40px)]">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            Questions people ask
          </h2>
          <div className="mt-5 space-y-3">
            {tool.faqs.map((f, i) => (
              <details
                key={i}
                className="group rounded-xl border border-[var(--line-strong)] bg-[var(--fill-2)] p-5"
              >
                <summary className="cursor-pointer list-none text-[15px] font-black text-[var(--heading)]">
                  {f.q}
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* related */}
      <section className="mx-auto mt-14 w-[min(1000px,100%-40px)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            While you are here
          </h2>
          <Link href="/tools" className="text-sm font-bold text-[var(--blue)] hover:text-[var(--heading)]">
            See all {TOOL_COUNT} tools →
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((r) => {
            const rArt = toolArt(r);
            return (
              <Link
                key={r.slug}
                href={`/tools/${r.slug}`}
                className="group flex flex-col rounded-xl border p-4 transition hover:-translate-y-0.5"
                style={{ background: rArt.background, border: rArt.border }}
              >
                <span className="text-3xl" aria-hidden="true">
                  {r.emoji}
                </span>
                <h3 className="mt-2.5 text-sm font-black leading-tight text-[var(--heading)]">{r.name}</h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-[var(--muted)]">{r.tagline}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-[var(--heading)]">
                  Use it now
                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* closing CTA */}
      <section className="mx-auto mt-14 w-[min(1000px,100%-40px)]">
        <div className="rounded-2xl border border-[var(--line-strong)] bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-7 text-center sm:p-10">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            This is one free tool. Imagine your whole website working like this.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-[var(--text)]">
            Most business websites are a brochure that sits there. Yours could be
            catching leads at 9pm, texting people back in five minutes, booking
            jobs, and telling you which ad actually worked. And you would own it,
            instead of renting it for the rest of your life.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/start" className="button-primary">
              Map My System
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/tools" className="button-secondary">
              <Download aria-hidden="true" className="h-4 w-4" />
              Browse all {TOOL_COUNT} free tools
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
