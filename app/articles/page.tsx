import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FinalCta from "@/components/site/system/FinalCta";
import SiteHero from "@/components/site/system/SiteHero";
import { ARTICLES } from "@/lib/articles";
import {
  articlePremiumArtAlt,
  articlePremiumArtPath,
  articleVisualHeadline,
} from "@/lib/articles-og";

export const metadata: Metadata = {
  title: "Articles | The LeadFlow Pro",
  description:
    "Practical writing on lead flow, follow-up, marketplaces, and owned business systems from The LeadFlow Pro.",
  alternates: { canonical: "https://www.theleadflowpro.com/articles" },
};

const FEATURED_ARTICLE_SLUGS = new Set([
  "free-tools-that-bring-customers",
  "website-text-too-small-on-mobile",
  "pressure-washing-pricing",
]);

export default function ArticlesPage() {
  const articles = [...ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const featuredArticles = articles.filter((article) => FEATURED_ARTICLE_SLUGS.has(article.slug));
  const libraryArticles = articles.filter((article) => !FEATURED_ARTICLE_SLUGS.has(article.slug));
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
        primary={{ href: "#latest", label: "Browse the field notes" }}
        secondary={{ href: "/premier-system", label: "See the Premier proof" }}
        trustLine="Real examples, useful tools, and no guaranteed outcome claims."
      />

      <section id="latest" className="cb-band sv-index-band">
        <div className="cb-shell">
          <div className="cb-headrow">
            <div>
              <p className="cb-eyebrow">Latest breakdowns</p>
              <h2 className="cb-h2 cb-heading">Understand the system without reading a textbook.</h2>
            </div>
            <p className="cb-lead">
              The picture creates the context. The article gives you the numbers, the tradeoffs,
              and the move you can make next.
            </p>
          </div>
          <div className="sv-index-grid sv-article-feature-grid mt-12">
          {featuredArticles.map((a) => (
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
                </span>
                <h2>{a.title}</h2>
                <p>{a.description}</p>
                <span className="sv-index-card__link">
                  Read the breakdown <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </span>
              </span>
            </Link>
          ))}
          </div>

          <div className="sv-article-library-head">
            <p className="cb-eyebrow">Every field note</p>
            <h3>More practical breakdowns</h3>
          </div>
          <div className="sv-index-grid sv-article-feature-grid sv-article-library-grid">
            {libraryArticles.map((a) => (
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
                  <h2>{a.title}</h2>
                  <p>{a.description}</p>
                  <span className="sv-index-card__link">
                    Read the breakdown <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
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
