import type { Metadata } from "next";
import Link from "next/link";
import { uniqueOgImagePath } from "@/lib/uniqueOgImages";
import "../article-body.css";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import RentVsOwnChart from "@/components/charts/RentVsOwnChart";
import FollowUpSpeedChart from "@/components/charts/FollowUpSpeedChart";
import FinalCta from "@/components/site/system/FinalCta";
import SiteHero from "@/components/site/system/SiteHero";
import ArticleActions from "@/components/ArticleActions";
import { proUpgradesFor } from "@/lib/tools/pro";

// Proof charts matched to the articles they back up.
const ARTICLE_CHARTS: Record<string, React.ComponentType> = {
  "cost-of-renting-business-software": RentVsOwnChart,
  "website-builder-monthly-fees": RentVsOwnChart,
  "small-business-website-cost": RentVsOwnChart,
  "the-money-is-in-the-follow-up": FollowUpSpeedChart,
  "missed-calls-cost-customers": FollowUpSpeedChart,
  "website-traffic-but-no-customers": FollowUpSpeedChart,
};
import ArticleToolSection from "@/components/ArticleToolSection";
import ArticleChart from "@/components/ArticleChart";
import ArticleLeadForm from "@/components/ArticleLeadForm";
import { getArticle, getRelatedArticles, type Article } from "@/lib/articles";
import {
  articlePremiumArtAlt,
  articlePremiumArtPath,
  articleSocialImagePath,
  articleVisualHeadline,
} from "@/lib/articles-og";
import { BUSINESS } from "@/lib/site/business";

// Availability is checked for every request, including URLs that returned a
// 404 before midnight. Future slugs are never statically rendered at build time.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) {
    return {
      title: "Article not available | The LeadFlow Pro",
      robots: { index: false, follow: false },
    };
  }
  const socialImage =
    uniqueOgImagePath(`/articles/${article.slug}`) ??
    articleSocialImagePath(article.slug);
  return {
    title: `${article.title} | The LeadFlow Pro`,
    description: article.description,
    keywords: article.tags?.length ? article.tags : undefined,
    authors: [{ name: "Ryan Nichols", url: "https://www.theleadflowpro.com/about" }],
    alternates: {
      canonical: `https://www.theleadflowpro.com/articles/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      authors: ["https://www.theleadflowpro.com/about"],
      section: "Operator field notes",
      tags: article.tags,
      url: `https://www.theleadflowpro.com/articles/${article.slug}`,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: `${article.title}. Visual explainer from The LeadFlow Pro.`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: `${article.title}. Visual explainer from The LeadFlow Pro.`,
        },
      ],
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const SITE = "https://www.theleadflowpro.com";
  const socialImage =
    uniqueOgImagePath(`/articles/${article.slug}`) ??
    articleSocialImagePath(article.slug);
  const premiumArt = articlePremiumArtPath(article.slug);
  const relatedKit = article.tool ? proUpgradesFor(article.tool.slug)[0] : undefined;
  const wordCount = article.body.replace(/\{\{[^}]+\}\}/g, "").trim().split(/\s+/).length;
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    author: {
      "@type": "Person",
      name: "Ryan Nichols",
      url: `${SITE}/about`,
      jobTitle: "Operator, The LeadFlow Pro",
    },
    publisher: {
      "@type": "Organization",
      name: "The LeadFlow Pro",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png`, width: 512, height: 512 },
    },
    mainEntityOfPage: `${SITE}/articles/${article.slug}`,
    image: `${SITE}${socialImage}`,
    wordCount,
    inLanguage: "en-US",
    isAccessibleForFree: true,
    articleSection: "Operator field notes",
    ...(article.tags?.length ? { keywords: article.tags.join(", ") } : {}),
    ...(article.sources?.length
      ? { citation: article.sources.map((source) => ({ "@type": "CreativeWork", name: source.label, url: source.url })) }
      : {}),
  };

  // Breadcrumbs: Home > Articles > this guide. Lets the result show the path.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "The LeadFlow Pro", item: SITE },
      { "@type": "ListItem", position: 2, name: "Articles", item: `${SITE}/articles` },
      { "@type": "ListItem", position: 3, name: article.title, item: `${SITE}/articles/${article.slug}` },
    ],
  };

  // Video articles get their own VideoObject so the clip can be indexed on its own.
  const videoLd = article.video
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: article.video.title,
        description: article.video.description,
        thumbnailUrl: [`${SITE}${article.video.poster}`],
        uploadDate: article.publishedAt,
        duration: `PT${article.video.durationSeconds}S`,
        contentUrl: `${SITE}${article.video.src}`,
        width: article.video.width,
        height: article.video.height,
        publisher: { "@type": "Organization", name: "The LeadFlow Pro" },
      }
    : null;
  // Describe the visible steps. Structured data does not promise a rich result.
  const howToLd = article.tool
    ? {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: article.tool.heading,
        description: article.tool.intro,
        tool: [{ "@type": "HowToTool", name: article.tool.slug }],
        step: article.tool.steps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.text,
          url: `${SITE}/articles/${article.slug}#tool`,
        })),
      }
    : null;

  const faqLd = article.faq?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: article.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  const graph = [articleLd, breadcrumbLd, videoLd, howToLd, faqLd].filter(Boolean);
  const jsonLd = graph.length === 1 ? graph[0] : graph;

  // {{TOOL}} and {{CHART:id}} on their own lines mark where the tool and each
  // chart belong inside the argument. A chart with no marker is drawn after the
  // body, and a tool with no marker goes after the body too, so nothing
  // authored for the page can disappear.
  const charts = new Map((article.charts ?? []).map((chart) => [chart.id, chart]));
  const placed = new Set<string>();
  const segments: Array<{ kind: "md"; text: string } | { kind: "tool" } | { kind: "chart"; id: string }> = [];
  let toolPlaced = false;
  for (const piece of article.body.split(/^\s*(\{\{TOOL\}\}|\{\{CHART:[a-z0-9-]+\}\})\s*$/m)) {
    if (piece === "{{TOOL}}") {
      if (article.tool) { segments.push({ kind: "tool" }); toolPlaced = true; }
      continue;
    }
    const chartMatch = /^\{\{CHART:([a-z0-9-]+)\}\}$/.exec(piece);
    if (chartMatch) {
      if (charts.has(chartMatch[1])) { segments.push({ kind: "chart", id: chartMatch[1] }); placed.add(chartMatch[1]); }
      continue;
    }
    if (piece.trim()) segments.push({ kind: "md", text: piece });
  }
  if (article.tool && !toolPlaced) segments.push({ kind: "tool" });
  for (const chart of article.charts ?? []) {
    if (!placed.has(chart.id)) segments.push({ kind: "chart", id: chart.id });
  }
  const related = getRelatedArticles(article.slug, 3);
  const dateLabel = (value: string) =>
    new Date(value + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <main className="cb-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="sv-article-hero">
        <SiteHero
          compact
          eyebrow="Operator field note"
          title={article.title}
          body={article.description}
          media={{
            src: premiumArt,
            alt: articlePremiumArtAlt(article.slug),
            width: 1200,
            height: 630,
            kicker: article.video ? "Watch and read" : "Visual explainer",
            caption: articleVisualHeadline(article.slug),
          }}
          trustLine={`${dateLabel(article.publishedAt)}${
            article.updatedAt && article.updatedAt !== article.publishedAt ? ` · Updated ${dateLabel(article.updatedAt)}` : ""
          } · ${article.readingMinutes} min read · Ryan Nichols`}
        />
      </div>

      <article className="sv-article-shell">
        <ArticleActions slug={article.slug} title={article.title} />
        {article.video ? (
        <figure className="mb-12 flex flex-col items-center">
          <video
            controls
            playsInline
            preload="metadata"
            poster={article.video.poster}
            width={article.video.width}
            height={article.video.height}
            className="w-full max-w-[420px] rounded-2xl border border-[var(--line-strong)] bg-black shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
          >
            <source src={article.video.src} type="video/mp4" />
            {article.video.captions ? (
              <track
                kind="captions"
                srcLang="en"
                label="English"
                src={article.video.captions}
                default
              />
            ) : null}
            Your browser cannot play this video.{" "}
            <a href={article.video.src}>Download it here.</a>
          </video>
          <figcaption className="mt-3 text-center text-sm text-[var(--heading)]/50">
            {article.video.title} · {article.video.durationSeconds} seconds
          </figcaption>
        </figure>
        ) : null}
      {segments.map((segment, index) => {
        if (segment.kind === "tool" && article.tool) {
          return <ArticleToolSection key="tool" tool={article.tool} articleSlug={article.slug} />;
        }
        if (segment.kind === "chart") {
          const chart = charts.get(segment.id);
          return chart ? <ArticleChart key={`chart-${chart.id}`} chart={chart} /> : null;
        }
        if (segment.kind === "md") {
          return (
            <div key={`md-${index}`} className="prose-lfp">
              <ReactMarkdown>{segment.text}</ReactMarkdown>
            </div>
          );
        }
        return null;
      })}
      {!article.tool && article.form ? (
        <section className="not-prose my-12" id="talk">
          <ArticleLeadForm
            heading={article.form.heading}
            lead={article.form.lead}
            interest={article.form.interest}
            industry={article.form.industry}
            articleSlug={article.slug}
            toolSlug=""
          />
        </section>
      ) : null}
      {article.faq?.length ? (
        <section className="not-prose mt-12">
          <h2 className="text-[26px] font-extrabold leading-tight text-[var(--text)]">
            Questions people actually ask
          </h2>
          <div className="mt-5 grid gap-3">
            {article.faq.map((f) => (
              <details
                key={f.q}
                className="rounded-xl border border-[var(--line)] bg-[var(--fill-1)] p-4"
              >
                <summary className="cursor-pointer text-[16px] font-semibold text-[var(--text)]">
                  {f.q}
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--quiet)]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
      {(() => {
        const Chart = ARTICLE_CHARTS[article.slug];
        return Chart ? (
          <div className="mt-10">
            <Chart />
          </div>
        ) : null;
      })()}
      {article.sources?.length ? (
        <section className="not-prose mt-12 rounded-2xl border border-[var(--line)] bg-[var(--fill-1)] p-5">
          <h2 className="text-[18px] font-extrabold text-[var(--text)]">Where these numbers come from</h2>
          <ul className="mt-3 grid gap-2">
            {article.sources.map((source) => (
              <li key={source.url} className="text-[14.5px] leading-relaxed text-[var(--quiet)]">
                <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-[var(--blue)] underline">
                  {source.label}
                </a>{" "}
                <span className="text-[var(--muted)]">({source.date})</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-[var(--muted)]">
            Our own figures come from the lead records of businesses we run systems for, counted in total and never by name.
          </p>
        </section>
      ) : null}
      {related.length ? (
        <nav aria-label="Related guides" className="not-prose mt-12">
          <h2 className="text-[22px] font-extrabold leading-tight text-[var(--text)]">Keep reading</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((item: Article) => (
              <li key={item.slug}>
                <Link
                  href={`/articles/${item.slug}`}
                  className="block h-full rounded-xl border border-[var(--line)] bg-[var(--fill-1)] p-4 hover:border-[var(--accent-line)]"
                >
                  <span className="block text-[15px] font-bold leading-snug text-[var(--text)]">{item.title}</span>
                  <span className="mt-2 block text-[13px] leading-relaxed text-[var(--quiet)]">
                    {item.description.length > 110 ? `${item.description.slice(0, 107).trimEnd()}...` : item.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      </article>
      {article.tool ? <FinalCta
        eyebrow="Your next move"
        title="Put this guide to work."
        body="Use the free tool, save what you make, and share the guide with someone who can use it. Have a question or a result to tell us about? Send Ryan a message through Contact."
        primary={{ href: `/tools/${article.tool.slug}`, label: "Use the free tool" }}
        secondary={relatedKit
          ? { href: `/tools/pro/${relatedKit.slug}`, label: `See the $${relatedKit.pro.priceUsd} kit` }
          : { href: "/contact", label: "Tell us what you built" }}
      /> : <FinalCta
        eyebrow="Put this to work"
        title="Get the website that catches these leads."
        body="Start with a five-page website built in accounts you own, or call and talk it through with the person who builds them."
        primary={{ href: "/services", label: "See what we build" }}
        secondary={{ href: BUSINESS.phone.tel, label: `Call or text ${BUSINESS.phone.display}`, external: true }}
      />}
    </main>
  );
}
