import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, PlayCircle } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import { getCourseAccess } from "@/lib/access";
import { isAssessedCourseSlug, lessonAssessmentQuestions } from "@/lib/trainingAssessments";
import CompleteButton from "./CompleteButton";
import AssignmentButton from "../../content-engine/AssignmentButton";
import AssessmentForm from "../../content-engine/AssessmentForm";
import DeliverableSubmissionForm from "./DeliverableSubmissionForm";
import { academyLesson } from "@/lib/operatorAcademyCatalog";
import { chatgptOperatorLesson } from "@/lib/chatgptOperatorCourse";
import styles from "../../training.module.css";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}) {
  const { course: courseSlug, lesson: lessonSlug } = await params;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, is_free")
    .eq("slug", courseSlug)
    .single();
  if (!course) notFound();

  const access = await getCourseAccess(course);
  if (!access.hasAccess) redirect(`/training/${courseSlug}`);

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", course.id)
    .eq("slug", lessonSlug)
    .single();
  if (!lesson) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const doneResult = user
    ? await supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id)
        .maybeSingle()
    : { data: null };

  const isAssessedCourse = isAssessedCourseSlug(course.slug);
  const assignmentResult = user && isAssessedCourse
    ? await supabase
        .from("course_assignment_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id)
        .maybeSingle()
    : { data: null };
  const quizResult = user && isAssessedCourse
    ? await supabase
        .from("course_quiz_attempts")
        .select("id")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id)
        .eq("assessment_kind", "lesson")
        .eq("passed", true)
        .limit(1)
        .maybeSingle()
    : { data: null };
  const privateLessonQuestions = lessonAssessmentQuestions(course.slug, lesson.slug);
  const lessonQuestions = privateLessonQuestions
    ? privateLessonQuestions.map((question) => ({
        question: question.question,
        options: question.options,
      }))
    : null;
  const lessonBlueprint = course.slug === "chatgpt-operator"
    ? chatgptOperatorLesson(lesson.slug)
    : academyLesson(course.slug, lesson.slug);
  const deliverableResult = user && lessonBlueprint?.deliverable
    ? await supabase
        .from("course_deliverable_submissions")
        .select("submission_url, notes, status, review_notes")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id)
        .maybeSingle()
    : { data: null };

  return (
    <main className={`cb-page ${styles.page}`}>
      <section className={styles.lessonHero}>
        <div className={styles.lessonHeroShell}>
          <div className={styles.lessonHeroCopy}>
            <Link href={`/training/${course.slug}`} className={styles.darkBackLink}>
              <ArrowLeft aria-hidden="true" /> {course.title}
            </Link>
            <p className="cb-eyebrow">Operator Academy lesson</p>
            <h1>{lesson.title}</h1>
            {lesson.summary ? <p>{lesson.summary}</p> : null}
            <div className={styles.lessonTrust}>
              <BookOpenCheck aria-hidden="true" />
              {user
                ? "Progress is saved to your training record."
                : "Free lesson access is active. A login is only required to save progress and results."}
            </div>
          </div>
          <figure className={styles.lessonHeroImage}>
            <Image
              src="/images/visual-system/course-system-blueprint.webp"
              alt="A connected training platform blueprint showing course access and progress"
              width={1254}
              height={1254}
              priority
              sizes="(max-width: 760px) calc(100vw - 40px), 44vw"
            />
          </figure>
        </div>
      </section>

      <section className={styles.lessonContent} aria-label={`${lesson.title} lesson content`}>
        <div className={styles.lessonContentShell}>
          {lesson.video_url ? (
            <div className={styles.videoFrame}>
              <div className={styles.videoLabel}>
                <PlayCircle aria-hidden="true" /> Lesson video
              </div>
              <iframe
                src={lesson.video_url}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={lesson.title}
              />
            </div>
          ) : isAssessedCourse ? (
            <div className={styles.videoPlaceholder}>
              <PlayCircle aria-hidden="true" />
              <div>
                <p className="cb-eyebrow">Lesson video slot</p>
                <h2>Recording script ready.</h2>
                <p>The complete lesson is available below now. Ryan&apos;s recorded screen lesson will appear in this player when the approved video URL is added.</p>
              </div>
            </div>
          ) : null}

          <article className={`prose-lfp ${styles.lessonArticle}`}>
            <ReactMarkdown>{lesson.content ?? ""}</ReactMarkdown>
          </article>

          {lessonBlueprint?.deliverable && user ? (
            <DeliverableSubmissionForm
              courseSlug={course.slug}
              lessonSlug={lesson.slug}
              title={"deliverableTitle" in lessonBlueprint && lessonBlueprint.deliverableTitle
                ? lessonBlueprint.deliverableTitle
                : `${lessonBlueprint.title} capstone build`}
              initialSubmission={deliverableResult.data}
            />
          ) : null}

          {isAssessedCourse && lessonQuestions ? (
            <>
              {user ? (
                <div className={styles.completePanel}>
                  <div>
                    <p className="cb-eyebrow">Assignment record</p>
                    <h2>Do the work before moving on.</h2>
                    <p>Complete the assignment written in the lesson, then mark it here.</p>
                  </div>
                  <AssignmentButton lessonId={lesson.id} initiallyDone={!!assignmentResult.data} />
                </div>
              ) : (
                <div className={styles.completePanel}>
                  <div>
                    <p className="cb-eyebrow">Optional training record</p>
                    <h2>Keep reading now, or create a free login to save the work.</h2>
                    <p>Your lead access already unlocked this lesson. A login adds saved assignments, graded checks, lesson progress, and the completion path.</p>
                  </div>
                  <Link className="cb-btn cb-btn--primary" href={`/login?next=/training/${course.slug}/${lesson.slug}`}>
                    Create or open my login
                  </Link>
                </div>
              )}
              <section className={styles.lessonCheck} aria-labelledby="lesson-check-title">
                <p className="cb-eyebrow">Lesson check</p>
                <h2 id="lesson-check-title">Make sure the lesson landed.</h2>
                {user ? (
                  <>
                    <p>Score at least 80 percent. Retakes are allowed and every result stays in your private training record.</p>
                    <AssessmentForm
                      kind="lesson"
                      courseSlug={course.slug}
                      lessonSlug={lesson.slug}
                      questions={lessonQuestions}
                      initiallyPassed={!!quizResult.data}
                    />
                  </>
                ) : (
                  <p>Create a free login above when you are ready to grade this check and save the result.</p>
                )}
              </section>
            </>
          ) : null}

          {user ? (
            <div className={styles.completePanel}>
              <div>
                <p className="cb-eyebrow">Lesson progress</p>
                <h2>Keep your course record current.</h2>
                <p>Mark this lesson complete when you are ready to move on.</p>
              </div>
              <CompleteButton lessonId={lesson.id} initiallyDone={!!doneResult.data} />
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
