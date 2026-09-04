import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, KeyRound, Target, Users } from "lucide-react";
import { DOMAINS, TOOL_TYPES, getTool, toolIndex, TOOL_COUNT } from "@/lib/tools";
import { PRO_BUNDLE, PRO_TOOLS, PRO_TOOL_VISUALS, getProTool, proToolIndex, sortProTools } from "@/lib/tools/pro";
import { hasProAccess } from "@/lib/proAccess";
import { getProEntitlements } from "@/lib/proAccessServer";
import ProToolEngine from "@/components/tools/pro/ProToolEngine";
import ProBuyButton from "@/components/tools/pro/ProBuyButton";
import ProCard from "@/components/tools/pro/ProCard";
import ToolCard from "@/components/tools/ToolCard";
import SiteHero from "@/components/site/system/SiteHero";
import FinalCta from "@/components/site/system/FinalCta";

const BASE = "https://www.theleadflowpro.com";

// Rendered per request, never prerendered. The page reads the access cookie to
// decide whether this visitor already owns the kit, and a build-time render
// would freeze that as "locked" and show a buy button to somebody who paid.
// Discovery comes from the sitemap and the shelf, not from generateStaticParams.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const kit = getProTool(slug);
  if (!kit) return {};
  const url = `${BASE}/tools/pro/${kit.slug}`;
  const ogImage = PRO_TOOL_VISUALS[kit.slug]?.ogImage;
  const images = ogImage
    ? [{ url: `${BASE}${ogImage}`, width: 1200, height: 630, alt: `${kit.name} | A Pro Kit from The LeadFlow Pro` }]
    : undefined;
  return {
    title: kit.seoTitle || `${kit.name}: the whole system for $${kit.pro.priceUsd}`,
    description:
      kit.seoDescription ||
      `${kit.description} Try it free with your own numbers, then unlock the documents for $${kit.pro.priceUsd}, once.`,
    alternates: { canonical: url },
    openGraph: {
      title: kit.name,
      description: kit.tagline,
      url,
      siteName: "The LeadFlow Pro",
      type: "website",
      images,
    },
    twitter: { card: "summary_large_image", images: images?.map((i) => i.url) },
  };
}

export default async function ProToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const kit = getProTool(slug);
  if (!kit) notFound();

  const { kinds } = await getProEntitlements();
  const unlocked = hasProAccess(kinds, kit.slug);
  const domain = DOMAINS[kit.domain];
  const type = TOOL_TYPES[kit.toolType];
  const url = `${BASE}/tools/pro/${kit.slug}`;

  const upgradesFrom = toolIndex(
    kit.pro.upgradeFrom.map((s) => getTool(s)).filter((t): t is NonNullable<typeof t> => Boolean(t)),
  );
  const otherKits = proToolIndex(sortProTools(PRO_TOOLS.filter((t) => t.slug !== kit.slug)).slice(0, 3));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: kit.name,
        description: kit.description,
        url,
        category: domain.label,
        brand: { "@type": "Brand", name: "The LeadFlow Pro" },
        offers: {
          "@type": "Offer",
          url,
          price: String(kit.pro.priceUsd),
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          seller: { "@type": "Organization", name: "The LeadFlow Pro" },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: "Free tools", item: `${BASE}/tools` },
          { "@type": "ListItem", position: 3, name: "Pro Kits", item: `${BASE}/tools/pro` },
          { "@type": "ListItem", position: 4, name: kit.name, item: url },
        ],
      },
      ...(kit.faqs?.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: kit.faqs.map((f) => ({
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
        eyebrow={`${domain.label} · Pro Kit · $${kit.pro.priceUsd} once`}
        mutedTitle={kit.tagline}
        title={kit.name}
        body={kit.description}
        media={{
          src: kit.hero.src,
          alt: kit.hero.alt,
          width: kit.hero.width,
          height: kit.hero.height,
          kicker: unlocked ? "Yours" : "Try it before you buy it",
          caption: kit.pro.freePreview,
        }}
        primary={{ href: "#kit", label: unlocked ? "Open your kit" : `${type.verb} it with your numbers` }}
        secondary={{ href: "/tools/pro", label: "All the kits" }}
        trustLine={
          unlocked
            ? "You own this kit. Change any answer and every document rebuilds, at no extra cost."
            : "The numbers and the chart are free. The documents unlock for one payment, with no subscription."
        }
      />

      {!unlocked ? (
        <section className="pro-strip" aria-label="What is in the box">
          <div className="cb-shell pro-strip-inner">
            <div>
              <p className="pro-strip-eyebrow">In the box</p>
              <ul className="pro-strip-list">
                {kit.pro.kit.map((item) => (
                  <li key={item}>
                    <Check aria-hidden="true" className="h-4 w-4" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pro-strip-buy">
              <p className="pro-strip-price">
                <span>${kit.pro.priceUsd}</span>
                <small>one time</small>
              </p>
              <ProBuyButton slug={kit.slug} priceUsd={kit.pro.priceUsd} name={kit.name} />
              <p className="pro-strip-fine">
                Or <Link href="/tools/pro#bundle">every kit for ${PRO_BUNDLE.priceUsd}</Link>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section id="kit" className="cb-band sv-tools-band scroll-mt-24">
        <div className="cb-shell sv-workbench">
          <ProToolEngine
            slug={kit.slug}
            name={kit.name}
            priceUsd={kit.pro.priceUsd}
            fields={kit.fields}
            kit={kit.pro.kit}
            promise={kit.pro.promise}
            initiallyUnlocked={unlocked}
          />
        </div>
      </section>

      <section className="mx-auto mt-14 w-[min(1040px,100%-40px)]">
        <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
          What this kit actually does for you
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] text-[var(--blue)]">
              <Users aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base font-black text-[var(--heading)]">Who it is for</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{kit.who}</p>
          </article>
          <article className="rounded-2xl border border-[var(--danger-line)] bg-[var(--danger-tint)] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--danger-line)] bg-[var(--panel)] text-[var(--danger)]">
              <AlertTriangle aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base font-black text-[var(--heading)]">The problem it points at</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{kit.problem}</p>
          </article>
          <article className="rounded-2xl border border-[var(--green-line)] bg-[var(--green-tint)] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--green-line)] bg-[var(--panel)] text-[var(--green)]">
              <Target aria-hidden="true" className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base font-black text-[var(--heading)]">What you walk away with</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{kit.payoff}</p>
          </article>
        </div>
      </section>

      <section className="mx-auto mt-12 w-[min(1040px,100%-40px)]">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">How it works</h2>
          <ol className="mt-6 space-y-4">
            {kit.steps.map((s, i) => (
              <li key={i} className="tool-step">
                <span className="tool-step-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="pt-1 text-[15px] leading-relaxed text-[var(--text)]">{s}</span>
              </li>
            ))}
          </ol>
          <a href="#kit" className="button-primary mt-7">
            {unlocked ? "Open your kit" : "Try it with your numbers"}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </section>

      {upgradesFrom.length ? (
        <section className="mx-auto mt-12 w-[min(1040px,100%-40px)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
                The free tools this is built on
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                Every one of these stays free, with no signup, and you can put any of them on your own site
                for nothing. This kit is what happens after they hand you the answer.
              </p>
            </div>
            <Link href="/tools" className="text-sm font-bold text-[var(--blue)] hover:text-[var(--heading)]">
              All {TOOL_COUNT} free tools
            </Link>
          </div>
          <div className="tool-grid mt-5">
            {upgradesFrom.slice(0, 4).map((t) => (
              <ToolCard key={t.slug} tool={t} />
            ))}
          </div>
        </section>
      ) : null}

      {kit.faqs?.length ? (
        <section className="mx-auto mt-12 w-[min(1040px,100%-40px)]">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            Questions people ask
          </h2>
          <div className="mt-5 space-y-3">
            {kit.faqs.map((f, i) => (
              <details key={i} className="group rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
                <summary className="cursor-pointer list-none text-[15px] font-black text-[var(--heading)]">
                  {f.q}
                </summary>
                <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-[var(--muted)]">
            <KeyRound aria-hidden="true" className="h-4 w-4 text-[var(--blue)]" />
            Already bought this on another device? <Link className="font-bold text-[var(--blue)] underline" href="/tools/pro/unlock">Restore your access</Link>.
          </p>
        </section>
      ) : null}

      {otherKits.length ? (
        <section className="mx-auto mt-14 w-[min(1040px,100%-40px)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">Other kits</h2>
            <Link href="/tools/pro#bundle" className="text-sm font-bold text-[var(--blue)] hover:text-[var(--heading)]">
              All of them for ${PRO_BUNDLE.priceUsd}
            </Link>
          </div>
          <div className="tool-grid mt-5">
            {otherKits.map((t) => (
              <ProCard key={t.slug} tool={t} owned={hasProAccess(kinds, t.slug)} />
            ))}
          </div>
        </section>
      ) : null}

      <FinalCta
        eyebrow="Bigger than a kit"
        title="When the system needs building around you, not by you."
        body="A kit hands you the documents. If what you actually need is the website, the CRM and the follow-up wired together and installed in accounts you own, that is a different conversation and it starts with a map."
        primary={{ href: "/start", label: "Map My Company" }}
        secondary={{ href: "/tools/pro", label: "Back to the kits" }}
      />
    </main>
  );
}
