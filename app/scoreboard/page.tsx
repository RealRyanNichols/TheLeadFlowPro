import Link from "next/link";
import { ArrowRight, Activity, Eye, PhoneCall, Users } from "lucide-react";
import {
  SCOREBOARD_BUSINESSES,
  SCOREBOARD_METRICS,
  formatCount,
  summarizeWindow,
} from "@/lib/scoreboard";
import { fetchScoreboardDays } from "@/lib/scoreboardFeeds";
import styles from "./scoreboard.module.css";

export const revalidate = 900;

const TITLE = "Scoreboard | Real views, clicks and leads per business | The LeadFlow Pro";
const DESCRIPTION =
  "One live scoreboard per business we run or built: views, clicks, leads, paid leads and unpaid leads, rolling daily. Real numbers from each business's own records, no estimates.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "https://www.theleadflowpro.com/scoreboard" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.theleadflowpro.com/scoreboard",
    type: "website",
  },
};

export default async function ScoreboardIndexPage() {
  const results = await Promise.all(
    SCOREBOARD_BUSINESSES.map(async (business) => ({
      business,
      result: await fetchScoreboardDays(business, 30),
    })),
  );

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroRow}>
            <div>
              <p className={styles.eyebrow}>The Scoreboard</p>
              <h1>What the businesses we build are actually doing. Every day.</h1>
              <p className={styles.lead}>
                Views, clicks, leads, paid leads, unpaid leads. One board per business, straight from that
                business&apos;s own records. No estimates, no samples, no dressing it up. When a number is
                low, it shows low. That is the point.
              </p>
              <div className={styles.heroActions}>
                <a href="#boards">See the boards <ArrowRight aria-hidden="true" /></a>
                <a href="#legend">What is an unpaid lead? <Activity aria-hidden="true" /></a>
              </div>
            </div>
            <div className={styles.liveBadge}>
              <p>Data source</p>
              <strong>Each business&apos;s own database</strong>
              <small>Aggregate counts only. Refreshes every 15 minutes.</small>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.boards} id="boards" aria-label="Business scoreboards">
        <div className={styles.shell}>
          <div className={styles.boardGrid}>
            {results.map(({ business, result }) => {
              const totals = result.ok ? summarizeWindow(result.days, 30) : null;
              return (
                <Link key={business.slug} href={`/scoreboard/${business.slug}`} className={styles.boardCard}>
                  <p className={styles.cardMeta}>{business.town}</p>
                  <h2>{business.name}</h2>
                  <p>{business.what}</p>
                  <div className={styles.cardStats}>
                    <div>
                      <span><Eye aria-hidden="true" size={12} /> Views, 30 days</span>
                      {totals ? <strong>{formatCount(totals.views)}</strong> : <strong className={styles.unavailable}>Unavailable</strong>}
                    </div>
                    <div>
                      <span><Users aria-hidden="true" size={12} /> Leads, 30 days</span>
                      {totals ? <strong>{formatCount(totals.leads)}</strong> : <strong className={styles.unavailable}>Unavailable</strong>}
                    </div>
                    <div>
                      <span><PhoneCall aria-hidden="true" size={12} /> Unpaid leads</span>
                      {totals ? <strong>{formatCount(totals.unpaid_leads)}</strong> : <strong className={styles.unavailable}>Unavailable</strong>}
                    </div>
                  </div>
                  <div className={styles.cardFoot}>
                    <span>Open the board</span>
                    <ArrowRight aria-hidden="true" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.legend} id="legend" aria-labelledby="legend-title">
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Read the board</p>
          <h2 id="legend-title">What each number means, and what moves it.</h2>
          <div className={styles.legendGrid}>
            {SCOREBOARD_METRICS.filter((metric) => metric.key !== "sales").map((metric) => (
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
