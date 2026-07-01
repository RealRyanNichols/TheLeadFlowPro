import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { scoreLeadSignalProfile } from "@/lib/leadflow-scoring";
import { prisma } from "@/lib/prisma";
import {
  answerScoreForQuestion,
  answerTagsForQuestion,
  createExportProfile,
  normalizeAnswerText,
  scoreQuestionnaire,
  type QuestionnaireAnswerMap,
  type QuestionnaireDefinition,
  type QuestionnaireQuestion,
} from "@/lib/questionnaire-engine";

export const runtime = "nodejs";

const questionTypeSchema = z.enum([
  "single_select",
  "multi_select",
  "short_text",
  "long_text",
  "number",
  "range",
  "number_range",
  "budget_range",
  "location",
  "industry",
  "url",
  "phone",
  "email",
  "file_upload",
  "consent_checkbox",
  "seller_selection_checkbox",
  "seller_selection",
  "rating_scale",
  "priority_ranking",
  "ranking",
  "yes_no",
  "calendar_intent",
  "custom_hidden",
]);

const optionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(180),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  score: z.number().int().min(-50).max(50).optional(),
});

const questionSchema: z.ZodType<QuestionnaireQuestion> = z.object({
  id: z.string().trim().min(1).max(100),
  type: questionTypeSchema,
  label: z.string().trim().min(1).max(240),
  helperText: z.string().trim().max(420).optional(),
  required: z.boolean().optional(),
  options: z.array(optionSchema).max(30).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  placeholder: z.string().trim().max(240).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  scoreWeight: z.number().int().min(-50).max(50).optional(),
  showIf: z
    .array(
      z.object({
        questionId: z.string().trim().min(1).max(100),
        operator: z.enum(["equals", "not_equals", "includes", "not_includes", "exists", "gt", "gte", "lt", "lte"]),
        value: z.union([z.string(), z.number(), z.boolean()]).optional(),
      }),
    )
    .max(10)
    .optional(),
});

const definitionSchema: z.ZodType<QuestionnaireDefinition> = z.object({
  toolSlug: z.string().trim().min(1).max(120),
  toolType: z.string().trim().min(1).max(120),
  vertical: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(600),
  valuePreview: z.string().trim().min(1).max(600),
  defaultTags: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  recommendedActions: z
    .array(
      z.object({
        minScore: z.number().int().min(0).max(100),
        action: z.string().trim().min(1).max(120),
      }),
    )
    .max(10)
    .optional(),
  steps: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        title: z.string().trim().min(1).max(180),
        description: z.string().trim().max(500).optional(),
        questions: z.array(questionSchema).min(1).max(20),
      }),
    )
    .min(1)
    .max(20),
});

const ResponseSchema = z.object({
  responseId: z.string().trim().min(3).max(160).optional(),
  anonymousUserId: z.string().trim().min(8).max(160),
  identity: z
    .object({
      name: z.string().trim().max(120).optional(),
      email: z.string().email().transform((value) => value.toLowerCase().trim()).optional(),
      company: z.string().trim().max(160).optional(),
    })
    .optional(),
  definition: definitionSchema,
  answers: z.record(z.unknown()),
  currentStep: z.number().int().min(0).max(200).default(0),
  status: z.enum(["partial", "completed"]).default("partial"),
  consent: z.object({
    status: z.enum(["not_requested", "anonymous_only", "single_seller", "named_sellers", "aggregate_only", "declined"]),
    routeData: z.boolean(),
    selectedSellers: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
    noticeVersion: z.string().trim().min(1).max(80),
  }),
  attribution: z.object({
    sourceUrl: z.string().trim().min(1).max(600),
    sourcePath: z.string().trim().min(1).max(240),
    utmSource: z.string().trim().max(120).optional(),
    utmMedium: z.string().trim().max(120).optional(),
    utmCampaign: z.string().trim().max(120).optional(),
    utmContent: z.string().trim().max(120).optional(),
    utmTerm: z.string().trim().max(120).optional(),
  }),
  metadata: z.record(z.unknown()).optional(),
});

function identityIdFor(identity: { email?: string; name?: string; company?: string } | undefined) {
  if (!identity?.email) return null;
  return `identity_${crypto.createHash("sha256").update(identity.email).digest("hex").slice(0, 24)}`;
}

function questionMap(definition: QuestionnaireDefinition) {
  return new Map(definition.steps.flatMap((step) => step.questions).map((question) => [question.id, question]));
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return null as unknown as Prisma.InputJsonValue;
  return value as Prisma.InputJsonValue;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = ResponseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid questionnaire response" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const session = await auth().catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const responseId = data.responseId || `qr_${crypto.randomUUID()}`;
    const identityId = identityIdFor(data.identity);
    const answers = data.answers as QuestionnaireAnswerMap;
    const scoring = scoreQuestionnaire(data.definition, answers);
    const leadScores = scoreLeadSignalProfile({
      definition: data.definition,
      answers,
      consent: data.consent,
      attribution: data.attribution,
      identity: data.identity,
      metadata: {
        ...(data.metadata ?? {}),
        consentVersion: data.consent.noticeVersion,
      },
      responseStatus: data.status,
    });
    const consentStatus = data.consent.status;
    const suppressionStatus =
      consentStatus === "declined" || !data.consent.routeData || !leadScores.scoreable ? "suppressed" : scoring.suppressionStatus;
    const scoreForStorage = leadScores.overallScore;
    const confidenceForStorage = leadScores.overallConfidence;
    const recommendedNextAction = leadScores.nextRecommendedAction;
    const exportProfile = createExportProfile({
      responseId,
      anonymousUserId: data.anonymousUserId,
      identityId,
      definition: data.definition,
      attribution: data.attribution,
      consent: data.consent,
      score: {
        ...scoring,
        score: scoreForStorage,
        confidence: confidenceForStorage,
        suppressionStatus,
        recommendedNextAction,
      },
      leadScores,
    });

    const response = await prisma.questionnaireResponse.upsert({
      where: { id: responseId },
      create: {
        id: responseId,
        userId,
        anonymousUserId: data.anonymousUserId,
        identityId,
        identityPayload: data.identity ? (data.identity as Prisma.InputJsonValue) : undefined,
        toolSlug: data.definition.toolSlug,
        toolType: data.definition.toolType,
        vertical: data.definition.vertical,
        sourceUrl: data.attribution.sourceUrl,
        sourcePath: data.attribution.sourcePath,
        utmSource: data.attribution.utmSource,
        utmMedium: data.attribution.utmMedium,
        utmCampaign: data.attribution.utmCampaign,
        utmContent: data.attribution.utmContent,
        utmTerm: data.attribution.utmTerm,
        status: data.status,
        currentStep: data.currentStep,
        tags: scoring.tags,
        score: scoreForStorage,
        confidence: confidenceForStorage,
        consentStatus,
        suppressionStatus,
        recommendedNextAction,
        exportProfile: exportProfile as Prisma.InputJsonValue,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        completedAt: data.status === "completed" ? new Date() : null,
      },
      update: {
        userId,
        identityId,
        identityPayload: data.identity ? (data.identity as Prisma.InputJsonValue) : undefined,
        sourceUrl: data.attribution.sourceUrl,
        sourcePath: data.attribution.sourcePath,
        utmSource: data.attribution.utmSource,
        utmMedium: data.attribution.utmMedium,
        utmCampaign: data.attribution.utmCampaign,
        utmContent: data.attribution.utmContent,
        utmTerm: data.attribution.utmTerm,
        status: data.status,
        currentStep: data.currentStep,
        tags: scoring.tags,
        score: scoreForStorage,
        confidence: confidenceForStorage,
        consentStatus,
        suppressionStatus,
        recommendedNextAction,
        exportProfile: exportProfile as Prisma.InputJsonValue,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : undefined,
        completedAt: data.status === "completed" ? new Date() : undefined,
      },
      select: {
        id: true,
        anonymousUserId: true,
        identityId: true,
        toolSlug: true,
        vertical: true,
        score: true,
        confidence: true,
        consentStatus: true,
        suppressionStatus: true,
        recommendedNextAction: true,
        exportProfile: true,
        status: true,
      },
    });

    const questions = questionMap(data.definition);
    await Promise.all(
      Object.entries(answers).map(([questionId, value]) => {
        const question = questions.get(questionId);
        if (!question) return Promise.resolve();
        return prisma.questionnaireAnswer.upsert({
          where: { responseId_questionId: { responseId, questionId } },
          create: {
            responseId,
            questionId,
            questionType: question.type,
            questionLabel: question.label,
            answer: jsonValue(value),
            answerText: normalizeAnswerText(value),
            tags: answerTagsForQuestion(question, value),
            scoreContribution: answerScoreForQuestion(question, value),
            sourcePage: data.attribution.sourcePath,
          },
          update: {
            questionType: question.type,
            questionLabel: question.label,
            answer: jsonValue(value),
            answerText: normalizeAnswerText(value),
            tags: answerTagsForQuestion(question, value),
            scoreContribution: answerScoreForQuestion(question, value),
            sourcePage: data.attribution.sourcePath,
          },
        });
      }),
    );

    return NextResponse.json({ ok: true, response });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Questionnaire response save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
