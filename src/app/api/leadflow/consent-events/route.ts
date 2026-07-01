import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  LEADFLOW_CONSENT_VERSION,
  getLeadFlowConsentModule,
  leadFlowConsentText,
  leadFlowConsentTypes,
} from "@/lib/leadflow-consent";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ConsentEventSchema = z
  .object({
    identityId: z.string().trim().min(3).max(160).optional(),
    anonymousSessionId: z.string().trim().min(8).max(180).optional(),
    consentType: z.enum(leadFlowConsentTypes),
    consentText: z.string().trim().min(20).max(6000),
    consentVersion: z.string().trim().min(1).max(120).default(LEADFLOW_CONSENT_VERSION),
    sellerId: z.string().trim().min(1).max(180).optional(),
    selectedSellerIds: z.array(z.string().trim().min(1).max(180)).max(12).optional(),
    timestamp: z.string().datetime().optional(),
    sourceUrl: z.string().trim().min(1).max(700),
    sourcePath: z.string().trim().min(1).max(240).optional(),
    toolSlug: z.string().trim().min(1).max(140).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((value) => value.identityId || value.anonymousSessionId, {
    message: "identity_id or anonymous_session_id is required.",
    path: ["anonymousSessionId"],
  });

function hashValue(value: string | null) {
  if (!value) return null;
  const salt = process.env.CONSENT_HASH_SALT || process.env.NEXTAUTH_SECRET || "leadflow-local-consent-hash-salt";
  return crypto.createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

function requestIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip");
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return null as unknown as Prisma.InputJsonValue;
  return value as Prisma.InputJsonValue;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = ConsentEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid consent event." },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const consentModule = getLeadFlowConsentModule(data.consentType);

    if (!consentModule) {
      return NextResponse.json({ error: "Unknown consent type." }, { status: 400 });
    }

    if (consentModule.requiresSellerId && !data.sellerId) {
      return NextResponse.json(
        { error: "One-seller routing consent requires a named seller." },
        { status: 400 },
      );
    }

    if (consentModule.requiresSelectedSellerIds && (!data.selectedSellerIds || data.selectedSellerIds.length === 0)) {
      return NextResponse.json(
        { error: "Selected-seller routing consent requires selected sellers." },
        { status: 400 },
      );
    }

    const selectedSellerIds = data.selectedSellerIds ?? [];
    const canonicalConsentText = [
      leadFlowConsentText(consentModule),
      consentModule.requiresSellerId && data.sellerId ? `Named seller: ${data.sellerId}` : null,
      consentModule.requiresSelectedSellerIds && selectedSellerIds.length > 0
        ? `Selected sellers: ${selectedSellerIds.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const session = await auth().catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const userAgent = req.headers.get("user-agent");
    const capturedAt = data.timestamp ? new Date(data.timestamp) : new Date();

    const event = await prisma.leadFlowConsentEvent.create({
      data: {
        userId,
        identityId: data.identityId,
        anonymousSessionId: data.anonymousSessionId,
        consentType: data.consentType,
        consentText: canonicalConsentText,
        consentVersion: data.consentVersion,
        sellerId: data.sellerId ?? selectedSellerIds[0] ?? null,
        capturedAt,
        ipHash: hashValue(requestIp(req)),
        sourceUrl: data.sourceUrl,
        sourcePath: data.sourcePath,
        toolSlug: data.toolSlug ?? consentModule.toolSlug,
        userAgentHash: hashValue(userAgent),
        metadata: jsonValue({
          ...(data.metadata ?? {}),
          selectedSellerIds,
          moduleTitle: consentModule.title,
          moduleMode: consentModule.mode,
          serverConsentVersion: LEADFLOW_CONSENT_VERSION,
        }),
      },
      select: {
        id: true,
        consentType: true,
        consentVersion: true,
        capturedAt: true,
      },
    });

    return NextResponse.json({ ok: true, consentEvent: event });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Consent event save failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
