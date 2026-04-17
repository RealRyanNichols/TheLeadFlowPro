/**
 * Notification model — severity first, then by time.
 * Urgent = money on the line RIGHT NOW (missed call, hot lead expiring).
 * High   = response window closing (unreplied DM, booking request).
 * Normal = keep-the-machine-humming items.
 * Low    = FYI.
 */
export type NotifSeverity = "urgent" | "high" | "normal" | "low";
export type NotifKind =
  | "missed_call"
  | "new_lead"
  | "chatbot_escalation"
  | "booking_request"
  | "automation"
  | "insight"
  | "billing"
  | "system";

export interface Notif {
  id: string;
  kind: NotifKind;
  severity: NotifSeverity;
  title: string;
  body: string;
  when: Date;
  href: string;
  read?: boolean;
}

const now = Date.now();
const m  = (mins: number) => new Date(now - mins * 60 * 1000);

export const MOCK_NOTIFS: Notif[] = [
  {
    id: "n1",
    kind: "missed_call",
    severity: "urgent",
    title: "Missed call — Maria G.",
    body: "Called 2 minutes ago about Invisalign. Auto-text went out. Call her back to lock the lead.",
    when: m(2),
    href: "/dashboard/leads/1"
  },
  {
    id: "n2",
    kind: "chatbot_escalation",
    severity: "urgent",
    title: "Chatbot needs you",
    body: "Kevin O'Neil asked about crown pricing — chatbot flagged it for human follow-up.",
    when: m(6),
    href: "/dashboard/leads/4"
  },
  {
    id: "n3",
    kind: "new_lead",
    severity: "high",
    title: "New hot lead — Sara Patel",
    body: "Form fill: wants weekend appointment. 3-hour response window starts now.",
    when: m(45),
    href: "/dashboard/leads/3"
  },
  {
    id: "n4",
    kind: "booking_request",
    severity: "high",
    title: "Booking request",
    body: "James Carter picked Thursday 10am. Confirm or reschedule.",
    when: m(120),
    href: "/dashboard/leads/2"
  },
  {
    id: "n5",
    kind: "automation",
    severity: "normal",
    title: "Nurture sequence finished",
    body: "5-day SMS + video sequence completed for 9 leads this week.",
    when: m(300),
    href: "/dashboard/automations",
    read: true
  },
  {
    id: "n6",
    kind: "insight",
    severity: "normal",
    title: "Weekly AI insight ready",
    body: "Claude found 3 patterns in your TikTok that are driving the most saves.",
    when: m(360),
    href: "/dashboard/insights",
    read: true
  },
  {
    id: "n7",
    kind: "billing",
    severity: "low",
    title: "Growth plan renews in 14 days",
    body: "$15 on your card ending 4242. Nothing to do — just a heads up.",
    when: m(720),
    href: "/dashboard/billing",
    read: true
  },
  {
    id: "n8",
    kind: "system",
    severity: "low",
    title: "TikTok account reconnected",
    body: "Auto-renewed OAuth — you're back to live data.",
    when: m(1440),
    href: "/dashboard/social",
    read: true
  }
];

export const SEVERITY_ORDER: Record<NotifSeverity, number> = {
  urgent: 0, high: 1, normal: 2, low: 3
};

export function sortNotifs(list: Notif[]) {
  return [...list].sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (s !== 0) return s;
    return b.when.getTime() - a.when.getTime();
  });
}

export function timeAgo(d: Date): string {
  const mins = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
}
