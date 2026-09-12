import { TOOLS, getTool, type Tool } from "../tools/index";
import type { Field, Result, Values } from "../tools/types";
import { buildDailyBrief, buildWeeklyReport } from "./brief";
import { buildWeeklyContent, reviewReply, type ContentDraft } from "./content";
import { emailReply, followUp, quoteFollowUp, reschedule, reviewAsk, textBack, type Draft } from "./drafts";
import { afterFollowUpSent, afterTouch, nextFollowUpAt } from "./followups";
import { formatPhone, isPlausibleEmail, normalizeEmail, toE164 } from "./phone";
import { rankLeads } from "./score";
import { profileGaps } from "./settings";
import { ago, localWeekStart, longLocalDate } from "./time";
import {
  HQ_PLAN,
  LEAD_STATUSES,
  OPEN_STATUSES,
  planIsLive,
  type Brief,
  type Content,
  type ContentKind,
  type HqEvent,
  type Lead,
  type LeadStatus,
  type Message,
  type Workspace,
} from "./types";
import { plain } from "./copy";

// The Model Context Protocol server, the pure part.
//
// This is what ChatGPT, Claude, Claude Code, and Cursor talk to. It is a
// JSON-RPC 2.0 handler over Streamable HTTP (one POST per message, no
// session state), with the tools, resources, and prompts the plugin
// offers. Every tool runs against one workspace, resolved from the bearer
// token by the route before this file is ever called. Data access goes
// through the HqActions interface so the whole protocol can be tested
// against an in-memory implementation.

export const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
export const SERVER_INFO = { name: "the-leadflow-pro", title: HQ_PLAN.connectorName, version: "1.0.0" };

export const SERVER_INSTRUCTIONS = [
  "You are connected to The LeadFlow Pro for one business. The tools read and change that business's real lead inbox, messages, and content drafts.",
  "Start most sessions with daily_brief. When the owner asks who to call, use next_calls. When they want to reach a lead, draft_reply first and only send_message when they say to send.",
  "Never invent leads, numbers, or results. If a tool returns nothing, say so.",
  "Every business has 86 free calculators available through list_calculators and run_calculator (missed call cost, response time, review gap, quote follow-up math and more). Use them when the owner asks a numbers question.",
].join(" ");

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: unknown;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export const RPC = {
  PARSE: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const;

/* ------------------------------------------------------------------------ */
/* data access the protocol needs                                            */
/* ------------------------------------------------------------------------ */

export type LeadInput = {
  name: string;
  phone: string | null;
  email: string | null;
  service: string | null;
  message: string | null;
  source: Lead["source"];
  source_detail: string | null;
  consent_sms: boolean;
  consent_email: boolean;
  value_cents: number | null;
};

export type ChannelStatus = { sms: boolean; email: boolean; facebook: boolean };

export interface HqActions {
  listLeads(opts: { statuses?: LeadStatus[]; limit?: number; search?: string; sinceDays?: number }): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | null>;
  addLead(input: LeadInput, actor: string): Promise<Lead>;
  updateLead(id: string, patch: Partial<Lead>): Promise<Lead>;
  recordEvent(input: { kind: HqEvent["kind"]; detail: string; leadId?: string | null; meta?: Record<string, unknown>; actor: string; dedupeKey?: string }): Promise<void>;
  recentEvents(opts: { limit?: number; sinceDays?: number; leadId?: string }): Promise<HqEvent[]>;
  listContent(opts: { statuses?: Content["status"][]; limit?: number; weekOf?: string }): Promise<Content[]>;
  saveContent(draft: ContentDraft & { weekOf?: string | null }, actor: string): Promise<Content>;
  updateContent(id: string, patch: Partial<Content>): Promise<Content | null>;
  getContent(id: string): Promise<Content | null>;
  saveMessage(input: { leadId: string; draft: Draft; actor: string; status: Message["status"] }): Promise<Message>;
  getMessage(id: string): Promise<Message | null>;
  /** Actually send a queued message through the connected channel. */
  deliverMessage(message: Message, lead: Lead): Promise<Message>;
  channels(): Promise<ChannelStatus>;
  publishContent(content: Content): Promise<{ ok: boolean; ref?: string; error?: string }>;
  latestBrief(kind: Brief["kind"]): Promise<Brief | null>;
  updateWorkspace(patch: Partial<Workspace>): Promise<Workspace>;
}

export type McpContext = {
  workspace: Workspace;
  scopes: Set<string>;
  actions: HqActions;
  now: Date;
  /** "api_key" or "oauth", for the event log. */
  via: string;
};

/* ------------------------------------------------------------------------ */
/* tool definitions                                                          */
/* ------------------------------------------------------------------------ */

type JsonSchema = Record<string, unknown>;

type ToolSpec = {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  scope?: string;
  readOnly?: boolean;
  destructive?: boolean;
  handler: (ctx: McpContext, args: Record<string, unknown>) => Promise<ToolOutcome>;
};

type ToolOutcome = { text: string; data?: unknown; isError?: boolean };

const str = (description: string, extra: JsonSchema = {}): JsonSchema => ({ type: "string", description, ...extra });
const num = (description: string, extra: JsonSchema = {}): JsonSchema => ({ type: "number", description, ...extra });
const bool = (description: string): JsonSchema => ({ type: "boolean", description });
const obj = (properties: Record<string, JsonSchema>, required: string[] = []): JsonSchema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

function s(v: unknown, max = 500): string {
  return plain(v, max);
}

function leadLine(l: Lead, now: Date): string {
  const bits = [l.name || "No name", l.phone ? formatPhone(l.phone) : null, l.email, l.service, `status ${l.status}`, ago(new Date(l.created_at), now)].filter(Boolean);
  return bits.join(" | ");
}

function leadOut(l: Lead) {
  return {
    id: l.id,
    name: l.name,
    phone: l.phone,
    phone_display: formatPhone(l.phone),
    email: l.email,
    service: l.service,
    message: l.message,
    source: l.source,
    source_detail: l.source_detail,
    status: l.status,
    score: l.score,
    created_at: l.created_at,
    first_contact_at: l.first_contact_at,
    last_contact_at: l.last_contact_at,
    next_follow_up_at: l.next_follow_up_at,
    follow_up_step: l.follow_up_step,
    value_usd: l.value_cents === null ? null : Math.round(l.value_cents / 100),
    consent_sms: l.consent_sms && !l.unsubscribed_at,
    consent_email: l.consent_email,
    notes: l.notes,
  };
}

function contentOut(c: Content) {
  return {
    id: c.id,
    kind: c.kind,
    title: c.title,
    hook: c.hook,
    body: c.body,
    cta: c.cta,
    status: c.status,
    week_of: c.week_of,
    published_at: c.published_at,
    published_ref: c.published_ref,
    extras: c.extras,
  };
}

async function inboxFor(ctx: McpContext) {
  const [leads, events, content] = await Promise.all([
    ctx.actions.listLeads({ sinceDays: 90, limit: 500 }),
    ctx.actions.recentEvents({ sinceDays: 14, limit: 500 }),
    ctx.actions.listContent({ limit: 100 }),
  ]);
  return { workspace: ctx.workspace, leads, events, content, now: ctx.now };
}

function requireLead(lead: Lead | null, id: string): Lead {
  if (!lead) throw new ToolError(`No lead with id ${id} in this business.`);
  return lead;
}

class ToolError extends Error {}

function draftFor(ctx: McpContext, lead: Lead, purpose: string, instruction: string): Draft {
  const ws = ctx.workspace;
  switch (purpose) {
    case "text_back":
      return textBack(ws, lead);
    case "email_reply":
      return emailReply(ws, lead);
    case "follow_up":
      return followUp(ws, lead, lead.follow_up_step);
    case "quote_follow_up": {
      const days = lead.last_contact_at ? Math.floor((ctx.now.getTime() - new Date(lead.last_contact_at).getTime()) / 86_400_000) : 1;
      return quoteFollowUp(ws, lead, days);
    }
    case "review_ask":
      return reviewAsk(ws, lead);
    case "reschedule":
      return reschedule(ws, lead);
    default: {
      // A custom message the assistant wrote. It still gets the opt-out
      // line and the length guard so it can be sent as is.
      const body = s(instruction, 900);
      if (!body) throw new ToolError("Give the message text in `instruction` for a custom draft.");
      const channel: Draft["channel"] = lead.phone && !lead.unsubscribed_at ? "sms" : "email";
      const withStop = channel === "sms" && !/reply stop/i.test(body) ? `${body} Reply STOP to opt out.` : body;
      return { channel, purpose: "custom", subject: channel === "email" ? `From ${ws.name}` : undefined, body: withStop, note: "Written in the conversation." };
    }
  }
}

const DRAFT_PURPOSES = ["text_back", "email_reply", "follow_up", "quote_follow_up", "review_ask", "reschedule", "custom"];

export const TOOL_SPECS: ToolSpec[] = [
  {
    name: "daily_brief",
    title: "Daily brief",
    description:
      "Today's brief for the business: new leads, who is waiting, follow-ups due, drafts waiting on approval, and the three things to do next. Start here.",
    inputSchema: obj({}),
    readOnly: true,
    async handler(ctx) {
      const brief = buildDailyBrief(await inboxFor(ctx));
      return { text: brief.text, data: brief };
    },
  },
  {
    name: "weekly_report",
    title: "Weekly report",
    description: "Last seven days: leads by source and day, how fast they were answered, what was booked and won, and takeaways. Real rows only.",
    inputSchema: obj({}),
    readOnly: true,
    async handler(ctx) {
      const report = buildWeeklyReport(await inboxFor(ctx));
      return { text: report.text, data: report };
    },
  },
  {
    name: "next_calls",
    title: "Who to call now",
    description: "The open leads ranked by who to call first, each with the reason and the phone number.",
    inputSchema: obj({ limit: num("How many to return, 1 to 20. Default 5.", { minimum: 1, maximum: 20 }) }),
    readOnly: true,
    async handler(ctx, args) {
      const limit = Math.min(20, Math.max(1, Number(args.limit) || 5));
      const leads = await ctx.actions.listLeads({ statuses: OPEN_STATUSES, limit: 300, sinceDays: 120 });
      const ranked = rankLeads(leads, ctx.now).slice(0, limit);
      if (ranked.length === 0) return { text: "Nobody is waiting. The inbox is clear.", data: { calls: [] } };
      const lines = ranked.map((r, i) => `${i + 1}. ${r.lead.name || "No name"}${r.lead.phone ? ` ${formatPhone(r.lead.phone)}` : ""} (score ${r.score}): ${r.reasons.join(", ")}`);
      return {
        text: lines.join("\n"),
        data: { calls: ranked.map((r) => ({ ...leadOut(r.lead), score: r.score, reasons: r.reasons })) },
      };
    },
  },
  {
    name: "list_leads",
    title: "List leads",
    description: "The lead inbox. Filter by status (new, contacted, quoted, booked, won, lost, spam) or search by name, phone, email, or service.",
    inputSchema: obj({
      status: str("One status to filter on. Leave out for every open lead.", { enum: LEAD_STATUSES }),
      search: str("Name, phone, email, or service text to match."),
      limit: num("1 to 100. Default 25.", { minimum: 1, maximum: 100 }),
      since_days: num("Only leads created in the last N days. Default 90.", { minimum: 1, maximum: 365 }),
    }),
    readOnly: true,
    async handler(ctx, args) {
      const status = typeof args.status === "string" && LEAD_STATUSES.includes(args.status as LeadStatus) ? (args.status as LeadStatus) : null;
      const limit = Math.min(100, Math.max(1, Number(args.limit) || 25));
      const sinceDays = Math.min(365, Math.max(1, Number(args.since_days) || 90));
      const leads = await ctx.actions.listLeads({
        statuses: status ? [status] : OPEN_STATUSES,
        search: s(args.search, 100) || undefined,
        limit,
        sinceDays,
      });
      if (leads.length === 0) return { text: "No leads match.", data: { leads: [] } };
      return { text: leads.map((l) => leadLine(l, ctx.now)).join("\n"), data: { leads: leads.map(leadOut) } };
    },
  },
  {
    name: "get_lead",
    title: "Lead detail",
    description: "Everything on one lead: contact details, message, status, follow-up state, and the recent timeline.",
    inputSchema: obj({ lead_id: str("The lead id from list_leads or next_calls.") }, ["lead_id"]),
    readOnly: true,
    async handler(ctx, args) {
      const lead = requireLead(await ctx.actions.getLead(s(args.lead_id, 80)), s(args.lead_id, 80));
      const events = await ctx.actions.recentEvents({ leadId: lead.id, limit: 20 });
      const timeline = events.map((e) => `${e.created_at.slice(0, 16).replace("T", " ")} ${e.kind}: ${e.detail}`);
      return {
        text: [leadLine(lead, ctx.now), lead.message ? `Message: ${lead.message}` : "", lead.notes ? `Notes: ${lead.notes}` : "", ...timeline].filter(Boolean).join("\n"),
        data: { lead: leadOut(lead), timeline: events },
      };
    },
  },
  {
    name: "add_lead",
    title: "Add a lead",
    description: "Capture a lead the owner just told you about (a call, a text on their personal phone, a referral). Starts the follow-up ladder.",
    inputSchema: obj(
      {
        name: str("Full name if known."),
        phone: str("Phone number, any format."),
        email: str("Email address."),
        service: str("What they want, in a few words."),
        message: str("What they said, in their words if possible."),
        source_detail: str("Where it came from: referral, phone call, walk-in, Facebook comment."),
        value_usd: num("Rough job value in dollars if known.", { minimum: 0 }),
        consent_sms: bool("True only if the person gave the business permission to text them."),
      },
      ["name"],
    ),
    scope: "leads:write",
    async handler(ctx, args) {
      const phone = toE164(args.phone);
      const email = normalizeEmail(args.email);
      const name = s(args.name, 120);
      if (!name && !phone && !email) throw new ToolError("Give at least a name, a phone number, or an email.");
      const lead = await ctx.actions.addLead(
        {
          name,
          phone,
          email,
          service: s(args.service, 120) || null,
          message: s(args.message, 1500) || null,
          source: "plugin",
          source_detail: s(args.source_detail, 120) || null,
          consent_sms: args.consent_sms === true && !!phone,
          consent_email: !!email,
          value_cents: Number.isFinite(Number(args.value_usd)) && Number(args.value_usd) > 0 ? Math.round(Number(args.value_usd) * 100) : null,
        },
        `plugin:${ctx.via}`,
      );
      return { text: `Added ${lead.name || "the lead"} (id ${lead.id}). They are at the top of next_calls.`, data: { lead: leadOut(lead) } };
    },
  },
  {
    name: "log_touch",
    title: "Log a call or update status",
    description:
      "Record that the owner reached (or tried to reach) a lead, and what happened. Outcomes: contacted, no_answer, quoted, booked, won, lost, spam. Moves the follow-up ladder.",
    inputSchema: obj(
      {
        lead_id: str("The lead id."),
        outcome: str("What happened.", { enum: ["contacted", "no_answer", "quoted", "booked", "won", "lost", "spam"] }),
        note: str("A short note for the timeline."),
        value_usd: num("Job value in dollars, when quoting or winning.", { minimum: 0 }),
      },
      ["lead_id", "outcome"],
    ),
    scope: "leads:write",
    async handler(ctx, args) {
      const id = s(args.lead_id, 80);
      const lead = requireLead(await ctx.actions.getLead(id), id);
      const OUTCOMES = ["contacted", "no_answer", "quoted", "booked", "won", "lost", "spam"] as const;
      type Outcome = (typeof OUTCOMES)[number];
      const outcome = OUTCOMES.find((o) => o === String(args.outcome)) as Outcome | undefined;
      if (!outcome) throw new ToolError("Unknown outcome.");
      const patch = afterTouch(lead, ctx.workspace.settings, ctx.workspace.timezone, ctx.now, outcome);
      if (Number.isFinite(Number(args.value_usd)) && Number(args.value_usd) > 0) patch.value_cents = Math.round(Number(args.value_usd) * 100);
      const note = s(args.note, 600);
      if (note) patch.notes = [lead.notes, `${ctx.now.toISOString().slice(0, 10)}: ${note}`].filter(Boolean).join("\n");
      const updated = await ctx.actions.updateLead(lead.id, patch);
      await ctx.actions.recordEvent({
        kind: outcome === "no_answer" || outcome === "contacted" ? "call" : "status",
        detail: `${outcome.replace("_", " ")}${note ? `: ${note}` : ""}`,
        leadId: lead.id,
        actor: `plugin:${ctx.via}`,
      });
      const next = updated.next_follow_up_at ? `Next follow-up ${updated.next_follow_up_at.slice(0, 10)}.` : "No further follow-up scheduled.";
      return { text: `Logged ${outcome.replace("_", " ")} for ${updated.name || "the lead"}. Status ${updated.status}. ${next}`, data: { lead: leadOut(updated) } };
    },
  },
  {
    name: "draft_reply",
    title: "Draft a message",
    description:
      "Write the message the business would send a lead, in its voice: text_back, email_reply, follow_up, quote_follow_up, review_ask, reschedule, or custom (give the text in `instruction`). Saves it as a draft and returns the message id for send_message.",
    inputSchema: obj(
      {
        lead_id: str("The lead id."),
        purpose: str("Which message.", { enum: DRAFT_PURPOSES }),
        instruction: str("For custom: the message text. For others: ignored."),
      },
      ["lead_id", "purpose"],
    ),
    scope: "leads:write",
    async handler(ctx, args) {
      const id = s(args.lead_id, 80);
      const lead = requireLead(await ctx.actions.getLead(id), id);
      const purpose = DRAFT_PURPOSES.includes(String(args.purpose)) ? String(args.purpose) : "custom";
      const draft = draftFor(ctx, lead, purpose, s(args.instruction, 1500));
      const saved = await ctx.actions.saveMessage({ leadId: lead.id, draft, actor: `plugin:${ctx.via}`, status: "draft" });
      return {
        text: `Draft ${draft.channel.toUpperCase()} for ${lead.name || "the lead"} (message id ${saved.id}):\n\n${draft.subject ? `Subject: ${draft.subject}\n` : ""}${draft.body}\n\n${draft.note}`,
        data: { message_id: saved.id, channel: draft.channel, subject: draft.subject ?? null, body: draft.body, note: draft.note },
      };
    },
  },
  {
    name: "send_message",
    title: "Send a message",
    description:
      "Send a drafted message to a lead through the business's connected text line or email. Only call this after the owner says to send. Needs the lead's consent for texts.",
    inputSchema: obj(
      {
        message_id: str("The id from draft_reply."),
        body: str("Optional edited text to send instead of the draft body."),
      },
      ["message_id"],
    ),
    scope: "messages:send",
    async handler(ctx, args) {
      const mid = s(args.message_id, 80);
      const message = await ctx.actions.getMessage(mid);
      if (!message || !message.lead_id) throw new ToolError(`No draft with id ${mid}.`);
      if (message.status === "sent") return { text: "That message was already sent.", data: { message } };
      const lead = requireLead(await ctx.actions.getLead(message.lead_id), message.lead_id);
      const body = s(args.body, 1500) || message.body;
      const channels = await ctx.actions.channels();
      if (message.channel === "sms") {
        if (!channels.sms) throw new ToolError("No text line is connected. Connect OpenPhone or Twilio in HQ Settings, or send this by email.");
        if (!lead.phone) throw new ToolError("This lead has no phone number.");
        if (!lead.consent_sms || lead.unsubscribed_at) throw new ToolError("This lead has not agreed to texts (or opted out). Call them or send an email instead.");
      } else {
        if (!lead.email || !isPlausibleEmail(lead.email)) throw new ToolError("This lead has no email address.");
      }
      const delivered = await ctx.actions.deliverMessage({ ...message, body }, lead);
      if (delivered.status !== "sent") throw new ToolError(`Send failed: ${delivered.error ?? "unknown error"}.`);
      if (message.purpose === "follow_up") {
        // The ladder moves when a rung is actually sent, whichever door sent it.
        const fresh = (await ctx.actions.getLead(lead.id)) ?? lead;
        await ctx.actions.updateLead(lead.id, afterFollowUpSent(fresh, ctx.workspace.settings, ctx.workspace.timezone, ctx.now));
      }
      return { text: `Sent by ${message.channel.toUpperCase()} to ${lead.name || "the lead"}.`, data: { message: delivered } };
    },
  },
  {
    name: "schedule_follow_up",
    title: "Schedule a follow-up",
    description: "Set when the next follow-up for a lead is due, in days from now. The brief will surface it with a ready draft.",
    inputSchema: obj({ lead_id: str("The lead id."), days: num("Days from now, 0 to 90.", { minimum: 0, maximum: 90 }) }, ["lead_id", "days"]),
    scope: "leads:write",
    async handler(ctx, args) {
      const id = s(args.lead_id, 80);
      const lead = requireLead(await ctx.actions.getLead(id), id);
      const days = Math.min(90, Math.max(0, Number(args.days) || 0));
      const at = days === 0 ? ctx.now : new Date(ctx.now.getTime() + days * 86_400_000);
      const updated = await ctx.actions.updateLead(lead.id, { next_follow_up_at: at.toISOString() });
      await ctx.actions.recordEvent({ kind: "follow_up", detail: `Follow-up scheduled for ${at.toISOString().slice(0, 10)}`, leadId: lead.id, actor: `plugin:${ctx.via}` });
      return { text: `Follow-up for ${updated.name || "the lead"} set for ${at.toISOString().slice(0, 10)}.`, data: { lead: leadOut(updated) } };
    },
  },
  {
    name: "draft_weekly_content",
    title: "Draft this week's content",
    description: "Three Facebook posts, one lead ad, and one 30 second video script with a shot list, in the business's voice, for the current week. Idempotent: running it twice returns the same drafts.",
    inputSchema: obj({}),
    scope: "content:write",
    async handler(ctx) {
      const weekOf = localWeekStart(ctx.now, ctx.workspace.timezone);
      const existing = await ctx.actions.listContent({ weekOf, limit: 50 });
      let items = existing;
      if (existing.length === 0) {
        const bundle = buildWeeklyContent(ctx.workspace, weekOf);
        items = [];
        for (const d of bundle.drafts) items.push(await ctx.actions.saveContent({ ...d, weekOf }, `plugin:${ctx.via}`));
        await ctx.actions.recordEvent({ kind: "content", detail: `Drafted ${items.length} pieces for week of ${weekOf}`, actor: `plugin:${ctx.via}`, dedupeKey: `content:${weekOf}` });
      }
      const gaps = profileGaps(ctx.workspace);
      const text = [
        `Week of ${weekOf}: ${items.length} drafts.`,
        ...items.map((c) => `- [${c.kind}] ${c.title} (${c.status}, id ${c.id})`),
        gaps.length ? `Fill in ${gaps.join(", ")} in HQ Settings and the drafts get more specific.` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return { text, data: { week_of: weekOf, content: items.map(contentOut) } };
    },
  },
  {
    name: "draft_content",
    title: "Draft one piece of content",
    description: "One post, ad, or video script right now, optionally about a topic the owner names, or a reply to a review (give stars and the review text).",
    inputSchema: obj(
      {
        kind: str("post, ad, video_script, or review_reply", { enum: ["post", "ad", "video_script", "review_reply"] }),
        topic: str("A service or theme to write about. Defaults to the next service in rotation."),
        review_stars: num("For review_reply: 1 to 5.", { minimum: 1, maximum: 5 }),
        review_text: str("For review_reply: what the customer wrote."),
        reviewer_name: str("For review_reply: the customer's first name."),
      },
      ["kind"],
    ),
    scope: "content:write",
    async handler(ctx, args) {
      const kind = String(args.kind) as ContentKind | "review_reply";
      const ws = ctx.workspace;
      let draft: ContentDraft;
      if (kind === "review_reply") {
        const stars = Math.min(5, Math.max(1, Math.round(Number(args.review_stars) || 5)));
        draft = reviewReply(ws, { name: s(args.reviewer_name, 40), stars, text: s(args.review_text, 1000) });
      } else if (kind === "post" || kind === "ad" || kind === "video_script") {
        const topic = s(args.topic, 80);
        const wsForTopic = topic ? { ...ws, services: [topic] } : ws;
        const bundle = buildWeeklyContent(wsForTopic, localWeekStart(ctx.now, ws.timezone));
        const pick = bundle.drafts.find((d) => d.kind === kind) ?? bundle.drafts[0];
        draft = pick;
      } else {
        throw new ToolError("kind must be post, ad, video_script, or review_reply.");
      }
      const saved = await ctx.actions.saveContent({ ...draft, weekOf: null }, `plugin:${ctx.via}`);
      return { text: `${saved.title} (id ${saved.id})\n\n${saved.body}`, data: { content: contentOut(saved) } };
    },
  },
  {
    name: "list_content",
    title: "List content drafts",
    description: "Posts, ads, and video scripts, by status (draft, approved, scheduled, published, rejected).",
    inputSchema: obj({ status: str("Filter by status.", { enum: ["draft", "approved", "scheduled", "published", "rejected"] }), limit: num("1 to 50", { minimum: 1, maximum: 50 }) }),
    readOnly: true,
    async handler(ctx, args) {
      const status = typeof args.status === "string" ? (args.status as Content["status"]) : undefined;
      const items = await ctx.actions.listContent({ statuses: status ? [status] : undefined, limit: Math.min(50, Math.max(1, Number(args.limit) || 20)) });
      if (items.length === 0) return { text: "No content drafts yet. Run draft_weekly_content.", data: { content: [] } };
      return { text: items.map((c) => `[${c.kind}] ${c.title} (${c.status}, id ${c.id})`).join("\n"), data: { content: items.map(contentOut) } };
    },
  },
  {
    name: "approve_content",
    title: "Approve or reject a draft",
    description: "Mark a draft approved (ready to post) or rejected. Optionally replace the body with the owner's edited version first.",
    inputSchema: obj(
      { content_id: str("The content id."), decision: str("approve or reject", { enum: ["approve", "reject"] }), body: str("Edited text to save before approving.") },
      ["content_id", "decision"],
    ),
    scope: "content:write",
    async handler(ctx, args) {
      const id = s(args.content_id, 80);
      const item = await ctx.actions.getContent(id);
      if (!item) throw new ToolError(`No content with id ${id}.`);
      const patch: Partial<Content> = { status: args.decision === "reject" ? "rejected" : "approved" };
      const body = s(args.body, 5000);
      if (body) patch.body = body;
      const updated = await ctx.actions.updateContent(id, patch);
      await ctx.actions.recordEvent({ kind: "content", detail: `${patch.status}: ${item.title}`, actor: `plugin:${ctx.via}`, meta: { content_id: id } });
      return { text: `${item.title} is now ${patch.status}.`, data: { content: updated ? contentOut(updated) : null } };
    },
  },
  {
    name: "publish_post",
    title: "Publish a post",
    description: "Publish an approved post to the connected Facebook Page. If no Page is connected, marks it approved and returns the text to paste.",
    inputSchema: obj({ content_id: str("The content id.") }, ["content_id"]),
    scope: "content:write",
    async handler(ctx, args) {
      const id = s(args.content_id, 80);
      const item = await ctx.actions.getContent(id);
      if (!item) throw new ToolError(`No content with id ${id}.`);
      if (item.kind !== "post") throw new ToolError("Only posts publish directly. Ads go in Meta Ads Manager; video scripts get filmed.");
      const channels = await ctx.actions.channels();
      if (!channels.facebook) {
        const updated = await ctx.actions.updateContent(id, { status: "approved" });
        return { text: `No Facebook Page is connected. Approved and ready to paste:\n\n${item.body}`, data: { content: updated ? contentOut(updated) : null, pasted: true } };
      }
      const result = await ctx.actions.publishContent(item);
      if (!result.ok) throw new ToolError(`Facebook did not accept the post: ${result.error ?? "unknown error"}.`);
      const updated = await ctx.actions.updateContent(id, { status: "published", published_at: ctx.now.toISOString(), published_ref: result.ref ?? null });
      await ctx.actions.recordEvent({ kind: "content", detail: `Published: ${item.title}`, actor: `plugin:${ctx.via}`, meta: { content_id: id, ref: result.ref } });
      return { text: `Published to Facebook${result.ref ? `: ${result.ref}` : ""}.`, data: { content: updated ? contentOut(updated) : null } };
    },
  },
  {
    name: "business_profile",
    title: "Business profile",
    description: "The business's name, owner, services, contact details, voice, and automation settings, plus what the engine has connected.",
    inputSchema: obj({}),
    readOnly: true,
    async handler(ctx) {
      const ws = ctx.workspace;
      const channels = await ctx.actions.channels();
      const gaps = profileGaps(ws);
      const text = [
        `${ws.name}${ws.city ? `, ${ws.city}${ws.state ? `, ${ws.state}` : ""}` : ""}`,
        ws.owner_name ? `Owner: ${ws.owner_name}` : "",
        ws.phone ? `Phone: ${formatPhone(ws.phone)}` : "",
        ws.email ? `Email: ${ws.email}` : "",
        ws.services.length ? `Services: ${ws.services.join(", ")}` : "",
        ws.offer ? `Current offer: ${ws.offer}` : "",
        `Voice: ${ws.voice}. Timezone: ${ws.timezone}. Plan: ${ws.plan}.`,
        `Connected: text line ${channels.sms ? "yes" : "no"}, email yes, Facebook Page ${channels.facebook ? "yes" : "no"}.`,
        `Automation: instant text-back ${ws.settings.autoTextBack ? "on" : "off"}, instant email reply ${ws.settings.autoEmailReply ? "on" : "off"}, response target ${ws.settings.responseTargetMinutes} min, brief at ${ws.settings.briefHour}:00, follow-ups on days ${ws.settings.followUpDays.join(", ")}.`,
        gaps.length ? `Missing: ${gaps.join(", ")}.` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return { text, data: { profile: publicProfile(ws), channels, gaps } };
    },
  },
  {
    name: "update_business_profile",
    title: "Update the business profile",
    description: "Change the business details or automation settings the drafts and the engine use.",
    inputSchema: obj({
      name: str("Business name."),
      owner_name: str("Owner's first and last name."),
      phone: str("Business phone."),
      email: str("Business email."),
      website: str("Website address."),
      city: str("City."),
      state: str("State."),
      services: { type: "array", items: { type: "string" }, description: "The services offered, short names." },
      offer: str("A current offer or promo to feature."),
      review_link: str("Google review link."),
      voice: str("plain, friendly, or formal", { enum: ["plain", "friendly", "formal"] }),
      auto_text_back: bool("Instant text-back to new leads (needs a connected text line)."),
      auto_email_reply: bool("Instant email reply to new leads."),
      response_target_minutes: num("Minutes before an unanswered lead triggers an alert.", { minimum: 5, maximum: 240 }),
      brief_hour: num("Local hour for the daily brief, 0 to 23.", { minimum: 0, maximum: 23 }),
      notes: str("Standing instructions for drafts: promos, words to avoid, tone notes."),
    }),
    scope: "content:write",
    async handler(ctx, args) {
      // Rewriting the business profile and its automation switches is the
      // widest thing a connector can do, so it needs the whole grant.
      if (!ctx.scopes.has("leads:write") || !ctx.scopes.has("messages:send")) {
        throw new ToolError("This connection was not granted full access. Reconnect The LeadFlow Pro and approve every permission to change the profile.");
      }
      const ws = ctx.workspace;
      const patch: Partial<Workspace> = {};
      const set = (k: keyof Workspace, v: unknown, max = 120) => {
        if (typeof v === "string") (patch as Record<string, unknown>)[k] = s(v, max) || null;
      };
      set("name", args.name);
      set("owner_name", args.owner_name);
      if (typeof args.phone === "string") patch.phone = toE164(args.phone);
      if (typeof args.email === "string") patch.email = normalizeEmail(args.email);
      set("website", args.website, 200);
      set("city", args.city, 80);
      set("state", args.state, 40);
      set("offer", args.offer, 300);
      set("review_link", args.review_link, 300);
      if (Array.isArray(args.services)) patch.services = args.services.map((x) => s(x, 60)).filter(Boolean).slice(0, 20);
      if (["plain", "friendly", "formal"].includes(String(args.voice))) patch.voice = args.voice as Workspace["voice"];
      const settings = { ...ws.settings };
      if (typeof args.auto_text_back === "boolean") settings.autoTextBack = args.auto_text_back;
      if (typeof args.auto_email_reply === "boolean") settings.autoEmailReply = args.auto_email_reply;
      if (Number.isFinite(Number(args.response_target_minutes))) settings.responseTargetMinutes = Math.min(240, Math.max(5, Math.round(Number(args.response_target_minutes))));
      if (Number.isFinite(Number(args.brief_hour))) settings.briefHour = Math.min(23, Math.max(0, Math.round(Number(args.brief_hour))));
      if (typeof args.notes === "string") settings.notes = s(args.notes, 1500);
      patch.settings = settings;
      if (patch.name === null) delete patch.name;
      const updated = await ctx.actions.updateWorkspace(patch);
      await ctx.actions.recordEvent({ kind: "system", detail: "Profile updated from the plugin", actor: `plugin:${ctx.via}` });
      return { text: "Profile updated.", data: { profile: publicProfile(updated) } };
    },
  },
  {
    name: "list_calculators",
    title: "List the free calculators",
    description: "The 86 free LeadFlow calculators and generators, searchable by what the owner is asking about (missed calls, response time, reviews, quotes, pricing, ads, payroll and more).",
    inputSchema: obj({ search: str("Words to match against names and descriptions."), limit: num("1 to 86, default 12", { minimum: 1, maximum: 100 }) }),
    readOnly: true,
    async handler(_ctx, args) {
      const q = s(args.search, 100).toLowerCase();
      const limit = Math.min(100, Math.max(1, Number(args.limit) || 12));
      const list = (q ? TOOLS.filter((t) => t.searchText.includes(q) || t.name.toLowerCase().includes(q)) : [...TOOLS].sort((a, b) => b.popularity - a.popularity)).slice(0, limit);
      return {
        text: list.map((t) => `${t.slug}: ${t.name}. ${t.tagline}`).join("\n") || "No calculator matches.",
        data: { calculators: list.map((t) => ({ slug: t.slug, name: t.name, tagline: t.tagline, inputs: t.fields.map(fieldSummary) })) },
      };
    },
  },
  {
    name: "run_calculator",
    title: "Run a calculator",
    description: "Run one of the free calculators with the owner's numbers. Get the field ids from list_calculators. Missing fields use the calculator's defaults.",
    inputSchema: obj({ slug: str("The calculator slug."), values: { type: "object", description: "Field id to value.", additionalProperties: true } }, ["slug"]),
    readOnly: true,
    scope: "calculators:run",
    async handler(_ctx, args) {
      const tool = getTool(s(args.slug, 80));
      if (!tool) throw new ToolError("No calculator with that slug. Use list_calculators.");
      const values = coerceToolValues(tool, (args.values && typeof args.values === "object" ? args.values : {}) as Record<string, unknown>);
      const result = tool.run(values);
      return { text: resultText(tool, result), data: { slug: tool.slug, name: tool.name, values, result: stripDocuments(result) } };
    },
  },
];

function publicProfile(ws: Workspace) {
  return {
    name: ws.name,
    owner_name: ws.owner_name,
    industry: ws.industry,
    phone: ws.phone,
    email: ws.email,
    website: ws.website,
    city: ws.city,
    state: ws.state,
    timezone: ws.timezone,
    voice: ws.voice,
    services: ws.services,
    offer: ws.offer,
    review_link: ws.review_link,
    plan: ws.plan,
    settings: ws.settings,
  };
}

function fieldSummary(f: Field) {
  const base = { id: f.id, label: f.label, type: f.type };
  if (f.type === "slider") return { ...base, min: f.min, max: f.max, default: f.def };
  if (f.type === "select") return { ...base, options: f.options.map((o) => o.value), default: f.def };
  if (f.type === "checks") return { ...base, options: f.options.map((o) => o.value), default: f.def };
  return { ...base, default: f.def };
}

export function coerceToolValues(tool: Tool, incoming: Record<string, unknown>): Values {
  const values: Values = {};
  for (const field of tool.fields) values[field.id] = field.type === "checks" ? [...field.def] : field.def;
  for (const field of tool.fields) {
    const raw = incoming[field.id];
    if (raw === undefined || raw === null) continue;
    if (field.type === "checks") {
      if (!Array.isArray(raw)) continue;
      const allowed = new Set(field.options.map((o) => o.value));
      values[field.id] = raw.map(String).filter((v) => allowed.has(v)).slice(0, 200);
    } else if (field.type === "select") {
      if (field.options.some((o) => o.value === String(raw))) values[field.id] = String(raw);
    } else if (field.type === "text" || field.type === "textarea") {
      values[field.id] = String(raw).slice(0, 4000);
    } else {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[$,%\s]/g, ""));
      if (!Number.isFinite(n)) continue;
      values[field.id] = field.type === "slider" ? Math.min(field.max, Math.max(field.min, n)) : Math.max(0, Math.min(1e12, n));
    }
  }
  return values;
}

function stripDocuments(result: Result): Omit<Result, "documents"> {
  const { documents: _omit, ...rest } = result;
  return rest;
}

export function resultText(tool: Tool, r: Result): string {
  const lines: string[] = [tool.name];
  if (r.headline) lines.push(`${r.headline.value} ${r.headline.label}${r.headline.sub ? ` (${r.headline.sub})` : ""}`);
  for (const st of r.stats ?? []) lines.push(`${st.label}: ${st.value}${st.sub ? ` (${st.sub})` : ""}`);
  if (r.verdict) lines.push(r.verdict.text);
  if (r.explain) lines.push(r.explain);
  if (r.output) lines.push("", r.output.title, r.output.text);
  if (r.table) {
    lines.push("", r.table.title ?? "", r.table.headers.join(" | "));
    for (const row of r.table.rows.slice(0, 40)) lines.push(row.join(" | "));
  }
  if (r.note) lines.push(r.note);
  if (r.assumptions?.length) lines.push("", `Assumes: ${r.assumptions.join("; ")}`);
  return lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n");
}

/* ------------------------------------------------------------------------ */
/* resources and prompts                                                     */
/* ------------------------------------------------------------------------ */

const RESOURCES = [
  { uri: "leadflow://brief/today", name: "Today's brief", description: "The daily brief for this business.", mimeType: "text/plain" },
  { uri: "leadflow://report/week", name: "Weekly report", description: "Last seven days of leads, replies, and wins.", mimeType: "text/plain" },
  { uri: "leadflow://leads/open", name: "Open leads", description: "Every lead that still needs attention.", mimeType: "application/json" },
  { uri: "leadflow://profile", name: "Business profile", description: "Name, services, contact details, settings.", mimeType: "application/json" },
];

const PROMPTS = [
  {
    name: "morning",
    title: "Morning check-in",
    description: "Run the brief and turn it into a short plan for the day.",
    text: "Run daily_brief. Then tell me, in plain words, the three things I should do in the next hour, starting with anyone who is waiting on a first reply. Offer to draft the messages.",
  },
  {
    name: "work_the_inbox",
    title: "Work the inbox",
    description: "Go lead by lead, draft each message, and log what happened.",
    text: "Run next_calls with limit 5. For each lead, show me the number and a one-line reason, draft the right message with draft_reply, and wait for me to say send, skip, or log what happened. Use log_touch for every outcome I give you.",
  },
  {
    name: "weekly_content",
    title: "This week's content",
    description: "Draft the posts, ad, and video script and walk through approving them.",
    text: "Run draft_weekly_content. Show me each draft one at a time. For each, ask approve, edit, or skip. When I edit, save the new text with approve_content. Remind me the video script has a shot list I can film on my phone.",
  },
];

/* ------------------------------------------------------------------------ */
/* the JSON-RPC handler                                                      */
/* ------------------------------------------------------------------------ */

export type RpcOutcome = { responses: JsonRpcResponse[]; hadRequests: boolean };

function isRequest(v: unknown): v is JsonRpcRequest {
  return !!v && typeof v === "object" && (v as JsonRpcRequest).jsonrpc === "2.0" && typeof (v as JsonRpcRequest).method === "string";
}

function err(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

/** Process one parsed body (a single message or a batch). Notifications yield no response. */
export const MAX_BATCH = 20;

export async function handleJsonRpc(body: unknown, ctx: McpContext): Promise<RpcOutcome> {
  const messages = Array.isArray(body) ? body : [body];
  if (messages.length === 0) return { responses: [err(null, RPC.INVALID_REQUEST, "Empty batch")], hadRequests: true };
  if (messages.length > MAX_BATCH) return { responses: [err(null, RPC.INVALID_REQUEST, `Batches are limited to ${MAX_BATCH} messages`)], hadRequests: true };
  const responses: JsonRpcResponse[] = [];
  let hadRequests = false;
  for (const m of messages) {
    if (!isRequest(m)) {
      responses.push(err(null, RPC.INVALID_REQUEST, "Not a JSON-RPC 2.0 request"));
      hadRequests = true;
      continue;
    }
    const isNotification = m.id === undefined;
    if (isNotification) {
      // notifications/initialized, notifications/cancelled: nothing to do.
      continue;
    }
    hadRequests = true;
    responses.push(await handleOne(m, ctx));
  }
  return { responses, hadRequests };
}

async function handleOne(req: JsonRpcRequest, ctx: McpContext): Promise<JsonRpcResponse> {
  const id = req.id ?? null;
  const params = (req.params && typeof req.params === "object" ? req.params : {}) as Record<string, unknown>;
  try {
    switch (req.method) {
      case "initialize": {
        const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
        const protocolVersion = PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0];
        return ok(id, {
          protocolVersion,
          capabilities: { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false }, prompts: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: `${SERVER_INSTRUCTIONS} Business: ${ctx.workspace.name}.`,
        });
      }
      case "ping":
        return ok(id, {});
      case "tools/list":
        return ok(id, {
          tools: TOOL_SPECS.map((t) => ({
            name: t.name,
            title: t.title,
            description: t.description,
            inputSchema: t.inputSchema,
            annotations: { title: t.title, readOnlyHint: !!t.readOnly, destructiveHint: !!t.destructive, idempotentHint: !!t.readOnly, openWorldHint: false },
          })),
        });
      case "tools/call": {
        const name = String(params.name ?? "");
        const spec = TOOL_SPECS.find((t) => t.name === name);
        if (!spec) return err(id, RPC.INVALID_PARAMS, `Unknown tool: ${name}`);
        const args = (params.arguments && typeof params.arguments === "object" ? params.arguments : {}) as Record<string, unknown>;
        if (!planIsLive(ctx.workspace.plan, ctx.workspace.trial_ends_at, ctx.now) && !spec.readOnly) {
          return ok(id, toolResult({ text: `The ${HQ_PLAN.name} subscription for ${ctx.workspace.name} is not active. Open https://www.theleadflowpro.com/hq/billing to restart it. Read-only tools still work.`, isError: true }));
        }
        if (spec.scope && !ctx.scopes.has(spec.scope)) {
          return ok(id, toolResult({ text: `This connection was not granted the "${spec.scope}" permission. Reconnect The LeadFlow Pro and approve it.`, isError: true }));
        }
        try {
          const outcome = await spec.handler(ctx, args);
          return ok(id, toolResult(outcome));
        } catch (e) {
          if (e instanceof ToolError) return ok(id, toolResult({ text: e.message, isError: true }));
          throw e;
        }
      }
      case "resources/list":
        return ok(id, { resources: RESOURCES });
      case "resources/templates/list":
        return ok(id, { resourceTemplates: [] });
      case "resources/read": {
        const uri = String(params.uri ?? "");
        const content = await readResource(uri, ctx);
        if (!content) return err(id, RPC.INVALID_PARAMS, `Unknown resource: ${uri}`);
        return ok(id, { contents: [content] });
      }
      case "prompts/list":
        return ok(id, { prompts: PROMPTS.map((p) => ({ name: p.name, title: p.title, description: p.description, arguments: [] })) });
      case "prompts/get": {
        const p = PROMPTS.find((x) => x.name === String(params.name ?? ""));
        if (!p) return err(id, RPC.INVALID_PARAMS, `Unknown prompt: ${String(params.name ?? "")}`);
        return ok(id, { description: p.description, messages: [{ role: "user", content: { type: "text", text: p.text } }] });
      }
      case "completion/complete":
        return ok(id, { completion: { values: [], hasMore: false } });
      case "logging/setLevel":
        return ok(id, {});
      default:
        return err(id, RPC.METHOD_NOT_FOUND, `Method not found: ${req.method}`);
    }
  } catch (e) {
    return err(id, RPC.INTERNAL, "The LeadFlow Pro hit an internal error handling that request.", { detail: e instanceof Error ? e.message.slice(0, 300) : "unknown" });
  }
}

function toolResult(outcome: ToolOutcome) {
  return {
    content: [{ type: "text", text: outcome.text }],
    ...(outcome.data !== undefined ? { structuredContent: outcome.data } : {}),
    isError: !!outcome.isError,
  };
}

async function readResource(uri: string, ctx: McpContext) {
  switch (uri) {
    case "leadflow://brief/today":
      return { uri, mimeType: "text/plain", text: buildDailyBrief(await inboxFor(ctx)).text };
    case "leadflow://report/week":
      return { uri, mimeType: "text/plain", text: buildWeeklyReport(await inboxFor(ctx)).text };
    case "leadflow://leads/open": {
      const leads = await ctx.actions.listLeads({ statuses: OPEN_STATUSES, limit: 200, sinceDays: 120 });
      return { uri, mimeType: "application/json", text: JSON.stringify({ leads: leads.map(leadOut) }, null, 2) };
    }
    case "leadflow://profile":
      return { uri, mimeType: "application/json", text: JSON.stringify({ profile: publicProfile(ctx.workspace), today: longLocalDate(ctx.now, ctx.workspace.timezone) }, null, 2) };
    default:
      return null;
  }
}

/** A JSON-RPC error for bodies that never parsed. */
export function parseErrorResponse(): JsonRpcResponse {
  return err(null, RPC.PARSE, "Parse error");
}

export { nextFollowUpAt };
