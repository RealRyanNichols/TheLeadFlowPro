import { NextRequest, NextResponse } from "next/server";
import { LEADFLOW_FROM_EMAIL, LEADFLOW_PUBLIC_EMAIL } from "@/lib/contact";
import { prisma } from "@/lib/prisma";
import { rememberPublicVisitor } from "@/lib/lead-memory";
import { recordSitePulseEvent } from "@/lib/site-pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM_ADDRESS || `Ryan @ The LeadFlow Pro <${LEADFLOW_FROM_EMAIL}>`;
const DEFAULT_NOTIFY_EMAIL = LEADFLOW_PUBLIC_EMAIL;

function pickStr(v: FormDataEntryValue | null, max = 1000): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function notifyRyan(input: {
  fullName: string;
  email: string;
  phone?: string | null;
  requestType: string;
  city?: string | null;
  workType?: string | null;
  details?: string | null;
  availability?: string | null;
  intakeId?: string | null;
}) {
  if (!RESEND_API_KEY) return;
  const to = process.env.LEADFLOW_NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL;
  const subject = `Community connector: ${input.requestType} - ${input.fullName}`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#0f172a;background:#f8fafc">
      <div style="background:#020617;color:white;border-radius:20px;padding:22px;margin-bottom:18px">
        <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#67e8f9;font-weight:700">The LeadFlow Pro · Community Connector</div>
        <h1 style="margin:10px 0 0 0;font-size:26px;line-height:1.15">New community connection request</h1>
      </div>
      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin-bottom:14px">
        <p><strong>Name:</strong> ${escapeHtml(input.fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(input.phone)}</p>
        <p><strong>Request:</strong> ${escapeHtml(input.requestType)}</p>
        <p><strong>City:</strong> ${escapeHtml(input.city)}</p>
        <p><strong>Work type:</strong> ${escapeHtml(input.workType)}</p>
        <p><strong>Intake ID:</strong> ${escapeHtml(input.intakeId)}</p>
      </div>
      <div style="background:white;border:1px solid #e2e8f0;border-radius:18px;padding:18px">
        <h2 style="font-size:18px;margin:0 0 12px 0">Details</h2>
        <div style="white-space:pre-wrap;background:#f1f5f9;border-radius:12px;padding:12px">${escapeHtml(input.details)}</div>
        <h2 style="font-size:18px;margin:16px 0 12px 0">Availability / timing</h2>
        <div style="white-space:pre-wrap;background:#f1f5f9;border-radius:12px;padding:12px">${escapeHtml(input.availability)}</div>
      </div>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [to],
      reply_to: input.email,
      subject,
      html,
      text: [
        "New community connection request",
        `Name: ${input.fullName}`,
        `Email: ${input.email}`,
        input.phone ? `Phone: ${input.phone}` : null,
        `Request: ${input.requestType}`,
        input.city ? `City: ${input.city}` : null,
        input.workType ? `Work type: ${input.workType}` : null,
        input.details ? `Details:\n${input.details}` : null,
        input.availability ? `Availability:\n${input.availability}` : null,
      ].filter(Boolean).join("\n\n"),
    }),
  }).catch(() => null);
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const fullName = pickStr(form.get("fullName"), 120);
  const email = pickStr(form.get("email"), 200)?.toLowerCase();
  const requestType = pickStr(form.get("requestType"), 80) || "need-work";
  const visitorId = pickStr(form.get("visitorId"), 80) ?? crypto.randomUUID();
  const phone = pickStr(form.get("phone"), 32);
  const city = pickStr(form.get("city"), 120);
  const workType = pickStr(form.get("workType"), 180);
  const details = pickStr(form.get("details"), 1800);
  const availability = pickStr(form.get("availability"), 1200);

  if (!fullName) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!workType || !details) {
    return NextResponse.json({ error: "missing_context" }, { status: 400 });
  }

  const notes = [
    "Community Connector submission. Private until Ryan reviews.",
    `Request type: ${requestType}`,
    city ? `City / area: ${city}` : null,
    `Work or opportunity type: ${workType}`,
    `Details:\n${details}`,
    availability ? `Availability, pay, timing:\n${availability}` : null,
    "No work, hiring, safety, money, or outcome guarantee.",
  ].filter(Boolean).join("\n\n");

  let intakeId: string | null = null;
  try {
    const intake = await prisma.publicIntake.create({
      data: {
        fullName,
        email,
        phone,
        businessName: requestType === "offer-work" ? workType : null,
        businessUrl: null,
        industry: "community",
        platforms: {},
        monthlyRevenueRange: null,
        biggestGoal: "community-connector",
        biggestBlocker: details,
        budgetTier: "community",
        bestContactMethod: phone ? "phone-or-text" : "email",
        notes,
        routedTo: "/community?submitted=1",
      },
    });
    intakeId = intake.id;
  } catch (error) {
    console.error("community_connect_save_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  try {
    await rememberPublicVisitor({
      visitorId,
      email,
      fullName,
      phone,
      industry: "community",
      topic: "community connector",
      stage: "community-intake",
      path: "/community",
      source: "community-connect-form",
      profile: { requestType, city, workType, details, availability },
    });
    await recordSitePulseEvent({
      visitorId,
      path: "/community",
      eventType: "cta_contact",
      source: "community-connect-form",
      target: requestType,
      value: 1,
    });
  } catch {
    // Never block a community request because memory or analytics failed.
  }

  await notifyRyan({
    fullName,
    email,
    phone,
    requestType,
    city,
    workType,
    details,
    availability,
    intakeId,
  });

  return NextResponse.redirect(new URL("/community?submitted=1", req.url), { status: 303 });
}
