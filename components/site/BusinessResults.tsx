import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { RESULTS_PROOF } from "@/lib/site/resultsProof";
import styles from "./business-results.module.css";

export default function BusinessResults() {
  const { scott, premier, luke } = RESULTS_PROOF;
  const latest = premier.months[1];
  return (
    <section id="results" className={styles.section} aria-labelledby="business-results-title">
      <div className={styles.wrap}>
        <div className={styles.heading}>
          <div><p className={styles.eyebrow}>CASE BRIEFS / THE WORK &amp; THE ECONOMICS</p><h2 id="business-results-title">Different businesses.<br /><em>Results worth measuring.</em></h2></div>
          <p>Jobs. Enrollments. Client work. Three examples of what acquisition can mean when the value of the result is clear.</p>
        </div>
        <div className={styles.grid}>
          <article className={styles.card} aria-labelledby="scott-result-title">
            <div className={styles.caseHeader}><span>CASE 01</span><span>CONTRACTOR</span></div>
            <div className={`${styles.image} ${styles.artwork}`}><Image src={scott.image} alt={scott.imageAlt} width={1672} height={941} sizes="(max-width: 800px) 94vw, 30vw" /></div>
            <div className={styles.body}>
              <h3 id="scott-result-title">{scott.business}</h3>
              <p className={styles.situation}><span>SITUATION</span>{scott.situation}</p>
              <div className={styles.economics}><div><span>{scott.costLabel}</span><strong>{scott.cost}</strong></div><ArrowRight aria-hidden="true" size={22} /><div><span>{scott.duration}</span><strong>{scott.figure}</strong></div></div>
              <p className={styles.resultLine}>Win work worth taking on.</p>
              <p className={styles.shortNote}>{scott.costNote}</p>
              <a href="#scott-story" className={styles.button}><Play size={15} aria-hidden="true" />Watch Scott’s story<ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </article>
          <article className={styles.card} aria-labelledby="premier-result-title">
            <div className={styles.caseHeader}><span>CASE 02</span><span>EDUCATION</span></div>
            <div className={`${styles.image} ${styles.artwork}`}><Image src={premier.image} alt={premier.imageAlt} width={1672} height={941} sizes="(max-width: 800px) 94vw, 30vw" /></div>
            <div className={styles.body}>
              <h3 id="premier-result-title">{premier.business}</h3>
              <p className={styles.situation}><span>SITUATION</span>{premier.situation}</p>
              <div className={styles.economics}><div><span>Acquisition / enrollment</span><strong>{premier.cost}</strong></div><ArrowRight aria-hidden="true" size={22} /><div><span>Tuition / enrollment</span><strong>{premier.value}</strong></div></div>
              <p className={styles.resultLine}><strong>{premier.ratio}</strong> tuition value / acquisition spend</p>
              <p className={styles.shortNote}>Calculated from approximate campaign figures. Tuition value is not profit or a guaranteed return.</p>
              <Link href="/premier-system" className={styles.button}>Explore the Premier story<ArrowRight size={16} aria-hidden="true" /></Link>
            </div>
          </article>
          <article className={styles.card} aria-labelledby="luke-result-title">
            <div className={styles.caseHeader}><span>CASE 03</span><span>PROFESSIONAL SERVICES</span></div>
            <div className={styles.lukeArtwork}><div className={styles.lukeArtCopy}><span>TAX-SERVICE CAMPAIGN</span><strong>HIGH-VALUE<br />CLIENT WORK.</strong><small>Luke’s story. His numbers.</small></div><div className={styles.lukePortrait}><img src={luke.image} alt={luke.imageAlt} width={204} height={360} loading="lazy" /></div></div>
            <div className={styles.body}>
              <h3 id="luke-result-title">{luke.business}<span className={styles.caseSubtitle}>Tax-service campaign</span></h3>
              <p className={styles.situation}><span>SITUATION</span>{luke.situation}</p>
              <div className={styles.economics}><div><span>Normalized ad spend</span><strong>{luke.cost}</strong></div><ArrowRight aria-hidden="true" size={22} /><div><span>Revenue benchmark</span><strong>{luke.value}</strong></div></div>
              <p className={styles.resultLine}><strong>{luke.ratio}</strong> revenue / ad spend<span className={styles.originalNumbers}>{luke.originalNumbers}</span></p>
              <p className={styles.shortNote}>{luke.costNote}</p>
              <a href="#luke-story" className={styles.button}><Play size={15} aria-hidden="true" />Watch Luke’s story<ArrowRight size={16} aria-hidden="true" /></a>
            </div>
          </article>
        </div>
        <div className={styles.collections}>
          <div><p className={styles.eyebrow}>PREMIER / PAYMENT RECORDS</p><h3>What the collections show</h3><p>Completed Square collections, separate from the campaign economics above.</p></div>
          <div className={styles.collectionNumbers}><span>August 2026<strong>{premier.months[0].display}</strong></span><ArrowRight size={20} aria-hidden="true" /><span>September 2026<strong>{latest.display}</strong></span><span className={styles.increase}>{premier.increase}<small>vs. August</small></span></div>
          <p className={styles.payers}><strong>{premier.months[0].firstPayers} → {latest.firstPayers}</strong> first recorded tuition payers in Square, August to September.</p>
        </div>
        <div className={styles.method}>
          <p className={styles.footnote}>Individual examples, not a promise of future results. Campaign figures are approximate reports or calculations; Square collections are a separate records-based measure. Equipment and classroom visuals are custom illustrations. Records reviewed {premier.asOf}.</p>
          <details>
            <summary>Sources, calculations &amp; counting notes<span aria-hidden="true">+</span></summary>
            <div className={styles.detailsGrid}>
              <div><h3>01 / Scott’s campaign</h3><p>{scott.disclosure}</p><a href="#scott-story" className={styles.sourceLink}>Source: Scott’s full interview</a></div>
              <div><h3>02 / Premier’s economics</h3><p>{premier.economicsNote}</p><p>{premier.ownership}</p><h3>Payment records, with context</h3><p>August 1–31 and September 1–30, 2026, Central time. Collections count completed payments at the school’s Square location, net of recorded refunds and before processing fees. Neither month had recorded refunds. Includes installments and other recorded payments. These figures are not profit, bank settlement, new enrollment totals or evidence that advertising caused the change.</p><p>{premier.unmatchedContext}</p><p>{premier.julyContext}</p><h3>People are counted once</h3><p>The tuition-payer count matches payment email addresses to enrolled student records and counts each student once at their first matched completed Square payment. All counted first payments were labeled tuition or program payments. Earlier cash or other off-platform payments may exist, so this is not a first-ever enrollment count.</p></div>
              <div><h3>03 / Luke’s historical campaign</h3><p>{luke.disclosure}</p><a href="#luke-story" className={styles.sourceLink}>Source: Luke’s testimonial</a></div>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
