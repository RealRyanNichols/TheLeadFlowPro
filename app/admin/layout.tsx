import { PRIVATE_PAGE_METADATA } from "@/lib/publicPageMetadata";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import BrandLockup from "@/components/BrandLockup";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InternalTrafficMarker from "@/components/InternalTrafficMarker";
import SignOutButton from "@/components/SignOutButton";
import AdminMenuCloser from "./AdminMenuCloser";

export const metadata = {
  title: "Admin | The LeadFlow Pro",
  ...PRIVATE_PAGE_METADATA,
};

type BackOfficeLink = {
  href: string;
  label: string;
  /** Bold and blue in the row, as the two workspaces have always been. */
  strong?: boolean;
  /** Opens in a new tab: a separate site, not a back office page. */
  external?: boolean;
};

/**
 * Every Back Office link after Today's calls, in the order the row shows
 * them. Today's calls is not in this list: it sits first in the nav on its
 * own, the only link to the call sheet, and stays visible on a phone.
 */
const BACK_OFFICE_LINKS: readonly BackOfficeLink[] = [
  // Every open lead no person has called, texted, or noted yet, oldest first,
  // with one-click Mark contacted. Under /admin/sales so Pat (sales) opens it too.
  { href: "/admin/sales/uncalled", label: "Uncalled", strong: true },
  { href: "/admin/command-center", label: "Command" },
  // The owner dashboard on the DigitalOcean server, signed in with this login.
  { href: "/admin/business", label: "Business" },
  { href: "/admin/purchases", label: "Purchases" },
  { href: "/admin/tlfp", label: "Credits" },
  { href: "/admin/operator", label: "OperatorOS", strong: true },
  { href: "/admin/content-engine", label: "Content" },
  { href: "/admin/content-command", label: "Content Command", strong: true },
  { href: "/admin/sales", label: "Sales desk" },
  { href: "/admin", label: "Leads" },
  { href: "/admin/time-back", label: "Time Back" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/videos", label: "Videos" },
  { href: "/admin/training", label: "Training" },
  { href: "/admin/social", label: "Social" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/connections", label: "Connections" },
  { href: "/dashboard", label: "Member portal" },
  { href: "https://sites.theleadflowpro.com", label: "Sites ↗", external: true },
  // The live RN-1 trading desk on its own server. The Command page frames it too.
  { href: "https://trading.theleadflowpro.com/", label: "RN-1 Desk ↗", external: true },
];

/** The id the phone menu's <details> carries, so AdminMenuCloser can find it. */
const MENU_ID = "back-office-menu";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]";
/** The row's link colors from sm up, unchanged. */
const ROW_LINK = "text-[var(--text)] hover:text-[var(--heading)]";
const ROW_LINK_STRONG = "font-black text-[var(--blue)] hover:text-[var(--heading)]";
/** A phone menu link: a full 44px row to tap. */
const MENU_LINK = `flex min-h-[44px] items-center rounded-lg px-3 py-2 hover:bg-[var(--accent-tint)] ${FOCUS}`;

function BackOfficeAnchor({ link, className }: { link: BackOfficeLink; className: string }) {
  return link.external ? (
    <a href={link.href} target="_blank" rel="noreferrer" className={className}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}

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
        {/* From sm up the brand sits above the title. On a phone it gives its row to the page, so the first call card's Call button stays on the first screen. */}
        <div className="mb-6 hidden sm:block">
          <BrandLockup href="/" />
        </div>
        {/*
          From sm up: the title, then every link in one wrapping row, as always.
          Below sm: one compact row with the title, Today's calls, and a Menu
          disclosure holding every other link and Sign out. The menu is a plain
          <details>, so it opens and closes without JavaScript.
        */}
        <div className="relative mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line pb-2 sm:mb-8 sm:gap-6 sm:pb-4">
          <h1 className="text-xl font-black text-[var(--heading)] sm:text-2xl">
            Back Office
          </h1>
          <nav
            aria-label="Back Office"
            className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold sm:basis-auto sm:gap-4"
          >
            <Link
              href="/admin/call-sheet"
              className="font-black text-[var(--text)] hover:text-[var(--heading)] max-sm:inline-flex max-sm:min-h-[44px] max-sm:items-center max-sm:px-1"
            >
              Today&apos;s calls
            </Link>
            {/* From sm up: the rest of the row. display: contents keeps each link a direct item of the row, exactly as before. */}
            <div className="contents max-sm:hidden">
              {BACK_OFFICE_LINKS.map((link) => (
                <BackOfficeAnchor key={link.href} link={link} className={link.strong ? ROW_LINK_STRONG : ROW_LINK} />
              ))}
              <SignOutButton className="min-h-[44px] rounded-lg border border-[var(--line-strong)] px-3 py-2 text-xs font-bold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)]" />
            </div>
            {/* Below sm: the same links behind Menu. */}
            <details id={MENU_ID} className="group ml-auto sm:hidden">
              <summary
                className={`flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-lg border border-[var(--line-strong)] px-3 text-sm font-bold text-[var(--text)] [&::-webkit-details-marker]:hidden ${FOCUS}`}
              >
                <Menu aria-hidden="true" className="h-4 w-4 shrink-0 group-open:hidden" />
                <X aria-hidden="true" className="hidden h-4 w-4 shrink-0 group-open:block" />
                Menu
              </summary>
              <div className="absolute inset-x-0 top-full z-40 mt-2 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] p-2 shadow-lg">
                <ul className="grid grid-cols-2 gap-1">
                  {BACK_OFFICE_LINKS.map((link) => (
                    <li key={link.href} className="min-w-0">
                      <BackOfficeAnchor
                        link={link}
                        className={`${MENU_LINK} ${link.strong ? "font-black text-[var(--blue)]" : "text-[var(--text)]"}`}
                      />
                    </li>
                  ))}
                </ul>
                <div className="mt-2 border-t border-[var(--line)] pt-2">
                  <SignOutButton
                    className={`flex min-h-[44px] w-full items-center justify-center rounded-lg border border-[var(--line-strong)] px-3 py-2 text-sm font-bold text-[var(--text)] hover:border-[var(--accent-line)] hover:text-[var(--heading)] ${FOCUS}`}
                  />
                </div>
              </div>
            </details>
          </nav>
          <AdminMenuCloser menuId={MENU_ID} />
        </div>
        {children}
      </div>
    </section>
  );
}
