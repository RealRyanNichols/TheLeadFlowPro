import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import RentVsOwnChart from "@/components/charts/RentVsOwnChart";
import FollowUpSpeedChart from "@/components/charts/FollowUpSpeedChart";
import FinalCta from "@/components/site/system/FinalCta";
import SiteHero from "@/components/site/system/SiteHero";

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
import { ARTICLES, getArticle } from "@/lib/articles";
import {
  articlePremiumArtAlt,
  articlePremiumArtPath,
  articleSocialImagePath,
  articleVisualHeadline,
} from "@/lib/articles-og";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  const socialImage = articleSocialImagePath(article.slug);
  return {
    title: `${article.title} | The LeadFlow Pro`,
    description: article.description,
    alternates: { canonical: `https://www.theleadflowpro.com/articles/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      type: "article",
      publishedTime: article.publishedAt,
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
  const socialImage = articleSocialImagePath(article.slug);
  const premiumArt = articlePremiumArtPath(article.slug);
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    author: { "@type": "Person", name: "Ryan Nichols" },
    publisher: { "@type": "Organization", name: "The LeadFlow Pro" },
    mainEntityOfPage: `${SITE}/articles/${article.slug}`,
    image: `${SITE}${socialImage}`,
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
  // A tool article teaches a repeatable calculation, so it emits HowTo. That is
  // what earns the step-by-step rich result for "how do I work out X".
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

  const graph = [articleLd, videoLd, howToLd, faqLd].filter(Boolean);
  const jsonLd = graph.length === 1 ? graph[0] : graph;

  // {{TOOL}} on its own line marks where the tool belongs inside the argument.
  // Without a marker the tool goes after the body rather than disappearing.
  const [bodyBefore, bodyAfter] = article.tool
    ? (() => {
        const parts = article.body.split(/^\s*\{\{TOOL\}\}\s*$/m);
        return parts.length > 1 ? [parts[0], parts.slice(1).join("")] : [article.body, ""];
      })()
    : [article.body, ""];

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
          trustLine={`${new Date(article.publishedAt + "T00:00:00").toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })} · ${article.readingMinutes} min read · Ryan Nichols`}
        />
      </div>

      <article className="sv-article-shell">
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
      <div className="prose-lfp">
        <ReactMarkdown>{bodyBefore}</ReactMarkdown>
      </div>
      {article.tool ? (
        <ArticleToolSection tool={article.tool} articleSlug={article.slug} />
      ) : null}
      {bodyAfter.trim() ? (
        <div className="prose-lfp">
          <ReactMarkdown>{bodyAfter}</ReactMarkdown>
        </div>
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
                <summary className="cursor-pointer text-[15px] font-semibold text-[var(--text)]">
                  {f.q}
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--quiet)]">{f.a}</p>
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
      </article>
      <FinalCta
        eyebrow="Put this to work"
        title="Map the system before you buy another disconnected tool."
        body="See the diagnosis and the recommended first release before you send contact information."
        primary={{ href: "/start", label: "Map My System" }}
        secondary={{ href: "/articles", label: "More articles" }}
      />
    </main>
  );
}
