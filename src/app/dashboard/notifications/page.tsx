"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Bell, PhoneMissed, UserPlus, Bot, Calendar, Workflow, Sparkles,
  CreditCard, Settings2, CheckCheck, Flame, AlertCircle
} from "lucide-react";
import { MOCK_NOTIFS, sortNotifs, timeAgo, type Notif, type NotifKind } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const ICON: Record<NotifKind, any> = {
  missed_call:        PhoneMissed,
  new_lead:           UserPlus,
  chatbot_escalation: Bot,
  booking_request:    Calendar,
  automation:         Workflow,
  insight:            Sparkles,
  billing:            CreditCard,
  system:             Settings2
};

const SEVERITY_STYLE = {
  urgent: { pill: "bg-red-500/15 text-red-400 border-red-500/30",       icon: "bg-red-500/15 text-red-400",       label: "Urgent" },
  high:   { pill: "bg-accent-500/15 text-accent-400 border-accent-500/30", icon: "bg-accent-500/15 text-accent-400", label: "Needs attention" },
  normal: { pill: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",    icon: "bg-cyan-500/15 text-cyan-400",      label: "Update" },
  low:    { pill: "bg-white/5 text-ink-300 border-white/10",            icon: "bg-white/5 text-ink-300",            label: "FYI" }
} as const;

const FILTERS = [
  { id: "all",     label: "All" },
  { id: "urgent",  label: "Urgent" },
  { id: "high",    label: "Needs attention" },
  { id: "leads",   label: "Leads" },
  { id: "system",  label: "System" }
] as const;

type FilterId = typeof FILTERS[number]["id"];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterId>("all");
  const [items, setItems]   = useState<Notif[]>(sortNotifs(MOCK_NOTIFS));

  function matches(n: Notif): boolean {
    if (filter === "all")    return true;
    if (filter === "urgent") return n.severity === "urgent";
    if (filter === "high")   return n.severity === "high";
    if (filter === "leads")  return ["new_lead", "missed_call", "chatbot_escalation", "booking_request"].includes(n.kind);
    if (filter === "system") return ["automation", "insight", "billing", "system"].includes(n.kind);
    return true;
  }

  const visible = items.filter(matches);
  const urgentCount = items.filter((n) => n.severity === "urgent" && !n.read).length;
  const unreadCount = items.filter((n) => !n.read).length;

  function markAllRead() {
    setItems((x) => x.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-cyan-400" /> Notifications
          </h1>
          <p className="text-sm text-ink-300 mt-1">
            Most serious first. Everything else is sorted by time. Act on the red ones.
          </p>
        </div>
        <button onClick={markAllRead} className="btn-ghost text-xs py-2 px-3">
          <CheckCheck className="h-3.5 w-3.5" /> Mark all read
        </button>
      </div>

      {/* Severity counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Count value={urgentCount} label="Urgent" icon={<Flame className="h-4 w-4 text-red-400" />} tone="red" />
        <Count
          value={items.filter((n) => n.severity === "high" && !n.read).length}
          label="Needs attention"
          icon={<AlertCircle className="h-4 w-4 text-accent-400" />}
          tone="accent"
        />
        <Count value={unreadCount} label="Unread" icon={<Bell className="h-4 w-4 text-cyan-400" />} tone="cyan" />
        <Count value={items.length} label="Total this week" icon={<Sparkles className="h-4 w-4 text-ink-200" />} tone="ink" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "text-xs py-1.5 px-3 rounded-full border transition",
              filter === f.id
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/40"
                : "bg-white/5 text-ink-300 border-white/10 hover:text-white"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {visible.length === 0 && (
          <p className="text-sm text-ink-400 text-center py-10">
            Nothing here. Keep closing deals.
          </p>
        )}
        {visible.map((n) => {
          const Icon = ICON[n.kind];
          const sty  = SEVERITY_STYLE[n.severity];
          return (
            <Link
              key={n.id}
              href={n.href}
              className={cn(
                "glass rounded-2xl p-4 flex items-start gap-3 block hover:border-cyan-500/30 transition",
                !n.read && n.severity === "urgent" && "border-l-4 border-l-red-500"
              )}
            >
              <span className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", sty.icon)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("stat-pill border text-[10px]", sty.pill)}>
                    {sty.label}
                  </span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />}
                  <span className="text-[11px] text-ink-400 ml-auto">{timeAgo(n.when)} ago</span>
                </div>
                <p className="text-sm font-semibold text-white mt-1">{n.title}</p>
                <p className="text-xs text-ink-300 mt-0.5 line-clamp-2">{n.body}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Count({ value, label, icon, tone }: {
  value: number; label: string; icon: React.ReactNode; tone: "red" | "accent" | "cyan" | "ink";
}) {
  const bg =
    tone === "red"    ? "border-red-500/20"    :
    tone === "accent" ? "border-accent-500/20" :
    tone === "cyan"   ? "border-cyan-500/20"   : "border-white/10";
  return (
    <div className={cn("glass rounded-xl p-3 border", bg)}>
      <div className="flex items-center gap-2">{icon}<p className="text-xs text-ink-300">{label}</p></div>
      <p className="text-2xl font-extrabold text-white mt-1">{value}</p>
    </div>
  );
}
