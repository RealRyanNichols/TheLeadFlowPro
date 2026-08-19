import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InternalTrafficMarker from "@/components/InternalTrafficMarker";
import SignOutButton from "./SignOutButton";

export const metadata = { title: "Sales Desk | The LeadFlow Pro" };

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/sales");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "sales" && profile?.role !== "admin") redirect("/dashboard");

  return (
    <section className="min-h-screen">
      <InternalTrafficMarker />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-[22px] sm:pt-8">
        <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-line pb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-[var(--heading)]">LeadFlow Pro Sales Desk</h1>
            <p className="text-xs text-[var(--muted)]">
              Lead pipeline, call context, follow-ups, and conversations
            </p>
          </div>
          <nav className="flex items-center gap-3 text-sm font-semibold">
            <Link href="/sales" className="text-[var(--text)] hover:text-[var(--heading)]">
              Pipeline
            </Link>
            <Link href="/sales/invoices" className="text-[var(--text)] hover:text-[var(--heading)]">
              Invoices
            </Link>
            {profile.role === "admin" && (
              <Link href="/admin" className="text-[var(--text)] hover:text-[var(--heading)]">
                Back Office
              </Link>
            )}
            <SignOutButton />
          </nav>
        </div>
        {children}
      </div>
    </section>
  );
}
