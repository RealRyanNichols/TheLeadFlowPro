// src/app/api/mortgage/prequal/route.ts
// Receives pre-qual submissions from the MortgagePrequalWidget.
// Responsibilities (in order):
//   1. Validate payload + TCPA consent
//   2. Score the lead (server-side, authoritative)
//   3. Persist MortgageLead + ConsentLog row
//   4. Route to the assigned LO (round-robin if none specified)
//   5. Scan the outbound first-touch SMS + email under Compliance Guard
//   6. If green → queue send. If yellow → queue send + notify LO. If red → hold, notify LO.
//   7. Return grade + reasons to the widget

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  scoreLead,
  PreQualInput,
  VERTICALS,
  LoanType,
} from "@/lib/mortgage";
import { scanOutbound } from "@/lib/mortgage/compliance";

export const runtime = "nodejs";

// ──────────────────────────────────────────────────────────────────────────
// Payload validation
// ──────────────────────────────────────────────────────────────────────────
type Payload = PreQualInput & {
  loOwnerId?: string;
  fullName: string;
  email: string;
  phone: string;
  clientGrade?: string;
  clientReasons?: string[];
};

function invalidPayload(body: any): string | null {
  if (!body) return "empty body";
  if (!body.loanType || !(body.loanType in VERTICALS)) return "invalid loanType";
  if (!body.fullName || typeof body.fullName !== "string") return "missing fullName";
  if (!/.+@.+\..+/.test(body.email)) return "invalid email";
  if (!/\d{3}.*\d{3}.*\d{4}/.test(body.phone || "")) return "invalid phone";
  if (!body.state || typeof body.state !== "string") return "missing state";
  if (typeof body.consentTcpa !== "boolean") return "missing consentTcpa";
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// LO routing — round-robin fallback when no owner specified
// ──────────────────────────────────────────────────────────────────────────
async function routeToLo(loOwnerId?: string, state?: string): Promise<string | null> {
  if (loOwnerId) return loOwnerId;
  // Prefer an LO licensed in the borrower's state
  if (state) {
    const licensedLo = await prisma.user.findFirst({
      where: {
        mortgageOriginator: true,
        loStateLicenses: { has: state.toUpperCase() },
      },
      orderBy: { lastMortgageRouteAt: { sort: "asc", nulls: "first" } as any },
    });
    if (licensedLo) return licensedLo.id;
  }
  const anyLo = await prisma.user.findFirst({
    where: { mortgageOriginator: true },
    orderBy: { lastMortgageRouteAt: { sort: "asc", nulls: "first" } as any },
  });
  return anyLo?.id ?? null;
}

// ──────────────────────────────────────────────────────────────────────────
// First-touch draft — Flo's 90-second response, per loan vertical
// ──────────────────────────────────────────────────────────────────────────
function draftFirstTouchSms(payload: Payload, loNmlsId: string | null, loName: string | null): string {
  const v = VERTICALS[payload.loanType];
  const name = payload.fullName.split(" ")[0];

  // Tone-matched sub-agent voice. Keep under 160 chars so it doesn't split.
  let lead = `Hi ${name}, this is ${loName ?? "your LO"} via LeadFlow. `;
  if (payload.loanType === "purchase_preapproved") {
    lead += `Let's get you a rate range in 3 min for the home you're buying.`;
  } else if (payload.loanType === "purchase_fthb") {
    lead += `Welcome to home-buying! I'll walk you through every step.`;
  } else if (payload.loanType === "refi_rate_term" || payload.loanType === "refi_cashout") {
    lead += `I'll run the math on your current loan and show you where we can save.`;
  } else if (payload.loanType === "va") {
    lead += `Thank you for your service. Let me get you a VA rate range now.`;
  } else if (payload.loanType === "reverse") {
    lead += `Happy to discuss your HECM options — feel free to include family on the call.`;
  } else {
    lead += `Let's get you an estimated rate and next step today.`;
  }
  const footer = loNmlsId ? ` NMLS #${loNmlsId}. Reply STOP to opt out.` : ` Reply STOP to opt out.`;
  return lead + footer;
}

function draftFirstTouchEmail(payload: Payload, loName: string | null): { subject: string; body: string } {
  const v = VERTICALS[payload.loanType];
  return {
    subject: `Your ${v.label} pre-qual — next steps`,
    body:
      `Hi ${payload.fullName},\n\n` +
      `Thanks for starting your ${v.label.toLowerCase()} pre-qual with us. Based on what you shared, here's what happens next:\n\n` +
      `1) Within 3 minutes you'll get a text with an estimated rate range.\n` +
      `2) I'll call you at the number you provided to confirm the details.\n` +
      `3) If you'd like to move forward, I'll send you a secure link for the documents we need.\n\n` +
      `You are not committed to anything and your credit won't be pulled hard until you give the green light.\n\n` +
      `— ${loName ?? "Your loan officer"} via LeadFlow Pro\n\n` +
      `This email was sent because you submitted a pre-qualification. If you did not, reply and we'll remove your information immediately.`,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Handler
// ──────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const err = invalidPayload(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (!body.consentTcpa) {
    return NextResponse.json({ error: "TCPA consent required" }, { status: 400 });
  }

  // Authoritative server-side scoring
  const { grade, reasons } = scoreLead(body);

  // Capture IP + user-agent for consent log
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";

  // Route to LO
  const loId = await routeToLo(body.loOwnerId, body.state);
  const lo = loId
    ? await prisma.user.findUnique({ where: { id: loId }, select: { id: true, name: true, loNmlsId: true, loStateLicenses: true } })
    : null;

  // Persist lead + consent
  const lead = await prisma.mortgageLead.create({
    data: {
      ownerId: loId ?? null,
      loanType: body.loanType,
      ficoBand: body.ficoBand,
      timeline: body.timeline,
      state: body.state.toUpperCase(),
      fullName: body.fullName,
      email: body.email.toLowerCase(),
      phone: body.phone,
      estIncomeUsd: body.estIncomeUsd ?? null,
      estDtiPct: body.estDtiPct ?? null,
      estLoanAmountUsd: body.estLoanAmountUsd ?? null,
      estPropertyValueUsd: body.estPropertyValueUsd ?? null,
      hasRealtor: body.hasRealtor ?? false,
      hasContract: body.hasContract ?? false,
      ownerOccupied: body.ownerOccupied ?? true,
      grade,
      gradeReasons: reasons,
      stage: "new",
    },
  });

  await prisma.consentLog.create({
    data: {
      subjectEmail: body.email.toLowerCase(),
      subjectPhone: body.phone,
      consentType: "TCPA",
      capturedAt: new Date(),
      ip,
      userAgent: ua,
      source: "mortgage_prequal_widget",
      leadId: lead.id,
    },
  });

  // Update LO round-robin cursor
  if (loId) {
    await prisma.user.update({
      where: { id: loId },
      data: { lastMortgageRouteAt: new Date() },
    });
  }

  // Draft + scan first-touch SMS
  const smsBody = draftFirstTouchSms(body, lo?.loNmlsId ?? null, lo?.name ?? null);
  const smsScan = scanOutbound({
    channel: "sms",
    state: body.state,
    loanType: body.loanType as LoanType,
    tcpaConsent: { capturedAt: new Date().toISOString(), ip, source: "mortgage_prequal_widget" },
    loNmlsId: lo?.loNmlsId ?? undefined,
    loStateLicenses: lo?.loStateLicenses ?? undefined,
    loDisplayName: lo?.name ?? undefined,
    body: smsBody,
  });

  const email = draftFirstTouchEmail(body, lo?.name ?? null);
  const emailScan = scanOutbound({
    channel: "email",
    state: body.state,
    loanType: body.loanType as LoanType,
    loNmlsId: lo?.loNmlsId ?? undefined,
    loStateLicenses: lo?.loStateLicenses ?? undefined,
    loDisplayName: lo?.name ?? undefined,
    body: email.body,
    tcpaConsent: { capturedAt: new Date().toISOString(), ip, source: "mortgage_prequal_widget" },
  });

  // Persist compliance scan records
  await prisma.complianceScan.createMany({
    data: [
      {
        leadId: lead.id,
        channel: "sms",
        verdict: smsScan.verdict,
        flags: smsScan.flags as any,
        summary: smsScan.summary,
        bodyPreview: smsBody.slice(0, 280),
      },
      {
        leadId: lead.id,
        channel: "email",
        verdict: emailScan.verdict,
        flags: emailScan.flags as any,
        summary: emailScan.summary,
        bodyPreview: email.body.slice(0, 280),
      },
    ],
  });

  // Queue sends. In production these would enqueue into Twilio / Resend / Postmark.
  // For now we just persist "OutboundJob" rows and let a worker pick them up.
  const canSendSms = smsScan.verdict !== "red";
  const canSendEmail = emailScan.verdict !== "red";

  if (canSendSms) {
    await prisma.outboundJob.create({
      data: {
        leadId: lead.id,
        channel: "sms",
        toPhone: body.phone,
        body: smsBody,
        status: smsScan.verdict === "yellow" ? "pending_review" : "queued",
        scheduledFor: new Date(),
      },
    });
  }
  if (canSendEmail) {
    await prisma.outboundJob.create({
      data: {
        leadId: lead.id,
        channel: "email",
        toEmail: body.email.toLowerCase(),
        subject: email.subject,
        body: email.body,
        status: emailScan.verdict === "yellow" ? "pending_review" : "queued",
        scheduledFor: new Date(),
      },
    });
  }

  // Notify the LO (internal; doesn't block the borrower response)
  if (loId) {
    await prisma.notification.create({
      data: {
        userId: loId,
        kind: "new_mortgage_lead",
        payload: {
          leadId: lead.id,
          grade,
          loanType: body.loanType,
          fullName: body.fullName,
          state: body.state,
          smsVerdict: smsScan.verdict,
          emailVerdict: emailScan.verdict,
        } as any,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    leadId: lead.id,
    grade,
    reasons,
    firstTouch: {
      sms: { verdict: smsScan.verdict, summary: smsScan.summary },
      email: { verdict: emailScan.verdict, summary: emailScan.summary },
    },
  });
}
