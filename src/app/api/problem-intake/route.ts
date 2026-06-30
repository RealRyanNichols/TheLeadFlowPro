import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BUDGET_RANGES,
  CONTACT_PREFERENCES,
  INTERESTS,
  PROBLEM_CATEGORIES,
  REQUEST_TYPES,
  URGENCIES,
  estimateAdultInterest
} from "@/lib/adult-interest-intake";

export const runtime = "nodejs";

const requestTypeIds = new Set<string>(REQUEST_TYPES.map((item) => item.id));
const problemCategoryIds = new Set<string>(PROBLEM_CATEGORIES.map((item) => item.id));
const interestIds = new Set<string>(INTERESTS.map((item) => item.id));
const urgencyIds = new Set<string>(URGENCIES.map((item) => item.id));
const contactPreferenceIds = new Set<string>(CONTACT_PREFERENCES.map((item) => item.id));
const budgetRangeIds = new Set<string>(BUDGET_RANGES.map((item) => item.id));

const ProblemIntakeSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  requestType: z.string().refine((value) => requestTypeIds.has(value), "Invalid request type"),
  problemCategories: z
    .array(z.string().refine((value) => problemCategoryIds.has(value), "Invalid problem category"))
    .min(1)
    .max(5),
  interests: z.array(z.string().refine((value) => interestIds.has(value), "Invalid interest")).min(1).max(6),
  urgency: z.string().refine((value) => urgencyIds.has(value), "Invalid urgency"),
  budgetRange: z.string().refine((value) => budgetRangeIds.has(value), "Invalid budget range").optional().nullable(),
  preferredContact: z.string().refine((value) => contactPreferenceIds.has(value), "Invalid contact preference"),
  problemStatement: z.string().trim().min(20).max(1400),
  desiredOutcome: z.string().trim().min(15).max(1200),
  activeSearches: z.string().trim().max(1200).optional().or(z.literal("")),
  sourceContext: z.string().trim().max(1200).optional().or(z.literal("")),
  adultConfirmed: z.literal(true),
  consentAccepted: z.literal(true),
  sensitiveDataAcknowledged: z.literal(true)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = ProblemIntakeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid intake" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const session = await auth().catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const scoring = estimateAdultInterest(data);

    const intake = await prisma.adultInterestIntake.create({
      data: {
        userId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        companyName: data.companyName || null,
        requestType: data.requestType,
        problemCategories: data.problemCategories,
        interests: data.interests,
        urgency: data.urgency,
        budgetRange: data.budgetRange || null,
        preferredContact: data.preferredContact,
        problemStatement: data.problemStatement,
        desiredOutcome: data.desiredOutcome,
        activeSearches: data.activeSearches || null,
        sourceContext: data.sourceContext || null,
        score: scoring as unknown as Prisma.InputJsonValue,
        leadScore: scoring.leadScore,
        adultConfirmed: data.adultConfirmed,
        consentAccepted: data.consentAccepted,
        sensitiveDataAcknowledged: data.sensitiveDataAcknowledged
      },
      select: {
        id: true,
        leadScore: true,
        score: true,
        createdAt: true
      }
    });

    return NextResponse.json({ ok: true, intake });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Intake failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
