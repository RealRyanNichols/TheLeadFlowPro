import { createClient } from "@/lib/supabase/server";
import { CONTENT_ENGINE } from "@/lib/contentEngineCourse";
import { CHATGPT_OPERATOR } from "@/lib/chatgptOperatorCourse";
import { hasAcademyLeadAccess } from "@/lib/academyLeadAccess";
import {
  EXPANSION_COURSE_SLUGS,
  LEAD_GATED_COURSE_SLUGS,
  OPERATOR_ACADEMY,
} from "@/lib/operatorAcademyCatalog";

export type CourseAccessInput = {
  slug: string;
  is_free: boolean;
};

export type TrainingEntitlements = {
  user: { id: string; email?: string } | null;
  isAdmin: boolean;
  hasLeadAccess: boolean;
  purchaseKinds: Set<string>;
};

export function canAccessCourse(
  course: CourseAccessInput,
  entitlements: TrainingEntitlements,
) {
  if (entitlements.isAdmin) return true;
  if (course.is_free) {
    return !LEAD_GATED_COURSE_SLUGS.has(course.slug) || entitlements.hasLeadAccess;
  }
  if (entitlements.purchaseKinds.has(OPERATOR_ACADEMY.allAccessPurchaseKind)) {
    return true;
  }
  if (course.slug === CONTENT_ENGINE.slug) {
    return entitlements.purchaseKinds.has(CONTENT_ENGINE.purchaseKind);
  }
  if (course.slug === CHATGPT_OPERATOR.slug) {
    return entitlements.purchaseKinds.has(CHATGPT_OPERATOR.purchaseKind);
  }
  if (EXPANSION_COURSE_SLUGS.has(course.slug)) return false;
  return entitlements.purchaseKinds.has("learn_it");
}

export async function getTrainingEntitlements(): Promise<TrainingEntitlements> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const hasLeadAccess = await hasAcademyLeadAccess();
  if (!user) return { user: null, isAdmin: false, hasLeadAccess, purchaseKinds: new Set() };

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
    hasLeadAccess,
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
