import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import ScoreboardBoard from "@/components/scoreboard/ScoreboardBoard";
import {
  SCOREBOARD_BUSINESSES,
  SCOREBOARD_METRICS,
  buildWindows,
  recentSeries,
  scoreboardBusiness,
} from "@/lib/scoreboard";
import { fetchScoreboardDays } from "@/lib/scoreboardFeeds";
import styles from "../scoreboard.module.css";

export const revalidate = 900;

export function generateStaticParams() {
  return SCOREBOARD_BUSINESSES.map((business) => ({ business: business.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ business: string }> }) {
  const { business: slug } = await params;
  const business = scoreboardBusiness(slug);
  if (!business) return { title: "Scoreboard | The LeadFlow Pro" };
  const title = `${business.name} Scoreboard | Views, clicks and leads, live | The LeadFlow Pro`;
  const description = `Live scoreboard for ${business.name}: views, clicks, leads, paid leads and unpaid leads, rolling daily from its own records. ${business.what}`;
  return {
    title,
    description,
    alternates: { canonical: `https://www.theleadflowpro.com/scoreboard/${business.slug}` },
    openGraph: {
      title,
      description,
      url: `https://www.theleadflowpro.com/scoreboard/${business.slug}`,
      type: "website",
    },
  };
}

function updatedLabel(fetchedAt: string) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(fetchedAt));
  return `Refreshed ${formatted}.`;
}

export default async function BusinessScoreboardPage({
  params,
}: {
  params: Promise<{ business: string }>;
}) {
  const { business: slug } = await params;
  const business = scoreboardBusiness(slug);
  if (!business) notFound();

  const result = await fetchScoreboardDays(business, 90);
  const windows = result.ok ? buildWindows(result.days) : null;
  const series = result.ok ? recentSeries(result.days, 30) : null;
  const others = SCOREBOARD_BUSINESSES.filter((item) => item.slug !== business.slug);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <Link href="/scoreboard" className={styles.aboutLink} style={{ color: "#6df4e8" }}>
            <ArrowLeft aria-hidden="true" /> All boards
          </Link>
          <div className={styles.heroRow}>
            <div>
              <p className={styles.eyebrow} style={{ marginTop: 18 }}>Scoreboard</p>
              <h1>{business.name}</h1>
              <p className={styles.lead}>{business.what}</p>
              <div className={styles.heroActions}>
                <a href={business.url} target="_blank" rel="noopener noreferrer">
                  Visit the site <ExternalLink aria-hidden="true" />
                </a>
                <a href="#legend">What is an unpaid lead? <ArrowRight aria-hidden="true" /></a>
              </div>
            </div>
            <div className={styles.liveBadge}>
              <p>Data source</p>
              <strong>{business.shortName}&apos;s own database</strong>
              <small>{business.town}. Aggregate counts only. Refreshes every 15 minutes.</small>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.board} aria-label={`${business.name} scoreboard`}>
        <div className={styles.shell}>
          {result.ok && windows && series ? (
            <ScoreboardBoard
              windows={windows}
              series={series}
              showSales={business.showSales}
              updatedLabel={updatedLabel(result.fetchedAt)}
            />
          ) : (
            <div className={styles.boardPanel}>
              <div className={styles.unavailable}>
                <p className={styles.eyebrow}>Feed unavailable</p>
                <p>
                  This board reads live counts from {business.shortName}&apos;s own database and that read did
                  not succeed just now. Nothing is substituted. Check back in a few minutes.
                </p>
              </div>
            </div>
          )}
          <p className={styles.boardFoot}>
            Days are counted in Central time. Views exclude our own traffic and known bots. A lead is a real
            person who left a name and a way to reach them, or called the business line. Paid means the lead
            came from an ad the business paid for. No names, contact details, or dollar figures are published
            here, ever.
          </p>
        </div>
      </section>

      <section className={styles.about} aria-labelledby="about-title">
        <div className={styles.shell}>
          <div className={styles.aboutGrid}>
            <div>
              <p className={styles.eyebrow}>The build</p>
              <h2 id="about-title">What is running behind these numbers.</h2>
              <p>{business.built}</p>
              <p>
                Every part is in accounts the business controls. If The LeadFlow Pro disappeared tomorrow,
                the site, the data, the leads, and this board would keep working.
              </p>
              <Link href="/portfolio" className={styles.aboutLink}>
                See the work <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <div>
              <p className={styles.eyebrow}>Runs on</p>
              <ul>
                {business.runsOn.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {others.length ? (
                <p style={{ marginTop: 28 }}>
                  Other boards:{" "}
                  {others.map((item, index) => (
                    <span key={item.slug}>
                      {index > 0 ? ", " : ""}
                      <Link href={`/scoreboard/${item.slug}`} className={styles.aboutLink}>
                        {item.shortName}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.legend} id="legend" aria-labelledby="legend-title">
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Read the board</p>
          <h2 id="legend-title">What each number means, and what moves it.</h2>
          <div className={styles.legendGrid}>
            {SCOREBOARD_METRICS.filter((metric) => metric.key !== "sales" || business.showSales).map((metric) => (
              <div
                key={metric.key}
                className={`${styles.legendCard} ${metric.key === "paid_leads" ? styles.paid : metric.key === "unpaid_leads" ? styles.unpaid : ""}`}
              >
                <h3>{metric.label}</h3>
                <p>{metric.what}</p>
                <Link href={metric.move.href}>
                  How we move it: {metric.move.label} <ArrowRight aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>
          <div className={styles.callout}>
            <p>
              <strong>Why unpaid leads are the number to watch.</strong> A paid lead costs money every single
              time. An unpaid lead came from something the business owns and keeps: an article that ranks, a
              free tool people share, a Google listing, a form on a page that loads fast. Build enough of
              those and the board keeps moving on the days the ad budget is off.
            </p>
            <Link href="/free-build">Build the owned side <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Your business</p>
          <h2>Want a board like this with your name on it?</h2>
          <p>
            Every build we do ships with first-party tracking in your own database, so your board is
            yours, not a screenshot of someone else&apos;s dashboard. Start with the free website or map the
            whole company first.
          </p>
          <div>
            <Link href="/free-build">Apply for the free website <ArrowRight aria-hidden="true" /></Link>
            <Link href="/start">Map my company <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
