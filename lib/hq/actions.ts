import type { Draft } from "./drafts";
import type { ContentDraft } from "./content";
import type { ChannelStatus, HqActions, LeadInput } from "./mcp";
import { publishToFacebook, sendEmailOnBehalf, sendSms } from "./channels";
import * as db from "./server";
import type { Brief, Content, HqEvent, Lead, LeadStatus, Message, Workspace } from "./types";

// HqActions over the real database and the real channels. The MCP server,
// the HQ pages, and the Autopilot engine all act through this so a send is
// a send everywhere: logged the same, gated the same.

export function serverActions(client: db.Db, workspace: Workspace): HqActions & { workspace: Workspace } {
  const wsId = workspace.id;
  const self = {
    workspace,

    async listLeads(opts: { statuses?: LeadStatus[]; limit?: number; search?: string; sinceDays?: number }) {
      return db.listLeads(client, wsId, opts);
    },

    async getLead(id: string) {
      return db.getLead(client, wsId, id);
    },

    async addLead(input: LeadInput, actor: string): Promise<Lead> {
      const { lead, created } = await db.insertLead(client, wsId, { ...input });
      await db.recordEvent(client, wsId, {
        kind: "lead_in",
        detail: created ? `New lead from ${input.source}${input.source_detail ? ` (${input.source_detail})` : ""}` : `Repeat contact from ${input.source}`,
        leadId: lead.id,
        actor,
        meta: { created },
      });
      return lead;
    },

    async updateLead(id: string, patch: Partial<Lead>) {
      return db.updateLead(client, wsId, id, patch);
    },

    async recordEvent(input: { kind: HqEvent["kind"]; detail: string; leadId?: string | null; meta?: Record<string, unknown>; actor: string; dedupeKey?: string }) {
      await db.recordEvent(client, wsId, input);
    },

    async recentEvents(opts: { limit?: number; sinceDays?: number; leadId?: string }) {
      return db.listEvents(client, wsId, opts);
    },

    async listContent(opts: { statuses?: Content["status"][]; limit?: number; weekOf?: string }) {
      return db.listContent(client, wsId, opts);
    },

    async saveContent(draft: ContentDraft & { weekOf?: string | null }, actor: string) {
      return db.insertContent(client, wsId, {
        kind: draft.kind,
        title: draft.title,
        body: draft.body,
        hook: draft.hook,
        cta: draft.cta,
        extras: draft.extras,
        weekOf: draft.weekOf ?? null,
        createdBy: actor,
      });
    },

    async updateContent(id: string, patch: Partial<Content>) {
      return db.updateContent(client, wsId, id, patch);
    },

    async getContent(id: string) {
      return db.getContent(client, wsId, id);
    },

    async saveMessage(input: { leadId: string; draft: Draft; actor: string; status: Message["status"] }) {
      return db.insertMessage(client, wsId, {
        leadId: input.leadId,
        direction: "out",
        channel: input.draft.channel,
        purpose: input.draft.purpose,
        body: input.draft.body,
        subject: input.draft.subject ?? null,
        status: input.status,
        createdBy: input.actor,
      });
    },

    async getMessage(id: string) {
      return db.getMessage(client, wsId, id);
    },

    async deliverMessage(message: Message, lead: Lead): Promise<Message> {
      const ws = self.workspace;
      let result: { ok: boolean; provider: string; providerId?: string | null; error?: string | null };
      if (message.channel === "sms") {
        const line = await smsLine(client, wsId);
        if (!line) result = { ok: false, provider: "none", error: "No text line is connected." };
        else if (!lead.phone) result = { ok: false, provider: line.connection.kind, error: "The lead has no phone number." };
        else result = await sendSms(line.connection, line.secret, lead.phone, message.body);
      } else {
        if (!lead.email) result = { ok: false, provider: "resend", error: "The lead has no email address." };
        else result = await sendEmailOnBehalf(ws, lead.email, message.subject ?? `From ${ws.name}`, message.body, `hq-msg-${message.id}`);
      }
      const now = new Date().toISOString();
      const updated = await db.updateMessage(client, wsId, message.id, {
        body: message.body,
        status: result.ok ? "sent" : "failed",
        provider: result.provider,
        provider_id: result.providerId ?? null,
        error: result.ok ? null : (result.error ?? "unknown").slice(0, 500),
        sent_at: result.ok ? now : null,
      });
      await db.recordEvent(client, wsId, {
        kind: message.channel === "sms" ? "text_out" : "email_out",
        detail: result.ok ? `${message.purpose.replace("_", " ")} sent by ${message.channel}: ${message.body.slice(0, 140)}` : `${message.channel} failed: ${result.error ?? "unknown"}`,
        leadId: lead.id,
        actor: message.created_by,
        meta: { message_id: message.id, ok: result.ok },
      });
      if (result.ok) {
        await db.updateLead(client, wsId, lead.id, {
          last_contact_at: now,
          first_contact_at: lead.first_contact_at ?? now,
          status: lead.status === "new" ? "contacted" : lead.status,
        });
      }
      return updated;
    },

    async channels(): Promise<ChannelStatus> {
      const list = await db.listConnections(client, wsId);
      const has = (k: string) => list.some((c) => c.kind === k && c.status === "connected");
      return { sms: has("openphone") || has("twilio"), email: true, facebook: has("meta_page") };
    },

    async publishContent(content: Content) {
      const page = await db.getConnectionWithSecret(client, wsId, "meta_page");
      if (!page) return { ok: false, error: "No Facebook Page is connected." };
      const result = await publishToFacebook(page.connection, page.secret, content.body);
      if (!result.ok) {
        await db.upsertConnection(client, wsId, { kind: "meta_page", label: page.connection.label, config: page.connection.config, status: "error", lastError: result.error ?? null });
      }
      return { ok: result.ok, ref: result.providerId ?? undefined, error: result.error ?? undefined };
    },

    async latestBrief(kind: Brief["kind"]) {
      return db.latestBrief(client, wsId, kind);
    },

    async updateWorkspace(patch: Partial<Workspace>) {
      const { id: _i, owner_id: _o, created_at: _c, updated_at: _u, ...safe } = patch;
      const updated = await db.updateWorkspace(client, wsId, safe as db.WorkspacePatch);
      self.workspace = updated;
      return updated;
    },
  };
  return self;
}

export async function smsLine(client: db.Db, workspaceId: string) {
  const op = await db.getConnectionWithSecret(client, workspaceId, "openphone");
  if (op && op.connection.status === "connected") return op;
  const tw = await db.getConnectionWithSecret(client, workspaceId, "twilio");
  if (tw && tw.connection.status === "connected") return tw;
  return null;
}
