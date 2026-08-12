import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import RentVsOwnChart from "@/components/charts/RentVsOwnChart";
import FollowUpSpeedChart from "@/components/charts/FollowUpSpeedChart";

// Proof charts matched to the articles they back up.
const ARTICLE_CHARTS: Record<string, React.ComponentType> = {
  "cost-of-renting-business-software": RentVsOwnChart,
  "website-builder-monthly-fees": RentVsOwnChart,
  "small-business-website-cost": RentVsOwnChart,
  "the-money-is-in-the-follow-up": FollowUpSpeedChart,
  "missed-calls-cost-customers": FollowUpSpeedChart,
  "website-traffic-but-no-customers": FollowUpSpeedChart,
};
import { ArrowRight } from "lucide-react";
import { ARTICLES, getArticle } from "@/lib/articles";

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
      images: [{ url: article.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
      images: [article.ogImage],
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
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    author: { "@type": "Person", name: "Ryan Nichols" },
    publisher: { "@type": "Organization", name: "The LeadFlow Pro" },
    mainEntityOfPage: `${SITE}/articles/${article.slug}`,
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
  const jsonLd = videoLd ? [articleLd, videoLd] : articleLd;

  return (
    <main className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <span className="eyebrow">
        {new Date(article.publishedAt + "T00:00:00").toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}{" "}
        · {article.readingMinutes} min read · Ryan Nichols
      </span>
      <h1>{article.title}</h1>
      {article.video ? (
        <figure className="mt-8 flex flex-col items-center">
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
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={article.ogImage}
          alt={article.title}
          className="mt-8 aspect-[1200/630] w-full rounded-2xl border border-[var(--line-strong)] object-cover shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
        />
      )}
      <div className="prose-lfp">
        <ReactMarkdown>{article.body}</ReactMarkdown>
      </div>
      {(() => {
        const Chart = ARTICLE_CHARTS[article.slug];
        return Chart ? (
          <div className="mt-10">
            <Chart />
          </div>
        ) : null;
      })()}
      <div className="final-cta portfolio-cta">
        <div>
          <span className="eyebrow">Put this to work</span>
          <h2>Map your system before you buy anything.</h2>
          <p>
            Answer a few questions about the problem, the home base, and the sales
            channels. You see the diagnosis and the recommended build before we ever ask
            who you are.
          </p>
        </div>
        <div>
          <Link className="button-primary" href="/start">
            Map My System
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link className="button-secondary" href="/articles">
            More Articles
          </Link>
        </div>
      </div>
    </main>
  );
}
