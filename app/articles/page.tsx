import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ARTICLES } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Articles | The LeadFlow Pro",
  description:
    "Practical writing on lead flow, follow-up, marketplaces, and owned business systems from The LeadFlow Pro.",
  alternates: { canonical: "https://www.theleadflowpro.com/articles" },
};

export default function ArticlesPage() {
  const articles = [...ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return (
    <main>
      <section className="page-hero page-hero-centered">
        <span className="eyebrow">Articles</span>
        <h1>Straight answers about lead flow and ownership.</h1>
        <p>
          No filler. Each article covers one problem we actually fix: catching leads,
          connecting channels, and building systems in accounts you control.
        </p>
      </section>
      <section className="section-shell pricing-shell">
        <div className="work-grid">
          {articles.map((a) => (
            <Link key={a.slug} href={`/articles/${a.slug}`} className="work-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.ogImage}
                alt=""
                loading="lazy"
                className="mb-4 aspect-[1200/630] w-full rounded-xl border border-[var(--line-strong)] object-cover"
              />
              <span>
                {new Date(a.publishedAt + "T00:00:00").toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · {a.readingMinutes} min read
                {a.video ? ` · Watch ${a.video.durationSeconds}s` : ""}
              </span>
              <h2>{a.title}</h2>
              <p>{a.description}</p>
              <small>
                Read the article <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </small>
            </Link>
          ))}
        </div>
        <div className="final-cta portfolio-cta">
          <div>
            <span className="eyebrow">Reading is free. So is the map.</span>
            <h2>See the system that fits your business.</h2>
            <p>
              The guided map asks about your problem, your home base, and your sales
              channels, then shows the recommended build before asking who you are.
            </p>
          </div>
          <div>
            <Link className="button-primary" href="/start">
              Map My System
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
