import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminTokenSessionFromRequest } from "@/lib/admin-token";
import {
  PRODUCT_FACTORY_ACTIONS,
  PRODUCT_FACTORY_SOURCE_TYPES,
  handleProductFactorySubmission,
} from "@/lib/product-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BuyerUseCaseSchema = z.object({
  bestBuyerType: z.string().trim().min(1).max(140),
  industry: z.string().trim().min(1).max(120),
  geography: z.string().trim().min(1).max(160),
  useCase: z.string().trim().min(1).max(900),
  recommendedOutreachPath: z.string().trim().min(1).max(900),
  problemSolved: z.string().trim().min(1).max(700),
  offerAngle: z.string().trim().max(700).optional().default(""),
  buyerWarning: z.string().trim().max(700).optional().default(""),
  allowedUse: z.string().trim().min(12).max(1200),
  restrictedUse: z.string().trim().min(12).max(1200),
});

const ListingSettingsSchema = z.object({
  title: z.string().trim().min(3).max(220),
  description: z.string().trim().min(12).max(1200),
  category: z.string().trim().min(1).max(140),
  vertical: z.string().trim().min(1).max(120),
  tags: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
  accessModel: z.enum([
    "shared",
    "limited_seats",
    "exclusive_listing",
    "exclusive_geo",
    "exclusive_vertical",
    "exclusive_time_window",
    "internal_only",
  ]),
  price: z.coerce.number().min(0).max(250000),
  samplePrice: z.coerce.number().min(0).max(25000),
  sampleCount: z.coerce.number().int().min(0).max(500),
  sampleFields: z.array(z.enum(["public_profile", "source_proof", "compliance", "contact"])).min(1).max(4),
  requiresAdminApproval: z.boolean().default(true),
  visibility: z.enum(["internal", "buyer_preview", "buyer_visible", "archived"]).default("buyer_preview"),
  listingStatus: z.enum([
    "draft",
    "review",
    "sample_available",
    "available",
    "reserved",
    "sold_shared",
    "sold_exclusive",
    "expired",
    "archived",
    "suppressed",
  ]).default("review"),
});

const ComplianceChecklistSchema = z.object({
  sourceProofAttached: z.boolean().default(false),
  suppressionChecked: z.boolean().default(false),
  noProhibitedData: z.boolean().default(false),
  noMinors: z.boolean().default(false),
  noProtectedTraitTargeting: z.boolean().default(false),
  consentStatusReviewed: z.boolean().default(false),
  contactFieldsReviewed: z.boolean().default(false),
  civicRestrictionsReviewed: z.boolean().default(false),
  allowedUseWritten: z.boolean().default(false),
  restrictedUseWritten: z.boolean().default(false),
});

const GeneratedCopySchema = z.object({
  listingTitle: z.string().trim().max(220),
  shortSummary: z.string().trim().max(1600),
  buyerUseCase: z.string().trim().max(1600),
  sampleDescription: z.string().trim().max(1600),
  proofSummary: z.string().trim().max(1600),
  recommendedBuyerCta: z.string().trim().max(120),
  complianceNote: z.string().trim().max(1600),
  faq: z.array(z.object({
    question: z.string().trim().max(220),
    answer: z.string().trim().max(1000),
  })).max(8),
}).optional().nullable();

const ProductFactorySchema = z.object({
  action: z.enum(PRODUCT_FACTORY_ACTIONS),
  sourceType: z.enum(PRODUCT_FACTORY_SOURCE_TYPES),
  sourceId: z.string().trim().max(160).optional().nullable(),
  selectedMemberIds: z.array(z.string().trim().max(160)).max(500).default([]),
  buyerUseCase: BuyerUseCaseSchema,
  listingSettings: ListingSettingsSchema,
  complianceChecklist: ComplianceChecklistSchema,
  generatedCopy: GeneratedCopySchema,
  confirmed: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  const admin = await getAdminTokenSessionFromRequest(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin session required." }, { status: 401 });
  }

  const parsed = ProductFactorySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid Product Factory request." }, { status: 400 });
  }

  const result = await handleProductFactorySubmission({
    adminUserId: admin.userId,
    adminEmail: admin.email,
    submission: parsed.data,
  });

  if (!result.ok) {
    return NextResponse.json({
      error: result.message,
      quality: result.quality,
      compliance: result.compliance,
      generatedCopy: result.generatedCopy,
    }, { status: result.status });
  }

  return NextResponse.json(result);
}

