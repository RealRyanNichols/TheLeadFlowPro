import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FinalCta from "@/components/site/system/FinalCta";
import SiteHero from "@/components/site/system/SiteHero";
import { getPublishedArticles } from "@/lib/articles";
import ArticleLibrary from "./ArticleLibrary";
import { articleLibraryEntry } from "./article-library";
import {
  articlePremiumArtAlt,
  articlePremiumArtPath,
  articleVisualHeadline,
} from "@/lib/articles-og";

export const dynamic = "force-dynamic";

export const metadata: Metadata = withPublicPageMetadata("/articles", {
  title: "Articles | The LeadFlow Pro",
  description:
    "Practical writing on lead flow, follow-up, marketplaces, and owned business systems from The LeadFlow Pro.",
  alternates: { canonical: "https://www.theleadflowpro.com/articles" },
});

export default function ArticlesPage() {
  const articles = getPublishedArticles().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return (
    <main className="cb-page">
      <SiteHero
        compact
        eyebrow={`${articles.length} operator field notes`}
        mutedTitle="No filler."
        title="One problem. One useful next move."
        body="Practical breakdowns of missed leads, follow-up, websites, tools, pricing, and owned business systems. Every article is built to make the problem visible before it asks you to do anything."
        media={{
          src: "/images/homepage-v2/proof-cockpit.webp",
          alt: "A premium operating cockpit representing measurable business proof",
          kicker: "Receipts before claims",
          caption: "See the leak. Trace the next move.",
        }}
        primary={{ href: "#article-library", label: "Find a useful guide" }}
        secondary={{ href: "/premier-system", label: "See the Premier proof" }}
        trustLine="Real examples, useful tools, and no guaranteed outcome claims."
      />

      <section id="latest" className="cb-band sv-index-band">
        <div className="cb-shell">
          <div id="article-library" className="cb-headrow" style={{ scrollMarginTop: 110 }}>
            <div>
              <p className="cb-eyebrow">The guide library</p>
              <h2 className="cb-h2 cb-heading">Find the next move for your business.</h2>
            </div>
            <p className="cb-lead">
              Pick a task or search for your question. Open a guide, try the tool,
              and put the answer to work.
            </p>
          </div>
          <ArticleLibrary entries={articles.map(articleLibraryEntry)}>
            {articles.map((a) => (
              <Link key={a.slug} href={`/articles/${a.slug}`} className="sv-index-card sv-article-feature-card">
                <span className="sv-index-card__media">
                  <Image
                    src={articlePremiumArtPath(a.slug)}
                    alt={articlePremiumArtAlt(a.slug)}
                    fill
                    sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1000px) 50vw, 33vw"
                  />
                  <span className="sv-index-card__media-title">
                    {articleVisualHeadline(a.slug)}
                  </span>
                </span>
                <span className="sv-index-card__body">
                  <span className="sv-index-card__meta">
                    {new Date(a.publishedAt + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    · {a.readingMinutes} min
                    {a.video ? ` · ${a.video.durationSeconds}s video` : ""}
                  </span>
                  <h3>{a.title}</h3>
                  <p>{a.description}</p>
                  <span className="sv-index-card__link">
                    Read the breakdown <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            ))}
          </ArticleLibrary>
        </div>
      </section>

      <FinalCta
        eyebrow="Reading is free. So is the first build."
        title="Get the website that catches these leads."
        body="Every article on this page points at the same fix: an owned website with capture and follow-up behind it. The first five-page build is free for approved businesses."
        primary={{ href: "/free-build", label: "Start My Free Website" }}
        secondary={{ href: "tel:+19035008898", label: "Call or text (903) 500-8898", external: true }}
      />
    </main>
  );
}
