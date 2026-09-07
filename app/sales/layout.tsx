import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InternalTrafficMarker from "@/components/InternalTrafficMarker";
import LiveRefresh from "@/app/admin/command-center/LiveRefresh";
import { ExternalLink } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";

export const metadata = {
  title: "LeadFlow Pro Workspace",
  ...PRIVATE_PAGE_METADATA,
};

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/sales");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "sales" && profile?.role !== "admin")
    redirect("/dashboard");

  return (
    <section className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      <InternalTrafficMarker />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-[22px] sm:pt-8">
        <div className="mb-6">
          <BrandLockup href="/" />
        </div>
        <div className="mb-8 flex flex-wrap items-center gap-4 border-b border-line pb-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black text-[var(--heading)]">
              LeadFlow Pro Workspace
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Leads, shared conversations, follow-ups, and client delivery.
              Signed in as {profile.full_name || user.email}.
            </p>
          </div>
          <LiveRefresh />
          <nav
            aria-label="Staff workspace"
            className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold"
          >
            <Link
              href="/admin/sales"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Pipeline
            </Link>
            <Link
              href="/admin/sales/follow-ups"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Follow-ups
            </Link>
            <Link
              href="/admin/sales/delivery"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Delivery Center
            </Link>
            <Link
              href="/admin/sales/invoices"
              className="text-[var(--text)] hover:text-[var(--heading)]"
            >
              Invoices
            </Link>
            <a
              href="https://sites.theleadflowpro.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1 text-[var(--text)] hover:text-[var(--heading)]"
            >
              Sites landing page{" "}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <Link
              href="/dashboard"
              className="inline-flex min-h-[44px] items-center text-[var(--text)] hover:text-[var(--heading)]"
            >
              Member portal
            </Link>
            {profile.role === "admin" && (
              <Link
                href="/admin"
                className="text-[var(--text)] hover:text-[var(--heading)]"
              >
                Back Office
              </Link>
            )}
            <SignOutButton className="min-h-[44px] rounded-lg border border-[var(--line-strong)] px-3 py-2 text-xs font-bold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)]" />
          </nav>
        </div>
        {children}
      </div>
    </section>
  );
}
