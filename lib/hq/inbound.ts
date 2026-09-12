import { createHmac, timingSafeEqual } from "node:crypto";
import { serverActions } from "./actions";
import { plain } from "./copy";
import { isPlausibleEmail, normalizeEmail, toE164 } from "./phone";
import * as db from "./server";
import type { Lead, Workspace } from "./types";

// Leads coming in from outside: a website form, a Zapier zap, a text to
// the business's line, a Meta instant form. Each source is normalized into
// one insert so the engine treats every door the same.

export type InboundLeadResult = { ok: true; lead: Lead; created: boolean } | { ok: false; error: string; status: number };

const STOP_WORDS = /^\s*(stop|stopall|unsubscribe|cancel|end|quit)\b/i;
const START_WORDS = /^\s*(start|unstop|yes)\b/i;

// The inbound token sits in the business's website source, so it is an
// address, not a secret. These keep a bot that found it from flooding the
// inbox and the owner's phone: a filled honeypot is dropped quietly, and
// no workspace takes more than a burst per hour per instance.
const HONEYPOT_FIELDS = ["website_url_confirm", "_hp", "honeypot", "fax", "company_website"];
const INBOUND_PER_HOUR = 60;
const inboundLog = new Map<string, number[]>();

export function inboundAllowed(workspaceId: string, now = Date.now()): boolean {
  const hits = (inboundLog.get(workspaceId) ?? []).filter((t) => now - t < 60 * 60_000);
  if (hits.length >= INBOUND_PER_HOUR) {
    inboundLog.set(workspaceId, hits);
    return false;
  }
  hits.push(now);
  inboundLog.set(workspaceId, hits);
  if (inboundLog.size > 5000) for (const k of [...inboundLog.keys()].slice(0, 1000)) inboundLog.delete(k);
  return true;
}

export function isHoneypotHit(body: Record<string, unknown>): boolean {
  return HONEYPOT_FIELDS.some((f) => typeof body[f] === "string" && (body[f] as string).trim().length > 0);
}

/** Where an HTML form may send the visitor afterwards: the business's own site, or our thanks page. */
export function safeFormRedirect(requested: unknown, ws: Workspace): string {
  const fallback = `https://www.theleadflowpro.com/hq/thanks?b=${encodeURIComponent(ws.name)}`;
  if (typeof requested !== "string" || !/^https?:\/\//.test(requested)) return fallback;
  try {
    const target = new URL(requested);
    const site = ws.website ? new URL(/^https?:\/\//.test(ws.website) ? ws.website : `https://${ws.website}`) : null;
    if (site && target.host.replace(/^www\./, "") === site.host.replace(/^www\./, "")) return target.toString();
  } catch {
    // fall through
  }
  return fallback;
}

/** Twilio signs every webhook with the account auth token over the URL plus sorted params. */
export function twilioSignatureOk(authToken: string, url: string, params: Record<string, string>, signature: string | null): boolean {
  if (!signature) return false;
  const data = url + Object.keys(params).sort().map((k) => `${k}${params[k]}`).join("");
  const expected = createHmac("sha1", authToken).update(data, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

function str(v: unknown, max = 300): string {
  return plain(v, max);
}

/** A website form or an API post. Accepts the common field names. */
export async function ingestFormLead(client: db.Db, ws: Workspace, body: Record<string, unknown>, sourceDetail: string | null): Promise<InboundLeadResult> {
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = body[k];
      if (typeof v === "string" && v.trim()) return v;
      if (typeof v === "number") return String(v);
    }
    return "";
  };
  const name = str(pick("name", "full_name", "fullName", "first_name", "firstName", "contact"), 120) || [str(pick("first_name"), 60), str(pick("last_name"), 60)].filter(Boolean).join(" ");
  const phone = toE164(pick("phone", "phone_number", "phoneNumber", "mobile", "tel", "cell"));
  const email = normalizeEmail(pick("email", "email_address", "emailAddress"));
  if (!name && !phone && !email) return { ok: false, error: "Send at least a name, phone, or email.", status: 400 };
  const message = str(pick("message", "notes", "details", "comments", "description", "body", "question"), 1500) || null;
  const service = str(pick("service", "services", "interest", "job", "need", "subject"), 120) || null;
  const consentRaw = body.consent_sms ?? body.sms_consent ?? body.consent ?? body.opt_in;
  const consentSms = consentRaw === true || consentRaw === "true" || consentRaw === "yes" || consentRaw === "on" || consentRaw === "1";
  const externalId = str(pick("external_id", "id", "submission_id"), 120) || null;
  const meta: Record<string, unknown> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "page", "url", "referrer"]) if (typeof body[k] === "string") meta[k] = str(body[k], 300);

  const actions = serverActions(client, ws);
  const { lead, created } = await db.insertLead(client, ws.id, {
    name,
    phone,
    email,
    source: sourceDetail === "zapier" ? "api" : "website",
    source_detail: sourceDetail,
    message,
    service,
    consent_sms: consentSms && !!phone,
    consent_email: !!email && isPlausibleEmail(email),
    external_id: externalId ? `form:${externalId}` : null,
    meta,
  });
  await actions.recordEvent({
    kind: "lead_in",
    detail: created ? `New lead from ${sourceDetail ?? "website"}${service ? ` (${service})` : ""}` : `Repeat submission from ${sourceDetail ?? "website"}`,
    leadId: lead.id,
    actor: "webhook",
    meta: { created },
  });
  return { ok: true, lead, created };
}

export type InboundSms = { from: string; to: string | null; body: string; providerId: string | null; provider: "openphone" | "twilio" };

/** OpenPhone's message.received webhook shape, or Twilio's inbound form. */
export function parseInboundSms(raw: unknown, contentType: string): InboundSms | null {
  if (contentType.includes("application/x-www-form-urlencoded") && typeof raw === "string") {
    const f = new URLSearchParams(raw);
    const from = f.get("From");
    if (!from) return null;
    return { from, to: f.get("To"), body: f.get("Body") ?? "", providerId: f.get("MessageSid"), provider: "twilio" };
  }
  const j = (raw && typeof raw === "object" ? raw : null) as Record<string, unknown> | null;
  if (!j) return null;
  const type = String(j.type ?? "");
  if (type && !/^message\.received$/.test(type)) return null;
  const data = (j.data && typeof j.data === "object" ? j.data : {}) as Record<string, unknown>;
  const obj = (data.object && typeof data.object === "object" ? data.object : data) as Record<string, unknown>;
  const from = typeof obj.from === "string" ? obj.from : "";
  if (!from) return null;
  const to = Array.isArray(obj.to) ? String(obj.to[0] ?? "") : typeof obj.to === "string" ? obj.to : null;
  const text = typeof obj.text === "string" ? obj.text : typeof obj.body === "string" ? obj.body : typeof obj.content === "string" ? obj.content : "";
  return { from, to, body: text, providerId: typeof obj.id === "string" ? obj.id : null, provider: "openphone" };
}

/** A text to the business's line. Matches or creates the lead, records the message, honors STOP. */
export async function ingestSms(client: db.Db, ws: Workspace, sms: InboundSms): Promise<{ lead: Lead | null; created: boolean; stopped: boolean }> {
  const from = toE164(sms.from);
  if (!from) return { lead: null, created: false, stopped: false };
  const text = plain(sms.body, 2000);
  const stopped = STOP_WORDS.test(text);
  const restarted = START_WORDS.test(text);

  let lead = await db.findLeadByPhone(client, ws.id, from);
  let created = false;
  if (!lead) {
    const inserted = await db.insertLead(client, ws.id, {
      name: "",
      phone: from,
      email: null,
      source: "sms",
      source_detail: sms.provider,
      message: text || null,
      consent_sms: !stopped,
      consent_email: false,
      external_id: sms.providerId ? `sms:${sms.providerId}` : null,
    });
    lead = inserted.lead;
    created = inserted.created;
  }

  await db.insertMessage(client, ws.id, {
    leadId: lead.id,
    direction: "in",
    channel: "sms",
    purpose: "inbound",
    body: text || "(empty text)",
    status: "received",
    provider: sms.provider,
    providerId: sms.providerId,
    createdBy: "webhook",
  });

  if (stopped) {
    await db.updateLead(client, ws.id, lead.id, { consent_sms: false, unsubscribed_at: new Date().toISOString() });
    await db.recordEvent(client, ws.id, { kind: "text_in", detail: "Replied STOP. Texts are off for this lead.", leadId: lead.id, actor: "webhook" });
  } else {
    const patch: Partial<Lead> = {};
    if (restarted && lead.unsubscribed_at) {
      patch.unsubscribed_at = null;
      patch.consent_sms = true;
    } else if (!lead.consent_sms && !lead.unsubscribed_at) {
      // Texting the business first is consent to be texted back.
      patch.consent_sms = true;
    }
    if (Object.keys(patch).length) await db.updateLead(client, ws.id, lead.id, patch);
    await db.recordEvent(client, ws.id, { kind: "text_in", detail: created ? `New lead texted in: ${text.slice(0, 140)}` : `Texted: ${text.slice(0, 140)}`, leadId: lead.id, actor: "webhook", meta: { created } });
  }
  return { lead, created, stopped };
}

export type MetaLeadFields = { name: string; phone: string | null; email: string | null; service: string | null; message: string | null; extra: Record<string, string> };

/** Meta's field_data array into our fields. Field names vary per form. */
export function metaFieldsToLead(fieldData: { name?: string; values?: unknown[] }[]): MetaLeadFields {
  const map: Record<string, string> = {};
  for (const f of fieldData) {
    const key = String(f.name ?? "").toLowerCase();
    const val = Array.isArray(f.values) ? f.values.map((v) => String(v)).join(", ") : "";
    if (key) map[key] = val;
  }
  const get = (...keys: string[]) => keys.map((k) => map[k]).find((v) => v && v.trim()) ?? "";
  const name = str(get("full_name", "name", "first_name") || [map.first_name, map.last_name].filter(Boolean).join(" "), 120);
  const phone = toE164(get("phone_number", "phone", "mobile_number"));
  const email = normalizeEmail(get("email", "email_address"));
  const known = new Set(["full_name", "name", "first_name", "last_name", "phone_number", "phone", "mobile_number", "email", "email_address"]);
  const extra: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) if (!known.has(k) && v) extra[k] = str(v, 300);
  const service = str(get("service", "what_do_you_need", "what_service_do_you_need", "job_type", "interest"), 120) || null;
  const message = Object.entries(extra).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join("\n") || null;
  return { name, phone, email, service, message, extra };
}
