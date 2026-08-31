import Link from "next/link";
import { Award, ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCourseAccess } from "@/lib/access";
import { expansionCourse } from "@/lib/operatorAcademyCatalog";
import { PRIVATE_COURSE_CREDENTIAL_DISCLAIMER } from "@/lib/academyCredential";
import CredentialRequest from "../../content-engine/credential/CredentialRequest";
import PrintButton from "../../content-engine/credential/PrintButton";
import styles from "../../training.module.css";

export default async function AcademyCredentialPage({ params }: { params: Promise<{ course: string }> }) {
  const { course: courseSlug } = await params;
  const blueprint = expansionCourse(courseSlug);
  if (!blueprint) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/training/${courseSlug}/credential`);
  const { data: course } = await supabase.from("courses").select("id, slug, is_free").eq("slug", courseSlug).single();
  if (!course) redirect("/training");
  const access = await getCourseAccess(course);
  if (!access.hasAccess) redirect(`/training/${courseSlug}`);
  const { data: credential } = await supabase.from("course_credentials").select("credential_code, learner_name, final_score, issuer, disclaimer, issued_at").eq("user_id", user.id).eq("course_id", course.id).maybeSingle();
  const defaultName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  return (
    <main className={`cb-page ${styles.page}`}>
      <section className={styles.lessonContent}>
        <div className={styles.lessonContentShell}>
          <Link href={`/training/${courseSlug}`} className={styles.backLink}><ArrowLeft aria-hidden="true" /> {blueprint.shortTitle}</Link>
          {credential ? (
            <><article className={styles.credential}><Award aria-hidden="true" /><p>PRIVATE COURSE COMPLETION LETTER</p><h1>{credential.learner_name}</h1><h2>completed {blueprint.title}</h2><p>Final assessment score: {credential.final_score} percent</p><p>Issued {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(credential.issued_at))}</p><strong>{credential.issuer}</strong><small>Record code: {credential.credential_code}</small><footer>{credential.disclaimer}</footer></article><div className={styles.printAction}><PrintButton /></div></>
          ) : (
            <div className={styles.assessmentHeader}><Award aria-hidden="true" /><p className="cb-eyebrow">Completion record</p><h1>Finish it. Verify it. Put your name on it.</h1><p>The system checks every lesson, assignment, lesson check, final, and designated deliverable before issuing the letter.</p><CredentialRequest defaultName={defaultName} courseSlug={courseSlug} /><p>{PRIVATE_COURSE_CREDENTIAL_DISCLAIMER}</p></div>
          )}
        </div>
      </section>
    </main>
  );
}
