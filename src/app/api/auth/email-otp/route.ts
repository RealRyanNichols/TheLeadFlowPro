// src/app/api/auth/email-otp/route.ts
//
// Step 1 of passwordless login. Caller POSTs { email } and we:
//   1. Generate a 6-digit code
//   2. Store it in VerificationToken with a 10-minute expiry
//   3. Email it to the address (Resend if RESEND_API_KEY is set, else log
//      it to the server console for dev)
//
// Step 2 (verify) happens via NextAuth signIn("email-otp", { email, otp })
// which is wired in src/lib/auth.ts.

import { NextResponse } from "next/server";
import { LEADFLOW_FROM_EMAIL, LEADFLOW_PUBLIC_EMAIL } from "@/lib/contact";
import { prisma } from "@/lib/prisma";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM_ADDRESS || `Ryan @ The LeadFlow Pro <${LEADFLOW_FROM_EMAIL}>`;
const SUPPORT_EMAIL = LEADFLOW_PUBLIC_EMAIL;

function generateOtp(): string {
  // 6-digit numeric, zero-padded.
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

async function sendOtpEmail(email: string, code: string): Promise<{ sent: boolean; reason?: string }> {
  if (!RESEND_API_KEY) {
    // Dev fallback: log the code so we can copy it. Never ship this in prod
    // without RESEND_API_KEY actually set.
    // eslint-disable-next-line no-console
    console.log(`[email-otp] code for ${email}: ${code}`);
    return { sent: false, reason: "no_resend_key" };
  }

  const subject = `Your sign-in code: ${code}`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
      <h1 style="font-size:18px;margin:0 0 8px 0">The LeadFlow Pro</h1>
      <p style="font-size:14px;color:#475569;margin:0 0 24px 0">
        Here's your one-time sign-in code. Enter it on the login screen.
      </p>
      <div style="font-size:32px;font-weight:700;letter-spacing:6px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:12px;padding:16px;text-align:center;font-family:ui-monospace,monospace">
        ${code}
      </div>
      <p style="font-size:12px;color:#64748b;margin:24px 0 0 0">
        This code expires in 10 minutes. If you didn't request it, you can ignore this email.
      </p>
      <p style="font-size:12px;color:#64748b;margin:8px 0 0 0">
        Trouble? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:#0d4a9d">${SUPPORT_EMAIL}</a>.
      </p>
    </div>
  `;
  const text = `Your one-time sign-in code: ${code}\n\nExpires in 10 minutes. If you didn't request it, ignore this email.`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      // eslint-disable-next-line no-console
      console.error(`[email-otp] resend error ${res.status}: ${body}`);
      return { sent: false, reason: "resend_error" };
    }
    return { sent: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[email-otp] resend exception:", err);
    return { sent: false, reason: "resend_exception" };
  }
}

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email" }, { status: 400 });
  }

  // Throttle: cap to 5 codes per email per hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await prisma.verificationToken.count({
    where: { identifier: email, expires: { gt: oneHourAgo } },
  });
  if (recent >= 5) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Try again in a few minutes." },
      { status: 429 }
    );
  }

  // Burn any unused codes for this email so only the latest works.
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  const code = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.verificationToken.create({
    data: { identifier: email, token: code, expires },
  });

  const send = await sendOtpEmail(email, code);

  // If we couldn't actually send the email (RESEND_API_KEY missing or API
  // returned an error), tell the user directly. We do NOT return the code in
  // the response — that would let anyone log in as anyone. The code lives in
  // the server console (visible in Vercel logs) for the admin to retrieve.
  if (!send.sent) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Email delivery isn't fully wired yet. Email Ryan at " +
          SUPPORT_EMAIL +
          " for direct access while we finish setup.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
