import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Users, AlertTriangle, Target, Zap, Code2,
} from "lucide-react";
import {
  TOOLS, TOOL_COUNT, getTool, relatedTools, toolIndex,
  DOMAINS, TOOL_TYPES,
} from "@/lib/tools";
import { collectionsForTool } from "@/lib/tools/collections";
import { TOOL_VISUALS } from "@/lib/tools/visuals";
import ToolEngine from "@/components/tools/ToolEngine";
import ToolCard from "@/components/tools/ToolCard";
import { SHELLS } from "@/components/tools/shell";
import FinalCta from "@/components/site/system/FinalCta";
import SiteHero from "@/components/site/system/SiteHero";

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
    ? [{ url: `${BASE}${ogImage}`, width: 1200, height: 630, alt: `${tool.name} | A free tool from The LeadFlow Pro` }]
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
  const shell = SHELLS[tool.toolType];
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
    <main className="cb-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <SiteHero
        compact
        eyebrow={`${domain.label} · ${type.label} · Free`}
        mutedTitle={tool.tagline}
        title={tool.name}
        body={tool.description}
        media={{
          src: tool.hero.src,
          alt: tool.hero.alt,
          width: tool.hero.width,
          height: tool.hero.height,
          kicker: "Working tool",
          caption: "Use it before you book anything.",
        }}
        primary={{ href: "#tool", label: `${type.verb} it now` }}
        secondary={{ href: "/tools", label: `All ${TOOL_COUNT} tools` }}
        trustLine="Runs in your browser. Nothing to install. Save the result or embed it on your site."
      />

      <section id="tool" className="cb-band sv-tools-band scroll-mt-24">
        <div className="cb-shell sv-workbench">
          <ToolEngine slug={tool.slug} />
        </div>
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

      <FinalCta
        eyebrow="One useful tool is the proof"
        title="Now imagine the whole website doing real work."
        body="Map the pages, lead capture, follow-up, and reporting that should sit behind your offer. The result is a recommendation, not a guaranteed outcome."
        primary={{ href: "/start", label: "Map My Company" }}
        secondary={{ href: "/tools", label: `Browse all ${TOOL_COUNT} tools` }}
      />
    </main>
  );
}
