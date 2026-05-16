// src/app/api/demo/missed-call/route.ts
//
// Sends ONE demo SMS using a sample template via the existing Twilio
// wrapper. Rate-limited to one send per phone per 24 hours using a small
// in-process Map (resets on deploy). Good enough for a tease-to-convert
// surface; a real Redis/Upstash counter is a follow-up if abuse shows up.
//
// Anti-give-away rules in play:
//   - Sample script ONLY. We never read or send a customer's actual
//     after-hours template from this route.
//   - One send per phone per 24 hours.
//   - The wrapper degrades gracefully if Twilio creds are missing.

import { NextResponse } from "next/server";
import { z } from "zod";
import { sendSms } from "@/lib/sms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().trim().min(7).max(40),
});

const SAMPLE_TEMPLATE =
  "Hey — this is the demo text from The LeadFlow Pro's Missed-Call Rescue tool. " +
  "Your real version uses your business name and your script. " +
  "Reply STOP to opt out.";

const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const recentSends = new Map<string, number>();

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

function pruneRecent(now: number) {
  for (const [key, ts] of recentSends) {
    if (now - ts > RATE_LIMIT_WINDOW_MS) recentSends.delete(key);
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: "Drop a valid phone number." },
      { status: 400 },
    );
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return NextResponse.json(
      { ok: false, message: "That doesn't look like a valid phone number." },
      { status: 400 },
    );
  }

  const now = Date.now();
  pruneRecent(now);
  const lastSent = recentSends.get(phone);
  if (lastSent && now - lastSent < RATE_LIMIT_WINDOW_MS) {
    const hoursLeft = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - lastSent)) / (60 * 60 * 1000));
    return NextResponse.json(
      {
        ok: false,
        reason: "rate_limited",
        message: `You already got the demo text in the last 24 hours. Try again in ~${hoursLeft}h, or buy the real version below.`,
      },
      { status: 429 },
    );
  }

  const result = await sendSms({ to: phone, body: SAMPLE_TEMPLATE });

  if (result.skipped) {
    // SMS provider not configured. Record the attempt anyway so the UI
    // still walks the user through to the live-preview state, and so a
    // single attempt counts against the rate limit during dev.
    recentSends.set(phone, now);
    return NextResponse.json(
      {
        ok: true,
        message:
          "Demo logged. SMS sender isn't wired up in this environment — when it is, the same template hits your phone in under 5 seconds.",
      },
      { status: 200 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "Couldn't send the demo text. Try again later or buy the real version below.",
      },
      { status: 502 },
    );
  }

  recentSends.set(phone, now);
  return NextResponse.json(
    {
      ok: true,
      message: "Demo text sent. Check your phone — that's the same shape your buyers will see.",
    },
    { status: 200 },
  );
}
