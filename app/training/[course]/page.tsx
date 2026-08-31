import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  GraduationCap,
  LockKeyhole,
  Map,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCourseAccess } from "@/lib/access";
import { CONTENT_ENGINE } from "@/lib/contentEngineCourse";
import { CHATGPT_OPERATOR } from "@/lib/chatgptOperatorCourse";
import { expansionCourse } from "@/lib/operatorAcademyCatalog";
import { isAssessedCourseSlug } from "@/lib/trainingAssessments";
import SiteHero from "@/components/site/system/SiteHero";
import styles from "../training.module.css";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ course: string }>;
}) {
  const { course: courseSlug } = await params;
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: course } = await service
    .from("courses")
    .select("id, slug, title, description, is_free")
    .eq("slug", courseSlug)
    .eq("is_published", true)
    .single();

  if (!course) notFound();

  const access = await getCourseAccess(course);
  if (!access.hasAccess) {
      const isContentEngine = course.slug === CONTENT_ENGINE.slug;
      const isChatGPTOperator = course.slug === CHATGPT_OPERATOR.slug;
      const isStandaloneCourse = isContentEngine || isChatGPTOperator;
      const standaloneCourse = isContentEngine ? CONTENT_ENGINE : CHATGPT_OPERATOR;
      const expandedCourse = expansionCourse(course.slug);
      const isAcademyCourse = isStandaloneCourse || !!expandedCourse;
      const standaloneHref = isContentEngine ? "/operator-academy/content-engine" : isChatGPTOperator ? "/chatgpt" : "/academy";
      return (
        <main className={`cb-page ${styles.page}`}>
          <SiteHero
            eyebrow={isAcademyCourse ? `Operator Academy ${(expandedCourse?.code ?? standaloneCourse.code).replace("OA", "")}` : "Existing member library"}
            mutedTitle={isAcademyCourse ? "This course has protected access." : "This course is protected."}
            title={isAcademyCourse ? expandedCourse?.shortTitle ?? standaloneCourse.shortTitle : "Your previous access still works."}
            body={
              isStandaloneCourse
                ? standaloneCourse.promise
                : expandedCourse
                  ? expandedCourse.description
                : "New standalone enrollment for this legacy library is closed. Existing purchasers can log in with their purchase email and continue with saved progress."
            }
            media={{
              src: "/images/visual-system/course-system-blueprint.webp",
              alt: "A connected training platform blueprint with access, lessons, and progress",
              width: 1254,
              height: 1254,
              kicker: "Protected course access",
              caption: course.title,
            }}
            primary={
              isAcademyCourse
                ? { href: standaloneHref, label: "View founding access" }
                : !access.user
                  ? { href: "/login", label: "Log in to continue" }
                  : { href: "/start?goal=delivery", label: "Plan a training platform" }
            }
            secondary={
              isAcademyCourse
                ? { href: `/login?next=/training/${course.slug}`, label: "Purchased already? Log in" }
                : { href: "/packages/system-map", label: "Start with a System Map" }
            }
            trustLine={
              isAcademyCourse
                ? "Use the same email at checkout and login so the course unlocks correctly."
                : "A new Training Platform engagement is separate from this course library."
            }
            compact
          />

          <section className={`cb-band ${styles.lockedBand}`} aria-labelledby="access-title">
            <div className="cb-shell">
              <div className={styles.lockedPanel}>
                <LockKeyhole aria-hidden="true" />
                <p className="cb-eyebrow">Course access</p>
                <h2 id="access-title">{course.title}</h2>
                <p>
                  {isStandaloneCourse
                    ? standaloneCourse.accessDisclosure
                    : expandedCourse
                      ? expandedCourse.isFree
                        ? "Enter your name, phone, and email on the academy page to unlock both free courses. Promotional email and SMS consent remain optional."
                        : "This professional course is included in Operator Academy all-access. Log in with the email used at checkout to continue."
                    : "If this course is already in your account, log in to resume it. If you want a course platform built for your organization, map that system as a new project. The platform service does not include this legacy library."}
                </p>
                <div className={styles.lockedActions}>
                  {!access.user ? (
                    <Link className="cb-btn cb-btn--primary" href="/login">
                      Log in
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  ) : null}
                  <Link
                    className="cb-btn cb-btn--ghost"
                    href={isAcademyCourse ? standaloneHref : "/start?goal=delivery"}
                  >
                    {isAcademyCourse ? "View academy access" : "Plan a Training Platform"}
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

  const { data: lessons } = await service
    .from("lessons")
    .select("id, slug, title, summary, sort_order")
    .eq("course_id", course.id)
    .eq("is_published", true)
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
          caption: access.user ? "Your next lesson stays connected" : "Your free course access is active",
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
        trustLine={access.user
          ? "Lesson completion is saved to your account."
          : "You can read the free course now. Create a free login when you want to save progress and quiz results."}
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

          {isAssessedCourseSlug(course.slug) && lessonCount ? (
            <aside className={styles.accessNotice} aria-label="Final assessment and credential">
              <div className={styles.noticeIcon}>
                <GraduationCap aria-hidden="true" />
              </div>
              <div className={styles.noticeCopy}>
                <p className={styles.noticeKicker}>Completion path</p>
                <h3>Finish the work, then prove the system.</h3>
                <p>
                  Complete every lesson and assignment, pass the lesson checks, then score
                  at least 80 percent on the final assessment to request the private course
                  completion credential.
                </p>
              </div>
              <div className={styles.noticeActions}>
                <Link className="cb-btn cb-btn--primary" href={`/training/${course.slug}/final`}>
                  Open final assessment
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </aside>
          ) : null}
        </div>
      </section>
    </main>
  );
}
