import { createClient } from "@/lib/supabase/server";

// Training access: admins and Learn It purchasers (matched by login email via RLS).
export async function getTrainingAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, hasTraining: false, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";
  if (isAdmin) return { user, hasTraining: true, isAdmin };

  // RLS restricts this to the caller's own purchases.
  const { data: p } = await supabase
    .from("purchases")
    .select("id")
    .eq("kind", "learn_it")
    .eq("status", "paid")
    .limit(1);
  return { user, hasTraining: (p ?? []).length > 0, isAdmin };
}
