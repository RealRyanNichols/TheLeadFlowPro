import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Check, LockKeyhole } from "lucide-react";
import { academyCourse } from "@/lib/operatorAcademyCatalog";
import {
  orderTrainingCourses,
  trainingCourseArtwork,
  trainingCourseHref,
  type TrainingLibraryCourse,
} from "./training-library";
import styles from "./training-library.module.css";

type Props = {
  courses: TrainingLibraryCourse[];
  signedIn: boolean;
  continueHref: string;
  freeCourseHref: string;
  loadFailed?: boolean;
};

export default function TrainingLibrary({
  courses,
  signedIn,
  continueHref,
  freeCourseHref,
  loadFailed = false,
}: Props) {
  const ordered = orderTrainingCourses(courses, signedIn);

  function courseCard(course: TrainingLibraryCourse) {
    const academy = academyCourse(course.slug);
    const artwork = trainingCourseArtwork(course.slug);
    return (
      <article
        className={styles.courseCard}
        key={course.id}
        data-course={course.slug}
      >
        <div className={styles.courseArt}>
          {artwork ? (
            <Image
              src={artwork}
              alt=""
              width={640}
              height={360}
              sizes="(max-width: 680px) calc(100vw - 40px), (max-width: 1000px) 46vw, 30vw"
            />
          ) : (
            <BookOpenCheck aria-hidden="true" className={styles.fallbackArt} />
          )}
          {academy ? (
            <span className={styles.courseNumber}>
              Course {academy.code.slice(2)}
            </span>
          ) : null}
        </div>
        <div className={styles.courseBody}>
          <p className={styles.status}>
            {course.hasAccess ? (
              <Check aria-hidden="true" />
            ) : (
              <LockKeyhole aria-hidden="true" />
            )}
            {course.is_free
              ? course.hasAccess
                ? "Free access"
                : "Free registration"
              : course.hasAccess
                ? "In your library"
                : "Access required"}
          </p>
          <h3>{academy?.shortTitle ?? course.title}</h3>
          <p>{course.description}</p>
          <Link className={styles.courseLink} href={trainingCourseHref(course)}>
            {course.hasAccess
              ? "Open course"
              : course.is_free
                ? "Start this free course"
                : academy
                  ? "View access options"
                  : "Plan a training platform"}
            <ArrowRight aria-hidden="true" />
            <span className={styles.srOnly}>
              : {academy?.shortTitle ?? course.title}
            </span>
          </Link>
        </div>
      </article>
    );
  }

  const freeCourses = ordered.filter((course) => course.is_free);
  const otherCourses = ordered.filter((course) => !course.is_free);

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="training-title">
        <div className={styles.shell}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>LeadFlow Operator Academy</p>
              <h1 id="training-title">
                Learn one thing.
                <br />
                <span>Put it to work.</span>
              </h1>
              <p className={styles.intro}>
                Write a clearer offer. Follow up with a customer. Give your
                website a useful next step. Start with a lesson you can use in
                your business.
              </p>
              <div className={styles.actions}>
                <Link className={styles.primary} href={freeCourseHref}>
                  Try a free lesson <ArrowRight aria-hidden="true" />
                </Link>
                <Link className={styles.secondary} href={continueHref}>
                  Continue my courses <BookOpenCheck aria-hidden="true" />
                </Link>
              </div>
              <p className={styles.accessHint}>
                Two free courses. Registration opens access. No card required.
              </p>
              <Link className={styles.businessLink} href="/start?goal=delivery">
                Build training for my business <ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <figure className={styles.sample} aria-labelledby="sample-title">
              <div className={styles.sampleArt}>
                <Image
                  src="/images/academy/cards/offer-engine.svg"
                  alt="A service package beside its scope checklist and price tag"
                  width={640}
                  height={360}
                  priority
                  sizes="(max-width: 900px) calc(100vw - 40px), 42vw"
                />
                <span className={styles.sampleLabel}>A sample of the work</span>
              </div>
              <figcaption className={styles.sampleCopy}>
                <p className={styles.eyebrow}>
                  From the free Offer Engine course
                </p>
                <h2 id="sample-title">
                  “We do yard work” becomes a clear starting point.
                </h2>
                <dl>
                  <div>
                    <dt>One buyer</dt>
                    <dd>An HOA board responsible for common areas.</dd>
                  </div>
                  <div>
                    <dt>One problem</dt>
                    <dd>The current mowing crew keeps missing weeks.</dd>
                  </div>
                  <div>
                    <dt>One next step</dt>
                    <dd>
                      Review the property and agree on a written mowing scope.
                    </dd>
                  </div>
                </dl>
                <p className={styles.sampleNote}>
                  Fictional practice example. Use your own work history to
                  choose a buyer you can actually help.
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section
        className={`${styles.library} ${styles.shell}`}
        id="course-library"
        aria-labelledby="library-title"
      >
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.eyebrow}>Your course library</p>
            <h2 id="library-title">
              {signedIn
                ? "Pick up your next lesson."
                : "Start free. Build from there."}
            </h2>
          </div>
          <p>
            Read the lesson, try the task, and check your work. Each course
            includes a workbook you can keep.
          </p>
        </div>
        <aside
          className={styles.accessNotice}
          aria-label="Existing course access"
        >
          <BookOpenCheck aria-hidden="true" />
          <p>
            <strong>Already enrolled?</strong> Your purchased courses and saved
            progress stay yours.{" "}
            {signedIn
              ? "Open an available course below to continue."
              : "Use the email you purchased with to log in."}{" "}
            New standalone enrollment for the legacy library is closed.
          </p>
          {!signedIn ? (
            <Link href="/login?next=/training">
              Log in <ArrowRight aria-hidden="true" />
            </Link>
          ) : null}
        </aside>
        {loadFailed ? (
          <div className={styles.emptyState} role="status">
            <h3>The course list could not load.</h3>
            <p>
              Your access has not changed. Refresh the library to try again.
            </p>
            <Link className={styles.secondary} href="/training">
              Refresh course library
            </Link>
          </div>
        ) : !ordered.length ? (
          <div className={styles.emptyState}>
            <h3>The next course is being prepared.</h3>
            <p>Check back for the next published lesson.</p>
          </div>
        ) : signedIn ? (
          <div className={styles.courseGrid}>{ordered.map(courseCard)}</div>
        ) : (
          <>
            {freeCourses.length ? (
              <div
                className={`${styles.courseGrid} ${styles.freeGrid}`}
                aria-label="Free courses"
              >
                {freeCourses.map(courseCard)}
              </div>
            ) : null}
            {otherCourses.length ? (
              <>
                <h2 className={styles.moreTitle}>Keep building your skills.</h2>
                <p className={styles.moreIntro}>
                  Explore the course before choosing an access option. Existing
                  purchases still apply.
                </p>
                <div className={styles.courseGrid}>
                  {otherCourses.map(courseCard)}
                </div>
              </>
            ) : null}
          </>
        )}
      </section>

      <section
        className={`${styles.practice} ${styles.shell}`}
        aria-labelledby="practice-title"
      >
        <div>
          <p className={styles.eyebrow}>Put a lesson to work today</p>
          <h2 id="practice-title">
            Turn one customer question into a useful website answer.
          </h2>
          <p>
            Choose a question you hear often. Write an answer you can support,
            check the details, then put it where the next customer can find it.
          </p>
        </div>
        <div className={styles.practiceLinks}>
          <Link href="/articles/how-to-turn-real-customer-questions-into-useful-website-answers">
            <span>
              <strong>Follow the worked example</strong>
              <span>
                Read the guide, use the worksheet, and check the result.
              </span>
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link href="/tools/faq-schema-generator">
            <span>
              <strong>Try the free FAQ tool</strong>
              <span>
                Create matching FAQ content and structured data from your
                checked answers.
              </span>
            </span>
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
