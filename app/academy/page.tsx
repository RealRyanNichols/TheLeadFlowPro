import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Check, LockKeyhole, Trophy } from "lucide-react";
import {
  OPERATOR_ACADEMY,
  OPERATOR_ACADEMY_COURSES,
  formatAcademyPrice,
} from "@/lib/operatorAcademyCatalog";
import { academyItemListJsonLd } from "@/lib/courseSeo";
import { AcademyCheckoutForm, AcademyFreeAccessForm } from "./AcademyActions";
import styles from "./academy.module.css";

export const metadata = {
  title: "The LeadFlow Operator Academy | Ten courses, two free | The LeadFlow Pro",
  description: OPERATOR_ACADEMY.promise,
  alternates: { canonical: "https://www.theleadflowpro.com/academy" },
  openGraph: {
    title: "The LeadFlow Operator Academy",
    description: OPERATOR_ACADEMY.promise,
    url: "https://www.theleadflowpro.com/academy",
    type: "website",
  },
};

export default function AcademyPage() {
  const freeCourses = OPERATOR_ACADEMY_COURSES.filter((course) => course.isFree);
  const paidCourses = OPERATOR_ACADEMY_COURSES.filter((course) => !course.isFree);
  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(academyItemListJsonLd()) }}
      />
      <section className={styles.hero}>
        <div className={styles.shell}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>The LeadFlow Operator Academy</p>
            <h1>You can learn this. Start with one useful task.</h1>
            <p className={styles.lead}>{OPERATOR_ACADEMY.promise}</p>
            <div className={styles.heroActions}>
              <a href="#free-access">Start with two free courses <ArrowRight aria-hidden="true" /></a>
              <a href="#pricing">See all-access <BookOpenCheck aria-hidden="true" /></a>
            </div>
            <p className={styles.trust}>Ten courses. Eighty-eight written lessons. Read at your own pace, try the examples, and use the downloadable workbooks to build something useful. No technical background required to start.</p>
          </div>
          <figure className={styles.heroMedia}>
            <Image src="/images/academy/operator-academy-hero.png" alt="A focused business operator reviewing a workflow beside a laptop and workbook" width={1672} height={941} priority />
            <figcaption>Use AI as a workbench, then review the work like an operator.</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.courseSection} id="courses">
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <div><p className={styles.eyebrow}>Ten-course path</p><h2>Learn in the order the business gets built.</h2></div>
            <p>Every course creates an asset that becomes an input to the next course. Read the lesson, do the task, then check your work. Your progress stays in your private training record.</p>
          </div>
          <div className={styles.courseGrid}>
            {OPERATOR_ACADEMY_COURSES.map((course) => (
              <article key={course.slug} className={styles.courseCard}>
                <div className={styles.cardTop}><span>{course.code}</span><span className={course.isFree ? styles.free : styles.paid}>{course.isFree ? "Free with signup" : "Paid"}</span></div>
                <p className={styles.level}>{course.level}</p>
                <h3>{course.shortTitle}</h3>
                <p>{course.description}</p>
                <div className={styles.cardBottom}>
                  <span>{course.lessons.length || 12} lessons</span>
                  {course.isFree ? <a href="#free-access">Unlock free <ArrowRight aria-hidden="true" /></a> : <a href="#pricing">View access <LockKeyhole aria-hidden="true" /></a>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.freeSection} id="free-access">
        <div className={styles.shell}>
          <div className={styles.freeGrid}>
            <div>
              <p className={styles.eyebrow}>Start free</p>
              <h2>Get two useful courses before you buy anything.</h2>
              <p>The free path gives you the offer foundation and the lead-capture system. You will leave with a bounded offer, lead magnet, form, consent plan, thank-you path, lead record map, quizzes, and capstones.</p>
              <ul>
                {freeCourses.map((course) => <li key={course.slug}><Check aria-hidden="true" /><span><strong>{course.shortTitle}</strong><br />{course.description}</span></li>)}
              </ul>
            </div>
            <AcademyFreeAccessForm />
          </div>
        </div>
      </section>

      <section className={styles.pricing} id="pricing">
        <div className={styles.shell}>
          <div className={styles.priceCard}>
            <div>
              <p className={styles.eyebrow}>Founding all-access</p>
              <h2>Build the full system.</h2>
              <p>One payment unlocks all ten self-guided written courses, their workbooks, lesson checks, and completion paths. Start with the skill your business needs today.</p>
              <ul>
                {paidCourses.map((course) => <li key={course.slug}><Check aria-hidden="true" />{course.shortTitle}</li>)}
              </ul>
            </div>
            <div className={styles.priceBox}>
              <Trophy aria-hidden="true" />
              <p>Regular price {formatAcademyPrice(OPERATOR_ACADEMY.regularPriceCents)}</p>
              <strong>{formatAcademyPrice(OPERATOR_ACADEMY.foundingPriceCents)}</strong>
              <span>one-time founding access</span>
              <AcademyCheckoutForm />
              <small>Use the same email at checkout and login. Secure checkout is hosted by Stripe. Completion credentials are private course records, not degrees, licenses, accreditation, or guarantees.</small>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.standard}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}><div><p className={styles.eyebrow}>The course standard</p><h2>Every course is built for action.</h2></div></div>
          <div className={styles.standardGrid}>
            {["Written lesson and real example", "Exact prompt or operator template", "Step-by-step written instruction", "Practice task and downloadable workbook", "Objective lesson check at 80 percent", "Final assessment and capstone", "Submission and review for major builds", "Private progress and completion record"].map((item) => <div key={item}><BookOpenCheck aria-hidden="true" /><span>{item}</span></div>)}
          </div>
          <p className={styles.finalLink}>Already enrolled? <Link href="/login?next=/training">Log in and continue training <ArrowRight aria-hidden="true" /></Link></p>
        </div>
      </section>
    </main>
  );
}
