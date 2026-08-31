import { CHATGPT_OPERATOR } from "@/lib/chatgptOperatorCourse";
import { CONTENT_ENGINE, CONTENT_ENGINE_LESSONS } from "@/lib/contentEngineCourse";
import { expansionCourse } from "@/lib/operatorAcademyCatalog";

export const PRIVATE_COURSE_CREDENTIAL_DISCLAIMER =
  "This is a private LeadFlow Pro course completion credential issued by Longview Training Center LLC. It is not a degree, professional license, accreditation, state or federal certification, promise of employment, or guarantee of business results.";

export function courseCredentialConfig(courseSlug: string) {
  if (courseSlug === CHATGPT_OPERATOR.slug) {
    return {
      code: CHATGPT_OPERATOR.code,
      title: CHATGPT_OPERATOR.title,
      lessonCount: CHATGPT_OPERATOR.lessonCount,
      deliverableCount: CHATGPT_OPERATOR.deliverableCount,
      disclaimer: CHATGPT_OPERATOR.credentialDisclaimer,
    };
  }
  if (courseSlug === CONTENT_ENGINE.slug) {
    return {
      code: "OA02",
      title: CONTENT_ENGINE.title,
      lessonCount: CONTENT_ENGINE_LESSONS.length,
      deliverableCount: 0,
      disclaimer: CONTENT_ENGINE.credentialDisclaimer,
    };
  }
  const course = expansionCourse(courseSlug);
  if (!course) return null;
  return {
    code: course.code,
    title: course.title,
    lessonCount: course.lessons.length,
    deliverableCount: course.lessons.filter((lesson) => lesson.deliverable).length,
    disclaimer: PRIVATE_COURSE_CREDENTIAL_DISCLAIMER,
  };
}
