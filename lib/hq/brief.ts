import { OPEN_STATUSES, type Content, type HqEvent, type Lead, type Workspace } from "./types";
import { rankLeads } from "./score";
import { dueFollowUps, upcomingFollowUps } from "./followups";
import { responseStats } from "./watchdog";
import { ago, localDateShift, localParts, longLocalDate } from "./time";
import { formatPhone } from "./phone";

// The daily brief and the weekly report. Both are built from the
// workspace's own rows, both say what to do next, and both are stored so
// the plugin can hand them back on demand. No estimates, no invented
// numbers: when a figure is not there, the line is not there.

export type BriefAction = {
  kind: "call" | "follow_up" | "approve" | "setup" | "reply";
  text: string;
  leadId?: string;
  contentId?: string;
  href?: string;
};

export type DailyBrief = {
  date: string;
  title: string;
  headline: string;
  numbers: { label: string; value: string; tone?: "good" | "warn" | "bad" | "neutral" }[];
  callNow: { leadId: string; name: string; phone: string; why: string; waiting: string }[];
  followUps: { leadId: string; name: string; phone: string; step: number }[];
  approvals: { contentId: string; kind: string; title: string }[];
  actions: BriefAction[];
  text: string;
};

export type BriefInput = {
  workspace: Workspace;
  leads: Lead[];
  events: HqEvent[];
  content: Content[];
  now: Date;
};

export function buildDailyBrief(input: BriefInput): DailyBrief {
  const { workspace: ws, leads, content, now } = input;
  const tz = ws.timezone;
  const today = localParts(now, tz).date;
  const yesterday = localDateShift(now, tz, -1);

  const cameYesterday = leads.filter((l) => localParts(new Date(l.created_at), tz).date === yesterday && l.status !== "spam");
  const cameToday = leads.filter((l) => localParts(new Date(l.created_at), tz).date === today && l.status !== "spam");
  const open = leads.filter((l) => OPEN_STATUSES.includes(l.status));
  const uncontacted = open.filter((l) => l.status === "new" && !l.first_contact_at);
  const ranked = rankLeads(open, now).slice(0, 5);
  const due = dueFollowUps(open, now);
  const soon = upcomingFollowUps(open, now, 24).filter((l) => !due.includes(l));
  const pending = content.filter((c) => c.status === "draft");
  const wonThisWeek = leads.filter(
    (l) => l.status === "won" && l.last_contact_at && new Date(l.last_contact_at).getTime() > now.getTime() - 7 * 86_400_000,
  );

  const numbers: DailyBrief["numbers"] = [
    { label: "New yesterday", value: String(cameYesterday.length), tone: cameYesterday.length ? "good" : "neutral" },
    {
      label: "Waiting on you",
      value: String(uncontacted.length),
      tone: uncontacted.length === 0 ? "good" : uncontacted.length > 2 ? "bad" : "warn",
    },
    { label: "Follow-ups due", value: String(due.length), tone: due.length ? "warn" : "neutral" },
    { label: "Won this week", value: String(wonThisWeek.length), tone: wonThisWeek.length ? "good" : "neutral" },
  ];
  if (cameToday.length) numbers.unshift({ label: "New today", value: String(cameToday.length), tone: "good" });

  const callNow = ranked
    .filter((s) => s.lead.status === "new" || (s.lead.next_follow_up_at && new Date(s.lead.next_follow_up_at) <= now))
    .slice(0, 3)
    .map((s) => ({
      leadId: s.lead.id,
      name: s.lead.name || "No name given",
      phone: formatPhone(s.lead.phone),
      why: s.reasons.join(", "),
      waiting: ago(new Date(s.lead.created_at), now),
    }));

  const followUps = [...due, ...soon].slice(0, 6).map((l) => ({
    leadId: l.id,
    name: l.name || "No name given",
    phone: formatPhone(l.phone),
    step: l.follow_up_step + 1,
  }));

  const approvals = pending.slice(0, 5).map((c) => ({ contentId: c.id, kind: c.kind, title: c.title }));

  const actions: BriefAction[] = [];
  for (const c of callNow) {
    actions.push({ kind: "call", text: `Call ${c.name}${c.phone ? ` at ${c.phone}` : ""}. ${cap(c.why)}.`, leadId: c.leadId, href: `/hq/leads/${c.leadId}` });
  }
  for (const f of followUps.slice(0, 3)) {
    if (callNow.some((c) => c.leadId === f.leadId)) continue;
    actions.push({ kind: "follow_up", text: `Send follow-up ${f.step} to ${f.name}. The draft is ready.`, leadId: f.leadId, href: `/hq/leads/${f.leadId}` });
  }
  if (approvals.length) {
    actions.push({
      kind: "approve",
      text: `Approve ${approvals.length} draft${approvals.length === 1 ? "" : "s"} waiting in Content (${approvals.map((a) => a.kind.replace("_", " ")).join(", ")}).`,
      href: "/hq/content",
    });
  }
  if (actions.length === 0) {
    actions.push({ kind: "setup", text: "Inbox is clear. Post today's draft or ask for a review from your last happy customer.", href: "/hq/content" });
  }

  const headline =
    uncontacted.length > 0
      ? `${uncontacted.length} ${uncontacted.length === 1 ? "person is" : "people are"} waiting to hear from you.`
      : due.length > 0
        ? `${due.length} follow-up${due.length === 1 ? "" : "s"} due today. Nobody is waiting on a first reply.`
        : cameYesterday.length > 0
          ? `${cameYesterday.length} new lead${cameYesterday.length === 1 ? "" : "s"} yesterday, all answered.`
          : "Quiet inbox. Good day to go get attention.";

  const title = `${ws.name}: ${longLocalDate(now, tz)}`;

  const text = [
    title,
    headline,
    "",
    ...numbers.map((n) => `${n.label}: ${n.value}`),
    "",
    callNow.length ? "CALL NOW" : "",
    ...callNow.map((c, i) => `${i + 1}. ${c.name}${c.phone ? ` ${c.phone}` : ""} (${c.waiting}) ${c.why}`),
    callNow.length ? "" : "",
    followUps.length ? "FOLLOW-UPS" : "",
    ...followUps.map((f) => `- ${f.name}${f.phone ? ` ${f.phone}` : ""}, follow-up ${f.step}`),
    followUps.length ? "" : "",
    approvals.length ? "WAITING ON APPROVAL" : "",
    ...approvals.map((a) => `- ${a.kind.replace("_", " ")}: ${a.title}`),
    approvals.length ? "" : "",
    "DO THIS",
    ...actions.map((a, i) => `${i + 1}. ${a.text}`),
    "",
    "Open HQ: https://www.theleadflowpro.com/hq",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");

  return { date: today, title, headline, numbers, callNow, followUps, approvals, actions, text };
}

function cap(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export type WeeklyReport = {
  weekStart: string;
  weekEnd: string;
  title: string;
  numbers: { label: string; value: string; tone?: "good" | "warn" | "bad" | "neutral" }[];
  bySource: { source: string; count: number }[];
  byDay: { date: string; count: number }[];
  response: ReturnType<typeof responseStats>;
  wins: { name: string; value: string }[];
  takeaways: string[];
  text: string;
};

export function buildWeeklyReport(input: BriefInput): WeeklyReport {
  const { workspace: ws, leads, events, content, now } = input;
  const tz = ws.timezone;
  const weekEnd = localDateShift(now, tz, -1);
  const weekStart = localDateShift(now, tz, -7);
  const inWeek = (iso: string) => {
    const d = localParts(new Date(iso), tz).date;
    return d >= weekStart && d <= weekEnd;
  };
  const week = leads.filter((l) => inWeek(l.created_at) && l.status !== "spam");
  const contactedInWeek = week.filter((l) => l.first_contact_at);
  const won = leads.filter((l) => l.status === "won" && l.last_contact_at && inWeek(l.last_contact_at));
  const booked = leads.filter((l) => l.status === "booked" && l.last_contact_at && inWeek(l.last_contact_at));
  const sentTexts = events.filter((e) => e.kind === "text_out" && inWeek(e.created_at)).length;
  const sentEmails = events.filter((e) => e.kind === "email_out" && inWeek(e.created_at)).length;
  const published = content.filter((c) => c.published_at && inWeek(c.published_at)).length;
  const response = responseStats(week);
  const wonValue = won.reduce((s, l) => s + (l.value_cents ?? 0), 0);

  const sources = new Map<string, number>();
  for (const l of week) sources.set(l.source, (sources.get(l.source) ?? 0) + 1);
  const bySource = [...sources.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);

  const byDay: WeeklyReport["byDay"] = [];
  for (let i = 7; i >= 1; i--) {
    const date = localDateShift(now, tz, -i);
    byDay.push({ date, count: week.filter((l) => localParts(new Date(l.created_at), tz).date === date).length });
  }

  const numbers: WeeklyReport["numbers"] = [
    { label: "New leads", value: String(week.length), tone: week.length ? "good" : "neutral" },
    {
      label: "Contacted",
      value: week.length ? `${contactedInWeek.length} of ${week.length}` : "0",
      tone: week.length === 0 ? "neutral" : contactedInWeek.length === week.length ? "good" : "warn",
    },
    {
      label: "Median first reply",
      value: response.medianMinutes === null ? "n/a" : humanMinutes(response.medianMinutes),
      tone: response.medianMinutes === null ? "neutral" : response.medianMinutes <= 15 ? "good" : response.medianMinutes <= 60 ? "warn" : "bad",
    },
    { label: "Booked", value: String(booked.length), tone: booked.length ? "good" : "neutral" },
    { label: "Won", value: wonValue ? `${won.length} ($${Math.round(wonValue / 100).toLocaleString("en-US")})` : String(won.length), tone: won.length ? "good" : "neutral" },
    { label: "Messages sent", value: String(sentTexts + sentEmails), tone: "neutral" },
    { label: "Posts published", value: String(published), tone: published ? "good" : "neutral" },
  ];

  const takeaways: string[] = [];
  if (week.length && contactedInWeek.length < week.length) {
    takeaways.push(`${week.length - contactedInWeek.length} lead${week.length - contactedInWeek.length === 1 ? "" : "s"} from this week never got a first reply. They are at the top of the call list.`);
  }
  if (response.medianMinutes !== null && response.medianMinutes > 60) {
    takeaways.push(`Median first reply was ${humanMinutes(response.medianMinutes)}. Turning on the instant text-back in Settings answers in under a minute.`);
  }
  if (bySource.length === 1) {
    takeaways.push(`Every lead came from one source (${bySource[0].source}). Adding the website form endpoint or a second channel spreads the risk.`);
  }
  if (week.length === 0) {
    takeaways.push("No new leads this week. The weekly content drafts are the cheapest way to get attention. Post them.");
  }
  if (published === 0 && content.some((c) => c.status === "draft")) {
    takeaways.push("Drafts are waiting in Content. Nothing was published this week.");
  }
  if (takeaways.length === 0) takeaways.push("Every lead was answered. Keep the streak.");

  const title = `${ws.name}: week of ${weekStart}`;
  const text = [
    title,
    "",
    ...numbers.map((n) => `${n.label}: ${n.value}`),
    "",
    bySource.length ? "BY SOURCE" : "",
    ...bySource.map((s) => `- ${s.source}: ${s.count}`),
    bySource.length ? "" : "",
    won.length ? "WON" : "",
    ...won.map((l) => `- ${l.name || "No name"}${l.value_cents ? ` $${Math.round(l.value_cents / 100).toLocaleString("en-US")}` : ""}`),
    won.length ? "" : "",
    "TAKEAWAYS",
    ...takeaways.map((t, i) => `${i + 1}. ${t}`),
    "",
    "Open HQ: https://www.theleadflowpro.com/hq",
  ]
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");

  return {
    weekStart,
    weekEnd,
    title,
    numbers,
    bySource,
    byDay,
    response,
    wins: won.map((l) => ({ name: l.name || "No name", value: l.value_cents ? `$${Math.round(l.value_cents / 100).toLocaleString("en-US")}` : "" })),
    takeaways,
    text,
  };
}

export function humanMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.round((mins / 60) * 10) / 10;
  if (h < 48) return `${h} hr`;
  return `${Math.round(h / 24)} days`;
}
