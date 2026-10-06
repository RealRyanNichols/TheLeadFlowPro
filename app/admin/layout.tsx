import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InternalTrafficMarker from "@/components/InternalTrafficMarker";
import { ownerDashboardLoginFor } from "@/lib/adminOwnerAccess";
import AdminShell from "./AdminShell";
import "./admin-workspace.css";

export const metadata = { title: "Admin | The LeadFlow Pro", ...PRIVATE_PAGE_METADATA };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");
  const ownerLogin = ownerDashboardLoginFor(user.email);
  const name = ownerLogin === "ryan" ? "Ryan Nichols" : ownerLogin === "pat" ? "Patrick Grabbs" : "LeadFlow admin";
  return <><InternalTrafficMarker /><AdminShell ownerAccess={!!ownerLogin} ownerLogin={ownerLogin} name={name}>{children}</AdminShell></>;
}
