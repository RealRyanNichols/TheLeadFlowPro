// RECOVERED SOURCE. This file did not exist in git until now.
//
// The quo-webhook edge function has been running in production (project
// hpzpwfymwfgwspaixrxi, version 3, status ACTIVE, verify_jwt false) with no
// source in this repository. It was recovered from the deployed artifact so it
// can be reviewed, diffed and rolled back like everything else.
//
// ONE DELIBERATE DIFFERENCE FROM THE DEPLOYED ARTIFACT.
// The deployed version carries a hardcoded 48-hex shared secret as a fallback:
//
//     const BUILTIN_TOKEN = "<48 hex characters>";
//     const SHARED_TOKEN = Deno.env.get("QUO_WEBHOOK_TOKEN") || BUILTIN_TOKEN;
//
// That literal is NOT reproduced here, because this repository is public and
// committing it would publish a live credential. It is replaced below with a
// fail-closed read of QUO_WEBHOOK_TOKEN.
//
// Consequences, stated plainly so nobody is surprised:
//   1. The deployed secret must be treated as compromised regardless. It sits
//      in deployed source readable by anyone with project access, and
//      verify_jwt is off, so possession of it is enough to create leads and to
//      clear SMS consent through apply_sms_opt_out.
//   2. Deploying THIS file without first setting the QUO_WEBHOOK_TOKEN function
//      secret will make the endpoint reject every request with 401. That is the
//      intended behaviour: a missing secret must not silently fall back to a
//      known one. Set the secret, update the token in the Quo webhook URL, then
//      deploy.
//   3. Until it is rotated and redeployed, production still runs the old
//      artifact with the old fallback. Committing this file changes nothing in
//      production on its own.
//
// Rotation and redeploy are approval-gated and have NOT been done.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Quo (OpenPhone) -> LeadFlow Pro CRM activity logger.
// Every call and text on the LFP line lands on the matching lead,
// stamps last_contacted_at, and moves new -> contacted.
// Unknown numbers auto-create a lead with consent flags FALSE.
//
// SCOPE GUARD: the Quo webhook is set to "all phone numbers", and the workspace
// also holds the Premier Dental Academy line. PDA has its own Supabase project.
// Anything not on the LFP line is ignored here so PDA traffic can never create
// leads in this CRM.
//
// AUTH: a valid OpenPhone signature (once QUO_WEBHOOK_SECRET is set) OR the shared token.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SIGNING_SECRET = Deno.env.get("QUO_WEBHOOK_SECRET") ?? "";
// Fail closed. No builtin fallback: an unset token means nothing authenticates.
const SHARED_TOKEN = Deno.env.get("QUO_WEBHOOK_TOKEN") ?? "";

// The LeadFlow Pro line. Last 10 digits.
const LFP_LINE = "9035008898";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function digits(v: unknown): string {
  return typeof v === "string" ? v.replace(/\D/g, "").slice(-10) : "";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// An empty configured token must never be matchable by an empty query param.
function tokenValid(given: string | null): boolean {
  if (!SHARED_TOKEN) return false;
  return timingSafeEqual(given ?? "", SHARED_TOKEN);
}

// OpenPhone signs as: hmac;1;<timestamp>;<base64 digest> over `<timestamp>.<rawBody>`
async function signatureValid(header: string | null, rawBody: string): Promise<boolean> {
  if (!SIGNING_SECRET || !header) return false;
  const parts = header.split(";");
  if (parts.length !== 4) return false;
  const [, , timestamp, provided] = parts;
  try {
    const keyBytes = Uint8Array.from(atob(SIGNING_SECRET), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const mac = await crypto.subtle.sign(
      "HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`),
    );
    return timingSafeEqual(btoa(String.fromCharCode(...new Uint8Array(mac))), provided);
  } catch {
    return false;
  }
}

function firstPhone(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return null;
}

function allPhones(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string") as string[];
  return [];
}

// True when this event belongs to the LeadFlow Pro line.
function onLfpLine(obj: any): boolean {
  const ends = [...allPhones(obj.from), ...allPhones(obj.to)].map(digits);
  return ends.includes(LFP_LINE);
}

function outcomeFor(status: string | null, duration: number | null, voicemail: boolean): string {
  const s = (status ?? "").toLowerCase();
  if (voicemail) return "voicemail";
  if (s === "completed" && (duration ?? 0) > 0) return "answered";
  if (s === "no-answer" || s === "no_answer") return "no_answer";
  if (s === "missed") return "missed";
  if (s === "completed") return "completed";
  return "unknown";
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const ok = tokenValid(url.searchParams.get("token"));
    return json({
      ok,
      service: "quo-webhook",
      scoped_to_line: LFP_LINE,
      signature_secret_set: SIGNING_SECRET.length > 0,
    }, ok ? 200 : 401);
  }

  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const rawBody = await req.text();

  const bySignature = await signatureValid(req.headers.get("openphone-signature"), rawBody);
  const byToken = tokenValid(url.searchParams.get("token"));
  if (!bySignature && !byToken) return json({ error: "unauthorized" }, 401);

  let event: any;
  try { event = JSON.parse(rawBody); } catch { return json({ error: "bad json" }, 400); }

  const type: string = event?.type ?? "";
  const obj: any = event?.data?.object ?? {};

  // Summary / transcript events carry only a callId. They are safe: the update
  // only matches a lead_calls row this function already created for the LFP line.
  if (type === "call.summary.completed") {
    const summary = Array.isArray(obj.summary) ? obj.summary.join("\n") : (obj.summary ?? null);
    const { error } = await db.from("lead_calls")
      .update({ summary, next_steps: obj.nextSteps ?? null, updated_at: new Date().toISOString() })
      .eq("provider_id", obj.callId);
    return json({ ok: !error, applied: "summary", error: error?.message ?? null });
  }
  if (type === "call.transcript.completed") {
    const { error } = await db.from("lead_calls")
      .update({ transcript: obj.dialogue ?? null, updated_at: new Date().toISOString() })
      .eq("provider_id", obj.callId);
    return json({ ok: !error, applied: "transcript", error: error?.message ?? null });
  }

  if (!onLfpLine(obj)) {
    return json({ ok: true, ignored: "not the LeadFlow Pro line", type });
  }

  let payload: Record<string, unknown> | null = null;

  if (type.startsWith("message.")) {
    const direction = obj.direction ?? "incoming";
    const participant = direction === "outgoing" ? firstPhone(obj.to) : firstPhone(obj.from);
    payload = {
      kind: "message",
      channel: "sms",
      provider_id: obj.id,
      conversation_id: obj.conversationId ?? null,
      participant_phone: participant,
      direction,
      occurred_at: obj.createdAt ?? event.createdAt,
      body: obj.text ?? obj.body ?? "",
      author: obj.userId ?? null,
      delivered: type === "message.delivered" ? true : (obj.status !== "undelivered"),
      source: "quo",
    };
  } else if (type === "call.completed" || type === "call.recording.completed") {
    const direction = obj.direction ?? "incoming";
    const participant = direction === "outgoing" ? firstPhone(obj.to) : firstPhone(obj.from);
    const voicemailUrl = obj.voicemail?.url ?? null;
    const recordingUrl = obj.media?.[0]?.url ?? null;
    payload = {
      kind: "call",
      provider_id: obj.id,
      conversation_id: obj.conversationId ?? null,
      participant_phone: participant,
      direction,
      status: obj.status ?? null,
      outcome: outcomeFor(obj.status ?? null, obj.duration ?? null, Boolean(voicemailUrl)),
      from_number: firstPhone(obj.from),
      to_number: firstPhone(obj.to),
      phone_number_id: obj.phoneNumberId ?? null,
      user_id: obj.userId ?? null,
      occurred_at: obj.createdAt ?? event.createdAt,
      answered_at: obj.answeredAt ?? null,
      completed_at: obj.completedAt ?? null,
      duration_seconds: obj.duration ?? null,
      voicemail_url: voicemailUrl,
      recording_url: recordingUrl,
      source: "quo",
    };
  } else {
    return json({ ok: true, ignored: type });
  }

  if (!payload?.provider_id || !payload?.participant_phone) {
    return json({ ok: false, reason: "missing id or phone", type }, 200);
  }

  const { data, error } = await db.rpc("log_quo_activity", { payload });
  if (error) {
    console.error("log_quo_activity failed", error.message, type);
    return json({ ok: false, error: error.message }, 500);
  }

  return json({ ok: true, type, result: data });
});
