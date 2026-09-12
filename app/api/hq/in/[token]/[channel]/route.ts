import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { inboundAllowed, ingestFormLead, ingestSms, isHoneypotHit, metaFieldsToLead, openphoneSignatureOk, parseInboundSms, requestPublicUrl, safeFormRedirect, twilioSignatureOk } from "@/lib/hq/inbound";
import { findWorkspaceByInboundToken, findWorkspaceBySmsToken, findWorkspaceByMetaPage, insertLead, recordEvent, getConnectionWithSecret } from "@/lib/hq/server";
import { planIsLive } from "@/lib/hq/types";

// The doors leads walk in through, one URL per business:
//
//   POST /api/hq/in/{token}/lead       a website form, Zapier, Make, curl
//   POST /api/hq/in/{sms_token}/sms    OpenPhone or Twilio inbound webhook
//   GET  /api/hq/in/{token}/meta       Meta webhook verification
//   POST /api/hq/in/{token}/meta       Meta leadgen webhook (signed)
//
// The lead and Meta doors use the business's lead endpoint token, which is
// an address (it sits in their website source). The text door uses its own
// token that is only ever shown inside HQ, and on top of that Twilio's
// signature is always verified and OpenPhone's is when the owner pasted
// the signing key. An unknown token is a 404 with no detail.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string; channel: string }> };

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

async function readBody(request: Request): Promise<{ raw: string; parsed: unknown; type: string }> {
  const type = request.headers.get("content-type") ?? "";
  const raw = await request.text().catch(() => "");
  if (type.includes("application/json")) {
    try {
      return { raw, parsed: JSON.parse(raw), type };
    } catch {
      return { raw, parsed: null, type };
    }
  }
  if (type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data")) {
    if (type.includes("multipart")) {
      // Re-parse as form data for browser forms with enctype multipart.
      try {
        const form = await new Request(request.url, { method: "POST", headers: request.headers, body: raw }).formData();
        return { raw, parsed: Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""])), type };
      } catch {
        return { raw, parsed: null, type };
      }
    }
    return { raw, parsed: Object.fromEntries(new URLSearchParams(raw).entries()), type };
  }
  try {
    return { raw, parsed: JSON.parse(raw), type };
  } catch {
    return { raw, parsed: null, type };
  }
}

function wantsHtml(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  const type = request.headers.get("content-type") ?? "";
  return accept.includes("text/html") && !type.includes("application/json");
}

export async function GET(request: Request, { params }: Params) {
  const { token, channel } = await params;
  if (channel !== "meta") return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  let db;
  try {
    db = createServiceClient();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  const ws = await findWorkspaceByInboundToken(db, token);
  if (!ws) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const url = new URL(request.url);
  // Meta's verification handshake: the verify token is this business's inbound token.
  if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === token) {
    return new NextResponse(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "bad_verify" }, { status: 403 });
}

export async function POST(request: Request, { params }: Params) {
  const { token, channel } = await params;
  let db;
  try {
    db = createServiceClient();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 500, headers: CORS });
  }
  const ws = channel === "sms" ? await findWorkspaceBySmsToken(db, token) : await findWorkspaceByInboundToken(db, token);
  if (!ws) return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  const live = planIsLive(ws.plan, ws.trial_ends_at);

  const { raw, parsed, type } = await readBody(request);
  if (raw.length > 200_000) return NextResponse.json({ error: "too_large" }, { status: 413, headers: CORS });

  try {
    if (channel === "lead") {
      const body = (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
      const html = wantsHtml(request);
      // A bot that filled the hidden field gets the same answer as a person.
      if (isHoneypotHit(body)) {
        return html ? NextResponse.redirect(safeFormRedirect(body.redirect, ws), { status: 303 }) : NextResponse.json({ ok: true, id: null, created: false, live }, { status: 200, headers: CORS });
      }
      if (!inboundAllowed(ws.id)) return NextResponse.json({ ok: false, error: "Too many submissions. Try again in a bit." }, { status: 429, headers: CORS });
      const sourceDetail = typeof body.source === "string" ? body.source.slice(0, 60) : request.headers.get("user-agent")?.toLowerCase().includes("zapier") ? "zapier" : new URL(request.url).searchParams.get("source")?.slice(0, 60) || null;
      const result = await ingestFormLead(db, ws, body, sourceDetail);
      if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers: CORS });
      if (html) return NextResponse.redirect(safeFormRedirect(body.redirect, ws), { status: 303 });
      return NextResponse.json({ ok: true, id: result.lead.id, created: result.created, live }, { status: result.created ? 201 : 200, headers: CORS });
    }

    if (channel === "sms") {
      const sms = parseInboundSms(type.includes("form") ? raw : parsed, type);
      if (!sms) return NextResponse.json({ ok: true, ignored: true }, { headers: CORS });
      // The claimed provider must be the one this business connected.
      const line = await getConnectionWithSecret(db, ws.id, sms.provider);
      if (!line || line.connection.status !== "connected") return NextResponse.json({ error: "no_such_line" }, { status: 403 });
      if (sms.provider === "twilio") {
        // Twilio signs the exact URL it posted to with the auth token we hold.
        const params = Object.fromEntries(new URLSearchParams(raw).entries());
        const candidates = [requestPublicUrl(request), `https://www.theleadflowpro.com/api/hq/in/${token}/sms`];
        const sig = request.headers.get("x-twilio-signature");
        if (!line.secret || !candidates.some((u) => twilioSignatureOk(line.secret as string, u, params, sig))) {
          return NextResponse.json({ error: "bad_signature" }, { status: 403 });
        }
      } else if (line.webhookSecret) {
        if (!openphoneSignatureOk(line.webhookSecret, raw, request.headers.get("openphone-signature"))) {
          return NextResponse.json({ error: "bad_signature" }, { status: 403 });
        }
      }
      if (!inboundAllowed(ws.id)) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: CORS });
      const result = await ingestSms(db, ws, sms);
      if (sms.provider === "twilio") {
        return new NextResponse("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
      }
      return NextResponse.json({ ok: true, lead: result.lead?.id ?? null, created: result.created, stopped: result.stopped }, { headers: CORS });
    }

    if (channel === "meta") {
      const secret = process.env.META_APP_SECRET?.trim();
      const sig = request.headers.get("x-hub-signature-256") ?? "";
      if (!secret || !sig.startsWith("sha256=")) return NextResponse.json({ error: "unsigned" }, { status: 403 });
      const expected = `sha256=${crypto.createHmac("sha256", secret).update(raw).digest("hex")}`;
      const a = Buffer.from(expected);
      const b = Buffer.from(sig);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return NextResponse.json({ error: "bad_signature" }, { status: 403 });
      const payload = (parsed && typeof parsed === "object" ? parsed : {}) as { entry?: { id?: string; changes?: { field?: string; value?: { leadgen_id?: string; page_id?: string; form_id?: string } }[] }[] };
      let handled = 0;
      for (const entry of payload.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== "leadgen" || !change.value?.leadgen_id) continue;
          const pageId = String(change.value.page_id ?? entry.id ?? "");
          // The webhook URL already names the workspace; the page must match a connected Page.
          const owner = pageId ? await findWorkspaceByMetaPage(db, pageId) : null;
          if (!owner || owner.id !== ws.id) continue;
          const page = await getConnectionWithSecret(db, ws.id, "meta_page");
          if (!page?.secret) continue;
          const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(change.value.leadgen_id)}?fields=field_data,created_time,form_id`, {
            headers: { Authorization: `Bearer ${page.secret}` },
            signal: AbortSignal.timeout(10_000),
          });
          if (!r.ok) continue;
          const lead = (await r.json().catch(() => ({}))) as { field_data?: { name?: string; values?: unknown[] }[]; form_id?: string };
          const fields = metaFieldsToLead(lead.field_data ?? []);
          const { lead: row, created } = await insertLead(db, ws.id, {
            name: fields.name,
            phone: fields.phone,
            email: fields.email,
            source: "meta",
            source_detail: lead.form_id ? `form ${lead.form_id}` : "lead ad",
            service: fields.service,
            message: fields.message,
            consent_sms: fields.consentSms,
            consent_email: !!fields.email,
            external_id: `meta:${change.value.leadgen_id}`,
            meta: fields.extra,
          });
          await recordEvent(db, ws.id, { kind: "lead_in", detail: created ? "New lead from a Meta lead ad" : "Repeat Meta lead", leadId: row.id, actor: "webhook", meta: { created } });
          handled++;
        }
      }
      return NextResponse.json({ ok: true, handled });
    }

    return NextResponse.json({ error: "not_found" }, { status: 404, headers: CORS });
  } catch (e) {
    console.error(`hq inbound ${channel} failed:`, e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ ok: false, error: "Could not record that right now." }, { status: 500, headers: CORS });
  }
}
