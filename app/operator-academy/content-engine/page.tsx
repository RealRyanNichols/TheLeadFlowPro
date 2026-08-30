import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  CirclePlay,
  FileText,
  Route,
  ShieldCheck,
} from "lucide-react";
import CheckoutForm from "./CheckoutForm";
import styles from "./page.module.css";
import {
  CONTENT_ENGINE,
  CONTENT_ENGINE_MODULES,
  CONTENT_ENGINE_PATHWAYS,
  formatCoursePrice,
} from "@/lib/contentEngineCourse";

export const metadata: Metadata = {
  title: "The Content Engine Course | The LeadFlow Pro",
  description:
    "Build a repeatable system for thirty video topics, ten camera ready scripts, efficient recording, and one owned path from content to action.",
  alternates: { canonical: "/operator-academy/content-engine" },
  openGraph: {
    title: "Operator Academy 02: The Content Engine",
    description: CONTENT_ENGINE.promise,
    type: "website",
  },
};

const DELIVERABLES = [
  "One clear offer and honest outcome",
  "A thirty topic content matrix",
  "Ten camera ready scripts",
  "A repeatable recording setup",
  "A fast editing checklist",
  "One owned route from every video to action",
  "Twelve lesson checks and a final assessment",
  "A private completion letter after verified completion",
];

export default function ContentEnginePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div>
              <p className={styles.eyebrow}>Operator Academy 02</p>
              <h1>Stop making random videos. Build a content engine.</h1>
              <p className={styles.lead}>{CONTENT_ENGINE.promise}</p>
              <div className={styles.proofRow}>
                <span><CirclePlay aria-hidden="true" /> 12 complete lessons</span>
                <span><FileText aria-hidden="true" /> Workbook and assignments</span>
                <span><BadgeCheck aria-hidden="true" /> Verified completion path</span>
              </div>
              <CheckoutForm />
            </div>
            <div className={styles.systemCard} aria-label="Content Engine operating loop">
              <p>THE CONTENT ENGINE</p>
              <ol>
                <li><span>01</span><strong>Plan</strong><small>Give the batch one job</small></li>
                <li><span>02</span><strong>Record</strong><small>Use one repeatable setup</small></li>
                <li><span>03</span><strong>Publish</strong><small>Send attention somewhere owned</small></li>
                <li><span>04</span><strong>Measure</strong><small>Track the signal tied to the job</small></li>
                <li><span>05</span><strong>Improve</strong><small>Use proof to shape the next batch</small></li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.valueBand}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>What you finish</p>
            <h2>A working system, not another folder of videos you never use.</h2>
          </div>
          <div className={styles.valueGrid}>
            <div className={styles.deliverables}>
              {DELIVERABLES.map((item) => (
                <div key={item}><Check aria-hidden="true" /><span>{item}</span></div>
              ))}
            </div>
            <aside className={styles.priceCard}>
              <p>Founding access</p>
              <strong>{formatCoursePrice(CONTENT_ENGINE.foundingPriceCents)}</strong>
              <span>One payment. Regular price will be {formatCoursePrice(CONTENT_ENGINE.regularPriceCents)} after the founding revision.</span>
              <a href="#enroll">Start the course <ArrowRight aria-hidden="true" /></a>
            </aside>
          </div>
        </div>
      </section>

      <section className={styles.curriculum}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Curriculum</p>
            <h2>Five modules. Twelve lessons. One operating loop.</h2>
          </div>
          <div className={styles.moduleGrid}>
            {CONTENT_ENGINE_MODULES.map((module, index) => (
              <article key={module.title}>
                <span>MODULE {String(index + 1).padStart(2, "0")}</span>
                <h3>{module.title.replace(/^Module [^:]+:\s*/, "")}</h3>
                <p>{module.result}</p>
                <ul>
                  {module.lessons.map((lesson) => <li key={lesson.code}>{lesson.title}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.boundaryBand}>
        <div className={styles.shell}>
          <div className={styles.boundaryGrid}>
            <div>
              <ShieldCheck aria-hidden="true" />
              <p className={styles.eyebrow}>Straight answer</p>
              <h2>This course teaches a production and marketing workflow. It does not sell a fantasy.</h2>
            </div>
            <div>
              <p>No guaranteed views, leads, sales, search rankings, income, jobs, or viral results.</p>
              <p>{CONTENT_ENGINE.credentialDisclaimer}</p>
              <p>{CONTENT_ENGINE.accessDisclosure}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.pathways}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>Keep going after this course</p>
            <h2>Use the system here. Pursue outside credentials only through their official issuers.</h2>
          </div>
          <div className={styles.pathwayGrid}>
            {CONTENT_ENGINE_PATHWAYS.map((pathway) => (
              <a key={pathway.title} href={pathway.href} target="_blank" rel="noreferrer">
                <BarChart3 aria-hidden="true" />
                <span>{pathway.issuer}</span>
                <h3>{pathway.title}</h3>
                <p>{pathway.detail}</p>
                <strong>Open official source <ArrowRight aria-hidden="true" /></strong>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.finalCta} id="enroll">
        <div className={styles.shell}>
          <Route aria-hidden="true" />
          <p className={styles.eyebrow}>Build the route</p>
          <h2>Your next ten videos should lead somewhere.</h2>
          <p>Start with one person, one useful promise, and one next action you can measure.</p>
          <CheckoutForm />
          <Link href="/login?next=/training/content-engine">Already purchased? Log in to continue.</Link>
        </div>
      </section>
    </main>
  );
}
