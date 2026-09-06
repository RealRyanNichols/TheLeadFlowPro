import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatCount } from "@/lib/scoreboard";
import { aggregateMetric, METRIC_GUIDES, metricDefinition, type MetricFeed } from "@/lib/scoreboardMetrics";
import MetricChart from "./MetricChart";
import styles from "./scoreboard.module.css";

export default function MetricCards({ feeds }: { feeds: readonly MetricFeed[] }) {
  return <div className={styles.legendGrid}>
    {METRIC_GUIDES.map((guide) => {
      const metric = metricDefinition(guide.key);
      const rollup = aggregateMetric(feeds, guide.key);
      return <Link href={`/scoreboard/metrics/${guide.slug}`} key={guide.key} className={`${styles.legendCard} ${styles.metricLink}`}>
        <h3>{guide.title}</h3>
        <strong className={styles.legendValue}>{rollup.expected === 0 ? "Not tracked" : rollup.total === null ? "Unavailable" : formatCount(rollup.total)}</strong>
        <span className={styles.metricCoverage}>Last 30 days{rollup.expected > 0 && <> · {rollup.reporting} of {rollup.expected} reporting feeds{!rollup.complete && rollup.reporting > 0 ? " · partial total" : ""}</>}</span>
        {rollup.expected > 0 && <MetricChart points={rollup.series} label={guide.title} compact />}
        <p>{metric.what}</p>
        {rollup.unsupported > 0 && <p className={styles.metricCoverage}>{rollup.unsupported} business feed does not measure this field.</p>}
        <span className={styles.metricAction}>See the trend and next steps <ArrowRight aria-hidden="true" /></span>
      </Link>;
    })}
  </div>;
}
