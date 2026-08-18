import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, PlayCircle } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { createClient } from "@/lib/supabase/server";
import { getTrainingAccess } from "@/lib/access";
import CompleteButton from "./CompleteButton";
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
    .select("id, slug, title")
    .eq("slug", courseSlug)
    .single();
  if (!course) notFound();

  const { data: courseFull } = await supabase
    .from("courses")
    .select("is_free")
    .eq("id", course.id)
    .single();
  if (!courseFull?.is_free) {
    const { hasTraining } = await getTrainingAccess();
    if (!hasTraining) redirect(`/training/${courseSlug}`);
  }

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
              Progress is saved to your training record.
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
          ) : null}

          <article className={`prose-lfp ${styles.lessonArticle}`}>
            <ReactMarkdown>{lesson.content ?? ""}</ReactMarkdown>
          </article>

          <div className={styles.completePanel}>
            <div>
              <p className="cb-eyebrow">Lesson progress</p>
              <h2>Keep your course record current.</h2>
              <p>Mark this lesson complete when you are ready to move on.</p>
            </div>
            <CompleteButton lessonId={lesson.id} initiallyDone={!!doneResult.data} />
          </div>
        </div>
      </section>
    </main>
  );
}
