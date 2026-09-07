import { academyCourse } from "../../lib/operatorAcademyCatalog";

export type TrainingLibraryCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
  is_free: boolean;
  hasAccess: boolean;
};

/** Reorder discovery only. Signed-in learners retain the existing library order. */
export function orderTrainingCourses<T extends { is_free: boolean }>(
  courses: readonly T[],
  signedIn: boolean,
): T[] {
  return signedIn
    ? [...courses]
    : [...courses].sort((a, b) => Number(b.is_free) - Number(a.is_free));
}

export function trainingCourseArtwork(slug: string) {
  return academyCourse(slug) ? `/images/academy/cards/${slug}.svg` : null;
}

/** Preserve enrollment destinations and leave authorization to canAccessCourse. */
export function trainingCourseHref(
  course: Pick<TrainingLibraryCourse, "slug" | "hasAccess">,
) {
  if (course.hasAccess) return `/training/${course.slug}`;
  if (course.slug === "content-engine")
    return "/operator-academy/content-engine";
  if (course.slug === "chatgpt-operator") return "/chatgpt";
  const academy = academyCourse(course.slug);
  return academy
    ? academy.isFree
      ? "/academy#free-access"
      : "/academy#pricing"
    : "/start?goal=delivery";
}
