import { expansionCourse } from "@/lib/operatorAcademyCatalog";

export type AcademyAssessmentQuestion = {
  question: string;
  options: readonly string[];
  answer_index: number;
  explanation: string;
};

function rotate<T>(items: readonly T[], start: number, count: number) {
  if (!items.length) return [];
  return Array.from({ length: count }, (_, index) =>
    items[(start + index) % items.length],
  );
}

export function expansionLessonQuestions(
  courseSlug: string,
  lessonSlug: string,
): AcademyAssessmentQuestion[] | null {
  const course = expansionCourse(courseSlug);
  if (!course) return null;
  const lessonIndex = course.lessons.findIndex((item) => item.slug === lessonSlug);
  if (lessonIndex < 0) return null;
  const current = course.lessons[lessonIndex];
  const otherLessons = rotate(
    course.lessons.filter((item) => item.slug !== lessonSlug),
    lessonIndex,
    3,
  );

  const questions: AcademyAssessmentQuestion[] = [
    {
      question: `What is the primary outcome of ${current.title}?`,
      options: [current.outcome, ...otherLessons.map((item) => item.outcome)],
      answer_index: 0,
      explanation: current.outcome,
    },
    {
      question: "Which completion standard belongs to this lesson?",
      options: [
        current.reviewCriteria,
        ...otherLessons.map((item) => item.reviewCriteria),
      ],
      answer_index: 0,
      explanation: current.reviewCriteria,
    },
    {
      question: "Which action best proves that the learner did the work?",
      options: [
        current.assignment,
        "Save the prompt without running it or reviewing the result.",
        "Watch the lesson and rely on memory without producing an artifact.",
        "Copy a public example without adapting or checking it.",
      ],
      answer_index: 0,
      explanation: current.assignment,
    },
  ];

  // Keep option order identical in server rendering and grading. Never use
  // random order here: a later request must grade the options the learner saw.
  return questions.map((question, questionIndex) => {
    const offset = (lessonIndex + questionIndex) % question.options.length;
    return {
      ...question,
      options: rotate(question.options, offset, question.options.length),
      answer_index: (question.answer_index - offset + question.options.length) % question.options.length,
    };
  });
}

export function expansionFinalQuestions(
  courseSlug: string,
): AcademyAssessmentQuestion[] | null {
  const course = expansionCourse(courseSlug);
  if (!course) return null;
  return course.lessons.flatMap((item) => {
    const questions = expansionLessonQuestions(courseSlug, item.slug);
    return questions ? [questions[0], questions[1]] : [];
  });
}

export const OPERATOR_ACADEMY_PASSING_SCORE = 80;
