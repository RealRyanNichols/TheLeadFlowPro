/**
 * Notification model — severity first, then by time.
 * Urgent = money on the line RIGHT NOW (missed call, hot lead expiring).
 * High   = response window closing (unreplied DM, booking request).
 * Normal = keep-the-machine-humming items.
 * Low    = FYI.
 *
 * MOCK_NOTIFS is an empty list on purpose: a freshly-onboarded account
 * has nothing to show until real events fire. "No fake stats once logged
 * in" applies here too — real notifications will flow in as integrations
 * connect (phone, chat, booking, billing). The empty state is a feature.
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

export const MOCK_NOTIFS: Notif[] = [];

export const SEVERITY_ORDER: Record<NotifSeverity, number> = {
  urgent: 0, high: 1, normal: 2, low: 3,
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
