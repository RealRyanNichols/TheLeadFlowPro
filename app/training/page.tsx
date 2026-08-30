import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  LockKeyhole,
  Network,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canAccessCourse, getTrainingEntitlements } from "@/lib/access";
import { CONTENT_ENGINE } from "@/lib/contentEngineCourse";
import SiteHero from "@/components/site/system/SiteHero";
import styles from "./training.module.css";

export const metadata = {
  title: "Training Library | The LeadFlow Pro",
  description:
    "Access The LeadFlow Pro training library, continue existing courses, and track lesson progress.",
};

export default async function TrainingPage() {
  const supabase = await createClient();
  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order");
  const entitlements = await getTrainingEntitlements();
  const hasTraining =
    entitlements.isAdmin || entitlements.purchaseKinds.size > 0;
  const firstOpenCourse = courses?.find((course) =>
    canAccessCourse(course, entitlements),
  );

  return (
    <main className={`cb-page ${styles.page}`}>
      <SiteHero
        eyebrow="LeadFlow Operator Academy"
        mutedTitle="The course is not the system."
        title="Training should move the work forward."
        body="Use the library to understand the owned stack, continue your existing courses, and keep every completed lesson recorded in one place."
        media={{
          src: "/images/visual-system/course-system-blueprint.webp",
          alt: "A connected training platform blueprint linking enrollment, access, lessons, and progress",
          width: 1254,
          height: 1254,
          kicker: "Owned learning system",
          caption: "One path from enrollment to the next lesson",
        }}
        primary={
          firstOpenCourse
            ? {
                href: `/training/${firstOpenCourse.slug}`,
                label: hasTraining ? "Continue training" : "Open the free course",
              }
            : { href: "#course-library", label: "View the library" }
        }
        secondary={{ href: "/start?goal=delivery", label: "Plan a training platform" }}
        trustLine="Existing access and lesson progress stay intact."
      />

      <section className={`cb-band ${styles.library}`} id="course-library" aria-labelledby="library-title">
        <div className="cb-shell">
          <div className={styles.sectionHead}>
            <div>
              <p className="cb-eyebrow">Course library</p>
              <h2 className="cb-h2 cb-heading" id="library-title">
                Learn the stack in a clear order.
              </h2>
            </div>
            <p className="cb-lead">
              Free courses remain open. Existing purchasers keep their full library access.
              New standalone enrollment for the legacy library is closed.
            </p>
          </div>

          {!hasTraining ? (
            <aside className={styles.accessNotice} aria-label="Training access information">
              <div className={styles.noticeIcon}>
                <BookOpenCheck aria-hidden="true" />
              </div>
              <div className={styles.noticeCopy}>
                <p className={styles.noticeKicker}>Existing members</p>
                <h3>Your previous access is still yours.</h3>
                <p>
                  Log in with the email used for purchase to restore your courses and saved
                  progress. Building a training platform for your own business is a separate
                  service.
                </p>
              </div>
              <div className={styles.noticeActions}>
                {!entitlements.user ? (
                  <Link className="cb-btn cb-btn--primary" href="/login">
                    Log in
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </Link>
                ) : null}
                <Link className="cb-btn cb-btn--ghost" href="/packages/system-map">
                  Start with a System Map
                </Link>
              </div>
            </aside>
          ) : null}

          <div className={styles.courseGrid}>
            {courses?.map((course, index) => {
              const locked = !canAccessCourse(course, entitlements);
              const isContentEngine = course.slug === CONTENT_ENGINE.slug;
              const lockedHref = isContentEngine
                ? "/operator-academy/content-engine"
                : "/start?goal=delivery";
              return (
                <article className={`${styles.courseCard}${locked ? ` ${styles.locked}` : ""}`} key={course.id}>
                  <div className={styles.cardImage}>
                    <Image
                      src="/images/visual-system/course-system-blueprint.webp"
                      alt=""
                      width={1254}
                      height={1254}
                      sizes="(max-width: 760px) calc(100vw - 40px), 31vw"
                    />
                    <span className={styles.courseNumber}>Course {String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.cardStatus}>
                      {course.is_free ? (
                        <span>
                          <Check aria-hidden="true" /> Free access
                        </span>
                      ) : locked ? (
                        <span>
                          <LockKeyhole aria-hidden="true" /> Existing members
                        </span>
                      ) : (
                        <span>
                          <BookOpenCheck aria-hidden="true" /> In your library
                        </span>
                      )}
                    </div>
                    <h3>{course.title}</h3>
                    <p>{course.description}</p>
                    <Link
                      className={styles.cardLink}
                      href={locked ? lockedHref : `/training/${course.slug}`}
                      aria-label={locked ? `View access options for ${course.title}` : `Open ${course.title}`}
                    >
                      {locked
                        ? isContentEngine
                          ? "View course"
                          : "Plan a training platform"
                        : "Open course"}
                      {locked && !isContentEngine ? (
                        <Network aria-hidden="true" />
                      ) : (
                        <ArrowRight aria-hidden="true" />
                      )}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          {!courses?.length ? (
            <div className={styles.emptyState}>
              <BookOpenCheck aria-hidden="true" />
              <h3>The next course is being prepared.</h3>
              <p>Check back soon for the next published module.</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
