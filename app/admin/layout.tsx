import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import BrandLockup from "@/components/BrandLockup";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InternalTrafficMarker from "@/components/InternalTrafficMarker";
import AdminMenuCloser from "./AdminMenuCloser";
import BackOfficeNav from "./BackOfficeNav";
import { MENU_ID } from "./backOfficeNav";

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
      <div data-admin-frame className="mx-auto max-w-6xl px-4 pb-20 pt-[22px] sm:pt-8">
        {/* From sm up the brand sits above the title. On a phone it gives its row to the page, so the first call card's Call button stays on the first screen. */}
        <div data-admin-nav className="mb-6 hidden sm:block">
          <BrandLockup href="/" />
        </div>
        {/*
          One row: the title, then the nav (app/admin/backOfficeNav.ts lists
          what is in it). The row is the Menu panel's anchor, so the panel
          drops from under it. The menu works without JavaScript; the closer
          only tidies it up after a tap.
        */}
        <div data-admin-nav className="relative mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line pb-2 sm:mb-8 sm:gap-x-5 sm:pb-3">
          {/* The title sits level with the first line of the nav, so when the nav wraps on a narrow screen the title stays at the top. */}
          <h1 className="self-start pt-2 text-xl font-black text-[var(--heading)] sm:pt-1.5 sm:text-2xl">
            Back Office
          </h1>
          <BackOfficeNav />
          <AdminMenuCloser menuId={MENU_ID} />
        </div>
        {children}
      </div>
    </section>
  );
}
