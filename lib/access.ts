import { createClient } from "@/lib/supabase/server";
import { CONTENT_ENGINE } from "@/lib/contentEngineCourse";

export type CourseAccessInput = {
  slug: string;
  is_free: boolean;
};

export type TrainingEntitlements = {
  user: { id: string; email?: string } | null;
  isAdmin: boolean;
  purchaseKinds: Set<string>;
};

export function canAccessCourse(
  course: CourseAccessInput,
  entitlements: TrainingEntitlements,
) {
  if (course.is_free || entitlements.isAdmin) return true;
  if (course.slug === CONTENT_ENGINE.slug) {
    return entitlements.purchaseKinds.has(CONTENT_ENGINE.purchaseKind);
  }
  return entitlements.purchaseKinds.has("learn_it");
}

export async function getTrainingEntitlements(): Promise<TrainingEntitlements> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false, purchaseKinds: new Set() };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const { data: purchases } = await supabase
    .from("purchases")
    .select("kind")
    .eq("status", "paid");

  return {
    user: { id: user.id, email: user.email },
    isAdmin,
    purchaseKinds: new Set((purchases ?? []).map((purchase) => purchase.kind)),
  };
}

export async function getCourseAccess(course: CourseAccessInput) {
  const entitlements = await getTrainingEntitlements();
  return {
    ...entitlements,
    hasAccess: canAccessCourse(course, entitlements),
  };
}

// Training access: admins and Learn It purchasers (matched by login email via RLS).
export async function getTrainingAccess() {
  const entitlements = await getTrainingEntitlements();
  return {
    user: entitlements.user,
    hasTraining:
      entitlements.isAdmin || entitlements.purchaseKinds.has("learn_it"),
    isAdmin: entitlements.isAdmin,
  };
}
