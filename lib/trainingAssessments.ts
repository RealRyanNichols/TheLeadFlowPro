import { CHATGPT_OPERATOR, chatgptOperatorLesson } from "@/lib/chatgptOperatorCourse";
import { CHATGPT_OPERATOR_ASSESSMENTS } from "@/lib/chatgptOperatorAssessments";
import { CONTENT_ENGINE, contentEngineLessonCode } from "@/lib/contentEngineCourse";
import { CONTENT_ENGINE_ASSESSMENTS } from "@/lib/contentEngineAssessments";
import {
  expansionFinalQuestions,
  expansionLessonQuestions,
  OPERATOR_ACADEMY_PASSING_SCORE,
  type AcademyAssessmentQuestion,
} from "@/lib/operatorAcademyAssessments";
import { expansionCourse } from "@/lib/operatorAcademyCatalog";

export type TrainingAssessmentQuestion = AcademyAssessmentQuestion;

export function isAssessedCourseSlug(courseSlug: string) {
  return (
    courseSlug === CONTENT_ENGINE.slug ||
    courseSlug === CHATGPT_OPERATOR.slug ||
    !!expansionCourse(courseSlug)
  );
}

export function lessonAssessmentQuestions(
  courseSlug: string,
  lessonSlug: string,
): readonly TrainingAssessmentQuestion[] | null {
  if (courseSlug === CONTENT_ENGINE.slug) {
    const code = contentEngineLessonCode(lessonSlug);
    return code
      ? CONTENT_ENGINE_ASSESSMENTS.lesson_checks[
          code as keyof typeof CONTENT_ENGINE_ASSESSMENTS.lesson_checks
        ]
      : null;
  }
  if (courseSlug === CHATGPT_OPERATOR.slug) {
    const code = chatgptOperatorLesson(lessonSlug)?.code;
    return code
      ? CHATGPT_OPERATOR_ASSESSMENTS.lesson_checks[
          code as keyof typeof CHATGPT_OPERATOR_ASSESSMENTS.lesson_checks
        ]
      : null;
  }
  return expansionLessonQuestions(courseSlug, lessonSlug);
}

export function finalAssessmentQuestions(
  courseSlug: string,
): readonly TrainingAssessmentQuestion[] | null {
  if (courseSlug === CONTENT_ENGINE.slug) {
    return CONTENT_ENGINE_ASSESSMENTS.final_assessment.map(
      (reference) =>
        CONTENT_ENGINE_ASSESSMENTS.lesson_checks[reference.source_lesson][
          reference.question_index
        ],
    );
  }
  if (courseSlug === CHATGPT_OPERATOR.slug) {
    return CHATGPT_OPERATOR_ASSESSMENTS.final_assessment.map(
      (reference) =>
        CHATGPT_OPERATOR_ASSESSMENTS.lesson_checks[reference.source_lesson][
          reference.question_index
        ],
    );
  }
  return expansionFinalQuestions(courseSlug);
}

export function passingScoreForCourse(courseSlug: string) {
  if (courseSlug === CONTENT_ENGINE.slug) {
    return CONTENT_ENGINE_ASSESSMENTS.passing_score_percent;
  }
  if (courseSlug === CHATGPT_OPERATOR.slug) {
    return CHATGPT_OPERATOR_ASSESSMENTS.passing_score_percent;
  }
  return OPERATOR_ACADEMY_PASSING_SCORE;
}
