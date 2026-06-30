import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DELIVERABLES,
  LIST_TYPES,
  MUST_HAVE_FIELDS,
  REGIONS,
  SOURCE_LANES,
  estimateDataProduct
} from "@/lib/data-market";

export const runtime = "nodejs";

const listTypeIds = new Set<string>(LIST_TYPES.map((item) => item.id));
const sourceLaneIds = new Set<string>(SOURCE_LANES.map((item) => item.id));
const deliverableIds = new Set<string>(DELIVERABLES.map((item) => item.id));
const mustHaveFieldIds = new Set(MUST_HAVE_FIELDS);
const regionIds = new Set(REGIONS);

const DataRequestSchema = z.object({
  requestMode: z.enum(["buy", "list"]).default("buy"),
  buyerName: z.string().trim().min(2).max(120),
  buyerEmail: z.string().email().transform((value) => value.toLowerCase().trim()),
  companyName: z.string().trim().max(160).optional().or(z.literal("")),
  website: z.string().trim().max(240).optional().or(z.literal("")),
  useCase: z.string().trim().min(20).max(1200),
  targetCustomer: z.string().trim().min(10).max(1200),
  listTypes: z.array(z.string().refine((value) => listTypeIds.has(value), "Invalid list type")).min(1).max(6),
  sourceLanes: z.array(z.string().refine((value) => sourceLaneIds.has(value), "Invalid source lane")).min(1).max(7),
  regions: z.array(z.string().refine((value) => regionIds.has(value), "Invalid region")).min(1).max(6),
  volume: z.coerce.number().int().min(50).max(100_000),
  budgetUsd: z.coerce.number().int().min(0).max(250_000).optional().nullable(),
  urgency: z.enum(["standard", "rush", "weekly"]),
  deliverable: z.string().refine((value) => deliverableIds.has(value), "Invalid deliverable"),
  mustHaveFields: z.array(z.string().refine((value) => mustHaveFieldIds.has(value), "Invalid field")).min(3).max(12),
  excludedTargets: z.string().trim().max(1200).optional().or(z.literal("")),
  complianceAccepted: z.literal(true)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = DataRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const session = await auth().catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const scoring = estimateDataProduct(data);

    const request = await prisma.dataListRequest.create({
      data: {
        userId,
        requestMode: data.requestMode,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        companyName: data.companyName || null,
        website: data.website || null,
        useCase: data.useCase,
        targetCustomer: data.targetCustomer,
        listTypes: data.listTypes,
        sourceLanes: data.sourceLanes,
        regions: data.regions,
        volume: data.volume,
        budgetUsd: data.budgetUsd || null,
        urgency: data.urgency,
        deliverable: data.deliverable,
        mustHaveFields: data.mustHaveFields,
        excludedTargets: data.excludedTargets || null,
        scoring: scoring as unknown as Prisma.InputJsonValue,
        estimatedPriceUsd: scoring.estimatedPriceUsd,
        complianceAccepted: data.complianceAccepted
      },
      select: {
        id: true,
        estimatedPriceUsd: true,
        scoring: true,
        status: true,
        createdAt: true
      }
    });

    return NextResponse.json({ ok: true, request });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
