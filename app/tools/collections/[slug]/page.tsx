import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { TOOL_COUNT, toolIndex } from "@/lib/tools";
import { PUBLISHED_COLLECTIONS, collectionCount, collectionSections, getCollection } from "@/lib/tools/collections";
import ToolCard from "@/components/tools/ToolCard";
import FinalCta from "@/components/site/system/FinalCta";
import SiteHero from "@/components/site/system/SiteHero";

const BASE = "https://www.theleadflowpro.com";

export const revalidate = 3600;

// Only collections that resolve to real tools and carry real editorial content
// are routable at all, so there is no way to publish a thin programmatic page.
export function generateStaticParams() {
  return PUBLISHED_COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getCollection(slug);
  if (!c) return {};
  const url = `${BASE}/tools/collections/${c.slug}`;
  const n = collectionCount(c);
  return {
    title: `${c.title} (${n} free tools)`,
    description: `${c.hook} ${n} free tools, no signup to use any of them.`,
    alternates: { canonical: url },
    openGraph: { title: c.title, description: c.hook, url, siteName: "The LeadFlow Pro", type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  // Sectioned and honest: the headline number is core and secondary tools
  // only, and the broadly useful pile is labeled, capped and never counted.
  const sections = collectionSections(collection);
  const count = collectionCount(collection);
  const counted = sections.filter((s) => s.id !== "broadly-useful").flatMap((s) => s.tools);
  const hasBroad = sections.some((s) => s.id === "broadly-useful");
  const url = `${BASE}/tools/collections/${collection.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: collection.title,
        description: collection.hook,
        url,
        isPartOf: { "@type": "WebSite", name: "The LeadFlow Pro", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: "Free tools", item: `${BASE}/tools` },
          { "@type": "ListItem", position: 3, name: collection.short, item: url },
        ],
      },
      {
        "@type": "ItemList",
        numberOfItems: counted.length,
        itemListElement: counted.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${BASE}/tools/${t.slug}`,
          name: t.name,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: collection.faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="cb-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <SiteHero
        compact
        eyebrow={`${count} tools for this work`}
        mutedTitle={collection.hook}
        title={collection.title}
        body={collection.intro}
        media={{
          src: "/images/homepage-v2/proof-cockpit.webp",
          alt: "A premium proof cockpit representing useful business measurements",
          kicker: "Run the numbers",
          caption: "See the leak before you fix it.",
        }}
        primary={{ href: "#collection-tools", label: `Open the ${count} tools` }}
        secondary={{ href: "/tools", label: `All ${TOOL_COUNT} tools` }}
        trustLine="Every tool is free to run without creating an account."
      />

      <section className="cb-band sv-tools-band">
        <div className="cb-shell">
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <h2 className="text-base font-black text-[var(--heading)]">Who this is for</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{collection.serves}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <h2 className="flex items-center gap-2 text-base font-black text-[var(--heading)]">
              <AlertTriangle aria-hidden="true" className="h-4 w-4 text-[var(--warn)]" />
              What usually goes wrong
            </h2>
            <ul className="mt-2 space-y-1.5">
              {collection.problems.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-[var(--muted)]">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--quiet)]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
        </div>
      </section>

      <section id="collection-tools" className="mx-auto mt-10 w-[min(1180px,100%-40px)] scroll-mt-24">
        <h2 className="text-2xl font-black tracking-tight text-[var(--heading)]">
          {hasBroad
            ? `${count} tools built for this work, plus the broadly useful library.`
            : `${count} tools worth running`}
        </h2>

        {sections.map((section, si) => (
          <div key={section.id} className="mt-8">
            <h3 className="text-lg font-black tracking-tight text-[var(--heading)]">{section.title}</h3>
            {section.id === "start-here" && (
              <p className="mt-1.5 text-sm text-[var(--muted)]">
                The ones most people in this work should run first.
              </p>
            )}
            {section.id === "broadly-useful" && (
              <p className="mt-1.5 text-sm text-[var(--muted)]">
                Not built only for this work, but useful to almost any business.
              </p>
            )}
            <div className="tool-grid mt-4">
              {toolIndex(section.tools).map((t, i) => (
                <ToolCard key={t.slug} tool={t} priority={si === 0 && i < 3} />
              ))}
            </div>
            {section.id === "broadly-useful" && (
              <Link
                href="/tools"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-black text-[var(--blue)] hover:underline"
              >
                See all {TOOL_COUNT} free tools
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
          </div>
        ))}
      </section>

      <section className="mx-auto mt-14 w-[min(1180px,100%-40px)]">
        <h2 className="text-2xl font-black tracking-tight text-[var(--heading)]">Questions people ask</h2>
        <div className="mt-5 max-w-3xl space-y-3">
          {collection.faqs.map((f, i) => (
            <details key={i} className="group rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <summary className="cursor-pointer list-none text-[15px] font-black text-[var(--heading)]">
                {f.q}
              </summary>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--muted)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <FinalCta
        eyebrow="The tools show the leak"
        title="Fixing the connected system is the other half."
        body={collection.cta}
        primary={{ href: "/start", label: "Map My Company" }}
        secondary={{ href: "/tools", label: `Browse all ${TOOL_COUNT} tools` }}
      />
    </main>
  );
}
