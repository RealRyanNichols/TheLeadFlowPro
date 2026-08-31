import Link from "next/link";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseAccess } from "@/lib/access";
import { expansionCourse } from "@/lib/operatorAcademyCatalog";
import { finalAssessmentQuestions } from "@/lib/trainingAssessments";
import AssessmentForm from "../../content-engine/AssessmentForm";
import styles from "../../training.module.css";

export default async function AcademyFinalPage({ params }: { params: Promise<{ course: string }> }) {
  const { course: courseSlug } = await params;
  const blueprint = expansionCourse(courseSlug);
  if (!blueprint) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/training/${courseSlug}/final`);
  const { data: course } = await supabase.from("courses").select("id, slug, is_free").eq("slug", courseSlug).single();
  if (!course) redirect("/training");
  const access = await getCourseAccess(course);
  if (!access.hasAccess) redirect(`/training/${courseSlug}`);
  const privateQuestions = finalAssessmentQuestions(courseSlug);
  if (!privateQuestions) notFound();
  const questions = privateQuestions.map((item) => ({ question: item.question, options: item.options }));
  const { data: passedAttempt } = await supabase.from("course_quiz_attempts").select("id").eq("user_id", user.id).eq("course_id", course.id).eq("assessment_kind", "final").eq("passed", true).limit(1).maybeSingle();

  return (
    <main className={`cb-page ${styles.page}`}>
      <section className={styles.lessonContent}>
        <div className={styles.lessonContentShell}>
          <Link href={`/training/${courseSlug}`} className={styles.backLink}><ArrowLeft aria-hidden="true" /> {blueprint.shortTitle}</Link>
          <div className={styles.assessmentHeader}>
            <GraduationCap aria-hidden="true" />
            <p className="cb-eyebrow">Final assessment</p>
            <h1>Prove that you can run the system.</h1>
            <p>{questions.length} questions. Score at least 80 percent. Retakes are allowed.</p>
          </div>
          <AssessmentForm courseSlug={courseSlug} kind="final" questions={questions} initiallyPassed={!!passedAttempt} />
        </div>
      </section>
    </main>
  );
}
