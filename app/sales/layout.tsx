import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InternalTrafficMarker from "@/components/InternalTrafficMarker";
import AdminShell from "@/app/admin/AdminShell";
import { ownerDashboardLoginFor } from "@/lib/adminOwnerAccess";
import "@/app/admin/admin-workspace.css";

export const metadata = { title: "LeadFlow Pro Workspace", ...PRIVATE_PAGE_METADATA };
export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/sales");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "sales" && profile?.role !== "admin") redirect("/dashboard");
  const isAdmin = profile.role === "admin";
  const login = isAdmin ? ownerDashboardLoginFor(user.email) : null;
  const name = login === "ryan" ? "Ryan Nichols" : login === "pat" ? "Patrick" : profile.full_name || "LeadFlow team";
  return <><InternalTrafficMarker /><AdminShell name={name} ownerLogin={login} ownerAccess={!!login} scope={isAdmin ? "admin" : "sales"}>{children}</AdminShell></>;
}
