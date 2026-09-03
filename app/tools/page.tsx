import type { Metadata } from "next";
import { Suspense } from "react";
import { Download, Code2, Zap } from "lucide-react";
import { TOOLS, TOOL_COUNT, toolIndex, sortTools } from "@/lib/tools";
import { PUBLISHED_COLLECTIONS, collectionCount } from "@/lib/tools/collections";
import ToolDirectory from "@/components/tools/ToolDirectory";
import ToolFinder from "@/components/tools/ToolFinder";
import ToolCard from "@/components/tools/ToolCard";
import FinalCta from "@/components/site/system/FinalCta";
import SiteHero from "@/components/site/system/SiteHero";

const BASE = "https://www.theleadflowpro.com";

// The OG image is the designed card at /og/tools.jpg, not a generated one. It
// replaced app/tools/opengraph-image.tsx (deleted), which in turn had replaced
// the free-website advert that had nothing to do with this page.
//
// The card has "86" painted into the artwork. If TOOL_COUNT moves, the image has
// to be redrawn. Everything else on the page reads the live count.
const OG_IMAGE = "/og/tools.jpg";
const OG_ALT = `${TOOL_COUNT} free tools built for real work, from The LeadFlow Pro`;

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
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: OG_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TOOL_COUNT} free tools built for real work`,
    description:
      "Calculators, generators, planners, checkers and builders. Free to use, free to save, free to put on your own site.",
    images: [OG_IMAGE],
  },
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
    count: collectionCount(c),
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
    <main className="cb-page sv-tools-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <SiteHero
        compact
        eyebrow={`${TOOL_COUNT} working tools`}
        mutedTitle="Do not just explain the problem."
        title="Let somebody use the answer."
        body="Calculators, generators, planners, checkers, and builders that turn a question into a useful next move. No signup to run them, save the result, or place one on your own website."
        media={{
          src: "/images/homepage-v2/connected-company-hero.webp",
          alt: "A connected operating core feeding useful business modules",
          kicker: "Useful before the call",
          caption: "A website should do real work.",
        }}
        primary={{ href: "#tool-library", label: `Open all ${TOOL_COUNT} tools` }}
        secondary={{ href: "/premier-system", label: "See a full system" }}
        trustLine="Free to use. Free to save. Free to embed."
      />

      <section id="tool-library" className="cb-band sv-tools-band">
        <div className="sv-tools-shell">
        <div className="flex justify-center sm:mt-2">
          <ToolFinder tools={index} />
        </div>

        {/* The directory reads its filters from the URL, which needs a Suspense
            boundary. The fallback is the real card grid rather than a spinner,
            so the catalogue is in the HTML for crawlers and for anyone whose
            JavaScript has not arrived yet. */}
        <div className="sv-long-grid mt-8">
          <Suspense fallback={<StaticGrid />}>
            <ToolDirectory tools={index} collections={collections} />
          </Suspense>
        </div>

        {/* Below the catalogue on purpose: the tools are the pitch, the
            reassurance can wait until someone has seen them. */}
        <div className="mt-14 grid gap-3 sm:grid-cols-3">
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

        </div>
      </section>
      <FinalCta
        eyebrow="Why is all this free?"
        title="Because this is a fraction of what your website should be doing."
        body="Use every tool and never talk to me. That is fine. When you are ready to turn the useful idea into an owned business system, the next move is already here."
        primary={{ href: "/start", label: "Map My Company" }}
        secondary={{ href: "/contact", label: "Send a tool idea" }}
      />
    </main>
  );
}
