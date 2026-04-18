/**
 * POST /api/inbound/twilio/[userId]/sms
 *
 * Twilio "A Message Comes In" webhook. Logs the inbound SMS against the
 * matching lead (or creates one) so the conversation stays in one place.
 *
 * Does not auto-reply here — that's the chatbot's job (Task #13). For now
 * we just capture the message so Ryan's users see every inbound thread.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findOrCreateLeadByPhone, logMessage } from "@/lib/leads";

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

export async function POST(req: Request, { params }: Ctx) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return xml(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
  }

  const from = String(form.get("From") ?? "");
  const body = String(form.get("Body") ?? "").trim();
  const mediaUrl0 = form.get("MediaUrl0");
  const messageSid = String(form.get("MessageSid") ?? "");

  // Validate the target user exists — avoid creating orphan leads if someone
  // guesses a /api/inbound/twilio/xxx/sms path.
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true },
  });
  if (!user || !from || !body) {
    return xml(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
  }

  const lead = await findOrCreateLeadByPhone({
    userId: user.id,
    phone: from,
    source: "text",
  });

  await logMessage({
    leadId: lead.id,
    direction: "inbound",
    channel: "sms",
    body,
    mediaUrl: mediaUrl0 ? String(mediaUrl0) : null,
    sentBy: messageSid || null,
  });

  // Bump lead back to "contacted" if it was stale — the user has re-engaged.
  if (["nurturing", "unresponsive"].includes(lead.status)) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "contacted" },
    });
  }

  // Empty TwiML — the chatbot reply endpoint (Task #13) will fire separately
  // once it's wired. For now, no auto-reply so we don't misrepresent.
  return xml(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
}
