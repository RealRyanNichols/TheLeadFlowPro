import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InternalTrafficMarker from "@/components/InternalTrafficMarker";

export const metadata = { title: "Admin | The LeadFlow Pro" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <section className="min-h-screen">
      <InternalTrafficMarker />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-[22px] sm:pt-8">
      <div className="mb-8 flex items-center gap-6 border-b border-line pb-4">
        <h1 className="text-2xl font-black text-[var(--heading)]">Back Office</h1>
        <nav className="flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/admin/command-center" className="text-[var(--text)] hover:text-[var(--heading)]">
            Command
          </Link>
          <Link href="/admin/content-engine" className="text-[var(--text)] hover:text-[var(--heading)]">
            Content
          </Link>
          <Link href="/admin" className="text-[var(--text)] hover:text-[var(--heading)]">
            Leads
          </Link>
          <Link href="/admin/projects" className="text-[var(--text)] hover:text-[var(--heading)]">
            Projects
          </Link>
          <Link href="/admin/clients" className="text-[var(--text)] hover:text-[var(--heading)]">
            Clients
          </Link>
          <Link href="/admin/messages" className="text-[var(--text)] hover:text-[var(--heading)]">
            Messages
          </Link>
          <Link href="/admin/events" className="text-[var(--text)] hover:text-[var(--heading)]">
            Events
          </Link>
          <Link href="/admin/analytics" className="text-[var(--text)] hover:text-[var(--heading)]">
            Analytics
          </Link>
          <Link href="/admin/videos" className="text-[var(--text)] hover:text-[var(--heading)]">
            Videos
          </Link>
          <Link href="/admin/settings" className="text-[var(--text)] hover:text-[var(--heading)]">
            Settings
          </Link>
        </nav>
      </div>
      {children}
    </div>
    </section>
  );
}
