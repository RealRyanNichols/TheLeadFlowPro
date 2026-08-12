import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Download, Code2, Zap } from "lucide-react";
import { TOOLS, TOOL_COUNT, toolIndex, sortTools } from "@/lib/tools";
import { PUBLISHED_COLLECTIONS, collectionTools } from "@/lib/tools/collections";
import ToolDirectory from "@/components/tools/ToolDirectory";
import ToolFinder from "@/components/tools/ToolFinder";
import ToolCard from "@/components/tools/ToolCard";

const BASE = "https://www.theleadflowpro.com";

// The OG image comes from app/tools/opengraph-image.tsx. It used to point at the
// free-website advert, which had nothing to do with this page.
export const metadata: Metadata = {
  title: `${TOOL_COUNT} Free Tools Built for Real Work | The LeadFlow Pro`,
  description: `${TOOL_COUNT} free calculators, generators, planners and checkers for business owners, professionals, families and anyone trying to get something done. Use them here, save the result, put them on your own website.`,
  alternates: { canonical: `${BASE}/tools` },
  openGraph: {
    title: `${TOOL_COUNT} free tools built for real work`,
    description:
      "Calculators, generators, planners, checkers and builders. Free to use, free to save, free to put on your own site.",
    url: `${BASE}/tools`,
    siteName: "The LeadFlow Pro",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

/** The no-JavaScript view of the catalogue. Every card is a real link. */
function StaticGrid() {
  return (
    <div className="tool-grid">
      {sortTools(toolIndex(), "useful").map((t, i) => (
        <ToolCard key={t.slug} tool={t} priority={i < 3} />
      ))}
    </div>
  );
}

export default function ToolsPage() {
  const index = toolIndex();

  const collections = PUBLISHED_COLLECTIONS.map((c) => ({
    slug: c.slug,
    short: c.short,
    hook: c.hook,
    count: collectionTools(c).length,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${TOOL_COUNT} Free Tools Built for Real Work`,
        description: `${TOOL_COUNT} free calculators, generators, planners and checkers.`,
        url: `${BASE}/tools`,
        isPartOf: { "@type": "WebSite", name: "The LeadFlow Pro", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: "Free tools", item: `${BASE}/tools` },
        ],
      },
      {
        "@type": "ItemList",
        numberOfItems: TOOLS.length,
        itemListElement: TOOLS.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${BASE}/tools/${t.slug}`,
          name: t.name,
        })),
      },
    ],
  };

  return (
    <main className="pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="page-hero page-hero-centered">
        <span className="eyebrow">
          <Zap aria-hidden="true" className="h-3.5 w-3.5" />
          {TOOL_COUNT} free tools
        </span>
        <h1>Free tools built for real work and real life.</h1>
        <p>
          Calculators, generators, planners, checkers and builders for business owners, professionals,
          families, students, public servants, creators and people trying to get something done. Use it
          here, save the result, put it on your website. No signup to use any of them.
        </p>
      </section>

      <section className="mx-auto w-[min(1180px,100%-40px)]">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: <Zap className="h-5 w-5" />, title: "Free to use", body: "Every tool runs in your browser. No account, no trial, no credit card." },
            { icon: <Download className="h-5 w-5" />, title: "Free to save", body: "Download, copy or print your result. No email required for any of that." },
            { icon: <Code2 className="h-5 w-5" />, title: "Free to embed", body: "Put any tool on your own site with one line. I host it and keep it working." },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-tint)] text-[var(--blue)]">
                {p.icon}
              </span>
              <h2 className="mt-3 text-base font-black text-[var(--heading)]">{p.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{p.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <ToolFinder tools={index} />
        </div>

        {/* The directory reads its filters from the URL, which needs a Suspense
            boundary. The fallback is the real card grid rather than a spinner,
            so the catalogue is in the HTML for crawlers and for anyone whose
            JavaScript has not arrived yet. */}
        <div className="mt-10">
          <Suspense fallback={<StaticGrid />}>
            <ToolDirectory tools={index} collections={collections} />
          </Suspense>
        </div>

        <div className="mt-14 rounded-2xl border border-[var(--accent-line)] bg-[var(--accent-tint)] p-7 text-center sm:p-9">
          <h2 className="text-2xl font-black tracking-tight text-[var(--heading)] sm:text-3xl">
            Why is all this free?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-relaxed text-[var(--text)]">
            Because this is a fraction of what a website should be doing for you. If a free calculator can
            show you where five figures a year is leaking, think about what your actual site could do if it
            was built to run your business instead of just sit there. Use every one of these and never talk
            to me. That is fine. When you are ready to stop renting your platform, you will know who to call.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/start" className="button-primary">
              Map My Company
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <a href="sms:+19035008898" className="button-secondary">
              Text me a tool idea
            </a>
          </div>
          <p className="mt-4 text-xs text-[var(--quiet)]">
            New tools go up every month. If your business wishes one of these existed, tell me and I might
            build it next.
          </p>
        </div>
      </section>
    </main>
  );
}
