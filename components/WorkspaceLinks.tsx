import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  FolderOpen,
  LayoutDashboard,
  Users,
} from "lucide-react";

export default function WorkspaceLinks({ admin = false }: { admin?: boolean }) {
  const links = [
    ...(admin
      ? [
          {
            href: "/admin",
            title: "Leads & conversations",
            detail: "Sources, form answers, calls, and team history",
            icon: Users,
          },
        ]
      : []),
    {
      href: "/dashboard",
      title: "Member portal",
      detail: "Your projects, files, training, and messages",
      icon: LayoutDashboard,
    },
    ...(admin
      ? [
          {
            href: "/admin/sales/delivery",
            title: "Client delivery",
            detail: "Builds, reviews, and the next handoff",
            icon: FolderOpen,
          },
        ]
      : []),
    {
      href: "https://sites.theleadflowpro.com",
      title: "Sites",
      detail: "Open the website and business audit request page",
      icon: Building2,
    },
  ];
  return (
    <nav
      aria-label="Workspace destinations"
      className={`grid gap-3 ${admin ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2"}`}
    >
      {links.map(({ href, title, detail, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-5 transition hover:border-[var(--blue)]"
          {...(href.startsWith("https:")
            ? { target: "_blank", rel: "noreferrer" }
            : {})}
        >
          <div className="mb-3 flex items-center justify-between text-[var(--blue)]">
            <Icon aria-hidden="true" className="h-5 w-5" />
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </div>
          <strong className="block text-sm text-[var(--heading)]">
            {title}
          </strong>
          <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
            {detail}
          </span>
        </Link>
      ))}
    </nav>
  );
}
