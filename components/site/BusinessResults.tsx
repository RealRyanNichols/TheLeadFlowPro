import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { RESULTS_PROOF } from "@/lib/site/resultsProof";
import styles from "./business-results.module.css";

export default function BusinessResults() {
  const { scott, premier } = RESULTS_PROOF;
  const latest = premier.months[1];
  return (
    <section id="results" className={styles.section} aria-labelledby="business-results-title">
      <div className={styles.wrap}>
        <div className={styles.heading}>
          <div><p className={styles.eyebrow}>THE WORK BEHIND THE NUMBERS</p><h2 id="business-results-title">A project won.<br /><em>Tuition paid.</em></h2></div>
          <p>For a contractor, the result is work worth taking on. For a school, it is people paying to learn. Here are two businesses and what their records and stories show.</p>
        </div>
        <div className={styles.grid}>
          <article className={styles.card} aria-labelledby="scott-result-title">
            <div className={styles.image}>
              <Image src={scott.image} alt={scott.imageAlt} width={1280} height={720} sizes="(max-width: 800px) 94vw, 46vw" />
              <span className={styles.imageLabel}>CONTRACTOR / {scott.business}</span>
            </div>
            <div className={styles.body}>
              <p className={styles.eyebrow}>{scott.label}</p>
              <h3 id="scott-result-title" className={styles.scottFigure}>{scott.figure}</h3>
              <p className={styles.resultSubtitle}>{scott.duration}</p>
              <p className={styles.description}>{scott.summary}</p>
              <a href="#scott-story" className={styles.button}><Play size={16} aria-hidden="true" />Watch Scott’s full story<ArrowRight size={17} aria-hidden="true" /></a>
              <p className={styles.shortNote}>One client’s reported experience. Project value is not profit.</p>
            </div>
          </article>
          <article className={styles.card} aria-labelledby="premier-result-title">
            <div className={styles.image}>
              <Image src={premier.image} alt={premier.imageAlt} width={1000} height={750} sizes="(max-width: 800px) 94vw, 46vw" />
              <span className={styles.imageLabel}>EDUCATION / {premier.business}</span>
            </div>
            <div className={styles.body}>
              <div className={styles.metricHeading}><div><p className={styles.eyebrow}>COMPLETED SQUARE COLLECTIONS</p><h3 id="premier-result-title">{latest.display}</h3></div><span className={styles.increase}>{premier.increase}<small>vs. August</small></span></div>
              <p className={styles.resultSubtitle}>September 2026</p>
              <div className={styles.comparison} role="group" aria-label="Completed Square collections by month">
                {premier.months.map(month => <div className={styles.barRow} key={month.label}><div><span>{month.label}</span><strong>{month.display}</strong></div><div className={styles.track} aria-hidden="true"><span style={{ width: `${month.cents / latest.cents * 100}%` }} /></div></div>)}
              </div>
              <p className={styles.payers}><strong>{latest.firstPayers} first recorded tuition payers in Square</strong><span>September, compared with {premier.months[0].firstPayers} in August.</span></p>
              <Link href="/premier-system" className={styles.textLink}>Explore the Premier story<ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </article>
        </div>
        <div className={styles.method}>
          <p className={styles.footnote}>PDA: August 1–31 and September 1–30, 2026, Central time. Completed Square payments net of recorded refunds, before processing fees. Includes installments and other recorded payments. Records reviewed {premier.asOf}.</p>
          <details>
            <summary>How these numbers are counted<span aria-hidden="true">+</span></summary>
            <div className={styles.detailsGrid}>
              <div><h3>Payment records, with context</h3><p>Collections count completed payments at the school’s Square location. Neither month had recorded refunds. These figures are not profit, bank settlement, new enrollment totals or evidence that advertising caused the change.</p><p>{premier.unmatchedContext}</p><p>{premier.julyContext}</p></div>
              <div><h3>People are counted once</h3><p>The tuition-payer count matches payment email addresses to enrolled student records and counts each student once at their first matched completed Square payment. All counted first payments were labeled tuition or program payments. Earlier cash or other off-platform payments may exist, so this is not a first-ever enrollment count.</p><p>{premier.ownership}</p></div>
              <div><h3>Scott’s own account</h3><p>{scott.disclosure}</p><p>We have not independently verified a cost per acquired job or return on ad spend from his recollections. Individual outcomes are not a promise of results for another business.</p></div>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
