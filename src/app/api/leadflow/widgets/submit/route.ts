import { NextResponse } from "next/server";
import { z } from "zod";
import { submitWidgetResponse } from "@/lib/leadflow-widgets";
import type { QuestionnaireAnswerMap } from "@/lib/questionnaire-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WidgetSubmitSchema = z.object({
  widgetId: z.string().trim().min(2).max(120),
  anonymousUserId: z.string().trim().min(4).max(140),
  answers: z.record(z.unknown()).default({}),
  consent: z.object({
    saveAnswers: z.boolean().default(false),
    contactMe: z.boolean().default(false),
    routeOrShare: z.boolean().default(false),
  }),
  sourceDomain: z.string().trim().max(220).optional().default(""),
  pageUrl: z.string().trim().max(1200).optional().default(""),
  sourceUrl: z.string().trim().max(1200).optional().default(""),
});

function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export async function POST(req: Request) {
  const parsed = WidgetSubmitSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message || "Invalid widget response." }, { status: 400 });
  }

  const sourceDomain =
    parsed.data.sourceDomain || req.headers.get("origin") || req.headers.get("referer") || "";
  const result = await submitWidgetResponse({
    ...parsed.data,
    answers: parsed.data.answers as QuestionnaireAnswerMap,
    sourceDomain,
    userAgent: req.headers.get("user-agent"),
    ipAddress: clientIp(req),
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    responseId: result.responseId,
    leadProfileId: result.leadProfileId,
    result: result.result,
    persisted: result.persisted,
  });
}
