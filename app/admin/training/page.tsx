import { createServiceClient } from "@/lib/supabase/service";
import DeliverableReviewTable from "./DeliverableReviewTable";

export default async function AdminTrainingPage() {
  const service = createServiceClient();
  const { data: submissions } = await service
    .from("course_deliverable_submissions")
    .select("id, user_id, course_id, lesson_id, title, submission_url, notes, status, review_notes, submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(200);
  const userIds = [...new Set((submissions ?? []).map((row) => row.user_id))];
  const courseIds = [...new Set((submissions ?? []).map((row) => row.course_id))];
  const lessonIds = [...new Set((submissions ?? []).map((row) => row.lesson_id))];
  const [profiles, courses, lessons] = await Promise.all([
    userIds.length ? service.from("profiles").select("id, full_name, email").in("id", userIds) : Promise.resolve({ data: [] }),
    courseIds.length ? service.from("courses").select("id, title").in("id", courseIds) : Promise.resolve({ data: [] }),
    lessonIds.length ? service.from("lessons").select("id, title").in("id", lessonIds) : Promise.resolve({ data: [] }),
  ]);
  const profileMap = new Map((profiles.data ?? []).map((row) => [row.id, row.full_name || row.email || row.id]));
  const courseMap = new Map((courses.data ?? []).map((row) => [row.id, row.title]));
  const lessonMap = new Map((lessons.data ?? []).map((row) => [row.id, row.title]));
  const rows = (submissions ?? []).map((row) => ({
    id: row.id,
    learner: profileMap.get(row.user_id) ?? row.user_id,
    course: courseMap.get(row.course_id) ?? "Course",
    lesson: lessonMap.get(row.lesson_id) ?? "Lesson",
    title: row.title,
    submissionUrl: row.submission_url,
    notes: row.notes,
    status: row.status,
    reviewNotes: row.review_notes ?? "",
    submittedAt: row.submitted_at,
  }));

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-widest text-flow-400">Operator Academy</p>
      <h1 className="mt-2 text-3xl font-black text-[var(--heading)]">Reviewed deliverables</h1>
      <p className="mb-8 mt-3 max-w-3xl text-[var(--muted)]">Open each major build, approve it, or return a specific revision note. Credential checks require every designated deliverable to be approved.</p>
      <DeliverableReviewTable initialRows={rows} />
    </div>
  );
}
