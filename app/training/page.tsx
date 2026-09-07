import { withPublicPageMetadata } from "@/lib/publicPageMetadata";
import { createServiceClient } from "@/lib/supabase/service";
import { canAccessCourse, getTrainingEntitlements } from "@/lib/access";
import TrainingLibrary from "./TrainingLibrary";
import type { TrainingLibraryCourse } from "./training-library";

export const metadata = withPublicPageMetadata("/training", {
  title: "Training Library | The LeadFlow Operator Academy",
  description:
    "The LeadFlow Operator Academy library: ten courses on offers, lead capture, follow-up, websites, AI agents, local ads, dashboards, and the company operating system. Two are free.",
  alternates: { canonical: "https://www.theleadflowpro.com/training" },
});

export const dynamic = "force-dynamic";

export default async function TrainingPage() {
  const service = createServiceClient();
  const { data: courses, error } = await service
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  const entitlements = await getTrainingEntitlements();
  const cards: TrainingLibraryCourse[] = (courses ?? []).map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title,
    description: course.description,
    is_free: course.is_free,
    hasAccess: canAccessCourse(course, entitlements),
  }));
  const firstOpenCourse = cards.find((course) => course.hasAccess);
  const firstOpenFreeCourse = cards.find(
    (course) => course.is_free && course.hasAccess,
  );

  return (
    <TrainingLibrary
      courses={cards}
      signedIn={!!entitlements.user}
      continueHref={
        entitlements.user
          ? firstOpenCourse
            ? `/training/${firstOpenCourse.slug}`
            : "#course-library"
          : "/login?next=/training"
      }
      freeCourseHref={
        firstOpenFreeCourse
          ? `/training/${firstOpenFreeCourse.slug}`
          : "/academy#free-access"
      }
      loadFailed={!!error}
    />
  );
}
