import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Users, AlertTriangle, Target, Zap, Code2,
} from "lucide-react";
import {
  TOOLS, TOOL_COUNT, getTool, relatedTools, toolIndex,
  DOMAINS, TOOL_TYPES, INDUSTRIES, DISCLAIMERS, SENSITIVITY_NOTE,
} from "@/lib/tools";
import { collectionsForTool } from "@/lib/tools/collections";
import { TOOL_VISUALS } from "@/lib/tools/visuals";
import ToolEngine from "@/components/tools/ToolEngine";
import ToolCard from "@/components/tools/ToolCard";
import { SHELLS } from "@/components/tools/shell";

const BASE = "https://www.theleadflowpro.com";

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
  const url = `${BASE}/tools/${tool.slug}`;
  const ogImage = TOOL_VISUALS[tool.slug]?.ogImage;
  const images = ogImage
    ? [{ url: `${BASE}${ogImage}`, width: 1200, height: 630, alt: `${tool.name} — a free tool from The LeadFlow Pro` }]
    : undefined;
  return {
    title: tool.seoTitle || `${tool.name}: free ${TOOL_TYPES[tool.toolType].label.toLowerCase()}`,
    description:
      tool.seoDescription ||
      `${tool.description} Free to use, free to save, free to put on your own website.`,
    alternates: { canonical: url },
    openGraph: {
      title: tool.name,
      description: tool.tagline,
      url,
      siteName: "The LeadFlow Pro",
      type: "website",
      images,
    },
    twitter: { card: "summary_large_image", images: images?.map((i) => i.url) },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const domain = DOMAINS[tool.domain];
  const type = TOOL_TYPES[tool.toolType];
  const disclaimer = DISCLAIMERS[tool.disclaimer];
  const shell = SHELLS[tool.toolType];
  // The estimate disclaimer is for math. Non-math tools with the generic
  // disclaimer show the data-privacy note instead, here and in the engine.
  const suppressEstimate = !shell.showEstimateBadge && tool.disclaimer === "general-estimate";
  const related = toolIndex(relatedTools(tool, 4));
  const collections = collectionsForTool(tool).slice(0, 3);
  const url = `${BASE}/tools/${tool.slug}`;

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
        browserRequirements: "Requires JavaScript",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: "The LeadFlow Pro", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: "Free tools", item: `${BASE}/tools` },
          { "@type": "ListItem", position: 3, name: tool.name, item: url },
        ],
      },
      // HowTo only when the steps are actually rendered on the page below.
      ...(tool.steps.length
        ? [
            {
              "@type": "HowTo",
              name: `How to use the ${tool.name}`,
              description: tool.payoff,
              step: tool.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
            },
          ]
        : []),
      // FAQPage only when visible FAQs exist. Marking up hidden questions is how
      // sites collect manual actions.
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto w-[min(1040px,100%-40px)] pt-8">
        <nav aria-label="Breadcrumb">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)] hover:text-[var(--heading)]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            All {TOOL_COUNT} free tools
          </Link>
        </nav>

        <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,340px)] sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider"
                style={{ color: domain.ink, background: domain.tint, border: `1px solid ${domain.line}` }}
              >
                {domain.label}
              </span>
              <span className="tool-badge">{type.label}</span>
              <span className="tool-badge tool-badge-free">Free, no signup</span>
            </div>
            <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-tight text-[var(--heading)] sm:text-[42px]">
              {tool.name}
            </h1>
            <p className="mt-2 text-lg font-bold" style={{ color: domain.ink }}>
              {tool.tagline}
            </p>
          </div>

          <img
            src={tool.hero.src}
            alt={tool.hero.alt}
            width={tool.hero.width}
            height={tool.hero.height}
            className="tool-hero-art"
            fetchPriority="high"
          />
        </div>

        <p className="mt-5 max-w-3xl text-[17px] leading-relaxed text-[var(--text)]">{tool.description}</p>

        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
          {["Runs in your browser", "Nothing to install", "Download or print the result", "Free to embed on your site"].map((c) => (
            <li key={c} className="inline-flex items-center gap-1.5">
              <Check aria-hidden="true" className="h-4 w-4 text-[var(--green)]" />
              {c}
            </li>
          ))}
        </ul>

        {tool.industries.length > 0 && (
          <p className="mt-4 text-[13px] leading-relaxed text-[var(--quiet)]">
            <span className="font-bold text-[var(--muted)]">Used by: </span>
            {tool.industries.slice(0, 8).map((i) => INDUSTRIES[i].label).join(", ")}
            {tool.industries.length > 8 ? ", and others" : ""}
          </p>
        )}
      </section>

      <section id="tool" className="mx-auto mt-9 w-[min(1040px,100%-40px)] scroll-mt-24">
        <ToolEngine slug={tool.slug} />
      </section>

      <section className="mx-auto mt-14 w-[min(1040px,100%-40px)]">
        <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
          What this tool actually does for you
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] text-[var(--blue)]">
              <Users aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base font-black text-[var(--heading)]">Who it is for</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{tool.who}</p>
          </article>
          <article className="rounded-2xl border border-[var(--danger-line)] bg-[var(--danger-tint)] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--danger-line)] bg-[var(--panel)] text-[var(--danger)]">
              <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base font-black text-[var(--heading)]">The problem it points at</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{tool.problem}</p>
          </article>
          <article className="rounded-2xl border border-[var(--green-line)] bg-[var(--green-tint)] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--green-line)] bg-[var(--panel)] text-[var(--green)]">
              <Target aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base font-black text-[var(--heading)]">What you walk away with</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{tool.payoff}</p>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-12 w-[min(1040px,100%-40px)]">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">How to use it</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{shell.howToIntro}</p>
          <ol className="mt-6 space-y-4">
            {tool.steps.map((s, i) => (
              <li key={i} className="tool-step">
                <span className="tool-step-num" aria-hidden="true">{i + 1}</span>
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

      {tool.faqs && tool.faqs.length > 0 && (
        <section className="mx-auto mt-12 w-[min(1040px,100%-40px)]">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            Questions people ask
          </h2>
          <div className="mt-5 space-y-3">
            {tool.faqs.map((f, i) => (
              <details key={i} className="group rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
                <summary className="cursor-pointer list-none text-[15px] font-black text-[var(--heading)]">
                  {f.q}
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-12 w-[min(1040px,100%-40px)]">
        <div className="rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-tint)] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--panel)] text-[var(--blue)]">
              <Code2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[var(--heading)]">
                Put this tool on your own website
              </h2>
              <p className="text-sm font-bold text-[var(--blue)]">Free forever. I host it. You keep it.</p>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-[var(--text)]">
            This is a real lead magnet you can run on your own site tonight. Somebody lands on your page,
            plays with the numbers, sees what their problem costs, and now they are on your website instead
            of a competitor&apos;s. Costs you nothing, and I keep it working.
          </p>
          <ol className="mt-6 space-y-4">
            {[
              "Scroll up and press Put this tool on my website. The code appears right there, no form.",
              "Copy the one line you get.",
              "In your website editor, add an Embed, HTML or Custom Code block on whatever page you want it on.",
              "Paste it in, save, publish.",
              "Check it on your phone, then send people to that page.",
            ].map((s, i) => (
              <li key={i} className="tool-step">
                <span className="tool-step-num" aria-hidden="true">{i + 1}</span>
                <span className="pt-1 text-[15px] leading-relaxed text-[var(--text)]">{s}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <h3 className="text-sm font-black text-[var(--heading)]">Works on</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                WordPress, Wix, Squarespace, Shopify, GoDaddy, Webflow, Duda, HubSpot, ClickFunnels, or plain
                HTML. Anywhere that takes an embed code.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
              <h3 className="text-sm font-black text-[var(--heading)]">What it costs you</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                Nothing. No monthly fee, no expiring trial, no watermark you have to pay to remove. If you
                get stuck putting it in, text me at (903) 500-8898 and I will help you place it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {collections.length > 0 && (
        <section className="mx-auto mt-12 w-[min(1040px,100%-40px)]">
          <h2 className="text-xl font-black tracking-tight text-[var(--heading)]">
            Part of these collections
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {collections.map((c) => (
              <Link key={c.slug} href={`/tools/collections/${c.slug}`} className="tool-chip">
                {c.short}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-14 w-[min(1040px,100%-40px)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            While you are here
          </h2>
          <Link href="/tools" className="text-sm font-bold text-[var(--blue)] hover:text-[var(--heading)]">
            See all {TOOL_COUNT} tools
          </Link>
        </div>
        <div className="tool-grid mt-5">
          {related.map((r) => (
            <ToolCard key={r.slug} tool={r} />
          ))}
        </div>
      </section>

      <section className="mx-auto mt-14 w-[min(1040px,100%-40px)]">
        <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-7 text-center sm:p-10">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            This is one free tool. Imagine your whole website working like this.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-[var(--text)]">
            Most business websites are a brochure that sits there. Yours could be catching leads at 9pm,
            texting people back in five minutes, booking jobs, and telling you which ad actually worked. And
            you would own it instead of renting it for the rest of your life.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/start"
              className="button-primary"
              data-analytics="map_my_company"
              data-cta-placement={`tool_${tool.slug}`}
            >
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/tools" className="button-secondary">
              Browse all {TOOL_COUNT} free tools
            </Link>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-[var(--quiet)]">
            {suppressEstimate ? SENSITIVITY_NOTE[tool.dataSensitivity] : disclaimer.body}
          </p>
        </div>
      </section>
    </main>
  );
}
