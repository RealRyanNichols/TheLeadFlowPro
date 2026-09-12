import { serverActions, smsLine } from "./actions";
import { checkSmsConnection } from "./channels";
import { buildWeeklyContent, reviewReply } from "./content";
import { plain } from "./copy";
import { emailReply, followUp, quoteFollowUp, reschedule, reviewAsk, textBack, type Draft } from "./drafts";
import { afterFollowUpSent, afterTouch } from "./followups";
import { isPlausibleEmail, normalizeEmail, toE164 } from "./phone";
import * as db from "./server";
import { parseSettings } from "./settings";
import { isValidTimezone, localWeekStart } from "./time";
import { HQ_PLAN, type Content, type Lead, type LeadStatus, type Workspace } from "./types";

// Everything the HQ pages can change, as one dispatcher. The route hands
// it the signed-in user, their workspace, and a JSON body with an action.
// Keeping the mutations here (instead of spread over a dozen route files)
// means one place to read for "what can an owner do", one place to test.

export type ManageContext = {
  db: db.Db;
  user: { id: string; email: string | null };
  workspace: Workspace | null;
  now: Date;
  /** For the Stripe checkout action. Injected so tests never hit Stripe. */
  createCheckout?: (input: { workspace: Workspace; email: string | null }) => Promise<{ url: string } | { error: string }>;
  createPortal?: (customerId: string) => Promise<{ url: string } | { error: string }>;
};

export type ManageResult = { status: number; body: Record<string, unknown> };

const okr = (body: Record<string, unknown> = {}, status = 200): ManageResult => ({ status, body: { ok: true, ...body } });
const bad = (error: string, status = 400): ManageResult => ({ status, body: { ok: false, error } });

function s(v: unknown, max = 300): string {
  return plain(v, max);
}

function needWorkspace(ctx: ManageContext): Workspace | ManageResult {
  if (!ctx.workspace) return bad("Set up your business first.", 409);
  return ctx.workspace;
}

const STATUSES: LeadStatus[] = ["new", "contacted", "quoted", "booked", "won", "lost", "spam"];

export async function handleManage(raw: unknown, ctx: ManageContext): Promise<ManageResult> {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const action = String(body.action ?? "");

  switch (action) {
    /* ------------------------------ workspace ----------------------------- */
    case "create_workspace": {
      if (ctx.workspace) return okr({ workspace: publicWorkspace(ctx.workspace), created: false });
      const name = s(body.name, 120);
      if (!name) return bad("Give the business a name.");
      const tz = s(body.timezone, 60);
      const { workspace, inboundToken } = await db.createWorkspace(ctx.db, {
        ownerId: ctx.user.id,
        name,
        ownerName: s(body.owner_name, 120) || null,
        email: normalizeEmail(body.email) ?? ctx.user.email,
        phone: toE164(body.phone),
        industry: s(body.industry, 80) || null,
        city: s(body.city, 80) || null,
        state: s(body.state, 40) || null,
        timezone: tz && isValidTimezone(tz) ? tz : "America/Chicago",
        services: Array.isArray(body.services) ? body.services.map((x) => s(x, 60)).filter(Boolean).slice(0, 20) : [],
      });
      await db.recordEvent(ctx.db, workspace.id, { kind: "system", detail: "Workspace created", actor: `owner:${ctx.user.id}` });
      return okr({ workspace: publicWorkspace(workspace), inbound_token: inboundToken, created: true }, 201);
    }

    case "update_profile": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const patch: db.WorkspacePatch = {};
      if (typeof body.name === "string" && s(body.name, 120)) patch.name = s(body.name, 120);
      if (typeof body.owner_name === "string") patch.owner_name = s(body.owner_name, 120) || null;
      if (typeof body.industry === "string") patch.industry = s(body.industry, 80) || null;
      if (typeof body.phone === "string") patch.phone = toE164(body.phone);
      if (typeof body.email === "string") patch.email = normalizeEmail(body.email);
      if (typeof body.website === "string") patch.website = s(body.website, 200) || null;
      if (typeof body.city === "string") patch.city = s(body.city, 80) || null;
      if (typeof body.state === "string") patch.state = s(body.state, 40) || null;
      if (typeof body.timezone === "string" && isValidTimezone(body.timezone)) patch.timezone = body.timezone;
      if (typeof body.brand_color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.brand_color)) patch.brand_color = body.brand_color.toUpperCase();
      if (["plain", "friendly", "formal"].includes(String(body.voice))) patch.voice = body.voice as Workspace["voice"];
      if (Array.isArray(body.services)) patch.services = body.services.map((x) => s(x, 60)).filter(Boolean).slice(0, 20);
      if (typeof body.offer === "string") patch.offer = s(body.offer, 300) || null;
      if (typeof body.review_link === "string") patch.review_link = /^https?:\/\//.test(body.review_link) ? s(body.review_link, 300) : null;
      if (Number.isFinite(Number(body.onboarding_step))) patch.onboarding_step = Math.min(9, Math.max(0, Math.round(Number(body.onboarding_step))));
      if (body.settings && typeof body.settings === "object") patch.settings = parseSettings({ ...ws.settings, ...(body.settings as Record<string, unknown>) });
      const updated = await db.updateWorkspace(ctx.db, ws.id, patch);
      return okr({ workspace: publicWorkspace(updated) });
    }

    case "regenerate_inbound_token": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const token = await db.regenerateInboundToken(ctx.db, ws.id);
      await db.recordEvent(ctx.db, ws.id, { kind: "system", detail: "Lead endpoint token regenerated", actor: `owner:${ctx.user.id}` });
      return okr({ inbound_token: token });
    }

    /* -------------------------------- keys -------------------------------- */
    case "create_api_key": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const existing = await db.listApiKeys(ctx.db, ws.id);
      if (existing.filter((k) => !k.revoked_at).length >= 10) return bad("Ten active keys is the limit. Revoke one first.");
      const { plaintext, row } = await db.createApiKey(ctx.db, ws.id, ctx.user.id, s(body.name, 80) || "Plugin key");
      await db.recordEvent(ctx.db, ws.id, { kind: "system", detail: `API key created: ${row.name}`, actor: `owner:${ctx.user.id}` });
      return okr({ key: plaintext, row }, 201);
    }
    case "revoke_api_key": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const id = s(body.id, 80);
      if (!id) return bad("Which key?");
      await db.revokeApiKey(ctx.db, ws.id, id);
      return okr();
    }
    case "revoke_connector": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const id = s(body.id, 80);
      if (!id) return bad("Which connection?");
      await db.revokeTokenById(ctx.db, ws.id, id);
      return okr();
    }

    /* ----------------------------- connections ---------------------------- */
    case "connect_sms": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const kind = body.kind === "twilio" ? "twilio" : body.kind === "openphone" ? "openphone" : null;
      if (!kind) return bad("Choose OpenPhone or Twilio.");
      const secret = typeof body.secret === "string" ? body.secret.trim() : "";
      const from = toE164(body.from);
      if (!secret || secret.length < 8 || secret.length > 400) return bad(kind === "openphone" ? "Paste the OpenPhone API key." : "Paste the Twilio auth token.");
      if (!from) return bad("Enter the sending number, area code first.");
      const config: Record<string, unknown> = { from };
      if (kind === "twilio") {
        const sid = s(body.account_sid, 64);
        if (!/^AC[a-zA-Z0-9]{32}$/.test(sid)) return bad("The Twilio account SID starts with AC and is 34 characters.");
        config.account_sid = sid;
      }
      const check = await checkSmsConnection(kind, secret, config);
      if (!check.ok) return bad(check.error ?? "The provider did not accept those details.");
      if (check.numbers && check.numbers.length && !check.numbers.includes(from)) {
        return bad(`That number is not on the OpenPhone account. Numbers found: ${check.numbers.join(", ")}.`);
      }
      // One text line at a time: connecting one disconnects the other.
      await db.deleteConnection(ctx.db, ws.id, kind === "openphone" ? "twilio" : "openphone");
      const connection = await db.upsertConnection(ctx.db, ws.id, { kind, label: kind === "openphone" ? "OpenPhone" : "Twilio", config, secret });
      await db.recordEvent(ctx.db, ws.id, { kind: "system", detail: `${connection.label} text line connected (${from})`, actor: `owner:${ctx.user.id}` });
      return okr({ connection });
    }
    case "connect_facebook_token": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const pageId = s(body.page_id, 40).replace(/\D/g, "");
      const token = typeof body.token === "string" ? body.token.trim() : "";
      if (!/^\d{5,25}$/.test(pageId)) return bad("Enter the numeric Facebook Page ID.");
      if (token.length < 20 || token.length > 1000) return bad("Paste the Page access token.");
      const connection = await db.upsertConnection(ctx.db, ws.id, { kind: "meta_page", label: s(body.page_name, 120) || "Facebook Page", config: { page_id: pageId, page_name: s(body.page_name, 120) }, secret: token });
      await db.recordEvent(ctx.db, ws.id, { kind: "system", detail: "Facebook Page connected", actor: `owner:${ctx.user.id}` });
      return okr({ connection });
    }
    case "disconnect": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const kind = String(body.kind);
      if (!["openphone", "twilio", "meta_page", "website"].includes(kind)) return bad("Unknown connection.");
      await db.deleteConnection(ctx.db, ws.id, kind as "openphone");
      await db.recordEvent(ctx.db, ws.id, { kind: "system", detail: `${kind} disconnected`, actor: `owner:${ctx.user.id}` });
      return okr();
    }

    /* -------------------------------- leads ------------------------------- */
    case "add_lead": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const name = s(body.name, 120);
      const phone = toE164(body.phone);
      const email = normalizeEmail(body.email);
      if (!name && !phone && !email) return bad("Give at least a name, a phone number, or an email.");
      const actions = serverActions(ctx.db, ws);
      const lead = await actions.addLead(
        {
          name,
          phone,
          email,
          service: s(body.service, 120) || null,
          message: s(body.message, 1500) || null,
          source: "manual",
          source_detail: s(body.source_detail, 120) || null,
          consent_sms: body.consent_sms === true && !!phone,
          consent_email: !!email,
          value_cents: Number.isFinite(Number(body.value_usd)) && Number(body.value_usd) > 0 ? Math.round(Number(body.value_usd) * 100) : null,
        },
        `owner:${ctx.user.id}`,
      );
      return okr({ lead }, 201);
    }
    case "log_touch": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const lead = await db.getLead(ctx.db, ws.id, s(body.lead_id, 80));
      if (!lead) return bad("No such lead.", 404);
      const outcome = ["contacted", "no_answer", "quoted", "booked", "won", "lost", "spam"].find((o) => o === String(body.outcome)) as Parameters<typeof afterTouch>[4] | undefined;
      if (!outcome) return bad("Pick an outcome.");
      const patch = afterTouch(lead, ws.settings, ws.timezone, ctx.now, outcome);
      if (Number.isFinite(Number(body.value_usd)) && Number(body.value_usd) > 0) patch.value_cents = Math.round(Number(body.value_usd) * 100);
      const note = s(body.note, 600);
      if (note) patch.notes = [lead.notes, `${ctx.now.toISOString().slice(0, 10)}: ${note}`].filter(Boolean).join("\n");
      const updated = await db.updateLead(ctx.db, ws.id, lead.id, patch);
      await db.recordEvent(ctx.db, ws.id, { kind: outcome === "no_answer" || outcome === "contacted" ? "call" : "status", detail: `${outcome.replace("_", " ")}${note ? `: ${note}` : ""}`, leadId: lead.id, actor: `owner:${ctx.user.id}` });
      return okr({ lead: updated });
    }
    case "update_lead": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const lead = await db.getLead(ctx.db, ws.id, s(body.lead_id, 80));
      if (!lead) return bad("No such lead.", 404);
      const patch: Partial<Lead> = {};
      if (typeof body.name === "string") patch.name = s(body.name, 120);
      if (typeof body.phone === "string") patch.phone = toE164(body.phone);
      if (typeof body.email === "string") patch.email = normalizeEmail(body.email);
      if (typeof body.service === "string") patch.service = s(body.service, 120) || null;
      if (typeof body.notes === "string") patch.notes = s(body.notes, 4000) || null;
      if (typeof body.status === "string" && STATUSES.includes(body.status as LeadStatus)) patch.status = body.status as LeadStatus;
      if (typeof body.consent_sms === "boolean") patch.consent_sms = body.consent_sms;
      if (body.next_follow_up_at === null) patch.next_follow_up_at = null;
      else if (typeof body.next_follow_up_at === "string" && !Number.isNaN(Date.parse(body.next_follow_up_at))) patch.next_follow_up_at = new Date(body.next_follow_up_at).toISOString();
      if (Number.isFinite(Number(body.value_usd))) patch.value_cents = Math.max(0, Math.round(Number(body.value_usd) * 100));
      const updated = await db.updateLead(ctx.db, ws.id, lead.id, patch);
      if (patch.status && patch.status !== lead.status) await db.recordEvent(ctx.db, ws.id, { kind: "status", detail: `Status set to ${patch.status}`, leadId: lead.id, actor: `owner:${ctx.user.id}` });
      return okr({ lead: updated });
    }

    /* ------------------------------ messages ------------------------------ */
    case "draft_message": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const lead = await db.getLead(ctx.db, ws.id, s(body.lead_id, 80));
      if (!lead) return bad("No such lead.", 404);
      const purpose = String(body.purpose ?? "follow_up");
      let draft: Draft;
      switch (purpose) {
        case "text_back":
          draft = textBack(ws, lead);
          break;
        case "email_reply":
          draft = emailReply(ws, lead);
          break;
        case "quote_follow_up":
          draft = quoteFollowUp(ws, lead, lead.last_contact_at ? Math.floor((ctx.now.getTime() - new Date(lead.last_contact_at).getTime()) / 86_400_000) : 1);
          break;
        case "review_ask":
          draft = reviewAsk(ws, lead);
          break;
        case "reschedule":
          draft = reschedule(ws, lead);
          break;
        case "custom": {
          const text = s(body.body, 1500);
          if (!text) return bad("Write the message.");
          const channel = body.channel === "email" ? "email" : lead.phone && !lead.unsubscribed_at ? "sms" : "email";
          draft = { channel, purpose: "custom", subject: channel === "email" ? s(body.subject, 150) || `From ${ws.name}` : undefined, body: channel === "sms" && !/reply stop/i.test(text) ? `${text} Reply STOP to opt out.` : text, note: "Written by you." };
          break;
        }
        default:
          draft = followUp(ws, lead, lead.follow_up_step);
      }
      const actions = serverActions(ctx.db, ws);
      const message = await actions.saveMessage({ leadId: lead.id, draft, actor: `owner:${ctx.user.id}`, status: "draft" });
      return okr({ message, note: draft.note }, 201);
    }
    case "send_message": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const message = await db.getMessage(ctx.db, ws.id, s(body.message_id, 80));
      if (!message || !message.lead_id) return bad("No such draft.", 404);
      if (message.status === "sent") return bad("Already sent.", 409);
      const lead = await db.getLead(ctx.db, ws.id, message.lead_id);
      if (!lead) return bad("The lead is gone.", 404);
      const text = s(body.body, 1500) || message.body;
      if (message.channel === "sms") {
        if (!(await smsLine(ctx.db, ws.id))) return bad("Connect a text line in Settings first, or send by email.");
        if (!lead.phone) return bad("This lead has no phone number.");
        if (!lead.consent_sms || lead.unsubscribed_at) return bad("This lead has not agreed to texts. Call them or email instead.");
      } else if (!lead.email || !isPlausibleEmail(lead.email)) {
        return bad("This lead has no email address.");
      }
      const actions = serverActions(ctx.db, ws);
      const delivered = await actions.deliverMessage({ ...message, body: text }, lead);
      if (delivered.status !== "sent") return bad(`Send failed: ${delivered.error ?? "unknown"}`, 502);
      if (message.purpose === "follow_up") {
        const fresh = await db.getLead(ctx.db, ws.id, lead.id);
        if (fresh) await db.updateLead(ctx.db, ws.id, lead.id, afterFollowUpSent(fresh, ws.settings, ws.timezone, ctx.now));
      }
      return okr({ message: delivered });
    }

    /* ------------------------------- content ------------------------------ */
    case "draft_weekly_content": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const weekOf = localWeekStart(ctx.now, ws.timezone);
      const existing = await db.listContent(ctx.db, ws.id, { weekOf, limit: 50 });
      if (existing.length) return okr({ content: existing, week_of: weekOf, created: false });
      const bundle = buildWeeklyContent(ws, weekOf);
      const created: Content[] = [];
      for (const d of bundle.drafts) created.push(await db.insertContent(ctx.db, ws.id, { kind: d.kind, title: d.title, body: d.body, hook: d.hook, cta: d.cta, extras: d.extras, weekOf, createdBy: `owner:${ctx.user.id}` }));
      await db.recordEvent(ctx.db, ws.id, { kind: "content", detail: `Drafted ${created.length} pieces for week of ${weekOf}`, actor: `owner:${ctx.user.id}`, dedupeKey: `content:${weekOf}` });
      return okr({ content: created, week_of: weekOf, created: true }, 201);
    }
    case "draft_content": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const kind = String(body.kind);
      const topic = s(body.topic, 80);
      let draft;
      if (kind === "review_reply") {
        draft = reviewReply(ws, { name: s(body.reviewer_name, 40), stars: Math.min(5, Math.max(1, Math.round(Number(body.review_stars) || 5))), text: s(body.review_text, 1000) });
      } else if (kind === "post" || kind === "ad" || kind === "video_script") {
        const bundle = buildWeeklyContent(topic ? { ...ws, services: [topic] } : ws, localWeekStart(ctx.now, ws.timezone));
        draft = bundle.drafts.find((d) => d.kind === kind) ?? bundle.drafts[0];
      } else {
        return bad("Choose post, ad, video_script, or review_reply.");
      }
      const saved = await db.insertContent(ctx.db, ws.id, { kind: draft.kind, title: draft.title, body: draft.body, hook: draft.hook, cta: draft.cta, extras: draft.extras, weekOf: null, createdBy: `owner:${ctx.user.id}` });
      return okr({ content: saved }, 201);
    }
    case "review_content": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const item = await db.getContent(ctx.db, ws.id, s(body.content_id, 80));
      if (!item) return bad("No such draft.", 404);
      const decision = String(body.decision);
      const patch: Partial<Content> = {};
      if (typeof body.body === "string" && s(body.body, 10000)) patch.body = s(body.body, 10000);
      if (typeof body.title === "string" && s(body.title, 200)) patch.title = s(body.title, 200);
      if (decision === "approve") patch.status = "approved";
      else if (decision === "reject") patch.status = "rejected";
      else if (decision === "draft") patch.status = "draft";
      else if (decision !== "save") return bad("approve, reject, draft, or save.");
      const updated = await db.updateContent(ctx.db, ws.id, item.id, patch);
      if (patch.status) await db.recordEvent(ctx.db, ws.id, { kind: "content", detail: `${patch.status}: ${item.title}`, actor: `owner:${ctx.user.id}`, meta: { content_id: item.id } });
      return okr({ content: updated });
    }
    case "publish_content": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const item = await db.getContent(ctx.db, ws.id, s(body.content_id, 80));
      if (!item) return bad("No such draft.", 404);
      if (item.kind !== "post") return bad("Only posts publish to Facebook.");
      const actions = serverActions(ctx.db, ws);
      const channels = await actions.channels();
      if (!channels.facebook) return bad("Connect your Facebook Page in Settings, or copy the post and paste it.", 409);
      const result = await actions.publishContent(item);
      if (!result.ok) return bad(`Facebook did not accept the post: ${result.error ?? "unknown"}`, 502);
      const updated = await db.updateContent(ctx.db, ws.id, item.id, { status: "published", published_at: ctx.now.toISOString(), published_ref: result.ref ?? null });
      await db.recordEvent(ctx.db, ws.id, { kind: "content", detail: `Published: ${item.title}`, actor: `owner:${ctx.user.id}`, meta: { content_id: item.id, ref: result.ref } });
      return okr({ content: updated });
    }
    case "mark_published": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      const item = await db.getContent(ctx.db, ws.id, s(body.content_id, 80));
      if (!item) return bad("No such draft.", 404);
      const updated = await db.updateContent(ctx.db, ws.id, item.id, { status: "published", published_at: ctx.now.toISOString(), published_ref: s(body.ref, 300) || null });
      await db.recordEvent(ctx.db, ws.id, { kind: "content", detail: `Posted by hand: ${item.title}`, actor: `owner:${ctx.user.id}`, meta: { content_id: item.id } });
      return okr({ content: updated });
    }

    /* ------------------------------- billing ------------------------------ */
    case "checkout": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      if (ws.plan === "active" || ws.plan === "trial") return okr({ url: "/hq", already: true });
      if (!ctx.createCheckout) return bad("Billing is not configured.", 501);
      const result = await ctx.createCheckout({ workspace: ws, email: ws.email ?? ctx.user.email });
      if ("error" in result) return bad(result.error, 502);
      return okr({ url: result.url });
    }
    case "billing_portal": {
      const ws = needWorkspace(ctx);
      if ("status" in ws) return ws;
      if (!ws.stripe_customer_id) return bad("No billing account yet. Start the plan first.", 409);
      if (!ctx.createPortal) return bad("Billing is not configured.", 501);
      const result = await ctx.createPortal(ws.stripe_customer_id);
      if ("error" in result) return bad(result.error, 502);
      return okr({ url: result.url });
    }

    default:
      return bad(`Unknown action: ${action || "(none)"}`, 404);
  }
}

/** The workspace as the browser may see it: no Stripe ids, no token hashes. */
export function publicWorkspace(ws: Workspace) {
  return {
    id: ws.id,
    slug: ws.slug,
    name: ws.name,
    owner_name: ws.owner_name,
    industry: ws.industry,
    phone: ws.phone,
    email: ws.email,
    website: ws.website,
    city: ws.city,
    state: ws.state,
    timezone: ws.timezone,
    brand_color: ws.brand_color,
    voice: ws.voice,
    services: ws.services,
    offer: ws.offer,
    review_link: ws.review_link,
    plan: ws.plan,
    trial_ends_at: ws.trial_ends_at,
    current_period_end: ws.current_period_end,
    settings: ws.settings,
    onboarding_step: ws.onboarding_step,
    has_billing: !!ws.stripe_customer_id,
    plan_name: HQ_PLAN.name,
  };
}
