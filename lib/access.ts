import { createClient } from "@/lib/supabase/server";

// Training access. Two ways in, and only two:
//
//   1. Admins.
//   2. People who bought the retired Learn It library while it was for sale.
//
// TRAINING IS NOT A PRODUCT. /training says so in its own copy: "New
// standalone enrollment for the legacy library is closed." Nothing in
// /api/checkout sells a `learn_it` kind and the /pricing/learn-it sales page
// permanently redirects away. So the purchases lookup below is not a live
// paywall waiting on a buy button, it is a grandfather clause: it is the only
// thing that keeps an existing customer's library open when they log back in.
// Do not read it as dead code and delete it, and do not build a checkout
// against it without deciding to sell training again first.
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
