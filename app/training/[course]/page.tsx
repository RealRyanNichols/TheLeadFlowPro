import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  LockKeyhole,
  Map,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getTrainingAccess } from "@/lib/access";
import SiteHero from "@/components/site/system/SiteHero";
import styles from "../training.module.css";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: courseSlug } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", courseSlug)
    .single();

  if (!course) notFound();

  if (!course.is_free) {
    const { hasTraining, user } = await getTrainingAccess();
    if (!hasTraining) {
      return (
        <main className={`cb-page ${styles.page}`}>
          <SiteHero
            eyebrow="Existing member library"
            mutedTitle="This course is protected."
            title="Your previous access still works."
            body="New standalone enrollment for this legacy library is closed. Existing purchasers can log in with their purchase email and continue with saved progress."
            media={{
              src: "/images/visual-system/course-system-blueprint.webp",
              alt: "A connected training platform blueprint with access, lessons, and progress",
              width: 1254,
              height: 1254,
              kicker: "Protected course access",
              caption: course.title,
            }}
            primary={
              !user
                ? { href: "/login", label: "Log in to continue" }
                : { href: "/start?goal=delivery", label: "Plan a training platform" }
            }
            secondary={{ href: "/packages/system-map", label: "Start with a System Map" }}
            trustLine="A new Training Platform engagement is separate from this course library."
            compact
          />

          <section className={`cb-band ${styles.lockedBand}`} aria-labelledby="access-title">
            <div className="cb-shell">
              <div className={styles.lockedPanel}>
                <LockKeyhole aria-hidden="true" />
                <p className="cb-eyebrow">Course access</p>
                <h2 id="access-title">{course.title}</h2>
                <p>
                  If this course is already in your account, log in to resume it. If you
                  want a course platform built for your organization, map that system as a
                  new project. The platform service does not include this legacy library.
                </p>
                <div className={styles.lockedActions}>
                  {!user ? (
                    <Link className="cb-btn cb-btn--primary" href="/login">
                      Log in
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  ) : null}
                  <Link className="cb-btn cb-btn--ghost" href="/start?goal=delivery">
                    Plan a Training Platform
                  </Link>
                  <Link className={styles.textLink} href="/packages/system-map">
                    <Map aria-hidden="true" /> Start with a System Map
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      );
    }
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, slug, title, summary, sort_order")
    .eq("course_id", course.id)
    .order("sort_order");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const progressResult = user
    ? await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
    : { data: [] as { lesson_id: string }[] };

  const doneIds = new Set((progressResult.data ?? []).map((item) => item.lesson_id));
  const lessonCount = lessons?.length ?? 0;
  const completedCount = lessons?.filter((lesson) => doneIds.has(lesson.id)).length ?? 0;
  const firstIncomplete = lessons?.find((lesson) => !doneIds.has(lesson.id));
  const continueLesson = firstIncomplete ?? lessons?.[0];

  return (
    <main className={`cb-page ${styles.page}`}>
      <SiteHero
        eyebrow="Operator Academy course"
        mutedTitle="Learn it in sequence."
        title={course.title}
        body={course.description || "Move through each lesson and keep your progress in one owned training record."}
        media={{
          src: "/images/visual-system/course-system-blueprint.webp",
          alt: "A connected training platform blueprint linking course access and lesson progress",
          width: 1254,
          height: 1254,
          kicker: `${completedCount} of ${lessonCount} complete`,
          caption: "Your next lesson stays connected",
        }}
        primary={
          continueLesson
            ? {
                href: `/training/${course.slug}/${continueLesson.slug}`,
                label: completedCount > 0 ? "Continue course" : "Start course",
              }
            : undefined
        }
        secondary={{ href: "/training", label: "All courses" }}
        trustLine="Lesson completion is saved to your account."
        compact
      />

      <section className={`cb-band ${styles.lessonBand}`} aria-labelledby="lesson-list-title">
        <div className={styles.courseShell}>
          <Link href="/training" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" /> All courses
          </Link>
          <div className={styles.lessonHeading}>
            <div>
              <p className="cb-eyebrow">Course path</p>
              <h2 id="lesson-list-title">Every lesson, in order.</h2>
            </div>
            <p>{completedCount} of {lessonCount} complete</p>
          </div>

          <ol className={styles.lessonList}>
            {lessons?.map((lesson, index) => {
              const isDone = doneIds.has(lesson.id);
              return (
                <li key={lesson.id}>
                  <Link href={`/training/${course.slug}/${lesson.slug}`}>
                    <span className={`${styles.lessonNumber}${isDone ? ` ${styles.lessonDone}` : ""}`}>
                      {isDone ? (
                        <>
                          <Check aria-hidden="true" />
                          <span className="sr-only">Completed</span>
                        </>
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className={styles.lessonCopy}>
                      <strong>{lesson.title}</strong>
                      {lesson.summary ? <span>{lesson.summary}</span> : null}
                    </span>
                    <ArrowRight aria-hidden="true" className={styles.lessonArrow} />
                  </Link>
                </li>
              );
            })}
          </ol>

          {!lessonCount ? (
            <div className={styles.emptyState}>
              <BookOpenCheck aria-hidden="true" />
              <h3>Lessons are being prepared.</h3>
              <p>The published lessons will appear here in sequence.</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
