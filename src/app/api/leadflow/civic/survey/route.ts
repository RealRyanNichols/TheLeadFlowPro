import { NextResponse } from "next/server";
import { z } from "zod";
import { CIVIC_ISSUE_CATEGORIES, submitCivicSurvey } from "@/lib/leadflow-civic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CivicSurveySchema = z.object({
  location: z.string().trim().min(2).max(180),
  district: z.string().trim().max(180).optional().default(""),
  issuePriority: z.string().trim().min(4).max(600),
  concernCategory: z.enum(CIVIC_ISSUE_CATEGORIES),
  urgency: z.coerce.number().int().min(1).max(5),
  personalStory: z.string().trim().max(3000).optional().default(""),
  contactEmail: z.string().trim().email().max(220).optional().or(z.literal("")).default(""),
  consents: z.object({
    saveResponse: z.boolean(),
    contactMe: z.boolean(),
    publicDisplay: z.boolean(),
    shareWithCivicOrg: z.boolean(),
    keepAnonymous: z.boolean(),
  }),
  anonymousUserId: z.string().trim().max(140).optional().default(""),
  sourceUrl: z.string().trim().max(900).optional().default(""),
  sourcePath: z.string().trim().max(700).optional().default("/civic/surveys"),
});

function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    null
  );
}

export async function POST(req: Request) {
  const parsed = CivicSurveySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Invalid civic survey." }, { status: 400 });
  }

  const result = await submitCivicSurvey({
    ...parsed.data,
    userAgent: req.headers.get("user-agent"),
    ipAddress: clientIp(req),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    surveyId: result.surveyId,
    submissionId: result.submissionId,
    persisted: result.persisted,
    message: result.message,
  });
}
