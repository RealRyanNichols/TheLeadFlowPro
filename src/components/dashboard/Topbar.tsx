import Link from "next/link";
import { Bell, Search } from "lucide-react";
import { MOCK_NOTIFS } from "@/lib/notifications";
import { MobileSidebar } from "./Sidebar";
import { currentUser } from "@/lib/auth";

export async function Topbar() {
  const urgentUnread = MOCK_NOTIFS.filter((n) => !n.read && n.severity === "urgent").length;
  const anyUnread = MOCK_NOTIFS.some((n) => !n.read);

  const user = await currentUser().catch(() => null);
  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Your account";
  const businessName = user?.businessName || "Free plan";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-16 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl flex items-center justify-between px-3 sm:px-6 gap-2 sm:gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <MobileSidebar />
        {/* search — full on sm+, icon-only on mobile */}
        <div className="relative flex-1 max-w-lg hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input
            type="search"
            placeholder="Search leads, messages, insights…"
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm placeholder:text-ink-400 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          aria-label="Search"
          className="sm:hidden h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-300"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <Link
          href="/dashboard/notifications"
          aria-label={`Notifications${urgentUnread ? ` — ${urgentUnread} urgent` : ""}`}
          className="relative h-9 w-9 rounded-lg hover:bg-white/5 flex items-center justify-center text-ink-300 hover:text-white"
        >
          <Bell className="h-4 w-4" />
          {urgentUnread > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {urgentUnread > 9 ? "9+" : urgentUnread}
            </span>
          ) : anyUnread ? (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent-500" />
          ) : null}
        </Link>
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2 pl-1.5 pr-2 sm:pl-2 sm:pr-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          <span className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500 to-accent-500 flex items-center justify-center text-xs font-bold text-ink-950">
            {initial}
          </span>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-white leading-none">{displayName}</div>
            <div className="text-[11px] text-ink-400 leading-none mt-0.5 truncate max-w-[10rem]">{businessName}</div>
          </div>
        </Link>
      </div>
    </header>
  );
}
