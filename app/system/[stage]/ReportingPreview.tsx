import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MetricChart from "@/app/scoreboard/MetricChart";
import { SCOREBOARD_BUSINESSES, formatCount, summarizeWindow } from "@/lib/scoreboard";
import { fetchScoreboardDays } from "@/lib/scoreboardFeeds";
import { feedObservationLabel } from "@/lib/scoreboardMetrics";
import styles from "./stage.module.css";

export default async function ReportingPreview() {
  const sources = await Promise.all(SCOREBOARD_BUSINESSES.filter((b) => b.slug !== "the-leadflow-pro").map(async (business) => ({ business, result: await fetchScoreboardDays(business, 30) })));
  return <div className={styles.reportingPreview}>
    <p className={styles.kicker}>Actual business records · Last 30 days</p>
    <h3>See the activity. Then decide the next move.</h3>
    <div className={styles.reportingGrid}>
      {sources.map(({ business, result }) => {
        const totals = result.ok ? summarizeWindow(result.days, 30) : null;
        return <article key={business.slug}>
          <div className={styles.reportingBrand}><Image src={business.logo} alt="" width={44} height={44} /><strong>{business.name}</strong></div>
          {totals && result.ok ? <>
            <dl><div><dt>Page views</dt><dd>{formatCount(totals.views)}</dd></div><div><dt>Lead records</dt><dd>{formatCount(totals.leads)}</dd></div></dl>
            <MetricChart points={result.days.map((day) => ({ day: day.day, value: day.leads }))} label={`${business.shortName} lead records`} compact />
            <small>Daily lead records · {feedObservationLabel(result.fetchedAt)}</small>
          </> : <p>The feed is unavailable right now. We show no substitute numbers.</p>}
          <Link href={`/scoreboard/${business.slug}`}>Open the full business board <ArrowRight size={17} aria-hidden="true" /></Link>
        </article>;
      })}
    </div>
    <p className={styles.reportingNote}>Page loads and contact records are not unique customers or revenue. Each source has its own filters; the business boards explain them. Charts use separate scales.</p>
  </div>;
}
