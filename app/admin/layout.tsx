import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InternalTrafficMarker from "@/components/InternalTrafficMarker";
import SignOutButton from "@/components/SignOutButton";

export const metadata = {
  title: "Admin | The LeadFlow Pro",
  ...PRIVATE_PAGE_METADATA,
};

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
    <section className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      <InternalTrafficMarker />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-[22px] sm:pt-8">
        <div className="mb-6">
          <BrandLockup href="/" />
        </div>
        <div className="mb-8 flex flex-wrap items-center gap-6 border-b border-line pb-4">
          <h1 className="text-2xl font-black text-[var(--heading)]">
            Back Office
          </h1>
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-4 text-sm font-semibold">
            <Link
              href="/admin/command-center"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Command
            </Link>
            <Link
              href="/admin/operator"
              className="font-black text-[var(--blue)] hover:text-[var(--heading)]"
            >
              OperatorOS
            </Link>
            <Link
              href="/admin/content-engine"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Content
            </Link>
            <Link
              href="/admin"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Leads
            </Link>
            <Link
              href="/admin/time-back"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Time Back
            </Link>
            <Link
              href="/admin/projects"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Projects
            </Link>
            <Link
              href="/admin/clients"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Clients
            </Link>
            <Link
              href="/admin/messages"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Messages
            </Link>
            <Link
              href="/admin/events"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Events
            </Link>
            <Link
              href="/admin/analytics"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Analytics
            </Link>
            <Link
              href="/admin/videos"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Videos
            </Link>
            <Link
              href="/admin/training"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Training
            </Link>
            <Link
              href="/admin/social"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Social
            </Link>
            <Link
              href="/admin/settings"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Settings
            </Link>
            <Link
              href="/admin/connections"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Connections
            </Link>
            <Link
              href="/dashboard"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Member portal
            </Link>
            <a
              href="https://sites.theleadflowpro.com"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Sites ↗
            </a>
            <SignOutButton className="min-h-[44px] rounded-lg border border-[var(--line-strong)] px-3 py-2 text-xs font-bold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)]" />
          </nav>
        </div>
        {children}
      </div>
    </section>
  );
}
