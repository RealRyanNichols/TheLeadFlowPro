/**
 * POST /api/inbound/twilio/[userId]/voice
 *
 * Configured as Twilio's Voice Webhook on the user's LeadFlow number.
 * Behavior:
 *   - Ring forward to user's configured cell (forwardToPhone).
 *   - Twilio re-hits this endpoint with CallStatus once the leg ends.
 *   - On no-answer / busy / failed → fire the Missed-Call Auto Text-Back.
 *
 * We respond with TwiML on the first hit and plain 204 on the status ping.
 * Signature validation is recommended for production — wire via
 * TWILIO_VALIDATE_SIGNATURE=true once the live account signs requests.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findOrCreateLeadByPhone, logMessage, renderTemplate } from "@/lib/leads";
import { sendSms, DEFAULT_MISSED_CALL_REPLY } from "@/lib/sms";

export const dynamic = "force-dynamic";

interface Ctx {
  params: { userId: string };
}

function xml(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function twimlReject(reason = "This line isn't monitored — please leave a text.") {
  return xml(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${reason}</Say><Hangup/></Response>`,
  );
}

export async function POST(req: Request, { params }: Ctx) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return twimlReject("Invalid request.");
  }

  const from = String(form.get("From") ?? "");
  const to = String(form.get("To") ?? "");
  const callStatus = String(form.get("CallStatus") ?? "");
  const callSid = String(form.get("CallSid") ?? "");
  const dialCallStatus = String(form.get("DialCallStatus") ?? "");

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      businessName: true,
      forwardToPhone: true,
      missedCallReply: true,
      missedCallEnabled: true,
    },
  });

  if (!user) {
    return twimlReject("This LeadFlow line isn't configured yet.");
  }

  // --- First leg: incoming ring ---------------------------------------------
  // Twilio POSTs with CallStatus="ringing" (or no DialCallStatus yet).
  // We dial the user's cell with a status callback so we can detect a miss.
  const isDialCallback = !!dialCallStatus;

  if (!isDialCallback) {
    // No forwarding number on file? Tell them to text.
    if (!user.forwardToPhone) {
      // Still fire the text-back if enabled and we have a caller number.
      if (user.missedCallEnabled && from) {
        await fireMissedCallTextBack({
          user,
          fromPhone: from,
          toPhone: to,
          callSid,
        });
      }
      return xml(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">Thanks for calling ${escapeXml(user.businessName ?? user.name ?? "us")}. Please send a text to this same number and we'll reply right away.</Say></Response>`,
      );
    }

    const actionUrl = new URL(req.url).toString();
    return xml(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Dial action="${escapeXml(actionUrl)}" method="POST" timeout="20" answerOnBridge="true"><Number>${escapeXml(user.forwardToPhone)}</Number></Dial></Response>`,
    );
  }

  // --- Second leg: dial finished --------------------------------------------
  // DialCallStatus ∈ { completed, busy, no-answer, failed, canceled }.
  const missed =
    dialCallStatus === "no-answer" ||
    dialCallStatus === "busy" ||
    dialCallStatus === "failed" ||
    dialCallStatus === "canceled";

  if (missed && user.missedCallEnabled && from) {
    await fireMissedCallTextBack({
      user,
      fromPhone: from,
      toPhone: to,
      callSid,
    });
    // Tell Twilio the call is over.
    return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }

  return xml(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
}

// --- helpers -----------------------------------------------------------------

async function fireMissedCallTextBack(args: {
  user: {
    id: string;
    name: string | null;
    businessName: string | null;
    missedCallReply: string | null;
  };
  fromPhone: string;
  toPhone: string;
  callSid: string;
}) {
  const { user, fromPhone, toPhone, callSid } = args;

  const lead = await findOrCreateLeadByPhone({
    userId: user.id,
    phone: fromPhone,
    source: "call",
  });

  // Record the missed-call event as an inbound call_log message so the
  // conversation view shows the full history.
  await logMessage({
    leadId: lead.id,
    direction: "inbound",
    channel: "call_log",
    body: `Missed call from ${fromPhone} → ${toPhone}`,
    sentBy: callSid || null,
  });

  const first = (lead.name ?? "").split(/\s+/)[0] ?? "";
  const firstForTemplate = first ? ` ${first}` : ""; // leading space on match, empty on miss
  const template = user.missedCallReply?.trim() || DEFAULT_MISSED_CALL_REPLY;
  const body = renderTemplate(template, {
    first_name: firstForTemplate,
    name: first,
    business: user.businessName ?? user.name ?? "us",
  });

  const send = await sendSms({ to: fromPhone, body });

  await logMessage({
    leadId: lead.id,
    direction: "outbound",
    channel: "sms",
    body,
    sentBy: send.sid ?? (send.skipped ? "pending-twilio-config" : "auto-text-back"),
  });
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
