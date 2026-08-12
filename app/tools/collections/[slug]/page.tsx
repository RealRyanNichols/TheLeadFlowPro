import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { TOOL_COUNT, toolIndex } from "@/lib/tools";
import { PUBLISHED_COLLECTIONS, collectionTools, getCollection } from "@/lib/tools/collections";
import ToolCard from "@/components/tools/ToolCard";

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
  const n = collectionTools(c).length;
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

  const tools = toolIndex(collectionTools(collection));
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
        numberOfItems: tools.length,
        itemListElement: tools.map((t, i) => ({
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
    <main className="pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto w-[min(1180px,100%-40px)] pt-8">
        <nav aria-label="Breadcrumb">
          <Link
            href="/tools"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--muted)] hover:text-[var(--heading)]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            All {TOOL_COUNT} free tools
          </Link>
        </nav>

        <h1 className="mt-5 max-w-3xl text-3xl font-black leading-[1.06] tracking-tight text-[var(--heading)] sm:text-[46px]">
          {collection.title}
        </h1>
        <p className="mt-3 max-w-2xl text-lg font-bold text-[var(--blue)]">{collection.hook}</p>
        <p className="mt-4 max-w-3xl text-[17px] leading-relaxed text-[var(--text)]">{collection.intro}</p>

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
      </section>

      <section className="mx-auto mt-10 w-[min(1180px,100%-40px)]">
        <h2 className="text-2xl font-black tracking-tight text-[var(--heading)]">
          {tools.length} tools worth running
        </h2>
        <p className="mt-1.5 text-sm text-[var(--muted)]">
          The first few are the ones most people should start with.
        </p>
        <div className="tool-grid mt-5">
          {tools.map((t, i) => (
            <ToolCard key={t.slug} tool={t} priority={i < 3} />
          ))}
        </div>
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

      <section className="mx-auto mt-14 w-[min(1180px,100%-40px)]">
        <div className="rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-tint)] p-7 text-center sm:p-9">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            The tools show you the leak. Fixing it is the other half.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-[var(--text)]">{collection.cta}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/start" className="button-primary">
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="/tools" className="button-secondary">
              Browse all {TOOL_COUNT} free tools
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
