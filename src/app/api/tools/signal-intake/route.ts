import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { scoreLeadSignalProfile } from "@/lib/leadflow-scoring";
import { prisma } from "@/lib/prisma";
import { getLeadFlowTool, leadFlowToolIds, protectedDataWarning } from "@/lib/leadflow-tools";

export const runtime = "nodejs";

const urgencyIds = new Set(["now", "this_week", "this_month", "researching"]);

const ToolSignalIntakeSchema = z.object({
  toolId: z.string().refine((value) => (leadFlowToolIds as Set<string>).has(value), "Invalid tool"),
  sessionId: z.string().trim().min(8).max(120),
  sourcePath: z.string().trim().min(1).max(220).refine((value) => value.startsWith("/tools"), "Invalid source path"),
  primaryAnswer: z.string().trim().min(8).max(1400),
  context: z.string().trim().min(8).max(1400),
  desiredOutcome: z.string().trim().min(8).max(1200),
  urgency: z.string().refine((value) => urgencyIds.has(value), "Invalid urgency"),
  consentAccepted: z.literal(true),
  adultConfirmed: z.literal(true),
  sensitiveDataAcknowledged: z.literal(true),
  clientTimestamp: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = ToolSignalIntakeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid tool signal intake" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const tool = getLeadFlowTool(data.toolId);
    if (!tool) {
      return NextResponse.json({ error: "Unknown tool" }, { status: 400 });
    }

    const session = await auth().catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const scorecard = scoreLeadSignalProfile({
      definition: {
        toolSlug: tool.id,
        toolType: "public_tool_signal_intake",
        vertical: tool.leadCategory,
        title: tool.name,
        description: tool.whoFor,
        valuePreview: tool.answerGives,
        defaultTags: [tool.leadCategory, "public_tool_signal"],
        steps: [],
      },
      answers: {
        tool_id: tool.id,
        lead_category: tool.leadCategory,
        primary_answer: data.primaryAnswer,
        context: data.context,
        desired_outcome: data.desiredOutcome,
        urgency: data.urgency,
      },
      consent: {
        status: "aggregate_only",
        routeData: data.consentAccepted,
        noticeVersion: "tools-signal-intake-v1",
      },
      attribution: {
        sourceUrl: data.sourcePath,
        sourcePath: data.sourcePath,
      },
      metadata: {
        adultConfirmed: data.adultConfirmed,
        sensitiveDataAcknowledged: data.sensitiveDataAcknowledged,
        clientTimestamp: data.clientTimestamp,
        suppressionStatus: "clear",
      },
      responseStatus: "completed",
    });
    const leadScore = scorecard.overallScore;
    const answers = {
      toolId: tool.id,
      toolName: tool.name,
      leadCategory: tool.leadCategory,
      prompt: tool.prompt,
      outputPreview: tool.outputPreview,
      primaryAnswer: data.primaryAnswer,
      context: data.context,
      desiredOutcome: data.desiredOutcome,
      urgency: data.urgency,
      scoring: scorecard,
      consent: {
        accepted: data.consentAccepted,
        adultConfirmed: data.adultConfirmed,
        sensitiveDataAcknowledged: data.sensitiveDataAcknowledged,
        noticeVersion: "tools-signal-intake-v1",
        warning: protectedDataWarning,
      },
      provenance: {
        sourcePath: data.sourcePath,
        sessionId: data.sessionId,
        clientTimestamp: data.clientTimestamp ?? null,
        serverTimestamp: new Date().toISOString(),
      },
    };

    const intake = await prisma.toolSignalIntake.create({
      data: {
        userId,
        toolId: tool.id,
        toolName: tool.name,
        sessionId: data.sessionId,
        sourcePath: data.sourcePath,
        leadCategory: tool.leadCategory,
        dataCategory: tool.dataCategory,
        whoFor: tool.whoFor,
        answerGives: tool.answerGives,
        primaryAnswer: data.primaryAnswer,
        context: data.context,
        desiredOutcome: data.desiredOutcome,
        urgency: data.urgency,
        answers: answers as Prisma.InputJsonValue,
        leadScore,
        consentAccepted: data.consentAccepted,
        adultConfirmed: data.adultConfirmed,
        sensitiveDataAcknowledged: data.sensitiveDataAcknowledged,
        clientTimestamp: data.clientTimestamp ? new Date(data.clientTimestamp) : null,
      },
      select: {
        id: true,
        toolId: true,
        leadCategory: true,
        leadScore: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, intake });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Tool signal intake failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
