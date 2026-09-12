import { serverActions, smsLine } from "./actions";
import { buildDailyBrief, buildWeeklyReport } from "./brief";
import { sendOwnerEmail, sendSms } from "./channels";
import { buildWeeklyContent } from "./content";
import { emailReply, followUp, ownerAlertText, textBack } from "./drafts";
import { dueFollowUps } from "./followups";
import { isPlausibleEmail } from "./phone";
import { line } from "./copy";
import * as db from "./server";
import { localParts, localWeekStart } from "./time";
import { OPEN_STATUSES, planIsLive, type Lead, type Workspace } from "./types";
import { pendingAlerts } from "./watchdog";
import { syncWorkspaceFromStripe } from "./subscription";

// The Autopilot pulse. Runs every five minutes for every live workspace and
// does the things a good office manager would do without being asked:
//
//   * answer a brand-new lead instantly (text or email, per the settings)
//   * tell the owner the moment a lead lands, and again when one slips
//   * draft the follow-up that is due today and put it in the brief
//   * build the morning brief at the owner's hour, once
//   * build the weekly report and the weekly content drafts, once a week
//
// Every "once" is a dedupe key on hq_events or a unique row in hq_briefs,
// so the cron is safe to run as often as Vercel likes. Nothing here sends
// a follow-up on its own; only the instant reply to a brand-new lead is
// automatic, and only when the owner switched it on.

export type PulseSummary = {
  workspaceId: string;
  name: string;
  newLeadsHandled: number;
  alertsSent: number;
  autoReplies: number;
  followUpsDrafted: number;
  briefBuilt: boolean;
  reportBuilt: boolean;
  contentDrafted: number;
  errors: string[];
};

const PULSE_BUDGET_MS = 45_000;
const STRIPE_SYNC_SECONDS = 86_400;

export async function runPulseForAll(client: db.Db, now = new Date()): Promise<PulseSummary[]> {
  const workspaces = await db.listLiveWorkspaces(client);
  const out: PulseSummary[] = [];
  const started = Date.now();
  // Start somewhere different every run so a long list never leaves the
  // same businesses at the back of the line when the budget runs out.
  const offset = workspaces.length ? Math.floor(now.getTime() / 300_000) % workspaces.length : 0;
  for (let i = 0; i < workspaces.length; i++) {
    if (Date.now() - started > PULSE_BUDGET_MS) {
      console.warn(`hq-pulse: budget spent after ${i} of ${workspaces.length} workspaces`);
      break;
    }
    const ws = workspaces[(offset + i) % workspaces.length];
    if (!planIsLive(ws.plan, ws.trial_ends_at, now)) {
      if (ws.plan === "trial") await expireTrial(client, ws, now);
      continue;
    }
    try {
      out.push(await runPulse(client, ws, now));
    } catch (e) {
      out.push({ workspaceId: ws.id, name: ws.name, newLeadsHandled: 0, alertsSent: 0, autoReplies: 0, followUpsDrafted: 0, briefBuilt: false, reportBuilt: false, contentDrafted: 0, errors: [e instanceof Error ? e.message : "unknown"] });
    }
  }
  return out;
}

async function expireTrial(client: db.Db, ws: Workspace, now: Date) {
  // The trial clock ran out on our side. Before calling it over, ask Stripe:
  // a card charged on schedule means the plan is active, and only Stripe
  // knows if the subscription webhook never reached us. When Stripe answers,
  // its answer is already on the workspace; anything but a cancel means the
  // plan goes on (or Stripe is a few minutes from closing the trial itself).
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const synced = await syncWorkspaceFromStripe(client, ws, stripeKey, now);
  if (synced && synced.plan !== "canceled") return;
  // Stripe has the subscription but could not be reached: the engine stays
  // paused (the trial date already passed) and the next pulse asks again.
  // Canceling now would leave a card that was charged on time looking lapsed.
  if (!synced && stripeKey && ws.stripe_subscription_id) return;
  if (!synced) await db.updateWorkspace(client, ws.id, { plan: "canceled" });
  const first = await db.recordEvent(client, ws.id, { kind: "system", detail: "Trial ended", actor: "cron", dedupeKey: "trial:ended" });
  if (first && ws.settings.alertEmail) {
    await sendOwnerEmail(ws, `Your ${ws.name} trial ended`, `The 14 day trial for ${ws.name} ended today. The engine has paused: no more instant replies, alerts, or drafts.\n\nTo keep it running, open https://www.theleadflowpro.com/hq/billing and start the plan. Your leads and history are safe either way.`, `trial-ended-${ws.id}-${now.toISOString().slice(0, 10)}`);
  }
}

export async function runPulse(client: db.Db, ws: Workspace, now = new Date()): Promise<PulseSummary> {
  const summary: PulseSummary = { workspaceId: ws.id, name: ws.name, newLeadsHandled: 0, alertsSent: 0, autoReplies: 0, followUpsDrafted: 0, briefBuilt: false, reportBuilt: false, contentDrafted: 0, errors: [] };
  const actions = serverActions(client, ws);
  const leads = await db.listLeads(client, ws.id, { statuses: OPEN_STATUSES, limit: 500, sinceDays: 120 });

  // 1. Brand-new leads: instant reply and the owner's alert. Each lead gets
  //    handled exactly once, marked by the "lead:handled" dedupe key.
  for (const lead of leads.filter((l) => l.status === "new" && !l.auto_replied_at)) {
    const first = await db.recordEvent(client, ws.id, { kind: "system", detail: "Autopilot picked up the lead", leadId: lead.id, actor: "cron", dedupeKey: `lead:handled:${lead.id}` });
    if (!first) continue;
    summary.newLeadsHandled++;
    try {
      const replied = await instantReply(client, ws, lead, actions);
      if (replied) summary.autoReplies++;
      const alerted = await ownerAlert(client, ws, lead, now);
      if (alerted) summary.alertsSent++;
    } catch (e) {
      summary.errors.push(`lead ${lead.id}: ${e instanceof Error ? e.message : "unknown"}`);
    }
  }

  // 2. Slipping leads: the watchdog stages, once each.
  const fired = await db.firedKeys(client, ws.id, "watchdog:");
  const alerts = pendingAlerts(leads, ws.settings, fired, now);
  for (const alert of alerts) {
    const recorded = await db.recordEvent(client, ws.id, { kind: "alert", detail: alert.headline, leadId: alert.lead.id, actor: "cron", dedupeKey: alert.dedupeKey, meta: { stage: alert.stage } });
    if (!recorded) continue;
    if (ws.settings.alertEmail) {
      const r = await sendOwnerEmail(ws, alert.headline, [`${alert.lead.name || "A lead"} came in ${alert.minutesWaiting} minutes ago from ${alert.lead.source} and nobody has replied.`, alert.lead.phone ? `Phone: ${alert.lead.phone}` : "", alert.lead.message ? `They said: "${alert.lead.message.slice(0, 300)}"` : "", "", `Open the lead: https://www.theleadflowpro.com/hq/leads/${alert.lead.id}`].filter(Boolean).join("\n"), alert.dedupeKey);
      if (r.ok) summary.alertsSent++;
    }
    if (ws.settings.alertSms) {
      const r = await textOwner(client, ws, alert.headline.slice(0, 280));
      if (r) summary.alertsSent++;
    }
  }

  // 3. Follow-ups due: draft the message once per rung so the brief and the
  //    lead page have it ready. The owner sends it.
  for (const lead of dueFollowUps(leads, now)) {
    const key = `followup:drafted:${lead.id}:${lead.follow_up_step}`;
    const first = await db.recordEvent(client, ws.id, { kind: "follow_up", detail: `Follow-up ${lead.follow_up_step + 1} is due`, leadId: lead.id, actor: "cron", dedupeKey: key });
    if (!first) continue;
    const draft = followUp(ws, lead, lead.follow_up_step);
    await db.insertMessage(client, ws.id, { leadId: lead.id, direction: "out", channel: draft.channel, purpose: draft.purpose, body: draft.body, subject: draft.subject ?? null, status: "draft", createdBy: "cron" });
    summary.followUpsDrafted++;
  }

  // 4. The daily brief, at the owner's hour, once per local day. The cheap
  //    check first: a brief row for today means the heavy fetch is skipped.
  const local = localParts(now, ws.timezone);
  const todaysBrief = local.hour >= ws.settings.briefHour ? await db.latestBrief(client, ws.id, "daily") : null;
  const weeklyDue = local.weekday === ws.settings.weeklyDay;
  const weeklyDone = weeklyDue ? (await db.latestBrief(client, ws.id, "weekly"))?.brief_date === local.date : true;
  const briefDone = todaysBrief?.brief_date === local.date;
  if (local.hour >= ws.settings.briefHour && (!briefDone || !weeklyDone)) {
    const allLeads = await db.listLeads(client, ws.id, { limit: 1000, sinceDays: 120 });
    const [events, content] = await Promise.all([db.listEvents(client, ws.id, { sinceDays: 14, limit: 500 }), db.listContent(client, ws.id, { limit: 100 })]);
    const brief = buildDailyBrief({ workspace: ws, leads: allLeads, events, content, now });
    const stored = await db.insertBrief(client, ws.id, { kind: "daily", date: local.date, text: brief.text, json: brief as unknown as Record<string, unknown>, deliveredVia: [] });
    if (stored) {
      summary.briefBuilt = true;
      const via: string[] = ["hq"];
      if (ws.settings.briefEmail) {
        const r = await sendOwnerEmail(ws, `${brief.headline} (${ws.name})`, brief.text, `brief-${ws.id}-${local.date}`);
        if (r.ok) via.push("email");
        else summary.errors.push(`brief email: ${r.error}`);
      }
      await db.recordEvent(client, ws.id, { kind: "brief", detail: brief.headline, actor: "cron", meta: { date: local.date, via } });
    }

    // 5. Weekly, on the owner's day: the report and the content drafts.
    if (local.weekday === ws.settings.weeklyDay) {
      const report = buildWeeklyReport({ workspace: ws, leads: allLeads, events, content, now });
      const weekly = await db.insertBrief(client, ws.id, { kind: "weekly", date: local.date, text: report.text, json: report as unknown as Record<string, unknown>, deliveredVia: [] });
      if (weekly) {
        summary.reportBuilt = true;
        if (ws.settings.briefEmail) await sendOwnerEmail(ws, `Weekly scoreboard: ${ws.name}`, report.text, `report-${ws.id}-${local.date}`);
        await db.recordEvent(client, ws.id, { kind: "report", detail: `Weekly report for week of ${report.weekStart}`, actor: "cron", meta: { week_start: report.weekStart } });
      }
      if (ws.settings.weeklyContent) {
        const weekOf = localWeekStart(now, ws.timezone);
        const first = await db.recordEvent(client, ws.id, { kind: "content", detail: `Drafted the week's content (${weekOf})`, actor: "cron", dedupeKey: `content:${weekOf}` });
        if (first) {
          const bundle = buildWeeklyContent(ws, weekOf);
          for (const d of bundle.drafts) {
            await db.insertContent(client, ws.id, { kind: d.kind, title: d.title, body: d.body, hook: d.hook, cta: d.cta, extras: d.extras, weekOf, createdBy: "cron" });
            summary.contentDrafted++;
          }
        }
      }
    }
  }

  // 6. Once a day, reconcile the plan with Stripe. Webhooks are the fast
  //    path; this is the one that cannot be misconfigured away. The last
  //    Stripe touch (webhook or check) is stamped on the workspace, so a
  //    day without one is the cue and nothing extra is written when the
  //    plan is unchanged.
  if (ws.stripe_subscription_id && ws.stripe_event_at < Math.floor(now.getTime() / 1000) - STRIPE_SYNC_SECONDS) {
    const synced = await syncWorkspaceFromStripe(client, ws, process.env.STRIPE_SECRET_KEY, now);
    if (synced) Object.assign(ws, synced, { stripe_event_at: Math.floor(now.getTime() / 1000) });
  }

  // 7. Trial reminders: three days out and the day before.
  if (ws.plan === "trial" && ws.trial_ends_at) {
    const daysLeft = Math.ceil((new Date(ws.trial_ends_at).getTime() - now.getTime()) / 86_400_000);
    if (daysLeft === 3 || daysLeft === 1) {
      const first = await db.recordEvent(client, ws.id, { kind: "system", detail: `Trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`, actor: "cron", dedupeKey: `trial:reminder:${daysLeft}` });
      if (first) {
        await sendOwnerEmail(ws, `${daysLeft} day${daysLeft === 1 ? "" : "s"} left on your ${ws.name} trial`, `Your trial ends ${new Date(ws.trial_ends_at).toDateString()}. Nothing to do if your card is on file; the plan continues at $49 a month and you can cancel any time from https://www.theleadflowpro.com/hq/billing.`, `trial-reminder-${ws.id}-${daysLeft}`);
      }
    }
  }

  return summary;
}

/** The instant reply to a brand-new lead, text first, email second. */
async function instantReply(client: db.Db, ws: Workspace, lead: Lead, actions: ReturnType<typeof serverActions>): Promise<boolean> {
  let sent = false;
  const stamp = { auto_replied_at: new Date().toISOString() };
  if (ws.settings.autoTextBack && lead.phone && lead.consent_sms && !lead.unsubscribed_at) {
    const line = await smsLine(client, ws.id);
    if (line) {
      const draft = textBack(ws, lead);
      const message = await db.insertMessage(client, ws.id, { leadId: lead.id, direction: "out", channel: "sms", purpose: "text_back", body: draft.body, status: "queued", createdBy: "autopilot" });
      const delivered = await actions.deliverMessage(message, lead);
      sent = delivered.status === "sent";
    }
  }
  if (!sent && ws.settings.autoEmailReply && lead.email && isPlausibleEmail(lead.email) && lead.consent_email) {
    const draft = emailReply(ws, lead);
    const message = await db.insertMessage(client, ws.id, { leadId: lead.id, direction: "out", channel: "email", purpose: "email_reply", body: draft.body, subject: draft.subject ?? null, status: "queued", createdBy: "autopilot" });
    const delivered = await actions.deliverMessage(message, lead);
    sent = delivered.status === "sent";
  }
  await db.updateLead(client, ws.id, lead.id, stamp);
  return sent;
}

async function ownerAlert(client: db.Db, ws: Workspace, lead: Lead, now: Date): Promise<boolean> {
  let any = false;
  const text = ownerAlertText(ws, lead);
  if (ws.settings.alertEmail) {
    const r = await sendOwnerEmail(
      ws,
      line(`New lead: ${lead.name || "no name"}${lead.service ? ` (${lead.service})` : ""}`, 150),
      [
        `${lead.name || "Someone"} just reached ${ws.name} from ${lead.source}${lead.source_detail ? ` (${lead.source_detail})` : ""}.`,
        lead.phone ? `Phone: ${lead.phone}` : "",
        lead.email ? `Email: ${lead.email}` : "",
        lead.service ? `Wants: ${lead.service}` : "",
        lead.message ? `Said: "${lead.message.slice(0, 500)}"` : "",
        "",
        `Call in the next ${ws.settings.responseTargetMinutes} minutes. The first business to answer usually gets the job.`,
        `Open the lead: https://www.theleadflowpro.com/hq/leads/${lead.id}`,
      ]
        .filter(Boolean)
        .join("\n"),
      `alert-new-${lead.id}`,
    );
    any = any || r.ok;
  }
  if (ws.settings.alertSms) {
    const r = await textOwner(client, ws, text);
    any = any || r;
  }
  void now;
  return any;
}

/** Text the owner (and any extra alert numbers) from their own line. */
async function textOwner(client: db.Db, ws: Workspace, body: string): Promise<boolean> {
  const line = await smsLine(client, ws.id);
  if (!line) return false;
  const targets = [ws.phone, ...ws.settings.alertPhones].filter((p): p is string => !!p);
  let any = false;
  for (const to of [...new Set(targets)].slice(0, 6)) {
    const r = await sendSms(line.connection, line.secret, to, body);
    any = any || r.ok;
  }
  return any;
}
