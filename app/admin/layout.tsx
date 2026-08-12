import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    // The back office is the one surface that stays navy. `.is-dark-app`
    // redeclares the palette locally so every legacy class inside it keeps
    // working exactly as before.
    <section className="is-dark-app min-h-screen">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-[22px] sm:pt-8">
      <div className="mb-8 flex items-center gap-6 border-b border-line pb-4">
        <h1 className="text-2xl font-black text-white">Back Office</h1>
        <nav className="flex flex-wrap gap-4 text-sm font-semibold">
          <Link href="/admin" className="text-slate-300 hover:text-white">
            Leads
          </Link>
          <Link href="/admin/projects" className="text-slate-300 hover:text-white">
            Projects
          </Link>
          <Link href="/admin/clients" className="text-slate-300 hover:text-white">
            Clients
          </Link>
          <Link href="/admin/messages" className="text-slate-300 hover:text-white">
            Messages
          </Link>
          <Link href="/admin/events" className="text-slate-300 hover:text-white">
            Events
          </Link>
          <Link href="/admin/analytics" className="text-slate-300 hover:text-white">
            Analytics
          </Link>
          <Link href="/admin/videos" className="text-slate-300 hover:text-white">
            Videos
          </Link>
          <Link href="/admin/settings" className="text-slate-300 hover:text-white">
            Settings
          </Link>
        </nav>
      </div>
      {children}
    </div>
    </section>
  );
}
