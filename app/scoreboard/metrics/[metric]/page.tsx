import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SCOREBOARD_BUSINESSES, formatCount } from "@/lib/scoreboard";
import { fetchScoreboardDays } from "@/lib/scoreboardFeeds";
import { aggregateMetric, feedObservationLabel, METRIC_GUIDES, metricDefinition, metricGuide, SOURCE_NOTES, tracksMetric } from "@/lib/scoreboardMetrics";
import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import MetricChart from "../../MetricChart";
import styles from "../../scoreboard.module.css";

export const revalidate = 900;
export function generateStaticParams() { return METRIC_GUIDES.map(({ slug }) => ({ metric: slug })); }
export async function generateMetadata({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  const guide = metricGuide(metric);
  if (!guide) return {};
  const path = `/scoreboard/metrics/${guide.slug}`;
  const title = `${guide.title} | LeadFlow Scoreboard`;
  const description = `See recorded ${guide.title.toLowerCase()} across the public business boards, daily trends, source definitions, and practical ways to improve the next step.`;
  return withPublicPageMetadata(path, { title, description, alternates: { canonical: `https://www.theleadflowpro.com${path}` } });
}

export default async function MetricDetailPage({ params }: { params: Promise<{ metric: string }> }) {
  const { metric: slug } = await params;
  const guide = metricGuide(slug);
  if (!guide) notFound();
  const definition = metricDefinition(guide.key);
  const feeds = await Promise.all(SCOREBOARD_BUSINESSES.map(async (business) => ({ business, result: await fetchScoreboardDays(business, 30) })));
  const rollup = aggregateMetric(feeds, guide.key);
  return <main className={styles.page}>
    <section className={styles.hero}><div className={styles.shell}>
      <Link href="/scoreboard#legend" className={styles.aboutLink}><ArrowLeft aria-hidden="true" /> All scoreboard metrics</Link>
      <p className={styles.eyebrow} style={{ marginTop: 24 }}>Follow the numbers</p>
      <h1>{guide.title}.<br /><em>See the next step.</em></h1>
      <p className={styles.lead}>{definition.what}</p>
      <div className={styles.metricSummary}>
        {[{ days: 1, label: "Today, so far" }, { days: 7, label: "Last 7 days" }, { days: 30, label: "Last 30 days" }].map(({ days, label }) => {
          const sum = aggregateMetric(feeds, guide.key, days);
          return <div key={days}><span>{label}</span><strong>{sum.total === null ? "Unavailable" : formatCount(sum.total)}</strong><small>{sum.reporting} of {sum.expected} measured feeds{!sum.complete && sum.reporting > 0 ? " · partial" : ""}</small></div>;
        })}
      </div>
      <p className={styles.heroNote}>Counts are added across businesses. They are not unique people, qualified customers, or a conversion rate. Today is still in progress.</p>
    </div></section>

    <section className={styles.board}><div className={styles.shell}>
      <div className={styles.boardPanel}>
        <div className={styles.chartHead}><div><p>Daily activity · last 30 Central days</p><h2 className={styles.metricHeading}>{guide.title} over time</h2></div><span className={styles.metricCoverage}>{rollup.complete ? "All measured feeds available" : "Some measured feeds unavailable"}</span></div>
        <MetricChart points={rollup.series} label={guide.title} />
        <p className={styles.chartNote}>An empty-height bar means the feed reported zero. Unavailable feeds are excluded from the entire chart window; missing records are never filled with made-up zeros. Each metric has its own scale.</p>
        <details className={styles.dailyValues}><summary>Read the daily numbers</summary><div className={styles.dailyTable}><table><thead><tr><th scope="col">Central date</th><th scope="col">{guide.title}</th></tr></thead><tbody>{rollup.series.map(({ day, value }) => <tr key={day}><th scope="row">{day}</th><td>{value === null ? "Unavailable" : formatCount(value)}</td></tr>)}</tbody></table></div></details>
      </div>
      <p className={styles.boardFoot}>Feeds are checked for refreshed counts every 15 minutes when these pages are requested. Observation times below come from the upstream response, not the moment this page was drawn.</p>
    </div></section>

    <section className={styles.about}><div className={styles.shell}>
      <p className={styles.eyebrow}>Read the sources</p><h2 className={styles.detailTitle}>What each business contributes.</h2>
      <p className={styles.boardFoot}>These are different businesses with different tracking setups. Read the definitions before comparing them or treating a combined count as a performance benchmark.</p>
      <div className={styles.sourceGrid}>{feeds.map(({ business, result }) => {
        const source = rollup.sources.find((item) => item.business.slug === business.slug);
        const supported = tracksMetric(business, guide.key);
        return <article className={styles.sourceCard} key={business.slug}>
          <div className={styles.cardIdentity}><Image src={business.logo} alt="" aria-hidden="true" width={64} height={64} className={styles.businessLogo} /><h3>{business.name}</h3></div>
          <strong className={styles.sourceValue}>{!supported ? "Not tracked" : source ? formatCount(source.total) : "Unavailable"}</strong>
          <small>Last 30 days · {result.ok ? feedObservationLabel(result.fetchedAt) : "Feed could not be read"}</small>
          <p>{SOURCE_NOTES[business.slug]?.[guide.key]}</p>
          <Link className={styles.aboutLink} href={`/scoreboard/${business.slug}`}>Open this business board <ArrowRight aria-hidden="true" /></Link>
        </article>;
      })}</div>
    </div></section>

    <section className={styles.legend}><div className={styles.shell}>
      <p className={styles.eyebrow}>Put it to work</p><h2>{guide.question}</h2>
      <div className={styles.improvementGrid}><div><ol className={styles.nextSteps}>{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className={styles.chartNote}>Use the count to choose what to check. A higher activity count alone does not prove more sales.</p></div><div className={styles.promptPanel}><h3>Use this prompt</h3><p>Copy it into your AI tool and replace the brackets with your facts.</p><pre>{guide.prompt}</pre></div></div>
      <div className={styles.resourceLinks}>
        <Link href={`/articles/${guide.article.slug}`}><span>Read the practical guide</span><strong>{guide.article.title}</strong><ArrowRight aria-hidden="true" /></Link>
        <Link href={`/tools/${guide.tool.slug}`}><span>Try a free tool</span><strong>{guide.tool.title}</strong><ArrowRight aria-hidden="true" /></Link>
        <Link href={definition.move.href}><span>Get help with the work</span><strong>{definition.move.label}</strong><ArrowRight aria-hidden="true" /></Link>
      </div>
      <nav className={styles.metricNav} aria-label="Other scoreboard metrics">{METRIC_GUIDES.filter((item) => item.key !== guide.key).map((item) => <Link key={item.key} href={`/scoreboard/metrics/${item.slug}`}>{item.title}</Link>)}</nav>
    </div></section>
  </main>;
}
